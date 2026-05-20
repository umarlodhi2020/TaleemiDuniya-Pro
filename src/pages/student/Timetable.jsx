import React, { useState, useEffect } from 'react';
import { Clock, Calendar, RefreshCw } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const Timetable = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetable();
  }, [userData]);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'bell_schedules', schoolId);
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().periods) {
        setPeriods(snap.data().periods);
      } else {
        // Fallback default list
        setPeriods([
          { id: '1', name: '1st Period', startTime: '08:00', endTime: '08:45', type: 'Class' },
          { id: '2', name: '2nd Period', startTime: '08:45', endTime: '09:30', type: 'Class' },
          { id: '3', name: 'Break Time', startTime: '09:30', endTime: '10:00', type: 'Break' },
          { id: '4', name: '3rd Period', startTime: '10:00', endTime: '10:45', type: 'Class' },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">Class Timetable</h1>
          <p className="text-dark-muted mt-1">View daily class sessions and bell timings.</p>
        </div>
        <button onClick={fetchTimetable} className="premium-button-secondary">
          <RefreshCw size={18} /> Sync
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <GlassCard className="p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Clock className="text-primary-500" size={20} /> Daily Time Schedule
            </h2>

            {loading ? (
              <div className="py-12 text-center text-dark-muted">Loading timetable...</div>
            ) : periods.length === 0 ? (
              <div className="text-center py-12 text-dark-muted">No timetables assigned yet.</div>
            ) : (
              <div className="space-y-4">
                {periods.map((period, index) => (
                  <div key={period.id || index} className="flex gap-4 items-center p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-xs font-bold text-dark-muted">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-sm">{period.name}</h4>
                      <span className="text-[10px] text-dark-muted font-black uppercase tracking-widest block mt-0.5">{period.type || 'Class'}</span>
                    </div>
                    <div className="text-right text-xs text-primary-400 font-mono font-bold">
                      {period.startTime} - {period.endTime}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        <div>
          <GlassCard className="p-6 bg-gradient-to-br from-secondary-500/10 to-primary-500/10 border-secondary-500/20 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary-500/20 flex items-center justify-center mx-auto mb-4">
              <Calendar className="text-secondary-500 w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-2">School Timings</h3>
            <p className="text-xs text-dark-muted">
              Regular classes operate Monday through Saturday. The bell alerts automatically ring at the end of each period.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Timetable;
