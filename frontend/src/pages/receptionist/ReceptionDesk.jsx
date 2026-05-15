import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useSocket } from '../../hooks/useSocket';
import { StatCard, Modal, toast, fmtTime } from '../../components/UI';
import { AnimatePresence, motion } from 'framer-motion';

const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
const GENDERS      = ['Male','Female','Other'];

const STATUS_STYLE = {
  Pending:      { bg:'#f3e8ff', color:'#6b21a8', border:'#d8b4fe', label:'Pending' },
  Forwarded:    { bg:'#fef3c7', color:'#92400e', border:'#fde68a', label:'With Doctor' },
  Scheduled:    { bg:'#eaf4fb', color:'#1a5276', border:'#aed6f1', label:'Waiting' },
  'Checked-In': { bg:'#fef9e7', color:'#7d6608', border:'#f9e79f', label:'Checked In' },
  'In-Progress':{ bg:'#d8f3dc', color:'#1b4332', border:'#95d5b2', label:'With Doctor' },
  Completed:    { bg:'#d8f3dc', color:'#1b4332', border:'#95d5b2', label:'Done' },
  Cancelled:    { bg:'#fdf2f2', color:'#7b241c', border:'#fadbd8', label:'Cancelled' },
};

const EMPTY_APPT = { patientId:'', doctorId:'', appointmentDate:'', appointmentTime:'', reason:'' };
const EMPTY_PT   = { name:'', age:'', gender:'Male', contact:'', bloodGroup:'O+', address:'' };

