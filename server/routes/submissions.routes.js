const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { screenImage } = require('../services/aiModeration.service');
const PolicyConfig = require('../models/PolicyConfig');
const Submission = require('../models/Submission');
const Verdict = require('../models/Verdict');
const Appeal = require('../models/Appeal');

// POST /api/submissions — upload one or more images, screen each independently
router.post('/', authenticate, upload.array('images', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No images uploaded' });
  }

  try {
    const policies = await PolicyConfig.find();
    const policyMap = {};
    policies.forEach(p => { policyMap[p.category] = p; });

    const responses = [];

    for (const file of req.files) {
      const buffer = fs.readFileSync(file.path);
      const screening = await screenImage(buffer, file.mimetype);

      let outcome = 'approved';
      const categoryResults = [];
      const policySnapshot = [];

      for (const result of screening.results) {
        const policy = policyMap[result.category];
        policySnapshot.push({
          category: result.category,
          enabled: policy.enabled,
          confidenceThreshold: policy.confidenceThreshold,
          enforcement: policy.enforcement
        });

        categoryResults.push(result);

        if (!policy.enabled) continue;

        const triggered = result.detected && result.confidence >= policy.confidenceThreshold;
        if (!triggered) continue;

        if (policy.enforcement === 'auto_block') {
          outcome = 'blocked';
        } else if (policy.enforcement === 'flag_for_review' && outcome !== 'blocked') {
          outcome = 'flagged';
        }
      }

      const imageUrl = `/uploads/${file.filename}`;
      const submission = await Submission.create({
        user: req.user._id,
        imageUrl,
        status: outcome
      });

      const verdict = await Verdict.create({
        submission: submission._id,
        outcome,
        categoryResults,
        policySnapshot
      });

      responses.push({ submission, verdict });
    }

    res.status(201).json({ results: responses });
  } catch (err) {
    res.status(500).json({ message: 'Submission failed', error: err.message });
  }
});

// GET /api/submissions/admin/all — admin sees ALL submissions across all users
router.get('/admin/all', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const submissions = await Submission.find(filter)
      .populate('user', 'name email')
      .sort('-createdAt');

    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch submissions', error: err.message });
  }
});

// DELETE /api/submissions/admin/:id — admin deletes a submission + its image + verdict + appeal
router.delete('/admin/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const filename = submission.imageUrl.split('/uploads/')[1];
    const filePath = path.join(__dirname, '..', 'uploads', filename);
    if (filename && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Verdict.deleteMany({ submission: submission._id });
    await Appeal.deleteMany({ submission: submission._id });
    await Submission.findByIdAndDelete(req.params.id);

    res.json({ message: 'Submission deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete submission', error: err.message });
  }
});

// PATCH /api/submissions/admin/:id/override — admin manually overrides a verdict's outcome
router.patch('/admin/:id/override', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { outcome } = req.body;

    if (!['approved', 'flagged', 'blocked'].includes(outcome)) {
      return res.status(400).json({ message: 'outcome must be approved, flagged, or blocked' });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    submission.status = outcome;
    await submission.save();

    const verdict = await Verdict.findOne({ submission: submission._id });
    if (verdict) {
      verdict.overriddenBy = req.user._id;
      verdict.overriddenAt = new Date();
      verdict.originalOutcome = verdict.originalOutcome || verdict.outcome;
      verdict.outcome = outcome;
      await verdict.save();
    }

    res.json({ submission, verdict });
  } catch (err) {
    res.status(500).json({ message: 'Failed to override verdict', error: err.message });
  }
});

// GET /api/submissions — own history, with optional filters (status, category, date range)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, category, from, to } = req.query;
    const filter = { user: req.user._id };

    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    if (category) {
      const matchingVerdicts = await Verdict.find({
        'categoryResults.category': category,
        'categoryResults.detected': true
      }).select('submission');

      const matchingSubmissionIds = matchingVerdicts.map(v => v.submission);
      filter._id = { $in: matchingSubmissionIds };
    }

    const submissions = await Submission.find(filter).sort('-createdAt');
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch submissions', error: err.message });
  }
});

// GET /api/submissions/:id — one submission + its verdict (own submissions only)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const submission = await Submission.findOne({ _id: req.params.id, user: req.user._id });
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const verdict = await Verdict.findOne({ submission: submission._id });
    res.json({ submission, verdict });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch submission', error: err.message });
  }
});

module.exports = router;