// pages/admin/AdminDashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { useApi } from '../../hooks/useApi';
import { useSocket } from '../../hooks/useSocket';
import { StatCard, ProgressBar, toast, fmtDate, fmtTime } from '../../components/UI';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Tooltip, Legend, Filler);

const PALETTE   = ['#1b4332','#2d6a4f','#40916c','#52b788','#b7770d','#c0392b','#1a5276','#7d3c98','#117a65','#784212'];
const CHART_OPTS = {
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: '#f0ebe3' } },
    x: { grid: { display: false } },
  },
  animation: { duration: 600 },
};

const STATUS_BADGE = {
  Scheduled:    { bg: '#eaf4fb', color: '#1a5276' },
  'Checked-In': { bg: '#fef9e7', color: '#7d6608' },
  'In-Progress':{ bg: '#d8f3dc', color: '#1b4332' },
  Completed:    { bg: '#d8f3dc', color: '#1b4332' },
  Cancelled:    { bg: '#fdf2f2', color: '#7b241c' },
};

const AVAIL_DOT = { Available: '#40916c', Busy: '#b7770d', 'Off-duty': '#c0392b' };
const AVAIL_BG  = { Available: '#d8f3dc', Busy: '#fef9e7', 'Off-duty': '#fdf2f2' };

function LiveCount({ value, color }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (value === prev.current) return;
    const diff = value - prev.current;
    const steps = 20;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplay(Math.round(prev.current + (diff * i) / steps));
      if (i >= steps) { clearInterval(id); prev.current = value; }
    }, 20);
    return () => clearInterval(id);
  }, [value]);
  return <span style={{ color }}>{display}</span>;
}

