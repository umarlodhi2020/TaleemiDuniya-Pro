import React, { useState, useEffect, useRef, useDeferredValue, useCallback } from 'react';
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
  RefreshCw,
  Search
} from 'lucide-react';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import GlassCard from '../../components/common/GlassCard';
import { Link } from 'react-router-dom';
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

const SmitCombinedCard = React.memo(({ 
  st, 
  isPrint = false,
  schoolName,
  cardSubtitle,
  cardTheme,
  validity,
  principalName,
  disclaimer,
  schoolLogo,
  showFields,
  customFields,
  getSignatureForStudent,
  cardWidth,
  cardHeight
}) => {
  const scale = isPrint ? 'scale-[0.95]' : '';
  const wrapperWidth = isPrint ? 'w-[680px]' : 'w-[700px]';
  const height = isPrint ? 'h-[210px]' : 'h-[220px]';

  const getThemeColors = (themeKey) => {
    switch (themeKey) {
      case 'emerald': return { primary: '#064e3b', secondary: '#10b981' };
      case 'crimson': return { primary: '#7f1d1d', secondary: '#ef4444' };
      case 'charcoal': return { primary: '#111827', secondary: '#9ca3af' };
      case 'blue':
      default: return { primary: '#0160b0', secondary: '#6eb838' };
    }
  };

  const colors = getThemeColors(cardTheme);

  const WavesTop = () => (
    <div className="absolute top-0 left-0 w-full h-[40px] overflow-hidden rounded-t-[12px]">
      <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full">
        <path d="M0,0 L500,0 L500,60 Q375,10 250,60 Q125,110 0,60 Z" fill={colors.secondary} />
        <path d="M0,0 L500,0 L500,40 Q375,-10 250,40 Q125,90 0,40 Z" fill={colors.primary} />
      </svg>
    </div>
  );

  const WavesBottom = () => (
    <div className="absolute bottom-0 left-0 w-full h-[40px] overflow-hidden rounded-b-[12px]">
      <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full">
        <path d="M0,150 L500,150 L500,90 Q375,140 250,90 Q125,40 0,90 Z" fill={colors.secondary} />
        <path d="M0,150 L500,150 L500,110 Q375,160 250,110 Q125,60 0,110 Z" fill={colors.primary} />
      </svg>
    </div>
  );

  const FieldRow = ({ label, value }) => {
    const valStr = String(value || 'N/A');
    const isLong = valStr.length > 12;
    return (
      <div className="flex items-end mb-[10px] w-full">
        <span className="text-[13px] font-bold text-black min-w-[90px]">{label}</span>
        <div className="flex-1 border-b pb-0.5 relative" style={{ borderColor: colors.primary }}>
          <span className={`font-black absolute bottom-0.5 left-2 truncate w-[98%] capitalize ${isLong ? 'text-[10px]' : 'text-[13px]'}`} style={{ color: colors.primary }}>{valStr}</span>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`flex gap-4 rounded-[12px] print-card-break select-text transition-all duration-300 hover:scale-[1.02] mx-auto shrink-0 bg-white`}
      style={{ width: `${cardWidth}px`, height: `${cardHeight}px` }}
    >
      
      {/* FRONT SIDE (Left) */}
      <div className="w-[50%] h-full relative bg-white rounded-[12px] border border-gray-300 shadow-md overflow-hidden flex flex-col">
        <WavesTop />
        
        {schoolLogo && (
          <div className="absolute inset-0 m-auto w-[120px] h-[120px] opacity-[0.08] pointer-events-none flex items-center justify-center">
            <img src={schoolLogo} alt="Watermark" className="w-full h-full object-contain" />
          </div>
        )}

        <div className="flex flex-col items-center justify-center pt-1 relative z-10 px-2 mt-4">
          <div className="flex items-center justify-center gap-2">
            {schoolLogo && (
              <img src={schoolLogo} alt="Logo" className="w-[40px] h-[40px] object-contain shrink-0" />
            )}
            <h1 className="text-[14px] font-black m-0 tracking-tight leading-tight whitespace-nowrap" style={{ color: colors.primary }}>
              {schoolName?.toUpperCase() || 'Your School Name'}
            </h1>
          </div>
          {cardSubtitle && (
            <div className="text-[11px] font-extrabold -mt-0.5 tracking-wider uppercase" style={{ color: colors.secondary }}>
              {cardSubtitle}
            </div>
          )}
        </div>

        <div className="flex px-4 pt-1 pb-4 relative z-10 flex-1 items-center">
          <div className="w-[75px] h-[95px] shrink-0 border-[3px] rounded-md overflow-hidden bg-blue-100 flex items-center justify-center mr-4 mt-[-40px]" style={{ borderColor: colors.secondary }}>
            {(st.photoUrl || st.profilePhoto) ? (
              <img src={st.photoUrl || st.profilePhoto} alt="Student" className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="opacity-50" style={{ color: colors.primary }} />
            )}
          </div>
          
          <div className="flex-1 flex flex-col justify-center mt-[-35px]">
            {showFields.name && <FieldRow label="Name:" value={st.name} />}
            {showFields.class && <FieldRow label="Class:" value={st.class} />}
            {showFields.rollNo && <FieldRow label="Roll Number:" value={st.rollNo || st.rollNumber} />}
          </div>
        </div>

        {/* Validity on front bottom left */}
        <div className="absolute bottom-7 left-[53.5px] -translate-x-1/2 z-10 text-[8px] font-bold text-white bg-black/40 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap text-center">
          Valid: {validity}
        </div>

        <WavesBottom />
      </div>

      {/* BACK SIDE (Right) */}
      <div className="w-[50%] h-full relative bg-white rounded-[12px] border border-gray-300 shadow-md overflow-hidden flex flex-col justify-between">
        <WavesTop />
        
        {schoolLogo && (
          <div className="absolute inset-0 m-auto w-[120px] h-[120px] opacity-[0.08] pointer-events-none flex items-center justify-center">
            <img src={schoolLogo} alt="Watermark" className="w-full h-full object-contain" />
          </div>
        )}

        <div className="px-6 pt-12 pb-1 flex-1 flex flex-col justify-center relative z-10">
          <div className="flex w-full gap-2 items-center">
            <div className="flex-1 pr-2">
              {showFields.fatherName && <FieldRow label="Father Name:" value={st.fatherName} />}
              {showFields.cnic && <FieldRow label="CNIC No:" value={st.fatherCnic || st.cnic} />}
              {showFields.grNo && <FieldRow label="Gr No:" value={st.grNumber || st.grNo} />}
              {showFields.contact && <FieldRow label="Contact No:" value={st.phone || st.contact} />}
              {customFields.map((field, idx) => field.label && (
                <FieldRow key={idx} label={`${field.label}:`} value={st[field.value] || 'N/A'} />
              ))}
              <div className="w-full text-[7.5px] leading-tight text-gray-800 font-bold italic mt-2">
                {disclaimer}
              </div>
            </div>
            <div className="w-[85px] h-[85px] p-1 border-2 rounded flex items-center justify-center shrink-0" style={{ borderColor: colors.primary }}>
              {(st.id || st.registrationNo || st.rollNo || st.rollNumber) ? <QRCode value={String(st.id || st.registrationNo || st.rollNo || st.rollNumber)} style={{ width: '100%', height: '100%' }} /> : <div className="flex items-center justify-center text-center text-red-500 font-bold p-1 text-[10px] border border-dashed border-red-500 w-full h-full">NO ID</div>}
            </div>
          </div>
        </div>

        <div className="w-full flex justify-end items-end px-6 relative z-10 mb-10">
          <div className="flex flex-col items-center relative min-w-[90px]">
            {getSignatureForStudent(st.class, 'Principal') ? (
              <img src={getSignatureForStudent(st.class, 'Principal')} alt="Principal" className="h-24 max-w-[200px] scale-125 origin-bottom origin-bottom mix-blend-multiply absolute bottom-3 h-[55px]  object-contain pointer-events-none drop-shadow-sm" />
            ) : (
              <span className="font-['Dancing_Script',cursive] text-lg text-black mb-[-4px] absolute bottom-3">Signature</span>
            )}
            <div className="border-t border-black w-[90px] text-center pt-0.5 text-[9px] font-bold text-black uppercase mt-6">
              {principalName || 'Principal'}
            </div>
          </div>
        </div>

        <WavesBottom />
      </div>

    </div>
  );
});

