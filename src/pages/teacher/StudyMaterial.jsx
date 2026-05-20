import React, { useState, useEffect } from 'react';
import { Archive, Plus, Download, Trash, FileText, Globe, File } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const StudyMaterial = () => {
  const { userData } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'upload'
  
  // Upload State
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    subject: 'Mathematics',
    class: '10',
    type: 'PDF Notes',
    description: '',
  });

  useEffect(() => {
    fetchMaterials();
  }, [userData]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'materials'),
        where('schoolId', '==', userData?.schoolId || 'default-school')
      );
      const snap = await getDocs(q);
      setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newMaterial.title) return;
    try {
      await addDoc(collection(db, 'materials'), {
        ...newMaterial,
        schoolId: userData?.schoolId || 'default-school',
        teacherName: userData?.name || 'Teacher',
        createdAt: serverTimestamp()
      });
      alert('Material published successfully!');
      setNewMaterial({ title: '', subject: 'Mathematics', class: '10', type: 'PDF Notes', description: '' });
      setActiveTab('list');
      fetchMaterials();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Study Materials</h1>
          <p className="text-dark-muted mt-1">Upload lecture notes, worksheets, and syllabus PDFs for students.</p>
        </div>

        <div className="flex gap-2">
          {activeTab !== 'list' && (
            <button 
              onClick={() => setActiveTab('list')}
              className="premium-button-secondary"
            >
              Back to Repository
            </button>
          )}
          {activeTab === 'list' && (
            <button 
              onClick={() => setActiveTab('upload')}
              className="premium-button-primary"
            >
              <Plus size={18} /> Upload Material
            </button>
          )}
        </div>
      </div>

      {activeTab === 'list' ? (
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold mb-6">Resource Repository</h2>
          {loading ? (
            <div className="text-center py-10 text-dark-muted">Loading repository...</div>
          ) : materials.length === 0 ? (
            <div className="text-center py-10 text-dark-muted border-2 border-dashed border-dark-border rounded-xl">
              <Archive size={40} className="mx-auto opacity-30 mb-3" />
              <p className="font-bold">No study materials uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {materials.map(m => (
                <GlassCard key={m.id} className="p-5 border border-dark-border hover:border-primary-500/30 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary-500/10 text-primary-500 rounded-xl">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-white leading-tight">{m.title}</h4>
                        <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider mt-0.5">{m.subject} • Class {m.class}</p>
                      </div>
                    </div>
                    {m.description && <p className="text-xs text-dark-muted">{m.description}</p>}
                  </div>

                  <div className="flex justify-between items-center mt-5 pt-4 border-t border-dark-border">
                    <span className="text-[10px] font-black uppercase bg-white/5 px-2 py-0.5 rounded text-secondary-400">{m.type}</span>
                    <button 
                      onClick={() => alert('Worksheet / Notes downloaded successfully!')}
                      className="p-2 bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white rounded-lg border border-primary-500/20 transition-all"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="p-8 max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Plus className="text-primary-500" /> Share Material</h2>
          <form onSubmit={handleUpload} className="space-y-5">
            <div>
              <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Material Title</label>
              <input 
                type="text" 
                placeholder="Algebra Chapter 2 notes" 
                value={newMaterial.title} 
                onChange={(e) => setNewMaterial(p => ({ ...p, title: e.target.value }))}
                className="w-full premium-input"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Class</label>
                <select 
                  value={newMaterial.class} 
                  onChange={(e) => setNewMaterial(p => ({ ...p, class: e.target.value }))}
                  className="w-full premium-input bg-dark-card"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(c => <option key={c} value={c}>{c} Grade</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Subject</label>
                <select 
                  value={newMaterial.subject} 
                  onChange={(e) => setNewMaterial(p => ({ ...p, subject: e.target.value }))}
                  className="w-full premium-input bg-dark-card"
                >
                  {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Urdu', 'Islamiat'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Material Type</label>
                <select 
                  value={newMaterial.type} 
                  onChange={(e) => setNewMaterial(p => ({ ...p, type: e.target.value }))}
                  className="w-full premium-input bg-dark-card"
                >
                  <option value="PDF Notes">PDF Notes</option>
                  <option value="Worksheet">Worksheet</option>
                  <option value="Syllabus">Syllabus</option>
                  <option value="Assignment Guide">Assignment Guide</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Brief description / Topic cover</label>
              <textarea 
                rows={4}
                placeholder="Include description or chapter reference..." 
                value={newMaterial.description} 
                onChange={(e) => setNewMaterial(p => ({ ...p, description: e.target.value }))}
                className="w-full premium-input"
              />
            </div>
            <button type="submit" className="w-full premium-button-primary py-3">
              Upload Study Resource
            </button>
          </form>
        </GlassCard>
      )}
    </div>
  );
};

export default StudyMaterial;
