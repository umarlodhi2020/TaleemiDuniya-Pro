import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Camera, 
  X, 
  User, 
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  Search, 
  ScanBarcode, 
  Volume2, 
  VolumeX, 
  Clock, 
  Users, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Check, 
  Maximize, 
  Minimize, 
  Settings, 
  MessageCircle, 
  Sun, 
  Moon, 
  Sliders,
  Download,
  FileSpreadsheet,
  BarChart3,
  Phone,
  Wifi,
  WifiOff,
  RotateCcw,
  Sparkles,
  TrendingUp,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, getDoc, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';

export default function QrScannerApp() {
  const { userData } = useAuth();
  const navigate = useNavigate();

  // Mode: 'barcode' (Physical 2D/1D scanner gun - default) OR 'camera' (Webcam/Phone camera)
  const [activeMode, setActiveMode] = useState('barcode');
  const [cameraError, setCameraError] = useState('');

  // Gate attendance mode: 'ENTRY' (Check-In) | 'EXIT' (Check-Out) | 'AUTO' (Auto In/Out)
  const [gateMode, setGateMode] = useState('AUTO');

  // UI Theme mode: 'light' (default as requested) | 'dark'
  const [themeMode, setThemeMode] = useState('light');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Network Online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      const q = localStorage.getItem('qr_offline_scans_queue');
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  });

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial authentication from existing login or saved session
  const [activeSchoolId, setActiveSchoolId] = useState(() => {
    if (userData?.schoolId) return userData.schoolId;
    try {
      const saved = localStorage.getItem('qr_scan_session');
      return saved ? JSON.parse(saved).schoolId : null;
    } catch {
      return null;
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (userData?.schoolId) return true;
    try {
      const saved = localStorage.getItem('qr_scan_session');
      return !!saved;
    } catch {
      return false;
    }
  });

  const [loginForm, setLoginForm] = useState({ idNumber: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Advanced Configurations
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceLanguage, setVoiceLanguage] = useState('ur'); // 'ur' (Urdu) | 'en' (English)
  const [soundEffectType, setSoundEffectType] = useState('chime'); // 'chime' | 'retail' | 'mute'
  const [whatsappAlertsEnabled, setWhatsappAlertsEnabled] = useState(true);
  const [schoolStartTime, setSchoolStartTime] = useState('08:15'); // 24-hr format for Late detection
  const [schoolEndTime, setSchoolEndTime] = useState('13:30'); // 24-hr format for Early Departure alert
  const [doubleScanCooldownSec, setDoubleScanCooldownSec] = useState(20); // 20 seconds anti-duplicate
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);

  // Anti-Duplicate scan throttle reference map
  const lastScannedMemberMap = useRef({});

  // Student / Staff cached data
  const [allStudents, setAllStudents] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const allStudentsRef = useRef([]);
  const allStaffRef = useRef([]);

  // Manual Member Search
  const [manualSearch, setManualSearch] = useState('');
  const [manualResults, setManualResults] = useState([]);
  const [showManualSearch, setShowManualSearch] = useState(false);

  // Stream Filtering (All | Students | Staff | Late | Exit)
  const [streamFilter, setStreamFilter] = useState('ALL');

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [physicalInput, setPhysicalInput] = useState('');
  const [recentScans, setRecentScans] = useState([]);

  // Hardware Scanner Diagnostic Stats
  const [lastScanSpeedMs, setLastScanSpeedMs] = useState(null);

  // Camera Refs
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [cameraMode, setCameraMode] = useState('environment');

  // Barcode Input Ref for physical gun
  const physicalInputRef = useRef(null);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Modern synthesized audio tones
  const playSuccessSound = useCallback((isLate = false) => {
    if (soundEffectType === 'mute') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (soundEffectType === 'retail') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isLate ? 750 : 2200, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else {
        // High-end pleasant airport 2-tone chime
        osc.type = 'sine';
        if (isLate) {
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.12);
        } else {
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.09);
        }
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.log('Audio tone error', e);
    }
  }, [soundEffectType]);

  const playErrorSound = useCallback(() => {
    if (soundEffectType === 'mute') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.log('Audio tone error', e);
    }
  }, [soundEffectType]);

  const speakAnnouncement = useCallback((name, statusTextUrdu, statusTextEnglish) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const textToSpeak = voiceLanguage === 'ur'
        ? `${name || 'طالب علم'}، ${statusTextUrdu}`
        : `${name || 'Student'}, ${statusTextEnglish}`;
      const utter = new SpeechSynthesisUtterance(textToSpeak);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.lang = voiceLanguage === 'ur' ? 'ur-PK' : 'en-US';
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.log('Speech error', e);
    }
  }, [voiceEnabled, voiceLanguage]);

  // Check if current time is after school start time (Late detection & exact minutes)
  const getPunctualityInfo = useCallback(() => {
    try {
      const now = new Date();
      const [startHour, startMin] = schoolStartTime.split(':').map(Number);
      const startTimeToday = new Date();
      startTimeToday.setHours(startHour, startMin, 0, 0);

      const [endHour, endMin] = schoolEndTime.split(':').map(Number);
      const endTimeToday = new Date();
      endTimeToday.setHours(endHour, endMin, 0, 0);

      const isLate = now > startTimeToday;
      const minutesLate = isLate ? Math.max(1, Math.round((now - startTimeToday) / 60000)) : 0;
      const isEarlyDeparture = now < endTimeToday;

      return { isLate, minutesLate, isEarlyDeparture };
    } catch {
      return { isLate: false, minutesLate: 0, isEarlyDeparture: false };
    }
  }, [schoolStartTime, schoolEndTime]);

  // Sync offline queue when online
  const syncOfflineQueue = useCallback(async () => {
    if (!navigator.onLine || offlineQueue.length === 0) return;
    const queueToProcess = [...offlineQueue];
    let remaining = [];
    for (const item of queueToProcess) {
      try {
        if (item.type === 'new_attendance') {
          await addDoc(collection(db, 'attendance'), item.data);
        } else if (item.type === 'update_attendance') {
          await setDoc(doc(db, 'attendance', item.docId), item.data, { merge: true });
        }
      } catch (e) {
        console.error('Failed to sync offline record:', e);
        remaining.push(item);
      }
    }
    setOfflineQueue(remaining);
    localStorage.setItem('qr_offline_scans_queue', JSON.stringify(remaining));
  }, [offlineQueue]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineQueue]);

  // Attendance Marking with Anti-Duplicate, Late calculation & Offline resilience
  const markAttendance = useCallback(async (member) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const { isLate: isLateStatus, minutesLate, isEarlyDeparture } = getPunctualityInfo();

      // Anti-Double Scan Throttle
      const nowTs = Date.now();
      const lastScanTs = lastScannedMemberMap.current[member.id];
      if (lastScanTs && (nowTs - lastScanTs) < (doubleScanCooldownSec * 1000)) {
        const secondsAgo = Math.max(1, Math.round((nowTs - lastScanTs) / 1000));
        playErrorSound();
        setScanResult({
          id: member.id,
          name: member.name || 'Member',
          class: member.class || member.className || 'N/A',
          rollNo: member.rollNumber || member.rollNo || member.grNo || 'N/A',
          fatherName: member.fatherName || '-',
          time: nowTime,
          status: 'Already Scanned',
          message: `Yeh card abhi ${secondsAgo} seconds pehle scan ho chuka hai.`,
          photo: member.photoUrl || member.profilePhoto || null,
          isWarning: true
        });
        speakAnnouncement(member.name, 'پہلے سے درج ہے', 'Already scanned');
        setIsScanning(false);
        setTimeout(() => setScanResult(null), 3000);
        return;
      }
      lastScannedMemberMap.current[member.id] = nowTs;

      if (member.memberType === 'student') {
        const q = query(
          collection(db, 'attendance'),
          where('studentId', '==', member.id),
          where('date', '==', todayStr),
          where('schoolId', '==', activeSchoolId)
        );
        let existingSnap = { empty: true, docs: [] };
        if (navigator.onLine) {
          existingSnap = await getDocs(q);
        }
        
        let finalStatus = isLateStatus ? 'Late' : 'Present';

        if (!existingSnap.empty) {
          const existingDoc = existingSnap.docs[0];
          const existingData = existingDoc.data();

          if (gateMode === 'EXIT' || (gateMode === 'AUTO' && existingData.timeIn && !existingData.timeOut)) {
            // Log Exit time
            const exitPayload = {
              timeOut: nowTime,
              updatedAt: serverTimestamp(),
              isEarlyDeparture: isEarlyDeparture
            };

            if (navigator.onLine) {
              await setDoc(doc(db, 'attendance', existingDoc.id), exitPayload, { merge: true });
            } else {
              const qItem = { type: 'update_attendance', docId: existingDoc.id, data: exitPayload };
              const updatedQ = [...offlineQueue, qItem];
              setOfflineQueue(updatedQ);
              localStorage.setItem('qr_offline_scans_queue', JSON.stringify(updatedQ));
            }

            const resultObj = {
              id: member.id,
              member: member,
              name: member.name || 'Student',
              class: member.class || member.className || 'N/A',
              rollNo: member.rollNumber || member.rollNo || member.grNo || 'N/A',
              fatherName: member.fatherName || '-',
              fatherPhone: member.fatherPhone || member.phone || member.emergencyContact || member.whatsappNo || member.contactNumber || null,
              time: nowTime,
              timeIn: existingData.timeIn || existingData.time,
              timeOut: nowTime,
              status: 'Checked Out (Rukhsat)',
              actionType: 'EXIT',
              isEarlyDeparture: isEarlyDeparture,
              photo: member.photoUrl || member.profilePhoto || null,
              whatsappNotified: whatsappAlertsEnabled
            };
            playSuccessSound();
            setScanResult(resultObj);
            setRecentScans(prev => [resultObj, ...prev.slice(0, 59)]);
            speakAnnouncement(member.name, 'رخصت درج ہو گئی', 'Checked out');
            setIsScanning(false);
            setTimeout(() => setScanResult(null), 3500);
            return;
          } else {
            // Already marked Entry and Exit
            const resultObj = {
              id: member.id,
              member: member,
              name: member.name || 'Student',
              class: member.class || member.className || 'N/A',
              rollNo: member.rollNumber || member.rollNo || member.grNo || 'N/A',
              fatherName: member.fatherName || '-',
              time: existingData.time || nowTime,
              status: 'Already Marked',
              message: 'Aaj ki hazri pehle se darj ho chuki hai.',
              photo: member.photoUrl || member.profilePhoto || null,
              isWarning: true
            };
            playSuccessSound();
            setScanResult(resultObj);
            speakAnnouncement(member.name, 'پہلے سے حاضر ہے', 'Already marked');
            setIsScanning(false);
            setTimeout(() => setScanResult(null), 3000);
            return;
          }
        }

        // New Entry
        playSuccessSound(isLateStatus);
        const attendanceData = {
          studentId: member.id,
          studentName: member.name || 'Student',
          rollNumber: member.rollNumber || member.rollNo || member.grNo || 'N/A',
          class: member.class || member.className || 'N/A',
          date: todayStr,
          time: nowTime,
          timeIn: nowTime,
          status: finalStatus.toLowerCase(),
          isLate: isLateStatus,
          minutesLate: minutesLate,
          actionType: 'ENTRY',
          schoolId: activeSchoolId,
          createdAt: serverTimestamp()
        };

        if (navigator.onLine) {
          await addDoc(collection(db, 'attendance'), attendanceData);
        } else {
          const qItem = { type: 'new_attendance', data: attendanceData };
          const updatedQ = [...offlineQueue, qItem];
          setOfflineQueue(updatedQ);
          localStorage.setItem('qr_offline_scans_queue', JSON.stringify(updatedQ));
        }
        
        const resultObj = {
          id: member.id,
          member: member,
          name: member.name || 'Student',
          class: member.class || member.className || 'N/A',
          rollNo: member.rollNumber || member.rollNo || member.grNo || 'N/A',
          fatherName: member.fatherName || '-',
          fatherPhone: member.fatherPhone || member.phone || member.emergencyContact || member.whatsappNo || member.contactNumber || null,
          time: nowTime,
          timeIn: nowTime,
          status: finalStatus,
          isLate: isLateStatus,
          minutesLate: minutesLate,
          actionType: 'ENTRY',
          photo: member.photoUrl || member.profilePhoto || null,
          whatsappNotified: whatsappAlertsEnabled
        };
        setScanResult(resultObj);
        setRecentScans(prev => [resultObj, ...prev.slice(0, 59)]);
        speakAnnouncement(
          member.name, 
          isLateStatus ? `لیٹ حاضر، ${minutesLate} منٹ تاخیر` : 'حاضر', 
          isLateStatus ? `Late by ${minutesLate} minutes` : 'Present'
        );
        setIsScanning(false);
        setTimeout(() => setScanResult(null), 3500);

      } else {
        // Staff Attendance
        const docId = `${member.id}_${todayStr}`;
        const docRef = doc(db, 'attendance', docId);
        let existingDoc = { exists: () => false };
        if (navigator.onLine) {
          existingDoc = await getDoc(docRef);
        }
        
        let payload = {
          id: docId,
          staffId: member.id,
          employeeId: member.employeeId || member.id,
          staffName: member.name || 'Staff',
          department: member.department || 'General',
          designation: member.designation || member.role || '',
          date: todayStr,
          type: 'staff',
          schoolId: activeSchoolId,
          updatedAt: serverTimestamp()
        };

        let staffStatus = 'Present (Time In)';
        let isStaffOut = false;

        if (existingDoc.exists() && existingDoc.data().timeIn) {
          payload.timeOut = nowTime;
          staffStatus = 'Checked Out (Time Out)';
          isStaffOut = true;
        } else {
          payload.timeIn = nowTime;
          payload.time = nowTime;
          payload.status = isLateStatus ? 'late' : 'present';
          payload.isLate = isLateStatus;
        }

        playSuccessSound();
        if (navigator.onLine) {
          await setDoc(docRef, payload, { merge: true });
        } else {
          const qItem = { type: 'update_attendance', docId: docId, data: payload };
          const updatedQ = [...offlineQueue, qItem];
          setOfflineQueue(updatedQ);
          localStorage.setItem('qr_offline_scans_queue', JSON.stringify(updatedQ));
        }
        
        const resultObj = {
          id: member.id,
          member: member,
          name: member.name || 'Staff',
          class: member.department || 'Staff',
          rollNo: member.staffId || member.employeeId || member.id,
          fatherName: member.designation || member.role || '-',
          time: nowTime,
          status: staffStatus,
          actionType: isStaffOut ? 'EXIT' : 'ENTRY',
          photo: member.photoUrl || member.profilePhoto || null
        };
        setScanResult(resultObj);
        setRecentScans(prev => [resultObj, ...prev.slice(0, 59)]);
        speakAnnouncement(member.name, isStaffOut ? 'رخصت' : 'حاضر', isStaffOut ? 'Clocked out' : 'Clocked in');
        setIsScanning(false);
        setTimeout(() => setScanResult(null), 3500);
      }
    } catch (err) { 
      console.error('Failed to save attendance', err); 
      playErrorSound();
      setIsScanning(false);
    }
  }, [
    activeSchoolId, 
    gateMode, 
    getPunctualityInfo, 
    doubleScanCooldownSec, 
    playSuccessSound, 
    playErrorSound, 
    speakAnnouncement, 
    whatsappAlertsEnabled, 
    offlineQueue
  ]);

  const showErrorResult = useCallback((scannedVal) => {
    playErrorSound();
    speakAnnouncement('معلوم نہیں', 'ریکارڈ میں نہیں ملا', 'Not recognized');
    setScanResult({
      name: 'Card Not Recognized',
      class: 'N/A',
      rollNo: scannedVal || 'Unknown',
      fatherName: '-',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Error',
      message: `Card Code "${(scannedVal || '').substring(0, 24)}" database se match nahi hua.`,
      photo: null
    });
    setIsScanning(false);
    setTimeout(() => setScanResult(null), 3500);
  }, [playErrorSound, speakAnnouncement]);

  const processStudentScan = useCallback((scannedValue) => {
    if (!scannedValue) return;
    let rawVal = String(scannedValue).trim();

    // URL parsing if QR code contains full URL (e.g. https://.../student/10)
    if (rawVal.startsWith('http://') || rawVal.startsWith('https://')) {
      try {
        const urlObj = new URL(rawVal);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length > 0) {
          rawVal = parts[parts.length - 1];
        }
      } catch (e) {
        console.log(e);
      }
    }

    // JSON parsing if QR code contains serialized object
    if (rawVal.startsWith('{') && rawVal.endsWith('}')) {
      try {
        const parsed = JSON.parse(rawVal);
        rawVal = parsed.id || parsed.roll || parsed.rollNo || parsed.rollNumber || parsed.grNo || rawVal;
      } catch (e) {
        console.log(e);
      }
    }

    const val = rawVal.toLowerCase().trim();
    
    // Find student by ID, Roll Number, GR Number, Registration Number, or CNIC
    let foundMember = allStudentsRef.current.find(s =>
      (s.id && s.id.toLowerCase() === val) ||
      (s.rollNumber && String(s.rollNumber).trim().toLowerCase() === val) ||
      (s.grNo && String(s.grNo).trim().toLowerCase() === val) ||
      (s.grNumber && String(s.grNumber).trim().toLowerCase() === val) ||
      (s.registrationNo && String(s.registrationNo).trim().toLowerCase() === val) ||
      (s.rollNo && String(s.rollNo).trim().toLowerCase() === val) ||
      (s.cnic && String(s.cnic).trim().replace(/[- ]/g, '').toLowerCase() === val.replace(/[- ]/g, ''))
    );
    
    // Check staff if not found
    if (!foundMember) {
      foundMember = allStaffRef.current.find(s => 
        (s.id && s.id.toLowerCase() === val) ||
        (s.employeeId && String(s.employeeId).trim().toLowerCase() === val) ||
        (s.staffId && String(s.staffId).trim().toLowerCase() === val) ||
        (s.registrationNo && String(s.registrationNo).trim().toLowerCase() === val) ||
        (s.cnic && String(s.cnic).trim().replace(/[- ]/g, '').toLowerCase() === val.replace(/[- ]/g, ''))
      );
    }

    if (foundMember) {
      markAttendance(foundMember);
    } else {
      showErrorResult(rawVal);
    }
  }, [markAttendance, showErrorResult]);

  const handleScanSuccess = useCallback((decodedText) => {
    if (isScanning || scanResult) return;
    setIsScanning(true);
    processStudentScan(decodedText);
  }, [isScanning, scanResult, processStudentScan]);

  const handlePhysicalInputSubmit = (e) => {
    e.preventDefault();
    if (!physicalInput.trim() || isScanning) return;
    
    const scannedVal = physicalInput.trim();
    setPhysicalInput('');
    processStudentScan(scannedVal);
  };

  // Direct WhatsApp Message to Parent
  const sendParentWhatsApp = (scanItem) => {
    const phone = scanItem.fatherPhone;
    if (!phone) {
      alert('Is student ke record mein parents ka phone number mojood nahi hai.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
    const isLate = scanItem.isLate;
    const statusUrdu = isLate ? `لیٹ حاضر (${scanItem.minutesLate || 0} منٹ تاخیر)` : 'باوقت حاضر (Present)';
    const text = encodeURIComponent(`السلام علیکم! محترم والدین، آپ کا بچہ *${scanItem.name}* (کلاس: ${scanItem.class}، رول نمبر: ${scanItem.rollNo}) سکول پہنچ چکا ہے۔ وقت: *${scanItem.time}*، کیفیت: *${statusUrdu}*۔ شکریہ!`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  // Export Today's Scans to CSV
  const exportToCSV = () => {
    if (recentScans.length === 0) {
      alert('Aaj abhi tak koi scan record nahi hua.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const headers = ['Sr', 'Type', 'Name', 'Class/Dept', 'Roll/ID', 'Father Name', 'Action', 'Time In', 'Time Out', 'Status', 'Late Mins'];
    const rows = recentScans.map((s, idx) => [
      idx + 1,
      s.class === 'Staff' ? 'Staff' : 'Student',
      `"${s.name || ''}"`,
      `"${s.class || ''}"`,
      `"${s.rollNo || ''}"`,
      `"${s.fatherName || ''}"`,
      s.actionType || 'ENTRY',
      s.timeIn || s.time || '',
      s.timeOut || '',
      s.status || '',
      s.minutesLate || (s.isLate ? 'Yes' : '0')
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TaleemiDunya_Attendance_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Class-Wise Attendance Analytics Breakdown
  const classBreakdown = useMemo(() => {
    const classesMap = {};
    allStudents.forEach(st => {
      const cls = st.class || st.className || 'General';
      if (!classesMap[cls]) classesMap[cls] = { total: 0, present: 0, late: 0 };
      classesMap[cls].total += 1;
    });

    recentScans.forEach(sc => {
      if (sc.class && sc.class !== 'Staff' && classesMap[sc.class]) {
        classesMap[sc.class].present += 1;
        if (sc.isLate) classesMap[sc.class].late += 1;
      }
    });

    return Object.entries(classesMap).map(([className, data]) => ({
      className,
      total: data.total,
      present: data.present,
      percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      late: data.late
    })).sort((a, b) => a.className.localeCompare(b.className));
  }, [allStudents, recentScans]);

  // Fetch all students and staff when logged in
  useEffect(() => {
    const fetchMembers = async () => {
      if (isLoggedIn && activeSchoolId) {
        try {
          const stuQ = query(collection(db, 'students'), where('schoolId', '==', activeSchoolId));
          const stuSnap = await getDocs(stuQ);
          const stuList = stuSnap.docs.map(d => ({ id: d.id, ...d.data(), memberType: 'student' }));
          setAllStudents(stuList);
          allStudentsRef.current = stuList;
          
          const staffQ = query(collection(db, 'staff'), where('schoolId', '==', activeSchoolId));
          const staffSnap = await getDocs(staffQ);
          const staffList = staffSnap.docs.map(d => ({ id: d.id, ...d.data(), memberType: 'staff' }));
          setAllStaff(staffList);
          allStaffRef.current = staffList;
        } catch(e) { 
          console.error('Data load error', e); 
        }
      }
    };
    fetchMembers();
  }, [isLoggedIn, activeSchoolId]);

  // Global Hardware Keyboard Listener for 2D/1D Barcode Scanner Gun
  useEffect(() => {
    if (!isLoggedIn) return;

    let barcodeBuffer = '';
    let lastKeyTime = Date.now();
    let scanStartTime = Date.now();

    const handleGlobalKeyDown = (e) => {
      if (showManualSearch) return;

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      if (barcodeBuffer.length === 0) {
        scanStartTime = now;
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.trim().length >= 1) {
          const scanDuration = now - scanStartTime;
          setLastScanSpeedMs(scanDuration);
          const scannedVal = barcodeBuffer.trim();
          barcodeBuffer = '';
          e.preventDefault();
          processStudentScan(scannedVal);
        }
        return;
      }

      // If user typing is slow (>200ms between keys) reset buffer
      if (diff > 220 && barcodeBuffer.length > 0) {
        barcodeBuffer = '';
        scanStartTime = now;
      }

      if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isLoggedIn, showManualSearch, processStudentScan]);

  // Keep barcode gun input focused
  useEffect(() => {
    if (isLoggedIn && !showManualSearch && activeMode === 'barcode') {
      const focusTimer = setTimeout(() => {
        physicalInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(focusTimer);
    }
  }, [isLoggedIn, showManualSearch, activeMode, scanResult]);

  // Handle camera start/stop
  const stopCameraScanner = useCallback(async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  }, []);

  const handleSwitchToCamera = async () => {
    setCameraError('');
    setActiveMode('camera');
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      }
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      
      await html5QrCodeRef.current.start(
        { facingMode: cameraMode },
        {
          fps: 25,
          qrbox: { width: 240, height: 240 }
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.warn("Camera failed to start:", err);
      setCameraError('Camera access not detected or permission denied. Automatically switched to 2D QR & Barcode Machine Mode.');
      setActiveMode('barcode');
    }
  };

  const handleSwitchToBarcode = async () => {
    setActiveMode('barcode');
    setCameraError('');
    await stopCameraScanner();
  };

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, [stopCameraScanner]);

  const toggleCamera = () => {
    setCameraMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const q = query(
        collection(db, 'schools'),
        where('idNumber', '==', loginForm.idNumber),
        where('password', '==', loginForm.password)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setLoginError('Invalid School ID or Password.');
        setLoginLoading(false);
        return;
      }
      const schoolDoc = snapshot.docs[0];
      const sId = schoolDoc.id;
      
      localStorage.setItem('qr_scan_session', JSON.stringify({ schoolId: sId }));
      setActiveSchoolId(sId);
      setIsLoggedIn(true);
    } catch (err) {
      console.error(err);
      setLoginError('Connection error. Try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('qr_scan_session');
    setIsLoggedIn(false);
    setActiveSchoolId(null);
    stopCameraScanner();
  };

  const handleManualSearch = (val) => {
    setManualSearch(val);
    if (!val.trim()) { setManualResults([]); return; }
    const lower = val.toLowerCase().trim();
    const stuResults = allStudents.filter(s =>
      (s.name || '').toLowerCase().includes(lower) ||
      String(s.rollNumber || s.rollNo || s.grNo || s.grNumber || s.registrationNo || '').toLowerCase().includes(lower)
    );
    const staffResults = allStaff.filter(s =>
      (s.name || '').toLowerCase().includes(lower) ||
      String(s.employeeId || s.staffId || s.id || '').toLowerCase().includes(lower)
    );
    const results = [...stuResults, ...staffResults].slice(0, 8);
    setManualResults(results);
  };

  const handleSelectManualStudent = (student) => {
    markAttendance(student);
    setShowManualSearch(false);
    setManualSearch('');
    setManualResults([]);
  };

  // Filtered recent scan stream
  const filteredRecentScans = recentScans.filter(item => {
    if (streamFilter === 'STUDENTS') return item.class !== 'Staff';
    if (streamFilter === 'STAFF') return item.class === 'Staff';
    if (streamFilter === 'LATE') return item.isLate === true;
    if (streamFilter === 'EXIT') return item.actionType === 'EXIT';
    return true;
  });

  // Today's summary metrics
  const totalScansCount = recentScans.length;
  const lateScansCount = recentScans.filter(s => s.isLate).length;
  const staffScansCount = recentScans.filter(s => s.class === 'Staff').length;
  const studentScansCount = totalScansCount - staffScansCount;
  const totalStudentsCount = allStudents.length;
  const totalStaffCount = allStaff.length;
  const studentPresentPercent = totalStudentsCount > 0 ? Math.round((studentScansCount / totalStudentsCount) * 100) : 0;
  const remainingStudentsCount = Math.max(0, totalStudentsCount - studentScansCount);

  // Login View (Light Aesthetic)
  if (!isLoggedIn) {
    return (
      <div className="py-10 px-4 flex flex-col items-center justify-center font-sans max-w-md mx-auto">
        <div className="w-full relative z-10">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-center mx-auto mb-3 text-emerald-600">
              <ScanBarcode size={38} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">2D QR & Barcode Kiosk</h1>
            <p className="text-emerald-700 text-xs mt-1 font-bold tracking-widest uppercase">Smart Attendance Terminal</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xl shadow-slate-200/50">
            {loginError && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-600 text-xs">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                {loginError}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">School ID Number</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" required 
                    value={loginForm.idNumber} onChange={(e) => setLoginForm({ ...loginForm, idNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all font-bold tracking-widest text-sm placeholder:text-slate-400" 
                    placeholder="e.g. 17408" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Terminal Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" required 
                    value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all font-bold tracking-widest text-sm placeholder:text-slate-400" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              <button type="submit" disabled={loginLoading} className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-lg shadow-emerald-600/30">
                {loginLoading ? 'Connecting...' : 'Launch Scanner Terminal'}
              </button>
            </form>
          </div>
          
          <button onClick={() => navigate(-1)} className="mt-5 text-slate-500 hover:text-slate-800 text-xs font-bold w-full text-center transition-colors">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Active Terminal Screen (Embedded in MainLayout with visible Sidebar & Navbar)
  return (
    <div className={`select-none font-sans flex flex-col transition-all duration-300 ${
      isFullscreen 
        ? 'fixed inset-0 z-[100] bg-white overflow-hidden' 
        : 'relative w-full rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden my-2'
    } ${themeMode === 'light' ? 'bg-[#F8FAFC] text-slate-900' : 'bg-[#090D16] text-white'}`}>
      
      {/* TOP HEADER BAR */}
      <div className={`py-2 px-3 sm:px-5 z-30 flex items-center justify-between gap-2 border-b shrink-0 ${themeMode === 'light' ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-slate-900/90 border-white/10'}`}>
        
        {/* Left Branding & Live Clock */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {isFullscreen ? (
            <button 
              onClick={toggleFullscreen} 
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border flex items-center justify-center shrink-0 transition-all ${themeMode === 'light' ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600' : 'bg-white/5 hover:bg-white/15 border-white/10 text-white/70'}`}
              title="Exit Fullscreen (Show Sidebar)"
            >
              <Minimize size={16} />
            </button>
          ) : (
            <button 
              onClick={() => navigate('/school-admin/dashboard')} 
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border flex items-center justify-center shrink-0 transition-all ${themeMode === 'light' ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600' : 'bg-white/5 hover:bg-white/15 border-white/10 text-white/70'}`}
              title="Back to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
              <ScanBarcode size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-slate-900 text-xs sm:text-base tracking-tight truncate">TaleemiDunya FAST</span>
                <span className="hidden xs:inline-block px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black tracking-widest uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                  2D / 1D Kiosk
                </span>
              </div>
              <p className="text-slate-500 text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 sm:gap-2">
                <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="font-mono text-emerald-700 font-bold">{currentTime.toLocaleTimeString()}</span>
                {/* Online / Offline badge */}
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] text-emerald-700 font-bold">
                    <Wifi size={10} /> Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200">
                    <WifiOff size={10} /> Queue ({offlineQueue.length})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          
          {/* Manual Member Search */}
          <button 
            onClick={() => setShowManualSearch(true)}
            className="h-8 sm:h-10 px-2.5 sm:px-3.5 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            title="Manual Student/Staff Search"
          >
            <Search size={14} /> <span className="hidden sm:inline">Search</span>
          </button>

          {/* Voice Alert Toggle */}
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all ${voiceEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
            title={voiceEnabled ? `Voice Enabled (${voiceLanguage.toUpperCase()})` : "Voice Muted"}
          >
            {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* Fullscreen Button */}
          <button 
            onClick={toggleFullscreen}
            className={`h-8 sm:h-10 px-2 sm:px-3 rounded-xl sm:rounded-2xl border flex items-center gap-1.5 transition-all text-xs font-bold ${
              isFullscreen 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                : themeMode === 'light' ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-white'
            }`}
            title={isFullscreen ? "Exit Fullscreen (Show Sidebar)" : "Fullscreen Kiosk Mode"}
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            <span className="hidden md:inline">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>

          {/* Settings Modal Button */}
          <button 
            onClick={() => setShowSettingsModal(true)}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all ${themeMode === 'light' ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-white'}`}
            title="Hardware & Gate Settings"
          >
            <Settings size={15} />
          </button>

          {/* Exit Terminal */}
          <button 
            onClick={handleLogout} 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center text-red-600 transition-all"
            title="Exit Terminal"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* SECONDARY RESPONSIVE CONTROL BAR (MODE & HARDWARE SELECTOR) */}
      <div className={`px-3 sm:px-5 py-2 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-white/5'}`}>
        
        {/* Left: Mode Switcher & Gate Direction */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Hardware Barcode Gun vs Camera QR */}
          <div className={`flex items-center p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border ${themeMode === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-black/60 border-white/10'}`}>
            <button 
              onClick={handleSwitchToBarcode}
              className={`px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all ${activeMode === 'barcode' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
              title="2D QR & Barcode Gun Scanner"
            >
              <Zap size={12} />
              <span>Barcode Gun</span>
            </button>
            <button 
              onClick={handleSwitchToCamera}
              className={`px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all ${activeMode === 'camera' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
              title="Phone / Webcam QR Scanner"
            >
              <Camera size={12} />
              <span>Camera QR</span>
            </button>
          </div>

          {/* Gate Direction: AUTO / ENTRY / EXIT */}
          <div className={`flex items-center p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border ${themeMode === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-black/60 border-white/10'}`}>
            <button
              onClick={() => setGateMode('AUTO')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all ${gateMode === 'AUTO' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              title="Smart Auto: Morning Entry, Afternoon Exit"
            >
              🔄 <span className="hidden xs:inline">Smart </span>Auto
            </button>
            <button
              onClick={() => setGateMode('ENTRY')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all ${gateMode === 'ENTRY' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              title="Entry (Hazir) Mode"
            >
              🟢 Entry
            </button>
            <button
              onClick={() => setGateMode('EXIT')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all ${gateMode === 'EXIT' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              title="Exit (Rukhsat) Mode"
            >
              🔴 Exit
            </button>
          </div>
        </div>

        {/* Right: Classes Breakdown Drawer & Export CSV Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          <button 
            onClick={() => setShowClassModal(true)}
            className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Class-wise attendance summary"
          >
            <BarChart3 size={14} />
            <span>Classes</span>
          </button>

          <button 
            onClick={exportToCSV}
            className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Download Today's Attendance CSV / Excel"
          >
            <Download size={14} />
            <span className="hidden xs:inline">Export </span><span>CSV</span>
          </button>
        </div>

      </div>

      {/* ADVANCED LIVE METRICS DASHBOARD STRIP */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 shadow-sm shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 items-center">
          
          {/* Students Present Gauge */}
          <div className="flex items-center gap-2 p-1.5 sm:p-0 rounded-xl bg-slate-50/70 sm:bg-transparent border border-slate-200/60 sm:border-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <GraduationCap size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500">Present:</span>
                <span className="text-xs font-black text-slate-900">{studentScansCount}/{totalStudentsCount}</span>
                <span className="text-[9px] font-black px-1 rounded bg-emerald-100 text-emerald-800">
                  {studentPresentPercent}%
                </span>
              </div>
              <div className="w-20 sm:w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-0.5">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${studentPresentPercent}%` }}></div>
              </div>
            </div>
          </div>

          {/* Late Count */}
          <div className="flex items-center gap-2 p-1.5 sm:p-0 rounded-xl bg-slate-50/70 sm:bg-transparent border border-slate-200/60 sm:border-0">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 block">Late Arrivals</span>
              <span className="text-xs font-black text-amber-700">{lateScansCount}</span>
            </div>
          </div>

          {/* Remaining Expected Students */}
          <div className="flex items-center gap-2 p-1.5 sm:p-0 rounded-xl bg-slate-50/70 sm:bg-transparent border border-slate-200/60 sm:border-0">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
              <Users size={16} />
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 block">Un-Scanned</span>
              <span className="text-xs font-black text-slate-700">{remainingStudentsCount}</span>
            </div>
          </div>

          {/* Staff Present */}
          <div className="flex items-center gap-2 p-1.5 sm:p-0 rounded-xl bg-slate-50/70 sm:bg-transparent border border-slate-200/60 sm:border-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
              <Briefcase size={16} />
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 block">Staff On Duty</span>
              <span className="text-xs font-black text-indigo-900">{staffScansCount} / {totalStaffCount}</span>
            </div>
          </div>

        </div>

        {/* Offline sync badge if pending */}
        {offlineQueue.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
            <button 
              onClick={syncOfflineQueue}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-bold hover:bg-amber-100 transition-all"
            >
              <RotateCcw size={12} className="animate-spin" />
              <span>Sync {offlineQueue.length} Offline Scans</span>
            </button>
          </div>
        )}
      </div>

      {/* Camera Error Notification (Soft Banner) */}
      {cameraError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-amber-800 text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>{cameraError}</span>
          </div>
          <button onClick={() => setCameraError('')} className="text-amber-700 hover:text-amber-900 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* MAIN TERMINAL WORKSPACE */}
      <div className="flex-1 relative flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left / Center: Interactive Scanning Station */}
        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 relative overflow-y-auto">
          
          {/* HARDWARE 2D / 1D SCANNER MACHINE MODE (DEFAULT) */}
          {activeMode === 'barcode' && (
            <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-4 sm:space-y-5 animate-fadeIn">
              
              {/* Hardware Status Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full bg-emerald-50 border border-emerald-200 shadow-sm max-w-full">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                <span className="text-[10px] sm:text-xs font-black tracking-wider text-emerald-800 uppercase truncate">
                  2D QR & Barcode Machine Ready
                </span>
                <span className="text-[9px] sm:text-[10px] bg-white text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200 shrink-0">
                  Gate: {gateMode}
                </span>
              </div>

              {/* Realistic 2D QR Code & Barcode Light Target Visual */}
              <div className="w-full max-w-[320px] sm:max-w-sm h-60 sm:h-72 rounded-2xl sm:rounded-3xl bg-white border-2 border-emerald-400 relative flex flex-col items-center justify-center p-4 sm:p-6 shadow-2xl shadow-emerald-500/10 overflow-hidden">
                
                {/* Corner Target Markers */}
                <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 w-5 h-5 sm:w-7 sm:h-7 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl"></div>
                <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-5 h-5 sm:w-7 sm:h-7 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl"></div>
                <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 w-5 h-5 sm:w-7 sm:h-7 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl"></div>
                <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 w-5 h-5 sm:w-7 sm:h-7 border-b-4 border-r-4 border-emerald-500 rounded-br-xl"></div>

                {/* Animated Sweeping Laser Beam */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_15px_3px_#10b981] animate-scan-laser"></div>

                {/* Side-by-side 2D QR Code + 1D Barcode Graphic */}
                <div className="flex items-center gap-3 sm:gap-6">
                  {/* High Quality 2D QR Code Card */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-900 p-2 sm:p-2.5 rounded-2xl shadow-md flex flex-col justify-between shrink-0">
                    <div className="flex justify-between">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 border-[3px] sm:border-4 border-white rounded flex items-center justify-center">
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-sm"></div>
                      </div>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 border-[3px] sm:border-4 border-white rounded flex items-center justify-center">
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-sm"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-2 h-2 bg-emerald-400"></div>
                      <div className="w-3 sm:w-4 h-1 bg-white"></div>
                      <div className="w-2 h-2 bg-white"></div>
                      <div className="w-1.5 h-3 bg-emerald-400"></div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 border-[3px] sm:border-4 border-white rounded flex items-center justify-center">
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-sm"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="w-2 h-2 bg-white"></div>
                        <div className="w-2 h-2 bg-emerald-400"></div>
                      </div>
                    </div>
                  </div>

                  {/* 1D Barcode Lines Graphic */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      {[3,1,4,2,1,3,2,1,3,2,1,4].map((w, i) => (
                        <div key={i} className="h-16 sm:h-20 bg-slate-800 rounded-sm" style={{ width: `${Math.max(1.5, w * 1.5)}px` }}></div>
                      ))}
                    </div>
                    <span className="font-mono text-[9px] sm:text-[10px] font-bold text-slate-500 tracking-wider">|| 2D & 1D ||</span>
                  </div>
                </div>

                <div className="mt-3 sm:mt-4 px-3 py-0.5 sm:py-1 rounded-full bg-emerald-50 border border-emerald-200">
                  <span className="font-mono text-[9px] sm:text-[11px] font-black text-emerald-800 tracking-[0.15em] sm:tracking-[0.2em] uppercase">
                    Scan ID Card 2D QR / Barcode
                  </span>
                </div>
              </div>

              {/* Instructions text */}
              <div className="space-y-1 px-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Point Scanner Gun & Press Trigger
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto">
                  Student ya Staff ke ID Card par mojood <strong>2D QR Code</strong> ya <strong>1D Barcode</strong> machine ke samnay layein. Machine automatic scan karke attendance mark karegi.
                </p>
              </div>

              {/* Hardware Barcode Input Field (Auto-focused with Light Contrast) */}
              <form onSubmit={handlePhysicalInputSubmit} className="w-full max-w-md px-1">
                <div className="relative">
                  <input
                    id="barcode-hardware-input"
                    ref={physicalInputRef}
                    type="text"
                    value={physicalInput}
                    onChange={(e) => setPhysicalInput(e.target.value)}
                    placeholder="Scan 2D QR Code / Barcode or type Roll #..."
                    className="w-full bg-white border-2 border-emerald-500/80 text-slate-900 rounded-2xl py-3 sm:py-3.5 pl-4 sm:pl-5 pr-24 sm:pr-28 text-sm sm:text-base font-bold placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20 transition-all font-mono shadow-md"
                    autoFocus
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 px-3 sm:px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-md shadow-emerald-600/30"
                  >
                    Enter <Check size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 mt-2 px-1 font-medium">
                  <span>💡 Zero-Click Mode: Input box par click karna zaroori nahi.</span>
                  {lastScanSpeedMs && (
                    <span className="text-emerald-700 font-bold font-mono">
                      Speed: {lastScanSpeedMs}ms
                    </span>
                  )}
                </div>
              </form>

            </div>
          )}

          {/* CAMERA QR MODE */}
          {activeMode === 'camera' && (
            <div className="relative w-full h-[340px] sm:h-full max-w-xl max-h-[500px] flex items-center justify-center rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-slate-200 bg-white shadow-xl">
              <div id="qr-reader" ref={scannerRef} className="w-full h-full object-cover"></div>
              
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/20">
                <div className="w-52 h-52 sm:w-64 sm:h-64 border-2 border-emerald-400 rounded-2xl sm:rounded-3xl relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>
                  <div className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_20px_4px_#10b981] animate-scan-laser top-0"></div>
                </div>
                <p className="mt-4 sm:mt-6 text-[10px] sm:text-xs font-mono font-bold tracking-widest text-emerald-800 bg-white/90 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-emerald-300 shadow-md">
                  CAMERA QR SCANNER ACTIVE
                </p>
              </div>
            </div>
          )}

          {/* ULTRA-MODERN HIGH IMPACT SCAN RESULT CARD / POPUP */}
          {scanResult && (
            <div className={`fixed inset-x-3 top-4 sm:absolute sm:inset-x-auto sm:top-6 sm:w-[500px] p-4 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-2xl animate-slide-down z-50 pointer-events-auto ${
              scanResult.status === 'Error' 
                ? 'bg-red-50 border-red-300 text-red-900 shadow-red-500/10' 
                : scanResult.isWarning 
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-amber-500/10' 
                : 'bg-white border-emerald-300 text-slate-900 shadow-emerald-500/20'
            }`}>
              <div className="flex items-start gap-4">
                
                {/* Photo or Avatar */}
                <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-emerald-200 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                  {scanResult.photo ? (
                    <img src={scanResult.photo} alt={scanResult.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-black text-2xl">
                      {(scanResult.name || 'S')[0].toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl font-black text-slate-900 truncate">{scanResult.name}</h3>
                    {scanResult.status === 'Error' ? (
                      <AlertCircle className="text-red-600 shrink-0" size={24} />
                    ) : scanResult.isWarning ? (
                      <AlertTriangle className="text-amber-600 shrink-0" size={24} />
                    ) : (
                      <CheckCircle2 className="text-emerald-600 shrink-0" size={24} />
                    )}
                  </div>

                  <p className="text-xs font-black uppercase tracking-wider text-emerald-700 mt-0.5">
                    {scanResult.class} • Roll/ID: {scanResult.rollNo}
                  </p>

                  {scanResult.fatherName && scanResult.fatherName !== '-' && (
                    <p className="text-xs text-slate-600 mt-0.5">Father: {scanResult.fatherName}</p>
                  )}

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {/* Status Pill */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      scanResult.status === 'Error'
                        ? 'bg-red-600 text-white'
                        : scanResult.isWarning
                        ? 'bg-amber-500 text-white'
                        : scanResult.isLate
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {scanResult.status}
                    </span>

                    {/* Late minutes calculation */}
                    {scanResult.isLate && scanResult.minutesLate > 0 && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        Late by {scanResult.minutesLate} mins
                      </span>
                    )}

                    {/* Early departure alert */}
                    {scanResult.isEarlyDeparture && (
                      <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-300">
                        Early Departure
                      </span>
                    )}

                    <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      {scanResult.time}
                    </span>
                  </div>

                  {scanResult.message && (
                    <p className="mt-2 text-xs font-bold text-amber-800 bg-amber-100/70 px-3 py-1.5 rounded-xl border border-amber-200">
                      {scanResult.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons: WhatsApp Direct Alert */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                {scanResult.fatherPhone && (
                  <button
                    onClick={() => sendParentWhatsApp(scanResult)}
                    className="flex-1 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <MessageCircle size={14} className="text-emerald-600" />
                    <span>WhatsApp Parent</span>
                  </button>
                )}

                <button
                  onClick={() => setScanResult(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider transition-all border border-slate-200"
                >
                  Scan Next
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Live Attendance Activity Stream & Analytics */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-200/90 bg-white p-3.5 sm:p-5 flex flex-col shrink-0 shadow-sm">
          
          {/* Header & Filter */}
          <div className="pb-3 border-b border-slate-200 mb-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Live Attendance Stream</h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {recentScans.length} Scans Today
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'STUDENTS', label: 'Students' },
                { id: 'STAFF', label: 'Staff' },
                { id: 'LATE', label: 'Late' },
                { id: 'EXIT', label: 'Exit' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStreamFilter(tab.id)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    streamFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stream List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-72 lg:max-h-none">
            {filteredRecentScans.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <ScanBarcode size={36} className="mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-bold text-slate-600">No cards scanned yet</p>
                <p className="text-[11px] mt-1 text-slate-400">Student aur Staff ke scans yahan real-time display honge.</p>
              </div>
            ) : (
              filteredRecentScans.map((item, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 hover:bg-white flex items-center gap-3 transition-all shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0 border border-emerald-200">
                    {item.photo ? (
                      <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      (item.name || 'S')[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.class} • Roll: {item.rollNo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono font-bold text-slate-700 block">{item.time}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      item.actionType === 'EXIT'
                        ? 'text-amber-800 bg-amber-100'
                        : item.isLate
                        ? 'text-amber-800 bg-amber-100'
                        : 'text-emerald-800 bg-emerald-100'
                    }`}>
                      {item.actionType === 'EXIT' ? 'Out' : item.isLate ? `Late (${item.minutesLate || 0}m)` : 'Present'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* CLASS-WISE ATTENDANCE MODAL */}
      {showClassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 size={20} className="text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900">Class-Wise Attendance Breakdown</h3>
              </div>
              <button 
                onClick={() => setShowClassModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {classBreakdown.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-8">Koi class data mojood nahi hai.</p>
              ) : (
                classBreakdown.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{item.className}</span>
                        {item.late > 0 && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.2 rounded-full">
                            {item.late} Late
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900">{item.present} / {item.total}</span>
                        <span className="text-[10px] font-bold text-emerald-700 ml-1.5">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowClassModal(false)}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs uppercase tracking-wider"
            >
              Close Summary
            </button>
          </div>
        </div>
      )}

      {/* MANUAL SEARCH MODAL */}
      {showManualSearch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">Manual Attendance Search</h3>
              </div>
              <button 
                onClick={() => { setShowManualSearch(false); setManualSearch(''); setManualResults([]); }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                <X size={16} />
              </button>
            </div>

            <input
              type="text"
              value={manualSearch}
              onChange={e => handleManualSearch(e.target.value)}
              placeholder="Type student name, roll number, or staff ID..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400"
              autoFocus
            />

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {manualResults.map(st => (
                <button
                  key={st.id}
                  onClick={() => handleSelectManualStudent(st)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-black text-sm shrink-0 overflow-hidden border border-emerald-200">
                    {st.photoUrl || st.profilePhoto ? (
                      <img src={st.photoUrl || st.profilePhoto} className="w-full h-full object-cover" alt={st.name} />
                    ) : (
                      (st.name || 'S')[0].toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-900 font-bold text-sm truncate">{st.name}</p>
                    <p className="text-slate-500 text-xs">
                      {st.memberType === 'staff' ? `${st.department} • ID: ${st.staffId || st.employeeId || st.id}` : `${st.class} • Roll: ${st.rollNumber || st.rollNo || 'N/A'}`}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300">
                    Mark Present
                  </span>
                </button>
              ))}

              {manualSearch && manualResults.length === 0 && (
                <p className="text-center text-slate-400 text-xs py-6">Koi student ya staff nahi mila.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED TERMINAL SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders size={20} className="text-emerald-600" />
                <h3 className="text-lg font-black text-slate-900">Terminal & Hardware Settings</h3>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-bold max-h-[480px] overflow-y-auto pr-1">
              {/* Sound Beep Mode */}
              <div className="space-y-1">
                <label className="text-slate-600 uppercase tracking-wider block">Scanner Beep Feedback</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSoundEffectType('chime')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${soundEffectType === 'chime' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                  >
                    🎵 Airport Chime
                  </button>
                  <button
                    onClick={() => setSoundEffectType('retail')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${soundEffectType === 'retail' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                  >
                    🔔 Retail Beep
                  </button>
                  <button
                    onClick={() => setSoundEffectType('mute')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${soundEffectType === 'mute' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                  >
                    🔇 Mute Beep
                  </button>
                </div>
              </div>

              {/* Voice Speech Language */}
              <div className="space-y-1">
                <label className="text-slate-600 uppercase tracking-wider block">Announcement Voice</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setVoiceLanguage('ur')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${voiceLanguage === 'ur' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                  >
                    Urdu Voice (علی رضا - حاضر)
                  </button>
                  <button
                    onClick={() => setVoiceLanguage('en')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${voiceLanguage === 'en' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                  >
                    English Voice (Ali Raza - Present)
                  </button>
                </div>
              </div>

              {/* School Start Time for Late Detection */}
              <div className="space-y-1">
                <label className="text-slate-600 uppercase tracking-wider block">School Start Time (Late Detection)</label>
                <input
                  type="time"
                  value={schoolStartTime}
                  onChange={(e) => setSchoolStartTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 font-bold"
                />
                <p className="text-[10px] text-slate-400 font-normal">Is waqt ke baad scan hone wale students automatically "Late" mark honge.</p>
              </div>

              {/* School End Time for Early Departure Detection */}
              <div className="space-y-1">
                <label className="text-slate-600 uppercase tracking-wider block">School Closing Time (Early Exit Alert)</label>
                <input
                  type="time"
                  value={schoolEndTime}
                  onChange={(e) => setSchoolEndTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 font-bold"
                />
                <p className="text-[10px] text-slate-400 font-normal">Is se pehle exit scan karne par "Early Departure / Gate Pass" tag hoga.</p>
              </div>

              {/* Anti-Duplicate Cooldown Seconds */}
              <div className="space-y-1">
                <label className="text-slate-600 uppercase tracking-wider block">Double Scan Cooldown (Seconds)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={doubleScanCooldownSec}
                  onChange={(e) => setDoubleScanCooldownSec(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 font-bold"
                />
                <p className="text-[10px] text-slate-400 font-normal">Itnay seconds ke dauran dobara scan karne par error se bachata hai.</p>
              </div>

              {/* Theme Selector */}
              <div className="space-y-1">
                <label className="text-slate-600 uppercase tracking-wider block">Interface Appearance</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setThemeMode('light')}
                    className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${themeMode === 'light' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                  >
                    <Sun size={14} /> Crisp Light Theme
                  </button>
                  <button
                    onClick={() => setThemeMode('dark')}
                    className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${themeMode === 'dark' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                  >
                    <Moon size={14} /> Dark Kiosk Theme
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all"
            >
              Save & Apply Settings
            </button>
          </div>
        </div>
      )}

      {/* Embedded Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan-laser {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-laser {
          animation: scan-laser 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes slide-down {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        #qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}} />
    </div>
  );
}
