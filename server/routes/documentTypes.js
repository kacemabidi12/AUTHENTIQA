const express = require('express');
const DocumentType = require('../models/DocumentType');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Helper: check if user can act on a university
function canManageUniversity(user, universityId) {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'UNIVERSITY_ADMIN') {
    // user.universityId may be an ObjectId, compare as string
    return user.universityId && String(user.universityId) === String(universityId);
  }
  return false;
}

// GET /api/universities/:id/document-types
// SUPER_ADMIN or UNIVERSITY_ADMIN for that university
router.get('/universities/:id/document-types', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!canManageUniversity(user, id) && user.role !== 'ANALYST') {
      // ANALYSTs are allowed read-only analytics, but not this endpoint by default
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Return document types for the university
    const items = await DocumentType.find({ universityId: id }).sort({ name: 1 });
    res.json({ documentTypes: items });
  } catch (err) {
    next(err);
  }
});

// POST /api/universities/:id/document-types
// SUPER_ADMIN or UNIVERSITY_ADMIN for that university
router.post('/universities/:id/document-types', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!canManageUniversity(user, id)) return res.status(403).json({ message: 'Forbidden' });

    const { name, version, status } = req.body;
    if (!name) return res.status(400).json({ message: 'Missing name' });

    const doc = new DocumentType({ universityId: id, name, version, status });
    await doc.save();
    res.status(201).json({ documentType: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Duplicate document type' });
    next(err);
  }
});

// PATCH /api/document-types/:id
// SUPER_ADMIN or UNIVERSITY_ADMIN for that document's university
router.patch('/document-types/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const doc = await DocumentType.findById(id);
    if (!doc) return res.status(404).json({ message: 'DocumentType not found' });

    if (!canManageUniversity(user, doc.universityId)) return res.status(403).json({ message: 'Forbidden' });

    const allowed = ['name', 'version', 'status'];
    allowed.forEach((k) => { if (k in req.body) doc[k] = req.body[k]; });
    await doc.save();
    res.json({ documentType: doc });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/document-types/:id/status
// SUPER_ADMIN or UNIVERSITY_ADMIN for that document's university
router.patch('/document-types/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Missing status' });

    const user = req.user;
    const doc = await DocumentType.findById(id);
    if (!doc) return res.status(404).json({ message: 'DocumentType not found' });

    if (!canManageUniversity(user, doc.universityId)) return res.status(403).json({ message: 'Forbidden' });

    doc.status = status;
    await doc.save();
    res.json({ documentType: doc });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
