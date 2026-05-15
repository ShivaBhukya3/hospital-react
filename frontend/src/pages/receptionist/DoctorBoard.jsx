import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Modal, toast, fmtTime } from '../../components/UI';

const AVAIL_STYLE = {
  Available: { bg:'#d8f3dc', color:'#1b4332', border:'#95d5b2', dot:'#40916c', headerBg:'linear-gradient(135deg,#1b4332,#2d6a4f)' },
  Busy:      { bg:'#fef9e7', color:'#7d6608', border:'#f9e79f', dot:'#b7770d', headerBg:'linear-gradient(135deg,#7d6608,#b7770d)' },
  'Off-duty':{ bg:'#fdf2f2', color:'#7b241c', border:'#fadbd8', dot:'#c0392b', headerBg:'linear-gradient(135deg,#555,#777)' },
};

export default function DoctorBoard() {
  const api = useApi();
  const [doctors,  setDoctors]  = useState([]);
  const [appts,    setAppts]    = useState([]);
  const [patients, setPatients] = useState([]);
  const [assignModal, setAssignModal] = useState(null); // doctor object
  const [assignPtId,  setAssignPtId]  = useState('');
  const [assignDate,  setAssignDate]  = useState(new Date().toISOString().split('T')[0]);
  const [assignTime,  setAssignTime]  = useState('');
  const [assignReason,setAssignReason]= useState('');
  const [filterAvail, setFilterAvail] = useState('All');
  const [filterDept,  setFilterDept]  = useState('All');
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getDoctors().then(setDoctors);
    api.getAppointments().then(setAppts);
    api.getPatients().then(setPatients);
  }, []);

  const deptOptions = ['All', ...new Set(doctors.map(d => d.department).filter(Boolean))];

  const filtered = doctors.filter(d => {
    if (filterAvail !== 'All' && d.availability !== filterAvail) return false;
    if (filterDept  !== 'All' && d.department   !== filterDept)  return false;
    return true;
  });

  function doctorQueue(doctorId) {
    return appts.filter(a =>
      a.doctorId === doctorId &&
      (a.appointmentDate || '').startsWith(today) &&
      ['Scheduled','Checked-In','In-Progress'].includes(a.status)
    ).sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
  }

  function currentPatient(doctorId) {
    return appts.find(a =>
      a.doctorId === doctorId &&
      (a.appointmentDate || '').startsWith(today) &&
      a.status === 'In-Progress'
    );
  }

  async function updateAvail(id, val) {
    try {
      await api.updateAvailability(id, val);
      setDoctors(ds => ds.map(d => d.doctorId === id ? { ...d, availability: val } : d));
      toast.success('Status updated');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update availability');
    }
  }

  async function assignPatient() {
    if (!assignPtId)   { toast.error('Select a patient'); return; }
    if (!assignTime)   { toast.error('Select a time');    return; }
    const payload = {
      patientId: assignPtId,
      doctorId:  assignModal.doctorId,
      appointmentDate: assignDate,
      appointmentTime: assignTime,
      reason: assignReason,
      bookedBy: 'receptionist',
    };
    try {
      await api.createAppointment(payload);
      toast.success('Patient assigned to doctor');
      setAssignModal(null);
      setAssignPtId(''); setAssignTime(''); setAssignReason('');
      api.getAppointments().then(setAppts);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to assign patient');
    }
  }

  const byAvail = av => doctors.filter(d => d.availability === av).length;

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Doctors', val: doctors.length,        color: 'var(--forest)' },
          { label: 'Available',     val: byAvail('Available'),  color: 'var(--sage)' },
          { label: 'Busy',          val: byAvail('Busy'),       color: 'var(--amber)' },
          { label: 'Off-Duty',      val: byAvail('Off-duty'),   color: 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--white)', border: '1.5px solid var(--border)',
            borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ paddingTop: 13, paddingBottom: 13 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'var(--stone)', borderRadius: 8, padding: 3 }}>
              {['All','Available','Busy','Off-duty'].map(av => (
                <button key={av} onClick={() => setFilterAvail(av)}
                  style={{
                    padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
                    fontFamily: 'var(--font-ui)', fontSize: '.78rem', fontWeight: 500,
                    background: filterAvail === av ? 'var(--white)' : 'transparent',
                    color: filterAvail === av ? 'var(--forest)' : 'var(--muted)',
                    boxShadow: filterAvail === av ? 'var(--shadow-sm)' : 'none',
                    transition: '.12s',
                  }}>
                  {av}
                </button>
              ))}
            </div>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
              style={{ padding:'7px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'var(--font-ui)', fontSize:'.83rem', background:'var(--white)', outline:'none' }}>
              {deptOptions.map(d => <option key={d}>{d}</option>)}
            </select>
            <span style={{ marginLeft: 'auto', fontSize: '.8rem', color: 'var(--muted)' }}>
              {filtered.length} doctor{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Doctor cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
        {filtered.map(d => {
          const av      = d.availability || 'Available';
          const avs     = AVAIL_STYLE[av];
          const queue   = doctorQueue(d.doctorId);
          const current = currentPatient(d.doctorId);
          const isOff   = av === 'Off-duty';

          return (
            <div key={d.doctorId} style={{
              border: `1.5px solid ${avs.border}`, borderRadius: 14,
              background: 'var(--white)', overflow: 'hidden',
              opacity: isOff ? .65 : 1,
              transition: 'box-shadow .15s',
            }}
              onMouseEnter={e => { if (!isOff) e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              {/* Header */}
              <div style={{ background: avs.headerBg, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: 'rgba(255,255,255,.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, flexShrink: 0,
                }}>
                  {d.name.split(' ').pop()[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '.94rem' }}>{d.name}</div>
                  <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '.74rem', marginTop: 2 }}>
                    {d.specialization} · {d.department}
                  </div>
                </div>
                <div style={{
                  background: avs.bg, border: `1px solid ${avs.border}`,
                  borderRadius: 20, padding: '4px 11px',
                  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: avs.dot }} />
                  <span style={{ fontSize: '.7rem', fontWeight: 700, color: avs.color }}>{av}</span>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '14px 18px' }}>
                {/* Current patient */}
                {current ? (
                  <div style={{
                    background: '#d8f3dc', border: '1px solid #95d5b2', borderRadius: 10,
                    padding: '10px 12px', marginBottom: 12,
                  }}>
                    <div style={{ fontSize: '.68rem', color: '#1b4332', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                      Currently With
                    </div>
                    <div style={{ fontWeight: 600, color: '#1b4332', fontSize: '.88rem' }}>{current.patientName}</div>
                    <div style={{ fontSize: '.72rem', color: '#2d6a4f', marginTop: 2 }}>{current.reason || 'Consultation'}</div>
                  </div>
                ) : av === 'Available' ? (
                  <div style={{
                    background: '#f0faf3', border: '1px dashed #95d5b2', borderRadius: 10,
                    padding: '10px 12px', marginBottom: 12, textAlign: 'center',
                    fontSize: '.8rem', color: '#2d6a4f',
                  }}>
                    Ready for next patient
                  </div>
                ) : null}

                {/* Queue preview */}
                {queue.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Queue ({queue.length})
                    </div>
                    {queue.slice(0, 3).map((a, i) => (
                      <div key={a.appointmentId} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 0',
                        borderBottom: i < Math.min(queue.length, 3) - 1 ? '1px solid var(--stone)' : 'none',
                        fontSize: '.8rem',
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', background: 'var(--stone)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '.68rem', fontWeight: 700, color: 'var(--muted)', flexShrink: 0,
                        }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600 }}>{a.patientName}</span>
                          <span style={{ color: 'var(--muted)', marginLeft: 6 }}>{fmtTime(a.appointmentTime)}</span>
                        </div>
                        <span className={`badge badge-${a.status}`} style={{ fontSize: '.65rem' }}>{a.status}</span>
                      </div>
                    ))}
                    {queue.length > 3 && (
                      <div style={{ fontSize: '.74rem', color: 'var(--muted)', marginTop: 6 }}>
                        +{queue.length - 3} more in queue
                      </div>
                    )}
                  </div>
                )}

                {queue.length === 0 && !current && (
                  <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 12 }}>
                    No patients queued for today
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={av}
                    onChange={e => updateAvail(d.doctorId, e.target.value)}
                    style={{
                      flex: 1, padding: '7px 10px', border: '1.5px solid var(--border)',
                      borderRadius: 8, fontSize: '.8rem', fontFamily: 'var(--font-ui)', background: 'var(--white)',
                    }}
                  >
                    <option>Available</option><option>Busy</option><option>Off-duty</option>
                  </select>
                  {!isOff && (
                    <button className="btn btn-sage btn-sm" onClick={() => setAssignModal(d)}>
                      Assign Patient
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assign Patient Modal */}
      {assignModal && (
        <Modal title={`Assign Patient — ${assignModal.name}`} onClose={() => setAssignModal(null)}>
          <div style={{ marginBottom: 14, fontSize: '.83rem', color: 'var(--muted)' }}>
            {assignModal.department} · {assignModal.specialization}
          </div>
          <div className="field">
            <label>Patient <span style={{ color:'var(--red)' }}>*</span></label>
            <select value={assignPtId} onChange={e => setAssignPtId(e.target.value)}>
              <option value="">Select patient…</option>
              {patients.map(p => <option key={p.patientId} value={p.patientId}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Date</label>
              <input type="date" min={today} value={assignDate} onChange={e => setAssignDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Time <span style={{ color:'var(--red)' }}>*</span></label>
              <input type="time" value={assignTime} onChange={e => setAssignTime(e.target.value)} />
            </div>
            <div className="field form-full">
              <label>Reason</label>
              <input value={assignReason} onChange={e => setAssignReason(e.target.value)} placeholder="Reason for visit…" />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setAssignModal(null)}>Cancel</button>
            <button className="btn btn-sage" onClick={assignPatient}>Assign Patient</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
