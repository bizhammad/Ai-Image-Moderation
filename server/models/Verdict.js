const mongoose = require('mongoose');

const categoryResultSchema = new mongoose.Schema({
  category: { type: String, required: true },
  detected: { type: Boolean, required: true },
  confidence: { type: Number, required: true },
  reasoning: { type: String, required: true }
}, { _id: false });

const policySnapshotSchema = new mongoose.Schema({
  category: { type: String, required: true },
  enabled: { type: Boolean, required: true },
  confidenceThreshold: { type: Number, required: true },
  enforcement: { type: String, required: true }
}, { _id: false });

const verdictSchema = new mongoose.Schema({
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  outcome: { type: String, enum: ['approved', 'flagged', 'blocked'], required: true },
  categoryResults: [categoryResultSchema],
  policySnapshot: [policySnapshotSchema],
  // Override tracking — only populated if an admin manually changed the outcome
  originalOutcome: { type: String, enum: ['approved', 'flagged', 'blocked'] },
  overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  overriddenAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Verdict', verdictSchema);