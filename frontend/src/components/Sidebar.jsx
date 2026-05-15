import { useAuth } from '../context/AuthContext';
import { Icon } from './UI';

const NAV = {
  patient: [
    { id:'pat-dash',      icon:'chart',       label:'Dashboard'        },
    { id:'my-appts',      icon:'calendar',    label:'My Appointments'  },
    { id:'book-appt',     icon:'plus',        label:'Book Appointment' },
    { id:'find-doctors',  icon:'stethoscope', label:'Find Doctors'     },
    { id:'health-record', icon:'patients',    label:'Health Record'    },
    { id:'my-reports',    icon:'download',    label:'My Reports'       },
    { id:'pat-notifs',    icon:'bell',        label:'Notifications'    },
    { id:'my-profile',    icon:'id',          label:'My Profile'       },
  ],
  receptionist: [
    { id:'reception',    icon:'desk',        label:'Reception Desk'      },
    { id:'walkin',       icon:'plus',        label:'Walk-In Registration'},
    { id:'appt-search',  icon:'calendar',    label:'Appointments'        },
    { id:'doc-board',    icon:'stethoscope', label:'Doctor Board'        },
    { id:'reg-patient',  icon:'user',        label:'Register Patient'    },
  ],
  doctor: [
    { id:'doc-dash',    icon:'stethoscope', label:'Dashboard'    },
    { id:'schedule',    icon:'calendar',    label:'My Schedule'  },
    { id:'queue',       icon:'list',        label:'Patient Queue'},
    { id:'my-patients',  icon:'patients',    label:'My Patients'  },
    { id:'doc-reports',  icon:'download',   label:'Patient Reports'},
    { id:'doc-profile',  icon:'id',         label:'My Profile'   },
  ],
  admin: [
    { id:'admin-dash',      icon:'chart',    label:'Dashboard'          },
    { id:'admin-appts',     icon:'calendar', label:'Appointments'       },
    { id:'admin-patients',  icon:'patients', label:'Patient Management' },
    { id:'departments',     icon:'dept',     label:'Departments'        },
    { id:'staff',           icon:'team',     label:'Staff Management'   },
    { id:'billing',         icon:'billing',  label:'Billing & Revenue'  },
    { id:'notifications',   icon:'bell',     label:'Notifications'      },
    { id:'admin-settings',  icon:'settings', label:'Settings'           },
    { id:'wait-alert',      icon:'alert',    label:'Wait Alerts'        },
    { id:'doctor-creds',    icon:'id',       label:'Doctor Credentials' },
  ],
  analyst: [
    { id:'analytics',  icon:'chart',    label:'Analytics'       },
    { id:'peak-hours', icon:'peak',     label:'Peak Hours'      },
    { id:'forecast',   icon:'trend',    label:'Demand Forecast' },
    { id:'export',     icon:'download', label:'Export Data'     },
  ],
};

const ROLE_LABEL = {
  patient:      'Patient',
  receptionist: 'Receptionist',
  doctor:       'Doctor',
  admin:        'Administrator',
  analyst:      'Analyst',
};

export default function Sidebar({ activePage, onNavigate }) {
  const { user, logout } = useAuth();
  const items = NAV[user?.role] || [];
  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sb-brand">
        <div className="sb-logo">{Icon.cross}</div>
        <div>
          <h2>Meridian Health</h2>
          <p>Clinical Management Platform</p>
        </div>
      </div>

      {/* User */}
      <div className="sb-user">
        <div className="sb-avatar">{initials}</div>
        <div className="sb-user-info">
          <div className={`role-badge role-${user?.role}`}>
            {ROLE_LABEL[user?.role] || user?.role}
          </div>
          <div className="sb-username">{user?.username}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        <div className="nav-section">Navigation</div>
        {items.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${activePage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {Icon[item.icon]}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sb-footer">
        <button className="logout-btn" onClick={logout}>
          {Icon.logout}
          Sign Out
        </button>
      </div>
    </aside>
  );
}
