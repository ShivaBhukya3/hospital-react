/**
 * routes/appointments.js
 */

const router = require('express').Router();
const db     = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const socket = require('../socket');

router.use(authenticate);

// ── GET /api/appointments ─────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { date, doctorId, patientId, status } = req.query;
    const { role, userId } = req.user;

    let sql = `
      SELECT
        a.appointmentId, a.appointmentDate, a.appointmentTime,
        a.reason, a.doctorNote, a.status, a.bookedBy, a.forwardedToDoctor, a.createdAt,
        p.patientId, p.name AS patientName, p.age, p.gender, p.bloodGroup,
        d.doctorId,  d.name AS doctorName,  d.department, d.specialization,
        att.checkInTime, att.consultationStartTime, att.consultationEndTime,
        TIMESTAMPDIFF(MINUTE, att.checkInTime, att.consultationStartTime) AS waitMinutes,
        TIMESTAMPDIFF(MINUTE, att.consultationStartTime, att.consultationEndTime) AS durationMinutes
      FROM appointments a
      JOIN patients p  ON a.patientId = p.patientId
      JOIN doctors  d  ON a.doctorId  = d.doctorId
      LEFT JOIN attendance att ON att.appointmentId = a.appointmentId
      WHERE 1=1
    `;
    const params = [];

    // Row-level security
    if (role === 'patient') {
      const [pts] = await db.query(
        `SELECT patientId FROM patients WHERE userId = ?`, [userId]
      );
      if (!pts.length) return res.json([]);
      sql += ' AND a.patientId = ?'; params.push(pts[0].patientId);
    }
    if (role === 'doctor') {
      // 1. doctorId embedded in JWT (available after first login with new auth.js)
      let doctorId = req.user.doctorId || null;

      if (!doctorId) {
        // 2. Direct userId link in doctors table
        const [byId] = await db.query(
          `SELECT doctorId FROM doctors WHERE userId = ?`, [userId]
        );
        if (byId.length) {
          doctorId = byId[0].doctorId;
        } else {
          // 3. Username-suffix match: dr.sharma → sharma → LIKE '%sharma%'
          const suffix = (req.user.username || '').replace(/^dr\./i, '').toLowerCase();
          if (suffix) {
            const [byName] = await db.query(
              `SELECT doctorId FROM doctors WHERE LOWER(name) LIKE ? LIMIT 1`,
              [`%${suffix}%`]
            );
            if (byName.length) {
              doctorId = byName[0].doctorId;
              // Permanently link so future lookups skip the name scan
              await db.query(
                `UPDATE doctors SET userId = ? WHERE doctorId = ? AND (userId IS NULL OR userId = ?)`,
                [userId, doctorId, userId]
              );
            }
          }
        }
      }

      if (!doctorId) return res.json([]);
      sql += ' AND a.doctorId = ?'; params.push(doctorId);
      // Doctors only see Pending appointments that have been forwarded by reception
      sql += ' AND (a.status != \'Pending\' OR a.forwardedToDoctor = 1)';
    }

    if (date)      { sql += ' AND a.appointmentDate = ?'; params.push(date); }
    if (doctorId)  { sql += ' AND a.doctorId = ?';        params.push(doctorId); }
    if (patientId) { sql += ' AND a.patientId = ?';       params.push(patientId); }
    if (status)    { sql += ' AND a.status = ?';           params.push(status); }

    sql += ' ORDER BY a.appointmentDate ASC, a.appointmentTime ASC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /api/appointments/:id ─────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, p.name AS patientName, d.name AS doctorName, d.department
       FROM appointments a
       JOIN patients p ON a.patientId = p.patientId
       JOIN doctors  d ON a.doctorId  = d.doctorId
       WHERE a.appointmentId = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Appointment not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── POST /api/appointments ────────────────────────────────────
