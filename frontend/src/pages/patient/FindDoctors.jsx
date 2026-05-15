import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { useSocket } from '../../hooks/useSocket';
import { setNavDoctor } from '../../hooks/navState';
import { Modal, Empty } from '../../components/UI';

const AVAIL_STYLE = {
  Available: { bg:'#d8f3dc', color:'#1b4332', border:'#95d5b2', dot:'#40916c', label:'Available' },
  Busy:      { bg:'#fef9e7', color:'#7d6608', border:'#f9e79f', dot:'#b7770d', label:'Busy'      },
  'Off-duty':{ bg:'#fdf2f2', color:'#7b241c', border:'#fadbd8', dot:'#c0392b', label:'Off-duty'  },
};

// Flash a card green briefly when availability improves to Available
function usePrevious(val) {
  const ref = useRef(val);
  useEffect(() => { ref.current = val; });
  return ref.current;
}

function AvailBadge({ availability, flash }) {
  const avs = AVAIL_STYLE[availability] || AVAIL_STYLE.Available;
  return (
    <motion.div
      animate={flash ? { scale: [1, 1.18, 1] } : {}}
      transition={{ duration: .4 }}
      style={{
        background: avs.bg, border: `1.5px solid ${avs.border}`,
        borderRadius: 20, padding: '4px 11px',
        display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
      }}
    >
      <motion.div
        animate={flash ? { scale: [1, 1.6, 1] } : {}}
        transition={{ duration: .35 }}
        style={{ width: 7, height: 7, borderRadius: '50%', background: avs.dot,
          boxShadow: availability === 'Available' ? `0 0 0 3px ${avs.border}` : 'none' }}
      />
      <span style={{ fontSize: '.7rem', fontWeight: 700, color: avs.color }}>{avs.label}</span>
    </motion.div>
  );
}

