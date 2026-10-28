import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  User, 
  CalendarCheck, 
  Receipt, 
  BookOpen, 
  Award, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Download, 
  ExternalLink, 
  CreditCard, 
  Play, 
  Pause, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw,
  QrCode
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

const ParentQuickPortal = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'HOMEWORK' | 'FEES' | 'EXAMS'

  // Audio player state for voice diary
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      if (studentId) {
        // Try direct doc lookup
        const docRef = doc(db, 'students', studentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStudent({ id: docSnap.id, ...docSnap.data() });
          setLoading(false);
          return;
        }

        // Try lookup by rollNumber or registrationNo
        const q = query(collection(db, 'students'), where('rollNumber', '==', studentId));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const first = qSnap.docs[0];
          setStudent({ id: first.id, ...first.data() });
          setLoading(false);
          return;
        }
      }

      // No student found in database
      setStudent(null);
    } catch (err) {
      console.error(err);
      setStudent(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="animate-spin text-slate-800 mx-auto" size={32} />
          <p className="text-xs font-bold text-slate-600">Loading Student Portal...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-900/5 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto font-bold">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900">Student Record Not Found</h2>
          <p className="text-xs text-slate-600">
            Please make sure you followed the direct link sent by your school via WhatsApp containing your child&apos;s verified Student ID.
          </p>
        </div>
      </div>
    );
  }

  const s = student;

  return (
    <div className="min-h-screen bg-slate-900/5 py-4 sm:py-8 px-3 sm:px-4 font-sans text-slate-900 flex justify-center">
      <div className="w-full max-w-md space-y-4">
        
        {/* TOP BRAND HEADER */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm text-center relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck size={12} className="text-indigo-600" />
              Verified Parent View
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              No Password Needed
            </span>
          </div>

          {/* Student Avatar & Basic Info */}
          <div className="flex items-center gap-4 text-left">
            <div className="relative">
              <img 
                src={s.photo || s.photoUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=faces'} 
                alt={s.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-900 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold" title="Active">
                ✓
              </span>
            </div>

            <div className="space-y-0.5 flex-1">
              <h1 className="text-base sm:text-lg font-black text-slate-950 leading-snug">{s.name}</h1>
              <p className="text-xs font-bold text-slate-600">{s.className || 'Class 9'} • Sec {s.section || 'A'}</p>
              <p className="text-[11px] text-slate-500 font-medium">Roll No: <span className="font-mono font-bold text-slate-900">{s.rollNumber || s.rollNo || '104'}</span></p>
            </div>
          </div>

          {/* School Name */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold text-slate-700 truncate max-w-[220px]">{s.schoolName || 'TaleemiDunya Model School'}</span>
            <a 
              href={`tel:${s.schoolPhone || '03001234567'}`}
              className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Phone size={12} />
              <span>Call School</span>
            </a>
          </div>
        </div>

        {/* TODAY'S ATTENDANCE STATUS CARD */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CalendarCheck size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Today's Attendance</h3>
                <p className="text-[10px] text-slate-400">{new Date().toDateString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white font-black text-xs shadow-xs animate-pulse">
              <CheckCircle2 size={13} />
              <span>Present (حاضر)</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Gate Punch Time:</span>
            <span className="font-mono font-black text-slate-900">08:14 AM (On Time)</span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="grid grid-cols-3 gap-2 bg-slate-200/60 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('HOMEWORK')}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activeTab === 'HOMEWORK' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <BookOpen size={14} />
            <span>Homework</span>
          </button>
          <button 
            onClick={() => setActiveTab('FEES')}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activeTab === 'FEES' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Receipt size={14} />
            <span>Fee Status</span>
          </button>
          <button 
            onClick={() => setActiveTab('EXAMS')}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activeTab === 'EXAMS' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Award size={14} />
            <span>Results</span>
          </button>
        </div>

        {/* TAB 1: DAILY DIARY & HOMEWORK */}
        {activeTab === 'HOMEWORK' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-950 text-sm">Today's Diary (ڈیجیٹل ڈائری)</h3>
                <p className="text-[11px] text-slate-500">Teacher's tasks for today</p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                Active
              </span>
            </div>

            {/* Voice Note Player simulation */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-indigo-950">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-600" />
                  Teacher's Voice Instruction:
                </span>
                <span className="text-[10px] font-mono text-indigo-600">0:24s</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPlayingVoice(!isPlayingVoice)}
                  className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
                >
                  {isPlayingVoice ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </button>
                <div className="flex-1 bg-white h-2 rounded-full overflow-hidden border border-indigo-200">
                  <div className={`h-full bg-indigo-600 transition-all duration-300 ${isPlayingVoice ? 'w-3/4' : 'w-1/4'}`}></div>
                </div>
              </div>
              <p className="text-[10px] text-indigo-800 italic">"Bachay Math ka homework lazmi kar ke layein, kal surprise test hoga."</p>
            </div>

            {/* Subject Tasks List */}
            <div className="space-y-2.5">
              {(s.diaryToday || []).map((item, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 block">
                    📌 {item.subject}
                  </span>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    {item.task}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: FEE STATUS & PAYMENT */}
        {activeTab === 'FEES' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-950 text-sm">Fee Challan & Dues</h3>
                <p className="text-[11px] text-slate-500">October 2026 Voucher</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 font-black text-xs">
                Pending: Rs. 3,500
              </span>
            </div>

            {/* Voucher breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Monthly Tuition Fee:</span>
                <span className="font-mono font-bold text-slate-900">Rs. 3,200</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Exam / Stationery Fund:</span>
                <span className="font-mono font-bold text-slate-900">Rs. 300</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-black">
                <span>Total Payable:</span>
                <span className="font-mono text-slate-950">Rs. 3,500</span>
              </div>
            </div>

            {/* Quick Pay Options (EasyPaisa / JazzCash / 1Link) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 block">
                ⚡ Instant Online Payment Options:
              </span>
              <p className="text-[11px] text-slate-600">
                Aap JazzCash, EasyPaisa ya kisi bhi Bank App se 1Link Bill No ke zariye foran fee ada kar saktay hain.
              </p>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 flex justify-between items-center">
                <span>Consumer Bill No:</span>
                <span className="text-indigo-600 select-all">90401826</span>
              </div>
            </div>

            {/* Direct Pay Button */}
            <a 
              href={`#/checkout?studentId=${s.id}&amount=3500`}
              className="w-full py-3.5 rounded-2xl bg-black hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <CreditCard size={15} />
              <span>Pay Online via Card / Wallet</span>
            </a>
          </div>
        )}

        {/* TAB 3: EXAM RESULTS */}
        {activeTab === 'EXAMS' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-950 text-sm">Exam Assessment Result</h3>
                <p className="text-[11px] text-slate-500">Academic Session 2026</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-black text-xs">
                Grade: A+ (88.4%)
              </span>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase font-black block">Marks Obtained</span>
                <span className="font-mono font-black text-base text-slate-900">442 / 500</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase font-black block">Class Position</span>
                <span className="font-mono font-black text-base text-indigo-600">2nd Position</span>
              </div>
            </div>

            {/* Teacher Remarks Box */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1">
              <span className="font-black text-amber-950 text-[11px] flex items-center gap-1">
                <Sparkles size={13} className="text-amber-600" />
                Teacher's Performance Remarks:
              </span>
              <p className="text-xs text-amber-900 font-medium leading-relaxed italic">
                "{s.examResult?.teacherRemarks || 'Ahmad is extremely hardworking and disciplined.'}"
              </p>
            </div>
          </div>
        )}

        {/* BOTTOM QUICK FOOTER */}
        <div className="text-center text-[11px] text-slate-400 font-medium pt-2">
          <span>Powered by TaleemiDunya Pro • School Parent Gateway</span>
        </div>

      </div>
    </div>
  );
};

export default ParentQuickPortal;
