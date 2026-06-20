require('dotenv').config();
const mongoose = require('mongoose');
const PolicyConfig = require('./models/PolicyConfig');

const CATEGORIES = [
  'graphic_violence',
  'hate_symbols',
  'self_harm',
  'extremist_propaganda',
  'weapons_contraband',
  'harassment_humiliation'
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  for (const category of CATEGORIES) {
    const exists = await PolicyConfig.findOne({ category });
    if (!exists) {
      await PolicyConfig.create({
        category,
        enabled: true,
        confidenceThreshold: 70,
        enforcement: 'flag_for_review'
      });
      console.log(`Created policy for ${category}`);
    } else {
      console.log(`${category} already exists, skipping`);
    }
  }

  console.log('Seeding done.');
  process.exit(0);
}

seed();