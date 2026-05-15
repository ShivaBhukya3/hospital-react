import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { StatCard, Modal, toast, Empty, fmtDate } from '../../components/UI';

const STATUS_COLORS = {
  Paid:    { bg: '#d8f3dc', color: '#1b4332', border: '#95d5b2' },
  Pending: { bg: '#fef9e7', color: '#b7770d', border: '#f9e79f' },
  Overdue: { bg: '#fef2f2', color: '#c0392b', border: '#fecaca' },
  Waived:  { bg: '#f0e8d8', color: '#6b6558', border: '#d8cfc4' },
};

const SEED_INVOICES = [
  { id:'INV-001', patient:'Priya Sharma',   dept:'Cardiology',   amount:4200, status:'Paid',    date:'2025-04-10', service:'Consultation + ECG' },
  { id:'INV-002', patient:'Rajesh Kumar',   dept:'Orthopedics',  amount:8750, status:'Paid',    date:'2025-04-12', service:'X-Ray + Physiotherapy' },
  { id:'INV-003', patient:'Anita Desai',    dept:'Neurology',    amount:6300, status:'Pending', date:'2025-04-18', service:'MRI Scan' },
  { id:'INV-004', patient:'Vikram Singh',   dept:'Cardiology',   amount:12400,status:'Pending', date:'2025-04-20', service:'Angiography' },
  { id:'INV-005', patient:'Sunita Patel',   dept:'Pediatrics',   amount:1800, status:'Paid',    date:'2025-04-22', service:'General Checkup' },
  { id:'INV-006', patient:'Mohammed Ali',   dept:'Dermatology',  amount:2200, status:'Overdue', date:'2025-03-30', service:'Skin Biopsy' },
  { id:'INV-007', patient:'Kavya Reddy',    dept:'Gynecology',   amount:5500, status:'Paid',    date:'2025-04-25', service:'Ultrasound' },
  { id:'INV-008', patient:'Arjun Mehta',    dept:'ENT',          amount:3100, status:'Overdue', date:'2025-03-25', service:'Endoscopy' },
  { id:'INV-009', patient:'Deepa Nair',     dept:'Ophthalmology',amount:4800, status:'Pending', date:'2025-04-28', service:'Cataract Assessment' },
  { id:'INV-010', patient:'Suresh Babu',    dept:'General',      amount:950,  status:'Waived',  date:'2025-04-15', service:'Emergency Consult' },
];

