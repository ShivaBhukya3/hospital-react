/**
 * routes/analytics.js
 * All endpoints restricted to admin + analyst roles
 */

const router = require('express').Router();
const db     = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin', 'analyst'));

// ── GET /api/analytics/summary  –  KPI cards ─────────────────
router.get('/summary', async (_req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*)                                                                      AS total,
        COUNT(*) FILTER (WHERE a.status = 'Completed')                               AS completed,
        COUNT(*) FILTER (WHERE a.status = 'Cancelled')                               AS cancelled,
        COUNT(*) FILTER (WHERE a.appointmentDate = CURRENT_DATE)                     AS today,
        ROUND(AVG(EXTRACT(EPOCH FROM (att.consultationStartTime - att.checkInTime))
              / 60)::numeric, 1)                                                     AS avgWaitMin,
        ROUND(AVG(EXTRACT(EPOCH FROM (att.consultationEndTime - att.consultationStartTime))
              / 60)::numeric, 1)                                                     AS avgDurationMin
      FROM appointments a
      LEFT JOIN attendance att ON att.appointmentId = a.appointmentId
    `);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── GET /api/analytics/daily?days=30  –  Trend ───────────────
router.get('/daily', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const [rows] = await db.query(`
      SELECT
        appointmentDate                                       AS date,
        COUNT(*)                                             AS total,
        COUNT(*) FILTER (WHERE status = 'Completed')        AS completed,
        COUNT(*) FILTER (WHERE status = 'Cancelled')        AS cancelled
      FROM appointments
      WHERE appointmentDate >= CURRENT_DATE - (?::int * INTERVAL '1 day')
      GROUP BY appointmentDate
      ORDER BY appointmentDate ASC
    `, [days]);
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /api/analytics/peak-hours ────────────────────────────
router.get('/peak-hours', async (_req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT
        EXTRACT(HOUR FROM appointmentTime)::int AS hour,
        COUNT(*)                                AS count
      FROM appointments
      WHERE status != 'Cancelled'
      GROUP BY EXTRACT(HOUR FROM appointmentTime)
      ORDER BY hour ASC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /api/analytics/dept-load ─────────────────────────────
router.get('/dept-load', async (_req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT
        d.department,
        COUNT(*)                                                                         AS total,
        ROUND(AVG(EXTRACT(EPOCH FROM (att.consultationStartTime - att.checkInTime))
              / 60)::numeric, 1)                                                         AS avgWait
      FROM appointments a
      JOIN doctors d ON a.doctorId = d.doctorId
      LEFT JOIN attendance att ON att.appointmentId = a.appointmentId
      WHERE a.status != 'Cancelled'
      GROUP BY d.department
      ORDER BY total DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /api/analytics/doctor-load ───────────────────────────
router.get('/doctor-load', async (_req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT
        d.name          AS doctor,
        d.department,
        d.availability,
        COUNT(*)                                                                           AS total,
        COUNT(*) FILTER (WHERE a.appointmentDate = CURRENT_DATE)                          AS today,
        ROUND(AVG(EXTRACT(EPOCH FROM (att.consultationStartTime - att.checkInTime))
              / 60)::numeric, 1)                                                           AS avgWait
      FROM appointments a
      JOIN doctors d ON a.doctorId = d.doctorId
      LEFT JOIN attendance att ON att.appointmentId = a.appointmentId
      WHERE a.status != 'Cancelled'
      GROUP BY d.doctorId, d.name, d.department, d.availability
      ORDER BY today DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /api/analytics/wait-times?days=7 ─────────────────────
router.get('/wait-times', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const [rows] = await db.query(`
      SELECT
        a.appointmentDate                                                                   AS date,
        ROUND(AVG(EXTRACT(EPOCH FROM (att.consultationStartTime - att.checkInTime))
              / 60)::numeric, 1)                                                            AS avgWait,
        ROUND(MAX(EXTRACT(EPOCH FROM (att.consultationStartTime - att.checkInTime))
              / 60)::numeric, 0)                                                            AS maxWait
      FROM appointments a
      JOIN attendance att ON att.appointmentId = a.appointmentId
      WHERE a.appointmentDate >= CURRENT_DATE - (?::int * INTERVAL '1 day')
        AND att.checkInTime IS NOT NULL
        AND att.consultationStartTime IS NOT NULL
      GROUP BY a.appointmentDate
      ORDER BY a.appointmentDate ASC
    `, [days]);
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /api/analytics/forecast  –  7-day moving average ─────
router.get('/forecast', async (_req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT
        appointmentDate AS date,
        COUNT(*)        AS count
      FROM appointments
      WHERE status != 'Cancelled'
        AND appointmentDate >= CURRENT_DATE - (60 * INTERVAL '1 day')
      GROUP BY appointmentDate
      ORDER BY appointmentDate ASC
    `);
    const result = rows.map((row, i) => {
      const window = rows.slice(Math.max(0, i - 6), i + 1);
      const avg    = window.reduce((s, r) => s + Number(r.count), 0) / window.length;
      return { ...row, movingAvg: Math.round(avg * 10) / 10 };
    });
    res.json(result);
  } catch (err) { next(err); }
});

// ── GET /api/analytics/export  –  raw data ───────────────────
router.get('/export', async (_req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT
        a.appointmentId, a.appointmentDate, a.appointmentTime,
        a.status, a.reason, a.bookedBy,
        p.name AS patient, p.age, p.gender, p.bloodGroup,
        d.name AS doctor, d.department, d.specialization,
        att.checkInTime, att.consultationStartTime, att.consultationEndTime,
        ROUND(EXTRACT(EPOCH FROM (att.consultationStartTime - att.checkInTime))
              / 60)::int            AS waitMinutes,
        ROUND(EXTRACT(EPOCH FROM (att.consultationEndTime - att.consultationStartTime))
              / 60)::int            AS durationMinutes
      FROM appointments a
      JOIN patients p  ON a.patientId = p.patientId
      JOIN doctors  d  ON a.doctorId  = d.doctorId
      LEFT JOIN attendance att ON att.appointmentId = a.appointmentId
      ORDER BY a.appointmentDate DESC, a.appointmentTime DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
