import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { useSocket } from '../../hooks/useSocket';
import { popNavDoctor } from '../../hooks/navState';
import { toast } from '../../components/UI';

const DEPTS = ['All','Cardiology','Orthopedics','Neurology','Pediatrics','General OPD','Dermatology','Radiology'];

const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','14:00','14:30','15:00',
  '15:30','16:00','16:30','17:00','17:30','18:00',
];

const AVAIL_STYLE = {
  Available: { bg:'#d8f3dc', color:'#1b4332', border:'#95d5b2', dot:'#40916c' },
  Busy:      { bg:'#fef9e7', color:'#7d6608', border:'#f9e79f', dot:'#b7770d' },
  'Off-duty':{ bg:'#fdf2f2', color:'#7b241c', border:'#fadbd8', dot:'#c0392b' },
};

function WizardStep({ num, label, active, done }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{
        width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight:700, fontSize:'.84rem', flexShrink:0, transition:'all .25s',
        background: done ? 'var(--sage)' : active ? 'var(--forest)' : 'var(--stone)',
        color: done || active ? '#fff' : 'var(--muted)',
        boxShadow: active ? '0 0 0 4px rgba(64,145,108,.2)' : 'none',
      }}>
        {done ? '✓' : num}
      </div>
      <span style={{
        fontSize:'.82rem', fontWeight: active ? 700 : 400,
        color: active ? 'var(--forest)' : done ? 'var(--sage)' : 'var(--muted)',
        transition:'color .25s',
      }}>
        {label}
      </span>
    </div>
  );
}

function MiniCalendar({ value, onChange, minDate }) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks      = Array.from({ length: firstDay });

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function fmt(d) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div style={{ userSelect:'none' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <button onClick={prevMonth} style={navBtn}>‹</button>
        <span style={{ fontWeight:700, fontSize:'.9rem', color:'var(--forest)' }}>
          {monthNames[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} style={navBtn}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, marginBottom:6 }}>
        {dayNames.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:'.66rem', fontWeight:600, color:'var(--muted)', padding:'4px 0' }}>{d}</div>
        ))}
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map(d => {
          const dateStr  = fmt(d);
          const isPast   = minDate && dateStr < minDate;
          const isSel    = dateStr === value;
          const isToday  = dateStr === today.toISOString().split('T')[0];
          return (
            <button key={d} onClick={() => !isPast && onChange(dateStr)}
              style={{
                width:'100%', aspectRatio:'1', border:'none', borderRadius:8, cursor: isPast ? 'not-allowed' : 'pointer',
                fontFamily:'var(--font-ui)', fontSize:'.8rem', fontWeight: isSel || isToday ? 700 : 400,
                background: isSel ? 'var(--forest)' : isToday ? 'var(--mint)' : 'transparent',
                color: isSel ? '#fff' : isPast ? 'var(--stone)' : isToday ? 'var(--forest)' : 'var(--ink)',
                transition:'all .12s',
              }}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const navBtn = {
  background:'var(--sand)', border:'1.5px solid var(--border)', borderRadius:8,
  width:30, height:30, cursor:'pointer', fontSize:'1rem', color:'var(--forest)',
  display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-ui)',
};

async function fireConfetti() {
  try {
    const { default: confetti } = await import('canvas-confetti');
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#40916c','#74c69d','#d8f3dc','#fff'] });
    setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } }), 400);
  } catch {}
}

const SLIDE = {
  initial: { opacity:0, x:40 },
  animate: { opacity:1, x:0 },
  exit:    { opacity:0, x:-40 },
};

