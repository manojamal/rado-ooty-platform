const mongoose = require('mongoose');
const Order = require('../models/Order');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  cachedDb = await mongoose.connect(process.env.MONGODB_URI);
  return cachedDb;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  await connectToDatabase();
  
  const { orderId } = req.query;
  
  if (req.method === 'GET' && orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Generate tracking timeline
      const timeline = [
        { status: 'Order Placed', time: order.createdAt, completed: true },
        { status: 'Confirmed', time: order.confirmedAt || order.createdAt, completed: order.status !== 'pending' },
        { status: 'Preparing', time: order.preparingAt, completed: ['preparing', 'out-for-delivery', 'delivered'].includes(order.status) },
        { status: 'Out for Delivery', time: order.outForDeliveryAt, completed: ['out-for-delivery', 'delivered'].includes(order.status) },
        { status: 'Delivered', time: order.deliveredAt, completed: order.status === 'delivered' }
      ];
      
      // Calculate estimated arrival
      let estimatedArrival = null;
      if (order.status === 'out-for-delivery') {
        const deliveryTime = order.estimatedDelivery;
        const now = new Date();
        const remaining = Math.max(0, deliveryTime - now);
        estimatedArrival = Math.ceil(remaining / 60000); // minutes remaining
      }
      
      res.json({
        order,
        timeline,
        estimatedArrival,
        currentStatus: order.status
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Update tracking (admin only)
  else if (req.method === 'POST' && orderId) {
    try {
      const { status, location } = req.body;
      const update = { status };
      
      // Add timestamps based on status
      if (status === 'confirmed') update.confirmedAt = new Date();
      if (status === 'preparing') update.preparingAt = new Date();
      if (status === 'out-for-delivery') update.outForDeliveryAt = new Date();
      if (status === 'delivered') update.deliveredAt = new Date();
      
      const order = await Order.findByIdAndUpdate(orderId, update, { new: true });
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  else {
    res.status(404).json({ error: 'Order ID required' });
  }
};