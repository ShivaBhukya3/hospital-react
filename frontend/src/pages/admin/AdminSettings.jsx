import { useState } from 'react';
import { toast } from '../../components/UI';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const INIT_HOSPITAL = {
  name: 'Meridian Health Hospital',
  address: '14, Rajpath Avenue, Connaught Place, New Delhi — 110001',
  phone: '+91 11 2345 6789',
  email: 'admin@meridianhealth.in',
  website: 'www.meridianhealth.in',
  license: 'MH-2019-ND-0042',
  beds: '350',
  founded: '2005',
};

const INIT_HOURS = {
  Monday:    { open: '08:00', close: '20:00', active: true  },
  Tuesday:   { open: '08:00', close: '20:00', active: true  },
  Wednesday: { open: '08:00', close: '20:00', active: true  },
  Thursday:  { open: '08:00', close: '20:00', active: true  },
  Friday:    { open: '08:00', close: '20:00', active: true  },
  Saturday:  { open: '09:00', close: '17:00', active: true  },
  Sunday:    { open: '10:00', close: '14:00', active: false },
};

const INIT_THRESHOLDS = {
  waitWarn:      '20',
  waitCritical:  '40',
  maxPerDoctor:  '30',
  slotInterval:  '15',
  advanceBook:   '30',
  cancelHours:   '2',
};

const INIT_PREFS = {
  smsAlerts:       true,
  emailAlerts:     true,
  autoConfirm:     false,
  showWaitTime:    true,
  requireDeposit:  false,
  allowWalkIn:     true,
};

