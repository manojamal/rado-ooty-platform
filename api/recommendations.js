const mongoose = require('mongoose');
const Product = require('../models/Product');
const Recommendation = require('../models/Recommendation');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  cachedDb = await mongoose.connect(process.env.MONGODB_URI);
  return cachedDb;
}

// AI Recommendation Algorithm
async function getPersonalizedRecommendations(userId, limit = 10) {
  // Get user's purchase history
  const userPurchases = await Recommendation.find({ userId, purchasedAt: { $ne: null } })
    .sort({ purchasedAt: -1 })
    .limit(20);
  
  const purchasedProductIds = userPurchases.map(r => r.productId);
  
  // Find similar users (collaborative filtering)
  const similarUsers = await Recommendation.aggregate([
    { $match: { productId: { $in: purchasedProductIds }, userId: { $ne: userId } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  
  const similarUserIds = similarUsers.map(u => u._id);
  
  // Get products liked by similar users
  const recommendations = await Recommendation.aggregate([
    { $match: { userId: { $in: similarUserIds }, productId: { $nin: purchasedProductIds } } },
    { $group: { _id: '$productId', score: { $sum: 1 } } },
    { $sort: { score: -1 } },
    { $limit: limit },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' }
  ]);
  
  return recommendations;
}

async function getTrendingProducts(limit = 10) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const trending = await Recommendation.aggregate([
    { $match: { viewedAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: '$productId', views: { $sum: 1 }, purchases: { $sum: { $cond: [{ $ne: ['$purchasedAt', null] }, 1, 0] } } } },
    { $addFields: { score: { $add: ['$views', { $multiply: ['$purchases', 10] }] } } },
    { $sort: { score: -1 } },
    { $limit: limit },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' }
  ]);
  
  return trending;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  await connectToDatabase();
  
  const { type, userId, productId } = req.query;
  
  // Track product view
  if (req.method === 'POST' && type === 'track') {
    try {
      const { productId, sessionId } = req.body;
      const userId = req.body.userId || null;
      
      const recommendation = new Recommendation({
        userId,
        productId,
        type: 'view',
        viewedAt: new Date(),
        sessionId
      });
      
      await recommendation.save();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Get recommendations
  else if (req.method === 'GET') {
    try {
      let recommendations = [];
      
      if (type === 'personalized' && userId) {
        recommendations = await getPersonalizedRecommendations(userId);
      } else if (type === 'trending') {
        recommendations = await getTrendingProducts();
      } else if (type === 'similar' && productId) {
        // Get similar products based on category and tags
        const product = await Product.findById(productId);
        if (product) {
          recommendations = await Product.find({
            _id: { $ne: productId },
            category: product.category,
            isActive: true
          }).limit(10);
        }
      } else {
        // Default: get popular products
        recommendations = await Product.find({ isActive: true })
          .sort({ totalSold: -1 })
          .limit(20);
      }
      
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};