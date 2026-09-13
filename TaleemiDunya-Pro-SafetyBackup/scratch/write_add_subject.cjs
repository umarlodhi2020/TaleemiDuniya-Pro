const fs = require('fs');

const addSubjectComponent = `import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { addDoc, collection, serverTimestamp, setDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { Trash2, Edit2 } from 'lucide-react';

const AddSubject = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const [subjects, setSubjects] = useState([]);
  
  // Realtime fetch subjects
  useEffect(() => {
    if (!userData?.schoolId) return;
    const unsub = onSnapshot(collection(db, 'subjects'), (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.schoolId === userData.schoolId);
      setSubjects(data);
    });
    return () => unsub();
  }, [userData]);

  // Make classes available for the form
  const getClasses = () => {
    return schoolData?.classes || [];
  };

  const [newSubject, setNewSubject] = useState({
    name: '', class: '', totalMarks: 100, passingPercentage: 33,
    theoryMarks: 75, practicalMarks: 25, term: 'First Term'
  });
  
  const handleAddSubject = async () => {
    try {
      if (!newSubject.name || !newSubject.class) {
        alert('Please fill subject name and class');
        return;
      }
      if (newSubject.id) {
        // Edit existing
        const docRef = doc(db, 'subjects', newSubject.id);
        await setDoc(docRef, {
          ...newSubject,
          updatedAt: serverTimestamp()
        }, { merge: true });
        alert('Subject updated successfully!');
      } else {
        // Add new
        await addDoc(collection(db, 'subjects'), {
          ...newSubject,
          schoolId: userData.schoolId,
          createdAt: serverTimestamp()
        });
        alert('Subject added successfully!');
      }
      setNewSubject({
        name: '', class: '', totalMarks: 100, passingPercentage: 33,
        theoryMarks: 75, practicalMarks: 25, term: 'First Term'
      });
    } catch (error) {
      console.error("Error saving subject:", error);
      alert("Error saving subject");
    }
  };

  const handleEditSubject = (subj) => {
    setNewSubject(subj);
  };

  const handleDeleteSubject = async (id) => {
    if(window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await deleteDoc(doc(db, 'subjects', id));
        alert('Subject deleted!');
      } catch(error) {
        console.error('Error deleting subject:', error);
      }
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto">
      <h1 className="text-2xl md:text-3xl font-black text-white mb-6">Subject Management</h1>
      <div className="space-y-6 animate-fade-in">
        <GlassCard className="p-8 bg-gradient-to-b from-dark-card to-dark-bg border border-dark-border/80">
          <div className="flex items-center justify-between pb-4 border-b border-dark-border/60 mb-6">
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                📚
              </span>
              Subject Configuration
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">Subject Name</label>
              <input
                type="text"
                list="existing-subjects"
                value={newSubject.name}
                onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                className="w-full bg-dark-bg/50 border border-dark-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="e.g. Mathematics"
              />
              <datalist id="existing-subjects">
                {[...new Set(subjects.map(s => s.name))].map((name, i) => (
                  <option key={i} value={name} />
                ))}
              </datalist>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">Class</label>
              <select
                value={newSubject.class}
                onChange={(e) => setNewSubject({...newSubject, class: e.target.value})}
                className="w-full bg-dark-bg/50 border border-dark-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none"
              >
                <option value="">Select Class</option>
                {getClasses().map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">Total Marks</label>
              <input
                type="number"
                value={newSubject.totalMarks}
                onChange={(e) => setNewSubject({...newSubject, totalMarks: Number(e.target.value)})}
                className="w-full bg-dark-bg/50 border border-dark-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">Theory Marks</label>
              <input
                type="number"
                value={newSubject.theoryMarks}
                onChange={(e) => setNewSubject({...newSubject, theoryMarks: Number(e.target.value)})}
                className="w-full bg-dark-bg/50 border border-dark-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">Practical Marks</label>
              <input
                type="number"
                value={newSubject.practicalMarks}
                onChange={(e) => setNewSubject({...newSubject, practicalMarks: Number(e.target.value)})}
                className="w-full bg-dark-bg/50 border border-dark-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">Passing %</label>
              <input
                type="number"
                value={newSubject.passingPercentage}
                onChange={(e) => setNewSubject({...newSubject, passingPercentage: Number(e.target.value)})}
                className="w-full bg-dark-bg/50 border border-dark-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 transition-all"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleAddSubject}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all flex items-center gap-2"
            >
              <span className="text-lg">💾</span>
              {newSubject.id ? 'Update Subject' : 'Save Subject'}
            </button>
          </div>
        </GlassCard>

        {/* Existing Subjects Table */}
        <GlassCard className="p-8 bg-dark-card/50 border border-dark-border/40">
          <h3 className="text-lg font-black text-white mb-4">Existing Subjects</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-border/60">
                  <th className="p-3 text-xs font-bold text-dark-muted uppercase tracking-wider">Subject</th>
                  <th className="p-3 text-xs font-bold text-dark-muted uppercase tracking-wider">Class</th>
                  <th className="p-3 text-xs font-bold text-dark-muted uppercase tracking-wider">Total</th>
                  <th className="p-3 text-xs font-bold text-dark-muted uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.length > 0 ? subjects.map((subj) => (
                  <tr key={subj.id} className="border-b border-dark-border/40 hover:bg-white/5">
                    <td className="p-3 text-sm font-semibold text-white">{subj.name}</td>
                    <td className="p-3 text-sm text-gray-300">{subj.class || 'Unassigned Grade'}</td>
                    <td className="p-3 text-sm text-gray-300">{subj.totalMarks || 100}</td>
                    <td className="p-3 text-sm text-center flex items-center justify-center gap-2">
                      <button onClick={() => handleEditSubject(subj)} className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/40" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteSubject(subj.id)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-400 text-sm">No subjects found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default AddSubject;
`;

fs.writeFileSync('src/pages/school-admin/AddSubject.jsx', addSubjectComponent, 'utf8');
console.log('AddSubject.jsx written cleanly.');
