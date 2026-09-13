import React, { useState, useEffect } from 'react';
import { Bell, Plus, CheckCircle2, Trash2, Calendar, Clock, RefreshCw } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const Reminders = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchReminders();
  }, [userData]);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'reminders'),
        where('schoolId', '==', schoolId)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReminders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addReminder = async (e) => {
    e.preventDefault();
    if (!newTitle) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'reminders'), {
        title: newTitle,
        date: newDate,
        priority: priority,
        completed: false,
        schoolId,
        createdAt: serverTimestamp()
      });
      setNewTitle('');
      setNewDate('');
      setPriority('Medium');
      fetchReminders();
    } catch (err) {
      console.error(err);
      alert('Error adding reminder');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id, currentVal) => {
    try {
      await updateDoc(doc(db, 'reminders', id), {
        completed: !currentVal
      });
      setReminders(reminders.map(r => r.id === id ? { ...r, completed: !currentVal } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteReminder = async (id) => {
    try {
      await deleteDoc(doc(db, 'reminders', id));
      setReminders(reminders.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">Reminders & Tasks</h1>
          <p className="text-dark-muted mt-1">Manage your administrative to-dos and reminders.</p>
        </div>
        <button onClick={fetchReminders} className="premium-button-secondary"><RefreshCw size={18} /> Sync Tasks</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <GlassCard className="p-6 sticky top-24">
            <h2 className="font-bold mb-6 flex items-center gap-2"><Plus size={18} className="text-primary-500"/> Add Task</h2>
            <form onSubmit={addReminder} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1 mb-1 block">Task Description</label>
                <textarea 
                  rows="3"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full premium-input resize-none"
                  placeholder="What needs to be done?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1 mb-1 block">Due Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                    <input 
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full premium-input pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1 mb-1 block">Priority</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full premium-input bg-dark-card"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full premium-button-primary">
                {saving ? 'Adding...' : 'Add Reminder'}
              </button>
            </form>
          </GlassCard>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-dark-muted">Loading reminders...</div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-12 text-dark-muted border-dashed border-2 border-dark-border rounded-xl">
              <Bell size={40} className="mx-auto opacity-30 mb-3" />
              <p className="font-bold">All caught up!</p>
              <p className="text-xs">You have no pending reminders.</p>
            </div>
          ) : (
            reminders.sort((a, b) => a.completed - b.completed).map(reminder => (
              <GlassCard 
                key={reminder.id} 
                className={`p-5 flex items-center gap-4 transition-all ${reminder.completed ? 'opacity-50' : 'hover:border-primary-500/30'}`}
              >
                <button 
                  onClick={() => toggleStatus(reminder.id, reminder.completed)}
                  className={`p-1 rounded-full border-2 flex-shrink-0 transition-colors ${
                    reminder.completed ? 'border-green-500 bg-green-500 text-white' : 'border-dark-muted text-transparent hover:border-primary-500'
                  }`}
                >
                  <CheckCircle2 size={20} />
                </button>
                
                <div className="flex-1">
                  <h3 className={`font-bold ${reminder.completed ? 'line-through text-dark-muted' : 'text-dark-text'}`}>
                    {reminder.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-dark-muted flex items-center gap-1"><Calendar size={12}/> {reminder.date || 'No Date'}</span>
                    <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-white/5 ${
                      reminder.priority === 'High' ? 'text-red-400' : reminder.priority === 'Medium' ? 'text-orange-400' : 'text-green-400'
                    }`}>
                      {reminder.priority || 'Medium'}
                    </span>
                  </div>
                </div>
                
                <button onClick={() => deleteReminder(reminder.id)} className="p-2 text-dark-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                  <Trash2 size={18} />
                </button>
              </GlassCard>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Reminders;
