const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  cachedDb = await mongoose.connect(process.env.MONGODB_URI);
  return cachedDb;
}

// Process subscription orders
async function processSubscription(subscription) {
  const now = new Date();
  const nextDate = new Date(subscription.nextProcessingDate);
  
  if (nextDate <= now) {
    // Create order for subscription
    const order = new Order({
      userId: subscription.userId,
      items: subscription.products,
      subscriptionId: subscription._id,
      total: subscription.price * (1 - subscription.discount / 100),
      status: 'pending'
    });
    
    await order.save();
    
    // Update next processing date
    const update = {};
    if (subscription.plan === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (subscription.plan === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    subscription.nextProcessingDate = nextDate;
    subscription.lastProcessed = now;
    await subscription.save();
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  await connectToDatabase();
  
  const { userId, subscriptionId } = req.query;
  
  // Get user subscriptions
  if (req.method === 'GET' && userId) {
    try {
      const subscriptions = await Subscription.find({ userId, status: 'active' })
        .populate('products.productId');
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Create subscription
  else if (req.method === 'POST') {
    try {
      const subscription = new Subscription(req.body);
      await subscription.save();
      res.status(201).json(subscription);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Update subscription (pause/cancel)
  else if (req.method === 'PUT' && subscriptionId) {
    try {
      const { action } = req.body;
      const subscription = await Subscription.findById(subscriptionId);
      
      if (action === 'pause') subscription.status = 'paused';
      if (action === 'resume') subscription.status = 'active';
      if (action === 'cancel') subscription.status = 'cancelled';
      
      await subscription.save();
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};