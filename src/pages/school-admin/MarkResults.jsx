import React, { useState, useEffect } from 'react';
import { 
  Award, 
  ArrowLeft, 
  Save, 
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const MarkResults = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { userData } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState('10');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');

  // Pre-fill class assigned to the selected exam
  useEffect(() => {
    if (!examId) return;
    const fetchExamClass = async () => {
      try {
        const schoolId = userData?.schoolId || 'default-school';
        const examsList = await getRecords('exams', schoolId);
        const correspondingExam = examsList.find(e => e.id === examId);
        if (correspondingExam && correspondingExam.classes) {
          setSelectedClass(correspondingExam.classes);
        }
      } catch (err) {
        console.error("Error setting default exam class:", err);
      }
    };
    fetchExamClass();
  }, [examId, userData]);

  useEffect(() => {
    fetchStudents();
  }, [selectedClass, userData]);

  const fetchStudents = async () => {
    setLoading(true);
    const data = await getRecords('students', userData?.schoolId || 'default-school', [
      { field: 'class', operator: '==', value: selectedClass }
    ]);
    setStudents(data.map(s => ({ ...s, totalMarks: 100, obtainedMarks: '' })));
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = students.map(s => {
        const resultId = `${s.id}_${examId}_${selectedSubject}`;
        return setDoc(doc(db, 'results', resultId), {
          studentId: s.id,
          studentName: s.name,
          examId,
          subject: selectedSubject,
          totalMarks: Number(s.totalMarks),
          obtainedMarks: Number(s.obtainedMarks),
          schoolId: userData?.schoolId || 'default-school',
          updatedAt: new Date()
        });
      });
      await Promise.all(promises);
      alert('Results saved successfully!');
      const baseRoute = userData?.role === 'teacher' ? '/teacher' : '/school-admin';
      navigate(`${baseRoute}/exams`);
    } catch (error) {
      console.error(error);
      alert('Error saving results');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl text-dark-muted transition-all">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Mark Results</h1>
          <p className="text-dark-muted text-sm mt-0.5">Enter examination marks for students.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <GlassCard className="p-6 h-fit">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Award size={18} className="text-primary-500" /> Exam Details
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-dark-muted uppercase mb-1.5 block">Class</label>
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full premium-input bg-dark-card"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(c => <option key={c} value={c}>{c} Class</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-dark-muted uppercase mb-1.5 block">Subject</label>
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full premium-input bg-dark-card"
              >
                {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Urdu', 'Islamiat'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </GlassCard>

        <div className="lg:col-span-3 space-y-6">
          <GlassCard>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                    <th className="pb-4 px-4">Roll No</th>
                    <th className="pb-4 px-4">Student Name</th>
                    <th className="pb-4 px-4">Total Marks</th>
                    <th className="pb-4 px-4">Obtained Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {students.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 font-mono text-sm">{s.rollNumber}</td>
                      <td className="py-4 px-4 font-bold text-sm">{s.name}</td>
                      <td className="py-4 px-4">
                        <input 
                          type="number" 
                          value={s.totalMarks}
                          onChange={(e) => {
                            const newStudents = [...students];
                            newStudents[idx].totalMarks = e.target.value;
                            setStudents(newStudents);
                          }}
                          className="w-24 premium-input py-1.5 text-center" 
                        />
                      </td>
                      <td className="py-4 px-4">
                        <input 
                          type="number" 
                          placeholder="Marks"
                          value={s.obtainedMarks}
                          onChange={(e) => {
                            const newStudents = [...students];
                            newStudents[idx].obtainedMarks = e.target.value;
                            setStudents(newStudents);
                          }}
                          className="w-24 premium-input py-1.5 text-center border-primary-500/30" 
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {students.length === 0 && <div className="text-center py-20 text-dark-muted">No students found.</div>}
            </div>
            
            <div className="mt-8 pt-6 border-t border-dark-border flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving || students.length === 0}
                className="premium-button-primary"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Results'}
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default MarkResults;