export default function BookAppointment() {
  const api = useApi();
  const [step, setStep]               = useState(1);
  const [doctors,      setDoctors]    = useState([]);
  const [filterDept,   setFilterDept] = useState('All');
  const [search,       setSearch]     = useState('');
  const [selectedDoc,  setSelectedDoc]= useState(null);
  const [selDate,      setSelDate]    = useState('');
  const [selTime,      setSelTime]    = useState('');
  const [reason,       setReason]     = useState('');
  const [saving,       setSaving]     = useState(false);
  const [done,         setDone]       = useState(null);
  const [flashDocs,    setFlashDocs]  = useState(new Set());
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getDoctors().then(list => {
      setDoctors(list);
      // If navigated here from FindDoctors with a pre-selected doctor, jump to step 2
      const preselected = popNavDoctor();
      if (preselected) {
        const live = list.find(d => d.doctorId === preselected.doctorId) || preselected;
        if (live.availability !== 'Off-duty') {
          setSelectedDoc(live);
          setStep(2);
        }
      }
    });
  }, []);

  // ── Live: doctor availability changed ────────────────────────
  useSocket('doctor:availability', ({ doctorId, availability }) => {
    setDoctors(prev => prev.map(d =>
      d.doctorId === doctorId ? { ...d, availability } : d
    ));
    // Keep selected doc in sync
    setSelectedDoc(prev => {
      if (!prev || prev.doctorId !== doctorId) return prev;
      if (availability === 'Off-duty') {
        toast.error('Your selected doctor just went off-duty. Please pick another.');
        setStep(1);
        return null;
      }
      return { ...prev, availability };
    });
    // Flash the card
    setFlashDocs(s => new Set([...s, doctorId]));
    setTimeout(() => setFlashDocs(s => { const n = new Set(s); n.delete(doctorId); return n; }), 1400);
  });

  const filtered = doctors.filter(d => {
    if (filterDept !== 'All' && d.department !== filterDept) return false;
    if (search) {
      const q = search.toLowerCase();
      return (d.name || '').toLowerCase().includes(q) ||
             (d.specialization || '').toLowerCase().includes(q) ||
             (d.department || '').toLowerCase().includes(q);
    }
    return true;
  });

  function selectDoc(d) {
    setSelectedDoc(d);
    setStep(2);
  }

  function goToStep3() {
    if (!selDate) { toast.error('Please select a date'); return; }
    if (!selTime) { toast.error('Please select a time slot'); return; }
    setStep(3);
  }

  async function book() {
    setSaving(true);
    try {
      await api.createAppointment({
        doctorId: selectedDoc.doctorId,
        appointmentDate: selDate,
        appointmentTime: selTime + ':00',
        reason,
      });
      toast.success('Request sent — awaiting doctor approval.');
      await fireConfetti();
      setDone({ doctor: selectedDoc, date: selDate, time: selTime, reason });
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to book appointment. Please try again.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setDone(null); setSelectedDoc(null); setSelDate(''); setSelTime('');
    setReason(''); setStep(1);
  }

  /* ── Success screen ─────────────────────────────────────────── */
  if (done) return (
    <div style={{ maxWidth:520, margin:'40px auto' }}>
      <motion.div className="card" initial={{ scale:.9, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ type:'spring', stiffness:260, damping:20 }}>
        <div className="card-body" style={{ textAlign:'center', padding:'44px 36px' }}>
          <motion.div style={{ fontSize:'3.5rem', marginBottom:16 }}
            animate={{ rotate:[0,10,-10,10,0], scale:[1,1.2,1.1,1.2,1] }}
            transition={{ duration:.6 }}>
            🎉
          </motion.div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.45rem', color:'var(--forest)', marginBottom:6 }}>
            Request Sent!
          </h2>
          <p style={{ color:'var(--muted)', fontSize:'.86rem', marginBottom:10 }}>
            Your appointment request has been submitted successfully.
          </p>
          <div style={{
            background:'#f3e8ff', border:'1px solid #d8b4fe', borderRadius:10,
            padding:'10px 14px', fontSize:'.82rem', color:'#6b21a8', marginBottom:20,
          }}>
            The doctor will review and approve your request. You'll see the confirmed time in My Appointments once approved.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:26, textAlign:'left' }}>
            {[
              { label:'Doctor',     val: done.doctor.name },
              { label:'Department', val: done.doctor.department },
              { label:'Date',       val: done.date },
              { label:'Time',       val: done.time },
              { label:'Reason',     val: done.reason || '—' },
            ].map(f => (
              <div key={f.label} style={{ background:'var(--sand)', borderRadius:10, padding:'11px 14px' }}>
                <div style={{ fontSize:'.68rem', color:'var(--muted)', marginBottom:3, textTransform:'uppercase', letterSpacing:'.06em' }}>{f.label}</div>
                <div style={{ fontWeight:700, fontSize:'.88rem' }}>{f.val}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-sage" onClick={reset} style={{ width:'100%' }}>
            Book Another Appointment
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      {/* Wizard progress bar */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-body" style={{ paddingTop:18, paddingBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:0, justifyContent:'center' }}>
            <WizardStep num={1} label="Select Doctor" active={step===1} done={step>1} />
            <div style={{ flex:1, maxWidth:80, height:2, background: step>1 ? 'var(--sage)' : 'var(--stone)', margin:'0 12px', transition:'background .3s' }} />
            <WizardStep num={2} label="Date & Time"   active={step===2} done={step>2} />
            <div style={{ flex:1, maxWidth:80, height:2, background: step>2 ? 'var(--sage)' : 'var(--stone)', margin:'0 12px', transition:'background .3s' }} />
            <WizardStep num={3} label="Confirm"       active={step===3} done={false} />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── Step 1: Pick a doctor ──────────────────────────────── */}
        {step === 1 && (
          <motion.div key="step1" {...SLIDE} transition={{ duration:.22 }}>
            {/* Search + dept filter */}
            <div className="card" style={{ marginBottom:16 }}>
              <div className="card-body" style={{ paddingTop:13, paddingBottom:13 }}>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                  <input
                    type="search" placeholder="Search doctor or specialization…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={fldStyle(220)}
                  />
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {DEPTS.map(d => (
                      <button key={d} onClick={() => setFilterDept(d)} style={{
                        padding:'5px 12px', border:`1.5px solid ${filterDept===d ? 'var(--sage)' : 'var(--border)'}`,
                        borderRadius:20, background: filterDept===d ? 'var(--mint)' : 'transparent',
                        color: filterDept===d ? 'var(--forest)' : 'var(--muted)',
                        fontFamily:'var(--font-ui)', fontSize:'.78rem', fontWeight: filterDept===d ? 700 : 400,
                        cursor:'pointer', transition:'.12s',
                      }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Select a Doctor</h3>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:'.75rem', color:'var(--muted)' }}>
                    <motion.div
                      animate={{ opacity:[1,.3,1] }} transition={{ repeat:Infinity, duration:1.8 }}
                      style={{ width:7, height:7, borderRadius:'50%', background:'var(--sage)' }}
                    />
                    Live availability
                  </div>
                  <span style={{ fontSize:'.8rem', color:'var(--muted)' }}>{filtered.length} found</span>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(270px,1fr))', gap:16 }}>
                  {filtered.map(d => {
                    const av    = d.availability || 'Available';
                    const avs   = AVAIL_STYLE[av] || AVAIL_STYLE.Available;
                    const off   = av === 'Off-duty';
                    const flash = flashDocs.has(d.doctorId);
                    return (
                      <motion.div key={d.doctorId}
                        layout
                        animate={{ opacity: off ? .55 : 1, borderColor: flash ? '#40916c' : avs.border }}
                        whileHover={!off ? { y:-3, boxShadow:'var(--shadow)' } : {}}
                        transition={{ duration: flash ? 1.2 : .15 }}
                        style={{
                          border:`1.5px solid ${avs.border}`, borderRadius:12,
                          background:'var(--white)', overflow:'hidden',
                          cursor: off ? 'not-allowed' : 'pointer',
                        }}>
                        <div style={{
                          background:'linear-gradient(135deg, var(--forest) 0%, var(--moss) 100%)',
                          padding:'16px 18px', display:'flex', gap:12, alignItems:'center',
                        }}>
                          <div style={{
                            width:46, height:46, borderRadius:'50%', background:'rgba(255,255,255,.18)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            color:'#fff', fontFamily:'var(--font-display)', fontSize:'1.15rem', fontWeight:700, flexShrink:0,
                          }}>
                            {d.name.split(' ').pop()[0]}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ color:'#fff', fontWeight:600, fontSize:'.94rem' }}>{d.name}</div>
                            <div style={{ color:'rgba(255,255,255,.65)', fontSize:'.74rem', marginTop:2 }}>{d.specialization}</div>
                          </div>
                          {/* Live availability badge */}
                          <motion.div
                            animate={flash ? { scale:[1,1.2,1] } : {}}
                            transition={{ duration:.4 }}
                            style={{
                              background:avs.bg, border:`1px solid ${avs.border}`, borderRadius:20,
                              padding:'3px 10px', display:'flex', alignItems:'center', gap:5, flexShrink:0,
                            }}>
                            <motion.div
                              animate={flash ? { scale:[1,1.8,1] } : {}}
                              transition={{ duration:.35 }}
                              style={{ width:6, height:6, borderRadius:'50%', background:avs.dot,
                                boxShadow: av==='Available' ? `0 0 0 2.5px ${avs.border}` : 'none' }}
                            />
                            <span style={{ fontSize:'.68rem', fontWeight:700, color:avs.color }}>{av}</span>
                          </motion.div>
                        </div>
                        <div style={{ padding:'14px 18px' }}>
                          <div style={{ fontSize:'.8rem', color:'var(--muted)', marginBottom:14 }}>
                            🏥 {d.department}
                            {d.maxPatients && <span style={{ marginLeft:10 }}>· Max {d.maxPatients}/day</span>}
                          </div>
                          <button className="btn btn-sage btn-sm" style={{ width:'100%' }}
                            disabled={off} onClick={() => !off && selectDoc(d)}>
                            {off ? 'Not Available' : 'Select Doctor →'}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Date & time ────────────────────────────────── */}
        {step === 2 && (
          <motion.div key="step2" {...SLIDE} transition={{ duration:.22 }}>
            {/* Doctor summary banner */}
            <div style={{
              display:'flex', alignItems:'center', gap:14, padding:'14px 18px',
              background:'var(--mint)', borderRadius:12, marginBottom:18,
              border:'1.5px solid #95d5b2',
            }}>
              <div style={{
                width:44, height:44, borderRadius:'50%', background:'var(--sage)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontWeight:700, fontSize:'1.05rem', flexShrink:0,
              }}>
                {selectedDoc.name.split(' ').pop()[0]}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700 }}>{selectedDoc.name}</div>
                <div style={{ fontSize:'.76rem', color:'var(--muted)' }}>
                  {selectedDoc.specialization} · {selectedDoc.department}
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => { setStep(1); setSelDate(''); setSelTime(''); }}>
                ← Change
              </button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
              {/* Calendar */}
              <div className="card">
                <div className="card-head"><h3>Pick a Date</h3></div>
                <div className="card-body">
                  <MiniCalendar value={selDate} onChange={setSelDate} minDate={today} />
                  {selDate && (
                    <div style={{
                      marginTop:12, padding:'10px 14px', background:'var(--mint)',
                      borderRadius:9, fontSize:'.84rem', color:'var(--forest)', fontWeight:600,
                      border:'1.5px solid #95d5b2', textAlign:'center',
                    }}>
                      📅 {new Date(selDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                    </div>
                  )}
                </div>
              </div>

              {/* Time slots */}
              <div className="card">
                <div className="card-head">
                  <h3>Pick a Time</h3>
                  {selDate && <span style={{ fontSize:'.78rem', color:'var(--muted)' }}>{selDate}</span>}
                </div>
                <div className="card-body">
                  {!selDate ? (
                    <div style={{ textAlign:'center', padding:'40px 16px', color:'var(--muted)', fontSize:'.86rem' }}>
                      Select a date first
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize:'.75rem', color:'var(--muted)', marginBottom:12,
                        textTransform:'uppercase', letterSpacing:'.07em' }}>
                        Available slots
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
                        {TIME_SLOTS.map(t => {
                          const isSel = t === selTime;
                          return (
                            <motion.button key={t} whileHover={{ scale:1.04 }} whileTap={{ scale:.96 }}
                              onClick={() => setSelTime(t)}
                              style={{
                                padding:'9px 4px', border:`1.5px solid ${isSel ? 'var(--sage)' : 'var(--border)'}`,
                                borderRadius:9, background: isSel ? 'var(--mint)' : 'var(--white)',
                                color: isSel ? 'var(--forest)' : 'var(--ink)',
                                fontFamily:'var(--font-ui)', fontSize:'.8rem', fontWeight: isSel ? 700 : 400,
                                cursor:'pointer', transition:'all .12s',
                              }}>
                              {t}
                            </motion.button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {/* Reason */}
                  <div className="field" style={{ marginTop:18 }}>
                    <label style={{ fontSize:'.8rem', color:'var(--muted)', display:'block', marginBottom:6 }}>
                      Reason for Visit <span style={{ color:'var(--muted)', fontWeight:400 }}>(optional)</span>
                    </label>
                    <textarea
                      rows={3} value={reason} onChange={e => setReason(e.target.value)}
                      placeholder="Describe your symptoms or reason…"
                      style={{
                        width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)',
                        borderRadius:9, fontFamily:'var(--font-ui)', fontSize:'.84rem',
                        resize:'vertical', outline:'none', boxSizing:'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop:16 }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-sage" onClick={goToStep3}>
                Review & Confirm →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Confirm ────────────────────────────────────── */}
        {step === 3 && (
          <motion.div key="step3" {...SLIDE} transition={{ duration:.22 }}>
            <div style={{ maxWidth:560, margin:'0 auto' }}>
              <div className="card">
                <div className="card-head">
                  <h3>Confirm Appointment</h3>
                  <button className="btn btn-outline btn-sm" onClick={() => setStep(2)}>← Edit</button>
                </div>
                <div className="card-body">
                  {/* Doctor card */}
                  <div style={{
                    display:'flex', gap:14, padding:'16px', background:'var(--mint)',
                    borderRadius:12, marginBottom:20, border:'1.5px solid #95d5b2',
                    alignItems:'center',
                  }}>
                    <div style={{
                      width:54, height:54, borderRadius:'50%',
                      background:'linear-gradient(135deg, var(--forest), var(--moss))',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontWeight:700, fontSize:'1.25rem', flexShrink:0,
                    }}>
                      {selectedDoc.name.split(' ').pop()[0]}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:'1rem' }}>{selectedDoc.name}</div>
                      <div style={{ fontSize:'.78rem', color:'var(--muted)' }}>
                        {selectedDoc.specialization} · {selectedDoc.department}
                      </div>
                    </div>
                    <div style={{ fontSize:'.75rem', color:'var(--sage)', fontWeight:700 }}>Selected ✓</div>
                  </div>

                  {/* Details grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                    {[
                      { icon:'📅', label:'Date', val: new Date(selDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'long', year:'numeric' }) },
                      { icon:'🕐', label:'Time', val: selTime },
                      { icon:'🏥', label:'Department', val: selectedDoc.department },
                      { icon:'📋', label:'Reason', val: reason || '—' },
                    ].map(f => (
                      <div key={f.label} style={{ background:'var(--sand)', borderRadius:10, padding:'12px 14px' }}>
                        <div style={{ fontSize:'.68rem', color:'var(--muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em' }}>
                          {f.icon} {f.label}
                        </div>
                        <div style={{ fontWeight:700, fontSize:'.9rem' }}>{f.val}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    padding:'12px 16px', background:'#eaf4fb', borderRadius:10,
                    fontSize:'.81rem', color:'#1a5276', marginBottom:20,
                  }}>
                    ℹ️ By confirming, you agree to arrive 10 minutes before your appointment time.
                    Cancellations must be made at least 2 hours in advance.
                  </div>

                  <div className="form-actions">
                    <button className="btn btn-outline" onClick={() => setStep(2)}>Cancel</button>
                    <button className="btn btn-sage" onClick={book} disabled={saving}>
                      {saving ? (
                        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }} />
                          Booking…
                        </span>
                      ) : '🎉 Confirm Appointment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

function fldStyle(w) {
  return {
    padding:'7px 12px', border:'1.5px solid var(--border)', borderRadius:9,
    fontFamily:'var(--font-ui)', fontSize:'.83rem', background:'var(--white)',
    outline:'none', width:w,
  };
}
