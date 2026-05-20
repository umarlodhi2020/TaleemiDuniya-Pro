import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Calendar, Save, Trash, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const Homework = () => {
  const { userData } = useAuth();
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create'
  const [selectedHomework, setSelectedHomework] = useState(null);

  // New Homework Form State
  const [newHW, setNewHW] = useState({
    title: '',
    subject: 'Mathematics',
    class: '10',
    dueDate: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    fetchHomeworks();
  }, [userData]);

  const fetchHomeworks = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'homework'),
        where('schoolId', '==', userData?.schoolId || 'default-school')
      );
      const snap = await getDocs(q);
      setHomeworks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newHW.title || !newHW.description) return;
    try {
      await addDoc(collection(db, 'homework'), {
        ...newHW,
        schoolId: userData?.schoolId || 'default-school',
        teacherName: userData?.name || 'Teacher',
        createdAt: serverTimestamp()
      });
      alert('Homework assigned successfully!');
      setNewHW({ title: '', subject: 'Mathematics', class: '10', dueDate: new Date().toISOString().split('T')[0], description: '' });
      setActiveTab('list');
      fetchHomeworks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Homework & Assignments</h1>
          <p className="text-dark-muted mt-1">Assign daily tasks, worksheets, and track student submissions.</p>
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
              onClick={() => setActiveTab('create')}
              className="premium-button-primary"
            >
              <Plus size={18} /> Assign Homework
            </button>
          )}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold mb-6">Assigned Tasks</h2>
              {loading ? (
                <div className="text-center py-10 text-dark-muted">Loading homework...</div>
              ) : homeworks.length === 0 ? (
                <div className="text-center py-10 text-dark-muted border-2 border-dashed border-dark-border rounded-xl">
                  <BookOpen size={40} className="mx-auto opacity-30 mb-3" />
                  <p className="font-bold">No homework assigned yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {homeworks.map(hw => (
                    <div 
                      key={hw.id}
                      onClick={() => setSelectedHomework(hw)}
                      className={`p-4 bg-white/5 border rounded-xl hover:border-primary-500/30 transition-all cursor-pointer flex justify-between items-start ${selectedHomework?.id === hw.id ? 'border-primary-500 bg-primary-500/5' : 'border-dark-border'}`}
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-white text-base">{hw.title}</h4>
                        <p className="text-xs text-dark-muted">{hw.subject} • Class {hw.class}</p>
                        <p className="text-xs text-primary-400 font-bold flex items-center gap-1.5 pt-1">
                          <Calendar size={12} /> Due: {hw.dueDate}
                        </p>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/5 text-dark-muted">Active</span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          <div className="lg:col-span-1">
            <GlassCard className="p-6 h-fit min-h-[300px]">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <FileText className="text-primary-500" size={20} /> Details & Submissions
              </h2>
              {selectedHomework ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg text-white">{selectedHomework.title}</h3>
                    <div className="flex gap-2">
                      <span className="text-[10px] uppercase font-bold bg-white/5 px-2.5 py-1 rounded text-primary-400">Class {selectedHomework.class}</span>
                      <span className="text-[10px] uppercase font-bold bg-white/5 px-2.5 py-1 rounded text-secondary-400">{selectedHomework.subject}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-dark-muted">Task Instruction:</span>
                    <p className="text-sm text-dark-muted whitespace-pre-wrap">{selectedHomework.description}</p>
                  </div>

                  <div className="pt-6 border-t border-dark-border space-y-4">
                    <h4 className="text-xs font-black uppercase text-dark-muted">Submission Stats</h4>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-white/5 rounded-xl border border-dark-border">
                        <p className="text-2xl font-black text-green-500">12</p>
                        <p className="text-[10px] text-dark-muted uppercase font-bold mt-1">Submitted</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-dark-border">
                        <p className="text-2xl font-black text-red-500">4</p>
                        <p className="text-[10px] text-dark-muted uppercase font-bold mt-1">Pending</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-dark-muted">
                  <AlertCircle size={32} className="mx-auto opacity-30 mb-2" />
                  <p className="text-sm">Select any assigned homework to view details and submission stats.</p>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <GlassCard className="p-8 max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BookOpen className="text-primary-500" /> Assign New Task
          </h2>
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Assignment Title</label>
              <input 
                type="text" 
                placeholder="Algebra Exercise 4.2" 
                value={newHW.title} 
                onChange={(e) => setNewHW(p => ({ ...p, title: e.target.value }))}
                className="w-full premium-input"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Class</label>
                <select 
                  value={newHW.class} 
                  onChange={(e) => setNewHW(p => ({ ...p, class: e.target.value }))}
                  className="w-full premium-input bg-dark-card"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(c => <option key={c} value={c}>{c} Grade</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Subject</label>
                <select 
                  value={newHW.subject} 
                  onChange={(e) => setNewHW(p => ({ ...p, subject: e.target.value }))}
                  className="w-full premium-input bg-dark-card"
                >
                  {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Urdu', 'Islamiat'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Due Date</label>
              <input 
                type="date" 
                value={newHW.dueDate} 
                onChange={(e) => setNewHW(p => ({ ...p, dueDate: e.target.value }))}
                className="w-full premium-input"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Instructions / Task description</label>
              <textarea 
                rows={4}
                placeholder="Write clear instructions for students..." 
                value={newHW.description} 
                onChange={(e) => setNewHW(p => ({ ...p, description: e.target.value }))}
                className="w-full premium-input"
                required
              />
            </div>
            <button type="submit" className="w-full premium-button-primary py-3 mt-4">
              Publish Assignment
            </button>
          </form>
        </GlassCard>
      )}
    </div>
  );
};

export default Homework;
