const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  cachedDb = await mongoose.connect(process.env.MONGODB_URI);
  return cachedDb;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  await connectToDatabase();
  
  const { period = 'week', metric } = req.query;
  
  try {
    const now = new Date();
    let startDate;
    
    switch(period) {
      case 'day': startDate = new Date(now.setHours(0,0,0,0)); break;
      case 'week': startDate = new Date(now.setDate(now.getDate() - 7)); break;
      case 'month': startDate = new Date(now.setMonth(now.getMonth() - 1)); break;
      case 'year': startDate = new Date(now.setFullYear(now.getFullYear() - 1)); break;
      default: startDate = new Date(now.setDate(now.getDate() - 7));
    }
    
    // Revenue analytics
    const revenueData = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: 'delivered' } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    // Top products
    const topProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      { $group: {
        _id: '$items.productId',
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }},
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' }
    ]);
    
    // Customer analytics
    const customerAnalytics = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: null,
        newCustomers: { $sum: 1 },
        avgOrderValue: { $avg: '$totalSpent' }
      }}
    ]);
    
    // Inventory analytics
    const lowStockProducts = await Product.find({ stock: { $lt: 20 }, isActive: true })
      .select('name stock price');
    
    // Customer lifetime value (CLV)
    const clvData = await User.aggregate([
      { $match: { totalOrders: { $gt: 0 } } },
      { $group: {
        _id: null,
        avgLifetimeValue: { $avg: '$totalSpent' },
        avgOrderCount: { $avg: '$totalOrders' }
      }}
    ]);
    
    res.json({
      period,
      revenue: {
        daily: revenueData,
        total: revenueData.reduce((sum, d) => sum + d.revenue, 0),
        growth: calculateGrowth(revenueData)
      },
      topProducts,
      customers: {
        new: customerAnalytics[0]?.newCustomers || 0,
        avgOrderValue: customerAnalytics[0]?.avgOrderValue || 0,
        clv: clvData[0]?.avgLifetimeValue || 0
      },
      inventory: {
        lowStock: lowStockProducts.length,
        lowStockProducts
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

function calculateGrowth(data) {
  if (data.length < 2) return 0;
  const previous = data[data.length - 2]?.revenue || 0;
  const current = data[data.length - 1]?.revenue || 0;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}