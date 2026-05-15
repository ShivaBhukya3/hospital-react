import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { Empty, fmtDate } from '../../components/UI';

const STATUS_STYLE = {
  Scheduled:    { bg:'#eaf4fb', color:'#1a5276', dot:'#aed6f1' },
  'Checked-In': { bg:'#fef9e7', color:'#7d6608', dot:'#f9e79f' },
  'In-Progress':{ bg:'#d8f3dc', color:'#1b4332', dot:'#95d5b2' },
  Completed:    { bg:'#d8f3dc', color:'#1b4332', dot:'#40916c' },
  Cancelled:    { bg:'#fdf2f2', color:'#7b241c', dot:'#fadbd8' },
};

const DEMO_RECORDS = [
  {
    id:'r1', date:'2026-04-10', doctor:'Dr. Ravi Sharma', dept:'Cardiology', status:'Completed',
    diagnosis:'Hypertensive Heart Disease — Stage 1',
    prescription:['Aspirin 75 mg – Once daily after breakfast', 'Atorvastatin 20 mg – At bedtime'],
    vitals: { bp:'138/88', hr:'76 bpm', temp:'98.4 °F', spo2:'97%', bmi:'24.1' },
    notes:'Patient reports mild chest tightness during exertion. ECG shows mild LVH. Follow up in 4 weeks with repeat BP monitoring.',
    followUp:'2026-05-08',
  },
  {
    id:'r2', date:'2026-03-22', doctor:'Dr. Suresh Mehta', dept:'Neurology', status:'Completed',
    diagnosis:'Tension-type Headache — Chronic',
    prescription:['Amitriptyline 10 mg – At bedtime', 'Vitamin B12 – Once daily'],
    vitals: { bp:'122/78', hr:'70 bpm', temp:'98.6 °F', spo2:'99%', bmi:'23.2' },
    notes:'Headache occurs 3–4 times/week. Likely stress-related. Advised sleep hygiene, hydration, and reduced screen time.',
    followUp:'2026-04-22',
  },
  {
    id:'r3', date:'2026-02-14', doctor:'Dr. Anita Patel', dept:'Orthopedics', status:'Completed',
    diagnosis:'Patellofemoral Pain Syndrome — Right Knee',
    prescription:['Diclofenac Gel – Topical twice daily', 'Physiotherapy – 3 sessions/week × 4 weeks'],
    vitals: { bp:'118/76', hr:'68 bpm', temp:'98.5 °F', spo2:'98%', bmi:'23.7' },
    notes:'X-ray normal. MRI shows minimal cartilage wear. Conservative management recommended.',
    followUp:'2026-03-14',
  },
];

const DEMO_VITALS = [
  { label:'Blood Pressure', val:'118/76 mmHg', icon:'🫀', normal:true,  range:'< 120/80' },
  { label:'Heart Rate',     val:'72 bpm',      icon:'💓', normal:true,  range:'60–100'   },
  { label:'Blood Sugar',    val:'96 mg/dL',    icon:'🩸', normal:true,  range:'< 100'    },
  { label:'BMI',            val:'22.4',        icon:'⚖️', normal:true,  range:'18.5–24.9'},
  { label:'Temperature',    val:'98.6 °F',     icon:'🌡️', normal:true,  range:'97–99'    },
  { label:'SpO2',           val:'98%',         icon:'💨', normal:true,  range:'> 95%'    },
];

const TABS = [
  { id:'timeline',      icon:'🕐', label:'Visit History'   },
  { id:'prescriptions', icon:'💊', label:'Prescriptions'   },
  { id:'vitals',        icon:'📊', label:'Vitals'          },
];

