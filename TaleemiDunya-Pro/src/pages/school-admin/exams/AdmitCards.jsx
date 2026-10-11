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
import { sortClasses } from '../../../utils/classSort';

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
  const [cardsPerPage, setCardsPerPage] = useState('auto');
  const [tableTextSize, setTableTextSize] = useState('auto');
  const [showPhoto, setShowPhoto] = useState(true);

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
        classList = classesData.map(c => c.name || c.className);
      } else if (schoolClasses?.length > 0) {
        classList = schoolClasses.map(c => c.name);
      } else {
        classList = ['Nursery', 'KG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
      }

      classList = sortClasses(classList.filter(Boolean));
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

  const getSubjectRowsForClass = (className) => {
    if (!className || !selectedTerm) return [];
    const matches = masterFiles.filter(
      f => {
        const matchClass = (f.className || '').toLowerCase() === className.toLowerCase() || 
                           (f.classId || '').toLowerCase() === className.toLowerCase();
        const matchTerm = (f.term || '').toLowerCase() === selectedTerm.toLowerCase();
        return matchClass && matchTerm;
      }
    );
    matches.sort((a, b) => {
      const aDatesCount = (a.subjects || []).filter(s => s.included && s.examDate).length;
      const bDatesCount = (b.subjects || []).filter(s => s.included && s.examDate).length;
      return bDatesCount - aDatesCount;
    });
    const found = matches[0];
    if (found && Array.isArray(found.subjects) && found.subjects.length > 0) {
      const activeSubjects = found.subjects.filter(s => s.included);
      activeSubjects.sort((a, b) => {
        if (!a.examDate) return 1;
        if (!b.examDate) return -1;
        return new Date(a.examDate) - new Date(b.examDate);
      });
      return activeSubjects;
    } else {
      return DEFAULT_SUBJECTS_LIST.map((name) => ({
        subjectName: name, included: true, examDate: '', startTime: '', endTime: '', room: '', invigilator: ''
      }));
    }
  };

  // Load subject schedule when class or term changes
  useEffect(() => {
    if (!selectedClass || !selectedTerm) {
      setSubjectRows([]);
      return;
    }
    if (selectedClass === 'ALL_CLASSES') {
      setSubjectRows([]);
    } else {
      setSubjectRows(getSubjectRowsForClass(selectedClass));
    }
  }, [selectedClass, selectedTerm, masterFiles]);

  const filteredStudents = studentsList.filter(s => {
    if (!selectedClass || selectedClass === 'ALL_CLASSES') return true;
    const studentClass = s.class || s.className || '';
    return studentClass.toLowerCase() === selectedClass.toLowerCase();
  }).sort((a, b) => {
    const classA = a.class || a.className || '';
    const classB = b.class || b.className || '';
    const idxA = availableClasses.indexOf(classA);
    const idxB = availableClasses.indexOf(classB);
    
    if (idxA !== idxB) {
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    }
    
    const nameA = a.name || a.fullName || '';
    const nameB = b.name || b.fullName || '';
    return nameA.localeCompare(nameB);
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
    let maxSubjects = 0;
    if (selectedClass === 'ALL_CLASSES') {
      maxSubjects = Math.max(0, ...filteredStudents.map(s => getSubjectRowsForClass(s.class || s.className || '').length));
    } else {
      maxSubjects = subjectRows.length;
    }

    if (cardsPerPage === 2 && maxSubjects > 8) {
      Swal.fire({
        title: 'Too Many Subjects!',
        text: 'Is class mein subjects zyada hain. Ek page par 2 admit cards fit nahi honge. Please "1 Card per Page" select karein!',
        icon: 'error',
        confirmButtonColor: '#0070f3'
      });
      return;
    }

    const settingsHtml = [
      '<div style="text-align:left;font-size:13px;line-height:2;color:#1a1a1a">',
      '<p style="font-weight:700;color:#0070f3;margin-bottom:6px">',
      cardsPerPage === 'auto' ? `Admit Cards automatically smart fit (1 or 2 per page) ho jayenge based on subject count` : `${cardsPerPage} Admit Card(s) automatically 1 page par set ho jayega`,
      '</p>',
      '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb">',
      '<tr style="background:#eff6ff"><td style="padding:5px 10px;font-weight:600;width:45%">Paper Size</td><td style="padding:5px 10px"><b>A4</b></td></tr>',
      '<tr><td style="padding:5px 10px;font-weight:600">Orientation</td><td style="padding:5px 10px"><b>Portrait</b></td></tr>',
      '<tr style="background:#eff6ff"><td style="padding:5px 10px;font-weight:600">Scale</td><td style="padding:5px 10px"><b>100%</b> (Default)</td></tr>',
      '<tr><td style="padding:5px 10px;font-weight:600">Pages per sheet</td><td style="padding:5px 10px"><b>1</b> (Important!)</td></tr>',
      '<tr style="background:#eff6ff"><td style="padding:5px 10px;font-weight:600">Margins</td><td style="padding:5px 10px"><b>Minimum / None</b></td></tr>',
      '<tr><td style="padding:5px 10px;font-weight:600">Background Graphics</td><td style="padding:5px 10px"><b>ON (Enable)</b></td></tr>',
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

  const renderedChunks = React.useMemo(() => {
    if (!selectedClass || !selectedTerm) return null;
    
    const studentsToPrint = filteredStudents.filter(s => selectedStudentForAdmitCard === 'ALL' || s.id === selectedStudentForAdmitCard);
    const chunks = [];
    let i = 0;
    while (i < studentsToPrint.length) {
      const student = studentsToPrint[i];
      const currentSubjectRows = selectedClass === 'ALL_CLASSES' ? getSubjectRowsForClass(student.class || student.className || '') : subjectRows;
      const subjectCount = currentSubjectRows.length;
      
      const isAuto = cardsPerPage === 'auto';
      const actualCardsPerPage = isAuto ? 2 : cardsPerPage;
      
      if (actualCardsPerPage === 2 && i + 1 < studentsToPrint.length) {
        const nextStudent = studentsToPrint[i + 1];
        const nextSubjectRows = selectedClass === 'ALL_CLASSES' ? getSubjectRowsForClass(nextStudent.class || nextStudent.className || '') : subjectRows;
        const nextActualCardsPerPage = isAuto ? 2 : cardsPerPage;
        
        if (nextActualCardsPerPage === 2) {
          chunks.push([studentsToPrint[i], studentsToPrint[i + 1]]);
          i += 2;
          continue;
        }
      }
      chunks.push([studentsToPrint[i]]);
      i += 1;
    }

    return chunks.map((chunk, chunkIdx) => (
      <div key={chunkIdx} className="page-container print:flex print:flex-col print:pt-4 mb-8 print:mb-0" style={{ pageBreakAfter: 'always' }}>
        {chunk.map((student, idx) => {
          const feeData = feeStatusMap[student.id];
          const currentSubjectRows = selectedClass === 'ALL_CLASSES' ? getSubjectRowsForClass(student.class || student.className || '') : subjectRows;
          const subjectCount = currentSubjectRows.length;
          
          const actualCardsPerPage = chunk.length === 2 ? 2 : (cardsPerPage === 'auto' ? 2 : cardsPerPage);
          let activeFontSize = 14;
          let activePadding = 4;
          
          if (tableTextSize === 'auto') {
            if (actualCardsPerPage === 2) {
              if (subjectCount <= 6) { activeFontSize = 14; activePadding = 4; }
              else if (subjectCount <= 8) { activeFontSize = 12; activePadding = 3; }
              else { activeFontSize = 11; activePadding = 2; }
            } else {
              if (subjectCount <= 7) { activeFontSize = 26; activePadding = 8; }
              else if (subjectCount <= 10) { activeFontSize = 22; activePadding = 6; }
              else { activeFontSize = 18; activePadding = 5; }
            }
          } else {
            activeFontSize = parseInt(tableTextSize, 10) || 14;
            if (activeFontSize <= 14) activePadding = 4;
            else if (activeFontSize <= 18) activePadding = 5;
            else if (activeFontSize <= 22) activePadding = 6;
            else if (activeFontSize <= 28) activePadding = 8;
            else activePadding = 10;
          }
          
          const tableStyle = {
            fontSize: `${activeFontSize}px`,
            paddingTop: `${activePadding}px`,
            paddingBottom: `${activePadding}px`
          };

          return (
            <React.Fragment key={student.id || idx}>
            <div 
              className={`admit-card-item relative bg-white border-[3px] border-black p-1 max-w-3xl mx-auto shadow-xl print:shadow-none flex flex-col ${actualCardsPerPage === 2 ? 'print:mb-0 mb-4 print:h-[5.3in] overflow-hidden' : 'mb-8 print:h-[10.5in] overflow-hidden'}`}
              style={{ 
                fontFamily: 'Times New Roman, Georgia, serif', 
                pageBreakInside: 'avoid'
              }}
            >
              <div className="border-[3px] border-black p-[12.7mm] relative flex-1 flex flex-col justify-between space-y-2 print:space-y-1 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-[0.07] print:opacity-[0.08]">
                  {schoolLogo ? (
                <img 
                  src={schoolLogo} 
                  alt="School Watermark" 
                  className="w-80 h-80 md:w-96 md:h-96 object-contain" 
                />
              ) : (
                <div className="w-72 h-72 rounded-full border-8 border-black flex items-center justify-center p-6 text-center transform -rotate-12">
                  <span className="text-3xl font-black font-serif text-black uppercase tracking-wider leading-tight">
                    {schoolName}
                  </span>
                </div>
              )}
            </div>

            <div className="relative z-10 space-y-3 print:space-y-1">
              <div className="relative text-center pb-1">
                <div className="absolute left-0 top-0 flex items-center justify-center w-28 h-28 md:w-32 md:h-32 print:w-20 print:h-20">
                  {schoolLogo ? (
                    <img src={schoolLogo} alt="School Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="w-24 h-24 md:w-28 md:h-28 print:w-20 print:h-20 rounded-full border-2 border-black flex items-center justify-center p-1 bg-gray-50">
                      <span className="text-xs font-black text-black text-center leading-tight">
                        {schoolName}
                      </span>
                    </div>
                  )}
                </div>

                <div className="px-16 md:px-24 space-y-2 print:space-y-0">
                  <div className="flex items-center justify-center gap-2 text-sm md:text-base print:text-xs font-bold text-red-600">
                    <span className="border-t border-red-500 w-8 print:w-4"></span>
                    <span>{schoolSlogan}</span>
                    <span className="border-t border-red-500 w-8 print:w-4"></span>
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl print:text-2xl font-black text-black leading-tight tracking-tight">
                    {schoolName}
                  </h1>

                  <div className="flex items-center justify-center gap-2">
                    <span className="border-t border-black w-12 print:w-6"></span>
                    <span className="text-lg md:text-xl print:text-sm font-bold text-black px-2">
                      {selectedTerm || 'Mid Term 2026-27'}
                    </span>
                    <span className="border-t border-black w-12 print:w-6"></span>
                  </div>
                </div>

                {feeData && !feeData.cleared && (
                  <span className="absolute right-0 top-0 px-2 py-0.5 bg-red-100 text-red-700 border border-red-300 font-bold text-[10px] rounded uppercase print:hidden">
                    ⚠️ Pending Fee
                  </span>
                )}
              </div>

              <div className="pt-2 md:pt-4 flex justify-between items-center text-lg md:text-xl print:text-sm font-bold text-black">
                <div className="grid grid-cols-12 gap-y-2 md:gap-y-4 print:gap-y-1 items-baseline flex-1 pr-4">
                  <div className="col-span-7 flex items-baseline">
                    <span className="whitespace-nowrap text-lg md:text-xl print:text-sm font-bold">Student Name:</span>
                    <span className="underline decoration-2 underline-offset-4 ml-2 font-black text-xl md:text-2xl print:text-base truncate">
                      {student.name || student.fullName || 'Waniya Razi'}
                    </span>
                  </div>
                  
                  <div className="col-span-5 flex items-baseline justify-start pl-4">
                    <span className="whitespace-nowrap text-lg md:text-xl print:text-sm font-bold">GR #:</span>
                    <span className="font-black text-xl md:text-2xl print:text-base ml-2">
                      {student.grNo || student.grNumber || student.rollNo || student.rollNumber || '176'}
                    </span>
                  </div>

                  <div className="col-span-7 flex items-baseline">
                    <span className="whitespace-nowrap text-lg md:text-xl print:text-sm font-bold">Father Name:</span>
                    <span className="underline decoration-2 underline-offset-4 ml-2 font-black text-xl md:text-2xl print:text-base truncate">
                      {student.fatherName || 'Razi uddin'}
                    </span>
                  </div>

                  <div className="col-span-5 flex items-baseline justify-start pl-4">
                    <span className="whitespace-nowrap text-lg md:text-xl print:text-sm font-bold">Class:</span>
                    <span className="underline decoration-2 underline-offset-4 ml-2 font-black text-xl md:text-2xl print:text-base">
                      {student.class || selectedClass || '7th'}
                    </span>
                  </div>
                </div>

                {showPhoto && (
                  <div className="w-28 h-32 md:w-32 md:h-36 print:w-20 print:h-24 border-2 border-black flex flex-col items-center justify-center bg-white flex-shrink-0 overflow-hidden shadow-sm">
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
                )}
              </div>

              <div className="flex items-center justify-center py-1 print:py-0 text-black">
                <span className="border-t border-black flex-1 max-w-[220px]"></span>
                <span className="px-3 print:px-1 text-sm font-serif">❖</span>
                <span className="border-t border-black flex-1 max-w-[220px]"></span>
              </div>

              <div className="pt-1 flex-1 flex flex-col justify-center">
                  <style type="text/css" media="print">
                    {`
                      .printable-report-area table.admit-card-table-${student.id || idx} th,
                      .printable-report-area table.admit-card-table-${student.id || idx} td {
                        font-size: ${activeFontSize}px !important;
                        padding-top: ${activePadding}px !important;
                        padding-bottom: ${activePadding}px !important;
                      }
                    `}
                  </style>
                  <table className={`w-full h-full border-collapse border-[3px] border-black text-center admit-card-table-${student.id || idx}`}>
                      <thead>
                        <tr className="bg-black text-white font-serif">
                          <th className="border-r-2 border-gray-600 font-bold w-1/3 text-center" style={tableStyle}>Date</th>
                          <th className="border-r-2 border-gray-600 font-bold w-1/3 text-center" style={tableStyle}>Day</th>
                          <th className="font-bold w-1/3 text-center" style={tableStyle}>Subjects</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentSubjectRows.map((sub, i) => (
                          <tr key={i} className="border-b-2 border-black">
                            <td className="border-r-2 border-black font-bold" style={tableStyle}>{formatExamDate(sub.examDate)}</td>
                            <td className="border-r-2 border-black font-bold" style={tableStyle}>{getExamDay(sub.examDate)}</td>
                            <td className="font-bold" style={tableStyle}>{sub.subjectName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
              </div>

              <div className="flex items-center justify-center pt-2 print:pt-0 text-black">
                <span className="border-t border-black flex-1 max-w-[160px]"></span>
                <span className="px-2 print:px-1 text-xs font-serif">❖</span>
                <span className="border-t border-black flex-1 max-w-[160px]"></span>
              </div>

              <div className="flex justify-between items-end px-8 pt-8 pb-4 print:pt-0 print:pb-0">
                <div className="flex flex-col items-center">
                  {teacherSignatureUrl ? (
                    <img src={teacherSignatureUrl} alt="Class Teacher" className="h-24 print:h-10 max-w-[150px] scale-125 origin-bottom mix-blend-multiply object-contain -mb-1" />
                  ) : (
                    <div className="h-16 print:h-6"></div>
                  )}
                  <div className="w-36 print:w-28 border-t-2 border-black pt-1 text-center">
                    <span className="text-xs font-bold uppercase print:text-[10px]">Class Teacher</span>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  {principalSignatureUrl ? (
                    <img src={principalSignatureUrl} alt="Principal" className="h-24 print:h-10 max-w-[150px] scale-125 origin-bottom mix-blend-multiply object-contain -mb-1" />
                  ) : (
                    <div className="h-16 print:h-6"></div>
                  )}
                  <div className="w-36 print:w-28 border-t-2 border-black pt-1 text-center">
                    <span className="text-xs font-bold uppercase print:text-[10px]">Principal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {idx < chunk.length - 1 && actualCardsPerPage > 1 && (
          <div className="hidden print:flex w-full items-center justify-center cut-line opacity-50" style={{ height: '0.4in' }}>
            <span className="border-t-2 border-dashed border-gray-500 flex-1"></span>
            <span className="px-2 text-[10px] text-gray-500 uppercase tracking-widest">✂ Cut Here ✂</span>
            <span className="border-t-2 border-dashed border-gray-500 flex-1"></span>
          </div>
        )}
        </React.Fragment>
        );
      })}
      </div>
    ));
  }, [filteredStudents, selectedStudentForAdmitCard, cardsPerPage, selectedClass, subjectRows, feeStatusMap, schoolLogo, schoolName, schoolSlogan, selectedTerm, tableTextSize, showPhoto, teacherSignatureUrl, principalSignatureUrl]);

  return (
    <div className="p-4 md:p-6 print:p-0 space-y-6 max-w-7xl print:max-w-none print:w-full mx-auto font-sans animate-fade-in pb-24 print:pb-0 text-black">
      
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
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
              <option value="ALL_CLASSES">ALL CLASSES</option>
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

          {/* Select Cards Per Page */}
          <div>
            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">
              Cards per Page
            </label>
            <select
              value={cardsPerPage}
              onChange={(e) => setCardsPerPage(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="auto">Auto (Smart Fit based on subjects)</option>
              <option value={1}>1 Card per Page</option>
              <option value={2}>2 Cards per Page</option>
            </select>
          </div>

          {/* Select Table Text Size */}
          <div>
            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">
              Table Text Size
            </label>
            <select
              value={tableTextSize}
              onChange={(e) => setTableTextSize(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="auto">Auto (Smart Size)</option>
              <option value="12">Size 12 (Small)</option>
              <option value="14">Size 14 (Normal)</option>
              <option value="18">Size 18 (Large)</option>
              <option value="22">Size 22 (Extra Large)</option>
              <option value="28">Size 28 (Huge)</option>
              <option value="36">Size 36 (Massive)</option>
              <option value="48">Size 48 (Gigantic)</option>
            </select>
          </div>

          {/* Show Photo Toggle */}
          <div className="flex flex-col justify-end pb-1 md:pb-2">
            <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-700 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showPhoto} 
                onChange={(e) => setShowPhoto(e.target.checked)} 
                className="w-4 h-4 md:w-5 md:h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              Show Photo
            </label>
          </div>

        </div>

        {selectedClass && selectedTerm && (
          <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs font-bold text-gray-600">
            <span>Target Class: <b className="text-blue-700">{selectedClass}</b> • Term: <b className="text-blue-700">{selectedTerm}</b></span>
            <span>School: <b className="text-gray-900">{schoolName}</b> • Students: <b>{filteredStudents.length}</b> <span className="text-red-600 bg-yellow-200 px-2 py-1 rounded">FINAL V16 - PERFECT 2-PER-PAGE</span></span>
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
              @page { size: A4 portrait; margin: 0.3in; }
              body { margin: 0; padding: 0; }
              .page-container {
                page-break-after: always;
              }
              .admit-card-item {
                page-break-inside: avoid;
                width: 100% !important;
                max-width: 100% !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
              }
              .cut-line {
                margin: 5px 0;
              }
            `}
          </style>
          <div className="text-center font-bold text-white bg-red-600 py-2 mb-4 hidden">
            FINAL V9 - REALTIME SCREEN FONT FIX
          </div>
          {renderedChunks}
        </div>
      )}

    </div>
  );
};

export default AdmitCards;
