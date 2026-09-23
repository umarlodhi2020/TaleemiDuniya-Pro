import React, { useState, useEffect } from 'react';
import { Award, Printer, Search, LayoutDashboard, Calendar, MapPin, Clock } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';

const AdmitCard = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = userData?.schoolId;

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    const fetchInitialData = async () => {
      try {
        const [examsData, studentsData] = await Promise.all([
          getRecords('exams', schoolId),
          getRecords('students', schoolId)
        ]);
        
        // Filter out drafts
        const liveExams = examsData.filter(e => e.status !== 'DRAFT');
        setExams(liveExams);

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
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (students.length === 0) return;
    setGenerating(true);
    
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

      const exam = exams.find(e => e.id === selectedExamId);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // 2 admit cards per page
      const cardHeight = 135; 
      const cardWidth = 190;
      const marginX = 10;
      
      let currentY = 10;
      let cardsOnPage = 0;
      
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        
        if (cardsOnPage === 2) {
          doc.addPage();
          currentY = 10;
          cardsOnPage = 0;
        }
        
        // Card Border and Background
        doc.setDrawColor(59, 130, 246); // Blue border
        doc.setLineWidth(0.5);
        doc.setFillColor(250, 252, 255); // Very light blue bg
        doc.roundedRect(marginX, currentY, cardWidth, cardHeight, 3, 3, 'FD');
        
        // Header
        doc.setFillColor(59, 130, 246);
        doc.rect(marginX, currentY, cardWidth, 25, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(userData?.schoolName || 'TaleemiDunya School', pageWidth / 2, currentY + 10, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("EXAMINATION ADMIT CARD", pageWidth / 2, currentY + 18, { align: 'center' });
        
        // Watermark
        doc.setTextColor(240, 245, 255);
        doc.setFontSize(60);
        doc.setFont('helvetica', 'bold');
        doc.text("ADMIT CARD", pageWidth / 2, currentY + 80, { align: 'center', angle: 45 });
        
        // Exam Details
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(exam.examName.toUpperCase(), pageWidth / 2, currentY + 35, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Academic Session: ${exam.academicYear}`, pageWidth / 2, currentY + 42, { align: 'center' });

        // Student Info Box
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.rect(marginX + 5, currentY + 48, cardWidth - 45, 45); // Left box for info
        doc.rect(cardWidth - 25, currentY + 48, 30, 40); // Right box for photo

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const startX = marginX + 10;
        let lineY = currentY + 55;
        const lineSpacing = 7;

        doc.text("Roll Number / GR:", startX, lineY);
        doc.setFont('helvetica', 'normal');
        doc.text(student.grNumber || `ROLL-${student.id.slice(0,4).toUpperCase()}`, startX + 40, lineY);
        
        lineY += lineSpacing;
        doc.setFont('helvetica', 'bold');
        doc.text("Student Name:", startX, lineY);
        doc.setFont('helvetica', 'normal');
        doc.text(student.name, startX + 40, lineY);
        
        lineY += lineSpacing;
        doc.setFont('helvetica', 'bold');
        doc.text("Father Name:", startX, lineY);
        doc.setFont('helvetica', 'normal');
        doc.text(student.fatherName || '-', startX + 40, lineY);
        
        lineY += lineSpacing;
        doc.setFont('helvetica', 'bold');
        doc.text("Class & Section:", startX, lineY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${student.class} ${student.section || ''}`, startX + 40, lineY);

        lineY += lineSpacing;
        doc.setFont('helvetica', 'bold');
        doc.text("Date of Birth:", startX, lineY);
        doc.setFont('helvetica', 'normal');
        doc.text(student.dob || '-', startX + 40, lineY);

        // Photo Text
        doc.setTextColor(150, 150, 150);
        doc.text("Paste\nPhotograph\nHere", cardWidth - 10, currentY + 68, { align: 'center' });
        
        // Instructions
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text("Important Instructions:", marginX + 5, currentY + 100);
        doc.setFont('helvetica', 'normal');
        doc.text("1. Bring this admit card to the examination hall daily.", marginX + 5, currentY + 105);
        doc.text("2. No electronic gadgets (mobile phones, smart watches) are allowed.", marginX + 5, currentY + 110);
        doc.text("3. Candidates must report 15 minutes before exam commencement.", marginX + 5, currentY + 115);

        // Signatures
        doc.setDrawColor(0, 0, 0);
        if (teacherB64) {
          doc.addImage(teacherB64, 'PNG', marginX + 25, currentY + 112, 30, 12);
        }
        doc.line(marginX + 15, currentY + 125, marginX + 65, currentY + 125);
        doc.text("Class Teacher", marginX + 40, currentY + 130, { align: 'center' });

        if (principalB64) {
          doc.addImage(principalB64, 'PNG', cardWidth - 45, currentY + 112, 30, 12);
        }
        doc.line(cardWidth - 55, currentY + 125, cardWidth - 5, currentY + 125);
        doc.text("Principal", cardWidth - 30, currentY + 130, { align: 'center' });

        currentY += cardHeight + 10;
        cardsOnPage++;
      }
      
      doc.save(`${selectedClass}_Admit_Cards.pdf`);
      Swal.fire('Success', 'Admit Cards generated successfully!', 'success');
      
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
            Admit Card Generator
          </h1>
          <p className="text-dark-muted font-bold tracking-wide text-sm mt-1">
            Generate printable roll number slips for active exams.
          </p>
        </div>
      </div>

      <GlassCard className="p-6 md:p-8 border-t-4 border-t-blue-500 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
           <Award size={200} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Select Exam Term</label>
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setStudents([]);
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
              Fetch Candidates
            </button>
          </div>
        </div>
      </GlassCard>

      {students.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
             <div>
               <h2 className="text-xl font-black text-white">Candidates Roster</h2>
               <p className="text-dark-muted text-xs font-bold mt-1">Found {students.length} students in Class {selectedClass}</p>
             </div>
             
             <button
                onClick={generatePDF}
                disabled={generating}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-black text-xs tracking-widest uppercase shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center gap-2 disabled:opacity-50"
             >
                {generating ? <Clock className="animate-spin" size={16} /> : <Printer size={16} />}
                Generate {students.length} Admit Cards
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map(student => (
              <div key={student.id} className="bg-dark-card/50 border border-dark-border/40 rounded-xl p-4 flex items-center gap-4">
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
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default AdmitCard;
