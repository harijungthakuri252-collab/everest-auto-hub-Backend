const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  name:      { type: String, required: true },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  comment:   { type: String, required: true },
  title:     { type: String, default: '' },
  type:      { type: String, enum: ['service', 'product', 'general'], default: 'general' },
  verified:  { type: Boolean, default: false }, // verified purchase
  helpful:   { type: Number, default: 0 },
  isApproved:{ type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
