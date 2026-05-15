/**
 * server.js – Hospital Appointment & Analytics System
 * Stack: Node.js · Express · MySQL (mysql2) · Socket.IO
 */

require('dotenv').config();
const http     = require('http');
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const socket   = require('./socket');

const authRoutes        = require('./routes/auth');
const patientRoutes     = require('./routes/patients');
const doctorRoutes      = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const attendanceRoutes  = require('./routes/attendance');
const analyticsRoutes   = require('./routes/analytics');
const departmentRoutes  = require('./routes/departments');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 4001;

// ── Attach Socket.IO ──────────────────────────────────────────
socket.init(server);

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/patients',     patientRoutes);
app.use('/api/doctors',      doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/attendance',   attendanceRoutes);
app.use('/api/analytics',    analyticsRoutes);
app.use('/api/departments',  departmentRoutes);

// Health check
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── Global error handler ─────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

server.listen(PORT, () =>
  console.log(`🏥  Hospital API  →  http://localhost:${PORT}`)
);

module.exports = app;
