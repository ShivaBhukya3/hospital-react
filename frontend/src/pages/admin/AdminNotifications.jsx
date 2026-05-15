import { useState } from 'react';
import { toast, Empty } from '../../components/UI';

const PRIORITY_COLORS = {
  Normal:   { bg: '#f0f4ff', color: '#1a5276', border: '#bee3f8' },
  High:     { bg: '#fef9e7', color: '#b7770d', border: '#f9e79f' },
  Urgent:   { bg: '#fef2f2', color: '#c0392b', border: '#fecaca' },
};

const SEED = [
  {
    id: 1, title: 'System Maintenance Tonight', priority: 'High',
    audience: 'All Staff', message: 'The system will undergo scheduled maintenance from 11:30 PM to 1:00 AM. Please save all work before 11:00 PM.',
    sentAt: '2025-04-28T10:00:00', reads: 18, total: 22, pinned: true,
  },
  {
    id: 2, title: 'Flu Season Protocol Update', priority: 'Normal',
    audience: 'Doctors', message: 'Please follow the updated flu season triage protocol effective immediately. Full guidelines available in the shared drive.',
    sentAt: '2025-04-27T09:30:00', reads: 14, total: 14, pinned: false,
  },
  {
    id: 3, title: 'Emergency: Blood Bank Request', priority: 'Urgent',
    audience: 'All Staff', message: 'URGENT: We need O- blood donors immediately. If any staff can volunteer, please contact the Blood Bank at ext. 204.',
    sentAt: '2025-04-26T15:45:00', reads: 22, total: 22, pinned: false,
  },
  {
    id: 4, title: 'New Appointment Booking System', priority: 'Normal',
    audience: 'Receptionist', message: 'Starting Monday, all appointments must be booked through the new digital system. Training sessions at 9 AM and 2 PM on Sunday.',
    sentAt: '2025-04-25T11:00:00', reads: 5, total: 6, pinned: false,
  },
  {
    id: 5, title: 'Patient Satisfaction Survey', priority: 'Normal',
    audience: 'Patients', message: 'We value your feedback! Please complete the patient satisfaction survey sent to your registered email. Takes less than 3 minutes.',
    sentAt: '2025-04-24T08:00:00', reads: 89, total: 124, pinned: false,
  },
];

