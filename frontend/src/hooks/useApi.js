// hooks/useApi.js  —  Axios-based API client, real backend only
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const BASE = import.meta.env.VITE_API_URL || '';
const api = axios.create({ baseURL: `${BASE}/api`, timeout: 10000 });

// Module-level logout reference — set on first hook mount so the interceptor
// can call it when the backend returns 401 (expired / invalid token).
let _logout = null;

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && _logout) _logout();
    return Promise.reject(err);
  }
);

export function useApi() {
  const { token, logout } = useAuth();

  // Keep the module-level reference current whenever the hook runs.
  _logout = logout;

  function authHeader() {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function request(path, method = 'GET', body = null) {
    const config = {
      method,
      url: path,
      headers: { ...authHeader() },
    };
    if (body) config.data = body;
    const { data } = await api(config);
    return data;
  }

  // READ helper — returns empty array on network failure so UI shows empty state
  async function get(path) {
    try { return await request(path); }
    catch { return []; }
  }

  // READ helper for objects (summary, single records) — returns null on failure
  async function getObj(path) {
    try { return await request(path); }
    catch { return null; }
  }

  return {
    // Auth
    login:    body => request('/auth/login',    'POST', body),
    register: body => request('/auth/register', 'POST', body),

    // Appointments — writes throw on failure so the caller handles errors
    getAppointments:   (q = '')         => get(`/appointments${q}`),
    createAppointment: body             => request('/appointments', 'POST', body),
    updateStatus:      (id, status)     => request(`/appointments/${id}/status`, 'PATCH', { status }),
    cancelAppointment:   id               => request(`/appointments/${id}`, 'DELETE'),
    forwardToDoctor:    (id)              => request(`/appointments/${id}/forward`, 'PATCH'),
    approveAppointment: (id, time)        => request(`/appointments/${id}/approve`, 'PATCH', { appointmentTime: time }),
    rejectAppointment:  (id, reason)      => request(`/appointments/${id}/reject`,  'PATCH', { reason }),
    updateDoctorNote:   (id, note)        => request(`/appointments/${id}/note`,    'PATCH', { note }),

    // Patients
    getPatients:   ()         => get('/patients'),
    createPatient: body       => request('/patients', 'POST', body),
    updatePatient: (id, body) => request(`/patients/${id}`, 'PUT', body),

    // Doctors
    getDoctors:            ()               => get('/doctors'),
    updateAvailability:    (id, avail)     => request(`/doctors/${id}/availability`, 'PATCH', { availability: avail }),
    createDoctorAccount:   (id, body)      => request(`/doctors/${id}/account`, 'POST', body),
    resetDoctorPassword:   (id, password)  => request(`/doctors/${id}/account/password`, 'PATCH', { password }),

    // Attendance — writes throw on failure
    checkIn:      appointmentId          => request('/attendance/checkin', 'POST', { appointmentId }),
    startConsult: appointmentId          => request('/attendance/start',   'POST', { appointmentId }),
    endConsult:   (appointmentId, notes) => request('/attendance/end',     'POST', { appointmentId, notes }),

    // Analytics
    getAnalyticsSummary: ()        => getObj('/analytics/summary').then(d => d ?? {}),
    getAnalyticsDaily:   (days=30) => get(`/analytics/daily?days=${days}`),
    getPeakHours:        ()        => get('/analytics/peak-hours'),
    getDeptLoad:         ()        => get('/analytics/dept-load'),
    getDoctorLoad:       ()        => get('/analytics/doctor-load'),
    getWaitTimes:        (days=7)  => get(`/analytics/wait-times?days=${days}`),
    getForecast:         ()        => get('/analytics/forecast'),
    getExportData:       ()        => get('/analytics/export'),

    // Departments
    getDepartments: () => get('/departments'),
  };
}
