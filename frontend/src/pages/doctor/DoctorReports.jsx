import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Modal, toast, Empty, StatCard, fmtDate } from '../../components/UI';

const EMPTY_REPORT = {
  diagnosis: '', prescription: '', testResults: '', notes: '',
  followUpDate: '', followUpNotes: '',
};

function generateReportHTML(report, appt) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>Medical Report — ${appt.patientName}</title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:40px auto;padding:32px;color:#1a1a2e;line-height:1.6}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1b4332;padding-bottom:20px;margin-bottom:24px}
    .brand{font-size:1.5rem;font-weight:700;color:#1b4332}
    .brand small{display:block;font-size:.75rem;font-weight:400;color:#6b6558;margin-top:2px}
    .meta{text-align:right;font-size:.82rem;color:#6b6558}
    .meta strong{color:#1a1a2e;display:block;margin-bottom:2px}
    .badge{display:inline-block;background:#d8f3dc;color:#1b4332;padding:4px 12px;border-radius:20px;font-size:.75rem;font-weight:700}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;background:#fdf8f0;padding:16px;border-radius:10px}
    .info-item label{font-size:.7rem;text-transform:uppercase;letter-spacing:.07em;color:#6b6558;display:block;margin-bottom:2px}
    .info-item strong{font-size:.92rem}
    .section{margin-bottom:20px}
    .section h3{font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:#6b6558;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e8ddd0}
    .section p{font-size:.9rem;white-space:pre-wrap;background:#f0e8d8;padding:12px 14px;border-radius:8px;border-left:3px solid #1b4332}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e8ddd0;display:flex;justify-content:space-between;align-items:center;font-size:.78rem;color:#9e917e}
    .sig-line{width:160px;border-top:1px solid #1a1a2e;padding-top:4px;color:#1a1a2e;font-size:.78rem}
    @media print{body{margin:0;padding:24px}}
  </style></head><body>
  <div class="header">
    <div><div class="brand">Meridian Health<small>Integrated Clinical Management Platform</small></div></div>
    <div class="meta"><strong>Medical Report</strong>Report Date: ${fmtDate(report.date)}<br/><span class="badge">Official Document</span></div>
  </div>
  <div class="info-grid">
    <div class="info-item"><label>Patient Name</label><strong>${appt.patientName || '—'}</strong></div>
    <div class="info-item"><label>Patient ID</label><strong>#${appt.patientId || '—'}</strong></div>
    <div class="info-item"><label>Consulting Doctor</label><strong>${appt.doctorName || '—'}</strong></div>
    <div class="info-item"><label>Department</label><strong>${appt.department || '—'}</strong></div>
    <div class="info-item"><label>Visit Date</label><strong>${fmtDate(appt.appointmentDate)}</strong></div>
    <div class="info-item"><label>Reason for Visit</label><strong>${appt.reason || '—'}</strong></div>
  </div>
  ${report.diagnosis ? `<div class="section"><h3>Diagnosis</h3><p>${report.diagnosis}</p></div>` : ''}
  ${report.prescription ? `<div class="section"><h3>Prescription</h3><p>${report.prescription}</p></div>` : ''}
  ${report.testResults ? `<div class="section"><h3>Test Results / Investigations</h3><p>${report.testResults}</p></div>` : ''}
  ${report.notes ? `<div class="section"><h3>Clinical Notes</h3><p>${report.notes}</p></div>` : ''}
  ${report.followUpDate ? `<div class="section"><h3>Follow-Up</h3><p>Date: ${fmtDate(report.followUpDate)}${report.followUpNotes ? '\n' + report.followUpNotes : ''}</p></div>` : ''}
  <div class="footer">
    <div>This report is computer-generated and valid without a physical signature.</div>
    <div class="sig-line">${appt.doctorName || 'Consulting Doctor'}</div>
  </div>
  </body></html>`;
}

export default function DoctorReports() {
  const api = useApi();
  const [appts,      setAppts]      = useState([]);
  const [patients,   setPatients]   = useState([]);
  const [reports,    setReports]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('doc_reports') || '[]'); } catch { return []; }
  });
  const [writeModal, setWriteModal] = useState(null); // appointment object
  const [form,       setForm]       = useState(EMPTY_REPORT);
  const [search,     setSearch]     = useState('');
  const [saving,     setSaving]     = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getAppointments().then(setAppts);
    api.getPatients().then(setPatients);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const completedAppts = appts.filter(a => a.status === 'Completed');
  const filteredAppts  = completedAppts.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.patientName || '').toLowerCase().includes(q) || (a.department || '').toLowerCase().includes(q);
  });

  function openWrite(appt) {
    const existing = reports.find(r => r.appointmentId === appt.appointmentId);
    setForm(existing ? { ...existing } : { ...EMPTY_REPORT });
    setWriteModal(appt);
  }

  function saveReport() {
    if (!form.diagnosis && !form.prescription && !form.notes) {
      toast.error('Please fill at least one field'); return;
    }
    setSaving(true);
    const report = {
      ...form,
      appointmentId: writeModal.appointmentId,
      patientId:     writeModal.patientId,
      patientName:   writeModal.patientName,
      doctorName:    writeModal.doctorName,
      department:    writeModal.department,
      appointmentDate: writeModal.appointmentDate,
      reason:        writeModal.reason,
      date:          today,
      submittedAt:   new Date().toISOString(),
    };
    const updated = [
      report,
      ...reports.filter(r => r.appointmentId !== writeModal.appointmentId),
    ];
    setReports(updated);
    localStorage.setItem('doc_reports', JSON.stringify(updated));
    toast.success(`Report submitted to ${writeModal.patientName}`);
    setWriteModal(null);
    setSaving(false);
  }

  function printReport(report) {
    const appt = appts.find(a => a.appointmentId === report.appointmentId) || report;
    const win  = window.open('', '_blank', 'width=900,height=700');
    win.document.write(generateReportHTML(report, appt));
    win.document.close();
    win.onload = () => win.print();
  }

  const hasReport = (id) => reports.some(r => r.appointmentId === id);

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Completed Visits"     value={completedAppts.length} color="forest" sub="All time" />
        <StatCard label="Reports Submitted"    value={reports.length}        color="green"  sub="To patients" />
        <StatCard label="Pending Reports"      value={completedAppts.length - reports.length > 0 ? completedAppts.length - reports.length : 0} color="amber" sub="Not yet written" />
        <StatCard label="Today's Completed"    value={appts.filter(a => a.status === 'Completed' && (a.appointmentDate||'').startsWith(today)).length} color="blue" sub="Today" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* Left — completed appointments to write reports */}
        <div className="card">
          <div className="card-head">
            <h3>Completed Consultations</h3>
            <input
              type="search" placeholder="Search patient or dept…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                padding: '6px 12px', border: '1.5px solid var(--border)',
                borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: '.8rem',
                outline: 'none', width: 210,
              }}
            />
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {filteredAppts.length === 0 ? (
              <div style={{ padding: 40 }}><Empty text="No completed consultations yet" /></div>
            ) : filteredAppts.map((a, i) => {
              const reported = hasReport(a.appointmentId);
              return (
                <div key={a.appointmentId} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px',
                  borderBottom: i < filteredAppts.length - 1 ? '1px solid var(--stone)' : 'none',
                  background: reported ? '#f9fffe' : 'transparent',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: reported ? 'var(--mint)' : 'var(--sand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--forest)', fontWeight: 700, fontSize: '.95rem', flexShrink: 0,
                  }}>
                    {(a.patientName || '?')[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{a.patientName}</div>
                    <div style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                      {fmtDate(a.appointmentDate)} · {a.department} · {a.reason || '—'}
                    </div>
                  </div>
                  {reported && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: '.7rem', fontWeight: 700,
                      background: '#d8f3dc', color: '#1b4332', border: '1px solid #95d5b2',
                    }}>
                      Report Sent
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sage btn-sm" onClick={() => openWrite(a)}>
                      {reported ? '✏️ Edit Report' : '📝 Write Report'}
                    </button>
                    {reported && (
                      <button className="btn btn-outline btn-sm"
                        onClick={() => printReport(reports.find(r => r.appointmentId === a.appointmentId))}>
                        ⬇ Download
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — submitted reports list */}
        <div className="card">
          <div className="card-head">
            <h3>Submitted Reports</h3>
            <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{reports.length} total</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {reports.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: '.84rem' }}>
                No reports submitted yet
              </div>
            ) : reports.map((r, i) => (
              <div key={r.appointmentId} style={{
                padding: '13px 18px',
                borderBottom: i < reports.length - 1 ? '1px solid var(--stone)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: '.87rem' }}>{r.patientName}</div>
                  <button className="btn btn-outline btn-sm" onClick={() => printReport(r)}>⬇</button>
                </div>
                <div style={{ fontSize: '.73rem', color: 'var(--muted)', marginBottom: 6 }}>
                  {fmtDate(r.date)} · {r.department}
                </div>
                {r.diagnosis && (
                  <div style={{
                    fontSize: '.76rem', background: 'var(--sand)', borderRadius: 7,
                    padding: '5px 9px', color: 'var(--ink)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    Dx: {r.diagnosis}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Write / Edit Report Modal */}
      {writeModal && (
        <Modal title={`Medical Report — ${writeModal.patientName}`} onClose={() => setWriteModal(null)}>
          {/* Patient summary */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            background: 'var(--sand)', borderRadius: 10, padding: '12px 14px', marginBottom: 20,
          }}>
            {[
              { label: 'Patient',  val: writeModal.patientName },
              { label: 'Visit',    val: fmtDate(writeModal.appointmentDate) },
              { label: 'Dept',     val: writeModal.department },
              { label: 'Reason',   val: writeModal.reason || '—' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: '.67rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{f.label}</div>
                <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{f.val}</div>
              </div>
            ))}
          </div>

          <div className="form-grid">
            <div className="field form-full">
              <label>Diagnosis <span style={{ color: 'var(--red)' }}>*</span></label>
              <input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)}
                placeholder="Primary diagnosis / clinical findings…" />
            </div>
            <div className="field form-full">
              <label>Prescription</label>
              <textarea rows={3} value={form.prescription}
                onChange={e => set('prescription', e.target.value)}
                placeholder="Medications, dosage, frequency, duration…"
                style={{ padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 9, fontFamily: 'var(--font-ui)', fontSize: '.86rem', resize: 'vertical', width: '100%' }}
              />
            </div>
            <div className="field form-full">
              <label>Test Results / Investigations</label>
              <textarea rows={3} value={form.testResults}
                onChange={e => set('testResults', e.target.value)}
                placeholder="Lab values, imaging findings, ECG, etc…"
                style={{ padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 9, fontFamily: 'var(--font-ui)', fontSize: '.86rem', resize: 'vertical', width: '100%' }}
              />
            </div>
            <div className="field form-full">
              <label>Clinical Notes</label>
              <textarea rows={3} value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Observations, restrictions, lifestyle advice…"
                style={{ padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 9, fontFamily: 'var(--font-ui)', fontSize: '.86rem', resize: 'vertical', width: '100%' }}
              />
            </div>
            <div className="field">
              <label>Follow-Up Date</label>
              <input type="date" value={form.followUpDate} onChange={e => set('followUpDate', e.target.value)} />
            </div>
            <div className="field">
              <label>Follow-Up Instructions</label>
              <input value={form.followUpNotes} onChange={e => set('followUpNotes', e.target.value)}
                placeholder="e.g. Repeat blood test in 4 weeks" />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setWriteModal(null)}>Cancel</button>
            <button className="btn btn-sage" onClick={saveReport} disabled={saving}>
              {saving ? 'Submitting…' : '📤 Submit Report to Patient'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
