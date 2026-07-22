import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import {
  BookOpen, FileText, Download, Upload, Plus, Trash2, CheckCircle2,
  Filter, Search, RefreshCw, Save, X, ExternalLink, Video, Bookmark,
  Award, Clock, Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const DigitalLibrary = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // 'ALL', 'NOTES', 'PAST_PAPER', 'VIDEO'
  const [selectedClass, setSelectedClass] = useState('ALL');

  const [form, setForm] = useState({
    title: '',
    category: 'NOTES', // 'NOTES', 'PAST_PAPER', 'VIDEO', 'HOMEWORK'
    subject: 'Physics',
    className: '10th',
    description: '',
    linkOrAttachment: 'https://example.com/sample-notes.pdf',
    uploaderName: userData?.name || 'Sir Usman (Senior Teacher)'
  });

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'digital_library'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !r.schoolId || r.schoolId === schoolId);

      const isDemo = userData?.email === 'demo_admin@taleemidunya.com';
      if (list.length === 0 && isDemo) {
        setResources([
          {
            id: 'demo-res-1',
            title: 'Chapter 1 to 5 Comprehensive Solved Notes & Numerical Guide',
            category: 'NOTES',
            subject: 'Physics',
            className: '10th',
            description: 'Contains complete board definitions, short questions, and solved exercise formulas.',
            linkOrAttachment: 'https://example.com/physics-ch1-5.pdf',
            uploaderName: 'Sir Usman (Head of Science)',
            createdAt: new Date().toISOString(),
            downloadsCount: 142
          },
          {
            id: 'demo-res-2',
            title: 'Past 5 Years Solved Board Question Papers (2021-2025)',
            category: 'PAST_PAPER',
            subject: 'Mathematics',
            className: '10th',
            description: 'Lahore & Gujranwala Board past papers with step-by-step algebra solutions.',
            linkOrAttachment: 'https://example.com/math-solved-papers.pdf',
            uploaderName: 'Sir Ali Raza',
            createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
            downloadsCount: 289
          },
          {
            id: 'demo-res-3',
            title: 'Organic Chemistry Reactions & Equations Video Lecture Series',
            category: 'VIDEO',
            subject: 'Chemistry',
            className: '9th',
            description: 'Animated video explanation of covalent bonding and balancing equations.',
            linkOrAttachment: 'https://youtube.com/watch?v=demo123',
            uploaderName: 'Madam Ayesha',
            createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
            downloadsCount: 95
          }
        ]);
      } else {
        setResources(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResource = async (e) => {
    e.preventDefault();
    if (!form.title) return;

    try {
      const payload = {
        ...form,
        downloadsCount: 0,
        schoolId,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'digital_library'), payload);
      setResources(prev => [{ id: docRef.id, ...payload }, ...prev]);
      setShowAddModal(false);
      setForm({ title: '', category: 'NOTES', subject: 'Physics', className: '10th', description: '', linkOrAttachment: 'https://example.com/notes.pdf', uploaderName: userData?.name || 'Teacher' });
    } catch (err) {
      alert(`Error adding study resource: ${err.message}`);
    }
  };

  const handleDeleteResource = async (id) => {
    if (!confirm('Remove this study material from library?')) return;
    try {
      if (!id.startsWith('demo-')) {
        await deleteDoc(doc(db, 'digital_library', id));
      }
      setResources(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  const filteredResources = resources.filter(r => {
    if (selectedCategory !== 'ALL' && r.category !== selectedCategory) return false;
    if (selectedClass !== 'ALL' && r.className !== selectedClass) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-primary-500 mr-3" size={32} />
        <p className="text-dark-muted font-bold">Loading Digital Library & Study Material Hub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <BookOpen className="text-cyan-400" size={32} />
            Digital Library & Study Notes Hub
          </h1>
          <p className="text-dark-muted mt-1 font-medium">
            Upload PDF notes, past board papers, and video lectures. Students can download & access 24/7.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="premium-button-primary flex items-center gap-2 self-start md:self-auto"
        >
          <Upload size={18} /> Upload New Study Material
        </button>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-dark-card border border-dark-border">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'ALL', label: 'All Resources 📚' },
            { id: 'NOTES', label: 'PDF Notes 📝' },
            { id: 'PAST_PAPER', label: 'Solved Past Papers 📄' },
            { id: 'VIDEO', label: 'Video Lectures 🎥' }
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                selectedCategory === c.id ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'bg-white/5 hover:bg-white/10 text-gray-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-dark-muted" />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="p-2.5 rounded-xl bg-[#151926] border border-white/10 text-xs text-white font-bold"
          >
            <option value="ALL">All Classes / Grades</option>
            <option value="10th">Class 10th</option>
            <option value="9th">Class 9th</option>
            <option value="8th">Class 8th</option>
            <option value="General">General / All Students</option>
          </select>
        </div>
      </div>

      {/* RESOURCES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredResources.map((res) => {
          const isVideo = res.category === 'VIDEO';
          const isPaper = res.category === 'PAST_PAPER';

          return (
            <GlassCard key={res.id} className="p-6 rounded-3xl border-2 border-dark-border hover:border-cyan-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-dark-border mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    isVideo ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    isPaper ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  }`}>
                    {res.category === 'PAST_PAPER' ? '📄 Past Board Paper' : res.category === 'VIDEO' ? '🎥 Video Lecture' : '📝 Study Notes'}
                  </span>
                  <button onClick={() => handleDeleteResource(res.id)} className="p-1.5 rounded-lg text-dark-muted hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-white/10 font-black text-xs text-amber-400">{res.className}</span>
                  <span className="font-bold text-xs text-gray-300">• {res.subject}</span>
                </div>

                <h3 className="text-lg font-black text-white leading-snug line-clamp-2">{res.title}</h3>
                <p className="text-xs text-dark-muted mt-2 line-clamp-3 leading-relaxed">{res.description || 'No detailed description provided.'}</p>
              </div>

              <div className="pt-6 border-t border-dark-border mt-6">
                <div className="flex items-center justify-between mb-4 text-[11px] text-dark-muted font-bold">
                  <span>Uploaded by: <strong className="text-gray-300">{res.uploaderName}</strong></span>
                  <span className="flex items-center gap-1"><Download size={13} /> {res.downloadsCount || 0} Downloads</span>
                </div>

                <a
                  href={res.linkOrAttachment}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setResources(prev => prev.map(r => r.id === res.id ? { ...r, downloadsCount: (r.downloadsCount || 0) + 1 } : r))}
                  className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 text-white ${
                    isVideo ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500'
                  }`}
                >
                  {isVideo ? <Video size={16} /> : <Download size={16} />}
                  {isVideo ? 'Watch Video Lecture' : 'Download PDF Document'}
                </a>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* UPLOAD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <GlassCard className="p-8 w-full max-w-lg rounded-3xl border-2 border-cyan-500/60 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-dark-border mb-6">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Upload className="text-cyan-400" size={22} />
                Upload New Study Material / PDF
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveResource} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-dark-muted mb-1">Resource Title</label>
                <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Chapter 1 to 5 Solved Board Numerical Guide" className="w-full premium-input text-sm" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full p-3 rounded-2xl bg-[#151926] border border-white/10 text-xs text-white font-bold">
                    <option value="NOTES">PDF Notes</option>
                    <option value="PAST_PAPER">Solved Past Paper</option>
                    <option value="VIDEO">Video Lecture</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Class / Grade</label>
                  <select value={form.className} onChange={e => setForm(f => ({ ...f, className: e.target.value }))} className="w-full p-3 rounded-2xl bg-[#151926] border border-white/10 text-xs text-white font-bold">
                    <option value="10th">Class 10th</option>
                    <option value="9th">Class 9th</option>
                    <option value="8th">Class 8th</option>
                    <option value="General">General / All</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Subject</label>
                  <input type="text" required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Physics" className="w-full premium-input text-xs" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-dark-muted mb-1">PDF Download Link or YouTube URL</label>
                <input type="text" required value={form.linkOrAttachment} onChange={e => setForm(f => ({ ...f, linkOrAttachment: e.target.value }))} placeholder="https://example.com/notes.pdf or YouTube link" className="w-full premium-input text-sm font-mono" />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-dark-muted mb-1">Short Description / Syllabus Topics Included</label>
                <textarea rows="3" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Contains definitions, solved MCQs, and long questions." className="w-full premium-input text-sm" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-dark-border">
                <button type="submit" className="flex-1 premium-button-primary flex items-center justify-center gap-2"><Save size={16} /> Publish to Library</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 premium-button-secondary">Cancel</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default DigitalLibrary;
