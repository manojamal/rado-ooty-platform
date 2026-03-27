const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  rating: { type: Number, min: 1, max: 5, required: true },
  title: String,
  comment: String,
  images: [String],
  verified: { type: Boolean, default: false },
  helpful: { type: Number, default: 0 },
  reported: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);