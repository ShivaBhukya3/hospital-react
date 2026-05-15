// components/UI.jsx  –  Shared reusable components
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Toast ──────────────────────────────────────────────────────
let _showToast = () => {};
export function ToastProvider() {
  const [toasts, setToasts] = useState([]);
  _showToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return (
    <div style={{ position:'fixed', bottom:24, right:24, display:'flex', flexDirection:'column', gap:8, zIndex:999 }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            className={`toast toast-${t.type}`}
            initial={{ opacity:0, x:60, scale:0.9 }}
            animate={{ opacity:1, x:0,  scale:1   }}
            exit={{    opacity:0, x:60, scale:0.9 }}
            transition={{ duration:0.28, ease:[0.4,0,0.2,1] }}
          >
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
export const toast = {
  success: msg => _showToast(msg, 'success'),
  error:   msg => _showToast(msg, 'error'),
  info:    msg => _showToast(msg, 'info'),
};

// ── Modal — with Framer Motion scale animation ─────────────────
export function Modal({ title, onClose, children, maxWidth = 620 }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity:0 }}
        animate={{ opacity:1 }}
        exit={{ opacity:0 }}
        transition={{ duration:0.2 }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="modal"
          style={{ maxWidth }}
          initial={{ scale:0.92, opacity:0, y:16 }}
          animate={{ scale:1,    opacity:1, y:0  }}
          exit={{    scale:0.96, opacity:0, y:8  }}
          transition={{ duration:0.25, ease:[0.34,1.56,0.64,1] }}
        >
          <h3>{title}</h3>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Status Badge ───────────────────────────────────────────────
export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

// ── Stat Card — with animated numeric counter ──────────────────
export function StatCard({ label, value, sub, color = 'green' }) {
  const isNumeric = typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)) && !value.startsWith('₹'));
  const target    = isNumeric ? parseFloat(value) : 0;
  const [display, setDisplay] = useState(isNumeric ? 0 : value);
  const rafRef    = useRef(null);

  useEffect(() => {
    if (!isNumeric) { setDisplay(value); return; }
    const start    = Date.now();
    const duration = 900;
    const from     = 0;
    function tick() {
      const elapsed  = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = Math.round(from + (target - from) * eased);
      setDisplay(current);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, isNumeric]);

  return (
    <motion.div
      className={`stat-card ${color}`}
      initial={{ opacity:0, y:18 }}
      animate={{ opacity:1, y:0  }}
      transition={{ duration:0.35, ease:[0.4,0,0.2,1] }}
      whileHover={{ y:-2, boxShadow:'0 8px 24px rgba(27,67,50,.14)' }}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value">{isNumeric ? display : value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </motion.div>
  );
}

// ── Empty State ────────────────────────────────────────────────
export function Empty({ text = 'No data found' }) {
  return (
    <div className="empty">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 6h-2.18c.07-.44.18-.86.18-1 0-2.21-1.79-4-4-4s-4 1.79-4 4c0 .14.11.56.18 1H8c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h12c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6-3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm6 17H8V8h2v1c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V8h2v12z"/>
      </svg>
      <p>{text}</p>
    </div>
  );
}

// ── Loading ────────────────────────────────────────────────────
export function Loading() {
  return (
    <div style={{ padding:48, textAlign:'center', color:'var(--muted)', fontSize:'.88rem' }}>
      Loading…
    </div>
  );
}

// ── Progress Bar ───────────────────────────────────────────────
export function ProgressBar({ pct, color = 'var(--sage)' }) {
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}

// ── SVG icons ──────────────────────────────────────────────────
export const Icon = {
  cross:    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>,
  plus:     <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  chart:    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>,
  user:     <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
  desk:     <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg>,
  list:     <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>,
  dept:     <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10z"/></svg>,
  team:     <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  alert:    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>,
  peak:     <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/></svg>,
  trend:    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5z"/></svg>,
  logout:       <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>,
  stethoscope:  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 8c0-1.66-1.34-3-3-3s-3 1.34-3 3c0 1.53 1.14 2.79 2.63 2.97L14 14.5c-.8 1.39-2.27 2.5-4 2.5-2.76 0-5-2.24-5-5V8.83C6.16 8.4 7 7.3 7 6c0-1.66-1.34-3-3-3S1 4.34 1 6c0 1.3.84 2.4 2 2.83V12c0 3.86 3.14 7 7 7 2.47 0 4.61-1.29 5.85-3.22L17 14.97V17c0 1.1.9 2 2 2s2-.9 2-2v-3c1.16-.43 2-1.53 2-2.83 0-1.66-1.34-3-3-3zM4 7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm15 11c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>,
  patients:     <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  id:           <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 2.75c1.24 0 2.25 1.01 2.25 2.25S13.24 11.25 12 11.25 9.75 10.24 9.75 9 10.76 6.75 12 6.75zM17 17H7v-1.5c0-1.67 3.33-2.5 5-2.5s5 .83 5 2.5V17z"/></svg>,
  billing:      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>,
  bell:         <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>,
  settings:     <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>,
};

// ── Appointment Table ──────────────────────────────────────────
export function AppointmentTable({ appointments, actions }) {
  if (!appointments?.length) return <Empty text="No appointments found" />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Patient</th>
            <th>Doctor</th>
            <th>Department</th>
            <th>Reason</th>
            <th>Status</th>
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {appointments.map(a => (
              <motion.tr
                key={a.appointmentId}
                initial={{ opacity: 0, backgroundColor: '#d8f3dc' }}
                animate={{ opacity: 1, backgroundColor: '#ffffff' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                layout
              >
                <td>
                  <strong>{fmtDate(a.appointmentDate)}</strong>
                  <div style={{ fontSize:'.74rem', color:'var(--muted)' }}>{fmtTime(a.appointmentTime)}</div>
                </td>
                <td>{a.patientName || '—'}</td>
                <td>{a.doctorName || '—'}</td>
                <td>{a.department || '—'}</td>
                <td style={{ maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {a.reason || '—'}
                </td>
                <td><StatusBadge status={a.status} /></td>
                {actions && <td><div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>{actions(a)}</div></td>}
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

// helpers
export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
export function fmtTime(t) {
  if (!t) return '';
  return t.slice(0, 5);
}
