const mongoose = require('mongoose');
const FlashSale = require('../models/FlashSale');
const Product = require('../models/Product');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  cachedDb = await mongoose.connect(process.env.MONGODB_URI);
  return cachedDb;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  await connectToDatabase();
  
  // Get active flash sales
  if (req.method === 'GET') {
    try {
      const now = new Date();
      const activeSales = await FlashSale.find({
        startTime: { $lte: now },
        endTime: { $gte: now },
        status: 'active'
      }).populate('products.productId');
      
      // Calculate time remaining
      const salesWithTimer = activeSales.map(sale => ({
        ...sale.toObject(),
        timeRemaining: Math.max(0, sale.endTime - now),
        percentageRemaining: ((sale.endTime - now) / (sale.endTime - sale.startTime)) * 100
      }));
      
      res.json(salesWithTimer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Create flash sale (admin only)
  else if (req.method === 'POST') {
    try {
      const flashSale = new FlashSale(req.body);
      await flashSale.save();
      res.status(201).json(flashSale);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};