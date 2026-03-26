const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  cachedDb = await mongoose.connect(process.env.MONGODB_URI);
  return cachedDb;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    await connectToDatabase();
    const { items, customerInfo, deliverySlot, zone } = req.body;
    
    let subtotal = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(400).json({ error: 'Product not found' });
      
      subtotal += product.price * item.quantity;
      orderItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      });
    }
    
    const deliveryFees = { 'Zone 1': 0, 'Zone 2': 30, 'Zone 3': 60 };
    const deliveryFee = deliveryFees[zone] || 0;
    const total = subtotal + deliveryFee;
    
    const order = new Order({
      items: orderItems,
      customerInfo,
      deliverySlot,
      zone,
      subtotal,
      deliveryFee,
      total,
      status: 'confirmed'
    });
    
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