const StudentIdCards = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // ID Card customizations - pre-fill from school profile
  const [schoolName, setSchoolName] = useState(
    () => schoolData?.name || schoolData?.schoolName || userData?.schoolName || 'Your School Name'
  );
  const [cardSubtitle, setCardSubtitle] = useState('Student Identity Card');
  const [cardTheme, setCardTheme] = useState('blue');
  const [validity, setValidity] = useState('2026 - 2027');
  const [principalName, setPrincipalName] = useState('Principal Office');
  const [disclaimer, setDisclaimer] = useState('This card is non-transferable and remains the property of the school. If found, please return to the school administration office.');
  
  const [showFields, setShowFields] = useState({
    name: true,
    class: true,
    rollNo: true,
    fatherName: true,
    cnic: true,
    grNo: true,
    contact: true,
  });
  const [customFields, setCustomFields] = useState([]);
  
  const [cardWidth, setCardWidth] = useState(696);
  const [cardHeight, setCardHeight] = useState(215);

  // School logo from context (auto-loaded)
  const schoolLogo = schoolData?.logo || null;

  // Defer heavy UI updates to prevent input/checkbox lag
  const deferredSchoolName = useDeferredValue(schoolName);
  const deferredCardSubtitle = useDeferredValue(cardSubtitle);
  const deferredCardTheme = useDeferredValue(cardTheme);
  const deferredValidity = useDeferredValue(validity);
  const deferredPrincipalName = useDeferredValue(principalName);
  const deferredDisclaimer = useDeferredValue(disclaimer);
  const deferredShowFields = useDeferredValue(showFields);
  const deferredCustomFields = useDeferredValue(customFields);
  const deferredCardWidth = useDeferredValue(cardWidth);
  const deferredCardHeight = useDeferredValue(cardHeight);

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

  const getSignatureForStudent = useCallback((studentClass, type = 'Principal') => {
    const rules = schoolData?.signatureSettings?.rules || [];
    
    if (type === 'Teacher') {
      const teacherRule = rules.find(r => r.type === 'Teacher' && String(r.class).trim().toUpperCase() === String(studentClass).trim().toUpperCase());
      if (teacherRule && teacherRule.signatureUrl) {
        return teacherRule.signatureUrl;
      }
      return null;
    }

    if (type === 'Principal') {
      const principalRule = rules.find(r => r.type === 'Principal');
      if (principalRule && principalRule.signatureUrl) {
        return principalRule.signatureUrl;
      }
      if (schoolData?.signatureSettings?.principalSignatureUrl) {
         return schoolData.signatureSettings.principalSignatureUrl;
      }
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
      return schoolData.signatureSettings.principalSignatureUrl || null;
    }

    return null;
  }, [schoolData, teachers]);

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

  // Get distinct classes and sort them naturally
  const rawClasses = [...new Set(students.map(s => String(s.class || '').trim().toUpperCase()))].filter(Boolean);
  const sortedClasses = rawClasses.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  const classesList = ['ALL', ...sortedClasses];

  // Filtered list by class and search query
  const filteredStudents = students.filter(s => {
    const classMatch = selectedClass === 'ALL' || String(s.class || '').trim().toUpperCase() === selectedClass;
    const searchStr = (searchQuery || '').trim().toLowerCase();
    const searchMatch = !searchStr || (s.name || '').toLowerCase().includes(searchStr);
    return classMatch && searchMatch;
  });

  useEffect(() => {
    const afterPrint = () => {
      setIsPrinting(false);
    };
    window.addEventListener('afterprint', afterPrint);
    return () => window.removeEventListener('afterprint', afterPrint);
  }, []);

  const handlePrint = () => {
    if (isPrinting) return; // Prevent double-clicks causing the print window to open twice
    setIsPrinting(true);
    // Use a small timeout to let React render all cards, the browser's engine will take it from there.
    setTimeout(() => {
      window.print();
    }, 800);
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
        <div className="flex gap-2 items-center">
          <div className="relative z-50">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={14} className="text-dark-muted" />
            </div>
            <input
              type="text"
              placeholder="Search by student name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchSuggestions(true);
              }}
              onFocus={() => setShowSearchSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
              className="premium-input bg-dark-card text-xs pl-9 py-2.5 w-48 md:w-64 border-dark-border/40 focus:border-primary-500"
            />
            {showSearchSuggestions && filteredStudents.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e2330] border border-dark-border/40 rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto border-t-0 rounded-t-none">
                {filteredStudents.map(st => (
                  <div 
                    key={st.id}
                    onClick={() => {
                      setSelectedStudentIds(prev => 
                        prev.includes(st.id) ? prev.filter(id => id !== st.id) : [...prev, st.id]
                      );
                    }}
                    className="px-3 py-2 text-xs border-b border-dark-border/30 last:border-0 hover:bg-white/10 cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={selectedStudentIds.includes(st.id)} 
                        readOnly 
                        className="rounded border-dark-border/40 text-primary-500 bg-dark-card w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="font-bold text-dark-text truncate pr-2">{st.name}</span>
                    </div>
                    <span className="text-[9px] text-dark-muted bg-white/5 px-1.5 py-0.5 rounded shrink-0">{st.class}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button 
            onClick={handlePrint}
            disabled={isPrinting || (selectedStudentIds.length === 0 && filteredStudents.length === 0)}
            className={`${isPrinting ? 'bg-primary-500/50 cursor-not-allowed' : 'premium-button-primary'} text-white rounded-lg py-2.5 px-5 flex items-center justify-center gap-2 font-bold text-xs uppercase transition-all`}
          >
            {isPrinting ? <RefreshCw size={15} className="animate-spin" /> : <Printer size={15} />}
            <span>{isPrinting ? 'Preparing...' : `Print ${selectedStudentIds.length > 0 ? selectedStudentIds.length + ' Selected' : 'All'}`}</span>
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

              {/* Custom Dimensions */}
              <div className="grid grid-cols-2 gap-2 mt-4 border-t border-dark-border/40 pt-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-dark-muted uppercase tracking-wider block">Width (px)</label>
                  <input 
                    type="number" 
                    value={cardWidth}
                    onChange={(e) => setCardWidth(Number(e.target.value))}
                    className="w-full premium-input bg-dark-card text-xs font-mono"
                    min="400"
                    max="1200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-dark-muted uppercase tracking-wider block">Height (px)</label>
                  <input 
                    type="number" 
                    value={cardHeight}
                    onChange={(e) => setCardHeight(Number(e.target.value))}
                    className="w-full premium-input bg-dark-card text-xs font-mono"
                    min="150"
                    max="600"
                  />
                </div>
              </div>

              {/* Field Toggles */}
              <div className="space-y-1.5 mt-4 border-t border-dark-border/40 pt-4">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider block mb-2">Show/Hide Fields</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'name', label: 'Name' },
                    { key: 'class', label: 'Class' },
                    { key: 'rollNo', label: 'Roll No' },
                    { key: 'fatherName', label: 'Father Name' },
                    { key: 'cnic', label: 'CNIC' },
                    { key: 'grNo', label: 'Gr No' },
                    { key: 'contact', label: 'Contact' }
                  ].map((field) => (
                    <div key={field.key} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id={`show-${field.key}`}
                        checked={!!showFields[field.key]} 
                        onChange={(e) => setShowFields(prev => ({ ...prev, [field.key]: e.target.checked }))}
                        className="rounded border-dark-border/40 text-primary-500 bg-dark-card focus:ring-primary-500/30 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor={`show-${field.key}`} className="text-xs text-dark-text capitalize cursor-pointer select-none font-medium">
                        {field.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Fields */}
              <div className="space-y-1.5 border-t border-dark-border/40 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-dark-muted uppercase tracking-wider block">Custom Fields</label>
                  <button 
                    onClick={(e) => { e.preventDefault(); setCustomFields([...customFields, { label: '', value: '' }]); }}
                    className="text-[9px] text-primary-400 hover:text-primary-300 font-bold uppercase"
                  >
                    + Add Other
                  </button>
                </div>
                {customFields.map((field, idx) => (
                  <div key={idx} className="flex gap-2 items-center mt-2">
                    <input 
                      type="text" 
                      placeholder="Label (e.g. Blood Gr)" 
                      value={field.label}
                      onChange={(e) => {
                        const newFields = [...customFields];
                        newFields[idx].label = e.target.value;
                        setCustomFields(newFields);
                      }}
                      className="w-[45%] premium-input bg-dark-card text-xs py-1 px-2"
                    />
                    <input 
                      type="text" 
                      placeholder="DB Key (e.g. bloodGroup)" 
                      value={field.value}
                      onChange={(e) => {
                        const newFields = [...customFields];
                        newFields[idx].value = e.target.value;
                        setCustomFields(newFields);
                      }}
                      className="w-[45%] premium-input bg-dark-card text-xs py-1 px-2"
                    />
                    <button 
                      onClick={(e) => { e.preventDefault(); setCustomFields(customFields.filter((_, i) => i !== idx)); }}
                      className="text-red-400 hover:text-red-300 font-bold px-1 w-[10%]"
                    >
                      ×
                    </button>
                  </div>
                ))}
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
                <span>Live Bulk ID Cards View ({selectedStudentIds.length > 0 ? `${selectedStudentIds.length} Selected` : `${filteredStudents.length} Students`})</span>
              </h2>
              <div className="flex items-center gap-2">
                {selectedStudentIds.length > 0 && (
                  <button 
                    onClick={() => setSelectedStudentIds([])}
                    className="text-[10px] font-black uppercase text-red-400 bg-red-400/10 hover:bg-red-400/20 py-1 px-2.5 rounded-full transition-colors"
                  >
                    Clear Selection
                  </button>
                )}
                <span className="text-[10px] font-black uppercase text-dark-muted bg-white/5 border border-dark-border/40 py-1 px-2.5 rounded-full">
                  Class: {selectedClass}
                </span>
              </div>
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
              <>
                {/* A4 Vertical List container */}
                {!isPrinting && filteredStudents.length > 10 && (
                  <div className="bg-primary-50/50 border border-primary-200 text-primary-800 text-xs font-bold p-3 rounded-lg flex items-center justify-center mb-6 print:hidden w-full max-w-3xl text-center">
                    Showing 10 preview cards for performance. All {filteredStudents.length} cards will be generated when you click Print.
                  </div>
                )}
                
                <div className="flex flex-col gap-6 items-center w-full print:block print:space-y-6">
                  {(isPrinting ? (selectedStudentIds.length > 0 ? students.filter(s => selectedStudentIds.includes(s.id)) : filteredStudents) : filteredStudents.slice(0, 10)).map((st) => {
                  return (
                    <div key={st.id} className="flex flex-col items-center mb-6 border-b border-dark-border/30 pb-6 print:pb-2 print:border-0 last:border-0 last:pb-0 w-full overflow-hidden print:mb-8 print:block print:break-inside-avoid">
                      {!isPrinting && (
                        <div className="w-full flex justify-end mb-2 no-print" style={{ maxWidth: deferredCardWidth }}>
                          <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg border border-dark-border/40 hover:bg-white/10 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={selectedStudentIds.includes(st.id)}
                              onChange={(e) => {
                                setSelectedStudentIds(prev => 
                                  e.target.checked ? [...prev, st.id] : prev.filter(id => id !== st.id)
                                );
                              }}
                              className="w-4 h-4 cursor-pointer rounded border-dark-border/40 text-primary-500 focus:ring-primary-500/30 bg-dark-card"
                            />
                            <span className="text-xs font-bold text-dark-text">Select for Print</span>
                          </label>
                        </div>
                      )}
                      <SmitCombinedCard 
                        st={st} 
                        isPrint={isPrinting} 
                        schoolName={deferredSchoolName}
                        cardSubtitle={deferredCardSubtitle}
                        cardTheme={deferredCardTheme}
                        validity={deferredValidity}
                        principalName={deferredPrincipalName}
                        disclaimer={deferredDisclaimer}
                        schoolLogo={schoolLogo}
                        showFields={deferredShowFields}
                        customFields={deferredCustomFields}
                        getSignatureForStudent={getSignatureForStudent}
                        cardWidth={deferredCardWidth}
                        cardHeight={deferredCardHeight}
                      />
                    </div>
                  );
                })}
              </div>
            </>
            )}
          </GlassCard>
        </div>

      </div>

    </div>
  );
};

export default StudentIdCards;


