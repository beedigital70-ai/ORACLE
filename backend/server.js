const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const setupDb = require('./db/setup');
const scheduleCrons = require('./services/cron');
const apiRoutes = require('./routes/api');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Schedule crons
scheduleCrons();

// Middleware
app.use(cors());
app.use(express.json());

// Run database setup
setupDb();

// Hook API routes (no authentication)
app.use('/api/data', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
