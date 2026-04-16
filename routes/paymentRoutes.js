const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// POST /api/payment/create-intent
// Creates a Stripe PaymentIntent — validates items and calculates total from DB
router.post('/create-intent', protect, async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: 'No items provided' });

    // Validate items and calculate total from DB prices
    let totalCents = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive)
        return res.status(400).json({ message: `Product "${item.name}" is no longer available` });

      const qty = Math.max(1, parseInt(item.quantity) || 1);
      totalCents += Math.round(product.price * 100) * qty;

      validatedItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0] || '',
        price: product.price,
        size: item.size || '',
        color: item.color || '',
        quantity: qty,
      });
    }

    // Minimum charge is 50 cents
    if (totalCents < 50)
      return res.status(400).json({ message: 'Order total is too low' });

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'aud',
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: req.user._id.toString(),
        itemCount: validatedItems.length.toString(),
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: totalCents,
      validatedItems,
    });
  } catch (err) {
    console.error('[PAYMENT] create-intent error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/payment/confirm-order
// Called after successful payment — creates the order in DB
router.post('/confirm-order', protect, async (req, res) => {
  try {
    const { paymentIntentId, items, shippingAddress } = req.body;

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded')
      return res.status(400).json({ message: 'Payment not completed' });

    // Check order doesn't already exist for this payment
    const existing = await Order.findOne({ stripePaymentIntentId: paymentIntentId });
    if (existing)
      return res.status(400).json({ message: 'Order already created for this payment' });

    // Recalculate total from DB
    let totalPrice = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      totalPrice += product.price * item.quantity;
      validatedItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0] || '',
        price: product.price,
        size: item.size || '',
        color: item.color || '',
        quantity: item.quantity,
      });
    }

    const order = await Order.create({
      user: req.user._id,
      items: validatedItems,
      shippingAddress,
      paymentMethod: 'Stripe',
      totalPrice,
      isPaid: true,
      stripePaymentIntentId: paymentIntentId,
    });

    res.status(201).json(order);
  } catch (err) {
    console.error('[PAYMENT] confirm-order error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/payment/transactions (admin)
router.get('/transactions', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Admin only' });

    const paymentIntents = await stripe.paymentIntents.list({ limit: 50 });

    const transactions = paymentIntents.data.map(pi => ({
      id: pi.id,
      amount: pi.amount / 100,
      currency: pi.currency.toUpperCase(),
      status: pi.status,
      created: new Date(pi.created * 1000),
      description: pi.description || '',
    }));

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
