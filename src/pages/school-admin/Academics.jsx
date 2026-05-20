import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit2, 
  GraduationCap,
  Layers,
  Users,
  ChevronRight,
  UserCheck,
  UserX,
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Save,
  Printer,
  Globe,
  Award,
  AlertCircle,
  TrendingUp,
  UserPlus
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const Academics = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [activeTab, setActiveTab] = useState('classes'); // 'classes' | 'results'
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null); // Roster view for selected class
  
  // Search and Filter states
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [resultClassFilter, setResultClassFilter] = useState('all');
  const [resultSearchTerm, setResultSearchTerm] = useState('');

  // Result Editing State
  const [editingStudent, setEditingStudent] = useState(null);
  const [subjectMarks, setSubjectMarks] = useState({
    English: { obtained: '', total: 100 },
    Urdu: { obtained: '', total: 100 },
    Mathematics: { obtained: '', total: 100 },
    Science: { obtained: '', total: 100 },
    Computer: { obtained: '', total: 100 }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [publishStatus, setPublishStatus] = useState('Draft'); // 'Draft' | 'Published'
  
  // Printable view state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printStudent, setPrintStudent] = useState(null);

  // Mock data for class teachers, attendance, and fee pending count
  const mockClassData = {
    'NURSERY': { teacher: 'Miss Fatima', attendance: '96.2%', pendingFees: 1 },
    'KG': { teacher: 'Miss Ayesha', attendance: '95.4%', pendingFees: 2 },
    '1': { teacher: 'Mrs. Sonia', attendance: '97.1%', pendingFees: 0 },
    '2': { teacher: 'Mrs. Sadia', attendance: '94.8%', pendingFees: 3 },
    '3': { teacher: 'Miss Amina', attendance: '96.5%', pendingFees: 1 },
    '4': { teacher: 'Mr. Asif', attendance: '95.9%', pendingFees: 2 },
    '5': { teacher: 'Mr. Zahid', attendance: '96.0%', pendingFees: 0 },
    '6': { teacher: 'Miss Maria', attendance: '97.2%', pendingFees: 4 },
    '7': { teacher: 'Mrs. Hina', attendance: '94.5%', pendingFees: 1 },
    '8': { teacher: 'Mr. Kamran', attendance: '95.1%', pendingFees: 2 },
    '9': { teacher: 'Mr. Bilal Khan', attendance: '96.8%', pendingFees: 3 },
    '10': { teacher: 'Mr. Umar Lodhi', attendance: '98.3%', pendingFees: 0 },
    'default': { teacher: 'Assigned Teacher', attendance: '95.0%', pendingFees: 0 }
  };

  useEffect(() => {
    fetchAcademicData();
  }, [userData]);

  const fetchAcademicData = async () => {
    try {
      setLoading(true);
      // Fetch all students
      const studentData = await getRecords('students', schoolId);
      setStudents(studentData);

      // Fetch all subject-wise results
      const resultsData = await getRecords('results', schoolId);
      setResults(resultsData);
    } catch (error) {
      console.error("Error fetching academic data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Format class display name (e.g. "9" -> "9th Grade")
  const getClassDisplayName = (className) => {
    if (!className) return 'Unassigned Grade';
    const num = parseInt(className, 10);
    if (isNaN(num)) return className.toUpperCase(); // Handles NURSERY, KG, etc.
    
    const suffixes = ["th", "st", "nd", "rd"];
    const v = num % 100;
    const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
    return `${num}${suffix} Grade`;
  };

  // Sort classes (Nursery -> KG -> 1st -> 2nd ... -> 10th)
  const sortClasses = (a, b) => {
    const getOrderValue = (className) => {
      if (!className) return 999;
      const nameLower = className.toString().toLowerCase();
      if (nameLower.includes('nursery') || nameLower.includes('play')) return 1;
      if (nameLower.includes('kg') || nameLower.includes('prep')) return 2;
      const num = parseInt(className, 10);
      if (!isNaN(num)) return num + 2; 
      return 100;
    };
    return getOrderValue(a) - getOrderValue(b);
  };

  // Group students by Class for Classes Overview
  const classGroups = students.reduce((acc, student) => {
    const cls = student.class || 'Unassigned';
    if (!acc[cls]) {
      acc[cls] = {
        name: cls,
        students: [],
        sections: new Set(),
        maleCount: 0,
        femaleCount: 0,
        activeCount: 0
      };
    }
    acc[cls].students.push(student);
    if (student.section) {
      acc[cls].sections.add(student.section.toUpperCase());
    }
    if (student.gender?.toLowerCase() === 'male') {
      acc[cls].maleCount += 1;
    } else if (student.gender?.toLowerCase() === 'female') {
      acc[cls].femaleCount += 1;
    }
    if (student.status === 'Active') {
      acc[cls].activeCount += 1;
    }
    return acc;
  }, {});

  const classesData = Object.values(classGroups).sort((a, b) => sortClasses(a.name, b.name));

  const filteredClasses = classesData.filter(cls => 
    getClassDisplayName(cls.name).toLowerCase().includes(classSearchTerm.toLowerCase()) ||
    cls.name.toLowerCase().includes(classSearchTerm.toLowerCase())
  );

  const getSelectedClassStudents = () => {
    if (!selectedClass || !classGroups[selectedClass]) return [];
    return classGroups[selectedClass].students.filter(student => 
      student.name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.fatherName?.toLowerCase().includes(studentSearchTerm.toLowerCase())
    );
  };

  // Group results by Student ID to create unified student result cards
  const studentResultsMap = students.reduce((acc, student) => {
    const studentMarks = results.filter(r => r.studentId === student.id);
    
    // Default subject marks structure if no marks in Firestore yet
    const marksObj = {
      English: { obtained: '', total: 100 },
      Urdu: { obtained: '', total: 100 },
      Mathematics: { obtained: '', total: 100 },
      Science: { obtained: '', total: 100 },
      Computer: { obtained: '', total: 100 }
    };

    let isPublished = false;

    // Fill in actual marks if they exist
    studentMarks.forEach(mark => {
      if (marksObj[mark.subject]) {
        marksObj[mark.subject].obtained = mark.obtainedMarks !== undefined ? Number(mark.obtainedMarks) : '';
        marksObj[mark.subject].total = mark.totalMarks !== undefined ? Number(mark.totalMarks) : 100;
        if (mark.published) {
          isPublished = true;
        }
      }
    });

    // Compute aggregate metrics
    const subjects = Object.keys(marksObj);
    let totalObtained = 0;
    let totalMax = 0;
    let hasFailedSubject = false;
    let hasEnteredAnyMarks = false;

    subjects.forEach(sub => {
      const obtStr = marksObj[sub].obtained;
      if (obtStr !== '') {
        const obt = Number(obtStr);
        const max = Number(marksObj[sub].total);
        totalObtained += obt;
        totalMax += max;
        hasEnteredAnyMarks = true;
        if (obt < max * 0.33) {
          hasFailedSubject = true;
        }
      } else {
        totalMax += Number(marksObj[sub].total);
      }
    });

    const percentage = hasEnteredAnyMarks && totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
    
    let grade = 'N/A';
    let remarks = 'No grades entered';
    let status = 'N/A';

    if (hasEnteredAnyMarks) {
      status = (percentage >= 33 && !hasFailedSubject) ? 'Pass' : 'Fail';
      if (percentage >= 90) { grade = 'A+'; remarks = 'Outstanding!'; }
      else if (percentage >= 80) { grade = 'A'; remarks = 'Excellent!'; }
      else if (percentage >= 70) { grade = 'B'; remarks = 'Very Good!'; }
      else if (percentage >= 60) { grade = 'C'; remarks = 'Good Progress'; }
      else if (percentage >= 50) { grade = 'D'; remarks = 'Satisfactory'; }
      else if (percentage >= 40) { grade = 'E'; remarks = 'Fair Effort'; }
      else { grade = 'F'; remarks = 'Needs Academic Support'; }
    }

    acc[student.id] = {
      student,
      marks: marksObj,
      totalObtained,
      totalMax,
      percentage,
      grade: hasFailedSubject && hasEnteredAnyMarks ? 'F (Compartment)' : grade,
      status,
      remarks,
      published: isPublished,
      hasMarks: hasEnteredAnyMarks
    };

    return acc;
  }, {});

  // Filter students results for Results Tab
  const filteredResultCards = Object.values(studentResultsMap).filter(card => {
    const matchesClass = resultClassFilter === 'all' || card.student.class === resultClassFilter;
    const matchesSearch = card.student.name?.toLowerCase().includes(resultSearchTerm.toLowerCase()) ||
                          card.student.rollNumber?.toLowerCase().includes(resultSearchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  // Calculate Result summary in real-time as user updates obtained marks input
  const getRealTimeSummary = () => {
    let obtainedSum = 0;
    let totalSum = 0;
    let hasFailed = false;
    let hasAnyInput = false;

    Object.keys(subjectMarks).forEach(sub => {
      const obtStr = subjectMarks[sub].obtained;
      if (obtStr !== '') {
        const obt = Number(obtStr);
        const tot = Number(subjectMarks[sub].total);
        obtainedSum += obt;
        totalSum += tot;
        hasAnyInput = true;
        if (obt < tot * 0.33) {
          hasFailed = true;
        }
      } else {
        totalSum += Number(subjectMarks[sub].total);
      }
    });

    const percentage = hasAnyInput && totalSum > 0 ? Math.round((obtainedSum / totalSum) * 100) : 0;
    let grade = 'N/A';
    let status = 'N/A';

    if (hasAnyInput) {
      status = (percentage >= 33 && !hasFailed) ? 'Pass' : 'Fail';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';
      else if (percentage >= 40) grade = 'E';
      else grade = 'F';
    }

    return {
      obtained: obtainedSum,
      total: totalSum,
      percentage,
      grade: hasFailed && hasAnyInput ? 'F (Compartment)' : grade,
      status
    };
  };

  const realTimeSummary = getRealTimeSummary();

  // Open Edit Results Form
  const openEditResults = (card) => {
    setEditingStudent(card.student);
    setPublishStatus(card.published ? 'Published' : 'Draft');
    
    const initialMarks = {};
    Object.keys(card.marks).forEach(sub => {
      initialMarks[sub] = {
        obtained: card.marks[sub].obtained,
        total: card.marks[sub].total
      };
    });
    setSubjectMarks(initialMarks);
    
    // Scroll to the edit form panel
    const formElement = document.getElementById('edit-form-panel');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle Marks Input Changes
  const handleMarkChange = (subject, value) => {
    if (value === '') {
      setSubjectMarks(prev => ({
        ...prev,
        [subject]: { ...prev[subject], obtained: '' }
      }));
      return;
    }
    const val = Math.min(100, Math.max(0, Number(value)));
    setSubjectMarks(prev => ({
      ...prev,
      [subject]: { ...prev[subject], obtained: val }
    }));
  };

  // Save Student Results to Firestore
  const saveResults = async () => {
    if (!editingStudent) return;
    setIsSaving(true);
    try {
      const subjects = Object.keys(subjectMarks);
      const isPublished = publishStatus === 'Published';

      const promises = subjects.map(sub => {
        const resultId = `${editingStudent.id}_FinalTerm_${sub}`;
        const obt = subjectMarks[sub].obtained;
        return setDoc(doc(db, 'results', resultId), {
          studentId: editingStudent.id,
          studentName: editingStudent.name,
          examId: 'FinalTerm_2026',
          subject: sub,
          totalMarks: Number(subjectMarks[sub].total),
          obtainedMarks: obt !== '' ? Number(obt) : 0,
          published: isPublished,
          schoolId,
          updatedAt: new Date()
        });
      });

      await Promise.all(promises);
      
      // Update Promotion details / alert parent sync
      if (isPublished) {
        // Mock notification setup or syncing trigger
        await addRecord('notifications', {
          title: `Result Published: ${editingStudent.name}`,
          message: `Final Examination results for ${editingStudent.name} (Grade ${editingStudent.class}) have been published to the student and parent portal.`,
          type: 'Result',
          date: new Date().toLocaleDateString(),
          author: userData?.name || 'Academic Board'
        }, schoolId);
      }

      alert(`Results saved successfully as ${publishStatus}!`);
      setEditingStudent(null);
      fetchAcademicData(); // Reload stats from firestore
    } catch (e) {
      console.error(e);
      alert('Error saving student results: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Redirect to high-fidelity custom report card page
  const triggerPrint = (card) => {
    navigate(`/school-admin/academics/report-card/${card.student.id}`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 relative">
      
      {/* Printable Report Stylesheet Overlay */}
      {showPrintModal && printStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm print:absolute print:inset-0 print:bg-white print:p-0 print:backdrop-none">
          <div className="bg-dark-bg border border-dark-border rounded-2xl w-full max-w-4xl p-6 relative flex flex-col justify-between max-h-[90vh] custom-scrollbar print:border-none print:bg-white print:max-h-full print:rounded-none">
            
            {/* Modal Actions */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-dark-border print:hidden">
              <div className="flex items-center gap-2 text-primary-400">
                <Printer size={20} />
                <span className="font-bold text-sm uppercase tracking-wider">Academic Ledger Print Preview</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()}
                  className="premium-button-primary flex items-center gap-2 text-xs py-2 px-4"
                >
                  <Printer size={14} />
                  Print Document
                </button>
                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="premium-button-secondary text-xs py-2 px-4"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Certificate Print Area */}
            <div className="bg-dark-card p-8 rounded-xl border border-dark-border relative min-h-[600px] flex flex-col justify-between print:bg-white print:text-black print:border-4 print:border-double print:border-indigo-600 print:p-12 print:rounded-none">
              
              {/* Decorative Border & Corner Crests for Certificate */}
              <div className="absolute inset-2 border border-primary-500/10 rounded-lg pointer-events-none print:border-indigo-600/30" />
              
              {/* Header Title */}
              <div className="text-center space-y-2">
                <div className="inline-block p-3 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-600 text-white relative mb-2 print:bg-none print:text-indigo-600">
                  <GraduationCap size={32} />
                </div>
                <h1 className="text-2xl font-black tracking-wide bg-gradient-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent print:text-indigo-600 print:bg-none print:text-3xl">
                  {userData?.schoolName || 'TaleemiDunya Academy'}
                </h1>
                <p className="text-[10px] text-dark-muted font-bold uppercase tracking-[0.2em] print:text-gray-500">
                  Official Academic Transcript & Report Card
                </p>
                <div className="h-px bg-gradient-to-r from-transparent via-dark-border to-transparent w-2/3 mx-auto mt-4 print:via-indigo-600/20" />
              </div>

              {/* Bio Grid */}
              <div className="grid grid-cols-2 gap-4 bg-white/5 border border-dark-border/40 p-4 rounded-xl my-6 text-xs print:bg-gray-50 print:text-black print:border-gray-200">
                <div className="space-y-2">
                  <p><span className="text-dark-muted font-bold print:text-gray-500">STUDENT NAME:</span> <strong className="text-dark-text print:text-black text-sm">{printStudent.student.name}</strong></p>
                  <p><span className="text-dark-muted font-bold print:text-gray-500">ROLL NUMBER:</span> <strong className="font-mono text-primary-400 print:text-indigo-600">{printStudent.student.rollNumber || 'N/A'}</strong></p>
                  <p><span className="text-dark-muted font-bold print:text-gray-500">FATHER'S NAME:</span> <strong className="text-dark-text print:text-black">{printStudent.student.fatherName || 'N/A'}</strong></p>
                </div>
                <div className="space-y-2 text-right print:text-right">
                  <p><span className="text-dark-muted font-bold print:text-gray-500">CLASS:</span> <strong>{getClassDisplayName(printStudent.student.class)} — Sec {printStudent.student.section || 'A'}</strong></p>
                  <p><span className="text-dark-muted font-bold print:text-gray-500">SESSION TERM:</span> <strong>Final Term 2026</strong></p>
                  <p><span className="text-dark-muted font-bold print:text-gray-500">DATE OF ISSUE:</span> <strong className="font-mono">{new Date().toLocaleDateString()}</strong></p>
                </div>
              </div>

              {/* Subject Wise Table */}
              <div className="my-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-primary-500/10 border-b border-dark-border text-primary-400 font-bold uppercase print:bg-indigo-600 print:text-white print:border-none">
                      <th className="py-2.5 px-4 rounded-l-lg print:rounded-none">Subject Description</th>
                      <th className="py-2.5 px-4 text-center">Total Marks</th>
                      <th className="py-2.5 px-4 text-center">Passing Marks</th>
                      <th className="py-2.5 px-4 text-right rounded-r-lg print:rounded-none">Obtained Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/40 print:divide-gray-200">
                    {Object.keys(printStudent.marks).map((sub) => {
                      const obt = printStudent.marks[sub].obtained;
                      const isFailed = obt !== '' && Number(obt) < Number(printStudent.marks[sub].total) * 0.33;
                      return (
                        <tr key={sub} className="hover:bg-white/5 transition-colors print:text-black">
                          <td className="py-3 px-4 font-bold">{sub}</td>
                          <td className="py-3 px-4 text-center font-mono text-dark-muted print:text-gray-600">{printStudent.marks[sub].total}</td>
                          <td className="py-3 px-4 text-center font-mono text-dark-muted print:text-gray-600">{Math.round(printStudent.marks[sub].total * 0.33)}</td>
                          <td className={`py-3 px-4 text-right font-mono font-bold ${
                            isFailed ? 'text-red-500 print:text-red-600' : 'text-primary-400 print:text-indigo-600'
                          }`}>
                            {obt === '' ? 'ABSENT' : obt}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Accent Box */}
              <div className="bg-primary-500/5 border border-primary-500/10 rounded-xl p-4 flex justify-between items-center my-6 print:bg-indigo-50/50 print:border-indigo-200 print:text-black">
                <div className="space-y-1">
                  <p className="text-[10px] text-dark-muted uppercase font-bold tracking-wider print:text-gray-500">Academic Standing</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-dark-text print:text-black">{printStudent.percentage}%</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                      printStudent.status === 'Pass' 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20 print:bg-green-100 print:text-green-800' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20 print:bg-red-100 print:text-red-800'
                    }`}>
                      {printStudent.status}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-dark-muted uppercase font-bold tracking-wider print:text-gray-500">Cumulative Letter Grade</p>
                  <p className="text-3xl font-black text-primary-400 print:text-indigo-600">{printStudent.grade}</p>
                </div>
              </div>

              {/* Feedback and Signatures Footer */}
              <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-dark-border/40 text-[10px] text-dark-muted print:text-black print:border-gray-300">
                <div className="space-y-1">
                  <p className="font-bold text-dark-text uppercase tracking-wider print:text-black">Class Evaluation & Remarks:</p>
                  <p className="italic text-xs">"{printStudent.remarks}"</p>
                </div>
                <div className="flex flex-col items-end justify-end">
                  <div className="w-40 border-b border-dark-border/60 text-center pb-1 print:border-gray-400">
                    {/* Mock Sign */}
                    <span className="font-serif text-sm italic text-primary-400/50 print:text-black/50">Umar Lodhi</span>
                  </div>
                  <p className="mt-1 text-[9px] uppercase tracking-wider text-right w-40 text-center font-bold">Principal Seal / Sign</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary-400 to-indigo-500 bg-clip-text text-transparent">
            Academic & Portal Manager
          </h1>
          <p className="text-dark-muted mt-1 text-sm">
            Dynamically analyze classes strength, student grades, real-time result auto-calculation, printing, and portal publication.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/school-admin/students/add')}
            className="premium-button-primary flex items-center gap-2 text-xs"
          >
            <UserPlus size={16} />
            <span>Register Student</span>
          </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex gap-2 border-b border-dark-border pb-px">
        {[
          { id: 'classes', label: 'Classes Overview', count: classesData.length },
          { id: 'results', label: 'Student Result Management', count: Object.keys(studentResultsMap).length }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedClass(null);
            }}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${
              activeTab === tab.id ? 'text-primary-400' : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                activeTab === tab.id ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-hover text-dark-muted'
              }`}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-400 to-indigo-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Main content display based on active tab */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <svg className="animate-spin h-10 w-10 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <p className="text-dark-muted text-xs font-bold uppercase tracking-widest mt-4">Syncing Academics Hub...</p>
        </div>
      ) : (
        <>
          {/* SECTION 1: CLASSES OVERVIEW */}
          {activeTab === 'classes' && !selectedClass && (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search classes (e.g. 9, 10, Nursery)..." 
                    className="w-full premium-input pl-12 py-2.5"
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                  />
                </div>
                <div className="text-right text-xs font-mono text-dark-muted">
                  Active Classes: <span className="text-primary-400 font-bold text-sm">{classesData.length}</span>
                </div>
              </div>

              {filteredClasses.length === 0 ? (
                <GlassCard className="p-16 text-center">
                  <div className="p-4 bg-dark-hover rounded-full inline-block mb-4 text-dark-muted">
                    <GraduationCap size={48} />
                  </div>
                  <h3 className="text-xl font-bold">No Classes Found</h3>
                  <p className="text-dark-muted max-w-sm mx-auto mt-2 text-sm">
                    No classes match your search term or there are no registered students.
                  </p>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClasses.map((cls) => {
                    const sectionsArray = Array.from(cls.sections).sort();
                    const boysPercentage = cls.students.length ? Math.round((cls.maleCount / cls.students.length) * 100) : 0;
                    const girlsPercentage = cls.students.length ? Math.round((cls.femaleCount / cls.students.length) * 100) : 0;
                    const metadata = mockClassData[cls.name] || mockClassData['default'];

                    return (
                      <GlassCard 
                        key={cls.name} 
                        className="p-6 group hover:border-primary-500/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden cursor-pointer"
                        onClick={() => setSelectedClass(cls.name)}
                      >
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary-500/5 rounded-full blur-xl group-hover:bg-primary-500/10 transition-all duration-500" />
                        
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 text-primary-400 group-hover:scale-110 transition-transform duration-300 border border-primary-500/10">
                              <Layers size={22} />
                            </div>
                            
                            {metadata.pendingFees > 0 ? (
                              <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-wider text-red-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                {metadata.pendingFees} Dues Pending
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-black uppercase tracking-wider text-green-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Paid / Cleared
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl font-black text-dark-text group-hover:text-primary-400 transition-colors mb-1">
                            {getClassDisplayName(cls.name)}
                          </h3>
                          
                          <p className="text-[10px] text-dark-muted font-bold tracking-widest uppercase mb-4 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            {cls.activeCount} Active / {cls.students.length} Total
                          </p>

                          {/* Quick statistics checklist */}
                          <div className="grid grid-cols-2 gap-3 mb-5 py-3 border-y border-dark-border/40">
                            <div>
                              <p className="text-[9px] text-dark-muted font-black uppercase tracking-wider">Class Teacher</p>
                              <p className="text-xs font-bold text-dark-text truncate mt-0.5">{metadata.teacher}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-dark-muted font-black uppercase tracking-wider">Attendance Today</p>
                              <p className="text-xs font-bold text-green-400 mt-0.5">{metadata.attendance}</p>
                            </div>
                          </div>

                          {/* Sections view */}
                          <div className="mb-5">
                            <p className="text-[10px] text-dark-muted font-black uppercase tracking-widest mb-1.5">Active Sections</p>
                            {sectionsArray.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {sectionsArray.map(sec => (
                                  <span key={sec} className="w-7 h-7 rounded-lg bg-dark-hover flex items-center justify-center text-[10px] font-black border border-dark-border hover:border-primary-500/30 transition-all">
                                    {sec}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-dark-muted italic">No section assigned</span>
                            )}
                          </div>
                        </div>

                        {/* Gender balance and Strength footer */}
                        <div className="pt-4 border-t border-dark-border/60 mt-auto space-y-3">
                          {cls.students.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-black text-dark-muted uppercase tracking-wider">
                                <span>Boys: {cls.maleCount} ({boysPercentage}%)</span>
                                <span>Girls: {cls.femaleCount} ({girlsPercentage}%)</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-dark-hover flex overflow-hidden border border-dark-border/40">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-400 to-indigo-500" 
                                  style={{ width: `${boysPercentage}%` }} 
                                />
                                <div 
                                  className="h-full bg-gradient-to-r from-pink-400 to-rose-400" 
                                  style={{ width: `${girlsPercentage}%` }} 
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <div>
                              <p className="text-[9px] text-dark-muted font-black uppercase tracking-widest">Strength</p>
                              <p className="text-xl font-black text-dark-text">{cls.students.length} <span className="text-xs font-medium text-dark-muted">Students</span></p>
                            </div>

                            <button className="p-2 bg-dark-hover border border-dark-border group-hover:bg-primary-500 group-hover:border-primary-500 group-hover:text-white rounded-xl text-dark-muted hover:text-dark-text transition-all duration-300 flex items-center justify-center">
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CLASSES OVERVIEW ROSTER DRAWER */}
          {activeTab === 'classes' && selectedClass && classGroups[selectedClass] && (
            <div className="space-y-6 animate-fade-in">
              <button 
                onClick={() => {
                  setSelectedClass(null);
                  setStudentSearchTerm('');
                }}
                className="flex items-center gap-2 text-dark-muted hover:text-primary-400 font-black text-xs uppercase tracking-widest transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Back to Classes Overview</span>
              </button>

              <GlassCard className="p-6 md:p-8 bg-gradient-to-br from-dark-card to-dark-hover border-l-4 border-l-primary-500 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black text-dark-text">
                      {getClassDisplayName(classGroups[selectedClass].name)}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 text-xs font-black uppercase border border-primary-500/20">
                      Active Class
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-dark-muted font-medium">
                    <span className="flex items-center gap-1.5"><Users size={14} className="text-primary-400" /> {classGroups[selectedClass].students.length} Total Enrolled</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-dark-border" />
                    <span className="flex items-center gap-1.5"><UserCheck size={14} className="text-green-500" /> {classGroups[selectedClass].activeCount} Active</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-dark-border" />
                    <span>Class Teacher: {mockClassData[selectedClass]?.teacher || 'Assigned Staff'}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-dark-border" />
                    <span>Daily Attendance: {mockClassData[selectedClass]?.attendance || '95.0%'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => navigate('/school-admin/attendance')}
                    className="premium-button-secondary py-2 px-4 text-xs flex items-center gap-1.5"
                  >
                    <Calendar size={14} />
                    <span>Attendance Manager</span>
                  </button>
                </div>
              </GlassCard>

              {/* Roster table */}
              <GlassCard className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className="text-lg font-black text-dark-text flex items-center gap-2">
                    <GraduationCap size={20} className="text-primary-400" />
                    <span>Student Roster ({getSelectedClassStudents().length})</span>
                  </h3>
                  
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                    <input 
                      type="text" 
                      placeholder="Filter by student name, roll no..." 
                      className="w-full premium-input pl-10 py-1.5 text-sm"
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black">
                        <th className="pb-3 px-4">Roll No</th>
                        <th className="pb-3 px-4">Student Name</th>
                        <th className="pb-3 px-4">Father Name</th>
                        <th className="pb-3 px-4">Section</th>
                        <th className="pb-3 px-4">Gender</th>
                        <th className="pb-3 px-4">Result Status</th>
                        <th className="pb-3 px-4">Portal Published</th>
                        <th className="pb-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/40">
                      {getSelectedClassStudents().map((student) => {
                        const card = studentResultsMap[student.id] || { status: 'N/A', percentage: 0, published: false };
                        return (
                          <tr key={student.id} className="group hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4 font-mono text-xs font-bold text-primary-400">{student.rollNumber || 'N/A'}</td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-dark-hover flex items-center justify-center font-bold text-sm text-primary-400 border border-dark-border uppercase">
                                  {student.name?.charAt(0)}
                                </div>
                                <span className="font-bold text-sm text-dark-text group-hover:text-primary-400 transition-colors">
                                  {student.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm font-semibold">{student.fatherName}</td>
                            <td className="py-4 px-4">
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-dark-border text-[10px] font-black uppercase text-dark-text">
                                {student.section ? `Sec ${student.section.toUpperCase()}` : 'A'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-xs font-medium text-dark-muted uppercase">{student.gender || 'N/A'}</td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                card.status === 'Pass' 
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                  : card.status === 'Fail' 
                                  ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                  : 'bg-dark-hover text-dark-muted border-dark-border'
                              }`}>
                                {card.status === 'N/A' ? 'No Grades' : `${card.status} (${card.percentage}%)`}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                card.published 
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                  : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                              }`}>
                                {card.published ? 'Published' : 'Draft / Private'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button 
                                onClick={() => {
                                  setActiveTab('results');
                                  setResultClassFilter(student.class || 'all');
                                  setResultSearchTerm(student.name);
                                }}
                                className="px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500 hover:text-white rounded-lg transition-all text-xs font-bold text-primary-400"
                              >
                                Manage Results
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {getSelectedClassStudents().length === 0 && (
                        <tr>
                          <td colSpan="8" className="text-center py-12 text-sm text-dark-muted italic">
                            No students match your filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}

          {/* SECTION 2: STUDENT RESULT MANAGEMENT */}
          {activeTab === 'results' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* EDIT FORM DRAWER WIDGET (Displays on top if active) */}
              {editingStudent && (
                <div id="edit-form-panel" className="scroll-mt-6">
                  <GlassCard className="p-6 border-l-4 border-l-primary-500 bg-gradient-to-br from-dark-card to-dark-hover">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest bg-primary-500/10 px-2 py-0.5 rounded">
                          Grade Entry Panel
                        </span>
                        <h2 className="text-2xl font-black text-dark-text mt-2 flex items-center gap-2">
                          <span>Enter Results:</span>
                          <span className="text-primary-400">{editingStudent.name}</span>
                        </h2>
                        <p className="text-xs text-dark-muted font-medium mt-1">
                          Roll No: {editingStudent.rollNumber || 'N/A'} • Class: {getClassDisplayName(editingStudent.class)} • Sec: {editingStudent.section || 'A'}
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => setEditingStudent(null)}
                        className="text-xs font-bold uppercase tracking-widest text-dark-muted hover:text-dark-text px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Form entry fields */}
                      <div className="lg:col-span-2 space-y-4">
                        <h4 className="text-xs font-black text-dark-muted uppercase tracking-[0.2em] mb-4">Subject-wise Obtained Marks (out of 100)</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.keys(subjectMarks).map((sub) => (
                            <div key={sub} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-dark-border/40 hover:border-primary-500/20 transition-all">
                              <span className="font-bold text-sm">{sub}</span>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  value={subjectMarks[sub].obtained}
                                  placeholder="0"
                                  min="0"
                                  max="100"
                                  onChange={(e) => handleMarkChange(sub, e.target.value)}
                                  className="w-20 premium-input py-1 text-center font-bold font-mono text-sm"
                                />
                                <span className="text-xs font-mono text-dark-muted">/ 100</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Real-time Summary Box */}
                      <div className="p-5 rounded-2xl border border-dark-border bg-dark-bg/60 flex flex-col justify-between">
                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-dark-muted uppercase tracking-[0.2em] pb-3 border-b border-dark-border/40">Real-Time Calculations</h4>
                          
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-white/5 rounded-xl border border-dark-border/40">
                              <p className="text-dark-muted font-bold uppercase text-[9px] tracking-wider">Obtained</p>
                              <p className="text-lg font-black mt-0.5">{realTimeSummary.obtained} <span className="text-[10px] text-dark-muted font-normal">/ {realTimeSummary.total}</span></p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl border border-dark-border/40">
                              <p className="text-dark-muted font-bold uppercase text-[9px] tracking-wider">Percentage</p>
                              <p className="text-lg font-black text-primary-400 mt-0.5">{realTimeSummary.percentage}%</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-dark-border/40 mt-3">
                            <div>
                              <p className="text-dark-muted font-bold uppercase text-[9px] tracking-wider">Standing / Status</p>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase mt-1 inline-block border ${
                                realTimeSummary.status === 'Pass' 
                                  ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                  : realTimeSummary.status === 'Fail' 
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                  : 'bg-dark-hover text-dark-muted border-dark-border'
                              }`}>
                                {realTimeSummary.status === 'N/A' ? 'Awaiting Data' : realTimeSummary.status}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-dark-muted font-bold uppercase text-[9px] tracking-wider">Calculated Grade</p>
                              <p className="text-2xl font-black text-primary-400">{realTimeSummary.grade}</p>
                            </div>
                          </div>

                          {/* Publish Settings */}
                          <div className="pt-4 border-t border-dark-border/40 space-y-2">
                            <label className="text-[10px] font-black text-dark-muted uppercase tracking-wider block">Portal Publication Status</label>
                            <div className="flex gap-2">
                              {['Draft', 'Published'].map((statusOption) => (
                                <button
                                  key={statusOption}
                                  type="button"
                                  onClick={() => setPublishStatus(statusOption)}
                                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                                    publishStatus === statusOption
                                      ? 'bg-primary-500/10 border-primary-500/40 text-primary-400'
                                      : 'bg-dark-hover border-dark-border text-dark-muted hover:text-dark-text'
                                  }`}
                                >
                                  {statusOption === 'Draft' ? 'Private Draft' : 'Publish Live'}
                                </button>
                              ))}
                            </div>
                            <p className="text-[9px] text-dark-muted leading-relaxed">
                              {publishStatus === 'Published' 
                                ? '⚠️ Live: Students and parents will instantly receive notification and view marks on their portal.'
                                : '🔒 Private: Marks will be saved as draft, only school administrators or teachers can see them.'}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-6 pt-4 border-t border-dark-border/40">
                          <button
                            onClick={saveResults}
                            disabled={isSaving || realTimeSummary.obtained === 0}
                            className="w-full premium-button-primary flex items-center justify-center gap-2 py-2.5"
                          >
                            <Save size={16} />
                            {isSaving ? 'Syncing...' : 'Save & Publish Results'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* Filters & Control bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
                  {/* Search Roster */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search student results..." 
                      className="w-full premium-input pl-10 py-2 text-xs"
                      value={resultSearchTerm}
                      onChange={(e) => setResultSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Class filter dropdown */}
                  <div className="relative">
                    <select
                      value={resultClassFilter}
                      onChange={(e) => setResultClassFilter(e.target.value)}
                      className="premium-input bg-dark-card py-2 text-xs pr-8"
                    >
                      <option value="all">All Grades</option>
                      {Array.from(new Set(students.map(s => s.class))).filter(Boolean).sort(sortClasses).map(cls => (
                        <option key={cls} value={cls}>{getClassDisplayName(cls)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-[10px] text-dark-muted font-bold uppercase tracking-wider text-right">
                  Synced Student Cards: <span className="text-primary-400 font-bold">{filteredResultCards.length}</span>
                </div>
              </div>

              {/* Grid of Student result cards */}
              {filteredResultCards.length === 0 ? (
                <GlassCard className="p-16 text-center">
                  <div className="p-4 bg-dark-hover rounded-full inline-block mb-4 text-dark-muted">
                    <Award size={48} />
                  </div>
                  <h3 className="text-xl font-bold">No Results Found</h3>
                  <p className="text-dark-muted max-w-sm mx-auto mt-2 text-sm">
                    Modify your search or filters to locate specific student records.
                  </p>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredResultCards.map((card) => {
                    return (
                      <GlassCard 
                        key={card.student.id} 
                        className={`p-6 hover:border-primary-500/30 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group ${
                          card.hasMarks ? 'border-l-4 border-l-primary-500' : 'border-l-4 border-l-dark-border'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-dark-border text-[9px] font-black uppercase text-dark-muted">
                                Class {card.student.class || 'N/A'} • Sec {card.student.section || 'A'}
                              </span>
                            </div>
                            
                            {card.hasMarks ? (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider ${
                                card.status === 'Pass' 
                                  ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {card.status}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider bg-dark-hover text-dark-muted border-dark-border">
                                Awaiting Entry
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-black text-dark-text group-hover:text-primary-400 transition-colors">
                            {card.student.name}
                          </h3>
                          <p className="text-xs font-mono text-dark-muted mt-0.5">Roll No: {card.student.rollNumber || 'N/A'}</p>

                          {/* Quick academic details if marks present */}
                          {card.hasMarks ? (
                            <div className="mt-4 pt-4 border-t border-dark-border/40 grid grid-cols-3 gap-3">
                              <div>
                                <p className="text-[9px] text-dark-muted font-bold uppercase">Aggregate</p>
                                <p className="text-sm font-black mt-0.5 text-dark-text">{card.totalObtained} <span className="text-[9px] font-normal text-dark-muted">/ {card.totalMax}</span></p>
                              </div>
                              <div>
                                <p className="text-[9px] text-dark-muted font-bold uppercase">Percentage</p>
                                <p className="text-sm font-black mt-0.5 text-primary-400">{card.percentage}%</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-dark-muted font-bold uppercase">Grade</p>
                                <p className="text-sm font-black mt-0.5 text-indigo-400">{card.grade}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4 pt-4 border-t border-dark-border/40 py-3 text-center text-[11px] text-dark-muted italic">
                              No final term grades saved. Click edit to enter subject marks.
                            </div>
                          )}
                        </div>

                        {/* Action triggers */}
                        <div className="mt-6 pt-4 border-t border-dark-border/40 flex gap-2">
                          <button
                            onClick={() => openEditResults(card)}
                            className="flex-1 py-1.5 bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500 hover:text-white text-primary-400 rounded-xl transition-all font-bold text-xs flex items-center justify-center gap-1.5"
                          >
                            <Edit2 size={12} />
                            <span>Edit Marks</span>
                          </button>
                          
                          {card.hasMarks && (
                            <button
                              onClick={() => triggerPrint(card)}
                              className="p-1.5 bg-dark-hover hover:bg-dark-card border border-dark-border hover:border-primary-500/30 rounded-xl text-dark-muted hover:text-dark-text transition-all"
                              title="Print / View Transcript"
                            >
                              <Printer size={14} />
                            </button>
                          )}
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default Academics;
