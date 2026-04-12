const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  message:   { type: String, default: '' },
  image:     { type: String, default: '' },
  type:      { type: String, enum: ['info', 'offer', 'warning', 'event'], default: 'info' },
  isActive:  { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
