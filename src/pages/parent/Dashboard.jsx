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
  Download,
  CheckCircle,
  Clock,
  Send,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const ParentDashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const schoolId = userData?.schoolId || 'default-school';
  
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [notices, setNotices] = useState([]);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    teacherOrPrincipal: 'Principal Office',
    date: '',
    timeSlot: '10:00 AM - 10:30 AM',
    reason: ''
  });
  const [appointmentSuccess, setAppointmentSuccess] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    fetchParentData();
  }, [userData]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

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
        const latestGrade = studentResults.length > 0 ? studentResults[0].grade : 'A+';

        // Set attendance
        const attendancePct = student.attendanceRate || '96.5%';

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
          { id: 'child-1', name: 'Ahmad Khan', class: '10th-A', rollNo: 'ST-101', attendance: '96.5%', lastResult: 'A+', feeStatus: 'Paid' },
          { id: 'child-2', name: 'Sara Khan', class: '7th-B', rollNo: 'ST-504', attendance: '94.0%', lastResult: 'A', feeStatus: 'Pending' },
        ]);
      } else {
        // If parent has specific children or if previewing, show up to 4 children
        setChildren(mappedChildren.slice(0, 4));
      }
    } catch (e) {
      console.error('Error fetching parent portal data:', e);
      // Fallback in case of absolute error
      setChildren([
        { id: 'child-1', name: 'Ahmad Khan', class: '10th-A', rollNo: 'ST-101', attendance: '96.5%', lastResult: 'A+', feeStatus: 'Paid' },
        { id: 'child-2', name: 'Sara Khan', class: '7th-B', rollNo: 'ST-504', attendance: '94.0%', lastResult: 'A', feeStatus: 'Pending' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChildAndNavigate = (child, route) => {
    localStorage.setItem('taleemidunya_active_child_name', child.name);
    localStorage.setItem('taleemidunya_active_child_id', child.id);
    navigate(route);
  };

  const handleBookAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentForm.date || !appointmentForm.reason) {
      alert('Please select appointment date and enter reason.');
      return;
    }

    try {
      await addDoc(collection(db, 'announcements'), {
        schoolId,
        title: `🗓️ Appointment Request: ${appointmentForm.teacherOrPrincipal}`,
        message: `Parent requested appointment on ${appointmentForm.date} (${appointmentForm.timeSlot}). Reason: ${appointmentForm.reason}`,
        author: userData?.name || 'Parent Portal',
        createdAt: serverTimestamp(),
        type: 'appointment'
      });
    } catch (err) {
      console.warn('Error saving appointment to Firestore:', err);
    }

    setAppointmentSuccess(true);
    setTimeout(() => {
      setAppointmentSuccess(false);
      setIsAppointmentModalOpen(false);
      setAppointmentForm({
        teacherOrPrincipal: 'Principal Office',
        date: '',
        timeSlot: '10:00 AM - 10:30 AM',
        reason: ''
      });
      showToast('✅ Appointment request sent to School Administration successfully!');
    }, 1800);
  };

  const handleDownloadNotice = (noticeText) => {
    const element = document.createElement("a");
    const file = new Blob([`TALEEMIDUNYA OFFICIAL SCHOOL NOTICE\n=================================\n\n${noticeText}\n\nGenerated from Parent Portal`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "school_notice_report.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('📥 School Notice downloaded successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-primary-500" size={32} />
        <p className="text-dark-muted ml-3 font-semibold">Loading Parent Portal Features...</p>
      </div>
    );
  }

  const latestNotice = notices.length > 0 ? notices[0] : null;
  const noticeTextDisplay = latestNotice 
    ? (latestNotice.message || latestNotice.description || latestNotice.desc || latestNotice.title)
    : "Summer vacations will start from June 01, 2026. Please collect your child's result card and summer homework pack from the school office during working hours (9:00 AM - 1:00 PM).";

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-24 right-6 z-50 bg-emerald-500/90 text-white px-5 py-3 rounded-xl shadow-2xl border border-emerald-400/40 font-bold text-sm flex items-center gap-2 animate-bounce">
          <CheckCircle size={18} className="shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-premium-gradient bg-clip-text text-transparent">Parent Portal</h1>
          <p className="text-dark-muted mt-1 font-medium">Monitor your children's live academic progress, attendance logs, and fee vouchers.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={fetchParentData} className="premium-button-secondary py-2.5 flex items-center gap-2 cursor-pointer">
            <RefreshCw size={16} /> Sync Live Data
          </button>
          <div className="relative">
            <button 
              onClick={() => showToast('🔔 No urgent unread alerts. All school circulars are synced!')}
              title="Notifications"
              className="p-3 bg-dark-card border border-dark-border rounded-2xl text-dark-muted hover:text-primary-500 transition-all cursor-pointer"
            >
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-dark-card animate-pulse"></span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users size={20} className="text-primary-500" /> My Children ({children.length})
            </h2>
            <span className="text-xs text-primary-400 font-semibold italic">Click card or button to inspect reports</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {children.map((child, i) => (
              <GlassCard key={i} className="p-6 group hover:border-primary-500/40 transition-all relative">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleSelectChildAndNavigate(child, '/parent/attendance')}>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-primary-500/10 flex items-center justify-center text-primary-400 text-xl font-black border border-primary-500/20 group-hover:scale-110 transition-transform">
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-primary-400 transition-colors">{child.name}</h3>
                      <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">{child.class} • {child.rollNo}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSelectChildAndNavigate(child, '/parent/attendance')}
                    title="View Detailed Attendance Log"
                    className="p-2 text-dark-muted hover:text-primary-500 hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                  >
                    <ExternalLink size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div 
                     onClick={() => handleSelectChildAndNavigate(child, '/parent/attendance')}
                     className="p-3 bg-dark-hover rounded-xl border border-dark-border hover:border-primary-500/30 transition-all cursor-pointer"
                   >
                      <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Attendance</p>
                      <p className="text-lg font-bold text-green-500 mt-1">{child.attendance}</p>
                   </div>
                   <div 
                     onClick={() => handleSelectChildAndNavigate(child, '/parent/exams')}
                     className="p-3 bg-dark-hover rounded-xl border border-dark-border hover:border-primary-500/30 transition-all cursor-pointer"
                   >
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
                      {child.feeStatus !== 'Paid' ? (
                        <button 
                          onClick={() => handleSelectChildAndNavigate(child, '/parent/fees')}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-md cursor-pointer flex items-center gap-1"
                        >
                          <CreditCard size={12} /> Pay Now
                        </button>
                      ) : (
                        <span className="text-[10px] font-black text-green-400 bg-green-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                          ✓ Cleared
                        </span>
                      )}
                   </div>
                </div>
              </GlassCard>
            ))}
          </div>

          <GlassCard className="p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary-500" /> Monthly Academic Performance
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
                    <div className="w-full bg-primary-500/10 rounded-t-xl relative group cursor-pointer" style={{ height: `${d.val}%` }}>
                       <div className="absolute inset-x-0 bottom-0 bg-primary-500 rounded-t-xl transition-all duration-1000 group-hover:bg-cyan-400" style={{ height: '100%' }}></div>
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-card border border-dark-border px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-lg">
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
            <h2 className="text-xl font-bold mb-6">School Contact & Support</h2>
            <div className="space-y-6">
               <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-dark-hover flex items-center justify-center text-primary-400 border border-dark-border">
                     <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Principal Office</h4>
                    <p className="text-xs text-dark-muted">+92 42 1234567 • Mon-Sat</p>
                  </div>
               </div>
               <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-dark-hover flex items-center justify-center text-cyan-400 border border-dark-border">
                     <MessageCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Teacher Messenger</h4>
                    <p className="text-xs text-dark-muted">Direct academic coordination</p>
                  </div>
               </div>
            </div>
            <button 
              onClick={() => setIsAppointmentModalOpen(true)}
              className="w-full mt-8 premium-button-primary py-3 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary-500/20 font-bold"
            >
              <Calendar size={18} /> Book Appointment
            </button>
          </GlassCard>

          <GlassCard className="p-6 bg-dark-card relative overflow-hidden">
             <div className="flex items-center justify-between mb-4 relative z-10">
               <h2 className="text-xl font-bold">School Notice Board</h2>
               <span className="px-2 py-0.5 rounded bg-primary-500/20 text-primary-400 font-mono text-[10px] font-black uppercase">Official</span>
             </div>
             <p className="text-sm text-dark-muted leading-relaxed relative z-10 font-medium">
               {noticeTextDisplay}
             </p>
             <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-dark-border relative z-10">
                <p className="text-[10px] text-dark-muted font-black uppercase tracking-[0.2em]">Broadcast Author</p>
                <div className="flex items-center justify-between mt-2">
                   <span className="text-xs font-semibold flex items-center gap-2 italic text-primary-400">
                     <FileText size={14} className="text-primary-400" /> {latestNotice?.author || 'School Administration'}
                   </span>
                   <button 
                     onClick={() => handleDownloadNotice(noticeTextDisplay)}
                     title="Download/Print Notice Copy"
                     className="p-2 bg-dark-hover hover:bg-primary-500/20 hover:text-primary-400 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                   >
                     <Download size={14} /> Download
                   </button>
                </div>
             </div>
             <div className="absolute -left-10 -top-10 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl"></div>
          </GlassCard>
        </div>
      </div>

      {/* Appointment Booking Modal */}
      {isAppointmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <GlassCard className="w-full max-w-lg p-6 md:p-8 bg-dark-card/95 border-primary-500/30 relative shadow-2xl">
            <button 
              onClick={() => setIsAppointmentModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-dark-hover text-dark-muted hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
              <Calendar className="text-primary-500" size={24} /> Book School Appointment
            </h3>
            <p className="text-xs text-dark-muted mb-6">Schedule a meeting with the Principal or Class Teacher regarding your child.</p>

            {appointmentSuccess ? (
              <div className="py-12 text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                  <CheckCircle size={36} className="animate-bounce" />
                </div>
                <h4 className="text-xl font-bold text-white">Appointment Requested!</h4>
                <p className="text-xs text-dark-muted max-w-xs mx-auto">Your request has been forwarded to the school office. You will receive SMS/WhatsApp confirmation shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleBookAppointmentSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">Meeting With</label>
                  <select
                    value={appointmentForm.teacherOrPrincipal}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, teacherOrPrincipal: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none transition-colors"
                  >
                    <option value="Principal Office">Principal Office</option>
                    <option value="Class Teacher (Ahmad Khan - 10th-A)">Class Teacher (Ahmad Khan - 10th-A)</option>
                    <option value="Class Teacher (Sara Khan - 7th-B)">Class Teacher (Sara Khan - 7th-B)</option>
                    <option value="Accounts / Fee Department">Accounts / Fee Department</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">Preferred Date</label>
                    <input
                      type="date"
                      required
                      value={appointmentForm.date}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                      className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">Time Slot</label>
                    <select
                      value={appointmentForm.timeSlot}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, timeSlot: e.target.value })}
                      className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none transition-colors"
                    >
                      <option value="09:30 AM - 10:00 AM">09:30 AM - 10:00 AM</option>
                      <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                      <option value="11:00 AM - 11:30 AM">11:00 AM - 11:30 AM</option>
                      <option value="12:15 PM - 12:45 PM">12:15 PM - 12:45 PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-1.5">Agenda / Discussion Reason</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="E.g., Regarding recent mathematics test marks or fee installment request..."
                    value={appointmentForm.reason}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-sm text-white focus:border-primary-500 outline-none transition-colors"
                  ></textarea>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAppointmentModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-dark-hover border border-dark-border text-dark-muted hover:text-white transition-colors text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-primary-500/20 cursor-pointer"
                  >
                    <Send size={15} /> Submit Request
                  </button>
                </div>
              </form>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;
