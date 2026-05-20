import React, { useState, useEffect } from 'react';
import { PlusCircle, Calendar, Save, Trash, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const LeaveManager = () => {
  const { userData } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'apply'
  
  // New Leave Form State
  const [newLeave, setNewLeave] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    type: 'Sick Leave'
  });

  useEffect(() => {
    fetchLeaves();
  }, [userData]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'leaves'),
        where('schoolId', '==', userData?.schoolId || 'default-school'),
        where('userId', '==', userData?.uid)
      );
      const snap = await getDocs(q);
      setLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!newLeave.reason) return;
    try {
      await addDoc(collection(db, 'leaves'), {
        ...newLeave,
        schoolId: userData?.schoolId || 'default-school',
        userId: userData?.uid,
        userName: userData?.name || 'Teacher',
        role: 'teacher',
        status: 'Pending',
        createdAt: serverTimestamp()
      });
      alert('Leave application submitted successfully!');
      setNewLeave({ startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], reason: '', type: 'Sick Leave' });
      setActiveTab('list');
      fetchLeaves();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Requests</h1>
          <p className="text-dark-muted mt-1">Submit new leave applications and track approval statuses.</p>
        </div>

        <div className="flex gap-2">
          {activeTab !== 'list' && (
            <button 
              onClick={() => setActiveTab('list')}
              className="premium-button-secondary"
            >
              Back to List
            </button>
          )}
          {activeTab === 'list' && (
            <button 
              onClick={() => setActiveTab('apply')}
              className="premium-button-primary"
            >
              <PlusCircle size={18} /> Apply for Leave
            </button>
          )}
        </div>
      </div>

      {activeTab === 'list' ? (
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold mb-6">Application History</h2>
          {loading ? (
            <div className="text-center py-10 text-dark-muted">Loading history...</div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-10 text-dark-muted border-2 border-dashed border-dark-border rounded-xl">
              <Calendar size={40} className="mx-auto opacity-30 mb-3" />
              <p className="font-bold">No leave applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                    <th className="pb-4 px-4">Leave Type</th>
                    <th className="pb-4 px-4">Duration</th>
                    <th className="pb-4 px-4">Reason</th>
                    <th className="pb-4 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 font-bold text-sm text-white">{leave.type}</td>
                      <td className="py-4 px-4 text-xs font-mono text-dark-muted">{leave.startDate} to {leave.endDate}</td>
                      <td className="py-4 px-4 text-sm text-dark-muted max-w-xs truncate">{leave.reason}</td>
                      <td className="py-4 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          leave.status === 'Approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                          leave.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                          'bg-orange-500/10 text-orange-500 border-orange-500/20'
                        }`}>
                          {leave.status === 'Approved' && <CheckCircle2 size={12} />}
                          {leave.status === 'Rejected' && <XCircle size={12} />}
                          {leave.status === 'Pending' && <Clock size={12} />}
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="p-8 max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><PlusCircle className="text-primary-500" /> Apply Leave</h2>
          <form onSubmit={handleApply} className="space-y-5">
            <div>
              <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Leave Type</label>
              <select 
                value={newLeave.type} 
                onChange={(e) => setNewLeave(p => ({ ...p, type: e.target.value }))}
                className="w-full premium-input bg-dark-card"
              >
                <option value="Sick Leave">Sick Leave</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Maternity Leave">Maternity Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Start Date</label>
                <input 
                  type="date" 
                  value={newLeave.startDate} 
                  onChange={(e) => setNewLeave(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full premium-input"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">End Date</label>
                <input 
                  type="date" 
                  value={newLeave.endDate} 
                  onChange={(e) => setNewLeave(p => ({ ...p, endDate: e.target.value }))}
                  className="w-full premium-input"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Reason for Leave</label>
              <textarea 
                rows={4}
                placeholder="Mention valid reason here..." 
                value={newLeave.reason} 
                onChange={(e) => setNewLeave(p => ({ ...p, reason: e.target.value }))}
                className="w-full premium-input"
                required
              />
            </div>
            <button type="submit" className="w-full premium-button-primary py-3">
              Submit Leave Application
            </button>
          </form>
        </GlassCard>
      )}
    </div>
  );
};

export default LeaveManager;
