import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Save, Search, Filter, RefreshCw, 
  FileSpreadsheet, ArrowLeft, CheckCircle, Lock, 
  Layers, Calendar, ChevronDown, Check, X, ShieldAlert, Award, BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../../components/common/GlassCard';
import { useAuth } from '../../../context/AuthContext';
import { useSchool } from '../../../context/SchoolContext';
import { 
  getExams, calculateGrade, saveMarksBatch, 
  getGradingRules, MARK_STATUSES, VERIFICATION_STATUSES
} from '../../../services/examService';
import { getRecords, upsertRecord } from '../../../services/db';
import Swal from 'sweetalert2';

const DEFAULT_TERMS = [
  '1st Assessment 2025-26',
  '2nd Assessment 2025-26',
  '3rd Assessment 2025-26',
  '4th Assessment 2025-26',
  'First Term 2025-26',
  'Mid Term 2026-27',
  'Second Term 2026',
  'Final Term Exam 2026',
  'Annual Exam 2026',
  'Monthly Test'
];

const DEFAULT_SUBJECTS_LIST = [
  { subjectName: 'Drawing', totalMarks: 25 },
  { subjectName: 'English', totalMarks: 25 },
  { subjectName: 'G.K + Reader', totalMarks: 25 },
  { subjectName: 'Math', totalMarks: 25 },
  { subjectName: 'Poem + Islamiat', totalMarks: 25 },
  { subjectName: 'Urdu', totalMarks: 25 }
];

