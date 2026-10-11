import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import {
  Award, FileText, Printer, CheckCircle2, QrCode, Search,
  RefreshCw, User, ShieldCheck, Download, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

const CertificateGenerator = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = schoolData?.name || userData?.schoolName || 'TALEEMIDUNYA GRAMMAR HIGH SCHOOL';
  const schoolLogo = schoolData?.branding?.logo || schoolData?.logo || schoolData?.logoUrl || schoolData?.schoolLogo || userData?.schoolLogo || userData?.logo || null;
  const principalRule = schoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal');
  const principalSignatureUrl = schoolData?.signatureSettings?.principalSignatureUrl || principalRule?.signatureUrl || null;
  const bgTemplate = schoolData?.templates?.certificateBg || null;

  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [certType, setCertType] = useState('SLC'); // 'SLC', 'CHARACTER', 'BONAFIDE', 'EXPERIENCE'
  const [selectedPersons, setSelectedPersons] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Customizable certificate fields
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [reasonOrRemarks, setReasonOrRemarks] = useState('Completed Secondary School Certificate (Class 10th) with excellent moral conduct.');

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const stSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
      const stList = stSnap.docs.map(d => ({ id: d.id, type: 'STUDENT', ...d.data() }));
      setStudents(stList);

      const sfSnap = await getDocs(query(collection(db, 'staff'), where('schoolId', '==', schoolId)));
      const sfList = sfSnap.docs.map(d => ({ id: d.id, type: 'STAFF', ...d.data() }));
      setStaff(sfList);

      // if (stList.length > 0) setTargetPerson(stList[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const peopleList = certType === 'EXPERIENCE' ? staff : students;
  const filteredPeople = peopleList.filter(p =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.rollNumber && p.rollNumber.toString().includes(searchQuery))
  ).sort((a, b) => {
    const aSelected = selectedPersons.some(sp => sp.id === a.id);
    const bSelected = selectedPersons.some(sp => sp.id === b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const togglePerson = (p) => {
    if (selectedPersons.find(sp => sp.id === p.id)) {
      setSelectedPersons(selectedPersons.filter(sp => sp.id !== p.id));
    } else {
      setSelectedPersons([...selectedPersons, p]);
    }
  };

  const selectAll = () => {
    if (selectedPersons.length === filteredPeople.length && filteredPeople.length > 0) {
      setSelectedPersons([]);
    } else {
      setSelectedPersons([...filteredPeople]);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-primary-500 mr-3" size={32} />
        <p className="text-dark-muted font-bold">Loading Official Certificate & Letter Press...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Award className="text-amber-400" size={32} />
            Official Certificate & Letter Press
          </h1>
          <p className="text-dark-muted mt-1 font-medium">
            1-Click generate and print verifiable School Leaving Certificates (SLC), Character Certificates & Staff Experience Letters.
          </p>
        </div>
        <button
          onClick={handlePrintCertificate}
          className="px-6 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 text-white font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl self-start md:self-auto active:scale-[0.99] transition-all"
        >
          <Printer size={18} /> Print Certificate / PDF Now
        </button>
      </div>

      {/* SELECTORS (Hidden when printing) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        
        {/* Step 1: Select Certificate Type */}
        <GlassCard className="p-6">
          <span className="text-xs font-black uppercase text-primary-400 tracking-wider block mb-3">Step 1: Select Certificate Type</span>
          <div className="space-y-2">
            {[
              { id: 'SLC', label: '🏫 School Leaving Certificate (SLC)' },
              { id: 'CHARACTER', label: '🎖️ Character & Moral Conduct Certificate' },
              { id: 'BONAFIDE', label: '📄 Bonafide Student Status Letter' },
              { id: 'EXPERIENCE', label: '💼 Staff Experience Certificate' },
              { id: 'MERIT', label: '🏆 Certificate of Merit (Achievement)' }
            ].map(c => (
              <button
                key={c.id}
                onClick={() => { setCertType(c.id); setSelectedPersons([]); }}
                className={`w-full p-3.5 rounded-2xl text-left font-bold text-xs transition-all flex items-center justify-between ${
                  certType === c.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-black scale-[1.02]' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span>{c.label}</span>
                {certType === c.id && <CheckCircle2 size={16} />}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Step 2: Select Person */}
        <GlassCard className="p-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-black uppercase text-primary-400 tracking-wider">
              Step 2: Select {certType === 'EXPERIENCE' ? 'Staff Member' : 'Student(s)'}
            </span>
            <button onClick={selectAll} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100">
              {selectedPersons.length === filteredPeople.length && filteredPeople.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-3.5 text-dark-muted" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search ${certType === 'EXPERIENCE' ? 'teacher name...' : 'student name or roll #...'}`}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#151926] border border-white/10 text-xs text-white"
            />
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
            {filteredPeople.map(p => (
              <button
                key={p.id}
                onClick={() => togglePerson(p)}
                className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between ${
                  selectedPersons.some(sp => sp.id === p.id) ? 'bg-blue-50 text-blue-700 border border-blue-300 font-bold' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <div>
                  <p className="font-bold">{p.name}</p>
                  <p className="text-[10px] text-dark-muted">{p.rollNumber ? `Roll #${p.rollNumber} | Class: ${p.class || p.className}` : `Designation: ${p.designation || 'Teacher'}`}</p>
                </div>
              </button>
            ))}
            {filteredPeople.length === 0 && <p className="text-xs text-dark-muted text-center py-4">No records matching search query</p>}
          </div>
        </GlassCard>

        {/* Step 3: Custom Details */}
        <GlassCard className="p-6">
          <span className="text-xs font-black uppercase text-primary-400 tracking-wider block mb-3">Step 3: Issue Details & Remarks</span>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-dark-muted mb-1">Date of Issuance</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="w-full premium-input text-xs" />
            </div>
            {certType !== 'MERIT' && (
              <div>
                <label className="block text-[10px] font-black uppercase text-dark-muted mb-1">
                  Official Remarks / Conduct Reason
                </label>
                <textarea rows="4" value={reasonOrRemarks} onChange={e => setReasonOrRemarks(e.target.value)} className="w-full premium-input text-xs leading-relaxed" />
              </div>
            )}
          </div>
        </GlassCard>

      </div>

      {/* ============================================================== */}
      {/* 🖨️ OFFICIAL PRINTABLE CERTIFICATE CANVAS */}
      {/* ============================================================== */}
      {selectedPersons.length === 0 ? (
        <div className="bg-white p-8 text-center border rounded-2xl shadow max-w-4xl mx-auto my-6 print:hidden">
          <p className="text-gray-500 italic">⚠️ Please select one or more students/staff from Step 2 to generate certificates.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto pb-4 print:overflow-visible custom-scrollbar printable-report-area">
          {selectedPersons.map((targetPerson) => (
            <div key={targetPerson.id} className="print:break-after-page mb-12 print:mb-0">
              {certType === 'MERIT' ? (
                <div className="bg-white text-black mx-auto relative overflow-hidden shadow-2xl border border-gray-300 print:shadow-none print:border-none print:m-0 shrink-0 certificate-page"
                     style={{ width: '1123px', height: '794px', minWidth: '1123px' }}>
                  
                  {/* Abstract Corner Shapes */}
                  <svg className="absolute top-0 left-0 w-[240px] h-[240px] z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polygon points="0,0 35,0 15,65 0,100" fill="#673ab7" />
                    <polygon points="0,0 60,0 20,85" fill="#03a9f4" />
                    <polygon points="40,0 80,0 30,100" fill="#4caf50" />
                    <polygon points="70,0 90,0 100,35" fill="#ffeb3b" />
                    <polygon points="85,0 100,0 100,25" fill="#f44336" />
                  </svg>
                  <svg className="absolute bottom-0 right-0 w-[300px] h-[300px] z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polygon points="100,100 100,30 50,75" fill="#9c27b0" />
                    <polygon points="100,100 40,100 85,35" fill="#2196f3" />
                    <polygon points="100,70 100,0 65,55" fill="#3f51b5" />
                    <polygon points="80,100 0,100 50,75" fill="#ff9800" />
                    <polygon points="60,100 15,100 65,65" fill="#4caf50" />
                    <polygon points="100,25 60,75 100,65" fill="#f44336" />
                    <polygon points="25,100 75,70 50,100" fill="#ffeb3b" />
                  </svg>

                  {/* Watermark Logo */}
                  {schoolLogo && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10">
                      <img src={schoolLogo} alt="School Logo Watermark" className="w-[400px] h-[400px] object-contain" />
                    </div>
                  )}

                  {/* School Name */}
                  <div className="w-full pt-16 text-center pl-16 relative z-10">
                    <h1 className="text-[52px] font-serif font-bold text-black tracking-wide drop-shadow-sm">{schoolName}</h1>
                  </div>
                  
                  {/* Certificate Title */}
                  <div className="w-full text-center mt-6 relative z-10">
                    <h2 className="text-[44px] font-serif text-green-900 tracking-[0.15em] leading-tight font-medium">CERTIFICATE</h2>
                    <h2 className="text-[44px] font-serif text-green-900 tracking-[0.15em] leading-tight font-medium mt-1">OF MERIT</h2>
                  </div>
                  
                  {/* Decorative Gold Seal & Ribbon */}
                  <div className="absolute left-16 top-[270px] flex flex-col items-center z-20">
                    <div className="w-[140px] h-[140px] rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 border-[3px] border-yellow-200 shadow-xl flex items-center justify-center relative z-20">
                       <div className="w-[85%] h-[85%] rounded-full border border-yellow-700 bg-gradient-to-tr from-yellow-400 to-yellow-200 flex flex-col items-center justify-center text-center shadow-inner">
                         <Award size={24} className="text-blue-900 mb-1 opacity-80" />
                         <span className="text-red-800 text-[11px] font-serif font-black italic leading-none">Smart</span>
                         <span className="text-red-800 text-[11px] font-serif font-black italic leading-none mt-1">Angels</span>
                       </div>
                    </div>
                    <div className="flex justify-between w-[90px] -mt-5 relative z-10 px-1">
                      <div className="w-8 h-16 bg-red-800 shadow-md transform rotate-12" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}></div>
                      <div className="w-8 h-16 bg-red-800 shadow-md transform -rotate-12" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}></div>
                    </div>
                  </div>
                  
                  {/* Center Content */}
                  <div className="w-full text-center mt-12 relative z-10">
                    <p className="text-[36px] font-serif font-bold text-[#37474f] mb-8">This Certificate is Presented to</p>
                    
                    <div className="inline-block relative mb-12 w-[80%] max-w-[850px] mx-auto">
                      <h3 className="text-[46px] font-serif font-bold text-black pb-4">
                        {targetPerson.name} {targetPerson.fatherName || targetPerson.parentName ? <span className="font-normal text-[32px] ml-4">{(targetPerson.gender?.toLowerCase() === 'female' || targetPerson.gender?.toLowerCase() === 'f') ? 'D/O' : 'S/O'} {targetPerson.fatherName || targetPerson.parentName}</span> : ''}
                      </h3>
                      {/* Multi-color underline */}
                      <div className="h-[3px] w-full bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 to-blue-500"></div>
                    </div>
                    
                    <div className="text-[28px] font-serif text-black leading-[2] max-w-[850px] mx-auto px-8 relative z-10">
                      of Class <span className="underline decoration-1 underline-offset-8 px-4">{targetPerson.class || targetPerson.className || '____'}</span> for obtaining 100%
                      <br />
                      attendance during the month of <span className="underline decoration-2 font-bold px-4 whitespace-nowrap">
                        {(() => {
                          if (!issueDate) return '________';
                          const [yyyy, mm] = issueDate.split('-');
                          if (!yyyy || !mm) return '________';
                          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                          return `${months[parseInt(mm, 10) - 1]},\u00A0${yyyy}`;
                        })()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Signature */}
                  <div className="absolute bottom-8 left-10 text-center z-10 w-56">
                     <div className="h-24 w-full flex items-end justify-center mb-1">
                       {principalSignatureUrl ? (
                         <img src={principalSignatureUrl} alt="Signature" className="max-h-24 max-w-full object-contain mix-blend-multiply" />
                       ) : (
                         <div className="h-24 w-full"></div>
                       )}
                     </div>
                     <div className="w-full border-t-[1.5px] border-black mb-1"></div>
                     <p className="text-[#3f51b5] text-[13px] font-sans">School Principal of Signature</p>
                     <p className="text-[#3f51b5] text-[13px] font-sans">{issueDate}</p>
                  </div>
                </div>
              ) : (
                <div 
                  className={`bg-white text-gray-900 p-8 md:p-14 rounded-3xl shadow-2xl max-w-4xl mx-auto relative overflow-hidden print:shadow-none print:my-0 print:p-8 ${!bgTemplate ? 'border-8 border-double border-amber-800 print:border-4' : ''}`}
                  style={{
                    backgroundImage: bgTemplate ? `url(${bgTemplate})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    minHeight: bgTemplate ? '800px' : 'auto'
                  }}
                >
                  
                  {/* Certificate Background Watermark */}
                  {!bgTemplate && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none z-0">
                      {schoolLogo ? (
                        <img src={schoolLogo} alt="Watermark" className="w-[480px] h-[480px] object-contain grayscale" />
                      ) : (
                        <Award size={480} className="text-amber-900" />
                      )}
                    </div>
                  )}

                  {/* Header Block */}
                  <div className="text-center border-b-2 border-amber-900 pb-6 mb-8 relative z-10">
                    <div className="inline-block px-4 py-1 rounded-full bg-amber-100 text-amber-950 font-black text-[10px] uppercase tracking-widest border border-amber-400 mb-2">
                      Verifiable Official Academic Document
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider text-amber-950 font-serif">
                      {schoolName}
                    </h2>
                    <p className="text-xs font-bold text-gray-600 tracking-widest uppercase mt-1">
                      Registered Under Directorate of Public Instruction & Ministry of Education
                    </p>
                  </div>

                  {/* Certificate Title Badge */}
                  <div className="text-center my-6 relative z-10">
                    <span className="text-xl md:text-2xl font-black uppercase tracking-widest px-8 py-2.5 rounded-full bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 text-white shadow-md font-serif inline-block">
                      {certType === 'SLC' && 'School Leaving Certificate (SLC)'}
                      {certType === 'CHARACTER' && 'Character & Moral Conduct Certificate'}
                      {certType === 'BONAFIDE' && 'Bonafide Student Status Letter'}
                      {certType === 'EXPERIENCE' && 'Staff Experience Certificate'}
                    </span>
                  </div>

                  {/* Certificate Body Text */}
                  <div className="py-6 px-4 md:px-8 text-base md:text-lg leading-loose text-justify font-serif text-gray-800 space-y-6 relative z-10">
                    {certType === 'EXPERIENCE' ? (
                      <p>
                        This is to officially certify that <strong className="underline font-black text-amber-950 px-1">{targetPerson.name}</strong> has served in this institution with dedication and professional excellence. During their tenure as <strong className="underline font-black text-amber-950 px-1">{targetPerson.designation || 'Senior Faculty Teacher'}</strong>, their work conduct, punctuality, and moral integrity remained exemplary.
                        <br/><br/>
                        <span className="block italic bg-amber-50 p-4 border-l-4 border-amber-800 rounded-r-xl text-sm font-sans">
                          "{reasonOrRemarks}"
                        </span>
                      </p>
                    ) : (
                      <p>
                        This is to certify with high regard that <strong className="underline font-black text-amber-950 px-1">{targetPerson.name}</strong>, {(targetPerson.gender?.toLowerCase() === 'female' || targetPerson.gender?.toLowerCase() === 'f') ? 'Daughter of' : 'Son of'} <strong className="underline font-black text-amber-950 px-1">{targetPerson.parentName || targetPerson.fatherName || 'Respected Parent'}</strong>, bearing Roll Number <strong className="underline font-black text-amber-950 px-1">{targetPerson.rollNumber || 'N/A'}</strong>, was a bonafide student of Class <strong className="underline font-black text-amber-950 px-1">{targetPerson.class || targetPerson.className || '10th'}</strong> in our institution.
                        <br/><br/>
                        According to official school registers, their date of birth is recorded as <strong className="font-black text-amber-950">{targetPerson.dob || '01-Jan-2010'}</strong>. During their academic period with us, their character and general conduct have been <strong className="font-black text-amber-950">Satisfactory & Excellent</strong>.
                        <br/><br/>
                        <span className="block italic bg-amber-50 p-4 border-l-4 border-amber-800 rounded-r-xl text-sm font-sans text-gray-700">
                          Remarks: "{reasonOrRemarks}"
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Footer & Signature Block */}
                  <div className="grid grid-cols-2 gap-8 pt-12 mt-8 border-t-2 border-amber-900/20 text-sm font-serif relative z-10 items-end">
                    <div className="space-y-3">
                      <div className="w-24 h-24 p-1.5 border border-gray-300 rounded-xl bg-white shadow-inner flex items-center justify-center">
                        <QrCode size={80} className="text-gray-800" />
                      </div>
                      <p className="text-[10px] font-sans text-gray-500 font-bold">
                        Scan QR to Verify Document | Issued on: <strong className="text-black">{issueDate}</strong><br/>
                        Ref ID: <span className="font-mono">TDP-{targetPerson?.id || '0000'}-{Date.now().toString().slice(-4)}</span>
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <div className="h-16 flex items-end justify-end w-52 mb-1 border-b-2 border-gray-800">
                        {principalSignatureUrl && (
                          <img src={principalSignatureUrl} alt="Principal Signature" className="h-24 max-w-[200px] scale-125 origin-bottom origin-bottom mix-blend-multiply object-contain opacity-90 -mb-1" />
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-black text-amber-950 uppercase tracking-widest text-base">Principal / Head of Institution</p>
                        <p className="text-xs text-gray-600 font-sans">{schoolName}</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default CertificateGenerator;
