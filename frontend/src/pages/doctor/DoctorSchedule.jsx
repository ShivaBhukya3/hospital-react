import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { useSocket, playNotify } from '../../hooks/useSocket';
import { useAuth } from '../../context/AuthContext';
import { Modal, toast, fmtDate, fmtTime } from '../../components/UI';

const SS = {
  Pending:      { bg:'#f3e8ff', color:'#6b21a8', border:'#d8b4fe' },
  Scheduled:    { bg:'#eaf4fb', color:'#1a5276', border:'#aed6f1' },
  'Checked-In': { bg:'#fef9e7', color:'#7d6608', border:'#f9e79f' },
  'In-Progress':{ bg:'#d8f3dc', color:'#1b4332', border:'#95d5b2' },
  Completed:    { bg:'#d8f3dc', color:'#1b4332', border:'#95d5b2' },
  Cancelled:    { bg:'#fdf2f2', color:'#7b241c', border:'#fadbd8' },
};

const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','14:00','14:30','15:00',
  '15:30','16:00','16:30','17:00','17:30','18:00',
];

// ── Approve modal ─────────────────────────────────────────────
function ApproveModal({ appt, onClose, onApprove }) {
  const [time, setTime] = useState(appt.appointmentTime?.slice(0,5) || '10:00');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await onApprove(appt.appointmentId, time.length === 5 ? time + ':00' : time);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to confirm appointment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Accept Appointment Request" onClose={onClose}>
      <div style={{ background:'#f3e8ff', border:'1.5px solid #d8b4fe', borderRadius:10, padding:'14px 16px', marginBottom:18 }}>
        <div style={{ fontWeight:700, fontSize:'.95rem', color:'#6b21a8', marginBottom:4 }}>{appt.patientName}</div>
        <div style={{ fontSize:'.8rem', color:'#7e22ce' }}>
          Requested: <strong>{fmtDate(appt.appointmentDate)}</strong> &nbsp;·&nbsp; {appt.reason || 'No reason given'}
        </div>
      </div>

      <div className="field">
        <label style={{ fontWeight:600 }}>Set Visit Time <span style={{ color:'var(--red)' }}>*</span></label>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6, marginTop:8 }}>
          {TIME_SLOTS.map(t => (
            <button key={t} onClick={() => setTime(t)}
              style={{
                padding:'7px 0', border:`1.5px solid ${time===t ? 'var(--forest)' : 'var(--border)'}`,
                borderRadius:8, cursor:'pointer', fontSize:'.78rem', fontWeight: time===t ? 700 : 400,
                background: time===t ? 'var(--forest)' : 'var(--white)',
                color: time===t ? '#fff' : 'var(--forest)',
                transition:'.12s',
              }}>
              {t}
            </button>
          ))}
        </div>
        <input type="time" value={time} onChange={e => setTime(e.target.value)}
          style={{ marginTop:10, padding:'8px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'var(--font-ui)', fontSize:'.86rem', width:'100%' }} />
      </div>

      <div style={{ background:'#eaf4fb', borderRadius:9, padding:'10px 14px', fontSize:'.81rem', color:'#1a5276', marginBottom:18 }}>
        Patient will be notified immediately and their appointment confirmed for <strong>{fmtDate(appt.appointmentDate)} at {time}</strong>.
      </div>

      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-sage" onClick={submit} disabled={saving}>
          {saving ? 'Confirming…' : '✓ Confirm Appointment'}
        </button>
      </div>
    </Modal>
  );
}

