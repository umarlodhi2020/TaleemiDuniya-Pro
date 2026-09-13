import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import {
  Award, FileText, Printer, CheckCircle2, QrCode, Search,
  RefreshCw, User, ShieldCheck, Download, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

const CertificateGenerator = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = userData?.schoolName || 'TALEEMIDUNYA GRAMMAR HIGH SCHOOL';

  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [certType, setCertType] = useState('SLC'); // 'SLC', 'CHARACTER', 'BONAFIDE', 'EXPERIENCE'
  const [targetPerson, setTargetPerson] = useState(null);
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
      const stSnap = await getDocs(collection(db, 'students'));
      const stList = stSnap.docs.map(d => ({ id: d.id, type: 'STUDENT', ...d.data() }));
      setStudents(stList);

      const sfSnap = await getDocs(collection(db, 'staff'));
      const sfList = sfSnap.docs.map(d => ({ id: d.id, type: 'STAFF', ...d.data() }));
      setStaff(sfList);

      if (stList.length > 0) setTargetPerson(stList[0]);
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
  );

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
          className="px-6 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 text-white font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl self-start md:self-auto active:scale-95 transition-all"
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
              { id: 'EXPERIENCE', label: '💼 Staff Experience Certificate' }
            ].map(c => (
              <button
                key={c.id}
                onClick={() => { setCertType(c.id); setTargetPerson(null); }}
                className={`w-full p-3.5 rounded-2xl text-left font-bold text-xs transition-all flex items-center justify-between ${
                  certType === c.id ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 font-black scale-[1.02]' : 'bg-white/5 hover:bg-white/10 text-gray-300'
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
          <span className="text-xs font-black uppercase text-primary-400 tracking-wider block mb-3">
            Step 2: Select {certType === 'EXPERIENCE' ? 'Staff Member' : 'Student'}
          </span>
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
                onClick={() => setTargetPerson(p)}
                className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between ${
                  targetPerson?.id === p.id ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
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
            <div>
              <label className="block text-[10px] font-black uppercase text-dark-muted mb-1">Official Remarks / Conduct Reason</label>
              <textarea rows="4" value={reasonOrRemarks} onChange={e => setReasonOrRemarks(e.target.value)} className="w-full premium-input text-xs leading-relaxed" />
            </div>
          </div>
        </GlassCard>

      </div>

      {/* ============================================================== */}
      {/* 🖨️ OFFICIAL PRINTABLE CERTIFICATE CANVAS */}
      {/* ============================================================== */}
      <div className="bg-white text-gray-900 p-8 md:p-14 rounded-3xl shadow-2xl border-8 border-double border-amber-800 max-w-4xl mx-auto my-6 relative overflow-hidden print:shadow-none print:border-4 print:my-0 print:p-8">
        
        {/* Certificate Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
          <Award size={480} className="text-amber-900" />
        </div>

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
          {targetPerson ? (
            certType === 'EXPERIENCE' ? (
              <p>
                This is to officially certify that <strong className="underline font-black text-amber-950 px-1">{targetPerson.name}</strong> has served in this institution with dedication and professional excellence. During their tenure as <strong className="underline font-black text-amber-950 px-1">{targetPerson.designation || 'Senior Faculty Teacher'}</strong>, their work conduct, punctuality, and moral integrity remained exemplary.
                <br/><br/>
                <span className="block italic bg-amber-50 p-4 border-l-4 border-amber-800 rounded-r-xl text-sm font-sans">
                  "{reasonOrRemarks}"
                </span>
              </p>
            ) : (
              <p>
                This is to certify with high regard that <strong className="underline font-black text-amber-950 px-1">{targetPerson.name}</strong>, Son/Daughter of <strong className="underline font-black text-amber-950 px-1">{targetPerson.parentName || targetPerson.fatherName || 'Respected Parent'}</strong>, bearing Roll Number <strong className="underline font-black text-amber-950 px-1">{targetPerson.rollNumber || 'N/A'}</strong>, was a bonafide student of Class <strong className="underline font-black text-amber-950 px-1">{targetPerson.class || targetPerson.className || '10th'}</strong> in our institution.
                <br/><br/>
                According to official school registers, their date of birth is recorded as <strong className="font-black text-amber-950">{targetPerson.dob || '01-Jan-2010'}</strong>. During their academic period with us, their character and general conduct have been <strong className="font-black text-amber-950">Satisfactory & Excellent</strong>.
                <br/><br/>
                <span className="block italic bg-amber-50 p-4 border-l-4 border-amber-800 rounded-r-xl text-sm font-sans text-gray-700">
                  Remarks: "{reasonOrRemarks}"
                </span>
              </p>
            )
          ) : (
            <p className="text-center text-gray-400 italic py-8">
              ⚠️ Please select a student or staff member from Step 2 above to generate official certificate wording.
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

          <div className="text-right space-y-4">
            <div className="h-14 border-b-2 border-gray-800 w-52 ml-auto"></div>
            <div>
              <p className="font-black text-amber-950 uppercase tracking-widest text-base">Principal / Head of Institution</p>
              <p className="text-xs text-gray-600 font-sans">{schoolName}</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default CertificateGenerator;
