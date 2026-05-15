/**
 * routes/patients.js
 */
const router = require('express').Router();
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
router.use(authenticate);

router.get('/', authorize('receptionist', 'admin', 'doctor', 'analyst'), async (_req, res, next) => {
  try {
    const [rows] = await db.query(`SELECT * FROM patients ORDER BY name ASC`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query(`SELECT * FROM patients WHERE patientId = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Patient not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', authorize('receptionist', 'admin'), async (req, res, next) => {
  try {
    const { name, age, gender, contact, address, bloodGroup } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const [result] = await db.query(
      `INSERT INTO patients (name, age, gender, contact, address, bloodGroup) VALUES (?,?,?,?,?,?)`,
      [name, age || null, gender || null, contact || null, address || null, bloodGroup || null]
    );
    const [created] = await db.query(`SELECT * FROM patients WHERE patientId = ?`, [result.insertId]);
    res.status(201).json(created[0]);
  } catch (err) { next(err); }
});

router.put('/:id', authorize('receptionist', 'admin', 'doctor'), async (req, res, next) => {
  try {
    const { name, age, gender, contact, address, bloodGroup, emr } = req.body;
    await db.query(
      `UPDATE patients SET name=?, age=?, gender=?, contact=?, address=?, bloodGroup=?, emr=?
       WHERE patientId = ?`,
      [name, age, gender, contact, address, bloodGroup, emr || null, req.params.id]
    );
    const [updated] = await db.query(`SELECT * FROM patients WHERE patientId = ?`, [req.params.id]);
    if (!updated.length) return res.status(404).json({ error: 'Patient not found' });
    res.json(updated[0]);
  } catch (err) { next(err); }
});

module.exports = router;
