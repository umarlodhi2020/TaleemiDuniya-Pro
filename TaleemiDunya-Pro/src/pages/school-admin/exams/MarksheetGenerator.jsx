import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Award, FileText, RefreshCw, Users, CheckCircle2, TrendingUp, 
  Printer, ArrowLeft, Download, Eye, AlertCircle, Search, 
  X, Sparkles, Filter, CheckSquare, Square, UserCheck, ShieldCheck,
  Calendar, BookOpen, User, Check, Sliders, Layers, Calculator
} from 'lucide-react';
import GlassCard from '../../../components/common/GlassCard';
import { useAuth } from '../../../context/AuthContext';
import { useSchool } from '../../../context/SchoolContext';
import { getExams, getGradingRules, calculateGrade } from '../../../services/examService';
import { getRecords } from '../../../services/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import { sortClasses } from '../../../utils/classSort';

const DEFAULT_CLASSES = [
  'Nursery', 'PG', 'KG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'
];

const DEFAULT_SECTIONS = ['All', 'A', 'B', 'C', 'D'];

const MarksheetGenerator = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { schoolClasses, schoolData } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  const previewRef = useRef(null);
  const printableAreaRef = useRef(null);

  // Core Database Collections
  const [exams, setExams] = useState([]);
  const [gradingRules, setGradingRules] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [masterFiles, setMasterFiles] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  // Lists & Options
  const [termsList, setTermsList] = useState([]);
  const [dbClasses, setDbClasses] = useState([]);
  const [academicSessions, setAcademicSessions] = useState(['2026-2027', '2025-2026']);
  
  // States
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Mode: 'single' | 'combined'
  const [reportMode, setReportMode] = useState('single');

  // Filters & Selection Controls
  const [selectedSession, setSelectedSession] = useState('2026-2027');
  const [selectedTerm, setSelectedTerm] = useState('');
  
  // Multi-Term / Combined Controls
  const [selectedCombinedTerms, setSelectedCombinedTerms] = useState([]);
  const [calcMethod, setCalcMethod] = useState('SUM'); // 'SUM', 'AVERAGE', 'WEIGHTED'
  const [termWeights, setTermWeights] = useState({});

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectionMode, setSelectionMode] = useState('individual'); // 'individual', 'class', 'section', 'selected'
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [checkedStudentIds, setCheckedStudentIds] = useState(new Set());
  const [marksheetVersion, setMarksheetVersion] = useState('v1'); // 'v1', 'v2'
  const [printFontSize, setPrintFontSize] = useState(18);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'PASSED', 'FAILED'
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const availableClasses = dbClasses.length > 0 ? dbClasses : [];

  useEffect(() => {
    loadInitialData();
  }, [schoolId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [examsData, rulesData, masterFilesData, resultsData, studsData, attData, classesDocData] = await Promise.all([
        getExams(schoolId),
        getGradingRules(schoolId),
        getRecords('examMasterFiles', schoolId),
        getRecords('results', schoolId),
        getRecords('students', schoolId),
        getRecords('attendance', schoolId),
        getRecords('classes', schoolId)
      ]);

      setExams(examsData || []);
      setGradingRules(rulesData || []);
      setMasterFiles(masterFilesData || []);
      setResults(resultsData || []);
      setStudents(studsData || []);
      setAttendanceRecords(attData || []);

      // Extract ONLY actual existing classes from context & database collections
      const contextClasses = (schoolClasses || []).map(c => c.name || c.className).filter(Boolean);
      const createdClasses = (classesDocData || []).map(c => c.name || c.className).filter(Boolean);
      const studentClasses = (studsData || []).map(s => s.class || s.className).filter(Boolean);
      const masterClasses = (masterFilesData || []).map(m => m.className || m.class).filter(Boolean);
      const examClasses = (examsData || []).flatMap(e => e.classes || [e.class || e.className]).filter(Boolean);

      const existingClassesList = sortClasses(Array.from(new Set([
        ...contextClasses,
        ...createdClasses,
        ...studentClasses,
        ...masterClasses,
        ...examClasses
      ])).filter(Boolean));

      setDbClasses(existingClassesList);

      // Extract unique terms/exam names strictly from the Exams collection
      const dbExamNames = (examsData || []).map(e => e.examName || e.title || e.name).filter(Boolean);

      const createdTerms = Array.from(new Set([...dbExamNames]));

      setTermsList(createdTerms);

      if (createdTerms.length > 0) {
        if (!selectedTerm) setSelectedTerm(createdTerms[0]);
        // Default select first 2 terms for combined mode
        if (selectedCombinedTerms.length === 0) {
          const initialCombined = createdTerms.slice(0, 2);
          setSelectedCombinedTerms(initialCombined);
          const initW = {};
          initialCombined.forEach(t => { initW[t] = 50; });
          setTermWeights(initW);
        }
      }

      const activeClassesList = existingClassesList.length > 0 ? existingClassesList : ['Nursery'];
      if (activeClassesList.length > 0 && (!selectedClass || !activeClassesList.includes(selectedClass))) {
        setSelectedClass(activeClassesList[0]);
      }
    } catch (err) {
      console.error('Error loading initial data for marksheet generator:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on Class, Section, and Search Query
  const classStudents = students.filter(s => {
    const matchesClass = !selectedClass || selectedClass === 'All' || s.class === selectedClass || s.className === selectedClass;
    const matchesSection = selectedSection === 'All' || s.section === selectedSection;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.rollNo && String(s.rollNo).toLowerCase().includes(q)) ||
      (s.admissionNo && String(s.admissionNo).toLowerCase().includes(q)) ||
      (s.admNo && String(s.admNo).toLowerCase().includes(q))
    );
    return matchesClass && matchesSection && matchesQuery;
  });

  // Keep selected student synced when class/students list changes
  useEffect(() => {
    if (classStudents.length > 0) {
      if (!selectedStudentId || !classStudents.some(s => s.id === selectedStudentId)) {
        setSelectedStudentId(classStudents[0].id);
      }
      setCheckedStudentIds(new Set(classStudents.map(s => s.id)));
    } else {
      setSelectedStudentId('');
      setCheckedStudentIds(new Set());
    }
  }, [selectedClass, selectedSection, searchQuery]);

  // Handle Combined Terms Checkbox Toggle
  const toggleCombinedTerm = (termName) => {
    const next = [...selectedCombinedTerms];
    const idx = next.indexOf(termName);
    if (idx !== -1) {
      if (next.length <= 2) {
        Swal.fire({
          icon: 'info',
          title: 'Minimum 2 Terms Required',
          text: 'Combined Marksheet requires at least 2 selected terms.',
          timer: 1500,
          showConfirmButton: false
        });
        return;
      }
      next.splice(idx, 1);
    } else {
      next.push(termName);
    }
    setSelectedCombinedTerms(next);

    // Reset default weights if weighted
    const equalWeight = Math.round(100 / next.length);
    const updatedWeights = {};
    next.forEach(t => { updatedWeights[t] = equalWeight; });
    setTermWeights(updatedWeights);
  };

  // Find active exam & master doc for single-term mode
  const activeExam = exams.find(e => {
    const eName = String(e.examName || e.title || e.name || e.id || '').trim().toLowerCase();
    const sTerm = String(selectedTerm || '').trim().toLowerCase();
    return eName === sTerm || eName.includes(sTerm) || sTerm.includes(eName);
  });

  const activeMasterDoc = masterFiles.find(m => {
    const mClass = String(m.className || m.class || '').trim().toLowerCase();
    const sClass = String(selectedClass || '').trim().toLowerCase();
    const mTerm = String(m.termName || m.term || m.examName || '').trim().toLowerCase();
    const sTerm = String(selectedTerm || '').trim().toLowerCase();
    return (mClass === sClass || mClass.includes(sClass) || sClass.includes(mClass)) &&
           (mTerm === sTerm || mTerm.includes(sTerm) || sTerm.includes(mTerm));
  });

  // Helper: Extract active subjects for a given class and specific term name
  const getActiveSubjectsForTerm = (targetTermName, targetClassOverride = null) => {
    const targetCls = String(targetClassOverride || selectedClass || '').trim().toLowerCase();
    const targetT = String(targetTermName || '').trim().toLowerCase();
    
    // Find all student IDs that belong to the selected class
    const classStudentIds = students
       .filter(s => {
          const sClass = String(s.class || s.className || '').trim().toLowerCase();
          return sClass === targetCls;
       })
       .map(s => s.id);

    // 1. Fetch valid results for this class
    const resForClass = results.filter(r => {
      const rTerm = String(r.examName || r.term || '').trim().toLowerCase();
      const termMatches = (!rTerm || rTerm === targetT || rTerm.includes(targetT));
      
      const rCls = String(r.class || r.className || '').trim().toLowerCase();
      // Only include if it explicitly matches class, OR if it belongs to a student in this class
      const classMatches = rCls === targetCls || rCls.split(',').map(s=>s.trim()).includes(targetCls) || classStudentIds.includes(r.studentId);
      
      return termMatches && classMatches;
    });

    // 2. FIRST check if a Master File exists for this exact class and term.
    // The Master File is the definitive source of truth for the syllabus and which subjects to include.
    const mDoc = masterFiles.find(m => {
      const mClass = String(m.className || m.class || '').trim().toLowerCase();
      const mTerm = String(m.termName || m.term || m.examName || '').trim().toLowerCase();
      const isClassMatch = mClass === targetCls || mClass.split(',').map(s=>s.trim()).includes(targetCls);
      return isClassMatch && (mTerm === targetT || mTerm.includes(targetT) || targetT.includes(mTerm));
    });

    if (mDoc?.subjects?.length > 0) {
      // Filter out explicitly excluded subjects
      const includedSubjects = mDoc.subjects.filter(s => s.included !== false);
      if (includedSubjects.length > 0) {
        return includedSubjects.map(s => ({
          name: s.subjectName || s.name,
          totalMarks: Number(s.totalMarks || s.maxMarks || 25),
          passMarks: Number(s.totalMarks || s.maxMarks || 25) * 0.4
        }));
      }
    }

    // 3. Fallback to actual entered results ONLY if no Master File exists.
    const resSubjNames = Array.from(new Set(resForClass.map(r => r.subject || r.subjectName).filter(Boolean)));
    if (resSubjNames.length > 0) {
      return resSubjNames.map(name => {
        const sampleRes = resForClass.find(r => (r.subject || r.subjectName) === name);
        const max = Number(sampleRes?.totalMarks || 25);
        const pass = max * 0.4;
        return { name, totalMarks: max, passMarks: pass };
      });
    }

    // 4. Fallback to Exam definition ONLY if no results and no master file exist
    const ex = exams.find(e => {
      const eName = String(e.examName || e.title || e.name || e.id || '').trim().toLowerCase();
      return eName === targetT || eName.includes(targetT) || targetT.includes(eName);
    });

    if (ex?.subjects?.length > 0) {
      const classSubjs = ex.subjects.filter(s => {
        const sCls = String(s.classId || s.className || '').trim().toLowerCase();
        if (sCls === targetCls || sCls.split(',').map(s=>s.trim()).includes(targetCls)) return true;
        return false;
      });
      if (classSubjs.length > 0) {
        return classSubjs.map(s => ({
          name: s.subjectName || s.name,
          totalMarks: Number(s.totalMarks || s.maxMarks || 100),
          passMarks: Number(s.totalMarks || s.maxMarks || 100) * 0.4
        }));
      }
    }

    // 5. Dynamic Fallback (No Hardcoding)
    return [];
  };

  // Compile subjects list for single-term mode
  const singleActiveSubjects = getActiveSubjectsForTerm(selectedTerm);

  // Calculate Marksheet records for target students (Handles SINGLE and COMBINED modes)
  const computeStudentMarksheets = (targetStudentsList) => {

    // =========================================================================
    // 🔹 1. SINGLE TERM MARKSHEET COMPUTATION
    // =========================================================================
    if (reportMode === 'single') {
      const compiled = targetStudentsList.map(student => {
        const studentRes = results.filter(r => 
          r.studentId === student.id && (
            r.examName === selectedTerm || r.term === selectedTerm || (activeExam && r.examId === activeExam.id)
          )
        );

        let totalMaxMarks = 0;
        let totalObtainedMarks = 0;
        let subjectRows = [];
        let hasFailedSubject = false;
        let hasAnyMarkEntered = false;

        const studentClass = String(student.class || student.className || selectedClass || '').trim();
        const activeStudentSubjects = getActiveSubjectsForTerm(selectedTerm, studentClass);

        activeStudentSubjects.forEach(subj => {
          const subName = subj.name;
          const max = Number(subj.totalMarks || 100);
          const pass = max * 0.4;
          totalMaxMarks += max;

          let rawVal = null;
          if (activeMasterDoc?.marksGrid?.[student.id]?.[subName] !== undefined && activeMasterDoc.marksGrid[student.id][subName] !== null) {
            rawVal = activeMasterDoc.marksGrid[student.id][subName];
          } else {
            const r = studentRes.find(item => item.subject === subName || item.subjectName === subName);
            if (r && r.obtainedMarks !== undefined && r.obtainedMarks !== null) {
              rawVal = r.obtainedMarks;
            }
          }

          let obtText = '—';
          let obtVal = 0;
          let subjGrade = 'F';
          let subjStatus = 'FAIL';
          let isAbsent = false;
          let isEntered = false;

          if (rawVal === 'A' || rawVal === 'ABSENT' || rawVal === 'absent' || rawVal === 'ABS') {
            obtText = 'A';
            isAbsent = true;
            hasFailedSubject = true;
            isEntered = true;
            hasAnyMarkEntered = true;
          } else if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
            const num = Number(rawVal);
            if (!isNaN(num)) {
              obtVal = num;
              obtText = num % 1 === 0 ? String(num) : num.toFixed(1);
              totalObtainedMarks += obtVal;
              
              const subjPct = max > 0 ? (obtVal / max) * 100 : 0;
              const gObj = calculateGrade(subjPct, 100, gradingRules);
              subjGrade = typeof gObj === 'object' ? (gObj?.grade || 'F') : (gObj || 'F');
              subjStatus = obtVal >= pass ? 'PASS' : 'FAIL';
              if (subjStatus === 'FAIL') hasFailedSubject = true;
            } else {
              obtText = String(rawVal);
            }
            isEntered = true;
            hasAnyMarkEntered = true;
          }

          subjectRows.push({
            subjectName: subName,
            maxMarks: max,
            passMarks: pass,
            obtainedText: obtText,
            obtainedMarks: obtVal,
            grade: subjGrade,
            status: subjStatus,
            isAbsent,
            isEntered
          });
        });

        const percentage = (hasAnyMarkEntered && totalMaxMarks > 0) 
          ? (totalObtainedMarks / totalMaxMarks) * 100 
          : 0;

        const overallGradeObj = calculateGrade(percentage, 100, gradingRules);
        const overallGrade = (hasAnyMarkEntered && typeof overallGradeObj === 'object') 
          ? (overallGradeObj?.grade || 'F') 
          : (hasAnyMarkEntered ? overallGradeObj : '—');

        const overallStatus = (hasAnyMarkEntered && !hasFailedSubject && percentage >= 40) ? 'PASS' : (hasAnyMarkEntered ? 'FAIL' : 'UNVERIFIED');

        // Attendance
        const studAtt = attendanceRecords.filter(a => a.studentId === student.id);
        const totalWorkingDays = studAtt.length || 100;
        const presentDays = studAtt.filter(a => a.status === 'present').length || Math.round(totalWorkingDays * 0.92);
        const absentDays = studAtt.filter(a => a.status === 'absent').length || (totalWorkingDays - presentDays);
        const lateDays = studAtt.filter(a => a.status === 'late').length || 0;
        const attendancePct = totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 100;

        return {
          studentId: student.id,
          admissionNo: student.rollNo || student.admissionNo || student.admNo || 'N/A',
          rollNo: student.rollNo || student.rollNumber || 'N/A',
          studentName: student.name || student.studentName || 'Student Name',
          fatherName: student.fatherName || '—',
          className: student.class || selectedClass,
          section: student.section || 'A',
          photo: student.photo || student.avatarUrl || student.imageUrl || null,
          academicSession: selectedSession,
          termName: selectedTerm,
          subjectRows,
          totalMaxMarks,
          totalObtainedMarks: hasAnyMarkEntered ? String(Number(totalObtainedMarks.toFixed(2))) : '0',
          rawPercentage: percentage,
          percentage: hasAnyMarkEntered ? String(Number(percentage.toFixed(2))) : '0',
          overallGrade: hasAnyMarkEntered ? overallGrade : '—',
          overallStatus,
          hasAnyMarkEntered,
          attendance: {
            totalWorkingDays,
            presentDays,
            absentDays,
            lateDays,
            percentage: attendancePct
          }
        };
      });

      const rankedSorted = [...compiled]
        .filter(s => s.hasAnyMarkEntered)
        .sort((a, b) => b.rawPercentage - a.rawPercentage);

      return compiled.map(st => {
        if (!st.hasAnyMarkEntered) return { ...st, position: '—' };
        const rankIdx = rankedSorted.findIndex(s => s.studentId === st.studentId);
        return { ...st, position: rankIdx !== -1 ? `${rankIdx + 1}` : '—' };
      });
    }

    // =========================================================================
    // 🔹 2. COMBINED / MULTI-TERM MARKSHEET COMPUTATION
    // =========================================================================
    const activeTerms = selectedCombinedTerms.length >= 2 ? selectedCombinedTerms : termsList.slice(0, 2);

    const compiledCombined = targetStudentsList.map(student => {
      let combinedTotalMax = 0;
      let combinedTotalObtained = 0;
      let subjectRows = [];
      let hasFailedSubject = false;
      let hasAnyMarkEntered = false;

      // Track totals per term for summary card
      const termTotalsMap = {};
      activeTerms.forEach(t => { termTotalsMap[t] = { obt: 0, max: 0, hasMark: false }; });

      // Calculate subjects for this specific student's class
      const studentClass = String(student.class || student.className || selectedClass || '').trim();
      const allTermSubjectsMap = {};
      activeTerms.forEach(tName => {
        const tSubjs = getActiveSubjectsForTerm(tName, studentClass);
        tSubjs.forEach(s => {
          if (!allTermSubjectsMap[s.name]) {
            allTermSubjectsMap[s.name] = { name: s.name, totalMarks: s.totalMarks, passMarks: s.passMarks };
          }
        });
      });
      const combinedSubjectsList = Object.values(allTermSubjectsMap);

      combinedSubjectsList.forEach(subj => {
        const subName = subj.name;
        let subjCombinedMax = 0;
        let subjCombinedObt = 0;
        const termBreakdown = {};

        activeTerms.forEach(tName => {
          const mDoc = masterFiles.find(m => {
            const mClass = String(m.className || m.class || '').trim().toLowerCase();
            const sClass = String(selectedClass || '').trim().toLowerCase();
            const mTerm = String(m.termName || m.term || m.examName || '').trim().toLowerCase();
            const sTerm = String(tName || '').trim().toLowerCase();
            return (mClass === sClass || mClass.includes(sClass)) && (mTerm === sTerm || mTerm.includes(sTerm));
          });

          const studentRes = results.filter(r => r.studentId === student.id && (r.examName === tName || r.term === tName));

          let rawVal = null;
          if (mDoc?.marksGrid?.[student.id]?.[subName] !== undefined && mDoc.marksGrid[student.id][subName] !== null) {
            rawVal = mDoc.marksGrid[student.id][subName];
          } else {
            const r = studentRes.find(item => item.subject === subName || item.subjectName === subName);
            if (r && r.obtainedMarks !== undefined && r.obtainedMarks !== null) {
              rawVal = r.obtainedMarks;
            }
          }

          const studentClass = String(student.class || student.className || selectedClass || '').trim();
          const termSubjMeta = getActiveSubjectsForTerm(tName, studentClass).find(s => s.name === subName) || subj;
          const tMax = Number(termSubjMeta.totalMarks || 100);

          let tObtText = '—';
          let tObtVal = 0;
          let tHasMark = false;

          if (rawVal === 'A' || rawVal === 'ABSENT' || rawVal === 'absent' || rawVal === 'ABS') {
            tObtText = 'A';
            tHasMark = true;
            hasAnyMarkEntered = true;
          } else if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
            const num = Number(rawVal);
            if (!isNaN(num)) {
              tObtVal = num;
              tObtText = num % 1 === 0 ? String(num) : num.toFixed(1);
              tHasMark = true;
              hasAnyMarkEntered = true;
            } else {
              tObtText = String(rawVal);
            }
          }

          termBreakdown[tName] = { obtText: tObtText, obtVal: tObtVal, max: tMax, hasMark: tHasMark };
          
          if (tHasMark) {
            termTotalsMap[tName].obt += tObtVal;
            termTotalsMap[tName].max += tMax;
            termTotalsMap[tName].hasMark = true;
          }
        });

        // Compute Combined Marks for this subject depending on calcMethod
        if (calcMethod === 'SUM') {
          activeTerms.forEach(tName => {
            const tData = termBreakdown[tName];
            subjCombinedMax += tData.max;
            subjCombinedObt += tData.obtVal;
          });
        } else if (calcMethod === 'AVERAGE') {
          let sumMax = 0;
          let sumObt = 0;
          activeTerms.forEach(tName => {
            const tData = termBreakdown[tName];
            sumMax += tData.max;
            sumObt += tData.obtVal;
          });
          subjCombinedMax = activeTerms.length > 0 ? sumMax / activeTerms.length : 100;
          subjCombinedObt = activeTerms.length > 0 ? sumObt / activeTerms.length : 0;
        } else if (calcMethod === 'WEIGHTED') {
          activeTerms.forEach(tName => {
            const tData = termBreakdown[tName];
            const weight = Number(termWeights[tName] || Math.round(100 / activeTerms.length));
            subjCombinedMax += tData.max * (weight / 100);
            subjCombinedObt += tData.obtVal * (weight / 100);
          });
        }

        combinedTotalMax += subjCombinedMax;
        combinedTotalObtained += subjCombinedObt;

        const subjPct = subjCombinedMax > 0 ? (subjCombinedObt / subjCombinedMax) * 100 : 0;
        const gObj = calculateGrade(subjPct, 100, gradingRules);
        const subjGrade = typeof gObj === 'object' ? (gObj?.grade || 'F') : (gObj || 'F');
        const subjPassMarks = subjCombinedMax * 0.4;
        const subjStatus = subjCombinedObt >= subjPassMarks ? 'PASS' : 'FAIL';
        if (subjStatus === 'FAIL') hasFailedSubject = true;

        subjectRows.push({
          subjectName: subName,
          combinedMax: subjCombinedMax % 1 === 0 ? String(subjCombinedMax) : subjCombinedMax.toFixed(1),
          combinedObtainedText: subjCombinedObt % 1 === 0 ? String(subjCombinedObt) : subjCombinedObt.toFixed(1),
          combinedObtainedVal: subjCombinedObt,
          grade: subjGrade,
          status: subjStatus,
          termBreakdown
        });
      });

      const finalPercentage = (hasAnyMarkEntered && combinedTotalMax > 0) 
        ? (combinedTotalObtained / combinedTotalMax) * 100 
        : 0;

      const overallGradeObj = calculateGrade(finalPercentage, 100, gradingRules);
      const overallGrade = (hasAnyMarkEntered && typeof overallGradeObj === 'object') 
        ? (overallGradeObj?.grade || 'F') 
        : (hasAnyMarkEntered ? overallGradeObj : '—');

      const overallStatus = (hasAnyMarkEntered && !hasFailedSubject && finalPercentage >= 40) ? 'PASS' : (hasAnyMarkEntered ? 'FAIL' : 'UNVERIFIED');

      // Attendance
      const studAtt = attendanceRecords.filter(a => a.studentId === student.id);
      const totalWorkingDays = studAtt.length || 100;
      const presentDays = studAtt.filter(a => a.status === 'present').length || Math.round(totalWorkingDays * 0.92);
      const absentDays = studAtt.filter(a => a.status === 'absent').length || (totalWorkingDays - presentDays);
      const lateDays = studAtt.filter(a => a.status === 'late').length || 0;
      const attendancePct = totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 100;

      return {
        studentId: student.id,
        admissionNo: student.rollNo || student.admissionNo || student.admNo || 'N/A',
        rollNo: student.rollNo || student.rollNumber || 'N/A',
        studentName: student.name || student.studentName || 'Student Name',
        fatherName: student.fatherName || '—',
        className: student.class || selectedClass,
        section: student.section || 'A',
        photo: student.photo || student.avatarUrl || student.imageUrl || null,
        academicSession: selectedSession,
        termName: `COMBINED MARKSHEET (${activeTerms.join(' + ')})`,
        activeTerms,
        subjectRows,
        termTotalsMap,
        totalMaxMarks: String(Number(combinedTotalMax.toFixed(1))),
        totalObtainedMarks: hasAnyMarkEntered ? String(Number(combinedTotalObtained.toFixed(2))) : '0',
        rawPercentage: finalPercentage,
        percentage: hasAnyMarkEntered ? String(Number(finalPercentage.toFixed(2))) : '0',
        overallGrade: hasAnyMarkEntered ? overallGrade : '—',
        overallStatus,
        hasAnyMarkEntered,
        calcMethod,
        attendance: {
          totalWorkingDays,
          presentDays,
          absentDays,
          lateDays,
          percentage: attendancePct
        }
      };
    });

    const rankedCombined = [...compiledCombined]
      .filter(s => s.hasAnyMarkEntered)
      .sort((a, b) => b.rawPercentage - a.rawPercentage);

    return compiledCombined.map(st => {
      if (!st.hasAnyMarkEntered) return { ...st, position: '—' };
      const rankIdx = rankedCombined.findIndex(s => s.studentId === st.studentId);
      return { ...st, position: rankIdx !== -1 ? `${rankIdx + 1}` : '—' };
    });
  };

  // Determine target student array based on selection mode
  const getTargetStudents = () => {
    let target = [];
    if (selectionMode === 'individual') {
      target = classStudents.filter(s => s.id === selectedStudentId);
    } else if (selectionMode === 'section') {
      target = classStudents.filter(s => selectedSection === 'All' || s.section === selectedSection);
    } else if (selectionMode === 'selected') {
      target = classStudents.filter(s => checkedStudentIds.has(s.id));
    } else {
      target = classStudents;
    }

    if (statusFilter === 'PASSED') {
      target = target.filter(s => {
        const computed = computeStudentMarksheets([s])[0];
        return computed.overallStatus === 'PASS';
      });
    } else if (statusFilter === 'FAILED') {
      target = target.filter(s => {
        const computed = computeStudentMarksheets([s])[0];
        return computed.overallStatus === 'FAIL';
      });
    }

    return target;
  };

  const targetStudentsList = React.useMemo(() => getTargetStudents(), [
    classStudents, selectionMode, selectedStudentId, selectedSection, checkedStudentIds, statusFilter,
    reportMode, results, exams, selectedTerm, selectedClass, masterFiles,
    selectedCombinedTerms, termsList, calcMethod, termWeights, gradingRules, attendanceRecords, selectedSession
  ]);

  const generatedMarksheets = React.useMemo(() => computeStudentMarksheets(targetStudentsList), [
    targetStudentsList, reportMode, results, exams, selectedTerm, selectedClass, masterFiles,
    selectedCombinedTerms, termsList, calcMethod, termWeights, gradingRules, attendanceRecords, selectedSession
  ]);

  // 🎯 PRIMARY ACTION WORKFLOW: Generate & Preview
  const handleGenerateAndPreview = () => {
    if (!selectedClass) {
      Swal.fire({
        icon: 'warning',
        title: 'Class Selection Required',
        text: 'Please select Class parameters to generate marksheets.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    if (reportMode === 'single' && !selectedTerm) {
      Swal.fire({
        icon: 'warning',
        title: 'Exam Term Required',
        text: 'Please select an Exam Term for Single Term Marksheet.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    if (reportMode === 'combined' && selectedCombinedTerms.length < 2) {
      Swal.fire({
        icon: 'warning',
        title: 'At Least 2 Terms Required',
        text: 'Please select at least 2 Terms to generate a Combined Marksheet.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    if (targetStudentsList.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Students Selected',
        text: 'No student records match your current filter and selection query.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    // Check if marks exist
    const hasAnyMarksInSystem = generatedMarksheets.some(m => m.hasAnyMarkEntered);
    if (!hasAnyMarksInSystem) {
      Swal.fire({
        icon: 'warning',
        title: 'Result Not Verified / Approved',
        text: `Marksheet cannot be generated because marks have not been entered or verified for Class ${selectedClass}.`,
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setShowPreview(true);
      setActivePreviewIndex(0);

      // Smooth scroll to preview area
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }, 300);
  };

  // Select all / toggle student check in selected mode
  const toggleStudentCheck = (stId) => {
    const next = new Set(checkedStudentIds);
    if (next.has(stId)) next.delete(stId);
    else next.add(stId);
    setCheckedStudentIds(next);
  };

  const toggleSelectAll = () => {
    if (checkedStudentIds.size === classStudents.length) {
      setCheckedStudentIds(new Set());
    } else {
      setCheckedStudentIds(new Set(classStudents.map(s => s.id)));
    }
  };

  // 🖨️ PDF EXPORT ENGINE MATCHING EXACT REFERENCE DESIGN
  // 🖨️ PDF EXPORT ENGINE MATCHING EXACT REFERENCE DESIGN
  const generatePDFDocument = async (marksheetsArray, filename) => {
    try {
      const getBase64ImageFromUrl = async (imageUrl) => {
        if (!imageUrl) return null;
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          return null;
        }
      };

      const principalRule = schoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal');
      const principalSignatureUrl = schoolData?.signatureSettings?.principalSignatureUrl || principalRule?.signatureUrl || null;
      const teacherRule = schoolData?.signatureSettings?.rules?.find(r => r.type === 'Teacher' && String(r.class) === String(selectedClass));
      const teacherSignatureUrl = teacherRule?.signatureUrl || null;

      const principalB64 = await getBase64ImageFromUrl(principalSignatureUrl);
      const teacherB64 = await getBase64ImageFromUrl(teacherSignatureUrl);

      const doc = new jsPDF('portrait', 'mm', 'a4');
      const instName = activeSchoolName;
      const instSub = schoolData?.tagline || 'A Unique Balance Between Deen-O-Duniya';

      for (let index = 0; index < marksheetsArray.length; index++) {
        const stMarksheet = marksheetsArray[index];
        if (index > 0) doc.addPage();

        // Yield thread every 5 marksheets to prevent browser freezing
        if (index > 0 && index % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Outer Page Border
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.rect(12.7, 12.7, 184.6, 271.6);
        doc.rect(13.7, 13.7, 182.6, 269.6); // double line border effect

        // School Logo (Top Left)
        if (activeSchoolLogo) {
          try {
            const format = activeSchoolLogo.includes('image/png') ? 'PNG' : 'JPEG';
            doc.addImage(activeSchoolLogo, format, 14, 12, 20, 20);
          } catch (err) {
            console.warn('Could not embed logo image in PDF:', err);
          }
        }

        // Header Top Tagline
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(220, 38, 38); // red accent tagline
        doc.text(instSub, 105, 16, { align: 'center' });

        // School Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text(instName.toUpperCase(), 105, 23, { align: 'center' });

        // Sub-header left & right
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text('Play Group To Matric', 20, 28);
        doc.text('Reg & Recog', 190, 28, { align: 'right' });

        // Marksheet Title (Underlined)
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        const pdfDocTitle = reportMode === 'combined'
          ? `Combined MarkSheet ${stMarksheet.academicSession}`
          : `${stMarksheet.termName} MarkSheet ${stMarksheet.academicSession}`;

        doc.text(pdfDocTitle, 105, 35, { align: 'center' });
        const titleWidth = doc.getTextWidth(pdfDocTitle);
        doc.setLineWidth(0.4);
        doc.line(105 - (titleWidth / 2), 36.5, 105 + (titleWidth / 2), 36.5);

        // Student Info Grid Box
        doc.setLineWidth(0.3);
        doc.setDrawColor(0, 0, 0);
        doc.line(14, 40, 196, 40);

        doc.setFontSize(11);
        // Row 1
        doc.setFont('helvetica', 'bold');
        doc.text('Name OF Student', 16, 46);
        doc.setFont('helvetica', 'bold');
        doc.text(`: ${stMarksheet.studentName}`, 55, 46);

        doc.setFont('helvetica', 'bold');
        doc.text('Class', 140, 46);
        doc.setFont('helvetica', 'bold');
        doc.text(`: ${stMarksheet.className} (${stMarksheet.section})`, 160, 46);

        // Row 2
        doc.setFont('helvetica', 'bold');
        doc.text('Father Name', 16, 53);
        doc.setFont('helvetica', 'bold');
        doc.text(`: ${stMarksheet.fatherName}`, 55, 53);

        doc.setFont('helvetica', 'bold');
        doc.text('GR#', 140, 53);
        doc.setFont('helvetica', 'bold');
        doc.text(`: ${stMarksheet.rollNo || stMarksheet.admissionNo}`, 160, 53);

        doc.line(14, 57, 196, 57);

        // Subject Marks Table
        let tableHeaders = [];
        let tableBody = [];

        // Compute total pass marks sum for single term
        let totalPassMarksSum = 0;

        if (reportMode === 'single') {
          tableHeaders = ['Subjects', 'M.Marks', 'Pass Marks', 'M.Obtained', 'Remarks'];
          tableBody = stMarksheet.subjectRows.map(sub => {
            totalPassMarksSum += Number(sub.passMarks || 0);
            return [
              sub.subjectName,
              sub.maxMarks,
              sub.passMarks,
              sub.obtainedText,
              sub.grade || sub.status
            ];
          });

          // Append TOTAL row matching image
          tableBody.push([
            'TOTAL',
            stMarksheet.totalMaxMarks,
            totalPassMarksSum,
            stMarksheet.totalObtainedMarks,
            `${stMarksheet.percentage}%`
          ]);
        } else {
          // Combined Mode Table Headers
          const activeTerms = stMarksheet.activeTerms || selectedCombinedTerms;
          tableHeaders = ['Subjects', 'M.Marks', ...activeTerms, 'M.Obtained', 'Remarks'];
          tableBody = stMarksheet.subjectRows.map(sub => {
            const row = [sub.subjectName, sub.combinedMax];
            activeTerms.forEach(t => {
              row.push(sub.termBreakdown[t]?.obtText || '—');
            });
            row.push(sub.combinedObtainedText);
            row.push(sub.grade || sub.status);
            return row;
          });

          // Append TOTAL row matching image
          const totalRow = ['TOTAL', stMarksheet.totalMaxMarks];
          activeTerms.forEach(t => {
            const tTot = stMarksheet.termTotalsMap?.[t]?.obt || 0;
            totalRow.push(tTot);
          });
          totalRow.push(stMarksheet.totalObtainedMarks);
          totalRow.push(`${stMarksheet.percentage}%`);
          tableBody.push(totalRow);
        }

        autoTable(doc, {
          startY: 60,
          head: [tableHeaders],
          body: tableBody,
          theme: 'grid',
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 11,
            halign: 'center',
            lineWidth: 0.3,
            lineColor: [0, 0, 0]
          },
          bodyStyles: {
            fontSize: 11,
            textColor: [0, 0, 0],
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.2,
            lineColor: [0, 0, 0]
          },
          columnStyles: {
            0: { fontStyle: 'bold', halign: 'left' }
          },
          didParseCell: (data) => {
            // Highlight TOTAL row
            if (data.row.index === tableBody.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [248, 250, 252];
            }
          },
          margin: { left: 14, right: 14 }
        });

        const finalY = doc.lastAutoTable?.finalY || 180;

        // Result / Grade / Rank Box Below Table
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);

        // Result on Left
        doc.text('Result:', 20, finalY + 10);
        if (stMarksheet.overallStatus === 'PASS') {
          doc.setTextColor(16, 185, 129);
        } else {
          doc.setTextColor(220, 38, 38);
        }
        doc.text(stMarksheet.overallStatus, 38, finalY + 10);

        // Grade & Rank on Right
        doc.setTextColor(0, 0, 0);
        doc.text('Grade:', 150, finalY + 10);
        doc.text(stMarksheet.overallGrade, 168, finalY + 10);

        if (!activeExam || activeExam?.visibilityControls?.showRankPosition !== false) {
          doc.text('Rank:', 150, finalY + 18);
          doc.text(stMarksheet.position, 168, finalY + 18);
        }

        // Signatures Block at Bottom
        const sigRow1Y = 270;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);

        if (teacherB64) {
          doc.addImage(teacherB64, 'PNG', 35, sigRow1Y - 15, 30, 12);
        }
        doc.line(30, sigRow1Y, 70, sigRow1Y);
        doc.text('CLASS TEACHER', 36, sigRow1Y + 5);

        if (principalB64) {
          doc.addImage(principalB64, 'PNG', 135, sigRow1Y - 15, 30, 12);
        }
        doc.line(130, sigRow1Y, 170, sigRow1Y);
        doc.text('PRINCIPAL', 142, sigRow1Y + 5);
      }

      doc.save(filename);
      Swal.fire({
        icon: 'success',
        title: 'PDF Exported',
        text: 'Marksheet PDF generated in custom format!',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('PDF Generation error:', err);
      Swal.fire('Export Error', 'Failed to generate Marksheet PDF.', 'error');
    }
  };

  const activeSchoolLogo = schoolData?.branding?.logo || schoolData?.logo || schoolData?.logoUrl || schoolData?.schoolLogo || userData?.schoolLogo || userData?.logo || null;
  const activeSchoolName = schoolData?.name || schoolData?.schoolName || userData?.schoolName || userData?.name || 'Your School Name';

  const handleDownloadSinglePDF = async () => {
    const current = generatedMarksheets[activePreviewIndex];
    if (!current) return;
    await generatePDFDocument([current], `${current.studentName.replace(/\s+/g, '_')}_Marksheet.pdf`);
  };

  const handleDownloadBulkPDF = async () => {
    if (generatedMarksheets.length === 0) return;
    await generatePDFDocument(
      generatedMarksheets, 
      `Class_${selectedClass}_${reportMode === 'combined' ? 'Combined' : selectedTerm.replace(/\s+/g, '_')}_Marksheets.pdf`
    );
  };

  const currentPreviewMarksheet = generatedMarksheets[activePreviewIndex] || generatedMarksheets[0];

  return (
    <div className="space-y-6 pb-16">
      
      {/* 🟢 TOP HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Award className="text-blue-600 dark:text-blue-400" size={26} />
            Official Student Marksheet
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Generate, preview, print and export single-term or multi-term combined marksheets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadInitialData}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => navigate('/school-admin/exams/master-file')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Master File</span>
          </button>
        </div>
      </div>

      {/* ⚙️ MARKSHEET CONFIGURATION CARD */}
      <GlassCard className="max-w-3xl mx-auto p-6 md:p-8 space-y-6 shadow-xl border border-slate-200 dark:border-slate-800 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md print:hidden">
        
        {/* Card Header Icon & Titles */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
            <Award size={28} />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
            Marksheet Parameters
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
            Configure single term or multi-term combined marksheets for student results
          </p>
        </div>

        {/* Form Controls */}
        <div className="space-y-4 pt-2">

          {/* 🔘 REPORT TYPE MODE SWITCHER */}
          <div className="space-y-1.5 bg-blue-50/60 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-200/60 dark:border-blue-800/60">
            <label className="block text-[11px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider">
              Select Marksheet Report Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label 
                onClick={() => setReportMode('single')}
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  reportMode === 'single'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                }`}
              >
                <input
                  type="radio"
                  name="reportMode"
                  value="single"
                  checked={reportMode === 'single'}
                  onChange={() => setReportMode('single')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-bold">Single Term Marksheet</p>
                  <p className="text-[10px] opacity-80">Official result transcript for one specific exam term</p>
                </div>
              </label>

              <label 
                onClick={() => setReportMode('combined')}
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  reportMode === 'combined'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                }`}
              >
                <input
                  type="radio"
                  name="reportMode"
                  value="combined"
                  checked={reportMode === 'combined'}
                  onChange={() => setReportMode('combined')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-bold">Combined / Multi-Term Marksheet</p>
                  <p className="text-[10px] opacity-80">Consolidates 2 or more terms into a single final transcript</p>
                </div>
              </label>
            </div>
          </div>
          
          {/* Grid Row 1: Session, Term Selection, Class, Section, Version */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Session */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Academic Session
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
              >
                {academicSessions.map((ses, i) => (
                  <option key={i} value={ses}>{ses}</option>
                ))}
              </select>
            </div>

            {/* Term Selection (Single vs Multi) */}
            {reportMode === 'single' ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Select Exam Term
                </label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                >
                  {termsList.length > 0 ? (
                    termsList.map((t, i) => (
                      <option key={i} value={t}>{t}</option>
                    ))
                  ) : (
                    <option value="">No Terms Found</option>
                  )}
                </select>
              </div>
            ) : (
              <div className="col-span-1 sm:col-span-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Select Multi-Terms to Combine
                </label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {termsList.map((tName, i) => {
                    const isChecked = selectedCombinedTerms.includes(tName);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleCombinedTerm(tName)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isChecked 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        {isChecked ? <CheckSquare size={14} /> : <Square size={14} />}
                        <span>{tName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Class */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Select Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
              >
                <option value="All">All Classes</option>
                {availableClasses.map((cls, i) => (
                  <option key={i} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Section
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
              >
                {DEFAULT_SECTIONS.map((sec, i) => (
                  <option key={i} value={sec}>{sec === 'All' ? 'All Sections' : `Section ${sec}`}</option>
                ))}
              </select>
            </div>

            {/* Version */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Marksheet Version
              </label>
              <select
                value={marksheetVersion}
                onChange={(e) => setMarksheetVersion(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
              >
                <option value="v1">Version 1 (Standard)</option>
                <option value="v2">Version 2 (Large / No Space)</option>
              </select>
            </div>

            {/* Print Font Size */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Table Text Size
              </label>
              <select
                value={printFontSize}
                onChange={(e) => setPrintFontSize(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
              >
                {[12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24].map((size) => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>
            </div>

          </div>

          {/* COMBINED CALCULATION METHOD CONFIGURATION (If reportMode === 'combined') */}
          {reportMode === 'combined' && (
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-2xl space-y-2">
              <label className="block text-[11px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator size={14} />
                <span>Combined Calculation Method</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCalcMethod('SUM')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    calcMethod === 'SUM'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  SUM (Term 1 + Term 2)
                </button>

                <button
                  type="button"
                  onClick={() => setCalcMethod('AVERAGE')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    calcMethod === 'AVERAGE'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  AVERAGE (% Mean)
                </button>

                <button
                  type="button"
                  onClick={() => setCalcMethod('WEIGHTED')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    calcMethod === 'WEIGHTED'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  WEIGHTED (% Ratios)
                </button>
              </div>

              {calcMethod === 'WEIGHTED' && (
                <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-amber-200 dark:border-amber-800/60">
                  {selectedCombinedTerms.map((tName, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{tName} %:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={termWeights[tName] || 50}
                        onChange={(e) => setTermWeights({ ...termWeights, [tName]: Number(e.target.value) })}
                        className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Student Target Selection Mode */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Student Scope
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectionMode('individual')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectionMode === 'individual'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Single Student
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode('class')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectionMode === 'class'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Entire Class ({classStudents.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode('section')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectionMode === 'section'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Section {selectedSection}
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode('selected')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectionMode === 'selected'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Custom Checked ({checkedStudentIds.size})
              </button>
            </div>
          </div>

          {/* Student Dropdown for Single Mode */}
          {selectionMode === 'individual' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Select Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
              >
                {classStudents.length > 0 ? (
                  classStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name || st.studentName} — Roll: {st.rollNo || st.rollNumber || 'N/A'} (Adm: {st.admissionNo || st.admNo || 'N/A'})
                    </option>
                  ))
                ) : (
                  <option value="">No Students Found in Class {selectedClass}</option>
                )}
              </select>
            </div>
          )}

          {/* Checkbox List for Custom Selected Mode */}
          {selectionMode === 'selected' && (
            <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-900/50 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Students ({checkedStudentIds.size} / {classStudents.length})
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {checkedStudentIds.size === classStudents.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {classStudents.length === 0 ? (
                  <p className="text-xs text-slate-400 col-span-2">No students match filter.</p>
                ) : (
                  classStudents.map((st) => {
                    const isChecked = checkedStudentIds.has(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => toggleStudentCheck(st.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-900 dark:text-blue-200' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isChecked ? <CheckSquare size={16} className="text-blue-600 shrink-0" /> : <Square size={16} className="text-slate-400 shrink-0" />}
                          <span className="text-xs font-bold truncate">{st.name || st.studentName}</span>
                        </div>
                        <span className="text-[10px] font-mono opacity-70">
                          Adm: {st.rollNo || st.admissionNo || st.admNo || 'N/A'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Additional Search & Result Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search by student name or roll no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
              >
                <option value="ALL">Filter Result Status: All</option>
                <option value="PASSED">Passed Students Only</option>
                <option value="FAILED">Failed Students Only</option>
              </select>
            </div>
          </div>

          {/* 🎯 SINGLE UNIFIED PRIMARY ACTION BUTTON */}
          <div className="pt-3">
            <button
              onClick={handleGenerateAndPreview}
              disabled={generating || loading || !selectedClass}
              className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Fetching Result & Generating Marksheet...</span>
                </>
              ) : (
                <>
                  <Eye size={18} />
                  <span>
                    {reportMode === 'combined' ? 'Generate & Preview Combined Marksheet' : 'Generate & Preview Marksheet'}
                  </span>
                </>
              )}
            </button>
          </div>

        </div>

      </GlassCard>

      {/* 📌 PREVIEW SECTION / EMPTY STATE CONTAINER */}
      <div ref={previewRef} id="marksheet-preview-section" className="scroll-mt-6">
        
        {!showPreview ? (
          /* EMPTY STATE BEFORE GENERATION */
          <GlassCard className="p-12 text-center max-w-xl mx-auto space-y-3 border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 print:hidden">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Award size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
              Marksheet Document Ready
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Select Exam parameters above and click <span className="font-bold text-blue-600 dark:text-blue-400">"Generate & Preview Marksheet"</span> to render the official transcript on this screen.
            </p>
          </GlassCard>
        ) : (
          /* 📄 LIVE MARKSHEET DOCUMENT PREVIEW MATCHING CUSTOM REFERENCE IMAGE */
          <div className="space-y-6 max-w-4xl mx-auto print:max-w-none print:w-full print:m-0">
              <style>
              {`
                @media print { 
                  @page { margin: 0; size: A4 portrait; } 
                  body { margin: 0; padding: 0; background: white; }
                  .printable-report-area { padding: 0 !important; max-width: none !important; width: 100% !important; margin: 0 !important; }
                  /* Force exact A4 dimensions for each marksheet */
                  .a4-marksheet-wrapper {
                    width: 210mm !important;
                    height: 296mm !important;
                    padding: 12.7mm !important; /* EXACTLY 0.5 inch margin on all sides */
                    box-sizing: border-box !important;
                    margin: 0 !important;
                    page-break-after: always;
                    break-after: page;
                  }
                }
              `}
            </style>

            {/* 🛠️ PREVIEW TOOLBAR */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    Official Student Marksheet Preview
                    {reportMode === 'combined' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500 text-white">
                        COMBINED ({calcMethod})
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Showing <span className="font-bold text-white">{generatedMarksheets.length}</span> marksheets • Class <span className="font-bold text-white">{selectedClass}</span>
                  </p>
                </div>
              </div>

              {/* Bulk Carousel Pager if multiple marksheets */}
              {generatedMarksheets.length > 1 && (
                <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg">
                  <button
                    disabled={activePreviewIndex === 0}
                    onClick={() => setActivePreviewIndex(prev => Math.max(0, prev - 1))}
                    className="text-xs font-bold hover:text-blue-400 disabled:opacity-40 cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {activePreviewIndex + 1} / {generatedMarksheets.length}
                  </span>
                  <button
                    disabled={activePreviewIndex === generatedMarksheets.length - 1}
                    onClick={() => setActivePreviewIndex(prev => Math.min(generatedMarksheets.length - 1, prev + 1))}
                    className="text-xs font-bold hover:text-blue-400 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Action Toolbar Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>

                <button
                  onClick={handleDownloadSinglePDF}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>Single PDF</span>
                </button>

                {generatedMarksheets.length > 1 && (
                  <button
                    onClick={handleDownloadBulkPDF}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Bulk PDF</span>
                  </button>
                )}

                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* 🏫 SMART ANGELS GRAMMAR SCHOOL OFFICIAL MARKSHEET DESIGN */}
            <div ref={printableAreaRef} className="printable-report-area">
            {generatedMarksheets.map((currentPreviewMarksheet, mapIndex) => {
              const cellPad = marksheetVersion === 'v2' ? 'p-3 md:p-5' : 'p-2';
              return (
              <div 
                key={currentPreviewMarksheet.studentId}
                className={`bg-white text-slate-900 font-sans relative shadow-2xl rounded-none a4-marksheet-wrapper mx-auto ${mapIndex === activePreviewIndex ? 'block' : 'hidden print:block'}`}
              >
                {/* INNER BORDER CONTAINER THAT STRETCHES TO FILL THE PADDING BOX */}
                <div className="border-4 border-slate-900 p-6 flex flex-col h-full relative">
                  
                  {/* Background Watermark Logo */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none z-0">
                    {activeSchoolLogo ? (
                      <img src={activeSchoolLogo} alt="Watermark Logo" className="w-80 h-80 object-contain" />
                    ) : (
                      <div className="w-80 h-80 rounded-full border-8 border-slate-900 flex items-center justify-center text-center p-6">
                        <p className="text-4xl font-black text-slate-900 tracking-wider">
                          {activeSchoolName.split(' ').map(n => n[0]).join('').slice(0, 4)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 space-y-4 flex flex-col flex-1 h-full">

                  {/* 1. Header Section */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: School Logo */}
                      <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                        {activeSchoolLogo ? (
                          <img src={activeSchoolLogo} alt="School Logo" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-16 h-16 rounded-full border-2 border-slate-900 flex items-center justify-center bg-slate-100 text-slate-900 font-black text-xl shadow-sm">
                            {activeSchoolName.split(' ').map(n => n[0]).join('').slice(0, 3)}
                          </div>
                        )}
                      </div>

                      {/* Center: School Name & Taglines */}
                      <div className="text-center flex-1 space-y-0.5">
                        <p className="text-xs md:text-sm font-bold text-red-600 uppercase tracking-wide">
                          {schoolData?.tagline || 'A Unique Balance Between Deen-O-Duniya'}
                        </p>
                        
                        <h1 className={`text-2xl md:text-3xl font-black tracking-tight uppercase ${marksheetVersion === 'v2' ? 'text-black' : 'text-slate-900'}`}>
                          {activeSchoolName}
                        </h1>

                        <div className={`flex justify-between items-center text-xs font-bold px-2 pt-1 ${marksheetVersion === 'v2' ? 'text-black' : 'text-slate-800'}`}>
                          <span>Play Group To Matric</span>
                          <span className={`font-semibold ${marksheetVersion === 'v2' ? 'text-black' : 'text-slate-700'}`}>Reg & Recog</span>
                        </div>
                      </div>

                      {/* Right: Balance Spacer */}
                      <div className="w-20 h-20 shrink-0 hidden sm:flex items-center justify-center opacity-0 pointer-events-none">
                        {/* Spacer for symmetry */}
                      </div>
                    </div>

                    <div className="pt-2 text-center border-t-2 border-slate-900">
                      <h2 className="text-base md:text-lg font-black text-slate-900 underline tracking-wide">
                        {reportMode === 'combined'
                          ? `Combined MarkSheet ${currentPreviewMarksheet.academicSession}`
                          : `${currentPreviewMarksheet.termName} MarkSheet ${currentPreviewMarksheet.academicSession}`}
                      </h2>
                    </div>
                  </div>

                  {/* 2. Student Information Box */}
                  <div className={`border-t-2 border-b-2 border-slate-900 ${marksheetVersion === 'v2' ? 'py-4 md:py-6 text-base md:text-lg print:text-[18px] text-black' : 'py-3 text-base md:text-lg print:text-[18px]'} grid grid-cols-2 gap-x-6 gap-y-2 font-bold`}>
                    <div className="flex items-center gap-2">
                      <span className={`${marksheetVersion === 'v2' ? 'font-black text-black' : 'text-slate-800 font-semibold'} w-32`}>Name OF Student</span>
                      <span>:</span>
                      <span className={`font-black underline uppercase ${marksheetVersion === 'v2' ? 'text-black' : 'text-slate-900'}`}>{currentPreviewMarksheet.studentName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`${marksheetVersion === 'v2' ? 'font-black text-black' : 'text-slate-800 font-semibold'} w-20`}>Class</span>
                      <span>:</span>
                      <span className={`font-black ${marksheetVersion === 'v2' ? 'text-black' : 'text-slate-900'}`}>{currentPreviewMarksheet.className}<sup>th</sup></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`${marksheetVersion === 'v2' ? 'font-black text-black' : 'text-slate-800 font-semibold'} w-32`}>Father Name</span>
                      <span>:</span>
                      <span className={`font-black ${marksheetVersion === 'v2' ? 'text-black' : 'text-slate-900'}`}>{currentPreviewMarksheet.fatherName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`${marksheetVersion === 'v2' ? 'font-black text-black' : 'text-slate-800 font-semibold'} w-20`}>GR#</span>
                      <span>:</span>
                      <span className={`font-black font-mono ${marksheetVersion === 'v2' ? 'text-black' : 'text-slate-900'}`}>{currentPreviewMarksheet.rollNo || currentPreviewMarksheet.admissionNo}</span>
                    </div>
                  </div>

                  {/* 3. Marksheet Table */}
                  <style>{`
                    @media print {
                      .dynamic-print-text th, .dynamic-print-text td {
                        font-size: ${printFontSize}px !important;
                      }
                    }
                  `}</style>
                  <div className={`overflow-x-auto ${marksheetVersion === 'v2' ? 'flex-1 flex flex-col justify-center' : ''}`}>
                    <table className={`dynamic-print-text w-full ${marksheetVersion === 'v2' ? 'text-base md:text-xl h-full' : 'text-sm md:text-base'} border-2 border-slate-900 text-center border-collapse`}>
                      <thead>
                        {reportMode === 'single' ? (
                          <tr className="border-b-2 border-slate-900 bg-slate-100 font-black text-slate-900">
                            <th className={`${cellPad} border-r-2 border-slate-900 text-left pl-3 w-1/3`}>Subjects</th>
                            <th className={`${cellPad} border-r-2 border-slate-900 w-24`}>M.Marks</th>
                            <th className={`${cellPad} border-r-2 border-slate-900 w-28`}>Pass Marks</th>
                            <th className={`${cellPad} border-r-2 border-slate-900 w-28`}>M.Obtained</th>
                            <th className={`${cellPad} border-slate-900 w-32`}>Remarks</th>
                          </tr>
                        ) : (
                          <tr className="border-b-2 border-slate-900 bg-slate-100 font-black text-slate-900">
                            <th className={`${cellPad} border-r-2 border-slate-900 text-left pl-3 w-1/3`}>Subjects</th>
                            <th className={`${cellPad} border-r-2 border-slate-900 w-20`}>M.Marks</th>
                            {(currentPreviewMarksheet.activeTerms || selectedCombinedTerms).map((tName, i) => (
                              <th key={i} className={`${cellPad} border-r-2 border-slate-900 min-w-[70px]`}>
                                {tName}
                              </th>
                            ))}
                            <th className={`${cellPad} border-r-2 border-slate-900 w-28`}>M.Obtained</th>
                            <th className={`${cellPad} border-slate-900 w-28`}>Remarks</th>
                          </tr>
                        )}
                      </thead>

                      <tbody className="divide-y border-b-2 border-slate-900">
                        {currentPreviewMarksheet.subjectRows.map((subj, idx) => (
                          <tr key={idx} className="font-bold border-b border-slate-900">
                            <td className={`${cellPad} text-left pl-3 border-r-2 border-slate-900 text-slate-900 font-black`}>
                              {subj.subjectName}
                            </td>

                            {reportMode === 'single' ? (
                              <>
                                <td className={`${cellPad} border-r-2 border-slate-900 text-slate-900`}>{subj.maxMarks}</td>
                                <td className={`${cellPad} border-r-2 border-slate-900 text-slate-800`}>
                                  {subj.passMarks}
                                </td>
                                <td className={`${cellPad} border-r-2 border-slate-900 text-slate-900 font-black`}>{subj.obtainedText}</td>
                                <td className={`${cellPad} border-slate-900 font-bold text-slate-800`}>{subj.grade || subj.status}</td>
                              </>
                            ) : (
                              <>
                                <td className={`${cellPad} border-r-2 border-slate-900 text-slate-900`}>{subj.combinedMax}</td>
                                {(currentPreviewMarksheet.activeTerms || selectedCombinedTerms).map((tName, i) => (
                                  <td key={i} className={`${cellPad} border-r-2 border-slate-900 text-slate-800`}>
                                    {subj.termBreakdown?.[tName]?.obtText || '—'}
                                  </td>
                                ))}
                                <td className={`${cellPad} border-r-2 border-slate-900 text-slate-900 font-black`}>{subj.combinedObtainedText}</td>
                                <td className={`${cellPad} border-slate-900 font-bold text-slate-800`}>{subj.grade || subj.status}</td>
                              </>
                            )}
                          </tr>
                        ))}

                        {/* TOTAL ROW MATCHING REFERENCE IMAGE */}
                        <tr className="font-black bg-slate-100 text-slate-900 border-t-2 border-slate-900">
                          <td className={`${cellPad} text-left pl-3 border-r-2 border-slate-900 uppercase`}>TOTAL</td>
                          <td className={`${cellPad} border-r-2 border-slate-900`}>{currentPreviewMarksheet.totalMaxMarks}</td>
                          {reportMode === 'single' ? (
                            <td className={`${cellPad} border-r-2 border-slate-900`}>
                              {currentPreviewMarksheet.subjectRows.reduce((acc, curr) => acc + Number(curr.passMarks || 0), 0)}
                            </td>
                          ) : (
                            (currentPreviewMarksheet.activeTerms || selectedCombinedTerms).map((tName, i) => (
                              <td key={i} className={`${cellPad} border-r-2 border-slate-900`}>
                                {currentPreviewMarksheet.termTotalsMap?.[tName]?.obt || 0}
                              </td>
                            ))
                          )}
                          <td className={`${cellPad} border-r-2 border-slate-900 font-black text-slate-900`}>{currentPreviewMarksheet.totalObtainedMarks}</td>
                          <td className={`${cellPad} border-slate-900 font-black text-blue-900 text-base`}>{currentPreviewMarksheet.percentage}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 4. Result / Grade / Rank Summary */}
                  <div className={`flex justify-between items-start ${marksheetVersion === 'v2' ? 'text-lg md:text-2xl py-4 text-black' : 'text-base md:text-lg print:text-[16px] pt-2 text-slate-900'} font-black px-2`}>
                    <div className="flex items-center gap-2">
                      <span>Result:</span>
                      <span className={currentPreviewMarksheet.overallStatus === 'PASS' ? 'text-emerald-700 font-black' : 'text-rose-700 font-black'}>
                        {currentPreviewMarksheet.overallStatus}
                      </span>
                    </div>

                    <div className="space-y-1 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className={`font-semibold ${marksheetVersion === 'v2' ? 'text-black' : 'text-slate-700'}`}>Grade:</span>
                        <span className={`font-black underline ${marksheetVersion === 'v2' ? 'text-xl md:text-3xl text-black' : 'text-lg text-slate-900'}`}>{currentPreviewMarksheet.overallGrade}</span>
                      </div>
                      {(!activeExam || activeExam?.visibilityControls?.showRankPosition !== false) && (
                        <div className="flex items-center justify-end gap-3">
                          <span className={`font-semibold ${marksheetVersion === 'v2' ? 'text-black' : 'text-slate-700'}`}>Rank:</span>
                          <span className={`font-black ${marksheetVersion === 'v2' ? 'text-lg md:text-2xl text-black' : 'text-slate-900'}`}>{currentPreviewMarksheet.position}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5. Signatures Footer */}
                  <div className="mt-auto pt-10 flex justify-between items-end px-16 text-xs md:text-sm font-bold text-slate-900 pb-2">
                    <div className="flex flex-col items-center">
                      {schoolData?.signatureSettings?.rules?.find(r => r.type === 'Teacher' && String(r.class) === String(selectedClass))?.signatureUrl ? (
                        <img src={schoolData.signatureSettings.rules.find(r => r.type === 'Teacher' && String(r.class) === String(selectedClass)).signatureUrl} alt="Class Teacher" className="h-24 max-w-[180px] scale-125 origin-bottom mix-blend-multiply object-contain -mb-2" />
                      ) : (
                        <div className="h-16"></div>
                      )}
                      <div className="w-40 border-b-2 border-slate-900 mx-auto mb-1"></div>
                      <span>CLASS TEACHER</span>
                    </div>

                    <div className="flex flex-col items-center">
                      {schoolData?.signatureSettings?.principalSignatureUrl || schoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal')?.signatureUrl ? (
                        <img src={schoolData?.signatureSettings?.principalSignatureUrl || schoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal')?.signatureUrl} alt="Principal" className="h-24 max-w-[180px] scale-125 origin-bottom mix-blend-multiply object-contain -mb-2" />
                      ) : (
                        <div className="h-16"></div>
                      )}
                      <div className="w-40 border-b-2 border-slate-900 mx-auto mb-1"></div>
                      <span>PRINCIPAL</span>
                    </div>
                  </div>

                  </div>

                </div>

              </div>
              );
            })}
            </div>

          </div>
        )}

      </div>

    </div>
  );
};

export default MarksheetGenerator;
