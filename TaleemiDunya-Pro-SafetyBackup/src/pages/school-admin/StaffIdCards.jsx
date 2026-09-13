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
 RefreshCw,
 LayoutTemplate
} from 'lucide-react';
import { getRecords, updateRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import GlassCard from '../../components/common/GlassCard';
import QRCode from 'react-qr-code';
import { THEMES, LAYOUTS, renderCard } from '../../components/id-cards/IdCardRenderers';

const StaffIdCards = () => {
 const { userData } = useAuth();
 const { schoolData } = useSchool();
 const schoolId = userData?.schoolId || 'default-school';

 const [staff, setStaff] = useState([]);
 const [classesList, setClassesList] = useState([]);
 const [selectedClass, setSelectedClass] = useState('ALL');
 const [loading, setLoading] = useState(false);

 // ID Card customizations
 const idSettings = schoolData?.idCardSettings || {};
 const [schoolName, setSchoolName] = useState(idSettings.schoolName || userData?.schoolName || schoolData?.name || 'TaleemiDunya School System');
 const [cardSubtitle, setCardSubtitle] = useState(idSettings.cardSubtitle || 'Staff Identity Card');
 const [cardTheme, setCardTheme] = useState(idSettings.cardTheme || 'blue');
 const [cardLayout, setCardLayout] = useState(idSettings.cardLayout || 'portrait');
 const [validity, setValidity] = useState(idSettings.validity || '2026 - 2027');
 const [principalName, setPrincipalName] = useState(idSettings.principalName || 'Principal Office');
 
 const logoImage = schoolData?.logo || '';
 const [disclaimer, setDisclaimer] = useState(idSettings.disclaimer || 'This card is non-transferable and remains the property of the school. If found, please return to the school administration office.');
 
 // Custom stamp upload
 const [stampImage, setStampImage] = useState(idSettings.stampImage || null);
 const stampInputRef = useRef(null);

 useEffect(() => {
 fetchData();
 }, [schoolId]);

 const fetchData = async () => {
 setLoading(true);
 try {
 const [staffData] = await Promise.all([
 getRecords('staff', schoolId)
 ]);
 
 if (staffData) setStaff(staffData);
 
 const roles = ['ALL', ...new Set((staffData || []).map(s => String(s.role || s.designation || '').trim().toUpperCase()))].filter(Boolean);
 setClassesList(roles);
 } catch (error) {
 console.error("Error fetching data for ID Cards:", error);
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

 const saveTemplateDesign = async () => {
 try {
 const idCardSettings = {
 schoolName,
 cardSubtitle,
 cardTheme,
 cardLayout,
 validity,
 principalName,
 disclaimer,
 stampImage
 };
 await updateRecord('schools', schoolId, { idCardSettings });
 alert('ID Card template design saved globally!');
 } catch (error) {
 console.error('Error saving template:', error);
 alert('Failed to save template design.');
 }
 };

 // Filtered list
 const filteredStaff = selectedClass === 'ALL' 
 ? staff 
 : staff.filter(s => String(s.role || s.designation || '').trim().toUpperCase() === String(selectedClass).toUpperCase());

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
 <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
 <CreditCard className="text-primary-400" />
 Staff ID Cards
 </h1>
 <p className="text-xs text-dark-muted font-bold tracking-wider uppercase mt-1">
 Generate and bulk-print professional staff identification badges with Real QR
 </p>
 </div>
 <div className="flex gap-2">
 <button 
 onClick={saveTemplateDesign}
 className="premium-button-secondary py-2.5 px-5 flex items-center justify-center gap-2 font-bold text-xs uppercase"
 >
 <CheckCircle size={15} />
 <span>Save Template</span>
 </button>
 <button 
 onClick={handlePrint}
 className="premium-button-primary py-2.5 px-5 flex items-center justify-center gap-2 font-bold text-xs uppercase shadow-lg shadow-primary-500/20"
 >
 <Printer size={15} />
 <span>Print ID Cards</span>
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 no-print">
 
 {/* Left Side: Customize Dashboard */}
 <div className="lg:col-span-1 space-y-6">
 <GlassCard className="p-5 border-dark-border/40 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl pointer-events-none" />
 
 <h2 className="text-sm font-black text-primary-400 uppercase tracking-widest flex items-center gap-2 mb-4">
 <Sliders size={16} />
 <span>Card Customize</span>
 </h2>

 <div className="space-y-4 text-xs font-bold relative z-10">
 {/* Class selector */}
 <div className="space-y-1.5">
 <label className="text-[10px] text-dark-muted uppercase tracking-wider flex justify-between">
 <span>Filter by Role</span>
 <span className="text-primary-500">{classesList.length - 1} Roles</span>
 </label>
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

 {/* Layout Picker */}
 <div className="space-y-1.5">
 <label className="text-[10px] text-dark-muted uppercase tracking-wider flex items-center gap-1.5">
 <LayoutTemplate size={12} className="text-primary-400" />
 <span>Card Template Layout</span>
 </label>
 <div className="flex flex-col gap-1.5 mt-1">
 {Object.entries(LAYOUTS).map(([key, label]) => (
 <button
 key={key}
 onClick={() => setCardLayout(key)}
 className={`py-1.5 px-3 rounded-lg border transition-all flex items-center justify-between font-bold text-[10px] ${
 cardLayout === key ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-dark-border/40 text-dark-muted hover:bg-white/5'
 }`}
 >
 <span>{label}</span>
 {cardLayout === key && <CheckCircle size={12} />}
 </button>
 ))}
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
 <span className="hidden sm:inline">{themeName.substring(0, 3)}</span>
 </button>
 ))}
 </div>
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
 <label className="text-[10px] text-dark-muted uppercase tracking-wider block">Signature Stamp</label>
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
 </div>
 </GlassCard>
 </div>

 {/* Right Side: Visual live preview grid */}
 <div className="lg:col-span-3">
 <GlassCard className="p-6 border-dark-border/40 min-h-[500px]">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-dark-border/40 pb-3 mb-6 gap-3">
 <h2 className="text-sm font-black text-transparent bg-clip-text uppercase tracking-widest flex items-center gap-2">
 <CreditCard size={16} />
 <span>Live View ({filteredStaff.length} Cards)</span>
 </h2>
 <div className="flex gap-2">
 <span className="text-[10px] font-black uppercase text-dark-muted bg-white/5 border border-dark-border/40 py-1.5 px-3 rounded-lg flex items-center gap-1">
 Role: <span className="text-white">{selectedClass}</span>
 </span>
 <span className="text-[10px] font-black uppercase text-primary-400 bg-primary-500/10 border border-primary-500/20 py-1.5 px-3 rounded-lg flex items-center gap-1">
 Layout: <span className="text-white">{LAYOUTS[cardLayout]}</span>
 </span>
 </div>
 </div>

 {loading ? (
 <div className="flex flex-col items-center justify-center py-20 gap-3">
 <RefreshCw size={36} className="text-primary-500 animate-spin" />
 <p className="text-xs font-black text-dark-muted uppercase">Fetching Staff Profiles...</p>
 </div>
 ) : filteredStaff.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 gap-2">
 <div className="w-14 h-14 rounded-full bg-white/5 border border-dark-border/30 flex items-center justify-center text-dark-muted text-lg">★</div>
 <p className="text-xs font-black text-dark-muted uppercase mt-2">No staff found matching role: {selectedClass}</p>
 </div>
 ) : (
 <div className={`grid gap-6 justify-items-center ${
 cardLayout === 'landscape' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2' : 
 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
 }`}>
 {filteredStaff.map((st) => renderCard(st, { cardTheme, cardLayout, schoolName, cardSubtitle, validity, principalName, disclaimer, stampImage, logoImage, activeTheme }, false))}
 </div>
 )}
 </GlassCard>
 </div>

 </div>

 {/* ========================================================
 SECRET PRINT HIDDEN CONTAINER
 ======================================================== */}
 <div id="id-cards-print-area" className="hidden print:block text-black bg-white">
 <div className="flex flex-wrap gap-6 justify-center bg-white p-4">
 {filteredStaff.map((st) => renderCard(st, { cardTheme, cardLayout, schoolName, cardSubtitle, validity, principalName, disclaimer, stampImage, logoImage, activeTheme }, true))}
 </div>
 </div>

 </div>
 );
};

export default StaffIdCards;

