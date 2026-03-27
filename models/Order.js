const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Add this line
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: Number
  }],
  customerInfo: {
    name: String,
    phone: String,
    address: String
  },
  deliverySlot: String,
  zone: String,
  subtotal: Number,
  deliveryFee: Number,
  total: Number,
  status: { type: String, default: 'pending' }
}, { timestamps: true });const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: Number
  }],
  customerInfo: {
    name: String,
    phone: String,
    address: String
  },
  deliverySlot: String,
  zone: String,
  subtotal: Number,
  deliveryFee: Number,
  total: Number,
  status: { type: String, default: 'pending' }
}, { timestamps: true });

orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    this.orderNumber = `RADO-${date.getTime()}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
