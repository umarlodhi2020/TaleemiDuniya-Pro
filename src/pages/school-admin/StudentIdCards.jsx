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
import GlassCard from '../../components/common/GlassCard';

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

const defaultMockStudents = [
  { id: 'mock1', name: 'Imama Umar', class: 'PREP', rollNo: '101', fatherName: 'Umar Hayat', phone: '0300-1234567', registrationNo: 'TD-2026-928' },
  { id: 'mock2', name: 'Zayan Ahmed', class: 'PREP', rollNo: '102', fatherName: 'Ahmed Malik', phone: '0312-7654321', registrationNo: 'TD-2026-929' },
  { id: 'mock3', name: 'Ayesha Fatima', class: 'PREP', rollNo: '103', fatherName: 'Muhammad Ali', phone: '0333-8877665', registrationNo: 'TD-2026-930' },
  { id: 'mock4', name: 'Hasan Raza', class: 'Nursery', rollNo: '201', fatherName: 'Sajid Raza', phone: '0321-4433221', registrationNo: 'TD-2026-931' },
];

const StudentIdCards = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // ID Card customizations
  const [schoolName, setSchoolName] = useState('The Knowledge Home School System');
  const [cardSubtitle, setCardSubtitle] = useState('Student Identity Card');
  const [cardTheme, setCardTheme] = useState('blue');
  const [validity, setValidity] = useState('2026 - 2027');
  const [principalName, setPrincipalName] = useState('Sir Umar Hayat');
  const [disclaimer, setDisclaimer] = useState('This card is non-transferable and remains the property of the school. If found, please return to the school administration office.');
  
  // Custom stamp upload
  const [stampImage, setStampImage] = useState(null);
  const stampInputRef = useRef(null);

  useEffect(() => {
    fetchStudents();
  }, [schoolId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getRecords('students', schoolId);
      if (data && data.length > 0) {
        setStudents(data);
      } else {
        setStudents(defaultMockStudents);
      }
    } catch (error) {
      console.error("Error fetching students for ID Cards:", error);
      setStudents(defaultMockStudents);
    } finally {
      setLoading(false);
    }
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

  const activeTheme = THEMES[cardTheme] || THEMES.blue;

  const handlePrint = () => {
    window.print();
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

      {/* Header Panel */}
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 no-print">
        
        {/* Left Side: Customize Dashboard */}
        <div className="lg:col-span-1 space-y-6">
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
        <div className="lg:col-span-3">
          <GlassCard className="p-6 border-dark-border/40 min-h-[500px]">
            <div className="flex items-center justify-between border-b border-dark-border/40 pb-3 mb-6">
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
              /* A4 Grid emulation container */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
                {filteredStudents.map((st) => (
                  <div key={st.id} className="relative group w-[220px] h-[330px] rounded-[18px] bg-white border border-gray-200 shadow-xl overflow-hidden print-card-break select-text text-black flex flex-col font-sans transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
                    
                    {/* Upper dynamic background stripe */}
                    <div className={`h-[80px] w-full ${activeTheme.bg} p-2 flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0 text-center`}>
                      <div className="absolute inset-0 bg-white/5 pointer-events-none" />
                      {/* Decorative elements */}
                      <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-white/10 blur-xl" />
                      <div className="absolute -bottom-10 -right-10 w-20 h-20 rounded-full bg-white/10 blur-xl" />
                      
                      {/* School Name */}
                      <h3 className="text-[10px] font-black uppercase leading-tight tracking-wider text-white line-clamp-2 max-w-[95%]">
                        {schoolName}
                      </h3>
                      {/* Card Title badge */}
                      <span className="text-[7.5px] font-extrabold tracking-widest uppercase bg-white/20 text-yellow-300 mt-1 py-0.5 px-2 rounded-full leading-none">
                        {cardSubtitle}
                      </span>
                    </div>

                    {/* ID Card Body */}
                    <div className="flex-1 px-3.5 pt-3 pb-2 flex flex-col items-center justify-between bg-white text-center">
                      
                      {/* Dynamic Photo Container */}
                      <div className="relative z-10 w-[72px] h-[72px] rounded-full border-[3px] border-white shadow-md bg-gray-50 flex items-center justify-center overflow-hidden -mt-10 flex-shrink-0">
                        {st.profilePhoto ? (
                          <img src={st.profilePhoto} alt={st.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={34} className="text-gray-400" />
                        )}
                        {/* Dynamic Class Badge */}
                        <span className={`absolute bottom-0 right-0 text-[6.5px] font-black px-1.5 py-0.5 rounded-full border border-white shadow ${activeTheme.badge} uppercase leading-none`}>
                          {st.class || 'N/A'}
                        </span>
                      </div>

                      {/* Bio Details */}
                      <div className="w-full my-1.5 flex-1 flex flex-col justify-center">
                        {/* Student Name */}
                        <h4 className="text-[12.5px] font-black text-gray-900 tracking-wide uppercase leading-tight mt-1 truncate">
                          {st.name || 'N/A'}
                        </h4>
                        
                        {/* Information Specs */}
                        <div className="mt-2.5 space-y-1 text-left text-[8.5px] font-bold text-gray-700 max-w-[95%] mx-auto">
                          <div className="flex justify-between border-b border-gray-100 pb-0.5">
                            <span className="text-gray-400 font-extrabold uppercase text-[7.5px]">Father's Name</span>
                            <span className="text-gray-800 uppercase truncate max-w-[100px]">{st.fatherName || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 pb-0.5">
                            <span className="text-gray-400 font-extrabold uppercase text-[7.5px]">Roll Number</span>
                            <span className="text-gray-900 font-extrabold">{st.rollNo || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 pb-0.5">
                            <span className="text-gray-400 font-extrabold uppercase text-[7.5px]">Admn/Reg No</span>
                            <span className="text-gray-800 font-mono font-black">{st.registrationNo || st.id || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between pb-0.5">
                            <span className="text-gray-400 font-extrabold uppercase text-[7.5px]">Contact</span>
                            <span className="text-gray-800">{st.phone || st.contact || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Barcode/QR dynamic area */}
                      <div className="w-full flex-shrink-0 bg-gray-50 border border-gray-100 rounded-lg p-1 mt-1 mb-1">
                        {renderBarcodeSVG(st.registrationNo || st.id)}
                      </div>

                      {/* Card Footer details */}
                      <div className="w-full border-t border-gray-100 pt-2 flex items-center justify-between flex-shrink-0">
                        {/* Validity dates */}
                        <div className="text-left">
                          <span className="block text-[6px] text-gray-400 uppercase font-black tracking-tighter leading-none">Validity Period</span>
                          <span className="text-[7.5px] font-black text-gray-800 leading-none">{validity}</span>
                        </div>

                        {/* Signature stamp area */}
                        <div className="text-right relative min-w-[70px]">
                          {stampImage ? (
                            <img src={stampImage} alt="Stamp" className="absolute -top-6 right-2 h-7 max-w-[48px] object-contain opacity-85 select-none pointer-events-none" />
                          ) : (
                            <div className="absolute -top-4 right-4 text-[7px] text-gray-300 font-semibold italic border border-dashed border-gray-200 px-1 select-none pointer-events-none">STAMP</div>
                          )}
                          <span className="block text-[6px] text-gray-400 uppercase font-black tracking-tighter leading-none">Authorized By</span>
                          <span className="text-[7.5px] font-black text-gray-900 font-serif leading-none truncate max-w-[75px] block mt-0.5">{principalName}</span>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

      </div>

      {/* ========================================================
          SECRET PRINT HIDDEN CONTAINER
          Always formatted correctly for standard A4 landscape/portrait grid printing
      ======================================================== */}
      <div id="id-cards-print-area" className="hidden print:block text-black bg-white">
        <div className="flex flex-wrap gap-6 justify-center bg-white p-4">
          {filteredStudents.map((st) => (
            <div key={st.id} className="relative w-[210px] h-[315px] rounded-[14px] bg-white border border-gray-300 shadow-sm overflow-hidden print-card-break flex flex-col font-sans mb-4">
              {/* Card Top Header */}
              <div className={`h-[75px] w-full ${activeTheme.bg} p-2 flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0 text-center`}>
                <h3 className="text-[9.5px] font-black uppercase leading-tight tracking-wider text-white line-clamp-2 max-w-[95%]">
                  {schoolName}
                </h3>
                <span className="text-[7px] font-extrabold tracking-widest uppercase bg-white/20 text-yellow-300 mt-1 py-0.5 px-2 rounded-full leading-none">
                  {cardSubtitle}
                </span>
              </div>

              {/* Card Body */}
              <div className="flex-1 px-3 pt-3 pb-2 flex flex-col items-center justify-between bg-white text-center">
                
                {/* Photo container */}
                <div className="relative z-10 w-[64px] h-[64px] rounded-full border-2 border-white shadow-md bg-gray-50 flex items-center justify-center overflow-hidden -mt-10 flex-shrink-0">
                  {st.profilePhoto ? (
                    <img src={st.profilePhoto} alt={st.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={30} className="text-gray-400" />
                  )}
                  <span className={`absolute bottom-0 right-0 text-[6px] font-black px-1.5 py-0.5 rounded-full border border-white shadow ${activeTheme.badge} uppercase leading-none`}>
                    {st.class || 'N/A'}
                  </span>
                </div>

                {/* Details */}
                <div className="w-full my-1 flex-1 flex flex-col justify-center">
                  <h4 className="text-[11.5px] font-black text-gray-900 tracking-wide uppercase leading-tight truncate">
                    {st.name || 'N/A'}
                  </h4>
                  
                  <div className="mt-2 space-y-0.5 text-left text-[8px] font-bold text-gray-700 max-w-[95%] mx-auto">
                    <div className="flex justify-between border-b border-gray-100 pb-0.5">
                      <span className="text-gray-400 font-extrabold uppercase text-[7px]">Father's Name</span>
                      <span className="text-gray-800 uppercase truncate max-w-[90px]">{st.fatherName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-0.5">
                      <span className="text-gray-400 font-extrabold uppercase text-[7px]">Roll Number</span>
                      <span className="text-gray-900 font-extrabold">{st.rollNo || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-0.5">
                      <span className="text-gray-400 font-extrabold uppercase text-[7px]">Admn/Reg No</span>
                      <span className="text-gray-800 font-mono font-black">{st.registrationNo || st.id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between pb-0.5">
                      <span className="text-gray-400 font-extrabold uppercase text-[7px]">Contact</span>
                      <span className="text-gray-800">{st.phone || st.contact || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic SVG Barcode */}
                <div className="w-full flex-shrink-0 bg-gray-50 border border-gray-100 rounded-lg p-1">
                  {renderBarcodeSVG(st.registrationNo || st.id)}
                </div>

                {/* Signature stamp area & Validity */}
                <div className="w-full border-t border-gray-100 pt-1.5 flex items-center justify-between flex-shrink-0">
                  <div className="text-left">
                    <span className="block text-[5.5px] text-gray-400 uppercase font-black leading-none">Validity Period</span>
                    <span className="text-[7px] font-black text-gray-800 leading-none">{validity}</span>
                  </div>

                  <div className="text-right relative min-w-[70px]">
                    {stampImage && (
                      <img src={stampImage} alt="Stamp" className="absolute -top-5 right-2 h-6 max-w-[40px] object-contain opacity-85 select-none pointer-events-none" />
                    )}
                    <span className="block text-[5.5px] text-gray-400 uppercase font-black leading-none">Authorized By</span>
                    <span className="text-[7px] font-black text-gray-900 font-serif leading-none truncate max-w-[70px] block mt-0.5">{principalName}</span>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default StudentIdCards;
