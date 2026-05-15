// pages/patient/PatientAppointments.jsx
import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { StatCard, AppointmentTable, Modal, toast } from '../../components/UI';

export default function PatientAppointments() {
  const api = useApi();
  const [appts,   setAppts]   = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ doctorId:'', appointmentDate:'', appointmentTime:'', reason:'' });
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getAppointments().then(setAppts);
    api.getDoctors().then(setDoctors);
  }, []);

  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));

  async function bookAppt() {
    try {
      await api.createAppointment(form);
      toast.success('Appointment booked!');
      setShowModal(false);
      api.getAppointments().then(setAppts);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to book appointment');
    }
  }

  async function cancel(id) {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await api.cancelAppointment(id);
      setAppts(a => a.map(x => x.appointmentId===id ? {...x, status:'Cancelled'} : x));
      toast.info('Appointment cancelled');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to cancel');
    }
  }

  const completed = appts.filter(a => a.status==='Completed').length;
  const upcoming  = appts.filter(a => a.status==='Scheduled').length;

  return (
    <div>
      <div className="stats-grid">
        <StatCard label="Total"     value={appts.length}   color="forest" />
        <StatCard label="Upcoming"  value={upcoming}        color="green"  sub="Scheduled" />
        <StatCard label="Completed" value={completed}       color="blue"   />
        <StatCard label="Cancelled" value={appts.filter(a=>a.status==='Cancelled').length} color="red" />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>My Appointments</h3>
          <button className="btn btn-sage btn-sm" onClick={() => setShowModal(true)}>+ New Appointment</button>
        </div>
        <div className="card-body">
          <AppointmentTable
            appointments={appts}
            actions={a => a.status === 'Scheduled' && (
              <button className="btn btn-danger btn-sm" onClick={() => cancel(a.appointmentId)}>Cancel</button>
            )}
          />
        </div>
      </div>

      {showModal && (
        <Modal title="📅 Book Appointment" onClose={() => setShowModal(false)}>
          <div className="form-grid">
            <div className="field">
              <label>Doctor</label>
              <select value={form.doctorId} onChange={e => set('doctorId', e.target.value)}>
                <option value="">Select doctor…</option>
                {doctors.map(d => <option key={d.doctorId} value={d.doctorId}>{d.name} – {d.department}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" min={today} value={form.appointmentDate} onChange={e => set('appointmentDate', e.target.value)} />
            </div>
            <div className="field">
              <label>Time</label>
              <input type="time" value={form.appointmentTime} onChange={e => set('appointmentTime', e.target.value)} />
            </div>
            <div className="field">
              <label>Reason</label>
              <input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Brief reason" />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-sage" onClick={bookAppt}>Book Appointment</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
