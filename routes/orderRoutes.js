const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');
const { sendOrderStatusEmail } = require('../utils/sendEmail');

// Place order
router.post('/', protect, async (req, res) => {
  try {
    const order = await Order.create({ ...req.body, user: req.user._id });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my orders
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all orders (admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update order status (admin) — sends email to customer
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate('user', 'name email');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Send status update email
    const email = order.user?.email || order.shippingAddress?.email;
    const name  = order.user?.name  || order.shippingAddress?.name;
    if (email) {
      sendOrderStatusEmail(email, name, order).catch(e =>
        console.error('[EMAIL] Order status email failed:', e.message)
      );
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
