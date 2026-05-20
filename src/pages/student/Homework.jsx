import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

const Homework = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const studentClass = userData?.class || '';

  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomework();
  }, [userData]);

  const fetchHomework = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'homework'),
        where('schoolId', '==', schoolId)
      );
      const snap = await getDocs(q);
      const allHomework = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter homework matching the student's class
      const filtered = allHomework.filter(h => h.class === studentClass || !h.class);
      setHomework(filtered);
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
          <h1 className="text-3xl font-bold text-dark-text">Home Assignments</h1>
          <p className="text-dark-muted mt-1">View homework tasks assigned by your subject teachers.</p>
        </div>
        <button onClick={fetchHomework} className="premium-button-secondary">
          <RefreshCw size={18} /> Sync
        </button>
      </div>

      <GlassCard className="p-8">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <BookOpen size={20} className="text-primary-500" /> Pending & Completed Tasks
        </h2>

        {loading ? (
          <div className="py-12 text-center text-dark-muted">Loading assignments...</div>
        ) : homework.length === 0 ? (
          <div className="text-center py-12 text-dark-muted">No homework tasks assigned yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {homework.map(task => (
              <GlassCard key={task.id} className="p-5 border-l-4 border-l-primary-500 hover:border-primary-500/30 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-white text-lg">{task.subject || 'Subject'}</h3>
                    <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest mt-0.5">Assigned by: {task.teacher || 'Teacher'}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-primary-400 font-mono text-[10px] uppercase tracking-widest font-black">
                    Due: {task.dueDate || task.due || 'No Date'}
                  </span>
                </div>
                <p className="text-sm text-dark-muted leading-relaxed mb-4">{task.task || task.description || 'No description provided.'}</p>
                <div className="flex items-center justify-between pt-2 border-t border-dark-border text-xs">
                  <span className="flex items-center gap-1 text-dark-muted"><Calendar size={14}/> Assigned: {task.date || 'N/A'}</span>
                  <span className="flex items-center gap-1 text-green-500 font-bold"><CheckCircle2 size={14}/> Assigned</span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default Homework;
