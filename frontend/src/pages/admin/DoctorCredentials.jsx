import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Modal, toast } from '../../components/UI';

const AVAIL = {
  Available: { bg: '#d8f3dc', color: '#1b4332', dot: '#40916c' },
  Busy:      { bg: '#fef9e7', color: '#7d6608', dot: '#b7770d' },
  'Off-duty':{ bg: '#fdf2f2', color: '#7b241c', dot: '#c0392b' },
};

function genUsername(name) {
  const parts = name.replace(/^dr\.?\s*/i, '').trim().split(/\s+/);
  return 'dr.' + (parts[parts.length - 1] || parts[0]).toLowerCase();
}

function CreateAccountModal({ doctor, onClose, onCreate }) {
  const [username, setUsername] = useState(genUsername(doctor.name));
  const [password, setPassword] = useState('doc123');
  const [showPass, setShowPass] = useState(false);
  const [saving,   setSaving]   = useState(false);

  async function submit() {
    if (!username.trim() || !password.trim()) {
      toast.error('Username and password are required'); return;
    }
    setSaving(true);
    try {
      await onCreate(doctor.doctorId, { username: username.trim(), password });
      toast.success(`Account created: ${username} / ${password}`);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to create account');
    } finally { setSaving(false); }
  }

  return (
    <Modal title={`Create Login — ${doctor.name}`} onClose={onClose}>
      <div style={{ background:'#eaf4fb', border:'1px solid #aed6f1', borderRadius:10, padding:'12px 14px', marginBottom:18, fontSize:'.82rem', color:'#1a5276' }}>
        {doctor.department} &nbsp;·&nbsp; {doctor.specialization || 'General'}
      </div>

      <div className="field">
        <label>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)}
          placeholder="e.g. dr.sharma"
          style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'var(--font-ui)', fontSize:'.86rem' }} />
        <div style={{ fontSize:'.72rem', color:'var(--muted)', marginTop:4 }}>
          Convention: dr.lastname (e.g. dr.mehta)
        </div>
      </div>

      <div className="field">
        <label>Password</label>
        <div style={{ position:'relative' }}>
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width:'100%', padding:'9px 44px 9px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'var(--font-ui)', fontSize:'.86rem' }}
          />
          <button type="button" onClick={() => setShowPass(s => !s)} style={{
            position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
            background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:'.9rem',
          }}>
            {showPass ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <div style={{ background:'#fef9e7', border:'1px solid #fde68a', borderRadius:9, padding:'10px 13px', fontSize:'.78rem', color:'#92400e', marginBottom:18 }}>
        ⚠️ Save these credentials before closing — the password cannot be shown again after creation.
      </div>

      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-sage" onClick={submit} disabled={saving}>
          {saving ? 'Creating…' : '✓ Create Account'}
        </button>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ doctor, onClose, onReset }) {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving,   setSaving]   = useState(false);

  async function submit() {
    if (!password.trim()) { toast.error('Password is required'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      await onReset(doctor.doctorId, password);
      toast.success('Password reset successfully');
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to reset password');
    } finally { setSaving(false); }
  }

  return (
    <Modal title={`Reset Password — ${doctor.name}`} onClose={onClose}>
      <div style={{ fontSize:'.84rem', color:'var(--muted)', marginBottom:18 }}>
        Username: <strong style={{ color:'var(--ink)', fontFamily:'monospace' }}>{doctor.username}</strong>
      </div>
      <div className="field">
        <label>New Password</label>
        <div style={{ position:'relative' }}>
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            style={{ width:'100%', padding:'9px 44px 9px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'var(--font-ui)', fontSize:'.86rem' }}
          />
          <button type="button" onClick={() => setShowPass(s => !s)} style={{
            position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
            background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:'.9rem',
          }}>
            {showPass ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn" style={{ background:'#fdf2f2', color:'#7b241c', border:'1px solid #fadbd8', padding:'9px 22px', borderRadius:9 }}
          onClick={submit} disabled={saving}>
          {saving ? 'Resetting…' : '🔑 Reset Password'}
        </button>
      </div>
    </Modal>
  );
}

export default function DoctorCredentials() {
  const api = useApi();
  const [doctors,       setDoctors]       = useState([]);
  const [search,        setSearch]        = useState('');
  const [createModal,   setCreateModal]   = useState(null);
  const [resetModal,    setResetModal]    = useState(null);
  const [revealed,      setRevealed]      = useState({});

  useEffect(() => { api.getDoctors().then(setDoctors); }, []);

  const linked   = doctors.filter(d => d.userId);
  const unlinked = doctors.filter(d => !d.userId);

  const filtered = doctors.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (d.name || '').toLowerCase().includes(q) ||
           (d.department || '').toLowerCase().includes(q) ||
           (d.username || '').toLowerCase().includes(q);
  });

  async function handleCreate(doctorId, body) {
    await api.createDoctorAccount(doctorId, body);
    api.getDoctors().then(setDoctors);
  }

  async function handleReset(doctorId, password) {
    await api.resetDoctorPassword(doctorId, password);
  }

  return (
    <div>
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Doctors',      val: doctors.length,   color:'var(--forest)', bg:'#f0fdf4', border:'#bbf7d0' },
          { label:'With Login Account', val: linked.length,    color:'var(--sage)',   bg:'#d8f3dc', border:'#95d5b2' },
          { label:'No Account Yet',     val: unlinked.length,  color:'#c0392b',       bg:'#fdf2f2', border:'#fadbd8' },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, border:`1.5px solid ${s.border}`, borderRadius:14, padding:'18px 22px' }}>
            <div style={{ fontSize:'2rem', fontWeight:700, color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:'.78rem', color:s.color, opacity:.8, marginTop:6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Info bar */}
      <div style={{
        background:'#fef9e7', border:'1px solid #fde68a', borderRadius:10, padding:'10px 16px',
        fontSize:'.8rem', color:'#92400e', marginBottom:20, display:'flex', alignItems:'center', gap:8,
      }}>
        <span>⚠️</span>
        <span>Default password for all accounts: <strong>doc123</strong> — advise doctors to change after first login.</span>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-head">
          <h3>Doctor Accounts ({filtered.length})</h3>
          <input
            type="search" placeholder="Search name, department, username…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding:'7px 14px', border:'1.5px solid var(--border)', borderRadius:9, fontFamily:'var(--font-ui)', fontSize:'.83rem', width:240 }}
          />
        </div>

        <div className="card-body">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
            {filtered.map(d => {
              const av = AVAIL[d.availability] || AVAIL.Available;
              const hasAccount = !!d.userId;
              const isRevealed = revealed[d.doctorId];

              return (
                <div key={d.doctorId} style={{
                  border: hasAccount ? '1.5px solid var(--border)' : '1.5px solid #fadbd8',
                  borderRadius:14, padding:20, background: hasAccount ? 'var(--white)' : '#fffbfb',
                  display:'flex', flexDirection:'column', gap:14,
                }}>
                  {/* Top row */}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                    <div style={{
                      width:52, height:52, borderRadius:'50%', flexShrink:0,
                      background: hasAccount
                        ? 'linear-gradient(135deg, var(--forest), var(--moss))'
                        : 'linear-gradient(135deg, #c0392b, #e74c3c)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontWeight:700, fontSize:'1.2rem',
                    }}>
                      {d.name.replace(/^Dr\.?\s*/i,'')[0]}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'.95rem', marginBottom:2 }}>{d.name}</div>
                      <div style={{ fontSize:'.75rem', color:'var(--muted)' }}>{d.department} · {d.specialization || 'General'}</div>
                      <div style={{ marginTop:6, display:'inline-flex', alignItems:'center', gap:5,
                        background:av.bg, borderRadius:20, padding:'3px 10px', fontSize:'.68rem', fontWeight:600, color:av.color }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:av.dot }} />
                        {d.availability}
                      </div>
                    </div>

                    <div style={{
                      fontSize:'.65rem', fontWeight:700, padding:'3px 9px', borderRadius:20,
                      background: hasAccount ? '#d8f3dc' : '#fdf2f2',
                      color: hasAccount ? '#1b4332' : '#7b241c',
                      border: `1px solid ${hasAccount ? '#95d5b2' : '#fadbd8'}`,
                      flexShrink:0,
                    }}>
                      {hasAccount ? '✓ Active' : '✕ No Account'}
                    </div>
                  </div>

                  {/* Credentials section */}
                  {hasAccount ? (
                    <div style={{ background:'var(--sand)', borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ fontSize:'.68rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
                        Login Credentials
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'.82rem' }}>
                          <span style={{ color:'var(--muted)' }}>Username</span>
                          <code style={{ fontWeight:700, background:'var(--stone)', padding:'2px 8px', borderRadius:6 }}>
                            {d.username}
                          </code>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'.82rem' }}>
                          <span style={{ color:'var(--muted)' }}>Password</span>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <code style={{ background:'var(--stone)', padding:'2px 8px', borderRadius:6 }}>
                              {isRevealed ? 'doc123' : '••••••'}
                            </code>
                            <button
                              onClick={() => setRevealed(r => ({ ...r, [d.doctorId]: !isRevealed }))}
                              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:'.8rem', padding:2 }}
                            >
                              {isRevealed ? '🙈' : '👁️'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background:'#fdf2f2', borderRadius:10, padding:'12px 14px', fontSize:'.81rem', color:'#7b241c' }}>
                      This doctor has no login account. Create one to allow them to sign in.
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display:'flex', gap:8 }}>
                    {hasAccount ? (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ flex:1, fontSize:'.78rem' }}
                        onClick={() => setResetModal(d)}
                      >
                        🔑 Reset Password
                      </button>
                    ) : (
                      <button
                        className="btn btn-sage btn-sm"
                        style={{ flex:1, fontSize:'.78rem' }}
                        onClick={() => setCreateModal(d)}
                      >
                        + Create Account
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {createModal && (
        <CreateAccountModal
          doctor={createModal}
          onClose={() => setCreateModal(null)}
          onCreate={handleCreate}
        />
      )}
      {resetModal && (
        <ResetPasswordModal
          doctor={resetModal}
          onClose={() => setResetModal(null)}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
