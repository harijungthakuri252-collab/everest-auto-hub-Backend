const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  category: { type: String, required: true }, // e.g. "T-Shirts", "Hoodies", "Caps"
  images: [{ type: String }],
  sizes: [{ type: String }], // ['S','M','L','XL','XXL']
  colors: [{ type: String }],
  stock: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  brand: { type: String, default: 'Everest Auto Hub' },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
