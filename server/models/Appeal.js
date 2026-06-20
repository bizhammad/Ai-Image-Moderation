const mongoose = require('mongoose');

const appealSchema = new mongoose.Schema({
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  justification: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  adminResponse: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Appeal', appealSchema);