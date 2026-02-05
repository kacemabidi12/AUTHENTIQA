const express = require('express');
const ScanEvent = require('../models/ScanEvent');
const DocumentType = require('../models/DocumentType');
const { requireAuth, requireRole, applyTenantScope } = require('../middleware/auth');

const router = express.Router();

// Helper to build tenant-scoped match
function scopedMatch(req, extra = {}) {
  // applyTenantScope will add universityId constraint for UNIVERSITY_ADMIN
  return applyTenantScope(req, extra, 'universityId');
}

// GET /api/analytics/overview
router.get('/overview', requireAuth, requireRole(['SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'ANALYST']), async (req, res, next) => {
  try {
    const baseMatch = scopedMatch(req, {});

    // Build aggregation to compute counts and averages
    const agg = [
      { $match: baseMatch },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalScans: { $sum: 1 },
                authenticCount: { $sum: { $cond: [{ $eq: ['$resultLabel', 'AUTHENTIC'] }, 1, 0] } },
                suspiciousCount: { $sum: { $cond: [{ $eq: ['$resultLabel', 'SUSPICIOUS'] }, 1, 0] } },
                forgedCount: { $sum: { $cond: [{ $eq: ['$resultLabel', 'FORGED'] }, 1, 0] } },
                avgConfidence: { $avg: '$confidence' },
                avgRiskScore: { $avg: '$riskScore' }
              }
            }
          ],
          topReasons: [
            { $unwind: { path: '$reasons', preserveNullAndEmptyArrays: false } },
            { $group: { _id: '$reasons', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          topDocumentTypes: [
            { $group: { _id: '$documentTypeId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: 'documenttypes',
                localField: '_id',
                foreignField: '_id',
                as: 'doc'
              }
            },
            { $unwind: { path: '$doc', preserveNullAndEmptyArrays: true } },
            { $project: { name: '$doc.name', count: 1 } }
          ],
          last7Days: [
            { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
            { $count: 'count' }
          ],
          last30Days: [
            { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
            { $count: 'count' }
          ]
        }
      }
    ];

    const out = await ScanEvent.aggregate(agg).exec();
    const data = out[0] || {};

    const totals = (data.totals && data.totals[0]) || { totalScans: 0, authenticCount: 0, suspiciousCount: 0, forgedCount: 0, avgConfidence: null, avgRiskScore: null };

    const topReasons = (data.topReasons || []).map(r => ({ reason: r._id, count: r.count }));
    const topDocumentTypes = (data.topDocumentTypes || []).map(d => ({ name: d.name || 'Unknown', count: d.count }));

    const last7 = (data.last7Days && data.last7Days[0] && data.last7Days[0].count) || 0;
    const last30 = (data.last30Days && data.last30Days[0] && data.last30Days[0].count) || 0;

    const totalScans = totals.totalScans || 0;
    const forgedCount = totals.forgedCount || 0;
    const suspiciousCount = totals.suspiciousCount || 0;
    const authenticCount = totals.authenticCount || 0;

    res.json({
      totalScans,
      authenticCount,
      suspiciousCount,
      forgedCount,
      fraudRateEstimate: totalScans ? forgedCount / totalScans : 0,
      suspiciousRate: totalScans ? suspiciousCount / totalScans : 0,
      avgConfidence: totals.avgConfidence || 0,
      avgRiskScore: totals.avgRiskScore || 0,
      topReasons,
      topDocumentTypes,
      last7Days: last7,
      last30Days: last30
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/timeseries
// Params: dateFrom, dateTo, granularity=day|week
router.get('/timeseries', requireAuth, requireRole(['SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'ANALYST']), async (req, res, next) => {
  try {
    const { dateFrom, dateTo, granularity } = req.query;
    const unit = granularity === 'week' ? 'week' : 'day';

    const match = scopedMatch(req, {});
    if (dateFrom) match.createdAt = { ...(match.createdAt || {}), $gte: new Date(dateFrom) };
    if (dateTo) match.createdAt = { ...(match.createdAt || {}), $lte: new Date(dateTo) };

    // Use $dateTrunc to bucket by day/week (requires MongoDB 5.0+)
    const agg = [
      { $match: match },
      {
        $group: {
          _id: {
            $dateTrunc: { date: '$createdAt', unit }
          },
          total: { $sum: 1 },
          authentic: { $sum: { $cond: [{ $eq: ['$resultLabel', 'AUTHENTIC'] }, 1, 0] } },
          suspicious: { $sum: { $cond: [{ $eq: ['$resultLabel', 'SUSPICIOUS'] }, 1, 0] } },
          forged: { $sum: { $cond: [{ $eq: ['$resultLabel', 'FORGED'] }, 1, 0] } }
        }
      },
      { $sort: { '_id': 1 } }
    ];

    const out = await ScanEvent.aggregate(agg).exec();

    const result = out.map(r => ({ date: r._id.toISOString(), authentic: r.authentic, suspicious: r.suspicious, forged: r.forged, total: r.total }));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/geo
router.get('/geo', requireAuth, requireRole(['SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'ANALYST']), async (req, res, next) => {
  try {
    const match = scopedMatch(req, {});

    const agg = [
      { $match: match },
      { $group: { _id: { country: '$geoCountry', city: '$geoCity' }, count: { $sum: 1 } } },
      { $sort: { 'count': -1 } }
    ];

    const out = await ScanEvent.aggregate(agg).exec();
    const byCountry = {};
    out.forEach(r => {
      const country = r._id.country || 'Unknown';
      const city = r._id.city || 'Unknown';
      byCountry[country] = byCountry[country] || {};
      byCountry[country][city] = (byCountry[country][city] || 0) + r.count;
    });

    res.json(byCountry);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
