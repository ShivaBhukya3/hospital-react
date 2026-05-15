import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useSocket } from '../../hooks/useSocket';
import { fmtDate, fmtTime, toast } from '../../components/UI';

function AnimatedCount({ target, color }) {
  const [val, setVal] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    let start = null;
    const duration = 900;
    function step(ts) {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      setVal(Math.round(ease * target));
      if (pct < 1) frame.current = requestAnimationFrame(step);
    }
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target]);

  return (
    <span style={{ fontSize:'2rem', fontWeight:700, color, lineHeight:1 }}>{val}</span>
  );
}

const STATUS_STYLE = {
  Scheduled:    { bg:'#eaf4fb', color:'#1a5276', border:'#aed6f1' },
  'Checked-In': { bg:'#fef9e7', color:'#7d6608', border:'#f9e79f' },
  'In-Progress':{ bg:'#d8f3dc', color:'#1b4332', border:'#95d5b2' },
  Completed:    { bg:'#d8f3dc', color:'#1b4332', border:'#95d5b2' },
  Cancelled:    { bg:'#fdf2f2', color:'#7b241c', border:'#fadbd8' },
};

const cardVariants = {
  hidden:  { opacity:0, y:20 },
  visible: i => ({ opacity:1, y:0, transition:{ delay: i * .08, duration:.35, ease:'easeOut' } }),
};

