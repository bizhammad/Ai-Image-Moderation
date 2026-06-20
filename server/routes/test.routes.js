const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { screenImage } = require('../services/aiModeration.service');

router.post('/screen-test', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

  try {
    const results = await screenImage(req.file.buffer, req.file.mimetype);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: 'Screening failed', error: err.message });
  }
});

module.exports = router;