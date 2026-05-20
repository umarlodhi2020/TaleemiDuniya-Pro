import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, Trash2, CheckCheck, RefreshCw, Plus, X } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const typeConfig = {
  alert: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  success: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
};

const NotificationsCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
      setNotifications(n => n.map(x => ({ ...x, read: true })));
    } catch (e) { console.error(e); }
  };

  const deleteNotif = async (id) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      setNotifications(n => n.filter(x => x.id !== id));
    } catch (e) { console.error(e); }
  };

  const markRead = async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
      setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    } catch (e) { console.error(e); }
  };

  const filtered = notifications.filter(n =>
    filter === 'all' ? true : filter === 'unread' ? !n.read : n.type === filter
  );
  const unreadCount = notifications.filter(n => !n.read).length;

  const getTimeAgo = (ts) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="animate-spin text-primary-500" size={32} /><p className="text-dark-muted ml-3">Loading...</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Bell className="text-primary-500" size={30} /> Notifications Center</h1>
          <p className="text-dark-muted mt-1">{unreadCount} unread notifications</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchNotifications} className="premium-button-secondary"><RefreshCw size={18} /> Refresh</button>
          <button onClick={markAllRead} className="premium-button-secondary"><CheckCheck size={18} /> Mark All Read</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'unread', 'alert', 'info', 'success'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              filter === f ? 'bg-primary-500 text-white' : 'bg-dark-card border border-dark-border text-dark-muted hover:border-primary-500/30'
            }`}>{f}</button>
        ))}
      </div>

      <GlassCard className="p-6 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-dark-muted">
            <Bell size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold">No notifications found</p>
            <p className="text-xs mt-1">Notifications will appear when events occur</p>
          </div>
        )}
        {filtered.map(notif => {
          const cfg = typeConfig[notif.type] || typeConfig.info;
          return (
            <div key={notif.id}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${
                notif.read ? 'border-dark-border bg-white/2' : `${cfg.border} ${cfg.bg}`
              }`}
              onClick={() => markRead(notif.id)}>
              <div className={`p-2 rounded-xl ${cfg.bg} shrink-0 mt-0.5`}><cfg.icon className={cfg.color} size={18} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-bold text-sm ${notif.read ? 'text-dark-muted' : 'text-dark-text'}`}>{notif.title}</p>
                  {!notif.read && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                </div>
                <p className="text-xs text-dark-muted mt-0.5">{notif.message}</p>
                <p className="text-[10px] text-dark-muted/60 mt-1">{getTimeAgo(notif.createdAt)}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                className="p-1.5 hover:bg-red-500/10 text-dark-muted hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </GlassCard>
    </div>
  );
};

export default NotificationsCenter;
