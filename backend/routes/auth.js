/**
 * routes/auth.js  –  POST /login, POST /register
 */
const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const SECRET = process.env.JWT_SECRET || 'medcare_secret_change_in_prod';
const TOKEN_TTL = '12h';

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: TOKEN_TTL });
}

// Resolve a doctor's doctorId from their userId.
// If not yet linked, try to auto-link by matching username suffix to doctor name.
async function resolveDoctorId(userId, username) {
  // 1. Direct match via userId
  const [byId] = await db.query(
    `SELECT doctorId FROM doctors WHERE userId = ?`, [userId]
  );
  if (byId.length) return byId[0].doctorId;

  // 2. Auto-link: username is "dr.<lastname>", match against doctor name
  const suffix = username.replace(/^dr\./i, '').toLowerCase();
  if (!suffix) return null;

  const [byName] = await db.query(
    `SELECT doctorId FROM doctors
     WHERE LOWER(name) LIKE ?
       AND (userId IS NULL OR userId = ?)
     LIMIT 1`,
    [`%${suffix}%`, userId]
  );
  if (!byName.length) return null;

  // Link the userId permanently so future lookups are instant
  await db.query(`UPDATE doctors SET userId = ? WHERE doctorId = ?`,
    [userId, byName[0].doctorId]);

  return byName[0].doctorId;
}

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'username and password required' });

    const [rows] = await db.query(
      `SELECT userId, username, passwordHash, role, email, phone FROM users WHERE username = ?`,
      [username]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const safeUser = {
      userId:   user.userId,
      username: user.username,
      role:     user.role,
      email:    user.email,
      phone:    user.phone,
    };

    // Embed doctorId in JWT so appointments lookup never needs an extra query
    if (user.role === 'doctor') {
      const doctorId = await resolveDoctorId(user.userId, user.username);
      if (doctorId) safeUser.doctorId = doctorId;
    }

    res.json({ token: sign(safeUser), user: safeUser });
  } catch (err) { next(err); }
});

router.post('/register', async (req, res, next) => {
  try {
    const { username, password, name, email, phone, role } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'username and password required' });

    const [exists] = await db.query(`SELECT userId FROM users WHERE username = ?`, [username]);
    if (exists.length) return res.status(409).json({ error: 'Username already taken' });

    const passwordHash = await bcrypt.hash(password, 10);
    const finalRole = ['patient', 'receptionist', 'doctor', 'admin', 'analyst'].includes(role)
      ? role : 'patient';

    const [result] = await db.query(
      `INSERT INTO users (username, passwordHash, role, email, phone) VALUES (?,?,?,?,?)`,
      [username, passwordHash, finalRole, email || null, phone || null]
    );

    if (finalRole === 'patient' && name) {
      await db.query(
        `INSERT INTO patients (userId, name, contact) VALUES (?,?,?)`,
        [result.insertId, name, phone || null]
      );
    }

    const safeUser = {
      userId:   result.insertId,
      username,
      role:     finalRole,
      email:    email || null,
      phone:    phone || null,
    };
    res.status(201).json({ token: sign(safeUser), user: safeUser });
  } catch (err) { next(err); }
});

module.exports = router;
