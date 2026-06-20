const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  status: { type: String, enum: ['approved', 'flagged', 'blocked'], default: 'approved' }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);