const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  cachedDb = await mongoose.connect(process.env.MONGODB_URI);
  return cachedDb;
}

// Generate JWT token
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  await connectToDatabase();
  
  const { action } = req.query;
  
  // REGISTER
  if (action === 'register' && req.method === 'POST') {
    try {
      const { name, email, password, phone } = req.body;
      
      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      
      // Create new user
      const user = new User({ name, email, password, phone });
      await user.save();
      
      const token = generateToken(user._id);
      res.status(201).json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // LOGIN
  else if (action === 'login' && req.method === 'POST') {
    try {
      const { email, password } = req.body;
      
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const isValid = await user.comparePassword(password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = generateToken(user._id);
      res.json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // GET PROFILE
  else if (action === 'profile' && req.method === 'GET') {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
      const user = await User.findById(decoded.userId).select('-password');
      
      res.json(user);
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
  
  // UPDATE PROFILE
  else if (action === 'profile' && req.method === 'PUT') {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
      const updates = req.body;
      delete updates.password; // Don't allow password update here
      
      const user = await User.findByIdAndUpdate(decoded.userId, updates, { new: true }).select('-password');
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  else {
    res.status(404).json({ error: 'Action not found' });
  }
};