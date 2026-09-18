import React, { useState, useEffect, useRef } from 'react';
import { 
  Clipboard, Save, Copy, RefreshCw, X, CheckSquare, Square, 
  Check, Calendar, BookOpen, Layers, Award, UserCheck, ShieldCheck, 
  FileText, Printer, AlertTriangle, Users, CheckCircle, Lock, Unlock, 
  Eye, Sparkles, Filter, ChevronRight, PieChart, Clock, Building, User,
  FileSpreadsheet, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSchool } from '../../../context/SchoolContext';
import { getRecords, addRecord, updateRecord, upsertRecord } from '../../../services/db';
import { 
  saveMarksBatch, 
  MARK_STATUSES, 
  VERIFICATION_STATUSES, 
  APPROVAL_STATES,
  checkStudentFeeClearance,
  computeExamResultSummary,
  assignClassRanks,
  detectExamScheduleConflicts,
  getGradingRules
} from '../../../services/examService';
import Swal from 'sweetalert2';

const DEFAULT_TERMS = [
  '1st Assessment 2025-26',
  '2nd Assessment 2025-26',
  '3rd Assessment 2025-26',
  '4th Assessment 2025-26',
  'First Term 2025-26',
  'Mid Term Exam 2026',
  'Second Term 2026',
  'Final Term Exam 2026',
  'Annual Exam 2026',
  'Monthly Test',
  'Pre-Board Exam'
];

const DEFAULT_SUBJECTS_LIST = [
  'Biology',
  'Chemistry',
  'English',
  'Math',
  'Pakistan Study',
  'Physics',
  'Sindhi',
  'Computer',
  'Drawing',
  'G.K + Reader',
  'Islamiat',
  'Madarsa',
  'Poem + Islamiat',
  'Science',
  'Social Study',
  'Urdu'
];

