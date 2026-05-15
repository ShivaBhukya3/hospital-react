import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Modal, toast, Empty, StatCard, fmtDate, fmtTime } from '../../components/UI';

const STATUSES = ['All', 'Scheduled', 'Checked-In', 'In-Progress', 'Completed', 'Cancelled'];

const STATUS_COLOR = {
  Scheduled:   { bg: '#eaf4fb', color: '#1a5276', border: '#aed6f1' },
  'Checked-In':{ bg: '#fef9e7', color: '#7d6608', border: '#f9e79f' },
  'In-Progress':{ bg: '#d8f3dc', color: '#1b4332', border: '#95d5b2' },
  Completed:   { bg: '#d8f3dc', color: '#1b4332', border: '#95d5b2' },
  Cancelled:   { bg: '#fdf2f2', color: '#7b241c', border: '#fadbd8' },
};

export default function AppointmentsManager() {
  const api = useApi();
  const [appts, setAppts]           = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [search, setSearch]         = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [detailModal, setDetailModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { api.getAppointments().then(setAppts); }, []);

  const departments = ['All', ...new Set(appts.map(a => a.department).filter(Boolean))];

  const filtered = appts.filter(a => {
    if (filterStatus !== 'All' && a.status !== filterStatus) return false;
    if (filterDept   !== 'All' && a.department !== filterDept) return false;
    if (dateFrom && (a.appointmentDate || '') < dateFrom) return false;
    if (dateTo   && (a.appointmentDate || '') > dateTo)   return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (a.patientName  || '').toLowerCase().includes(q) ||
        (a.doctorName   || '').toLowerCase().includes(q) ||
        (a.reason       || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function changeStatus(id, status) {
    try {
      await api.updateStatus(id, status);
      setAppts(a => a.map(x => x.appointmentId === id ? { ...x, status } : x));
      setStatusModal(null);
      toast.success(`Status → ${status}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update status');
    }
  }

  async function cancel(id) {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await api.cancelAppointment(id);
      setAppts(a => a.map(x => x.appointmentId === id ? { ...x, status: 'Cancelled' } : x));
      toast.success('Appointment cancelled');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to cancel appointment');
    }
  }

  const counts = {
    total:     appts.length,
    today:     appts.filter(a => (a.appointmentDate || '').startsWith(today)).length,
    completed: appts.filter(a => a.status === 'Completed').length,
    cancelled: appts.filter(a => a.status === 'Cancelled').length,
    active:    appts.filter(a => ['Scheduled','Checked-In','In-Progress'].includes(a.status)).length,
  };

  function clearFilters() {
    setFilterStatus('All'); setFilterDept('All');
    setSearch(''); setDateFrom(''); setDateTo('');
  }

  const hasFilter = filterStatus !== 'All' || filterDept !== 'All' || search || dateFrom || dateTo;

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Total"     value={counts.total}     color="forest" sub="All appointments" />
        <StatCard label="Today"     value={counts.today}     color="green"  sub="Scheduled today" />
        <StatCard label="Active"    value={counts.active}    color="amber"  sub="In pipeline" />
        <StatCard label="Completed" value={counts.completed} color="blue"   sub="All time" />
        <StatCard label="Cancelled" value={counts.cancelled} color="red"    sub="All time" />
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="search" placeholder="Search patient, doctor, reason…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={inputStyle(200)}
            />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle()}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={selectStyle()}>
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle(140)} title="From date" />
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={inputStyle(140)} title="To date" />
            {hasFilter && (
              <button className="btn btn-outline btn-sm" onClick={clearFilters}>Clear Filters</button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '.8rem', color: 'var(--muted)' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-head">
          <h3>Appointments</h3>
        </div>
        <div className="card-body">
          {filtered.length === 0 ? (
            <Empty text="No appointments match the current filters" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
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
                    const sc = STATUS_COLOR[a.status] || {};
                    return (
                      <tr key={a.appointmentId}>
                        <td style={{ color: 'var(--muted)', fontSize: '.8rem' }}>#{a.appointmentId}</td>
                        <td>
                          <strong style={{ fontSize: '.86rem' }}>{fmtDate(a.appointmentDate)}</strong>
                          <div style={{ fontSize: '.73rem', color: 'var(--muted)' }}>{fmtTime(a.appointmentTime)}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{a.patientName || '—'}</td>
                        <td style={{ fontSize: '.85rem' }}>{a.doctorName || '—'}</td>
                        <td style={{ fontSize: '.83rem', color: 'var(--muted)' }}>{a.department || '—'}</td>
                        <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '.83rem', color: 'var(--muted)' }}>
                          {a.reason || '—'}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 600,
                            background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                          }}>
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => setDetailModal(a)}>View</button>
                            {a.status !== 'Completed' && a.status !== 'Cancelled' && (
                              <button className="btn btn-sage btn-sm" onClick={() => setStatusModal(a)}>Status</button>
                            )}
                            {a.status !== 'Cancelled' && a.status !== 'Completed' && (
                              <button className="btn btn-sm" style={{ background: '#fdf2f2', color: '#7b241c', border: '1px solid #fadbd8' }}
                                onClick={() => cancel(a.appointmentId)}>
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
        <Modal title={`Appointment #${detailModal.appointmentId}`} onClose={() => setDetailModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
            {[
              { label: 'Patient',    val: detailModal.patientName || '—' },
              { label: 'Doctor',     val: detailModal.doctorName  || '—' },
              { label: 'Department', val: detailModal.department  || '—' },
              { label: 'Date',       val: fmtDate(detailModal.appointmentDate) },
              { label: 'Time',       val: fmtTime(detailModal.appointmentTime) },
              { label: 'Booked By',  val: detailModal.bookedBy    || '—' },
              { label: 'Status',     val: detailModal.status },
              { label: 'Reason',     val: detailModal.reason || '—' },
            ].map(f => (
              <div key={f.label} style={{ background: 'var(--sand)', borderRadius: 9, padding: '10px 13px' }}>
                <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontWeight: 600, fontSize: '.87rem' }}>{f.val}</div>
              </div>
            ))}
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-outline" onClick={() => setDetailModal(null)}>Close</button>
            {detailModal.status !== 'Completed' && detailModal.status !== 'Cancelled' && (
              <button className="btn btn-sage" onClick={() => { setStatusModal(detailModal); setDetailModal(null); }}>
                Update Status
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Status Update Modal */}
      {statusModal && (
        <Modal title={`Update Status — ${statusModal.patientName}`} onClose={() => setStatusModal(null)}>
          <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginBottom: 16 }}>
            Current: <strong>{statusModal.status}</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Scheduled', 'Checked-In', 'In-Progress', 'Completed'].map(s => {
              const sc = STATUS_COLOR[s] || {};
              const isCurrent = statusModal.status === s;
              return (
                <button
                  key={s}
                  disabled={isCurrent}
                  onClick={() => changeStatus(statusModal.appointmentId, s)}
                  style={{
                    padding: '11px 18px', borderRadius: 10, fontSize: '.87rem', fontWeight: 600,
                    cursor: isCurrent ? 'default' : 'pointer', textAlign: 'left',
                    border: `1.5px solid ${isCurrent ? sc.border : 'var(--border)'}`,
                    background: isCurrent ? sc.bg : 'var(--white)',
                    color: isCurrent ? sc.color : 'var(--muted)',
                    opacity: isCurrent ? 1 : 0.8,
                    transition: '.15s',
                  }}
                >
                  {isCurrent ? `✓ ${s} (current)` : s}
                </button>
              );
            })}
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-outline" onClick={() => setStatusModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function inputStyle(w) {
  return {
    padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 9,
    fontFamily: 'var(--font-ui)', fontSize: '.83rem', width: w, outline: 'none',
  };
}
function selectStyle() {
  return {
    padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 9,
    fontFamily: 'var(--font-ui)', fontSize: '.83rem', background: 'var(--white)', outline: 'none',
  };
}
