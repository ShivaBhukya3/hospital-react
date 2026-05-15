/**
 * routes/doctors.js
 */
const router = require('express').Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const socket = require('../socket');
router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, u.username, u.email AS userEmail, u.phone AS userPhone
       FROM doctors d
       LEFT JOIN users u ON d.userId = u.userId
       ORDER BY d.name ASC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const { name, department, deptId, specialization } = req.body;
    const [result] = await db.query(
      `INSERT INTO doctors (name, department, deptId, specialization) VALUES (?,?,?,?)`,
      [name, department, deptId || null, specialization || null]
    );
    const [created] = await db.query(`SELECT * FROM doctors WHERE doctorId = ?`, [result.insertId]);
    res.status(201).json(created[0]);
  } catch (err) { next(err); }
});

// Create login account for a doctor who has none
router.post('/:id/account', authorize('admin'), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'username and password required' });

    const [docs] = await db.query('SELECT doctorId, userId FROM doctors WHERE doctorId = ?', [req.params.id]);
    if (!docs.length) return res.status(404).json({ error: 'Doctor not found' });
    if (docs[0].userId) return res.status(409).json({ error: 'Doctor already has an account' });

    const [exists] = await db.query('SELECT userId FROM users WHERE username = ?', [username]);
    if (exists.length) return res.status(409).json({ error: 'Username already taken' });

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (username, passwordHash, role) VALUES (?, ?, 'doctor')`,
      [username, passwordHash]
    );
    await db.query('UPDATE doctors SET userId = ? WHERE doctorId = ?', [result.insertId, req.params.id]);

    res.status(201).json({ userId: result.insertId, username, message: 'Account created' });
  } catch (err) { next(err); }
});

// Reset doctor account password
router.patch('/:id/account/password', authorize('admin'), async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'password required' });

    const [docs] = await db.query('SELECT userId FROM doctors WHERE doctorId = ?', [req.params.id]);
    if (!docs.length || !docs[0].userId)
      return res.status(404).json({ error: 'Doctor or linked account not found' });

    const passwordHash = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET passwordHash = ? WHERE userId = ?', [passwordHash, docs[0].userId]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) { next(err); }
});

router.patch('/:id/availability', authorize('admin', 'doctor'), async (req, res, next) => {
  try {
    const { availability } = req.body;
    const VALID = ['Available', 'Busy', 'Off-duty'];
    if (!VALID.includes(availability))
      return res.status(400).json({ error: 'availability must be Available | Busy | Off-duty' });
    await db.query(`UPDATE doctors SET availability = ? WHERE doctorId = ?`, [availability, req.params.id]);
    const [updated] = await db.query(`SELECT * FROM doctors WHERE doctorId = ?`, [req.params.id]);
    socket.emit('doctor:availability', { doctorId: Number(req.params.id), availability });
    res.json(updated[0]);
  } catch (err) { next(err); }
});

module.exports = router;
