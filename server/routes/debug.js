const express = require('express');
const User = require('../models/User');
const University = require('../models/University');
const DocumentType = require('../models/DocumentType');
const ScanEvent = require('../models/ScanEvent');
const FraudCase = require('../models/FraudCase');

const router = express.Router();

// Protect: only available in development mode
router.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not found' });
  }
  next();
});

// GET /api/debug/status
router.get('/status', async (req, res, next) => {
  try {
    const [users, universities, documentTypes, scanEvents, fraudCases] = await Promise.all([
      User.countDocuments(),
      University.countDocuments(),
      DocumentType.countDocuments(),
      ScanEvent.countDocuments(),
      FraudCase.countDocuments()
    ]);

    res.json({ users, universities, documentTypes, scanEvents, fraudCases });
  } catch (err) {
    next(err);
  }
});

// GET /api/debug/users
// returns list of users with only email and role
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find({}, 'email role').lean();
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