export default function PatientDashboard({ onNavigate }) {
  const { user } = useAuth();
  const api = useApi();
  const [appts,   setAppts]   = useState([]);
  const [doctors, setDoctors] = useState([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getAppointments().then(setAppts);
    api.getDoctors().then(setDoctors);
  }, []);

  useSocket('appointment:new', (a) => {
    setAppts(prev => prev.some(x => x.appointmentId === a.appointmentId) ? prev : [...prev, a]);
    toast.info('New appointment added to your schedule');
  });
  useSocket('appointment:updated', ({ appointmentId, status }) => {
    setAppts(prev => prev.map(a => a.appointmentId === appointmentId ? { ...a, status } : a));
  });

  const upcoming   = [...appts]
    .filter(a => ['Scheduled','Checked-In'].includes(a.status))
    .sort((a, b) => (a.appointmentDate + a.appointmentTime).localeCompare(b.appointmentDate + b.appointmentTime));
  const nextAppt   = upcoming[0];
  const completed  = appts.filter(a => a.status === 'Completed');
  const cancelled  = appts.filter(a => a.status === 'Cancelled');
  const todayAppts = appts.filter(a => (a.appointmentDate || '').startsWith(today));
  const availDocs  = doctors.filter(d => d.availability === 'Available');

  const STATS = [
    { label:'Total Appointments', val:appts.length,     color:'var(--forest)', icon:'📊', sub:'All time' },
    { label:'Upcoming',           val:upcoming.length,   color:'var(--blue)',   icon:'📅', sub:'Scheduled' },
    { label:'Completed',          val:completed.length,  color:'var(--sage)',   icon:'✅', sub:'All time'  },
    { label:'Cancelled',          val:cancelled.length,  color:'var(--red)',    icon:'❌', sub:'All time'  },
  ];

  const recentAppts = [...appts]
    .sort((a, b) => (b.appointmentDate + b.appointmentTime).localeCompare(a.appointmentDate + a.appointmentTime))
    .slice(0, 5);

  return (
    <div>
      {/* Welcome hero */}
      <motion.div
        initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:.4 }}
        style={{
          background:'linear-gradient(135deg, var(--forest) 0%, var(--moss) 50%, #52b788 100%)',
          borderRadius:16, padding:'28px 30px', marginBottom:22,
          color:'#fff', boxShadow:'0 4px 24px rgba(27,67,50,.25)',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:18,
          position:'relative', overflow:'hidden',
        }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.06)' }} />
        <div style={{ position:'absolute', right:60, bottom:-50, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />

        <div style={{ position:'relative' }}>
          <div style={{ fontSize:'.72rem', opacity:.55, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:6 }}>
            Patient Portal · Welcome back
          </div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', marginBottom:4, fontWeight:700 }}>
            {user?.username} 👋
          </h2>
          <div style={{ fontSize:'.82rem', opacity:.7 }}>
            {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </div>
        </div>

        <div style={{ display:'flex', gap:12, position:'relative' }}>
          {[
            { n: upcoming.length,  label:'Upcoming'  },
            { n: completed.length, label:'Completed' },
            { n: availDocs.length, label:'Doctors Available' },
          ].map(({ n, label }) => (
            <div key={label} style={{
              background:'rgba(255,255,255,.13)', borderRadius:14, padding:'14px 20px',
              textAlign:'center', backdropFilter:'blur(4px)', border:'1px solid rgba(255,255,255,.18)',
            }}>
              <div style={{ fontSize:'1.65rem', fontWeight:700 }}>{n}</div>
              <div style={{ fontSize:'.7rem', opacity:.75, marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Animated stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
        {STATS.map((s, i) => (
          <motion.div key={s.label} custom={i} variants={cardVariants} initial="hidden" animate="visible"
            style={{
              background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:14,
              padding:'18px 20px', boxShadow:'var(--shadow-sm)',
              display:'flex', alignItems:'center', gap:14,
            }}>
            <div style={{
              width:46, height:46, borderRadius:12, fontSize:'1.4rem',
              display:'flex', alignItems:'center', justifyContent:'center',
              background:'var(--sand)', flexShrink:0,
            }}>
              {s.icon}
            </div>
            <div>
              <AnimatedCount target={s.val} color={s.color} />
              <div style={{ fontSize:'.73rem', color:'var(--muted)', marginTop:3 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:20, marginBottom:20 }}>

        {/* Next appointment */}
        <motion.div className="card" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:.18, duration:.38 }}>
          <div className="card-head"><h3>Next Appointment</h3></div>
          <div className="card-body">
            {nextAppt ? (
              <div>
                <div style={{
                  background:'linear-gradient(135deg, var(--forest) 0%, var(--moss) 100%)',
                  borderRadius:12, padding:'16px 18px', marginBottom:16, color:'#fff',
                  display:'flex', gap:14, alignItems:'center',
                }}>
                  <div style={{
                    width:50, height:50, borderRadius:'50%', background:'rgba(255,255,255,.2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:700, fontSize:'1.2rem', flexShrink:0,
                  }}>
                    {(nextAppt.doctorName || 'D')[0]}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:'.98rem' }}>{nextAppt.doctorName}</div>
                    <div style={{ fontSize:'.76rem', opacity:.75 }}>{nextAppt.department}</div>
                  </div>
                  <span style={{
                    background:'rgba(255,255,255,.18)', border:'1px solid rgba(255,255,255,.3)',
                    borderRadius:20, padding:'4px 12px', fontSize:'.72rem', fontWeight:700,
                  }}>
                    {nextAppt.status}
                  </span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  {[
                    { icon:'📅', label:'Date',   val: fmtDate(nextAppt.appointmentDate) },
                    { icon:'🕐', label:'Time',   val: fmtTime(nextAppt.appointmentTime) },
                    { icon:'📋', label:'Reason', val: nextAppt.reason || '—' },
                  ].map((r, i, arr) => (
                    <div key={r.label} style={{
                      display:'flex', gap:12, alignItems:'center',
                      padding:'10px 0', borderBottom: i < arr.length-1 ? '1px solid var(--stone)' : 'none',
                      fontSize:'.85rem',
                    }}>
                      <span style={{ width:20, textAlign:'center' }}>{r.icon}</span>
                      <span style={{ color:'var(--muted)', width:50, fontSize:'.78rem' }}>{r.label}</span>
                      <strong>{r.val}</strong>
                    </div>
                  ))}
                </div>
                {(nextAppt.appointmentDate || '').startsWith(today) && (
                  <div style={{
                    marginTop:14, padding:'8px 14px', background:'#fef9e7', borderRadius:9,
                    border:'1px solid #f9e79f', fontSize:'.8rem', color:'#7d6608', fontWeight:600,
                  }}>
                    ⏰ Your appointment is today!
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'36px 16px', color:'var(--muted)' }}>
                <div style={{ fontSize:'3rem', marginBottom:12 }}>📅</div>
                <div style={{ fontSize:'.88rem', marginBottom:16 }}>No upcoming appointments</div>
                {onNavigate && (
                  <button className="btn btn-sage btn-sm" onClick={() => onNavigate('book-appt')}>
                    Book an Appointment →
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent activity */}
        <motion.div className="card" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:.22, duration:.38 }}>
          <div className="card-head">
            <h3>Recent Activity</h3>
            <span style={{ fontSize:'.78rem', color:'var(--muted)' }}>Last 5 visits</span>
          </div>
          <div className="card-body" style={{ padding:0 }}>
            {recentAppts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'36px 16px', color:'var(--muted)', fontSize:'.88rem' }}>
                No appointment history yet
              </div>
            ) : recentAppts.map((a, i, arr) => {
              const ss = STATUS_STYLE[a.status] || {};
              return (
                <div key={a.appointmentId} style={{
                  display:'flex', gap:14, alignItems:'center',
                  padding:'13px 20px', borderBottom: i < arr.length-1 ? '1px solid var(--stone)' : 'none',
                }}>
                  {/* Timeline dot */}
                  <div style={{
                    width:10, height:10, borderRadius:'50%', flexShrink:0,
                    background: a.status==='Completed' ? 'var(--sage)' : a.status==='Cancelled' ? 'var(--red)' : '#aed6f1',
                  }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:'.88rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {a.doctorName || '—'}
                    </div>
                    <div style={{ fontSize:'.74rem', color:'var(--muted)' }}>
                      {fmtDate(a.appointmentDate)} · {a.department}
                    </div>
                  </div>
                  <span style={{
                    padding:'3px 10px', borderRadius:20, fontSize:'.7rem', fontWeight:600, flexShrink:0,
                    background:ss.bg, color:ss.color, border:`1px solid ${ss.border||'transparent'}`,
                  }}>
                    {a.status}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Available doctors */}
      {availDocs.length > 0 && (
        <motion.div className="card" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.32, duration:.38 }}>
          <div className="card-head">
            <h3>Available Doctors Today</h3>
            <span style={{ fontSize:'.8rem', color:'var(--muted)' }}>{availDocs.length} on duty</span>
          </div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12 }}>
              {availDocs.map(d => (
                <motion.div key={d.doctorId} whileHover={{ y:-2, boxShadow:'var(--shadow)' }} style={{
                  border:'1.5px solid #95d5b2', borderRadius:12, padding:'14px 16px',
                  background:'linear-gradient(135deg, #f0faf3, #e8f5e9)', transition:'box-shadow .15s',
                }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
                    <div style={{
                      width:36, height:36, borderRadius:'50%',
                      background:'linear-gradient(135deg, var(--forest), var(--moss))',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontWeight:700, flexShrink:0, fontSize:'.9rem',
                    }}>
                      {d.name.split(' ').pop()[0]}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:'.86rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.name}</div>
                      <div style={{ fontSize:'.7rem', color:'var(--muted)' }}>{d.department}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:'.73rem', color:'#2d6a4f', fontWeight:500 }}>{d.specialization}</div>
                  <div style={{
                    marginTop:8, display:'flex', alignItems:'center', gap:5,
                    fontSize:'.7rem', color:'#2d6a4f', fontWeight:600,
                  }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'#40916c' }} />
                    Available
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Today's appointments */}
      {todayAppts.length > 0 && (
        <motion.div className="card" style={{ marginTop:20 }} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.4 }}>
          <div className="card-head">
            <h3>Today's Schedule</h3>
            <span style={{ fontSize:'.78rem', color:'var(--muted)' }}>{todayAppts.length} appointment{todayAppts.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="card-body" style={{ padding:0 }}>
            {todayAppts.map((a, i, arr) => {
              const ss = STATUS_STYLE[a.status] || {};
              return (
                <div key={a.appointmentId} style={{
                  display:'flex', gap:14, alignItems:'center', padding:'14px 20px',
                  borderBottom: i < arr.length-1 ? '1px solid var(--stone)' : 'none',
                  background: ['Scheduled','Checked-In'].includes(a.status) ? '#fffdf5' : 'transparent',
                }}>
                  <div style={{
                    minWidth:48, textAlign:'center', padding:'8px 4px',
                    background:'var(--forest)', borderRadius:10, flexShrink:0,
                  }}>
                    <div style={{ color:'rgba(255,255,255,.7)', fontSize:'.62rem', textTransform:'uppercase' }}>
                      {fmtTime(a.appointmentTime).split(':')[0]}
                    </div>
                    <div style={{ color:'#fff', fontWeight:700, fontSize:'.82rem' }}>
                      {fmtTime(a.appointmentTime)}
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:'.9rem' }}>{a.doctorName || '—'}</div>
                    <div style={{ fontSize:'.74rem', color:'var(--muted)' }}>{a.department} {a.reason ? `· ${a.reason}` : ''}</div>
                  </div>
                  <span style={{
                    padding:'4px 12px', borderRadius:20, fontSize:'.72rem', fontWeight:600,
                    background:ss.bg, color:ss.color, border:`1px solid ${ss.border||'transparent'}`,
                  }}>
                    {a.status}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
