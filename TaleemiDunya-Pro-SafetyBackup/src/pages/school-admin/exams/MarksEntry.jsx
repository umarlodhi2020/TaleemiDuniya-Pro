import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Save, Search, Filter, Lock, Unlock, 
  CheckCircle, AlertCircle, FileSpreadsheet, Download, RefreshCw, 
  Calendar, Layers, BookOpen, Check, X, ShieldAlert, Award,
  Sparkles, Eye, UserCheck
} from 'lucide-react';
import GlassCard from '../../../components/common/GlassCard';
import { useAuth } from '../../../context/AuthContext';
import { useSchool } from '../../../context/SchoolContext';
import { 
  getExams, calculateGrade, saveMarksBatch, 
  getGradingRules, MARK_STATUSES 
} from '../../../services/examService';
import { getRecords } from '../../../services/db';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

const MarksEntry = () => {
  const { userData } = useAuth();
  const { schoolClasses } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';
  const isTeacher = userData?.role === 'teacher';

  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [existingResults, setExistingResults] = useState([]);
  const [gradingRules, setGradingRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Active View Mode: 'SUBJECT_VIEW' or 'MASTER_VIEW'
  const [viewMode, setViewMode] = useState('SUBJECT_VIEW');

  // Selectors
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedSubjectName, setSelectedSubjectName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Editable Student Marks State
  const [studentMarksList, setStudentMarksList] = useState([]);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, [schoolId]);

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const [examsData, rulesData] = await Promise.all([
        getExams(schoolId),
        getGradingRules(schoolId)
      ]);
      setExams(examsData);
      setGradingRules(rulesData);

      if (examsData.length > 0) {
        setSelectedExamId(examsData[0].id);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to load exams master data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentExam = exams.find(e => e.id === selectedExamId);
  const availableClasses = currentExam?.classes?.length > 0 
    ? currentExam.classes 
    : (schoolClasses?.map(c => c.name) || ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']);

  useEffect(() => {
    if (availableClasses.length > 0 && (!selectedClass || !availableClasses.includes(selectedClass))) {
      setSelectedClass(availableClasses[0]);
    }
  }, [selectedExamId, availableClasses]);

  // Subjects for the current exam + class
  const classSubjects = currentExam?.subjects?.filter(
    s => !s.classId || s.classId === selectedClass || s.className === selectedClass
  ) || [];

  useEffect(() => {
    if (classSubjects.length > 0 && (!selectedSubjectName || !classSubjects.some(s => s.subjectName === selectedSubjectName))) {
      setSelectedSubjectName(classSubjects[0].subjectName || classSubjects[0].name);
    }
  }, [selectedClass, selectedExamId, currentExam]);

  const currentSubject = classSubjects.find(s => (s.subjectName || s.name) === selectedSubjectName) || {
    totalMarks: 100,
    passingMarks: 33,
    theoryMarks: 100,
    practicalMarks: 0
  };

  // Load Students and Existing Marks
  useEffect(() => {
    if (!selectedExamId || !selectedClass) return;
    fetchStudentsAndMarks();
  }, [selectedExamId, selectedClass, selectedSection, selectedSubjectName, schoolId]);

  const fetchStudentsAndMarks = async () => {
    setLoading(true);
    try {
      const [studs, results] = await Promise.all([
        getRecords('students', schoolId, [{ field: 'class', operator: '==', value: selectedClass }]),
        getRecords('results', schoolId, [{ field: 'examId', operator: '==', value: selectedExamId }])
      ]);

      const sortedStuds = (studs || []).sort((a, b) => {
        const rA = Number(a.rollNumber || a.rollNo || 0);
        const rB = Number(b.rollNumber || b.rollNo || 0);
        return rA - rB;
      });

      setStudents(sortedStuds);
      setExistingResults(results || []);

      // Build student marks list for current subject
      let lockedFlag = false;
      const initialMarks = sortedStuds.map(s => {
        const existingMark = (results || []).find(
          r => r.studentId === s.id && (r.subject === selectedSubjectName || r.subjectName === selectedSubjectName)
        );

        if (existingMark?.isLocked) lockedFlag = true;

        let status = existingMark?.status || MARK_STATUSES.PRESENT;
        let obt = existingMark?.obtainedMarks;
        if (obt === 'ABS') {
          status = MARK_STATUSES.ABSENT;
          obt = '';
        } else if (obt === undefined || obt === null) {
          obt = '';
        }

        const gradeObj = calculateGrade(
          status === MARK_STATUSES.ABSENT ? 'ABS' : obt,
          currentSubject.totalMarks || 100,
          gradingRules,
          status
        );

        return {
          studentId: s.id,
          studentName: s.name || s.studentName,
          rollNumber: s.rollNumber || s.rollNo || '',
          section: s.section || 'A',
          totalMarks: currentSubject.totalMarks || 100,
          obtainedMarks: obt,
          status: status,
          percentage: gradeObj.percentage,
          grade: gradeObj.grade,
          gpa: gradeObj.gpa,
          remarks: existingMark?.remarks || gradeObj.remarks,
          isLocked: existingMark?.isLocked || false
        };
      });

      setStudentMarksList(initialMarks);
      setIsLocked(lockedFlag);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update Marks for a specific student
  const handleMarkChange = (idx, value) => {
    if (isLocked) return;
    const max = Number(currentSubject.totalMarks || 100);
    const numericVal = value === '' ? '' : Number(value);

    if (numericVal !== '' && (numericVal < 0 || numericVal > max)) {
      Swal.fire({
        title: 'Invalid Marks',
        text: `Marks cannot exceed total marks (${max}) or be negative.`,
        icon: 'warning',
        timer: 1500,
        showConfirmButton: false,
        background: '#1a1f37',
        color: '#fff'
      });
      return;
    }

    setStudentMarksList(prev => {
      const updated = [...prev];
      const s = updated[idx];
      const gradeObj = calculateGrade(numericVal, max, gradingRules, s.status);

      updated[idx] = {
        ...s,
        obtainedMarks: numericVal,
        percentage: gradeObj.percentage,
        grade: gradeObj.grade,
        gpa: gradeObj.gpa,
        remarks: gradeObj.remarks
      };
      return updated;
    });
  };

  // Change Status (Present, Absent, Leave, Exempt, Withheld)
  const handleStatusChange = (idx, newStatus) => {
    if (isLocked) return;
    setStudentMarksList(prev => {
      const updated = [...prev];
      const s = updated[idx];
      let obt = s.obtainedMarks;
      if (newStatus === MARK_STATUSES.ABSENT) obt = '';

      const gradeObj = calculateGrade(
        newStatus === MARK_STATUSES.ABSENT ? 'ABS' : obt,
        currentSubject.totalMarks || 100,
        gradingRules,
        newStatus
      );

      updated[idx] = {
        ...s,
        status: newStatus,
        obtainedMarks: obt,
        percentage: gradeObj.percentage,
        grade: gradeObj.grade,
        gpa: gradeObj.gpa,
        remarks: gradeObj.remarks
      };
      return updated;
    });
  };

  // Save / Submit Marks
  const handleSaveMarks = async (lockAfterSave = false) => {
    if (!selectedExamId || !selectedSubjectName) {
      return Swal.fire('Error', 'Please select Exam and Subject', 'error');
    }

    // Role check: if teacher, verify authorization
    if (isTeacher && currentSubject?.teacherId && currentSubject.teacherId !== userData?.uid) {
      return Swal.fire('Unauthorized', 'You are only authorized to enter marks for subjects assigned to you.', 'error');
    }

    setSaving(true);
    try {
      await saveMarksBatch({
        examId: selectedExamId,
        classId: selectedClass,
        section: selectedSection,
        subject: selectedSubjectName,
        totalMarks: currentSubject.totalMarks || 100,
        passingMarks: currentSubject.passingMarks || 33,
        theoryMarks: currentSubject.theoryMarks,
        practicalMarks: currentSubject.practicalMarks,
        studentsMarks: studentMarksList,
        schoolId: schoolId,
        gradingRules: gradingRules,
        locked: lockAfterSave || isLocked,
        enteredBy: userData?.name || (isTeacher ? 'Teacher' : 'Admin')
      });

      setIsLocked(lockAfterSave || isLocked);

      Swal.fire({
        title: lockAfterSave ? 'Marks Locked & Submitted!' : 'Marks Saved!',
        text: `Results for ${selectedSubjectName} (${selectedClass}) updated successfully.`,
        icon: 'success',
        background: '#1a1f37',
        color: '#fff',
        confirmButtonColor: '#3b82f6'
      });

      fetchStudentsAndMarks();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Quick fill all with specific status or marks
  const handleQuickFillStatus = (statusToFill) => {
    if (isLocked) return;
    setStudentMarksList(prev => prev.map(s => {
      const gradeObj = calculateGrade(
        statusToFill === MARK_STATUSES.ABSENT ? 'ABS' : s.obtainedMarks,
        currentSubject.totalMarks || 100,
        gradingRules,
        statusToFill
      );
      return {
        ...s,
        status: statusToFill,
        percentage: gradeObj.percentage,
        grade: gradeObj.grade,
        gpa: gradeObj.gpa,
        remarks: gradeObj.remarks
      };
    }));
  };

  // Export Master View to Excel
  const handleExportMasterExcel = () => {
    if (students.length === 0) return;

    const dataRows = students.map(student => {
      const row = {
        'Roll No': student.rollNumber || student.rollNo || '',
        'Student Name': student.name || student.studentName || '',
        'Father Name': student.fatherName || '',
        'Class': student.class,
        'Section': student.section || 'A'
      };

      let grandTotal = 0;
      let grandObtained = 0;

      classSubjects.forEach(subj => {
        const subName = subj.subjectName || subj.name;
        const res = existingResults.find(r => r.studentId === student.id && r.subject === subName);
        const obt = res?.obtainedMarks === 'ABS' ? 'ABS' : (res?.obtainedMarks ?? '—');
        row[`${subName} (${subj.totalMarks})`] = obt;

        if (res && res.obtainedMarks !== 'ABS' && typeof res.obtainedMarks === 'number') {
          grandObtained += res.obtainedMarks;
          grandTotal += Number(subj.totalMarks || 100);
        }
      });

      row['Total Obtained'] = grandObtained;
      row['Grand Total'] = grandTotal;
      row['Overall %'] = grandTotal > 0 ? ((grandObtained / grandTotal) * 100).toFixed(1) + '%' : '0%';
      row['Overall Grade'] = calculateGrade(grandObtained, grandTotal, gradingRules).grade;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Master_Class_${selectedClass}`);
    XLSX.writeFile(workbook, `Master_Marks_${selectedClass}_${currentExam?.examName || 'Exam'}.xlsx`);

    Swal.fire({
      title: 'Exported!',
      text: 'Master marks file exported as Excel workbook.',
      icon: 'success',
      background: '#1a1f37',
      color: '#fff'
    });
  };

  // Filtered student list for table
  const filteredList = studentMarksList.filter(s => {
    const matchesSearch = (s.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.rollNumber || '').toString().includes(searchTerm);
    const matchesSection = selectedSection === 'All' || s.section === selectedSection;
    return matchesSearch && matchesSection;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-dark-card/90 via-dark-card/60 to-primary-950/40 p-6 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-primary-500/10 rounded-xl text-primary-400 border border-primary-500/20">
              <ClipboardCheck size={26} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white via-dark-text to-primary-300 bg-clip-text text-transparent">
                Marks Entry & Master File
              </h1>
              <p className="text-xs md:text-sm text-dark-muted font-medium">
                Input student scores, auto-calculate grades & percentages, or inspect the comprehensive cross-subject master sheet.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 bg-dark-bg/80 border border-white/10 rounded-2xl">
            <button
              onClick={() => setViewMode('SUBJECT_VIEW')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'SUBJECT_VIEW'
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'text-dark-muted hover:text-white'
              }`}
            >
              Subject Entry
            </button>
            <button
              onClick={() => setViewMode('MASTER_VIEW')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'MASTER_VIEW'
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'text-dark-muted hover:text-white'
              }`}
            >
              <FileSpreadsheet size={14} />
              <span>Master View</span>
            </button>
          </div>

          {viewMode === 'MASTER_VIEW' ? (
            <button
              onClick={handleExportMasterExcel}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Download size={15} />
              <span>Export Excel</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveMarks(false)}
                disabled={saving || isLocked}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-dark-bg/90 hover:bg-white/5 border border-white/10 text-white font-bold text-xs transition-all disabled:opacity-50"
              >
                <Save size={15} />
                <span>Save Draft</span>
              </button>

              <button
                onClick={() => handleSaveMarks(true)}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-primary-600/30 transition-all disabled:opacity-50"
              >
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <Lock size={15} />}
                <span>{isLocked ? 'Update Marks' : 'Submit & Lock'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selectors Bar */}
      <GlassCard className="p-5 border-white/5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Exam */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar size={13} className="text-primary-400" />
              <span>1. Exam</span>
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary-500 transition-colors"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.examName}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers size={13} className="text-primary-400" />
              <span>2. Class</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary-500 transition-colors"
            >
              {availableClasses.map((cls, idx) => (
                <option key={idx} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Filter size={13} className="text-primary-400" />
              <span>3. Section</span>
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary-500 transition-colors"
            >
              <option value="All">All Sections</option>
              {['A', 'B', 'C', 'D', 'Boys', 'Girls'].map((sec, idx) => (
                <option key={idx} value={sec}>Section {sec}</option>
              ))}
            </select>
          </div>

          {/* Subject (Only in Subject Entry Mode) */}
          {viewMode === 'SUBJECT_VIEW' && (
            <div>
              <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen size={13} className="text-primary-400" />
                <span>4. Subject</span>
              </label>
              <select
                value={selectedSubjectName}
                onChange={(e) => setSelectedSubjectName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary-500 transition-colors"
              >
                {classSubjects.length > 0 ? (
                  classSubjects.map((s, idx) => (
                    <option key={idx} value={s.subjectName || s.name}>
                      {s.subjectName || s.name} (Max: {s.totalMarks})
                    </option>
                  ))
                ) : (
                  <option value="">No subjects scheduled</option>
                )}
              </select>
            </div>
          )}

        </div>
      </GlassCard>

      {/* VIEW 1: SUBJECT ENTRY TABLE */}
      {viewMode === 'SUBJECT_VIEW' && (
        <GlassCard className="p-0 overflow-hidden border-white/5 shadow-2xl">
          
          {/* Quick Toolbar */}
          <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="text-xs text-dark-muted">
                Subject: <span className="font-bold text-white">{selectedSubjectName}</span> • Total Marks: <span className="font-bold text-emerald-400">{currentSubject.totalMarks || 100}</span> • Pass Marks: <span className="font-bold text-amber-300">{currentSubject.passingMarks || 33}</span>
              </div>
              {isLocked && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-bold border border-amber-500/20 flex items-center gap-1">
                  <Lock size={12} /> Locked
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-muted hidden md:inline">Quick Status:</span>
              <button
                type="button"
                onClick={() => handleQuickFillStatus(MARK_STATUSES.PRESENT)}
                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 transition-all"
              >
                All Present
              </button>

              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-muted" size={13} />
                <input
                  type="text"
                  placeholder="Filter student..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 bg-dark-bg/60 border border-white/10 rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5 text-dark-muted text-xs uppercase tracking-wider font-semibold">
                  <th className="py-4 px-3 text-center w-12">#</th>
                  <th className="py-4 px-3">Roll No</th>
                  <th className="py-4 px-4">Student Name</th>
                  <th className="py-4 px-3">Total Marks</th>
                  <th className="py-4 px-4">Obtained Marks</th>
                  <th className="py-4 px-3">Attendance / Status</th>
                  <th className="py-4 px-3">Percentage</th>
                  <th className="py-4 px-3">Grade</th>
                  <th className="py-4 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-dark-text">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-16 text-dark-muted">
                      <RefreshCw className="animate-spin inline-block mr-2 text-primary-400" size={20} />
                      Loading students and marks...
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-16 text-dark-muted text-xs">
                      No students found for Class {selectedClass}.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((row, idx) => {
                    const actualIdx = studentMarksList.findIndex(s => s.studentId === row.studentId);
                    const isAbsent = row.status === MARK_STATUSES.ABSENT;
                    const isFail = row.grade === 'F';

                    return (
                      <tr 
                        key={row.studentId || idx}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-4 px-3 text-center text-xs text-dark-muted font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-4 px-3 font-mono font-bold text-xs text-primary-300">
                          {row.rollNumber || '—'}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-white text-xs">{row.studentName}</div>
                          <div className="text-[10px] text-dark-muted">Sec: {row.section}</div>
                        </td>
                        <td className="py-4 px-3 font-bold text-xs text-dark-muted">
                          {row.totalMarks}
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            min="0"
                            max={row.totalMarks}
                            disabled={isLocked || isAbsent}
                            placeholder={isAbsent ? 'ABS' : '0'}
                            value={isAbsent ? '' : row.obtainedMarks}
                            onChange={(e) => handleMarkChange(actualIdx, e.target.value)}
                            className={`w-24 px-3 py-1.5 bg-dark-bg/80 border rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary-500 transition-colors ${
                              isAbsent ? 'opacity-40 border-white/5' : 'border-white/10'
                            }`}
                          />
                        </td>
                        <td className="py-4 px-3">
                          <select
                            disabled={isLocked}
                            value={row.status}
                            onChange={(e) => handleStatusChange(actualIdx, e.target.value)}
                            className="bg-dark-bg/80 border border-white/10 text-white text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-primary-500"
                          >
                            <option value={MARK_STATUSES.PRESENT}>Present</option>
                            <option value={MARK_STATUSES.ABSENT}>Absent</option>
                            <option value={MARK_STATUSES.LEAVE}>Leave</option>
                            <option value={MARK_STATUSES.EXEMPT}>Exempt</option>
                            <option value={MARK_STATUSES.WITHHELD}>Withheld</option>
                          </select>
                        </td>
                        <td className="py-4 px-3 font-mono font-bold text-xs text-white/90">
                          {row.percentage}%
                        </td>
                        <td className="py-4 px-3">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                            isFail
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {row.grade}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-dark-muted">
                          {row.remarks || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* VIEW 2: MASTER VIEW MATRIX (MERGED MASTER FILE) */}
      {viewMode === 'MASTER_VIEW' && (
        <GlassCard className="p-0 overflow-hidden border-white/5 shadow-2xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <div>
              <h3 className="font-bold text-white text-base">
                Master Marks Sheet • Class {selectedClass}
              </h3>
              <p className="text-xs text-dark-muted mt-0.5">
                Consolidated cross-subject scores and overall rankings.
              </p>
            </div>
            <button
              onClick={handleExportMasterExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
            >
              <Download size={14} />
              <span>Export Sheet</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5 text-dark-muted uppercase font-semibold">
                  <th className="py-3 px-3">Roll No</th>
                  <th className="py-3 px-4">Student Name</th>
                  {classSubjects.map((sub, i) => (
                    <th key={i} className="py-3 px-3 text-center border-l border-white/5">
                      {sub.subjectName || sub.name}
                      <span className="block text-[10px] text-dark-muted font-normal">({sub.totalMarks})</span>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center border-l border-white/5">Grand Total</th>
                  <th className="py-3 px-3 text-center">Obtained</th>
                  <th className="py-3 px-3 text-center">%</th>
                  <th className="py-3 px-3 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-dark-text">
                {students.map((student, idx) => {
                  let totalMax = 0;
                  let totalObt = 0;

                  return (
                    <tr key={student.id || idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-primary-300">
                        {student.rollNumber || student.rollNo || '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {student.name || student.studentName}
                      </td>

                      {classSubjects.map((sub, sIdx) => {
                        const subName = sub.subjectName || sub.name;
                        const res = existingResults.find(r => r.studentId === student.id && r.subject === subName);
                        totalMax += Number(sub.totalMarks || 100);

                        if (res && res.obtainedMarks !== 'ABS' && typeof res.obtainedMarks === 'number') {
                          totalObt += res.obtainedMarks;
                        }

                        return (
                          <td key={sIdx} className="py-3 px-3 text-center font-mono border-l border-white/5">
                            {res ? (
                              res.obtainedMarks === 'ABS' ? (
                                <span className="text-red-400 font-bold">ABS</span>
                              ) : (
                                <span className="font-semibold text-white/90">{res.obtainedMarks}</span>
                              )
                            ) : (
                              <span className="text-dark-muted italic">—</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-3 px-3 text-center font-bold text-dark-muted border-l border-white/5">
                        {totalMax}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-400">
                        {totalObt}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-white">
                        {totalMax > 0 ? ((totalObt / totalMax) * 100).toFixed(1) : 0}%
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        <span className="px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20 font-black">
                          {calculateGrade(totalObt, totalMax, gradingRules).grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

    </div>
  );
};

export default MarksEntry;
