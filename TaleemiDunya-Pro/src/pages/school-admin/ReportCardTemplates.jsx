import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  Sparkles, 
  Settings, 
  Award, 
  Layers, 
  Check, 
  BookOpen, 
  Edit3, 
  Upload, 
  CheckCircle2, 
  Bookmark, 
  ChevronRight,
  RefreshCw,
  Plus
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Pre-defined templates definition
const templatesList = [
  {
    id: 'tkh_colorful',
    name: 'TKH Colorful (Ruler & Pencil)',
    description: 'Authentic school design featuring vertical ruler and pencil margins, sweeping green curves, pink star accents, and green drop-shadow metric boxes.',
    badge: 'Authentic',
    thumbnailColor: 'from-green-500 via-yellow-400 to-blue-500',
  },
  {
    id: 'traditional',
    name: 'Traditional A4 (TKH Style)',
    description: 'Classic Pakistani school layout with side wave ribbons, ornamental flourishes, red comment lines, and blue rosette grade badge.',
    badge: 'Classic',
    thumbnailColor: 'from-indigo-900 to-lime-500',
  },
  {
    id: 'modern_minimal',
    name: 'Modern Minimalist (Sleek Clean)',
    description: 'Contemporary design with geometric borders, thin grid lines, neat sans-serif text, and modern color bar charts.',
    badge: 'Premium',
    thumbnailColor: 'from-slate-700 to-slate-900',
  },
  {
    id: 'play_school',
    name: 'Play School / Kindergarten',
    description: 'Cheerful pastel rainbow borders, cartoonish star highlights, friendly typography, and playful comment cards.',
    badge: 'Colorful',
    thumbnailColor: 'from-pink-400 via-yellow-300 to-cyan-400',
  },
  {
    id: 'elite_crest',
    name: 'Elite Blue Crest (Prestigious)',
    description: 'Prestigious layout with double gold borders, royal navy blue headers, serif lettering, and official round seals.',
    badge: 'Formal',
    thumbnailColor: 'from-amber-500 to-indigo-950',
  },
  {
    id: 'islamic_crescent',
    name: 'Islamic Crescent (Gold & Green)',
    description: 'Elegantly styled template featuring emerald green borders, gold Rub el Hizb corner stars, thin gold arched frame, crescent moon accents, and traditional borders.',
    badge: 'Islamic',
    thumbnailColor: 'from-emerald-700 via-yellow-600 to-emerald-900',
  }
];

// Available logo presets (custom SVG options)
const logoPresets = [
  { id: 'shield', name: 'Knowledge Crest', icon: '🛡️', color: 'bg-indigo-900' },
  { id: 'book', name: 'Academic Book', icon: '📖', color: 'bg-emerald-600' },
  { id: 'star', name: 'Bright Future Star', icon: '⭐', color: 'bg-amber-500' },
  { id: 'play', name: 'Play Blocks', icon: '🧸', color: 'bg-pink-500' }
];

