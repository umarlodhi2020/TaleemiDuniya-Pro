import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Plus, RefreshCw, Archive, X, Save } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const Timetable = () => {
  const { userData } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newPeriod, setNewPeriod] = useState({
    subject: 'Mathematics',
    class: '10',
    time: '08:30 AM - 09:15 AM',
    room: 'Room 4',
    day: 'Monday'
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchTimetable();
  }, [userData]);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'timetable'),
        where('schoolId', '==', userData?.schoolId || 'default-school')
      );
      const snap = await getDocs(q);
      setTimetable(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPeriod = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'timetable'), {
        ...newPeriod,
        day: selectedDay, // Match currently selected day in UI
        schoolId: userData?.schoolId || 'default-school',
        createdAt: new Date()
      });
      alert('Period scheduled successfully!');
      setShowAddModal(false);
      fetchTimetable();
    } catch (err) {
      console.error(err);
      alert('Error scheduling period');
    } finally {
      setSaving(false);
    }
  };

  const filtered = timetable.filter(item => 
    (item.day || 'Monday').toLowerCase() === selectedDay.toLowerCase()
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Class Timetable</h1>
          <p className="text-dark-muted mt-1">Manage weekly class schedules and period layouts.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddModal(true)} className="premium-button-primary">
            <Plus size={16} /> Add Schedule
          </button>
          <button onClick={fetchTimetable} className="premium-button-secondary">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <GlassCard className="lg:col-span-1 p-6 h-fit space-y-4">
          <h3 className="font-bold flex items-center gap-2 border-b border-dark-border pb-3">
            <Calendar size={18} className="text-primary-500" /> Choose Day
          </h3>
          <div className="space-y-1">
            {days.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all ${selectedDay === d ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-dark-muted hover:bg-white/5 hover:text-white'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-3 p-6">
          <h2 className="text-xl font-bold mb-6">{selectedDay}'s Lecture Timetable</h2>
          {loading ? (
            <div className="text-center py-20 text-dark-muted">Loading timetable...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-dark-muted border-2 border-dashed border-dark-border rounded-xl">
              <Clock size={40} className="mx-auto opacity-30 mb-3" />
              <p className="font-bold">No lectures scheduled for {selectedDay}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((item, idx) => (
                <div key={item.id || idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-dark-border hover:border-primary-500/30 transition-all group">
                  <div className="flex items-center gap-6">
                    <div className="px-3 py-1 bg-dark-hover rounded-lg text-xs font-bold text-primary-400 font-mono">
                      {item.time}
                    </div>
                    <div>
                      <h4 className="font-bold text-white group-hover:text-primary-400 transition-all">{item.subject}</h4>
                      <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest mt-0.5">
                        Class {item.class} {item.room ? `• Room ${item.room}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-dark-muted">Lecture {idx + 1}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="p-8 w-full max-w-md animate-scale-up relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-xl text-dark-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Clock className="text-primary-500" /> Add Period Schedule
            </h2>

            <form onSubmit={handleAddPeriod} className="space-y-5">
              <div>
                <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Subject</label>
                <select 
                  value={newPeriod.subject} 
                  onChange={(e) => setNewPeriod(p => ({ ...p, subject: e.target.value }))}
                  className="w-full premium-input bg-dark-card"
                >
                  {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Urdu', 'Islamiat'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Class</label>
                  <select 
                    value={newPeriod.class} 
                    onChange={(e) => setNewPeriod(p => ({ ...p, class: e.target.value }))}
                    className="w-full premium-input bg-dark-card"
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(c => <option key={c} value={c}>{c} Grade</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Room</label>
                  <input 
                    type="text" 
                    value={newPeriod.room} 
                    onChange={(e) => setNewPeriod(p => ({ ...p, room: e.target.value }))}
                    className="w-full premium-input"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Timing</label>
                <input 
                  type="text" 
                  placeholder="e.g. 08:30 AM - 09:15 AM"
                  value={newPeriod.time} 
                  onChange={(e) => setNewPeriod(p => ({ ...p, time: e.target.value }))}
                  className="w-full premium-input"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={saving}
                className="w-full premium-button-primary py-3 mt-4"
              >
                <Save size={18} /> {saving ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default Timetable;
