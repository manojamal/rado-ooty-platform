const mongoose = require('mongoose');

const darkStoreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number], // [longitude, latitude]
    address: String,
    pincode: String,
    area: String
  },
  zone: { type: String, enum: ['Zone 1', 'Zone 2', 'Zone 3'] },
  capacity: {
    max: Number,
    current: Number,
    utilization: Number
  },
  inventory: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    reorderPoint: Number,
    lastRestocked: Date
  }],
  operatingHours: {
    start: String,
    end: String,
    timezone: String
  },
  deliveryRadius: Number, // in km
  deliverySlots: [{
    slot: String,
    capacity: Number,
    booked: Number,
    isAvailable: Boolean
  }],
  performance: {
    ordersProcessed: Number,
    avgProcessingTime: Number,
    successRate: Number
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

darkStoreSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('DarkStore', darkStoreSchema);