const ExamMasterFile = () => {
  const { userData } = useAuth();
  const { schoolClasses, schoolData } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';
  const printRef = useRef(null);

  // Workflow Stage Navigation (1-6)
  const [activeStage, setActiveStage] = useState('stage1'); // stage1..stage6

  // Selection States
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');

  // Master Data
  const [masterSubjects, setMasterSubjects] = useState([]);
  const [masterFiles, setMasterFiles] = useState([]);
  const [createdExams, setCreatedExams] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [gradingRules, setGradingRules] = useState([]);
  const [currentFileDoc, setCurrentFileDoc] = useState(null);
  const [subjectRows, setSubjectRows] = useState([]);
  
  // Loading & Saving States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Copy Modal State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [targetClasses, setTargetClasses] = useState([]);
  const [copying, setCopying] = useState(false);

  // Stage 2: Admit Card State
  const [selectedStudentForAdmitCard, setSelectedStudentForAdmitCard] = useState('ALL');
  const [feeStatusMap, setFeeStatusMap] = useState({});
  const [checkingFees, setCheckingFees] = useState(false);

  // Stage 3: Attendance State
  const [selectedSubjectForAttendance, setSelectedSubjectForAttendance] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState({}); // studentId -> status

  // Stage 4: Marks Entry & Verification State
  const [selectedSubjectForMarks, setSelectedSubjectForMarks] = useState('');
  const [studentMarksState, setStudentMarksState] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState('DRAFT');
  const [marksMode, setMarksMode] = useState('BULK'); // 'BULK' | 'SINGLE'
  const [activeSubjectFilter, setActiveSubjectFilter] = useState('ALL');
  const [bulkGridData, setBulkGridData] = useState({});

  // Stage 5: Result Processing State
  const [approvalState, setApprovalState] = useState('DRAFT');
  const [computedResults, setComputedResults] = useState([]);

  // Stage 6: Marksheet State
  const [selectedStudentForMarksheet, setSelectedStudentForMarksheet] = useState('ALL');

  const availableClasses = schoolClasses?.length > 0
    ? schoolClasses.map(c => c.name)
    : [];

  const availableSections = ['All', 'A', 'B', 'C', 'D', 'Boys', 'Girls'];

  useEffect(() => {
    loadInitialData();
  }, [schoolId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [subjectsData, filesData, examsData, studentsData, rulesData] = await Promise.all([
        getRecords('subjects', schoolId),
        getRecords('examMasterFiles', schoolId),
        getRecords('exams', schoolId),
        getRecords('students', schoolId),
        getGradingRules(schoolId)
      ]);

      const subList = (subjectsData && subjectsData.length > 0)
        ? subjectsData.map(s => {
            let n = s.subjectName || s.name;
            return typeof n === 'string' ? n : (n ? String(n) : '');
          }).filter(Boolean)
        : DEFAULT_SUBJECTS_LIST;

      setMasterSubjects(Array.from(new Set(subList)));
      setMasterFiles(filesData || []);
      setStudentsList(studentsData || []);
      setGradingRules(rulesData || []);

      const examNames = examsData ? examsData.map(e => e.examName || e.title).filter(Boolean) : [];
      const uniqueExams = Array.from(new Set(examNames));
      setCreatedExams(uniqueExams.length > 0 ? uniqueExams : DEFAULT_TERMS);
    } catch (err) {
      console.error('Error loading Exam Master File data:', err);
    } finally {
      setLoading(false);
    }
  };

  // When class or term changes, load/build subjects for that pair
  useEffect(() => {
    if (!selectedClass || !selectedTerm) {
      setSubjectRows([]);
      setCurrentFileDoc(null);
      return;
    }

    const found = masterFiles.find(
      f => (f.className === selectedClass || f.classId === selectedClass) && f.term === selectedTerm
    );

    const fullSubjectNames = masterSubjects.length > 0 ? masterSubjects : DEFAULT_SUBJECTS_LIST;

    const sortSubjects = (list) => {
      return [...list].sort((a, b) => {
        if (a.included && !b.included) return -1;
        if (!a.included && b.included) return 1;
        return (a.subjectName || '').localeCompare(b.subjectName || '');
      });
    };

    if (found && Array.isArray(found.subjects)) {
      setCurrentFileDoc(found);
      const savedMap = new Map();
      found.subjects.forEach(s => savedMap.set(s.subjectName, s));

      const mergedRows = fullSubjectNames.map((sName) => {
        if (savedMap.has(sName)) {
          const s = savedMap.get(sName);
          return {
            subjectName: sName,
            included: Boolean(s.included ?? true),
            examDate: s.examDate || '',
            startTime: s.startTime || '09:00 AM',
            endTime: s.endTime || '12:00 PM',
            room: s.room || 'Main Hall',
            invigilator: s.invigilator || 'Staff Member',
            maxMarks: s.maxMarks !== undefined && s.maxMarks !== null ? Number(s.maxMarks).toFixed(2) : '25.00',
            passingMarks: s.passingMarks !== undefined && s.passingMarks !== null ? Number(s.passingMarks).toFixed(2) : '8.25',
            failable: Boolean(s.failable ?? true),
            syllabus: s.syllabus || ''
          };
        } else {
          return {
            subjectName: sName,
            included: false,
            examDate: '',
            startTime: '09:00 AM',
            endTime: '12:00 PM',
            room: 'Main Hall',
            invigilator: 'Staff Member',
            maxMarks: '0.00',
            passingMarks: '0.00',
            failable: false,
            syllabus: ''
          };
        }
      });

      setSubjectRows(sortSubjects(mergedRows));
    } else {
      setCurrentFileDoc(null);
      const defaultRows = fullSubjectNames.map((sName, idx) => {
        const isIncludedDefault = idx < 7;
        return {
          subjectName: sName,
          included: isIncludedDefault,
          examDate: '',
          startTime: '09:00 AM',
          endTime: '12:00 PM',
          room: 'Main Hall',
          invigilator: 'Staff Member',
          maxMarks: isIncludedDefault ? '25.00' : '0.00',
          passingMarks: isIncludedDefault ? '8.25' : '0.00',
          failable: isIncludedDefault,
          syllabus: ''
        };
      });

      setSubjectRows(sortSubjects(defaultRows));
    }
  }, [selectedClass, selectedTerm, masterFiles, masterSubjects]);

  // Conflict Detection for Schedule
  const scheduleConflicts = detectExamScheduleConflicts(
    subjectRows.filter(s => s.included && s.examDate).map(s => ({
      ...s,
      className: selectedClass,
      classId: selectedClass
    }))
  );

  const handleToggleInclude = (index) => {
    setSubjectRows(prev => {
      const updated = [...prev];
      const current = updated[index];
      const newIncluded = !current.included;
      const defaultMax = Number(current.maxMarks) > 0 ? current.maxMarks : '25.00';
      updated[index] = {
        ...current,
        included: newIncluded,
        maxMarks: newIncluded ? defaultMax : '0.00',
        passingMarks: newIncluded ? (Number(defaultMax) * 0.33).toFixed(2) : '0.00',
        failable: newIncluded ? true : false
      };
      
      return [...updated].sort((a, b) => {
        if (a.included && !b.included) return -1;
        if (!a.included && b.included) return 1;
        return (a.subjectName || '').localeCompare(b.subjectName || '');
      });
    });
  };

  const handleRowChange = (index, field, value) => {
    setSubjectRows(prev => {
      const updated = [...prev];
      const curr = { ...updated[index], [field]: value };
      if (field === 'maxMarks' && curr.included) {
        const numMax = Number(value) || 0;
        curr.passingMarks = (numMax * 0.33).toFixed(2);
      }
      updated[index] = curr;
      return updated;
    });
  };

  const handleSaveMasterFile = async () => {
    if (!selectedClass || !selectedTerm) {
      return Swal.fire('Warning', 'Please select both Class and Term', 'warning');
    }

    setSaving(true);
    try {
      const effectiveSchoolId = schoolId || userData?.schoolId || 'default-school';

      const payload = {
        className: String(selectedClass || ''),
        classId: String(selectedClass || ''),
        term: String(selectedTerm || ''),
        subjects: subjectRows.map(s => ({
          subjectName: String(s.subjectName || ''),
          included: Boolean(s.included),
          examDate: String(s.examDate || ''),
          startTime: String(s.startTime || '09:00 AM'),
          endTime: String(s.endTime || '12:00 PM'),
          room: String(s.room || 'Main Hall'),
          invigilator: String(s.invigilator || 'Staff Member'),
          maxMarks: Number(s.maxMarks || 0),
          passingMarks: Number(s.passingMarks || 0),
          failable: Boolean(s.failable),
          syllabus: String(s.syllabus || '')
        })),
        schoolId: effectiveSchoolId,
        updatedAt: new Date().toISOString()
      };

      let saveResult;
      if (currentFileDoc?.id) {
        saveResult = await upsertRecord('examMasterFiles', currentFileDoc.id, payload);
        if (saveResult && saveResult.success === false) {
          saveResult = await addRecord('examMasterFiles', payload, effectiveSchoolId);
        }
      } else {
        payload.createdAt = new Date().toISOString();
        saveResult = await addRecord('examMasterFiles', payload, effectiveSchoolId);
      }

      if (saveResult && saveResult.success === false) {
        throw new Error(saveResult.error?.message || 'Failed to save master file to database.');
      }

      Swal.fire({
        title: 'Master File Saved!',
        text: `Exam Master File for Class ${selectedClass} (${selectedTerm}) saved successfully.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#1a1f37',
        color: '#fff'
      });

      const updatedFiles = await getRecords('examMasterFiles', effectiveSchoolId);
      setMasterFiles(updatedFiles || []);
      const newCurrent = (updatedFiles || []).find(
        f => (f.className === selectedClass || f.classId === selectedClass) && f.term === selectedTerm
      );
      if (newCurrent) {
        setCurrentFileDoc(newCurrent);
      }
    } catch (err) {
      console.error('Error saving master file:', err);
      Swal.fire('Error', err.message || 'Failed to save master file', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Copy to other classes
  const handleOpenCopyModal = () => {
    if (!selectedClass || !selectedTerm) {
      return Swal.fire('Selection Required', 'Please select a Class and Term first to copy.', 'info');
    }

    setTargetClasses(availableClasses.filter(c => c !== selectedClass));
    setIsCopyModalOpen(true);
  };

  const handleToggleTargetClass = (cls) => {
    setTargetClasses(prev => 
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  const handleSelectAllTargetClasses = () => {
    const otherClasses = availableClasses.filter(c => c !== selectedClass);
    if (targetClasses.length === otherClasses.length) {
      setTargetClasses([]);
    } else {
      setTargetClasses(otherClasses);
    }
  };

  const handleExecuteCopy = async () => {
    if (targetClasses.length === 0) {
      return Swal.fire('Warning', 'Please select at least one class to copy to.', 'warning');
    }

    setCopying(true);
    try {
      const effectiveSchoolId = schoolId || userData?.schoolId || 'default-school';
      const cleanSubjects = subjectRows.map(s => ({
        subjectName: String(s.subjectName || ''),
        included: Boolean(s.included),
        examDate: String(s.examDate || ''),
        startTime: String(s.startTime || '09:00 AM'),
        endTime: String(s.endTime || '12:00 PM'),
        room: String(s.room || 'Main Hall'),
        invigilator: String(s.invigilator || 'Staff Member'),
        maxMarks: Number(s.maxMarks || 0),
        passingMarks: Number(s.passingMarks || 0),
        failable: Boolean(s.failable),
        syllabus: String(s.syllabus || '')
      }));

      for (const targetCls of targetClasses) {
        const existing = masterFiles.find(
          f => (f.className === targetCls || f.classId === targetCls) && f.term === selectedTerm
        );

        const payload = {
          className: String(targetCls || ''),
          classId: String(targetCls || ''),
          term: String(selectedTerm || ''),
          subjects: cleanSubjects,
          schoolId: effectiveSchoolId,
          updatedAt: new Date().toISOString()
        };

        let res;
        if (existing?.id) {
          res = await upsertRecord('examMasterFiles', existing.id, payload);
          if (res && res.success === false) {
            res = await addRecord('examMasterFiles', payload, effectiveSchoolId);
          }
        } else {
          payload.createdAt = new Date().toISOString();
          res = await addRecord('examMasterFiles', payload, effectiveSchoolId);
        }

        if (res && res.success === false) {
          throw new Error(res.error?.message || `Failed copying to class ${targetCls}`);
        }
      }

      Swal.fire({
        title: 'Copied Successfully!',
        text: `Master File copied to ${targetClasses.length} classes for ${selectedTerm}.`,
        icon: 'success',
        background: '#1a1f37',
        color: '#fff',
        confirmButtonColor: '#15803d'
      });

      setIsCopyModalOpen(false);
      const updatedFiles = await getRecords('examMasterFiles', effectiveSchoolId);
      setMasterFiles(updatedFiles || []);
    } catch (err) {
      console.error('Error copying to other classes:', err);
      Swal.fire('Error', err.message || 'Failed to copy to other classes', 'error');
    } finally {
      setCopying(false);
    }
  };

  // Filtered Students for selected class/section
  const filteredStudents = studentsList.filter(s => {
    const matchesClass = !selectedClass || s.class === selectedClass || s.className === selectedClass;
    const matchesSec = selectedSection === 'All' || !s.section || s.section === selectedSection;
    return matchesClass && matchesSec;
  });

  // Check Fee Clearance (Stage 2)
  const handleCheckFeeClearance = async () => {
    setCheckingFees(true);
    const map = {};
    for (const student of filteredStudents) {
      const res = await checkStudentFeeClearance(student.id, schoolId);
      map[student.id] = res;
    }
    setFeeStatusMap(map);
    setCheckingFees(false);
    Swal.fire('Fee Check Complete', `Audited fee accounts for ${filteredStudents.length} students.`, 'info');
  };

  // Load Stage 4 Marks Entry data for chosen subject
  const handleLoadMarksEntry = async (subjName) => {
    setSelectedSubjectForMarks(subjName);
    if (!selectedClass || !selectedTerm || !subjName) return;

    try {
      const resultsData = await getRecords('results', schoolId);
      const existingMap = new Map();
      resultsData.forEach(r => {
        if (r.examId === selectedTerm && (r.class === selectedClass || r.classId === selectedClass) && r.subject === subjName) {
          existingMap.set(r.studentId, r);
        }
      });

      const selectedSubjObj = subjectRows.find(s => s.subjectName === subjName) || { maxMarks: '25.00', passingMarks: '8.25' };

      const rows = filteredStudents.map(student => {
        const exist = existingMap.get(student.id);
        return {
          studentId: student.id,
          studentName: student.name || student.fullName || 'Student',
          rollNo: student.rollNo || student.rollNumber || 'N/A',
          section: student.section || 'A',
          obtainedMarks: exist ? exist.obtainedMarks : '0',
          totalMarks: selectedSubjObj.maxMarks || '25.00',
          passingMarks: selectedSubjObj.passingMarks || '8.25',
          status: exist ? (exist.status || MARK_STATUSES.PRESENT) : MARK_STATUSES.PRESENT,
          remarks: exist ? (exist.remarks || '') : ''
        };
      });

      setStudentMarksState(rows);
    } catch (err) {
      console.error('Error loading marks entry:', err);
    }
  };

  // Save Stage 4 Marks Entry & Update Verification Status
  const handleSaveMarksWithVerification = async (newStatus = 'DRAFT') => {
    if (!selectedSubjectForMarks || studentMarksState.length === 0) return;

    setSaving(true);
    try {
      const selectedSubjObj = subjectRows.find(s => s.subjectName === selectedSubjectForMarks) || {};
      
      await saveMarksBatch({
        examId: selectedTerm,
        classId: selectedClass,
        section: selectedSection,
        subject: selectedSubjectForMarks,
        totalMarks: Number(selectedSubjObj.maxMarks || 25),
        passingMarks: Number(selectedSubjObj.passingMarks || 8.25),
        studentsMarks: studentMarksState,
        schoolId,
        gradingRules,
        locked: newStatus === VERIFICATION_STATUSES.LOCKED,
        enteredBy: userData?.name || 'Admin'
      });

      setVerificationStatus(newStatus);

      Swal.fire({
        title: `Marks Saved (${newStatus})`,
        text: `Marks entry updated to status: ${newStatus}`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#1a1f37',
        color: '#fff'
      });
    } catch (err) {
      console.error('Error saving marks:', err);
      Swal.fire('Error', 'Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Load Stage 4 Bulk Marks Grid
  useEffect(() => {
    if (activeStage === 'stage4' && selectedClass && selectedTerm) {
      loadBulkGridMaster();
    }
  }, [activeStage, selectedClass, selectedTerm, subjectRows]);

  const loadBulkGridMaster = async () => {
    try {
      const resultsData = await getRecords('results', schoolId);
      const initialGrid = {};
      const includedSubjects = subjectRows.filter(s => s.included);

      filteredStudents.forEach(student => {
        const studentResults = resultsData.filter(
          r => r.studentId === student.id && (r.examId === selectedTerm || r.term === selectedTerm)
        );

        const marksObj = {};
        includedSubjects.forEach(sub => {
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
              obt = String(matched.obtainedMarks ?? '0');
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
          excludeFromLive: false
        };
      });

      setBulkGridData(initialGrid);
    } catch (err) {
      console.error('Error loading bulk grid master:', err);
    }
  };

  const handleBulkMarkInputChange = (studentId, subjectName, val) => {
    setBulkGridData(prev => {
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

  const handleBulkQuickStatusClick = (studentId, subjectName, statusType) => {
    setBulkGridData(prev => {
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

  const handleBulkOptionChange = (studentId, field, value) => {
    setBulkGridData(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: value
      }
    }));
  };

  const handleSaveAllBulkMarksMaster = async () => {
    if (!selectedClass || !selectedTerm) {
      return Swal.fire('Warning', 'Please select Class and Term', 'warning');
    }

    setSaving(true);
    try {
      const promises = [];
      const includedSubjects = subjectRows.filter(s => s.included);

      for (const student of filteredStudents) {
        const sState = bulkGridData[student.id] || { marks: {} };
        const studentMarksObj = sState.marks || {};

        for (const sub of includedSubjects) {
          const markData = studentMarksObj[sub.subjectName] || { obtainedMarks: '0', status: 'P' };
          let numericObt = markData.obtainedMarks;
          let finalStatus = MARK_STATUSES.PRESENT;

          if (markData.status === 'A' || markData.obtainedMarks === 'ABS') {
            numericObt = 'ABS';
            finalStatus = MARK_STATUSES.ABSENT;
          } else if (markData.status === 'L') {
            finalStatus = MARK_STATUSES.LEAVE;
          }

          const maxM = Number(sub.maxMarks || 25);
          const passM = Number(sub.passingMarks || 8.25);
          const gradeObj = calculateGrade(numericObt, maxM, gradingRules, finalStatus);
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
            totalMarks: maxM,
            passingMarks: passM,
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
        title: 'Marks Saved!',
        text: `Bulk marks updated for ${filteredStudents.length} students in ${selectedClass} (${selectedTerm}).`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

    } catch (err) {
      console.error('Error saving bulk marks:', err);
      Swal.fire('Error', 'Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Stage 5: Calculate Results & Ranks
  const handleCalculateFullResults = async () => {
    if (!selectedClass || !selectedTerm) {
      return Swal.fire('Warning', 'Please select Class and Term first', 'warning');
    }

    setSaving(true);
    try {
      const allResults = await getRecords('results', schoolId);
      const termClassResults = allResults.filter(
        r => r.examId === selectedTerm && (r.class === selectedClass || r.classId === selectedClass)
      );

      // Group by studentId
      const studentMap = {};
      termClassResults.forEach(r => {
        if (!studentMap[r.studentId]) studentMap[r.studentId] = [];
        studentMap[r.studentId].push(r);
      });

      const rawSummaries = filteredStudents.map(student => {
        const sMarks = studentMap[student.id] || [];
        const summary = computeExamResultSummary(sMarks, 1, gradingRules);
        return {
          studentId: student.id,
          studentName: student.name || student.fullName || 'Student',
          rollNo: student.rollNo || student.rollNumber || 'N/A',
          section: student.section || 'A',
          photo: student.photo || student.avatar || '',
          fatherName: student.fatherName || 'N/A',
          ...summary
        };
      });

      const rankedResults = assignClassRanks(rawSummaries);
      setComputedResults(rankedResults);

      Swal.fire({
        title: 'Results Processed!',
        text: `Calculated marks, grades, percentage & ranks for ${rankedResults.length} students.`,
        icon: 'success',
        background: '#1a1f37',
        color: '#fff'
      });
    } catch (err) {
      console.error('Error processing results:', err);
      Swal.fire('Error', 'Failed to process results', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle Print Action
  const handlePrintWindow = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto font-sans animate-fade-in pb-24 text-gray-800">
      
      {/* 🏷️ Top Header matching UI requirements */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0070f3] tracking-tight">
            Exam Master File
          </h1>
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-0.5">
            Complete Institutional Examination & Result Management Engine
          </p>
        </div>

        {/* 🟩 STAGE NAVIGATION TAB BAR */}
        <div className="flex flex-wrap items-center bg-gray-100 p-1 rounded-2xl border border-gray-200 gap-1 shadow-inner">
          <button
            onClick={() => setActiveStage('stage1')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeStage === 'stage1'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Layers size={14} />
            <span>1. Date Sheet</span>
          </button>

          <button
            onClick={() => setActiveStage('stage3')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeStage === 'stage3'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <UserCheck size={14} />
            <span>2. Attendance</span>
          </button>

          <button
            onClick={() => setActiveStage('stage4')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeStage === 'stage4'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <FileText size={14} />
            <span>3. Marks Entry</span>
          </button>

          <button
            onClick={() => setActiveStage('stage5')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeStage === 'stage5'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <ShieldCheck size={14} />
            <span>4. Results & Ranks</span>
          </button>

          <button
            onClick={() => setActiveStage('stage6')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeStage === 'stage6'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <PieChart size={14} />
            <span>5. Marksheets & Reports</span>
          </button>
        </div>
      </div>

      {/* 📋 GLOBAL SELECTOR CARD (Matching reference screenshot layout) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Select Class */}
          <div>
            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer font-semibold"
            >
              <option value="">Select Class</option>
              {availableClasses.map((cls, idx) => (
                <option key={idx} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Select Term */}
          <div>
            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">
              Select Term / Exam
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer font-semibold"
            >
              <option value="">Select Term</option>
              {createdExams.map((term, idx) => (
                <option key={idx} value={term}>{term}</option>
              ))}
            </select>
          </div>

        </div>

        {/* 🟩 Copy To Other Classes Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={handleOpenCopyModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#15803d] hover:bg-[#166534] active:scale-95 text-white font-bold text-sm rounded-xl shadow-sm transition-all"
          >
            <span>📋</span>
            <span>Copy To Other Classes</span>
          </button>

          {selectedClass && selectedTerm && (
            <div className="text-xs font-bold text-gray-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span>Active Target:</span>
              <span className="text-blue-700 font-extrabold">{selectedClass} ({selectedTerm})</span>
              <span className="text-gray-400">|</span>
              <span>Students: <b>{filteredStudents.length}</b></span>
            </div>
          )}
        </div>
      </div>

      {/* ⚠️ Schedule Conflict Banner if any */}
      {scheduleConflicts.length > 0 && activeStage === 'stage1' && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs md:text-sm font-medium shadow-sm space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-700 text-sm">
            <AlertTriangle size={18} />
            <span>Schedule Conflicts Detected ({scheduleConflicts.length}):</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5">
            {scheduleConflicts.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ========================================================= */}
      {/* STAGE 1: SETUP & DATE SHEET WORKFLOW (Matching reference UI) */}
      {/* ========================================================= */}
      {activeStage === 'stage1' && (
        <>
          {(!selectedClass || !selectedTerm) ? (
            <div className="p-5 bg-[#e0f2fe] border border-[#bae6fd] rounded-2xl text-[#0369a1] text-sm font-semibold shadow-sm flex items-center gap-2">
              <span>Select a class and term to load subjects and date sheet matrix.</span>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              
              {/* Selected Status Badge Bar */}
              <div className="p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl text-gray-800 text-sm font-bold shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs md:text-sm text-gray-800">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span>📱</span>
                    <span>Class: <b>{selectedClass}</b></span>
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1.5 font-bold">
                    <span>🏷️</span>
                    <span>Term: <b>{selectedTerm}</b></span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveMasterFile}
                  disabled={saving}
                  className="px-5 py-2 bg-[#0070f3] hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Save Master File</span>
                </button>
              </div>

              {/* SUBJECTS TABLE MATCHING REFERENCE UI PHOTO */}
              <div className="space-y-2.5 overflow-x-auto">
                <div className="min-w-[900px]">
                  
                  {/* Table Header Row */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider items-center">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-2">Include</div>
                    <div className="col-span-4">Subject Name</div>
                    <div className="col-span-3 text-center">Exam Date</div>
                    <div className="col-span-1 text-center">Max Marks</div>
                    <div className="col-span-1 text-center">Fail Option</div>
                  </div>

                  {/* Subject Rows */}
                  {subjectRows.map((row, index) => {
                    const isInc = Boolean(row.included);

                    return (
                      <div
                        key={index}
                        className={`grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-2xl transition-all duration-200 border shadow-sm mb-2 ${
                          isInc
                            ? 'bg-[#3b82f6] text-white border-[#2563eb] shadow-blue-500/10'
                            : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        
                        {/* # Circle */}
                        <div className="col-span-1 flex justify-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                              isInc
                                ? 'bg-white text-[#3b82f6] shadow-sm'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {index + 1}
                          </div>
                        </div>

                        {/* Include Checkbox */}
                        <div className="col-span-2">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-xs font-bold">
                            <input
                              type="checkbox"
                              checked={isInc}
                              onChange={() => handleToggleInclude(index)}
                              className={`w-4 h-4 rounded cursor-pointer ${
                                isInc
                                  ? 'text-white bg-blue-600 border-white focus:ring-0'
                                  : 'text-blue-600 border-gray-300'
                              }`}
                            />
                            <span>Include</span>
                          </label>
                        </div>

                        {/* Subject Name */}
                        <div className="col-span-4 font-bold text-sm md:text-base truncate">
                          {String(row.subjectName || '')}
                        </div>

                        {/* Exam Date */}
                        <div className="col-span-3">
                          <input
                            type="date"
                            value={row.examDate}
                            onChange={(e) => handleRowChange(index, 'examDate', e.target.value)}
                            className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none ${
                              isInc
                                ? 'bg-white text-gray-900 border-white font-medium shadow-inner'
                                : 'bg-white text-gray-900 border-gray-300'
                            }`}
                          />
                        </div>

                        {/* Max Marks */}
                        <div className="col-span-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.maxMarks}
                            onChange={(e) => handleRowChange(index, 'maxMarks', e.target.value)}
                            className={`w-full px-2 py-1.5 text-xs text-center rounded-lg border font-bold focus:outline-none ${
                              isInc
                                ? 'bg-white text-gray-900 border-white shadow-inner'
                                : 'bg-white text-gray-900 border-gray-300'
                            }`}
                          />
                        </div>

                        {/* Fail Option Checkbox */}
                        <div className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            checked={Boolean(row.failable)}
                            onChange={(e) => handleRowChange(index, 'failable', e.target.checked)}
                            className={`w-4 h-4 rounded cursor-pointer ${
                              isInc
                                ? 'text-blue-600 bg-white border-white focus:ring-0'
                                : 'text-blue-600 border-gray-300'
                            }`}
                          />
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* STAGE 2: ADMIT CARD ENGINE */}
      {/* ========================================================= */}
      {activeStage === 'stage2' && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-gray-900">Student Admit Cards Generator</h3>
                <p className="text-xs text-gray-500 font-medium">Generate individual or bulk examination roll number slips</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCheckFeeClearance}
                  disabled={checkingFees}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  {checkingFees ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  <span>Audit Fee Clearance</span>
                </button>

                <button
                  onClick={handlePrintWindow}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  <span>Print Admit Cards</span>
                </button>
              </div>
            </div>

            {/* Student selector dropdown */}
            <div className="flex items-center gap-4">
              <label className="text-xs font-bold text-gray-700">Filter Student:</label>
              <select
                value={selectedStudentForAdmitCard}
                onChange={(e) => setSelectedStudentForAdmitCard(e.target.value)}
                className="px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
              >
                <option value="ALL">All Students ({filteredStudents.length})</option>
                {filteredStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name || s.fullName} (Roll: {s.rollNo || s.rollNumber || 'N/A'})</option>
                ))}
              </select>
            </div>
          </div>

          {/* ADMIT CARD LAYOUT CARDS */}
          <div ref={printRef} className="space-y-6">
            {filteredStudents
              .filter(s => selectedStudentForAdmitCard === 'ALL' || s.id === selectedStudentForAdmitCard)
              .map((student, idx) => {
                const feeData = feeStatusMap[student.id];

                return (
                  <div key={idx} className="bg-white border-2 border-gray-800 rounded-2xl p-6 shadow-md max-w-3xl mx-auto space-y-4 page-break-after">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-gray-800 pb-3">
                      <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
                          {schoolData?.schoolName || 'TaleemiDunya Institutional Portal'}
                        </h2>
                        <p className="text-xs font-extrabold text-blue-700">
                          EXAMINATION ADMIT CARD / ROLL NO SLIP — {selectedTerm || 'SESSION 2026-2027'}
                        </p>
                      </div>

                      {feeData && !feeData.cleared && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-300 font-black text-[11px] rounded-lg uppercase">
                          ⚠️ Pending Fee Balance
                        </span>
                      )}
                    </div>

                    {/* Student Info Row */}
                    <div className="grid grid-cols-4 gap-4 text-xs font-semibold">
                      <div className="col-span-3 space-y-1">
                        <div><span className="text-gray-500 uppercase">Student Name:</span> <b className="text-gray-900 text-sm">{student.name || student.fullName}</b></div>
                        <div><span className="text-gray-500 uppercase">Father Name:</span> <b className="text-gray-800">{student.fatherName || 'N/A'}</b></div>
                        <div className="flex gap-6">
                          <div><span className="text-gray-500 uppercase">Class:</span> <b className="text-gray-800">{student.class || selectedClass}</b></div>
                          <div><span className="text-gray-500 uppercase">Section:</span> <b className="text-gray-800">{student.section || 'A'}</b></div>
                          <div><span className="text-gray-500 uppercase">Roll No:</span> <b className="text-blue-700 text-sm">{student.rollNo || student.rollNumber || 'N/A'}</b></div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <div className="w-20 h-24 border-2 border-dashed border-gray-400 rounded-xl flex items-center justify-center bg-gray-50 text-[10px] text-gray-400 font-bold overflow-hidden">
                          {student.photo ? (
                            <img src={student.photo} alt="Student" className="w-full h-full object-cover" />
                          ) : (
                            <span>PHOTO</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Subject Exam Schedule Table */}
                    <div className="border border-gray-300 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300 uppercase">
                            <th className="p-2 border-r">Date</th>
                            <th className="p-2 border-r">Subject</th>
                            <th className="p-2 border-r">Time</th>
                            <th className="p-2 border-r">Room</th>
                            <th className="p-2">Invigilator Sign</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectRows.filter(s => s.included).map((sub, i) => (
                            <tr key={i} className="border-b border-gray-200">
                              <td className="p-2 border-r font-bold text-gray-800">{sub.examDate || 'TBD'}</td>
                              <td className="p-2 border-r font-bold text-blue-700">{sub.subjectName}</td>
                              <td className="p-2 border-r">{sub.startTime || '09:00 AM'} - {sub.endTime || '12:00 PM'}</td>
                              <td className="p-2 border-r">{sub.room || 'Main Hall'}</td>
                              <td className="p-2 text-gray-300">_________________</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="flex items-end justify-between pt-6 text-[11px] font-bold text-gray-600">
                      <div>
                        <p>1. Bring this admit card to the examination hall daily.</p>
                        <p>2. Cell phones and electronic gadgets are strictly prohibited.</p>
                      </div>

                      <div className="text-center border-t border-gray-400 pt-1 w-44">
                        <span>Controller of Examinations / Principal</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STAGE 3: EXAM ATTENDANCE */}
      {/* ========================================================= */}
      {activeStage === 'stage3' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-gray-900">Exam Hall Attendance Register</h3>
                <p className="text-xs text-gray-500 font-medium">Record student attendance per subject on examination day</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedSubjectForAttendance}
                  onChange={(e) => setSelectedSubjectForAttendance(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
                >
                  <option value="">Select Subject</option>
                  {subjectRows.filter(s => s.included).map((s, idx) => (
                    <option key={idx} value={s.subjectName}>{s.subjectName}</option>
                  ))}
                </select>

                <button
                  onClick={() => Swal.fire('Saved', 'Exam attendance recorded successfully', 'success')}
                  className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Save Attendance</span>
                </button>
              </div>
            </div>

            {selectedSubjectForAttendance ? (
              <div className="space-y-2 border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-100 p-3 text-xs font-bold text-gray-600 uppercase border-b">
                  <div className="col-span-1">Roll #</div>
                  <div className="col-span-4">Student Name</div>
                  <div className="col-span-3">Section</div>
                  <div className="col-span-4 text-center">Status</div>
                </div>

                {filteredStudents.map((st, idx) => {
                  const currentSt = attendanceRecords[st.id] || MARK_STATUSES.PRESENT;

                  return (
                    <div key={idx} className="grid grid-cols-12 p-3 items-center text-xs border-b hover:bg-gray-50">
                      <div className="col-span-1 font-bold text-gray-800">{st.rollNo || st.rollNumber || (idx + 1)}</div>
                      <div className="col-span-4 font-bold text-blue-700">{st.name || st.fullName}</div>
                      <div className="col-span-3 text-gray-600">{st.section || 'A'}</div>
                      <div className="col-span-4 flex justify-center gap-1.5">
                        {['PRESENT', 'ABSENT', 'LATE', 'MEDICAL'].map((statusKey) => (
                          <button
                            key={statusKey}
                            type="button"
                            onClick={() => setAttendanceRecords(prev => ({ ...prev, [st.id]: statusKey }))}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              currentSt === statusKey
                                ? statusKey === 'PRESENT' ? 'bg-green-600 text-white' : statusKey === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {statusKey}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 font-bold text-center">
                Select an included subject to load student attendance register.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STAGE 4: MARKS ENTRY & VERIFICATION WORKFLOW */}
      {/* ========================================================= */}
      {activeStage === 'stage4' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
            
            {/* Stage 4 Top Header & Mode Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Marks Entry & Verification Hub</h3>
                <p className="text-xs text-gray-500 font-medium">
                  Enter marks in Bulk Matrix mode across all subjects or per Single Subject verification pipeline
                </p>
              </div>

              {/* Mode Switcher Toggle */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-xl border border-gray-200 shadow-inner">
                <button
                  type="button"
                  onClick={() => setMarksMode('BULK')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    marksMode === 'BULK'
                      ? 'bg-green-700 text-white shadow-sm font-black'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <FileSpreadsheet size={15} />
                  <span>📊 Bulk Marks Entry (All Subjects)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMarksMode('SINGLE')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    marksMode === 'SINGLE'
                      ? 'bg-blue-600 text-white shadow-sm font-black'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <BookOpen size={15} />
                  <span>📖 Single Subject Entry & Pipeline</span>
                </button>
              </div>
            </div>

            {/* MODE 1: BULK MARKS ENTRY */}
            {marksMode === 'BULK' && (
              <div className="space-y-4">
                
                {/* Subjects Pills Bar & Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-gray-700 mr-1">Subjects:</span>
                    <button
                      type="button"
                      onClick={() => setActiveSubjectFilter('ALL')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                        activeSubjectFilter === 'ALL'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      All Subjects
                    </button>

                    {subjectRows.filter(s => s.included).map((sub, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveSubjectFilter(sub.subjectName)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                          activeSubjectFilter === sub.subjectName
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {sub.subjectName}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveAllBulkMarksMaster}
                    disabled={saving}
                    className="px-5 py-2 bg-green-700 hover:bg-green-800 text-white font-black text-xs rounded-xl shadow transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Save All Marks</span>
                  </button>
                </div>

                {/* Bulk Matrix Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto max-h-[60vh]">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-green-800 text-white font-bold text-center">
                          <th className="py-2.5 px-2 border-r border-green-700 w-8">#</th>
                          <th className="py-2.5 px-3 border-r border-green-700 whitespace-nowrap">Adm No ▴▼</th>
                          <th className="py-2.5 px-4 border-r border-green-700 whitespace-nowrap min-w-[130px] text-left">Student Name</th>
                          <th className="py-2.5 px-4 border-r border-green-700 whitespace-nowrap min-w-[130px] text-left">Father Name</th>

                          {/* Dynamic Subjects Headers */}
                          {subjectRows
                            .filter(s => s.included && (activeSubjectFilter === 'ALL' || activeSubjectFilter === s.subjectName))
                            .map((sub, sIdx) => (
                              <th key={sIdx} className="py-2.5 px-3 border-r border-green-700 whitespace-nowrap min-w-[115px]">
                                {sub.subjectName} ({Number(sub.maxMarks || 25).toFixed(2)})
                              </th>
                            ))}

                          <th className="py-2.5 px-3 border-r border-green-700 whitespace-nowrap">Total</th>
                          <th className="py-2.5 px-3 border-r border-green-700 whitespace-nowrap">Percent</th>
                          <th className="py-2.5 px-3 border-r border-green-700 whitespace-nowrap">Grade</th>
                          <th className="py-2.5 px-3 border-r border-green-700 whitespace-nowrap min-w-[65px]">Total Days</th>
                          <th className="py-2.5 px-3 border-r border-green-700 whitespace-nowrap">Att %</th>
                          <th className="py-2.5 px-3 border-r border-green-700 whitespace-nowrap">Position ▴▼</th>
                          <th className="py-2.5 px-4 whitespace-nowrap min-w-[140px]">Options</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 text-gray-800">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={10 + subjectRows.filter(s => s.included).length} className="text-center py-12 text-gray-500 font-bold">
                              No student records found for Class {selectedClass}.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((st, idx) => {
                            const sData = bulkGridData[st.id] || { marks: {} };
                            const marks = sData.marks || {};

                            let grandObtained = 0;
                            let grandMax = 0;

                            subjectRows.filter(s => s.included).forEach(sub => {
                              const subM = marks[sub.subjectName] || { obtainedMarks: '0', status: 'P' };
                              const maxM = Number(sub.maxMarks || 25);
                              grandMax += maxM;
                              if (subM.status !== 'A' && subM.obtainedMarks !== 'ABS') {
                                grandObtained += Number(subM.obtainedMarks || 0);
                              }
                            });

                            const pct = grandMax > 0 ? ((grandObtained / grandMax) * 100).toFixed(2) : '0.00';
                            const gradeRes = calculateGrade(grandObtained, grandMax, gradingRules);

                            return (
                              <tr key={st.id} className="hover:bg-green-50/50 transition-colors border-b border-gray-200">
                                <td className="py-2 px-2 text-center font-bold text-gray-500 border-r border-gray-200">
                                  {idx + 1}
                                </td>

                                <td className="py-2 px-3 text-center font-bold font-mono text-gray-700 border-r border-gray-200">
                                  {st.rollNo || st.rollNumber || st.grNo || (100 + idx)}
                                </td>

                                <td className="py-2 px-4 font-bold text-gray-900 border-r border-gray-200 whitespace-nowrap">
                                  {st.name || st.fullName}
                                </td>

                                <td className="py-2 px-4 font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">
                                  {st.fatherName || 'Father Name'}
                                </td>

                                {/* Subject Mark Cell & Quick Status Buttons */}
                                {subjectRows
                                  .filter(s => s.included && (activeSubjectFilter === 'ALL' || activeSubjectFilter === s.subjectName))
                                  .map((sub, sIdx) => {
                                    const subMark = marks[sub.subjectName] || { obtainedMarks: '0', status: 'P' };
                                    const isAbsent = subMark.status === 'A' || subMark.obtainedMarks === 'ABS';

                                    return (
                                      <td key={sIdx} className="py-1.5 px-2 text-center border-r border-gray-200">
                                        <div className="flex flex-col items-center gap-1">
                                          <input
                                            type="text"
                                            value={subMark.obtainedMarks}
                                            onChange={(e) => handleBulkMarkInputChange(st.id, sub.subjectName, e.target.value)}
                                            className={`w-16 px-2 py-1 text-center font-bold text-xs border rounded focus:outline-none focus:border-green-600 ${
                                              isAbsent ? 'bg-red-50 text-red-600 border-red-300 font-extrabold' : 'bg-white text-gray-800 border-gray-300'
                                            }`}
                                          />

                                          {/* Quick Badges: P (Green), A (Red), L (Yellow) */}
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => handleBulkQuickStatusClick(st.id, sub.subjectName, 'P')}
                                              title="Mark Present"
                                              className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${
                                                subMark.status === 'P' && !isAbsent
                                                  ? 'bg-green-600 text-white ring-1 ring-green-700'
                                                  : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                                              }`}
                                            >
                                              P
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => handleBulkQuickStatusClick(st.id, sub.subjectName, 'A')}
                                              title="Mark Absent"
                                              className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${
                                                isAbsent
                                                  ? 'bg-red-600 text-white ring-1 ring-red-700'
                                                  : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-700'
                                              }`}
                                            >
                                              A
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => handleBulkQuickStatusClick(st.id, sub.subjectName, 'L')}
                                              title="Mark Leave"
                                              className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${
                                                subMark.status === 'L'
                                                  ? 'bg-amber-500 text-white ring-1 ring-amber-600'
                                                  : 'bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-700'
                                              }`}
                                            >
                                              L
                                            </button>
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  })}

                                <td className="py-2 px-3 text-center font-black text-gray-900 border-r border-gray-200">
                                  {grandObtained}
                                </td>

                                <td className="py-2 px-3 text-center font-bold text-gray-700 border-r border-gray-200">
                                  {pct}%
                                </td>

                                <td className="py-2 px-3 text-center border-r border-gray-200">
                                  <span className={`px-2 py-0.5 rounded text-xs font-black ${
                                    gradeRes.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {gradeRes.grade}
                                  </span>
                                </td>

                                <td className="py-2 px-2 text-center border-r border-gray-200">
                                  <input
                                    type="number"
                                    min="0"
                                    value={sData.totalDays || 0}
                                    onChange={(e) => handleBulkOptionChange(st.id, 'totalDays', Number(e.target.value))}
                                    className="w-12 px-1 py-0.5 text-center text-xs font-semibold border border-gray-300 rounded"
                                  />
                                </td>

                                <td className="py-2 px-3 text-center font-bold text-gray-600 border-r border-gray-200">
                                  {sData.attPercent || 0}%
                                </td>

                                <td className="py-2 px-3 text-center font-black text-blue-700 border-r border-gray-200">
                                  {idx + 1}
                                </td>

                                <td className="py-2 px-3 text-xs border-r border-gray-200">
                                  <div className="flex flex-col gap-1 text-[11px]">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(sData.excludeFromRank)}
                                        onChange={(e) => handleBulkOptionChange(st.id, 'excludeFromRank', e.target.checked)}
                                        className="rounded text-green-600 focus:ring-0"
                                      />
                                      <span>Exclude from Rank</span>
                                    </label>

                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(sData.excludeFromLive)}
                                        onChange={(e) => handleBulkOptionChange(st.id, 'excludeFromLive', e.target.checked)}
                                        className="rounded text-green-600 focus:ring-0"
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

                  <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-semibold">
                      Showing <b>{filteredStudents.length}</b> students • Target Class: <b>{selectedClass}</b> ({selectedTerm})
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveAllBulkMarksMaster}
                      disabled={saving}
                      className="px-5 py-2 bg-green-700 hover:bg-green-800 text-white font-black text-xs rounded-xl shadow transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>Save All Marks</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* MODE 2: SINGLE SUBJECT ENTRY & PIPELINE */}
            {marksMode === 'SINGLE' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Verification Status: <b className="text-blue-600 uppercase">{verificationStatus}</b></p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={selectedSubjectForMarks}
                      onChange={(e) => handleLoadMarksEntry(e.target.value)}
                      className="px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
                    >
                      <option value="">Select Subject</option>
                      {subjectRows.filter(s => s.included).map((s, idx) => (
                        <option key={idx} value={s.subjectName}>{s.subjectName}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleSaveMarksWithVerification('DRAFT')}
                      disabled={saving || !selectedSubjectForMarks}
                      className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white font-bold text-xs rounded-xl shadow transition-all"
                    >
                      Save Draft
                    </button>

                    <button
                      onClick={() => handleSaveMarksWithVerification('SUBMITTED')}
                      disabled={saving || !selectedSubjectForMarks}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all"
                    >
                      Submit
                    </button>

                    <button
                      onClick={() => handleSaveMarksWithVerification('VERIFIED')}
                      disabled={saving || !selectedSubjectForMarks}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition-all"
                    >
                      Verify
                    </button>

                    <button
                      onClick={() => handleSaveMarksWithVerification('LOCKED')}
                      disabled={saving || !selectedSubjectForMarks}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1"
                    >
                      <Lock size={12} />
                      <span>Lock Marks</span>
                    </button>
                  </div>
                </div>

                {selectedSubjectForMarks ? (
                  <div className="space-y-2 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-12 bg-gray-100 p-3 text-xs font-bold text-gray-600 uppercase border-b">
                      <div className="col-span-1">Roll #</div>
                      <div className="col-span-3">Student Name</div>
                      <div className="col-span-2 text-center">Max Marks</div>
                      <div className="col-span-2 text-center">Obtained Marks</div>
                      <div className="col-span-2 text-center">Status</div>
                      <div className="col-span-2">Remarks</div>
                    </div>

                    {studentMarksState.map((st, idx) => (
                      <div key={idx} className="grid grid-cols-12 p-3 items-center text-xs border-b hover:bg-gray-50">
                        <div className="col-span-1 font-bold text-gray-800">{st.rollNo}</div>
                        <div className="col-span-3 font-bold text-blue-700">{st.studentName}</div>
                        <div className="col-span-2 text-center font-bold text-gray-500">{st.totalMarks}</div>
                        <div className="col-span-2 text-center">
                          <input
                            type="text"
                            disabled={verificationStatus === 'LOCKED'}
                            value={st.obtainedMarks}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStudentMarksState(prev => {
                                const updated = [...prev];
                                updated[idx] = { ...updated[idx], obtainedMarks: val };
                                return updated;
                              });
                            }}
                            className="w-20 px-2 py-1 text-center font-black text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-2 text-center">
                          <select
                            disabled={verificationStatus === 'LOCKED'}
                            value={st.status}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStudentMarksState(prev => {
                                const updated = [...prev];
                                updated[idx] = { ...updated[idx], status: val, obtainedMarks: val === MARK_STATUSES.ABSENT ? 'ABS' : updated[idx].obtainedMarks };
                                return updated;
                              });
                            }}
                            className="px-2 py-1 border border-gray-300 rounded-lg text-xs font-bold"
                          >
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Leave">Leave</option>
                            <option value="Exempt">Exempt</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            disabled={verificationStatus === 'LOCKED'}
                            placeholder="Comment"
                            value={st.remarks}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStudentMarksState(prev => {
                                const updated = [...prev];
                                updated[idx] = { ...updated[idx], remarks: val };
                                return updated;
                              });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 font-bold text-center">
                    Select an included subject to open student marks input sheet.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STAGE 5: RESULT PROCESSING & APPROVAL WORKFLOW */}
      {/* ========================================================= */}
      {activeStage === 'stage5' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-gray-900">Result Processing & Multi-Level Approval</h3>
                <p className="text-xs text-gray-500 font-medium">Pipeline Approval State: <b className="text-purple-700 uppercase">{approvalState}</b></p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCalculateFullResults}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  <span>Compute Total, Grade & Ranks</span>
                </button>

                <button
                  onClick={() => { setApprovalState('TEACHER_SUBMITTED'); Swal.fire('Submitted', 'Results submitted by Class Teacher', 'info'); }}
                  className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow"
                >
                  1. Teacher Submit
                </button>

                <button
                  onClick={() => { setApprovalState('CONTROLLER_VERIFIED'); Swal.fire('Verified', 'Exam Controller verified results', 'info'); }}
                  className="px-3 py-1.5 bg-purple-600 text-white font-bold text-xs rounded-xl shadow"
                >
                  2. Controller Verify
                </button>

                <button
                  onClick={() => { setApprovalState('PRINCIPAL_APPROVED'); Swal.fire('Approved', 'Principal approved final results', 'success'); }}
                  className="px-3 py-1.5 bg-green-700 text-white font-bold text-xs rounded-xl shadow"
                >
                  3. Principal Approve
                </button>

                <button
                  onClick={() => { setApprovalState('PUBLISHED'); Swal.fire('Published!', 'Results published for parents and students.', 'success'); }}
                  className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow"
                >
                  4. Publish Results
                </button>
              </div>
            </div>

            {/* COMPUTED RESULT SUMMARY TABLE */}
            {computedResults.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                <div className="grid grid-cols-12 bg-gray-100 p-3 font-bold text-gray-600 uppercase border-b">
                  <div className="col-span-1 text-center">Rank</div>
                  <div className="col-span-1">Roll #</div>
                  <div className="col-span-3">Student Name</div>
                  <div className="col-span-2 text-center">Total Obtained</div>
                  <div className="col-span-2 text-center">Percentage</div>
                  <div className="col-span-1 text-center">Grade</div>
                  <div className="col-span-2 text-center">Status</div>
                </div>

                {computedResults.map((res, idx) => (
                  <div key={idx} className="grid grid-cols-12 p-3 items-center border-b hover:bg-gray-50">
                    <div className="col-span-1 text-center font-black text-blue-700">#{res.rankPosition || (idx + 1)}</div>
                    <div className="col-span-1 font-bold text-gray-800">{res.rollNo}</div>
                    <div className="col-span-3 font-bold text-gray-900">{res.studentName}</div>
                    <div className="col-span-2 text-center font-bold text-gray-800">{res.totalObtainedMarks} / {res.totalMaxMarks}</div>
                    <div className="col-span-2 text-center font-bold text-blue-600">{res.percentage}%</div>
                    <div className="col-span-1 text-center font-black text-purple-700">{res.grade}</div>
                    <div className="col-span-2 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${res.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {res.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 font-bold text-center">
                Click "Compute Total, Grade & Ranks" to calculate results for class students.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STAGE 6: MARKSHEET & COMPREHENSIVE REPORTS */}
      {/* ========================================================= */}
      {activeStage === 'stage6' && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-gray-900">Student Marksheets & Comprehensive Reports</h3>
                <p className="text-xs text-gray-500 font-medium">Generate official transcript marksheets and distribution summaries</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintWindow}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  <span>Print Marksheet</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-xs font-bold text-gray-700">Select Student:</label>
              <select
                value={selectedStudentForMarksheet}
                onChange={(e) => setSelectedStudentForMarksheet(e.target.value)}
                className="px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
              >
                <option value="ALL">All Class Students ({filteredStudents.length})</option>
                {filteredStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name || s.fullName} (Roll: {s.rollNo || s.rollNumber || 'N/A'})</option>
                ))}
              </select>
            </div>
          </div>

          {/* OFFICIAL MARKSHEET TEMPLATE CARDS */}
          <div className="space-y-6">
            {filteredStudents
              .filter(s => selectedStudentForMarksheet === 'ALL' || s.id === selectedStudentForMarksheet)
              .map((student, idx) => {
                const sMarks = computedResults.find(r => r.studentId === student.id) || {
                  totalMaxMarks: 100,
                  totalObtainedMarks: 0,
                  percentage: 0,
                  grade: 'N/A',
                  status: 'PENDING',
                  rankPosition: 1,
                  subjectBreakdown: subjectRows.filter(s => s.included).map(s => ({
                    subjectName: s.subjectName,
                    maxMarks: s.maxMarks,
                    obtainedMarks: 0,
                    passingMarks: s.passingMarks,
                    grade: 'N/A'
                  }))
                };

                return (
                  <div key={idx} className="bg-white border-2 border-gray-800 rounded-2xl p-6 shadow-lg max-w-4xl mx-auto space-y-5 page-break-after">
                    {/* Header */}
                    <div className="text-center border-b-2 border-gray-800 pb-4 space-y-1">
                      <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                        {schoolData?.schoolName || 'TaleemiDunya Institutional Portal'}
                      </h1>
                      <p className="text-xs font-bold text-gray-600">OFFICIAL STATEMENT OF MARKS / ACADEMIC TRANSCRIPT</p>
                      <span className="inline-block px-4 py-1 bg-blue-100 text-blue-800 font-extrabold text-xs rounded-full uppercase">
                        EXAMINATION TERM: {selectedTerm || 'SESSION 2026-2027'}
                      </span>
                    </div>

                    {/* Student Info */}
                    <div className="grid grid-cols-3 gap-4 text-xs font-semibold bg-gray-50 p-4 border border-gray-200 rounded-xl">
                      <div><span className="text-gray-500 uppercase">Student Name:</span> <b className="text-gray-900 block text-sm">{student.name || student.fullName}</b></div>
                      <div><span className="text-gray-500 uppercase">Father Name:</span> <b className="text-gray-800 block">{student.fatherName || 'N/A'}</b></div>
                      <div><span className="text-gray-500 uppercase">Roll Number:</span> <b className="text-blue-700 block text-sm">{student.rollNo || student.rollNumber || 'N/A'}</b></div>
                      <div><span className="text-gray-500 uppercase">Class & Section:</span> <b className="text-gray-800 block">{student.class || selectedClass} ({student.section || 'A'})</b></div>
                      <div><span className="text-gray-500 uppercase">Class Rank:</span> <b className="text-purple-700 block text-sm">#{sMarks.rankPosition || '1'}</b></div>
                      <div><span className="text-gray-500 uppercase">Final Status:</span> <b className={`block font-black ${sMarks.status === 'PASS' ? 'text-green-700' : 'text-red-700'}`}>{sMarks.status}</b></div>
                    </div>

                    {/* Subject Marks Table */}
                    <div className="border border-gray-300 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300 uppercase">
                            <th className="p-2.5 border-r">Subject Name</th>
                            <th className="p-2.5 border-r text-center">Max Marks</th>
                            <th className="p-2.5 border-r text-center">Pass Marks</th>
                            <th className="p-2.5 border-r text-center">Obtained Marks</th>
                            <th className="p-2.5 text-center">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(sMarks.subjectBreakdown || []).map((sub, i) => (
                            <tr key={i} className="border-b border-gray-200">
                              <td className="p-2.5 border-r font-bold text-gray-900">{sub.subjectName}</td>
                              <td className="p-2.5 border-r text-center">{sub.maxMarks}</td>
                              <td className="p-2.5 border-r text-center">{sub.passingMarks}</td>
                              <td className="p-2.5 border-r text-center font-bold text-blue-700">{sub.obtainedMarks}</td>
                              <td className="p-2.5 text-center font-black text-purple-700">{sub.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 font-black text-gray-900">
                            <td className="p-2.5 border-r uppercase">Grand Total</td>
                            <td className="p-2.5 border-r text-center">{sMarks.totalMaxMarks}</td>
                            <td className="p-2.5 border-r text-center">—</td>
                            <td className="p-2.5 border-r text-center text-blue-700">{sMarks.totalObtainedMarks}</td>
                            <td className="p-2.5 text-center text-purple-700">{sMarks.grade} ({sMarks.percentage}%)</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Signatures */}
                    <div className="flex items-center justify-between pt-8 text-xs font-bold text-gray-600">
                      <div className="text-center border-t border-gray-400 pt-1 w-36">
                        <span>Class Teacher</span>
                      </div>
                      <div className="text-center border-t border-gray-400 pt-1 w-36">
                        <span>Exam Controller</span>
                      </div>
                      <div className="text-center border-t border-gray-400 pt-1 w-36">
                        <span>Principal Signature</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 📋 COPY TO OTHER CLASSES MODAL */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5 text-gray-800">
            
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <span>Copy Subjects To Other Classes</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Source: Class <b>{selectedClass}</b> • Term: <b>{selectedTerm}</b>
                </p>
              </div>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Select Target Classes:
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllTargetClasses}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold"
                >
                  {targetClasses.length === availableClasses.filter(c => c !== selectedClass).length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-2 bg-gray-50 border border-gray-200 rounded-2xl">
                {availableClasses.filter(c => c !== selectedClass).map((cls, idx) => {
                  const isSelected = targetClasses.includes(cls);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleToggleTargetClass(cls)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span>Class {cls}</span>
                      {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteCopy}
                disabled={copying || targetClasses.length === 0}
                className="px-6 py-2 bg-[#15803d] hover:bg-[#166534] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {copying ? <RefreshCw size={14} className="animate-spin" /> : <Copy size={14} />}
                <span>Copy Now ({targetClasses.length} Classes)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ExamMasterFile;
