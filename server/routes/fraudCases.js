const express = require('express');
const FraudCase = require('../models/FraudCase');
const ScanEvent = require('../models/ScanEvent');
const { requireAuth, requireRole, applyTenantScope } = require('../middleware/auth');

const router = express.Router();

// GET /api/fraud-cases
// Roles allowed to READ: SUPER_ADMIN, UNIVERSITY_ADMIN (scoped), ANALYST
router.get('/', requireAuth, requireRole(['SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'ANALYST']), async (req, res, next) => {
  try {
    const {
      status,
      assignedToUserId,
      universityId,
      dateFrom,
      dateTo
    } = req.query;

    let page = parseInt(req.query.page, 10) || 1;
    let pageSize = parseInt(req.query.pageSize, 10) || 20;
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 20;
    pageSize = Math.min(pageSize, 200);

    const baseFilter = {};
    if (status) baseFilter.status = status;
    if (assignedToUserId) baseFilter.assignedToUserId = assignedToUserId;
    if (universityId) baseFilter.universityId = universityId; // optional override
    if (dateFrom || dateTo) {
      baseFilter.createdAt = {};
      if (dateFrom) baseFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) baseFilter.createdAt.$lte = new Date(dateTo);
    }

    // Enforce tenant scoping for UNIVERSITY_ADMIN
    const filter = applyTenantScope(req, baseFilter, 'universityId');

    const total = await FraudCase.countDocuments(filter);
    const items = await FraudCase.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()
      .exec();

    res.json({ items, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});

// POST /api/fraud-cases
// Create a fraud case from a scanEventId. Allowed: SUPER_ADMIN, UNIVERSITY_ADMIN (scoped)
router.post('/', requireAuth, requireRole(['SUPER_ADMIN', 'UNIVERSITY_ADMIN']), async (req, res, next) => {
  try {
    const { scanEventId, assignedToUserId, notes, status } = req.body;
    if (!scanEventId) return res.status(400).json({ message: 'Missing scanEventId' });

    const scan = await ScanEvent.findById(scanEventId).lean();
    if (!scan) return res.status(404).json({ message: 'ScanEvent not found' });

    // Enforce tenant scoping: UNIVERSITY_ADMIN can only create for their own university
    if (req.user.role === 'UNIVERSITY_ADMIN') {
      if (!req.user.universityId || String(req.user.universityId) !== String(scan.universityId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const fc = new FraudCase({
      scanEventId,
      status: status || 'OPEN',
      assignedToUserId: assignedToUserId || null,
      notes: notes || ''
    });

    await fc.save();
    res.status(201).json({ id: fc._id, fraudCase: fc });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/fraud-cases/:id
// Update status, assign, notes. Allowed: SUPER_ADMIN, UNIVERSITY_ADMIN (scoped)
router.patch('/:id', requireAuth, requireRole(['SUPER_ADMIN', 'UNIVERSITY_ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, assignedToUserId, notes } = req.body;

    const fc = await FraudCase.findById(id);
    if (!fc) return res.status(404).json({ message: 'FraudCase not found' });

    // Fetch related scan to determine university scope
    const scan = await ScanEvent.findById(fc.scanEventId).lean();
    if (!scan) return res.status(400).json({ message: 'Related ScanEvent not found' });

    if (req.user.role === 'UNIVERSITY_ADMIN') {
      if (!req.user.universityId || String(req.user.universityId) !== String(scan.universityId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const allowed = ['status', 'assignedToUserId', 'notes'];
    if (status !== undefined) fc.status = status;
    if (assignedToUserId !== undefined) fc.assignedToUserId = assignedToUserId;
    if (notes !== undefined) fc.notes = notes;

    await fc.save();
    res.json({ fraudCase: fc });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
