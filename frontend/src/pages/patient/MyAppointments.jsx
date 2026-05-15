import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { useSocket } from '../../hooks/useSocket';
import { Modal, toast, Empty, fmtDate, fmtTime } from '../../components/UI';

const STATUSES = ['All','Pending','Scheduled','Checked-In','In-Progress','Completed','Cancelled'];

const SS = {
  Pending:      { bg:'#f3e8ff', color:'#6b21a8', border:'#d8b4fe' },
  Scheduled:    { bg:'#eaf4fb', color:'#1a5276', border:'#aed6f1' },
  'Checked-In': { bg:'#fef9e7', color:'#7d6608', border:'#f9e79f' },
  'In-Progress':{ bg:'#d8f3dc', color:'#1b4332', border:'#95d5b2' },
  Completed:    { bg:'#d8f3dc', color:'#1b4332', border:'#95d5b2' },
  Cancelled:    { bg:'#fdf2f2', color:'#7b241c', border:'#fadbd8' },
};

function StatPill({ label, val, color }) {
  return (
    <div style={{
      background: 'var(--white)', border: '1.5px solid var(--border)',
      borderRadius: 12, padding: '13px 16px', boxShadow: 'var(--shadow-sm)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>{label}</div>
    </div>
  );
}

export default function MyAppointments() {
  const api = useApi();
  const [appts,  setAppts]  = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [flashIds, setFlashIds] = useState(new Set());
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { api.getAppointments().then(setAppts); }, []);

  // ── Real-time: new appointment booked ────────────────────────
  useSocket('appointment:new', (a) => {
    setAppts(prev => {
      if (prev.some(x => x.appointmentId === a.appointmentId)) return prev;
      flash(a.appointmentId);
      return [a, ...prev];
    });
    toast.info('New appointment added');
  });

  // ── Real-time: status update (check-in, start, complete, cancel) ─
  useSocket('appointment:updated', ({ appointmentId, status, appointmentTime }) => {
    setAppts(prev => prev.map(a =>
      a.appointmentId === appointmentId
        ? { ...a, status, ...(appointmentTime ? { appointmentTime } : {}) }
        : a
    ));
    setDetail(d => d?.appointmentId === appointmentId ? { ...d, status } : d);
    flash(appointmentId);
  });

  useSocket('appointment:approved', (updated) => {
    setAppts(prev => prev.map(a =>
      a.appointmentId === updated.appointmentId ? { ...a, ...updated } : a
    ));
    setDetail(d => d?.appointmentId === updated.appointmentId ? { ...d, ...updated } : d);
    flash(updated.appointmentId);
    toast.success('Your appointment has been approved by the doctor!');
  });

  useSocket('appointment:rejected', ({ appointmentId }) => {
    setAppts(prev => prev.map(a =>
      a.appointmentId === appointmentId ? { ...a, status: 'Cancelled' } : a
    ));
    setDetail(d => d?.appointmentId === appointmentId ? { ...d, status: 'Cancelled' } : d);
    flash(appointmentId);
    toast.error('Your appointment request was declined by the doctor.');
  });

  useSocket('appointment:noted', ({ appointmentId, doctorNote }) => {
    setAppts(prev => prev.map(a =>
      a.appointmentId === appointmentId ? { ...a, doctorNote } : a
    ));
    setDetail(d => d?.appointmentId === appointmentId ? { ...d, doctorNote } : d);
    flash(appointmentId);
    if (doctorNote) toast.info('Your doctor left you a message — check your appointment.');
  });

  useSocket('attendance:updated', ({ appointmentId, status }) => {
    setAppts(prev => prev.map(a =>
      a.appointmentId === appointmentId ? { ...a, status } : a
    ));
    setDetail(d => d?.appointmentId === appointmentId ? { ...d, status } : d);
    flash(appointmentId);
  });

  function flash(id) {
    setFlashIds(s => new Set([...s, id]));
    setTimeout(() => setFlashIds(s => { const n = new Set(s); n.delete(id); return n; }), 1600);
  }

  async function cancel(id) {
    setCancelling(id);
    try {
      await api.cancelAppointment(id);
      setAppts(a => a.map(x => x.appointmentId === id ? { ...x, status: 'Cancelled' } : x));
      setDetail(d => d?.appointmentId === id ? { ...d, status: 'Cancelled' } : d);
      toast.info('Appointment cancelled');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to cancel appointment');
    } finally {
      setCancelling(null);
    }
  }

  const pending   = appts.filter(a => a.status === 'Pending');
  const upcoming  = appts.filter(a => ['Scheduled','Checked-In'].includes(a.status));
  const completed = appts.filter(a => a.status === 'Completed');
  const cancelled = appts.filter(a => a.status === 'Cancelled');
  const todayList = appts.filter(a => (a.appointmentDate || '').startsWith(today));

  const filtered = appts
    .filter(a => {
      if (filter !== 'All' && a.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (a.doctorName || '').toLowerCase().includes(q) ||
               (a.department  || '').toLowerCase().includes(q) ||
               (a.reason      || '').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => (b.appointmentDate + b.appointmentTime).localeCompare(a.appointmentDate + a.appointmentTime));

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 20 }}>
        <StatPill label="Total"     val={appts.length}     color="var(--forest)" />
        <StatPill label="Pending"   val={pending.length}   color="#9333ea"       />
        <StatPill label="Upcoming"  val={upcoming.length}  color="var(--blue)"   />
        <StatPill label="Today"     val={todayList.length} color="var(--amber)"  />
        <StatPill label="Completed" val={completed.length} color="var(--sage)"   />
        <StatPill label="Cancelled" val={cancelled.length} color="var(--red)"    />
      </div>

      {/* Filter bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ paddingTop: 13, paddingBottom: 13 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="search" placeholder="Search doctor, department, reason…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={fld(220)}
            />
            <div style={{ display: 'flex', background: 'var(--stone)', borderRadius: 8, padding: 3, flexWrap: 'wrap' }}>
              {STATUSES.map(s => (
                <button key={s} onClick={() => setFilter(s)} style={{
                  padding: '5px 11px', border: 'none', borderRadius: 6, cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', fontSize: '.77rem', fontWeight: 500,
                  background: filter === s ? 'var(--white)' : 'transparent',
                  color: filter === s ? 'var(--forest)' : 'var(--muted)',
                  boxShadow: filter === s ? 'var(--shadow-sm)' : 'none',
                  transition: '.12s',
                }}>
                  {s}
                </button>
              ))}
            </div>
            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6,
              marginLeft: 'auto', fontSize: '.76rem', color: 'var(--muted)' }}>
              <motion.div
                animate={{ opacity: [1, .3, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}
                style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sage)' }}
              />
              Live · {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment list */}
      <div className="card">
        <div className="card-head">
          <h3>My Appointments</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40 }}><Empty text="No appointments found" /></div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((a, i) => {
                const ss       = SS[a.status] || {};
                const isToday  = (a.appointmentDate || '').startsWith(today);
                const canCancel = ['Scheduled','Pending'].includes(a.status);
                const isPending = a.status === 'Pending';
                const isFlash  = flashIds.has(a.appointmentId);

                return (
                  <motion.div key={a.appointmentId}
                    layout
                    initial={{ opacity: 0, y: -10, backgroundColor: '#d8f3dc' }}
                    animate={{ opacity: 1, y: 0, backgroundColor: isFlash ? '#d8f3dc' : (isToday && !['Completed','Cancelled'].includes(a.status) ? '#fffdf5' : '#ffffff') }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: isFlash ? 1.5 : .22, ease: 'easeOut' }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--stone)' : 'none',
                    }}>

                    {/* Date block */}
                    <div style={{
                      minWidth: 52, textAlign: 'center', padding: '8px 6px',
                      background: isToday ? 'var(--forest)' : 'var(--sand)',
                      borderRadius: 10, flexShrink: 0,
                    }}>
                      <div style={{ fontSize: '.62rem', textTransform: 'uppercase', letterSpacing: '.06em',
                        color: isToday ? 'rgba(255,255,255,.7)' : 'var(--muted)', marginBottom: 2 }}>
                        {new Date((a.appointmentDate || today) + 'T00:00:00')
                          .toLocaleDateString('en-IN', { month: 'short' })}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1,
                        color: isToday ? '#fff' : 'var(--forest)' }}>
                        {new Date((a.appointmentDate || today) + 'T00:00:00').getDate()}
                      </div>
                      <div style={{ fontSize: '.62rem', color: isToday ? 'rgba(255,255,255,.65)' : 'var(--muted)', marginTop: 2 }}>
                        {fmtTime(a.appointmentTime)}
                      </div>
                    </div>

                    {/* Doctor avatar */}
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--forest), var(--moss))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: '.95rem', flexShrink: 0,
                    }}>
                      {(a.doctorName || 'D')[0]}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '.92rem', marginBottom: 2 }}>
                        {a.doctorName || '—'}
                      </div>
                      <div style={{ fontSize: '.76rem', color: 'var(--muted)' }}>
                        {a.department}{a.reason ? ` · ${a.reason}` : ''}
                      </div>
                      {isPending && (
                        <div style={{ fontSize: '.7rem', color: '#9333ea', fontWeight: 600, marginTop: 3 }}>
                          Awaiting doctor approval
                        </div>
                      )}
                      {isToday && !['Completed','Cancelled','Pending'].includes(a.status) && (
                        <div style={{ fontSize: '.7rem', color: 'var(--sage)', fontWeight: 700, marginTop: 3 }}>
                          Today
                        </div>
                      )}
                    </div>

                    {/* Status badge */}
                    <motion.span
                      key={a.status}
                      initial={{ scale: .85, opacity: 0 }}
                      animate={{ scale: 1,  opacity: 1 }}
                      style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: '.72rem', fontWeight: 600, flexShrink: 0,
                        background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                      }}>
                      {a.status}
                    </motion.span>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setDetail(a)}>
                        Details
                      </button>
                      {canCancel && (
                        <button
                          className="btn btn-sm"
                          style={{ background: '#fdf2f2', color: '#7b241c', border: '1px solid #fadbd8' }}
                          disabled={cancelling === a.appointmentId}
                          onClick={() => cancel(a.appointmentId)}
                        >
                          {cancelling === a.appointmentId ? '…' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {detail && (
          <Modal title="Appointment Details" onClose={() => setDetail(null)}>
            {/* Doctor banner */}
            <div style={{
              display: 'flex', gap: 14, alignItems: 'center', padding: '14px 16px',
              background: 'var(--mint)', borderRadius: 10, marginBottom: 18,
              border: '1.5px solid #95d5b2',
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--forest), var(--moss))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0,
              }}>
                {(detail.doctorName || 'D')[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{detail.doctorName || '—'}</div>
                <div style={{ fontSize: '.76rem', color: 'var(--muted)' }}>{detail.department}</div>
              </div>
              <motion.span
                key={detail.status}
                initial={{ scale: .9 }} animate={{ scale: 1 }}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: '.72rem', fontWeight: 600,
                  background: SS[detail.status]?.bg, color: SS[detail.status]?.color,
                  border: `1px solid ${SS[detail.status]?.border}`,
                }}>
                {detail.status}
              </motion.span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Date',     val: fmtDate(detail.appointmentDate) },
                { label: 'Time',     val: fmtTime(detail.appointmentTime) },
                { label: 'Status',   val: detail.status },
                { label: 'Reason',   val: detail.reason    || '—' },
              ].map(f => (
                <div key={f.label} style={{ background: 'var(--sand)', borderRadius: 9, padding: '10px 13px' }}>
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 3 }}>{f.label}</div>
                  <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{f.val}</div>
                </div>
              ))}
            </div>

            {detail.status === 'Pending' && (
              <div style={{ background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: '.82rem', color: '#6b21a8' }}>
                Your request is being reviewed. The reception team will check with the doctor and confirm your appointment.
              </div>
            )}

            {detail.doctorNote && (
              <div style={{
                background: detail.status === 'Cancelled' ? '#fdf2f2' : '#eaf4fb',
                border: `1px solid ${detail.status === 'Cancelled' ? '#fadbd8' : '#aed6f1'}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: '.83rem',
                color: detail.status === 'Cancelled' ? '#7b241c' : '#1a5276',
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {detail.status === 'Cancelled' ? '✕ Reason for cancellation:' : '✉ Message from your Doctor:'}
                </div>
                {detail.doctorNote}
              </div>
            )}

            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setDetail(null)}>Close</button>
              {detail.status === 'Scheduled' && (
                <button
                  className="btn btn-sm"
                  style={{ background: '#fdf2f2', color: '#7b241c', border: '1px solid #fadbd8', padding: '8px 18px', borderRadius: 9 }}
                  disabled={cancelling === detail.appointmentId}
                  onClick={() => cancel(detail.appointmentId)}
                >
                  {cancelling === detail.appointmentId ? 'Cancelling…' : 'Cancel Appointment'}
                </button>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function fld(w) {
  return {
    padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 9,
    fontFamily: 'var(--font-ui)', fontSize: '.83rem', background: 'var(--white)',
    outline: 'none', width: w,
  };
}