const ReportCardTemplates = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [activeTemplate, setActiveTemplate] = useState('traditional');
  const [classes, setClasses] = useState(['NURSERY', 'KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  const [classAssignments, setClassAssignments] = useState({
    'NURSERY': 'play_school',
    'KG': 'play_school',
    '1': 'traditional',
    '2': 'traditional',
    '3': 'traditional',
    '4': 'traditional',
    '5': 'traditional',
    '6': 'modern_minimal',
    '7': 'modern_minimal',
    '8': 'modern_minimal',
    '9': 'elite_crest',
    '10': 'elite_crest'
  });

  const [customizer, setCustomizer] = useState({
    schoolName: userData?.schoolName || 'The Knowledge Home School System',
    schoolSubtitle: 'Official Academic Transcript & Report Card',
    sessionTerm: 'Academic Session 2026',
    teacherRemarks: 'Outstanding progress in all academic subjects. Extremely disciplined, creative, and participates enthusiastically in co-curricular activities.',
    teacherName: 'Miss Ayesha Lodhi',
    principalName: 'Principal Umar Hayat',
    logoStyle: 'shield',
    customLogoUrl: '',
    doubleBorderColor: '#312e81', // indigo-900
    accentColor: '#84cc16' // lime-500
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignClassTarget, setAssignClassTarget] = useState('1');

  const cardRef = useRef(null);

  useEffect(() => {
    fetchAssignments();
  }, [userData]);

  const fetchAssignments = async () => {
    try {
      const docRef = doc(db, 'settings', `report_templates_${schoolId}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.classAssignments) {
          setClassAssignments(data.classAssignments);
        }
        if (data.customizer) {
          setCustomizer(prev => ({ ...prev, ...data.customizer }));
        }
      }
    } catch (error) {
      console.error("Error loading template assignments:", error);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'settings', `report_templates_${schoolId}`);
      await setDoc(docRef, {
        classAssignments,
        customizer,
        updatedAt: new Date(),
        schoolId
      });
      alert("Report Card Template assignments and configuration saved successfully!");
    } catch (e) {
      console.error("Error saving layout templates configurations:", e);
      alert("Error saving: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignTemplate = (className, templateId) => {
    setClassAssignments(prev => ({
      ...prev,
      [className]: templateId
    }));
  };

  const triggerPrint = () => {
    window.print();
  };

  const triggerPDFDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const element = cardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save(`ReportTemplate_${activeTemplate}.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF generation failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Mock Student marks list for rendering previews
  const previewStudent = {
    name: 'Muhammad Umar Lodhi',
    fatherName: 'Iftikhar Ahmad',
    class: '9th Grade',
    rollNo: 'TD-2026-904',
    marks: {
      'English': { obtained: 92, total: 100 },
      'Urdu': { obtained: 86, total: 100 },
      'Mathematics': { obtained: 98, total: 100 },
      'Science': { obtained: 94, total: 100 },
      'Computer': { obtained: 96, total: 100 }
    }
  };

  // Compute stats
  const totalObtained = Object.values(previewStudent.marks).reduce((acc, curr) => acc + curr.obtained, 0);
  const totalMax = Object.values(previewStudent.marks).reduce((acc, curr) => acc + curr.total, 0);
  const percentage = Math.round((totalObtained / totalMax) * 100);
  const calculatedGrade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : 'C';

  return (
    <div className="space-y-6 animate-fade-in pb-16 print:p-0 print:bg-white print:m-0">
      
      {/* Dynamic Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #report-card-live-preview, #report-card-live-preview * {
            visibility: visible;
          }
          #report-card-live-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 8mm;
            box-shadow: none;
            border: none;
          }
        }
      `}</style>

      {/* Header section (hidden in print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <button 
            onClick={() => navigate('/school-admin/academics')}
            className="flex items-center gap-2 text-dark-muted hover:text-primary-400 font-bold text-xs uppercase tracking-widest transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to Academics Hub</span>
          </button>
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary-400 to-indigo-500 bg-clip-text text-transparent">
            Report Card Templates
          </h1>
          <p className="text-dark-muted mt-1 text-sm">
            Manage report card layout presets, configure school crest signatures, and dynamically map styles to student classes.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={triggerPrint}
            className="premium-button-secondary flex items-center gap-2 text-xs py-2.5 px-4"
          >
            <Printer size={16} />
            <span>Print Template</span>
          </button>
          <button 
            onClick={triggerPDFDownload}
            disabled={isExporting}
            className="premium-button-primary flex items-center gap-2 text-xs py-2.5 px-4"
          >
            <Download size={16} />
            <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main interactive area */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 print:block print:w-full">
        
        {/* Left Side: Template Selector & Settings Controls (hidden in print) */}
        <div className="xl:col-span-1 space-y-6 print:hidden">
          
          {/* Preset Selector */}
          <GlassCard className="p-5 space-y-4">
            <h3 className="font-bold text-xs text-primary-400 uppercase tracking-widest border-b border-dark-border pb-3 flex items-center gap-2">
              <Award size={16} />
              <span>Available Layouts</span>
            </h3>

            <div className="space-y-3">
              {templatesList.map(t => {
                const isCurrent = activeTemplate === t.id;
                const assignedClassesCount = Object.keys(classAssignments).filter(cls => classAssignments[cls] === t.id).length;

                return (
                  <div 
                    key={t.id}
                    onClick={() => setActiveTemplate(t.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                      isCurrent 
                        ? 'bg-primary-500/10 border-primary-500/40 text-primary-400' 
                        : 'bg-dark-card border-dark-border hover:border-primary-500/20 text-dark-text'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border shrink-0 ${
                        isCurrent 
                          ? 'bg-primary-500/20 border-primary-500/30 text-primary-400' 
                          : 'bg-dark-hover border-dark-border text-dark-muted'
                      }`}>
                        {t.badge}
                      </span>
                      {isCurrent && <CheckCircle2 size={16} className="text-primary-400" />}
                    </div>

                    <div className="mt-3">
                      <h4 className="font-bold text-xs text-dark-text group-hover:text-primary-400 transition-colors">
                        {t.name}
                      </h4>
                      <p className="text-[10px] text-dark-muted leading-tight mt-1 truncate">
                        {t.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-dark-border/40 flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-dark-muted">
                      <span>Assigned:</span>
                      <span className="text-primary-400">{assignedClassesCount} Classes</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Quick Class Assignment Table */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-dark-border pb-3">
              <h3 className="font-bold text-xs text-primary-400 uppercase tracking-widest flex items-center gap-2">
                <Layers size={16} />
                <span>Class Assignments</span>
              </h3>
              <button 
                onClick={() => setShowAssignModal(true)}
                className="p-1 rounded bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 transition-all"
                title="Quick Assign"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {Object.keys(classAssignments).sort().map(cls => (
                <div key={cls} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-dark-border/40 hover:border-primary-500/25 transition-all text-[11px]">
                  <span className="font-bold">{cls}</span>
                  <select 
                    value={classAssignments[cls]}
                    onChange={(e) => handleAssignTemplate(cls, e.target.value)}
                    className="bg-dark-bg border border-dark-border text-dark-text rounded text-[9px] py-0.5 px-1 font-bold font-sans"
                  >
                    {templatesList.map(t => (
                      <option key={t.id} value={t.id}>{t.badge}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* School Brand Customizations */}
          <GlassCard className="p-5 space-y-4">
            <h3 className="font-bold text-xs text-primary-400 uppercase tracking-widest border-b border-dark-border pb-3 flex items-center gap-2">
              <Settings size={16} />
              <span>Branding Config</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-dark-muted uppercase tracking-widest block">School System Name</label>
                <input 
                  type="text" 
                  value={customizer.schoolName}
                  onChange={(e) => setCustomizer(prev => ({ ...prev, schoolName: e.target.value }))}
                  className="w-full premium-input py-1.5 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-dark-muted uppercase tracking-widest block">Report Subtitle</label>
                <input 
                  type="text" 
                  value={customizer.schoolSubtitle}
                  onChange={(e) => setCustomizer(prev => ({ ...prev, schoolSubtitle: e.target.value }))}
                  className="w-full premium-input py-1.5 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-dark-muted uppercase tracking-widest block">Issuance Term / Date</label>
                <input 
                  type="text" 
                  value={customizer.sessionTerm}
                  onChange={(e) => setCustomizer(prev => ({ ...prev, sessionTerm: e.target.value }))}
                  className="w-full premium-input py-1.5 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-dark-muted uppercase tracking-widest block">Select Preset Logo</label>
                <div className="grid grid-cols-4 gap-2">
                  {logoPresets.map(preset => (
                    <button 
                      key={preset.id}
                      onClick={() => setCustomizer(prev => ({ ...prev, logoStyle: preset.id }))}
                      className={`p-2 rounded-lg border transition-all text-lg flex items-center justify-center ${
                        customizer.logoStyle === preset.id 
                          ? 'bg-primary-500/20 border-primary-500/40' 
                          : 'bg-dark-hover border-dark-border hover:border-primary-500/10'
                      }`}
                      title={preset.name}
                    >
                      {preset.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-dark-muted uppercase tracking-widest block">Principal Signature Label</label>
                <input 
                  type="text" 
                  value={customizer.principalName}
                  onChange={(e) => setCustomizer(prev => ({ ...prev, principalName: e.target.value }))}
                  className="w-full premium-input py-1.5 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-dark-muted uppercase tracking-widest block">Teacher Signature Label</label>
                <input 
                  type="text" 
                  value={customizer.teacherName}
                  onChange={(e) => setCustomizer(prev => ({ ...prev, teacherName: e.target.value }))}
                  className="w-full premium-input py-1.5 text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="w-full premium-button-primary flex items-center justify-center gap-2 py-2"
                >
                  <Check size={16} />
                  {isSaving ? 'Syncing...' : 'Save Template Config'}
                </button>
              </div>
            </div>
          </GlassCard>

        </div>

        {/* Right Side: Zoomable Live A4 Report Preview Canvas */}
        <div className="xl:col-span-3 flex justify-center print:block print:p-0">
          
          <div className="overflow-x-auto w-full flex flex-col items-center justify-center py-4 print:p-0 print:overflow-visible">
            
            {/* The live rendering frame representing the selected template */}
            <div 
              ref={cardRef}
              id="report-card-live-preview"
              className="w-[210mm] h-[297mm] bg-white text-black relative flex flex-col justify-between p-12 overflow-hidden shadow-2xl border border-gray-200 select-none print:shadow-none print:border-none print:p-8"
              style={{
                boxSizing: 'border-box',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              
              {/* ========================================================================= */}
              {/* TEMPLATE STYLE 0: TKH COLORFUL CLASSIC (Ruler & Pencil - Authentic) */}
              {/* ========================================================================= */}
              {activeTemplate === 'tkh_colorful' && (
                <div className="w-full h-full flex flex-col justify-between pl-[55px] pr-[40px] py-6 bg-white relative overflow-hidden select-text" style={{ boxSizing: 'border-box' }}>
                  {/* Left Dynamic Vertical School Ruler Margin */}
                  <div className="absolute left-0 top-0 bottom-0 w-[42px] bg-[#fbf5e6] border-r border-[#d4c3a3] flex flex-col justify-between py-4 z-10 pointer-events-none select-none">
                    <svg className="w-full h-full" viewBox="0 0 42 800" preserveAspectRatio="none">
                      {Array.from({ length: 76 }).map((_, idx) => {
                        const isCm = idx % 10 === 0;
                        const isHalfCm = idx % 5 === 0 && !isCm;
                        const yPos = 20 + idx * 10;
                        return (
                          <React.Fragment key={idx}>
                            <line 
                              x1={isCm ? "4" : isHalfCm ? "15" : "22"} 
                              y1={yPos} 
                              x2="42" 
                              y2={yPos} 
                              stroke="#7c2d12" 
                              strokeWidth={isCm ? "1.5" : "1"} 
                            />
                            {isCm && (
                              <text 
                                x="12" 
                                y={yPos + 3} 
                                fill="#7c2d12" 
                                fontSize="7.5" 
                                fontFamily="monospace" 
                                fontWeight="900" 
                                textAnchor="middle"
                                transform={`rotate(-90 12 ${yPos + 3})`}
                              >
                                {idx / 10}
                              </text>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Right Dynamic Vertical Green Pencil Margin */}
                  <div className="absolute right-[18px] top-[15%] bottom-[15%] w-[12px] pointer-events-none z-10 flex flex-col items-center">
                    <svg viewBox="0 0 20 600" className="w-full h-full" preserveAspectRatio="none">
                      {/* Eraser */}
                      <rect x="3" y="0" width="14" height="24" fill="#fb7185" rx="1.5" />
                      {/* Silver ring */}
                      <rect x="3" y="24" width="14" height="14" fill="#cbd5e1" />
                      <line x1="3" y1="28" x2="17" y2="28" stroke="#94a3b8" strokeWidth="1" />
                      <line x1="3" y1="34" x2="17" y2="34" stroke="#94a3b8" strokeWidth="1" />
                      {/* Green body */}
                      <rect x="3" y="38" width="14" height="510" fill="#a3e635" />
                      <rect x="6" y="38" width="2" height="510" fill="#84cc16" />
                      <rect x="12" y="38" width="2" height="510" fill="#84cc16" />
                      {/* Wood sharpened */}
                      <polygon points="3,548 17,548 10,588" fill="#fde8c4" />
                      {/* Pencil tip lead */}
                      <polygon points="8,576 12,576 10,588" fill="#334155" />
                    </svg>
                  </div>

                  {/* Top-Right Sweeping Colorful Curves */}
                  <div className="absolute top-0 right-0 w-[180px] h-[180px] pointer-events-none z-10">
                    <svg viewBox="0 0 180 180" className="w-full h-full">
                      {/* Outer lime curve */}
                      <path d="M 40,0 Q 110,35 180,140 L 180,0 Z" fill="#84cc16" />
                      {/* Inner navy curve */}
                      <path d="M 80,0 Q 130,30 180,100 L 180,0 Z" fill="#1e3a8a" />
                    </svg>
                  </div>

                  {/* Bottom-Left Curved Green swoop */}
                  <div className="absolute bottom-0 left-0 w-[150px] h-[150px] pointer-events-none z-10">
                    <svg viewBox="0 0 150 150" className="w-full h-full">
                      <path d="M 0,40 Q 60,110 150,150 L 0,150 Z" fill="#84cc16" />
                      <path d="M 0,70 Q 50,105 110,150 L 0,150 Z" fill="#1e3a8a" />
                      <path d="M 0,55 Q 55,108 130,150" stroke="#fef08a" strokeWidth="1.5" strokeDasharray="3,6" fill="none" />
                    </svg>
                  </div>

                  {/* Bottom-Right Corner Blue Floral Ornament */}
                  <div className="absolute bottom-[10px] right-[10px] w-[55px] h-[55px] pointer-events-none z-10 text-indigo-900/60">
                    <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-current" strokeWidth="2.5">
                      <path d="M 80,20 C 80,60 60,80 20,80" />
                      <path d="M 90,40 C 90,70 70,90 40,90" />
                      <path d="M 70,10 C 65,30 60,40 50,45" />
                      <path d="M 30,70 C 25,60 15,55 10,50" />
                      <circle cx="20" cy="80" r="3" fill="currentColor" />
                      <circle cx="80" cy="20" r="3" fill="currentColor" />
                    </svg>
                  </div>

                  {/* Authentic Header Structure */}
                  <div className="flex items-center gap-4 relative z-20 select-text">
                    {/* TKH Crest Logo on left */}
                    <div className="relative">
                      {/* Colorful floating stars */}
                      <div className="absolute -top-3 -left-3 flex gap-0.5 text-xs animate-bounce pointer-events-none select-none">
                        <span className="text-red-500">★</span>
                        <span className="text-yellow-500 rotate-12">★</span>
                        <span className="text-blue-500 -rotate-12">★</span>
                        <span className="text-green-500 text-[8px]">★</span>
                      </div>
                      
                      <svg viewBox="0 0 100 100" className="w-[72px] h-[72px] drop-shadow-md">
                        <path id="crestCirclePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none" />
                        <circle cx="50" cy="50" r="43" fill="#1e3a8a" stroke="#eab308" strokeWidth="2" />
                        <circle cx="50" cy="50" r="34" fill="#ffffff" stroke="#eab308" strokeWidth="1" />
                        {/* Center leaves/crests */}
                        <g transform="translate(30, 30) scale(0.4)" fill="#16a34a">
                          <path d="M50 10 C35 30 20 40 10 50 C25 50 35 45 50 30 C65 45 75 50 90 50 C80 40 65 30 50 10 Z" />
                          <circle cx="50" cy="65" r="8" fill="#eab308" />
                          <rect x="47" y="73" width="6" height="15" fill="#eab308" />
                        </g>
                        <text fill="#ffffff" fontSize="5.2" fontWeight="bold" fontFamily="sans-serif" letterSpacing="0.2">
                          <textPath href="#crestCirclePath" startOffset="50%" textAnchor="middle">
                            THE KNOWLEDGE HOME SCHOOL SYSTEM
                          </textPath>
                        </text>
                      </svg>
                    </div>

                    {/* Titles */}
                    <div className="flex-1 text-center pr-8">
                      <h2 className="text-2xl font-extrabold tracking-wider text-black uppercase" style={{ fontFamily: 'Georgia, serif' }}>
                        Result Card
                      </h2>
                      <p className="text-xs font-black text-black italic tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                        Academic First Session
                      </p>
                      <h3 className="text-lg font-black text-black uppercase tracking-tighter mt-0.5 leading-none" style={{ fontFamily: '"Cinzel", "Georgia", serif', letterSpacing: '-0.2px' }}>
                        {customizer.schoolName}
                      </h3>
                    </div>
                  </div>

                  {/* Student profile matrix */}
                  <div className="my-2 space-y-1 pl-4 relative z-20 text-xs font-black text-black" style={{ fontFamily: 'sans-serif' }}>
                    <div className="flex items-center gap-1">
                      <span>❖</span>
                      <span>Student Name: <strong className="text-black font-extrabold">{previewStudent.name.toUpperCase()}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>❖</span>
                      <span>Father Name: <strong className="text-black font-extrabold">{previewStudent.fatherName.toUpperCase()}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>❖</span>
                      <span>Class: <strong className="text-black font-extrabold">{previewStudent.class.toUpperCase()}</strong></span>
                    </div>
                  </div>

                  {/* Subjects Ledger Table */}
                  <div className="my-1 pl-2 pr-2 relative z-20">
                    <table className="w-full border-collapse border border-black text-xs font-black text-black">
                      <thead>
                        <tr className="bg-[#a6a6a6] border-b border-black text-center text-[11px]">
                          <th className="py-1 px-2 border-r border-black text-left">Subjects</th>
                          <th className="py-1 px-2 border-r border-black w-28">Total Marks</th>
                          <th className="py-1 px-2 w-32">Obtained Marks</th>
                        </tr>
                      </thead>
                      <tbody className="text-center">
                        {Object.keys(previewStudent.marks).map((sub) => (
                          <tr key={sub} className="border-b border-black">
                            <td className="py-1.5 px-3 border-r border-black text-left capitalize font-black">{sub}</td>
                            <td className="py-1.5 border-r border-black font-bold">{previewStudent.marks[sub].total}</td>
                            <td className="py-1.5 font-extrabold">{previewStudent.marks[sub].obtained}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Metric Blocks & Blue Grade Rosette */}
                  <div className="flex justify-between items-center pl-4 pr-6 my-1 relative z-20">
                    <div className="space-y-1.5 text-xs font-black text-black">
                      <div className="flex items-center gap-2">
                        <span className="w-36 text-right">obtained/total Marks:</span>
                        <div className="bg-white border-2 border-[#55c0a3] px-4 py-0.5 rounded font-black text-center min-w-[70px] shadow-[0_3px_6px_rgba(85,192,163,0.3)]">
                          {totalObtained}/{totalMax}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-36 text-right">Percentage:</span>
                        <div className="bg-white border-2 border-[#55c0a3] px-4 py-0.5 rounded font-black text-center min-w-[70px] shadow-[0_3px_6px_rgba(85,192,163,0.3)]">
                          {percentage}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-black">Garde:</span>
                      
                      {/* High-Fidelity Blue Rosette Ribbon Badge */}
                      <div className="relative w-14 h-14 flex items-center justify-center select-none pointer-events-none">
                        {/* Rosette ribbon tails */}
                        <div className="absolute top-[28px] left-[12px] w-3.5 h-6 bg-blue-700 rotate-[15deg] origin-top rounded-b" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 80%, 0% 100%)' }} />
                        <div className="absolute top-[28px] right-[12px] w-3.5 h-6 bg-blue-700 rotate-[-15deg] origin-top rounded-b" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 80%, 0% 100%)' }} />
                        {/* Rosette Body */}
                        <div className="w-11 h-11 rounded-full bg-blue-600 border border-dashed border-white shadow-md flex items-center justify-center text-white font-extrabold text-sm relative z-10">
                          {calculatedGrade}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Teacher Comments writing paper style block */}
                  <div className="space-y-0.5 pl-4 pr-2 relative z-20">
                    <div className="flex items-center justify-center gap-2">
                      {/* Smiling pink star vector logo */}
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#f472b6]">
                        <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.786 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.41l8.2-1.192z" />
                        {/* Smile and eyes */}
                        <circle cx="9.5" cy="11.5" r="1.2" fill="#000" />
                        <circle cx="14.5" cy="11.5" r="1.2" fill="#000" />
                        <path d="M 10 14.5 Q 12 16.5 14 14.5" stroke="#000" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                      </svg>
                      <h4 className="text-[11px] font-black text-black uppercase tracking-wider">Teacher's Comment</h4>
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#f472b6]">
                        <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.786 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.41l8.2-1.192z" />
                        <circle cx="9.5" cy="11.5" r="1.2" fill="#000" />
                        <circle cx="14.5" cy="11.5" r="1.2" fill="#000" />
                        <path d="M 10 14.5 Q 12 16.5 14 14.5" stroke="#000" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                      </svg>
                    </div>

                    <div className="relative w-full min-h-[48px] bg-transparent mt-1">
                      {/* Notebook paper background lines */}
                      <div className="absolute inset-x-0 top-[20px] border-b border-red-500" />
                      <div className="absolute inset-x-0 top-[40px] border-b border-red-500" />
                      
                      {/* Text content printed exactly on lines */}
                      <p className="text-xs font-black italic text-black leading-tight text-center pl-2 pr-8 pt-1 relative z-10" style={{ fontFamily: 'Georgia, serif', lineHeight: '20px' }}>
                        {customizer.teacherRemarks}
                      </p>
                      
                      {/* Decorative small writing pencil icon on right */}
                      <div className="absolute right-0 bottom-1 w-6 h-6 text-black opacity-80 pointer-events-none select-none z-10">
                        <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Signatures & Date margins */}
                  <div className="pl-4 pr-2 pt-2 relative z-20 text-[10px] font-black text-black uppercase tracking-wider">
                    {/* Head & Teacher sign red lines */}
                    <div className="grid grid-cols-2 gap-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-36 border-t-2 border-red-500 pt-1 font-extrabold text-[9px]">
                          School Head Signature
                        </div>
                        <span className="text-[8px] text-gray-500 font-bold lowercase mt-0.5">{customizer.principalName}</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-36 border-t-2 border-red-500 pt-1 font-extrabold text-[9px] leading-tight">
                          School Teacher<br />Signature
                        </div>
                        <span className="text-[8px] text-gray-500 font-bold lowercase mt-0.5">{customizer.teacherName}</span>
                      </div>
                    </div>

                    <div className="flex justify-center mt-3 border-t border-gray-200 pt-1">
                      <span className="font-extrabold text-[9px]">Date: _________________________</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TEMPLATE STYLE 0.5: ISLAMIC CRESCENT (Gold & Green - Prestigious) */}
              {/* ========================================================================= */}
              {activeTemplate === 'islamic_crescent' && (
                <div className="w-full h-full flex flex-col justify-between p-8 bg-white relative overflow-hidden select-text border-8 border-[#047857]" style={{ boxSizing: 'border-box' }}>
                  {/* Elegant Double Gold Inner Border */}
                  <div className="absolute inset-1.5 border-2 border-double border-[#d97706] pointer-events-none z-10" />

                  {/* Geometrically Perfect Rub el Hizb 8-Point Stars in All 4 Corners */}
                  <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none text-[#d97706] flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-7 h-7 fill-current">
                      <rect x="25" y="25" width="50" height="50" transform="rotate(0 50 50)" />
                      <rect x="25" y="25" width="50" height="50" transform="rotate(45 50 50)" />
                      <circle cx="50" cy="50" r="10" fill="#047857" />
                    </svg>
                  </div>
                  <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none text-[#d97706] flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-7 h-7 fill-current">
                      <rect x="25" y="25" width="50" height="50" transform="rotate(0 50 50)" />
                      <rect x="25" y="25" width="50" height="50" transform="rotate(45 50 50)" />
                      <circle cx="50" cy="50" r="10" fill="#047857" />
                    </svg>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-none text-[#d97706] flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-7 h-7 fill-current">
                      <rect x="25" y="25" width="50" height="50" transform="rotate(0 50 50)" />
                      <rect x="25" y="25" width="50" height="50" transform="rotate(45 50 50)" />
                      <circle cx="50" cy="50" r="10" fill="#047857" />
                    </svg>
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 z-20 pointer-events-none text-[#d97706] flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-7 h-7 fill-current">
                      <rect x="25" y="25" width="50" height="50" transform="rotate(0 50 50)" />
                      <rect x="25" y="25" width="50" height="50" transform="rotate(45 50 50)" />
                      <circle cx="50" cy="50" r="10" fill="#047857" />
                    </svg>
                  </div>

                  {/* Arched Inner Gold Border (Mihrab-inspired) */}
                  <div className="absolute inset-4 pointer-events-none z-10">
                    <svg viewBox="0 0 600 800" className="w-full h-full fill-none stroke-[#d97706] opacity-70" strokeWidth="1.5">
                      <path d="M 30,800 L 30,180 Q 30,60 300,60 Q 570,60 570,180 L 570,800" />
                    </svg>
                  </div>

                  {/* Top Header Section with Crescent Moon and Star */}
                  <div className="flex flex-col items-center text-center mt-3 relative z-20 select-text">
                    <div className="relative w-12 h-12 flex items-center justify-center text-[#d97706]">
                      <svg viewBox="0 0 100 100" className="w-full h-full fill-current filter drop-shadow">
                        <path d="M 55,20 A 30,30 0 1,0 80,60 A 24,24 0 1,1 55,20 Z" />
                        <polygon points="68,36 71,43 78,43 73,48 75,55 68,50 61,55 63,48 58,43 65,43" />
                      </svg>
                    </div>
                    
                    <h2 className="text-xl font-extrabold tracking-widest text-[#065f46] uppercase mt-1 leading-none" style={{ fontFamily: 'Georgia, serif' }}>
                      Result Card
                    </h2>
                    <p className="text-[10px] font-black text-[#d97706] tracking-widest uppercase mt-0.5" style={{ fontFamily: 'Georgia, serif' }}>
                      Academic First Session
                    </p>
                    <h3 className="text-lg font-black text-[#065f46] tracking-tight uppercase mt-1.5 leading-none" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
                      {customizer.schoolName}
                    </h3>
                  </div>

                  {/* Student details panel */}
                  <div className="my-2 grid grid-cols-2 gap-4 px-8 relative z-20 text-xs font-black text-black" style={{ fontFamily: 'sans-serif' }}>
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#d97706] text-[8px]">⭐</span>
                        <span>Name: <strong className="text-[#065f46] font-extrabold">{previewStudent.name.toUpperCase()}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#d97706] text-[8px]">⭐</span>
                        <span>Father Name: <strong className="text-[#065f46] font-extrabold">{previewStudent.fatherName.toUpperCase()}</strong></span>
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Class: <strong className="text-[#065f46] font-extrabold">{previewStudent.class.toUpperCase()}</strong></span>
                        <span className="text-[#d97706] text-[8px]">⭐</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Roll No: <strong className="text-[#065f46] font-extrabold">{previewStudent.rollNo.toUpperCase()}</strong></span>
                        <span className="text-[#d97706] text-[8px]">⭐</span>
                      </div>
                    </div>
                  </div>

                  {/* Subject table with Green/Gold themed borders */}
                  <div className="my-1 px-6 relative z-20">
                    <table className="w-full border-collapse border border-[#d97706] text-xs font-black text-black">
                      <thead>
                        <tr className="bg-[#065f46] text-white text-center text-[10px] uppercase border-b border-[#d97706]">
                          <th className="py-1.5 px-3 border-r border-[#d97706] text-left">Subjects</th>
                          <th className="py-1.5 px-2 border-r border-[#d97706] w-28">Total Marks</th>
                          <th className="py-1.5 px-2 w-32">Obtained Marks</th>
                        </tr>
                      </thead>
                      <tbody className="text-center">
                        {Object.keys(previewStudent.marks).map((sub) => (
                          <tr key={sub} className="border-b border-[#d97706]/40 hover:bg-[#f0fdf4]/35">
                            <td className="py-1.5 px-4 border-r border-[#d97706] text-left capitalize font-black text-[#0f5132]">{sub}</td>
                            <td className="py-1.5 border-r border-[#d97706] font-bold">{previewStudent.marks[sub].total}</td>
                            <td className="py-1.5 font-extrabold text-[#198754]">{previewStudent.marks[sub].obtained}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Scores Summary & Gold Rosette Grade Badge */}
                  <div className="flex justify-between items-center px-10 my-1 relative z-20">
                    <div className="space-y-1.5 text-xs font-black text-black">
                      <div className="flex items-center gap-2">
                        <span className="w-36 text-right text-gray-700">Obtained / Max Marks:</span>
                        <div className="bg-[#f0fdf4] border-2 border-[#d97706] px-4 py-0.5 rounded font-black text-center min-w-[70px] shadow-sm text-[#065f46]">
                          {totalObtained}/{totalMax}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-36 text-right text-gray-700">Aggregated Percentage:</span>
                        <div className="bg-[#f0fdf4] border-2 border-[#d97706] px-4 py-0.5 rounded font-black text-center min-w-[70px] shadow-sm text-[#065f46]">
                          {percentage}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-700">Grade Standing:</span>
                      
                      {/* High-Fidelity Gold Rosette Badge */}
                      <div className="relative w-14 h-14 flex items-center justify-center select-none pointer-events-none">
                        {/* Rosette gold ribbon tails */}
                        <div className="absolute top-[28px] left-[12px] w-3.5 h-6 bg-[#d97706] rotate-[15deg] origin-top rounded-b" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 80%, 0% 100%)' }} />
                        <div className="absolute top-[28px] right-[12px] w-3.5 h-6 bg-[#d97706] rotate-[-15deg] origin-top rounded-b" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 80%, 0% 100%)' }} />
                        {/* Rosette Body */}
                        <div className="w-11 h-11 rounded-full bg-[#b45309] border border-dashed border-white shadow-md flex items-center justify-center text-white font-extrabold text-sm relative z-10">
                          {calculatedGrade}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Teacher Comments arched background paper style block */}
                  <div className="space-y-0.5 px-8 relative z-20">
                    <div className="flex items-center justify-center gap-2">
                      {/* Golden crescent icon left */}
                      <svg viewBox="0 0 100 100" className="w-4 h-4 fill-current text-[#d97706]">
                        <path d="M 55,20 A 30,30 0 1,0 80,60 A 24,24 0 1,1 55,20 Z" />
                      </svg>
                      <h4 className="text-[10px] font-black text-[#065f46] uppercase tracking-wider">Teacher's Comment</h4>
                      <svg viewBox="0 0 100 100" className="w-4 h-4 fill-current text-[#d97706] rotate-90">
                        <path d="M 55,20 A 30,30 0 1,0 80,60 A 24,24 0 1,1 55,20 Z" />
                      </svg>
                    </div>

                    <div className="relative w-full min-h-[48px] bg-transparent mt-1">
                      {/* Gold notebook paper background lines */}
                      <div className="absolute inset-x-0 top-[20px] border-b border-[#d97706]/40" />
                      <div className="absolute inset-x-0 top-[40px] border-b border-[#d97706]/40" />
                      
                      {/* Text content */}
                      <p className="text-xs font-black italic text-gray-800 leading-tight text-center pl-2 pr-8 pt-1 relative z-10" style={{ fontFamily: 'Georgia, serif', lineHeight: '20px' }}>
                        {customizer.teacherRemarks}
                      </p>
                    </div>
                  </div>

                  {/* Signatures & Date margins */}
                  <div className="px-8 pt-2 pb-2 relative z-20 text-[10px] font-black text-black uppercase tracking-wider">
                    {/* Head & Teacher signature gold lines */}
                    <div className="grid grid-cols-2 gap-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-36 border-t-2 border-[#d97706] pt-1 font-extrabold text-[8px] text-[#065f46]">
                          School Head Signature
                        </div>
                        <span className="text-[8px] text-gray-500 font-bold lowercase mt-0.5">{customizer.principalName}</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-36 border-t-2 border-[#d97706] pt-1 font-extrabold text-[8px] text-[#065f46] leading-tight">
                          School Teacher Signature
                        </div>
                        <span className="text-[8px] text-gray-500 font-bold lowercase mt-0.5">{customizer.teacherName}</span>
                      </div>
                    </div>

                    <div className="flex justify-center mt-2.5 border-t border-gray-100 pt-1">
                      <span className="font-extrabold text-[8px] text-[#065f46]">Date: _________________________</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TEMPLATE STYLE 1: TRADITIONAL CLASSIC (TKH Style - Redesigned) */}
              {/* ========================================================================= */}
              {activeTemplate === 'traditional' && (
                <div className="w-full h-full flex flex-col justify-between border-4 border-double border-indigo-950 p-10 rounded shadow-inner relative bg-gradient-to-b from-indigo-50/15 to-transparent">
                  {/* Elegant Traditional Floral Corner Ornaments */}
                  <div className="absolute top-3 left-3 w-8 h-8 opacity-45 pointer-events-none text-indigo-950">
                    <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                      <path d="M0,0 L20,0 Q10,10 0,20 Z" />
                      <circle cx="10" cy="10" r="2" />
                    </svg>
                  </div>
                  <div className="absolute top-3 right-3 w-8 h-8 opacity-45 pointer-events-none text-indigo-950 rotate-90">
                    <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                      <path d="M0,0 L20,0 Q10,10 0,20 Z" />
                      <circle cx="10" cy="10" r="2" />
                    </svg>
                  </div>
                  <div className="absolute bottom-3 left-3 w-8 h-8 opacity-45 pointer-events-none text-indigo-950 -rotate-90">
                    <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                      <path d="M0,0 L20,0 Q10,10 0,20 Z" />
                      <circle cx="10" cy="10" r="2" />
                    </svg>
                  </div>
                  <div className="absolute bottom-3 right-3 w-8 h-8 opacity-45 pointer-events-none text-indigo-950 rotate-180">
                    <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                      <path d="M0,0 L20,0 Q10,10 0,20 Z" />
                      <circle cx="10" cy="10" r="2" />
                    </svg>
                  </div>

                  {/* Clean Symmetric Breathtaking Header */}
                  <div className="text-center space-y-1 mt-2 select-text">
                    {/* Prestigious Center Crest Seal */}
                    <div className="flex justify-center mb-2">
                      <div className="w-14 h-14 rounded-full border-2 border-double border-amber-500 bg-indigo-950 text-white flex items-center justify-center text-xl shadow-md relative">
                        {customizer.logoStyle === 'shield' ? '🛡️' : customizer.logoStyle === 'book' ? '📖' : customizer.logoStyle === 'star' ? '⭐' : '🧸'}
                        {/* Outer micro-accent rings */}
                        <div className="absolute -inset-1.5 rounded-full border border-indigo-900/10 pointer-events-none" />
                      </div>
                    </div>

                    {/* School Title (High-contrast Serif) */}
                    <h2 className="text-xl font-bold tracking-wide text-indigo-950 uppercase" style={{ fontFamily: 'Georgia, serif', fontWeight: '900' }}>
                      {customizer.schoolName}
                    </h2>

                    {/* Elegant Gold Ribbon Divider */}
                    <div className="h-[1.5px] w-48 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto my-1.5" />

                    {/* Academic Subheads */}
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block">
                      {customizer.schoolSubtitle}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-700 italic block">
                      {customizer.sessionTerm}
                    </span>

                    {/* Breathtaking Pill Badge for Result Card */}
                    <div className="flex justify-center mt-2.5">
                      <span className="bg-indigo-950 text-amber-400 border border-amber-400 px-5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.18em] shadow-sm">
                        Academic Result Card
                      </span>
                    </div>
                  </div>

                  {/* Student Profile Card (Frosted Glass Container) */}
                  <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 my-4 grid grid-cols-2 gap-3 text-[11px] font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500">★</span>
                      <span>Student Name: <strong className="text-indigo-950 font-extrabold">{previewStudent.name}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500">★</span>
                      <span>Class Register: <strong className="text-indigo-950 font-extrabold">{previewStudent.class}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500">★</span>
                      <span>Father's Name: <strong>{previewStudent.fatherName}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500">★</span>
                      <span>Roll Enrollment: <strong className="font-mono text-indigo-950">{previewStudent.rollNo}</strong></span>
                    </div>
                  </div>

                  {/* Ledger Table with Elegant Shading */}
                  <div className="my-2">
                    <table className="w-full border border-indigo-900/20 text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-indigo-950 text-amber-400 font-black border-b border-indigo-950 text-center text-[10px] uppercase tracking-wider">
                          <th className="py-2 px-3 text-left rounded-tl">Subjects</th>
                          <th className="py-2 px-3 border-l border-indigo-900/20">Total Marks</th>
                          <th className="py-2 px-3 border-l border-indigo-900/20 rounded-tr">Obtained Marks</th>
                        </tr>
                      </thead>
                      <tbody className="text-center font-bold text-slate-700 text-[11px]">
                        {Object.keys(previewStudent.marks).map((sub, i) => (
                          <tr key={sub} className={`border-b border-indigo-900/10 ${i % 2 === 0 ? 'bg-indigo-50/10' : 'bg-white'}`}>
                            <td className="py-2.5 px-4 text-left font-black text-indigo-950 capitalize">{sub}</td>
                            <td className="py-2.5 font-mono text-slate-500 border-l border-indigo-900/10">{previewStudent.marks[sub].total}</td>
                            <td className="py-2.5 font-black text-indigo-900 font-mono border-l border-indigo-900/10">{previewStudent.marks[sub].obtained}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Beautiful Rosette Grade Badge */}
                  <div className="flex justify-between items-center bg-amber-50/50 border border-amber-200 rounded-xl p-4 my-3 text-[11px] font-semibold text-slate-700">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="w-32 uppercase tracking-wider text-[9px] font-bold text-slate-500">Aggregate Score:</span>
                        <span className="bg-white border border-amber-300 px-3 py-1 rounded font-mono font-black text-slate-900">{totalObtained} / {totalMax}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-32 uppercase tracking-wider text-[9px] font-bold text-slate-500">Aggregate Average:</span>
                        <span className="bg-white border border-amber-300 px-3 py-1 rounded font-mono font-black text-indigo-950">{percentage}%</span>
                      </div>
                    </div>

                    {/* Grade Ribbon Rosette Medal */}
                    <div className="flex items-center gap-3 pr-4">
                      <span className="uppercase tracking-wider text-[9px] font-bold text-slate-500">Board Grade:</span>
                      <div className="relative flex items-center justify-center w-12 h-12">
                        {/* Rosette Body */}
                        <div className="w-10 h-10 rounded-full bg-indigo-950 border-2 border-double border-amber-400 shadow-md flex items-center justify-center text-amber-400 font-black text-xs relative z-10">
                          {calculatedGrade}
                          <div className="absolute inset-0.5 rounded-full border border-amber-400/20 border-dashed animate-spin-slow pointer-events-none" />
                        </div>
                        {/* Rosette tails */}
                        <div className="absolute top-7 left-2.5 w-2.5 h-5 bg-indigo-900 rotate-12 origin-top rounded-b border-r border-indigo-950" />
                        <div className="absolute top-7 right-2.5 w-2.5 h-5 bg-indigo-900 -rotate-12 origin-top rounded-b border-l border-indigo-950" />
                      </div>
                    </div>
                  </div>

                  {/* Teacher Notebook Remarks Box */}
                  <div className="space-y-1 my-2">
                    <h4 className="text-[9px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-1.5">
                      <span>✏️</span>
                      <span>Teacher's Evaluation Comments</span>
                    </h4>
                    <div className="relative w-full py-1.5 pl-2 min-h-[45px] flex flex-col justify-end bg-red-50/10 border border-red-100 rounded-lg">
                      <p className="text-xs font-serif font-semibold italic text-slate-800 relative z-10 leading-relaxed pr-8 select-text">
                        "{customizer.teacherRemarks}"
                      </p>
                      <div className="absolute inset-x-0 bottom-0 border-b border-red-200 w-full" />
                      <div className="absolute inset-x-0 bottom-5 border-b border-red-200 w-full opacity-60" />
                    </div>
                  </div>

                  {/* Principal & Teacher Signatures divider */}
                  <div className="grid grid-cols-2 gap-12 pt-6 mt-4 text-[10px] text-slate-500 uppercase tracking-widest font-black text-center relative">
                    {/* Center decorative seal mark */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border border-indigo-900/20 flex items-center justify-center text-[7px] text-indigo-900/40 select-none bg-white font-sans font-black">TD</div>

                    <div className="flex flex-col items-center">
                      <div className="w-32 border-b border-indigo-950/20 pb-0.5 font-serif italic text-indigo-950/30 text-xs">Class Teacher</div>
                      <span className="mt-1 font-black text-slate-800">{customizer.teacherName}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-32 border-b border-indigo-950/20 pb-0.5 font-serif italic text-indigo-950/30 text-xs">Headmaster</div>
                      <span className="mt-1 font-black text-slate-800">{customizer.principalName}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TEMPLATE STYLE 2: MODERN MINIMALIST */}
              {/* ========================================================================= */}
              {activeTemplate === 'modern_minimal' && (
                <div className="w-full h-full flex flex-col justify-between border-2 border-slate-300 p-8 rounded-lg relative">
                  {/* Clean header design */}
                  <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                        {customizer.schoolName}
                      </h2>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {customizer.schoolSubtitle}
                      </p>
                      <span className="inline-block bg-slate-900 text-white font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 font-bold rounded-sm">
                        {customizer.sessionTerm}
                      </span>
                    </div>
                    <div className="w-16 h-16 rounded bg-slate-100 flex items-center justify-center text-3xl shadow-sm border border-slate-300">
                      {customizer.logoStyle === 'shield' ? '🛡️' : customizer.logoStyle === 'book' ? '📖' : customizer.logoStyle === 'star' ? '⭐' : '🧸'}
                    </div>
                  </div>

                  {/* Clean Bio Matrix */}
                  <div className="grid grid-cols-3 gap-6 my-6 text-xs bg-slate-50 p-4 border border-slate-200 rounded">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Student Name</p>
                      <p className="font-bold text-slate-800 mt-0.5 text-sm">{previewStudent.name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Father's Name</p>
                      <p className="font-bold text-slate-800 mt-0.5 text-sm">{previewStudent.fatherName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Class Roster</p>
                      <p className="font-bold text-slate-800 mt-0.5 text-sm">{previewStudent.class} • Roll {previewStudent.rollNo}</p>
                    </div>
                  </div>

                  {/* Ledger */}
                  <div className="my-2">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-800 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                          <th className="py-2.5">Academic Subject</th>
                          <th className="py-2.5 text-center">Max Marks</th>
                          <th className="py-2.5 text-center">Passing Marks</th>
                          <th className="py-2.5 text-right">Obtained Marks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {Object.keys(previewStudent.marks).map(sub => (
                          <tr key={sub} className="text-slate-800 font-semibold">
                            <td className="py-3 font-bold">{sub}</td>
                            <td className="py-3 text-center font-mono text-slate-500">{previewStudent.marks[sub].total}</td>
                            <td className="py-3 text-center font-mono text-slate-500">33</td>
                            <td className="py-3 text-right font-black font-mono text-slate-900">{previewStudent.marks[sub].obtained}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Modern Calculations */}
                  <div className="grid grid-cols-3 gap-4 bg-slate-900 text-white rounded-lg p-5 my-6">
                    <div className="text-center border-r border-slate-700/50">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Aggregate Obtained</p>
                      <p className="text-xl font-black mt-1 font-mono">{totalObtained} <span className="text-xs font-normal text-slate-400">/ {totalMax}</span></p>
                    </div>
                    <div className="text-center border-r border-slate-700/50">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Calculated Average</p>
                      <p className="text-xl font-black mt-1 text-emerald-400 font-mono">{percentage}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Performance Grade</p>
                      <p className="text-xl font-black mt-1 text-blue-400 font-mono">{calculatedGrade}</p>
                    </div>
                  </div>

                  {/* Modern Remarks */}
                  <div className="space-y-2 my-2">
                    <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Class Evaluation Remarks</h4>
                    <p className="text-xs text-slate-700 italic border-l-4 border-slate-800 pl-3 leading-relaxed">
                      "{customizer.teacherRemarks}"
                    </p>
                  </div>

                  {/* Modern Footer Signatures */}
                  <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-200 mt-6 text-[10px] text-slate-500 uppercase tracking-widest font-black">
                    <div>
                      <p className="text-slate-800 font-black">{customizer.teacherName}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Assigned Class Teacher</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-800 font-black">{customizer.principalName}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">School headmaster approval</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TEMPLATE STYLE 3: PLAY SCHOOL / KINDERGARTEN */}
              {/* ========================================================================= */}
              {activeTemplate === 'play_school' && (
                <div className="w-full h-full flex flex-col justify-between border-4 border-double border-pink-400 p-8 rounded-2xl relative bg-yellow-50/20">
                  {/* Confetti border decorations */}
                  <div className="absolute top-2 left-2 text-xl">🎈</div>
                  <div className="absolute top-2 right-2 text-xl">🎨</div>
                  <div className="absolute bottom-2 left-2 text-xl">🧸</div>
                  <div className="absolute bottom-2 right-2 text-xl">🧩</div>

                  {/* Playful Header */}
                  <div className="text-center space-y-2 mt-4">
                    <div className="inline-block p-2 rounded-full bg-pink-100 border border-pink-200 text-3xl">
                      {customizer.logoStyle === 'shield' ? '🛡️' : customizer.logoStyle === 'book' ? '📖' : customizer.logoStyle === 'star' ? '⭐' : '🧸'}
                    </div>
                    <h2 className="text-2xl font-black text-pink-500 tracking-tight uppercase" style={{ fontFamily: '"Comic Sans MS", cursive' }}>
                      {customizer.schoolName}
                    </h2>
                    <p className="text-xs font-bold text-cyan-500 uppercase tracking-widest">
                      {customizer.schoolSubtitle}
                    </p>
                    <span className="inline-block bg-yellow-400 text-slate-800 font-bold text-[9px] uppercase tracking-wider px-3 py-0.5 rounded-full border border-yellow-500 shadow-sm">
                      {customizer.sessionTerm}
                    </span>
                  </div>

                  {/* Playful Bio box */}
                  <div className="border-2 border-dashed border-cyan-400 rounded-xl p-4 bg-white/60 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 my-4">
                    <div className="space-y-1">
                      <p>🌟 Student Name: <strong className="text-pink-500">{previewStudent.name}</strong></p>
                      <p>✨ Father Name: <strong>{previewStudent.fatherName}</strong></p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p>🏫 Grade: <strong className="text-cyan-500">{previewStudent.class}</strong></p>
                      <p>🏷️ Roll Number: <strong className="font-mono">{previewStudent.rollNo}</strong></p>
                    </div>
                  </div>

                  {/* Subject List */}
                  <div className="my-2">
                    <table className="w-full text-left text-xs table-fixed">
                      <thead>
                        <tr className="bg-cyan-100 text-cyan-800 font-black border-b-2 border-cyan-300 text-center">
                          <th className="py-2 rounded-l-lg w-1/2">Fun Subjects</th>
                          <th className="py-2 w-1/4">Total</th>
                          <th className="py-2 rounded-r-lg w-1/4">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(previewStudent.marks).map((sub, i) => {
                          const bgColors = ['bg-pink-50/50', 'bg-yellow-50/50', 'bg-emerald-50/50', 'bg-blue-50/50', 'bg-purple-50/50'];
                          return (
                            <tr key={sub} className={`text-center font-bold ${bgColors[i % bgColors.length]}`}>
                              <td className="py-2 px-3 text-left font-black text-slate-700">{sub}</td>
                              <td className="py-2 font-mono text-slate-400">{previewStudent.marks[sub].total}</td>
                              <td className="py-2 font-black text-pink-500 font-mono">{previewStudent.marks[sub].obtained}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Playful Standings */}
                  <div className="flex justify-between items-center bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 my-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Total Stars Obtained</p>
                      <p className="text-lg font-black text-emerald-800 font-mono">{totalObtained} / {totalMax} Marks</p>
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Super Percentage</p>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold font-mono text-xs">{percentage}%</span>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Super Kid Grade</p>
                      <span className="text-2xl font-black text-pink-500">{calculatedGrade}</span>
                    </div>
                  </div>

                  {/* Playful Remarks */}
                  <div className="p-4 bg-pink-50/50 border border-pink-200 rounded-xl my-2">
                    <h4 className="text-xs font-bold text-pink-600 mb-1">🧸 Teacher's Sweet Message</h4>
                    <p className="text-xs italic text-slate-700 leading-relaxed font-sans">
                      "{customizer.teacherRemarks}"
                    </p>
                  </div>

                  {/* Playful signatures */}
                  <div className="grid grid-cols-2 gap-8 text-center text-[10px] font-black text-slate-600 uppercase mt-4">
                    <div className="flex flex-col items-center">
                      <div className="w-32 border-b-2 border-pink-300 pb-1 font-serif italic text-pink-300">Class Mum</div>
                      <span className="mt-1">{customizer.teacherName}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-32 border-b-2 border-pink-300 pb-1 font-serif italic text-pink-300">Big Chief</div>
                      <span className="mt-1">{customizer.principalName}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TEMPLATE STYLE 4: ELITE CREST (PRESTIGIOUS SERIF STYLE) */}
              {/* ========================================================================= */}
              {activeTemplate === 'elite_crest' && (
                <div className="w-full h-full flex flex-col justify-between border-4 border-double border-amber-600 p-10 rounded shadow-inner relative">
                  {/* Decorative corner seals */}
                  <div className="absolute top-3 left-3 w-6 h-6 border-b border-r border-amber-600" />
                  <div className="absolute top-3 right-3 w-6 h-6 border-b border-l border-amber-600" />
                  <div className="absolute bottom-3 left-3 w-6 h-6 border-t border-r border-amber-600" />
                  <div className="absolute bottom-3 right-3 w-6 h-6 border-t border-l border-amber-600" />

                  {/* Formal Serif Header */}
                  <div className="text-center space-y-2 mt-4 select-text">
                    <div className="w-20 h-20 rounded-full border-2 border-amber-600 bg-indigo-950 text-white flex items-center justify-center text-3xl mx-auto shadow-md">
                      {customizer.logoStyle === 'shield' ? '🛡️' : customizer.logoStyle === 'book' ? '📖' : customizer.logoStyle === 'star' ? '⭐' : '🧸'}
                    </div>
                    <h2 className="text-2xl font-black text-indigo-950 tracking-wide uppercase mt-3" style={{ fontFamily: 'Georgia, serif' }}>
                      {customizer.schoolName}
                    </h2>
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.2em] italic border-t border-b border-amber-200 py-1 max-w-md mx-auto">
                      {customizer.schoolSubtitle}
                    </p>
                    <span className="inline-block font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500 font-black">
                      {customizer.sessionTerm}
                    </span>
                  </div>

                  {/* Formal Bio Grid */}
                  <div className="grid grid-cols-2 gap-4 border-b border-amber-300 pb-4 mt-6 text-xs text-slate-800" style={{ fontFamily: 'Georgia, serif' }}>
                    <div className="space-y-2">
                      <p><strong>Student Name:</strong> <span className="underline decoration-amber-400 font-bold">{previewStudent.name}</span></p>
                      <p><strong>Father's Name:</strong> <span>{previewStudent.fatherName}</span></p>
                    </div>
                    <div className="space-y-2 text-right">
                      <p><strong>Class Register:</strong> <span>{previewStudent.class}</span></p>
                      <p><strong>Roll Enrollment:</strong> <span className="font-mono">{previewStudent.rollNo}</span></p>
                    </div>
                  </div>

                  {/* Prestigious Ledger */}
                  <div className="my-2">
                    <table className="w-full text-left text-xs border-collapse" style={{ fontFamily: 'Georgia, serif' }}>
                      <thead>
                        <tr className="bg-indigo-950 text-amber-500 font-bold border-b border-amber-600 text-center">
                          <th className="py-2 px-3 text-left">Academic Discipline</th>
                          <th className="py-2">Maximum Marks</th>
                          <th className="py-2">Score Obtained</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100 text-center font-semibold text-slate-700">
                        {Object.keys(previewStudent.marks).map(sub => (
                          <tr key={sub}>
                            <td className="py-2.5 px-3 text-left font-bold text-indigo-950">{sub}</td>
                            <td className="py-2.5 font-mono">{previewStudent.marks[sub].total}</td>
                            <td className="py-2.5 font-black font-mono text-indigo-900">{previewStudent.marks[sub].obtained}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Formal Calculated standings */}
                  <div className="grid grid-cols-3 gap-6 bg-amber-50 border border-amber-200 rounded p-4 my-4 font-serif text-slate-800">
                    <div className="text-center border-r border-amber-200">
                      <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">Aggregate Total</p>
                      <p className="text-lg font-black mt-0.5">{totalObtained} / {totalMax}</p>
                    </div>
                    <div className="text-center border-r border-amber-200">
                      <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">Average Percent</p>
                      <p className="text-lg font-black mt-0.5 text-indigo-900">{percentage}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">Letter Grade</p>
                      <p className="text-lg font-black mt-0.5 text-amber-600">{calculatedGrade}</p>
                    </div>
                  </div>

                  {/* Formal Comments */}
                  <div className="space-y-1.5 my-2 text-xs text-slate-800" style={{ fontFamily: 'Georgia, serif' }}>
                    <p className="font-bold text-indigo-950 uppercase tracking-wider text-[10px]">Academic Board Evaluation</p>
                    <p className="italic text-slate-700 leading-relaxed border-l-2 border-amber-600 pl-3">
                      "{customizer.teacherRemarks}"
                    </p>
                  </div>

                  {/* Formal Stamp Signatures */}
                  <div className="grid grid-cols-2 gap-12 pt-8 border-t border-amber-200 mt-4 text-[10px] text-slate-600 uppercase tracking-wider text-center font-serif">
                    <div className="flex flex-col items-center">
                      <span className="font-serif italic text-xs text-indigo-950/40 select-none mb-2">Class Incharge</span>
                      <span className="border-t border-amber-600 w-32 pt-1 block font-bold">{customizer.teacherName}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full border border-amber-600 border-dashed flex items-center justify-center text-[8px] text-amber-600 rotate-12 select-none mb-2 font-sans font-black">SEAL</div>
                      <span className="border-t border-amber-600 w-32 pt-1 block font-bold">{customizer.principalName}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* QUICK ASSIGN CLASS OVERLAY MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <GlassCard className="p-6 bg-dark-bg border border-dark-border max-w-sm w-full space-y-4">
            <h3 className="text-lg font-black text-dark-text">Assign Template to Class</h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest block">Select Template Style</label>
                <select 
                  value={activeTemplate}
                  onChange={(e) => setActiveTemplate(e.target.value)}
                  className="w-full premium-input bg-dark-card text-sm"
                >
                  {templatesList.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest block">Select Target Class</label>
                <select 
                  value={assignClassTarget}
                  onChange={(e) => setAssignClassTarget(e.target.value)}
                  className="w-full premium-input bg-dark-card text-sm"
                >
                  {classes.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => {
                  handleAssignTemplate(assignClassTarget, activeTemplate);
                  setShowAssignModal(false);
                }}
                className="flex-1 premium-button-primary text-xs py-2"
              >
                Confirm Assignment
              </button>
              <button 
                onClick={() => setShowAssignModal(false)}
                className="flex-1 premium-button-secondary text-xs py-2"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default ReportCardTemplates;
