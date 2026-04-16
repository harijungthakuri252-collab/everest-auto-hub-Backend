const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');
const { sendOrderStatusEmail } = require('../utils/sendEmail');

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');
const { sendOrderStatusEmail } = require('../utils/sendEmail');

// Place order — validates items and recalculates total on backend
router.post('/', protect, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: 'No items in order' });

    if (!shippingAddress?.name || !shippingAddress?.phone || !shippingAddress?.address)
      return res.status(400).json({ message: 'Shipping address is required' });

    // Validate each item and recalculate price from DB
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive)
        return res.status(400).json({ message: `Product "${item.name}" is no longer available` });

      if (item.quantity < 1)
        return res.status(400).json({ message: 'Invalid quantity' });

      // Use DB price — never trust client price
      validatedItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0] || '',
        price: product.price, // from DB
        size: item.size || '',
        color: item.color || '',
        quantity: item.quantity,
      });

      calculatedTotal += product.price * item.quantity;
    }

    const order = await Order.create({
      user: req.user._id,
      items: validatedItems,
      shippingAddress,
      paymentMethod: paymentMethod || 'COD',
      totalPrice: calculatedTotal, // server-calculated
    });

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
