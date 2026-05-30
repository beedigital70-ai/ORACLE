const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const setupDb = require('./db/setup');
const apiRoutes = require('./routes/api');

dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (token === `Bearer ${process.env.APP_PASSWORD}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.APP_PASSWORD) {
    res.json({ token: process.env.APP_PASSWORD });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.use('/api/data', authenticate, apiRoutes);

app.get('/api/health', async (req, res) => {
  await setupDb();
  res.json({ status: 'ok, db setup triggered' });
});

// Start the server if running locally
if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`API running on port ${port}`));
}

module.exports = app;
