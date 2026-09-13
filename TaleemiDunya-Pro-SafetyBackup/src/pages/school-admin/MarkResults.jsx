import React, { useState, useEffect } from 'react';
import { 
  Award, 
  ArrowLeft, 
  Save, 
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Swal from 'sweetalert2';

const MarkResults = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { userData } = useAuth();
  
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(examId || '');
  
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjectTotalMarks, setSubjectTotalMarks] = useState(100);
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [gradingRules, setGradingRules] = useState([]);

  const schoolId = userData?.schoolId || 'default-school';
  const baseRoute = userData?.role === 'teacher' ? '/teacher' : '/school-admin';

  // 1. Fetch Master Data on Mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch all exams
        const examsList = await getRecords('exams', schoolId);
        setExams(examsList);
        
        // Fetch grading rules
        const rules = await getRecords('gradingRules', schoolId);
        setGradingRules(rules.sort((a, b) => Number(b.maxPercent) - Number(a.maxPercent)));
        
      } catch (error) {
        console.error("Error fetching master data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [schoolId]);

  // 2. When Exam is selected, determine available classes
  useEffect(() => {
    if (!selectedExamId || exams.length === 0) return;
    const selectedExam = exams.find(e => e.id === selectedExamId);
    if (selectedExam) {
      // For now, if exam.classes is a single string '10', we put it in array. If it's comma separated, we split.
      let availableClasses = [];
      if (typeof selectedExam.classes === 'string') {
        availableClasses = selectedExam.classes.split(',').map(c => c.trim());
      } else if (Array.isArray(selectedExam.classes)) {
        availableClasses = selectedExam.classes;
      } else {
        // Fallback: show 1-10
        availableClasses = ['1','2','3','4','5','6','7','8','9','10'];
      }
      setClasses(availableClasses);
      if (availableClasses.length > 0 && !selectedClass) {
        setSelectedClass(availableClasses[0]);
      }
    }
  }, [selectedExamId, exams]);

  // 3. When Class is selected, fetch Subjects and Students
  useEffect(() => {
    if (!selectedClass) return;
    
    const fetchClassData = async () => {
      setLoading(true);
      try {
        // Fetch Subjects for this class
        const allSubjects = await getRecords('subjects', schoolId, [
          { field: 'classAssigned', operator: '==', value: selectedClass }
        ]);
        setSubjects(allSubjects);
        if (allSubjects.length > 0) {
          setSelectedSubject(allSubjects[0].subjectName);
          setSubjectTotalMarks(allSubjects[0].totalMarks || 100);
        } else {
          setSelectedSubject('');
        }

        // Fetch Students for this class
        const studentsData = await getRecords('students', schoolId, [
          { field: 'class', operator: '==', value: selectedClass }
        ]);
        
        // Check if marks already exist for this exam + class + subject
        // We will fetch it when subject is selected (in next useEffect)
        setStudents(studentsData.map(s => ({ 
          ...s, 
          obtainedMarks: '', 
          isAbsent: false 
        })));
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchClassData();
  }, [selectedClass, schoolId]);

  // 4. When Subject changes, fetch existing results to pre-fill
  useEffect(() => {
    if (!selectedSubject || !selectedExamId || students.length === 0) return;
    
    // Update total marks based on selected subject
    const subj = subjects.find(s => s.subjectName === selectedSubject);
    if (subj) setSubjectTotalMarks(subj.totalMarks || 100);

    const checkExistingResults = async () => {
      setLoading(true);
      try {
        const existingResults = await getRecords('results', schoolId, [
          { field: 'examId', operator: '==', value: selectedExamId },
          { field: 'subject', operator: '==', value: selectedSubject }
        ]);
        
        if (existingResults.length > 0) {
          setStudents(prevStudents => prevStudents.map(student => {
            const existingMark = existingResults.find(r => r.studentId === student.id);
            if (existingMark) {
              return {
                ...student,
                obtainedMarks: existingMark.obtainedMarks === 'ABS' ? '' : existingMark.obtainedMarks,
                isAbsent: existingMark.obtainedMarks === 'ABS'
              };
            }
            return student;
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    checkExistingResults();
  }, [selectedSubject, selectedExamId, schoolId]);

  // Handle Mark Change
  const handleMarkChange = (idx, value) => {
    const newStudents = [...students];
    const val = value === '' ? '' : Number(value);
    
    // Prevent entering more than total marks
    if (val !== '' && val > subjectTotalMarks) {
      Swal.fire('Error', `Marks cannot exceed total marks (${subjectTotalMarks})`, 'error');
      return;
    }
    
    newStudents[idx].obtainedMarks = val;
    setStudents(newStudents);
  };

  // Handle Absent Toggle
  const handleAbsentToggle = (idx) => {
    const newStudents = [...students];
    newStudents[idx].isAbsent = !newStudents[idx].isAbsent;
    if (newStudents[idx].isAbsent) {
      newStudents[idx].obtainedMarks = '';
    }
    setStudents(newStudents);
  };

  // Auto Grade Calculator Helper
  const calculateGrade = (obtained, total) => {
    if (obtained === 'ABS') return { grade: 'F', remarks: 'Absent', gpa: 0 };
    if (!obtained && obtained !== 0) return { grade: 'N/A', remarks: '', gpa: 0 };
    
    const percentage = (obtained / total) * 100;
    
    for (const rule of gradingRules) {
      if (percentage >= Number(rule.minPercent) && percentage <= Number(rule.maxPercent)) {
        return {
          grade: rule.grade,
          remarks: rule.remarks,
          gpa: rule.gradePoint || 0
        };
      }
    }
    
    // Fallback if no rules match
    if (percentage >= 33) return { grade: 'Pass', remarks: 'Passed', gpa: 2.0 };
    return { grade: 'F', remarks: 'Failed', gpa: 0 };
  };

  const handleSave = async () => {
    if (!selectedExamId || !selectedSubject) {
      Swal.fire('Error', 'Please select Exam and Subject', 'error');
      return;
    }

    setSaving(true);
    try {
      const promises = students.map(s => {
        const resultId = `${s.id}_${selectedExamId}_${selectedSubject}`;
        
        let finalMarks = s.isAbsent ? 'ABS' : s.obtainedMarks;
        if (finalMarks === '') finalMarks = 0; // default to 0 if left blank but not absent

        const gradeData = calculateGrade(finalMarks, subjectTotalMarks);

        return setDoc(doc(db, 'results', resultId), {
          studentId: s.id,
          studentName: s.name,
          examId: selectedExamId,
          subject: selectedSubject,
          totalMarks: Number(subjectTotalMarks),
          obtainedMarks: finalMarks,
          grade: gradeData.grade,
          remarks: gradeData.remarks,
          gpa: gradeData.gpa,
          schoolId,
          updatedAt: new Date()
        });
      });
      
      await Promise.all(promises);
      Swal.fire('Saved!', 'Results saved and graded successfully!', 'success');
      navigate(`${baseRoute}/exam-results`);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Failed to save results', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && exams.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary-500 mb-4" size={40} />
        <p className="text-dark-muted font-bold">Loading Academic Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl text-dark-muted transition-all">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Marks Entry</h1>
          <p className="text-dark-muted text-sm mt-0.5">Enter examination marks for students. Grades are auto-calculated.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <GlassCard className="p-6 h-fit lg:sticky lg:top-24 space-y-6">
          <h3 className="font-bold flex items-center gap-2 border-b border-dark-border pb-3">
            <Award size={18} className="text-primary-500" /> Exam Configuration
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-dark-muted uppercase mb-1.5 block">Select Exam</label>
              <select 
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full premium-input bg-dark-card text-sm"
              >
                <option value="">-- Choose Exam --</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.title || e.examName}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-dark-muted uppercase mb-1.5 block">Class</label>
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full premium-input bg-dark-card text-sm"
                disabled={!selectedExamId}
              >
                {classes.length === 0 && <option value="">No classes</option>}
                {classes.map(c => <option key={c} value={c}>{c} Class</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-dark-muted uppercase mb-1.5 block">Subject</label>
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full premium-input bg-dark-card text-sm"
                disabled={!selectedClass}
              >
                {subjects.length === 0 && <option value="">No subjects assigned</option>}
                {subjects.map(s => <option key={s.id} value={s.subjectName}>{s.subjectName} (Max: {s.totalMarks})</option>)}
              </select>
            </div>
            
            <div className="pt-4 border-t border-dark-border">
              <button 
                onClick={handleSave}
                disabled={saving || students.length === 0}
                className="w-full premium-button-primary py-3 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>Save Results</span>
              </button>
            </div>
          </div>
        </GlassCard>

        <div className="lg:col-span-3 space-y-6">
          <GlassCard className="p-0 overflow-hidden">
            {loading ? (
               <div className="py-20 text-center">
                 <Loader2 size={40} className="animate-spin text-primary-500 mx-auto mb-4" />
                 <p className="text-dark-muted font-bold">Loading Roster...</p>
               </div>
            ) : !selectedSubject ? (
               <div className="py-20 text-center">
                 <AlertCircle size={40} className="text-dark-muted mx-auto mb-4 opacity-50" />
                 <h3 className="text-xl font-bold text-white mb-2">Subject Required</h3>
                 <p className="text-dark-muted text-sm">Please select an Exam, Class, and Subject to enter marks.</p>
               </div>
            ) : students.length === 0 ? (
               <div className="py-20 text-center">
                 <AlertCircle size={40} className="text-dark-muted mx-auto mb-4 opacity-50" />
                 <h3 className="text-xl font-bold text-white mb-2">No Students Found</h3>
                 <p className="text-dark-muted text-sm">There are no students enrolled in Class {selectedClass}.</p>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-dark-muted uppercase font-black tracking-widest border-b border-dark-border bg-dark-bg/50">
                      <th className="py-4 px-6">Roll No</th>
                      <th className="py-4 px-6">Student Name</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-right">Obtained Marks / {subjectTotalMarks}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {students.map((s, idx) => (
                      <tr key={s.id} className={`transition-colors ${s.isAbsent ? 'bg-red-500/5' : 'hover:bg-white/5'}`}>
                        <td className="py-4 px-6 font-mono text-sm text-dark-muted">{s.rollNumber}</td>
                        <td className="py-4 px-6 font-bold text-white">{s.name}</td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleAbsentToggle(idx)}
                            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all ${
                              s.isAbsent 
                                ? 'bg-red-500/20 text-red-500 border-red-500/30' 
                                : 'bg-dark-bg text-dark-muted border-dark-border hover:border-white/20'
                            }`}
                          >
                            {s.isAbsent ? 'ABSENT' : 'PRESENT'}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <input 
                            type="number" 
                            disabled={s.isAbsent}
                            value={s.obtainedMarks}
                            onChange={(e) => handleMarkChange(idx, e.target.value)}
                            max={subjectTotalMarks}
                            min={0}
                            placeholder={s.isAbsent ? 'ABS' : 'Enter marks'}
                            className={`w-28 text-right font-mono font-bold text-lg bg-dark-bg border rounded-xl px-3 py-2 transition-colors focus:outline-none focus:border-primary-500 ${
                              s.isAbsent ? 'border-red-500/30 text-red-500/50 cursor-not-allowed' : 'border-dark-border text-white'
                            }`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default MarkResults;
