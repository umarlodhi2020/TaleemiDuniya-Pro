import React, { useState, useEffect } from 'react';
import { 
  Printer, Contact, ClipboardList, Info, Users, LayoutList, Calendar, BookOpen, FileText
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSchool } from '../../../context/SchoolContext';
import { getExams } from '../../../services/examService';
import { getRecords } from '../../../services/db';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import Swal from 'sweetalert2';

const AdmitCards = () => {
  const { userData } = useAuth();
  const { schoolClasses, schoolData } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Form States
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('With Timetable Only');

  const availableClasses = schoolClasses?.length > 0
    ? schoolClasses.map(c => c.name)
    : ['Nursery', 'KG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

  const [masterFiles, setMasterFiles] = useState([]);

  useEffect(() => {
    loadExams();
  }, [schoolId]);

  const loadExams = async () => {
    setLoading(true);
    try {
      const [examsData, mfData] = await Promise.all([
        getExams(schoolId),
        getRecords('examMasterFiles', schoolId)
      ]);
      setExams(examsData || []);
      setMasterFiles(mfData || []);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to load exams', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedClass || !selectedExamId) {
      return Swal.fire('Warning', 'Please select both Class and Exam.', 'warning');
    }

    setGenerating(true);
    try {
      // 1. Fetch Students
      const filters = [{ field: 'class', operator: '==', value: selectedClass }];
      const studs = await getRecords('students', schoolId, filters);
      
      const studentsToPrint = (studs || []).sort((a, b) => {
        const rA = Number(a.rollNumber || a.rollNo || 0);
        const rB = Number(b.rollNumber || b.rollNo || 0);
        return rA - rB;
      });

      if (studentsToPrint.length === 0) {
        setGenerating(false);
        return Swal.fire('Error', `No students found in Class ${selectedClass}`, 'warning');
      }

      // 2. Fetch fresh Master Files to avoid stale data if edited in another tab
      const freshMfData = await getRecords('examMasterFiles', schoolId);
      
      const currentExam = exams.find(e => e.id === selectedExamId);
      if (!currentExam) {
        setGenerating(false);
        return Swal.fire('Error', 'Exam not found.', 'error');
      }

      // 3. Build Schedule
      const termName = String(currentExam.examName || currentExam.title || '').trim().toLowerCase();
      const sClass = String(selectedClass).trim().toLowerCase();
      
      const mf = (freshMfData || []).find(f => {
        const fTerm = String(f.term || '').trim().toLowerCase();
        const fClass = String(f.className || f.classId || '').trim().toLowerCase();
        return fClass === sClass && fTerm === termName;
      });

      let classSubjects = [];
      if (mf && mf.subjects && mf.subjects.length > 0) {
        classSubjects = mf.subjects.filter(s => s.included !== false);
      } else if (currentExam.subjects) {
        classSubjects = currentExam.subjects.filter(
          s => !s.classId || s.classId === selectedClass || s.className === selectedClass
        );
      }

      const schedule = classSubjects.map(s => {
        let day = '—';
        if (s.examDate) {
          try {
            day = new Date(s.examDate).toLocaleDateString('en-US', { weekday: 'long' });
          } catch (e) {}
        }
        return {
          date: s.examDate || '—',
          day: day,
          subject: s.subjectName || s.name || 'Subject',
          time: `${s.startTime || '09:00'} - ${s.endTime || '12:00'}`,
          room: s.room || 'Assigned Hall'
        };
      });
      
      // 4. Prepare PDF
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const schoolName = schoolData?.name || userData?.schoolName || 'TaleemiDunya Model School';
      
      // Helper to convert image URL to base64
      const getBase64Image = async (url) => {
        if (!url) return null;
        try {
          const res = await fetch(url, { mode: 'cors' });
          const blob = await res.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          return null;
        }
      };

      // Pre-fetch school logo
      let schoolLogoBase64 = null;
      if (schoolData?.logo || schoolData?.logoUrl) {
        schoolLogoBase64 = await getBase64Image(schoolData.logo || schoolData.logoUrl);
      }
      const examTitle = currentExam?.examName || 'ANNUAL EXAMINATION 2026';
      const session = currentExam?.academicYear || currentExam?.session || '2026-2027';

      // Dimensions
      const cardHeight = 135;
      const cardWidth = 190;
      const marginX = 10;

      for (let i = 0; i < studentsToPrint.length; i++) {
        const student = studentsToPrint[i];
        const cardIndexOnPage = i % 2;
        
        if (i > 0 && cardIndexOnPage === 0) {
          doc.addPage();
        }

        const currentY = cardIndexOnPage === 0 ? 10 : 152;

        // Optional Outer Border for cutting
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.rect(marginX, currentY, cardWidth, cardHeight);

        // Watermark Text (Faint)
        if (schoolLogoBase64) {
          doc.setGState(new doc.GState({opacity: 0.1}));
          // Draw large watermark logo in center
          doc.addImage(schoolLogoBase64, 'PNG', (pageWidth / 2) - 40, currentY + 30, 80, 80);
          doc.setGState(new doc.GState({opacity: 1.0}));
        } else {
          doc.setTextColor(245, 245, 245);
          doc.setFontSize(40);
          doc.setFont('helvetica', 'bold');
          doc.text("ADMIT CARD", pageWidth / 2, currentY + 75, { align: 'center', angle: 30 });
        }

        // Top Left Small Logo
        if (schoolLogoBase64) {
          doc.addImage(schoolLogoBase64, 'PNG', marginX + 5, currentY + 5, 20, 20);
        }

        // Header Section (Center Aligned)
        // Tagline
        doc.setTextColor(180, 0, 0); // Dark Red
        doc.setFontSize(10);
        doc.setFont('times', 'bold');
        doc.text("A Unique Balance between Deen - O - Dunya", pageWidth / 2, currentY + 12, { align: 'center' });

        // School Name
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(22);
        doc.setFont('times', 'bold');
        doc.text(schoolName, pageWidth / 2, currentY + 22, { align: 'center' });

        // Exam Title
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.text(`${examTitle} ${session}`, pageWidth / 2, currentY + 30, { align: 'center' });

        // Photo Box (Right Side)
        const photoX = marginX + cardWidth - 32;
        const photoY = currentY + 10;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.setFillColor(135, 206, 235); // Light Blue for photo background
        doc.roundedRect(photoX, photoY, 25, 32, 2, 2, 'FD');
        
        // Load student photo if available
        const studPhotoUrl = student.profileImage || student.profileUrl || student.photoUrl || student.photo;
        if (studPhotoUrl) {
          const studPhotoBase64 = await getBase64Image(studPhotoUrl);
          if (studPhotoBase64) {
            doc.addImage(studPhotoBase64, 'JPEG', photoX, photoY, 25, 32);
          }
        }
        
        // Student Info Section
        const infoY = currentY + 45;
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.setTextColor(0, 0, 0);
        
        const col1X = marginX + 5;
        const col2X = marginX + 100;
        const lineSpacing = 12;

        // Row 1: Name and GR #
        doc.text("Name:", col1X, infoY);
        const nameVal = (student.name || student.studentName || 'Student');
        doc.text(nameVal, col1X + 25, infoY);
        doc.setLineWidth(0.5);
        doc.line(col1X + 20, infoY + 1, col1X + 85, infoY + 1); // Underline Name

        doc.text("GR #:", col2X, infoY);
        const grVal = String(student.rollNumber || student.rollNo || '—');
        doc.text(grVal, col2X + 20, infoY);
        doc.line(col2X + 15, infoY + 1, col2X + 50, infoY + 1); // Underline GR

        // Row 2: Father Name and Class
        const infoY2 = infoY + lineSpacing;
        doc.text("Father Name:", col1X, infoY2);
        const fatherVal = (student.fatherName || '—');
        doc.text(fatherVal, col1X + 35, infoY2);
        doc.line(col1X + 30, infoY2 + 1, col1X + 85, infoY2 + 1); // Underline Father

        doc.text("Class:", col2X, infoY2);
        const classVal = student.class || '—';
        doc.text(classVal, col2X + 20, infoY2);
        doc.line(col2X + 15, infoY2 + 1, col2X + 50, infoY2 + 1); // Underline Class

        // Handle Versions
        if (selectedVersion.includes('With Timetable')) {
          const tableBody = schedule.length > 0 ? schedule.map(s => [
            s.date, s.day, s.subject
          ]) : [['As per schedule', 'Mon-Fri', 'All Subjects']];

          autoTable(doc, {
            startY: infoY2 + 8,
            margin: { left: marginX + 5, right: marginX + 5 },
            head: [['Date', 'Day', 'Subject']],
            body: tableBody,
            theme: 'grid',
            styles: { 
              font: 'times', 
              fontSize: 12, 
              textColor: [0, 0, 0], 
              lineColor: [0, 0, 0], 
              lineWidth: 0.3,
              cellPadding: 2 
            },
            headStyles: { 
              fillColor: [255, 255, 255], 
              textColor: [0, 0, 0], 
              fontStyle: 'bold',
              halign: 'center'
            },
            alternateRowStyles: { fillColor: [255, 255, 255] }
          });
        } else {
           doc.setFontSize(12);
           doc.setFont('times', 'italic');
           doc.text("Timetable will be announced separately by the class teacher.", marginX + 5, infoY2 + 20);
        }

        // Instructions line
        const instrY = currentY + 115;
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.setFont('times', 'italic');
        doc.text("Note: Student must bring this Admit Card & standard stationary. Electronic devices are strictly prohibited.", marginX + 5, instrY);

        // Signatures and Stamp Box
        const sigY = currentY + 124;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);

        // Candidate Sign
        doc.line(marginX + 10, sigY, marginX + 45, sigY);
        doc.setFontSize(8);
        doc.setFont('times', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text("Student Signature", marginX + 27, sigY + 4, { align: 'center' });

        // Principal Sign
        doc.line(marginX + cardWidth - 55, sigY, marginX + cardWidth - 15, sigY);
        doc.setFontSize(8);
        doc.text("Controller / Principal", marginX + cardWidth - 35, sigY + 4, { align: 'center' });
      }

      // Open in a new tab instead of saving automatically to match screenshot instruction
      const pdfBlobUrl = URL.createObjectURL(doc.output('blob'));
      window.open(pdfBlobUrl, '_blank');
      
      Swal.fire({
        title: 'Admit Cards Generated!',
        text: `Successfully generated PDF for ${studentsToPrint.length} student(s).`,
        icon: 'success',
        confirmButtonColor: '#22c55e'
      });

    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to generate PDF', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const versions = [
    {
      id: 'With Timetable Only',
      label: 'With Timetable Only',
      desc: 'Admit card with examination timetable',
      icon: <Calendar size={16} className="text-indigo-500" />
    },
    {
      id: 'With Timetable + Syllabus',
      label: 'With Timetable + Syllabus',
      desc: 'Timetable with examination syllabus',
      icon: <BookOpen size={16} className="text-indigo-500" />
    },
    {
      id: 'Without Timetable - Version 1',
      label: 'Without Timetable — Version 1',
      desc: 'Standard admit card format',
      icon: <FileText size={16} className="text-indigo-500" />
    },
    {
      id: 'Without Timetable - Version 2',
      label: 'Without Timetable — Version 2',
      desc: 'Alternative admit card format',
      icon: <FileText size={16} className="text-indigo-500" />
    }
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 text-gray-800 animate-fade-in font-sans pb-24">
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 md:p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex items-center gap-2 text-white justify-center">
              <Contact size={28} />
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Print Admit Card</h1>
            </div>
            <p className="text-blue-100 text-sm font-medium">Generate student examination admit cards with your preferred format</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Select Examination Details */}
          <div>
            <div className="flex items-center gap-2 text-gray-800 font-bold mb-4">
              <ClipboardList size={18} />
              <h2 className="text-base">Select Examination Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-5 rounded-xl border border-gray-200/60">
              
              {/* Select Class */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Users size={14} className="text-gray-500" />
                  <span>Select Class <span className="text-red-500">*</span></span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm"
                >
                  <option value="">-- Select Class --</option>
                  {availableClasses.map((cls, idx) => (
                    <option key={idx} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Select Exam */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <LayoutList size={14} className="text-gray-500" />
                  <span>Select Exam <span className="text-red-500">*</span></span>
                </label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm"
                  disabled={loading}
                >
                  <option value="">-- Select Exam --</option>
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.examName} ({ex.academicYear})
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Select Admit Card Version */}
          <div>
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-2">
                <LayoutList size={16} className="text-gray-600" />
                <h3 className="font-bold text-sm text-gray-800">Select Admit Card Version</h3>
              </div>
              
              <div className="p-4 space-y-3 bg-white">
                {versions.map((ver) => (
                  <label
                    key={ver.id}
                    onClick={() => setSelectedVersion(ver.id)}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedVersion === ver.id 
                        ? 'border-indigo-500 bg-indigo-50/30' 
                        : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedVersion === ver.id ? 'border-indigo-600' : 'border-gray-300'
                      }`}>
                        {selectedVersion === ver.id && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                        {ver.icon}
                        <span>{ver.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{ver.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Alert Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3 text-sm text-gray-600">
            <Info size={18} className="text-gray-800 mt-0.5 shrink-0" />
            <p>Select the class, examination and preferred admit card version. The admit card will open in a new browser tab for printing.</p>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.99] transition-all text-white font-bold text-sm py-4 rounded-xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Printer size={18} />
            )}
            <span>Generate & Print Admit Card</span>
          </button>
          
        </div>
      </div>
    </div>
  );
};

export default AdmitCards;
