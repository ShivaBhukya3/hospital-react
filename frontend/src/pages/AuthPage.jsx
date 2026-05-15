import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { Icon } from '../components/UI';

const DEMOS = [
  { label: 'Admin',        u: 'admin',     p: 'admin123',    role: 'admin'        },
  { label: 'Doctor',       u: 'dr.sharma', p: 'doc123',      role: 'doctor'       },
  { label: 'Receptionist', u: 'recept1',   p: 'recept123',   role: 'receptionist' },
  { label: 'Analyst',      u: 'analyst1',  p: 'analyst123',  role: 'analyst'      },
  { label: 'Patient',      u: 'patient1',  p: 'pass123',     role: 'patient'      },
];

const FEATURES = [
  { icon: '🏥', title: 'Integrated Patient Management', desc: 'Complete lifecycle from registration to discharge.' },
  { icon: '📊', title: 'Real-Time Analytics',            desc: 'Live dashboards, peak-hour analysis, demand forecasting.' },
  { icon: '🔒', title: 'Role-Based Access Control',      desc: 'Fine-grained permissions for every staff level.' },
  { icon: '⚡', title: 'Smart Queue Orchestration',      desc: 'AI-assisted wait prediction and reallocation alerts.' },
];

const FLOAT_ICONS = [
  { icon: '🏥', x: '8%',  y: '12%', delay: '0s',    dur: '5s'  },
  { icon: '💊', x: '78%', y: '8%',  delay: '0.8s',  dur: '6s'  },
  { icon: '🩺', x: '15%', y: '68%', delay: '1.4s',  dur: '4.5s'},
  { icon: '❤️', x: '82%', y: '55%', delay: '2s',    dur: '5.5s'},
  { icon: '🔬', x: '45%', y: '20%', delay: '2.6s',  dur: '7s'  },
  { icon: '🧬', x: '65%', y: '78%', delay: '1s',    dur: '5s'  },
  { icon: '⚕️', x: '30%', y: '45%', delay: '3s',    dur: '6.5s'},
  { icon: '🩹', x: '90%', y: '30%', delay: '1.8s',  dur: '4s'  },
];

function getStrength(pass) {
  if (!pass) return { score: 0, label: '', color: 'var(--stone)' };
  let s = 0;
  if (pass.length >= 6)             s++;
  if (pass.length >= 10)            s++;
  if (/[A-Z]/.test(pass))           s++;
  if (/[0-9]/.test(pass))           s++;
  if (/[^A-Za-z0-9]/.test(pass))   s++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const colors = ['', '#c0392b', '#e67e22', '#f39c12', '#27ae60', '#1b4332'];
  return { score: s, label: labels[s] || 'Excellent', color: colors[s] || '#1b4332' };
}