const AUDIENCES = ['All Staff', 'Doctors', 'Receptionist', 'Admin', 'Patients', 'All'];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminNotifications() {
  const [notes,     setNotes]     = useState(SEED);
  const [filterAud, setFilterAud] = useState('All');
  const [search,    setSearch]    = useState('');
  const [form,      setForm]      = useState({ title: '', message: '', audience: 'All Staff', priority: 'Normal' });
  const [sending,   setSending]   = useState(false);
  const [expanded,  setExpanded]  = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = notes.filter(n => {
    const matchAud = filterAud === 'All' || n.audience === filterAud;
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase())
      || n.message.toLowerCase().includes(search.toLowerCase());
    return matchAud && matchSearch;
  }).sort((a, b) => b.pinned - a.pinned || new Date(b.sentAt) - new Date(a.sentAt));

  function sendNotification() {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.message.trim()) { toast.error('Message is required'); return; }
    setSending(true);
    setTimeout(() => {
      const newNote = {
        id: Date.now(),
        title: form.title,
        message: form.message,
        audience: form.audience,
        priority: form.priority,
        sentAt: new Date().toISOString(),
        reads: 0,
        total: form.audience === 'Patients' ? 124 : form.audience === 'All Staff' ? 22 : 8,
        pinned: false,
      };
      setNotes(prev => [newNote, ...prev]);
      setForm({ title: '', message: '', audience: 'All Staff', priority: 'Normal' });
      toast.success(`Notification sent to "${form.audience}"`);
      setSending(false);
    }, 800);
  }

  function deleteNote(id) {
    setNotes(prev => prev.filter(n => n.id !== id));
    toast.info('Notification removed');
  }

  function togglePin(id) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  }

  const inputStyle = {
    padding: '9px 13px', border: '1.5px solid var(--border)', borderRadius: 9,
    fontFamily: 'var(--font-ui)', fontSize: '.87rem', outline: 'none',
    width: '100%', color: 'var(--ink)', background: 'var(--white)',
    transition: 'border-color .2s',
  };

  const totalSent = notes.length;
  const totalReads = notes.reduce((s, n) => s + n.reads, 0);
  const totalRecips = notes.reduce((s, n) => s + n.total, 0);
  const urgentCount = notes.filter(n => n.priority === 'Urgent').length;

  return (
    <div className="page-fade">
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card forest">
          <div className="stat-label">Total Sent</div>
          <div className="stat-value">{totalSent}</div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Read Rate</div>
          <div className="stat-value">{totalRecips ? Math.round(totalReads / totalRecips * 100) : 0}%</div>
          <div className="stat-sub">{totalReads} / {totalRecips} opened</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Urgent</div>
          <div className="stat-value">{urgentCount}</div>
          <div className="stat-sub">Active urgent alerts</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Pinned</div>
          <div className="stat-value">{notes.filter(n => n.pinned).length}</div>
          <div className="stat-sub">Always visible</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

        {/* Left — notifications list */}
        <div className="card">
          <div className="card-head" style={{ flexWrap: 'wrap', gap: 10 }}>
            <h3>Sent Notifications</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={filterAud} onChange={e => setFilterAud(e.target.value)}
                style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }}>
                <option>All</option>
                {AUDIENCES.map(a => <option key={a}>{a}</option>)}
              </select>
              <input type="search" placeholder="Search…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, width: 160 }} />
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 40 }}><Empty text="No notifications found" /></div>
            ) : filtered.map((n, i) => {
              const pc = PRIORITY_COLORS[n.priority] || PRIORITY_COLORS.Normal;
              const isOpen = expanded === n.id;
              const readPct = n.total ? Math.round(n.reads / n.total * 100) : 0;
              return (
                <div key={n.id} style={{
                  padding: '16px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--stone)' : 'none',
                  background: n.pinned ? '#f9fffe' : 'transparent',
                  transition: 'background .2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* Priority indicator */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: pc.bg, border: `1.5px solid ${pc.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                    }}>
                      {n.priority === 'Urgent' ? '🚨' : n.priority === 'High' ? '⚠️' : '📢'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {n.pinned && <span style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--sage)' }}>📌 PINNED</span>}
                        <span style={{
                          fontSize: '.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                          background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`,
                        }}>{n.priority}</span>
                        <span style={{ fontSize: '.7rem', color: 'var(--muted)', background: 'var(--sand)', padding: '2px 8px', borderRadius: 12 }}>
                          → {n.audience}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '.9rem', marginTop: 6, cursor: 'pointer', color: 'var(--ink)' }}
                        onClick={() => setExpanded(isOpen ? null : n.id)}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '.74rem', color: 'var(--muted)', marginTop: 3 }}>
                        {timeAgo(n.sentAt)} · {n.reads}/{n.total} read ({readPct}%)
                      </div>

                      {/* Read progress */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--stone)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${readPct}%`, height: '100%', background: 'var(--sage)', borderRadius: 99, transition: 'width .5s' }} />
                        </div>
                        <span style={{ fontSize: '.68rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{readPct}%</span>
                      </div>

                      {/* Expanded message */}
                      {isOpen && (
                        <div style={{
                          marginTop: 12, padding: '12px 14px',
                          background: 'var(--sand)', borderRadius: 9,
                          fontSize: '.82rem', lineHeight: 1.6, color: 'var(--ink)',
                          animation: 'fadeInUp .2s ease both',
                        }}>
                          {n.message}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                      <button className="btn btn-outline btn-sm"
                        onClick={() => setExpanded(isOpen ? null : n.id)}
                        style={{ fontSize: '.7rem', padding: '3px 9px' }}>
                        {isOpen ? 'Hide' : 'View'}
                      </button>
                      <button onClick={() => togglePin(n.id)}
                        style={{
                          border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '.75rem', color: n.pinned ? 'var(--sage)' : 'var(--muted)',
                          fontFamily: 'var(--font-ui)', fontWeight: 600,
                        }}>
                        {n.pinned ? '📌' : '📍'} Pin
                      </button>
                      <button onClick={() => deleteNote(n.id)}
                        style={{
                          border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '.75rem', color: 'var(--red)',
                          fontFamily: 'var(--font-ui)', fontWeight: 600,
                        }}>
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — compose */}
        <div className="card" style={{ position: 'sticky', top: 20 }}>
          <div className="card-head">
            <h3>📢 Send Notification</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div className="field">
                <label>Audience</label>
                <select style={inputStyle} value={form.audience} onChange={e => set('audience', e.target.value)}>
                  {AUDIENCES.filter(a => a !== 'All').map(a => <option key={a}>{a}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Priority</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Normal','High','Urgent'].map(p => (
                    <button key={p}
                      onClick={() => set('priority', p)}
                      style={{
                        flex: 1, padding: '7px', border: '1.5px solid',
                        borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                        fontSize: '.78rem', fontWeight: 600, transition: 'all .15s',
                        background: form.priority === p ? (PRIORITY_COLORS[p]?.bg || 'var(--mint)') : 'transparent',
                        color:      form.priority === p ? (PRIORITY_COLORS[p]?.color || 'var(--forest)') : 'var(--muted)',
                        borderColor:form.priority === p ? (PRIORITY_COLORS[p]?.border || 'var(--sage)') : 'var(--border)',
                      }}>
                      {p === 'Normal' ? '📢' : p === 'High' ? '⚠️' : '🚨'} {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Title</label>
                <input style={inputStyle} value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="Notification subject…" />
              </div>

              <div className="field">
                <label>Message</label>
                <textarea rows={5} style={{ ...inputStyle, resize: 'vertical' }}
                  value={form.message}
                  onChange={e => set('message', e.target.value)}
                  placeholder="Write the full notification message here…" />
              </div>

              {/* Preview pill */}
              {form.audience && form.priority && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: PRIORITY_COLORS[form.priority]?.bg || 'var(--mint)',
                  border: `1px solid ${PRIORITY_COLORS[form.priority]?.border || 'var(--sage)'}`,
                  fontSize: '.76rem', color: PRIORITY_COLORS[form.priority]?.color || 'var(--forest)',
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <span>📨</span>
                  <span>Will be sent to <strong>{form.audience}</strong> as <strong>{form.priority}</strong> priority</span>
                </div>
              )}

              <button className="btn btn-sage" onClick={sendNotification} disabled={sending}
                style={{ width: '100%', padding: 12, fontSize: '.9rem' }}>
                {sending
                  ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <span style={{ width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite' }} />
                      Sending…
                    </span>
                  : '📤 Send Notification'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
