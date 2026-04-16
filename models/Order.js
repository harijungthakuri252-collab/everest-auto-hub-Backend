const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  image: String,
  price: Number,
  size: String,
  color: String,
  quantity: { type: Number, required: true, default: 1 },
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [orderItemSchema],
  shippingAddress: {
    name: String,
    phone: String,
    address: String,
    city: String,
    postalCode: String,
  },
  paymentMethod: { type: String, default: 'COD' },
  totalPrice: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  isPaid: { type: Boolean, default: false },
  stripePaymentIntentId: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
