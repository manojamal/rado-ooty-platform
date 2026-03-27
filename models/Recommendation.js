const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  score: { type: Number, default: 0 },
  type: { type: String, enum: ['personalized', 'trending', 'similar', 'bundle'] },
  viewedAt: Date,
  purchasedAt: Date,
  sessionId: String
}, { timestamps: true });

// Index for fast queries
recommendationSchema.index({ userId: 1, score: -1 });
recommendationSchema.index({ productId: 1, type: 1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);