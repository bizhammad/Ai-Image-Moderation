const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const Appeal = require('../models/Appeal');
const Submission = require('../models/Submission');

// POST /api/appeals — user files an appeal on their own flagged/blocked submission
router.post('/', authenticate, async (req, res) => {
  try {
    const { submissionId, justification } = req.body;

    if (!submissionId || !justification) {
      return res.status(400).json({ message: 'submissionId and justification are required' });
    }

    const submission = await Submission.findOne({ _id: submissionId, user: req.user._id });
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    if (submission.status === 'approved') {
      return res.status(400).json({ message: 'Cannot appeal an already-approved submission' });
    }

    const existing = await Appeal.findOne({ submission: submissionId });
    if (existing) {
      return res.status(409).json({ message: 'An appeal already exists for this submission' });
    }

    const appeal = await Appeal.create({
      submission: submissionId,
      user: req.user._id,
      justification
    });

    res.status(201).json({ appeal });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create appeal', error: err.message });
  }
});

// GET /api/appeals — user sees their own appeals; admin sees ALL appeals
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
    const appeals = await Appeal.find(filter).populate('submission').sort('-createdAt');
    res.json({ appeals });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch appeals', error: err.message });
  }
});

// GET /api/appeals/queue — admin only, pending appeals specifically
router.get('/queue', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const appeals = await Appeal.find({ status: 'pending' }).populate('submission').populate('user', 'name email').sort('createdAt');
    res.json({ appeals });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch appeal queue', error: err.message });
  }
});

// PATCH /api/appeals/:id — admin accepts or rejects
router.patch('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { decision, adminResponse } = req.body;

    if (!['accepted', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be "accepted" or "rejected"' });
    }

    const appeal = await Appeal.findById(req.params.id);
    if (!appeal) return res.status(404).json({ message: 'Appeal not found' });

    if (appeal.status !== 'pending') {
      return res.status(400).json({ message: 'This appeal has already been resolved' });
    }

    appeal.status = decision;
    appeal.adminResponse = adminResponse || '';
    appeal.reviewedBy = req.user._id;
    appeal.resolvedAt = new Date();
    await appeal.save();

    // Accepting an appeal overrides the submission's verdict to approved
    if (decision === 'accepted') {
      await Submission.findByIdAndUpdate(appeal.submission, { status: 'approved' });
    }

    res.json({ appeal });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update appeal', error: err.message });
  }
});

module.exports = router;