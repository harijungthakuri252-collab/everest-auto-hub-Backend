const express = require('express');
const router = express.Router();
const HomeContent = require('../models/HomeContent');
const { protect, adminOnly } = require('../middleware/auth');

// GET — public, returns current content (creates default if none exists)
router.get('/', async (req, res) => {
  try {
    let content = await HomeContent.findOne();
    if (!content) content = await HomeContent.create({});
    res.json(content);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT — admin only, update content
router.put('/', protect, adminOnly, async (req, res) => {
  try {
    // Strip mongoose internals so they don't cause conflicts
    const { _id, __v, createdAt, updatedAt, ...fields } = req.body;

    const content = await HomeContent.findOneAndUpdate(
      {},
      { $set: fields },
      { new: true, upsert: true, runValidators: false }
    );
    res.json(content);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
