import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Modal, toast, Empty, StatCard, fmtDate } from '../../components/UI';

const BLOOD_COLORS = {
  'A+':'#e74c3c','A-':'#c0392b','B+':'#e67e22','B-':'#d35400',
  'O+':'#27ae60','O-':'#1e8449','AB+':'#2980b9','AB-':'#1a5276',
};
const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
const GENDERS      = ['Male','Female','Other'];

const EMPTY_FORM = { name:'', age:'', gender:'Male', contact:'', bloodGroup:'O+', address:'', emr:'' };

export default function PatientManager() {
  const api = useApi();
  const [patients, setPatients]   = useState([]);
  const [appts, setAppts]         = useState([]);
  const [search, setSearch]       = useState('');
  const [filterGender, setGender] = useState('All');
  const [filterBlood, setBlood]   = useState('All');
  const [formModal, setFormModal] = useState(null); // null | 'add' | patient object
  const [viewModal, setViewModal] = useState(null); // patient object
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    api.getPatients().then(setPatients);
    api.getAppointments().then(setAppts);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormModal('add');
  }

  function openEdit(p) {
    setForm({ name: p.name, age: p.age || '', gender: p.gender || 'Male',
      contact: p.contact || '', bloodGroup: p.bloodGroup || 'O+',
      address: p.address || '', emr: p.emr || '' });
    setFormModal(p);
  }

  function openView(p) {
    const patientAppts = appts
      .filter(a => a.patientId === p.patientId)
      .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
    setViewModal({ patient: p, appts: patientAppts });
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Full name is required'); return; }
    setSaving(true);
    try {
      if (formModal === 'add') {
        await api.createPatient(form);
        toast.success('Patient registered successfully');
      } else {
        await api.updatePatient(formModal.patientId, form);
        toast.success('Patient record updated');
      }
      api.getPatients().then(setPatients);
      setFormModal(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || (formModal === 'add' ? 'Failed to register patient' : 'Failed to update patient'));
      setFormModal(null);
    }
    setSaving(false);
  }

  const filtered = patients.filter(p => {
    if (filterGender !== 'All' && p.gender !== filterGender) return false;
    if (filterBlood  !== 'All' && p.bloodGroup !== filterBlood) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.name || '').toLowerCase().includes(q) || (p.contact || '').includes(q);
    }
    return true;
  });

  const patientApptCount = (id) => appts.filter(a => a.patientId === id).length;
  const lastVisit = (id) => {
    const last = appts
      .filter(a => a.patientId === id && a.status === 'Completed')
      .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))[0];
    return last ? fmtDate(last.appointmentDate) : '—';
  };

  const today = new Date().toISOString().split('T')[0];
  const registeredToday = patients.filter(p => (p.createdAt || '').startsWith(today)).length;

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Total Patients"    value={patients.length}  color="forest" sub="All registered" />
        <StatCard label="Male"              value={patients.filter(p => p.gender === 'Male').length}   color="blue"  sub="Patients" />
        <StatCard label="Female"            value={patients.filter(p => p.gender === 'Female').length} color="green" sub="Patients" />
        <StatCard label="Registered Today"  value={registeredToday}  color="amber"  sub="New today" />
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="search" placeholder="Search name or contact…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={fieldStyle(200)}
            />
            <select value={filterGender} onChange={e => setGender(e.target.value)} style={fieldStyle(130)}>
              <option value="All">All Genders</option>
              {GENDERS.map(g => <option key={g}>{g}</option>)}
            </select>
            <select value={filterBlood} onChange={e => setBlood(e.target.value)} style={fieldStyle(140)}>
              <option value="All">All Blood Groups</option>
              {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
            </select>
            <span style={{ marginLeft: 'auto', fontSize: '.8rem', color: 'var(--muted)' }}>
              {filtered.length} patient{filtered.length !== 1 ? 's' : ''}
            </span>
            <button className="btn btn-sage btn-sm" onClick={openAdd}>+ Register Patient</button>
          </div>
        </div>
      </div>

      {/* Patient Table */}
      <div className="card">
        <div className="card-head"><h3>Patient Registry</h3></div>
        <div className="card-body">
          {filtered.length === 0 ? (
            <Empty text="No patients found" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Age / Gender</th>
                    <th>Blood</th>
                    <th>Contact</th>
                    <th>Visits</th>
                    <th>Last Visit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.patientId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--mint), #b7e4c7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--forest)', fontWeight: 700, fontSize: '.85rem', flexShrink: 0,
                          }}>
                            {p.name[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{p.name}</div>
                            <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>ID #{p.patientId}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '.85rem' }}>
                        {p.age ? `${p.age} yrs` : '—'} · {p.gender || '—'}
                      </td>
                      <td>
                        {p.bloodGroup ? (
                          <span style={{
                            background: BLOOD_COLORS[p.bloodGroup] || 'var(--sage)',
                            color: '#fff', borderRadius: 6, padding: '2px 8px',
                            fontSize: '.72rem', fontWeight: 700,
                          }}>
                            {p.bloodGroup}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '.85rem' }}>{p.contact || '—'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{patientApptCount(p.patientId)}</td>
                      <td style={{ fontSize: '.83rem', color: 'var(--muted)' }}>{lastVisit(p.patientId)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openView(p)}>View</button>
                          <button className="btn btn-sage btn-sm"    onClick={() => openEdit(p)}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Patient Modal */}
      {formModal !== null && (
        <Modal
          title={formModal === 'add' ? 'Register New Patient' : `Edit — ${formModal.name}`}
          onClose={() => setFormModal(null)}
        >
          <div className="form-grid">
            <div className="field form-full">
              <label>Full Name <span style={{ color: 'var(--red)' }}>*</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Patient full name" />
            </div>
            <div className="field">
              <label>Age</label>
              <input type="number" min="0" max="150" value={form.age} onChange={e => set('age', e.target.value)} placeholder="Years" />
            </div>
            <div className="field">
              <label>Gender</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)}>
                {GENDERS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Contact</label>
              <input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="Phone number" />
            </div>
            <div className="field">
              <label>Blood Group</label>
              <select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
                {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="field form-full">
              <label>Address</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
            </div>
            {formModal !== 'add' && (
              <div className="field form-full">
                <label>Medical Record / Notes</label>
                <textarea
                  rows={4} value={form.emr} onChange={e => set('emr', e.target.value)}
                  placeholder="Diagnosis, medications, allergies…"
                  style={{
                    width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)',
                    borderRadius: 9, fontFamily: 'var(--font-ui)', fontSize: '.85rem',
                    resize: 'vertical', lineHeight: 1.6,
                  }}
                />
              </div>
            )}
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setFormModal(null)}>Cancel</button>
            <button className="btn btn-sage" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : formModal === 'add' ? 'Register Patient' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* View Patient Modal */}
      {viewModal && (
        <Modal title={`Patient — ${viewModal.patient.name}`} onClose={() => setViewModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
            {[
              { label: 'Age',         val: viewModal.patient.age ? `${viewModal.patient.age} yrs` : '—' },
              { label: 'Gender',      val: viewModal.patient.gender || '—' },
              { label: 'Blood Group', val: viewModal.patient.bloodGroup || '—' },
              { label: 'Contact',     val: viewModal.patient.contact || '—' },
              { label: 'Total Visits',val: viewModal.appts.length },
              { label: 'Last Visit',  val: viewModal.appts[0] ? fmtDate(viewModal.appts[0].appointmentDate) : '—' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--sand)', borderRadius: 9, padding: '10px 12px' }}>
                <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{s.val}</div>
              </div>
            ))}
          </div>
          {viewModal.patient.address && (
            <div style={{ marginBottom: 14, fontSize: '.83rem', color: 'var(--muted)' }}>
              Address: <strong style={{ color: 'var(--ink)' }}>{viewModal.patient.address}</strong>
            </div>
          )}
          {viewModal.patient.emr && (
            <div style={{ background: 'var(--sand)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Medical Record</div>
              <pre style={{ fontFamily: 'var(--font-ui)', fontSize: '.83rem', whiteSpace: 'pre-wrap', margin: 0 }}>{viewModal.patient.emr}</pre>
            </div>
          )}
          <h4 style={{ fontSize: '.85rem', color: 'var(--forest)', marginBottom: 10 }}>Appointment History</h4>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {viewModal.appts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 16 }}>No appointments</div>
            ) : viewModal.appts.map((a, i) => (
              <div key={a.appointmentId} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0',
                borderBottom: i < viewModal.appts.length - 1 ? '1px solid var(--stone)' : 'none',
                fontSize: '.82rem',
              }}>
                <div>
                  <strong>{fmtDate(a.appointmentDate)}</strong>
                  <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{a.doctorName}</span>
                  <div style={{ color: 'var(--muted)', fontSize: '.75rem' }}>{a.reason || '—'}</div>
                </div>
                <span className={`badge badge-${a.status}`}>{a.status}</span>
              </div>
            ))}
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-outline" onClick={() => setViewModal(null)}>Close</button>
            <button className="btn btn-sage" onClick={() => { openEdit(viewModal.patient); setViewModal(null); }}>Edit Record</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function fieldStyle(w) {
  return {
    padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 9,
    fontFamily: 'var(--font-ui)', fontSize: '.83rem', background: 'var(--white)',
    outline: 'none', width: w,
  };
}
