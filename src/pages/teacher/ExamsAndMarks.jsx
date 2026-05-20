import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Plus, 
  ClipboardCheck, 
  Users, 
  User,
  Calendar, 
  Save, 
  ShieldCheck,
  Download,
  Printer,
  ChevronRight,
  ArrowLeft,
  GraduationCap,
  TrendingUp,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { setDoc, addDoc, collection, doc, serverTimestamp } from 'firebase/firestore';
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

const ExamsAndMarks = () => {
  const { userData } = useAuth();
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create' | 'mark' | 'results'
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedClass, setSelectedClass] = useState('10');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [saving, setSaving] = useState(false);

  // Result card design customizer states
  const [cardDesign, setCardDesign] = useState({
    themeColor: '#3b82f6', // default blue
    themeRgb: [59, 130, 246],
    themeName: 'Ocean Blue',
    showGpa: true,
    showRemarks: true,
    showSignatures: true,
    customSchoolName: userData?.schoolName || 'Lodhi School System',
    customSubtitle: 'Official Academic Report Card & Student Ledger',
    layoutStyle: 'modern', // 'modern' | 'classic'
  });

  // New Exam Form State
  const [newExam, setNewExam] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    classes: '10',
    status: 'Upcoming'
  });

  // Result card generator states
  const [classesList, setClassesList] = useState([]);
  const [cardSelectedClass, setCardSelectedClass] = useState('');
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [uniqueExams, setUniqueExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [fetchingResults, setFetchingResults] = useState(false);

  useEffect(() => {
    fetchExams();
  }, [userData]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const data = await getRecords('exams', userData?.schoolId || 'default-school');
      setExams(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique classes for teacher report cards
  useEffect(() => {
    const fetchUniqueClasses = async () => {
      try {
        const schoolId = userData?.schoolId || 'default-school';
        const studsData = await getRecords('students', schoolId);
        const uClasses = Array.from(new Set(studsData.map(s => s.class))).filter(Boolean).sort((a, b) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
          return numA - numB;
        });
        setClassesList(uClasses);
        if (uClasses.length > 0) {
          setCardSelectedClass(uClasses[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUniqueClasses();
  }, [userData]);

  // Fetch students of the selected class
  useEffect(() => {
    if (!cardSelectedClass) return;
    const fetchStudentsForClass = async () => {
      const schoolId = userData?.schoolId || 'default-school';
      const studs = await getRecords('students', schoolId, [
        { field: 'class', operator: '==', value: cardSelectedClass }
      ]);
      setStudentsList(studs);
      if (studs.length > 0) {
        setSelectedStudentId(studs[0].id);
        setSelectedStudent(studs[0]);
      } else {
        setSelectedStudentId('');
        setSelectedStudent(null);
        setStudentResults([]);
        setUniqueExams([]);
        setSelectedExamId('');
      }
    };
    fetchStudentsForClass();
  }, [cardSelectedClass, userData]);

  // Fetch results when student changes
  useEffect(() => {
    if (!selectedStudentId) return;
    const fetchStudentResults = async () => {
      try {
        setFetchingResults(true);
        const schoolId = userData?.schoolId || 'default-school';
        const resultsData = await getRecords('results', schoolId, [
          { field: 'studentId', operator: '==', value: selectedStudentId }
        ]);
        setStudentResults(resultsData);

        // Extract unique exams for this student
        const examIds = Array.from(new Set(resultsData.map(r => r.examId))).filter(Boolean);
        const examsForStudent = examIds.map(eid => {
          const correspondingExam = exams.find(e => e.id === eid);
          return {
            id: eid,
            title: correspondingExam ? correspondingExam.title : `Exam (ID: ${eid.slice(0, 6)})`
          };
        });

        setUniqueExams(examsForStudent);
        if (examsForStudent.length > 0) {
          setSelectedExamId(examsForStudent[0].id);
        } else {
          setSelectedExamId('');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingResults(false);
      }
    };
    fetchStudentResults();
  }, [selectedStudentId, exams, userData]);

  const handleStudentChange = (e) => {
    const sid = e.target.value;
    setSelectedStudentId(sid);
    const studObj = studentsList.find(s => s.id === sid);
    setSelectedStudent(studObj);
  };

  const getClassDisplayName = (className) => {
    if (!className) return 'Unassigned Grade';
    const num = parseInt(className, 10);
    if (isNaN(num)) return className.toUpperCase();
    
    const suffixes = ["th", "st", "nd", "rd"];
    const v = num % 100;
    const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
    return `${num}${suffix} Grade`;
  };

  const getGradeAndRemarks = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', remarks: 'Outstanding Performance!', gpa: '4.0', status: 'Pass' };
    if (percentage >= 80) return { grade: 'A', remarks: 'Excellent Work!', gpa: '3.7', status: 'Pass' };
    if (percentage >= 70) return { grade: 'B', remarks: 'Very Good Progress!', gpa: '3.3', status: 'Pass' };
    if (percentage >= 60) return { grade: 'C', remarks: 'Good Effort, keep improving!', gpa: '2.7', status: 'Pass' };
    if (percentage >= 50) return { grade: 'D', remarks: 'Satisfactory, needs focus.', gpa: '2.0', status: 'Pass' };
    if (percentage >= 40) return { grade: 'E', remarks: 'Needs Improvement.', gpa: '1.5', status: 'Pass' };
    return { grade: 'F', remarks: 'Academic Support Required.', gpa: '0.0', status: 'Fail' };
  };

  const filteredMarks = studentResults.filter(r => r.examId === selectedExamId);

  const getCalculatedStats = () => {
    if (filteredMarks.length === 0) return { total: 0, obtained: 0, percentage: 0, grade: 'N/A', remarks: 'No data', gpa: '0.0', status: 'N/A' };
    const total = filteredMarks.reduce((sum, r) => sum + Number(r.totalMarks || 100), 0);
    const obtained = filteredMarks.reduce((sum, r) => sum + Number(r.obtainedMarks || 0), 0);
    const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0;
    const grading = getGradeAndRemarks(percentage);

    const hasFailedSubject = filteredMarks.some(r => Number(r.obtainedMarks) < (Number(r.totalMarks) * 0.33));
    const passStatus = hasFailedSubject ? 'Fail' : grading.status;

    return {
      total,
      obtained,
      percentage,
      grade: hasFailedSubject ? 'F (Compartment)' : grading.grade,
      remarks: hasFailedSubject ? 'Failed in one or more subjects. Focus needed.' : grading.remarks,
      gpa: hasFailedSubject ? '0.0' : grading.gpa,
      status: passStatus
    };
  };

  const stats = getCalculatedStats();
  const selectedExamTitle = uniqueExams.find(e => e.id === selectedExamId)?.title || 'Examination';

  const handleDownloadPDF = () => {
    if (!selectedStudent || filteredMarks.length === 0) return;

    const doc = new jsPDF();
    const r = cardDesign.themeRgb[0];
    const g = cardDesign.themeRgb[1];
    const b = cardDesign.themeRgb[2];
    
    // Page Dimensions
    const pageWidth = 210;
    const pageHeight = 297;
    
    // 1. Draw Elegant Double Page Border
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.rect(6, 6, pageWidth - 12, pageHeight - 12);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1.5);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
    
    // 2. Top Header Accent Band (Modern Layout)
    if (cardDesign.layoutStyle === 'modern') {
      doc.setFillColor(r, g, b);
      doc.rect(8, 8, pageWidth - 16, 12, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("OFFICIAL ACADEMIC REPORT TRANSCRIPT", pageWidth / 2, 16, { align: "center" });
    }
    
    // 3. School Title Block & Logo Crest
    doc.setTextColor(33, 33, 33);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(cardDesign.customSchoolName.toUpperCase(), pageWidth / 2, 36, { align: "center" });
    
    // Crest Emblem (Drawn dynamically)
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.setFillColor(r, g, b);
    doc.circle(pageWidth / 2, 48, 7, 'F');
    // Graduation cap emblem visual representation in PDF using lines
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.7);
    doc.line(pageWidth / 2 - 3, 47, pageWidth / 2 + 3, 47); // cap diamond horizontal line
    doc.line(pageWidth / 2, 45, pageWidth / 2 - 3, 47);
    doc.line(pageWidth / 2, 45, pageWidth / 2 + 3, 47);
    doc.line(pageWidth / 2, 49, pageWidth / 2 - 3, 47);
    doc.line(pageWidth / 2, 49, pageWidth / 2 + 3, 47);
    doc.line(pageWidth / 2 + 2, 47, pageWidth / 2 + 2, 51); // tassel
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(r, g, b);
    doc.text(cardDesign.customSubtitle.toUpperCase(), pageWidth / 2, 60, { align: "center" });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Campus Affiliate: ${userData?.schoolName || 'TaleemiDunya Academy'}  |  System Verification: Verified`, pageWidth / 2, 65, { align: "center" });
    
    // Divider line
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.8);
    doc.line(15, 70, pageWidth - 15, 70);
    
    // 4. Student Bio Details Block (Framed)
    doc.setFillColor(248, 250, 252); // soft slate background
    doc.rect(15, 75, pageWidth - 30, 28, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(15, 75, pageWidth - 30, 28);
    
    // Border accent strip
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
    doc.text(`${selectedStudent.name}`, 38, 88);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Roll Number:`, 20, 94);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedStudent.rollNumber || 'N/A'}`, 45, 94);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Father's Name:`, 20, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedStudent.fatherName || 'N/A'}`, 48, 100);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Class & Grade:`, 115, 88);
    doc.setFont("helvetica", "normal");
    doc.text(`${getClassDisplayName(cardSelectedClass)} — Section ${selectedStudent.section || 'A'}`, 144, 88);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Examination:`, 115, 94);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedExamTitle}`, 142, 94);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Date of Issue:`, 115, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`${new Date().toLocaleDateString()}`, 142, 100);
    
    // 5. Subject Performance Table
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
      // Row alternating highlight
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y - 5, pageWidth - 30, 7.5, 'F');
      }
      
      // Fine row divider line
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
        doc.setTextColor(220, 38, 38); // Red
        doc.text(`${subObt} (FAIL)`, 185, y, { align: "center" });
      } else {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(r, g, b); // Themed colored marks
        doc.text(String(subObt), 185, y, { align: "center" });
      }
      y += 7.5;
    });
    
    // Bottom border of table
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.line(15, y - 5, pageWidth - 15, y - 5);
    
    // 6. Academic Performance Summary Box
    y += 4;
    doc.setFillColor(240, 246, 255); // high contrast tinted theme color box
    doc.rect(15, y, pageWidth - 30, 30, 'F');
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.rect(15, y, pageWidth - 30, 30);
    
    // Accent banner inside box
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
    
    // Overall Pass Status Ribbon (Drawn on PDF)
    const ribbonX = pageWidth - 48;
    const ribbonY = y + 5;
    doc.setFillColor(stats.status === 'Pass' ? 34 : 220, stats.status === 'Pass' ? 197 : 38, stats.status === 'Pass' ? 94 : 38);
    doc.rect(ribbonX, ribbonY, 30, 6, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`STATUS: ${stats.status.toUpperCase()}`, ribbonX + 15, ribbonY + 4.2, { align: "center" });
    
    // Honor Medallion for high performers
    if (stats.percentage >= 80 && stats.status === 'Pass') {
      // Golden seal representation
      doc.setFillColor(245, 158, 11); // Gold color
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
    
    // 7. Principal's Evaluation & Feedback
    y += 35;
    if (cardDesign.showRemarks) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(r, g, b);
      doc.text("OFFICIAL DYNAMIC FEEDBACK & REMARKS", 15, y);
      
      // Fancy quotes box
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
    
    // 8. Signature Blocks with decorative lines
    y += 15;
    if (cardDesign.showSignatures) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.line(20, y, 70, y);
      doc.line(pageWidth - 70, y, pageWidth - 20, y);
      
      // Little seal circles
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
    
    // 9. Fine Print Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text("This report is processed and generated electronically via TaleemiDunya SaaS platform. No manual signing is required where digital stamp is present.", pageWidth / 2, pageHeight - 11, { align: "center" });
    doc.text("System Reference ID: " + `td_sec_${selectedStudentId.slice(0, 8)}_${selectedExamId.slice(0, 6)}`, pageWidth / 2, pageHeight - 8, { align: "center" });

    const sanitizedName = selectedStudent.name.replace(/\s+/g, "_");
    const sanitizedExam = selectedExamTitle.replace(/\s+/g, "_");
    doc.save(`ReportCard_${sanitizedName}_${sanitizedExam}.pdf`);
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!newExam.title) return;
    try {
      await addDoc(collection(db, 'exams'), {
        ...newExam,
        schoolId: userData?.schoolId || 'default-school',
        createdAt: serverTimestamp()
      });
      alert('Exam created successfully!');
      setNewExam({ title: '', date: new Date().toISOString().split('T')[0], classes: '10', status: 'Upcoming' });
      setActiveTab('list');
      fetchExams();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenMark = async (exam) => {
    setSelectedExam(exam);
    setSelectedClass(exam.classes || '10');
    setLoading(true);
    try {
      const studs = await getRecords('students', userData?.schoolId || 'default-school', [
        { field: 'class', operator: '==', value: exam.classes || '10' }
      ]);
      setStudents(studs.map(s => ({ ...s, totalMarks: 100, obtainedMarks: '' })));
      setActiveTab('mark');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMarks = async () => {
    setSaving(true);
    try {
      const promises = students.map(s => {
        const resultId = `${s.id}_${selectedExam.id}_${selectedSubject}`;
        return setDoc(doc(db, 'results', resultId), {
          studentId: s.id,
          studentName: s.name,
          examId: selectedExam.id,
          examTitle: selectedExam.title,
          subject: selectedSubject,
          totalMarks: Number(s.totalMarks),
          obtainedMarks: Number(s.obtainedMarks),
          schoolId: userData?.schoolId || 'default-school',
          updatedAt: new Date()
        });
      });
      await Promise.all(promises);
      alert('Marks saved successfully!');
      setActiveTab('list');
      fetchExams();
    } catch (err) {
      console.error(err);
      alert('Error saving marks');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary-400 to-indigo-500 bg-clip-text text-transparent">
            Marks & Exams Portal
          </h1>
          <p className="text-dark-muted mt-1 text-sm">Design classroom tests, assign grades, and publish reports.</p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'create' || activeTab === 'mark' ? (
            <button 
              onClick={() => setActiveTab('list')}
              className="premium-button-secondary py-2 px-4 text-xs font-black uppercase tracking-wider"
            >
              Back to List
            </button>
          ) : activeTab === 'list' ? (
            <button 
              onClick={() => setActiveTab('create')}
              className="premium-button-primary flex items-center gap-2"
            >
              <Plus size={18} />
              <span>Create Exam / Test</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Tab Navigation Row */}
      <div className="flex gap-2 border-b border-dark-border pb-px">
        {[
          { id: 'list', label: 'Examinations Directory' },
          { id: 'results', label: 'Dynamic Result Cards' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => {
              if (tab.id === 'results') {
                setActiveTab('results');
              } else {
                setActiveTab('list');
              }
            }}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${
              (activeTab === 'list' || activeTab === 'create' || activeTab === 'mark') && tab.id === 'list' 
                ? 'text-primary-400' 
                : activeTab === tab.id ? 'text-primary-400' : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            {tab.label}
            {((activeTab === 'list' || activeTab === 'create' || activeTab === 'mark') && tab.id === 'list') && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-400 to-indigo-500 rounded-full" />
            )}
            {activeTab === tab.id && tab.id === 'results' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-400 to-indigo-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: LISTING WORKFLOW */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-6 bg-primary-500/5 border-primary-500/20">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 rounded-2xl bg-primary-500/10 text-primary-500"><ClipboardCheck size={24} /></div>
                <h3 className="font-bold">Total Tests</h3>
              </div>
              <p className="text-3xl font-black">{exams.length}</p>
            </GlassCard>
            <GlassCard className="p-6 bg-green-500/5 border-green-500/20">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 rounded-2xl bg-green-500/10 text-green-500"><ShieldCheck size={24} /></div>
                <h3 className="font-bold">Graded / Published</h3>
              </div>
              <p className="text-3xl font-black text-green-500">{exams.filter(e => e.status === 'Completed').length}</p>
            </GlassCard>
            <GlassCard className="p-6 bg-orange-500/5 border-orange-500/20">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500"><Calendar size={24} /></div>
                <h3 className="font-bold">Pending Tests</h3>
              </div>
              <p className="text-3xl font-black text-orange-500">{exams.filter(e => e.status === 'Upcoming').length}</p>
            </GlassCard>
          </div>

          <GlassCard className="p-6">
            <h2 className="text-xl font-bold mb-6">Examination Registry</h2>
            {loading ? (
              <div className="text-center py-10 text-dark-muted">Loading exams...</div>
            ) : exams.length === 0 ? (
              <div className="text-center py-10 text-dark-muted">No exams created yet.</div>
            ) : (
              <div className="space-y-4">
                {exams.map(exam => (
                  <div key={exam.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 border border-dark-border rounded-xl hover:border-primary-500/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-dark-hover flex flex-col items-center justify-center font-bold text-xs text-primary-400 font-mono border border-dark-border">
                        {new Date(exam.date).getDate()} {new Date(exam.date).toLocaleString('default', { month: 'short' })}
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-primary-400 transition-colors">{exam.title}</h4>
                        <div className="flex gap-3 text-xs text-dark-muted mt-1">
                          <span className="flex items-center gap-1"><Users size={12} /> Class {exam.classes}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${exam.status === 'Completed' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>{exam.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 md:mt-0">
                      <button 
                        onClick={() => handleOpenMark(exam)}
                        className="px-4 py-2 bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white transition-all text-xs font-black uppercase tracking-wider rounded-xl border border-primary-500/20"
                      >
                        Enter Marks
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* TAB 2: CREATE EXAM FORM */}
      {activeTab === 'create' && (
        <GlassCard className="p-8 max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Award className="text-primary-500" /> Create New Exam / Test</h2>
          <form onSubmit={handleCreateExam} className="space-y-5">
            <div>
              <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Test Title</label>
              <input 
                type="text" 
                placeholder="Monthly Test - May" 
                value={newExam.title} 
                onChange={(e) => setNewExam(p => ({ ...p, title: e.target.value }))}
                className="w-full premium-input"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Class</label>
                <select 
                  value={newExam.classes} 
                  onChange={(e) => setNewExam(p => ({ ...p, classes: e.target.value }))}
                  className="w-full premium-input bg-dark-card"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(c => <option key={c} value={c}>{c} Grade</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Date</label>
                <input 
                  type="date" 
                  value={newExam.date} 
                  onChange={(e) => setNewExam(p => ({ ...p, date: e.target.value }))}
                  className="w-full premium-input"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Status</label>
              <select 
                value={newExam.status} 
                onChange={(e) => setNewExam(p => ({ ...p, status: e.target.value }))}
                className="w-full premium-input bg-dark-card"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed / Graded</option>
              </select>
            </div>
            <button type="submit" className="w-full premium-button-primary py-3 mt-4">
              Publish Examination
            </button>
          </form>
        </GlassCard>
      )}

      {/* TAB 3: GRADING PORTAL */}
      {activeTab === 'mark' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <GlassCard className="p-6 h-fit space-y-4">
            <h3 className="font-bold flex items-center gap-2 border-b border-dark-border pb-3"><Award size={18} className="text-primary-500" /> Mark Config</h3>
            <div>
              <label className="text-[10px] font-black uppercase text-dark-muted block mb-1.5">Subject</label>
              <select 
                value={selectedSubject} 
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full premium-input bg-dark-card"
              >
                {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Urdu', 'Islamiat'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-dark-muted">Grading marks for <strong className="text-white">{selectedExam?.title}</strong> in Class <strong className="text-white">{selectedClass}</strong>.</p>
            </div>
          </GlassCard>

          <GlassCard className="lg:col-span-3 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Marks Entry Ledger</h3>
              <button 
                onClick={handleSaveMarks}
                disabled={saving || students.length === 0}
                className="premium-button-primary"
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Results'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                    <th className="pb-4 px-4">Roll No</th>
                    <th className="pb-4 px-4">Student Name</th>
                    <th className="pb-4 px-4 text-center">Total Marks</th>
                    <th className="pb-4 px-4 text-center">Obtained Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {students.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 font-mono text-sm">{student.rollNumber || 'N/A'}</td>
                      <td className="py-4 px-4 font-bold text-sm">{student.name}</td>
                      <td className="py-4 px-4 text-center">
                        <input 
                          type="number" 
                          value={student.totalMarks} 
                          onChange={(e) => {
                            const copy = [...students];
                            copy[idx].totalMarks = e.target.value;
                            setStudents(copy);
                          }}
                          className="w-20 text-center premium-input py-1.5"
                        />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <input 
                          type="number" 
                          placeholder="Marks"
                          value={student.obtainedMarks} 
                          onChange={(e) => {
                            const copy = [...students];
                            copy[idx].obtainedMarks = e.target.value;
                            setStudents(copy);
                          }}
                          className="w-20 text-center premium-input border-primary-500/30 py-1.5"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 4: RESULT CARD GENERATOR */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* Selectors card */}
          <GlassCard className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Class selection */}
              <div>
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest mb-2 block">
                  1. Select Grade/Class
                </label>
                <select
                  value={cardSelectedClass}
                  onChange={(e) => setCardSelectedClass(e.target.value)}
                  className="w-full premium-input bg-dark-card py-2.5"
                >
                  {classesList.length === 0 ? (
                    <option value="">No Active Classes Found</option>
                  ) : (
                    classesList.map(c => (
                      <option key={c} value={c}>{getClassDisplayName(c)}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Student selection */}
              <div>
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest mb-2 block">
                  2. Select Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={handleStudentChange}
                  disabled={studentsList.length === 0}
                  className="w-full premium-input bg-dark-card py-2.5"
                >
                  {studentsList.length === 0 ? (
                    <option value="">No Students in this Class</option>
                  ) : (
                    studentsList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.rollNumber ? `(Roll No: ${s.rollNumber})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Exam selection */}
              <div>
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest mb-2 block">
                  3. Select Examination Term
                </label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  disabled={uniqueExams.length === 0}
                  className="w-full premium-input bg-dark-card py-2.5"
                >
                  {uniqueExams.length === 0 ? (
                    <option value="">No exam records graded yet</option>
                  ) : (
                    uniqueExams.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.title}</option>
                    ))
                  )}
                </select>
              </div>

            </div>
          </GlassCard>

          {/* Roster detail and Report previewer */}
          {fetchingResults ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <p className="text-dark-muted text-xs font-bold uppercase tracking-widest mt-4">Compiling scores...</p>
            </div>
          ) : selectedStudentId && uniqueExams.length > 0 && filteredMarks.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Quick Stats & Customizer */}
              <div className="space-y-6">
                {/* Performance score card */}
                <GlassCard className="p-6 text-center space-y-4">
                  <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-tr from-primary-500/20 to-indigo-500/20 border-2 border-primary-500/40 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-black text-white">{stats.percentage}%</p>
                      <p className="text-[9px] uppercase tracking-widest font-black text-primary-400">Score</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-black text-xl text-white">{selectedStudent?.name}</h4>
                    <p className="text-[10px] text-dark-muted uppercase font-bold tracking-widest mt-0.5">
                      Class Roll: {selectedStudent?.rollNumber || 'N/A'}
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

                  {/* Status indicator */}
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

                {/* Dynamic Result Card Customizer Sidebar */}
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

                  {/* Custom Titles and Headers inputs */}
                  <div className="space-y-3 pt-2 border-t border-dark-border/40">
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-black text-dark-muted block mb-1">3. Custom School Title</label>
                      <input 
                        type="text" 
                        value={cardDesign.customSchoolName}
                        onChange={(e) => setCardDesign(p => ({ ...p, customSchoolName: e.target.value }))}
                        className="w-full premium-input py-1.5 px-3 text-xs"
                        placeholder="Enter school name..."
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest font-black text-dark-muted block mb-1">4. Report Subtitle</label>
                      <input 
                        type="text" 
                        value={cardDesign.customSubtitle}
                        onChange={(e) => setCardDesign(p => ({ ...p, customSubtitle: e.target.value }))}
                        className="w-full premium-input py-1.5 px-3 text-xs"
                        placeholder="Enter report subtitle..."
                      />
                    </div>
                  </div>

                  {/* Display toggle configurations */}
                  <div className="space-y-2.5 pt-2 border-t border-dark-border/40">
                    <label className="text-[9px] uppercase tracking-widest font-black text-dark-muted block">5. Show/Hide Elements</label>
                    <div className="space-y-2 text-xs">
                      <label className="flex items-center gap-2.5 cursor-pointer text-dark-text hover:text-white transition-colors">
                        <input 
                          type="checkbox" 
                          checked={cardDesign.showGpa}
                          onChange={(e) => setCardDesign(p => ({ ...p, showGpa: e.target.checked }))}
                          className="rounded border-dark-border bg-dark-card text-primary-500 focus:ring-0 focus:ring-offset-0"
                        />
                        <span>Include GPA & Grading</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer text-dark-text hover:text-white transition-colors">
                        <input 
                          type="checkbox" 
                          checked={cardDesign.showRemarks}
                          onChange={(e) => setCardDesign(p => ({ ...p, showRemarks: e.target.checked }))}
                          className="rounded border-dark-border bg-dark-card text-primary-500 focus:ring-0 focus:ring-offset-0"
                        />
                        <span>Include Dynamic Feedback</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer text-dark-text hover:text-white transition-colors">
                        <input 
                          type="checkbox" 
                          checked={cardDesign.showSignatures}
                          onChange={(e) => setCardDesign(p => ({ ...p, showSignatures: e.target.checked }))}
                          className="rounded border-dark-border bg-dark-card text-primary-500 focus:ring-0 focus:ring-offset-0"
                        />
                        <span>Include Signature Blocks</span>
                      </label>
                    </div>
                  </div>
                </GlassCard>

                {/* Teacher feedback remarks card */}
                {cardDesign.showRemarks && (
                  <GlassCard className="p-6">
                    <h4 className="font-bold text-xs uppercase tracking-widest text-dark-muted mb-3 flex items-center gap-2">
                      <TrendingUp size={14} className="text-primary-400" />
                      <span>Teacher evaluation remarks</span>
                    </h4>
                    <p className="text-sm italic text-dark-text leading-relaxed">
                      "{stats.remarks}"
                    </p>
                  </GlassCard>
                )}
              </div>

              {/* Right Column: Visual Report Card preview */}
              <div className="lg:col-span-2 space-y-6">
                <GlassCard 
                  className="p-8 space-y-8 bg-gradient-to-b from-dark-card to-dark-bg text-dark-text relative overflow-hidden transition-all duration-500 border hover:border-primary-500/20 shadow-2xl" 
                  id="printable-result-card"
                  style={{ borderLeft: `6px solid ${cardDesign.themeColor}` }}
                >
                  {/* Premium Subtle Watermark (Academic Seal) */}
                  <div className="absolute inset-0 pointer-events-none opacity-3 flex items-center justify-center select-none">
                    <svg width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" style={{ color: cardDesign.themeColor }}>
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>

                  {/* Premium Top Accent Glow Line */}
                  {cardDesign.layoutStyle === 'modern' && (
                    <div 
                      className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-white/50 to-transparent" 
                      style={{ backgroundColor: cardDesign.themeColor }}
                    />
                  )}

                  {/* Dynamic 3D Floating Achievement Badge (Honor Seal) */}
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
                      ) : stats.percentage >= 70 ? (
                        <div className="relative group flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20 border border-indigo-300/30 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                            <Award className="text-white w-8 h-8" />
                          </div>
                          <span className="text-[8px] mt-1 font-black uppercase tracking-widest text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/20">Merit Pass</span>
                        </div>
                      ) : (
                        <div className="relative group flex flex-col items-center">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 via-emerald-500 to-emerald-600 p-0.5 shadow-lg shadow-emerald-500/10 border border-emerald-300/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                            <CheckCircle className="text-white w-7 h-7" />
                          </div>
                          <span className="text-[8px] mt-1 font-black uppercase tracking-widest text-green-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-green-500/20">Pass</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Logo and Letterhead */}
                  <div className="flex items-start justify-between border-b border-dark-border/60 pb-6 pr-20">
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden border border-white/10" style={{ backgroundColor: `${cardDesign.themeColor}15` }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
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

                  {/* Modern Student Profile Details Card Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white/5 border border-dark-border/40 rounded-2xl flex items-center gap-3">
                      <div className="p-2.5 rounded-xl text-primary-400 bg-primary-500/10"><User size={18} /></div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-dark-muted">Student Name</p>
                        <p className="font-bold text-sm text-white mt-0.5">{selectedStudent?.name}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 border border-dark-border/40 rounded-2xl flex items-center gap-3">
                      <div className="p-2.5 rounded-xl text-indigo-400 bg-indigo-500/10"><Users size={18} /></div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-dark-muted">Parent / Father Name</p>
                        <p className="font-bold text-sm text-white mt-0.5">{selectedStudent?.fatherName || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 border border-dark-border/40 rounded-2xl flex items-center gap-3">
                      <div className="p-2.5 rounded-xl text-purple-400 bg-purple-500/10"><GraduationCap size={18} /></div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-dark-muted">Class & Grade</p>
                        <p className="font-bold text-sm text-white mt-0.5">{getClassDisplayName(cardSelectedClass)}</p>
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
                        <p className="font-bold text-sm text-white font-mono mt-0.5">{selectedStudent?.rollNumber || 'N/A'}</p>
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

                  {/* Marks List Table & Progress Indicators */}
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
                              <tr key={row.id} className="hover:bg-white/5 transition-all duration-150">
                                <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isFailed ? '#ef4444' : cardDesign.themeColor }} />
                                  {row.subject}
                                </td>
                                <td className="py-4 px-8 min-w-[200px]">
                                  <div className="flex items-center gap-4">
                                    <div className="w-full bg-dark-bg h-2 rounded-full overflow-hidden border border-dark-border/50">
                                      <div 
                                        className="h-full rounded-full bg-gradient-to-r transition-all duration-1000"
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

                  {/* Upgraded Dashboard Summary Widget Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 bg-gradient-to-b from-dark-hover to-dark-bg border border-dark-border/80 rounded-2xl relative overflow-hidden group hover:border-primary-500/20 transition-all duration-300">
                      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:scale-110 transition-transform"><FileText size={48} /></div>
                      <p className="text-[9px] text-dark-muted uppercase font-black tracking-widest">Total Obtained</p>
                      <p className="text-2xl font-black text-white mt-1.5 flex items-baseline gap-1">
                        {stats.obtained}
                        <span className="text-xs font-normal text-dark-muted">/ {stats.total}</span>
                      </p>
                      <div className="w-8 h-1 bg-primary-500 rounded-full mt-3" />
                    </div>
                    <div className="p-5 bg-gradient-to-b from-dark-hover to-dark-bg border border-dark-border/80 rounded-2xl relative overflow-hidden group hover:border-primary-500/20 transition-all duration-300">
                      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:scale-110 transition-transform"><TrendingUp size={48} /></div>
                      <p className="text-[9px] text-dark-muted uppercase font-black tracking-widest">Aggregate Marks</p>
                      <p className="text-2xl font-black mt-1.5" style={{ color: cardDesign.themeColor }}>
                        {stats.percentage}%
                      </p>
                      <div className="w-8 h-1 rounded-full mt-3" style={{ backgroundColor: cardDesign.themeColor }} />
                    </div>
                    <div className="p-5 bg-gradient-to-b from-dark-hover to-dark-bg border border-dark-border/80 rounded-2xl relative overflow-hidden group hover:border-primary-500/20 transition-all duration-300">
                      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:scale-110 transition-transform"><Award size={48} /></div>
                      <p className="text-[9px] text-dark-muted uppercase font-black tracking-widest">Letter Grade</p>
                      <p className="text-2xl font-black text-white mt-1.5">
                        {stats.grade}
                      </p>
                      <div className="w-8 h-1 bg-purple-500 rounded-full mt-3" />
                    </div>
                    <div className="p-5 bg-gradient-to-b from-dark-hover to-dark-bg border border-dark-border/80 rounded-2xl relative overflow-hidden group hover:border-primary-500/20 transition-all duration-300">
                      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:scale-110 transition-transform"><CheckCircle size={48} /></div>
                      <p className="text-[9px] text-dark-muted uppercase font-black tracking-widest">Decision status</p>
                      <p className={`text-2xl font-black mt-1.5 uppercase tracking-wide ${
                        stats.status === 'Pass' ? 'text-green-400' : 'text-red-500'
                      }`}>
                        {stats.status}
                      </p>
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

                  {/* Official Signature Lines */}
                  {cardDesign.showSignatures && (
                    <div className="flex items-center justify-between pt-10 text-[10px] text-dark-muted">
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
          ) : (
            <GlassCard className="p-16 text-center text-dark-muted">
              <div className="p-4 bg-dark-hover rounded-full inline-block mb-4 text-dark-muted">
                <FileText size={48} />
              </div>
              <h3 className="text-lg font-bold text-white">No Results Found</h3>
              <p className="max-w-md mx-auto mt-2 text-sm">
                {!selectedStudentId 
                  ? "Select a class and a student to verify their academic score card."
                  : "This student does not have any exam scores uploaded yet. Go to examinations directory and enter marks to generate their card!"
                }
              </p>
            </GlassCard>
          )}
          
        </div>
      )}
    </div>
  );
};

export default ExamsAndMarks;
