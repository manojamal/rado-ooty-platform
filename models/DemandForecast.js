const mongoose = require('mongoose');

const demandForecastSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  date: { type: Date, required: true },
  predictedDemand: Number,
  actualDemand: Number,
  confidence: Number,
  factors: {
    weather: String,
    season: String,
    dayOfWeek: Number,
    isHoliday: Boolean,
    temperature: Number,
    rainfall: Number,
    events: [String]
  },
  model: {
    type: String,
    enum: ['arima', 'prophet', 'lstm', 'ensemble']
  },
  accuracy: Number,
  lastUpdated: Date
}, { timestamps: true });

demandForecastSchema.index({ productId: 1, date: 1 });

module.exports = mongoose.model('DemandForecast', demandForecastSchema);