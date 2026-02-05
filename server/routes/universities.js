const express = require('express');
const University = require('../models/University');
const { requireAuth, requireRole, applyTenantScope } = require('../middleware/auth');

const router = express.Router();

// GET /api/universities
// - SUPER_ADMIN: returns all
// - UNIVERSITY_ADMIN: returns only their own university (tenant-scoped)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const user = req.user;

    // SUPER_ADMIN -> full list
    if (user.role === 'SUPER_ADMIN') {
      const items = await University.find().sort({ name: 1 });
      return res.json({ universities: items });
    }

    // UNIVERSITY_ADMIN -> only their university
    if (user.role === 'UNIVERSITY_ADMIN') {
      const filter = applyTenantScope(req, {}, '_id');
      const items = await University.find(filter);
      return res.json({ universities: items });
    }

    // others: forbidden
    return res.status(403).json({ message: 'Forbidden' });
  } catch (err) {
    next(err);
  }
});

// POST /api/universities (SUPER_ADMIN only)
router.post('/', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { name, country, status } = req.body;
    if (!name) return res.status(400).json({ message: 'Missing name' });

    const uni = new University({ name, country, status });
    await uni.save();
    res.status(201).json({ university: uni });
  } catch (err) {
    // duplicate key handling
    if (err.code === 11000) return res.status(400).json({ message: 'University with that name already exists' });
    next(err);
  }
});

// PATCH /api/universities/:id (SUPER_ADMIN only)
router.patch('/:id', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = {};
    const allowed = ['name', 'country', 'status'];
    allowed.forEach(k => { if (k in req.body) updates[k] = req.body[k]; });

    const uni = await University.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!uni) return res.status(404).json({ message: 'University not found' });
    res.json({ university: uni });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/universities/:id/status (SUPER_ADMIN only) - update only status
router.patch('/:id/status', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Missing status' });

    const uni = await University.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    if (!uni) return res.status(404).json({ message: 'University not found' });
    res.json({ university: uni });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
