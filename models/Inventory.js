const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  sku: { type: String, unique: true },
  warehouses: [{
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    quantity: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 20 },
    reorderQuantity: { type: Number, default: 100 }
  }],
  totalStock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 20 },
  outOfStockThreshold: { type: Number, default: 0 },
  lastRestocked: Date,
  nextRestockDate: Date,
  supplier: {
    name: String,
    contact: String,
    leadTime: Number // days
  },
  batchTracking: [{
    batchNumber: String,
    expiryDate: Date,
    quantity: Number,
    receivedAt: Date
  }]
}, { timestamps: true });

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  if (this.totalStock <= 0) return 'out_of_stock';
  if (this.totalStock <= this.lowStockThreshold) return 'low_stock';
  return 'in_stock';
});

module.exports = mongoose.model('Inventory', inventorySchema);