import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { toast } from '../../components/UI';

const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
const GENDERS      = ['Male','Female','Other'];

const EMPTY_PT   = { name:'', age:'', gender:'Male', contact:'', bloodGroup:'O+', address:'' };
const EMPTY_APPT = { appointmentDate:'', appointmentTime:'', reason:'' };

export default function WalkIn() {
  const api = useApi();
  const [step, setStep]           = useState(1); // 1 = patient, 2 = appointment
  const [mode, setMode]           = useState('new'); // 'new' | 'existing'
  const [search, setSearch]       = useState('');
  const [patients, setPatients]   = useState([]);
  const [doctors,  setDoctors]    = useState([]);
  const [ptForm,   setPtForm]     = useState(EMPTY_PT);
  const [apptForm, setApptForm]   = useState(EMPTY_APPT);
  const [selectedPt, setSelectedPt] = useState(null); // chosen patient object
  const [selectedDoc, setSelectedDoc] = useState(null); // chosen doctor object
  const [saving, setSaving]       = useState(false);
  const [done, setDone]           = useState(null); // completion summary
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getPatients().then(setPatients);
    api.getDoctors().then(setDoctors);
  }, []);

  const setP = (k, v) => setPtForm(f => ({ ...f, [k]: v }));
  const setA = (k, v) => setApptForm(f => ({ ...f, [k]: v }));

  const filteredPts = patients.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.contact || '').includes(q);
  });

  const availDoctors = doctors.filter(d => d.availability !== 'Off-duty');

  function resetAll() {
    setStep(1); setMode('new'); setSearch(''); setPtForm(EMPTY_PT);
    setApptForm(EMPTY_APPT); setSelectedPt(null); setSelectedDoc(null); setDone(null);
  }

  async function proceedToStep2() {
    if (mode === 'new') {
      if (!ptForm.name.trim()) { toast.error('Patient name is required'); return; }
      setSaving(true);
      let newPt = { ...ptForm, patientId: Date.now() };
      try {
        const created = await api.createPatient(ptForm);
        newPt = created || newPt;
        setPatients(ps => [...ps, newPt]);
        toast.success(`Patient "${ptForm.name}" registered`);
      } catch (err) {
        toast.error(err?.response?.data?.error || 'Failed to register patient');
        setSaving(false);
        return;
      }
      setSelectedPt(newPt);
      setSaving(false);
    } else {
      if (!selectedPt) { toast.error('Please select a patient'); return; }
    }
    setStep(2);
  }

  async function bookAppointment() {
    if (!selectedDoc) { toast.error('Please select a doctor'); return; }
    if (!apptForm.appointmentDate) { toast.error('Date is required'); return; }
    if (!apptForm.appointmentTime) { toast.error('Time is required'); return; }

    setSaving(true);
    const payload = {
      patientId: selectedPt.patientId,
      doctorId:  selectedDoc.doctorId,
      ...apptForm,
      bookedBy: 'receptionist',
    };
    try {
      await api.createAppointment(payload);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to book appointment');
      setSaving(false);
      return;
    }

    setDone({
      patient: selectedPt.name || ptForm.name,
      doctor:  selectedDoc.name,
      dept:    selectedDoc.department,
      date:    apptForm.appointmentDate,
      time:    apptForm.appointmentTime,
      reason:  apptForm.reason,
    });
    setSaving(false);
  }

  // ── Done screen ─────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', paddingTop: 40 }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--forest)', marginBottom: 8 }}>
              Walk-In Registered
            </h2>
            <p style={{ color: 'var(--muted)', marginBottom: 28, fontSize: '.88rem' }}>
              Appointment has been scheduled successfully.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28, textAlign: 'left' }}>
              {[
                { label: 'Patient', val: done.patient },
                { label: 'Doctor',  val: done.doctor },
                { label: 'Dept',    val: done.dept },
                { label: 'Date',    val: done.date },
                { label: 'Time',    val: done.time },
                { label: 'Reason',  val: done.reason || '—' },
              ].map(f => (
                <div key={f.label} style={{ background: 'var(--sand)', borderRadius: 9, padding: '10px 13px' }}>
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontWeight: 600, fontSize: '.87rem' }}>{f.val}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-sage" onClick={resetAll} style={{ width: '100%' }}>
              Register Another Walk-In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step indicators ─────────────────────────────────────────
  const steps = ['Patient Info', 'Book Appointment'];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Step progress */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, gap: 0 }}>
        {steps.map((label, i) => {
          const num   = i + 1;
          const done  = step > num;
          const active = step === num;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '.88rem', flexShrink: 0,
                  background: done ? 'var(--sage)' : active ? 'var(--forest)' : 'var(--stone)',
                  color: (done || active) ? '#fff' : 'var(--muted)',
                }}>
                  {done ? '✓' : num}
                </div>
                <span style={{
                  fontSize: '.84rem', fontWeight: active ? 700 : 500,
                  color: active ? 'var(--forest)' : done ? 'var(--sage)' : 'var(--muted)',
                }}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, background: step > i + 1 ? 'var(--sage)' : 'var(--stone)', margin: '0 12px' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Patient ───────────────────────────────────── */}
      {step === 1 && (
        <div className="card">
          <div className="card-head"><h3>Patient Information</h3></div>
          <div className="card-body">

            {/* Mode toggle */}
            <div style={{ display: 'flex', background: 'var(--stone)', borderRadius: 10, padding: 3, marginBottom: 22, width: 'fit-content' }}>
              {[['new','New Patient'], ['existing','Existing Patient']].map(([val, lbl]) => (
                <button key={val} onClick={() => { setMode(val); setSelectedPt(null); setSearch(''); }}
                  style={{
                    padding: '7px 20px', border: 'none', borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'var(--font-ui)', fontSize: '.83rem', fontWeight: 600,
                    background: mode === val ? 'var(--white)' : 'transparent',
                    color: mode === val ? 'var(--forest)' : 'var(--muted)',
                    boxShadow: mode === val ? 'var(--shadow-sm)' : 'none',
                    transition: '.15s',
                  }}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* New patient form */}
            {mode === 'new' && (
              <div className="form-grid">
                <div className="field form-full">
                  <label>Full Name <span style={{ color:'var(--red)' }}>*</span></label>
                  <input value={ptForm.name} onChange={e => setP('name', e.target.value)} placeholder="Patient's full name" autoFocus />
                </div>
                <div className="field">
                  <label>Age</label>
                  <input type="number" min="0" value={ptForm.age} onChange={e => setP('age', e.target.value)} placeholder="Years" />
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
                  <input value={ptForm.address} onChange={e => setP('address', e.target.value)} placeholder="Full address (optional)" />
                </div>
              </div>
            )}

            {/* Existing patient search */}
            {mode === 'existing' && (
              <div>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label>Search Patient</label>
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Type name or phone number…" autoFocus
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ maxHeight: 280, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: 10 }}>
                  {filteredPts.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '.85rem' }}>
                      {search ? 'No patients found' : 'Start typing to search…'}
                    </div>
                  ) : filteredPts.map(p => (
                    <div
                      key={p.patientId}
                      onClick={() => setSelectedPt(p)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        cursor: 'pointer', transition: '.12s',
                        background: selectedPt?.patientId === p.patientId ? 'var(--mint)' : 'transparent',
                        borderBottom: '1px solid var(--stone)',
                      }}
                      onMouseEnter={e => { if (selectedPt?.patientId !== p.patientId) e.currentTarget.style.background = 'var(--cream)'; }}
                      onMouseLeave={e => { if (selectedPt?.patientId !== p.patientId) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: 36, height: 36, background: 'var(--mint)', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--forest)', fontWeight: 700, fontSize: '.9rem', flexShrink: 0,
                      }}>
                        {p.name[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{p.name}</div>
                        <div style={{ fontSize: '.73rem', color: 'var(--muted)' }}>
                          {p.age ? `${p.age} yrs` : ''} {p.gender ? `· ${p.gender}` : ''} {p.contact ? `· ${p.contact}` : ''}
                        </div>
                      </div>
                      {selectedPt?.patientId === p.patientId && (
                        <div style={{ color: 'var(--sage)', fontWeight: 700, fontSize: '1rem' }}>✓</div>
                      )}
                    </div>
                  ))}
                </div>
                {selectedPt && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--mint)', borderRadius: 9, fontSize: '.83rem' }}>
                    Selected: <strong>{selectedPt.name}</strong>
                    {selectedPt.age && ` · ${selectedPt.age} yrs`}
                    {selectedPt.bloodGroup && ` · ${selectedPt.bloodGroup}`}
                  </div>
                )}
              </div>
            )}

            <div className="form-actions" style={{ marginTop: 20 }}>
              <div />
              <button className="btn btn-sage" onClick={proceedToStep2} disabled={saving}>
                {saving ? 'Registering…' : 'Next — Book Appointment →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Appointment ───────────────────────────────── */}
      {step === 2 && (
        <div className="card">
          <div className="card-head">
            <h3>Book Appointment</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setStep(1)}>← Back</button>
          </div>
          <div className="card-body">
            {/* Patient summary */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22,
              padding: '12px 16px', background: 'var(--mint)', borderRadius: 10,
            }}>
              <div style={{
                width: 40, height: 40, background: 'var(--sage)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '1rem', flexShrink: 0,
              }}>
                {(selectedPt?.name || ptForm.name || '?')[0]}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{selectedPt?.name || ptForm.name}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                  {selectedPt?.age || ptForm.age ? `${selectedPt?.age || ptForm.age} yrs · ` : ''}
                  {selectedPt?.bloodGroup || ptForm.bloodGroup}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '.75rem', color: 'var(--sage)', fontWeight: 600 }}>
                Patient confirmed ✓
              </div>
            </div>

            {/* Doctor selection */}
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Select Doctor <span style={{ color:'var(--red)' }}>*</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {availDoctors.map(d => {
                  const isSelected = selectedDoc?.doctorId === d.doctorId;
                  const av = d.availability;
                  return (
                    <div
                      key={d.doctorId}
                      onClick={() => setSelectedDoc(d)}
                      style={{
                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${isSelected ? 'var(--sage)' : 'var(--border)'}`,
                        background: isSelected ? 'var(--mint)' : 'var(--white)',
                        transition: '.12s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{d.name}</div>
                        <span style={{
                          fontSize: '.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                          background: av === 'Available' ? '#d8f3dc' : '#fef9e7',
                          color:      av === 'Available' ? '#1b4332'  : '#7d6608',
                        }}>
                          {av}
                        </span>
                      </div>
                      <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>{d.specialization}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{d.department}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-grid">
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
                <input value={apptForm.reason} onChange={e => setA('reason', e.target.value)} placeholder="e.g. Fever, follow-up, knee pain…" />
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-sage" onClick={bookAppointment} disabled={saving}>
                {saving ? 'Booking…' : 'Confirm Walk-In Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
