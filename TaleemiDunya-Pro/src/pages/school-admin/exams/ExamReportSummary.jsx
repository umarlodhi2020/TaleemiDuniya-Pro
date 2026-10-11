import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, FileText, ArrowLeft, RefreshCw, Printer, Download, Eye, Layers, Calendar, Filter, Sparkles, FileSpreadsheet, Type, Minus, Plus
} from 'lucide-react';
import GlassCard from '../../../components/common/GlassCard';
import { useAuth } from '../../../context/AuthContext';
import { useSchool } from '../../../context/SchoolContext';
import { getRecords } from '../../../services/db';
import { getExams, getGradingRules, calculateGrade } from '../../../services/examService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { sortClasses } from '../../../utils/classSort';

const ExamReportSummary = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { schoolClasses, schoolData } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  const previewRef = useRef(null);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [reportType, setReportType] = useState('WITH_MARKS'); // 'WITH_MARKS' | 'WITHOUT_MARKS'
  
  // Custom font size for print & table preview with localStorage memory (default 12px)
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('taleemi_report_font_size');
    return saved ? parseInt(saved, 10) : 12;
  });

  useEffect(() => {
    localStorage.setItem('taleemi_report_font_size', String(fontSize));
  }, [fontSize]);

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

      const existingClassesList = sortClasses(Array.from(new Set([
        ...contextClasses,
        ...createdClasses,
        ...studentClasses,
        ...masterClasses,
        ...examClasses
      ])).filter(Boolean));

      setDbClasses(existingClassesList);
      if (existingClassesList.length > 0) {
        setSelectedClass(existingClassesList[0]);
      }

      // Extract unique terms/exam names strictly from the Exams collection
      const dbExamNames = (examsData || []).map(e => e.examName || e.title || e.name).filter(Boolean);

      const createdTerms = Array.from(new Set([...dbExamNames]));

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
          passMarks: Number(s.passMarks || s.passingMarks || Math.round((s.totalMarks || 100) * 0.33))
        }));
      }
    }

    // 5. Dynamic Fallback (No Hardcoding)
    return [];
  };

  // Compute student results for report
  const activeSubjects = getActiveSubjectsForTerm(selectedTerm);

  const targetStudents = students.filter(s => {
    const sCls = String(s.class || s.className || '').trim().toLowerCase();
    const targetCls = String(selectedClass || '').trim().toLowerCase();
    return sCls === targetCls || sCls.split(',').map(s=>s.trim()).includes(targetCls);
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
    return (mClass === sClass || mClass.split(',').map(s=>s.trim()).includes(sClass)) && (mTerm === sTerm || mTerm.includes(sTerm));
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
      const statusStr = hasFailed || percentage < 40 ? 'FAIL' : 'PASS';

      return {
        sNo: (idx + 1).toString(),
        rollNo: stud.rollNumber || stud.rollNo || '—',
        name: stud.name || stud.studentName || '—',
        fatherName: stud.fatherName || '—',
        subjMap,
        totalMax: totalMaxMarks,
        totalObt: totalObtainedMarks % 1 === 0 ? totalObtainedMarks : Number(totalObtainedMarks).toFixed(1),
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
        styles: { 
          fontSize: Math.max(6.5, Math.min(10, fontSize * 0.68)), 
          cellPadding: Math.max(1.5, Math.min(3, fontSize * 0.16)), 
          halign: 'center' 
        },
        columnStyles: {
          2: { halign: 'left', fontStyle: 'bold' },
          3: { halign: 'left' }
        },
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: Math.max(6.5, Math.min(10, fontSize * 0.68))
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

  const handleExportExcel = () => {
    try {
      if (!reportRows || reportRows.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'No Data',
          text: 'There is no report data to export for this class and term.',
          confirmButtonColor: '#3b82f6'
        });
        return;
      }

      const excelData = reportRows.map((row) => {
        const item = {
          'Sr No': row.sNo,
          'Roll No': row.rollNo,
          'Student Name': row.name,
          'Father Name': row.fatherName,
        };

        if (row.section) {
          item['Section'] = row.section;
        }

        activeSubjects.forEach((sub) => {
          item[sub.name] = row.subjMap[sub.name] !== undefined ? row.subjMap[sub.name] : '';
        });

        item['Total Marks'] = row.totalMax;
        item['Obtained Marks'] = row.totalObt;
        item['Percentage'] = row.percentage;
        item['Grade'] = row.grade;
        if (reportType === 'WITH_MARKS') {
          item['Result Status'] = row.status;
        }

        return item;
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Term Report');
      const safeClass = (selectedClass || 'Class').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeTerm = (selectedTerm || 'Term').replace(/[^a-zA-Z0-9_-]/g, '_');
      XLSX.writeFile(workbook, `Class_Term_Report_${safeClass}_${safeTerm}.xlsx`);
    } catch (err) {
      console.error('Error exporting excel:', err);
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Failed to export report to Excel.',
        confirmButtonColor: '#3b82f6'
      });
    }
  };

  const schoolName = schoolData?.schoolName || schoolData?.name || userData?.schoolName || 'Your School Name';
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

        @page {
          size: landscape;
          margin: 0;
        }

        @media print {
          @page {
            size: landscape;
            margin: 0;
          }

          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide all UI elements outside the printable report area */
          header, nav, aside, button, .no-print, [class*="no-print"], .print\\:hidden {
            display: none !important;
          }

          main {
            padding: 0 !important;
            margin: 0 !important;
          }

          .printable-report-area {
            width: 100% !important;
            max-width: 100% !important;
            padding: 4mm 6mm !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            border: 1.5px solid #1e3a8a !important;
            border-radius: 4px !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }

          .printable-report-area .report-header-banner {
            padding-bottom: 3px !important;
            border-bottom: 1px solid #cbd5e1 !important;
          }

          .printable-report-area .school-logo-img {
            max-height: 42px !important;
            max-width: 42px !important;
          }

          .printable-report-area .school-title-text {
            font-size: 15px !important;
            line-height: 1.2 !important;
            margin: 0 !important;
          }

          .printable-report-area .school-address-text {
            font-size: 8.5px !important;
            margin-top: 1px !important;
          }

          .printable-report-area .report-sub-bar {
            padding: 2.5px 6px !important;
            margin-top: 3px !important;
            margin-bottom: 3px !important;
            border-radius: 4px !important;
          }

          .printable-report-area .report-sub-title {
            font-size: 10.5px !important;
            font-weight: 800 !important;
          }

          .printable-report-area .report-meta-text {
            font-size: 8.5px !important;
            font-weight: 700 !important;
            padding-top: 1px !important;
          }

          .printable-report-area table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
            margin-top: 2px !important;
            margin-bottom: 2px !important;
            box-sizing: border-box !important;
          }

          .printable-report-area thead {
            display: table-header-group !important;
            background-color: #1e3a8a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .printable-report-area tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .printable-report-area th {
            background-color: #1e3a8a !important;
            color: #ffffff !important;
            font-size: ${fontSize}px !important;
            padding: ${fontSize >= 14 ? '2.5px 1.5px' : fontSize >= 12 ? '2px 1.5px' : '1.5px 1px'} !important;
            border: 1px solid #1e3a8a !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            line-height: 1.1 !important;
            text-align: center !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .printable-report-area td {
            font-size: ${fontSize}px !important;
            padding: ${fontSize >= 14 ? '2.5px 1.5px' : fontSize >= 12 ? '2px 1.5px' : '1.5px 1px'} !important;
            line-height: 1.15 !important;
            border: 1px solid #94a3b8 !important;
            word-break: break-word !important;
            text-align: center !important;
          }

          .printable-report-area .signatures-container {
            padding-top: 12px !important;
            padding-bottom: 2px !important;
            padding-left: 20px !important;
            padding-right: 20px !important;
            margin-top: 4px !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .printable-report-area .signature-img {
            height: 40px !important;
            max-height: 40px !important;
            width: auto !important;
            object-fit: contain !important;
            margin-bottom: -2px !important;
            transform: scale(1) !important;
          }

          .printable-report-area .signature-placeholder {
            height: 22px !important;
          }

          .printable-report-area .signature-line {
            width: 140px !important;
            font-size: 9.5px !important;
            padding-top: 2px !important;
            margin-top: 2px !important;
          }

          /* Hide scrollbar completely during print */
          .preview-scroll-container {
            overflow: visible !important;
          }
        }
      `}</style>
      {/* Top Header Banner matching system design */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-card/60 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl">
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

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white border border-slate-300 dark:border-white/10 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Print Report"
          >
            <Printer size={15} />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            title="Export to Excel Spreadsheet"
          >
            <FileSpreadsheet size={15} />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleGeneratePDF}
            disabled={generating}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-70 active:scale-95"
            title="Download PDF Document"
          >
            {generating ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Report Configuration Card */}
      <GlassCard className="print:hidden p-6 border-white/10 shadow-xl space-y-4">
        
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 dark:text-primary-400 border border-blue-500/20">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Report Configuration</h2>
            <p className="text-xs text-slate-500 dark:text-dark-muted font-medium">Select class, term, and report style for instant live preview</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          
          {/* Select Class */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers size={13} className="text-blue-600 dark:text-primary-400" />
              <span>1. Select Class</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-[38px] px-3 bg-slate-100 dark:bg-dark-bg/80 border border-slate-300 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
            >
              {dbClasses.length > 0 ? (
                dbClasses.map((cls, idx) => (
                  <option key={idx} value={cls} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Class {cls}</option>
                ))
              ) : (
                <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">No existing classes found</option>
              )}
            </select>
          </div>

          {/* Select Term */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar size={13} className="text-blue-600 dark:text-primary-400" />
              <span>2. Select Term</span>
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full h-[38px] px-3 bg-slate-100 dark:bg-dark-bg/80 border border-slate-300 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
            >
              {termsList.length > 0 ? (
                termsList.map((term, idx) => (
                  <option key={idx} value={term} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{term}</option>
                ))
              ) : (
                <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">No existing terms found</option>
              )}
            </select>
          </div>

          {/* Report Type Radios */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Filter size={13} className="text-blue-600 dark:text-primary-400" />
              <span>3. Report Type</span>
            </label>
            <div className="flex items-center gap-4 pt-2 text-xs font-bold text-slate-800 dark:text-white">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="reportType"
                  value="WITH_MARKS"
                  checked={reportType === 'WITH_MARKS'}
                  onChange={() => setReportType('WITH_MARKS')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-dark-bg cursor-pointer"
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
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-dark-bg cursor-pointer"
                />
                <span>Without Marks</span>
              </label>
            </div>
          </div>

          {/* 4. Text Size / Print Scale */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Type size={13} className="text-blue-600 dark:text-primary-400" />
                <span>4. Print Text Size</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-primary-500/20 text-blue-700 dark:text-primary-300 text-[10px] font-black border border-blue-200 dark:border-primary-500/30">
                {fontSize}px
              </span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFontSize(prev => Math.max(9, prev - 1))}
                className="w-10 h-[38px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-bg/80 dark:hover:bg-white/10 text-slate-800 dark:text-white border border-slate-300 dark:border-white/10 flex items-center justify-center font-black transition-all active:scale-95 shadow-sm"
                title="Decrease Text Size"
              >
                <Minus size={15} />
              </button>

              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="flex-1 h-[38px] px-2.5 bg-slate-100 dark:bg-dark-bg/80 border border-slate-300 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
              >
                <option value={9} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">9px (Extra Compact)</option>
                <option value={10} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">10px (Compact)</option>
                <option value={11} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">11px (Medium)</option>
                <option value={12} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">12px (Standard)</option>
                <option value={13} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">13px (Large)</option>
                <option value={14} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">14px (Extra Large)</option>
                <option value={15} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">15px (Jumbo)</option>
                <option value={16} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">16px (Maximum)</option>
              </select>

              <button
                type="button"
                onClick={() => setFontSize(prev => Math.min(18, prev + 1))}
                className="w-10 h-[38px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-bg/80 dark:hover:bg-white/10 text-slate-800 dark:text-white border border-slate-300 dark:border-white/10 flex items-center justify-center font-black transition-all active:scale-95 shadow-sm"
                title="Increase Text Size"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

        </div>

      </GlassCard>

      {/* LIVE INTERACTIVE REPORT PREVIEW SHEET CONTAINER */}
      <div className="space-y-3 print:space-y-0 print:m-0 print:p-0 print:static">
        
        <div className="print:hidden flex items-center justify-between text-xs font-bold text-dark-muted px-2">
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
            className="printable-report-area bg-white rounded-2xl border-2 border-blue-600 shadow-2xl p-6 md:p-8 text-slate-800 space-y-5 print:space-y-2 overflow-x-auto mx-auto max-w-5xl print:max-w-none print:w-full print:mx-0 print:border-none print:shadow-none"
          >
            {/* Blue Top Stripe */}
            <div className="print:hidden h-1.5 bg-blue-600 -mx-6 -mt-6 md:-mx-8 md:-mt-8 rounded-t-xl mb-4" />

            {/* Header */}
            <div className="report-header-banner flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="w-20 h-20 flex items-center justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="School Logo" className="school-logo-img max-h-20 max-w-20 object-contain" />
                ) : (
                  <div className="school-logo-img w-16 h-16 rounded-2xl bg-blue-900 text-white font-black flex items-center justify-center text-xl shadow-md">
                    {schoolName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="text-center flex-1 px-4">
                <h2 className="school-title-text text-xl md:text-2xl font-black text-blue-900 uppercase tracking-tight">
                  {schoolName}
                </h2>
                <p className="school-address-text text-xs font-medium text-slate-500 mt-0.5">
                  {schoolAddress}
                </p>
              </div>

              <div className="w-20 text-right text-[10px] text-slate-400 font-mono">
                OFFICIAL REPORT
              </div>
            </div>

            {/* Report Title Bar */}
            <div className="report-sub-bar bg-blue-50 border border-blue-100 rounded-xl p-3 text-center space-y-1">
              <h3 className="report-sub-title text-sm font-black text-blue-900 uppercase tracking-wide">
                {reportType === 'WITH_MARKS' 
                  ? 'CLASS TERM REPORT (DETAILED MARKS SUMMARY)'
                  : 'CLASS TERM DIRECTORY (BLANK EVALUATION SHEET)'}
              </h3>
              <div className="report-meta-text flex flex-wrap items-center justify-between text-[11px] font-bold text-slate-700 px-2 pt-1">
                <span>CLASS: {selectedClass ? selectedClass.toUpperCase() : '—'}</span>
                <span>TERM / EXAM: {selectedTerm ? selectedTerm.toUpperCase() : '—'}</span>
                <span>DATE GENERATED: {new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>

            {/* Report Table (Without Sec Column) */}
            <div className="overflow-x-auto print:overflow-visible preview-scroll-container pb-2">
              <table 
                className="w-full text-left border-collapse border border-blue-900 transition-all"
                style={{ fontSize: `${fontSize}px` }}
              >
                <thead 
                  className="bg-blue-900 text-white"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  <tr>
                    <th className="p-1 sm:p-2 border border-blue-800 text-center">Sr</th>
                    <th className="p-1 sm:p-2 border border-blue-800 text-center">Roll</th>
                    <th className="p-1 sm:p-2 border border-blue-800 text-left">Student Name</th>
                    <th className="p-1 sm:p-2 border border-blue-800 text-left">Father Name</th>

                    {/* Subject Columns */}
                    {activeSubjects.map((sub, i) => (
                      <th key={i} className="p-1 sm:p-2 border border-blue-800 text-center">{sub.name}</th>
                    ))}

                    <th className="p-1 sm:p-2 border border-blue-800 text-center">Total</th>
                    <th className="p-1 sm:p-2 border border-blue-800 text-center">Obt</th>
                    <th className="p-1 sm:p-2 border border-blue-800 text-center">%</th>
                    <th className="p-1 sm:p-2 border border-blue-800 text-center">Grade</th>
                    <th className="p-1 sm:p-2 border border-blue-800 text-center">Result</th>
                  </tr>
                </thead>

                <tbody 
                  className="divide-y divide-slate-300 text-slate-800"
                  style={{ fontSize: `${fontSize}px` }}
                >
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
            <div className="signatures-container pt-12 print:pt-3 print:break-inside-avoid flex items-end justify-between text-xs font-bold text-slate-600 px-10 pb-4">
              <div className="flex flex-col items-center">
                {schoolData?.signatureSettings?.rules?.find(r => r.type === 'Teacher' && String(r.class) === String(selectedClass))?.signatureUrl ? (
                  <img src={schoolData.signatureSettings.rules.find(r => r.type === 'Teacher' && String(r.class) === String(selectedClass)).signatureUrl} alt="Class Teacher" className="signature-img h-20 max-w-[160px] origin-bottom mix-blend-multiply object-contain -mb-2" />
                ) : (
                  <div className="signature-placeholder h-12"></div>
                )}
                <div className="signature-line w-44 border-t border-slate-400 pt-1 mt-1 text-center">
                  <span>Class Teacher</span>
                </div>
              </div>

              <div className="flex flex-col items-center">
                {schoolData?.signatureSettings?.principalSignatureUrl || schoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal')?.signatureUrl ? (
                  <img src={schoolData?.signatureSettings?.principalSignatureUrl || schoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal')?.signatureUrl} alt="Principal" className="signature-img h-20 max-w-[160px] origin-bottom mix-blend-multiply object-contain -mb-2" />
                ) : (
                  <div className="signature-placeholder h-12"></div>
                )}
                <div className="signature-line w-44 border-t border-slate-400 pt-1 mt-1 text-center">
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
