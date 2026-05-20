import React, { useState } from 'react';
import { Award, Search, Printer, Download, User, RefreshCw } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

const Certificates = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [certType, setCertType] = useState('School Leaving Certificate');
  const [studentId, setStudentId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState(null);

  const certTypes = [
    'School Leaving Certificate',
    'Character Certificate',
    'Achievement Award',
    'Sports Excellence',
    'Course Completion'
  ];

  const handleFetchStudent = async (e) => {
    e.preventDefault();
    if (!studentId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId),
        where('rollNumber', '==', studentId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setStudentData(data);
      } else {
        alert('No student found with this Roll Number/ID under your school.');
        setStudentData(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching student');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">E-Certificates</h1>
          <p className="text-dark-muted mt-1">Generate official digital certificates for students.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="p-6">
            <h2 className="font-bold mb-4 text-primary-500 flex items-center gap-2">
              <Award size={18} /> Configuration
            </h2>
            
            <form onSubmit={handleFetchStudent} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Certificate Type</label>
                <select 
                  value={certType}
                  onChange={(e) => setCertType(e.target.value)}
                  className="w-full premium-input bg-dark-card"
                >
                  {certTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Student Roll No/ID</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                  <input 
                    type="text" 
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Enter ID (e.g. L-101)..."
                    className="w-full premium-input pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Remarks / Grading</label>
                <textarea 
                  rows="3" 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full premium-input resize-none"
                  placeholder="Enter specific achievements or remarks..."
                ></textarea>
              </div>

              <button type="submit" disabled={loading} className="w-full premium-button-primary mt-4 flex items-center justify-center gap-2">
                {loading ? <RefreshCw className="animate-spin" size={16} /> : 'Fetch & Generate Preview'}
              </button>
            </form>
          </GlassCard>
        </div>

        <div className="lg:col-span-2">
          <GlassCard className="p-8 h-full min-h-[500px] flex flex-col">
            <div className="flex justify-end gap-3 mb-6">
              <button onClick={handlePrint} className="premium-button-secondary py-2 px-4 text-xs"><Printer size={16} /> Print Certificate</button>
            </div>

            {/* Certificate Preview Box */}
            <div id="print-area" className="flex-1 border-8 border-double border-dark-border/50 bg-white p-10 flex flex-col items-center justify-center text-center relative overflow-hidden text-slate-900 rounded-xl">
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <Award size={400} className="text-slate-800" />
              </div>
              
              <h1 className="text-3xl font-serif text-slate-800 mb-2 tracking-widest uppercase font-black">
                {certType}
              </h1>
              <div className="w-32 h-1 bg-primary-500 mb-8"></div>
              
              <p className="text-slate-600 text-base font-serif italic mb-2">This is to certify that</p>
              <h2 className="text-2xl font-serif font-bold text-slate-900 border-b border-slate-300 pb-2 mb-3 px-10 min-w-[300px]">
                {studentData ? studentData.name : "[Student Name]"}
              </h2>

              {studentData && (
                <p className="text-slate-600 text-sm font-serif italic mb-4">
                  Son / Daughter of <strong className="text-slate-800">{studentData.fatherName || 'N/A'}</strong>, student of Grade <strong className="text-slate-800">{studentData.class} {studentData.section ? `Section ${studentData.section}` : ''}</strong>
                </p>
              )}
              
              <p className="text-slate-600 text-sm font-serif leading-relaxed max-w-xl mx-auto">
                {remarks || "has successfully demonstrated excellent performance, dedicated focus, and good behavior during their academic tenure at this school. In appreciation, we present this certificate of honor and recognition."}
              </p>

              <div className="w-full flex justify-between mt-16 px-10">
                <div className="text-center border-t border-slate-400 pt-2 w-48">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Date Issued</span>
                  <p className="text-slate-800 text-xs font-mono mt-1">{new Date().toLocaleDateString()}</p>
                </div>
                <div className="text-center border-t border-slate-400 pt-2 w-48">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Principal Signature</span>
                  <p className="text-slate-800 font-serif italic text-sm mt-1">LODHI SCHOOL</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Certificates;
