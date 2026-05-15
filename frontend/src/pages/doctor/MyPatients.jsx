import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Modal, toast, Empty, fmtDate, fmtTime } from '../../components/UI';

const BLOOD_COLORS = {
  'A+': '#e74c3c', 'A-': '#c0392b', 'B+': '#e67e22', 'B-': '#d35400',
  'O+': '#27ae60', 'O-': '#1e8449', 'AB+': '#2980b9', 'AB-': '#1a5276',
};

export default function MyPatients() {
  const api = useApi();
  const [patients, setPatients]           = useState([]);
  const [appts, setAppts]                 = useState([]);
  const [search, setSearch]               = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [emrModal, setEmrModal]           = useState(null);
  const [emrText, setEmrText]             = useState('');
  const [filter, setFilter]               = useState('all');

  useEffect(() => {
    api.getPatients().then(setPatients);
    api.getAppointments().then(setAppts);
  }, []);

  // Build the set of patientIds this doctor has seen
  const seenIds = new Set(appts.map(a => a.patientId));
  const myPatients = patients.filter(p => seenIds.has(p.patientId));

  const filtered = myPatients.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.contact || '').includes(search);
    if (!matchSearch) return false;
    if (filter === 'all') return true;
    const lastAppt = appts
      .filter(a => a.patientId === p.patientId)
      .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))[0];
    if (filter === 'active') return lastAppt && ['Scheduled', 'Checked-In', 'In-Progress'].includes(lastAppt.status);
    if (filter === 'completed') return lastAppt && lastAppt.status === 'Completed';
    return true;
  });

  function getLastAppt(patientId) {
    return appts
      .filter(a => a.patientId === patientId)
      .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))[0];
  }

  function openHistory(p) {
    const patientAppts = appts
      .filter(a => a.patientId === p.patientId)
      .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
    setSelectedPatient({ patient: p, appts: patientAppts });
  }

  function openEmr(p) {
    setEmrText(p.emr || '');
    setEmrModal(p);
  }

  async function saveEmr() {
    try {
      await api.updatePatient(emrModal.patientId, { emr: emrText });
      setPatients(ps => ps.map(p => p.patientId === emrModal.patientId ? { ...p, emr: emrText } : p));
      toast.success('EMR saved successfully');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save EMR');
    }
    setEmrModal(null);
  }

  const statusCount = (s) => appts.filter(a => a.status === s && seenIds.has(a.patientId)).length;

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Patients',  val: myPatients.length,       color: 'var(--forest)' },
          { label: 'Active Today',    val: statusCount('Checked-In') + statusCount('In-Progress'), color: 'var(--amber)' },
          { label: 'Completed',       val: statusCount('Completed'), color: 'var(--sage)' },
          { label: 'Scheduled',       val: statusCount('Scheduled'), color: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 12,
            padding: '14px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <h3>My Patients ({filtered.length})</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Filter tabs */}
            <div style={{ display: 'flex', background: 'var(--stone)', borderRadius: 8, padding: 3 }}>
              {[['all', 'All'], ['active', 'Active'], ['completed', 'Completed']].map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  style={{
                    padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
                    fontSize: '.78rem', fontWeight: 500, fontFamily: 'var(--font-ui)',
                    background: filter === val ? 'var(--white)' : 'transparent',
                    color: filter === val ? 'var(--forest)' : 'var(--muted)',
                    boxShadow: filter === val ? 'var(--shadow-sm)' : 'none',
                    transition: '.15s',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <input
              type="search"
              placeholder="Search name or contact…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '7px 14px', border: '1.5px solid var(--border)', borderRadius: 9,
                fontFamily: 'var(--font-ui)', fontSize: '.83rem', width: 200, outline: 'none',
              }}
            />
          </div>
        </div>

        <div className="card-body">
          {filtered.length === 0 ? (
            <Empty text="No patients found" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
              {filtered.map(p => {
                const last = getLastAppt(p.patientId);
                const visitCount = appts.filter(a => a.patientId === p.patientId).length;
                return (
                  <div
                    key={p.patientId}
                    style={{
                      border: '1.5px solid var(--border)', borderRadius: 12,
                      padding: '16px', background: 'var(--white)',
                      transition: 'box-shadow .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--mint), var(--sage))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--forest)', fontWeight: 700, fontSize: '1.05rem', flexShrink: 0,
                      }}>
                        {p.name[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '.73rem', color: 'var(--muted)' }}>
                          {[p.age ? `${p.age} yrs` : null, p.gender].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      {p.bloodGroup && (
                        <div style={{
                          background: BLOOD_COLORS[p.bloodGroup] || 'var(--sage)',
                          color: '#fff', borderRadius: 8, padding: '3px 8px',
                          fontSize: '.7rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {p.bloodGroup}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.7 }}>
                      {p.contact && <div>📞 {p.contact}</div>}
                      <div>🗓 {visitCount} visit{visitCount !== 1 ? 's' : ''}</div>
                      {last && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          Last: {fmtDate(last.appointmentDate)}
                          <span className={`badge badge-${last.status}`} style={{ fontSize: '.65rem', padding: '1px 6px' }}>
                            {last.status}
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openHistory(p)}
                        style={{ flex: 1 }}
                      >
                        History
                      </button>
                      <button
                        className="btn btn-sage btn-sm"
                        onClick={() => openEmr(p)}
                        style={{ flex: 1 }}
                      >
                        📋 EMR
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Patient History Modal */}
      {selectedPatient && (
        <Modal title={`Patient: ${selectedPatient.patient.name}`} onClose={() => setSelectedPatient(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
            {[
              { label: 'Age',          val: selectedPatient.patient.age ? `${selectedPatient.patient.age} yrs` : '—' },
              { label: 'Gender',       val: selectedPatient.patient.gender || '—' },
              { label: 'Blood Group',  val: selectedPatient.patient.bloodGroup || '—' },
              { label: 'Contact',      val: selectedPatient.patient.contact || '—' },
              { label: 'Total Visits', val: selectedPatient.appts.length },
              { label: 'Last Visit',   val: selectedPatient.appts[0] ? fmtDate(selectedPatient.appts[0].appointmentDate) : '—' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--sand)', borderRadius: 9, padding: '10px 12px' }}>
                <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{s.val}</div>
              </div>
            ))}
          </div>

          <h4 style={{ marginBottom: 10, fontSize: '.86rem', color: 'var(--forest)', fontWeight: 600 }}>
            Appointment History
          </h4>
          <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
            {selectedPatient.appts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>No appointments on record</div>
            ) : selectedPatient.appts.map((a, i) => (
              <div key={a.appointmentId} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < selectedPatient.appts.length - 1 ? '1px solid var(--stone)' : 'none',
                fontSize: '.83rem',
              }}>
                <div>
                  <strong>{fmtDate(a.appointmentDate)}</strong>
                  <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{fmtTime(a.appointmentTime)}</span>
                  <div style={{ color: 'var(--muted)', fontSize: '.76rem', marginTop: 2 }}>{a.reason || '—'}</div>
                </div>
                <span className={`badge badge-${a.status}`}>{a.status}</span>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setSelectedPatient(null)}>Close</button>
            <button
              className="btn btn-sage"
              onClick={() => { setSelectedPatient(null); openEmr(selectedPatient.patient); }}
            >
              Open EMR
            </button>
          </div>
        </Modal>
      )}

      {/* EMR Modal */}
      {emrModal && (
        <Modal title={`Electronic Medical Record — ${emrModal.name}`} onClose={() => setEmrModal(null)}>
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14,
            fontSize: '.78rem', color: 'var(--muted)',
          }}>
            {emrModal.age    && <span>Age: <strong style={{ color: 'var(--ink)' }}>{emrModal.age} yrs</strong></span>}
            {emrModal.gender && <span>Gender: <strong style={{ color: 'var(--ink)' }}>{emrModal.gender}</strong></span>}
            {emrModal.bloodGroup && <span>Blood: <strong style={{ color: 'var(--ink)' }}>{emrModal.bloodGroup}</strong></span>}
          </div>
          <div className="field">
            <label>Medical Notes &amp; History</label>
            <textarea
              rows={11}
              value={emrText}
              onChange={e => setEmrText(e.target.value)}
              style={{
                width: '100%', padding: '11px 13px', border: '1.5px solid var(--border)',
                borderRadius: 9, fontFamily: 'var(--font-ui)', fontSize: '.86rem',
                resize: 'vertical', lineHeight: 1.65,
              }}
              placeholder={`Diagnosis:\n\nPrescription:\n\nVitals:\n\nAllergies:\n\nNotes:`}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setEmrModal(null)}>Cancel</button>
            <button className="btn btn-sage" onClick={saveEmr}>Save EMR</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