export default function AdminDashboard() {
  const api = useApi();
  const [summary,    setSummary]    = useState({});
  const [deptLoad,   setDeptLoad]   = useState([]);
  const [docLoad,    setDocLoad]    = useState([]);
  const [appts,      setAppts]      = useState([]);
  const [doctors,    setDoctors]    = useState([]);
  const [activity,   setActivity]   = useState([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getAnalyticsSummary().then(setSummary);
    api.getDeptLoad().then(setDeptLoad);
    api.getDoctorLoad().then(setDocLoad);
    api.getAppointments().then(setAppts);
    api.getDoctors().then(setDoctors);
  }, []);

  function addActivity(icon, text, color) {
    const entry = { id: Date.now(), icon, text, color, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
    setActivity(prev => [entry, ...prev].slice(0, 10));
  }

  useSocket('appointment:new', (a) => {
    setAppts(prev => prev.some(x => x.appointmentId === a.appointmentId) ? prev : [...prev, a]);
    api.getAnalyticsSummary().then(setSummary);
    api.getDeptLoad().then(setDeptLoad);
    addActivity('📅', `New appointment — ${a.patientName || 'Patient'} with ${a.doctorName || 'Doctor'}`, '#1a5276');
  });

  useSocket('appointment:updated', ({ appointmentId, status }) => {
    setAppts(prev => prev.map(a => a.appointmentId === appointmentId ? { ...a, status } : a));
    api.getAnalyticsSummary().then(setSummary);
    const icons = { Completed: '✅', Cancelled: '❌', 'Checked-In': '🏥', 'In-Progress': '⚕️' };
    const colors = { Completed: '#1b4332', Cancelled: '#7b241c', 'Checked-In': '#7d6608', 'In-Progress': '#1b4332' };
    addActivity(icons[status] || '🔄', `Appointment #${appointmentId} → ${status}`, colors[status] || 'var(--forest)');
  });

  useSocket('doctor:availability', ({ doctorId, availability }) => {
    setDoctors(prev => prev.map(d => d.doctorId === doctorId ? { ...d, availability } : d));
    const doc = doctors.find(d => d.doctorId === doctorId);
    addActivity('👨‍⚕️', `${doc?.name || 'Doctor'} is now ${availability}`, AVAIL_DOT[availability] || 'var(--muted)');
  });

  const todayAppts   = appts.filter(a => (a.appointmentDate || '').startsWith(today));
  const statusCounts = ['Scheduled','Checked-In','In-Progress','Completed','Cancelled']
    .map(s => appts.filter(a => a.status === s).length);
  const completionRate = appts.length ? Math.round((appts.filter(a => a.status === 'Completed').length / appts.length) * 100) : 0;
  const recentAppts  = [...appts].sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate)).slice(0, 8);
  const byAvail      = av => doctors.filter(d => d.availability === av).length;

  async function updateAvail(id, val) {
    try {
      await api.updateAvailability(id, val);
      setDoctors(d => d.map(x => x.doctorId === id ? { ...x, availability: val } : x));
      toast.success('Availability updated');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update');
    }
  }

  return (
    <div>
      {summary.avgWaitMin > 30 && (
        <div className="alert-bar">
          ⚠️ <strong>High wait times</strong> — avg {summary.avgWaitMin}m. Consider reallocating doctors.
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Total Appointments" value={<LiveCount value={summary.total || appts.length} color="var(--forest)" />} color="forest" />
        <StatCard label="Today"              value={<LiveCount value={summary.today || todayAppts.length} color="var(--sage)" />} color="green" />
        <StatCard label="Completed"          value={<LiveCount value={summary.completed || statusCounts[3]} color="var(--blue)" />} color="blue" />
        <StatCard label="Avg Wait"           value={`${summary.avgWaitMin || '—'}m`} color="amber" />
        <StatCard label="Cancelled"          value={<LiveCount value={summary.cancelled || statusCounts[4]} color="var(--red)" />} color="red" />
      </div>

      {/* System health bars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Completion Rate',   val: `${completionRate}%`, pct: completionRate, color: completionRate >= 70 ? 'var(--sage)' : '#d4ac0d' },
          { label: 'Available Doctors', val: `${byAvail('Available')} / ${doctors.length}`, pct: doctors.length ? (byAvail('Available')/doctors.length)*100 : 0, color: 'var(--blue)' },
          { label: 'Busy Doctors',      val: byAvail('Busy'),     pct: doctors.length ? (byAvail('Busy')/doctors.length)*100 : 0,     color: 'var(--amber)' },
          { label: 'Off-Duty',          val: byAvail('Off-duty'), pct: doctors.length ? (byAvail('Off-duty')/doctors.length)*100 : 0, color: 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:12, padding:'14px 18px', boxShadow:'var(--shadow-sm)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:'.78rem', color:'var(--muted)' }}>{s.label}</span>
              <strong style={{ fontSize:'.9rem', color:'var(--forest)' }}>{s.val}</strong>
            </div>
            <ProgressBar pct={s.pct} color={s.color} />
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="charts-grid" style={{ marginBottom: 20 }}>
        <div className="chart-card">
          <h4>Status Distribution</h4>
          <Doughnut
            data={{
              labels: ['Scheduled','Checked-In','In-Progress','Completed','Cancelled'],
              datasets: [{ data: statusCounts, backgroundColor: PALETTE, borderWidth: 2, borderColor:'#fff' }],
            }}
            options={{ plugins: { legend: { position:'bottom', labels:{ padding:12, font:{ size:11 } } } }, cutout:'65%' }}
          />
        </div>
        <div className="chart-card">
          <h4>Department Load (Active)</h4>
          <Bar
            data={{
              labels: deptLoad.map(d => d.department),
              datasets: [{ label:'Appointments', data: deptLoad.map(d => d.total), backgroundColor: PALETTE, borderRadius: 6 }],
            }}
            options={{ ...CHART_OPTS, plugins: { legend: { display: false } } }}
          />
        </div>
      </div>

      {/* Charts row 2 — Doctor Load + Live Activity */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16, marginBottom:20 }}>
        <div className="chart-card">
          <h4>Doctor Load Today</h4>
          {docLoad.length === 0 ? (
            <div style={{ padding:'40px 0', textAlign:'center', color:'var(--muted)', fontSize:'.85rem' }}>No appointment data yet</div>
          ) : (
            <Bar
              data={{
                labels: docLoad.slice(0,8).map(d => d.doctor.replace('Dr. ','')),
                datasets: [
                  { label:'Today', data: docLoad.slice(0,8).map(d => d.today || 0), backgroundColor:'#40916c', borderRadius:6 },
                  { label:'Total', data: docLoad.slice(0,8).map(d => d.total || 0), backgroundColor:'#aed6f1', borderRadius:6 },
                ],
              }}
              options={{
                ...CHART_OPTS,
                plugins: { legend: { display:true, position:'top', labels:{ font:{ size:11 }, padding:12 } } },
              }}
            />
          )}
        </div>

        {/* Live Activity Feed */}
        <div className="card" style={{ margin:0 }}>
          <div className="card-head" style={{ paddingBottom:10 }}>
            <h3 style={{ fontSize:'.9rem' }}>Live Activity</h3>
            <motion.div animate={{ opacity:[1,.3,1] }} transition={{ repeat:Infinity, duration:1.8 }}
              style={{ width:7, height:7, borderRadius:'50%', background:'var(--sage)' }} />
          </div>
          <div className="card-body" style={{ padding:0, maxHeight:320, overflowY:'auto' }}>
            <AnimatePresence initial={false}>
              {activity.length === 0 ? (
                <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--muted)', fontSize:'.82rem' }}>
                  Waiting for activity…
                </div>
              ) : activity.map(ev => (
                <motion.div key={ev.id}
                  initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, height:0 }}
                  transition={{ duration:.25 }}
                  style={{ display:'flex', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--stone)', alignItems:'flex-start' }}>
                  <span style={{ fontSize:'1rem', flexShrink:0, marginTop:1 }}>{ev.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'.78rem', color:ev.color, fontWeight:500, lineHeight:1.4 }}>{ev.text}</div>
                    <div style={{ fontSize:'.68rem', color:'var(--muted)', marginTop:2 }}>{ev.time}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-head">
          <h3>Recent Appointments</h3>
          <span style={{ fontSize:'.8rem', color:'var(--muted)' }}>Latest {recentAppts.length} records</span>
        </div>
        <div className="card-body">
          {recentAppts.length === 0 ? (
            <div style={{ padding:32, textAlign:'center', color:'var(--muted)' }}>No appointments yet</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Date & Time</th><th>Patient</th><th>Doctor</th><th>Department</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recentAppts.map(a => {
                    const sb = STATUS_BADGE[a.status] || {};
                    return (
                      <tr key={a.appointmentId}>
                        <td>
                          <strong style={{ fontSize:'.86rem' }}>{fmtDate(a.appointmentDate)}</strong>
                          <div style={{ fontSize:'.73rem', color:'var(--muted)' }}>{fmtTime(a.appointmentTime)}</div>
                        </td>
                        <td style={{ fontWeight:600 }}>{a.patientName || '—'}</td>
                        <td style={{ fontSize:'.85rem' }}>{a.doctorName || '—'}</td>
                        <td style={{ fontSize:'.83rem', color:'var(--muted)' }}>{a.department || '—'}</td>
                        <td>
                          <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:20, fontSize:'.72rem', fontWeight:600, background:sb.bg, color:sb.color }}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Doctor Availability Panel */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div className="card" style={{ margin:0 }}>
          <div className="card-head"><h3>Doctor Availability</h3></div>
          <div className="card-body" style={{ padding:0, maxHeight:340, overflowY:'auto' }}>
            {doctors.map(d => (
              <div key={d.doctorId} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:'1px solid var(--stone)' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background: AVAIL_BG[d.availability] || 'var(--mint)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'.85rem', flexShrink:0, color:'var(--forest)' }}>
                  {d.name.split(' ').pop()[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:'.84rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.name}</div>
                  <div style={{ fontSize:'.71rem', color:'var(--muted)' }}>{d.specialization || d.department}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background: AVAIL_DOT[d.availability] || '#ccc' }} />
                  <select value={d.availability || 'Available'} onChange={e => updateAvail(d.doctorId, e.target.value)}
                    style={{ padding:'4px 8px', border:'1.5px solid var(--border)', borderRadius:7, fontSize:'.78rem', fontFamily:'var(--font-ui)', background:'var(--white)' }}>
                    <option>Available</option><option>Busy</option><option>Off-duty</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Capacity */}
        <div className="card" style={{ margin:0 }}>
          <div className="card-head"><h3>Department Capacity</h3></div>
          <div className="card-body" style={{ maxHeight:340, overflowY:'auto' }}>
            {(deptLoad.length ? deptLoad : []).map(d => {
              const pct = Math.min((d.total || 0) * 5, 100);
              return (
                <div key={d.department} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:'.8rem', fontWeight:600 }}>{d.department}</span>
                    <span style={{ fontSize:'.75rem', color:'var(--muted)' }}>{d.total} appts · {d.avgWait ? `${d.avgWait}m wait` : '—'}</span>
                  </div>
                  <ProgressBar pct={pct} color={pct > 80 ? 'var(--red)' : pct > 60 ? '#d4ac0d' : 'var(--sage)'} />
                </div>
              );
            })}
            {deptLoad.length === 0 && <div style={{ color:'var(--muted)', fontSize:'.84rem', textAlign:'center', paddingTop:40 }}>Book appointments to see capacity</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Analytics Dashboard ─────────────────────────────────────────
export function AnalyticsDashboard() {
  const api = useApi();
  const [daily,    setDaily]    = useState([]);
  const [peak,     setPeak]     = useState([]);
  const [dept,     setDept]     = useState([]);
  const [docLoad,  setDocLoad]  = useState([]);
  const [forecast, setForecast] = useState([]);
  const [summary,  setSummary]  = useState({});
  const [waitData, setWaitData] = useState([]);

  useEffect(() => {
    api.getAnalyticsSummary().then(setSummary);
    api.getAnalyticsDaily(14).then(setDaily);
    api.getPeakHours().then(setPeak);
    api.getDeptLoad().then(setDept);
    api.getDoctorLoad().then(setDocLoad);
    api.getForecast().then(setForecast);
    api.getWaitTimes(14).then(setWaitData);
  }, []);

  // Refresh on live events
  useSocket('appointment:new',     () => { api.getAnalyticsSummary().then(setSummary); api.getDeptLoad().then(setDept); api.getAnalyticsDaily(14).then(setDaily); });
  useSocket('appointment:updated', () => { api.getAnalyticsSummary().then(setSummary); });

  const dailyLabels = daily.map(d => new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { month:'short', day:'numeric' }));
  const dailyTotal  = daily.map(d => d.total);
  const dailyComp   = daily.map(d => d.completed);

  const peakLabels  = peak.map(p => `${p.hour}:00`);
  const peakData    = peak.map(p => p.count);

  const forecastLabels = forecast.map(f => new Date(f.date + 'T00:00:00').toLocaleDateString('en-IN', { month:'short', day:'numeric' }));
  const forecastActual = forecast.map(f => f.count);
  const forecastAvg    = forecast.map(f => f.movingAvg);

  const waitLabels = waitData.map(w => new Date(w.date + 'T00:00:00').toLocaleDateString('en-IN', { month:'short', day:'numeric' }));
  const waitAvg    = waitData.map(w => w.avgWait);
  const waitMax    = waitData.map(w => w.maxWait);

  const completionRate = summary.total ? Math.round((summary.completed || 0) / summary.total * 100) : 0;
  const peakHour = peak.length ? `${peak.reduce((a,b) => a.count > b.count ? a : b).hour}:00` : '10:00';

  function exportCSV() {
    api.getExportData().then(rows => {
      if (!rows.length) { toast.error('No data to export'); return; }
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
      a.download = 'hospital_report.csv';
      a.click();
      toast.success('CSV exported!');
    }).catch(() => toast.error('Export failed'));
  }

  return (
    <div>
      {/* KPI strip */}
      <div className="stats-grid" style={{ marginBottom:20 }}>
        <StatCard label="Total Appointments" value={summary.total || '—'}          color="forest" />
        <StatCard label="Completion Rate"    value={`${completionRate}%`}            color="green" />
        <StatCard label="Avg Wait Time"      value={`${summary.avgWaitMin || '—'}m`} color="amber" />
        <StatCard label="Avg Duration"       value={`${summary.avgDurationMin || '—'}m`} color="blue" />
        <StatCard label="Peak Hour"          value={peakHour}                        color="forest" sub="Most appointments" />
      </div>

      {/* 14-day trend + Peak Hours */}
      <div className="charts-grid" style={{ marginBottom:20 }}>
        <div className="chart-card">
          <h4>14-Day Appointment Trend</h4>
          <Line
            data={{
              labels: dailyLabels,
              datasets: [
                { label:'Total',     data: dailyTotal, borderColor:'#2d6a4f', backgroundColor:'rgba(45,106,79,.1)', fill:true, tension:.4, pointRadius:4 },
                { label:'Completed', data: dailyComp,  borderColor:'#40916c', backgroundColor:'rgba(64,145,108,.0)', fill:false, tension:.4, pointRadius:3, borderDash:[4,4] },
              ],
            }}
            options={{ ...CHART_OPTS, plugins: { legend: { display:true, position:'top', labels:{ font:{ size:11 }, padding:12 } } } }}
          />
        </div>
        <div className="chart-card">
          <h4>Peak Hours (Volume)</h4>
          <Bar
            data={{
              labels: peakLabels,
              datasets: [{ label:'Count', data: peakData, backgroundColor: peakData.map(v => v >= 20 ? '#c0392b' : v >= 12 ? '#d4ac0d' : '#40916c'), borderRadius:6 }],
            }}
            options={CHART_OPTS}
          />
        </div>
      </div>

      {/* Forecast + Wait Time */}
      <div className="charts-grid" style={{ marginBottom:20 }}>
        <div className="chart-card">
          <h4>Demand Forecast (7-Day Moving Avg)</h4>
          <Line
            data={{
              labels: forecastLabels,
              datasets: [
                { label:'Actual',      data: forecastActual, borderColor:'#52b788', backgroundColor:'rgba(82,183,136,.08)', fill:true, tension:.4, pointRadius:3 },
                { label:'7-Day Avg',   data: forecastAvg,    borderColor:'#b7770d', backgroundColor:'transparent', tension:.4, pointRadius:0, borderWidth:2.5 },
              ],
            }}
            options={{ ...CHART_OPTS, plugins: { legend: { display:true, position:'top', labels:{ font:{ size:11 }, padding:12 } } } }}
          />
        </div>
        <div className="chart-card">
          <h4>Wait Time Trend (Min)</h4>
          <Line
            data={{
              labels: waitLabels,
              datasets: [
                { label:'Avg Wait', data: waitAvg, borderColor:'#b7770d', backgroundColor:'rgba(183,119,13,.1)', fill:true, tension:.4, pointRadius:4 },
                { label:'Max Wait', data: waitMax, borderColor:'#c0392b', backgroundColor:'transparent', tension:.4, pointRadius:3, borderDash:[5,4] },
              ],
            }}
            options={{ ...CHART_OPTS, plugins: { legend: { display:true, position:'top', labels:{ font:{ size:11 }, padding:12 } } } }}
          />
        </div>
      </div>

      {/* Dept load + Doctor load */}
      <div className="charts-grid" style={{ marginBottom:20 }}>
        <div className="chart-card">
          <h4>Department Load</h4>
          <Bar
            data={{
              labels: dept.map(d => d.department),
              datasets: [{ label:'Appointments', data: dept.map(d => d.total), backgroundColor: PALETTE, borderRadius:6 }],
            }}
            options={{ ...CHART_OPTS, indexAxis:'y' }}
          />
        </div>
        <div className="chart-card">
          <h4>Doctor Performance (Today vs Total)</h4>
          <Bar
            data={{
              labels: docLoad.slice(0,8).map(d => d.doctor.replace('Dr. ','')),
              datasets: [
                { label:'Today', data: docLoad.slice(0,8).map(d => d.today || 0), backgroundColor:'#2d6a4f', borderRadius:6 },
                { label:'Total', data: docLoad.slice(0,8).map(d => d.total || 0), backgroundColor:'#aed6f1', borderRadius:6 },
              ],
            }}
            options={{ ...CHART_OPTS, plugins: { legend: { display:true, position:'top', labels:{ font:{ size:11 }, padding:12 } } } }}
          />
        </div>
      </div>

      {/* Doctor availability table */}
      {docLoad.length > 0 && (
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-head"><h3>Doctor Workload Breakdown</h3></div>
          <div className="card-body">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Doctor</th><th>Department</th><th>Status</th><th>Today</th><th>Total</th><th>Avg Wait</th></tr>
                </thead>
                <tbody>
                  {docLoad.map(d => (
                    <tr key={d.doctor}>
                      <td style={{ fontWeight:600 }}>{d.doctor}</td>
                      <td style={{ fontSize:'.82rem', color:'var(--muted)' }}>{d.department}</td>
                      <td>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:'.71rem', fontWeight:600, background: AVAIL_BG[d.availability] || 'var(--stone)', color: AVAIL_DOT[d.availability] || 'var(--muted)' }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', background: AVAIL_DOT[d.availability] || '#ccc', display:'inline-block' }} />
                          {d.availability}
                        </span>
                      </td>
                      <td style={{ fontWeight:700, color:'var(--forest)' }}>{d.today || 0}</td>
                      <td>{d.total}</td>
                      <td style={{ color: d.avgWait > 25 ? 'var(--red)' : 'var(--sage)' }}>{d.avgWait ? `${d.avgWait}m` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Export */}
      <div className="card">
        <div className="card-head"><h3>Export Reports</h3></div>
        <div className="card-body">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
            {[
              { name:'Appointment Report', icon:'📅', desc:'All records with patient & doctor details' },
              { name:'Wait Time Report',   icon:'⏱',  desc:'Consultation & wait time analytics' },
              { name:'Dept Summary',       icon:'🏥',  desc:'Patient volume per department' },
              { name:'Peak Hours Report',  icon:'📊',  desc:'Hour-by-hour distribution' },
            ].map(r => (
              <div key={r.name} style={{ padding:18, border:'1.5px solid var(--border)', borderRadius:14, background:'var(--cream)' }}>
                <div style={{ fontSize:'1.6rem', marginBottom:8 }}>{r.icon}</div>
                <div style={{ fontWeight:700, color:'var(--forest)', marginBottom:4, fontSize:'.88rem' }}>{r.name}</div>
                <div style={{ fontSize:'.74rem', color:'var(--muted)', marginBottom:14 }}>{r.desc}</div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-sage btn-sm" onClick={exportCSV}>↓ CSV</button>
                  <button className="btn btn-outline btn-sm" onClick={() => toast.info('Power BI integration ready')}>Power BI</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
