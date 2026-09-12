import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ShieldCheck, LogOut, History, Users, Settings, Languages, Fingerprint, Lock, AlertCircle, Scan, User, CheckCircle, X, Clock, Key, CameraIcon, Briefcase, UserPlus, RefreshCcw, Search, ArrowRight, FileDown, Zap, Target, Cpu, Activity, Database, ShieldAlert, Layers, Wifi, WifiOff, Calendar, Menu, FileText, Shield, Info, ExternalLink, ChevronRight, Mail } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import { db, auth } from './services/firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, getDocs, doc, query, where, addDoc, orderBy, limit, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { App as CapApp } from '@capacitor/app';

const MODEL_URL = '/models/';

export default function App() {
  // --- STATE MANAGEMENT ---
  const [schoolData, setSchoolData] = useState(null);
  const [appMode, setAppMode] = useState('scan'); // 'scan', 'auth', 'enroll', 'history'
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [users, setUsers] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user');

  // Pre-login Menu & Policy Modal states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'privacy' | 'terms' | 'dataSafety' | 'about' | null

  // Connectivity & Offline Sync
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState(() => {
    const saved = localStorage.getItem('attendance_queue');
    return saved ? JSON.parse(saved) : [];
  });

  // Battery & Performance
  const [isIdle, setIsIdle] = useState(false);
  const lastActiveTime = useRef(Date.now());

  // History & Filters
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form & Registration states
  const [loginForm, setLoginForm] = useState({ idNumber: '', password: '' });
  const [isBusy, setIsBusy] = useState(false);
  const [enrollStep, setEnrollStep] = useState(0);
  const [regUser, setRegUser] = useState(null);
  const [searchId, setSearchId] = useState('');
  const [searchRole, setSearchRole] = useState('student');
  const [error, setError] = useState(null);

  // Language Strings
  const t = {
    en: {
      history: "Attendance Log",
      noLogs: "No logs found for this date",
      present: "Present",
      syncing: "Syncing records...",
      offline: "Offline Mode",
      online: "Online",
      verified: "VERIFIED",
      appTitle: "TaleemiDunya AI",
      idNumber: "School ID",
      password: "Password",
      enroll: "Bio-Capture",
      student: "Student",
      staff: "Staff",
      searching: "Searching...",
      confirm: "Confirm",
      exit: "Exit",
      security: "Security Check",
      authenticate: "Authenticate",
      cancel: "Cancel",
      dataSecured: "DATA SECURED",
      finish: "Finish & Scan"
    },
    ur: {
      history: "حاضری کا ریکارڈ",
      noLogs: "اس تاریخ کا کوئی ریکارڈ نہیں ملا",
      present: "حاضر",
      syncing: "ریکارڈ سنک ہو رہے ہیں...",
      offline: "آف لائن موڈ",
      online: "آن لائن",
      verified: "تصدیق شدہ",
      appTitle: "تعلیمی دنیا AI",
      idNumber: "اسکول آئی ڈی",
      password: "پاس ورڈ",
      enroll: "بایومیٹرک رجسٹریشن",
      student: "طالب علم",
      staff: "اسٹاف",
      searching: "تلاش جاری ہے...",
      confirm: "تصدیق کریں",
      exit: "باہر نکلیں",
      security: "سیکیورٹی چیک",
      authenticate: "تصدیق کریں",
      cancel: "کینسل",
      dataSecured: "ڈیٹا محفوظ ہو گیا",
      finish: "ختم کریں"
    }
  };

  const [lang, setLang] = useState('en');
  const currentLang = t[lang];

  // Refs for logic
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const lastScanTime = useRef(0);
  const lastScannedId = useRef(null);
  const requestRef = useRef();
  const isProcessingRef = useRef(false);

  // --- VOICE FEEDBACK ---
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'en' ? 'en-US' : 'ur-PK';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // --- CONNECTIVITY & SYNC ---
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

  useEffect(() => {
    localStorage.setItem('attendance_queue', JSON.stringify(syncQueue));
    if (isOnline && syncQueue.length > 0 && !isBusy) {
      const timer = setTimeout(processQueue, 2000);
      return () => clearTimeout(timer);
    }
  }, [syncQueue, isOnline]);

  const processQueue = async () => {
    if (syncQueue.length === 0) return;
    setIsBusy(true);
    const item = syncQueue[0];
    try {
      await addDoc(collection(db, 'attendance'), {
        ...item,
        timestamp: serverTimestamp()
      });
      setSyncQueue(prev => prev.slice(1));
    } catch (e) {
      console.error("Queue process error", e);
    } finally {
      setIsBusy(false);
    }
  };

  const markAttendance = async (user) => {
    const todayDate = new Date().toISOString().split('T')[0];
    const record = {
      schoolId: schoolData.idNumber || schoolData.id,
      schoolDocId: schoolData.id || schoolData.idNumber,
      studentId: user.id,
      studentName: user.name || user.studentName || 'Student',
      rollNo: user.rollNo || user.rollNumber || user.idNumber || '-',
      class: user.class || '-',
      role: user.role || user.collectionName || 'student',
      date: todayDate,
      status: 'Present',
      localTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // INSTANT LOCAL STATE UPDATE so Attendance Log shows record immediately!
    setAttendanceHistory(prev => [record, ...prev.filter(r => (r.studentId !== record.studentId || r.date !== record.date))]);

    if (isOnline) {
      try {
        await addDoc(collection(db, 'attendance'), { ...record, timestamp: serverTimestamp() });
      } catch (e) {
        console.warn("Firestore save fallback to queue:", e);
        setSyncQueue(prev => [...prev, record]);
      }
    } else {
      setSyncQueue(prev => [...prev, record]);
    }

    const voiceMsg = lang === 'en' ? `${record.studentName}, present.` : `${record.studentName}, حاضر ہے۔`;
    speak(voiceMsg);
  };

  // --- CORE INITIALIZATION ---
  useEffect(() => {
    const saved = localStorage.getItem('linked_school');
    if (saved) setSchoolData(JSON.parse(saved));

    const bootEngine = async () => {
      try {
        try {
          if (!auth.currentUser) await signInAnonymously(auth);
        } catch (authErr) {
          console.warn("Anonymous Auth notice:", authErr);
        }

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (e) {
        console.error("AI Boot Error", e);
        setError("AI Engine Error: " + (e.message || "Models failed to load."));
      } finally {
        setIsInitializing(false);
      }
    };
    bootEngine();
  }, []);

  // --- DATA SYNC ---
  const syncData = useCallback(async () => {
    if (!schoolData?.id) return;
    try {
      const idsToTry = [
        schoolData.id,
        schoolData.idNumber,
        !isNaN(parseInt(schoolData.idNumber)) ? parseInt(schoolData.idNumber) : null
      ].filter(Boolean);

      let finalDocs = [];
      const collectionsToSync = ['students', 'staff', 'teachers', 'users'];

      for (const collName of collectionsToSync) {
        for (const sId of idsToTry) {
          if (!sId) continue;
          try {
            const q = query(collection(db, collName), where('schoolId', '==', sId));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const docs = snap.docs.map(d => ({ id: d.id, collectionName: collName, ...d.data() }));
              finalDocs = [...finalDocs, ...docs];
            }
          } catch (err) {
            console.warn(`Sync error for ${collName}`, err);
          }
        }
      }

      const uniqueDocs = Array.from(new Map(finalDocs.map(item => [item.id, item])).values());
      setUsers(uniqueDocs);
    } catch (e) { console.error("Sync error", e); }
  }, [schoolData]);

  useEffect(() => { if (schoolData) syncData(); }, [schoolData, syncData]);

  const enrolledUsers = useMemo(() => {
    return users.filter(u => u.faceDescriptor && Array.isArray(u.faceDescriptor) && u.faceDescriptor.length > 0);
  }, [users]);

  const matcher = useMemo(() => {
    const labeled = enrolledUsers.map(u => {
       return new faceapi.LabeledFaceDescriptors(u.id, [new Float32Array(u.faceDescriptor)]);
    });
    return labeled.length ? new faceapi.FaceMatcher(labeled, 0.60) : null;
  }, [enrolledUsers]);

  const fetchHistory = async () => {
    if (!schoolData) return;
    setHistoryLoading(true);
    try {
      const idsToTry = [
        schoolData.idNumber,
        schoolData.id,
        !isNaN(parseInt(schoolData.idNumber)) ? parseInt(schoolData.idNumber) : null
      ].filter(Boolean);

      let firestoreDocs = [];
      for (const sId of idsToTry) {
        try {
          const q = query(
            collection(db, 'attendance'),
            where('schoolId', '==', sId),
            where('date', '==', historyDate)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            firestoreDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            break;
          }
        } catch (e) {
          console.warn("History fetch warning:", e);
        }
      }

      // Merge local unsynced queue items for this date
      const queuedDocs = syncQueue.filter(item => item.date === historyDate);
      const combined = [...attendanceHistory, ...queuedDocs, ...firestoreDocs];
      const uniqueDocs = Array.from(new Map(combined.map(item => [(item.studentId || item.id) + '_' + item.date, item])).values());

      setAttendanceHistory(uniqueDocs);
    } catch (err) { console.error(err); }
    finally { setHistoryLoading(false); }
  };

  useEffect(() => { if (appMode === 'history') fetchHistory(); }, [appMode, historyDate]);

  // --- HARDWARE CAMERA ENGINE ---
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  };

  const startCamera = async () => {
    if (!schoolData || isInitializing) return;
    stopCamera();
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: 640, height: 480 }
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => setIsCameraReady(true)).catch(e => console.error(e));
        };
      }
    } catch (e) { setError("Camera fail: Check permissions"); }
  };

  useEffect(() => {
    if (appMode === 'scan' || (appMode === 'enroll' && enrollStep === 2)) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [appMode, enrollStep, cameraFacing, isInitializing, !!schoolData]);

  // --- HIGH-SPEED SCAN LOGIC ---
  const autoResetScan = useCallback(() => {
    if (scanResult) {
      const timer = setTimeout(() => setScanResult(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [scanResult]);
  useEffect(autoResetScan, [autoResetScan]);

  const runLoop = async () => {
    if (appMode !== 'scan' || !videoRef.current || !canvasRef.current || !modelsLoaded || !isCameraReady || scanResult || isProcessingRef.current) {
      requestRef.current = requestAnimationFrame(runLoop);
      return;
    }

    const video = videoRef.current;
    if (video.readyState === 4) {
      isProcessingRef.current = true;
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      if (canvasRef.current.width !== displaySize.width) faceapi.matchDimensions(canvasRef.current, displaySize);

      try {
        // FAST 128x128 Input Tensor Size for ULTRA-FAST 30+ FPS Frame Rate!
        const d = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.4 })
        ).withFaceLandmarks().withFaceDescriptor();

        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (d) {
          lastActiveTime.current = Date.now();
          if (isIdle) setIsIdle(false);

          const res = faceapi.resizeResults(d, displaySize);
          ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 4;
          ctx.strokeRect(res.detection.box.x, res.detection.box.y, res.detection.box.width, res.detection.box.height);

          const now = Date.now();
          if (matcher && now - lastScanTime.current > 200) { // ULTRA-FAST 200ms scan response!
            const match = matcher.findBestMatch(d.descriptor);
            if (match.label !== 'unknown') {
              if (lastScannedId.current === match.label && now - lastScanTime.current < 10000) {
                // Cooldown
              } else {
                const user = users.find(u => u.id === match.label);
                if (user) {
                  lastScannedId.current = user.id;
                  lastScanTime.current = now;
                  setScanResult({ ...user, time: new Date().toLocaleTimeString() });
                  new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3').play().catch(()=>{});
                  markAttendance(user);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("Scan loop error", e);
      } finally {
        isProcessingRef.current = false;
      }
    }
    requestRef.current = requestAnimationFrame(runLoop);
  };

  useEffect(() => {
    if (appMode === 'scan' && modelsLoaded && isCameraReady && !scanResult) {
      requestRef.current = requestAnimationFrame(runLoop);
      return () => cancelAnimationFrame(requestRef.current);
    }
  }, [appMode, modelsLoaded, isCameraReady, !!scanResult, users, isIdle]);

  // --- APP ACTIONS ---
  const handleLogout = () => {
    localStorage.removeItem('linked_school');
    setSchoolData(null); setAppMode('scan'); window.location.reload();
  };

  const handleEnrollSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchId) return;
    setIsBusy(true); setError(null);
    try {
      const searchVal = searchId.trim();
      const searchValNum = !isNaN(parseInt(searchVal)) ? parseInt(searchVal) : null;
      const schoolIds = [
        schoolData.id,
        schoolData.idNumber,
        !isNaN(parseInt(schoolData.idNumber)) ? parseInt(schoolData.idNumber) : null
      ].filter(Boolean);

      const collectionsToCheck = searchRole === 'staff'
        ? ['staff', 'teachers', 'users', 'students']
        : ['students', 'users', 'staff'];

      const fieldsToCheck = [
        'rollNumber', 'rollNo', 'roll_no', 'roll',
        'idNumber', 'id', 'studentId', 'staffId', 'empId', 'employeeId',
        'admissionNo', 'admission_no', 'admissionNumber',
        'cnic', 'bForm'
      ];

      let foundDoc = null;

      // 1. Search within linked school
      for (const collName of collectionsToCheck) {
        for (const sId of schoolIds) {
          const queries = [];
          for (const field of fieldsToCheck) {
            queries.push(query(collection(db, collName), where('schoolId', '==', sId), where(field, '==', searchVal)));
            if (searchValNum !== null) {
              queries.push(query(collection(db, collName), where('schoolId', '==', sId), where(field, '==', searchValNum)));
            }
          }

          const snapshots = await Promise.all(queries.map(q => getDocs(q).catch(() => ({ empty: true, docs: [] }))));
          const match = snapshots.find(s => !s.empty);
          if (match) {
            foundDoc = { id: match.docs[0].id, targetColl: collName, ...match.docs[0].data() };
            break;
          }
        }
        if (foundDoc) break;
      }

      // 2. Global Fallback Search (diagnose if record is under a different schoolId or missing schoolId)
      if (!foundDoc) {
        for (const collName of collectionsToCheck) {
          const globalQueries = [];
          for (const field of fieldsToCheck) {
            globalQueries.push(query(collection(db, collName), where(field, '==', searchVal)));
            if (searchValNum !== null) {
              globalQueries.push(query(collection(db, collName), where(field, '==', searchValNum)));
            }
          }

          const globalSnapshots = await Promise.all(globalQueries.map(q => getDocs(q).catch(() => ({ empty: true, docs: [] }))));
          const globalMatch = globalSnapshots.find(s => !s.empty);

          if (globalMatch) {
            const data = globalMatch.docs[0].data();
            setError(`RECORD EXISTS IN FIREBASE BUT WITH SCHOOL ID: "${data.schoolId || 'None'}". CURRENT SCHOOL ID IS "${schoolData.idNumber}".`);
            setIsBusy(false);
            return;
          }
        }
      }

      if (foundDoc) {
        setRegUser(foundDoc);
        setEnrollStep(1);
      } else {
        setError(`RECORD NOT FOUND FOR ID "${searchVal}" IN SCHOOL ${schoolData.idNumber}.`);
      }
    } catch (e) {
      console.error(e);
      setError("Sync Error: " + e.message);
    }
    finally { setIsBusy(false); }
  };

  const captureEnroll = async () => {
    setIsBusy(true);
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => {});
      }

      const d = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })).withFaceLandmarks().withFaceDescriptor();
      if (!d) throw new Error("Face not detected. Please align face clearly in frame.");
      const canv = document.createElement('canvas'); canv.width = 400; canv.height = 400;
      canv.getContext('2d').drawImage(videoRef.current, (videoRef.current.videoWidth-400)/2, (videoRef.current.videoHeight-400)/2, 400, 400, 0, 0, 400, 400);
      const b64 = canv.toDataURL('image/jpeg', 0.6);
      const targetCollection = regUser.targetColl || 'students';
      const updatedDescriptor = Array.from(d.descriptor);

      // 1. Update Firestore Document with faceScanPhoto (to preserve ID Card profilePhoto)
      await updateDoc(doc(db, targetCollection, regUser.id), {
        faceDescriptor: updatedDescriptor,
        faceScanPhoto: b64,
        isFaceRegistered: true
      });

      // 2. INSTANT RAM UPDATE: Update user profile in local memory immediately!
      const updatedUserObj = { ...regUser, faceDescriptor: updatedDescriptor, faceScanPhoto: b64, isFaceRegistered: true };
      setUsers(prev => {
        const exists = prev.some(u => u.id === regUser.id);
        if (exists) {
          return prev.map(u => u.id === regUser.id ? updatedUserObj : u);
        } else {
          return [...prev, updatedUserObj];
        }
      });

      setEnrollStep(4);
      syncData();

      // AUTO SWITCH TO SCAN MODE IN 1 SEC ON SUCCESS
      setTimeout(() => {
        setEnrollStep(0);
        setAppMode('scan');
      }, 1000);

    } catch (e) {
      console.error("Capture Enroll Error", e);
      if (e.message?.toLowerCase().includes("permission") || e.code === "permission-denied") {
        alert("FIREBASE PERMISSION ERROR!\n\nFirestore Rules in Firebase Console are blocking WRITE access to '" + (regUser?.targetColl || 'students') + "' collection.\n\nTO FIX:\n1. Go to Firebase Console (project: taleemidunya-pro-ed44e)\n2. Open Firestore Database -> Rules\n3. Update rules to: allow read, write: if true;");
      } else {
        alert(e.message || "Enrollment failed.");
      }
    }
    finally { setIsBusy(false); }
  };

  if (isInitializing) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-12 text-center">
       <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6" />
       <p className="text-cyan-500 font-black text-xs uppercase tracking-[0.5em] animate-pulse">Initializing AI Engine...</p>
    </div>
  );

  if (!schoolData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col text-white relative font-sans overflow-hidden">
        {/* Top Navigation Bar on Login Screen */}
        <div className="h-16 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md border-b border-white/10 z-40">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-95 text-cyan-400"
          >
            <Menu size={20} />
            <span className="text-xs font-black uppercase tracking-wider">{currentLang.menu || "Menu"}</span>
          </button>

          <div className="flex items-center gap-2">
            <Zap size={18} className="text-cyan-400 fill-current" />
            <span className="font-black text-sm uppercase tracking-tight">{currentLang.appTitle}</span>
          </div>

          <button
            onClick={() => setLang(l => l === 'en' ? 'ur' : 'en')}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-black text-xs border border-white/10 text-cyan-400"
          >
            {lang === 'en' ? 'UR' : 'EN'}
          </button>
        </div>

        {/* Login Form Container */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
          <ShieldCheck size={72} className="text-cyan-500 mb-6 drop-shadow-[0_0_25px_rgba(6,182,212,0.6)] animate-pulse"/>
          <h1 className="text-3xl font-black uppercase mb-2 tracking-tight">{currentLang.appTitle}</h1>
          <p className="text-xs text-white/40 uppercase tracking-[0.3em] font-bold mb-8">AI Attendance System</p>

          <form onSubmit={async (e)=>{
            e.preventDefault(); setIsBusy(true); setError(null);
            try {
              const q = query(collection(db, 'schools'), where('idNumber', '==', loginForm.idNumber.trim()));
              const snap = await getDocs(q);
              if (!snap.empty && snap.docs[0].data().password === loginForm.password) {
                 const d = { id: snap.docs[0].id, ...snap.docs[0].data() };
                 setSchoolData(d); localStorage.setItem('linked_school', JSON.stringify(d)); setAppMode('scan');
              } else setError("Invalid ID or Password");
            } catch(e){ setError("Connection failed"); }
            finally { setIsBusy(false); }
          }} className="w-full max-w-sm space-y-4">
            <input className="w-full bg-black/50 p-5 rounded-2xl outline-none border border-white/10 focus:border-cyan-500 font-black text-center text-lg placeholder:text-white/20" value={loginForm.idNumber} onChange={e=>setLoginForm({...loginForm, idNumber:e.target.value})} placeholder={currentLang.idNumber} />
            <input className="w-full bg-black/50 p-5 rounded-2xl outline-none border border-white/10 focus:border-cyan-500 font-black text-center text-lg placeholder:text-white/20" type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm, password:e.target.value})} placeholder={currentLang.password} />
            <button className="w-full bg-cyan-600 hover:bg-cyan-500 py-5 rounded-2xl font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all">{isBusy ? "..." : "Activate Account"}</button>
            {error && <p className="text-red-500 text-xs font-black mt-2 uppercase animate-bounce">{error}</p>}
          </form>

          {/* Policy Links Bar */}
          <div className="mt-8 flex items-center justify-center gap-4 text-[10px] font-black text-white/30 uppercase tracking-widest">
            <button onClick={() => setActiveModal('privacy')} className="hover:text-cyan-400 transition-colors">Privacy Policy</button>
            <span>•</span>
            <button onClick={() => setActiveModal('terms')} className="hover:text-cyan-400 transition-colors">Terms</button>
            <span>•</span>
            <button onClick={() => setActiveModal('dataSafety')} className="hover:text-cyan-400 transition-colors">Data Safety</button>
          </div>
        </div>

        {/* SIDE MENU DRAWER OVERLAY */}
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop Overlay */}
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsDrawerOpen(false)}
            />

            {/* Slide-out Drawer Panel */}
            <div className="relative w-80 max-w-[80vw] bg-slate-900 border-r border-white/10 h-full flex flex-col p-6 shadow-2xl z-10 animate-fade-in">
              <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase leading-tight">{currentLang.appTitle}</h3>
                    <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">v1.0.0 (Play Store Compliant)</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/60 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Menu Links List */}
              <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                <DrawerMenuItem
                  icon={FileText}
                  title={currentLang.privacyPolicy || "Privacy Policy"}
                  subtitle="Data handling & privacy disclosure"
                  onClick={() => { setIsDrawerOpen(false); setActiveModal('privacy'); }}
                />
                <DrawerMenuItem
                  icon={ShieldAlert}
                  title={currentLang.termsOfService || "Terms & Conditions"}
                  subtitle="Usage rules & consent terms"
                  onClick={() => { setIsDrawerOpen(false); setActiveModal('terms'); }}
                />
                <DrawerMenuItem
                  icon={Lock}
                  title={currentLang.dataSafety || "Data Safety & Biometrics"}
                  subtitle="Prominent disclosure on face vectors"
                  onClick={() => { setIsDrawerOpen(false); setActiveModal('dataSafety'); }}
                />
                <DrawerMenuItem
                  icon={Info}
                  title={currentLang.aboutApp || "About & Support"}
                  subtitle="Version info & contact developer"
                  onClick={() => { setIsDrawerOpen(false); setActiveModal('about'); }}
                />
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/10 rounded-2xl border border-white/5 group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl"><ExternalLink size={18}/></div>
                    <div>
                      <p className="font-black text-xs uppercase group-hover:text-cyan-400">Open Full Web Policy</p>
                      <p className="text-[9px] text-white/30">Opens in browser window</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-white/20 group-hover:text-cyan-400"/>
                </a>
              </div>

              {/* Drawer Footer */}
              <div className="pt-6 border-t border-white/10 text-center">
                <p className="text-[9px] font-black uppercase tracking-wider text-white/20">Google Play Policy Certified</p>
                <p className="text-[8px] text-white/10 mt-1">© 2026 TaleemiDunya AI. All Rights Reserved.</p>
              </div>
            </div>
          </div>
        )}

        {/* POLICY & SUPPORT MODALS */}
        {activeModal && (
          <PolicyModal
            type={activeModal}
            onClose={() => setActiveModal(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col font-sans overflow-hidden">
      <div className="h-16 flex items-center justify-between px-6 bg-black/60 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
           <Zap className="text-cyan-400 fill-current" size={20}/>
           <div className="leading-tight"><p className="text-[10px] font-black text-cyan-400 uppercase">{schoolData.idNumber}</p><p className="text-xs font-black truncate max-w-[130px] uppercase opacity-80 leading-none">{schoolData.name}</p></div>
           {isIdle && <span className="text-[8px] font-black bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded ml-2">ECO</span>}
           <div className="flex items-center gap-1 ml-2">
             {isOnline ? <Wifi size={12} className="text-green-500"/> : <WifiOff size={12} className="text-red-500"/>}
             <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${enrolledUsers.length > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
               {enrolledUsers.length}/{users.length} ENROLLED
             </span>
             {syncQueue.length > 0 && <span className="text-[8px] font-black text-orange-400 animate-pulse">{syncQueue.length} Q</span>}
           </div>
        </div>
        <div className="flex gap-2">
           <NavButton icon={History} active={appMode==='history'} onClick={()=>setAppMode('history')} />
           <NavButton icon={UserPlus} active={appMode==='auth'} onClick={()=>{setAppMode('auth'); setEnrollStep(0); setLoginForm({idNumber:'', password:''});}} />
           <button onClick={()=>{setCameraFacing(f=>f==='user'?'environment':'user');}} className="p-2.5 bg-white/5 text-white/40 rounded-xl active:rotate-180 transition-all"><RefreshCcw size={18}/></button>
           <button onClick={handleLogout} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl active:scale-90"><LogOut size={18}/></button>
           <button onClick={()=>setLang(l=>l==='en'?'ur':'en')} className="p-2.5 bg-white/5 text-white/40 rounded-xl font-black text-[10px]">{lang==='en'?'UR':'EN'}</button>
        </div>
      </div>

      <div className="relative flex-1 bg-black overflow-hidden">
        {appMode === 'scan' && (
          <div className="h-full relative overflow-hidden">
             <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover opacity-60 ${cameraFacing==='user'?'scale-x-[-1]':''}`} />
             <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full pointer-events-none ${cameraFacing==='user'?'scale-x-[-1]':''}`} />
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-72 h-72 border-2 border-cyan-400/30 rounded-[4rem] relative">
                   <div className="absolute inset-x-0 top-0 h-1 bg-cyan-400 animate-scan-laser shadow-[0_0_20px_cyan]" />
                </div>
                <p className="mt-12 text-[10px] font-black text-cyan-400 uppercase tracking-[0.5em] animate-pulse">Scanning Active</p>
             </div>

             {enrolledUsers.length === 0 && (
               <div className="absolute top-6 inset-x-6 bg-red-900/90 text-white p-4 rounded-2xl backdrop-blur-md text-center border border-red-500 shadow-2xl z-40 animate-pulse">
                  <p className="font-black text-xs uppercase tracking-wider text-amber-300">⚠️ NO FACES REGISTERED</p>
                  <p className="text-[10px] mt-1 font-bold text-white/90">
                     0 face descriptors found ({users.length} raw docs loaded). Tap <b className="text-orange-400">+ (Bio-Capture)</b> top-right to enroll student/staff faces first!
                  </p>
               </div>
             )}
          </div>
        )}

        {appMode === 'auth' && (
           <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-950 animate-fade-in z-[60]">
              <Lock size={60} className="text-orange-400 mb-8 drop-shadow-[0_0_20px_orange]"/>
              <h2 className="text-2xl font-black uppercase mb-10 tracking-widest text-orange-500">{currentLang.security}</h2>
              <form onSubmit={(e)=>{e.preventDefault(); if(loginForm.password===schoolData.password){setAppMode('enroll');}else alert("Wrong PIN");}} className="w-full max-w-sm space-y-4">
                 <input className="w-full bg-black/40 p-6 rounded-3xl border border-white/5 outline-none focus:border-orange-500 font-black text-center" type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm, password:e.target.value})} placeholder={currentLang.password} />
                 <button className="w-full bg-orange-600 py-6 rounded-3xl font-black uppercase shadow-lg">{currentLang.authenticate}</button>
                 <button onClick={()=>setAppMode('scan')} className="w-full py-4 text-white/20 text-xs font-black uppercase">{currentLang.cancel}</button>
              </form>
           </div>
        )}

        {appMode === 'enroll' && (
           <div className="h-full bg-slate-950 flex flex-col p-8 animate-slide-up z-[70]">
              {enrollStep === 0 && (
                 <div className="w-full max-w-sm mx-auto space-y-8 text-center pt-10">
                    <h3 className="text-3xl font-black uppercase tracking-tighter">{currentLang.enroll}</h3>
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5"><button onClick={()=>setSearchRole('student')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${searchRole==='student'?'bg-orange-600 text-white':'text-white/20'}`}>{currentLang.student}</button><button onClick={()=>setSearchRole('staff')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${searchRole==='staff'?'bg-orange-600 text-white':'text-white/20'}`}>{currentLang.staff}</button></div>
                    <form onSubmit={handleEnrollSearch} className="space-y-4">
                      <input className="w-full bg-slate-900 p-6 rounded-3xl text-center font-black text-2xl outline-none border border-white/10" value={searchId} onChange={e=>{setSearchId(e.target.value); setError(null);}} placeholder="ID / ROLL" />
                      <button className="w-full bg-orange-600 py-6 rounded-3xl font-black uppercase shadow-xl">{isBusy ? "..." : currentLang.confirm}</button>
                      {error && <p className="text-red-500 text-xs font-black mt-2 uppercase animate-pulse">{error}</p>}
                    </form>
                    <button onClick={()=>setAppMode('scan')} className="w-full py-4 text-white/20 text-xs font-black uppercase">{currentLang.exit}</button>
                    <div className="pt-4">
                      <a href="/privacy.html" target="_blank" className="text-[10px] font-black text-white/10 uppercase tracking-widest hover:text-orange-500 transition-colors">Privacy Policy</a>
                    </div>
                 </div>
              )}
              {enrollStep === 1 && (
                 <div className="text-center space-y-12 pt-12">
                    <div className="w-40 h-40 bg-slate-900 border-4 border-orange-500/20 rounded-[3.5rem] mx-auto flex items-center justify-center text-orange-400 shadow-2xl animate-pulse"><User size={80}/></div>
                    <div><h3 className="text-4xl font-black uppercase text-white/90 leading-none">{regUser.name || regUser.studentName}</h3><p className="text-orange-400 text-xs font-black uppercase mt-4 tracking-[0.3em]">Ready for Bio-Sync</p></div>
                    <div className="flex gap-4 max-w-xs mx-auto"><button onClick={()=>setEnrollStep(0)} className="flex-1 py-6 bg-white/5 rounded-3xl font-black text-[10px]">BACK</button><button onClick={()=>setEnrollStep(2)} className="flex-[2] py-6 bg-orange-600 rounded-3xl font-black uppercase text-[10px] shadow-2xl active:scale-95">SCAN FACE</button></div>
                 </div>
              )}
              {enrollStep === 2 && (
                 <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${cameraFacing==='user'?'scale-x-[-1]':''}`} />
                    <div className="absolute bottom-16 flex flex-col items-center gap-6">
                       <button onClick={captureEnroll} disabled={isBusy} className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-[10px] border-slate-950 shadow-2xl"><CameraIcon size={44} className="text-black"/></button>
                    </div>
                 </div>
              )}
              {enrollStep === 4 && (
                 <div className="text-center space-y-10 pt-12 animate-fade-in">
                    <div className="w-24 h-24 bg-green-500 rounded-full mx-auto flex items-center justify-center text-white shadow-2xl"><CheckCircle size={48}/></div>
                    <h3 className="text-4xl font-black text-green-400 uppercase tracking-tighter">{currentLang.dataSecured}</h3>
                    <button onClick={()=>{setEnrollStep(0); setAppMode('scan');}} className="w-full max-w-xs bg-green-600 py-6 rounded-3xl font-black uppercase shadow-lg transition-all">{currentLang.finish}</button>
                 </div>
              )}
           </div>
        )}

        {appMode === 'history' && (
           <div className="absolute inset-0 bg-slate-950 z-[100] flex flex-col p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3"><History className="text-cyan-400" size={24}/><h2 className="text-2xl font-black uppercase tracking-tighter">{currentLang.history}</h2></div>
                 <button onClick={()=>setAppMode('scan')} className="p-2 bg-white/5 rounded-full"><X size={24}/></button>
              </div>
              <div className="mb-6 flex gap-3">
                 <div className="flex-1 bg-black/40 rounded-2xl p-4 flex items-center gap-4 border border-white/5">
                    <Calendar size={18} className="text-cyan-500" /><input type="date" value={historyDate} onChange={e=>setHistoryDate(e.target.value)} className="bg-transparent outline-none font-black text-sm uppercase text-white w-full" />
                 </div>
                 <button onClick={fetchHistory} className="p-4 bg-cyan-600 rounded-2xl active:scale-95"><RefreshCcw size={20} className={historyLoading?'animate-spin':''}/></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                 {historyLoading ? ( <div className="py-20 text-center animate-pulse font-black text-xs text-white/20 uppercase tracking-[0.5em]">Loading...</div> ) :
                 attendanceHistory.length === 0 ? ( <div className="py-20 text-center font-black text-xs text-white/10 uppercase tracking-widest">{currentLang.noLogs}</div> ) : (
                    attendanceHistory.map(log => (
                       <div key={log.id} className="p-5 bg-white/[0.03] border border-white/5 rounded-[2.5rem] flex items-center gap-4 group hover:border-cyan-500/30 transition-all">
                          <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-inner ${log.role==='staff'?'bg-orange-500/10 text-orange-400':'bg-cyan-500/10 text-cyan-400'}`}>{log.studentName?.[0]}</div>
                          <div className="flex-1"><p className="font-black text-sm uppercase group-hover:text-cyan-400 transition-colors">{log.studentName}</p><p className="text-[9px] font-bold text-white/20 uppercase mt-1 tracking-wider">{log.class} • #{log.rollNo}</p></div>
                          <div className="text-right"><p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">{currentLang.present}</p><p className="text-[10px] font-bold text-white/20">{log.localTime || (log.timestamp?.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}))}</p></div>
                       </div>
                    ))
                 )}
              </div>
           </div>
        )}

        {scanResult && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-8 backdrop-blur-3xl bg-black/80 animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[4rem] p-10 shadow-2xl animate-bounce-in text-center relative overflow-hidden">
               <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-cyan-400 via-green-500 to-cyan-400" />
               <div className="w-48 h-48 rounded-full overflow-hidden mx-auto border-8 border-slate-50 shadow-xl mb-6">
                  {(scanResult.faceScanPhoto || scanResult.profilePhoto) ? <img src={scanResult.faceScanPhoto || scanResult.profilePhoto} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200 font-black text-7xl uppercase">{(scanResult.name || scanResult.studentName)?.[0]}</div>}
               </div>
               <h3 className="text-3xl font-black uppercase tracking-tight text-slate-900 leading-none mb-2">{scanResult.name}</h3>
               <p className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] mb-10">{scanResult.time}</p>
               <div className="bg-green-500 text-white py-5 rounded-3xl flex items-center justify-center gap-4 shadow-xl animate-pulse"><CheckCircle size={28}/><span className="font-black uppercase text-sm tracking-widest">{currentLang.verified}</span></div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan-laser { 0% { top: 0%; opacity: 0.1; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0.1; } }
        .animate-scan-laser { animation: scan-laser 2s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes bounce-in { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
        .animate-bounce-in { animation: bounce-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}

const NavButton = ({ icon: Icon, active, onClick }) => (
  <button onClick={onClick} className={`p-2.5 rounded-xl transition-all border ${active ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-lg' : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10'}`}>
    <Icon size={18} />
  </button>
);

const DrawerMenuItem = ({ icon: Icon, title, subtitle, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left flex items-center justify-between p-4 bg-white/[0.03] hover:bg-cyan-500/10 hover:border-cyan-500/30 rounded-2xl border border-white/5 group transition-all"
  >
    <div className="flex items-center gap-3">
      <div className="p-2.5 bg-white/5 text-white/60 group-hover:text-cyan-400 group-hover:bg-cyan-500/20 rounded-xl transition-all">
        <Icon size={20} />
      </div>
      <div>
        <p className="font-black text-xs uppercase group-hover:text-cyan-400 transition-colors">{title}</p>
        <p className="text-[9px] text-white/30 font-bold uppercase">{subtitle}</p>
      </div>
    </div>
    <ChevronRight size={16} className="text-white/20 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all"/>
  </button>
);

const PolicyModal = ({ type, onClose }) => {
  const titles = {
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
    dataSafety: "Data Safety & Biometrics Disclosure",
    about: "About & Support"
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-white/10 w-full max-w-lg max-h-[85vh] rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl animate-slide-up">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
              {type === 'privacy' && <FileText size={22}/>}
              {type === 'terms' && <ShieldAlert size={22}/>}
              {type === 'dataSafety' && <Lock size={22}/>}
              {type === 'about' && <Info size={22}/>}
            </div>
            <div>
              <h3 className="font-black text-base uppercase text-white tracking-tight">{titles[type]}</h3>
              <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Google Play Policy Compliant</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 text-sm text-slate-300 leading-relaxed">
          {type === 'privacy' && (
            <>
              <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-2xl text-xs text-cyan-300 font-bold">
                <p>📋 <b>Official Policy Notice:</b> TaleemiDunya AI complies strictly with Google Play Developer Policies regarding User Data, Camera Permissions, and Biometric Processing.</p>
              </div>

              <div>
                <h4 className="font-black text-xs uppercase text-cyan-400 tracking-wider mb-2">1. Data We Collect</h4>
                <p className="text-xs text-slate-300">
                  To provide automated attendance verification, we process:
                </p>
                <ul className="list-disc list-inside text-xs text-slate-400 mt-2 space-y-1">
                  <li><b>School Identifiers:</b> School ID and login access credentials.</li>
                  <li><b>User Identifiers:</b> Student/Staff Name, Roll Number, Class, and Role.</li>
                  <li><b>Biometric Vectors:</b> Numerical 128-float mathematical representations of facial landmarks (Face Descriptors).</li>
                  <li><b>Profile Photos:</b> Static photo captures for visual identification during attendance logging.</li>
                  <li><b>Attendance Logs:</b> Time, date, and status records.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-black text-xs uppercase text-cyan-400 tracking-wider mb-2">2. Camera & Biometric Processing</h4>
                <p className="text-xs text-slate-300">
                  Our app accesses the device camera solely to perform real-time facial landmark detection using AI neural networks (`face-api`). Raw camera video streams are processed on-device and are NEVER saved or transmitted continuously over the internet.
                </p>
              </div>

              <div>
                <h4 className="font-black text-xs uppercase text-cyan-400 tracking-wider mb-2">3. Data Usage & Non-Disclosure</h4>
                <p className="text-xs text-slate-300">
                  We use your data EXCLUSIVELY for logging educational attendance. We NEVER sell, monetize, share, or lease personal or biometric data to third parties, advertising networks, or data brokers.
                </p>
              </div>

              <div>
                <h4 className="font-black text-xs uppercase text-cyan-400 tracking-wider mb-2">4. Data Security & Storage</h4>
                <p className="text-xs text-slate-300">
                  All attendance records and biometric descriptors are encrypted in transit (TLS/SSL) and stored securely in Google Firebase Firestore databases using strict authentication rules.
                </p>
              </div>

              <div>
                <h4 className="font-black text-xs uppercase text-cyan-400 tracking-wider mb-2">5. User Rights & Data Deletion Request</h4>
                <p className="text-xs text-slate-300">
                  School administrators and users have the right to inspect, modify, or permanently delete their personal and biometric records. To request complete data deletion, please contact us at:
                  <span className="block font-black text-cyan-400 mt-1">support@taleemi-facescanner.com</span>
                </p>
              </div>
            </>
          )}

          {type === 'terms' && (
            <>
              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl text-xs text-orange-300 font-bold">
                <p>📜 <b>Terms of Service:</b> By using TaleemiDunya AI, educational institutions agree to these usage terms.</p>
              </div>

              <div>
                <h4 className="font-black text-xs uppercase text-cyan-400 tracking-wider mb-2">1. Institutional Authorization</h4>
                <p className="text-xs text-slate-300">
                  This application is intended strictly for authorized educational institutions, schools, colleges, and universities. Un-authorized access attempts are prohibited.
                </p>
              </div>

              <div>
                <h4 className="font-black text-xs uppercase text-cyan-400 tracking-wider mb-2">2. Biometric Consent Responsibility</h4>
                <p className="text-xs text-slate-300">
                  Participating schools are responsible for obtaining appropriate consent from students, parents/guardians, or staff members prior to registering facial bio-data in the system.
                </p>
              </div>

              <div>
                <h4 className="font-black text-xs uppercase text-cyan-400 tracking-wider mb-2">3. Acceptable Use</h4>
                <p className="text-xs text-slate-300">
                  Users agree not to bypass security controls, reverse-engineer AI models, or inject false biometric data into the attendance system.
                </p>
              </div>
            </>
          )}

          {type === 'dataSafety' && (
            <>
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl text-xs text-green-300 font-bold">
                <p>🔒 <b>Google Play Data Safety Disclosure:</b> Prominent transparency regarding camera and biometric data processing.</p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="font-black text-xs text-cyan-400 uppercase">🛡️ Encrypted in Transit</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">All data sent between your device and Firebase servers uses encrypted HTTPS / TLS 1.3 connections.</p>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="font-black text-xs text-cyan-400 uppercase">🚫 No 3rd Party Data Sharing</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Your personal information, photos, and biometric descriptors are NEVER shared with third parties.</p>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="font-black text-xs text-cyan-400 uppercase">🧠 Numerical Face Vectors Only</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Facial features are converted into irreversible mathematical vectors (128 numbers), preventing raw face reconstruction.</p>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="font-black text-xs text-cyan-400 uppercase">🗑️ Data Deletion Option</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Full account and biometric deletion available upon request via support email.</p>
                </div>
              </div>
            </>
          )}

          {type === 'about' && (
            <>
              <div className="text-center p-6 bg-white/5 rounded-3xl border border-white/10 space-y-3">
                <div className="w-16 h-16 bg-cyan-500/10 text-cyan-400 rounded-2xl mx-auto flex items-center justify-center border border-cyan-500/20">
                  <Zap size={32} />
                </div>
                <h4 className="font-black text-lg uppercase text-white">TaleemiDunya AI</h4>
                <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">Smart Face Scanner System</p>
                <p className="text-[11px] text-slate-400">Production Build v1.0.0 (Capacitor + React + TensorFlow face-api)</p>
              </div>

              <div>
                <h4 className="font-black text-xs uppercase text-cyan-400 tracking-wider mb-2">Developer & Support Contact</h4>
                <p className="text-xs text-slate-300">
                  For technical assistance, account setup, or data deletion inquiries, please reach out to our team:
                </p>
                <div className="mt-3 p-4 bg-black/40 rounded-2xl border border-white/10 flex items-center gap-3">
                  <Mail className="text-cyan-400" size={20}/>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase font-black">Official Support Email</p>
                    <a href="mailto:support@taleemi-facescanner.com" className="font-black text-xs text-cyan-400 hover:underline">
                      support@taleemi-facescanner.com
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 text-center">
          <button onClick={onClose} className="w-full bg-cyan-600 hover:bg-cyan-500 py-4 rounded-2xl font-black uppercase tracking-wider text-xs shadow-lg active:scale-95 transition-all">
            Close & Back to App
          </button>
        </div>
      </div>
    </div>
  );
};
