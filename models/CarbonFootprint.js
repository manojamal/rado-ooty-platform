const mongoose = require('mongoose');

const carbonFootprintSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    carbonPerUnit: Number,
    quantity: Number,
    total: Number
  }],
  delivery: {
    distance: Number,
    vehicleType: String,
    emissions: Number,
    offset: Number
  },
  packaging: {
    type: String,
    emissions: Number,
    isRecyclable: Boolean
  },
  totalCarbon: Number,
  offsetStatus: {
    offset: Boolean,
    offsetMethod: String,
    offsetCost: Number
  },
  treesPlanted: Number,
  co2Saved: Number
}, { timestamps: true });

module.exports = mongoose.model('CarbonFootprint', carbonFootprintSchema);