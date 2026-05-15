/**
 * routes/attendance.js
 */
const router = require('express').Router();
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const socket = require('../socket');
router.use(authenticate);

// Check-in patient
router.post('/checkin', authorize('receptionist', 'admin'), async (req, res, next) => {
  try {
    const { appointmentId } = req.body;
    await db.query(
      `INSERT INTO attendance (appointmentId, checkInTime)
       VALUES (?, NOW())
       ON DUPLICATE KEY UPDATE checkInTime = NOW()`,
      [appointmentId]
    );
    await db.query(
      `UPDATE appointments SET status = 'Checked-In' WHERE appointmentId = ?`,
      [appointmentId]
    );
    socket.emit('attendance:updated', { appointmentId: Number(appointmentId), status: 'Checked-In' });
    res.json({ message: 'Patient checked in', appointmentId });
  } catch (err) { next(err); }
});

// Doctor starts consultation
router.post('/start', authorize('doctor', 'admin'), async (req, res, next) => {
  try {
    const { appointmentId } = req.body;
    const [rows] = await db.query(
      `SELECT attendanceId FROM attendance WHERE appointmentId = ?`, [appointmentId]
    );
    if (!rows.length)
      return res.status(400).json({ error: 'Patient must check in first' });

    await db.query(
      `UPDATE attendance SET consultationStartTime = NOW() WHERE appointmentId = ?`,
      [appointmentId]
    );
    await db.query(
      `UPDATE appointments SET status = 'In-Progress' WHERE appointmentId = ?`,
      [appointmentId]
    );
    socket.emit('attendance:updated', { appointmentId: Number(appointmentId), status: 'In-Progress' });
    res.json({ message: 'Consultation started', appointmentId });
  } catch (err) { next(err); }
});

// Doctor ends consultation
router.post('/end', authorize('doctor', 'admin'), async (req, res, next) => {
  try {
    const { appointmentId, notes } = req.body;
    await db.query(
      `UPDATE attendance SET consultationEndTime = NOW(), notes = ? WHERE appointmentId = ?`,
      [notes || null, appointmentId]
    );
    await db.query(
      `UPDATE appointments SET status = 'Completed' WHERE appointmentId = ?`,
      [appointmentId]
    );
    socket.emit('attendance:updated', { appointmentId: Number(appointmentId), status: 'Completed' });
    res.json({ message: 'Consultation completed', appointmentId });
  } catch (err) { next(err); }
});

router.get('/:appointmentId', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT *, TIMESTAMPDIFF(MINUTE, checkInTime, consultationStartTime) AS waitMinutes,
                 TIMESTAMPDIFF(MINUTE, consultationStartTime, consultationEndTime) AS durationMinutes
       FROM attendance WHERE appointmentId = ?`,
      [req.params.appointmentId]
    );
    res.json(rows[0] || null);
  } catch (err) { next(err); }
});

module.exports = router;
