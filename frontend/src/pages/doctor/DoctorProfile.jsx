import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { toast, ProgressBar } from '../../components/UI';

const AVAIL_STYLE = {
  Available: { bg: '#d8f3dc', color: '#1b4332', border: '#95d5b2', dot: '#40916c' },
  Busy:      { bg: '#fef9e7', color: '#7d6608', border: '#f9e79f', dot: '#b7770d' },
  'Off-duty':{ bg: '#fdf2f2', color: '#7b241c', border: '#fadbd8', dot: '#c0392b' },
};

export default function DoctorProfile() {
  const { user } = useAuth();
  const api = useApi();
  const [doctors, setDoctors]       = useState([]);
  const [appts, setAppts]           = useState([]);
  const [availability, setAvail]    = useState('Available');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    api.getDoctors().then(d => {
      setDoctors(d);
      const suffix = (user?.username || '').replace(/^dr\./i, '').toLowerCase();
      const mine = d.find(doc => doc.doctorId === user?.doctorId)
        || d.find(doc => doc.userId === user?.userId)
        || (suffix && d.find(doc => doc.name?.toLowerCase().includes(suffix)))
        || null;
      if (mine) setAvail(mine.availability || 'Available');
    });
    api.getAppointments().then(setAppts);
  }, []);

  const suffix = (user?.username || '').replace(/^dr\./i, '').toLowerCase();
  const myDoctor = doctors.find(d => d.doctorId === user?.doctorId)
    || doctors.find(d => d.userId === user?.userId)
    || (suffix && doctors.find(d => d.name?.toLowerCase().includes(suffix)))
    || null;

  // Computed stats from appointment history
  const today = new Date().toISOString().split('T')[0];
  const todayAppts     = appts.filter(a => (a.appointmentDate || '').startsWith(today));
  const allCompleted   = appts.filter(a => a.status === 'Completed');
  const allCancelled   = appts.filter(a => a.status === 'Cancelled');
  const uniquePatients = [...new Set(appts.map(a => a.patientId))].length;
  const completionRate = appts.length
    ? Math.round((allCompleted.length / appts.length) * 100)
    : 0;

  // Last 7 days workload
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    return { date: d, count: appts.filter(a => (a.appointmentDate || '').startsWith(d) && a.status === 'Completed').length };
  }).reverse();
  const maxDay = Math.max(...last7.map(d => d.count), 1);

  async function updateAvailability(val) {
    setAvail(val);
    setSaving(true);
    try {
      if (myDoctor) await api.updateAvailability(myDoctor.doctorId, val);
      toast.success('Availability updated');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update availability');
    }
    setSaving(false);
  }

  const avStyle = AVAIL_STYLE[availability] || AVAIL_STYLE.Available;

  return (
    <div>
      {/* Profile card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            {/* Avatar */}
            <div style={{
              width: 88, height: 88, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--forest) 0%, var(--moss) 100%)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700,
              boxShadow: 'var(--shadow)',
            }}>
              {(user?.username || 'D')[0].toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, marginBottom: 4 }}>
                Dr. {user?.username}
              </h2>
              {myDoctor && (
                <div style={{ fontSize: '.88rem', color: 'var(--muted)', marginBottom: 16 }}>
                  {myDoctor.specialization} &nbsp;·&nbsp; {myDoctor.department}
                </div>
              )}

              {/* Availability selector */}
              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: '.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                  Availability Status
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Available', 'Busy', 'Off-duty'].map(av => {
                    const s = AVAIL_STYLE[av];
                    const active = availability === av;
                    return (
                      <button
                        key={av}
                        onClick={() => updateAvailability(av)}
                        disabled={saving}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '7px 16px', borderRadius: 20, fontSize: '.82rem', fontWeight: 600,
                          cursor: saving ? 'wait' : 'pointer', transition: '.15s',
                          border: `1.5px solid ${active ? s.border : 'var(--border)'}`,
                          background: active ? s.bg : 'transparent',
                          color: active ? s.color : 'var(--muted)',
                          opacity: saving && !active ? .5 : 1,
                        }}
                      >
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: active ? s.dot : 'var(--border)',
                          transition: '.15s',
                        }} />
                        {av}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Current status pill */}
            <div style={{
              background: avStyle.bg, border: `1.5px solid ${avStyle.border}`,
              borderRadius: 12, padding: '10px 18px', textAlign: 'center', flexShrink: 0,
            }}>
              <div style={{ fontSize: '.68rem', color: avStyle.color, opacity: .7, marginBottom: 2 }}>STATUS</div>
              <div style={{ fontSize: '.9rem', fontWeight: 700, color: avStyle.color }}>{availability}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Consultations', val: allCompleted.length,  color: 'forest', sub: 'All time' },
          { label: 'Unique Patients',     val: uniquePatients,        color: 'green',  sub: 'Patients treated' },
          { label: 'Today\'s Load',       val: todayAppts.length,    color: 'amber',  sub: 'Appointments today' },
          { label: 'Max Capacity',        val: myDoctor?.maxPatients || '—', color: 'blue', sub: 'Per day limit' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.val}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Professional details */}
        {myDoctor && (
          <div className="card">
            <div className="card-head"><h3>Professional Details</h3></div>
            <div className="card-body">
              {[
                { label: 'Full Name',        val: myDoctor.name },
                { label: 'Department',       val: myDoctor.department },
                { label: 'Specialization',   val: myDoctor.specialization },
                { label: 'Max Patients/Day', val: myDoctor.maxPatients || '—' },
                { label: 'Doctor ID',        val: `#${myDoctor.doctorId}` },
                { label: 'Current Status',   val: availability },
              ].map(f => (
                <div key={f.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 0', borderBottom: '1px solid var(--stone)', fontSize: '.85rem',
                }}>
                  <span style={{ color: 'var(--muted)' }}>{f.label}</span>
                  <strong>{f.val}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance overview */}
        <div className="card">
          <div className="card-head"><h3>Performance Overview</h3></div>
          <div className="card-body">
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.83rem', marginBottom: 6 }}>
                <span>Overall Completion Rate</span>
                <strong>{completionRate}%</strong>
              </div>
              <ProgressBar
                pct={completionRate}
                color={completionRate >= 80 ? 'var(--sage)' : completionRate >= 50 ? '#d4ac0d' : 'var(--red)'}
              />
            </div>

            {[
              { label: 'Completed',  val: allCompleted.length,  pct: appts.length ? (allCompleted.length / appts.length) * 100 : 0, color: 'var(--sage)' },
              { label: 'Cancelled',  val: allCancelled.length,  pct: appts.length ? (allCancelled.length / appts.length) * 100 : 0, color: 'var(--red)' },
            ].map(s => (
              <div key={s.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: 5 }}>
                  <span style={{ color: 'var(--muted)' }}>{s.label}</span>
                  <span><strong>{s.val}</strong> <span style={{ color: 'var(--muted)' }}>({Math.round(s.pct)}%)</span></span>
                </div>
                <ProgressBar pct={s.pct} color={s.color} />
              </div>
            ))}

            {/* Weekly sparkline */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 10 }}>Completions — Last 7 Days</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 52 }}>
                {last7.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: '100%', borderRadius: 4,
                      height: `${Math.max((d.count / maxDay) * 44, d.count ? 6 : 2)}px`,
                      background: d.count ? 'var(--sage)' : 'var(--stone)',
                      transition: 'height .3s',
                    }} />
                    <div style={{ fontSize: '.6rem', color: 'var(--muted)' }}>
                      {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'narrow' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
