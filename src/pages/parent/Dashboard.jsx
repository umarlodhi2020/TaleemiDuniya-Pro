import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  FileText, 
  TrendingUp, 
  ShieldCheck,
  Bell,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  Download
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

const ParentDashboard = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    fetchParentData();
  }, [userData]);

  const fetchParentData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all students for this school
      const studentSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
      const studentsList = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Fetch fee challans to determine fee status
      const challansSnap = await getDocs(query(collection(db, 'challans'), where('schoolId', '==', schoolId)));
      const challansList = challansSnap.docs.map(doc => doc.data());

      // 3. Fetch latest results
      const resultsSnap = await getDocs(query(collection(db, 'results'), where('schoolId', '==', schoolId)));
      const resultsList = resultsSnap.docs.map(doc => doc.data());

      // 4. Fetch notices (announcements)
      const noticeSnap = await getDocs(query(collection(db, 'announcements'), where('schoolId', '==', schoolId)));
      setNotices(noticeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Map dynamic children data
      const mappedChildren = studentsList.map(student => {
        // Calculate fee status
        const hasUnpaid = challansList.some(c => c.studentId === student.id && c.status === 'Unpaid');
        
        // Find latest grade
        const studentResults = resultsList.filter(r => r.studentId === student.id);
        const latestGrade = studentResults.length > 0 ? studentResults[0].grade : 'A';

        // Set attendance
        const attendancePct = student.attendanceRate || '95%';

        return {
          id: student.id,
          name: student.name || 'Student Name',
          class: `${student.class || '10'}th-${student.section || 'A'}`,
          rollNo: student.rollNumber || 'ST-101',
          attendance: attendancePct,
          lastResult: latestGrade,
          feeStatus: hasUnpaid ? 'Pending' : 'Paid'
        };
      });

      // Fallback to defaults if no students exist in Firestore yet (e.g. sandbox or new school)
      if (mappedChildren.length === 0) {
        setChildren([
          { name: 'Ahmad Khan', class: '10th-A', rollNo: 'ST-101', attendance: '92%', lastResult: 'A+', feeStatus: 'Paid' },
          { name: 'Sara Khan', class: '7th-B', rollNo: 'ST-504', attendance: '95%', lastResult: 'A', feeStatus: 'Pending' },
        ]);
      } else {
        setChildren(mappedChildren);
      }
    } catch (e) {
      console.error('Error fetching parent portal data:', e);
      // Fallback in case of absolute error
      setChildren([
        { name: 'Ahmad Khan', class: '10th-A', rollNo: 'ST-101', attendance: '92%', lastResult: 'A+', feeStatus: 'Paid' },
        { name: 'Sara Khan', class: '7th-B', rollNo: 'ST-504', attendance: '95%', lastResult: 'A', feeStatus: 'Pending' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-primary-500" size={32} />
        <p className="text-dark-muted ml-3 font-semibold">Loading Parent Portal...</p>
      </div>
    );
  }

  const latestNotice = notices.length > 0 ? notices[0] : null;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-premium-gradient bg-clip-text text-transparent">Parent Portal</h1>
          <p className="text-dark-muted mt-1 font-medium">Monitor your children's academic progress and activities.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={fetchParentData} className="premium-button-secondary py-2.5">
            <RefreshCw size={16} /> Sync Updates
          </button>
          <div className="relative">
            <button className="p-3 bg-dark-card border border-dark-border rounded-2xl text-dark-muted hover:text-primary-500 transition-all">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-dark-card"></span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <h2 className="text-xl font-bold px-1 flex items-center gap-2">
            <Users size={20} className="text-primary-500" /> My Children
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {children.map((child, i) => (
              <GlassCard key={i} className="p-6 group hover:border-primary-500/30 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-primary-500/10 flex items-center justify-center text-primary-400 text-xl font-black border border-primary-500/20 group-hover:scale-110 transition-transform">
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white">{child.name}</h3>
                      <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">{child.class} • {child.rollNo}</p>
                    </div>
                  </div>
                  <button className="p-2 text-dark-muted hover:text-primary-500 transition-colors">
                    <ExternalLink size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-3 bg-dark-hover rounded-xl border border-dark-border">
                      <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Attendance</p>
                      <p className="text-lg font-bold text-green-500 mt-1">{child.attendance}</p>
                   </div>
                   <div className="p-3 bg-dark-hover rounded-xl border border-dark-border">
                      <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Last Result</p>
                      <p className="text-lg font-bold text-primary-400 mt-1">{child.lastResult}</p>
                   </div>
                   <div className={`p-3 rounded-xl border col-span-2 flex items-center justify-between ${
                     child.feeStatus === 'Paid' 
                      ? 'bg-green-500/5 border-green-500/20' 
                      : 'bg-red-500/5 border-red-500/20'
                   }`}>
                      <div>
                        <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Fee Status</p>
                        <p className={`text-sm font-bold mt-0.5 ${child.feeStatus === 'Paid' ? 'text-green-500' : 'text-red-500'}`}>{child.feeStatus}</p>
                      </div>
                      {child.feeStatus !== 'Paid' && (
                        <button className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95">Pay Now</button>
                      )}
                   </div>
                </div>
              </GlassCard>
            ))}
          </div>

          <GlassCard className="p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary-500" /> Academic Performance
            </h2>
            <div className="h-64 flex items-end justify-between gap-4 px-4 pt-10">
               {[
                 { month: 'Jan', val: 85 },
                 { month: 'Feb', val: 78 },
                 { month: 'Mar', val: 92 },
                 { month: 'Apr', val: 88 },
                 { month: 'May', val: 95 },
               ].map((d, i) => (
                 <div key={i} className="flex-1 flex flex-col items-center gap-4">
                    <div className="w-full bg-primary-500/10 rounded-t-xl relative group" style={{ height: `${d.val}%` }}>
                       <div className="absolute inset-x-0 bottom-0 bg-primary-500 rounded-t-xl transition-all duration-1000" style={{ height: '100%' }}></div>
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-card border border-dark-border px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Avg: {d.val}%
                       </div>
                    </div>
                    <span className="text-[10px] font-black text-dark-muted uppercase tracking-widest">{d.month}</span>
                 </div>
               ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-8">
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold mb-6">School Contact</h2>
            <div className="space-y-6">
               <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-dark-hover flex items-center justify-center text-dark-muted">
                     <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Principal Office</h4>
                    <p className="text-xs text-dark-muted">+92 42 1234567</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-dark-hover flex items-center justify-center text-dark-muted">
                     <MessageCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Messenger</h4>
                    <p className="text-xs text-dark-muted">Chat with teachers</p>
                  </div>
               </div>
            </div>
            <button className="w-full mt-8 premium-button-primary py-3">
              Book Appointment
            </button>
          </GlassCard>

          <GlassCard className="p-6 bg-dark-card relative overflow-hidden">
             <h2 className="text-xl font-bold mb-4 relative z-10">Important Notice</h2>
             <p className="text-sm text-dark-muted leading-relaxed relative z-10">
               {latestNotice 
                 ? (latestNotice.message || latestNotice.description || latestNotice.desc || latestNotice.title)
                 : "Summer vacations will start from June 01, 2026. Please collect your child's result card from the office."
               }
             </p>
             <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-dark-border relative z-10">
                <p className="text-[10px] text-dark-muted font-black uppercase tracking-[0.2em]">Broadcast Author</p>
                <div className="flex items-center justify-between mt-2">
                   <span className="text-xs font-semibold flex items-center gap-2 italic text-primary-400">
                     <FileText size={14} className="text-primary-400" /> {latestNotice?.author || 'School Administration'}
                   </span>
                   <button className="p-1 hover:text-primary-500 transition-colors">
                     <Download size={14} />
                   </button>
                </div>
             </div>
             <div className="absolute -left-10 -top-10 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl"></div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
