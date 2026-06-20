const mongoose = require('mongoose');

const policyConfigSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    unique: true,
    enum: ['graphic_violence', 'hate_symbols', 'self_harm', 'extremist_propaganda', 'weapons_contraband', 'harassment_humiliation']
  },
  enabled: { type: Boolean, default: true },
  confidenceThreshold: { type: Number, default: 70, min: 0, max: 100 },
  enforcement: { type: String, enum: ['auto_block', 'flag_for_review'], default: 'flag_for_review' }
}, { timestamps: true });

module.exports = mongoose.model('PolicyConfig', policyConfigSchema);