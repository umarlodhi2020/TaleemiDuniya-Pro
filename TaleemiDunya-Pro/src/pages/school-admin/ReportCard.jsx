import React, { useState, useEffect } from 'react';
import { Award, Printer, Search, LayoutDashboard, Calendar, FileText, Clock, FileBadge2 } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';

const ReportCard = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId;

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Mark data maps
  const [examResults, setExamResults] = useState([]);
  const [gradingRules, setGradingRules] = useState([]);

  useEffect(() => {
    if (!schoolId) return;
    const fetchInitialData = async () => {
      try {
        const [examsData, studentsData, rulesData] = await Promise.all([
          getRecords('exams', schoolId),
          getRecords('students', schoolId),
          getRecords('gradingRules', schoolId)
        ]);
        
        // Filter out drafts
        const liveExams = examsData.filter(e => e.status !== 'DRAFT');
        setExams(liveExams);
        setGradingRules(rulesData || []);

        // Get unique classes
        const uniqueClasses = [...new Set(studentsData.map(s => s.class))].filter(Boolean).sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
        setClasses(uniqueClasses);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchInitialData();
  }, [schoolId]);

  const handleFetchStudents = async () => {
    if (!selectedExamId || !selectedClass) return;
    setLoading(true);
    try {
      const studs = await getRecords('students', schoolId, [
        { field: 'class', operator: '==', value: selectedClass }
      ]);
      setStudents(studs);

      // Fetch results for this exam and class
      const results = await getRecords('results', schoolId, [
        { field: 'examId', operator: '==', value: selectedExamId }
      ]);
      setExamResults(results);

    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  };

  const getGradeInfo = (percentage) => {
    // Default grading if no rules exist
    if (!gradingRules || gradingRules.length === 0) {
      if (percentage >= 80) return { grade: 'A+', gpa: '4.0', status: 'Pass' };
      if (percentage >= 70) return { grade: 'A', gpa: '3.0', status: 'Pass' };
      if (percentage >= 60) return { grade: 'B', gpa: '2.5', status: 'Pass' };
      if (percentage >= 50) return { grade: 'C', gpa: '2.0', status: 'Pass' };
      if (percentage >= 40) return { grade: 'D', gpa: '1.0', status: 'Pass' };
      return { grade: 'F', gpa: '0.0', status: 'Fail' };
    }

    // Sort rules highest to lowest
    const sortedRules = [...gradingRules].sort((a, b) => b.minMarks - a.minMarks);
    for (const rule of sortedRules) {
      if (percentage >= rule.minMarks) {
        return { grade: rule.grade, gpa: rule.gpa || '0.0', status: 'Pass' };
      }
    }
    return { grade: 'F', gpa: '0.0', status: 'Fail' };
  };

  const generatePDF = async () => {
    if (students.length === 0) return;
    setGenerating(true);
    
    try {
      const exam = exams.find(e => e.id === selectedExamId);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 15;
      
      let cardsGenerated = 0;
      
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        
        // Aggregate all subject results for this student
        const studentMarksRecords = examResults.filter(r => r.studentId === student.id);
        if (studentMarksRecords.length === 0) {
          continue; // Skip if no marks
        }

        // Build the expected studentResult structure
        const studentResult = {
          studentId: student.id,
          marks: {}
        };

        studentMarksRecords.forEach(record => {
          if (record.subject) {
            studentResult.marks[record.subject] = {
              obtained: record.obtainedMarks,
              total: record.totalMarks || 100,
              status: record.obtainedMarks === 'ABS' ? 'ABS' : 'Present'
            };
          }
        });

        if (Object.keys(studentResult.marks).length === 0) {
          continue;
        }

        if (cardsGenerated > 0) {
          doc.addPage();
        }

        // Header Background
        doc.setFillColor(30, 64, 175); // Deep blue
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(userData?.schoolName || 'TaleemiDunya School System', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text("OFFICIAL REPORT CARD", pageWidth / 2, 28, { align: 'center' });
        
        // Student Info Box
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(marginX, 45, pageWidth - 30, 35, 3, 3, 'FD');

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        
        let startY = 52;
        doc.text("Student Name:", marginX + 5, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(student.name, marginX + 35, startY);
        
        doc.setFont('helvetica', 'bold');
        doc.text("GR Number:", pageWidth / 2 + 10, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(student.grNumber || '-', pageWidth / 2 + 35, startY);
        
        startY += 8;
        doc.setFont('helvetica', 'bold');
        doc.text("Father Name:", marginX + 5, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(student.fatherName || '-', marginX + 35, startY);

        doc.setFont('helvetica', 'bold');
        doc.text("Class:", pageWidth / 2 + 10, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${student.class} ${student.section || ''}`, pageWidth / 2 + 35, startY);

        startY += 8;
        doc.setFont('helvetica', 'bold');
        doc.text("Examination:", marginX + 5, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${exam.examName} (${exam.academicYear})`, marginX + 35, startY);

        // Marks Table
        startY += 20;
        doc.setFillColor(30, 64, 175);
        doc.setTextColor(255, 255, 255);
        doc.rect(marginX, startY, pageWidth - 30, 10, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("Subject", marginX + 5, startY + 6);
        doc.text("Total", marginX + 80, startY + 6);
        doc.text("Obtained", marginX + 110, startY + 6);
        doc.text("Grade", marginX + 150, startY + 6);

        startY += 10;
        
        let totalMax = 0;
        let totalObt = 0;

        const subjects = Object.keys(studentResult.marks);
        for (const subj of subjects) {
          const markData = studentResult.marks[subj];
          const obtained = Number(markData.obtained) || 0;
          const max = Number(markData.total) || 100;
          
          if (markData.status === 'ABS') continue;

          totalMax += max;
          totalObt += obtained;

          const percent = (obtained / max) * 100;
          const { grade } = getGradeInfo(percent);

          // Alternating row colors
          doc.setFillColor(250, 250, 250);
          doc.rect(marginX, startY, pageWidth - 30, 8, 'F');
          
          doc.setTextColor(50, 50, 50);
          doc.setFont('helvetica', 'normal');
          doc.text(subj, marginX + 5, startY + 5);
          doc.text(max.toString(), marginX + 80, startY + 5);
          doc.text(obtained.toString(), marginX + 110, startY + 5);
          doc.text(grade, marginX + 150, startY + 5);
          
          startY += 8;
        }

        // Summary Box
        startY += 10;
        const overallPercent = totalMax > 0 ? (totalObt / totalMax) * 100 : 0;
        const finalGrade = getGradeInfo(overallPercent);

        doc.setFillColor(245, 247, 250);
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(marginX, startY, pageWidth - 30, 25, 3, 3, 'FD');

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("Total Marks:", marginX + 10, startY + 10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${totalObt} / ${totalMax}`, marginX + 40, startY + 10);

        doc.setFont('helvetica', 'bold');
        doc.text("Percentage:", marginX + 80, startY + 10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${overallPercent.toFixed(2)}%`, marginX + 105, startY + 10);

        doc.setFont('helvetica', 'bold');
        doc.text("Final Grade:", marginX + 140, startY + 10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(finalGrade.status === 'Pass' ? 34 : 220, finalGrade.status === 'Pass' ? 197 : 38, finalGrade.status === 'Pass' ? 94 : 38);
        doc.text(finalGrade.grade, marginX + 165, startY + 10);

        doc.setTextColor(0, 0, 0);
        doc.text("Status:", marginX + 10, startY + 20);
        doc.text(finalGrade.status.toUpperCase(), marginX + 40, startY + 20);

        // Footer Signatures
        let footerY = 250;
        doc.setDrawColor(0, 0, 0);
        doc.line(marginX + 10, footerY, marginX + 60, footerY);
        doc.text("Class Teacher", marginX + 22, footerY + 5);

        doc.line(pageWidth - marginX - 60, footerY, pageWidth - marginX - 10, footerY);
        doc.text("Principal / Head", pageWidth - marginX - 50, footerY + 5);

        cardsGenerated++;
      }
      
      if (cardsGenerated === 0) {
        Swal.fire('Notice', 'No results found for the selected students.', 'info');
        setGenerating(false);
        return;
      }

      doc.save(`${selectedClass}_Report_Cards.pdf`);
      Swal.fire('Success', `Generated ${cardsGenerated} Report Cards successfully!`, 'success');
      
    } catch (error) {
      console.error("PDF generation failed:", error);
      Swal.fire('Error', 'Failed to generate PDF. Check console for details.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-tight">
            Professional Marksheet Generator
          </h1>
          <p className="text-dark-muted font-bold tracking-wide text-sm mt-1">
            Generate and print official report cards for your students.
          </p>
        </div>
      </div>

      <GlassCard className="p-6 md:p-8 border-t-4 border-t-blue-500 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
           <FileBadge2 size={200} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Select Exam Term</label>
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setStudents([]);
                setExamResults([]);
              }}
              className="w-full bg-dark-card border border-dark-border/50 text-white rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
            >
              <option value="">-- Choose Exam --</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>{exam.examName} ({exam.academicYear})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setStudents([]);
                setExamResults([]);
              }}
              className="w-full bg-dark-card border border-dark-border/50 text-white rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
            >
              <option value="">-- Choose Class --</option>
              {classes.map(c => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleFetchStudents}
              disabled={!selectedExamId || !selectedClass || loading}
              className="w-full bg-dark-card hover:bg-white/5 border border-dark-border/50 py-3.5 rounded-xl font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Clock className="animate-spin" size={18} /> : <Search size={18} />}
              Fetch Results
            </button>
          </div>
        </div>
      </GlassCard>

      {students.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
             <div>
               <h2 className="text-xl font-black text-white">Class Roster ({students.length})</h2>
               <p className="text-dark-muted text-xs font-bold mt-1">Found {examResults.length} result entries for this class.</p>
             </div>
             
             <button
                onClick={generatePDF}
                disabled={generating || examResults.length === 0}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-black text-xs tracking-widest uppercase shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center gap-2 disabled:opacity-50"
             >
                {generating ? <Clock className="animate-spin" size={16} /> : <Printer size={16} />}
                Generate Marksheets
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map(student => {
              const hasResult = examResults.some(r => r.studentId === student.id);
              return (
                <div key={student.id} className="bg-dark-card/50 border border-dark-border/40 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-lg border border-blue-500/20">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{student.name}</h3>
                      <p className="text-[10px] font-black text-dark-muted uppercase tracking-wider mt-0.5">
                        GR: {student.grNumber || 'PENDING'}
                      </p>
                    </div>
                  </div>
                  <div>
                    {hasResult ? (
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-black uppercase tracking-widest">
                        Results Found
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-black uppercase tracking-widest">
                        No Marks
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default ReportCard;
