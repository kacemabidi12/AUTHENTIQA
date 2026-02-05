const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/auth');
const universitiesRoutes = require('./routes/universities');
const documentTypesRoutes = require('./routes/documentTypes');
const scanEventsRoutes = require('./routes/scanEvents');
const analyticsRoutes = require('./routes/analytics');
const fraudCasesRoutes = require('./routes/fraudCases');
let debugRoutes = null;
const errorHandler = require('./middleware/errorHandler');

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// routes
app.use('/api/auth', authRoutes);
app.use('/api/universities', universitiesRoutes);
app.use('/api', documentTypesRoutes);
app.use('/api/scan-events', scanEventsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/fraud-cases', fraudCasesRoutes);

// Mount debug routes only in development for safety
if (process.env.NODE_ENV === 'development') {
  debugRoutes = require('./routes/debug');
  app.use('/api/debug', debugRoutes);
}

// health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// simple ping retained for compatibility
app.get('/api/ping', (req, res) => res.json({ ok: true, now: new Date() }));

// error handler (should be last middleware)
app.use(errorHandler);

// connect to MongoDB and start server
mongoose
  .connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(config.port, () => console.log(`Server running on port ${config.port}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