export default function AuthPage() {
  const { login }  = useAuth();
  const api        = useApi();
  const [tab,      setTab]      = useState('login');
  const [form,     setForm]     = useState({ username:'', password:'', name:'', email:'', phone:'' });
  const [err,      setErr]      = useState('');
  const [busy,     setBusy]     = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const strength = getStrength(form.password);

  async function handleLogin(e) {
    e.preventDefault();
    if (!form.username || !form.password) { setErr('Please enter your username and password.'); return; }
    setErr(''); setBusy(true);
    try {
      const res = await api.login({ username: form.username, password: form.password });
      login(res.user, res.token);
    } catch {
      const demo = DEMOS.find(d => d.u === form.username && d.p === form.password);
      if (demo) {
        login({ userId: 1, username: form.username, role: demo.role }, 'demo_token');
      } else {
        setErr('Invalid credentials. Try a demo account below.');
      }
    } finally { setBusy(false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!form.name || !form.username || !form.password) {
      setErr('Name, username and password are required.'); return;
    }
    if (form.password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    setErr(''); setBusy(true);
    try {
      const res = await api.register(form);
      login(res.user, res.token);
    } catch { setErr('Registration failed. Please try again.'); }
    finally { setBusy(false); }
  }

  function fillDemo(d) {
    setForm(f => ({ ...f, username: d.u, password: d.p }));
    setTab('login');
    setErr('');
  }

  return (
    <div className="auth-screen">

      {/* ── Left brand panel ─────────────────────────────────── */}
      <div className="auth-panel-left">
        <div className="auth-dots" />

        {/* Floating background icons */}
        <div className="auth-float-icons">
          {FLOAT_ICONS.map((f, i) => (
            <div key={i} className="auth-float-icon" style={{
              left: f.x, top: f.y,
              '--delay': f.delay, '--dur': f.dur,
            }}>{f.icon}</div>
          ))}
        </div>

        {/* Brand */}
        <div className="auth-brand-icon" style={{ animation: mounted ? 'pulse-scale 3s ease-in-out infinite' : 'none' }}>
          {Icon.cross}
        </div>
        <div className="auth-brand-name">Meridian<br />Health</div>
        <div className="auth-brand-tagline">Integrated Clinical Management Platform</div>

        {/* Feature highlights */}
        <div className="auth-features">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="auth-feature" style={{
              animation: mounted ? `fadeInUp .5s ease ${0.1 + i * 0.12}s both` : 'none',
            }}>
              <div className="auth-feature-icon">{f.icon}</div>
              <div className="auth-feature-text">
                <div className="auth-feature-title">{f.title}</div>
                <div className="auth-feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="auth-badge">
          <strong>ISO 27001 · HIPAA Compliant</strong> &nbsp;·&nbsp; Enterprise Grade Security
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────── */}
      <div className="auth-panel-right">
        <div className="auth-form-header" style={{ animation: 'fadeInUp .4s ease both' }}>
          <div className="auth-form-title">
            {tab === 'login' ? 'Welcome back' : 'Create account'}
          </div>
          <div className="auth-form-sub">
            {tab === 'login'
              ? 'Sign in to your Meridian Health workspace'
              : 'Register for a new patient account'}
          </div>
        </div>

        <div className="auth-form-wrap" style={{ animation: 'fadeInUp .45s ease .06s both' }}>

          {/* Tab switcher */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => { setTab('login'); setErr(''); setShowPass(false); }}>
              Sign In
            </button>
            <button
              className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => { setTab('register'); setErr(''); setShowPass(false); }}>
              Register
            </button>
          </div>

          {err && (
            <div className="auth-error fade-in">
              <span>⚠️</span> {err}
            </div>
          )}

          {/* ── Login form ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ animation: 'fadeInUp .3s ease both' }}>
              <div className="auth-field">
                <label>Username</label>
                <input
                  value={form.username}
                  onChange={e => set('username', e.target.value)}
                  placeholder="Enter your username"
                  autoFocus autoComplete="username"
                />
              </div>
              <div className="auth-field" style={{ marginBottom: 8 }}>
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    style={{ paddingRight: 44, width: '100%' }}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--subtle)', fontSize: '.9rem', padding: 2,
                  }}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 22, textAlign: 'right' }}>
                <span style={{ fontSize: '.74rem', color: 'var(--sage)', cursor: 'pointer', fontWeight: 600 }}>
                  Forgot password?
                </span>
              </div>
              <button className="auth-submit" type="submit" disabled={busy}>
                {busy
                  ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite' }} />
                      Signing in…
                    </span>
                  : 'Sign In →'}
              </button>
            </form>
          )}

          {/* ── Register form ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ animation: 'fadeInUp .3s ease both' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="auth-field" style={{ gridColumn: '1/-1' }}>
                  <label>Full Name <span style={{ color:'var(--red)' }}>*</span></label>
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="Your full name" autoFocus />
                </div>
                <div className="auth-field">
                  <label>Username <span style={{ color:'var(--red)' }}>*</span></label>
                  <input value={form.username} onChange={e => set('username', e.target.value)}
                    placeholder="Choose username" autoComplete="username" />
                </div>
                <div className="auth-field">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="10-digit number" />
                </div>
                <div className="auth-field" style={{ gridColumn: '1/-1' }}>
                  <label>Email Address</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="you@example.com" />
                </div>
                <div className="auth-field" style={{ gridColumn: '1/-1' }}>
                  <label>Password <span style={{ color:'var(--red)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      placeholder="Minimum 6 characters"
                      autoComplete="new-password"
                      style={{ paddingRight: 44, width: '100%' }}
                    />
                    <button type="button" onClick={() => setShowPass(s => !s)} style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--subtle)', fontSize: '.9rem', padding: 2,
                    }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {/* Password strength */}
                  {form.password && (
                    <div className="auth-strength">
                      <div className="auth-strength-bar">
                        {[1,2,3,4,5].map(n => (
                          <div key={n} className="auth-strength-seg" style={{
                            background: n <= strength.score ? strength.color : 'var(--stone)',
                          }} />
                        ))}
                      </div>
                      <span className="auth-strength-label" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                background: 'var(--mint)', borderRadius: 10, padding: '10px 14px',
                fontSize: '.76rem', color: 'var(--forest)', border: '1px solid rgba(64,145,108,.25)',
                marginBottom: 20, marginTop: 4,
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <span>ℹ️</span>
                <span>New accounts are created as <strong>Patient</strong> accounts. Contact your administrator for staff access.</span>
              </div>

              <button className="auth-submit" type="submit" disabled={busy}>
                {busy
                  ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite' }} />
                      Creating account…
                    </span>
                  : 'Create Account →'}
              </button>
            </form>
          )}

          {/* Demo pills */}
          <div className="auth-divider">Quick demo access</div>
          <div className="demo-pills">
            {DEMOS.map(d => (
              <button key={d.u} className="demo-pill" onClick={() => fillDemo(d)}>
                {d.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 28, fontSize: '.72rem', color: 'var(--subtle)', textAlign: 'center', lineHeight: 1.8 }}>
            Meridian Health · Integrated Clinical Management Platform<br />
            <span>All rights reserved © {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
