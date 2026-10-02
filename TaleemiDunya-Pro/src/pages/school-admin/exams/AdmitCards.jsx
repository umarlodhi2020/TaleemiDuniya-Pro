import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, Printer, Search, Download, Eye, Calendar, MapPin, 
  Clock, User, CheckSquare, Square, Share2, QrCode, Sparkles, 
  RefreshCw, CheckCircle2, ShieldCheck, Filter, Layers, X
} from 'lucide-react';
import FeatureVideoBtn from '../../../components/common/FeatureVideoBtn';
import { useAuth } from '../../../context/AuthContext';
import { useSchool } from '../../../context/SchoolContext';
import { getRecords } from '../../../services/db';
import { checkStudentFeeClearance } from '../../../services/examService';
import Swal from 'sweetalert2';

const DEFAULT_TERMS = [
  '1st Assessment 2025-26',
  '2nd Assessment 2025-26',
  '3rd Assessment 2025-26',
  '4th Assessment 2025-26',
  'First Term 2025-26',
  'Mid Term Examinations 2025-2026',
  'Second Term 2026',
  'Final Term Exam 2026',
  'Annual Exam 2026',
  'Monthly Test',
  'Pre-Board Exam'
];

const DEFAULT_SUBJECTS_LIST = [
  'Islamiat',
  'Science',
  'Urdu',
  'Math',
  'Social Studies',
  'English',
  'Drawing',
  'Madarsa'
];

// Date and Day formatters
const formatExamDate = (dateStr) => {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const getExamDay = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { weekday: 'long' });
};

