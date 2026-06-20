const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const PolicyConfig = require('../models/PolicyConfig');

// GET /api/policies — anyone logged in can view current settings
router.get('/', authenticate, async (req, res) => {
  try {
    const policies = await PolicyConfig.find().sort('category');
    res.json({ policies });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch policies', error: err.message });
  }
});

// PATCH /api/policies/:category — admin only
router.patch('/:category', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { enabled, confidenceThreshold, enforcement } = req.body;

    const update = {};
    if (enabled !== undefined) update.enabled = enabled;
    if (confidenceThreshold !== undefined) update.confidenceThreshold = confidenceThreshold;
    if (enforcement !== undefined) update.enforcement = enforcement;

    const policy = await PolicyConfig.findOneAndUpdate(
  { category: req.params.category },
  update,
  { returnDocument: 'after', runValidators: true }
);

    if (!policy) return res.status(404).json({ message: 'Category not found' });

    res.json({ policy });
  } catch (err) {
    res.status(400).json({ message: 'Failed to update policy', error: err.message });
  }
});

module.exports = router;