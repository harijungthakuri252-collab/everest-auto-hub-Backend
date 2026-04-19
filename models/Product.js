const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  description:   { type: String, required: true },
  price:         { type: Number, required: true },
  originalPrice: { type: Number },
  category:      { type: String, required: true },
  images:        [{ type: String }],
  sizes:         [{ type: String }],
  colors:        [{ type: String }],
  stock:         { type: Number, default: 0 },
  isActive:      { type: Boolean, default: true },
  isFeatured:    { type: Boolean, default: false },
  brand:         { type: String, default: 'Everest Auto Hub' },
  tags:          [{ type: String }],
  // Rating summary (updated when reviews are approved)
  rating:        { type: Number, default: 0 },
  numReviews:    { type: Number, default: 0 },
  soldCount:     { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