const AdmitCards = () => {
  const { userData } = useAuth();
  const { schoolClasses, schoolData } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';
  const printRef = useRef(null);

  // Selector States
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedStudentForAdmitCard, setSelectedStudentForAdmitCard] = useState('ALL');

  // Loaded Data
  const [availableClasses, setAvailableClasses] = useState([]);
  const [createdExams, setCreatedExams] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [masterFiles, setMasterFiles] = useState([]);
  const [subjectRows, setSubjectRows] = useState([]);

  // Fee Status & Audit
  const [feeStatusMap, setFeeStatusMap] = useState({});
  const [checkingFees, setCheckingFees] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, [schoolId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [filesData, examsData, studentsData, classesData] = await Promise.all([
        getRecords('examMasterFiles', schoolId),
        getRecords('exams', schoolId),
        getRecords('students', schoolId),
        getRecords('classes', schoolId)
      ]);

      let classList = [];
      if (classesData && classesData.length > 0) {
        classList = [...classesData]
          .sort((a, b) => (parseFloat(a.order) || 0) - (parseFloat(b.order) || 0))
          .map(c => c.name || c.className);
      } else if (schoolClasses?.length > 0) {
        classList = schoolClasses.map(c => c.name);
      } else {
        classList = ['7th', 'Nursery', 'KG', '1st', '2nd', '3rd', '4th', '5th', '6th', '8th', '9th', '10th'];
      }

      setAvailableClasses(classList);
      if (classList.length > 0 && !selectedClass) {
        setSelectedClass(classList[0]);
      }

      setMasterFiles(filesData || []);
      setStudentsList(studentsData || []);

      const examNames = examsData ? examsData.map(e => e.examName || e.title).filter(Boolean) : [];
      const uniqueExams = Array.from(new Set(examNames));
      const finalTerms = uniqueExams.length > 0 ? uniqueExams : DEFAULT_TERMS;
      setCreatedExams(finalTerms);
      if (finalTerms.length > 0 && !selectedTerm) {
        setSelectedTerm(finalTerms[0]);
      }
    } catch (err) {
      console.error('Error loading Admit Cards data:', err);
      Swal.fire('Error', 'Failed to load initial data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load subject schedule when class or term changes
  useEffect(() => {
    if (!selectedClass || !selectedTerm) {
      setSubjectRows([]);
      return;
    }

    // Find all potential matching master files (case-insensitive)
    const matches = masterFiles.filter(
      f => {
        const matchClass = (f.className || '').toLowerCase() === selectedClass.toLowerCase() || 
                           (f.classId || '').toLowerCase() === selectedClass.toLowerCase();
        const matchTerm = (f.term || '').toLowerCase() === selectedTerm.toLowerCase();
        return matchClass && matchTerm;
      }
    );

    // Prefer the master file that has actual dates filled in (in case of duplicates like 'Nursery' vs 'NURSERY')
    matches.sort((a, b) => {
      const aDatesCount = (a.subjects || []).filter(s => s.included && s.examDate).length;
      const bDatesCount = (b.subjects || []).filter(s => s.included && s.examDate).length;
      return bDatesCount - aDatesCount;
    });

    const found = matches[0];

    if (found && Array.isArray(found.subjects) && found.subjects.length > 0) {
      const activeSubjects = found.subjects.filter(s => s.included);
      // Sort subjects chronologically by examDate
      activeSubjects.sort((a, b) => {
        if (!a.examDate) return 1;
        if (!b.examDate) return -1;
        return new Date(a.examDate) - new Date(b.examDate);
      });
      setSubjectRows(activeSubjects);
    } else {
      setSubjectRows(DEFAULT_SUBJECTS_LIST.map((name) => {
        return {
          subjectName: name,
          included: true,
          examDate: '', // Empty date so it shows TBD
          startTime: '',
          endTime: '',
          room: '',
          invigilator: ''
        };
      }));
    }
  }, [selectedClass, selectedTerm, masterFiles]);

  const filteredStudents = studentsList.filter(s => {
    if (!selectedClass) return true;
    const studentClass = s.class || s.className || '';
    return studentClass.toLowerCase() === selectedClass.toLowerCase();
  });

  const handleCheckFeeClearance = async () => {
    setCheckingFees(true);
    const map = {};
    for (const student of filteredStudents) {
      const res = await checkStudentFeeClearance(student.id, schoolId);
      map[student.id] = res;
    }
    setFeeStatusMap(map);
    setCheckingFees(false);
    Swal.fire({
      title: 'Fee Audit Complete',
      text: `Audited fee accounts for ${filteredStudents.length} students.`,
      icon: 'info',
      background: '#1a1f37',
      color: '#fff'
    });
  };

  const handlePrintWindow = () => {
    const settingsHtml = [
      '<div style="text-align:left;font-size:13px;line-height:2;color:#1a1a1a">',
      '<p style="font-weight:700;color:#0070f3;margin-bottom:6px">',
      '1 Admit Card automatically 1 page par set ho jayega',
      '</p>',
      '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb">',
      '<tr style="background:#eff6ff"><td style="padding:5px 10px;font-weight:600;width:45%">Paper Size</td><td style="padding:5px 10px"><b>A5</b></td></tr>',
      '<tr><td style="padding:5px 10px;font-weight:600">Orientation</td><td style="padding:5px 10px"><b>Landscape</b></td></tr>',
      '<tr style="background:#eff6ff"><td style="padding:5px 10px;font-weight:600">Scale</td><td style="padding:5px 10px"><b>100%</b> (Default)</td></tr>',
      '<tr><td style="padding:5px 10px;font-weight:600">Margins</td><td style="padding:5px 10px"><b>Minimum / None</b></td></tr>',
      '<tr style="background:#eff6ff"><td style="padding:5px 10px;font-weight:600">Background Graphics</td><td style="padding:5px 10px"><b>ON (Enable)</b></td></tr>',
      '</table>',
      '<p style="margin-top:8px;color:#059669;font-weight:700;text-align:center;font-size:12px">Yeh settings lagane ke baad Print karen</p>',
      '</div>'
    ].join('');

    Swal.fire({
      title: 'Print Settings Guide',
      html: settingsHtml,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Print Now',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0070f3',
      cancelButtonColor: '#6b7280',
      width: 440,
      background: '#ffffff',
    }).then((result) => {
      if (result.isConfirmed) {
        // Wait for Swal to fully close before printing
        setTimeout(() => window.print(), 500);
      }
    });
  };

  const schoolName = schoolData?.name || schoolData?.schoolName || userData?.schoolName || 'Your School Name';
  const schoolLogo = schoolData?.branding?.logo || schoolData?.logo || schoolData?.logoUrl || null;
  const schoolSlogan = schoolData?.slogan || schoolData?.tagline || 'A Unique Balance between Deen – O – Dunya';

  const principalRule = schoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal');
  const principalSignatureUrl = schoolData?.signatureSettings?.principalSignatureUrl || principalRule?.signatureUrl || null;
  const teacherRule = schoolData?.signatureSettings?.rules?.find(r => r.type === 'Teacher' && String(r.class) === String(selectedClass));
  const teacherSignatureUrl = teacherRule?.signatureUrl || null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto font-sans animate-fade-in pb-24 text-black">
      
      {/* Top Header Controls (Hidden during print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0070f3] tracking-tight flex items-center gap-3">
            Student Admit Cards Generator
            <FeatureVideoBtn featureId="admit-cards" />
          </h1>
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-0.5">
            Generate and print official examination roll number slips with school watermark
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckFeeClearance}
            disabled={checkingFees}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {checkingFees ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            <span>Audit Fee Clearance</span>
          </button>

          <button
            onClick={handlePrintWindow}
            className="px-5 py-2 bg-[#0070f3] hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Print Admit Cards</span>
          </button>
        </div>
      </div>

      {/* Selectors Card (Hidden during print) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Select Class */}
          <div>
            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="">Select Class</option>
              {availableClasses.map((cls, idx) => (
                <option key={idx} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Select Term */}
          <div>
            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">
              Select Term / Exam
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="">Select Term</option>
              {createdExams.map((term, idx) => (
                <option key={idx} value={term}>{term}</option>
              ))}
            </select>
          </div>

          {/* Filter Student */}
          <div>
            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">
              Filter Student
            </label>
            <select
              value={selectedStudentForAdmitCard}
              onChange={(e) => setSelectedStudentForAdmitCard(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="ALL">All Students ({filteredStudents.length})</option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>{s.name || s.fullName} (GR/Roll: {s.grNo || s.rollNo || 'N/A'})</option>
              ))}
            </select>
          </div>

        </div>

        {selectedClass && selectedTerm && (
          <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs font-bold text-gray-600">
            <span>Target Class: <b className="text-blue-700">{selectedClass}</b> • Term: <b className="text-blue-700">{selectedTerm}</b></span>
            <span>School: <b className="text-gray-900">{schoolName}</b> • Students: <b>{filteredStudents.length}</b></span>
          </div>
        )}
      </div>

      {/* ADMIT CARDS PRINT AREA */}
      {(!selectedClass || !selectedTerm) ? (
        <div className="p-5 bg-[#e0f2fe] border border-[#bae6fd] rounded-2xl text-[#0369a1] text-sm font-semibold shadow-sm print:hidden">
          Select Class and Term to generate student admit cards.
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm font-semibold shadow-sm print:hidden">
          No student records found for Class {selectedClass}.
        </div>
      ) : (
        <div ref={printRef} className="space-y-8 printable-report-area print:space-y-0">
          <style type="text/css" media="print">
            {`
              @page { size: A4 portrait; margin: 0 0.4in; }
              body { margin: 0; padding: 0; }
              .admit-card-item {
                zoom: 1.03; /* Scaled down slightly to allow natural height to fit */
              }
              .cut-line {
                margin-top: 10px;
                margin-bottom: 10px;
              }
            `}
          </style>
          {filteredStudents
            .filter(s => selectedStudentForAdmitCard === 'ALL' || s.id === selectedStudentForAdmitCard)
            .map((student, idx, arr) => {
              const feeData = feeStatusMap[student.id];

              return (
                <React.Fragment key={idx}>
                <div 
                  className="admit-card-item relative bg-white border-[3px] border-black p-1 max-w-3xl mx-auto shadow-xl mb-8 print:mb-2 print:max-w-none print:w-full print:h-auto print:shadow-none print:break-inside-avoid print:border-0 flex flex-col"
                  style={{ fontFamily: 'Times New Roman, Georgia, serif', pageBreakInside: 'avoid' }}
                >
                  {/* Inner Border Box (This will be the only border printed) */}
                  <div className="border-[3px] border-black p-3 md:p-4 print:p-2 relative flex-1 flex flex-col justify-between space-y-2 print:space-y-0">
                    
                    {/* Background Watermark Logo (School Logo Watermark) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-[0.07] print:opacity-[0.08]">
                      {schoolLogo ? (
                        <img 
                          src={schoolLogo} 
                          alt="School Watermark" 
                          className="w-80 h-80 md:w-96 md:h-96 object-contain filter grayscale" 
                        />
                      ) : (
                        <div className="w-72 h-72 rounded-full border-8 border-black flex items-center justify-center p-6 text-center transform -rotate-12">
                          <span className="text-3xl font-black font-serif text-black uppercase tracking-wider leading-tight">
                            {schoolName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Foreground Content */}
                    <div className="relative z-10 space-y-3 print:space-y-1">
                      
                      {/* Top Header matching reference image */}
                      <div className="relative text-center pb-1">
                        
                        {/* Left School Logo */}
                        <div className="absolute left-0 top-0 flex items-center justify-center w-28 h-28 md:w-32 md:h-32">
                          {schoolLogo ? (
                            <img src={schoolLogo} alt="School Logo" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-black flex items-center justify-center p-1 bg-gray-50">
                              <span className="text-xs font-black text-black text-center leading-tight">
                                {schoolName}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Center Header Details */}
                        <div className="px-16 md:px-24 space-y-2">
                          <div className="flex items-center justify-center gap-2 text-sm md:text-base font-bold text-red-600">
                            <span className="border-t border-red-500 w-8"></span>
                            <span>{schoolSlogan}</span>
                            <span className="border-t border-red-500 w-8"></span>
                          </div>
                          
                          <h1 className="text-3xl md:text-4xl font-black text-black leading-tight tracking-tight">
                            {schoolName}
                          </h1>

                          <div className="flex items-center justify-center gap-2">
                            <span className="border-t border-black w-12"></span>
                            <span className="text-lg md:text-xl font-bold text-black px-2">
                              {selectedTerm || 'Mid Term 2026-27'}
                            </span>
                            <span className="border-t border-black w-12"></span>
                          </div>
                        </div>

                        {/* Pending fee badge if applicable (hidden in print) */}
                        {feeData && !feeData.cleared && (
                          <span className="absolute right-0 top-0 px-2 py-0.5 bg-red-100 text-red-700 border border-red-300 font-bold text-[10px] rounded uppercase print:hidden">
                            ⚠️ Pending Fee
                          </span>
                        )}
                      </div>

                      {/* Student Details Row & Photo Box */}
                      <div className="pt-4 flex justify-between items-center text-lg md:text-xl print:text-lg font-bold text-black">
                        
                        {/* Student Info Grid */}
                        <div className="grid grid-cols-12 gap-y-4 print:gap-y-2 items-baseline flex-1 pr-6">
                          
                          {/* Row 1: Student Name & GR # */}
                          <div className="col-span-7 flex items-baseline">
                            <span className="whitespace-nowrap text-lg md:text-xl print:text-lg font-bold">Student Name:</span>
                            <span className="underline decoration-2 underline-offset-4 ml-2 font-black text-xl md:text-2xl print:text-xl truncate">
                              {student.name || student.fullName || 'Waniya Razi'}
                            </span>
                          </div>
                          
                          <div className="col-span-5 flex items-baseline justify-start pl-6">
                            <span className="whitespace-nowrap text-lg md:text-xl print:text-lg font-bold">GR #:</span>
                            <span className="font-black text-xl md:text-2xl print:text-xl ml-2">
                              {student.grNo || student.grNumber || student.rollNo || student.rollNumber || '176'}
                            </span>
                          </div>

                          {/* Row 2: Father Name & Class */}
                          <div className="col-span-7 flex items-baseline">
                            <span className="whitespace-nowrap text-lg md:text-xl print:text-lg font-bold">Father Name:</span>
                            <span className="underline decoration-2 underline-offset-4 ml-2 font-black text-xl md:text-2xl print:text-xl truncate">
                              {student.fatherName || 'Razi uddin'}
                            </span>
                          </div>

                          <div className="col-span-5 flex items-baseline justify-start pl-6">
                            <span className="whitespace-nowrap text-lg md:text-xl print:text-lg font-bold">Class:</span>
                            <span className="underline decoration-2 underline-offset-4 ml-2 font-black text-xl md:text-2xl print:text-xl">
                              {student.class || selectedClass || '7th'}
                            </span>
                          </div>

                        </div>

                        {/* Photo Box Container (Top Right matching reference) */}
                        <div className="w-28 h-32 md:w-32 md:h-36 border-2 border-black flex flex-col items-center justify-center bg-white flex-shrink-0 overflow-hidden shadow-sm">
                          {(student.photoUrl || student.photo || student.picture || student.profileImage || student.avatar || student.studentPhoto || student.imageUrl || student.image || student.profilePicture) ? (
                            <img 
                              src={student.photoUrl || student.photo || student.picture || student.profileImage || student.avatar || student.studentPhoto || student.imageUrl || student.image || student.profilePicture} 
                              alt="Student" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center p-1">
                              <span className="text-sm font-sans font-black text-black tracking-wider uppercase leading-tight">
                                NO PHOTO
                              </span>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Ornamental Divider */}
                      <div className="flex items-center justify-center py-1 text-black">
                        <span className="border-t border-black flex-1 max-w-[220px]"></span>
                        <span className="px-3 text-sm font-serif">❖</span>
                        <span className="border-t border-black flex-1 max-w-[220px]"></span>
                      </div>

                      {/* Schedule Table (Black Header matching reference image) */}
                      <div className="pt-2">
                        <table className="w-full border-collapse border-[3px] border-black text-center text-2xl md:text-3xl print:text-xl">
                          <thead>
                            <tr className="bg-black text-white font-serif">
                              <th className="border-r-2 border-gray-600 p-2 print:p-2 font-bold w-1/3 text-center">Date</th>
                              <th className="border-r-2 border-gray-600 p-2 print:p-2 font-bold w-1/3 text-center">Day</th>
                              <th className="p-2 print:p-2 font-bold w-1/3 text-center">Subjects</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjectRows.map((sub, i) => (
                              <tr key={i} className="border-b-2 border-black">
                                <td className="border-r-2 border-black p-2 print:p-2 font-bold">{formatExamDate(sub.examDate)}</td>
                                <td className="border-r-2 border-black p-2 print:p-2 font-bold">{getExamDay(sub.examDate)}</td>
                                <td className="p-2 print:p-2 font-bold">{sub.subjectName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Bottom Ornamental Divider */}
                      <div className="flex items-center justify-center pt-2 print:pt-1 text-black">
                        <span className="border-t border-black flex-1 max-w-[160px]"></span>
                        <span className="px-2 text-xs font-serif">❖</span>
                        <span className="border-t border-black flex-1 max-w-[160px]"></span>
                      </div>

                      {/* Signatures Footer */}
                      <div className="flex justify-between items-end px-8 pt-8 pb-4 print:pt-2 print:pb-0">
                        <div className="flex flex-col items-center">
                          {teacherSignatureUrl ? (
                            <img src={teacherSignatureUrl} alt="Class Teacher" className="h-24 print:h-12 max-w-[200px] scale-125 origin-bottom origin-bottom mix-blend-multiply object-contain -mb-1" />
                          ) : (
                            <div className="h-16 print:h-8"></div>
                          )}
                          <div className="w-36 border-t-2 border-black pt-1 text-center">
                            <span className="text-xs font-bold uppercase">Class Teacher</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center">
                          {principalSignatureUrl ? (
                            <img src={principalSignatureUrl} alt="Principal" className="h-24 print:h-12 max-w-[200px] scale-125 origin-bottom origin-bottom mix-blend-multiply object-contain -mb-1" />
                          ) : (
                            <div className="h-16 print:h-8"></div>
                          )}
                          <div className="w-36 border-t-2 border-black pt-1 text-center">
                            <span className="text-xs font-bold uppercase">Principal</span>
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>

                {/* Page break after every 2 cards */}
                {idx < arr.length - 1 && (idx + 1) % 2 === 0 && (
                  <div className="hidden print:block" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}></div>
                )}
                {/* Cutting Line between cards on the same page */}
                {idx < arr.length - 1 && (idx + 1) % 2 !== 0 && (
                  <div className="hidden print:flex w-full items-center justify-center cut-line opacity-50">
                    <span className="border-t-2 border-dashed border-gray-500 flex-1"></span>
                    <span className="px-2 text-[10px] text-gray-500 uppercase tracking-widest">✂ Cut Here ✂</span>
                    <span className="border-t-2 border-dashed border-gray-500 flex-1"></span>
                  </div>
                )}
                </React.Fragment>
              );
            })}
        </div>
      )}

    </div>
  );
};

export default AdmitCards;
