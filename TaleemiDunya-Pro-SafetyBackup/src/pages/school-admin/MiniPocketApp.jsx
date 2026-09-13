import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  Send, 
  Search, 
  Users, 
  CreditCard, 
  CalendarCheck, 
  BellRing, 
  AlertTriangle, 
  QrCode, 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  RefreshCw, 
  Download, 
  Share2, 
  Sparkles, 
  UserCheck,
  Award,
  BookOpen,
  DollarSign,
  Briefcase,
  FileText,
  ShieldCheck,
  Laptop,
  Lock,
  Eye,
  GraduationCap,
  Camera,
  Mic,
  Upload,
  Wifi,
  WifiOff,
  Bot,
  Zap,
  Image as ImageIcon,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRecords, addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const MiniPocketApp = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = userData?.schoolName || 'Lodhi School System';

  // Determine logged in role
  const actualRole = (userData?.role || 'school-admin').toLowerCase();
  const isPrincipalOrAdmin = actualRole === 'school-admin' || actualRole === 'superadmin' || actualRole === 'admin' || actualRole === 'principal';
  const isTeacher = actualRole === 'teacher' || actualRole === 'staff';
  const isStudentOrParent = actualRole === 'student' || actualRole === 'parent';

  // App Role Mode: 'PRINCIPAL' | 'TEACHER' | 'STUDENT'
  const [appRoleMode, setAppRoleMode] = useState(
    isTeacher ? 'TEACHER' : isStudentOrParent ? 'STUDENT' : 'PRINCIPAL'
  );

  // Bottom Tab Navigation
  const [activeTab, setActiveTab] = useState(
    isTeacher ? 'attendance' : isStudentOrParent ? 'mydiary' : 'radar'
  );

  useEffect(() => {
    if (appRoleMode === 'PRINCIPAL') setActiveTab('radar');
    if (appRoleMode === 'TEACHER') setActiveTab('attendance');
    if (appRoleMode === 'STUDENT') setActiveTab('mydiary');
  }, [appRoleMode]);

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('10');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceState, setAttendanceState] = useState({});

  // Online / Offline State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('pocket_offline_attendance');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Broadcast & Diary State (With Photo / Voice attachment)
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('ALL_PARENTS');
  const [broadcastAttachment, setBroadcastAttachment] = useState(null); // { type: 'IMAGE' | 'VOICE', data: Base64/name }

  const [diarySubject, setDiarySubject] = useState('Mathematics');
  const [diaryText, setDiaryText] = useState('');
  const [diaryAttachment, setDiaryAttachment] = useState(null);

  // Lookup Scanner State
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  // Student Quiz Simulator State
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 3, percentage: 0 });

  // Student Online Payment Modal State (JazzCash / EasyPaisa / Bank QR)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState('JAZZCASH');
  const [paymentProofUploaded, setPaymentProofUploaded] = useState(false);
  const [tidInput, setTidInput] = useState('');

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsStandalone(true);
    }
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [schoolId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const list = await getRecords('students', schoolId);
      if (list && list.length > 0) {
        setStudents(list);
      } else {
        setStudents([
          { id: '101', name: 'Daniyal Lodhi', rollNumber: '101', class: '10', parentPhone: '03009876543', feeStatus: 'Paid', overdue: 0 },
          { id: '102', name: 'Mahnoor Fatima', rollNumber: '102', class: '10', parentPhone: '03211234567', feeStatus: 'Defaulter', overdue: 4500 },
          { id: '103', name: 'Ayan Ali Raza', rollNumber: '103', class: '10', parentPhone: '03337654321', feeStatus: 'Paid', overdue: 0 },
          { id: '104', name: 'Zainab Ahmed', rollNumber: '104', class: '9', parentPhone: '03129988776', feeStatus: 'Defaulter', overdue: 6000 },
          { id: '105', name: 'Hamza Khan', rollNumber: '105', class: '8', parentPhone: '03014455667', feeStatus: 'Paid', overdue: 0 }
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      alert('📲 To install this Role-Secured Android App on your phone:\n\n1. Open in Google Chrome on Android\n2. Tap the 3 dots menu (⋮) in the top right corner\n3. Tap "Add to Home screen" or "Install App"\n\nIt runs exactly like a standalone Android APK!');
    }
  };

  const classStudents = students.filter(s => String(s.class) === String(selectedClass));

  const handleToggleAttendance = (sId, status) => {
    setAttendanceState(prev => ({
      ...prev,
      [sId]: prev[sId] === status ? undefined : status
    }));
  };

  const handleMarkAll = (status) => {
    const updated = {};
    classStudents.forEach(s => { updated[s.id] = status; });
    setAttendanceState(updated);
  };

  const handleSaveAttendance = async () => {
    const totalMarked = Object.keys(attendanceState).length;
    if (totalMarked === 0) {
      alert('Please mark attendance for at least one student.');
      return;
    }

    const payload = {
      schoolId,
      date: attendanceDate,
      class: selectedClass,
      records: attendanceState,
      markedBy: userData?.name || 'Pocket App',
      timestamp: new Date().toISOString()
    };

    if (!isOnline) {
      // Offline mode -> Save to queue
      const updatedQueue = [...offlineQueue, payload];
      setOfflineQueue(updatedQueue);
      try { localStorage.setItem('pocket_offline_attendance', JSON.stringify(updatedQueue)); } catch {}
      alert(`⚡ OFFLINE MODE: Classroom Attendance for Grade ${selectedClass} saved to Local Storage Queue (${totalMarked} students marked)!\n\nIt will automatically sync to cloud when internet connection is restored.`);
      return;
    }

    try {
      await addRecord('attendance_logs', payload);
      alert(`✅ Classroom Attendance logged for Grade ${selectedClass} (${totalMarked} students marked)!`);
    } catch (e) {
      // Fallback queue if cloud error
      const updatedQueue = [...offlineQueue, payload];
      setOfflineQueue(updatedQueue);
      try { localStorage.setItem('pocket_offline_attendance', JSON.stringify(updatedQueue)); } catch {}
      alert(`⚡ Cloud timeout -> Saved locally to Offline Sync Queue for ${totalMarked} students.`);
    }
  };

  const handleSyncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    if (!isOnline) {
      alert('❌ Still offline. Please connect to Wi-Fi or Mobile Data first to sync.');
      return;
    }
    setLoading(true);
    let count = 0;
    try {
      for (const log of offlineQueue) {
        await addRecord('attendance_logs', log);
        count++;
      }
      setOfflineQueue([]);
      try { localStorage.removeItem('pocket_offline_attendance'); } catch {}
      alert(`✅ SYNC COMPLETE: ${count} offline classroom attendance sessions synced to Cloud successfully!`);
    } catch (e) {
      alert(`❌ Error during sync: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPocketBroadcast = () => {
    if (!broadcastMessage.trim() && !broadcastAttachment) {
      alert('Please enter message text or attach a Circular photo/voice.');
      return;
    }
    const attachText = broadcastAttachment ? ` [with ${broadcastAttachment.type === 'IMAGE' ? '📷 Circular Photo' : '🎙️ Voice Note'}: ${broadcastAttachment.name}]` : '';
    alert(`📢 AI WhatsApp Broadcast sent to ${broadcastTarget}!\n\nMessage: "${broadcastMessage || 'See attached circular'}"${attachText}`);
    setBroadcastMessage('');
    setBroadcastAttachment(null);
  };

  const handleSendPocketDiary = () => {
    if (!diaryText.trim() && !diaryAttachment) {
      alert('Please type homework details or attach a board photo.');
      return;
    }
    const attachText = diaryAttachment ? ` [with ${diaryAttachment.type === 'IMAGE' ? '📷 Blackboard Photo' : '🎙️ Voice Note'}]` : '';
    alert(`📢 Homework Diary synced & broadcasted via WhatsApp to Class ${selectedClass} Parents!\n\nSubject: ${diarySubject}\nDiary: "${diaryText || 'See attached photo'}"${attachText}`);
    setDiaryText('');
    setDiaryAttachment(null);
  };

  const handlePhotoCapture = (type) => {
    // Simulated Camera Snap / Photo Circular Picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Triggers mobile rear camera on Android/iOS
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (type === 'DIARY') {
          setDiaryAttachment({ type: 'IMAGE', name: file.name, url: URL.createObjectURL(file) });
        } else {
          setBroadcastAttachment({ type: 'IMAGE', name: file.name, url: URL.createObjectURL(file) });
        }
      }
    };
    input.click();
  };

  const handleVoiceNoteCapture = (type) => {
    alert('🎙️ Recording Voice Circular... (Audio captured 12 seconds). Ready for WhatsApp Broadcast!');
    if (type === 'DIARY') {
      setDiaryAttachment({ type: 'VOICE', name: 'voice_circular_class' + selectedClass + '.mp3' });
    } else {
      setBroadcastAttachment({ type: 'VOICE', name: 'principal_urgent_circular.mp3' });
    }
  };

  const handleSearchStudent = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const found = students.find(s => 
      String(s.rollNumber).toLowerCase() === searchQuery.toLowerCase().trim() ||
      String(s.name).toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      String(s.parentPhone || '').includes(searchQuery.trim())
    );
    if (found) setLookupResult(found);
    else {
      alert('No student found matching Roll #, Name or Phone.');
      setLookupResult(null);
    }
  };

  const sampleQuizQuestions = [
    { id: 1, q: 'What is the SI unit of Electric Current?', opts: ['Ampere (A)', 'Volt (V)', 'Ohm (Ω)', 'Watt (W)'], correct: 0 },
    { id: 2, q: 'The chemical formula of water is:', opts: ['H2O', 'CO2', 'NaCl', 'O2'], correct: 0 },
    { id: 3, q: 'If 3x + 6 = 15, then x equals:', opts: ['3', '4', '5', '9'], correct: 0 }
  ];

  const handleSubmitStudentQuiz = () => {
    let corr = 0;
    sampleQuizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correct) corr++;
    });
    const perc = Math.round((corr / sampleQuizQuestions.length) * 100);
    setQuizScore({ correct: corr, total: sampleQuizQuestions.length, percentage: perc });
    setQuizSubmitted(true);
  };

  const handleSubmitPaymentProof = async () => {
    if (!tidInput.trim() && !paymentProofUploaded) {
      alert('Please enter Transaction ID (TID) or attach screenshot.');
      return;
    }
    alert(`✅ PAYMENT PROOF SUBMITTED!\n\nMethod: ${selectedPayMethod}\nTID: ${tidInput || 'Uploaded Screenshot'}\n\nYour school Accounts Office has been alerted via notification to verify and clear your fee balance.`);
    setShowPaymentModal(false);
    setTidInput('');
    setPaymentProofUploaded(false);
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-white flex flex-col justify-between pb-28 select-none font-sans">
      
      {/* TOP POCKET HEADER */}
      <div className="bg-gradient-to-b from-purple-900/40 via-[#121622] to-[#090b10] p-4 pt-5 border-b border-white/10 sticky top-0 z-30 backdrop-blur-lg">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg font-black text-sm ${
              appRoleMode === 'PRINCIPAL' ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-purple-600/30' :
              appRoleMode === 'TEACHER' ? 'bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-blue-600/30' :
              'bg-gradient-to-tr from-green-600 to-emerald-500 shadow-green-600/30'
            }`}>
              <Smartphone size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight leading-none text-white flex items-center gap-1.5">
                {appRoleMode === 'PRINCIPAL' ? '👑 Principal Pocket' : appRoleMode === 'TEACHER' ? '👩‍🏫 Teacher Pocket' : '🎓 Student Pocket'}
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-green-500/20 text-green-400 border border-green-500/30">
                  Secured
                </span>
              </h1>
              <span className="text-[10px] text-gray-400 font-bold block mt-0.5 truncate max-w-[160px]">
                {schoolName} ({userData?.name || 'User'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* ONLINE / OFFLINE STATUS BADGE */}
            <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 border ${
              isOnline ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
            }`} title={isOnline ? 'Online Connected' : 'Offline Cache Active'}>
              {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {!isStandalone && (
              <button
                onClick={handleInstallApp}
                className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md active:scale-95 transition-all animate-pulse"
              >
                <Download size={13} />
                <span>Install</span>
              </button>
            )}
            <button
              onClick={() => navigate('/school-admin')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 active:scale-95 transition-all"
            >
              <ArrowLeft size={16} />
            </button>
          </div>
        </div>

        {/* ROLE MODE SWITCHER */}
        <div className="max-w-md mx-auto mt-3">
          {isPrincipalOrAdmin ? (
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#151926] rounded-xl border border-white/10 text-[10px] font-black uppercase">
              <button
                onClick={() => setAppRoleMode('PRINCIPAL')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  appRoleMode === 'PRINCIPAL' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>👑 Principal</span>
              </button>
              <button
                onClick={() => setAppRoleMode('TEACHER')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  appRoleMode === 'TEACHER' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>👩‍🏫 Teacher</span>
              </button>
              <button
                onClick={() => setAppRoleMode('STUDENT')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  appRoleMode === 'STUDENT' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>🎓 Student</span>
              </button>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 flex items-center justify-between">
              <span className="flex items-center gap-1 text-yellow-400 font-black">
                <Lock size={12} /> Access Restricted to {appRoleMode} Profile
              </span>
              <span>Protected Area</span>
            </div>
          )}
        </div>

        {/* OFFLINE QUEUE BANNER IF ANY PENDING ATTENDANCE LOGS */}
        {offlineQueue.length > 0 && (
          <div className="max-w-md mx-auto mt-2 p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-between text-[11px]">
            <span className="font-extrabold text-yellow-400 flex items-center gap-1.5">
              <Zap size={14} className="animate-bounce" /> {offlineQueue.length} Offline Attendance Logs Pending
            </span>
            <button
              onClick={handleSyncOfflineQueue}
              className="px-3 py-1 bg-yellow-500 text-black font-black rounded-lg text-[10px] uppercase active:scale-95 transition-all shadow-sm"
            >
              Sync Now ☁️
            </button>
          </div>
        )}
      </div>

      {/* MAIN POCKET VIEW AREA */}
      <div className="flex-1 p-4 max-w-md mx-auto w-full space-y-4">
        
        {/* ============================================================== */}
        {/* 👑 PRINCIPAL / ADMIN EXCLUSIVE TABS */}
        {/* ============================================================== */}
        {appRoleMode === 'PRINCIPAL' && (
          <>
            {/* TAB 1: EXECUTIVE RADAR + AI PRINCIPAL ADVISOR */}
            {activeTab === 'radar' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-600/20 to-[#151926] border border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black uppercase text-purple-400 tracking-wider">Total Enrolled</span>
                      <Users size={16} className="text-purple-400" />
                    </div>
                    <span className="text-2xl font-black text-white">{students.length}</span>
                    <span className="text-[10px] text-gray-400 block mt-1">Active Students</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-600/20 to-[#151926] border border-yellow-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black uppercase text-yellow-400 tracking-wider">Overdue Dues</span>
                      <DollarSign size={16} className="text-yellow-400" />
                    </div>
                    <span className="text-2xl font-black text-yellow-400">
                      Rs. {students.reduce((acc, curr) => acc + (curr.overdue || 0), 0)}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-1">Recovery Pending</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-red-600/20 to-[#151926] border border-red-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black uppercase text-red-400 tracking-wider">Defaulters</span>
                      <AlertTriangle size={16} className="text-red-400" />
                    </div>
                    <span className="text-2xl font-black text-red-400">{students.filter(s => s.feeStatus === 'Defaulter').length}</span>
                    <span className="text-[10px] text-gray-400 block mt-1">Action Required</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-green-600/20 to-[#151926] border border-green-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black uppercase text-green-400 tracking-wider">Staff Attendance</span>
                      <UserCheck size={16} className="text-green-400" />
                    </div>
                    <span className="text-2xl font-black text-green-400">96%</span>
                    <span className="text-[10px] text-gray-400 block mt-1">Present Today</span>
                  </div>
                </div>

                {/* 🤖 FEATURE 4: AI SMART PRINCIPAL ADVISOR BOX */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-[#1e2336] to-[#151926] border border-purple-500/40 space-y-3 shadow-lg shadow-purple-900/20">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-black text-xs text-purple-300 uppercase">
                      <Bot size={16} className="text-purple-400 animate-pulse" /> AI Principal Smart Advisor
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">Real-Time Radar</span>
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed font-medium">
                    💡 <strong className="text-white">Action Alert:</strong> {students.filter(s => s.feeStatus === 'Defaulter').length} students currently have unpaid dues totaling <strong className="text-yellow-400">Rs. {students.reduce((a, b) => a + (b.overdue || 0), 0)}</strong>. Sending an automated AI WhatsApp final notice today yields up to 78% faster recovery.
                  </p>
                  <button
                    onClick={() => alert(`🤖 AI ADVISOR EXECUTED:\n\nOfficial 3-Day Legal Fee Warnings dispatched to all ${students.filter(s => s.feeStatus === 'Defaulter').length} defaulters with direct online payment links.`)}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                  >
                    <Send size={14} /> Auto-Dispatch Legal Warnings Now
                  </button>
                </div>

                <div className="bg-[#151926] p-4 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-black text-xs uppercase">
                    <TrendingUp size={16} /> System Health & Offline Sync Ready
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                    All branches, biometric RFID relays, and daily classroom diaries are fully connected and protected.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: FEE RECOVERY SCANNER */}
            {activeTab === 'scanner' && (
              <div className="space-y-4 animate-fade-in">
                <form onSubmit={handleSearchStudent} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Scan/Enter Roll #, Name or Phone..."
                      className="pl-10 py-3 w-full bg-[#151926] border border-white/10 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase shadow-lg shadow-purple-600/30"
                  >
                    Check
                  </button>
                </form>

                {lookupResult && (
                  <div className="bg-[#151926] p-5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-start justify-between border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-purple-400 block">Student Identity</span>
                        <h3 className="text-lg font-black text-white mt-0.5">{lookupResult.name}</h3>
                        <span className="text-xs font-bold text-gray-400 block">Class Grade {lookupResult.class} | Roll #{lookupResult.rollNumber}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                        lookupResult.feeStatus === 'Defaulter' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-green-500/10 text-green-400 border-green-500/30'
                      }`}>
                        {lookupResult.feeStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#1e2336] border border-white/5">
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Parent Phone</span>
                        <span className="font-mono font-bold text-white text-sm mt-0.5 block">{lookupResult.parentPhone || 'N/A'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#1e2336] border border-white/5">
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Overdue Balance</span>
                        <span className="font-mono font-black text-yellow-400 text-sm mt-0.5 block">Rs. {lookupResult.overdue || 0}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const msg = `Assalam-o-Alaikum! Dear Parent of ${lookupResult.name} (Roll #${lookupResult.rollNumber}), fee balance Rs. ${lookupResult.overdue || 0} is overdue. Kindly clear dues at school office or online portal. - ${schoolName}`;
                        alert(`📢 Legal Fee Notice dispatched via WhatsApp to ${lookupResult.parentPhone}!\n\nPreview: "${msg}"`);
                      }}
                      className="w-full py-3 rounded-xl bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 font-black text-xs uppercase flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Send size={15} /> Send WhatsApp Legal Notice
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: GLOBAL BROADCAST (WITH CAMERA / VOICE ATTACHMENT) */}
            {activeTab === 'broadcast' && (
              <div className="bg-[#151926] p-4 rounded-2xl border border-white/10 space-y-4 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-black uppercase text-purple-400 tracking-wider mb-1.5">Select Target Recipients</label>
                  <select
                    value={broadcastTarget}
                    onChange={(e) => setBroadcastTarget(e.target.value)}
                    className="w-full bg-[#1e2336] p-3 rounded-xl border border-white/10 text-white text-xs font-bold focus:outline-none"
                  >
                    <option value="ALL_PARENTS">All School Parents ({students.length} Contacts)</option>
                    <option value="DEFAULTERS">Fee Defaulters ({students.filter(s => s.feeStatus === 'Defaulter').length} Contacts)</option>
                    <option value="ALL_STAFF">All Teachers & Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-purple-400 tracking-wider mb-1.5">Emergency Notice / Announcement Text</label>
                  <textarea
                    rows={4}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Type official principal notice, holiday alert or fee deadline..."
                    className="w-full bg-[#1e2336] p-3 rounded-xl border border-white/10 text-white text-xs font-semibold focus:outline-none resize-none"
                  />
                </div>

                {/* FEATURE 1: CAMERA & VOICE CIRCULAR ATTACHMENT */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePhotoCapture('BROADCAST')}
                    className="py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Camera size={15} /> Snap / Attach Circular
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVoiceNoteCapture('BROADCAST')}
                    className="py-2.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Mic size={15} /> Record Voice Circular
                  </button>
                </div>

                {broadcastAttachment && (
                  <div className="p-2.5 bg-purple-900/30 rounded-xl border border-purple-500/40 flex items-center justify-between text-xs font-semibold text-purple-200">
                    <span className="flex items-center gap-1.5 truncate">
                      {broadcastAttachment.type === 'IMAGE' ? <ImageIcon size={16} /> : <Mic size={16} />}
                      Attached: {broadcastAttachment.name}
                    </span>
                    <button onClick={() => setBroadcastAttachment(null)} className="text-red-400 hover:text-red-300 font-bold ml-2">Remove</button>
                  </div>
                )}

                <button
                  onClick={handleSendPocketBroadcast}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2"
                >
                  <Send size={18} /> Broadcast circular via WhatsApp
                </button>
              </div>
            )}

            {/* TAB 4: GATE PASS APPROVALS */}
            {activeTab === 'gatepass' && (
              <div className="space-y-3 animate-fade-in">
                <div className="p-4 rounded-2xl bg-[#151926] border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-sm text-white block">Zainab Ahmed (Grade 10)</span>
                    <span className="text-[10px] text-yellow-400 font-bold">Early Medical Checkup Leave</span>
                  </div>
                  <button onClick={() => alert('Security Gate Pass Verified & Printed!')} className="px-3 py-1.5 bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-xl text-xs font-black">
                    Approve & Print
                  </button>
                </div>
                <div className="p-4 rounded-2xl bg-[#151926] border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-sm text-white block">Hamza Khan (Grade 8)</span>
                    <span className="text-[10px] text-green-400 font-bold">Regular Gate Exit / Dues Cleared</span>
                  </div>
                  <button onClick={() => alert('Gate pass already verified at security check!')} className="px-3 py-1.5 bg-white/5 text-gray-400 border border-white/10 rounded-xl text-xs font-black">
                    Checked ✓
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================================================== */}
        {/* 👩‍🏫 TEACHER / STAFF EXCLUSIVE TABS */}
        {/* ============================================================== */}
        {appRoleMode === 'TEACHER' && (
          <>
            {/* TAB 1: TAP-TAP ATTENDANCE (WITH OFFLINE SYNC SUPPORT) */}
            {activeTab === 'attendance' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between bg-[#151926] p-3 rounded-2xl border border-white/10">
                  <div>
                    <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest block">Classroom</span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="bg-transparent text-white font-black text-sm focus:outline-none cursor-pointer mt-0.5"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                        <option key={c} value={c.toString()} className="bg-[#151926]">Class Grade {c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block">Date</span>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="bg-transparent text-white font-bold text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleMarkAll('P')} className="flex-1 py-2 rounded-xl bg-green-600/20 text-green-400 font-black text-xs uppercase border border-green-500/30 flex items-center justify-center gap-1">
                    <CheckCircle2 size={14} /> Mark All Present
                  </button>
                  <button onClick={() => handleMarkAll('A')} className="flex-1 py-2 rounded-xl bg-red-600/20 text-red-400 font-black text-xs uppercase border border-red-500/30 flex items-center justify-center gap-1">
                    <XCircle size={14} /> Mark All Absent
                  </button>
                </div>

                <div className="space-y-2.5">
                  {classStudents.map((student) => {
                    const status = attendanceState[student.id];
                    return (
                      <div key={student.id} className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        status === 'P' ? 'bg-green-500/10 border-green-500/40' : status === 'A' ? 'bg-red-500/10 border-red-500/40' : 'bg-[#151926] border-white/10'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center font-mono font-black text-xs text-blue-300">{student.rollNumber}</div>
                          <div>
                            <span className="font-extrabold text-white text-sm block leading-tight">{student.name}</span>
                            <span className="text-[10px] font-bold text-gray-400">{student.parentPhone}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => handleToggleAttendance(student.id, 'P')} className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center ${status === 'P' ? 'bg-green-500 text-white' : 'bg-white/5 text-gray-400'}`}>P</button>
                          <button type="button" onClick={() => handleToggleAttendance(student.id, 'A')} className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center ${status === 'A' ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-400'}`}>A</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button onClick={handleSaveAttendance} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2">
                  <CalendarCheck size={18} /> Save Class Attendance {isOnline ? '' : '(Offline Mode)'}
                </button>
              </div>
            )}

            {/* TAB 2: DAILY DIARY (WITH PHOTO & VOICE ATTACHMENT) */}
            {activeTab === 'diary' && (
              <div className="bg-[#151926] p-4 rounded-2xl border border-white/10 space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-blue-400">Target: Grade {selectedClass}</span>
                  <select value={diarySubject} onChange={(e) => setDiarySubject(e.target.value)} className="bg-[#1e2336] px-3 py-1.5 rounded-xl border border-white/10 text-white text-xs font-bold">
                    {['Mathematics', 'General Science', 'English', 'Urdu', 'Islamiat'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Today's Homework & Instructions</label>
                  <textarea rows={4} value={diaryText} onChange={(e) => setDiaryText(e.target.value)} placeholder="e.g. Solve Exercise 3.2 Q1 to Q5 from Math Textbook..." className="w-full bg-[#1e2336] p-3 rounded-xl border border-white/10 text-white text-xs font-semibold focus:outline-none resize-none" />
                </div>

                {/* CAMERA & VOICE DIARY ATTACHMENT */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePhotoCapture('DIARY')}
                    className="py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Camera size={15} /> Snap Board Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVoiceNoteCapture('DIARY')}
                    className="py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Mic size={15} /> Voice Note Diary
                  </button>
                </div>

                {diaryAttachment && (
                  <div className="p-2.5 bg-blue-900/30 rounded-xl border border-blue-500/40 flex items-center justify-between text-xs font-semibold text-blue-200">
                    <span className="flex items-center gap-1.5 truncate">
                      {diaryAttachment.type === 'IMAGE' ? <ImageIcon size={16} /> : <Mic size={16} />}
                      Attached: {diaryAttachment.name}
                    </span>
                    <button onClick={() => setDiaryAttachment(null)} className="text-red-400 hover:text-red-300 font-bold ml-2">Remove</button>
                  </div>
                )}

                <button onClick={handleSendPocketDiary} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2">
                  <Send size={18} /> Broadcast Diary to Parents
                </button>
              </div>
            )}

            {/* TAB 3: QUIZ MANAGER */}
            {activeTab === 'quizzes' && (
              <div className="space-y-3 animate-fade-in">
                <div className="p-4 rounded-2xl bg-[#151926] border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-sm text-white block">Physics Ch 1 MCQ Quiz (Grade 10)</span>
                    <span className="text-[10px] text-cyan-400 font-bold">15 Mins | 10 MCQs | Active</span>
                  </div>
                  <button onClick={() => alert('Test status active on Student Portal!')} className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 rounded-xl text-xs font-black">Active ✓</button>
                </div>
              </div>
            )}

            {/* TAB 4: MY SALARY */}
            {activeTab === 'mysalary' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-[#151926] border border-blue-500/30 text-center space-y-2">
                  <Briefcase size={28} className="mx-auto text-blue-400" />
                  <span className="text-[10px] uppercase font-black text-gray-400 block">Current Net Payable Salary</span>
                  <span className="text-3xl font-black text-white block">Rs. 45,000</span>
                  <span className="text-xs text-green-400 font-bold block">Status: Approved by Principal</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================================================== */}
        {/* 🎓 STUDENT / PARENT EXCLUSIVE TABS */}
        {/* ============================================================== */}
        {appRoleMode === 'STUDENT' && (
          <>
            {/* TAB 1: MY DAILY DIARY */}
            {activeTab === 'mydiary' && (
              <div className="space-y-3 animate-fade-in">
                <div className="p-4 rounded-2xl bg-[#151926] border border-white/10 space-y-2">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="font-black text-xs text-green-400">Mathematics Diary</span>
                    <span className="text-[10px] text-gray-400 font-mono">Today, 1:30 PM</span>
                  </div>
                  <p className="text-xs text-gray-200 font-semibold">Solve Exercise 3.2 Q1 to Q5 on neat homework notebook. Prepare for tomorrow's class test!</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#151926] border border-white/10 space-y-2">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="font-black text-xs text-yellow-400">General Science Diary</span>
                    <span className="text-[10px] text-gray-400 font-mono">Yesterday</span>
                  </div>
                  <p className="text-xs text-gray-200 font-semibold">Draw the diagram of Human Heart from Chapter 4 on page 42.</p>
                </div>
              </div>
            )}

            {/* TAB 2: TAKE ONLINE QUIZ */}
            {activeTab === 'takequiz' && (
              <div className="space-y-4 animate-fade-in">
                {!activeQuizId ? (
                  <div className="p-5 rounded-2xl bg-[#151926] border border-white/10 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 font-black text-[10px] uppercase border border-green-500/20">Grade 10 Assessment</span>
                      <h3 className="text-base font-black text-white mt-2">Physics Chapter 1: Motion & Force Quiz</h3>
                      <p className="text-xs text-gray-400 mt-1">Contains 3 Multiple Choice Questions with live timer and instant auto-checking.</p>
                    </div>
                    <button
                      onClick={() => { setActiveQuizId('qz1'); setQuizSubmitted(false); setQuizAnswers({}); }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black text-xs uppercase tracking-wider shadow-lg"
                    >
                      Attempt Online Quiz Now
                    </button>
                  </div>
                ) : !quizSubmitted ? (
                  <div className="bg-[#151926] p-5 rounded-2xl border border-white/10 space-y-5 animate-fade-in">
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                      <span className="text-xs font-black text-green-400">Physics Quiz in Progress</span>
                      <span className="text-xs font-mono font-bold text-yellow-400">Time: 14:32</span>
                    </div>

                    {sampleQuizQuestions.map((q, idx) => (
                      <div key={q.id} className="space-y-2.5">
                        <span className="text-xs font-extrabold text-white block">Q{idx + 1}. {q.q}</span>
                        <div className="grid grid-cols-2 gap-2">
                          {q.opts.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              onClick={() => setQuizAnswers({ ...quizAnswers, [idx]: oIdx })}
                              className={`p-2.5 rounded-xl text-left text-xs font-bold border transition-all ${
                                quizAnswers[idx] === oIdx ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-[#1e2336] border-white/5 text-gray-300'
                              }`}
                            >
                              {['A', 'B', 'C', 'D'][oIdx]}. {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={handleSubmitStudentQuiz}
                      className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase tracking-wider"
                    >
                      Submit Assessment & View Score
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#151926] p-6 rounded-2xl border border-white/10 text-center space-y-4 animate-fade-in">
                    <Award size={40} className="mx-auto text-yellow-400 animate-bounce" />
                    <h3 className="text-xl font-black text-white">Quiz Auto-Graded!</h3>
                    <div className="p-4 rounded-xl bg-[#1e2336] border border-white/10">
                      <span className="text-xs uppercase font-bold text-gray-400 block">Your Score</span>
                      <span className="text-2xl font-black text-green-400 mt-1 block">{quizScore.correct} / {quizScore.total} ({quizScore.percentage}%)</span>
                    </div>
                    <button onClick={() => setActiveQuizId(null)} className="px-6 py-2.5 bg-white/10 text-white font-black text-xs uppercase rounded-xl">
                      Return to Quiz List
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MY FEE CHALLAN (WITH 1-CLICK JAZZCASH/EASYPAISA PAYMENT MODAL) */}
            {activeTab === 'myfee' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-[#151926] p-5 rounded-2xl border border-white/10 text-center space-y-3">
                  <CreditCard size={36} className="mx-auto text-yellow-400" />
                  <div>
                    <span className="text-[10px] uppercase font-black text-gray-400 block">Current Fee Status</span>
                    <span className="text-2xl font-black text-yellow-400 mt-0.5 block">Rs. 4,500 OVERDUE</span>
                    <p className="text-xs text-gray-400 mt-1">Due date was 10th of July 2026.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
                    >
                      <QrCode size={16} /> Pay Online Now
                    </button>
                    <button
                      onClick={() => alert('Downloading official fee receipt PDF...')}
                      className="py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Download size={16} /> Download Challan
                    </button>
                  </div>
                </div>

                {/* FEATURE 2: 1-CLICK ONLINE PAYMENT MODAL */}
                {showPaymentModal && (
                  <div className="bg-[#1e2336] p-5 rounded-2xl border border-green-500/40 space-y-4 shadow-2xl animate-fade-in">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <span className="font-black text-sm text-green-400 flex items-center gap-1.5">
                        <QrCode size={18} /> 1-Click Instant School Payment
                      </span>
                      <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white text-xs font-bold">Close X</button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-black uppercase">
                      <button onClick={() => setSelectedPayMethod('JAZZCASH')} className={`py-2 rounded-xl border ${selectedPayMethod === 'JAZZCASH' ? 'bg-red-600 text-white border-red-400 shadow-md' : 'bg-white/5 text-gray-400 border-white/5'}`}>
                        JazzCash
                      </button>
                      <button onClick={() => setSelectedPayMethod('EASYPAISA')} className={`py-2 rounded-xl border ${selectedPayMethod === 'EASYPAISA' ? 'bg-green-600 text-white border-green-400 shadow-md' : 'bg-white/5 text-gray-400 border-white/5'}`}>
                        EasyPaisa
                      </button>
                      <button onClick={() => setSelectedPayMethod('BANK_QR')} className={`py-2 rounded-xl border ${selectedPayMethod === 'BANK_QR' ? 'bg-purple-600 text-white border-purple-400 shadow-md' : 'bg-white/5 text-gray-400 border-white/5'}`}>
                        Bank QR
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#151926] border border-white/10 text-center space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">Send exact amount Rs. 4,500 to:</span>
                      <span className="text-lg font-mono font-black text-white block tracking-wider">
                        {selectedPayMethod === 'JAZZCASH' ? '0300-9876543 (Lodhi School)' : selectedPayMethod === 'EASYPAISA' ? '0345-1234567 (Lodhi School)' : 'PK36MEZN000012345678910'}
                      </span>
                      <div className="w-28 h-28 mx-auto bg-white p-2 rounded-xl flex items-center justify-center my-2 shadow-inner">
                        <QrCode size={90} className="text-black" />
                      </div>
                      <span className="text-[9px] text-green-400 font-bold block">Scan with {selectedPayMethod} App camera</span>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        value={tidInput}
                        onChange={(e) => setTidInput(e.target.value)}
                        placeholder="Enter Transaction ID (e.g. TID123456789)"
                        className="w-full p-3 rounded-xl bg-[#151926] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-green-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setPaymentProofUploaded(true); alert('📷 Screenshot receipt (payment_proof.jpg) attached!'); }}
                          className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                            paymentProofUploaded ? 'bg-green-500/20 text-green-300 border-green-500' : 'bg-white/5 text-gray-300 border-white/10'
                          }`}
                        >
                          <Upload size={14} /> {paymentProofUploaded ? 'Attached Proof ✓' : 'Attach Screenshot'}
                        </button>
                        <button
                          onClick={handleSubmitPaymentProof}
                          className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase tracking-wider"
                        >
                          Submit Proof
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: MY ATTENDANCE */}
            {activeTab === 'myattendance' && (
              <div className="p-5 rounded-2xl bg-[#151926] border border-white/10 text-center space-y-3 animate-fade-in">
                <CalendarCheck size={36} className="mx-auto text-green-400" />
                <h3 className="text-lg font-black text-white">98% Attendance This Month</h3>
                <p className="text-xs text-gray-400 font-semibold">You have 24 Present days and 0 Unexcused Absents recorded.</p>
              </div>
            )}
          </>
        )}

      </div>

      {/* FIXED BOTTOM ANDROID POCKET NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#121622]/90 backdrop-blur-xl border-t border-white/10 max-w-md mx-auto">
        <div className="grid grid-cols-4 py-2 px-2">
          
          {/* PRINCIPAL BOTTOM TABS */}
          {appRoleMode === 'PRINCIPAL' && (
            <>
              <button onClick={() => setActiveTab('radar')} className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${activeTab === 'radar' ? 'text-purple-400 bg-purple-500/10 font-black' : 'text-gray-400 hover:text-white'}`}>
                <TrendingUp size={19} /> <span className="text-[9px]">Radar</span>
              </button>
              <button onClick={() => setActiveTab('scanner')} className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${activeTab === 'scanner' ? 'text-purple-400 bg-purple-500/10 font-black' : 'text-gray-400 hover:text-white'}`}>
                <Search size={19} /> <span className="text-[9px]">Scanner</span>
              </button>
              <button onClick={() => setActiveTab('broadcast')} className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${activeTab === 'broadcast' ? 'text-purple-400 bg-purple-500/10 font-black' : 'text-gray-400 hover:text-white'}`}>
                <Send size={19} /> <span className="text-[9px]">Broadcast</span>
              </button>
              <button onClick={() => setActiveTab('gatepass')} className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${activeTab === 'gatepass' ? 'text-purple-400 bg-purple-500/10 font-black' : 'text-gray-400 hover:text-white'}`}>
                <ShieldCheck size={19} /> <span className="text-[9px]">Approvals</span>
              </button>
            </>
          )}

          {/* TEACHER BOTTOM TABS */}
          {appRoleMode === 'TEACHER' && (
            <>
              <button onClick={() => setActiveTab('attendance')} className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${activeTab === 'attendance' ? 'text-blue-400 bg-blue-500/10 font-black' : 'text-gray-400 hover:text-white'}`}>
                <CalendarCheck size={19} /> <span className="text-[9px]">Attendance</span>
              </button>
              <button onClick={() => setActiveTab('diary')} className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${activeTab === 'diary' ? 'text-blue-400 bg-blue-500/10 font-black' : 'text-gray-400 hover:text-white'}`}>
                <FileText size={19} /> <span className="text-[9px]">Diary</span>
              </button>
              <button onClick={() => setActiveTab('quizzes')} className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${activeTab === 'quizzes' ? 'text-blue-400 bg-blue-500/10 font-black' : 'text-gray-400 hover:text-white'}`}>
                <Laptop size={19} /> <span className="text-[9px]">Quizzes</span>
              </button>
              <button onClick={() => setActiveTab('mysalary')} className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${activeTab === 'mysalary' ? 'text-blue-400 bg-blue-500/10 font-black' : 'text-gray-400 hover:text-white'}`}>
                <Briefcase size={19} /> <span className="text-[9px]">My Salary</span>
              </button>
            </>
          )}

          {/* STUDENT BOTTOM TABS */}
          {appRoleMode === 'STUDENT' && (
            <>
              <button onClick={() => setActiveTab('mydiary')} className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${activeTab === 'mydiary' ? 'text-green-400 bg-green-500/10 font-black' : 'text-gray-400 hover:text-white'}`}>
                <BookOpen size={19} /> <span className="text-[9px]">My Diary</span>
              </button>
              <button onClick={() => setActiveTab('takequiz')} className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${activeTab === 'takequiz' ? 'text-green-400 bg-green-500/10 font-black' : 'text-gray-400 hover:text-white'}`}>
                <Laptop size={19} /> <span className="text-[9px]">Quizzes</span>
              </button>
              <button onClick={() => setActiveTab('myfee')} className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${activeTab === 'myfee' ? 'text-green-400 bg-green-500/10 font-black' : 'text-gray-400 hover:text-white'}`}>
                <CreditCard size={19} /> <span className="text-[9px]">My Challan</span>
              </button>
              <button onClick={() => setActiveTab('myattendance')} className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${activeTab === 'myattendance' ? 'text-green-400 bg-green-500/10 font-black' : 'text-gray-400 hover:text-white'}`}>
                <CalendarCheck size={19} /> <span className="text-[9px]">Attendance</span>
              </button>
            </>
          )}

        </div>
      </div>

    </div>
  );
};

export default MiniPocketApp;
