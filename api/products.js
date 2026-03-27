const mongoose = require('mongoose');
const Product = require('../models/Product');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  try {
    console.log('Connecting to MongoDB...');
    cachedDb = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected successfully');
    return cachedDb;
  } catch (error) {
    console.error('Connection error:', error.message);
    throw error;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    await connectToDatabase();
    const products = await Product.find({ isActive: true }).limit(50);
    res.status(200).json(products);
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};