export default function FindDoctors({ onNavigate }) {
  const api = useApi();
  const [doctors,    setDoctors]    = useState([]);
  const [appts,      setAppts]      = useState([]);
  const [search,     setSearch]     = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterAvail,setFilterAvail]= useState('All');
  const [viewModal,  setViewModal]  = useState(null);
  const [flashing,   setFlashing]   = useState({});   // doctorId → true briefly
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getDoctors().then(setDoctors);
    api.getAppointments().then(setAppts);
  }, []);

  // ── Real-time: doctor availability changed ────────────────────
  useSocket('doctor:availability', ({ doctorId, availability }) => {
    setDoctors(prev => prev.map(d =>
      d.doctorId === doctorId ? { ...d, availability } : d
    ));
    // Flash the badge if they became Available
    if (availability === 'Available') {
      setFlashing(f => ({ ...f, [doctorId]: true }));
      setTimeout(() => setFlashing(f => ({ ...f, [doctorId]: false })), 1200);
    }
    // Keep the modal in sync too
    setViewModal(m => m?.doctorId === doctorId ? { ...m, availability } : m);
  });

  // ── Real-time: new appointment affects today's count ──────────
  useSocket('appointment:new', (a) => {
    setAppts(prev => prev.some(x => x.appointmentId === a.appointmentId) ? prev : [...prev, a]);
  });
  useSocket('appointment:updated', ({ appointmentId, status }) => {
    setAppts(prev => prev.map(a => a.appointmentId === appointmentId ? { ...a, status } : a));
  });

  const depts = ['All', ...new Set(doctors.map(d => d.department).filter(Boolean))];

  const filtered = doctors.filter(d => {
    if (filterDept  !== 'All' && d.department  !== filterDept)  return false;
    if (filterAvail !== 'All' && d.availability !== filterAvail) return false;
    if (search) {
      const q = search.toLowerCase();
      return (d.name || '').toLowerCase().includes(q) ||
             (d.specialization || '').toLowerCase().includes(q) ||
             (d.department || '').toLowerCase().includes(q);
    }
    return true;
  });

  function todayCount(id) {
    return appts.filter(a =>
      a.doctorId === id && (a.appointmentDate || '').startsWith(today) &&
      !['Cancelled'].includes(a.status)
    ).length;
  }
  function completedCount(id) {
    return appts.filter(a => a.doctorId === id && a.status === 'Completed').length;
  }

  function bookDoctor(doc) {
    setNavDoctor(doc);
    onNavigate('book-appt');
  }

  const byAvail = av => doctors.filter(d => d.availability === av).length;

  return (
    <div>
      {/* Live header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--forest) 0%, var(--moss) 100%)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 20, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        boxShadow: '0 4px 20px rgba(27,67,50,.2)',
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: 4 }}>
            Our Medical Team
          </h2>
          <div style={{ fontSize: '.8rem', opacity: .7 }}>
            Availability updates in real-time
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,.14)', borderRadius: 20,
          padding: '6px 14px', border: '1px solid rgba(255,255,255,.2)' }}>
          <motion.div
            animate={{ opacity: [1, .3, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: '#74c69d' }}
          />
          <span style={{ fontSize: '.78rem', fontWeight: 600 }}>Live</span>
        </div>
      </div>

      {/* Summary stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Total Doctors', val: doctors.length,        color: 'var(--forest)', icon: '👨‍⚕️' },
          { label: 'Available',     val: byAvail('Available'),  color: 'var(--sage)',   icon: '✅' },
          { label: 'Busy',          val: byAvail('Busy'),       color: 'var(--amber)',  icon: '⏳' },
          { label: 'Off-Duty',      val: byAvail('Off-duty'),   color: 'var(--red)',    icon: '🔴' },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * .06 }}
            style={{
              background: 'var(--white)', border: '1.5px solid var(--border)',
              borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-sm)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
            <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: '1.55rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 3 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ paddingTop: 13, paddingBottom: 13 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="search" placeholder="Search doctor, specialization, department…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={fld(230)}
            />
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={fld(150)}>
              {depts.map(d => <option key={d}>{d}</option>)}
            </select>
            <div style={{ display: 'flex', background: 'var(--stone)', borderRadius: 8, padding: 3 }}>
              {['All', 'Available', 'Busy', 'Off-duty'].map(av => (
                <button key={av} onClick={() => setFilterAvail(av)} style={{
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
            <span style={{ marginLeft: 'auto', fontSize: '.8rem', color: 'var(--muted)' }}>
              {filtered.length} doctor{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Doctor grid */}
      <div className="card">
        <div className="card-head">
          <h3>Doctors</h3>
          <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
            {byAvail('Available')} available now
          </span>
        </div>
        <div className="card-body">
          {filtered.length === 0 ? (
            <Empty text="No doctors match your search" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(278px,1fr))', gap: 16 }}>
              <AnimatePresence>
                {filtered.map(d => {
                  const av  = d.availability || 'Available';
                  const avs = AVAIL_STYLE[av] || AVAIL_STYLE.Available;
                  const off = av === 'Off-duty';
                  const tc  = todayCount(d.doctorId);
                  const cc  = completedCount(d.doctorId);
                  const flash = !!flashing[d.doctorId];

                  return (
                    <motion.div key={d.doctorId}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: off ? .58 : 1, y: 0 }}
                      exit={{ opacity: 0, scale: .95 }}
                      transition={{ duration: .22 }}
                      whileHover={!off ? { y: -3, boxShadow: 'var(--shadow)' } : {}}
                      style={{
                        border: `1.5px solid ${avs.border}`, borderRadius: 14,
                        background: 'var(--white)', overflow: 'hidden',
                        transition: 'box-shadow .15s',
                      }}>

                      {/* Header */}
                      <div style={{
                        background: 'linear-gradient(135deg, var(--forest) 0%, var(--moss) 100%)',
                        padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start',
                      }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%',
                          background: 'rgba(255,255,255,.18)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontFamily: 'var(--font-display)',
                          fontSize: '1.2rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {d.name.split(' ').pop()[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '.94rem' }}>{d.name}</div>
                          <div style={{ color: 'rgba(255,255,255,.65)', fontSize: '.74rem', marginTop: 2 }}>
                            {d.specialization}
                          </div>
                          <div style={{ color: 'rgba(255,255,255,.45)', fontSize: '.7rem', marginTop: 2 }}>
                            🏥 {d.department}
                          </div>
                        </div>
                        <AvailBadge availability={av} flash={flash} />
                      </div>

                      {/* Stats */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        borderBottom: '1px solid var(--stone)',
                      }}>
                        {[
                          { label: "Today's Patients", val: tc },
                          { label: 'Total Completed',  val: cc },
                        ].map((s, i) => (
                          <div key={s.label} style={{
                            padding: '10px 0', textAlign: 'center',
                            borderRight: i === 0 ? '1px solid var(--stone)' : 'none',
                          }}>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--forest)' }}>
                              {s.val}
                            </div>
                            <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 2 }}>
                              {s.label}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ flex: 1 }}
                          onClick={() => setViewModal(d)}
                        >
                          View Profile
                        </button>
                        <button
                          className="btn btn-sage btn-sm"
                          style={{ flex: 1 }}
                          disabled={off}
                          onClick={() => !off && bookDoctor(d)}
                        >
                          {off ? 'Unavailable' : 'Book Now →'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Doctor profile modal */}
      <AnimatePresence>
        {viewModal && (
          <Modal title={viewModal.name} onClose={() => setViewModal(null)}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
              <div style={{
                width: 62, height: 62, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--forest), var(--moss))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, flexShrink: 0,
              }}>
                {viewModal.name.split(' ').pop()[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{viewModal.name}</div>
                <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginTop: 2 }}>
                  {viewModal.specialization}
                </div>
                <div style={{ marginTop: 6 }}>
                  <AvailBadge availability={viewModal.availability || 'Available'} flash={false} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Department',        val: viewModal.department     || '—' },
                { label: 'Specialization',    val: viewModal.specialization || '—' },
                { label: 'Max Patients/Day',  val: viewModal.maxPatients    ? `${viewModal.maxPatients} patients` : '—' },
                { label: "Today's Patients",  val: todayCount(viewModal.doctorId) },
                { label: 'Total Completed',   val: completedCount(viewModal.doctorId) },
              ].map(f => (
                <div key={f.label} style={{ background: 'var(--sand)', borderRadius: 9, padding: '10px 13px' }}>
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 3 }}>{f.label}</div>
                  <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{f.val}</div>
                </div>
              ))}
            </div>

            <div style={{
              padding: '10px 14px', background: '#eaf4fb', borderRadius: 9,
              fontSize: '.8rem', color: '#1a5276', marginBottom: 18, border: '1px solid #aed6f1',
            }}>
              ℹ️ Availability shown is live and updates in real-time.
            </div>

            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setViewModal(null)}>Close</button>
              <button
                className="btn btn-sage"
                disabled={viewModal.availability === 'Off-duty'}
                onClick={() => { setViewModal(null); bookDoctor(viewModal); }}
              >
                {viewModal.availability === 'Off-duty' ? 'Not Available' : 'Book Appointment →'}
              </button>
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