function fmtCurrency(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

export default function AdminBilling() {
  const api = useApi();
  const [invoices,  setInvoices]  = useState(SEED_INVOICES);
  const [search,    setSearch]    = useState('');
  const [statusF,   setStatusF]   = useState('All');
  const [viewModal, setViewModal] = useState(null);
  const [payModal,  setPayModal]  = useState(null);

  const statuses = ['All', 'Paid', 'Pending', 'Overdue', 'Waived'];

  const filtered = invoices.filter(inv => {
    const matchStatus = statusF === 'All' || inv.status === statusF;
    const matchSearch = !search || inv.patient.toLowerCase().includes(search.toLowerCase())
      || inv.id.toLowerCase().includes(search.toLowerCase())
      || inv.dept.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const pendingAmt   = invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.amount, 0);
  const overdueAmt   = invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0);
  const todayRevenue = invoices.filter(i => i.status === 'Paid' && i.date === new Date().toISOString().split('T')[0]).reduce((s,i) => s+i.amount, 0);

  function markPaid(inv) {
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'Paid' } : i));
    toast.success(`${inv.id} marked as Paid`);
    setPayModal(null);
  }

  function markWaived(inv) {
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'Waived' } : i));
    toast.info(`${inv.id} waived`);
    setPayModal(null);
  }

  function downloadReceipt(inv) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Receipt ${inv.id}</title>
    <style>
      body{font-family:'Segoe UI',sans-serif;max-width:600px;margin:40px auto;padding:32px;color:#1a1a2e}
      .header{border-bottom:3px solid #1b4332;padding-bottom:16px;margin-bottom:20px}
      .brand{font-size:1.3rem;font-weight:700;color:#1b4332}
      .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e8ddd0;font-size:.9rem}
      .total{font-weight:700;font-size:1.1rem;color:#1b4332}
      .badge{display:inline-block;background:#d8f3dc;color:#1b4332;padding:4px 12px;border-radius:20px;font-size:.8rem;font-weight:700;margin-top:12px}
      @media print{body{margin:0;padding:20px}}
    </style></head><body>
    <div class="header"><div class="brand">Meridian Health</div><div style="font-size:.8rem;color:#6b6558">Billing Receipt</div></div>
    <div class="row"><span>Invoice ID</span><strong>${inv.id}</strong></div>
    <div class="row"><span>Patient Name</span><span>${inv.patient}</span></div>
    <div class="row"><span>Department</span><span>${inv.dept}</span></div>
    <div class="row"><span>Service</span><span>${inv.service}</span></div>
    <div class="row"><span>Date</span><span>${fmtDate(inv.date)}</span></div>
    <div class="row total"><span>Amount</span><span>₹${Number(inv.amount).toLocaleString('en-IN')}</span></div>
    <div class="badge">✓ ${inv.status}</div>
    <div style="margin-top:32px;font-size:.75rem;color:#9e917e">This is a computer-generated receipt. Meridian Health © ${new Date().getFullYear()}</div>
    </body></html>`;
    const win = window.open('', '_blank', 'width=700,height=600');
    win.document.write(html); win.document.close();
    win.onload = () => win.print();
  }

  return (
    <div className="page-fade">
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Total Revenue"    value={fmtCurrency(totalRevenue)} color="forest" sub="All paid invoices" />
        <StatCard label="Today's Revenue"  value={fmtCurrency(todayRevenue)} color="green"  sub="Today's collections" />
        <StatCard label="Pending Bills"    value={fmtCurrency(pendingAmt)}   color="amber"  sub={`${invoices.filter(i=>i.status==='Pending').length} invoices`} />
        <StatCard label="Overdue"          value={fmtCurrency(overdueAmt)}   color="red"    sub={`${invoices.filter(i=>i.status==='Overdue').length} invoices`} />
      </div>

      <div className="card">
        {/* Filters */}
        <div className="card-head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <h3>Invoices & Billing</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {statuses.map(s => (
                <button key={s}
                  onClick={() => setStatusF(s)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, border: '1.5px solid',
                    fontSize: '.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                    background: statusF === s ? 'var(--forest)' : 'transparent',
                    color:      statusF === s ? '#fff' : 'var(--muted)',
                    borderColor:statusF === s ? 'var(--forest)' : 'var(--border)',
                    fontFamily: 'var(--font-ui)',
                  }}>
                  {s}
                </button>
              ))}
            </div>
            <input
              type="search" placeholder="Search patient, invoice…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                padding: '6px 12px', border: '1.5px solid var(--border)',
                borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: '.8rem',
                outline: 'none', width: 200,
              }}
            />
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40 }}><Empty text="No invoices found" /></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th><th>Patient</th><th>Department</th>
                    <th>Service</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const sc = STATUS_COLORS[inv.status] || STATUS_COLORS.Pending;
                    return (
                      <tr key={inv.id}>
                        <td><strong style={{ color: 'var(--forest)', fontFamily: 'var(--font-display)' }}>{inv.id}</strong></td>
                        <td>{inv.patient}</td>
                        <td><span style={{ fontSize: '.76rem', color: 'var(--muted)' }}>{inv.dept}</span></td>
                        <td style={{ fontSize: '.8rem' }}>{inv.service}</td>
                        <td><strong>{fmtCurrency(inv.amount)}</strong></td>
                        <td style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{fmtDate(inv.date)}</td>
                        <td>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: '.7rem', fontWeight: 700,
                            background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                          }}>{inv.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-outline btn-sm"
                              onClick={() => setViewModal(inv)}>View</button>
                            {(inv.status === 'Pending' || inv.status === 'Overdue') && (
                              <button className="btn btn-sage btn-sm"
                                onClick={() => setPayModal(inv)}>Pay</button>
                            )}
                            {inv.status === 'Paid' && (
                              <button className="btn btn-outline btn-sm"
                                onClick={() => downloadReceipt(inv)}>⬇ Receipt</button>
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

      {/* View Modal */}
      {viewModal && (
        <Modal title={`Invoice — ${viewModal.id}`} onClose={() => setViewModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: 'var(--sand)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            {[
              { label: 'Patient',    val: viewModal.patient   },
              { label: 'Invoice ID', val: viewModal.id        },
              { label: 'Department', val: viewModal.dept      },
              { label: 'Date',       val: fmtDate(viewModal.date) },
              { label: 'Service',    val: viewModal.service   },
              { label: 'Amount',     val: fmtCurrency(viewModal.amount) },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: '.67rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{f.label}</div>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{f.val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            {(() => { const sc = STATUS_COLORS[viewModal.status]; return (
              <span style={{ padding: '5px 14px', borderRadius: 20, fontSize: '.8rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                {viewModal.status}
              </span>
            ); })()}
          </div>
          <div className="form-actions">
            {viewModal.status === 'Paid' && (
              <button className="btn btn-sage" onClick={() => { setViewModal(null); downloadReceipt(viewModal); }}>
                ⬇ Download Receipt
              </button>
            )}
            {(viewModal.status === 'Pending' || viewModal.status === 'Overdue') && (
              <button className="btn btn-sage" onClick={() => { setViewModal(null); setPayModal(viewModal); }}>
                Mark as Paid
              </button>
            )}
            <button className="btn btn-outline" onClick={() => setViewModal(null)}>Close</button>
          </div>
        </Modal>
      )}

      {/* Pay Modal */}
      {payModal && (
        <Modal title="Update Payment Status" onClose={() => setPayModal(null)}>
          <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💳</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>{payModal.patient}</div>
            <div style={{ color: 'var(--muted)', marginBottom: 4 }}>{payModal.service} · {payModal.dept}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--forest)', fontWeight: 700, margin: '16px 0' }}>
              {fmtCurrency(payModal.amount)}
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setPayModal(null)}>Cancel</button>
            <button className="btn btn-outline" style={{ color: 'var(--muted)' }} onClick={() => markWaived(payModal)}>Waive</button>
            <button className="btn btn-sage" onClick={() => markPaid(payModal)}>✓ Confirm Payment</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
