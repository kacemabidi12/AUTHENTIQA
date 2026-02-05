const express = require('express');
const ScanEvent = require('../models/ScanEvent');
const { requireAuth, requireRole, applyTenantScope } = require('../middleware/auth');

const router = express.Router();

// Simple in-memory rate limiter per IP
const rateMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // max per window per IP

function rateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, start: now };

  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }

  entry.count += 1;
  rateMap.set(ip, entry);

  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  res.set('X-RateLimit-Limit', String(MAX_REQUESTS));
  res.set('X-RateLimit-Remaining', String(remaining));

  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({ message: 'Too many requests' });
  }

  next();
}

// POST /api/scan-events
// Accepts a JSON payload (no raw file). Validates and stores a ScanEvent document.
router.post('/', rateLimiter, async (req, res, next) => {
  try {
    const p = req.body || {};

    // Basic validation
    const required = ['universityId', 'documentTypeId', 'sourceApp', 'docHash', 'resultLabel'];
    for (const k of required) {
      if (!p[k]) return res.status(400).json({ message: `Missing field: ${k}` });
    }

    if (!['ios', 'android'].includes(p.sourceApp)) return res.status(400).json({ message: 'Invalid sourceApp' });
    if (!['AUTHENTIC', 'SUSPICIOUS', 'FORGED'].includes(p.resultLabel)) return res.status(400).json({ message: 'Invalid resultLabel' });

    if (p.confidence != null) {
      const c = Number(p.confidence);
      if (Number.isNaN(c) || c < 0 || c > 1) return res.status(400).json({ message: 'Invalid confidence' });
      p.confidence = c;
    }

    if (p.riskScore != null) {
      const r = Number(p.riskScore);
      if (Number.isNaN(r) || r < 0 || r > 100) return res.status(400).json({ message: 'Invalid riskScore' });
      p.riskScore = r;
    }

    if (p.suspiciousRegionsCount != null) {
      const s = parseInt(p.suspiciousRegionsCount, 10);
      if (Number.isNaN(s) || s < 0) return res.status(400).json({ message: 'Invalid suspiciousRegionsCount' });
      p.suspiciousRegionsCount = s;
    }

    // Ensure reasons is an array of strings if present
    if (p.reasons != null && !Array.isArray(p.reasons)) return res.status(400).json({ message: 'reasons must be an array' });

    // ocrFields should be an object if present
    if (p.ocrFields != null && typeof p.ocrFields !== 'object') return res.status(400).json({ message: 'ocrFields must be an object' });

    // Do not accept any raw document binary payloads (e.g., file fields). We only accept metadata.

    const doc = new ScanEvent({
      universityId: p.universityId,
      documentTypeId: p.documentTypeId,
      sourceApp: p.sourceApp,
      docHash: p.docHash,
      resultLabel: p.resultLabel,
      confidence: p.confidence,
      reasons: p.reasons || [],
      riskScore: p.riskScore || 0,
      suspiciousRegionsCount: p.suspiciousRegionsCount || 0,
      ocrFields: p.ocrFields || {},
      geoCountry: p.geoCountry,
      geoCity: p.geoCity,
      deviceLanguage: p.deviceLanguage
    });

    await doc.save();

    res.status(201).json({ id: doc._id });
  } catch (err) {
    next(err);
  }
});

// GET /api/scan-events
// Read access: SUPER_ADMIN, UNIVERSITY_ADMIN (scoped), ANALYST
router.get('/', requireAuth, requireRole(['SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'ANALYST']), async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const {
      universityId,
      documentTypeId,
      resultLabel,
      minConfidence,
      maxConfidence,
      minRiskScore,
      maxRiskScore,
      dateFrom,
      dateTo,
      country,
      city
    } = req.query;

    let page = parseInt(req.query.page, 10) || 1;
    let pageSize = parseInt(req.query.pageSize, 10) || 20;
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 20;
    pageSize = Math.min(pageSize, 100);

    const sortBy = ['createdAt', 'riskScore', 'confidence'].includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortDir = req.query.sortDir === 'asc' ? 1 : -1;

    const baseFilter = {};

    // Apply explicit filters
    if (documentTypeId) baseFilter.documentTypeId = documentTypeId;
    if (resultLabel) baseFilter.resultLabel = resultLabel;
    if (country) baseFilter.geoCountry = country;
    if (city) baseFilter.geoCity = city;

    if (minConfidence != null || maxConfidence != null) {
      baseFilter.confidence = {};
      if (minConfidence != null) baseFilter.confidence.$gte = Number(minConfidence);
      if (maxConfidence != null) baseFilter.confidence.$lte = Number(maxConfidence);
    }

    if (minRiskScore != null || maxRiskScore != null) {
      baseFilter.riskScore = {};
      if (minRiskScore != null) baseFilter.riskScore.$gte = Number(minRiskScore);
      if (maxRiskScore != null) baseFilter.riskScore.$lte = Number(maxRiskScore);
    }

    if (dateFrom || dateTo) {
      baseFilter.createdAt = {};
      if (dateFrom) baseFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) baseFilter.createdAt.$lte = new Date(dateTo);
    }

    // Search q: docHash OR ocrFields.studentId OR ocrFields.name (case-insensitive)
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      baseFilter.$or = [
        { docHash: re },
        { 'ocrFields.studentId': re },
        { 'ocrFields.name': re }
      ];
    }

    // Start with baseFilter, then apply tenant scoping
    let filter = { ...baseFilter };

    // If universityId provided, prefer that but still enforce tenant scope
    if (universityId) filter.universityId = universityId;

    // apply tenant scoping: for UNIVERSITY_ADMIN this will restrict universityId
    filter = applyTenantScope(req, filter, 'universityId');

    // Query total and paginated items
    const total = await ScanEvent.countDocuments(filter);
    const items = await ScanEvent.find(filter)
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()
      .exec();

    res.json({ items, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});

// GET /api/scan-events/:id
// Read access: SUPER_ADMIN, UNIVERSITY_ADMIN (scoped), ANALYST
router.get('/:id', requireAuth, requireRole(['SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'ANALYST']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await ScanEvent.findById(id).lean();
    if (!doc) return res.status(404).json({ message: 'ScanEvent not found' });

    // enforce tenant scoping
    const filter = applyTenantScope(req, { _id: doc._id }, 'universityId');
    // if applyTenantScope returned {_id:null} and user is not SUPER_ADMIN, block
    if (String(filter._id || '') === String(null) && req.user.role !== 'SUPER_ADMIN') {
      // For UNIVERSITY_ADMIN, check universityId match
      if (req.user.role === 'UNIVERSITY_ADMIN' && String(req.user.universityId) !== String(doc.universityId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    // For safety, if UNIVERSITY_ADMIN ensure doc.universityId matches
    if (req.user.role === 'UNIVERSITY_ADMIN' && String(req.user.universityId) !== String(doc.universityId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json({ scanEvent: doc });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
