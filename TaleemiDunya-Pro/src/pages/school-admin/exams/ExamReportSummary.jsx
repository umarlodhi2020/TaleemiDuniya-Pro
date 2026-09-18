import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, FileText, ArrowLeft, RefreshCw, CheckCircle2, Download 
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSchool } from '../../../context/SchoolContext';
import { getRecords } from '../../../services/db';
import { getExams, getGradingRules, calculateGrade } from '../../../services/examService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

const ExamReportSummary = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { schoolClasses, schoolData } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [reportType, setReportType] = useState('WITH_MARKS'); // 'WITH_MARKS' | 'WITHOUT_MARKS'
  
  const [examsList, setExamsList] = useState([]);
  const [termsList, setTermsList] = useState([]);
  const [gradingRules, setGradingRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Available classes list
  const availableClasses = schoolClasses?.length > 0
    ? schoolClasses.map(c => c.name)
    : ['Nursery', 'Prep', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [examsData, rulesData] = await Promise.all([
        getExams(schoolId),
        getGradingRules(schoolId)
      ]);

      setExamsList(examsData || []);
      setGradingRules(rulesData || []);

      const dynamicTerms = (examsData || []).map(e => e.examName || e.title).filter(Boolean);
      const uniqueTerms = Array.from(new Set([...dynamicTerms, ...DEFAULT_TERMS]));
      setTermsList(uniqueTerms);
    } catch (err) {
      console.error("Error loading report data:", err);
      setTermsList(DEFAULT_TERMS);
    } finally {
      setLoading(false);
    }
  };

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
      return Swal.fire({
        title: 'Class Required',
        text: 'Please select a Class before generating the report.',
        icon: 'warning',
        confirmButtonColor: '#2563eb'
      });
    }

    if (!selectedTerm) {
      return Swal.fire({
        title: 'Term Required',
        text: 'Please select a Term before generating the report.',
        icon: 'warning',
        confirmButtonColor: '#2563eb'
      });
    }

    setGenerating(true);

    try {
      // 1. Fetch Students for the selected class
      const allStudents = await getRecords('students', schoolId, [
        { field: 'class', operator: '==', value: selectedClass }
      ]);

      if (!allStudents || allStudents.length === 0) {
        setGenerating(false);
        return Swal.fire({
          title: 'No Students Found',
          text: `No student records found for Class ${selectedClass}.`,
          icon: 'info',
          confirmButtonColor: '#2563eb'
        });
      }

      // Sort students by roll number or name
      const sortedStudents = [...allStudents].sort((a, b) => {
        const rollA = parseInt(a.rollNumber || a.rollNo || '0', 10);
        const rollB = parseInt(b.rollNumber || b.rollNo || '0', 10);
        return rollA - rollB;
      });

      // 2. Fetch Results for the selected exam/term
      const selectedExam = examsList.find(e => (e.examName || e.title) === selectedTerm);
      const examId = selectedExam?.id;

      let resultsData = [];
      if (examId) {
        resultsData = await getRecords('results', schoolId, [
          { field: 'examId', operator: '==', value: examId }
        ]);
      } else {
        // Fallback: match by termName or examName field in results
        resultsData = await getRecords('results', schoolId, [
          { field: 'examName', operator: '==', value: selectedTerm }
        ]);
      }

      // Prepare School Branding Info
      const schoolName = schoolData?.schoolName || schoolData?.name || userData?.schoolName || 'TaleemiDunya Model School';
      const logoUrl = schoolData?.branding?.logo || schoolData?.logo || schoolData?.logoUrl || schoolData?.schoolLogo || userData?.schoolLogo || userData?.logo;
      const schoolAddress = schoolData?.address || userData?.schoolAddress || 'Official Academic Examination Center';
      const schoolPhone = schoolData?.phone || schoolData?.contactPhone || '';

      const logoBase64 = logoUrl ? await getBase64ImageFromUrl(logoUrl) : null;

      // 3. Generate PDF using jsPDF & autoTable
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Draw Top Decorative Border
      doc.setFillColor(37, 99, 235); // Blue
      doc.rect(0, 0, pageWidth, 5, 'F');

      // Add School Logo if available
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

      // Title Box
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(12, startY + 12, pageWidth - 24, 14, 2, 2, 'F');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(`CLASS TERM REPORT (${reportType === 'WITH_MARKS' ? 'DETAILED MARKS SUMMARY' : 'CLASS DIRECTORY & MARKSHEET SUMMARY'})`, pageWidth / 2, startY + 19, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      const subInfoY = startY + 23;
      doc.text(`CLASS: ${selectedClass.toUpperCase()}`, 16, subInfoY);
      doc.text(`TERM / EXAM: ${selectedTerm.toUpperCase()}`, pageWidth / 2, subInfoY, { align: 'center' });
      doc.text(`DATE GENERATED: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 16, subInfoY, { align: 'right' });

      // 4. Build Table Content based on reportType
      if (reportType === 'WITH_MARKS') {
        // Collect Subject columns
        const classSubjects = selectedExam?.subjects?.filter(
          s => !s.classId || s.classId === selectedClass || s.className === selectedClass
        ) || [];

        const subjectNames = classSubjects.length > 0 
          ? classSubjects.map(s => s.subjectName || s.name)
          : ['English', 'Math', 'Science', 'Urdu', 'Islamiat'];

        // Compute scores per student
        const studentRows = sortedStudents.map((stud, idx) => {
          const sRes = resultsData.filter(r => r.studentId === stud.id);
          let totalMax = 0;
          let totalObt = 0;
          let hasFail = false;

          const subjMarks = subjectNames.map(subName => {
            const r = sRes.find(item => item.subject === subName);
            const subjObj = classSubjects.find(s => (s.subjectName || s.name) === subName);
            const max = Number(subjObj?.totalMarks || 100);
            const pass = Number(subjObj?.passingMarks || 33);

            totalMax += max;
            if (r) {
              if (r.obtainedMarks === 'ABS' || r.status === 'ABSENT') {
                hasFail = true;
                return 'ABS';
              }
              const obt = Number(r.obtainedMarks || 0);
              totalObt += obt;
              if (obt < pass) hasFail = true;
              return obt.toString();
            }
            return '—';
          });

          const percentage = totalMax > 0 ? Math.round(((totalObt / totalMax) * 100) * 10) / 10 : 0;
          const gradeObj = calculateGrade(totalObt, totalMax, gradingRules);
          const status = hasFail || percentage < 33 ? 'FAIL' : 'PASS';

          return {
            sNo: (idx + 1).toString(),
            rollNo: stud.rollNumber || stud.rollNo || '—',
            name: stud.name || stud.studentName || '—',
            fatherName: stud.fatherName || '—',
            section: stud.section || 'A',
            subjMarks,
            totalMax,
            totalObt,
            percentage: `${percentage}%`,
            grade: gradeObj.grade,
            status
          };
        });

        // Table Headers
        const head = [
          ['S#', 'Roll', 'Student Name', 'Father Name', 'Sec', ...subjectNames, 'Total', 'Obtained', '%age', 'Grade', 'Result']
        ];

        const body = studentRows.map(r => [
          r.sNo,
          r.rollNo,
          r.name,
          r.fatherName,
          r.section,
          ...r.subjMarks,
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
            2: { halign: 'left', fontStyle: 'bold' }, // Student Name
            3: { halign: 'left' } // Father Name
          },
          headStyles: {
            fillColor: [30, 58, 138],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.5
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === head[0].length - 1) {
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

      } else {
        // WITHOUT MARKS (Class List / Evaluation Directory)
        const head = [
          ['S#', 'Roll No', 'Student Name', 'Father Name', 'Class & Sec', 'Contact / Emergency', 'Attendance / Remarks']
        ];

        const body = sortedStudents.map((stud, idx) => [
          (idx + 1).toString(),
          stud.rollNumber || stud.rollNo || '—',
          stud.name || stud.studentName || '—',
          stud.fatherName || '—',
          `${stud.class || selectedClass} - ${stud.section || 'A'}`,
          stud.phone || stud.mobile || stud.guardianPhone || '—',
          ''
        ]);

        autoTable(doc, {
          startY: startY + 28,
          margin: { left: 12, right: 12 },
          head,
          body,
          theme: 'grid',
          styles: { fontSize: 8.5, cellPadding: 2.5, halign: 'center' },
          columnStyles: {
            2: { halign: 'left', fontStyle: 'bold' },
            3: { halign: 'left' },
            6: { cellWidth: 50 } // Blank area for teacher evaluation or signatures
          },
          headStyles: {
            fillColor: [30, 58, 138],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          }
        });
      }

      // Footer Signatures
      const finalY = Math.min(doc.lastAutoTable.finalY + 18, pageHeight - 20);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.4);
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      doc.line(20, finalY, 20 + 50, finalY);
      doc.text("Class Teacher", 45, finalY + 4, { align: 'center' });

      doc.line(pageWidth / 2 - 25, finalY, pageWidth / 2 + 25, finalY);
      doc.text("Exam Controller", pageWidth / 2, finalY + 4, { align: 'center' });

      doc.line(pageWidth - 70, finalY, pageWidth - 20, finalY);
      doc.text("Principal Signature", pageWidth - 45, finalY + 4, { align: 'center' });

      // Save PDF File
      const safeTerm = selectedTerm.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Class_Term_Report_${selectedClass}_${safeTerm}.pdf`);

      Swal.fire({
        title: 'Report Generated!',
        text: `Class Term Report for Class ${selectedClass} (${selectedTerm}) has been downloaded successfully.`,
        icon: 'success',
        confirmButtonColor: '#2563eb'
      });
    } catch (err) {
      console.error("PDF Generation Error:", err);
      Swal.fire({
        title: 'Generation Failed',
        text: 'Failed to generate PDF report. Please try again.',
        icon: 'error',
        confirmButtonColor: '#2563eb'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-100/90 via-sky-50 to-blue-200/80 font-sans">
      
      {/* Central Class Term Report Card */}
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-10 max-w-md w-full border border-blue-100 text-center space-y-6 transition-all">
        
        {/* Top Icon */}
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 mx-auto shadow-sm">
          <ClipboardList size={34} className="text-blue-600" />
        </div>

        {/* Header Title & Subtitle */}
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-blue-900 tracking-tight">
            Class Term Report
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-blue-600/80">
            Generate and download a detailed PDF report by class &amp; term
          </p>
        </div>

        {/* Form Controls */}
        <div className="space-y-4 pt-2 text-left">
          
          {/* Select Class */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-blue-950 text-center">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none shadow-sm transition-all"
            >
              <option value="">-- Choose Class --</option>
              {availableClasses.map((cls, idx) => (
                <option key={idx} value={cls}>
                  Class {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Select Term */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-blue-950 text-center">
              Select Term
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none shadow-sm transition-all"
            >
              <option value="">-- Choose Term --</option>
              {termsList.map((term, idx) => (
                <option key={idx} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </div>

          {/* Report Type Radios */}
          <div className="text-center space-y-2 pt-2">
            <label className="block text-xs font-bold text-blue-950">
              Report Type
            </label>
            <div className="flex items-center justify-center gap-6 text-xs font-bold text-blue-900">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="reportType"
                  value="WITH_MARKS"
                  checked={reportType === 'WITH_MARKS'}
                  onChange={() => setReportType('WITH_MARKS')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
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
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                />
                <span>Without Marks</span>
              </label>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-3">
            <button
              type="button"
              onClick={handleGeneratePDF}
              disabled={generating}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70"
            >
              {generating ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  <span>Generating PDF Report...</span>
                </>
              ) : (
                <>
                  <FileText size={17} />
                  <span>Generate PDF Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Divider & Back Link */}
        <div className="pt-2">
          <hr className="border-t border-slate-200/80 mb-4" />
          <button
            type="button"
            onClick={() => navigate('/school-admin/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-950 transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Back to Dashboard</span>
          </button>
        </div>

      </div>

    </div>
  );
};

export default ExamReportSummary;
