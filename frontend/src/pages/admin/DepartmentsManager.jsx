import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Modal, toast, ProgressBar } from '../../components/UI';

const DEPT_ICONS = {
  Cardiology:   '🫀', Orthopedics: '🦴', Neurology:  '🧠', Pediatrics: '👶',
  'General OPD':'🏥', Dermatology: '🩺', Radiology:  '📡', Emergency:  '🚨',
};

const SEED_DEPTS = [
  { id: 1, name: 'Cardiology',   floor: '3', head: 'Dr. Ravi Sharma',  doctorCount: 4, capacity: 78 },
  { id: 2, name: 'Orthopedics',  floor: '2', head: 'Dr. Anita Patel',  doctorCount: 3, capacity: 55 },
  { id: 3, name: 'Neurology',    floor: '4', head: 'Dr. Suresh Mehta', doctorCount: 2, capacity: 42 },
  { id: 4, name: 'Pediatrics',   floor: '1', head: 'Dr. Kavita Rao',   doctorCount: 4, capacity: 30 },
  { id: 5, name: 'General OPD',  floor: 'G', head: '—',                doctorCount: 6, capacity: 88 },
];

const EMPTY_FORM = { name: '', floor: '', head: '' };

export default function DepartmentsManager() {
  const api = useApi();
  const [depts, setDepts]         = useState(SEED_DEPTS);
  const [doctors, setDoctors]     = useState([]);
  const [appts, setAppts]         = useState([]);
  const [formModal, setFormModal] = useState(null); // null | 'add' | dept object
  const [form, setForm]           = useState(EMPTY_FORM);

  useEffect(() => {
    api.getDoctors().then(setDoctors);
    api.getAppointments().then(setAppts);
    api.getDepartments().then(dbDepts => {
      if (dbDepts && dbDepts.length) {
        // Merge DB depts into seed, preserving enriched fields
        const merged = dbDepts.map(d => ({
          id: d.deptId || d.id,
          name: d.name,
          floor: d.floor || '—',
          head: d.headName || d.head || '—',
          doctorCount: doctors.filter(doc => doc.department === d.name).length,
          capacity: Math.floor(Math.random() * 60 + 30),
        }));
        if (merged.length) setDepts(merged);
      }
    });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function deptApptCount(name) {
    return appts.filter(a => a.department === name).length;
  }

  function deptCapacity(d) {
    // Use live data if dept count available, otherwise seed value
    const count = deptApptCount(d.name);
    return count > 0 ? Math.min(count * 5, 100) : d.capacity;
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormModal('add');
  }

  function openEdit(d) {
    setForm({ name: d.name, floor: d.floor || '', head: d.head || '' });
    setFormModal(d);
  }

  function save() {
    if (!form.name.trim()) { toast.error('Department name is required'); return; }
    if (formModal === 'add') {
      const newDept = {
        id: Date.now(), name: form.name, floor: form.floor || '—',
        head: form.head || '—', doctorCount: 0, capacity: 0,
      };
      setDepts(ds => [...ds, newDept]);
      toast.success(`Department "${form.name}" added`);
    } else {
      setDepts(ds => ds.map(d => d.id === formModal.id
        ? { ...d, name: form.name, floor: form.floor || d.floor, head: form.head || d.head }
        : d
      ));
      toast.success('Department updated');
    }
    setFormModal(null);
  }

  const docOptions = ['—', ...doctors.map(d => d.name)];

  const overCapacity  = depts.filter(d => deptCapacity(d) > 80).length;
  const totalDoctors  = doctors.length;

  return (
    <div>
      {/* Alert */}
      {overCapacity > 0 && (
        <div className="alert-bar" style={{ marginBottom: 20 }}>
          ⚠️ <strong>{overCapacity} department{overCapacity > 1 ? 's' : ''}</strong> at over 80% capacity — consider reallocation.
        </div>
      )}

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Departments',   val: depts.length,   color: 'var(--forest)' },
          { label: 'Total Doctors', val: totalDoctors,   color: 'var(--sage)' },
          { label: 'Over Capacity', val: overCapacity,   color: 'var(--red)' },
          { label: 'Total Appts',   val: appts.length,   color: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--white)', border: '1.5px solid var(--border)',
            borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Hospital Departments ({depts.length})</h3>
          <button className="btn btn-sage btn-sm" onClick={openAdd}>+ Add Department</button>
        </div>
        <div className="card-body">
          <div className="dept-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {depts.map(d => {
              const pct     = deptCapacity(d);
              const apptCnt = deptApptCount(d.name);
              const docsCnt = doctors.filter(doc => doc.department === d.name).length || d.doctorCount;
              const icon    = DEPT_ICONS[d.name] || '🏥';
              const capColor = pct > 80 ? 'var(--red)' : pct > 60 ? '#d4ac0d' : 'var(--sage)';

              return (
                <div key={d.id} style={{
                  border: `1.5px solid ${pct > 80 ? '#fadbd8' : 'var(--border)'}`,
                  borderRadius: 12, background: 'var(--white)', overflow: 'hidden',
                  transition: 'box-shadow .15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  {/* Capacity bar at top */}
                  <div style={{ height: 4, background: 'var(--stone)', borderRadius: '12px 12px 0 0' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: capColor, borderRadius: '12px 12px 0 0', transition: 'width .4s' }} />
                  </div>

                  <div style={{ padding: '18px 18px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                      <div style={{
                        width: 44, height: 44, background: 'var(--mint)', borderRadius: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.35rem', flexShrink: 0,
                      }}>
                        {icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--forest)', marginBottom: 2 }}>{d.name}</div>
                        <div style={{ fontSize: '.73rem', color: 'var(--muted)' }}>
                          Floor {d.floor} &nbsp;·&nbsp; Head: {d.head}
                        </div>
                      </div>
                      {pct > 80 && (
                        <div style={{
                          background: '#fdf2f2', border: '1px solid #fadbd8', borderRadius: 8,
                          padding: '2px 8px', fontSize: '.68rem', fontWeight: 700, color: '#7b241c', flexShrink: 0,
                        }}>
                          HIGH
                        </div>
                      )}
                    </div>

                    {/* Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                      {[
                        { label: 'Doctors', val: docsCnt },
                        { label: 'Appts',   val: apptCnt },
                        { label: 'Load',    val: `${pct}%` },
                      ].map(m => (
                        <div key={m.label} style={{ background: 'var(--sand)', borderRadius: 8, padding: '8px 0', textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--forest)' }}>{m.val}</div>
                          <div style={{ fontSize: '.66rem', color: 'var(--muted)' }}>{m.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Capacity bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.74rem', color: 'var(--muted)', marginBottom: 5 }}>
                        <span>Capacity</span>
                        <strong style={{ color: capColor }}>{pct}%</strong>
                      </div>
                      <ProgressBar pct={pct} color={capColor} />
                    </div>

                    <button
                      className="btn btn-outline btn-sm"
                      style={{ width: '100%' }}
                      onClick={() => openEdit(d)}
                    >
                      Edit Department
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {formModal !== null && (
        <Modal
          title={formModal === 'add' ? 'Add New Department' : `Edit — ${formModal.name}`}
          onClose={() => setFormModal(null)}
        >
          <div className="form-grid">
            <div className="field form-full">
              <label>Department Name <span style={{ color: 'var(--red)' }}>*</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Cardiology" />
            </div>
            <div className="field">
              <label>Floor / Location</label>
              <input value={form.floor} onChange={e => set('floor', e.target.value)} placeholder="e.g. 3 or Ground" />
            </div>
            <div className="field">
              <label>Department Head</label>
              <select value={form.head} onChange={e => set('head', e.target.value)}>
                {docOptions.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setFormModal(null)}>Cancel</button>
            <button className="btn btn-sage" onClick={save}>
              {formModal === 'add' ? 'Add Department' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
