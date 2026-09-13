import React, { useState, useEffect } from 'react';
import { 
  PieChart, BarChart2, TrendingUp, Users, Award, BookOpen, 
  Download, Printer, Search, Filter, CheckCircle2, XCircle, 
  AlertTriangle, Globe, Calendar, Layers, FileText, ArrowRight,
  ShieldCheck, RefreshCw, X, Share2, Sparkles, Check, ChevronRight
} from 'lucide-react';
import GlassCard from '../../../components/common/GlassCard';
import { useAuth } from '../../../context/AuthContext';
import { useSchool } from '../../../context/SchoolContext';
import { 
  getExams, getGradingRules, calculateGrade, 
  auditExamForPublishing, publishExamResults, 
  EXAM_STATUSES, MARK_STATUSES 
} from '../../../services/examService';
import { getRecords } from '../../../services/db';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

const ExamReportSummary = () => {
  const { userData } = useAuth();
  const { schoolClasses } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  const [exams, setExams] = useState([]);
  const [gradingRules, setGradingRules] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Active Tab: 'ANALYTICS' or 'MARKSHEETS'
  const [activeTab, setActiveTab] = useState('ANALYTICS');

  // Selectors
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Publishing Audit Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [publishing, setPublishing] = useState(false);

  // Marksheet Modal / Preview State
  const [previewStudentResult, setPreviewStudentResult] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [schoolId]);

  const loadInitialData = async () => {
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

  // Load students & results for active exam + class
  useEffect(() => {
    if (!selectedExamId || !selectedClass) return;
    fetchReportData();
  }, [selectedExamId, selectedClass, schoolId]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [studs, res] = await Promise.all([
        getRecords('students', schoolId, [{ field: 'class', operator: '==', value: selectedClass }]),
        getRecords('results', schoolId, [{ field: 'examId', operator: '==', value: selectedExamId }])
      ]);
      setStudents(studs || []);
      setResults(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Subjects for the class
  const classSubjects = currentExam?.subjects?.filter(
    s => !s.classId || s.classId === selectedClass || s.className === selectedClass
  ) || [];

  // Filter students based on section and search
  const filteredStudents = students.filter(s => {
    const matchesSection = selectedSection === 'All' || s.section === selectedSection;
    const matchesSearch = (s.name || s.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.rollNumber || s.rollNo || '').toString().includes(searchTerm);
    return matchesSection && matchesSearch;
  });

  // Calculate Student-level consolidated results
  const studentResultsSummary = filteredStudents.map(student => {
    const studentRes = results.filter(r => r.studentId === student.id);
    let totalMax = 0;
    let totalObt = 0;
    let hasFail = false;
    let isAllAbsent = studentRes.length > 0 && studentRes.every(r => r.status === MARK_STATUSES.ABSENT || r.obtainedMarks === 'ABS');
    let subjectBreakdown = [];

    classSubjects.forEach(subj => {
      const subName = subj.subjectName || subj.name;
      const r = studentRes.find(item => item.subject === subName);
      const max = Number(subj.totalMarks || 100);
      const pass = Number(subj.passingMarks || 33);
      
      let obtMarks = 0;
      let status = MARK_STATUSES.PRESENT;
      let isAbsent = false;

      if (r) {
        status = r.status || MARK_STATUSES.PRESENT;
        if (r.obtainedMarks === 'ABS' || status === MARK_STATUSES.ABSENT) {
          isAbsent = true;
          obtMarks = 0;
        } else {
          obtMarks = Number(r.obtainedMarks || 0);
        }
      }

      totalMax += max;
      if (!isAbsent) totalObt += obtMarks;
      if (obtMarks < pass || isAbsent) hasFail = true;

      subjectBreakdown.push({
        subject: subName,
        total: max,
        passing: pass,
        obtained: isAbsent ? 'ABS' : obtMarks,
        theory: subj.theoryMarks,
        practical: subj.practicalMarks,
        status: status,
        grade: calculateGrade(isAbsent ? 'ABS' : obtMarks, max, gradingRules).grade
      });
    });

    const percentage = totalMax > 0 ? Math.round(((totalObt / totalMax) * 100) * 100) / 100 : 0;
    const gradeObj = calculateGrade(totalObt, totalMax, gradingRules);
    const passed = !hasFail && percentage >= 33 && !isAllAbsent;

    return {
      studentId: student.id,
      studentName: student.name || student.studentName,
      fatherName: student.fatherName || '—',
      rollNumber: student.rollNumber || student.rollNo || '—',
      class: student.class,
      section: student.section || 'A',
      photoUrl: student.photoUrl || student.photo,
      totalMax,
      totalObt,
      percentage,
      grade: gradeObj.grade,
      gpa: gradeObj.gpa,
      remarks: gradeObj.remarks,
      passed,
      isAbsent: isAllAbsent,
      hasRecords: studentRes.length > 0,
      subjectBreakdown
    };
  }).sort((a, b) => b.totalObt - a.totalObt); // Ranked by marks

  // Compute Overall Aggregate Statistics
  const totalStudentsCount = filteredStudents.length;
  const appearedCount = studentResultsSummary.filter(s => s.hasRecords && !s.isAbsent).length;
  const absentCount = studentResultsSummary.filter(s => s.isAbsent).length;
  const passedCount = studentResultsSummary.filter(s => s.hasRecords && s.passed).length;
  const failedCount = appearedCount - passedCount;
  const passPercentage = appearedCount > 0 ? Math.round((passedCount / appearedCount) * 100) : 0;

  const validObtained = studentResultsSummary.filter(s => s.hasRecords && !s.isAbsent).map(s => s.totalObt);
  const highestMarks = validObtained.length > 0 ? Math.max(...validObtained) : 0;
  const lowestMarks = validObtained.length > 0 ? Math.min(...validObtained) : 0;
  const averageMarks = validObtained.length > 0 ? Math.round(validObtained.reduce((a, b) => a + b, 0) / validObtained.length) : 0;

  // Grade Distribution Counts
  const gradeDistribution = {
    'A+': studentResultsSummary.filter(s => s.grade === 'A+').length,
    'A':  studentResultsSummary.filter(s => s.grade === 'A').length,
    'B':  studentResultsSummary.filter(s => s.grade === 'B').length,
    'C':  studentResultsSummary.filter(s => s.grade === 'C').length,
    'D':  studentResultsSummary.filter(s => s.grade === 'D').length,
    'E':  studentResultsSummary.filter(s => s.grade === 'E').length,
    'F':  studentResultsSummary.filter(s => s.grade === 'F').length
  };

  // Subject-wise Breakdown Statistics
  const subjectSummaries = classSubjects.map(subj => {
    const subName = subj.subjectName || subj.name;
    const subResults = results.filter(r => r.subject === subName);
    const subAppeared = subResults.filter(r => r.obtainedMarks !== 'ABS' && typeof r.obtainedMarks === 'number');
    const marksArr = subAppeared.map(r => r.obtainedMarks);

    const subTotal = marksArr.length > 0 ? marksArr.reduce((a, b) => a + b, 0) : 0;
    const subAvg = marksArr.length > 0 ? Math.round(subTotal / marksArr.length) : 0;
    const subHigh = marksArr.length > 0 ? Math.max(...marksArr) : 0;
    const subLow = marksArr.length > 0 ? Math.min(...marksArr) : 0;

    const passMarks = Number(subj.passingMarks || 33);
    const passedInSub = subAppeared.filter(r => r.obtainedMarks >= passMarks).length;
    const subPassPerc = subAppeared.length > 0 ? Math.round((passedInSub / subAppeared.length) * 100) : 0;

    return {
      subject: subName,
      code: subj.subjectCode || '—',
      totalMarks: subj.totalMarks || 100,
      studentsCount: subResults.length,
      average: subAvg,
      highest: subHigh,
      lowest: subLow,
      passPercentage: subPassPerc,
      failPercentage: 100 - subPassPerc
    };
  });

  // Handle Publish Results Audit Modal
  const handleOpenPublishAudit = async () => {
    if (!selectedExamId) return;
    setLoading(true);
    try {
      const audit = await auditExamForPublishing(selectedExamId, schoolId, selectedClass);
      setAuditData(audit);
      setIsPublishModalOpen(true);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to audit exam marks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPublish = async () => {
    setPublishing(true);
    try {
      await publishExamResults(selectedExamId, schoolId);
      setIsPublishModalOpen(false);
      
      // Update local exam status
      setExams(prev => prev.map(e => e.id === selectedExamId ? { ...e, status: EXAM_STATUSES.RESULTS_PUBLISHED } : e));

      Swal.fire({
        title: 'Results Published!',
        text: `Results for "${currentExam?.examName}" have been officially published! Students & Parents can now view results.`,
        icon: 'success',
        background: '#1a1f37',
        color: '#fff',
        confirmButtonColor: '#3b82f6'
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to publish results', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Generate Official Summary Report PDF
  const generateSummaryReportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Banner
      doc.setFillColor(30, 58, 138); // Deep Blue
      doc.rect(0, 0, pageWidth, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text((userData?.schoolName || 'TaleemiDunya School').toUpperCase(), pageWidth / 2, 11, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`OFFICIAL EXAMINATION SUMMARY REPORT • ${currentExam?.academicYear || '2026-2027'}`, pageWidth / 2, 17, { align: 'center' });
      doc.text(`Exam: ${currentExam?.examName || 'Examination'} | Class: ${selectedClass}`, pageWidth / 2, 23, { align: 'center' });

      // Stat Highlights Grid
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');

      const startY = 35;
      autoTable(doc, {
        startY: startY,
        margin: { left: 14, right: 14 },
        head: [['Total Enrolled', 'Appeared', 'Absent', 'Passed', 'Failed', 'Pass Ratio', 'Class Average', 'Highest Score']],
        body: [[
          totalStudentsCount.toString(),
          appearedCount.toString(),
          absentCount.toString(),
          passedCount.toString(),
          failedCount.toString(),
          `${passPercentage}%`,
          averageMarks.toString(),
          highestMarks.toString()
        ]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] }
      });

      // Subject-wise Breakdown Table
      doc.text("Subject-wise Performance Analysis", 14, doc.lastAutoTable.finalY + 8);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 11,
        margin: { left: 14, right: 14 },
        head: [['Subject', 'Max Marks', 'Appeared', 'Average', 'Highest', 'Lowest', 'Pass %']],
        body: subjectSummaries.map(s => [
          s.subject,
          s.totalMarks,
          s.studentsCount,
          s.average,
          s.highest,
          s.lowest,
          `${s.passPercentage}%`
        ]),
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] }
      });

      // Student Rank Summary
      doc.text("Top Student Position & Result Ledger", 14, doc.lastAutoTable.finalY + 8);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 11,
        margin: { left: 14, right: 14 },
        head: [['Rank', 'Roll No', 'Student Name', 'Total Marks', 'Obtained', 'Percentage', 'Grade', 'Result']],
        body: studentResultsSummary.map((s, i) => [
          (i + 1).toString(),
          s.rollNumber,
          s.studentName,
          s.totalMax,
          s.totalObt,
          `${s.percentage}%`,
          s.grade,
          s.passed ? 'PASSED' : 'FAILED'
        ]),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] }
      });

      doc.save(`Exam_Summary_${selectedClass}_${(currentExam?.examName || 'Exam').replace(/\s+/g, '_')}.pdf`);
      Swal.fire('Exported!', 'Official Summary Report downloaded as PDF.', 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Failed to generate PDF', 'error');
    }
  };

  // Generate Official Marksheet / Report Card PDF (Single or Bulk)
  const generateMarksheetsPDF = (targetStudentResults = null) => {
    const list = targetStudentResults || studentResultsSummary;
    if (list.length === 0) return Swal.fire('Error', 'No student results to generate', 'warning');

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      for (let i = 0; i < list.length; i++) {
        const student = list[i];
        if (i > 0) doc.addPage();

        // Outer Decorative Frame
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(1);
        doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

        doc.setLineWidth(0.3);
        doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

        // Header Background Banner
        doc.setFillColor(30, 58, 138);
        doc.rect(10, 10, pageWidth - 20, 26, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text((userData?.schoolName || 'TaleemiDunya Model School').toUpperCase(), pageWidth / 2, 19, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text("OFFICIAL ACADEMIC MARKSHEET & TRANSCRIPT", pageWidth / 2, 25, { align: 'center' });
        doc.text(`${currentExam?.examName || 'Annual Exam'} • Session ${currentExam?.academicYear || '2026-2027'}`, pageWidth / 2, 31, { align: 'center' });

        // Student Info Box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 40, pageWidth - 28, 22, 2, 2, 'F');

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');

        doc.text(`Student Name: ${(student.studentName || '').toUpperCase()}`, 18, 47);
        doc.text(`Father Name: ${(student.fatherName || '—').toUpperCase()}`, 18, 54);

        doc.text(`Roll Number: ${student.rollNumber}`, 115, 47);
        doc.text(`Class & Section: ${student.class} - ${student.section}`, 115, 54);

        doc.text(`Class Rank: Position #${i + 1} in Class`, 18, 60);
        doc.text(`Result Status: ${student.passed ? 'PASSED & PROMOTED' : 'FAILED'}`, 115, 60);

        // Subject Breakdown Table
        const tableData = student.subjectBreakdown.map((s, idx) => [
          (idx + 1).toString(),
          s.subject,
          s.total.toString(),
          s.passing.toString(),
          s.obtained.toString(),
          s.grade,
          s.obtained !== 'ABS' && Number(s.obtained) >= s.passing ? 'Pass' : 'Fail'
        ]);

        autoTable(doc, {
          startY: 66,
          margin: { left: 14, right: 14 },
          head: [['#', 'Subject Name', 'Max Marks', 'Pass Marks', 'Obtained Marks', 'Grade', 'Status']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2.2, halign: 'center' },
          columnStyles: { 1: { halign: 'left' } },
          headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' }
        });

        // Summary Totals Box
        const summaryY = doc.lastAutoTable.finalY + 6;
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, summaryY, pageWidth - 28, 24, 2, 2, 'F');

        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(`Grand Total: ${student.totalMax}`, 20, summaryY + 7);
        doc.text(`Marks Obtained: ${student.totalObt}`, 75, summaryY + 7);
        doc.text(`Percentage: ${student.percentage}%`, 135, summaryY + 7);

        doc.text(`Overall Grade: ${student.grade}`, 20, summaryY + 16);
        doc.text(`GPA: ${student.gpa}`, 75, summaryY + 16);
        doc.text(`Teacher Remarks: ${student.remarks || 'Keep up the good work'}`, 135, summaryY + 16);

        // Grading Scale Legend Table
        const legendY = summaryY + 30;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text("Grading Scale Reference:", 14, legendY);

        autoTable(doc, {
          startY: legendY + 2,
          margin: { left: 14, right: 14 },
          head: [['Grade', 'A+', 'A', 'B', 'C', 'D', 'E', 'F']],
          body: [
            ['Percentage', '90-100%', '80-89%', '70-79%', '60-69%', '50-59%', '33-49%', '0-32%'],
            ['Evaluation', 'Outstanding', 'Excellent', 'Very Good', 'Good', 'Satisfactory', 'Pass', 'Fail']
          ],
          theme: 'plain',
          styles: { fontSize: 6.5, cellPadding: 1, halign: 'center' },
          headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42] }
        });

        // Signatures Block
        const sigY = pageHeight - 32;
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.4);

        doc.line(20, sigY, 60, sigY);
        doc.text("Class Teacher", 40, sigY + 4, { align: 'center' });

        doc.line(85, sigY, 125, sigY);
        doc.text("Exam Controller", 105, sigY + 4, { align: 'center' });

        doc.line(150, sigY, 190, sigY);
        doc.text("Principal / Headmaster", 170, sigY + 4, { align: 'center' });
      }

      doc.save(`Marksheets_${selectedClass}_${(currentExam?.examName || 'Exam').replace(/\s+/g, '_')}.pdf`);
      Swal.fire('Generated!', `Generated marksheets for ${list.length} student(s).`, 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Failed to generate marksheets PDF', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-dark-card/90 via-dark-card/60 to-primary-950/40 p-6 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-primary-500/10 rounded-xl text-primary-400 border border-primary-500/20">
              <PieChart size={26} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white via-dark-text to-primary-300 bg-clip-text text-transparent">
                Report Summary & Marksheets
              </h1>
              <p className="text-xs md:text-sm text-dark-muted font-medium">
                Comprehensive analytics, grade distribution, report cards, and official result publishing.
              </p>
            </div>
          </div>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 bg-dark-bg/80 border border-white/10 rounded-2xl">
            <button
              onClick={() => setActiveTab('ANALYTICS')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ANALYTICS'
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'text-dark-muted hover:text-white'
              }`}
            >
              Summary Analytics
            </button>
            <button
              onClick={() => setActiveTab('MARKSHEETS')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'MARKSHEETS'
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'text-dark-muted hover:text-white'
              }`}
            >
              <FileText size={14} />
              <span>Results & Marksheets</span>
            </button>
          </div>

          {/* Publish Results Button */}
          {currentExam?.status !== EXAM_STATUSES.RESULTS_PUBLISHED ? (
            <button
              onClick={handleOpenPublishAudit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Globe size={15} />
              <span>Publish Results</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-purple-400" />
              <span>Results Published</span>
            </span>
          )}

          {activeTab === 'ANALYTICS' ? (
            <button
              onClick={generateSummaryReportPDF}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs transition-all"
            >
              <Download size={15} />
              <span>Export Report</span>
            </button>
          ) : (
            <button
              onClick={() => generateMarksheetsPDF()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-lg shadow-primary-600/30 transition-all"
            >
              <Download size={15} />
              <span>Bulk Marksheets PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Selectors Bar */}
      <GlassCard className="p-5 border-white/5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
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
                  {ex.examName} ({ex.academicYear})
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

        </div>
      </GlassCard>

      {/* TAB 1: SUMMARY ANALYTICS */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          
          {/* Top 8 Metric Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Total Students', value: totalStudentsCount, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Appeared', value: appearedCount, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
              { label: 'Absent', value: absentCount, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Passed', value: passedCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Failed', value: failedCount, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'Pass Ratio', value: `${passPercentage}%`, color: 'text-teal-400', bg: 'bg-teal-500/10' },
              { label: 'Class Average', value: averageMarks, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
              { label: 'Highest Score', value: highestMarks, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            ].map((stat, idx) => (
              <GlassCard key={idx} className="p-3.5 flex flex-col justify-between border-white/5">
                <span className="text-[11px] text-dark-muted font-medium leading-tight">{stat.label}</span>
                <span className={`text-xl font-black ${stat.color} mt-1.5`}>{stat.value}</span>
              </GlassCard>
            ))}
          </div>

          {/* Visual Performance Charts & Grade Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Grade Distribution */}
            <GlassCard className="p-5 border-white/5">
              <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                <Award size={16} className="text-primary-400" />
                <span>Grade Distribution</span>
              </h3>
              <div className="space-y-3">
                {Object.entries(gradeDistribution).map(([grd, count], idx) => {
                  const perc = totalStudentsCount > 0 ? Math.round((count / totalStudentsCount) * 100) : 0;
                  const isFail = grd === 'F';
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${isFail ? 'text-red-400' : 'text-emerald-400'}`}>{grd}</span>
                        <span className="text-dark-muted font-medium">{count} students ({perc}%)</span>
                      </div>
                      <div className="h-2 w-full bg-dark-bg rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isFail ? 'bg-red-500' : 'bg-primary-500'}`}
                          style={{ width: `${perc}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Pass vs Fail Ratio */}
            <GlassCard className="p-5 border-white/5 flex flex-col justify-between">
              <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" />
                <span>Pass vs. Fail Performance</span>
              </h3>

              <div className="my-auto py-4 text-center space-y-4">
                <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-3xl font-black text-white">{passPercentage}%</span>
                    <span className="text-[10px] text-dark-muted block uppercase tracking-wider font-bold">Pass Rate</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-white/5">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <span className="text-dark-muted block text-[10px]">Passed</span>
                    <span className="text-base font-black text-emerald-400">{passedCount}</span>
                  </div>
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <span className="text-dark-muted block text-[10px]">Failed</span>
                    <span className="text-base font-black text-red-400">{failedCount}</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Subject Averages Card */}
            <GlassCard className="p-5 border-white/5">
              <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                <BookOpen size={16} className="text-cyan-400" />
                <span>Subject Pass Ratios</span>
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {subjectSummaries.map((subj, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white truncate max-w-[140px]">{subj.subject}</span>
                      <span className="text-cyan-400 font-bold">{subj.passPercentage}% Pass</span>
                    </div>
                    <div className="h-2 w-full bg-dark-bg rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 rounded-full transition-all"
                        style={{ width: `${subj.passPercentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

          </div>

          {/* Subject-Wise Detailed Summary Table */}
          <GlassCard className="p-0 overflow-hidden border-white/5 shadow-2xl">
            <div className="p-4 border-b border-white/5 bg-white/[0.01]">
              <h3 className="font-bold text-white text-sm">Subject-wise Analytics Table</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-dark-muted uppercase font-semibold">
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-3">Subject Code</th>
                    <th className="py-3 px-3">Max Marks</th>
                    <th className="py-3 px-3">Appeared</th>
                    <th className="py-3 px-3">Class Average</th>
                    <th className="py-3 px-3">Highest</th>
                    <th className="py-3 px-3">Lowest</th>
                    <th className="py-3 px-3">Pass %</th>
                    <th className="py-3 px-3">Fail %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-dark-text">
                  {subjectSummaries.map((subj, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{subj.subject}</td>
                      <td className="py-3.5 px-3 font-mono text-dark-muted">{subj.code}</td>
                      <td className="py-3.5 px-3 font-bold text-dark-muted">{subj.totalMarks}</td>
                      <td className="py-3.5 px-3 font-bold text-white/90">{subj.studentsCount}</td>
                      <td className="py-3.5 px-3 font-bold text-indigo-400">{subj.average}</td>
                      <td className="py-3.5 px-3 font-bold text-emerald-400">{subj.highest}</td>
                      <td className="py-3.5 px-3 font-bold text-amber-400">{subj.lowest}</td>
                      <td className="py-3.5 px-3 font-bold text-emerald-400">{subj.passPercentage}%</td>
                      <td className="py-3.5 px-3 font-bold text-red-400">{subj.failPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

        </div>
      )}

      {/* TAB 2: RESULTS & MARKSHEETS */}
      {activeTab === 'MARKSHEETS' && (
        <GlassCard className="p-0 overflow-hidden border-white/5 shadow-2xl">
          <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.01]">
            <div>
              <h3 className="font-bold text-white text-base">Student Marksheets & Official Transcripts</h3>
              <p className="text-xs text-dark-muted mt-0.5">
                Generate single or bulk report cards with dynamic subject scores, GPA, and security signature boxes.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={14} />
              <input
                type="text"
                placeholder="Search student or roll no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-dark-bg/60 border border-white/10 rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5 text-dark-muted text-xs uppercase tracking-wider font-semibold">
                  <th className="py-4 px-3 text-center w-12">Rank</th>
                  <th className="py-4 px-3">Roll No</th>
                  <th className="py-4 px-4">Student Details</th>
                  <th className="py-4 px-3">Total Marks</th>
                  <th className="py-4 px-3">Obtained</th>
                  <th className="py-4 px-3">Percentage</th>
                  <th className="py-4 px-3">Grade</th>
                  <th className="py-4 px-3">Result</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-dark-text">
                {studentResultsSummary.map((res, idx) => (
                  <tr key={res.studentId || idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-3 text-center text-xs font-black text-primary-400">
                      #{idx + 1}
                    </td>
                    <td className="py-4 px-3 font-mono font-bold text-xs text-primary-300">
                      {res.rollNumber}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-white text-xs">{res.studentName}</div>
                      <div className="text-[11px] text-dark-muted">F/Name: {res.fatherName}</div>
                    </td>
                    <td className="py-4 px-3 font-bold text-xs text-dark-muted">
                      {res.totalMax}
                    </td>
                    <td className="py-4 px-3 font-bold text-xs text-emerald-400">
                      {res.totalObt}
                    </td>
                    <td className="py-4 px-3 font-mono font-bold text-xs text-white">
                      {res.percentage}%
                    </td>
                    <td className="py-4 px-3">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                        res.grade === 'F'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {res.grade}
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        res.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {res.passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Interactive Marksheet Preview Modal */}
                        <button
                          onClick={() => { setPreviewStudentResult(res); setIsPreviewModalOpen(true); }}
                          className="p-1.5 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/20 text-xs font-bold flex items-center gap-1 transition-all"
                          title="View Marksheet"
                        >
                          <Eye size={14} />
                          <span className="hidden sm:inline">View</span>
                        </button>

                        {/* Single Marksheet PDF */}
                        <button
                          onClick={() => generateMarksheetsPDF([res])}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-dark-muted hover:text-white transition-all"
                          title="Download Marksheet PDF"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* PUBLISH RESULTS AUDIT MODAL */}
      {isPublishModalOpen && auditData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-dark-card border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Globe size={22} className="text-emerald-400" />
                <h3 className="text-lg font-black text-white">Publish Results Audit</h3>
              </div>
              <button 
                onClick={() => setIsPublishModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 text-dark-muted hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-dark-bg/60 rounded-xl border border-white/5">
                <span className="text-dark-muted block">Total Students</span>
                <span className="text-white font-bold text-base">{auditData.totalStudents}</span>
              </div>
              <div className="p-3 bg-dark-bg/60 rounded-xl border border-white/5">
                <span className="text-dark-muted block">Missing Marks</span>
                <span className={`font-bold text-base ${auditData.missingMarksCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {auditData.missingMarksCount}
                </span>
              </div>
              <div className="p-3 bg-dark-bg/60 rounded-xl border border-white/5">
                <span className="text-dark-muted block">Absent Count</span>
                <span className="text-amber-400 font-bold text-base">{auditData.absentCount}</span>
              </div>
            </div>

            {auditData.missingMarksList.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1 max-h-36 overflow-y-auto">
                <span className="text-xs font-bold text-red-300 block">Students with Incomplete/Missing Marks:</span>
                {auditData.missingMarksList.map((m, i) => (
                  <div key={i} className="text-[11px] text-red-200">
                    • Roll {m.rollNumber || '—'}: {m.studentName} ({m.reason})
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-dark-muted leading-relaxed">
              Publishing will make report cards, marks, and grades visible to student and parent mobile dashboards immediately.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-dark-muted rounded-xl text-xs font-bold"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmPublish}
                disabled={publishing}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
              >
                {publishing ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Confirm & Publish Results</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE MARKSHEET INTERACTIVE PREVIEW MODAL */}
      {isPreviewModalOpen && previewStudentResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-dark-card border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-sm font-bold text-white">Student Result & Marksheet Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateMarksheetsPDF([previewStudentResult])}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download Marksheet</span>
                </button>
                <button 
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 text-dark-muted hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-900/90 text-slate-800">
              <div className="bg-white rounded-2xl border-2 border-blue-600 p-6 shadow-2xl space-y-4">
                
                {/* Header */}
                <div className="text-center border-b-2 border-blue-900 pb-3">
                  <h2 className="text-xl font-black text-blue-900">{userData?.schoolName || 'TALEEMIDUNYA MODEL SCHOOL'}</h2>
                  <p className="text-[11px] text-slate-500">Official Examination Marksheet & Academic Record</p>
                  <div className="mt-1 inline-block bg-blue-900 text-white text-[11px] font-black px-4 py-0.5 rounded-full">
                    {currentExam?.examName} • Session {currentExam?.academicYear}
                  </div>
                </div>

                {/* Details */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-400">Student:</span> <span className="font-bold text-slate-900">{previewStudentResult.studentName}</span></div>
                  <div><span className="text-slate-400">Roll No:</span> <span className="font-bold text-blue-700">{previewStudentResult.rollNumber}</span></div>
                  <div><span className="text-slate-400">Father Name:</span> <span className="font-bold text-slate-900">{previewStudentResult.fatherName}</span></div>
                  <div><span className="text-slate-400">Class/Sec:</span> <span className="font-bold text-slate-900">{previewStudentResult.class} - {previewStudentResult.section}</span></div>
                </div>

                {/* Subject Table */}
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-blue-900 text-white text-[11px]">
                    <tr>
                      <th className="p-2">Subject</th>
                      <th className="p-2 text-center">Max Marks</th>
                      <th className="p-2 text-center">Pass Marks</th>
                      <th className="p-2 text-center">Obtained</th>
                      <th className="p-2 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {previewStudentResult.subjectBreakdown.map((sb, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2 font-semibold text-slate-900">{sb.subject}</td>
                        <td className="p-2 text-center">{sb.total}</td>
                        <td className="p-2 text-center">{sb.passing}</td>
                        <td className="p-2 text-center font-bold text-blue-700">{sb.obtained}</td>
                        <td className="p-2 text-center font-bold">{sb.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Total */}
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 flex items-center justify-between text-xs font-bold text-blue-950">
                  <span>Grand Total: {previewStudentResult.totalMax}</span>
                  <span>Obtained: {previewStudentResult.totalObt}</span>
                  <span>Percentage: {previewStudentResult.percentage}%</span>
                  <span>Grade: {previewStudentResult.grade}</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ExamReportSummary;
