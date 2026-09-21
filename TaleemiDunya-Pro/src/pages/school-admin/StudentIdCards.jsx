import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  User, 
  Sliders, 
  FileText, 
  CreditCard,
  CheckCircle,
  Palette,
  FileImage,
  RefreshCw
} from 'lucide-react';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import GlassCard from '../../components/common/GlassCard';
import { Link } from 'react-router-dom';
import { renderCustomCard } from '../../components/id-cards/IdCardRenderers';
import QRCode from 'react-qr-code';

const THEMES = {
  blue: {
    bg: 'bg-gradient-to-b from-[#1e3a8a] via-[#2563eb] to-[#1d4ed8]',
    text: 'text-white',
    accent: '#3b82f6',
    border: 'border-[#1e3a8a]/40',
    headerBg: 'bg-white/10',
    badge: 'bg-yellow-400 text-[#1e3a8a]',
    accentText: 'text-yellow-300'
  },
  emerald: {
    bg: 'bg-gradient-to-b from-[#064e3b] via-[#059669] to-[#047857]',
    text: 'text-white',
    accent: '#10b981',
    border: 'border-[#064e3b]/40',
    headerBg: 'bg-white/10',
    badge: 'bg-yellow-400 text-[#064e3b]',
    accentText: 'text-yellow-200'
  },
  crimson: {
    bg: 'bg-gradient-to-b from-[#7f1d1d] via-[#dc2626] to-[#b91c1c]',
    text: 'text-white',
    accent: '#ef4444',
    border: 'border-[#7f1d1d]/40',
    headerBg: 'bg-white/10',
    badge: 'bg-white text-[#7f1d1d]',
    accentText: 'text-yellow-300'
  },
  charcoal: {
    bg: 'bg-gradient-to-b from-[#111827] via-[#374151] to-[#1f2937]',
    text: 'text-white',
    accent: '#9ca3af',
    border: 'border-[#111827]/40',
    headerBg: 'bg-white/10',
    badge: 'bg-yellow-500 text-black',
    accentText: 'text-cyan-300'
  }
};

