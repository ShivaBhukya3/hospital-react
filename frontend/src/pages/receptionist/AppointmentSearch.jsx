import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Modal, toast, Empty, fmtDate, fmtTime } from '../../components/UI';

const STATUSES = ['All','Scheduled','Checked-In','In-Progress','Completed','Cancelled'];

const STATUS_STYLE = {
  Scheduled:    { bg:'#eaf4fb', color:'#1a5276', border:'#aed6f1' },
  'Checked-In': { bg:'#fef9e7', color:'#7d6608', border:'#f9e79f' },
  'In-Progress':{ bg:'#d8f3dc', color:'#1b4332', border:'#95d5b2' },
  Completed:    { bg:'#d8f3dc', color:'#1b4332', border:'#95d5b2' },
  Cancelled:    { bg:'#fdf2f2', color:'#7b241c', border:'#fadbd8' },
};

export default function AppointmentSearch() {
  const api = useApi();
  const [appts,   setAppts]   = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [search,  setSearch]  = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDept,   setFilterDept]   = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [detailModal,    setDetailModal]    = useState(null);
  const [reschedModal,   setReschedModal]   = useState(null);
  const [reschedForm,    setReschedForm]    = useState({ appointmentDate:'', appointmentTime:'', doctorId:'' });
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getAppointments().then(setAppts);
    api.getDoctors().then(setDoctors);
  }, []);

  const departments = ['All', ...new Set(appts.map(a => a.department).filter(Boolean))];

  const filtered = appts.filter(a => {
    if (filterStatus !== 'All' && a.status !== filterStatus) return false;
    if (filterDept   !== 'All' && a.department !== filterDept) return false;
    if (dateFrom && (a.appointmentDate || '') < dateFrom) return false;
    if (dateTo   && (a.appointmentDate || '') > dateTo)   return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (a.patientName || '').toLowerCase().includes(q) ||
        (a.doctorName  || '').toLowerCase().includes(q) ||
        (a.reason      || '').toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => {
    const dateCmp = (b.appointmentDate || '').localeCompare(a.appointmentDate || '');
    return dateCmp !== 0 ? dateCmp : (a.appointmentTime || '').localeCompare(b.appointmentTime || '');
  });

  const hasFilter = filterStatus !== 'All' || filterDept !== 'All' || search || dateFrom || dateTo;

  async function checkIn(id) {
    try {
      await api.checkIn(id);
      setAppts(a => a.map(x => x.appointmentId === id ? { ...x, status: 'Checked-In' } : x));
      toast.success('Patient checked in');
      setDetailModal(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to check in patient');
    }
  }

  async function cancelAppt(id) {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await api.cancelAppointment(id);
      setAppts(a => a.map(x => x.appointmentId === id ? { ...x, status: 'Cancelled' } : x));
      toast.info('Appointment cancelled');
      setDetailModal(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to cancel appointment');
    }
  }

  function openReschedule(appt) {
    setReschedForm({
      appointmentDate: appt.appointmentDate || '',
      appointmentTime: appt.appointmentTime?.slice(0, 5) || '',
      doctorId: appt.doctorId || '',
    });
    setReschedModal(appt);
    setDetailModal(null);
  }

  async function saveReschedule() {
    if (!reschedForm.appointmentDate || !reschedForm.appointmentTime) {
      toast.error('Date and time are required'); return;
    }
    try {
      await api.updateStatus(reschedModal.appointmentId, 'Scheduled');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to reschedule');
      return;
    }
    setAppts(a => a.map(x => x.appointmentId === reschedModal.appointmentId
      ? {
          ...x,
          appointmentDate: reschedForm.appointmentDate,
          appointmentTime: reschedForm.appointmentTime,
          doctorId: reschedForm.doctorId || x.doctorId,
          doctorName: reschedForm.doctorId
            ? doctors.find(d => String(d.doctorId) === String(reschedForm.doctorId))?.name || x.doctorName
            : x.doctorName,
          status: 'Scheduled',
        }
      : x
    ));
    toast.success('Appointment rescheduled');
    setReschedModal(null);
  }

  const counts = {
    total:     appts.length,
    today:     appts.filter(a => (a.appointmentDate || '').startsWith(today)).length,
    scheduled: appts.filter(a => a.status === 'Scheduled').length,
    checkedIn: appts.filter(a => a.status === 'Checked-In').length,
  };

  return (
    <div>
      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Records',  val: counts.total,     color: 'var(--forest)' },
          { label: 'Today',          val: counts.today,     color: 'var(--sage)' },
          { label: 'Scheduled',      val: counts.scheduled, color: 'var(--amber)' },
          { label: 'Checked-In',     val: counts.checkedIn, color: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--white)', border: '1.5px solid var(--border)',
            borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="search" placeholder="Search patient, doctor, reason…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={fld(200)}
            />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={fld(150)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={fld(160)}>
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={fld(140)} title="From date" />
            <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>to</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={fld(140)} title="To date" />
            {hasFilter && (
              <button className="btn btn-outline btn-sm"
                onClick={() => { setSearch(''); setFilterStatus('All'); setFilterDept('All'); setDateFrom(''); setDateTo(''); }}>
                Clear
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '.8rem', color: 'var(--muted)' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="card">
        <div className="card-head"><h3>Appointments</h3></div>
        <div className="card-body">
          {filtered.length === 0 ? (
            <Empty text="No appointments match the current filters" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Department</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => {
                    const ss = STATUS_STYLE[a.status] || {};
                    const isActive = !['Completed','Cancelled'].includes(a.status);
                    return (
                      <tr key={a.appointmentId}>
                        <td>
                          <strong style={{ fontSize: '.86rem' }}>{fmtDate(a.appointmentDate)}</strong>
                          <div style={{ fontSize: '.73rem', color: 'var(--muted)' }}>{fmtTime(a.appointmentTime)}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{a.patientName || '—'}</td>
                        <td style={{ fontSize: '.85rem' }}>{a.doctorName || '—'}</td>
                        <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{a.department || '—'}</td>
                        <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '.82rem', color: 'var(--muted)' }}>
                          {a.reason || '—'}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', padding: '3px 10px', borderRadius: 20,
                            fontSize: '.72rem', fontWeight: 600,
                            background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                          }}>
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => setDetailModal(a)}>View</button>
                            {a.status === 'Scheduled' && (
                              <>
                                <button className="btn btn-sage btn-sm" onClick={() => checkIn(a.appointmentId)}>Check-In</button>
                                <button className="btn btn-outline btn-sm" onClick={() => openReschedule(a)}>Reschedule</button>
                              </>
                            )}
                            {isActive && (
                              <button
                                className="btn btn-sm"
                                style={{ background:'#fdf2f2', color:'#7b241c', border:'1px solid #fadbd8' }}
                                onClick={() => cancelAppt(a.appointmentId)}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
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

      {/* Detail Modal */}
      {detailModal && (
        <Modal title={`Appointment — ${detailModal.patientName}`} onClose={() => setDetailModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Patient',    val: detailModal.patientName || '—' },
              { label: 'Doctor',     val: detailModal.doctorName  || '—' },
              { label: 'Department', val: detailModal.department  || '—' },
              { label: 'Date',       val: fmtDate(detailModal.appointmentDate) },
              { label: 'Time',       val: fmtTime(detailModal.appointmentTime) },
              { label: 'Status',     val: detailModal.status },
              { label: 'Reason',     val: detailModal.reason || '—' },
              { label: 'Booked By',  val: detailModal.bookedBy || '—' },
            ].map(f => (
              <div key={f.label} style={{ background: 'var(--sand)', borderRadius: 9, padding: '10px 13px' }}>
                <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontWeight: 600, fontSize: '.87rem' }}>{f.val}</div>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setDetailModal(null)}>Close</button>
            {detailModal.status === 'Scheduled' && (
              <>
                <button className="btn btn-outline" onClick={() => openReschedule(detailModal)}>Reschedule</button>
                <button className="btn btn-sage" onClick={() => checkIn(detailModal.appointmentId)}>Check-In</button>
              </>
            )}
            {!['Completed','Cancelled'].includes(detailModal.status) && (
              <button
                className="btn btn-sm"
                style={{ background:'#fdf2f2', color:'#7b241c', border:'1px solid #fadbd8', padding:'8px 16px', borderRadius:9 }}
                onClick={() => cancelAppt(detailModal.appointmentId)}
              >
                Cancel Appointment
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {reschedModal && (
        <Modal title={`Reschedule — ${reschedModal.patientName}`} onClose={() => setReschedModal(null)}>
          <div style={{ marginBottom: 14, fontSize: '.83rem', color: 'var(--muted)' }}>
            Current: <strong>{fmtDate(reschedModal.appointmentDate)}</strong> at <strong>{fmtTime(reschedModal.appointmentTime)}</strong>
            {' · '}{reschedModal.doctorName}
          </div>
          <div className="form-grid">
            <div className="field">
              <label>New Date <span style={{ color:'var(--red)' }}>*</span></label>
              <input type="date" min={today}
                value={reschedForm.appointmentDate}
                onChange={e => setReschedForm(f => ({ ...f, appointmentDate: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>New Time <span style={{ color:'var(--red)' }}>*</span></label>
              <input type="time"
                value={reschedForm.appointmentTime}
                onChange={e => setReschedForm(f => ({ ...f, appointmentTime: e.target.value }))}
              />
            </div>
            <div className="field form-full">
              <label>Change Doctor (optional)</label>
              <select
                value={reschedForm.doctorId}
                onChange={e => setReschedForm(f => ({ ...f, doctorId: e.target.value }))}
              >
                <option value="">Keep current — {reschedModal.doctorName}</option>
                {doctors.filter(d => d.availability !== 'Off-duty').map(d => (
                  <option key={d.doctorId} value={d.doctorId}>{d.name} — {d.department} ({d.availability})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setReschedModal(null)}>Cancel</button>
            <button className="btn btn-sage" onClick={saveReschedule}>Save Reschedule</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function fld(w) {
  return {
    padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 9,
    fontFamily: 'var(--font-ui)', fontSize: '.83rem', background: 'var(--white)',
    outline: 'none', width: w,
  };
}
