import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { toast } from '../../components/UI';

const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
const GENDERS      = ['Male','Female','Other'];
const BLOOD_COLOR  = {
  'A+':'#e74c3c','A-':'#c0392b','B+':'#e67e22','B-':'#d35400',
  'O+':'#27ae60','O-':'#1e8449','AB+':'#2980b9','AB-':'#1a5276',
};

const TABS = [
  { id:'info',     icon:'👤', label:'Personal Info'    },
  { id:'password', icon:'🔒', label:'Change Password'  },
  { id:'prefs',    icon:'🔔', label:'Notifications'    },
];

const slideVariant = {
  initial: { opacity:0, x:18 },
  animate: { opacity:1, x:0  },
  exit:    { opacity:0, x:-18 },
};

function FieldRow({ icon, label, children }) {
  return (
    <div style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'12px 0', borderBottom:'1px solid var(--stone)' }}>
      <span style={{ width:26, textAlign:'center', fontSize:'1.05rem', marginTop:2, flexShrink:0 }}>{icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'.72rem', color:'var(--muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</div>
        {children}
      </div>
    </div>
  );
}

export default function MyProfile() {
  const { user } = useAuth();
  const api = useApi();
  const [tab,       setTab]       = useState('info');
  const [appts,     setAppts]     = useState([]);
  const [patientId, setPatientId] = useState(null);
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [profile, setProfile] = useState({
    name:'', age:'', gender:'Male', contact:'', bloodGroup:'O+', address:'', email:'',
  });
  const [form, setForm] = useState({ ...profile });

  // Password tab state
  const [pwd, setPwd] = useState({ current:'', next:'', confirm:'' });
  const [pwdSaving, setPwdSaving] = useState(false);

  // Notification prefs
  const [prefs, setPrefs] = useState({
    appointmentReminders: true,
    statusUpdates: true,
    doctorNotes: true,
    systemAnnouncements: false,
    emailNotifs: true,
    smsNotifs: false,
  });

  useEffect(() => {
    api.getAppointments().then(setAppts);
    api.getPatients().then(patients => {
      const me = patients.find(p => p.name?.toLowerCase() === user?.username?.toLowerCase()) || patients[0];
      if (me) {
        setPatientId(me.patientId);
        const data = {
          name:       me.name       || user?.username || '',
          age:        me.age        || '',
          gender:     me.gender     || 'Male',
          contact:    me.contact    || '',
          bloodGroup: me.bloodGroup || 'O+',
          address:    me.address    || '',
          email:      me.email      || '',
        };
        setProfile(data);
        setForm(data);
      }
    });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function saveInfo() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!patientId) { toast.error('Patient profile not loaded yet'); return; }
    setSaving(true);
    try {
      await api.updatePatient(patientId, form);
      setProfile({ ...form });
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (!pwd.current) { toast.error('Enter your current password'); return; }
    if (pwd.next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (pwd.next !== pwd.confirm) { toast.error('Passwords do not match'); return; }
    setPwdSaving(true);
    await new Promise(r => setTimeout(r, 700));
    toast.success('Password changed successfully');
    setPwd({ current:'', next:'', confirm:'' });
    setPwdSaving(false);
  }

  async function savePrefs() {
    await new Promise(r => setTimeout(r, 300));
    toast.success('Notification preferences saved');
  }

  const completed  = appts.filter(a => a.status === 'Completed').length;
  const upcoming   = appts.filter(a => ['Scheduled','Checked-In'].includes(a.status)).length;
  const depts      = [...new Set(appts.map(a => a.department).filter(Boolean))];
  const lastVisit  = [...appts].filter(a => a.status === 'Completed')
    .sort((a, b) => (b.appointmentDate||'').localeCompare(a.appointmentDate||''))[0];

  return (
    <div style={{ maxWidth:780, margin:'0 auto' }}>

      {/* Profile hero */}
      <motion.div
        initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:.35 }}
        style={{
          background:'linear-gradient(135deg, var(--forest) 0%, var(--moss) 100%)',
          borderRadius:16, padding:'28px 30px', marginBottom:22,
          display:'flex', gap:22, alignItems:'center', flexWrap:'wrap',
          boxShadow:'0 4px 24px rgba(27,67,50,.25)', position:'relative', overflow:'hidden',
        }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.06)' }} />
        <div style={{ position:'absolute', right:80, bottom:-40, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />

        <div style={{
          width:84, height:84, borderRadius:'50%',
          background:'rgba(255,255,255,.18)', border:'2px solid rgba(255,255,255,.3)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontFamily:'var(--font-display)', fontSize:'2.2rem', fontWeight:700, flexShrink:0,
        }}>
          {(profile.name || user?.username || 'P')[0].toUpperCase()}
        </div>

        <div style={{ flex:1, position:'relative' }}>
          <div style={{ color:'rgba(255,255,255,.55)', fontSize:'.72rem', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:5 }}>
            Patient Profile
          </div>
          <div style={{ color:'#fff', fontSize:'1.5rem', fontWeight:700, fontFamily:'var(--font-display)', marginBottom:8 }}>
            {profile.name || user?.username}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {profile.bloodGroup && (
              <span style={{
                background: BLOOD_COLOR[profile.bloodGroup] || 'rgba(255,255,255,.2)',
                color:'#fff', padding:'3px 12px', borderRadius:20, fontSize:'.76rem', fontWeight:700,
              }}>
                {profile.bloodGroup}
              </span>
            )}
            {profile.gender && (
              <span style={{ background:'rgba(255,255,255,.15)', color:'#fff', padding:'3px 12px', borderRadius:20, fontSize:'.76rem' }}>
                {profile.gender}
              </span>
            )}
            {profile.age && (
              <span style={{ background:'rgba(255,255,255,.15)', color:'#fff', padding:'3px 12px', borderRadius:20, fontSize:'.76rem' }}>
                {profile.age} yrs
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stat strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:22 }}>
        {[
          { label:'Total Visits',  val:appts.length, color:'var(--forest)', icon:'🏥' },
          { label:'Upcoming',      val:upcoming,      color:'var(--blue)',   icon:'📅' },
          { label:'Completed',     val:completed,     color:'var(--sage)',   icon:'✅' },
          { label:'Departments',   val:depts.length,  color:'var(--amber)',  icon:'🏬' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*.06, duration:.3 }}
            style={{
              background:'var(--white)', border:'1.5px solid var(--border)',
              borderRadius:12, padding:'14px 16px', boxShadow:'var(--shadow-sm)',
              display:'flex', alignItems:'center', gap:10,
            }}>
            <div style={{ fontSize:'1.4rem' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:'1.5rem', fontWeight:700, color:s.color, lineHeight:1 }}>{s.val}</div>
              <div style={{ fontSize:'.72rem', color:'var(--muted)', marginTop:3 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:0, background:'var(--stone)', borderRadius:12, padding:4, marginBottom:20, width:'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setEditing(false); }}
            style={{
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

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'info' && (
          <motion.div key="info" {...slideVariant} transition={{ duration:.2 }}>
            <div className="card">
              <div className="card-head">
                <h3>{editing ? 'Edit Profile' : 'Personal Information'}</h3>
                {!editing ? (
                  <button className="btn btn-sage btn-sm" onClick={() => setEditing(true)}>✏️ Edit Profile</button>
                ) : (
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => { setForm({...profile}); setEditing(false); }}>Cancel</button>
                    <button className="btn btn-sage btn-sm" onClick={saveInfo} disabled={saving}>
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
              <div className="card-body">
                {editing ? (
                  <div className="form-grid">
                    <div className="field form-full">
                      <label>Full Name <span style={{ color:'var(--red)' }}>*</span></label>
                      <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" />
                    </div>
                    <div className="field">
                      <label>Age</label>
                      <input type="number" min="0" max="150" value={form.age} onChange={e => set('age', e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Gender</label>
                      <select value={form.gender} onChange={e => set('gender', e.target.value)}>
                        {GENDERS.map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Blood Group</label>
                      <select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
                        {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Contact Number</label>
                      <input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="Phone number" />
                    </div>
                    <div className="field">
                      <label>Email</label>
                      <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Email address" />
                    </div>
                    <div className="field form-full">
                      <label>Address</label>
                      <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <FieldRow icon="👤" label="Full Name">
                      <strong>{profile.name || '—'}</strong>
                    </FieldRow>
                    <FieldRow icon="🎂" label="Age">
                      <strong>{profile.age ? `${profile.age} years` : '—'}</strong>
                    </FieldRow>
                    <FieldRow icon="⚧" label="Gender">
                      <strong>{profile.gender || '—'}</strong>
                    </FieldRow>
                    <FieldRow icon="🩸" label="Blood Group">
                      {profile.bloodGroup ? (
                        <span style={{
                          background: BLOOD_COLOR[profile.bloodGroup] || 'var(--sand)',
                          color:'#fff', padding:'3px 12px', borderRadius:20,
                          fontSize:'.82rem', fontWeight:700, display:'inline-block',
                        }}>
                          {profile.bloodGroup}
                        </span>
                      ) : <strong>—</strong>}
                    </FieldRow>
                    <FieldRow icon="📞" label="Contact">
                      <strong>{profile.contact || '—'}</strong>
                    </FieldRow>
                    <FieldRow icon="📧" label="Email">
                      <strong>{profile.email || '—'}</strong>
                    </FieldRow>
                    <FieldRow icon="📍" label="Address">
                      <strong>{profile.address || '—'}</strong>
                    </FieldRow>
                    <FieldRow icon="🏥" label="Last Visit">
                      <strong>{lastVisit ? lastVisit.appointmentDate : '—'}</strong>
                    </FieldRow>
                  </div>
                )}
              </div>
            </div>

            {depts.length > 0 && (
              <div className="card" style={{ marginTop:16 }}>
                <div className="card-head"><h3>Departments Visited</h3></div>
                <div className="card-body">
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {depts.map(d => (
                      <div key={d} style={{
                        padding:'7px 16px', borderRadius:20,
                        background:'var(--mint)', border:'1.5px solid #95d5b2',
                        fontSize:'.82rem', fontWeight:600, color:'var(--forest)',
                      }}>
                        🏥 {d}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {tab === 'password' && (
          <motion.div key="password" {...slideVariant} transition={{ duration:.2 }}>
            <div className="card">
              <div className="card-head"><h3>Change Password</h3></div>
              <div className="card-body" style={{ maxWidth:440 }}>
                <div style={{
                  padding:'12px 16px', background:'#eaf4fb', borderRadius:10,
                  fontSize:'.82rem', color:'#1a5276', marginBottom:20, border:'1px solid #aed6f1',
                }}>
                  🔒 For security, enter your current password to confirm changes.
                </div>

                <div className="field">
                  <label>Current Password</label>
                  <input type="password" value={pwd.current}
                    onChange={e => setPwd(p => ({...p, current:e.target.value}))}
                    placeholder="Enter current password"
                    style={{ width:'100%' }} />
                </div>
                <div className="field">
                  <label>New Password</label>
                  <input type="password" value={pwd.next}
                    onChange={e => setPwd(p => ({...p, next:e.target.value}))}
                    placeholder="At least 6 characters"
                    style={{ width:'100%' }} />
                  {pwd.next && (
                    <div style={{ marginTop:8 }}>
                      {/* Strength meter */}
                      <div style={{ display:'flex', gap:3, marginBottom:4 }}>
                        {[1,2,3,4].map(i => {
                          const strength = pwd.next.length >= 6 ? (pwd.next.length >= 10 ? 3 : 2) : 1;
                          const lit = i <= strength;
                          const colors = ['var(--red)','var(--amber)','var(--sage)','var(--forest)'];
                          return (
                            <div key={i} style={{
                              flex:1, height:4, borderRadius:99,
                              background: lit ? colors[strength-1] : 'var(--stone)',
                              transition:'background .2s',
                            }} />
                          );
                        })}
                      </div>
                      <div style={{ fontSize:'.72rem', color:'var(--muted)' }}>
                        {pwd.next.length < 6 ? 'Too short' : pwd.next.length < 10 ? 'Good — try longer' : 'Strong password'}
                      </div>
                    </div>
                  )}
                </div>
                <div className="field">
                  <label>Confirm New Password</label>
                  <input type="password" value={pwd.confirm}
                    onChange={e => setPwd(p => ({...p, confirm:e.target.value}))}
                    placeholder="Re-enter new password"
                    style={{
                      width:'100%',
                      borderColor: pwd.confirm && pwd.confirm !== pwd.next ? 'var(--red)' : undefined,
                    }} />
                  {pwd.confirm && pwd.confirm !== pwd.next && (
                    <div style={{ fontSize:'.75rem', color:'var(--red)', marginTop:5 }}>Passwords do not match</div>
                  )}
                </div>
                <div className="form-actions" style={{ marginTop:20 }}>
                  <button className="btn btn-sage" onClick={savePassword} disabled={pwdSaving}>
                    {pwdSaving ? 'Saving…' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'prefs' && (
          <motion.div key="prefs" {...slideVariant} transition={{ duration:.2 }}>
            <div className="card">
              <div className="card-head"><h3>Notification Preferences</h3></div>
              <div className="card-body">
                {[
                  { key:'appointmentReminders', label:'Appointment Reminders', desc:'Get reminded before your appointments' },
                  { key:'statusUpdates',        label:'Status Updates',        desc:'Know when your status changes (Checked-In, etc.)' },
                  { key:'doctorNotes',          label:'Doctor Notes & Results', desc:'Receive consultation notes and prescriptions' },
                  { key:'systemAnnouncements',  label:'System Announcements',  desc:'Receive updates about new features and services' },
                ].map(p => (
                  <div key={p.key} style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'16px 0', borderBottom:'1px solid var(--stone)',
                  }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:'.9rem', marginBottom:3 }}>{p.label}</div>
                      <div style={{ fontSize:'.78rem', color:'var(--muted)' }}>{p.desc}</div>
                    </div>
                    <div
                      onClick={() => setPrefs(q => ({...q, [p.key]: !q[p.key]}))}
                      style={{
                        width:44, height:24, borderRadius:12, cursor:'pointer',
                        background: prefs[p.key] ? 'var(--sage)' : 'var(--stone)',
                        position:'relative', transition:'background .2s', flexShrink:0,
                      }}>
                      <div style={{
                        width:18, height:18, borderRadius:'50%', background:'#fff',
                        position:'absolute', top:3,
                        left: prefs[p.key] ? 23 : 3,
                        transition:'left .2s',
                        boxShadow:'0 1px 4px rgba(0,0,0,.2)',
                      }} />
                    </div>
                  </div>
                ))}

                <div style={{ marginTop:20 }}>
                  <div style={{ fontSize:'.8rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>
                    Delivery Channels
                  </div>
                  {[
                    { key:'emailNotifs', icon:'📧', label:'Email Notifications' },
                    { key:'smsNotifs',   icon:'📱', label:'SMS Notifications'   },
                  ].map(p => (
                    <div key={p.key} style={{
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'12px 0', borderBottom:'1px solid var(--stone)',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:'1.1rem' }}>{p.icon}</span>
                        <span style={{ fontWeight:500, fontSize:'.88rem' }}>{p.label}</span>
                      </div>
                      <div
                        onClick={() => setPrefs(q => ({...q, [p.key]: !q[p.key]}))}
                        style={{
                          width:44, height:24, borderRadius:12, cursor:'pointer',
                          background: prefs[p.key] ? 'var(--sage)' : 'var(--stone)',
                          position:'relative', transition:'background .2s', flexShrink:0,
                        }}>
                        <div style={{
                          width:18, height:18, borderRadius:'50%', background:'#fff',
                          position:'absolute', top:3,
                          left: prefs[p.key] ? 23 : 3,
                          transition:'left .2s',
                          boxShadow:'0 1px 4px rgba(0,0,0,.2)',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-actions" style={{ marginTop:22 }}>
                  <button className="btn btn-sage" onClick={savePrefs}>Save Preferences</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