const StudentIdCards = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // ID Card customizations - pre-fill from school profile
  const [schoolName, setSchoolName] = useState(
    () => schoolData?.name || schoolData?.schoolName || userData?.schoolName || 'The Knowledge Home School System'
  );
  const [cardSubtitle, setCardSubtitle] = useState('Student Identity Card');
  const [cardTheme, setCardTheme] = useState('blue');
  const [cardLayout, setCardLayout] = useState('portrait');
  const [validity, setValidity] = useState('2026 - 2027');
  const [principalName, setPrincipalName] = useState('Principal Office');
  const [disclaimer, setDisclaimer] = useState('This card is non-transferable and remains the property of the school. If found, please return to the school administration office.');
  
  // School logo from context (auto-loaded)
  const schoolLogo = schoolData?.logo || null;

  // Custom stamp upload
  const [stampImage, setStampImage] = useState(null);
  const stampInputRef = useRef(null);

  useEffect(() => {
    if (schoolData?.name || schoolData?.schoolName || userData?.schoolName) {
      setSchoolName(schoolData?.name || schoolData?.schoolName || userData?.schoolName);
    }
  }, [schoolData, userData]);

  useEffect(() => {
    fetchStudents();
  }, [schoolId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const [studentsData, staffData] = await Promise.all([
        getRecords('students', schoolId),
        getRecords('staff', schoolId)
      ]);
      setStudents(studentsData || []);
      setTeachers((staffData || []).filter(s => s.role === 'teacher' || s.isClassTeacher));
    } catch (error) {
      console.error("Error fetching students and staff for ID Cards:", error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const getSignatureForStudent = (studentClass) => {
    const rules = schoolData?.signatureSettings?.rules || [];
    
    // 1. Look for a teacher rule matching this class for ID Cards
    const teacherRule = rules.find(r => r.type === 'Teacher' && String(r.class).trim().toUpperCase() === String(studentClass).trim().toUpperCase() && r.documents?.idCard);
    if (teacherRule && teacherRule.signatureUrl) {
      return teacherRule.signatureUrl;
    }

    // 2. Look for a principal rule for ID Cards
    const principalRule = rules.find(r => r.type === 'Principal' && r.documents?.idCard);
    if (principalRule && principalRule.signatureUrl) {
      return principalRule.signatureUrl;
    }

    // 3. Legacy Fallback (for old configs)
    if (schoolData?.signatureSettings?.documentRules) {
      const legacyRules = schoolData.signatureSettings.documentRules;
      const rule = legacyRules.idCard || 'principal';

      if (rule === 'classTeacher') {
        const customMapping = schoolData.signatureSettings.classSignatures?.find(
          m => String(m.class).trim().toUpperCase() === String(studentClass).trim().toUpperCase()
        );
        if (customMapping && customMapping.signatureUrl) return customMapping.signatureUrl;
        
        const teacher = teachers.find(t => 
          (t.assignedClass && String(t.assignedClass).trim().toUpperCase() === String(studentClass).trim().toUpperCase()) ||
          (t.assignedClasses && t.assignedClasses.includes(studentClass))
        );
        if (teacher && teacher.signatureUrl) return teacher.signatureUrl;
      }
      return schoolData.signatureSettings.principalSignatureUrl || stampImage || null;
    }

    return stampImage || null;
  };

  const handleStampUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setStampImage(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Procedural authentic SVG barcode based on student registration number
  const renderBarcodeSVG = (text) => {
    let hash = 0;
    const cleanText = text ? String(text).toUpperCase() : 'TD-ID-CARD';
    for (let i = 0; i < cleanText.length; i++) {
      hash = cleanText.charCodeAt(i) + ((hash << 5) - hash);
    }
    const lines = [];
    let currentX = 5;
    for (let i = 0; i < 28; i++) {
      const bit = (Math.abs(hash) >> (i % 32)) & 1;
      const width = bit ? 2.5 : 1;
      lines.push(<rect key={i} x={currentX} y="1" width={width} height="15" fill="#000000" />);
      currentX += width + 1.2;
    }
    return (
      <svg viewBox={`0 0 ${currentX + 5} 21`} className="h-6 w-full max-w-[125px] mx-auto mt-1 opacity-90 select-none">
        <rect x="0" y="0" width={currentX + 5} height="21" fill="#ffffff" rx="1.5" />
        {lines}
        <text x="50%" y="19" textAnchor="middle" fontSize="3" fontWeight="bold" fontFamily="monospace" fill="#000000">{cleanText}</text>
      </svg>
    );
  };

  // Get distinct classes
  const classesList = ['ALL', ...new Set(students.map(s => String(s.class || '').trim().toUpperCase()))].filter(Boolean);

  // Filtered list
  const filteredStudents = selectedClass === 'ALL' 
    ? students 
    : students.filter(s => String(s.class || '').trim().toUpperCase() === selectedClass);

  const handlePrint = () => {
    window.print();
  };

  const SmitCombinedCard = ({ st, isPrint = false }) => {
    const scale = isPrint ? 'scale-[0.95]' : '';
    const wrapperWidth = isPrint ? 'w-[680px]' : 'w-[700px]';
    const height = isPrint ? 'h-[210px]' : 'h-[220px]';

    const WavesTop = () => (
      <div className="absolute top-0 left-0 w-full h-[40px] overflow-hidden rounded-t-[12px]">
        <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full">
          {/* Outer wave: was blue, now Light Green */}
          <path d="M0,0 L500,0 L500,60 Q375,10 250,60 Q125,110 0,60 Z" fill="#6eb838" />
          {/* Inner wave: was green, now Dark Blue */}
          <path d="M0,0 L500,0 L500,40 Q375,-10 250,40 Q125,90 0,40 Z" fill="#0160b0" />
        </svg>
      </div>
    );

    const WavesBottom = () => (
      <div className="absolute bottom-0 left-0 w-full h-[40px] overflow-hidden rounded-b-[12px]">
        <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full">
          {/* Outer wave: was blue, now Light Green */}
          <path d="M0,150 L500,150 L500,90 Q375,140 250,90 Q125,40 0,90 Z" fill="#6eb838" />
          {/* Inner wave: was green, now Dark Blue */}
          <path d="M0,150 L500,150 L500,110 Q375,160 250,110 Q125,60 0,110 Z" fill="#0160b0" />
        </svg>
      </div>
    );

    const FieldRow = ({ label, value }) => (
      <div className="flex items-end mb-[10px] w-full">
        <span className="text-[13px] font-bold text-black min-w-[90px]">{label}</span>
        <div className="flex-1 border-b border-[#0160b0] pb-0.5 relative">
          <span className="text-[13px] font-black text-[#0160b0] absolute bottom-0.5 left-2 truncate w-[90%]">{value || 'N/A'}</span>
        </div>
      </div>
    );

    return (
      <div className={`flex gap-4 rounded-[12px] print-card-break select-text transition-all duration-300 hover:scale-[1.02] mx-auto shrink-0 print:scale-[0.95] print:w-[680px] print:h-[210px] w-[700px] h-[220px] bg-white`}>
        
        {/* FRONT SIDE (Left) */}
        <div className="w-[50%] h-full relative bg-white rounded-[12px] border border-gray-300 shadow-md overflow-hidden flex flex-col">
          <WavesTop />
          
          {/* Watermark Logo */}
          {schoolLogo && (
            <div className="absolute inset-0 m-auto w-[120px] h-[120px] opacity-[0.08] pointer-events-none flex items-center justify-center">
              <img src={schoolLogo} alt="Watermark" className="w-full h-full object-contain" />
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-center pt-2 relative z-10 px-2 gap-2 mt-4">
            {schoolLogo && (
              <img src={schoolLogo} alt="Logo" className="w-[50px] h-[50px] object-contain shrink-0" />
            )}
            <h1 className="text-[14px] font-black text-[#0160b0] m-0 tracking-tight leading-tight whitespace-nowrap">
              {schoolName?.toUpperCase() || 'SMART ANGELS GRAMMAR SCHOOL'}
            </h1>
          </div>

          {/* Body */}
          <div className="flex px-4 pt-4 pb-2 relative z-10 flex-1">
            <div className="w-[80px] h-[100px] shrink-0 border-[3px] border-[#6eb838] rounded-md overflow-hidden bg-blue-100 flex items-center justify-center mr-4">
              {st.profilePhoto ? (
                <img src={st.profilePhoto} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-[#0160b0]/50" />
              )}
            </div>
            
            <div className="flex-1 flex flex-col justify-center mt-[-10px]">
              <FieldRow label="Name:" value={st.name} />
              <FieldRow label="Class:" value={st.class} />
              <FieldRow label="Roll Number:" value={st.rollNo || st.rollNumber} />
            </div>
          </div>

          <WavesBottom />
        </div>

        {/* BACK SIDE (Right) */}
        <div className="w-[50%] h-full relative bg-white rounded-[12px] border border-gray-300 shadow-md overflow-hidden flex flex-col justify-between">
          <WavesTop />
          
          {/* Watermark Logo */}
          {schoolLogo && (
            <div className="absolute inset-0 m-auto w-[120px] h-[120px] opacity-[0.08] pointer-events-none flex items-center justify-center">
              <img src={schoolLogo} alt="Watermark" className="w-full h-full object-contain" />
            </div>
          )}

          <div className="px-6 pt-12 pb-2 flex-1 flex flex-col justify-center relative z-10">
            <div className="flex w-full gap-2 items-center">
              <div className="flex-1 pr-2">
                <FieldRow label="Father Name:" value={st.fatherName} />
                <FieldRow label="CNIC No:" value={st.fatherCnic || st.cnic} />
                <FieldRow label="Gr No:" value={st.grNumber || st.grNo} />
                <FieldRow label="Contact No:" value={st.phone || st.contact} />
              </div>
              <div className="w-[85px] h-[85px] p-1 border-2 border-[#0160b0] rounded flex items-center justify-center shrink-0">
                {(st.id || st.registrationNo || st.rollNo || st.rollNumber) ? <QRCode value={String(st.id || st.registrationNo || st.rollNo || st.rollNumber)} style={{ width: '100%', height: '100%' }} /> : <div className="flex items-center justify-center text-center text-red-500 font-bold p-1 text-[10px] border border-dashed border-red-500 w-full h-full">NO ID</div>}
              </div>
            </div>
          </div>

          <div className="w-full flex justify-end px-6 relative z-10 mb-4">
            <div className="flex flex-col items-center">
              {getSignatureForStudent(st.class) ? (
                <img src={getSignatureForStudent(st.class)} alt="Signature" className="h-[25px] object-contain mb-[-4px]" />
              ) : (
                <span className="font-['Dancing_Script',cursive] text-lg text-black mb-[-4px]">Signature</span>
              )}
              <div className="border-t border-black w-[100px] text-center pt-0.5 text-[10px] font-bold text-black">
                {principalName || 'Issuing Authority'}
              </div>
            </div>
          </div>

          <WavesBottom />
        </div>

      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-dark-bg text-dark-text select-none">
      
      {/* Printable Area Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: transparent !important;
          }
          #id-cards-print-area, #id-cards-print-area * {
            visibility: visible;
          }
          #id-cards-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">
            Student ID Cards Generator
          </h1>
          <p className="text-xs text-dark-muted font-bold tracking-wider uppercase mt-1">
            Generate and bulk-print professional student identification badges
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="premium-button-primary py-2.5 px-5 flex items-center justify-center gap-2 font-bold text-xs uppercase"
          >
            <Printer size={15} />
            <span>Print ID Cards</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:block">
        
        {/* Left Side: Customize Dashboard */}
        <div className="lg:col-span-1 space-y-6 no-print">
          <GlassCard className="p-5 border-dark-border/40">
            <h2 className="text-sm font-black text-primary-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Sliders size={16} />
              <span>Card Customize</span>
            </h2>

            <div className="space-y-4 text-xs font-bold">
              {/* Class selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Filter by Class</label>
                <select 
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs text-primary-400"
                >
                  {classesList.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* School Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">School Name</label>
                <input 
                  type="text" 
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs"
                  placeholder="Enter School Name"
                />
              </div>

              {/* Card Subtitle */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Card Title</label>
                <input 
                  type="text" 
                  value={cardSubtitle}
                  onChange={(e) => setCardSubtitle(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs"
                  placeholder="Enter Card Subtitle"
                />
              </div>

              {/* Layout Picker */}
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-dark-muted uppercase tracking-wider flex items-center gap-1.5">
                    <span>Card Template Layout</span>
                  </label>
                  <Link to="/school-admin/id-card-designer" className="text-[9px] font-bold text-primary-400 hover:text-primary-300 underline">Open Designer</Link>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => setCardLayout('portrait')}
                    className={`py-1.5 px-3 rounded-lg border transition-all font-bold text-[10px] ${
                      cardLayout === 'portrait' ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-dark-border/40 text-dark-muted hover:bg-white/5'
                    }`}
                  >Standard Portrait</button>
                  <button
                    onClick={() => setCardLayout('custom')}
                    className={`py-1.5 px-3 rounded-lg border transition-all font-bold text-[10px] ${
                      cardLayout === 'custom' ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-dark-border/40 text-dark-muted hover:bg-white/5'
                    }`}
                  >Custom Canva Design</button>
                </div>
              </div>

              {/* Theme Picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Palette size={12} className="text-yellow-400" />
                  <span>Card Theme color</span>
                </label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {Object.keys(THEMES).map((themeName) => (
                    <button
                      key={themeName}
                      onClick={() => setCardTheme(themeName)}
                      className={`h-7 rounded-lg border-2 transition-all relative flex items-center justify-center capitalize font-bold text-[9px] ${
                        cardTheme === themeName ? 'border-primary-500 scale-105 bg-white/10' : 'border-dark-border/40 hover:bg-white/5'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full mr-1 ${
                        themeName === 'blue' ? 'bg-[#2563eb]' :
                        themeName === 'emerald' ? 'bg-[#059669]' :
                        themeName === 'crimson' ? 'bg-[#dc2626]' : 'bg-[#374151]'
                      }`} />
                      <span>{themeName.substring(0, 3)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Validity */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Validity Period</label>
                <input 
                  type="text" 
                  value={validity}
                  onChange={(e) => setValidity(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs"
                  placeholder="e.g. 2026 - 2027"
                />
              </div>

              {/* Principal Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Principal Signature Label</label>
                <input 
                  type="text" 
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs"
                  placeholder="Principal Name"
                />
              </div>

              {/* Stamp Upload */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider block">Principal Signature Stamp</label>
                <button
                  onClick={() => stampInputRef.current?.click()}
                  className="w-full py-2 bg-dark-card border border-dashed border-dark-border hover:border-primary-500 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs text-primary-400 font-bold"
                >
                  <FileImage size={14} />
                  <span>{stampImage ? 'Change Stamp' : 'Upload Stamp'}</span>
                </button>
                <input 
                  type="file" 
                  ref={stampInputRef}
                  onChange={handleStampUpload}
                  accept="image/*"
                  className="hidden" 
                />
                {stampImage && (
                  <div className="relative mt-2 p-1.5 border border-dark-border/40 rounded-xl bg-dark-card/50 flex items-center justify-between">
                    <img src={stampImage} alt="Stamp preview" className="h-8 max-w-[80px] object-contain rounded" />
                    <button 
                      onClick={() => setStampImage(null)}
                      className="text-[9px] text-red-400 hover:text-red-300 font-black uppercase mr-1"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Backside Disclaimer Note</label>
                <textarea 
                  value={disclaimer}
                  onChange={(e) => setDisclaimer(e.target.value)}
                  rows="3"
                  className="w-full premium-input bg-dark-card text-xs resize-none"
                  placeholder="Card backside terms..."
                />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Visual live preview grid */}
        <div className="lg:col-span-3 print:col-span-1 print:w-full printable-report-area">
          <GlassCard className="p-6 border-dark-border/40 min-h-[500px] print:p-0 print:border-none print:shadow-none print:bg-transparent">
            <div className="flex items-center justify-between border-b border-dark-border/40 pb-3 mb-6 no-print">
              <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-primary-400 uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={16} />
                <span>Live Bulk ID Cards View ({filteredStudents.length} Students)</span>
              </h2>
              <span className="text-[10px] font-black uppercase text-dark-muted bg-white/5 border border-dark-border/40 py-1 px-2.5 rounded-full">
                Class: {selectedClass}
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw size={36} className="text-primary-500 animate-spin" />
                <p className="text-xs font-black text-dark-muted uppercase">Fetching Student Profiles...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-dark-border/30 flex items-center justify-center text-dark-muted text-lg">★</div>
                <p className="text-xs font-black text-dark-muted uppercase mt-2">No students found matching class: {selectedClass}</p>
              </div>
            ) : (
              /* A4 Vertical List container */
              <div className="flex flex-col gap-6 items-center w-full">
                {filteredStudents.map((st) => {
                  if (cardLayout === 'custom') {
                    return renderCustomCard(st, false, { customTemplate: schoolData?.customIdCardTemplate });
                  }
                  return (
                    <div key={st.id} className="flex flex-col items-center mb-6 border-b border-dark-border/30 pb-6 print:pb-2 print:border-0 last:border-0 last:pb-0 w-full overflow-hidden print:mb-0">
                      <SmitCombinedCard st={st} isPrint={false} />
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

      </div>

    </div>
  );
};

export default StudentIdCards;


