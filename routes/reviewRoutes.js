const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { protect, adminOnly } = require('../middleware/auth');

// Get approved reviews (public)
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find({ isApproved: true }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit review
router.post('/', protect, async (req, res) => {
  try {
    const review = await Review.create({ ...req.body, user: req.user._id, name: req.user.name });
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all reviews (admin)
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve/reject review (admin)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: req.body.isApproved }, { new: true });
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete review (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
