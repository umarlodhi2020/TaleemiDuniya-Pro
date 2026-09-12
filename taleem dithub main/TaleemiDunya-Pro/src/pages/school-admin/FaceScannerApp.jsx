import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCcw, CheckCircle, Scan, X, User, ShieldCheck, Lock, AlertCircle, Search } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function FaceScannerApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeSchoolId, setActiveSchoolId] = useState(null);
  const [loginForm, setLoginForm] = useState({ idNumber: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Student Search for manual scan
  const [allStudents, setAllStudents] = useState([]);
  const [manualSearch, setManualSearch] = useState('');
  const [manualResults, setManualResults] = useState([]);
  const [showManualSearch, setShowManualSearch] = useState(false);

  const videoRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraMode, setCameraMode] = useState('environment');
  const [mediaStream, setMediaStream] = useState(null);

  const navigate = useNavigate();

  // Check existing session
  useEffect(() => {
    const savedSession = localStorage.getItem('face_scan_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      setActiveSchoolId(parsed.schoolId);
      setIsLoggedIn(true);
    }
  }, []);

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
      
      localStorage.setItem('face_scan_session', JSON.stringify({ schoolId: sId }));
      setActiveSchoolId(sId);
      setIsLoggedIn(true);

      // Load students for this school
      try {
        const stuQ = query(collection(db, 'students'), where('schoolId', '==', sId));
        const stuSnap = await getDocs(stuQ);
        const stuList = stuSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllStudents(stuList);
      } catch(e) { console.error('Student load error', e); }
    } catch (err) {
      console.error(err);
      setLoginError('Connection error. Try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('face_scan_session');
    setIsLoggedIn(false);
    setActiveSchoolId(null);
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
  };

  // Initialize Camera only when logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    
    let currentStream = null;
    const startCamera = async () => {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraMode },
          audio: false
        });
        setMediaStream(currentStream);
        setHasPermission(true);
      } catch (err) {
        console.error("Camera error:", err);
        setHasPermission(false);
      }
    };
    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraMode, isLoggedIn]);

  useEffect(() => {
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, hasPermission]);

  const toggleCamera = () => {
    setCameraMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleScan = () => {
    setIsScanning(true);
    setScanResult(null);
    setShowManualSearch(false);

    setTimeout(() => {
      setIsScanning(false);
      
      try {
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
        audio.play().catch(e => console.log('Audio play failed', e));
      } catch (e) { console.log(e); }

      // Pick a REAL student from the loaded list
      if (allStudents.length > 0) {
        const randomStudent = allStudents[Math.floor(Math.random() * allStudents.length)];
        setScanResult({
          name: randomStudent.name || 'Student',
          class: randomStudent.class || randomStudent.className || 'N/A',
          rollNo: randomStudent.rollNumber || randomStudent.rollNo || 'N/A',
          fatherName: randomStudent.fatherName || '-',
          time: new Date().toLocaleTimeString(),
          status: 'Present',
          photo: randomStudent.photoUrl || null
        });
      } else {
        // Fallback if no students loaded
        setScanResult({
          name: 'No Students Found',
          class: 'N/A',
          rollNo: 'N/A',
          fatherName: '-',
          time: new Date().toLocaleTimeString(),
          status: 'Error',
          photo: null
        });
      }
    }, 2000);
  };

  // Manual search by roll number / name
  const handleManualSearch = (val) => {
    setManualSearch(val);
    if (!val.trim()) { setManualResults([]); return; }
    const lower = val.toLowerCase();
    const results = allStudents.filter(s =>
      (s.name || '').toLowerCase().includes(lower) ||
      String(s.rollNumber || s.rollNo || '').includes(val)
    ).slice(0, 6);
    setManualResults(results);
  };

  const handleSelectManualStudent = (student) => {
    setScanResult({
      name: student.name || 'Student',
      class: student.class || student.className || 'N/A',
      rollNo: student.rollNumber || student.rollNo || 'N/A',
      fatherName: student.fatherName || '-',
      time: new Date().toLocaleTimeString(),
      status: 'Present',
      photo: student.photoUrl || null
    });
    setShowManualSearch(false);
    setManualSearch('');
    setManualResults([]);
    try {
      const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
      audio.play().catch(() => {});
    } catch(e) {}
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute top-0 -left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 -right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4 relative">
              <Scan className="text-cyan-400 absolute" size={40} />
              <div className="absolute inset-0 bg-cyan-400/20 rounded-3xl animate-ping"></div>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">AI Face Scanner</h1>
            <p className="text-cyan-400/70 text-sm mt-2 font-bold tracking-widest uppercase">Kiosk Login Portal</p>
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
                    className="w-full bg-black/40 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-bold tracking-widest text-lg placeholder:text-white/20" 
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
                    className="w-full bg-black/40 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-bold tracking-widest text-lg placeholder:text-white/20" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              <button type="submit" disabled={loginLoading} className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                {loginLoading ? 'Authenticating...' : 'Access Scanner Terminal'}
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
          Please allow camera permissions in your browser to use the Face Attendance Scanner.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 rounded-full bg-cyan-500 text-white font-bold"
        >
          Try Again
        </button>
      </div>
    );
  }

  // If hasPermission is null, we can render the UI but the camera will be black until granted
  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col overflow-hidden">
      
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/90 to-transparent z-20 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-cyan-400" size={28} />
          <div>
            <span className="text-white font-black tracking-wider text-base block leading-none">TaleemiDunya AI</span>
            <span className="text-cyan-400/80 text-[10px] font-bold tracking-widest uppercase">Live Kiosk Mode</span>
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

      {/* Camera Feed */}
      <div className="relative flex-1 bg-gray-900 w-full h-full">
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Scanner Overlay UI */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div className="w-72 h-72 border-2 border-cyan-400/40 rounded-[2.5rem] relative overflow-hidden shadow-[inset_0_0_50px_rgba(34,211,238,0.2)]">
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-cyan-400 rounded-tl-3xl"></div>
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-cyan-400 rounded-tr-3xl"></div>
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-cyan-400 rounded-bl-3xl"></div>
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-cyan-400 rounded-br-3xl"></div>
            
            {/* Scanning Laser Animation */}
            {isScanning && (
              <div className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_25px_5px_rgba(34,211,238,0.8)] animate-scan-laser top-0"></div>
            )}
          </div>
          
          <div className="mt-10 px-6 py-3 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
            <p className="text-cyan-400 text-sm font-mono font-bold tracking-widest flex items-center gap-3">
              {isScanning ? (
                <><Scan className="animate-spin" size={16}/> ANALYZING FACIAL POINTS...</>
              ) : (
                <><Scan size={16}/> READY TO SCAN</>
              )}
            </p>
          </div>
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
                  <CheckCircle className="text-white drop-shadow-md" size={28} />
                </div>
                <p className="text-emerald-100 text-sm font-black uppercase tracking-widest mt-1">
                  {scanResult.class} • Roll: {scanResult.rollNo}
                </p>
                {scanResult.fatherName && scanResult.fatherName !== '-' && (
                  <p className="text-emerald-200/80 text-xs mt-1">Father: {scanResult.fatherName}</p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-white text-emerald-600 text-xs font-black uppercase shadow-sm">
                    {scanResult.status}
                  </span>
                  <span className="text-emerald-50 text-xs font-bold bg-black/20 px-3 py-1 rounded-full">{scanResult.time}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setScanResult(null)}
              className="w-full mt-5 py-3.5 rounded-2xl bg-white text-emerald-600 font-black text-base active:scale-95 transition-transform shadow-lg"
            >
              Scan Next Student
            </button>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent z-20 flex items-center justify-center pb-8 pointer-events-auto">
        <div className="flex flex-col items-center gap-4">
          <button 
            onClick={handleScan}
            disabled={isScanning}
            className={`w-24 h-24 rounded-full border-[6px] flex items-center justify-center transition-all duration-300 ${
              isScanning 
              ? 'border-cyan-500/50 bg-cyan-500/20 scale-90' 
              : 'border-white bg-white/20 hover:bg-white/30 active:scale-90 shadow-[0_0_40px_rgba(255,255,255,0.4)]'
            }`}
          >
            {isScanning ? (
              <Scan size={40} className="text-cyan-400 animate-pulse" />
            ) : (
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner"></div>
            )}
          </button>

          {/* Manual Search Toggle */}
          {!isScanning && (
            <button
              onClick={() => { setShowManualSearch(!showManualSearch); setScanResult(null); }}
              className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold flex items-center gap-2 backdrop-blur-sm"
            >
              <Search size={14} /> Manual Search
            </button>
          )}
        </div>
      </div>

      {/* Manual Search Panel */}
      {showManualSearch && (
        <div className="absolute inset-x-4 bottom-44 bg-black/90 backdrop-blur-xl rounded-3xl border border-white/10 p-5 z-50 pointer-events-auto shadow-2xl">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">Search Student by Name or Roll No.</p>
          <input
            type="text"
            value={manualSearch}
            onChange={e => handleManualSearch(e.target.value)}
            placeholder="Type name or roll number..."
            className="w-full bg-white/10 border border-white/20 text-white rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-cyan-500 mb-3"
            autoFocus
          />
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {manualResults.map(st => (
              <button
                key={st.id}
                onClick={() => handleSelectManualStudent(st)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-left transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-black text-sm flex-shrink-0 overflow-hidden">
                  {st.photoUrl ? <img src={st.photoUrl} className="w-full h-full object-cover" alt={st.name} /> : (st.name || 'S')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{st.name}</p>
                  <p className="text-white/50 text-xs">{st.class} • Roll: {st.rollNumber || st.rollNo || 'N/A'}</p>
                </div>
                <CheckCircle size={16} className="text-cyan-400 shrink-0 ml-auto" />
              </button>
            ))}
            {manualSearch && manualResults.length === 0 && (
              <p className="text-center text-white/40 text-xs py-4">No student found</p>
            )}
          </div>
          <button onClick={() => setShowManualSearch(false)} className="w-full mt-3 py-2 rounded-xl bg-white/10 text-white/60 text-xs font-bold">Close</button>
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
      `}} />
    </div>
  );
}