router.post('/', authorize('patient', 'receptionist', 'admin'), async (req, res, next) => {
  try {
    let { patientId, doctorId, appointmentDate, appointmentTime, reason } = req.body;

    // Patients don't know their own patientId — resolve from authenticated userId
    if (req.user.role === 'patient') {
      const [pts] = await db.query(
        `SELECT patientId FROM patients WHERE userId = ?`, [req.user.userId]
      );
      if (!pts.length)
        return res.status(404).json({ error: 'Patient profile not found. Please contact reception.' });
      patientId = pts[0].patientId;
    }

    if (!patientId || !doctorId || !appointmentDate || !appointmentTime)
      return res.status(400).json({ error: 'doctorId, appointmentDate, appointmentTime are required' });

    // Conflict check
    const [conflict] = await db.query(
      `SELECT appointmentId FROM appointments
       WHERE doctorId = ? AND appointmentDate = ? AND appointmentTime = ? AND status != 'Cancelled'`,
      [doctorId, appointmentDate, appointmentTime]
    );
    if (conflict.length)
      return res.status(409).json({ error: 'This time slot is already booked' });

    // Patients booking online → Pending (needs receptionist → doctor flow)
    // Reception/admin booking → Scheduled directly
    const initialStatus = req.user.role === 'patient' ? 'Pending' : 'Scheduled';
    // Walk-ins booked by reception are auto-forwarded (not applicable), online need forwarding
    const forwarded = req.user.role === 'patient' ? 0 : 1;

    const [result] = await db.query(
      `INSERT INTO appointments (patientId, doctorId, appointmentDate, appointmentTime, reason, status, bookedBy, forwardedToDoctor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [patientId, doctorId, appointmentDate, appointmentTime, reason || null, initialStatus, req.user.role, forwarded]
    );

    const [created] = await db.query(
      `SELECT a.*, p.name AS patientName, d.name AS doctorName, d.department
       FROM appointments a
       JOIN patients p ON a.patientId = p.patientId
       JOIN doctors  d ON a.doctorId  = d.doctorId
       WHERE a.appointmentId = ?`,
      [result.insertId]
    );
    socket.emit('appointment:new', created[0]);
    res.status(201).json(created[0]);
  } catch (err) { next(err); }
});

// ── PATCH /api/appointments/:id/status ───────────────────────
router.patch('/:id/status', async (req, res, next) => {
  try {
    const VALID = ['Scheduled', 'Checked-In', 'In-Progress', 'Completed', 'Cancelled'];
    const { status } = req.body;
    if (!VALID.includes(status))
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID.join(', ')}` });

    const [result] = await db.query(
      `UPDATE appointments SET status = ? WHERE appointmentId = ?`,
      [status, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Appointment not found' });
    socket.emit('appointment:updated', { appointmentId: Number(req.params.id), status });
    res.json({ message: 'Status updated', appointmentId: req.params.id, status });
  } catch (err) { next(err); }
});

// ── DELETE /api/appointments/:id (soft cancel) ───────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await db.query(
      `UPDATE appointments SET status = 'Cancelled' WHERE appointmentId = ?`,
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Appointment not found' });
    socket.emit('appointment:updated', { appointmentId: Number(req.params.id), status: 'Cancelled' });
    res.json({ message: 'Appointment cancelled', appointmentId: req.params.id });
  } catch (err) { next(err); }
});

// ── PATCH /api/appointments/:id/forward  (receptionist → doctor) ──
router.patch('/:id/forward', authorize('receptionist', 'admin'), async (req, res, next) => {
  try {
    const [result] = await db.query(
      `UPDATE appointments SET forwardedToDoctor = 1 WHERE appointmentId = ? AND status = 'Pending'`,
      [req.params.id]
    );
    if (!result.affectedRows)
      return res.status(404).json({ error: 'Appointment not found or not in Pending state' });

    const [rows] = await db.query(
      `SELECT a.*, p.name AS patientName, d.name AS doctorName, d.department
       FROM appointments a
       JOIN patients p ON a.patientId = p.patientId
       JOIN doctors  d ON a.doctorId  = d.doctorId
       WHERE a.appointmentId = ?`, [req.params.id]
    );
    socket.emit('appointment:forwarded', rows[0]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── PATCH /api/appointments/:id/approve  (doctor accepts) ────
router.patch('/:id/approve', authorize('doctor', 'admin', 'receptionist'), async (req, res, next) => {
  try {
    const { appointmentTime } = req.body;
    const updates = appointmentTime
      ? `status = 'Scheduled', appointmentTime = ?`
      : `status = 'Scheduled'`;
    const params  = appointmentTime
      ? [appointmentTime, req.params.id]
      : [req.params.id];

    const [result] = await db.query(
      `UPDATE appointments SET ${updates} WHERE appointmentId = ? AND status = 'Pending'`,
      params
    );
    if (!result.affectedRows)
      return res.status(404).json({ error: 'Appointment not found or not in Pending state' });

    const [rows] = await db.query(
      `SELECT a.*, p.name AS patientName, d.name AS doctorName, d.department
       FROM appointments a
       JOIN patients p ON a.patientId = p.patientId
       JOIN doctors  d ON a.doctorId  = d.doctorId
       WHERE a.appointmentId = ?`, [req.params.id]
    );
    socket.emit('appointment:approved', rows[0]);
    socket.emit('appointment:updated', { appointmentId: Number(req.params.id), status: 'Scheduled', appointmentTime: rows[0].appointmentTime });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── PATCH /api/appointments/:id/note  (doctor sends note to patient) ──
router.patch('/:id/note', authorize('doctor', 'admin'), async (req, res, next) => {
  try {
    const { note } = req.body;
    await db.query(
      `UPDATE appointments SET doctorNote = ? WHERE appointmentId = ?`,
      [note || null, req.params.id]
    );
    socket.emit('appointment:noted', { appointmentId: Number(req.params.id), doctorNote: note || null });
    res.json({ message: 'Note saved', appointmentId: req.params.id });
  } catch (err) { next(err); }
});

// ── PATCH /api/appointments/:id/reject  (doctor declines) ────
router.patch('/:id/reject', authorize('doctor', 'admin'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const [result] = await db.query(
      `UPDATE appointments SET status = 'Cancelled', doctorNote = ? WHERE appointmentId = ? AND status = 'Pending'`,
      [reason || 'Appointment declined by doctor', req.params.id]
    );
    if (!result.affectedRows)
      return res.status(404).json({ error: 'Appointment not found or not in Pending state' });

    socket.emit('appointment:rejected', { appointmentId: Number(req.params.id), status: 'Cancelled', doctorNote: reason });
    socket.emit('appointment:updated',  { appointmentId: Number(req.params.id), status: 'Cancelled' });
    res.json({ message: 'Appointment rejected', appointmentId: req.params.id });
  } catch (err) { next(err); }
});

module.exports = router;
