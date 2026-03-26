const mongoose = require('mongoose');
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
  
  try {
    await connectToDatabase();
    const products = await Product.find({ isActive: true }).limit(50);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
