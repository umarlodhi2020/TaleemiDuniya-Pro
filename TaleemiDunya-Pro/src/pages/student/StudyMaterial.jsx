import React, { useState, useEffect } from 'react';
import { Archive, Download, BookOpen, RefreshCw, FileText } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

const StudyMaterial = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const studentClass = userData?.class || '';

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
  }, [userData]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'study_materials'),
        where('schoolId', '==', schoolId)
      );
      const snap = await getDocs(q);
      const allMaterials = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter materials matching the student's class
      const filtered = allMaterials.filter(m => m.class === studentClass || !m.class);
      setMaterials(filtered);
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
          <h1 className="text-3xl font-bold text-dark-text">Study Material</h1>
          <p className="text-dark-muted mt-1">Download shared syllabus, notes, and course textbooks.</p>
        </div>
        <button onClick={fetchMaterials} className="premium-button-secondary">
          <RefreshCw size={18} /> Sync
        </button>
      </div>

      <GlassCard className="p-8">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Archive size={20} className="text-primary-500" /> Syllabus & Course Materials
        </h2>

        {loading ? (
          <div className="py-12 text-center text-dark-muted">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="text-center py-12 text-dark-muted">
            <BookOpen size={40} className="mx-auto opacity-30 mb-3" />
            <p className="font-bold">No study materials shared yet</p>
            <p className="text-xs mt-1">Class notes uploaded by teachers will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.map(mat => (
              <GlassCard key={mat.id} className="p-5 flex flex-col justify-between hover:border-primary-500/30 transition-all">
                <div>
                  <div className="p-3 rounded-2xl bg-primary-500/10 text-primary-500 w-max mb-4">
                    <FileText size={24} />
                  </div>
                  <h3 className="font-bold text-white text-base mb-1">{mat.title}</h3>
                  <p className="text-xs text-dark-muted mb-4">Subject: {mat.subject || 'N/A'}</p>
                  <p className="text-sm text-dark-muted leading-relaxed line-clamp-3 mb-6">{mat.description || 'Syllabus and notes files.'}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-dark-border">
                  <span className="text-[10px] text-dark-muted font-black uppercase tracking-widest">Class {mat.class}</span>
                  <a 
                    href={mat.fileUrl || '#'} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="premium-button-secondary py-1.5 px-3 text-xs flex items-center gap-1"
                  >
                    <Download size={12} /> Download
                  </a>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default StudyMaterial;