const MarksEntry = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { schoolClasses } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  // Entry Mode: 'BULK' | 'SINGLE'
  const [marksMode, setMarksMode] = useState('BULK');

  // Selection States
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [orderBy, setOrderBy] = useState('adm_desc'); // adm_desc, adm_asc, name_asc, rank_asc
  const [activeSubjectPill, setActiveSubjectPill] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Loaded Data
  const [availableClasses, setAvailableClasses] = useState([]);
  const [createdExams, setCreatedExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [gradingRules, setGradingRules] = useState([]);

  // Grid Data State for Bulk Mode
  const [gridData, setGridData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Single Subject Mode States
  const [selectedSingleSubject, setSelectedSingleSubject] = useState('');
  const [singleSubjectMarks, setSingleSubjectMarks] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState('DRAFT');

  useEffect(() => {
    loadMasterMetaData();
  }, [schoolId]);

  const loadMasterMetaData = async () => {
    setLoading(true);
    try {
      const [examsData, rulesData] = await Promise.all([
        getExams(schoolId),
        getGradingRules(schoolId)
      ]);

      const classList = schoolClasses?.length > 0 
        ? schoolClasses.map(c => c.name) 
        : ['Nursery', 'KG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
      
      setAvailableClasses(classList);
      if (classList.length > 0 && !selectedClass) {
        setSelectedClass(classList[0]);
      }

      setGradingRules(rulesData || []);

      const examNames = examsData ? examsData.map(e => e.examName || e.title).filter(Boolean) : [];
      const uniqueExams = Array.from(new Set(examNames));
      const finalTerms = uniqueExams.length > 0 ? uniqueExams : DEFAULT_TERMS;
      setCreatedExams(finalTerms);
      if (finalTerms.length > 0 && !selectedTerm) {
        setSelectedTerm(finalTerms[0]);
      }
    } catch (err) {
      console.error('Error loading metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Class Data when Class or Term changes
  useEffect(() => {
    if (selectedClass && selectedTerm) {
      fetchClassData();
    }
  }, [selectedClass, selectedTerm, schoolId]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      const [masterFiles, studs, existingResults] = await Promise.all([
        getRecords('examMasterFiles', schoolId),
        getRecords('students', schoolId),
        getRecords('results', schoolId)
      ]);

      // 1. Find Subjects for Selected Class & Term
      const masterFile = masterFiles?.find(
        f => (f.className === selectedClass || f.classId === selectedClass) && f.term === selectedTerm
      );

      let subjectsToUse = [];
      if (masterFile && Array.isArray(masterFile.subjects) && masterFile.subjects.length > 0) {
        subjectsToUse = masterFile.subjects
          .filter(s => s.included)
          .map(s => ({
            subjectName: s.subjectName,
            totalMarks: Number(s.maxMarks || 25),
            passingMarks: Number(s.passingMarks || 8.25)
          }));
      }

      if (subjectsToUse.length === 0) {
        subjectsToUse = DEFAULT_SUBJECTS_LIST;
      }
      setClassSubjects(subjectsToUse);

      if (subjectsToUse.length > 0 && (!selectedSingleSubject || !subjectsToUse.some(s => s.subjectName === selectedSingleSubject))) {
        setSelectedSingleSubject(subjectsToUse[0].subjectName);
      }

      // 2. Filter Students by Selected Class
      const classStuds = (studs || []).filter(
        s => s.class === selectedClass || s.className === selectedClass
      );

      setStudents(classStuds);

      // 3. Build Grid State Map for Bulk Mode
      const initialGrid = {};
      classStuds.forEach(student => {
        const studentResults = (existingResults || []).filter(
          r => r.studentId === student.id && (r.examId === selectedTerm || r.term === selectedTerm)
        );

        const marksObj = {};
        subjectsToUse.forEach(sub => {
          const matched = studentResults.find(
            r => r.subject === sub.subjectName || r.subjectName === sub.subjectName
          );

          let status = 'P';
          let obt = '0';

          if (matched) {
            if (matched.obtainedMarks === 'ABS' || matched.status === MARK_STATUSES.ABSENT) {
              status = 'A';
              obt = 'ABS';
            } else if (matched.status === MARK_STATUSES.LEAVE) {
              status = 'L';
              obt = matched.obtainedMarks ?? '0';
            } else {
              status = 'P';
              obt = String(matched.obtainedMarks ?? '0');
            }
          }

          marksObj[sub.subjectName] = {
            obtainedMarks: obt,
            status: status
          };
        });

        initialGrid[student.id] = {
          marks: marksObj,
          totalDays: 0,
          attPercent: 0,
          excludeFromRank: false,
          excludeFromLive: false,
          comment: ''
        };
      });

      setGridData(initialGrid);

      // 4. Build Single Subject State
      if (selectedSingleSubject) {
        loadSingleSubjectState(selectedSingleSubject, classStuds, existingResults, subjectsToUse);
      }

    } catch (err) {
      console.error('Error fetching class marks data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSingleSubjectState = (subjName, studList = students, resultsList = [], subjList = classSubjects) => {
    const targetSubj = subjList.find(s => s.subjectName === subjName) || { totalMarks: 25, passingMarks: 8.25 };
    const rows = studList.map((st, idx) => {
      const match = resultsList.find(r => r.studentId === st.id && (r.subject === subjName || r.subjectName === subjName));
      return {
        studentId: st.id,
        rollNo: st.rollNo || st.rollNumber || st.grNo || (100 + idx),
        studentName: st.name || st.fullName || 'Student',
        totalMarks: targetSubj.totalMarks,
        obtainedMarks: match ? String(match.obtainedMarks ?? 0) : '0',
        status: match ? (match.status || MARK_STATUSES.PRESENT) : MARK_STATUSES.PRESENT,
        remarks: match ? (match.remarks || '') : ''
      };
    });
    setSingleSubjectMarks(rows);
  };

  useEffect(() => {
    if (selectedSingleSubject && students.length > 0) {
      loadSingleSubjectState(selectedSingleSubject);
    }
  }, [selectedSingleSubject]);

  // Update Individual Mark Input in Bulk Mode
  const handleMarkInputChange = (studentId, subjectName, val) => {
    setGridData(prev => {
      const studentState = prev[studentId] || { marks: {} };
      const currentMarks = studentState.marks[subjectName] || { status: 'P', obtainedMarks: '0' };
      
      const updatedStatus = val.toUpperCase() === 'ABS' ? 'A' : currentMarks.status;

      return {
        ...prev,
        [studentId]: {
          ...studentState,
          marks: {
            ...studentState.marks,
            [subjectName]: {
              ...currentMarks,
              obtainedMarks: val,
              status: updatedStatus
            }
          }
        }
      };
    });
  };

  // Handle Quick Status Buttons (P / A / L)
  const handleQuickStatusClick = (studentId, subjectName, statusType) => {
    setGridData(prev => {
      const studentState = prev[studentId] || { marks: {} };
      const currentMarks = studentState.marks[subjectName] || { obtainedMarks: '0' };

      let newObtained = currentMarks.obtainedMarks;
      if (statusType === 'A') {
        newObtained = 'ABS';
      } else if (statusType === 'P' && currentMarks.obtainedMarks === 'ABS') {
        newObtained = '0';
      }

      return {
        ...prev,
        [studentId]: {
          ...studentState,
          marks: {
            ...studentState.marks,
            [subjectName]: {
              obtainedMarks: newObtained,
              status: statusType
            }
          }
        }
      };
    });
  };

  // Handle Option Checkbox Change
  const handleOptionChange = (studentId, field, value) => {
    setGridData(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: value
      }
    }));
  };

  // Save All Bulk Marks to Database
  const handleSaveAllMarks = async () => {
    if (!selectedClass || !selectedTerm) {
      return Swal.fire('Warning', 'Please select Class and Term', 'warning');
    }

    setSaving(true);
    try {
      const promises = [];

      for (const student of students) {
        const sState = gridData[student.id] || { marks: {} };
        const studentMarksObj = sState.marks || {};

        for (const sub of classSubjects) {
          const markData = studentMarksObj[sub.subjectName] || { obtainedMarks: '0', status: 'P' };
          
          let numericObt = markData.obtainedMarks;
          let finalStatus = MARK_STATUSES.PRESENT;

          if (markData.status === 'A' || markData.obtainedMarks === 'ABS') {
            numericObt = 'ABS';
            finalStatus = MARK_STATUSES.ABSENT;
          } else if (markData.status === 'L') {
            finalStatus = MARK_STATUSES.LEAVE;
          }

          const gradeObj = calculateGrade(numericObt, sub.totalMarks, gradingRules, finalStatus);
          const resultDocId = `${student.id}_${selectedTerm}_${sub.subjectName.replace(/[^a-zA-Z0-9]/g, '_')}`;

          const payload = {
            studentId: student.id,
            studentName: student.name || student.fullName || '',
            rollNo: student.rollNo || student.rollNumber || student.grNo || '',
            class: selectedClass,
            classId: selectedClass,
            examId: selectedTerm,
            term: selectedTerm,
            subject: sub.subjectName,
            subjectName: sub.subjectName,
            totalMarks: sub.totalMarks,
            passingMarks: sub.passingMarks || 8.25,
            obtainedMarks: numericObt === 'ABS' ? 'ABS' : Number(numericObt || 0),
            status: finalStatus,
            percentage: gradeObj.percentage,
            grade: gradeObj.grade,
            gpa: gradeObj.gpa,
            remarks: gradeObj.remarks,
            schoolId: schoolId,
            updatedAt: new Date().toISOString()
          };

          promises.push(upsertRecord('results', resultDocId, payload));
        }
      }

      await Promise.all(promises);

      Swal.fire({
        title: 'Save All Marks Successful!',
        text: `Updated marks for ${students.length} students in Class ${selectedClass} (${selectedTerm}).`,
        icon: 'success',
        background: '#1a1f37',
        color: '#fff',
        confirmButtonColor: '#10b981'
      });

    } catch (err) {
      console.error('Error saving all marks:', err);
      Swal.fire('Error', 'Failed to save marks to database', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Single Subject Pipeline
  const handleSaveSingleSubject = async (newStatus = 'DRAFT') => {
    if (!selectedSingleSubject || singleSubjectMarks.length === 0) return;

    setSaving(true);
    try {
      const targetSubj = classSubjects.find(s => s.subjectName === selectedSingleSubject) || { totalMarks: 25, passingMarks: 8.25 };
      await saveMarksBatch({
        examId: selectedTerm,
        classId: selectedClass,
        section: 'All',
        subject: selectedSingleSubject,
        totalMarks: targetSubj.totalMarks,
        passingMarks: targetSubj.passingMarks,
        studentsMarks: singleSubjectMarks,
        schoolId,
        gradingRules,
        locked: newStatus === VERIFICATION_STATUSES.LOCKED,
        enteredBy: userData?.name || 'Admin'
      });

      setVerificationStatus(newStatus);

      Swal.fire({
        title: `Single Subject Saved (${newStatus})`,
        text: `Marks for ${selectedSingleSubject} updated successfully.`,
        icon: 'success',
        background: '#1a1f37',
        color: '#fff',
        confirmButtonColor: '#2563eb'
      });
    } catch (err) {
      console.error('Error saving single subject:', err);
      Swal.fire('Error', 'Failed to save single subject marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Calculated Student Stats & Sorting
  const processedStudents = students.map((student, idx) => {
    const sData = gridData[student.id] || { marks: {} };
    const marks = sData.marks || {};

    let grandTotalObtained = 0;
    let grandMaxMarks = 0;

    classSubjects.forEach(sub => {
      const subMark = marks[sub.subjectName] || { obtainedMarks: '0', status: 'P' };
      const maxM = sub.totalMarks || 25;
      grandMaxMarks += maxM;

      if (subMark.status !== 'A' && subMark.obtainedMarks !== 'ABS') {
        grandTotalObtained += Number(subMark.obtainedMarks || 0);
      }
    });

    const percent = grandMaxMarks > 0 ? ((grandTotalObtained / grandMaxMarks) * 100).toFixed(2) : '0.00';
    const gradeObj = calculateGrade(grandTotalObtained, grandMaxMarks, gradingRules);

    return {
      ...student,
      admNo: student.grNo || student.grNumber || student.rollNo || student.rollNumber || (100 + idx),
      studentName: student.name || student.fullName || 'Student',
      fatherName: student.fatherName || 'Father Name',
      grandTotalObtained,
      grandMaxMarks,
      percent,
      grade: gradeObj.grade,
      sData
    };
  });

  // Calculate Positions (Ranks)
  const rankedStudents = [...processedStudents].sort((a, b) => b.grandTotalObtained - a.grandTotalObtained);
  const positionMap = {};
  let currentRank = 1;
  rankedStudents.forEach((st, i) => {
    if (i > 0 && st.grandTotalObtained < rankedStudents[i - 1].grandTotalObtained) {
      currentRank = i + 1;
    }
    positionMap[st.id] = currentRank;
  });

  // Filter & Order Students
  const filteredStudentsList = processedStudents.filter(st => {
    const termLower = searchTerm.toLowerCase();
    return (
      st.studentName.toLowerCase().includes(termLower) ||
      st.fatherName.toLowerCase().includes(termLower) ||
      String(st.admNo).toLowerCase().includes(termLower)
    );
  }).sort((a, b) => {
    if (orderBy === 'adm_desc') return Number(b.admNo) - Number(a.admNo);
    if (orderBy === 'adm_asc') return Number(a.admNo) - Number(b.admNo);
    if (orderBy === 'name_asc') return a.studentName.localeCompare(b.studentName);
    if (orderBy === 'rank_asc') return (positionMap[a.id] || 99) - (positionMap[b.id] || 99);
    return 0;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto font-sans animate-fade-in pb-24 text-white">
      
      {/* 🏷️ Top Header Banner matching application design */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-dark-card/90 via-dark-card/60 to-primary-950/40 p-6 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-500/10 rounded-2xl text-primary-400 border border-primary-500/20 shadow-inner">
            <ClipboardCheck size={26} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white via-dark-text to-primary-300 bg-clip-text text-transparent tracking-tight">
              Marks Entry Engine
            </h1>
            <p className="text-xs md:text-sm text-dark-muted font-medium mt-0.5">
              Enter marks in Bulk All-Subjects mode or Single Subject verification mode
            </p>
          </div>
        </div>

        {/* Mode Switcher Toggle */}
        <div className="flex items-center gap-1.5 p-1.5 bg-dark-bg/80 border border-white/10 rounded-2xl">
          <button
            type="button"
            onClick={() => setMarksMode('BULK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              marksMode === 'BULK'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-black'
                : 'text-dark-muted hover:text-white'
            }`}
          >
            <FileSpreadsheet size={15} />
            <span>📊 Bulk Marks Entry</span>
          </button>

          <button
            type="button"
            onClick={() => setMarksMode('SINGLE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              marksMode === 'SINGLE'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 font-black'
                : 'text-dark-muted hover:text-white'
            }`}
          >
            <BookOpen size={15} />
            <span>📖 Single Subject Entry</span>
          </button>
        </div>
      </div>

      {/* 🎛️ Selectors & Filters Glass Card */}
      <GlassCard className="p-5 border-white/5 shadow-xl space-y-4">
        
        {/* Selectors Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Class */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers size={13} className="text-primary-400" />
              <span>Class</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
            >
              <option value="" className="bg-dark-bg text-white">Select Class</option>
              {availableClasses.map((cls, idx) => (
                <option key={idx} value={cls} className="bg-dark-bg text-white">{cls}</option>
              ))}
            </select>
          </div>

          {/* Term */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-primary-400" />
              <span>Term / Exam</span>
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
            >
              <option value="" className="bg-dark-bg text-white">Select Term</option>
              {createdExams.map((term, idx) => (
                <option key={idx} value={term} className="bg-dark-bg text-white">{term}</option>
              ))}
            </select>
          </div>

          {/* Order By (Only in Bulk Mode) */}
          {marksMode === 'BULK' ? (
            <div>
              <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Filter size={13} className="text-primary-400" />
                <span>Order By Admission No.</span>
              </label>
              <select
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
              >
                <option value="adm_desc" className="bg-dark-bg text-white">Descending</option>
                <option value="adm_asc" className="bg-dark-bg text-white">Ascending</option>
                <option value="name_asc" className="bg-dark-bg text-white">Student Name (A-Z)</option>
                <option value="rank_asc" className="bg-dark-bg text-white">Position (1 to N)</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <BookOpen size={13} className="text-primary-400" />
                <span>Select Subject</span>
              </label>
              <select
                value={selectedSingleSubject}
                onChange={(e) => setSelectedSingleSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
              >
                {classSubjects.map((s, idx) => (
                  <option key={idx} value={s.subjectName} className="bg-dark-bg text-white">
                    {s.subjectName} (Max: {s.totalMarks})
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>

        {/* Bulk Subjects Filter (In Bulk Mode) */}
        {marksMode === 'BULK' && (
          <div className="space-y-2 pt-3 border-t border-white/5">
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider">
              Subjects Filter
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSubjectPill('ALL')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  activeSubjectPill === 'ALL'
                    ? 'bg-primary-600 text-white border-primary-500 shadow-md shadow-primary-600/30'
                    : 'bg-dark-bg/80 text-dark-muted border-white/10 hover:text-white hover:bg-white/5'
                }`}
              >
                All Subjects
              </button>

              {classSubjects.map((sub, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSubjectPill(sub.subjectName)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                    activeSubjectPill === sub.subjectName
                      ? 'bg-primary-600 text-white border-primary-500 shadow-md shadow-primary-600/30'
                      : 'bg-dark-bg/80 text-dark-muted border-white/10 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {sub.subjectName}
                </button>
              ))}

              <button
                type="button"
                onClick={fetchClassData}
                disabled={loading}
                className="ml-auto px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                <span>Load Class Data</span>
              </button>
            </div>
          </div>
        )}

        {/* Search Row in Bulk Mode */}
        {marksMode === 'BULK' && (
          <div className="pt-2 flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Admission No, Student Name, Father Name..."
                className="w-full pl-9 pr-3.5 py-2 bg-dark-bg/80 border border-white/10 rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-primary-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition-all"
            >
              Show All
            </button>
          </div>
        )}

      </GlassCard>

      {/* MODE 1: BULK MARKS MATRIX TABLE */}
      {marksMode === 'BULK' && (
        <GlassCard className="p-0 overflow-hidden border-white/5 shadow-2xl">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-white/[0.04] border-b border-white/10 text-primary-300 font-bold tracking-tight sticky top-0 z-20 backdrop-blur-md">
                  <th className="py-3.5 px-2 text-center border-r border-white/10 w-10">#</th>
                  <th className="py-3.5 px-3 text-center border-r border-white/10 whitespace-nowrap cursor-pointer">
                    Adm No ▴▼
                  </th>
                  <th className="py-3.5 px-4 border-r border-white/10 whitespace-nowrap min-w-[130px]">
                    Student Name
                  </th>
                  <th className="py-3.5 px-4 border-r border-white/10 whitespace-nowrap min-w-[130px]">
                    Father Name
                  </th>

                  {/* Dynamic Subject Columns */}
                  {classSubjects
                    .filter(sub => activeSubjectPill === 'ALL' || activeSubjectPill === sub.subjectName)
                    .map((sub, sIdx) => (
                      <th key={sIdx} className="py-3.5 px-3 border-r border-white/10 text-center whitespace-nowrap min-w-[125px]">
                        {sub.subjectName}
                        <span className="block text-[10px] text-dark-muted font-normal">({Number(sub.totalMarks).toFixed(2)})</span>
                      </th>
                    ))}

                  <th className="py-3.5 px-3 text-center border-r border-white/10 whitespace-nowrap">Total</th>
                  <th className="py-3.5 px-3 text-center border-r border-white/10 whitespace-nowrap">Percent</th>
                  <th className="py-3.5 px-3 text-center border-r border-white/10 whitespace-nowrap">Grade</th>
                  <th className="py-3.5 px-3 text-center border-r border-white/10 whitespace-nowrap min-w-[75px]">Total Days</th>
                  <th className="py-3.5 px-3 text-center border-r border-white/10 whitespace-nowrap">Att %</th>
                  <th className="py-3.5 px-3 text-center border-r border-white/10 whitespace-nowrap cursor-pointer">
                    Position ▴▼
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[160px]">Options</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5 text-dark-text">
                {loading ? (
                  <tr>
                    <td colSpan={10 + classSubjects.length} className="text-center py-16 text-dark-muted">
                      <RefreshCw size={22} className="animate-spin inline mr-2 text-primary-400" />
                      Loading class students and marks...
                    </td>
                  </tr>
                ) : filteredStudentsList.length === 0 ? (
                  <tr>
                    <td colSpan={10 + classSubjects.length} className="text-center py-16 text-dark-muted text-xs">
                      No student records found for Class {selectedClass}.
                    </td>
                  </tr>
                ) : (
                  filteredStudentsList.map((student, idx) => {
                    const sData = gridData[student.id] || { marks: {} };
                    const marks = sData.marks || {};
                    const rank = positionMap[student.id] || (idx + 1);

                    return (
                      <tr key={student.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
                        
                        <td className="py-3 px-2 text-center font-bold text-dark-muted border-r border-white/5">
                          {idx + 1}
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-bold text-primary-300 border-r border-white/5">
                          {student.admNo}
                        </td>

                        <td className="py-3 px-4 font-bold text-white border-r border-white/5 whitespace-nowrap">
                          {student.studentName}
                        </td>

                        <td className="py-3 px-4 text-dark-muted border-r border-white/5 whitespace-nowrap">
                          {student.fatherName}
                        </td>

                        {/* Subject Mark Cell & Quick Status Buttons */}
                        {classSubjects
                          .filter(sub => activeSubjectPill === 'ALL' || activeSubjectPill === sub.subjectName)
                          .map((sub, sIdx) => {
                            const subMark = marks[sub.subjectName] || { obtainedMarks: '0', status: 'P' };
                            const isAbsent = subMark.status === 'A' || subMark.obtainedMarks === 'ABS';

                            return (
                              <td key={sIdx} className="py-2.5 px-2 text-center border-r border-white/5">
                                <div className="flex flex-col items-center gap-1.5">
                                  
                                  <input
                                    type="text"
                                    value={subMark.obtainedMarks}
                                    onChange={(e) => handleMarkInputChange(student.id, sub.subjectName, e.target.value)}
                                    className={`w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border focus:outline-none focus:border-primary-500 transition-all ${
                                      isAbsent 
                                        ? 'bg-red-500/10 text-red-400 border-red-500/30 font-black' 
                                        : 'bg-dark-bg/80 text-white border-white/10'
                                    }`}
                                  />

                                  {/* Quick Status Pills: P (Green), A (Red), L (Yellow) */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleQuickStatusClick(student.id, sub.subjectName, 'P')}
                                      title="Mark Present"
                                      className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${
                                        subMark.status === 'P' && !isAbsent
                                          ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/30'
                                          : 'bg-white/5 text-dark-muted hover:bg-emerald-500/20 hover:text-emerald-300'
                                      }`}
                                    >
                                      P
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleQuickStatusClick(student.id, sub.subjectName, 'A')}
                                      title="Mark Absent"
                                      className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${
                                        isAbsent
                                          ? 'bg-red-500 text-white ring-2 ring-red-400/30'
                                          : 'bg-white/5 text-dark-muted hover:bg-red-500/20 hover:text-red-300'
                                      }`}
                                    >
                                      A
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleQuickStatusClick(student.id, sub.subjectName, 'L')}
                                      title="Mark Leave"
                                      className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${
                                        subMark.status === 'L'
                                          ? 'bg-amber-500 text-white ring-2 ring-amber-400/30'
                                          : 'bg-white/5 text-dark-muted hover:bg-amber-500/20 hover:text-amber-300'
                                      }`}
                                    >
                                      L
                                    </button>
                                  </div>

                                </div>
                              </td>
                            );
                          })}

                        {/* Total */}
                        <td className="py-3 px-3 text-center font-black text-white border-r border-white/5">
                          {student.grandTotalObtained}
                        </td>

                        {/* Percent */}
                        <td className="py-3 px-3 text-center font-bold text-emerald-400 border-r border-white/5">
                          {student.percent}%
                        </td>

                        {/* Grade */}
                        <td className="py-3 px-3 text-center border-r border-white/5">
                          <span className={`px-2 py-0.5 rounded text-xs font-black border ${
                            student.grade === 'F'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {student.grade}
                          </span>
                        </td>

                        {/* Total Days */}
                        <td className="py-3 px-2 text-center border-r border-white/5">
                          <input
                            type="number"
                            min="0"
                            value={sData.totalDays || 0}
                            onChange={(e) => handleOptionChange(student.id, 'totalDays', Number(e.target.value))}
                            className="w-12 px-1 py-0.5 text-center text-xs font-bold bg-dark-bg/80 text-white border border-white/10 rounded"
                          />
                        </td>

                        {/* Att % */}
                        <td className="py-3 px-3 text-center font-bold text-dark-muted border-r border-white/5">
                          {sData.attPercent || 0}%
                        </td>

                        {/* Position */}
                        <td className="py-3 px-3 text-center font-black text-primary-300 border-r border-white/5">
                          {rank}
                        </td>

                        {/* Options */}
                        <td className="py-3 px-3 text-xs border-r border-white/5">
                          <div className="flex flex-col gap-1 text-[11px]">
                            <label className="flex items-center gap-1.5 cursor-pointer text-dark-muted hover:text-white">
                              <input
                                type="checkbox"
                                checked={Boolean(sData.excludeFromRank)}
                                onChange={(e) => handleOptionChange(student.id, 'excludeFromRank', e.target.checked)}
                                className="rounded bg-dark-bg border-white/10 text-primary-500 focus:ring-0"
                              />
                              <span>Exclude from Rank</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer text-dark-muted hover:text-white">
                              <input
                                type="checkbox"
                                checked={Boolean(sData.excludeFromLive)}
                                onChange={(e) => handleOptionChange(student.id, 'excludeFromLive', e.target.checked)}
                                className="rounded bg-dark-bg border-white/10 text-primary-500 focus:ring-0"
                              />
                              <span>Exclude from Live</span>
                            </label>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Bar */}
          <div className="p-4 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-dark-muted font-medium">
              Showing <b className="text-white">{filteredStudentsList.length}</b> students • Target Class: <b className="text-primary-300">{selectedClass}</b> ({selectedTerm})
            </div>

            <button
              onClick={handleSaveAllMarks}
              disabled={saving || loading}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Save All Marks</span>
            </button>
          </div>
        </GlassCard>
      )}

      {/* MODE 2: SINGLE SUBJECT ENTRY & PIPELINE */}
      {marksMode === 'SINGLE' && (
        <GlassCard className="p-5 border-white/5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-lg font-black text-white">Single Subject Pipeline</h3>
              <p className="text-xs text-dark-muted">Status: <b className="text-primary-400 uppercase">{verificationStatus}</b></p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveSingleSubject('DRAFT')}
                disabled={saving || !selectedSingleSubject}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/10 transition-all"
              >
                Save Draft
              </button>

              <button
                type="button"
                onClick={() => handleSaveSingleSubject('SUBMITTED')}
                disabled={saving || !selectedSingleSubject}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Submit
              </button>

              <button
                type="button"
                onClick={() => handleSaveSingleSubject('VERIFIED')}
                disabled={saving || !selectedSingleSubject}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Verify
              </button>

              <button
                type="button"
                onClick={() => handleSaveSingleSubject('LOCKED')}
                disabled={saving || !selectedSingleSubject}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Lock size={14} />
                <span>Lock Marks</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10 text-dark-muted uppercase font-semibold">
                  <th className="py-3 px-3">Roll #</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-3 text-center">Max Marks</th>
                  <th className="py-3 px-3 text-center">Obtained Marks</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-dark-text">
                {singleSubjectMarks.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-primary-300">{row.rollNo}</td>
                    <td className="py-3 px-4 font-bold text-white">{row.studentName}</td>
                    <td className="py-3 px-3 text-center font-bold text-dark-muted">{row.totalMarks}</td>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="text"
                        disabled={verificationStatus === 'LOCKED'}
                        value={row.obtainedMarks}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSingleSubjectMarks(prev => {
                            const updated = [...prev];
                            updated[idx] = { ...updated[idx], obtainedMarks: val };
                            return updated;
                          });
                        }}
                        className="w-20 px-2 py-1 text-center font-bold text-xs bg-dark-bg/80 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <select
                        disabled={verificationStatus === 'LOCKED'}
                        value={row.status}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSingleSubjectMarks(prev => {
                            const updated = [...prev];
                            updated[idx] = { ...updated[idx], status: val, obtainedMarks: val === MARK_STATUSES.ABSENT ? 'ABS' : updated[idx].obtainedMarks };
                            return updated;
                          });
                        }}
                        className="bg-dark-bg/80 border border-white/10 text-white text-xs font-bold rounded-lg px-2 py-1"
                      >
                        <option value="Present" className="bg-dark-bg">Present</option>
                        <option value="Absent" className="bg-dark-bg">Absent</option>
                        <option value="Leave" className="bg-dark-bg">Leave</option>
                        <option value="Exempt" className="bg-dark-bg">Exempt</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        disabled={verificationStatus === 'LOCKED'}
                        placeholder="Remarks"
                        value={row.remarks}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSingleSubjectMarks(prev => {
                            const updated = [...prev];
                            updated[idx] = { ...updated[idx], remarks: val };
                            return updated;
                          });
                        }}
                        className="w-full px-2.5 py-1 text-xs bg-dark-bg/80 border border-white/10 rounded-lg text-white placeholder-dark-muted focus:outline-none focus:border-primary-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

    </div>
  );
};

export default MarksEntry;