function EMRPanel({ record, onClose }) {
  return (
    <motion.div
      initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:40 }}
      transition={{ duration:.25 }}
      style={{
        position:'fixed', top:0, right:0, bottom:0, width:440,
        background:'var(--white)', boxShadow:'-4px 0 32px rgba(0,0,0,.12)',
        zIndex:200, overflowY:'auto',
      }}>
      <div style={{
        background:'linear-gradient(135deg, var(--forest), var(--moss))',
        padding:'20px 22px', color:'#fff',
        display:'flex', justifyContent:'space-between', alignItems:'flex-start',
      }}>
        <div>
          <div style={{ fontSize:'.72rem', opacity:.6, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:4 }}>
            Consultation Record
          </div>
          <div style={{ fontWeight:700, fontSize:'1.05rem', marginBottom:2 }}>{record.doctor}</div>
          <div style={{ fontSize:'.78rem', opacity:.75 }}>{record.dept} · {fmtDate(record.date)}</div>
        </div>
        <button onClick={onClose} style={{
          background:'rgba(255,255,255,.15)', border:'none', color:'#fff',
          width:32, height:32, borderRadius:'50%', cursor:'pointer', fontSize:'1rem',
        }}>✕</button>
      </div>

      <div style={{ padding:'20px 22px' }}>
        {/* Diagnosis */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:'.72rem', textTransform:'uppercase', letterSpacing:'.08em', color:'var(--muted)', marginBottom:8 }}>
            Diagnosis
          </div>
          <div style={{
            background:'var(--mint)', border:'1.5px solid #95d5b2', borderRadius:10,
            padding:'12px 16px', fontWeight:600, fontSize:'.9rem', color:'var(--forest)',
          }}>
            {record.diagnosis}
          </div>
        </div>

        {/* Vitals */}
        {record.vitals && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:'.72rem', textTransform:'uppercase', letterSpacing:'.08em', color:'var(--muted)', marginBottom:8 }}>
              Vitals Recorded
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {Object.entries(record.vitals).map(([k, v]) => (
                <div key={k} style={{ background:'var(--sand)', borderRadius:9, padding:'9px 12px' }}>
                  <div style={{ fontSize:'.68rem', color:'var(--muted)', marginBottom:2, textTransform:'capitalize' }}>
                    {k.replace(/([A-Z])/g, ' $1')}
                  </div>
                  <div style={{ fontWeight:700, fontSize:'.88rem' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prescription */}
        {record.prescription?.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:'.72rem', textTransform:'uppercase', letterSpacing:'.08em', color:'var(--muted)', marginBottom:8 }}>
              Prescription
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {record.prescription.map((rx, i) => (
                <div key={i} style={{
                  display:'flex', gap:10, alignItems:'center',
                  background:'#fff5f5', border:'1px solid #fadbd8',
                  borderRadius:9, padding:'10px 12px',
                }}>
                  <span style={{ fontSize:'1.1rem' }}>💊</span>
                  <span style={{ fontSize:'.84rem' }}>{rx}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {record.notes && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:'.72rem', textTransform:'uppercase', letterSpacing:'.08em', color:'var(--muted)', marginBottom:8 }}>
              Doctor's Notes
            </div>
            <div style={{
              background:'#eaf4fb', border:'1px solid #aed6f1', borderRadius:10,
              padding:'12px 16px', fontSize:'.84rem', color:'var(--ink)', lineHeight:1.6,
            }}>
              {record.notes}
            </div>
          </div>
        )}

        {/* Follow-up */}
        {record.followUp && (
          <div style={{
            background:'#fef9e7', border:'1px solid #f9e79f', borderRadius:10,
            padding:'12px 16px', fontSize:'.84rem', color:'#7d6608',
            display:'flex', alignItems:'center', gap:10,
          }}>
            <span style={{ fontSize:'1.1rem' }}>📅</span>
            <div>
              <div style={{ fontWeight:700, marginBottom:2 }}>Follow-up Appointment</div>
              <div>{fmtDate(record.followUp)}</div>
            </div>
          </div>
        )}

        {/* PDF download (print) */}
        <button
          onClick={() => window.print()}
          className="btn btn-sage"
          style={{ width:'100%', marginTop:22 }}>
          🖨️ Print / Download PDF
        </button>
      </div>
    </motion.div>
  );
}

export default function MyHealthRecord() {
  const api = useApi();
  const [appts,  setAppts]  = useState([]);
  const [tab,    setTab]    = useState('timeline');
  const [emr,    setEmr]    = useState(null);

  useEffect(() => { api.getAppointments().then(setAppts); }, []);

  const completed = [...appts]
    .filter(a => a.status === 'Completed')
    .sort((a, b) => (b.appointmentDate||'').localeCompare(a.appointmentDate||''));

  const allHistory = [...appts]
    .sort((a, b) => (b.appointmentDate||'').localeCompare(a.appointmentDate||''));

  const allRecords = [...DEMO_RECORDS].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
        {[
          { label:'Total Visits',    val:appts.length,     color:'var(--forest)', icon:'🏥' },
          { label:'Completed',       val:completed.length, color:'var(--sage)',   icon:'✅' },
          { label:'Departments',     val:new Set(appts.map(a=>a.department).filter(Boolean)).size, color:'var(--blue)', icon:'🏬' },
          { label:'Prescriptions',   val:allRecords.length, color:'var(--amber)', icon:'💊' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.07 }}
            style={{
              background:'var(--white)', border:'1.5px solid var(--border)',
              borderRadius:14, padding:'16px 18px', boxShadow:'var(--shadow-sm)',
              display:'flex', alignItems:'center', gap:12,
            }}>
            <div style={{ fontSize:'1.5rem' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:'1.5rem', fontWeight:700, color:s.color, lineHeight:1 }}>{s.val}</div>
              <div style={{ fontSize:'.73rem', color:'var(--muted)', marginTop:3 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:0, background:'var(--stone)', borderRadius:12, padding:4, marginBottom:20, width:'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'9px 22px', border:'none', borderRadius:10, cursor:'pointer',
            fontFamily:'var(--font-ui)', fontSize:'.84rem', fontWeight:600,
            background: tab===t.id ? 'var(--white)' : 'transparent',
            color: tab===t.id ? 'var(--forest)' : 'var(--muted)',
            boxShadow: tab===t.id ? 'var(--shadow-sm)' : 'none',
            transition:'all .15s', display:'flex', alignItems:'center', gap:7,
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── Visit History / Timeline ──────────────────────────── */}
      {tab === 'timeline' && (
        <div style={{ display:'grid', gridTemplateColumns: emr ? '1fr' : '1fr', gap:0 }}>
          <div className="card">
            <div className="card-head">
              <h3>Visit History</h3>
              <span style={{ fontSize:'.8rem', color:'var(--muted)' }}>{allHistory.length} records</span>
            </div>
            <div className="card-body" style={{ padding:0 }}>
              {allHistory.length === 0 ? (
                <div style={{ padding:40 }}><Empty text="No visit history yet" /></div>
              ) : (
                <div style={{ padding:'8px 20px' }}>
                  {allHistory.map((a, i) => {
                    const ss  = STATUS_STYLE[a.status] || {};
                    const rec = allRecords.find(r => r.dept === a.department) || null;
                    const isLast = i === allHistory.length - 1;
                    return (
                      <div key={a.appointmentId} style={{ display:'flex', gap:16, paddingBottom: isLast ? 8 : 0 }}>
                        {/* Timeline spine */}
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:20, flexShrink:0, paddingTop:16 }}>
                          <div style={{
                            width:14, height:14, borderRadius:'50%', flexShrink:0,
                            background: a.status==='Completed' ? 'var(--sage)' : a.status==='Cancelled' ? 'var(--red)' : '#aed6f1',
                            border:'2px solid var(--white)', boxShadow:`0 0 0 2px ${ss.dot||'var(--stone)'}`,
                          }} />
                          {!isLast && <div style={{ width:2, flex:1, background:'var(--stone)', marginTop:4, minHeight:40 }} />}
                        </div>

                        {/* Content */}
                        <div style={{ flex:1, paddingTop:12, paddingBottom: isLast ? 0 : 16, borderBottom: isLast ? 'none' : '1px solid var(--stone)' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:'.92rem' }}>{a.doctorName || '—'}</div>
                              <div style={{ fontSize:'.76rem', color:'var(--muted)', marginTop:2 }}>
                                {a.department} · {fmtDate(a.appointmentDate)}
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                              <span style={{
                                padding:'3px 10px', borderRadius:20, fontSize:'.7rem', fontWeight:600,
                                background:ss.bg, color:ss.color,
                              }}>
                                {a.status}
                              </span>
                              {rec && a.status === 'Completed' && (
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => setEmr(rec)}
                                  style={{ fontSize:'.73rem' }}>
                                  📋 View EMR
                                </button>
                              )}
                            </div>
                          </div>
                          {a.reason && (
                            <div style={{
                              fontSize:'.8rem', color:'var(--muted)', padding:'6px 10px',
                              background:'var(--sand)', borderRadius:7, display:'inline-block',
                            }}>
                              {a.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Prescriptions ─────────────────────────────────────── */}
      {tab === 'prescriptions' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {allRecords.length === 0 ? (
            <div className="card"><div className="card-body"><Empty text="No prescriptions on file" /></div></div>
          ) : allRecords.map(r => (
            <motion.div key={r.id} className="card" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
              <div className="card-head">
                <div>
                  <h3 style={{ marginBottom:2 }}>Prescription — {fmtDate(r.date)}</h3>
                  <div style={{ fontSize:'.78rem', color:'var(--muted)' }}>{r.doctor} · {r.dept}</div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{
                    padding:'4px 12px', borderRadius:20, fontSize:'.72rem', fontWeight:600,
                    background:'#d8f3dc', color:'#1b4332', border:'1px solid #95d5b2',
                  }}>
                    Active
                  </span>
                  <button className="btn btn-outline btn-sm" onClick={() => setEmr(r)}>View Full</button>
                </div>
              </div>
              <div className="card-body">
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:'.73rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>
                    Diagnosis
                  </div>
                  <div style={{
                    background:'var(--mint)', border:'1.5px solid #95d5b2', borderRadius:9,
                    padding:'10px 14px', fontWeight:600, fontSize:'.86rem', color:'var(--forest)',
                    marginBottom:14,
                  }}>
                    {r.diagnosis}
                  </div>
                  <div style={{ fontSize:'.73rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>
                    Medicines
                  </div>
                  {r.prescription.map((m, i) => (
                    <div key={i} style={{
                      display:'flex', gap:10, alignItems:'center', padding:'9px 12px',
                      background:'var(--sand)', borderRadius:9, marginBottom:6, fontSize:'.85rem',
                    }}>
                      <span>💊</span> {m}
                    </div>
                  ))}
                </div>
                {r.notes && (
                  <div style={{ background:'#eaf4fb', borderRadius:9, padding:'11px 14px' }}>
                    <div style={{ fontSize:'.72rem', color:'#1a5276', fontWeight:700, marginBottom:4 }}>Doctor's Notes</div>
                    <div style={{ fontSize:'.84rem', color:'var(--ink)' }}>{r.notes}</div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Vitals ─────────────────────────────────────────────── */}
      {tab === 'vitals' && (
        <div className="card">
          <div className="card-head">
            <h3>Latest Vitals</h3>
            <span style={{ fontSize:'.78rem', color:'var(--muted)' }}>Last recorded: {fmtDate('2026-04-28')}</span>
          </div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:14 }}>
              {DEMO_VITALS.map(v => (
                <motion.div key={v.label} whileHover={{ y:-2, boxShadow:'var(--shadow)' }} style={{
                  border:`1.5px solid ${v.normal ? '#95d5b2' : '#fadbd8'}`,
                  borderRadius:14, padding:'18px 18px',
                  background: v.normal ? '#f0faf3' : '#fdf2f2',
                  transition:'box-shadow .15s',
                }}>
                  <div style={{ fontSize:'2rem', marginBottom:10 }}>{v.icon}</div>
                  <div style={{ fontSize:'1.35rem', fontWeight:700, color: v.normal ? 'var(--forest)' : 'var(--red)', marginBottom:4 }}>
                    {v.val}
                  </div>
                  <div style={{ fontSize:'.78rem', color:'var(--muted)', marginBottom:6 }}>{v.label}</div>
                  <div style={{ fontSize:'.68rem', color:'var(--muted)' }}>Normal: {v.range}</div>
                  <div style={{
                    marginTop:8, fontSize:'.72rem', fontWeight:700,
                    color: v.normal ? '#2d6a4f' : '#7b241c',
                    display:'flex', alignItems:'center', gap:4,
                  }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background: v.normal ? '#40916c' : '#c0392b' }} />
                    {v.normal ? 'Normal' : 'Attention needed'}
                  </div>
                </motion.div>
              ))}
            </div>
            <div style={{
              marginTop:20, padding:'12px 16px', background:'#eaf4fb',
              borderRadius:10, fontSize:'.82rem', color:'#1a5276',
              border:'1px solid #aed6f1',
            }}>
              ℹ️ Vitals are recorded during each consultation. Book an appointment to update your readings.
            </div>
          </div>
        </div>
      )}

      {/* EMR side panel */}
      <AnimatePresence>
        {emr && (
          <>
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setEmr(null)}
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:199 }}
            />
            <EMRPanel record={emr} onClose={() => setEmr(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
