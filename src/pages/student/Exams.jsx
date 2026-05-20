import React, { useState, useEffect } from 'react';
import { 
  Award, 
  RefreshCw, 
  BarChart2, 
  CheckCircle2, 
  User, 
  GraduationCap, 
  Calendar, 
  FileText, 
  Download, 
  Printer, 
  Search, 
  Users, 
  CheckCircle, 
  XCircle,
  ClipboardCheck
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { jsPDF } from 'jspdf';

const colorThemes = [
  { name: 'Ocean Blue', hex: '#3b82f6', rgb: [59, 130, 246] },
  { name: 'Emerald Green', hex: '#10b981', rgb: [16, 185, 129] },
  { name: 'Crimson Red', hex: '#ef4444', rgb: [239, 68, 68] },
  { name: 'Royal Purple', hex: '#8b5cf6', rgb: [139, 92, 246] },
  { name: 'Charcoal Gold', hex: '#f59e0b', rgb: [245, 158, 11] },
  { name: 'Midnight Dark', hex: '#1f2937', rgb: [31, 41, 55] }
];

const Exams = () => {
  const { userData, currentUser } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const studentId = currentUser?.uid || '';

  // Results & Search state
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parentSearchRoll, setParentSearchRoll] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchedStudent, setSearchedStudent] = useState(null);
  
  // Exam selection state
  const [uniqueExams, setUniqueExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');

  // Result card design customizer states
  const [cardDesign, setCardDesign] = useState({
    themeColor: '#3b82f6',
    themeRgb: [59, 130, 246],
    themeName: 'Ocean Blue',
    showGpa: true,
    showRemarks: true,
    showSignatures: true,
    customSchoolName: userData?.schoolName || 'Lodhi School System',
    customSubtitle: 'Official Academic Report Card & Student Ledger',
    layoutStyle: 'modern', // 'modern' | 'classic'
  });

  // Load results for a given student ID
  const loadStudentResults = async (sId) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'results'),
        where('schoolId', '==', schoolId),
        where('studentId', '==', sId)
      );
      const snap = await getDocs(q);
      const resultsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResults(resultsData);

      // Group by examId to find what exams this student has grades for
      const examIds = Array.from(new Set(resultsData.map(r => r.examId))).filter(Boolean);
      const examsForStudent = examIds.map(eid => {
        const correspondingResult = resultsData.find(r => r.examId === eid);
        return {
          id: eid,
          title: correspondingResult ? (correspondingResult.exam || correspondingResult.examTitle) : `Exam Term (ID: ${eid.slice(0, 6)})`
        };
      });
      
      setUniqueExams(examsForStudent);
      if (examsForStudent.length > 0) {
        setSelectedExamId(examsForStudent[0].id);
      } else {
        setSelectedExamId('');
      }
    } catch (e) {
      console.error("Error loading results:", e);
    } finally {
      setLoading(false);
    }
  };

  // Logged-in Student Auto-load
  useEffect(() => {
    if (userData && currentUser) {
      const selfStudentObj = {
        id: studentId,
        name: userData.name,
        rollNumber: userData.rollNo || userData.rollNumber || 'N/A',
        fatherName: userData.fatherName || 'N/A',
        class: userData.class || 'N/A',
        section: userData.section || 'A'
      };
      setSearchedStudent(selfStudentObj);
      loadStudentResults(studentId);
    }
  }, [userData, currentUser]);

  // Parent Roll Number Query search handler
  const handleParentSearch = async (e) => {
    e.preventDefault();
    if (!parentSearchRoll) return;
    setSearching(true);
    setSearchError('');
    try {
      // 1. Fetch matching student doc
      const qStudent = query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId),
        where('rollNumber', '==', parentSearchRoll)
      );
      const studentSnap = await getDocs(qStudent);
      if (studentSnap.empty) {
        setSearchError('No student matching this Roll Number was found.');
        setSearchedStudent(null);
        setResults([]);
        setUniqueExams([]);
        setSelectedExamId('');
        return;
      }

      const studObj = { id: studentSnap.docs[0].id, ...studentSnap.docs[0].data() };
      setSearchedStudent(studObj);

      // 2. Load results
      await loadStudentResults(studObj.id);
    } catch (err) {
      console.error(err);
      setSearchError('Error processing database search query.');
    } finally {
      setSearching(false);
    }
  };

  // Reset to logged-in student dashboard view
  const handleResetToSelf = () => {
    setParentSearchRoll('');
    setSearchError('');
    if (userData && currentUser) {
      const selfStudentObj = {
        id: studentId,
        name: userData.name,
        rollNumber: userData.rollNo || userData.rollNumber || 'N/A',
        fatherName: userData.fatherName || 'N/A',
        class: userData.class || 'N/A',
        section: userData.section || 'A'
      };
      setSearchedStudent(selfStudentObj);
      loadStudentResults(studentId);
    }
  };

  // Helper: Format class display name (e.g. "9" -> "9th Grade")
  const getClassDisplayName = (className) => {
    if (!className) return 'Unassigned Grade';
    const num = parseInt(className, 10);
    if (isNaN(num)) return className.toUpperCase();
    
    const suffixes = ["th", "st", "nd", "rd"];
    const v = num % 100;
    const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
    return `${num}${suffix} Grade`;
  };

  // Grading rules
  const getGradeAndRemarks = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', remarks: 'Outstanding Performance!', gpa: '4.0', status: 'Pass' };
    if (percentage >= 80) return { grade: 'A', remarks: 'Excellent Work!', gpa: '3.7', status: 'Pass' };
    if (percentage >= 70) return { grade: 'B', remarks: 'Very Good Progress!', gpa: '3.3', status: 'Pass' };
    if (percentage >= 60) return { grade: 'C', remarks: 'Good Effort, keep improving!', gpa: '2.7', status: 'Pass' };
    if (percentage >= 50) return { grade: 'D', remarks: 'Satisfactory, needs focus.', gpa: '2.0', status: 'Pass' };
    if (percentage >= 40) return { grade: 'E', remarks: 'Needs Improvement.', gpa: '1.5', status: 'Pass' };
    return { grade: 'F', remarks: 'Academic Support Required.', gpa: '0.0', status: 'Fail' };
  };

  // Filtered marks for current active exam selection
  const filteredMarks = results.filter(r => r.examId === selectedExamId);

  // Compute calculated metrics
  const getCalculatedStats = () => {
    if (filteredMarks.length === 0) return { total: 0, obtained: 0, percentage: 0, grade: 'N/A', remarks: 'No data', gpa: '0.0', status: 'N/A' };
    const total = filteredMarks.reduce((sum, r) => sum + Number(r.totalMarks || 100), 0);
    const obtained = filteredMarks.reduce((sum, r) => sum + Number(r.obtainedMarks || 0), 0);
    const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0;
    const grading = getGradeAndRemarks(percentage);
    
    // Check for subject fail (score < 33% of subject's total marks)
    const hasFailedSubject = filteredMarks.some(r => Number(r.obtainedMarks) < (Number(r.totalMarks) * 0.33));
    const passStatus = hasFailedSubject ? 'Fail' : grading.status;

    return {
      total,
      obtained,
      percentage,
      grade: hasFailedSubject ? 'F (Compartment)' : grading.grade,
      remarks: hasFailedSubject ? 'Failed in one or more subjects. Needs re-evaluation.' : grading.remarks,
      gpa: hasFailedSubject ? '0.0' : grading.gpa,
      status: passStatus
    };
  };

  const stats = getCalculatedStats();
  const selectedExamTitle = uniqueExams.find(e => e.id === selectedExamId)?.title || 'Examination Term';

  // Export PDF Result Card
  const handleDownloadPDF = () => {
    if (!searchedStudent || filteredMarks.length === 0) return;
    
    const doc = new jsPDF();
    const r = cardDesign.themeRgb[0];
    const g = cardDesign.themeRgb[1];
    const b = cardDesign.themeRgb[2];
    
    const pageWidth = 210;
    const pageHeight = 297;
    
    // Page Border Frame
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.rect(6, 6, pageWidth - 12, pageHeight - 12);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1.5);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
    
    if (cardDesign.layoutStyle === 'modern') {
      doc.setFillColor(r, g, b);
      doc.rect(8, 8, pageWidth - 16, 12, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("OFFICIAL ACADEMIC REPORT TRANSCRIPT", pageWidth / 2, 16, { align: "center" });
    }
    
    doc.setTextColor(33, 33, 33);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(cardDesign.customSchoolName.toUpperCase(), pageWidth / 2, 36, { align: "center" });
    
    // Crest Emblem
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.setFillColor(r, g, b);
    doc.circle(pageWidth / 2, 48, 7, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.7);
    doc.line(pageWidth / 2 - 3, 47, pageWidth / 2 + 3, 47);
    doc.line(pageWidth / 2, 45, pageWidth / 2 - 3, 47);
    doc.line(pageWidth / 2, 45, pageWidth / 2 + 3, 47);
    doc.line(pageWidth / 2, 49, pageWidth / 2 - 3, 47);
    doc.line(pageWidth / 2, 49, pageWidth / 2 + 3, 47);
    doc.line(pageWidth / 2 + 2, 47, pageWidth / 2 + 2, 51);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(r, g, b);
    doc.text(cardDesign.customSubtitle.toUpperCase(), pageWidth / 2, 60, { align: "center" });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Campus Affiliate: ${userData?.schoolName || 'TaleemiDunya Academy'}  |  System Verification: Verified`, pageWidth / 2, 65, { align: "center" });
    
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.8);
    doc.line(15, 70, pageWidth - 15, 70);
    
    // Student Details Block
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 75, pageWidth - 30, 28, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(15, 75, pageWidth - 30, 28);
    
    doc.setFillColor(r, g, b);
    doc.rect(15, 75, 2, 28, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.text("STUDENT PROFILE DETAILS", 20, 81);
    
    doc.setFontSize(9.5);
    doc.setTextColor(33, 33, 33);
    doc.setFont("helvetica", "bold");
    doc.text(`Name:`, 20, 88);
    doc.setFont("helvetica", "normal");
    doc.text(`${searchedStudent.name}`, 38, 88);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Roll Number:`, 20, 94);
    doc.setFont("helvetica", "normal");
    doc.text(`${searchedStudent.rollNumber || 'N/A'}`, 45, 94);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Father's Name:`, 20, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`${searchedStudent.fatherName || 'N/A'}`, 48, 100);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Class & Grade:`, 115, 88);
    doc.setFont("helvetica", "normal");
    doc.text(`${getClassDisplayName(searchedStudent.class)} — Section ${searchedStudent.section || 'A'}`, 144, 88);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Examination:`, 115, 94);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedExamTitle}`, 142, 94);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Date of Issue:`, 115, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`${new Date().toLocaleDateString()}`, 142, 100);
    
    // Subject Performance Table
    const tableTop = 112;
    doc.setFillColor(r, g, b);
    doc.rect(15, tableTop, pageWidth - 30, 8, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("SUBJECT DESCRIPTION", 18, tableTop + 5.5);
    doc.text("TOTAL MARKS", 95, tableTop + 5.5, { align: "center" });
    doc.text("MIN PASSING (33%)", 140, tableTop + 5.5, { align: "center" });
    doc.text("OBTAINED MARKS", 185, tableTop + 5.5, { align: "center" });
    
    let y = tableTop + 14;
    doc.setFontSize(9);
    doc.setTextColor(33, 33, 33);
    doc.setFont("helvetica", "normal");
    
    filteredMarks.forEach((row, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y - 5, pageWidth - 30, 7.5, 'F');
      }
      
      doc.setDrawColor(235, 235, 235);
      doc.setLineWidth(0.3);
      doc.line(15, y + 2.5, pageWidth - 15, y + 2.5);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(33, 33, 33);
      doc.text(row.subject, 18, y);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(String(row.totalMarks), 95, y, { align: "center" });
      doc.text(String(Math.round(row.totalMarks * 0.33)), 140, y, { align: "center" });
      
      const subObt = Number(row.obtainedMarks);
      const subTot = Number(row.totalMarks);
      const isFailed = subObt < (subTot * 0.33);
      
      if (isFailed) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text(`${subObt} (FAIL)`, 185, y, { align: "center" });
      } else {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(r, g, b);
        doc.text(String(subObt), 185, y, { align: "center" });
      }
      y += 7.5;
    });
    
    // Border bottom
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.line(15, y - 5, pageWidth - 15, y - 5);
    
    // Performance Summary Block
    y += 4;
    doc.setFillColor(240, 246, 255);
    doc.rect(15, y, pageWidth - 30, 30, 'F');
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.rect(15, y, pageWidth - 30, 30);
    
    doc.setFillColor(r, g, b);
    doc.rect(15, y, 3, 30, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(r, g, b);
    doc.text("ACADEMIC PERFORMANCE SUMMARY", 22, y + 6);
    
    doc.setFontSize(9.5);
    doc.setTextColor(33, 33, 33);
    doc.setFont("helvetica", "normal");
    doc.text(`Grand Total Marks:  `, 22, y + 14);
    doc.setFont("helvetica", "bold");
    doc.text(`${stats.obtained} / ${stats.total}`, 58, y + 14);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Overall Percentage:  `, 22, y + 22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(r, g, b);
    doc.text(`${stats.percentage}%`, 60, y + 22);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(33, 33, 33);
    doc.text(`Calculated Grade:    `, 115, y + 14);
    doc.setFont("helvetica", "bold");
    doc.text(`${stats.grade}`, 150, y + 14);
    
    if (cardDesign.showGpa) {
      doc.setFont("helvetica", "normal");
      doc.text(`GPA Score:           `, 115, y + 22);
      doc.setFont("helvetica", "bold");
      doc.text(`${stats.gpa} / 4.0`, 138, y + 22);
    }
    
    // Status Ribbon
    const ribbonX = pageWidth - 48;
    const ribbonY = y + 5;
    doc.setFillColor(stats.status === 'Pass' ? 34 : 220, stats.status === 'Pass' ? 197 : 38, stats.status === 'Pass' ? 94 : 38);
    doc.rect(ribbonX, ribbonY, 30, 6, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`STATUS: ${stats.status.toUpperCase()}`, ribbonX + 15, ribbonY + 4.2, { align: "center" });
    
    // Medal
    if (stats.percentage >= 80 && stats.status === 'Pass') {
      doc.setFillColor(245, 158, 11);
      doc.circle(pageWidth - 33, y + 20, 4.5, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text("A", pageWidth - 33, y + 22.2, { align: "center" });
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(245, 158, 11);
      doc.text("EXCELLENCE AWARD", pageWidth - 55, y + 21, { align: "center" });
    }
    
    // Remarks
    y += 35;
    if (cardDesign.showRemarks) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(r, g, b);
      doc.text("OFFICIAL DYNAMIC FEEDBACK & REMARKS", 15, y);
      
      doc.setFillColor(252, 252, 253);
      doc.rect(15, y + 3, pageWidth - 30, 10, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.rect(15, y + 3, pageWidth - 30, 10);
      
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      doc.text(`"${stats.remarks}"`, pageWidth / 2, y + 9.5, { align: "center" });
      
      y += 18;
    }
    
    // Signatures
    y += 15;
    if (cardDesign.showSignatures) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.line(20, y, 70, y);
      doc.line(pageWidth - 70, y, pageWidth - 20, y);
      
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.2);
      doc.circle(45, y - 8, 3, 'S');
      doc.circle(pageWidth - 45, y - 8, 3, 'S');
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("CLASS TEACHER SIGNATURE", 45, y + 5, { align: "center" });
      doc.text("PRINCIPAL & BOARD REGISTRAR", pageWidth - 45, y + 5, { align: "center" });
      
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.text("Date Logged: " + new Date().toLocaleDateString(), 45, y + 8.5, { align: "center" });
      doc.text("TaleemiDunya Digital Authenticated", pageWidth - 45, y + 8.5, { align: "center" });
    }
    
    // Footer Fine Print
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text("This report is processed and generated electronically via TaleemiDunya SaaS platform. No manual signing is required where digital stamp is present.", pageWidth / 2, pageHeight - 11, { align: "center" });
    doc.text("System Reference ID: " + `td_sec_${searchedStudent.id.slice(0, 8)}_${selectedExamId.slice(0, 6)}`, pageWidth / 2, pageHeight - 8, { align: "center" });
    
    const sanitizedName = searchedStudent.name.replace(/\s+/g, "_");
    const sanitizedExam = selectedExamTitle.replace(/\s+/g, "_");
    doc.save(`ReportCard_${sanitizedName}_${sanitizedExam}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary-400 to-indigo-500 bg-clip-text text-transparent">
            Student & Parent Result Portal
          </h1>
          <p className="text-dark-muted mt-1 text-sm">
            View grades, analyze score sheets, and download official premium report cards.
          </p>
        </div>
        <button 
          onClick={() => loadStudentResults(searchedStudent?.id || studentId)} 
          className="premium-button-secondary py-2.5 px-5 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer border border-dark-border"
        >
          <RefreshCw size={14} className="animate-spin-hover" />
          <span>Sync Scores</span>
        </button>
      </div>

      {/* Parent Search / Roster Lookup Portal */}
      <GlassCard className="p-6">
        <form onSubmit={handleParentSearch} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest mb-2 block">
              Parent Search Portal: Look up student scorecard by Roll Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={parentSearchRoll}
                onChange={(e) => setParentSearchRoll(e.target.value)}
                placeholder="Enter Student Roll Number (e.g. 1001, 1002)..."
                className="w-full premium-input pl-10 pr-4 py-2.5 bg-dark-card text-white text-sm"
              />
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-dark-muted" />
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              type="submit"
              disabled={searching}
              className="flex-1 md:flex-none premium-button-primary py-2.5 px-6 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{searching ? 'Searching...' : 'Search Report'}</span>
            </button>
            {searchedStudent?.id !== studentId && (
              <button
                type="button"
                onClick={handleResetToSelf}
                className="premium-button-secondary py-2.5 px-4 text-xs font-black uppercase tracking-wider cursor-pointer border border-dark-border"
              >
                Reset to My Card
              </button>
            )}
          </div>
        </form>

        {searchError && (
          <p className="text-red-400 font-bold text-xs mt-3 flex items-center gap-1.5 uppercase tracking-wide">
            <XCircle size={14} />
            {searchError}
          </p>
        )}
      </GlassCard>

      {/* Roster & Preview Layout */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <svg className="animate-spin h-10 w-10 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <p className="text-dark-muted text-xs font-bold uppercase tracking-widest mt-4">Compiling Scores from Registrar...</p>
        </div>
      ) : searchedStudent && uniqueExams.length > 0 && filteredMarks.length > 0 ? (
        <div className="space-y-6">
          {/* Exam Term Selector dropdown */}
          <GlassCard className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ClipboardCheck size={20} className="text-primary-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Select Graded Term</h3>
                  <p className="text-[10px] text-dark-muted mt-0.5">Toggle between monthly, midterm, and final examinations.</p>
                </div>
              </div>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="premium-input bg-dark-card py-2 px-4 text-xs max-w-xs w-full"
              >
                {uniqueExams.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.title}</option>
                ))}
              </select>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Quick Stats & Customizer */}
            <div className="space-y-6">
              {/* Performance Score card */}
              <GlassCard className="p-6 text-center space-y-4">
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-tr from-primary-500/20 to-indigo-500/20 border-2 border-primary-500/40 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">{stats.percentage}%</p>
                    <p className="text-[9px] uppercase tracking-widest font-black text-primary-400">Score</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-black text-xl text-white">{searchedStudent.name}</h4>
                  <p className="text-[10px] text-dark-muted uppercase font-bold tracking-widest mt-0.5">
                    Class Roll: {searchedStudent.rollNumber || 'N/A'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-dark-border/60">
                  <div className="p-3 bg-dark-hover rounded-xl border border-dark-border/40 text-left">
                    <p className="text-[9px] text-dark-muted uppercase font-black tracking-widest">Total Grade</p>
                    <p className="text-lg font-black text-primary-400">{stats.grade}</p>
                  </div>
                  <div className="p-3 bg-dark-hover rounded-xl border border-dark-border/40 text-left">
                    <p className="text-[9px] text-dark-muted uppercase font-black tracking-widest">GPA Score</p>
                    <p className="text-lg font-black text-indigo-400">{stats.gpa} / 4.0</p>
                  </div>
                </div>

                {/* Pass/Fail Status banner */}
                <div className={`p-3 rounded-xl flex items-center justify-center gap-2 border ${
                  stats.status === 'Pass' 
                    ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {stats.status === 'Pass' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  <span className="text-xs font-black uppercase tracking-widest">
                    RESULT STATUS: {stats.status.toUpperCase()}
                  </span>
                </div>
              </GlassCard>

              {/* Dynamic Design Customizer Sidebar */}
              <GlassCard className="p-6 space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-dark-border/40">
                  <Award size={18} className="text-primary-400" />
                  <h4 className="font-black text-xs uppercase tracking-widest text-white">Report Card Customizer</h4>
                </div>
                
                {/* Theme Colors preset selector */}
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest font-black text-dark-muted block">1. Color Theme Accent</label>
                  <div className="flex flex-wrap gap-2">
                    {colorThemes.map((theme) => (
                      <button
                        key={theme.name}
                        type="button"
                        onClick={() => setCardDesign(p => ({ ...p, themeColor: theme.hex, themeRgb: theme.rgb, themeName: theme.name }))}
                        className={`w-7 h-7 rounded-full border-2 transition-all relative flex items-center justify-center ${
                          cardDesign.themeColor === theme.hex ? 'border-white scale-110 shadow-lg shadow-white/20' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: theme.hex }}
                        title={theme.name}
                      >
                        {cardDesign.themeColor === theme.hex && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Layout presets */}
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest font-black text-dark-muted block">2. Layout Presets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'modern', label: 'Premium Modern' },
                      { id: 'classic', label: 'Classic Board' }
                    ].map(lay => (
                      <button
                        key={lay.id}
                        type="button"
                        onClick={() => setCardDesign(p => ({ ...p, layoutStyle: lay.id }))}
                        className={`py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                          cardDesign.layoutStyle === lay.id 
                            ? 'bg-white/10 text-white border-white/20' 
                            : 'bg-dark-hover text-dark-muted border-dark-border/40 hover:text-white'
                        }`}
                      >
                        {lay.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-2 border-t border-dark-border/40">
                  <label className="text-[9px] uppercase tracking-widest font-black text-dark-muted block mb-1">3. Display Elements</label>
                  <div className="space-y-2 text-xs font-medium">
                    <label className="flex items-center gap-2.5 cursor-pointer text-dark-text hover:text-white transition-colors">
                      <input 
                        type="checkbox" 
                        checked={cardDesign.showGpa}
                        onChange={(e) => setCardDesign(p => ({ ...p, showGpa: e.target.checked }))}
                        className="rounded border-dark-border bg-dark-card text-primary-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Show GPA Equivalencies</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer text-dark-text hover:text-white transition-colors">
                      <input 
                        type="checkbox" 
                        checked={cardDesign.showRemarks}
                        onChange={(e) => setCardDesign(p => ({ ...p, showRemarks: e.target.checked }))}
                        className="rounded border-dark-border bg-dark-card text-primary-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Include Instructor Remarks</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer text-dark-text hover:text-white transition-colors">
                      <input 
                        type="checkbox" 
                        checked={cardDesign.showSignatures}
                        onChange={(e) => setCardDesign(p => ({ ...p, showSignatures: e.target.checked }))}
                        className="rounded border-dark-border bg-dark-card text-primary-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Include Certification Stamp</span>
                    </label>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Right Column: Visual Report Card Preview */}
            <div className="lg:col-span-2 space-y-6">
              <GlassCard 
                className="p-8 space-y-8 bg-gradient-to-b from-dark-card to-dark-bg text-dark-text relative overflow-hidden transition-all duration-500 border hover:border-primary-500/20 shadow-2xl" 
                id="printable-result-card"
                style={{ borderLeft: `6px solid ${cardDesign.themeColor}` }}
              >
                {/* Academic Seal Watermark */}
                <div className="absolute inset-0 pointer-events-none opacity-3 flex items-center justify-center select-none">
                  <svg width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" style={{ color: cardDesign.themeColor }}>
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>

                {/* 3D Floating Achievement Badge */}
                {stats.status === 'Pass' && (
                  <div className="absolute top-6 right-6 select-none animate-pulse-slow">
                    {stats.percentage >= 90 ? (
                      <div className="relative group flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 p-0.5 shadow-lg shadow-yellow-500/20 border border-yellow-200/50 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                          <Award className="text-white w-9 h-9" />
                        </div>
                        <span className="text-[8px] mt-1 font-black uppercase tracking-widest text-yellow-400 bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-500/20">High Honors</span>
                      </div>
                    ) : stats.percentage >= 80 ? (
                      <div className="relative group flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 p-0.5 shadow-lg shadow-slate-400/20 border border-slate-200/50 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                          <Award className="text-white w-9 h-9" />
                        </div>
                        <span className="text-[8px] mt-1 font-black uppercase tracking-widest text-slate-300 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-500/20">Dean's List</span>
                      </div>
                    ) : (
                      <div className="relative group flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 via-emerald-500 to-emerald-600 p-0.5 shadow-lg shadow-emerald-500/10 border border-emerald-300/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                          <CheckCircle2 className="text-white w-7 h-7" />
                        </div>
                        <span className="text-[8px] mt-1 font-black uppercase tracking-widest text-green-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-green-500/20">Pass</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Letterhead */}
                <div className="flex items-start justify-between border-b border-dark-border/60 pb-6 pr-20">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden border border-white/10" style={{ backgroundColor: `${cardDesign.themeColor}15` }}>
                      <GraduationCap style={{ color: cardDesign.themeColor }} size={32} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight leading-none">
                        {cardDesign.customSchoolName.toUpperCase()}
                      </h3>
                      <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest mt-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cardDesign.themeColor }} />
                        {cardDesign.customSubtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Student Profile Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 border border-dark-border/40 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 rounded-xl text-primary-400 bg-primary-500/10"><User size={18} /></div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-dark-muted">Student Name</p>
                      <p className="font-bold text-sm text-white mt-0.5">{searchedStudent.name}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 border border-dark-border/40 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 rounded-xl text-indigo-400 bg-indigo-500/10"><Users size={18} /></div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-dark-muted">Parent / Father Name</p>
                      <p className="font-bold text-sm text-white mt-0.5">{searchedStudent.fatherName || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 border border-dark-border/40 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 rounded-xl text-purple-400 bg-purple-500/10"><GraduationCap size={18} /></div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-dark-muted">Class & Grade</p>
                      <p className="font-bold text-sm text-white mt-0.5">{getClassDisplayName(searchedStudent.class)}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 border border-dark-border/40 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 rounded-xl text-yellow-400 bg-yellow-500/10"><Award size={18} /></div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-dark-muted">Examination Term</p>
                      <p className="font-bold text-sm text-white mt-0.5">{selectedExamTitle}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 border border-dark-border/40 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 rounded-xl text-green-400 bg-green-500/10"><Calendar size={18} /></div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-dark-muted">Roll Number</p>
                      <p className="font-bold text-sm text-white font-mono mt-0.5">{searchedStudent.rollNumber || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 border border-dark-border/40 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 rounded-xl text-rose-400 bg-rose-500/10"><FileText size={18} /></div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-dark-muted">Date of Issue</p>
                      <p className="font-bold text-sm text-white font-mono mt-0.5">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Marks List Table */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-dark-muted uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} style={{ color: cardDesign.themeColor }} />
                    <span>Subjective Performance breakdown</span>
                  </h4>

                  <div className="overflow-x-auto border border-dark-border/60 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr 
                          className="border-b border-dark-border/80 uppercase font-black text-[9px] tracking-widest bg-white/3"
                          style={{ color: cardDesign.themeColor }}
                        >
                          <th className="py-4 px-4">Subject</th>
                          <th className="py-4 text-center">Score Card Status & Progress</th>
                          <th className="py-4 text-center">Total</th>
                          <th className="py-4 text-center">Passing</th>
                          <th className="py-4 text-right px-4">Obtained</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border/40 font-medium">
                        {filteredMarks.map(row => {
                          const subObt = Number(row.obtainedMarks);
                          const subTot = Number(row.totalMarks);
                          const ratio = subTot > 0 ? (subObt / subTot) * 100 : 0;
                          const isFailed = subObt < (subTot * 0.33);

                          return (
                            <tr key={row.id} className="hover:bg-white/5 transition-all">
                              <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isFailed ? '#ef4444' : cardDesign.themeColor }} />
                                {row.subject}
                              </td>
                              <td className="py-4 px-8 min-w-[200px]">
                                <div className="flex items-center gap-4">
                                  <div className="w-full bg-dark-bg h-2 rounded-full overflow-hidden border border-dark-border/50">
                                    <div 
                                      className="h-full rounded-full bg-gradient-to-r transition-all"
                                      style={{ 
                                        width: `${ratio}%`, 
                                        backgroundImage: isFailed 
                                          ? 'linear-gradient(to right, #f87171, #ef4444)' 
                                          : `linear-gradient(to right, ${cardDesign.themeColor}50, ${cardDesign.themeColor})` 
                                      }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono text-dark-muted font-bold">{Math.round(ratio)}%</span>
                                </div>
                              </td>
                              <td className="py-4 text-center text-dark-muted font-mono">{row.totalMarks}</td>
                              <td className="py-4 text-center text-dark-muted font-mono">{Math.round(row.totalMarks * 0.33)}</td>
                              <td className={`py-4 text-right px-4 font-mono font-bold ${
                                isFailed ? 'text-rose-500' : 'text-green-400'
                              }`} style={!isFailed ? { color: cardDesign.themeColor } : {}}>
                                <div className="inline-flex items-center gap-1.5">
                                  <span>{subObt}</span>
                                  {isFailed ? (
                                    <span className="text-[8px] uppercase tracking-widest font-black bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded text-rose-500">Fail</span>
                                  ) : (
                                    <span className="text-[8px] uppercase tracking-widest font-black bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-dark-muted font-normal">Pass</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Score Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-5 bg-gradient-to-b from-dark-hover to-dark-bg border border-dark-border/80 rounded-2xl">
                    <p className="text-[9px] text-dark-muted uppercase font-black tracking-widest">Total Obtained</p>
                    <p className="text-2xl font-black text-white mt-1.5 flex items-baseline gap-1">
                      {stats.obtained}
                      <span className="text-xs font-normal text-dark-muted">/ {stats.total}</span>
                    </p>
                    <div className="w-8 h-1 bg-primary-500 rounded-full mt-3" />
                  </div>
                  <div className="p-5 bg-gradient-to-b from-dark-hover to-dark-bg border border-dark-border/80 rounded-2xl">
                    <p className="text-[9px] text-dark-muted uppercase font-black tracking-widest">Aggregate Marks</p>
                    <p className="text-2xl font-black mt-1.5" style={{ color: cardDesign.themeColor }}>
                      {stats.percentage}%
                    </p>
                    <div className="w-8 h-1 rounded-full mt-3" style={{ backgroundColor: cardDesign.themeColor }} />
                  </div>
                  <div className="p-5 bg-gradient-to-b from-dark-hover to-dark-bg border border-dark-border/80 rounded-2xl">
                    <p className="text-[9px] text-dark-muted uppercase font-black tracking-widest">Letter Grade</p>
                    <p className="text-2xl font-black text-white mt-1.5">{stats.grade}</p>
                    <div className="w-8 h-1 bg-purple-500 rounded-full mt-3" />
                  </div>
                  <div className="p-5 bg-gradient-to-b from-dark-hover to-dark-bg border border-dark-border/80 rounded-2xl">
                    <p className="text-[9px] text-dark-muted uppercase font-black tracking-widest">Decision status</p>
                    <p className={`text-2xl font-black mt-1.5 uppercase tracking-wide ${
                      stats.status === 'Pass' ? 'text-green-400' : 'text-red-500'
                    }`}>{stats.status}</p>
                    <div className={`w-8 h-1 rounded-full mt-3 ${stats.status === 'Pass' ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                </div>

                {/* GPA Display Block */}
                {cardDesign.showGpa && (
                  <div className="flex gap-4 items-center text-xs p-4 rounded-2xl bg-white/5 border border-dark-border/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: cardDesign.themeColor }} />
                    <Award style={{ color: cardDesign.themeColor }} size={20} className="animate-pulse" />
                    <span>Calculated Grade Point Average (GPA Equivalent): <strong className="text-white text-base ml-1.5 font-black">{stats.gpa} / 4.0</strong></span>
                  </div>
                )}

                {/* Teacher Remarks Box */}
                {cardDesign.showRemarks && (
                  <div className="p-5 rounded-2xl bg-white/3 border border-dark-border/40">
                    <p className="text-[8px] font-black uppercase tracking-widest text-dark-muted mb-2">Class Teacher Evaluation Notes</p>
                    <p className="text-sm italic text-dark-text leading-relaxed font-medium">"{stats.remarks}"</p>
                  </div>
                )}

                {/* Official Signatures */}
                {cardDesign.showSignatures && (
                  <div className="flex items-center justify-between pt-8 text-[10px] text-dark-muted">
                    <div className="text-center w-36 border-t border-dark-border/80 pt-3.5 font-bold uppercase tracking-widest">
                      Class Instructor
                    </div>
                    <div className="text-center w-40 border-t border-dark-border/80 pt-3.5 font-bold uppercase tracking-widest flex flex-col items-center">
                      <span>Principal & Controller</span>
                      <span className="text-[7px] text-dark-muted mt-0.5 tracking-wider lowercase font-mono">td_auth_secure</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 border-t border-dark-border/60 pt-6">
                  <button
                    onClick={handleDownloadPDF}
                    className="flex-1 premium-button-primary py-3 flex items-center justify-center gap-2 cursor-pointer"
                    style={{ backgroundColor: cardDesign.themeColor, backgroundImage: 'none' }}
                  >
                    <Download size={18} />
                    <span className="font-bold text-xs uppercase tracking-wider">Download PDF Report Card</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="premium-button-secondary py-3 px-6 flex items-center justify-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-wider"
                  >
                    <Printer size={18} />
                    <span>Print</span>
                  </button>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      ) : (
        <GlassCard className="p-16 text-center text-dark-muted">
          <div className="p-4 bg-dark-hover rounded-full inline-block mb-4 text-dark-muted">
            <GraduationCap size={48} style={{ color: cardDesign.themeColor }} />
          </div>
          <h3 className="text-lg font-bold text-white">No Report Graded Yet</h3>
          <p className="max-w-md mx-auto mt-2 text-sm">
            {!searchedStudent 
              ? "Search a student roll number or authenticate your account to compile scores."
              : "No exam records or final grades have been computed for this student term."
            }
          </p>
        </GlassCard>
      )}

    </div>
  );
};

export default Exams;