export default function ReceptionDesk() {
  const api = useApi();
  const [appts,   setAppts]   = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients,setPatients]= useState([]);
  const [showAppt,    setShowAppt]    = useState(false);
  const [showPatient, setShowPatient] = useState(false);
  const [apptForm, setApptForm] = useState(EMPTY_APPT);
  const [ptForm,   setPtForm]   = useState(EMPTY_PT);
  const [detailAppt, setDetailAppt] = useState(null);
  const [sourceFilter, setSourceFilter] = useState('All');
  const [forwarding, setForwarding] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getAppointments().then(setAppts);
    api.getDoctors().then(setDoctors);
    api.getPatients().then(setPatients);
  }, []);

  // ── Live events ───────────────────────────────────────────────
  useSocket('appointment:new', (newAppt) => {
    setAppts(prev => {
      if (prev.some(a => a.appointmentId === newAppt.appointmentId)) return prev;
      return [...prev, newAppt];
    });
    const source = newAppt.bookedBy === 'patient' ? 'Online' : 'Walk-in';
    toast.info(`New ${source} booking: ${newAppt.patientName} → ${newAppt.doctorName}`);
  });

  useSocket('appointment:forwarded', (updated) => {
    setAppts(prev => prev.map(a =>
      a.appointmentId === updated.appointmentId ? { ...a, forwardedToDoctor: 1 } : a
    ));
  });

  useSocket('appointment:updated', ({ appointmentId, status, appointmentTime }) => {
    setAppts(prev => prev.map(a =>
      a.appointmentId === appointmentId
        ? { ...a, status, ...(appointmentTime ? { appointmentTime } : {}) }
        : a
    ));
  });

  useSocket('appointment:approved', (updated) => {
    setAppts(prev => prev.map(a =>
      a.appointmentId === updated.appointmentId ? { ...a, ...updated } : a
    ));
    toast.success(`Doctor approved: ${updated.patientName}`);
  });

  useSocket('appointment:rejected', ({ appointmentId, doctorNote }) => {
    setAppts(prev => prev.map(a =>
      a.appointmentId === appointmentId ? { ...a, status: 'Cancelled', doctorNote } : a
    ));
    toast.error('Doctor declined an appointment request.');
  });

  useSocket('attendance:updated', ({ appointmentId, status }) => {
    setAppts(prev => prev.map(a =>
      a.appointmentId === appointmentId ? { ...a, status } : a
    ));
  });

  const todayAppts = appts
    .filter(a => (a.appointmentDate || '').startsWith(today))
    .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));

  const isOnline = a => a.bookedBy === 'patient';
  const isWalkIn = a => a.bookedBy === 'receptionist' || a.bookedBy === 'admin';

  // Pending requests from ALL dates (not just today) so future bookings are visible
  const newRequests    = appts.filter(a => a.status === 'Pending' && isOnline(a) && !a.forwardedToDoctor)
    .sort((a, b) => (a.appointmentDate || '').localeCompare(b.appointmentDate || ''));
  const awaitingDoctor = appts.filter(a => a.status === 'Pending' && isOnline(a) && a.forwardedToDoctor)
    .sort((a, b) => (a.appointmentDate || '').localeCompare(b.appointmentDate || ''));

  const waiting    = todayAppts.filter(a => a.status === 'Scheduled');
  const checkedIn  = todayAppts.filter(a => a.status === 'Checked-In');
  const inProgress = todayAppts.filter(a => a.status === 'In-Progress');
  const completed  = todayAppts.filter(a => a.status === 'Completed');

  // All pending (any date) + today's non-pending, then apply source filter
  const allQueueAppts = [
    ...newRequests,
    ...awaitingDoctor,
    ...todayAppts.filter(a => a.status !== 'Pending'),
  ];
  const filteredAppts = allQueueAppts.filter(a => {
    if (sourceFilter === 'Online')  return isOnline(a);
    if (sourceFilter === 'Walk-in') return isWalkIn(a);
    return true;
  });

  const setA = (k, v) => setApptForm(f => ({ ...f, [k]: v }));
  const setP = (k, v) => setPtForm(f =>   ({ ...f, [k]: v }));

  async function scheduleAppt() {
    if (!apptForm.patientId || !apptForm.doctorId || !apptForm.appointmentDate || !apptForm.appointmentTime) {
      toast.error('Patient, doctor, date and time are required'); return;
    }
    try {
      await api.createAppointment({ ...apptForm });
      toast.success('Appointment scheduled!');
      setShowAppt(false);
      setApptForm(EMPTY_APPT);
      api.getAppointments().then(setAppts);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to schedule appointment');
    }
  }

  async function registerPatient() {
    if (!ptForm.name.trim()) { toast.error('Full name is required'); return; }
    try {
      await api.createPatient(ptForm);
      toast.success('Patient registered!');
      setShowPatient(false);
      setPtForm(EMPTY_PT);
      api.getPatients().then(setPatients);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to register patient');
    }
  }

  async function checkIn(id) {
    try {
      await api.checkIn(id);
      setAppts(a => a.map(x => x.appointmentId === id ? { ...x, status: 'Checked-In' } : x));
      toast.success('Patient checked in!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to check in patient');
    }
  }

  async function cancel(id) {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await api.cancelAppointment(id);
      setAppts(a => a.map(x => x.appointmentId === id ? { ...x, status: 'Cancelled' } : x));
      toast.info('Appointment cancelled');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to cancel appointment');
    }
  }

  async function forwardToDoctor(id) {
    setForwarding(id);
    try {
      await api.forwardToDoctor(id);
      setAppts(a => a.map(x => x.appointmentId === id ? { ...x, forwardedToDoctor: 1 } : x));
      toast.success('Request forwarded to doctor!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to forward request');
    } finally {
      setForwarding(null);
    }
  }

  const availDoctors = doctors.filter(d => d.availability === 'Available');

  function getStatusDisplay(a) {
    if (a.status === 'Pending' && isOnline(a)) {
      return a.forwardedToDoctor
        ? { bg:'#fef3c7', color:'#92400e', border:'#fde68a', label:'With Doctor' }
        : { bg:'#f3e8ff', color:'#6b21a8', border:'#d8b4fe', label:'Pending Review' };
    }
    return STATUS_STYLE[a.status] || STATUS_STYLE.Scheduled;
  }

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Today Total"    value={todayAppts.length}     color="forest" sub="All appointments" />
        <StatCard label="New Requests"   value={newRequests.length}    color="purple" sub="Needs forwarding" />
        <StatCard label="With Doctor"    value={awaitingDoctor.length} color="amber"  sub="Awaiting approval" />
        <StatCard label="Checked-In"     value={checkedIn.length}      color="blue"   sub="In waiting area" />
        <StatCard label="In Consultation"value={inProgress.length}     color="green"  sub="With doctor" />
        <StatCard label="Completed"      value={completed.length}      color="forest" sub="Done today" />
      </div>

      {/* ── New Online Requests banner (not yet forwarded) ───────── */}
      <AnimatePresence>
      {newRequests.length > 0 && (
        <motion.div
          key="new-requests-banner"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{ overflow: 'hidden', marginBottom: 20 }}
        >
          <div style={{
            background: '#f3e8ff', border: '1.5px solid #d8b4fe', borderRadius: 14, padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                background: '#9333ea', boxShadow: '0 0 0 3px #e9d5ff',
                animation: 'pulse 2s infinite',
              }} />
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#6b21a8' }}>
                New Online Requests — Action Required
              </h3>
              <span style={{
                marginLeft: 'auto', background: '#9333ea', color: '#fff',
                borderRadius: 20, padding: '2px 10px', fontSize: '.75rem', fontWeight: 700,
              }}>
                {newRequests.length}
              </span>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: '.8rem', color: '#7c3aed' }}>
              Review each request and forward to the doctor to confirm availability.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {newRequests.map(a => (
                <div key={a.appointmentId} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#fff', border: '1px solid #e9d5ff', borderRadius: 10,
                  padding: '12px 16px',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', background: '#ede9fe',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#6b21a8', fontWeight: 700, fontSize: '.88rem', flexShrink: 0,
                  }}>
                    {(a.patientName || '?')[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '.9rem', color: '#3b0764' }}>{a.patientName}</div>
                    <div style={{ fontSize: '.75rem', color: '#7c3aed', marginTop: 2 }}>
                      {a.doctorName} · {a.department}
                      {a.appointmentDate && <> · {a.appointmentDate}</>}
                      {a.appointmentTime && <> at {fmtTime(a.appointmentTime)}</>}
                    </div>
                    {a.reason && (
                      <div style={{ fontSize: '.72rem', color: '#9333ea', marginTop: 2, fontStyle: 'italic' }}>
                        "{a.reason}"
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      className="btn btn-sm"
                      style={{
                        background: '#9333ea', color: '#fff', border: 'none',
                        padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: '.78rem',
                        cursor: forwarding === a.appointmentId ? 'not-allowed' : 'pointer',
                        opacity: forwarding === a.appointmentId ? .7 : 1,
                      }}
                      disabled={forwarding === a.appointmentId}
                      onClick={() => forwardToDoctor(a.appointmentId)}
                    >
                      {forwarding === a.appointmentId ? 'Forwarding…' : '→ Forward to Doctor'}
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: '.75rem' }}
                      onClick={() => setDetailAppt(a)}
                    >
                      View
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: '#fdf2f2', color: '#7b241c', border: '1px solid #fadbd8', fontSize: '.75rem' }}
                      onClick={() => cancel(a.appointmentId)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── Forwarded (awaiting doctor response) banner ──────────── */}
      <AnimatePresence>
      {awaitingDoctor.length > 0 && (
        <motion.div
          key="awaiting-doctor-banner"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{ overflow: 'hidden', marginBottom: 20 }}
        >
          <div style={{
            background: '#fefce8', border: '1.5px solid #fde68a', borderRadius: 14, padding: '14px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: '1rem' }}>⏳</span>
              <h3 style={{ margin: 0, fontSize: '.95rem', color: '#92400e' }}>
                Forwarded — Awaiting Doctor Response
              </h3>
              <span style={{
                marginLeft: 'auto', background: '#d97706', color: '#fff',
                borderRadius: 20, padding: '2px 10px', fontSize: '.75rem', fontWeight: 700,
              }}>
                {awaitingDoctor.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {awaitingDoctor.map(a => (
                <div key={a.appointmentId} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#fff', border: '1px solid #fde68a', borderRadius: 9,
                  padding: '8px 12px', minWidth: 240,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', background: '#fef3c7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#92400e', fontWeight: 700, fontSize: '.8rem', flexShrink: 0,
                  }}>
                    {(a.patientName || '?')[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '.84rem', color: '#78350f' }}>{a.patientName}</div>
                    <div style={{ fontSize: '.7rem', color: '#b45309' }}>
                      {a.doctorName}{a.appointmentTime && ` · ${fmtTime(a.appointmentTime)}`}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: '.7rem', background: '#fdf2f2', color: '#7b241c', border: '1px solid #fadbd8' }}
                    onClick={() => cancel(a.appointmentId)}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* Left — appointment queue */}
        <div className="card">
          <div className="card-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ margin: 0 }}>Today's Queue</h3>
              {/* Source filter tabs */}
              <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 20, padding: 3 }}>
                {['All','Online','Walk-in'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSourceFilter(tab)}
                    style={{
                      padding: '4px 12px', borderRadius: 16, fontSize: '.74rem', fontWeight: 600,
                      border: 'none', cursor: 'pointer', transition: 'all .15s',
                      background: sourceFilter === tab
                        ? (tab === 'Online' ? '#9333ea' : tab === 'Walk-in' ? '#0369a1' : 'var(--forest)')
                        : 'transparent',
                      color: sourceFilter === tab ? '#fff' : 'var(--muted)',
                    }}
                  >
                    {tab}
                    {tab === 'Online' && newRequests.length > 0 && (
                      <span style={{
                        marginLeft: 5, background: '#fff', color: '#9333ea',
                        borderRadius: 10, padding: '0 5px', fontSize: '.65rem', fontWeight: 700,
                      }}>
                        {newRequests.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => { setPtForm(EMPTY_PT); setShowPatient(true); }}>
                + Patient
              </button>
              <button className="btn btn-sage btn-sm" onClick={() => { setApptForm(EMPTY_APPT); setShowAppt(true); }}>
                + Schedule
              </button>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {filteredAppts.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                {sourceFilter === 'All' ? 'No appointments' : `No ${sourceFilter.toLowerCase()} appointments`}
              </div>
            ) : (
              <AnimatePresence initial={false}>
              {filteredAppts.map((a, i) => {
                const ss = getStatusDisplay(a);
                const isActive = !['Completed','Cancelled'].includes(a.status);
                const online = isOnline(a);
                return (
                  <motion.div
                    key={a.appointmentId}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: .25, ease: 'easeOut' }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 20px',
                      borderBottom: i < filteredAppts.length - 1 ? '1px solid var(--stone)' : 'none',
                      background: a.status === 'Pending' ? (a.forwardedToDoctor ? '#fffbeb' : '#faf5ff') : 'transparent',
                    }}
                  >
                    {/* Time / Date */}
                    <div style={{ minWidth: 50, textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '.88rem', color: a.status === 'Pending' ? '#6b21a8' : 'var(--forest)' }}>
                        {fmtTime(a.appointmentTime)}
                      </div>
                      {!(a.appointmentDate || '').startsWith(today) && (
                        <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 1 }}>
                          {new Date(a.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: online ? '#ede9fe' : 'var(--mint)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: online ? '#6b21a8' : 'var(--forest)',
                      fontWeight: 700, fontSize: '.9rem', flexShrink: 0,
                    }}>
                      {(a.patientName || '?')[0]}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{a.patientName || '—'}</span>
                        <span style={{
                          fontSize: '.65rem', fontWeight: 700, borderRadius: 10, padding: '1px 7px',
                          background: online ? '#f3e8ff' : '#e0f2fe',
                          color:      online ? '#7c3aed' : '#0369a1',
                          border:     `1px solid ${online ? '#d8b4fe' : '#bae6fd'}`,
                        }}>
                          {online ? 'Online' : 'Walk-in'}
                        </span>
                      </div>
                      <div style={{ fontSize: '.74rem', color: 'var(--muted)', marginTop: 2 }}>
                        {a.doctorName} &nbsp;·&nbsp; {a.department}
                        {a.reason && <> &nbsp;·&nbsp; {a.reason}</>}
                      </div>
                      {a.status === 'Cancelled' && a.doctorNote && (
                        <div style={{ fontSize: '.71rem', color: '#7b241c', marginTop: 2, fontStyle: 'italic' }}>
                          Reason: {a.doctorNote}
                        </div>
                      )}
                    </div>

                    {/* Status badge */}
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: '.72rem', fontWeight: 600,
                      background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, flexShrink: 0,
                    }}>
                      {ss.label}
                    </span>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setDetailAppt(a)}>View</button>
                      {a.status === 'Pending' && !a.forwardedToDoctor && (
                        <button
                          className="btn btn-sm"
                          style={{ background: '#9333ea', color: '#fff', border: 'none', fontSize: '.74rem' }}
                          disabled={forwarding === a.appointmentId}
                          onClick={() => forwardToDoctor(a.appointmentId)}
                        >
                          {forwarding === a.appointmentId ? '…' : 'Forward'}
                        </button>
                      )}
                      {a.status === 'Scheduled' && (
                        <button className="btn btn-sage btn-sm" onClick={() => checkIn(a.appointmentId)}>
                          Check-In
                        </button>
                      )}
                      {isActive && (
                        <button
                          className="btn btn-sm"
                          style={{ background: '#fdf2f2', color: '#7b241c', border: '1px solid #fadbd8' }}
                          onClick={() => cancel(a.appointmentId)}
                        >
                          Cancel
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

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Checked-In panel */}
          <div className="card">
            <div className="card-head" style={{ paddingBottom: 12 }}>
              <h3 style={{ fontSize: '.95rem' }}>Waiting Area</h3>
              <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{checkedIn.length} waiting</span>
            </div>
            <div className="card-body" style={{ padding: '0 0 4px' }}>
              {checkedIn.length === 0 ? (
                <div style={{ padding: '16px 20px', fontSize: '.83rem', color: 'var(--muted)' }}>
                  No patients checked in
                </div>
              ) : checkedIn.map((a, i) => (
                <div key={a.appointmentId} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px',
                  borderBottom: i < checkedIn.length - 1 ? '1px solid var(--stone)' : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, background: '#fef9e7', border: '1px solid #f9e79f',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.75rem', fontWeight: 700, color: '#7d6608', flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{a.patientName}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>{fmtTime(a.appointmentTime)} · {a.doctorName}</div>
                  </div>
                  {isOnline(a) && (
                    <span style={{ fontSize: '.65rem', fontWeight: 700, color: '#7c3aed', background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 10, padding: '1px 6px' }}>
                      Online
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Doctor availability */}
          <div className="card">
            <div className="card-head" style={{ paddingBottom: 12 }}>
              <h3 style={{ fontSize: '.95rem' }}>Doctors On Duty</h3>
              <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{availDoctors.length} available</span>
            </div>
            <div className="card-body" style={{ padding: '0 0 4px' }}>
              {doctors.length === 0 ? (
                <div style={{ padding: '16px 20px', fontSize: '.83rem', color: 'var(--muted)' }}>Loading…</div>
              ) : doctors.map((d, i) => {
                const AVAIL = {
                  Available: { dot: '#40916c', label: 'Available' },
                  Busy:      { dot: '#b7770d', label: 'Busy' },
                  'Off-duty':{ dot: '#c0392b', label: 'Off-duty' },
                };
                const av = AVAIL[d.availability] || AVAIL.Available;
                return (
                  <div key={d.doctorId} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px',
                    borderBottom: i < doctors.length - 1 ? '1px solid var(--stone)' : 'none',
                    opacity: d.availability === 'Off-duty' ? .5 : 1,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: av.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '.82rem' }}>{d.name}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>{d.department}</div>
                    </div>
                    <span style={{ fontSize: '.7rem', color: av.dot, fontWeight: 600 }}>{av.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showAppt && (
        <Modal title="Schedule Appointment" onClose={() => setShowAppt(false)}>
          <div className="form-grid">
            <div className="field">
              <label>Patient <span style={{ color:'var(--red)' }}>*</span></label>
              <select value={apptForm.patientId} onChange={e => setA('patientId', e.target.value)}>
                <option value="">Select patient…</option>
                {patients.map(p => <option key={p.patientId} value={p.patientId}>{p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Doctor <span style={{ color:'var(--red)' }}>*</span></label>
              <select value={apptForm.doctorId} onChange={e => setA('doctorId', e.target.value)}>
                <option value="">Select doctor…</option>
                {doctors.filter(d => d.availability !== 'Off-duty').map(d => (
                  <option key={d.doctorId} value={d.doctorId}>
                    {d.name} — {d.department} ({d.availability})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Date <span style={{ color:'var(--red)' }}>*</span></label>
              <input type="date" min={today} value={apptForm.appointmentDate} onChange={e => setA('appointmentDate', e.target.value)} />
            </div>
            <div className="field">
              <label>Time <span style={{ color:'var(--red)' }}>*</span></label>
              <input type="time" value={apptForm.appointmentTime} onChange={e => setA('appointmentTime', e.target.value)} />
            </div>
            <div className="field form-full">
              <label>Reason for Visit</label>
              <input value={apptForm.reason} onChange={e => setA('reason', e.target.value)} placeholder="Brief reason…" />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setShowAppt(false)}>Cancel</button>
            <button className="btn btn-sage" onClick={scheduleAppt}>Schedule</button>
          </div>
        </Modal>
      )}

      {/* Register Patient Modal */}
      {showPatient && (
        <Modal title="Register New Patient" onClose={() => setShowPatient(false)}>
          <div className="form-grid">
            <div className="field form-full">
              <label>Full Name <span style={{ color:'var(--red)' }}>*</span></label>
              <input value={ptForm.name} onChange={e => setP('name', e.target.value)} placeholder="Patient full name" />
            </div>
            <div className="field">
              <label>Age</label>
              <input type="number" min="0" value={ptForm.age} onChange={e => setP('age', e.target.value)} />
            </div>
            <div className="field">
              <label>Gender</label>
              <select value={ptForm.gender} onChange={e => setP('gender', e.target.value)}>
                {GENDERS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Contact</label>
              <input value={ptForm.contact} onChange={e => setP('contact', e.target.value)} placeholder="Phone number" />
            </div>
            <div className="field">
              <label>Blood Group</label>
              <select value={ptForm.bloodGroup} onChange={e => setP('bloodGroup', e.target.value)}>
                {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="field form-full">
              <label>Address</label>
              <input value={ptForm.address} onChange={e => setP('address', e.target.value)} placeholder="Full address" />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setShowPatient(false)}>Cancel</button>
            <button className="btn btn-sage" onClick={registerPatient}>Register</button>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {detailAppt && (
        <Modal title={`Appointment — ${detailAppt.patientName}`} onClose={() => setDetailAppt(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Patient',    val: detailAppt.patientName || '—' },
              { label: 'Doctor',     val: detailAppt.doctorName  || '—' },
              { label: 'Department', val: detailAppt.department  || '—' },
              { label: 'Date',       val: detailAppt.appointmentDate || '—' },
              { label: 'Time',       val: fmtTime(detailAppt.appointmentTime) },
              { label: 'Status',     val: getStatusDisplay(detailAppt).label },
              { label: 'Reason',     val: detailAppt.reason || '—' },
              { label: 'Source',     val: isOnline(detailAppt) ? 'Online (Patient)' : 'Walk-in (Reception)' },
            ].map(f => (
              <div key={f.label} style={{ background: 'var(--sand)', borderRadius: 9, padding: '10px 13px' }}>
                <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontWeight: 600, fontSize: '.87rem' }}>{f.val}</div>
              </div>
            ))}
          </div>

          {detailAppt.status === 'Cancelled' && detailAppt.doctorNote && (
            <div style={{
              background: '#fdf2f2', border: '1px solid #fadbd8', borderRadius: 10,
              padding: '10px 14px', marginBottom: 14, fontSize: '.82rem', color: '#7b241c',
            }}>
              <strong>Doctor's reason:</strong> {detailAppt.doctorNote}
            </div>
          )}

          {detailAppt.status === 'Pending' && !detailAppt.forwardedToDoctor && (
            <div style={{
              background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 10,
              padding: '10px 14px', marginBottom: 14, fontSize: '.82rem', color: '#6b21a8',
            }}>
              This request is waiting for you to forward it to the doctor.
            </div>
          )}
          {detailAppt.status === 'Pending' && detailAppt.forwardedToDoctor && (
            <div style={{
              background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10,
              padding: '10px 14px', marginBottom: 14, fontSize: '.82rem', color: '#92400e',
            }}>
              Forwarded to the doctor — awaiting their decision.
            </div>
          )}

          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setDetailAppt(null)}>Close</button>
            {detailAppt.status === 'Pending' && !detailAppt.forwardedToDoctor && (
              <button
                className="btn btn-sm"
                style={{ background: '#9333ea', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 9, fontWeight: 600 }}
                disabled={forwarding === detailAppt.appointmentId}
                onClick={() => { forwardToDoctor(detailAppt.appointmentId); setDetailAppt(null); }}
              >
                → Forward to Doctor
              </button>
            )}
            {detailAppt.status === 'Scheduled' && (
              <button className="btn btn-sage" onClick={() => { checkIn(detailAppt.appointmentId); setDetailAppt(null); }}>
                Check-In Patient
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
