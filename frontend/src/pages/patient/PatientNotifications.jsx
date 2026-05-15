import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../hooks/useSocket';
import { useApi } from '../../hooks/useApi';

const NOTIF_TYPES = {
  appointment: { icon:'📅', color:'#1a5276', bg:'#eaf4fb', border:'#aed6f1', label:'Appointment' },
  reminder:    { icon:'⏰', color:'#7d6608', bg:'#fef9e7', border:'#f9e79f', label:'Reminder'    },
  update:      { icon:'🔔', color:'#1b4332', bg:'#d8f3dc', border:'#95d5b2', label:'Update'      },
  alert:       { icon:'⚠️', color:'#7b241c', bg:'#fdf2f2', border:'#fadbd8', label:'Alert'       },
  system:      { icon:'⚙️', color:'#555',    bg:'var(--sand)', border:'var(--border)', label:'System' },
};

function makeId() { return Math.random().toString(36).slice(2); }

const SEED_NOTIFS = [
  { id:'n1', type:'appointment', title:'Appointment Confirmed', message:'Your appointment with Dr. Ravi Sharma on tomorrow at 10:00 AM has been confirmed.', time: new Date(Date.now() - 30*60000), read:false },
  { id:'n2', type:'reminder',    title:'Appointment Tomorrow',  message:'Reminder: You have an appointment with Dr. Anita Patel at 11:30 AM. Please arrive 10 minutes early.', time: new Date(Date.now() - 2*3600000), read:false },
  { id:'n3', type:'update',      title:'Status Update',         message:'Your appointment status has been updated to Checked-In. Please proceed to the waiting area.', time: new Date(Date.now() - 5*3600000), read:true  },
  { id:'n4', type:'system',      title:'Welcome to Meridian Health', message:'Your patient portal account is active. You can now book appointments and view your health records.', time: new Date(Date.now() - 2*86400000), read:true },
];

function timeAgo(date) {
  const secs = Math.floor((Date.now() - date) / 1000);
  if (secs < 60)   return 'just now';
  if (secs < 3600) return `${Math.floor(secs/60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs/3600)}h ago`;
  return `${Math.floor(secs/86400)}d ago`;
}