// ── Reject modal ──────────────────────────────────────────────
function RejectModal({ appt, onClose, onReject }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const QUICK = ['Not available on this date', 'Please choose a different time slot', 'Outside my specialization — please consult another doctor', 'Fully booked for the day'];

  async function submit() {
    setSaving(true);
    try {
      await onReject(appt.appointmentId, reason || 'Appointment declined by doctor');
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to decline appointment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Decline Appointment Request" onClose={onClose}>
      <div style={{ background:'#fdf2f2', border:'1.5px solid #fadbd8', borderRadius:10, padding:'14px 16px', marginBottom:18 }}>
        <div style={{ fontWeight:700, fontSize:'.95rem', color:'#7b241c', marginBottom:4 }}>{appt.patientName}</div>
        <div style={{ fontSize:'.8rem', color:'#922b21' }}>
          {fmtDate(appt.appointmentDate)} &nbsp;·&nbsp; {appt.reason || 'No reason given'}
        </div>
      </div>

      <div className="field">
        <label style={{ fontWeight:600 }}>Reason for declining</label>
        <div style={{ display:'flex', flexDirection:'column', gap:6, margin:'8px 0' }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => setReason(q)}
              style={{
                textAlign:'left', padding:'8px 12px', border:`1.5px solid ${reason===q ? '#c0392b' : 'var(--border)'}`,
                borderRadius:8, cursor:'pointer', fontSize:'.8rem', background: reason===q ? '#fdf2f2' : 'var(--white)',
                color: reason===q ? '#7b241c' : 'var(--forest)', transition:'.12s',
              }}>
              {q}
            </button>
          ))}
        </div>
        <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Or write a custom message…"
          style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'var(--font-ui)', fontSize:'.84rem', resize:'vertical', marginTop:4 }} />
      </div>

      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn" style={{ background:'#fdf2f2', color:'#7b241c', border:'1px solid #fadbd8', padding:'9px 22px', borderRadius:9 }}
          onClick={submit} disabled={saving}>
          {saving ? 'Declining…' : '✕ Decline Request'}
        </button>
      </div>
    </Modal>
  );
}

// ── Note to patient modal ─────────────────────────────────────
function NoteModal({ appt, onClose, onSave }) {
  const [note, setNote]     = useState(appt.doctorNote || '');
  const [saving, setSaving] = useState(false);
  const QUICK = [
    'Please arrive 15 minutes early.',
    'Bring previous medical records and test reports.',
    'Fasting required for 8 hours before visit.',
    'Appointment rescheduled — please check updated time.',
    'Currently unavailable — will confirm soon.',
  ];

  async function submit() {
    setSaving(true);
    try {
      await onSave(appt.appointmentId, note);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to send note');
    } finally { setSaving(false); }
  }

  return (
    <Modal title={`Note to Patient — ${appt.patientName}`} onClose={onClose}>
      <div style={{ background:'#eaf4fb', border:'1.5px solid #aed6f1', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:'.82rem', color:'#1a5276' }}>
        📅 {fmtDate(appt.appointmentDate)} &nbsp;·&nbsp; {appt.reason || 'No reason given'}
      </div>

      <div className="field">
        <label style={{ fontWeight:600 }}>Quick messages</label>
        <div style={{ display:'flex', flexDirection:'column', gap:5, margin:'8px 0' }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => setNote(q)}
              style={{
                textAlign:'left', padding:'7px 12px', border:`1.5px solid ${note===q ? 'var(--forest)' : 'var(--border)'}`,
                borderRadius:8, cursor:'pointer', fontSize:'.79rem',
                background: note===q ? 'var(--mint)' : 'var(--white)',
                color: note===q ? 'var(--forest)' : 'var(--ink)', transition:'.12s',
              }}>
              {q}
            </button>
          ))}
        </div>
        <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
          placeholder="Or write a custom message to the patient…"
          style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'var(--font-ui)', fontSize:'.84rem', resize:'vertical', marginTop:4 }} />
      </div>

      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-sage" onClick={submit} disabled={saving || !note.trim()}>
          {saving ? 'Sending…' : '✉ Send Note'}
        </button>
      </div>
    </Modal>
  );
}

// ── Consult end modal ─────────────────────────────────────────
function ConsultModal({ appointment, onClose, onSave }) {
  const [notes, setNotes]               = useState('');
  const [diagnosis, setDiagnosis]       = useState('');
  const [prescription, setPrescription] = useState('');
  const [saving, setSaving]             = useState(false);

  async function handleSave() {
    setSaving(true);
    const combined = [
      diagnosis    ? `Diagnosis:\n${diagnosis}`       : '',
      prescription ? `Prescription:\n${prescription}` : '',
      notes        ? `Notes:\n${notes}`               : '',
    ].filter(Boolean).join('\n\n');
    await onSave(appointment.appointmentId, combined);
    setSaving(false);
    onClose();
  }

  return (
    <Modal title={`End Consultation — ${appointment.patientName}`} onClose={onClose}>
      <div style={{ fontSize:'.8rem', color:'var(--muted)', marginBottom:16 }}>
        {appointment.reason && <span>Reason: <strong>{appointment.reason}</strong> &nbsp;·&nbsp;</span>}
        <span>{appointment.department}</span>
      </div>
      <div className="field">
        <label>Diagnosis</label>
        <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Primary diagnosis…"
          style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'var(--font-ui)', fontSize:'.86rem' }} />
      </div>
      <div className="field">
        <label>Prescription</label>
        <textarea rows={3} value={prescription} onChange={e => setPrescription(e.target.value)}
          placeholder="Medications, dosage, duration…"
          style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'var(--font-ui)', fontSize:'.86rem', resize:'vertical' }} />
      </div>
      <div className="field">
        <label>Consultation Notes</label>
        <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Clinical observations, follow-up instructions…"
          style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'var(--font-ui)', fontSize:'.86rem', resize:'vertical' }} />
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-sage" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Complete Consultation'}
        </button>
      </div>
    </Modal>
  );
}

