const express = require('express');
const router = express.Router();
const SiteContent = require('../models/SiteContent');
const { protect, adminOnly } = require('../middleware/auth');

// GET — public
router.get('/', async (req, res) => {
  try {
    let content = await SiteContent.findOne();
    if (!content) content = await SiteContent.create({});
    res.json(content);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT — admin only
router.put('/', protect, adminOnly, async (req, res) => {
  try {
    const { _id, __v, createdAt, updatedAt, ...fields } = req.body;
    const content = await SiteContent.findOneAndUpdate(
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
