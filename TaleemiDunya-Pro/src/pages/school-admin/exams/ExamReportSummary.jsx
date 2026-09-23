import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, FileText, ArrowLeft, RefreshCw, Printer, Download, Eye, Layers, Calendar, Filter, Sparkles
} from 'lucide-react';
import GlassCard from '../../../components/common/GlassCard';
import { useAuth } from '../../../context/AuthContext';
import { useSchool } from '../../../context/SchoolContext';
import { getRecords } from '../../../services/db';
import { getExams, getGradingRules, calculateGrade } from '../../../services/examService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

const ExamReportSummary = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { schoolClasses, schoolData } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  const previewRef = useRef(null);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [reportType, setReportType] = useState('WITH_MARKS'); // 'WITH_MARKS' | 'WITHOUT_MARKS'
  
  const [dbClasses, setDbClasses] = useState([]);
  const [termsList, setTermsList] = useState([]);
  const [masterFiles, setMasterFiles] = useState([]);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [gradingRules, setGradingRules] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [schoolId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [examsData, rulesData, masterFilesData, resultsData, studsData, classesDocData] = await Promise.all([
        getExams(schoolId),
        getGradingRules(schoolId),
        getRecords('examMasterFiles', schoolId),
        getRecords('results', schoolId),
        getRecords('students', schoolId),
        getRecords('classes', schoolId)
      ]);

      setExams(examsData || []);
      setGradingRules(rulesData || []);
      setMasterFiles(masterFilesData || []);
      setResults(resultsData || []);
      setStudents(studsData || []);

      // 1. Extract ONLY actual existing classes from context & DB
      const contextClasses = (schoolClasses || []).map(c => c.name || c.className).filter(Boolean);
      const createdClasses = (classesDocData || []).map(c => c.name || c.className).filter(Boolean);
      const studentClasses = (studsData || []).map(s => s.class || s.className).filter(Boolean);
      const masterClasses = (masterFilesData || []).map(m => m.className || m.class).filter(Boolean);
      const examClasses = (examsData || []).flatMap(e => e.classes || [e.class || e.className]).filter(Boolean);

      const existingClassesList = Array.from(new Set([
        ...contextClasses,
        ...createdClasses,
        ...studentClasses,
        ...masterClasses,
        ...examClasses
      ])).filter(Boolean).sort();

      setDbClasses(existingClassesList);
      if (existingClassesList.length > 0) {
        setSelectedClass(existingClassesList[0]);
      }

      // 2. Extract ONLY actual existing terms/exams created in school
      const dbExamNames = (examsData || []).map(e => e.examName || e.title || e.name).filter(Boolean);
      const masterTermNames = (masterFilesData || []).map(m => m.termName || m.term || m.examName).filter(Boolean);
      const resultTermNames = (resultsData || []).map(r => r.examName || r.term).filter(Boolean);

      const createdTerms = Array.from(new Set([
        ...dbExamNames,
        ...masterTermNames,
        ...resultTermNames
      ])).filter(Boolean);

      setTermsList(createdTerms);
      if (createdTerms.length > 0) {
        setSelectedTerm(createdTerms[0]);
      }
    } catch (err) {
      console.error("Error loading initial report data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Extract active subjects for a given class and specific term name
  const getActiveSubjectsForTerm = (targetTermName) => {
    const targetCls = String(selectedClass || '').trim().toLowerCase();
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
      const classMatches = rCls === targetCls || rCls.includes(targetCls) || classStudentIds.includes(r.studentId);
      
      return termMatches && classMatches;
    });

    // 2. Try to get subjects from master file
    const mDoc = masterFiles.find(m => {
      const mClass = String(m.className || m.class || '').trim().toLowerCase();
      const mTerm = String(m.termName || m.term || m.examName || '').trim().toLowerCase();
      return (mClass === targetCls || mClass.includes(targetCls) || targetCls.includes(mClass)) &&
             (mTerm === targetT || mTerm.includes(targetT) || targetT.includes(mTerm));
    });

    if (mDoc?.subjects?.length > 0) {
      return mDoc.subjects.map(s => ({
        name: s.subjectName || s.name,
        totalMarks: Number(s.totalMarks || s.maxMarks || 100),
        passMarks: Number(s.passMarks || s.passingMarks || Math.round((s.totalMarks || 100) * 0.33))
      }));
    }

    // 3. Try to get subjects from Exam definition
    const ex = exams.find(e => {
      const eName = String(e.examName || e.title || e.name || e.id || '').trim().toLowerCase();
      return eName === targetT || eName.includes(targetT) || targetT.includes(eName);
    });

    if (ex?.subjects?.length > 0) {
      const classSubjs = ex.subjects.filter(s => {
        const sCls = String(s.classId || s.className || '').trim().toLowerCase();
        
        if (sCls === targetCls || sCls.includes(targetCls) || targetCls.includes(sCls)) return true;
        
        if (!sCls) {
           const sName = String(s.subjectName || s.name || '').trim().toLowerCase();
           return resForClass.some(r => {
             const rName = String(r.subject || r.subjectName || '').trim().toLowerCase();
             return rName === sName;
           });
        }
        return false;
      });
      if (classSubjs.length > 0) {
        return classSubjs.map(s => ({
          name: s.subjectName || s.name,
          totalMarks: Number(s.totalMarks || s.maxMarks || 100),
          passMarks: Number(s.passMarks || s.passingMarks || Math.round((s.totalMarks || 100) * 0.33))
        }));
      }
    }

    // 4. Fallback to extracting from results
    const resSubjNames = Array.from(new Set(resForClass.map(r => r.subject || r.subjectName).filter(Boolean)));
    if (resSubjNames.length > 0) {
      return resSubjNames.map(name => {
        const sampleRes = resForClass.find(r => (r.subject || r.subjectName) === name);
        const max = Number(sampleRes?.totalMarks || 25);
        const pass = Number(sampleRes?.passingMarks || sampleRes?.passMarks || Math.round(max * 0.33));
        return { name, totalMarks: max, passMarks: pass };
      });
    }

    // 5. Hardcoded fallback
    return [
      { name: 'Drawing', totalMarks: 25, passMarks: 8 },
      { name: 'English', totalMarks: 25, passMarks: 8 },
      { name: 'G.K + Reader', totalMarks: 25, passMarks: 8 },
      { name: 'Islamiat', totalMarks: 25, passMarks: 8 },
      { name: 'Math', totalMarks: 25, passMarks: 8 },
      { name: 'Urdu', totalMarks: 25, passMarks: 8 }
    ];
  };

  // Compute student results for report
  const activeSubjects = getActiveSubjectsForTerm(selectedTerm);

  const targetStudents = students.filter(s => {
    const sCls = String(s.class || s.className || '').trim().toLowerCase();
    const targetCls = String(selectedClass || '').trim().toLowerCase();
    return sCls === targetCls || sCls.includes(targetCls) || targetCls.includes(sCls);
  }).sort((a, b) => {
    const rollA = parseInt(a.rollNumber || a.rollNo || '0', 10);
    const rollB = parseInt(b.rollNumber || b.rollNo || '0', 10);
    return rollA - rollB;
  });

  const mDoc = masterFiles.find(m => {
    const mClass = String(m.className || m.class || '').trim().toLowerCase();
    const sClass = String(selectedClass || '').trim().toLowerCase();
    const mTerm = String(m.termName || m.term || m.examName || '').trim().toLowerCase();
    const sTerm = String(selectedTerm || '').trim().toLowerCase();
    return (mClass === sClass || mClass.includes(sClass)) && (mTerm === sTerm || mTerm.includes(sTerm));
  });

  const ex = exams.find(e => {
    const eName = String(e.examName || e.title || e.name || e.id || '').trim().toLowerCase();
    const sTerm = String(selectedTerm || '').trim().toLowerCase();
    return eName === sTerm || eName.includes(sTerm) || sTerm.includes(eName);
  });

  const reportRows = targetStudents.map((stud, idx) => {
    const studentRes = results.filter(r => 
      r.studentId === stud.id && (
        r.examName === selectedTerm || r.term === selectedTerm || (ex && r.examId === ex.id)
      )
    );

    let totalMaxMarks = 0;
    let totalObtainedMarks = 0;
    let hasFailed = false;

    const subjMap = {};

    activeSubjects.forEach(subj => {
      const subName = subj.name;
      const max = Number(subj.totalMarks || 100);
      const pass = Number(subj.passMarks || Math.round(max * 0.33));
      totalMaxMarks += max;

      let rawVal = null;
      if (mDoc?.marksGrid?.[stud.id]?.[subName] !== undefined && mDoc.marksGrid[stud.id][subName] !== null) {
        rawVal = mDoc.marksGrid[stud.id][subName];
      } else {
        const r = studentRes.find(item => item.subject === subName || item.subjectName === subName);
        if (r && r.obtainedMarks !== undefined && r.obtainedMarks !== null) {
          rawVal = r.obtainedMarks;
        }
      }

      if (reportType === 'WITHOUT_MARKS') {
        // WITHOUT MARKS: Cells MUST BE EMPTY ("")
        subjMap[subName] = '';
      } else {
        // WITH MARKS: Check if mark is present
        if (rawVal === 'A' || rawVal === 'ABSENT' || rawVal === 'absent' || rawVal === 'ABS') {
          subjMap[subName] = 'ABS';
          hasFailed = true;
        } else if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
          const num = Number(rawVal);
          if (!isNaN(num)) {
            subjMap[subName] = num % 1 === 0 ? String(num) : num.toFixed(1);
            totalObtainedMarks += num;
            if (num < pass) hasFailed = true;
          } else {
            subjMap[subName] = String(rawVal);
          }
        } else {
          subjMap[subName] = '—';
        }
      }
    });

    if (reportType === 'WITHOUT_MARKS') {
      return {
        sNo: (idx + 1).toString(),
        rollNo: stud.rollNumber || stud.rollNo || '—',
        name: stud.name || stud.studentName || '—',
        fatherName: stud.fatherName || '—',
        subjMap,
        totalMax: '',
        totalObt: '',
        percentage: '',
        grade: '',
        status: ''
      };
    } else {
      const percentage = totalMaxMarks > 0 ? Math.round(((totalObtainedMarks / totalMaxMarks) * 100) * 10) / 10 : 0;
      const gradeObj = calculateGrade(percentage, 100, gradingRules);
      const gradeStr = typeof gradeObj === 'object' ? (gradeObj?.grade || 'F') : (gradeObj || 'F');
      const statusStr = hasFailed || percentage < 33 ? 'FAIL' : 'PASS';

      return {
        sNo: (idx + 1).toString(),
        rollNo: stud.rollNumber || stud.rollNo || '—',
        name: stud.name || stud.studentName || '—',
        fatherName: stud.fatherName || '—',
        subjMap,
        totalMax: totalMaxMarks,
        totalObt: totalObtainedMarks,
        percentage: `${percentage}%`,
        grade: gradeStr,
        status: statusStr
      };
    }
  });

  // Convert image URL to Data URL for PDF logo rendering
  const getBase64ImageFromUrl = async (imageUrl) => {
    if (!imageUrl) return null;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedClass) {
      return Swal.fire({ title: 'Class Required', text: 'Please select a Class.', icon: 'warning', confirmButtonColor: '#3b82f6' });
    }
    if (!selectedTerm) {
      return Swal.fire({ title: 'Term Required', text: 'Please select a Term.', icon: 'warning', confirmButtonColor: '#3b82f6' });
    }

    setGenerating(true);
    try {
      const schoolName = schoolData?.schoolName || schoolData?.name || userData?.schoolName || 'TaleemiDunya Model School';
      const logoUrl = schoolData?.branding?.logo || schoolData?.logo || schoolData?.logoUrl || schoolData?.schoolLogo || userData?.schoolLogo || userData?.logo;
      const schoolAddress = schoolData?.address || userData?.schoolAddress || 'Official Academic Examination Center';
      const schoolPhone = schoolData?.phone || schoolData?.contactPhone || '';

      const logoBase64 = logoUrl ? await getBase64ImageFromUrl(logoUrl) : null;

      const principalRule = schoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal');
      const principalSignatureUrl = schoolData?.signatureSettings?.principalSignatureUrl || principalRule?.signatureUrl || null;
      const teacherRule = schoolData?.signatureSettings?.rules?.find(r => r.type === 'Teacher' && String(r.class) === String(selectedClass));
      const teacherSignatureUrl = teacherRule?.signatureUrl || null;

      const principalB64 = principalSignatureUrl ? await getBase64ImageFromUrl(principalSignatureUrl) : null;
      const teacherB64 = teacherSignatureUrl ? await getBase64ImageFromUrl(teacherSignatureUrl) : null;

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Top Decorative Line
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 5, 'F');

      let startY = 12;
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 12, 10, 20, 20);
        } catch {
          // ignore logo error fallback
        }
      }

      // Header Text
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(schoolName.toUpperCase(), pageWidth / 2, startY + 2, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`${schoolAddress} ${schoolPhone ? ' | Tel: ' + schoolPhone : ''}`, pageWidth / 2, startY + 8, { align: 'center' });

      // Title Bar Box
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(12, startY + 12, pageWidth - 24, 14, 2, 2, 'F');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      const titleText = reportType === 'WITH_MARKS'
        ? `CLASS TERM REPORT (DETAILED MARKS SUMMARY)`
        : `CLASS TERM DIRECTORY (BLANK EVALUATION SHEET)`;
      doc.text(titleText, pageWidth / 2, startY + 19, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      const subInfoY = startY + 23;
      doc.text(`CLASS: ${selectedClass.toUpperCase()}`, 16, subInfoY);
      doc.text(`TERM / EXAM: ${selectedTerm.toUpperCase()}`, pageWidth / 2, subInfoY, { align: 'center' });
      doc.text(`DATE GENERATED: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 16, subInfoY, { align: 'right' });

      // Table Headers (Without Sec column)
      const subjHeaders = activeSubjects.map(s => s.name);
      const head = [
        ['S#', 'Roll', 'Student Name', 'Father Name', ...subjHeaders, 'Total', 'Obtained', '%age', 'Grade', 'Result']
      ];

      const body = reportRows.map(r => [
        r.sNo,
        r.rollNo,
        r.name,
        r.fatherName,
        ...activeSubjects.map(s => r.subjMap[s.name] || ''),
        r.totalMax,
        r.totalObt,
        r.percentage,
        r.grade,
        r.status
      ]);

      autoTable(doc, {
        startY: startY + 28,
        margin: { left: 12, right: 12 },
        head,
        body,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.8, halign: 'center' },
        columnStyles: {
          2: { halign: 'left', fontStyle: 'bold' },
          3: { halign: 'left' }
        },
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5
        },
        didParseCell: (data) => {
          if (reportType === 'WITH_MARKS' && data.section === 'body' && data.column.index === head[0].length - 1) {
            if (data.cell.raw === 'FAIL') {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.raw === 'PASS') {
              data.cell.styles.textColor = [16, 185, 129];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      // Footer Signatures
      const finalY = Math.min(doc.lastAutoTable.finalY + 25, pageHeight - 30);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.4);
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      if (teacherB64) doc.addImage(teacherB64, 'PNG', 35, finalY - 15, 30, 12);
      doc.line(20, finalY, 80, finalY);
      doc.text("Class Teacher", 50, finalY + 4, { align: 'center' });

      if (principalB64) doc.addImage(principalB64, 'PNG', pageWidth - 65, finalY - 15, 30, 12);
      doc.line(pageWidth - 80, finalY, pageWidth - 20, finalY);
      doc.text("Principal Signature", pageWidth - 50, finalY + 4, { align: 'center' });

      const safeTerm = selectedTerm.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Class_Term_Report_${selectedClass}_${safeTerm}.pdf`);

      Swal.fire({
        title: 'Report Downloaded!',
        text: `Class Term Report PDF for Class ${selectedClass} (${selectedTerm}) has been downloaded successfully.`,
        icon: 'success',
        confirmButtonColor: '#3b82f6'
      });
    } catch (err) {
      console.error("PDF Error:", err);
      Swal.fire({ title: 'Error', text: 'Failed to generate PDF.', icon: 'error', confirmButtonColor: '#3b82f6' });
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const schoolName = schoolData?.schoolName || schoolData?.name || userData?.schoolName || 'SMART ANGELS GRAMMAR SCHOOL';
  const logoUrl = schoolData?.branding?.logo || schoolData?.logo || schoolData?.logoUrl || schoolData?.schoolLogo || userData?.schoolLogo || userData?.logo;
  const schoolAddress = schoolData?.address || userData?.schoolAddress || 'Plot #505 Area 36/C Korangi #5, Karachi | Tel: +92 313 2202569';

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4 print:space-y-0 print:p-0 print:m-0 print:animate-none print:transform-none print:static">
      
      {/* Dynamic Print Scaling & Elegant Scrollbar */}
      <style>{`
        /* Thin elegant scrollbar for preview to prevent huge black bars */
        .preview-scroll-container::-webkit-scrollbar {
          height: 6px;
        }
        .preview-scroll-container::-webkit-scrollbar-track {
          background: #1e293b; 
          border-radius: 10px;
        }
        .preview-scroll-container::-webkit-scrollbar-thumb {
          background: #3b82f6; 
          border-radius: 10px;
        }

        @media print {
          /* Allows user to print in either Portrait or Landscape. The browser handles scaling better if we use table-layout: fixed and small font sizes */
          @page {
            margin: 5mm;
          }
          
          .printable-report-area {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .printable-report-area table {
            width: 100% !important;
            table-layout: fixed !important; 
          }
          
          .printable-report-area th, 
          .printable-report-area td {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            font-size: ${activeSubjects.length > 8 ? '8px' : '10px'} !important;
            padding: 2px 1px !important;
          }

          /* Hide scrollbar completely during print */
          .preview-scroll-container {
            overflow: visible !important;
          }
        }
      `}</style>
      {/* Top Header Banner matching system design */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-card/60 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-primary-500/10 rounded-2xl text-primary-400 border border-primary-500/20">
            <ClipboardList size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white via-dark-text to-primary-300 bg-clip-text text-transparent">
              Class Term Report Generator
            </h1>
            <p className="text-xs md:text-sm text-dark-muted font-medium mt-0.5">
              Generate, preview, and download official term performance reports
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Printer size={15} />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            onClick={handleGeneratePDF}
            disabled={generating}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary-600/30 transition-all cursor-pointer disabled:opacity-70"
          >
            {generating ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Report Configuration Card */}
      <GlassCard className="p-6 border-white/10 shadow-xl space-y-4">
        
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <div className="p-2 bg-primary-500/10 rounded-xl text-primary-400 border border-primary-500/20">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Report Configuration</h2>
            <p className="text-xs text-dark-muted font-medium">Select class, term, and report style for instant live preview</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          
          {/* Select Class */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers size={13} className="text-primary-400" />
              <span>1. Select Class</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary-500 transition-colors"
            >
              {dbClasses.length > 0 ? (
                dbClasses.map((cls, idx) => (
                  <option key={idx} value={cls}>Class {cls}</option>
                ))
              ) : (
                <option value="">No existing classes found</option>
              )}
            </select>
          </div>

          {/* Select Term */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar size={13} className="text-primary-400" />
              <span>2. Select Term</span>
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary-500 transition-colors"
            >
              {termsList.length > 0 ? (
                termsList.map((term, idx) => (
                  <option key={idx} value={term}>{term}</option>
                ))
              ) : (
                <option value="">No existing terms found</option>
              )}
            </select>
          </div>

          {/* Report Type Radios */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Filter size={13} className="text-primary-400" />
              <span>3. Report Type</span>
            </label>
            <div className="flex items-center gap-5 pt-2 text-xs font-bold text-white">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="reportType"
                  value="WITH_MARKS"
                  checked={reportType === 'WITH_MARKS'}
                  onChange={() => setReportType('WITH_MARKS')}
                  className="w-4 h-4 text-primary-500 focus:ring-primary-500 border-white/20 bg-dark-bg cursor-pointer"
                />
                <span>With Marks</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="reportType"
                  value="WITHOUT_MARKS"
                  checked={reportType === 'WITHOUT_MARKS'}
                  onChange={() => setReportType('WITHOUT_MARKS')}
                  className="w-4 h-4 text-primary-500 focus:ring-primary-500 border-white/20 bg-dark-bg cursor-pointer"
                />
                <span>Without Marks</span>
              </label>
            </div>
          </div>

        </div>

      </GlassCard>

      {/* LIVE INTERACTIVE REPORT PREVIEW SHEET CONTAINER */}
      <div className="space-y-3 print:space-y-0 print:m-0 print:p-0 print:static">
        
        <div className="flex items-center justify-between text-xs font-bold text-dark-muted px-2">
          <div className="flex items-center gap-1.5 text-white">
            <Eye size={15} className="text-primary-400" />
            <span>Interactive Report Preview ({reportType === 'WITH_MARKS' ? 'With Marks' : 'Without Marks - Blank Sheet'})</span>
          </div>
          <span className="text-primary-300 bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20">
            Total Students: {reportRows.length}
          </span>
        </div>

        {/* Paper Sheet Container (Resting on dark desk) */}
        <div className="p-4 sm:p-6 bg-dark-card/40 border border-white/10 rounded-3xl backdrop-blur-md print:p-0 print:border-none print:m-0 print:bg-transparent print:backdrop-blur-none print:static">
          <div 
            id="printable-report-card" 
            ref={previewRef}
            className="printable-report-area bg-white rounded-2xl border-2 border-blue-600 shadow-2xl p-6 md:p-8 text-slate-800 space-y-5 overflow-x-auto mx-auto max-w-5xl print:max-w-none print:w-full print:mx-0 print:border-none print:shadow-none"
          >
            {/* Blue Top Stripe */}
            <div className="h-1.5 bg-blue-600 -mx-6 -mt-6 md:-mx-8 md:-mt-8 rounded-t-xl mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="w-20 h-20 flex items-center justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="School Logo" className="max-h-20 max-w-20 object-contain" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-blue-900 text-white font-black flex items-center justify-center text-xl shadow-md">
                    {schoolName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="text-center flex-1 px-4">
                <h2 className="text-xl md:text-2xl font-black text-blue-900 uppercase tracking-tight">
                  {schoolName}
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  {schoolAddress}
                </p>
              </div>

              <div className="w-20 text-right text-[10px] text-slate-400 font-mono">
                OFFICIAL REPORT
              </div>
            </div>

            {/* Report Title Bar */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center space-y-1">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-wide">
                {reportType === 'WITH_MARKS' 
                  ? 'CLASS TERM REPORT (DETAILED MARKS SUMMARY)'
                  : 'CLASS TERM DIRECTORY (BLANK EVALUATION SHEET)'}
              </h3>
              <div className="flex flex-wrap items-center justify-between text-[11px] font-bold text-slate-700 px-2 pt-1">
                <span>CLASS: {selectedClass ? selectedClass.toUpperCase() : '—'}</span>
                <span>TERM / EXAM: {selectedTerm ? selectedTerm.toUpperCase() : '—'}</span>
                <span>DATE GENERATED: {new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>

            {/* Report Table (Without Sec Column) */}
            <div className="overflow-x-auto print:overflow-visible preview-scroll-container pb-2">
              <table className="w-full text-left text-xs border-collapse border border-blue-900">
                <thead className="bg-blue-900 text-white text-[11px]">
                  <tr>
                    <th className="p-2 border border-blue-800 text-center w-8">Sr</th>
                    <th className="p-2 border border-blue-800 text-center w-14">Roll</th>
                    <th className="p-2 border border-blue-800">Student Name</th>
                    <th className="p-2 border border-blue-800">Father Name</th>

                    {/* Subject Columns */}
                    {activeSubjects.map((sub, i) => (
                      <th key={i} className="p-2 border border-blue-800 text-center">{sub.name}</th>
                    ))}

                    <th className="p-2 border border-blue-800 text-center w-14">Total</th>
                    <th className="p-2 border border-blue-800 text-center w-14">Obtained</th>
                    <th className="p-2 border border-blue-800 text-center w-12">%age</th>
                    <th className="p-2 border border-blue-800 text-center w-12">Grade</th>
                    <th className="p-2 border border-blue-800 text-center w-14">Result</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-300 text-slate-800 text-[11px]">
                  {reportRows.length > 0 ? (
                    reportRows.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2 border border-slate-300 text-center font-medium">{row.sNo}</td>
                        <td className="p-2 border border-slate-300 text-center font-bold text-slate-700">{row.rollNo}</td>
                        <td className="p-2 border border-slate-300 font-bold text-slate-900">{row.name}</td>
                        <td className="p-2 border border-slate-300 text-slate-600">{row.fatherName}</td>

                        {/* Subject Mark Cells */}
                        {activeSubjects.map((sub, i) => (
                          <td key={i} className="p-2 border border-slate-300 text-center font-semibold">
                            {row.subjMap[sub.name] !== undefined ? row.subjMap[sub.name] : ''}
                          </td>
                        ))}

                        <td className="p-2 border border-slate-300 text-center font-bold">{row.totalMax}</td>
                        <td className="p-2 border border-slate-300 text-center font-bold text-blue-700">{row.totalObt}</td>
                        <td className="p-2 border border-slate-300 text-center font-semibold">{row.percentage}</td>
                        <td className="p-2 border border-slate-300 text-center font-bold">{row.grade}</td>
                        <td className="p-2 border border-slate-300 text-center font-extrabold">
                          {reportType === 'WITH_MARKS' ? (
                            <span className={row.status === 'PASS' ? 'text-emerald-600' : 'text-red-600'}>
                              {row.status}
                            </span>
                          ) : (
                            ''
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5 + activeSubjects.length + 5} className="p-8 text-center text-slate-400 font-medium">
                        No student records found for Class {selectedClass || '—'}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Signatures Footer */}
            <div className="pt-20 print:pt-10 print:break-inside-avoid flex items-end justify-between text-xs font-bold text-slate-600 px-10 pb-8">
              <div className="flex flex-col items-center">
                {schoolData?.signatureSettings?.rules?.find(r => r.type === 'Teacher' && String(r.class) === String(selectedClass))?.signatureUrl ? (
                  <img src={schoolData.signatureSettings.rules.find(r => r.type === 'Teacher' && String(r.class) === String(selectedClass)).signatureUrl} alt="Class Teacher" className="h-10 object-contain -mb-2" />
                ) : (
                  <div className="h-8"></div>
                )}
                <div className="w-44 border-t border-slate-400 pt-1 mt-1 text-center">
                  <span>Class Teacher</span>
                </div>
              </div>

              <div className="flex flex-col items-center">
                {schoolData?.signatureSettings?.principalSignatureUrl || schoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal')?.signatureUrl ? (
                  <img src={schoolData?.signatureSettings?.principalSignatureUrl || schoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal')?.signatureUrl} alt="Principal" className="h-10 object-contain -mb-2" />
                ) : (
                  <div className="h-8"></div>
                )}
                <div className="w-44 border-t border-slate-400 pt-1 mt-1 text-center">
                  <span>Principal Signature</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default ExamReportSummary;
