require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

connectDB();
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/submissions', require('./routes/submissions.routes'));
app.use('/api/appeals', require('./routes/appeals.routes'));
app.use('/api/admin/analytics', require('./routes/analytics.routes'));
app.use('/api/test', require('./routes/test.routes'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/policies', require('./routes/policies.routes'));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));