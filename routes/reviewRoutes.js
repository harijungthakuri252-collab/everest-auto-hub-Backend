const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');

// Helper — recalculate product rating after review changes
const updateProductRating = async (productId) => {
  if (!productId) return;
  const reviews = await Review.find({ product: productId, isApproved: true });
  if (reviews.length === 0) {
    await Product.findByIdAndUpdate(productId, { rating: 0, numReviews: 0 });
    return;
  }
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await Product.findByIdAndUpdate(productId, {
    rating: Math.round(avg * 10) / 10,
    numReviews: reviews.length,
  });
};

// GET approved reviews — optionally filter by product
router.get('/', async (req, res) => {
  try {
    const { productId, sort = 'newest' } = req.query;
    const query = { isApproved: true };
    if (productId) query.product = productId;

    let sortObj = { createdAt: -1 };
    if (sort === 'highest') sortObj = { rating: -1 };
    if (sort === 'lowest')  sortObj = { rating: 1 };
    if (sort === 'helpful') sortObj = { helpful: -1 };

    const reviews = await Review.find(query).sort(sortObj);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST submit review
router.post('/', protect, async (req, res) => {
  try {
    const { productId, rating, comment, title } = req.body;

    // Check if user already reviewed this product
    if (productId) {
      const existing = await Review.findOne({ product: productId, user: req.user._id });
      if (existing) return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Check if verified purchase
    let verified = false;
    if (productId) {
      const order = await Order.findOne({
        user: req.user._id,
        status: 'delivered',
        'items.product': productId,
      });
      verified = !!order;
    }

    const review = await Review.create({
      user: req.user._id,
      product: productId || null,
      name: req.user.name,
      rating,
      comment,
      title: title || '',
      type: productId ? 'product' : 'general',
      verified,
      isApproved: false,
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST mark review as helpful
router.post('/:id/helpful', async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $inc: { helpful: 1 } },
      { new: true }
    );
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all reviews (admin)
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const reviews = await Review.find().populate('product', 'name').sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT approve/reject (admin) — also updates product rating
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isApproved: req.body.isApproved },
      { new: true }
    );
    if (review?.product) await updateProductRating(review.product);
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE review (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (review?.product) await updateProductRating(review.product);
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
