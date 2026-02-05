const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

// requireAuth: verifies JWT and attaches user to req.user
async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });

    const token = auth.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// requireRole: factory returning middleware that allows access only to specified roles
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      // SUPER_ADMIN bypasses role checks
      if (user.role === 'SUPER_ADMIN') return next();

      if (allowedRoles.includes(user.role)) return next();

      return res.status(403).json({ message: 'Forbidden' });
    } catch (err) {
      next(err);
    }
  };
}

// applyTenantScope: returns a filter that enforces university scoping based on req.user
// Usage: const filter = applyTenantScope(req, {}); Model.find(filter)
function applyTenantScope(req, baseFilter = {}, fieldName = 'universityId') {
  const user = req.user;
  if (!user) return baseFilter;

  // SUPER_ADMIN has no scoping
  if (user.role === 'SUPER_ADMIN') return baseFilter;

  // UNIVERSITY_ADMIN: scope to their university
  if (user.role === 'UNIVERSITY_ADMIN') {
    if (!user.universityId) return { ...baseFilter, _id: null }; // will return empty
    // for queries on University collection, the id field is _id, otherwise filter by universityId
    if (fieldName === '_id') {
      return { ...baseFilter, _id: user.universityId };
    }
    return { ...baseFilter, [fieldName]: user.universityId };
  }

  // ANALYST and others: no access by default (caller may decide)
  return { ...baseFilter, _id: null };
}

module.exports = { requireAuth, requireRole, applyTenantScope };
