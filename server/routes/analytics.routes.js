const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const Submission = require('../models/Submission');
const Verdict = require('../models/Verdict');
const Appeal = require('../models/Appeal');

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    // 1. Total submission volume over time (grouped by day)
    const volumeOverTime = await Submission.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 2. Verdict distribution by outcome
    const outcomeDistribution = await Submission.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 3. Verdict distribution by category (unwind categoryResults, count where detected+triggered)
    const categoryDistribution = await Verdict.aggregate([
      { $unwind: '$categoryResults' },
      { $match: { 'categoryResults.detected': true } },
      { $group: { _id: '$categoryResults.category', count: { $sum: 1 } } }
    ]);

    // 4. Appeal stats
    const totalAppeals = await Appeal.countDocuments();
    const resolvedAppeals = await Appeal.countDocuments({ status: { $ne: 'pending' } });
    const appealOutcomes = await Appeal.aggregate([
      { $match: { status: { $ne: 'pending' } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const resolutionRate = totalAppeals > 0 ? (resolvedAppeals / totalAppeals) * 100 : 0;

    // 5. Top users by submission count
    const topUsersBySubmissions = await Submission.aggregate([
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { count: 1, 'user.name': 1, 'user.email': 1 } }
    ]);

    // 6. Top users by violation count (flagged + blocked submissions)
    const topUsersByViolations = await Submission.aggregate([
      { $match: { status: { $in: ['flagged', 'blocked'] } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { count: 1, 'user.name': 1, 'user.email': 1 } }
    ]);

    res.json({
      volumeOverTime,
      outcomeDistribution,
      categoryDistribution,
      appeals: {
        total: totalAppeals,
        resolved: resolvedAppeals,
        resolutionRate: Math.round(resolutionRate * 10) / 10,
        outcomes: appealOutcomes
      },
      topUsersBySubmissions,
      topUsersByViolations
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch analytics', error: err.message });
  }
});

module.exports = router;