import React, { useState, useEffect } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, Plus, Search, Calendar, RefreshCw } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const CallLog = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  // New log form state
  const [newLog, setNewLog] = useState({
    caller: '',
    number: '',
    type: 'Incoming',
    duration: '5m',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [userData]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'call_logs'),
        where('schoolId', '==', schoolId)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Client-side sort by createdAt or date desc
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLog = async (e) => {
    e.preventDefault();
    if (!newLog.caller || !newLog.number) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'call_logs'), {
        ...newLog,
        schoolId,
        createdAt: serverTimestamp()
      });
      alert('Call log recorded successfully!');
      setShowAdd(false);
      setNewLog({
        caller: '',
        number: '',
        type: 'Incoming',
        duration: '5m',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchLogs();
    } catch (err) {
      console.error(err);
      alert('Error saving log');
    } finally {
      setSaving(false);
    }
  };

  const filteredLogs = logs.filter(log =>
    (log.caller || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.number || '').includes(searchTerm) ||
    (log.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">Call Log</h1>
          <p className="text-dark-muted mt-1">Maintain records of incoming and outgoing calls.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="premium-button-primary">
          <Plus size={18} /> New Log
        </button>
      </div>

      {showAdd && (
        <GlassCard className="p-6 border-primary-500/30 animate-slide-in">
          <h2 className="font-bold mb-4 flex items-center gap-2"><Phone size={18} className="text-primary-500" /> Record Call</h2>
          <form onSubmit={handleSaveLog}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Caller/Receiver Name</label>
                <input 
                  type="text" 
                  className="w-full premium-input" 
                  placeholder="Name" 
                  value={newLog.caller}
                  onChange={(e) => setNewLog({...newLog, caller: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Phone Number</label>
                <input 
                  type="text" 
                  className="w-full premium-input" 
                  placeholder="03xx-xxxxxxx" 
                  value={newLog.number}
                  onChange={(e) => setNewLog({...newLog, number: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Call Type</label>
                <select 
                  className="w-full premium-input bg-dark-card"
                  value={newLog.type}
                  onChange={(e) => setNewLog({...newLog, type: e.target.value})}
                >
                  <option value="Incoming">Incoming</option>
                  <option value="Outgoing">Outgoing</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Date</label>
                <input 
                  type="date" 
                  className="w-full premium-input" 
                  value={newLog.date}
                  onChange={(e) => setNewLog({...newLog, date: e.target.value})}
                  required
                />
              </div>
              <div className="md:col-span-4 space-y-1">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Discussion Notes</label>
                <textarea 
                  rows="2" 
                  className="w-full premium-input resize-none" 
                  placeholder="Summary of discussion..." 
                  value={newLog.notes}
                  onChange={(e) => setNewLog({...newLog, notes: e.target.value})}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="premium-button-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="premium-button-primary">
                {saving ? 'Saving...' : 'Save Log'}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      <GlassCard className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Recent Logs</h2>
          <div className="flex gap-3">
            <button onClick={fetchLogs} className="premium-button-secondary py-1 px-3 text-xs"><RefreshCw size={14} /></button>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
              <input 
                type="text" 
                placeholder="Search logs..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full premium-input pl-10" 
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-dark-muted">Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-dark-muted">No call logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                  <th className="pb-4 px-4">Type</th>
                  <th className="pb-4 px-4">Name & Number</th>
                  <th className="pb-4 px-4">Date & Duration</th>
                  <th className="pb-4 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      {log.type === 'Incoming' ? (
                        <span className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-1 rounded w-max text-xs font-bold"><PhoneIncoming size={14}/> Incoming</span>
                      ) : (
                        <span className="flex items-center gap-1 text-blue-500 bg-blue-500/10 px-2 py-1 rounded w-max text-xs font-bold"><PhoneOutgoing size={14}/> Outgoing</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold">{log.caller}</p>
                      <p className="text-xs text-dark-muted font-mono mt-0.5">{log.number}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm flex items-center gap-1"><Calendar size={14}/> {log.date}</p>
                      <p className="text-xs text-dark-muted mt-0.5">Duration: {log.duration || 'N/A'}</p>
                    </td>
                    <td className="py-4 px-4 text-sm text-dark-muted max-w-xs truncate" title={log.notes}>
                      {log.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default CallLog;
