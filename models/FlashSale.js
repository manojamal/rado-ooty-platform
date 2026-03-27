const mongoose = require('mongoose');

const flashSaleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    originalPrice: Number,
    salePrice: Number,
    discountPercentage: Number,
    maxQuantity: Number,
    soldQuantity: { type: Number, default: 0 }
  }],
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  type: { type: String, enum: ['flash', 'deal', 'clearance'] },
  status: { type: String, enum: ['upcoming', 'active', 'ended'], default: 'upcoming' },
  banner: String,
  restrictions: {
    minOrderValue: Number,
    userLimit: { type: Number, default: 1 },
    totalLimit: Number
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FlashSale', flashSaleSchema);