function Section({ title, icon, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-head">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 32, height: 32, background: 'var(--mint)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
          }}>{icon}</span>
          {title}
        </h3>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default function AdminSettings() {
  const [hospital,    setHospital]    = useState(INIT_HOSPITAL);
  const [hours,       setHours]       = useState(INIT_HOURS);
  const [thresholds,  setThresholds]  = useState(INIT_THRESHOLDS);
  const [prefs,       setPrefs]       = useState(INIT_PREFS);
  const [activeTab,   setActiveTab]   = useState('hospital');

  const setH = (k, v) => setHospital(p => ({ ...p, [k]: v }));
  const setT = (k, v) => setThresholds(p => ({ ...p, [k]: v }));
  const setP = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

  const TABS = [
    { id: 'hospital',    label: '🏥 Hospital Info'    },
    { id: 'hours',       label: '🕐 Working Hours'    },
    { id: 'thresholds',  label: '⚙️ Thresholds'       },
    { id: 'prefs',       label: '🔔 Preferences'      },
  ];

  function saveSection(section) {
    toast.success(`${section} settings saved successfully`);
  }

  const inputStyle = {
    padding: '9px 13px', border: '1.5px solid var(--border)', borderRadius: 9,
    fontFamily: 'var(--font-ui)', fontSize: '.87rem', outline: 'none',
    transition: 'border-color .2s, box-shadow .2s', width: '100%',
    color: 'var(--ink)', background: 'var(--white)',
  };

  return (
    <div className="page-fade">
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 24,
        background: 'var(--white)', padding: 6, borderRadius: 14,
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
        width: 'fit-content',
      }}>
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: '.82rem', fontWeight: 600,
              background: activeTab === t.id ? 'var(--forest)' : 'transparent',
              color:      activeTab === t.id ? '#fff' : 'var(--muted)',
              transition: 'all .2s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Hospital Info */}
      {activeTab === 'hospital' && (
        <Section title="Hospital Information" icon="🏥">
          <div className="form-grid">
            <div className="field form-full">
              <label>Hospital Name</label>
              <input style={inputStyle} value={hospital.name} onChange={e => setH('name', e.target.value)} />
            </div>
            <div className="field form-full">
              <label>Address</label>
              <input style={inputStyle} value={hospital.address} onChange={e => setH('address', e.target.value)} />
            </div>
            <div className="field">
              <label>Phone Number</label>
              <input style={inputStyle} value={hospital.phone} onChange={e => setH('phone', e.target.value)} />
            </div>
            <div className="field">
              <label>Email Address</label>
              <input type="email" style={inputStyle} value={hospital.email} onChange={e => setH('email', e.target.value)} />
            </div>
            <div className="field">
              <label>Website</label>
              <input style={inputStyle} value={hospital.website} onChange={e => setH('website', e.target.value)} />
            </div>
            <div className="field">
              <label>License Number</label>
              <input style={inputStyle} value={hospital.license} onChange={e => setH('license', e.target.value)} />
            </div>
            <div className="field">
              <label>Total Beds</label>
              <input type="number" style={inputStyle} value={hospital.beds} onChange={e => setH('beds', e.target.value)} />
            </div>
            <div className="field">
              <label>Founded Year</label>
              <input type="number" style={inputStyle} value={hospital.founded} onChange={e => setH('founded', e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-sage" onClick={() => saveSection('Hospital Info')}>Save Changes</button>
          </div>
        </Section>
      )}

      {/* Working Hours */}
      {activeTab === 'hours' && (
        <Section title="Working Hours" icon="🕐">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DAYS.map(day => {
              const h = hours[day];
              return (
                <div key={day} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 16px', borderRadius: 12,
                  background: h.active ? 'var(--white)' : 'var(--sand)',
                  border: `1.5px solid ${h.active ? 'var(--border)' : 'var(--stone)'}`,
                }}>
                  <div style={{ width: 100, fontWeight: 600, fontSize: '.88rem' }}>{day}</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <div
                      onClick={() => setHours(p => ({ ...p, [day]: { ...p[day], active: !p[day].active } }))}
                      style={{
                        width: 40, height: 22, borderRadius: 99, cursor: 'pointer',
                        background: h.active ? 'var(--sage)' : 'var(--border)',
                        position: 'relative', transition: 'background .2s',
                      }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3,
                        left: h.active ? 21 : 3,
                        transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)',
                      }} />
                    </div>
                    <span style={{ fontSize: '.78rem', color: h.active ? 'var(--sage)' : 'var(--muted)', fontWeight: 600 }}>
                      {h.active ? 'Open' : 'Closed'}
                    </span>
                  </label>
                  {h.active && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '.76rem', color: 'var(--muted)' }}>From</span>
                        <input type="time" value={h.open}
                          onChange={e => setHours(p => ({ ...p, [day]: { ...p[day], open: e.target.value } }))}
                          style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '.76rem', color: 'var(--muted)' }}>To</span>
                        <input type="time" value={h.close}
                          onChange={e => setHours(p => ({ ...p, [day]: { ...p[day], close: e.target.value } }))}
                          style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }} />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="form-actions" style={{ marginTop: 20 }}>
            <button className="btn btn-sage" onClick={() => saveSection('Working Hours')}>Save Hours</button>
          </div>
        </Section>
      )}

      {/* Thresholds */}
      {activeTab === 'thresholds' && (
        <Section title="System Thresholds & Limits" icon="⚙️">
          <div className="form-grid">
            {[
              { key: 'waitWarn',     label: 'Wait Time Warning (minutes)',    desc: 'Alert when patient wait exceeds this' },
              { key: 'waitCritical', label: 'Wait Time Critical (minutes)',   desc: 'Trigger reallocation alert' },
              { key: 'maxPerDoctor', label: 'Max Patients per Doctor / Day',  desc: 'Hard cap on daily appointments' },
              { key: 'slotInterval', label: 'Appointment Slot Duration (min)',desc: '15, 20, or 30 minutes' },
              { key: 'advanceBook',  label: 'Advance Booking Limit (days)',   desc: 'Max days ahead a patient can book' },
              { key: 'cancelHours',  label: 'Cancellation Notice (hours)',    desc: 'Min hours before to cancel' },
            ].map(f => (
              <div key={f.key} className="field">
                <label>{f.label}</label>
                <input type="number" style={inputStyle} value={thresholds[f.key]}
                  onChange={e => setT(f.key, e.target.value)} />
                <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 3 }}>{f.desc}</div>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn btn-sage" onClick={() => saveSection('Thresholds')}>Save Thresholds</button>
          </div>
        </Section>
      )}

      {/* Preferences */}
      {activeTab === 'prefs' && (
        <Section title="System Preferences" icon="🔔">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { key: 'smsAlerts',       label: 'SMS Alerts',              desc: 'Send SMS notifications to patients for appointments' },
              { key: 'emailAlerts',     label: 'Email Notifications',     desc: 'Email reminders 24hrs before appointments' },
              { key: 'autoConfirm',     label: 'Auto-Confirm Bookings',   desc: 'Confirm bookings immediately without review' },
              { key: 'showWaitTime',    label: 'Display Wait Times',      desc: 'Show estimated wait times to patients in queue' },
              { key: 'requireDeposit', label: 'Require Deposit',         desc: 'Collect advance deposit for specialist consultations' },
              { key: 'allowWalkIn',    label: 'Allow Walk-In Registration', desc: 'Permit receptionist to register walk-in patients' },
            ].map((pref, i, arr) => (
              <div key={pref.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 4px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--stone)' : 'none',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{pref.label}</div>
                  <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginTop: 3 }}>{pref.desc}</div>
                </div>
                <div
                  onClick={() => setP(pref.key, !prefs[pref.key])}
                  style={{
                    width: 48, height: 26, borderRadius: 99, cursor: 'pointer', flexShrink: 0,
                    background: prefs[pref.key] ? 'var(--sage)' : 'var(--border)',
                    position: 'relative', transition: 'background .2s',
                  }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    left: prefs[pref.key] ? 25 : 3,
                    transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)',
                  }} />
                </div>
              </div>
            ))}
          </div>
          <div className="form-actions" style={{ marginTop: 20 }}>
            <button className="btn btn-sage" onClick={() => saveSection('Preferences')}>Save Preferences</button>
          </div>
        </Section>
      )}
    </div>
  );
}