// ── EMR modal ─────────────────────────────────────────────────
function EmrModal({ patientId, patientName, initialEmr, onClose, onSave }) {
  const [text, setText] = useState(initialEmr || '');
  return (
    <Modal title={`EMR — ${patientName || 'Patient'}`} onClose={onClose}>
      <div className="field">
        <label>Electronic Medical Record</label>
        <textarea rows={10} value={text} onChange={e => setText(e.target.value)}
          style={{ width:'100%', padding:'11px 13px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'var(--font-ui)', fontSize:'.86rem', resize:'vertical', lineHeight:1.65 }}
          placeholder={`Diagnosis:\n\nPrescription:\n\nVitals:\n\nAllergies:\n\nNotes:`} />
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-sage" onClick={() => onSave(patientId, text)}>Save EMR</button>
      </div>
    </Modal>
  );
}

// ── Main DoctorSchedule ───────────────────────────────────────
export default function DoctorSchedule() {
  const api = useApi();
  const { user } = useAuth();
  const [appts,        setAppts]        = useState([]);
  const [myDoctorId,   setMyDoctorId]   = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal,  setRejectModal]  = useState(null);
  const [consultModal, setConsultModal] = useState(null);
  const [emrModal,     setEmrModal]     = useState(null);
  const [noteModal,    setNoteModal]    = useState(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getAppointments().then(setAppts);
    if (user?.doctorId) {
      setMyDoctorId(user.doctorId);
    } else {
      api.getDoctors().then(doctors => {
        const suffix = (user?.username || '').replace(/^dr\./i, '').toLowerCase();
        const mine = doctors.find(d => d.doctorId === user?.doctorId)
          || doctors.find(d => d.userId === user?.userId)
          || (suffix && doctors.find(d => d.name?.toLowerCase().includes(suffix)))
          || null;
        if (mine) setMyDoctorId(mine.doctorId);
      });
    }
  }, []);

  // New walk-in bookings (Scheduled) arrive via appointment:new — add immediately
  // Online patient bookings (Pending) are only shown after receptionist forwards them
  useSocket('appointment:new', (newAppt) => {
    if (myDoctorId && newAppt.doctorId !== myDoctorId) return;
    if (newAppt.status === 'Pending') return; // wait for appointment:forwarded
    setAppts(prev => prev.some(a => a.appointmentId === newAppt.appointmentId) ? prev : [...prev, newAppt]);
    toast.info(`New booking: ${newAppt.patientName} at ${(newAppt.appointmentTime||'').slice(0,5)}`);
    playNotify();
  });

  // Receptionist forwarded an online request — now show it to the doctor
  useSocket('appointment:forwarded', (appt) => {
    if (myDoctorId && appt.doctorId !== myDoctorId) return;
    setAppts(prev => prev.some(a => a.appointmentId === appt.appointmentId) ? prev : [...prev, appt]);
    toast.info(`Reception forwarded a request: ${appt.patientName} — please review`);
    playNotify();
  });

  useSocket('appointment:updated', ({ appointmentId, status, appointmentTime }) => {
    setAppts(prev => prev.map(a =>
      a.appointmentId === appointmentId
        ? { ...a, status, ...(appointmentTime ? { appointmentTime } : {}) }
        : a
    ));
  });

  useSocket('attendance:updated', ({ appointmentId, status }) => {
    setAppts(prev => prev.map(a => a.appointmentId === appointmentId ? { ...a, status } : a));
  });

  async function approve(id, time) {
    await api.approveAppointment(id, time);
    setAppts(prev => prev.map(a => a.appointmentId === id ? { ...a, status:'Scheduled', appointmentTime: time } : a));
    toast.success('Appointment confirmed — patient will be notified');
  }

  async function reject(id, reason) {
    await api.rejectAppointment(id, reason);
    setAppts(prev => prev.map(a => a.appointmentId === id ? { ...a, status:'Cancelled', doctorNote: reason } : a));
    toast.info('Appointment declined — reason sent to patient');
  }

  async function startConsult(id) {
    try {
      await api.startConsult(id);
      setAppts(a => a.map(x => x.appointmentId === id ? { ...x, status:'In-Progress' } : x));
      toast.success('Consultation started');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to start consultation');
    }
  }

  async function endConsult(appointmentId, notes) {
    try {
      await api.endConsult(appointmentId, notes);
      setAppts(a => a.map(x => x.appointmentId === appointmentId ? { ...x, status:'Completed' } : x));
      toast.success('Consultation completed');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to end consultation');
    }
  }

  async function saveNote(appointmentId, note) {
    await api.updateDoctorNote(appointmentId, note);
    setAppts(prev => prev.map(a => a.appointmentId === appointmentId ? { ...a, doctorNote: note } : a));
    toast.success('Note sent to patient');
  }

  async function saveEmr(patientId, text) {
    try {
      await api.updatePatient(patientId, { emr: text });
      toast.success('EMR saved');
      setEmrModal(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save EMR');
    }
  }

  const pending = appts.filter(a => a.status === 'Pending');
  // Active patients (any date) + scheduled from today onwards + completed today
  const scheduleAppts = appts.filter(a =>
    a.status !== 'Pending' && (
      ['Checked-In', 'In-Progress'].includes(a.status) ||
      (a.status === 'Scheduled' && (a.appointmentDate || '') >= today) ||
      (a.status === 'Completed'  && (a.appointmentDate || '').startsWith(today)) ||
      (a.status === 'Cancelled'  && (a.appointmentDate || '').startsWith(today))
    )
  );

  return (
    <div>
      {/* Pending Requests Banner */}
      <AnimatePresence>
        {pending.length > 0 && (
          <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ background:'#f3e8ff', border:'1.5px solid #d8b4fe', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <motion.div animate={{ scale:[1,1.15,1] }} transition={{ repeat:Infinity, duration:1.6 }}
                style={{ width:10, height:10, borderRadius:'50%', background:'#9333ea', flexShrink:0 }} />
              <span style={{ fontWeight:700, color:'#6b21a8', fontSize:'.95rem' }}>
                {pending.length} Request{pending.length > 1 ? 's' : ''} Forwarded by Reception — Your Decision Needed
              </span>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <AnimatePresence>
                {pending.map(a => (
                  <motion.div key={a.appointmentId}
                    initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, height:0 }}
                    style={{ display:'flex', alignItems:'center', gap:14, background:'#fff', borderRadius:10, padding:'12px 16px', border:'1px solid #e9d5ff' }}>
                    {/* Avatar */}
                    <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'.95rem', flexShrink:0 }}>
                      {(a.patientName||'P')[0]}
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'.9rem', color:'var(--forest)' }}>{a.patientName}</div>
                      <div style={{ fontSize:'.75rem', color:'var(--muted)', marginTop:2 }}>
                        📅 {fmtDate(a.appointmentDate)} &nbsp;·&nbsp; {a.reason || 'No reason given'}
                      </div>
                      <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap' }}>
                        <span style={{ background:'#f3e8ff', color:'#7c3aed', padding:'2px 8px', borderRadius:20, fontWeight:600, fontSize:'.7rem' }}>
                          Online Booking
                        </span>
                        <span style={{ background:'#fef3c7', color:'#92400e', padding:'2px 8px', borderRadius:20, fontWeight:600, fontSize:'.7rem' }}>
                          Forwarded by Reception
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                      <button className="btn btn-sm" onClick={() => setRejectModal(a)}
                        style={{ background:'#fdf2f2', color:'#7b241c', border:'1px solid #fadbd8', padding:'7px 14px', borderRadius:8 }}>
                        ✕ Decline
                      </button>
                      <button className="btn btn-sage btn-sm" onClick={() => setApproveModal(a)}
                        style={{ padding:'7px 16px', borderRadius:8 }}>
                        ✓ Accept & Set Time
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info banner when no pending requests */}
      {pending.length === 0 && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
          padding: '12px 18px', marginBottom: 20, fontSize: '.83rem', color: '#166534',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span>ℹ️</span>
          <span>Patient appointment requests will appear here after the receptionist forwards them to you for review.</span>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom:20 }}>
        <div style={{ background:'#f3e8ff', border:'1.5px solid #d8b4fe', borderRadius:12, padding:'14px 18px', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:'1.8rem', fontWeight:700, color:'#6b21a8' }}>{pending.length}</div>
          <div style={{ fontSize:'.75rem', color:'#7e22ce', marginTop:2 }}>Pending Requests</div>
        </div>
        <div style={{ background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:12, padding:'14px 18px', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:'1.8rem', fontWeight:700, color:'var(--forest)' }}>{scheduleAppts.filter(a => a.status==='Scheduled').length}</div>
          <div style={{ fontSize:'.75rem', color:'var(--muted)', marginTop:2 }}>Upcoming</div>
        </div>
        <div style={{ background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:12, padding:'14px 18px', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:'1.8rem', fontWeight:700, color:'var(--sage)' }}>{scheduleAppts.filter(a => a.status==='Completed').length}</div>
          <div style={{ fontSize:'.75rem', color:'var(--muted)', marginTop:2 }}>Completed Today</div>
        </div>
        <div style={{ background:'#d8f3dc', border:'1.5px solid #95d5b2', borderRadius:12, padding:'14px 18px', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontSize:'1.8rem', fontWeight:700, color:'#1b4332' }}>{scheduleAppts.filter(a => ['Checked-In','In-Progress'].includes(a.status)).length}</div>
          <div style={{ fontSize:'.75rem', color:'#2d6a4f', marginTop:2 }}>Active Now</div>
        </div>
      </div>

      {/* Schedule */}
      <div className="card">
        <div className="card-head">
          <h3>My Schedule</h3>
          <span style={{ fontSize:'.78rem', color:'var(--muted)' }}>Active &amp; upcoming appointments</span>
        </div>
        <div className="card-body" style={{ padding:0 }}>
          {scheduleAppts.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>No confirmed appointments</div>
          ) : (
            <AnimatePresence initial={false}>
              {scheduleAppts.sort((a,b) => {
                const aKey = (a.appointmentDate||'')+(a.appointmentTime||'');
                const bKey = (b.appointmentDate||'')+(b.appointmentTime||'');
                return aKey.localeCompare(bKey);
              }).map((a, i) => {
                const ss = SS[a.status] || SS.Scheduled;
                const isOnline = a.bookedBy === 'patient';
                const isToday = (a.appointmentDate || '').startsWith(today);
                return (
                  <motion.div key={a.appointmentId} layout
                    initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, height:0 }}
                    style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom: i < scheduleAppts.length-1 ? '1px solid var(--stone)' : 'none' }}>

                    <div style={{ minWidth:56, textAlign:'center' }}>
                      <div style={{ fontWeight:700, fontSize:'.88rem', color:'var(--forest)' }}>{fmtTime(a.appointmentTime)}</div>
                      <div style={{ fontSize:'.62rem', color: isToday ? 'var(--sage)' : 'var(--muted)', marginTop:1 }}>
                        {isToday ? 'Today' : new Date(a.appointmentDate).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                      </div>
                    </div>

                    <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--mint)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--forest)', fontWeight:700, fontSize:'.9rem', flexShrink:0 }}>
                      {(a.patientName||'?')[0]}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:'.9rem', display:'flex', alignItems:'center', gap:8 }}>
                        {a.patientName || '—'}
                        {isOnline && (
                          <span style={{ fontSize:'.65rem', background:'#f3e8ff', color:'#7c3aed', padding:'1px 7px', borderRadius:20, fontWeight:600 }}>Online</span>
                        )}
                      </div>
                      <div style={{ fontSize:'.74rem', color:'var(--muted)' }}>{a.reason || 'No reason given'}</div>
                    </div>

                    <span style={{ padding:'4px 12px', borderRadius:20, fontSize:'.72rem', fontWeight:600, background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`, flexShrink:0 }}>
                      {a.status}
                    </span>

                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      {a.status === 'Checked-In' && (
                        <button className="btn btn-sage btn-sm" onClick={() => startConsult(a.appointmentId)}>▶ Start</button>
                      )}
                      {a.status === 'In-Progress' && (
                        <button className="btn btn-forest btn-sm" onClick={() => setConsultModal(a)}>✓ End</button>
                      )}
                      <button className="btn btn-outline btn-sm"
                        title={a.doctorNote ? `Note: ${a.doctorNote}` : 'Send note to patient'}
                        onClick={() => setNoteModal(a)}
                        style={{ position:'relative' }}>
                        ✉{a.doctorNote && (
                          <span style={{ position:'absolute', top:-4, right:-4, width:8, height:8, borderRadius:'50%', background:'var(--sage)' }} />
                        )}
                      </button>
                      <button className="btn btn-outline btn-sm"
                        onClick={() => setEmrModal({ patientId: a.patientId, patientName: a.patientName, emr:'' })}>
                        📋
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Modals */}
      {approveModal && <ApproveModal appt={approveModal} onClose={() => setApproveModal(null)} onApprove={approve} />}
      {rejectModal  && <RejectModal  appt={rejectModal}  onClose={() => setRejectModal(null)}  onReject={reject}  />}
      {consultModal && <ConsultModal appointment={consultModal} onClose={() => setConsultModal(null)} onSave={endConsult} />}
      {emrModal     && <EmrModal patientId={emrModal.patientId} patientName={emrModal.patientName} initialEmr={emrModal.emr} onClose={() => setEmrModal(null)} onSave={saveEmr} />}
      {noteModal    && <NoteModal appt={noteModal} onClose={() => setNoteModal(null)} onSave={saveNote} />}
    </div>
  );
}

// ── Patient Queue ─────────────────────────────────────────────
export function PatientQueue() {
  const api = useApi();
  const { user } = useAuth();
  const [appts,      setAppts]      = useState([]);
  const [myDoctorId, setMyDoctorId] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getAppointments().then(setAppts);
    if (user?.doctorId) {
      setMyDoctorId(user.doctorId);
    } else {
      api.getDoctors().then(doctors => {
        const suffix = (user?.username || '').replace(/^dr\./i, '').toLowerCase();
        const mine = doctors.find(d => d.doctorId === user?.doctorId)
          || doctors.find(d => d.userId === user?.userId)
          || (suffix && doctors.find(d => d.name?.toLowerCase().includes(suffix)))
          || null;
        if (mine) setMyDoctorId(mine.doctorId);
      });
    }
  }, []);

  useSocket('appointment:new', (a) => {
    if (myDoctorId && a.doctorId !== myDoctorId) return;
    setAppts(prev => prev.some(x => x.appointmentId === a.appointmentId) ? prev : [...prev, a]);
    playNotify();
  });
  useSocket('appointment:updated', ({ appointmentId, status }) => {
    setAppts(prev => prev.map(a => a.appointmentId === appointmentId ? { ...a, status } : a));
  });
  useSocket('attendance:updated', ({ appointmentId, status }) => {
    setAppts(prev => prev.map(a => a.appointmentId === appointmentId ? { ...a, status } : a));
  });

  const queue = appts
    .filter(a => ['Checked-In', 'In-Progress'].includes(a.status))
    .sort((a, b) => {
      const aKey = (a.appointmentDate || '') + (a.appointmentTime || '');
      const bKey = (b.appointmentDate || '') + (b.appointmentTime || '');
      return aKey.localeCompare(bKey);
    });

  async function startConsult(id) {
    try { await api.startConsult(id); setAppts(a => a.map(x => x.appointmentId===id ? {...x,status:'In-Progress'} : x)); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed'); }
  }
  async function endConsult(id) {
    try { await api.endConsult(id,''); setAppts(a => a.map(x => x.appointmentId===id ? {...x,status:'Completed'} : x)); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed'); }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Active Patient Queue</h3>
        <span style={{ fontSize:'.82rem', color:'var(--muted)' }}>{queue.length} in queue</span>
      </div>
      <div className="card-body">
        {queue.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>No active patients in queue</div>
        ) : (
          <AnimatePresence initial={false}>
            {queue.map((a, i) => (
              <motion.div key={a.appointmentId}
                initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:16 }}
                style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 12px', marginBottom:8, borderRadius:10, border:`1.5px solid ${i===0 ? '#95d5b2' : 'var(--stone)'}`, background: i===0 ? '#f0fff4' : '#fff' }}>
                <div style={{ width:32, height:32, background: i===0 ? 'var(--sage)' : 'var(--stone)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color: i===0 ? '#fff' : 'var(--muted)', fontWeight:700, fontSize:'.82rem' }}>
                  {i+1}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:'.9rem' }}>{a.patientName}</div>
                  <div style={{ fontSize:'.74rem', color:'var(--muted)' }}>{fmtTime(a.appointmentTime)} · {a.reason||'—'}</div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  {a.status==='Checked-In' && <button className="btn btn-sage btn-sm" onClick={() => startConsult(a.appointmentId)}>▶ Start</button>}
                  {a.status==='In-Progress' && <button className="btn btn-forest btn-sm" onClick={() => endConsult(a.appointmentId)}>✓ End</button>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