export default function PatientNotifications() {
  const api = useApi();
  const [notifs, setNotifs] = useState(SEED_NOTIFS);
  const [filter, setFilter] = useState('all');
  const [appts,  setAppts]  = useState([]);

  useEffect(() => { api.getAppointments().then(setAppts); }, []);

  useSocket('appointment:new', (a) => {
    setNotifs(prev => [{
      id: makeId(), type:'appointment',
      title: 'New Appointment Booked',
      message: `Your appointment with ${a.doctorName || 'a doctor'} has been scheduled for ${a.appointmentDate} at ${(a.appointmentTime || '').slice(0,5)}.`,
      time: new Date(), read: false,
    }, ...prev]);
  });

  useSocket('appointment:updated', ({ appointmentId, status }) => {
    const appt = appts.find(a => a.appointmentId === appointmentId);
    const doctorName = appt?.doctorName || 'your doctor';
    setNotifs(prev => [{
      id: makeId(), type: status === 'Cancelled' ? 'alert' : 'update',
      title: `Appointment ${status}`,
      message: `Your appointment with ${doctorName} has been updated to ${status}.`,
      time: new Date(), read: false,
    }, ...prev]);
  });

  const unreadCount = notifs.filter(n => !n.read).length;

  const filtered = filter === 'all'
    ? notifs
    : filter === 'unread'
    ? notifs.filter(n => !n.read)
    : notifs.filter(n => n.type === filter);

  function markRead(id) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  function dismiss(id) {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }

  function clearRead() {
    setNotifs(prev => prev.filter(n => !n.read));
  }

  const FILTERS = [
    { id:'all',         label:'All' },
    { id:'unread',      label:`Unread${unreadCount ? ` (${unreadCount})` : ''}` },
    { id:'appointment', label:'Appointments' },
    { id:'reminder',    label:'Reminders' },
    { id:'update',      label:'Updates' },
    { id:'alert',       label:'Alerts' },
  ];

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      {/* Header */}
      <div className="card" style={{ marginBottom:18 }}>
        <div className="card-body" style={{ paddingTop:16, paddingBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{
                width:44, height:44, borderRadius:12, background:'var(--mint)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem',
                border:'1.5px solid #95d5b2',
              }}>
                🔔
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--forest)' }}>Notifications</div>
                <div style={{ fontSize:'.76rem', color:'var(--muted)' }}>
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </div>
              </div>
              {unreadCount > 0 && (
                <div style={{
                  background:'var(--sage)', color:'#fff', borderRadius:20,
                  padding:'2px 10px', fontSize:'.74rem', fontWeight:700,
                }}>
                  {unreadCount} new
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {unreadCount > 0 && (
                <button className="btn btn-outline btn-sm" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
              <button className="btn btn-sm" onClick={clearRead}
                style={{ background:'#fdf2f2', color:'#7b241c', border:'1px solid #fadbd8' }}>
                Clear read
              </button>
            </div>
          </div>

          {/* Filter pills */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:14 }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding:'5px 14px', border:`1.5px solid ${filter===f.id ? 'var(--sage)' : 'var(--border)'}`,
                borderRadius:20, background: filter===f.id ? 'var(--mint)' : 'transparent',
                color: filter===f.id ? 'var(--forest)' : 'var(--muted)',
                fontFamily:'var(--font-ui)', fontSize:'.78rem', fontWeight: filter===f.id ? 700 : 400,
                cursor:'pointer', transition:'.12s',
              }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notification list */}
      <div className="card">
        <div className="card-body" style={{ padding:0 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 24px', color:'var(--muted)' }}>
              <div style={{ fontSize:'3rem', marginBottom:12 }}>🔕</div>
              <div style={{ fontSize:'.9rem', marginBottom:6 }}>No notifications</div>
              <div style={{ fontSize:'.78rem' }}>You're all caught up!</div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((n, i) => {
                const nt = NOTIF_TYPES[n.type] || NOTIF_TYPES.system;
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity:0, y:-10 }}
                    animate={{ opacity:1, y:0 }}
                    exit={{ opacity:0, height:0, overflow:'hidden' }}
                    transition={{ duration:.22 }}
                    onClick={() => markRead(n.id)}
                    style={{
                      display:'flex', gap:14, padding:'16px 20px',
                      borderBottom: i < filtered.length-1 ? '1px solid var(--stone)' : 'none',
                      background: n.read ? 'transparent' : '#fafffe',
                      cursor: n.read ? 'default' : 'pointer',
                      transition:'background .15s',
                      position:'relative',
                    }}>

                    {/* Unread indicator */}
                    {!n.read && (
                      <div style={{
                        position:'absolute', left:0, top:0, bottom:0, width:3,
                        background:'var(--sage)', borderRadius:'0 2px 2px 0',
                      }} />
                    )}

                    {/* Icon */}
                    <div style={{
                      width:42, height:42, borderRadius:12, flexShrink:0,
                      background:nt.bg, border:`1.5px solid ${nt.border}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'1.2rem',
                    }}>
                      {nt.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                        <div style={{ fontWeight: n.read ? 600 : 700, fontSize:'.9rem', color:'var(--ink)' }}>
                          {n.title}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, marginLeft:12 }}>
                          <span style={{ fontSize:'.72rem', color:'var(--muted)', whiteSpace:'nowrap' }}>
                            {timeAgo(n.time)}
                          </span>
                          <button onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                            style={{
                              background:'none', border:'none', cursor:'pointer', padding:'2px 6px',
                              color:'var(--muted)', fontSize:'.8rem', borderRadius:4,
                              lineHeight:1,
                            }}>
                            ✕
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize:'.82rem', color:'var(--muted)', lineHeight:1.5 }}>{n.message}</div>
                      <div style={{
                        display:'inline-flex', alignItems:'center', gap:4, marginTop:6,
                        padding:'2px 9px', borderRadius:20, fontSize:'.68rem', fontWeight:600,
                        background:nt.bg, color:nt.color, border:`1px solid ${nt.border}`,
                      }}>
                        {nt.icon} {nt.label}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Live badge */}
      <div style={{
        marginTop:16, textAlign:'center', fontSize:'.75rem', color:'var(--muted)',
        display:'flex', alignItems:'center', justifyContent:'center', gap:6,
      }}>
        <div style={{
          width:6, height:6, borderRadius:'50%', background:'var(--sage)',
          animation:'pulse 2s ease-in-out infinite',
        }} />
        Notifications update in real-time
      </div>
    </div>
  );
}
