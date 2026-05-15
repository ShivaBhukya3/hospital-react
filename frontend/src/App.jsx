// App.jsx – Root component with role-based routing
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/UI';
import AuthPage from './pages/AuthPage';
import Sidebar from './components/Sidebar';
import AnimatedPage from './components/AnimatedPage';

// Patient
import PatientDashboard  from './pages/patient/PatientDashboard';
import MyAppointments    from './pages/patient/MyAppointments';
import BookAppointment   from './pages/patient/BookAppointment';
import FindDoctors       from './pages/patient/FindDoctors';
import MyHealthRecord    from './pages/patient/MyHealthRecord';
import PatientReports    from './pages/patient/PatientReports';
import MyProfile              from './pages/patient/MyProfile';
import PatientNotifications   from './pages/patient/PatientNotifications';

// Receptionist
import ReceptionDesk from './pages/receptionist/ReceptionDesk';
import WalkIn from './pages/receptionist/WalkIn';
import AppointmentSearch from './pages/receptionist/AppointmentSearch';
import DoctorBoard from './pages/receptionist/DoctorBoard';

// Doctor
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorSchedule, { PatientQueue } from './pages/doctor/DoctorSchedule';
import MyPatients from './pages/doctor/MyPatients';
import DoctorProfile from './pages/doctor/DoctorProfile';
import DoctorReports from './pages/doctor/DoctorReports';

// Admin + Analyst
import AdminDashboard, { AnalyticsDashboard } from './pages/admin/AdminDashboard';
import AppointmentsManager from './pages/admin/AppointmentsManager';
import PatientManager from './pages/admin/PatientManager';
import StaffManager from './pages/admin/StaffManager';
import DepartmentsManager from './pages/admin/DepartmentsManager';
import AdminBilling from './pages/admin/AdminBilling';
import AdminSettings from './pages/admin/AdminSettings';
import AdminNotifications from './pages/admin/AdminNotifications';
import DoctorCredentials from './pages/admin/DoctorCredentials';

// Page titles map
const TITLES = {
  'pat-dash':      'Dashboard',
  'my-appts':      'My Appointments',
  'book-appt':     'Book Appointment',
  'find-doctors':  'Find Doctors',
  'health-record': 'My Health Record',
  'my-reports':    'My Reports',
  'pat-notifs':    'Notifications',
  'my-profile':    'My Profile',
  'doc-reports':   'Patient Reports',
  'reception':   'Reception Desk',
  'walkin':      'Walk-In Registration',
  'appt-search': 'Appointments',
  'doc-board':   'Doctor Board',
  'reg-patient': 'Register Patient',
  'doc-dash':   'Doctor Dashboard',
  'schedule':   'My Schedule',
  'queue':      'Patient Queue',
  'my-patients':'My Patients',
  'doc-profile':'My Profile',
  'admin-dash':     'Admin Dashboard',
  'admin-appts':    'Appointments',
  'admin-patients': 'Patient Management',
  'departments':    'Departments',
  'staff':          'Staff Management',
  'billing':        'Billing & Revenue',
  'notifications':  'Notifications Center',
  'admin-settings': 'System Settings',
  'wait-alert':     'Wait Alerts',
  'doctor-creds':   'Doctor Credentials',
  'analytics':  'Analytics Dashboard',
  'peak-hours': 'Peak Hour Analysis',
  'forecast':   'Demand Forecast',
  'export':     'Export Data',
};

// Default first page per role
const DEFAULT_PAGE = {
  patient:      'pat-dash',
  receptionist: 'reception',
  doctor:       'doc-dash',
  admin:        'admin-dash',
  analyst:      'analytics',
};

