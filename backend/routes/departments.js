/**
 * routes/departments.js
 */
const router = require('express').Router();
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT dep.*, d.name AS headName
      FROM departments dep
      LEFT JOIN doctors d ON dep.headDoc = d.doctorId
      ORDER BY dep.name ASC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const { name, floor, headDoc } = req.body;
    const [result] = await db.query(
      `INSERT INTO departments (name, floor, headDoc) VALUES (?,?,?)`,
      [name, floor || null, headDoc || null]
    );
    const [created] = await db.query(`SELECT * FROM departments WHERE deptId = ?`, [result.insertId]);
    res.status(201).json(created[0]);
  } catch (err) { next(err); }
});

router.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const { name, floor, headDoc } = req.body;
    await db.query(
      `UPDATE departments SET name=?, floor=?, headDoc=? WHERE deptId=?`,
      [name, floor, headDoc || null, req.params.id]
    );
    const [updated] = await db.query(`SELECT * FROM departments WHERE deptId = ?`, [req.params.id]);
    if (!updated.length) return res.status(404).json({ error: 'Department not found' });
    res.json(updated[0]);
  } catch (err) { next(err); }
});

module.exports = router;
