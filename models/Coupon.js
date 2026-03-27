const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true },
  minOrder: { type: Number, default: 0 },
  maxDiscount: { type: Number },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  usageLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  userLimit: { type: Number, default: 1 },
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Coupon', couponSchema);