function Shell() {
  const { user } = useAuth();
  const [page, setPage] = useState(DEFAULT_PAGE[user?.role] || 'my-appts');

  if (!user) return <AuthPage />;

  return (
    <div className="layout">
      <Sidebar activePage={page} onNavigate={setPage} />
      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-title">{TITLES[page] || page}</div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div className="live-badge"><div className="live-dot" />Live System</div>
            <div className="topbar-date">
              {new Date().toLocaleDateString('en-IN', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="content">
          <AnimatePresence mode="wait">
            <AnimatedPage pageKey={page}>
              <PageRouter page={page} onNavigate={setPage} />
            </AnimatedPage>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PageRouter({ page, onNavigate }) {
  switch (page) {
    // Patient
    case 'pat-dash':      return <PatientDashboard onNavigate={onNavigate} />;
    case 'my-appts':      return <MyAppointments />;
    case 'book-appt':     return <BookAppointment />;
    case 'find-doctors':  return <FindDoctors onNavigate={onNavigate} />;
    case 'health-record': return <MyHealthRecord />;
    case 'my-reports':    return <PatientReports />;
    case 'pat-notifs':    return <PatientNotifications />;
    case 'my-profile':    return <MyProfile />;

    // Receptionist
    case 'reception':   return <ReceptionDesk />;
    case 'walkin':      return <WalkIn />;
    case 'appt-search': return <AppointmentSearch />;
    case 'doc-board':   return <DoctorBoard />;
    case 'reg-patient': return <RegisterPatientPage />;

    // Doctor
    case 'doc-dash':    return <DoctorDashboard />;
    case 'schedule':    return <DoctorSchedule />;
    case 'queue':       return <PatientQueue />;
    case 'my-patients': return <MyPatients />;
    case 'doc-reports': return <DoctorReports />;
    case 'doc-profile': return <DoctorProfile />;

    // Admin
    case 'admin-dash':     return <AdminDashboard />;
    case 'admin-appts':    return <AppointmentsManager />;
    case 'admin-patients': return <PatientManager />;
    case 'departments':    return <DepartmentsManager />;
    case 'staff':          return <StaffManager />;
    case 'billing':        return <AdminBilling />;
    case 'notifications':  return <AdminNotifications />;
    case 'admin-settings': return <AdminSettings />;
    case 'wait-alert':     return <WaitAlertPage />;
    case 'doctor-creds':   return <DoctorCredentials />;

    // Analyst
    case 'analytics':
    case 'peak-hours':
    case 'forecast':
    case 'export':      return <AnalyticsDashboard />;

    default: return <div style={{ padding:40, color:'var(--muted)' }}>Page not found</div>;
  }
}

// ── Inline simple pages ────────────────────────────────────────
import { useEffect } from 'react';
import { useApi } from './hooks/useApi';
import { Empty, toast } from './components/UI';

function RegisterPatientPage() {
  const api = useApi();
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ name:'', age:'', gender:'Male', contact:'', bloodGroup:'O+', address:'' });
  useEffect(() => { api.getPatients().then(setPatients); }, []);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  async function save() {
    if (!form.name) { toast.error('Name is required'); return; }
    try { await api.createPatient(form); toast.success('Patient registered!'); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed to register patient'); return; }
    api.getPatients().then(setPatients);
    setForm({ name:'', age:'', gender:'Male', contact:'', bloodGroup:'O+', address:'' });
  }

  return (
    <>
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-head"><h3>Register New Patient</h3></div>
        <div className="card-body">
          <div className="form-grid">
            <div className="field"><label>Full Name</label><input value={form.name} onChange={e=>set('name',e.target.value)} /></div>
            <div className="field"><label>Age</label><input type="number" value={form.age} onChange={e=>set('age',e.target.value)} /></div>
            <div className="field"><label>Gender</label><select value={form.gender} onChange={e=>set('gender',e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div className="field"><label>Contact</label><input value={form.contact} onChange={e=>set('contact',e.target.value)} /></div>
            <div className="field"><label>Blood Group</label><select value={form.bloodGroup} onChange={e=>set('bloodGroup',e.target.value)}>{['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(g=><option key={g}>{g}</option>)}</select></div>
            <div className="field form-full"><label>Address</label><input value={form.address} onChange={e=>set('address',e.target.value)} /></div>
          </div>
          <div className="form-actions"><button className="btn btn-sage" onClick={save}>Register Patient</button></div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h3>Patient Registry ({patients.length})</h3></div>
        <div className="card-body">
          {patients.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Age</th><th>Gender</th><th>Contact</th><th>Blood</th></tr></thead>
                <tbody>{patients.map(p=>(
                  <tr key={p.patientId}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.age||'—'}</td><td>{p.gender||'—'}</td>
                    <td>{p.contact||'—'}</td><td>{p.bloodGroup||'—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <Empty text="No patients registered yet" />}
        </div>
      </div>
    </>
  );
}

function WaitAlertPage() {
  return (
    <div>
      <div className="alert-bar">⚠️ Monitoring wait times — threshold: <strong style={{ margin:'0 4px' }}>30 minutes</strong></div>
      <div className="stats-grid">
        <div className="stat-card amber"><div className="stat-label">Avg Wait</div><div className="stat-value">18m</div><div className="stat-sub">Last hour</div></div>
        <div className="stat-card red"><div className="stat-label">&gt;30 min</div><div className="stat-value">3</div><div className="stat-sub">Patients waiting</div></div>
        <div className="stat-card green"><div className="stat-label">Resolved</div><div className="stat-value">12</div><div className="stat-sub">Today</div></div>
      </div>
      <div className="card">
        <div className="card-head"><h3>🔔 Active Wait Alerts</h3></div>
        <div className="card-body">
          {[
            { dept:'Cardiology', wait:42, msg:'3 patients waiting. Dr. Sharma at full capacity.' },
            { dept:'Orthopedics', wait:31, msg:'2 patients waiting. Monitor situation.' },
          ].map(a => (
            <div key={a.dept} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'16px 0', borderBottom:'1px solid var(--stone)' }}>
              <div style={{ width:40, height:40, background:'#fef9e7', border:'1.5px solid #f9e79f', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>⏱</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, color:'var(--forest)' }}>{a.dept} — Wait: {a.wait} mins</div>
                <div style={{ fontSize:'.8rem', color:'var(--muted)', marginTop:4 }}>{a.msg}</div>
                <button className="btn btn-amber btn-sm" style={{ marginTop:10 }}>Reallocate Doctor</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Root app
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider />
      <Shell />
    </AuthProvider>
  );
}
