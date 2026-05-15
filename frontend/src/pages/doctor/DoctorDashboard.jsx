import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { StatCard, ProgressBar, fmtDate, fmtTime } from '../../components/UI';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const api = useApi();
  const [appts, setAppts] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getAppointments().then(setAppts);
    api.getDoctors().then(setDoctors);
  }, []);

  const todayAppts  = appts.filter(a => (a.appointmentDate || '').startsWith(today));
  const activeAppts = appts.filter(a => ['Checked-In', 'In-Progress'].includes(a.status));
  const completed   = todayAppts.filter(a => a.status === 'Completed');
  const inProgress  = activeAppts.filter(a => a.status === 'In-Progress');
  const waiting     = activeAppts.filter(a => a.status === 'Checked-In');
  const completionRate = todayAppts.length
    ? Math.round((completed.length / todayAppts.length) * 100)
    : 0;

  const suffix = (user?.username || '').replace(/^dr\./i, '').toLowerCase();
  const myDoctor = doctors.find(d => d.doctorId === user?.doctorId)
    || doctors.find(d => d.userId === user?.userId)
    || (suffix && doctors.find(d => d.name?.toLowerCase().includes(suffix)))
    || null;

  // Upcoming = active now (any date) + scheduled from today onwards, sorted by date+time
  const upcomingAppts = [
    ...activeAppts,
    ...appts.filter(a => a.status === 'Scheduled' && (a.appointmentDate || '') >= today),
  ]
    .sort((a, b) => ((a.appointmentDate||'')+(a.appointmentTime||'')).localeCompare((b.appointmentDate||'')+(b.appointmentTime||'')))
    .slice(0, 5);

  const availStyle = {
    Available: { bg: 'rgba(64,145,108,.45)',  label: 'Available' },
    Busy:      { bg: 'rgba(183,119,13,.45)',  label: 'Busy' },
    'Off-duty':{ bg: 'rgba(192,57,43,.35)',   label: 'Off-duty' },
  };
  const avail = myDoctor?.availability || 'Available';

  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--forest) 0%, var(--moss) 100%)',
        borderRadius: 14, padding: '26px 28px', marginBottom: 24, color: '#fff',
        boxShadow: 'var(--shadow)',
      }}>
        <div style={{ fontSize: '.72rem', opacity: .55, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          Welcome back
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', marginBottom: 4, fontWeight: 600 }}>
          Dr. {user?.username}
        </h2>
        <div style={{ fontSize: '.82rem', opacity: .7, marginBottom: 18 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {myDoctor?.department && (
            <div style={{ background: 'rgba(255,255,255,.13)', borderRadius: 20, padding: '5px 14px', fontSize: '.78rem', fontWeight: 500 }}>
              {myDoctor.department}
            </div>
          )}
          {myDoctor?.specialization && (
            <div style={{ background: 'rgba(255,255,255,.13)', borderRadius: 20, padding: '5px 14px', fontSize: '.78rem' }}>
              {myDoctor.specialization}
            </div>
          )}
          {myDoctor && (
            <div style={{ background: availStyle[avail]?.bg, borderRadius: 20, padding: '5px 14px', fontSize: '.78rem', fontWeight: 600 }}>
              {avail}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Active Now"    value={activeAppts.length} color="forest" sub="Checked-in patients" />
        <StatCard label="In Progress"   value={inProgress.length}  color="green"  sub="In consultation" />
        <StatCard label="Checked-In"    value={waiting.length}     color="amber"  sub="Waiting for you" />
        <StatCard label="Completed Today" value={completed.length} color="blue"   sub={`${completionRate}% today`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Upcoming patients */}
        <div className="card">
          <div className="card-head">
            <h3>Active &amp; Upcoming</h3>
            <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{upcomingAppts.length} patients</span>
          </div>
          <div className="card-body">
            {upcomingAppts.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--muted)', fontSize: '.85rem' }}>
                No active or upcoming patients
              </div>
            ) : upcomingAppts.map((a, i) => (
              <div key={a.appointmentId} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 0',
                borderBottom: i < upcomingAppts.length - 1 ? '1px solid var(--stone)' : 'none',
              }}>
                <div style={{
                  width: 38, height: 38, background: 'var(--mint)', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--forest)', fontWeight: 700, fontSize: '.9rem', flexShrink: 0,
                }}>
                  {(a.patientName || '?')[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{a.patientName}</div>
                  <div style={{ fontSize: '.73rem', color: 'var(--muted)' }}>
                    {(a.appointmentDate || '').startsWith(today) ? 'Today' : a.appointmentDate}
                    {' · '}{fmtTime(a.appointmentTime)} · {a.reason || '—'}
                  </div>
                </div>
                <span className={`badge badge-${a.status}`}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance card */}
        <div className="card">
          <div className="card-head"><h3>Today's Performance</h3></div>
          <div className="card-body">
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.83rem', marginBottom: 6 }}>
                <span>Completion Rate</span>
                <strong>{completionRate}%</strong>
              </div>
              <ProgressBar
                pct={completionRate}
                color={completionRate >= 80 ? 'var(--sage)' : completionRate >= 50 ? '#d4ac0d' : 'var(--red)'}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.83rem', marginBottom: 6 }}>
                <span>Patients Seen</span>
                <strong>{completed.length} / {todayAppts.length}</strong>
              </div>
              <ProgressBar
                pct={todayAppts.length ? (completed.length / todayAppts.length) * 100 : 0}
                color="var(--blue)"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
              {[
                { label: 'Scheduled',   val: todayAppts.filter(a => a.status === 'Scheduled').length,   color: 'var(--blue)' },
                { label: 'Checked-In',  val: todayAppts.filter(a => a.status === 'Checked-In').length,  color: 'var(--amber)' },
                { label: 'In Progress', val: inProgress.length,                                          color: 'var(--moss)' },
                { label: 'Completed',   val: completed.length,                                            color: 'var(--sage)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--sand)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent completed appointments */}
      {completed.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-head"><h3>Completed Today</h3></div>
          <div className="card-body">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Time</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.map(a => (
                    <tr key={a.appointmentId}>
                      <td><strong>{a.patientName}</strong></td>
                      <td>{fmtTime(a.appointmentTime)}</td>
                      <td style={{ color: 'var(--muted)', fontSize: '.83rem' }}>{a.reason || '—'}</td>
                      <td><span className="badge badge-Completed">Completed</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
