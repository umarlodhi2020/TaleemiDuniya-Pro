import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCcw, CheckCircle, Scan, X, User, ShieldCheck, Lock, AlertCircle, Search, QrCode } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Html5Qrcode } from 'html5-qrcode';

export default function QrScannerApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeSchoolId, setActiveSchoolId] = useState(null);
  const [loginForm, setLoginForm] = useState({ idNumber: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Student Search for manual scan
  const [allStudents, setAllStudents] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [manualSearch, setManualSearch] = useState('');
  const [manualResults, setManualResults] = useState([]);
  const [showManualSearch, setShowManualSearch] = useState(false);

  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraMode, setCameraMode] = useState('environment');

  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const physicalInputRef = useRef(null);
  const [physicalInput, setPhysicalInput] = useState('');

  const navigate = useNavigate();

  // Check existing session
  useEffect(() => {
    const savedSession = localStorage.getItem('qr_scan_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      setActiveSchoolId(parsed.schoolId);
      setIsLoggedIn(true);
    }
  }, []);

  const allStudentsRef = useRef([]);
  const allStaffRef = useRef([]);

  // Fetch all students when logged in
  useEffect(() => {
    const fetchMembers = async () => {
      if (isLoggedIn) {
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
        } catch(e) { console.error('Data load error', e); }
      }
    };
    fetchMembers();
  }, [isLoggedIn, activeSchoolId]);

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
    stopScanner();
  };

  const startScanner = async () => {
    if (!scannerRef.current) return;
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      }
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      
      setHasPermission(true);
      
      await html5QrCodeRef.current.start(
        { facingMode: cameraMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // parse errors are normal (no qr code found in frame)
        }
      );
    } catch (err) {
      console.error("Camera error:", err);
      setHasPermission(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  // Initialize Camera only when logged in
  useEffect(() => {
    if (isLoggedIn && !scanResult) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [cameraMode, isLoggedIn, scanResult]);

  // Keep physical input focused when not searching manually
  useEffect(() => {
    if (isLoggedIn && !showManualSearch && physicalInputRef.current) {
      physicalInputRef.current.focus();
    }
  }, [isLoggedIn, showManualSearch, scanResult]);

  const toggleCamera = () => {
    setCameraMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const processStudentScan = (scannedValue) => {
    const val = String(scannedValue).trim().toLowerCase();
    
    // Find student by ID or Roll Number
    let foundMember = allStudentsRef.current.find(s =>
      (s.id && s.id.toLowerCase() === val) ||
      (s.rollNumber && String(s.rollNumber).trim().toLowerCase() === val) ||
      (s.grNo && String(s.grNo).trim().toLowerCase() === val) ||
      (s.grNumber && String(s.grNumber).trim().toLowerCase() === val) ||
      (s.registrationNo && String(s.registrationNo).trim().toLowerCase() === val) ||
      (s.rollNo && String(s.rollNo).trim().toLowerCase() === val)
    );
    
    // Check staff if not found
    if (!foundMember) {
      foundMember = allStaffRef.current.find(s => 
        (s.id && s.id.toLowerCase() === val) ||
        (s.employeeId && String(s.employeeId).trim().toLowerCase() === val) ||
        (s.staffId && String(s.staffId).trim().toLowerCase() === val)
      );
    }

    if (foundMember) {
      markAttendance(foundMember);
    } else {
      showErrorResult(val);
    }
  };

  const handleScanSuccess = (decodedText) => {
    if (isScanning || scanResult) return;
    setIsScanning(true);
    // stopScanner(); // Don't stop camera hardware
    
    setTimeout(() => {
      setIsScanning(false);
      processStudentScan(decodedText);
    }, 500);
  };

  const handlePhysicalInputSubmit = (e) => {
    e.preventDefault();
    if (!physicalInput.trim() || isScanning || scanResult) return;
    
    setIsScanning(true);
    stopScanner();
    
    const scannedVal = physicalInput;
    setPhysicalInput('');
    
    setTimeout(() => {
      setIsScanning(false);
      processStudentScan(scannedVal);
    }, 500);
  };

  const markAttendance = async (member) => {
    try {
      const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));
    } catch (e) { console.log(e); }

    // Save to Database
    try {
      if (member.memberType === 'student') {
        await addDoc(collection(db, 'attendance'), {
          studentId: member.id,
          studentName: member.name || 'Student',
          rollNumber: member.rollNumber || member.rollNo || 'N/A',
          class: member.class || member.className || 'N/A',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString(),
          status: 'present',
          schoolId: activeSchoolId
        });
        
        setScanResult({
          name: member.name || 'Student',
          class: member.class || member.className || 'N/A',
          rollNo: member.rollNumber || member.rollNo || 'N/A',
          fatherName: member.fatherName || '-',
          time: new Date().toLocaleTimeString(),
          status: 'Present',
          photo: member.photoUrl || member.profilePhoto || null
        });
      } else {
        const today = new Date().toISOString().split('T')[0];
        const docId = `${member.id}_${today}`;
        const docRef = doc(db, 'attendance', docId);
        
        await setDoc(docRef, {
          id: docId,
          staffId: member.id,
          employeeId: member.employeeId || member.id,
          staffName: member.name || 'Staff',
          department: member.department || 'General',
          designation: member.designation || member.role || '',
          date: today,
          time: new Date().toLocaleTimeString(),
          status: 'present',
          type: 'staff',
          schoolId: activeSchoolId,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        setScanResult({
          name: member.name || 'Staff',
          class: member.department || 'Staff',
          rollNo: member.staffId || member.employeeId || member.id,
          fatherName: member.designation || member.role || '-',
          time: new Date().toLocaleTimeString(),
          status: 'Present',
          photo: member.photoUrl || member.profilePhoto || null
        });
      }
    } catch (err) { console.error('Failed to save attendance', err); }
  };

  const showErrorResult = (scannedVal) => {
    try {
      const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));
    } catch (e) { console.log(e); }

    setScanResult({
      name: 'NotFound: ' + (scannedVal || '').substring(0,25),
      class: 'N/A',
      rollNo: 'N/A',
      fatherName: '-',
      time: new Date().toLocaleTimeString(),
      status: 'Error',
      photo: null
    });
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
    const results = [...stuResults, ...staffResults].slice(0, 6);
    setManualResults(results);
  };

  const handleSelectManualStudent = (student) => {
    stopScanner();
    markAttendance(student);
    setShowManualSearch(false);
    setManualSearch('');
    setManualResults([]);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute top-0 -left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 -right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 relative">
              <QrCode className="text-emerald-400 absolute" size={40} />
              <div className="absolute inset-0 bg-emerald-400/20 rounded-3xl animate-ping"></div>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">QR/Barcode Scanner</h1>
            <p className="text-emerald-400/70 text-sm mt-2 font-bold tracking-widest uppercase">Fast Attendance Kiosk</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            {loginError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                {loginError}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-white/50 uppercase tracking-widest">School ID Number</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                  <input 
                    type="text" required 
                    value={loginForm.idNumber} onChange={(e) => setLoginForm({ ...loginForm, idNumber: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-bold tracking-widest text-lg placeholder:text-white/20" 
                    placeholder="e.g. 54321" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-white/50 uppercase tracking-widest">App Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                  <input 
                    type="password" required 
                    value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-bold tracking-widest text-lg placeholder:text-white/20" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              <button type="submit" disabled={loginLoading} className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                {loginLoading ? 'Authenticating...' : 'Access QR Terminal'}
              </button>
            </form>
          </div>
          
          <button onClick={() => navigate(-1)} className="mt-8 text-white/40 hover:text-white/80 text-sm font-bold w-full text-center transition-colors">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <Camera size={64} className="text-gray-500 mb-4" />
        <h2 className="text-2xl font-black text-white mb-2">Camera Access Required</h2>
        <p className="text-gray-400 text-sm mb-8 max-w-xs mx-auto">
          Please allow camera permissions in your browser to use the QR Attendance Scanner.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 rounded-full bg-emerald-500 text-white font-bold"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col overflow-hidden">
      
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/90 to-transparent z-20 flex items-center justify-between px-6 pointer-events-auto">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-emerald-400" size={28} />
          <div>
            <span className="text-white font-black tracking-wider text-base block leading-none">TaleemiDunya FAST</span>
            <span className="text-emerald-400/80 text-[10px] font-bold tracking-widest uppercase">Live QR Mode • {allStudents.length} Students • {allStaff.length} Staff</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={toggleCamera} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all hover:bg-white/20">
            <RefreshCcw size={20} />
          </button>
          
          <button onClick={handleLogout} className="w-12 h-12 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 flex items-center justify-center text-red-400 active:scale-95 transition-all hover:bg-red-500/30">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Hidden input for Physical Scanner Gun */}
      <form onSubmit={handlePhysicalInputSubmit} className="absolute opacity-0 pointer-events-none">
        <input 
          ref={physicalInputRef}
          type="text" 
          value={physicalInput} 
          onChange={(e) => setPhysicalInput(e.target.value)} 
          autoFocus
          onBlur={() => { if (!showManualSearch && !scanResult) physicalInputRef.current?.focus(); }}
        />
      </form>

      {/* Camera Feed Container */}
      <div className="relative flex-1 bg-gray-900 w-full h-full flex items-center justify-center">
        
        {/* html5-qrcode attaches video here */}
        <div id="qr-reader" ref={scannerRef} className="absolute inset-0 w-full h-full object-cover border-none" style={{ border: 'none' }}></div>

        {/* Scanner Overlay UI */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10 bg-black/30">
          <div className="w-72 h-72 border-2 border-emerald-400/40 rounded-3xl relative overflow-hidden shadow-[inset_0_0_50px_rgba(16,185,129,0.2)]">
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl"></div>
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl"></div>
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl"></div>
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl"></div>
            
            {/* Scanning Laser Animation */}
            {!scanResult && (
              <div className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_25px_5px_rgba(16,185,129,0.8)] animate-scan-laser top-0"></div>
            )}
          </div>
          
          <div className="mt-10 px-6 py-3 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
            <p className="text-emerald-400 text-sm font-mono font-bold tracking-widest flex items-center gap-3">
              {isScanning ? (
                <><Scan className="animate-spin" size={16}/> PROCESSING QR...</>
              ) : scanResult ? (
                <><CheckCircle size={16}/> SCANNED SUCCESSFULLY</>
              ) : (
                <><QrCode size={16}/> POSITION QR CODE IN FRAME</>
              )}
            </p>
          </div>
          
          {/* Tip for scanner gun */}
          {!scanResult && (
            <p className="mt-4 text-white/50 text-xs font-bold tracking-widest uppercase">
              Or use physical Barcode Scanner gun
            </p>
          )}
        </div>

        {/* Scan Result Popup */}
        {scanResult && !isScanning && (
          <div className="absolute inset-x-6 top-32 bg-emerald-500/95 backdrop-blur-xl rounded-3xl border border-emerald-400/50 p-6 shadow-[0_20px_50px_rgba(16,185,129,0.3)] animate-slide-down pointer-events-auto z-50">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/30 overflow-hidden">
                {scanResult.photo ? (
                  <img src={scanResult.photo} alt={scanResult.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-white">{scanResult.name}</h3>
                  {scanResult.status === 'Error' ? (
                    <AlertCircle className="text-red-300 drop-shadow-md" size={28} />
                  ) : (
                    <CheckCircle className="text-white drop-shadow-md" size={28} />
                  )}
                </div>
                <p className="text-emerald-100 text-sm font-black uppercase tracking-widest mt-1">
                  {scanResult.class} • Roll: {scanResult.rollNo}
                </p>
                {scanResult.fatherName && scanResult.fatherName !== '-' && (
                  <p className="text-emerald-200/80 text-xs mt-1">Father: {scanResult.fatherName}</p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase shadow-sm ${scanResult.status === 'Error' ? 'bg-red-100 text-red-600' : 'bg-white text-emerald-600'}`}>
                    {scanResult.status}
                  </span>
                  <span className="text-emerald-50 text-xs font-bold bg-black/20 px-3 py-1 rounded-full">{scanResult.time}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => {
                setScanResult(null);
                setIsScanning(false);
              }}
              className="w-full mt-5 py-3.5 rounded-2xl bg-white text-emerald-600 font-black text-base active:scale-95 transition-transform shadow-lg"
            >
              Scan Next Member
            </button>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black via-black/80 to-transparent z-20 flex items-center justify-center pb-6 pointer-events-auto">
        <div className="flex flex-col items-center gap-4">
          {/* Manual Search Toggle */}
          {!isScanning && (
            <button
              onClick={() => { 
                setShowManualSearch(!showManualSearch); 
                setScanResult(null); 
                if(!showManualSearch) stopScanner();
                else startScanner();
              }}
              className="px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white text-sm font-bold flex items-center gap-2 backdrop-blur-sm active:scale-95 transition-all"
            >
              <Search size={16} /> {showManualSearch ? 'Cancel Manual Search' : 'Manual Search'}
            </button>
          )}
        </div>
      </div>

      {/* Manual Search Panel */}
      {showManualSearch && (
        <div className="absolute inset-x-4 bottom-32 bg-black/90 backdrop-blur-xl rounded-3xl border border-white/10 p-5 z-50 pointer-events-auto shadow-2xl">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">Search Member by Name or ID</p>
          <input
            type="text"
            value={manualSearch}
            onChange={e => handleManualSearch(e.target.value)}
            placeholder="Type name, roll number, or ID..."
            className="w-full bg-white/10 border border-white/20 text-white rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 mb-3"
            autoFocus
          />
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {manualResults.map(st => (
              <button
                key={st.id}
                onClick={() => handleSelectManualStudent(st)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-left transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm flex-shrink-0 overflow-hidden">
                  {st.photoUrl || st.profilePhoto ? <img src={st.photoUrl || st.profilePhoto} className="w-full h-full object-cover" alt={st.name} /> : (st.name || 'S')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{st.name}</p>
                  <p className="text-white/50 text-xs">{st.memberType === 'staff' ? `${st.department} • ID: ${st.staffId || st.employeeId || st.id}` : `${st.class} • Roll: ${st.rollNumber || st.rollNo || 'N/A'}`}</p>
                </div>
                <CheckCircle size={16} className="text-emerald-400 shrink-0 ml-auto" />
              </button>
            ))}
            {manualSearch && manualResults.length === 0 && (
              <p className="text-center text-white/40 text-xs py-4">No member found</p>
            )}
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan-laser {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-laser {
          animation: scan-laser 2s ease-in-out infinite;
        }
        @keyframes slide-down {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        #qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        #qr-reader__scan_region {
          background-color: #111827 !important;
        }
        #qr-reader__dashboard_section_csr span {
          color: white !important;
        }
        #qr-reader__dashboard_section_csr select {
          background: #1f2937 !important;
          color: white !important;
        }
      `}} />
    </div>
  );
}







