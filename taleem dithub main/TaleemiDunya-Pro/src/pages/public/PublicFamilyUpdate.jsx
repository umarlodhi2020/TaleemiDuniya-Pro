import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { GraduationCap, User, Phone, CheckCircle, ShieldCheck, Loader2, Save, AlertCircle, Mail } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { normalizePhone, formatCnic, isValidPhone, isValidCnic } from '../../utils/waValidation';

export default function PublicFamilyUpdate() {
  const { schoolId, phone, fatherName } = useParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const fetchFamilyData = async () => {
      try {
        if (!schoolId || !phone) return;
        
        // Ensure phone doesn't have spaces or plus, just simple format
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        
        const studentsRef = collection(db, 'students');
        
        // Fetch all students for this school
        const q = query(studentsRef, where('schoolId', '==', schoolId));
        const snapshot = await getDocs(q);
        
        const matchedStudents = [];
        snapshot.forEach(d => {
          const st = { id: d.id, ...d.data() };
          // Check all possible phone fields
          const allPhones = [
            String(st.phone || ''),
            String(st.parentPhone || ''),
            String(st.fatherPhone || ''),
            String(st.whatsappNumber || '')
          ].map(p => p.replace(/[^0-9]/g, '')).filter(p => p.length > 0);

          const targetSuffix = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
          const targetFatherName = fatherName ? decodeURIComponent(fatherName).toLowerCase().trim() : null;

          const isMatch = allPhones.some(p => {
             const pSuffix = p.length >= 10 ? p.slice(-10) : p;
             // Stricter matching: 
             // 1. If both are >= 10 digits, last 10 digits must match (ignores 0, 92, +92 prefixes)
             // 2. Otherwise, must be an exact match
             return pSuffix === targetSuffix || p === cleanPhone;
          });

          // Fuzzy match logic
          if (isMatch) {
            // Strict check for father name if provided in link
            if (targetFatherName) {
               const stFather = String(st.fatherName || '').toLowerCase().trim();
               if (stFather !== targetFatherName) {
                 return; // Skip this student if father name doesn't match
               }
            }
            
            // Save original names for validation
            st.originalName = String(st.name || st.studentName || '').trim();
            st.originalFatherName = String(st.fatherName || '').trim();
            matchedStudents.push(st);
          }
        });

        setStudents(matchedStudents);
      } catch (err) {
        console.error('Error fetching data:', err);
        setErrorMsg(err.message || 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchFamilyData();
  }, [schoolId, phone]);

  const handleInputChange = (studentId, field, value) => {
    setStudents(prev => 
      prev.map(st => st.id === studentId ? { ...st, [field]: value } : st)
    );
  };

  const handleCnicChange = (studentId, value) => {
    const formatted = formatCnic(value);
    setStudents(prev =>
      prev.map(st => st.id === studentId ? { 
        ...st, 
        cnic: formatted, 
        fatherCnic: formatted, 
        cnicNumber: formatted 
      } : st)
    );
  };

  const handlePhoneChange = (studentId, value) => {
    const allowed = value.replace(/[^\d+]/g, '');
    handleInputChange(studentId, 'phone', allowed.slice(0, 15));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Strict Validation: Data pura go ga tu form submit ho ga
    for (const st of students) {
      if (!st.name || !String(st.name).trim()) {
        alert("Baraye meherbani Student Name likhein.");
        setSubmitting(false);
        return;
      }

      const currentNameLower = String(st.name).toLowerCase().trim();
      const originalNameLower = (st.originalName || '').toLowerCase();
      if (originalNameLower && !currentNameLower.includes(originalNameLower)) {
        alert(`Aap Student Name mukammal kar sakte hain lekin pehle wala naam "${st.originalName}" nahi hata sakte.`);
        setSubmitting(false);
        return;
      }

      if (!st.fatherName || !String(st.fatherName).trim()) {
        alert("Baraye meherbani Father's Name likhein.");
        setSubmitting(false);
        return;
      }

      const currentFatherNameLower = String(st.fatherName).toLowerCase().trim();
      const originalFatherNameLower = (st.originalFatherName || '').toLowerCase();
      if (originalFatherNameLower && !currentFatherNameLower.includes(originalFatherNameLower)) {
        alert(`Aap Father's Name mukammal kar sakte hain lekin pehle wala naam "${st.originalFatherName}" nahi hata sakte.`);
        setSubmitting(false);
        return;
      }
      if (!st.motherName || !String(st.motherName).trim()) {
        alert(`Baraye meherbani ${st.name || st.studentName} ki Mother's Name likhein.`);
        setSubmitting(false);
        return;
      }
      const cnicVal = st.cnic || st.fatherCnic || st.cnicNumber || '';
      if (!isValidCnic(cnicVal)) {
        alert(`Baraye meherbani ${st.name || st.studentName} ke Father ka valid 13-digit CNIC likhein (Format: XXXXX-XXXXXXX-X).`);
        setSubmitting(false);
        return;
      }
      if (!st.dob) {
        alert(`Baraye meherbani ${st.name || st.studentName} ki Date of Birth (DOB) select karein.`);
        setSubmitting(false);
        return;
      }
      const phoneVal = st.phone || '';
      const cleanedPhone = phoneVal.replace(/[^\d+]/g, '');
      const validPhoneFormat = /^(\+?923\d{9}|\+?9203\d{9}|03\d{9})$/.test(cleanedPhone);
      
      if (!validPhoneFormat) {
        alert(`Baraye meherbani ${st.name || st.studentName} ka valid Mobile Number likhein (Misal: 03001234567 ya +923001234567).`);
        setSubmitting(false);
        return;
      }
    }

    try {
      // Loop over students and update Firestore
      for (const st of students) {
        const docRef = doc(db, 'students', st.id);
        const resolvedName = st.name || st.studentName || '';
        const resolvedCnic = st.cnic || st.fatherCnic || st.cnicNumber || '';
        await updateDoc(docRef, {
          name: resolvedName,
          studentName: resolvedName,
          fatherName: st.fatherName || '',
          motherName: st.motherName || '',
          cnic: resolvedCnic,
          cnicNumber: resolvedCnic,
          fatherCnic: resolvedCnic,
          dob: st.dob || '',
          phone: st.phone || '',
          parentPhone: st.phone || '', // Keep in sync
          linkedEmail: st.linkedEmail || '',
          dataVerifiedByParent: true,
          dataVerifiedAt: new Date().toISOString()
        });
      }
      setSuccess(true);
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to update data. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-cyan-400" size={40} />
          <p className="text-dark-muted font-bold tracking-widest text-sm uppercase">Loading Family Records...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center bg-green-500/10 border-green-500/20">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Thank You!</h2>
          <p className="text-green-400 font-medium mb-6">Your children's data has been successfully updated and verified.</p>
          <p className="text-sm text-dark-muted">You can safely close this window.</p>
        </GlassCard>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center border-red-500/20 bg-red-500/5">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Data</h2>
          <p className="text-red-400 text-sm">{errorMsg}</p>
        </GlassCard>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center border-red-500/20 bg-red-500/5">
          <User size={40} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Records Found</h2>
          <p className="text-red-400 text-sm">We couldn't find any students linked to this phone number. Please contact the school administration.</p>
          <div className="mt-4 text-[10px] text-gray-500 font-mono">
            Debug Info: Phone searched: {phone}
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg py-10 px-4 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/20">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">Family Data Update</h1>
          <p className="text-dark-muted mt-2 max-w-lg mx-auto">
            Please verify and update the information for your children below. Locked fields cannot be changed.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mt-4">
            <ShieldCheck size={14} className="text-blue-400" />
            <span className="text-xs font-bold text-blue-400 tracking-wider">SECURE PORTAL</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {students.map((student, idx) => (
            <GlassCard key={student.id} className="p-0 overflow-hidden border border-white/10 hover:border-cyan-500/30 transition-all duration-300">
              <div className="bg-gradient-to-r from-white/5 to-transparent px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-black">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{student.name || student.studentName || 'Student'}</h3>
                    <p className="text-[10px] uppercase font-black tracking-wider text-dark-muted">
                      Roll No: {student.rollNo} • Class: {student.class} • Sec: {student.section}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Editable Fields */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-dark-muted ml-1">Student Name</label>
                  <input 
                    type="text" 
                    value={student.name || student.studentName || ''} 
                    onChange={e => {
                      handleInputChange(student.id, 'name', e.target.value);
                      handleInputChange(student.id, 'studentName', e.target.value);
                    }}
                    className="w-full bg-dark-hover/50 border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-dark-muted ml-1">Father's Name</label>
                  <input 
                    type="text" 
                    value={student.fatherName || ''} 
                    onChange={e => handleInputChange(student.id, 'fatherName', e.target.value)}
                    className="w-full bg-dark-hover/50 border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-dark-muted ml-1">Mother's Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={student.motherName || ''} 
                    onChange={e => handleInputChange(student.id, 'motherName', e.target.value)}
                    className="w-full bg-dark-hover/50 border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-dark-muted ml-1">Father's CNIC <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="12345-1234567-1"
                    value={student.cnic || student.fatherCnic || student.cnicNumber || ''} 
                    onChange={e => handleCnicChange(student.id, e.target.value)}
                    className="w-full bg-dark-hover/50 border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-dark-muted ml-1">Date of Birth <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    value={student.dob || ''} 
                    onChange={e => handleInputChange(student.id, 'dob', e.target.value)}
                    className="w-full bg-dark-hover/50 border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-dark-muted ml-1 flex items-center gap-1"><Phone size={10} /> Mobile Number (WhatsApp) <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="03001234567"
                    value={student.phone || ''} 
                    onChange={e => handlePhoneChange(student.id, e.target.value)}
                    className="w-full bg-dark-hover/50 border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-dark-muted ml-1 flex items-center gap-1"><Mail size={10} /> Linked Gmail Address</label>
                  <input 
                    type="email" 
                    placeholder="student@gmail.com"
                    value={student.linkedEmail || ''} 
                    onChange={e => handleInputChange(student.id, 'linkedEmail', e.target.value)}
                    className="w-full bg-dark-hover/50 border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                {/* Readonly Section */}
                <div className="col-span-1 md:col-span-2 mt-2 pt-4 border-t border-white/5">
                  <p className="text-[10px] uppercase font-black text-dark-muted mb-3">Academic Info (Locked)</p>
                  <div className="flex flex-wrap gap-3">
                    <div className="bg-black/20 px-4 py-2 rounded-lg border border-white/5 flex-1 min-w-[100px]">
                      <span className="text-[9px] text-dark-muted uppercase block">Class</span>
                      <span className="text-sm font-bold text-gray-400">{student.class || 'N/A'}</span>
                    </div>
                    <div className="bg-black/20 px-4 py-2 rounded-lg border border-white/5 flex-1 min-w-[100px]">
                      <span className="text-[9px] text-dark-muted uppercase block">Section</span>
                      <span className="text-sm font-bold text-gray-400">{student.section || 'N/A'}</span>
                    </div>
                    <div className="bg-black/20 px-4 py-2 rounded-lg border border-white/5 flex-1 min-w-[100px]">
                      <span className="text-[9px] text-dark-muted uppercase block">Roll No</span>
                      <span className="text-sm font-bold text-gray-400">{student.rollNo || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}

          <div className="sticky bottom-6 z-10 flex justify-center mt-8">
            <button 
              type="submit" 
              disabled={submitting || students.length === 0}
              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black uppercase tracking-widest shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-70"
            >
              {submitting ? (
                <><Loader2 size={20} className="animate-spin" /> Saving Data...</>
              ) : (
                <><Save size={20} /> Submit Confirmed Data</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
