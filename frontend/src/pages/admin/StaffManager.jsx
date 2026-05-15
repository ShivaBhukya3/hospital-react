import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Modal, toast, Empty, StatCard } from '../../components/UI';

const DEPARTMENTS = ['Cardiology','Orthopedics','Neurology','Pediatrics','General OPD','Dermatology','Radiology','Emergency'];
const AVAIL_STYLE = {
  Available: { bg: '#d8f3dc', color: '#1b4332', border: '#95d5b2', dot: '#40916c' },
  Busy:      { bg: '#fef9e7', color: '#7d6608', border: '#f9e79f', dot: '#b7770d' },
  'Off-duty':{ bg: '#fdf2f2', color: '#7b241c', border: '#fadbd8', dot: '#c0392b' },
};
const EMPTY_FORM = { name: '', department: 'Cardiology', specialization: '', maxPatients: 20 };

export default function StaffManager() {
  const api = useApi();
  const [doctors, setDoctors]     = useState([]);
  const [appts, setAppts]         = useState([]);
  const [search, setSearch]       = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterAvail, setFilterAvail] = useState('All');
  const [addModal, setAddModal]   = useState(false);
  const [viewModal, setViewModal] = useState(null); // doctor object
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    api.getDoctors().then(setDoctors);
    api.getAppointments().then(setAppts);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const deptOptions = ['All', ...new Set([...DEPARTMENTS, ...doctors.map(d => d.department).filter(Boolean)])];

  const filtered = doctors.filter(d => {
    if (filterDept  !== 'All' && d.department   !== filterDept)  return false;
    if (filterAvail !== 'All' && d.availability  !== filterAvail) return false;
    if (search) {
      const q = search.toLowerCase();
      return (d.name || '').toLowerCase().includes(q) ||
             (d.specialization || '').toLowerCase().includes(q);
    }
    return true;
  });

  async function updateAvail(id, val) {
    try {
      await api.updateAvailability(id, val);
      setDoctors(ds => ds.map(d => d.doctorId === id ? { ...d, availability: val } : d));
      if (viewModal?.doctorId === id) setViewModal(v => ({ ...v, availability: val }));
      toast.success('Availability updated');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update availability');
    }
  }

  async function addDoctor() {
    if (!form.name.trim()) { toast.error('Doctor name is required'); return; }
    if (!form.specialization.trim()) { toast.error('Specialization is required'); return; }
    setSaving(true);
    try {
      toast.info('Doctor creation requires a backend /api/doctors POST endpoint');
      setForm(EMPTY_FORM);
      setAddModal(false);
    } catch {
      toast.error('Failed to add doctor');
    }
    setSaving(false);
  }

  function doctorApptCount(id) {
    return appts.filter(a => a.doctorId === id).length;
  }
  function doctorCompletedCount(id) {
    return appts.filter(a => a.doctorId === id && a.status === 'Completed').length;
  }

  const byAvail = (av) => doctors.filter(d => d.availability === av).length;

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Total Doctors" value={doctors.length}          color="forest" sub="Medical staff" />
        <StatCard label="Available"     value={byAvail('Available')}    color="green"  sub="On duty now" />
        <StatCard label="Busy"          value={byAvail('Busy')}         color="amber"  sub="In consultation" />
        <StatCard label="Off-Duty"      value={byAvail('Off-duty')}     color="red"    sub="Not available" />
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="search" placeholder="Search name or specialization…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={fldStyle(210)}
            />
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={fldStyle(160)}>
              {deptOptions.map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={filterAvail} onChange={e => setFilterAvail(e.target.value)} style={fldStyle(140)}>
              <option value="All">All Status</option>
              <option>Available</option><option>Busy</option><option>Off-duty</option>
            </select>
            <span style={{ marginLeft: 'auto', fontSize: '.8rem', color: 'var(--muted)' }}>
              {filtered.length} doctor{filtered.length !== 1 ? 's' : ''}
            </span>
            <button className="btn btn-sage btn-sm" onClick={() => { setForm(EMPTY_FORM); setAddModal(true); }}>
              + Add Doctor
            </button>
          </div>
        </div>
      </div>

      {/* Doctor Cards */}
      <div className="card">
        <div className="card-head"><h3>Medical Staff</h3></div>
        <div className="card-body">
          {filtered.length === 0 ? (
            <Empty text="No doctors match current filters" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filtered.map(d => {
                const av = d.availability || 'Available';
                const avs = AVAIL_STYLE[av] || AVAIL_STYLE.Available;
                const total     = doctorApptCount(d.doctorId);
                const completed = doctorCompletedCount(d.doctorId);
                const rate      = total ? Math.round((completed / total) * 100) : 0;

                return (
                  <div
                    key={d.doctorId}
                    style={{
                      border: '1.5px solid var(--border)', borderRadius: 12,
                      background: 'var(--white)', overflow: 'hidden',
                      transition: 'box-shadow .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    {/* Card header */}
                    <div style={{
                      background: 'linear-gradient(135deg, var(--forest) 0%, var(--moss) 100%)',
                      padding: '18px 18px 14px', display: 'flex', alignItems: 'flex-start', gap: 14,
                    }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'rgba(255,255,255,.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, flexShrink: 0,
                      }}>
                        {d.name.split(' ').pop()[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '.95rem', marginBottom: 2 }}>{d.name}</div>
                        <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '.76rem' }}>{d.specialization}</div>
                        <div style={{ color: 'rgba(255,255,255,.55)', fontSize: '.72rem', marginTop: 2 }}>{d.department}</div>
                      </div>
                      <div style={{
                        background: avs.bg, border: `1px solid ${avs.border}`,
                        borderRadius: 20, padding: '3px 10px',
                        display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: avs.dot }} />
                        <span style={{ fontSize: '.7rem', fontWeight: 700, color: avs.color }}>{av}</span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--stone)' }}>
                      {[
                        { label: 'Total', val: total },
                        { label: 'Done',  val: completed },
                        { label: 'Rate',  val: `${rate}%` },
                      ].map(s => (
                        <div key={s.label} style={{ padding: '10px 0', textAlign: 'center', borderRight: '1px solid var(--stone)' }}>
                          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--forest)' }}>{s.val}</div>
                          <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        value={av}
                        onChange={e => updateAvail(d.doctorId, e.target.value)}
                        style={{
                          flex: 1, padding: '6px 10px', border: '1.5px solid var(--border)',
                          borderRadius: 8, fontSize: '.8rem', fontFamily: 'var(--font-ui)', background: 'var(--white)',
                        }}
                      >
                        <option>Available</option><option>Busy</option><option>Off-duty</option>
                      </select>
                      <button className="btn btn-outline btn-sm" onClick={() => setViewModal(d)}>
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Doctor Modal */}
      {addModal && (
        <Modal title="Add New Doctor" onClose={() => setAddModal(false)}>
          <div className="form-grid">
            <div className="field form-full">
              <label>Full Name <span style={{ color: 'var(--red)' }}>*</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Dr. Full Name" />
            </div>
            <div className="field">
              <label>Department</label>
              <select value={form.department} onChange={e => set('department', e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Max Patients/Day</label>
              <input type="number" min="1" max="100" value={form.maxPatients}
                onChange={e => set('maxPatients', e.target.value)} />
            </div>
            <div className="field form-full">
              <label>Specialization <span style={{ color: 'var(--red)' }}>*</span></label>
              <input value={form.specialization} onChange={e => set('specialization', e.target.value)}
                placeholder="e.g. Interventional Cardiology" />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setAddModal(false)}>Cancel</button>
            <button className="btn btn-sage" onClick={addDoctor} disabled={saving}>
              {saving ? 'Adding…' : 'Add Doctor'}
            </button>
          </div>
        </Modal>
      )}

      {/* View Doctor Modal */}
      {viewModal && (
        <Modal title={viewModal.name} onClose={() => setViewModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Department',       val: viewModal.department     || '—' },
              { label: 'Specialization',   val: viewModal.specialization || '—' },
              { label: 'Availability',     val: viewModal.availability   || '—' },
              { label: 'Max Patients/Day', val: viewModal.maxPatients    || '—' },
              { label: 'Total Appointments', val: doctorApptCount(viewModal.doctorId) },
              { label: 'Completed',          val: doctorCompletedCount(viewModal.doctorId) },
            ].map(f => (
              <div key={f.label} style={{ background: 'var(--sand)', borderRadius: 9, padding: '10px 13px' }}>
                <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontWeight: 600, fontSize: '.87rem' }}>{f.val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 8 }}>Update Availability</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Available','Busy','Off-duty'].map(av => {
                const s = AVAIL_STYLE[av];
                const active = viewModal.availability === av;
                return (
                  <button key={av} onClick={() => updateAvail(viewModal.doctorId, av)}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 9, fontSize: '.82rem', fontWeight: 600,
                      cursor: 'pointer', border: `1.5px solid ${active ? s.border : 'var(--border)'}`,
                      background: active ? s.bg : 'transparent',
                      color: active ? s.color : 'var(--muted)', transition: '.15s',
                    }}>
                    {av}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setViewModal(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function fldStyle(w) {
  return {
    padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 9,
    fontFamily: 'var(--font-ui)', fontSize: '.83rem', background: 'var(--white)',
    outline: 'none', width: w,
  };
}
