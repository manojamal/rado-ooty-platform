const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    required: true
  },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    frequency: String // daily, weekly, monthly
  }],
  deliveryDay: { type: Number, min: 1, max: 31 }, // Day of month/week
  deliveryTime: String,
  startDate: { type: Date, required: true },
  endDate: Date,
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled', 'expired'],
    default: 'active'
  },
  price: Number,
  discount: { type: Number, default: 10 }, // 10% discount for subscriptions
  autoRenew: { type: Boolean, default: true },
  paymentMethod: String,
  lastProcessed: Date,
  nextProcessingDate: Date
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);