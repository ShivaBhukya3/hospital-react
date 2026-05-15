/**
 * middleware/auth.js  –  JWT verification + role-based access control
 */

const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'medcare_secret_change_in_prod';

/** Verify JWT – attaches decoded payload to req.user */
exports.authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });

  try {
    req.user = jwt.verify(header.split(' ')[1], SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/** Role guard – usage: authorize('admin', 'analyst') */
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return res.status(403).json({ error: `Access denied for role: ${req.user?.role}` });
  next();
};
