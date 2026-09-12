import React, { useState, useEffect } from 'react';
import { 
  Award, Printer, Search, Download, Eye, Calendar, MapPin, 
  Clock, User, CheckSquare, Square, Share2, QrCode, Sparkles, 
  RefreshCw, CheckCircle2, ShieldCheck, Filter, Layers, X
} from 'lucide-react';
import GlassCard from '../../../components/common/GlassCard';
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
  const { schoolClasses } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Selectors
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Preview Modal
  const [previewStudent, setPreviewStudent] = useState(null);
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [schoolId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const examsData = await getExams(schoolId);
      setExams(examsData);

      if (examsData.length > 0) {
        setSelectedExamId(examsData[0].id);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to load exams', 'error');
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

  // Fetch students when class/section changes
  useEffect(() => {
    if (!selectedClass) return;
    fetchStudents();
  }, [selectedClass, selectedSection, schoolId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const filters = [{ field: 'class', operator: '==', value: selectedClass }];
      const studs = await getRecords('students', schoolId, filters);
      
      const sorted = (studs || []).sort((a, b) => {
        const rA = Number(a.rollNumber || a.rollNo || 0);
        const rB = Number(b.rollNumber || b.rollNo || 0);
        return rA - rB;
      });

      setStudents(sorted);
      // Select all by default
      setSelectedStudentIds(sorted.map(s => s.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Students
  const filteredStudents = students.filter(s => {
    const matchesSearch = (s.name || s.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.rollNumber || s.rollNo || '').toString().includes(searchTerm) ||
                          (s.fatherName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = selectedSection === 'All' || s.section === selectedSection;
    return matchesSearch && matchesSection;
  });

  const handleToggleStudent = (id) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  // Open Preview Modal
  const handleOpenPreview = async (student) => {
    setPreviewStudent(student);
    try {
      const qrPayload = JSON.stringify({
        school: userData?.schoolName || 'TaleemiDunya School',
        exam: currentExam?.examName || 'Examination',
        student: student.name || student.studentName,
        roll: student.rollNumber || student.rollNo,
        class: student.class,
        section: student.section || 'A',
        auth: `TD-AUTH-${student.id.slice(0, 6)}`
      });
      const qrUrl = await QRCode.toDataURL(qrPayload, { width: 120, margin: 1 });
      setPreviewQrDataUrl(qrUrl);
    } catch (e) {
      console.error(e);
    }
    setIsPreviewOpen(true);
  };

  // Format schedule table for this student's class
  const getExamSchedule = () => {
    if (!currentExam || !currentExam.subjects) return [];
    const classSubjects = currentExam.subjects.filter(
      s => !s.classId || s.classId === selectedClass || s.className === selectedClass
    );

    return classSubjects.map(s => {
      let day = '—';
      if (s.examDate) {
        try {
          day = new Date(s.examDate).toLocaleDateString('en-US', { weekday: 'short' });
        } catch (e) {}
      }
      return {
        date: s.examDate || '—',
        day: day,
        subject: s.subjectName || s.name || 'Subject',
        code: s.subjectCode || '—',
        time: `${s.startTime || '09:00'} - ${s.endTime || '12:00'}`,
        room: s.room || 'Hall A'
      };
    });
  };

  // Generate Admit Cards PDF (Single or Bulk)
  const generateAdmitCardsPDF = async (targetStudents = null) => {
    const studentsToPrint = targetStudents || students.filter(s => selectedStudentIds.includes(s.id));
    if (studentsToPrint.length === 0) {
      return Swal.fire('Error', 'Please select at least one student to generate admit cards', 'warning');
    }

    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const schedule = getExamSchedule();
      const schoolName = userData?.schoolName || 'TaleemiDunya Model School';
      const schoolAddress = userData?.address || userData?.schoolAddress || 'Official Campus, Model Town';
      const examTitle = currentExam?.examName || 'ANNUAL EXAMINATION 2026';
      const session = currentExam?.academicYear || currentExam?.session || '2026-2027';

      // 2 Admit Cards Per Page
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

        // Outer Card Border
        doc.setDrawColor(37, 99, 235); // Blue 600
        doc.setLineWidth(0.6);
        doc.setFillColor(252, 253, 255);
        doc.roundedRect(marginX, currentY, cardWidth, cardHeight, 3, 3, 'FD');

        // Header Background Banner
        doc.setFillColor(30, 58, 138); // Deep Blue
        doc.rect(marginX, currentY, cardWidth, 22, 'F');

        // School Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolName.toUpperCase(), pageWidth / 2, currentY + 8, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(schoolAddress, pageWidth / 2, currentY + 13, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(191, 219, 254); // Light blue
        doc.text(`EXAMINATION ADMIT CARD • ${session}`, pageWidth / 2, currentY + 19, { align: 'center' });

        // Watermark in middle of card
        doc.setTextColor(240, 243, 250);
        doc.setFontSize(36);
        doc.setFont('helvetica', 'bold');
        doc.text("ADMIT CARD", pageWidth / 2, currentY + 75, { align: 'center', angle: 30 });

        // Student Info Section Box
        const infoY = currentY + 26;
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');

        // Column 1
        doc.text(`Exam: ${examTitle}`, marginX + 5, infoY);
        doc.text(`Roll No: ${student.rollNumber || student.rollNo || '—'}`, marginX + 5, infoY + 5);
        doc.text(`Class: ${student.class} (Sec ${student.section || 'A'})`, marginX + 5, infoY + 10);

        // Column 2
        doc.text(`Student Name: ${(student.name || student.studentName || 'Student').toUpperCase()}`, marginX + 70, infoY);
        doc.text(`Father Name: ${student.fatherName || '—'}`, marginX + 70, infoY + 5);
        doc.text(`Reg / B-Form: ${student.bForm || student.admissionNo || 'Verified'}`, marginX + 70, infoY + 10);

        // Student Photo Box / Placeholder
        const photoX = marginX + cardWidth - 28;
        const photoY = infoY - 2;
        doc.setDrawColor(203, 213, 225);
        doc.setFillColor(241, 245, 249);
        doc.rect(photoX, photoY, 22, 22, 'FD');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text("PHOTO", photoX + 11, photoY + 12, { align: 'center' });

        // QR Code generation
        const qrPayload = `TD-VERIFY|${schoolId}|${examTitle}|${student.rollNumber || student.rollNo}|${student.id}`;
        try {
          const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 60, margin: 0 });
          doc.addImage(qrDataUrl, 'PNG', marginX + cardWidth - 28, currentY + 52, 22, 22);
        } catch (e) {}

        // Exam Timetable Table inside Admit Card
        const tableBody = schedule.length > 0 ? schedule.map(s => [
          s.date,
          s.day,
          s.subject,
          s.time,
          s.room
        ]) : [
          ['As per schedule', 'Mon-Fri', 'All Core Subjects', '09:00 - 12:00', 'Assigned Hall']
        ];

        autoTable(doc, {
          startY: currentY + 42,
          margin: { left: marginX + 4, right: marginX + 32 },
          head: [['Date', 'Day', 'Subject', 'Time', 'Room']],
          body: tableBody.slice(0, 5), // show top subjects to fit card cleanly
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1.5, textColor: [15, 23, 42] },
          headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        // Instructions line
        const instrY = currentY + 106;
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'italic');
        doc.text("Note: Student must bring this Admit Card & standard stationary. Electronic devices are strictly prohibited.", marginX + 5, instrY);

        // Signatures and Stamp Box
        const sigY = currentY + 124;
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.4);

        // Candidate Sign
        doc.line(marginX + 10, sigY, marginX + 45, sigY);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text("Student Signature", marginX + 27, sigY + 4, { align: 'center' });

        // School Stamp Circle
        doc.setDrawColor(203, 213, 225);
        doc.circle(pageWidth / 2, sigY - 2, 8, 'D');
        doc.setFontSize(5.5);
        doc.setTextColor(148, 163, 184);
        doc.text("OFFICIAL STAMP", pageWidth / 2, sigY - 1, { align: 'center' });

        // Principal Sign
        doc.setDrawColor(148, 163, 184);
        doc.line(marginX + cardWidth - 55, sigY, marginX + cardWidth - 15, sigY);
        doc.setFontSize(6.5);
        doc.setTextColor(51, 65, 85);
        doc.text("Controller / Principal", marginX + cardWidth - 35, sigY + 4, { align: 'center' });
      }

      const fileName = `AdmitCards_${selectedClass.replace(/\s+/g, '_')}_${(currentExam?.examName || 'Exam').replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);

      Swal.fire({
        title: 'Admit Cards Generated!',
        text: `Successfully generated PDF for ${studentsToPrint.length} student(s).`,
        icon: 'success',
        background: '#1a1f37',
        color: '#fff',
        confirmButtonColor: '#3b82f6'
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to generate PDF', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${currentExam?.examName} Admit Cards`,
        text: `Admit cards for Class ${selectedClass} - ${currentExam?.examName}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      Swal.fire('Link Copied', 'Admit Cards page link copied to clipboard', 'info');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-dark-card/90 via-dark-card/60 to-primary-950/40 p-6 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-primary-500/10 rounded-xl text-primary-400 border border-primary-500/20">
              <Award size={26} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white via-dark-text to-primary-300 bg-clip-text text-transparent">
                Admit Cards
              </h1>
              <p className="text-xs md:text-sm text-dark-muted font-medium">
                Generate, preview, download, and print verified examination admit cards with QR security codes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleShare}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-dark-muted hover:text-white border border-white/10 transition-colors"
            title="Share"
          >
            <Share2 size={18} />
          </button>

          <button
            onClick={() => generateAdmitCardsPDF()}
            disabled={generating || selectedStudentIds.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-primary-600/30 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {generating ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
            <span>Download Selected ({selectedStudentIds.length})</span>
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <GlassCard className="p-5 border-white/5 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Exam Selector */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar size={13} className="text-primary-400" />
              <span>1. Select Exam</span>
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-primary-500 transition-colors"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.examName} ({ex.academicYear})
                </option>
              ))}
            </select>
          </div>

          {/* Class Selector */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers size={13} className="text-primary-400" />
              <span>2. Select Class</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-primary-500 transition-colors"
            >
              {availableClasses.map((cls, idx) => (
                <option key={idx} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Filter size={13} className="text-primary-400" />
              <span>3. Section</span>
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-primary-500 transition-colors"
            >
              <option value="All">All Sections</option>
              {['A', 'B', 'C', 'D', 'Boys', 'Girls'].map((sec, idx) => (
                <option key={idx} value={sec}>Section {sec}</option>
              ))}
            </select>
          </div>

        </div>
      </GlassCard>

      {/* Student List & Selection */}
      <GlassCard className="p-0 overflow-hidden border-white/5 shadow-2xl">
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-primary-400 font-bold text-xs flex items-center gap-2 border border-white/5"
            >
              {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                <CheckSquare size={16} />
              ) : (
                <Square size={16} />
              )}
              <span>Select All</span>
            </button>
            <span className="text-xs text-dark-muted font-medium">
              {selectedStudentIds.length} of {filteredStudents.length} selected
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={15} />
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
                <th className="py-4 px-4 text-center w-12">Select</th>
                <th className="py-4 px-3">Roll No</th>
                <th className="py-4 px-4">Student Details</th>
                <th className="py-4 px-4">Father Name</th>
                <th className="py-4 px-3">Class & Section</th>
                <th className="py-4 px-3">Exam Schedule</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-dark-text">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-dark-muted">
                    <RefreshCw className="animate-spin inline-block mr-2 text-primary-400" size={20} />
                    Loading student roster...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-dark-muted text-xs">
                    No students found for Class {selectedClass}.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stud) => {
                  const isSelected = selectedStudentIds.includes(stud.id);
                  return (
                    <tr 
                      key={stud.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleStudent(stud.id)}
                          className="text-primary-400 hover:text-primary-300"
                        >
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-dark-muted" />}
                        </button>
                      </td>
                      <td className="py-4 px-3 font-mono font-bold text-xs text-primary-300">
                        {stud.rollNumber || stud.rollNo || '—'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500/20 to-indigo-500/20 border border-primary-500/30 flex items-center justify-center font-bold text-xs text-white overflow-hidden shrink-0">
                            {stud.photoUrl || stud.photo ? (
                              <img src={stud.photoUrl || stud.photo} alt={stud.name} className="w-full h-full object-cover" />
                            ) : (
                              (stud.name || stud.studentName || 'S').slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white">{stud.name || stud.studentName}</div>
                            <div className="text-[11px] text-dark-muted">ID: {stud.id.slice(0, 6)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs text-dark-muted">
                        {stud.fatherName || '—'}
                      </td>
                      <td className="py-4 px-3">
                        <span className="text-xs font-semibold text-white/90 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                          {stud.class} - {stud.section || 'A'}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-xs text-dark-muted font-medium">
                        {getExamSchedule().length} Subjects Scheduled
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Preview Admit Card */}
                          <button
                            onClick={() => handleOpenPreview(stud)}
                            className="p-1.5 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/20 text-xs font-bold flex items-center gap-1 transition-all"
                            title="Interactive Live Preview"
                          >
                            <Eye size={14} />
                            <span className="hidden sm:inline">Preview</span>
                          </button>

                          {/* Print / Download Single */}
                          <button
                            onClick={() => generateAdmitCardsPDF([stud])}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-dark-muted hover:text-white transition-all"
                            title="Download Single PDF"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ADMIT CARD LIVE INTERACTIVE PREVIEW MODAL */}
      {isPreviewOpen && previewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-dark-card border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Live Admit Card Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateAdmitCardsPDF([previewStudent])}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary-600/30"
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </button>
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 text-dark-muted hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Rendered Admit Card Card UI */}
            <div className="p-6 bg-slate-900/90 text-slate-800">
              <div className="bg-white rounded-2xl border-2 border-blue-600 p-6 shadow-2xl relative overflow-hidden space-y-4">
                
                {/* Header Banner */}
                <div className="text-center border-b-2 border-blue-900 pb-3">
                  <h2 className="text-xl font-black text-blue-900 tracking-wide">
                    {userData?.schoolName || 'TALEEMIDUNYA MODEL SCHOOL'}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {userData?.address || 'Official Registered Campus • Examination Authority'}
                  </p>
                  <div className="mt-1 inline-block bg-blue-900 text-white text-[11px] font-black px-4 py-0.5 rounded-full uppercase tracking-wider">
                    {currentExam?.examName || 'EXAMINATION ADMIT CARD'} • {currentExam?.academicYear || '2026-2027'}
                  </div>
                </div>

                {/* Student Info Bar */}
                <div className="flex items-start justify-between gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    <div><span className="text-slate-400 font-semibold">Student Name:</span> <span className="font-bold text-slate-900">{previewStudent.name || previewStudent.studentName}</span></div>
                    <div><span className="text-slate-400 font-semibold">Roll Number:</span> <span className="font-bold text-blue-700">{previewStudent.rollNumber || previewStudent.rollNo || '—'}</span></div>
                    <div><span className="text-slate-400 font-semibold">Father Name:</span> <span className="font-bold text-slate-900">{previewStudent.fatherName || '—'}</span></div>
                    <div><span className="text-slate-400 font-semibold">Class / Sec:</span> <span className="font-bold text-slate-900">{previewStudent.class} ({previewStudent.section || 'A'})</span></div>
                  </div>

                  <div className="flex items-center gap-3">
                    {previewQrDataUrl && (
                      <img src={previewQrDataUrl} alt="QR" className="w-16 h-16 rounded border border-slate-300 p-0.5" />
                    )}
                    <div className="w-16 h-16 rounded border border-slate-300 bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 overflow-hidden">
                      {previewStudent.photoUrl ? (
                        <img src={previewStudent.photoUrl} alt="Student" className="w-full h-full object-cover" />
                      ) : (
                        <span>PHOTO</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Exam Schedule Table */}
                <div>
                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Exam Timetable</h4>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-blue-900 text-white text-[11px]">
                      <tr>
                        <th className="p-1.5">Date</th>
                        <th className="p-1.5">Day</th>
                        <th className="p-1.5">Subject</th>
                        <th className="p-1.5">Time</th>
                        <th className="p-1.5">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700 text-[11px]">
                      {getExamSchedule().length > 0 ? (
                        getExamSchedule().map((s, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="p-1.5 font-bold">{s.date}</td>
                            <td className="p-1.5">{s.day}</td>
                            <td className="p-1.5 font-semibold text-slate-900">{s.subject}</td>
                            <td className="p-1.5">{s.time}</td>
                            <td className="p-1.5">{s.room}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="p-3 text-center text-slate-400 italic">
                            Timetable will be announced shortly.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signatures & Stamp */}
                <div className="pt-6 flex items-end justify-between text-center text-[10px] text-slate-600 border-t border-slate-200">
                  <div className="w-28 border-t border-slate-400 pt-1 font-medium">
                    Student Signature
                  </div>
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-400">
                    OFFICIAL STAMP
                  </div>
                  <div className="w-28 border-t border-slate-400 pt-1 font-bold text-slate-900">
                    Principal / Controller
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdmitCards;
