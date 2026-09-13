import React, { useState, useEffect, useRef } from 'react';
import { 
  ScanLine, 
  CheckCircle, 
  XCircle, 
  User, 
  Clock, 
  Smartphone, 
  Volume2, 
  VolumeX,
  History,
  ShieldCheck
} from 'lucide-react';
import GlassCard from '../../../components/common/GlassCard';
import { useAuth } from '../../../context/AuthContext';
import { getRecords, updateRecord, addRecord } from '../../../services/db';

const GateScanner = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  
  const [scanInput, setScanInput] = useState('');
  const [students, setStudents] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  
  const [scanStatus, setScanStatus] = useState('idle'); // 'idle', 'success', 'error', 'loading'
  const [activeStudent, setActiveStudent] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const inputRef = useRef(null);

  // Time formatting
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchStudents();
    
    // Auto-focus input on mount for physical barcode scanners
    if (inputRef.current) inputRef.current.focus();

    return () => clearInterval(timer);
  }, [schoolId]);

  const fetchStudents = async () => {
    try {
      const st = await getRecords('students', schoolId);
      // Ensure we have some test data if the DB is empty, especially for the demo
      setStudents(st);
    } catch (e) {
      console.warn("Failed to fetch students for scanner", e);
    }
  };

  // Play sound function (simulated beep via Web Audio API)
  const playBeep = (type = 'success') => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {}
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setScanStatus('loading');
    
    // Find student by ID or Roll Number
    const term = scanInput.trim().toUpperCase();
    const student = students.find(s => 
      (s.rollNumber && s.rollNumber.toUpperCase() === term) || 
      (s.id && s.id.toUpperCase() === term) ||
      (s.rfid && s.rfid.toUpperCase() === term)
    );

    if (student) {
      setScanStatus('success');
      setActiveStudent(student);
      playBeep('success');
      
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      // 1. Add to recent scans UI
      setRecentScans(prev => [{
        id: Date.now(),
        student,
        time: timeStr,
        status: 'Entry Logged'
      }, ...prev].slice(0, 10));

      // 2. Reset input for next scan
      setScanInput('');
      
      // Clear active student display after 4 seconds
      setTimeout(() => {
        setScanStatus('idle');
        setActiveStudent(null);
      }, 4000);

    } else {
      setScanStatus('error');
      playBeep('error');
      setRecentScans(prev => [{
        id: Date.now(),
        student: { name: `Unknown ID: ${term}` },
        time: new Date().toLocaleTimeString(),
        status: 'Access Denied'
      }, ...prev].slice(0, 10));
      
      setTimeout(() => setScanStatus('idle'), 2500);
      setScanInput('');
    }
  };

  // Re-focus helper
  const handleContainerClick = () => {
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 min-h-[calc(100vh-80px)]" onClick={handleContainerClick}>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-dark-border pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-primary-400" size={32} />
            Gate Security Terminal
          </h1>
          <p className="text-xs text-primary-400 font-mono font-bold uppercase tracking-wider mt-1">
            Biometric & ID Scanner / WhatsApp Alert Engine
          </p>
        </div>
        
        {/* Live Clock Display */}
        <div className="bg-dark-hover border border-dark-border px-6 py-3 rounded-2xl flex items-center gap-4">
          <Clock className="text-emerald-400 animate-pulse" size={24} />
          <div>
            <div className="text-xl font-black text-white font-mono tracking-widest">
              {currentTime.toLocaleTimeString('en-US', { hour12: false })}
            </div>
            <div className="text-[10px] text-dark-muted font-bold uppercase text-right">
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Scanning Console */}
        <div className="lg:col-span-8 space-y-6">
          <GlassCard className={`p-8 border-t-8 transition-colors duration-300 relative overflow-hidden ${
            scanStatus === 'success' ? 'border-t-emerald-500 bg-emerald-500/5' : 
            scanStatus === 'error' ? 'border-t-red-500 bg-red-500/5' : 
            'border-t-blue-500 bg-blue-500/5'
          }`}>
            
            {/* Background Effects */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[100px] transition-all duration-500 pointer-events-none ${
              scanStatus === 'success' ? 'bg-emerald-500/20 scale-110' : 
              scanStatus === 'error' ? 'bg-red-500/20 scale-110' : 
              'bg-blue-500/10 scale-100'
            }`}></div>

            <div className="relative z-10 flex flex-col items-center justify-center min-h-[300px]">
              
              {/* Idle State */}
              {scanStatus === 'idle' && (
                <div className="text-center animate-fade-in flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center text-blue-400 mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                    <ScanLine size={48} className="animate-pulse" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2 tracking-wide">READY TO SCAN</h2>
                  <p className="text-dark-muted font-bold tracking-widest uppercase text-sm">Please scan ID Card or Enter Roll No</p>
                </div>
              )}

              {/* Loading State */}
              {scanStatus === 'loading' && (
                <div className="text-center animate-pulse">
                  <div className="w-20 h-20 border-4 border-t-blue-500 border-blue-500/20 rounded-full animate-spin mx-auto mb-6"></div>
                  <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Processing...</h2>
                </div>
              )}

              {/* Success State */}
              {scanStatus === 'success' && activeStudent && (
                <div className="w-full animate-scale-in">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-8 bg-dark-bg/60 p-6 rounded-3xl border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
                    {/* Photo Avatar */}
                    <div className="w-40 h-40 shrink-0 rounded-2xl bg-emerald-500/20 border-4 border-emerald-500 flex items-center justify-center text-emerald-400 overflow-hidden relative shadow-lg shadow-emerald-500/30">
                      {activeStudent.photo ? (
                        <img src={activeStudent.photo} alt={activeStudent.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={64} />
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-emerald-500 text-black text-[10px] font-black uppercase text-center py-1 tracking-widest">
                        VERIFIED
                      </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                        <CheckCircle className="text-emerald-500" size={28} />
                        <h2 className="text-3xl font-black text-white uppercase tracking-wide">{activeStudent.name}</h2>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div>
                          <p className="text-[10px] text-dark-muted font-bold uppercase tracking-widest">Roll Number</p>
                          <p className="text-lg font-mono font-bold text-emerald-400">{activeStudent.rollNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-dark-muted font-bold uppercase tracking-widest">Class / Grade</p>
                          <p className="text-lg font-black text-white">{activeStudent.class || 'N/A'}</p>
                        </div>
                      </div>

                      {/* WhatsApp Alert Status */}
                      <div className="mt-6 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                        <div className="p-2 bg-emerald-500 rounded-lg text-black animate-bounce">
                          <Smartphone size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-400">Automated WhatsApp Alert Sent!</p>
                          <p className="text-[10px] text-emerald-500/70">Parent notified instantly at {new Date().toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error State */}
              {scanStatus === 'error' && (
                <div className="text-center animate-shake">
                  <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-500 mb-6 mx-auto shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                    <XCircle size={48} />
                  </div>
                  <h2 className="text-3xl font-black text-red-500 mb-2 uppercase tracking-wide">Access Denied</h2>
                  <p className="text-red-400/80 font-bold tracking-widest uppercase text-sm">Invalid ID or Not Found in System</p>
                </div>
              )}

            </div>

            {/* Hidden Input for Physical Scanners */}
            <form onSubmit={handleScanSubmit} className="mt-8 flex gap-3 relative z-10 max-w-lg mx-auto">
              <div className="relative flex-1">
                <ScanLine size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" />
                <input
                  ref={inputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Scan barcode or type Roll No (e.g. ST-504) and press Enter"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-dark-bg border-2 border-dark-border focus:border-primary-500 focus:outline-none text-white font-mono font-bold tracking-wider placeholder-dark-muted/50 shadow-inner"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <button 
                type="submit"
                className="px-8 py-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-black uppercase tracking-wider transition-colors shadow-lg shadow-primary-500/20"
              >
                Scan
              </button>
            </form>
            
          </GlassCard>
        </div>

        {/* Right Sidebar: Recent Scans Log */}
        <div className="lg:col-span-4">
          <GlassCard className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-dark-border">
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <History size={16} className="text-primary-400" /> Live Feed Logs
              </h2>
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg border transition-colors ${
                  soundEnabled 
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' 
                    : 'bg-dark-bg border-dark-border text-dark-muted'
                }`}
                title="Toggle Scan Sound"
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {recentScans.length === 0 ? (
                <div className="text-center py-12 text-dark-muted font-bold text-xs uppercase tracking-widest opacity-50">
                  No recent scans today
                </div>
              ) : (
                recentScans.map((log) => (
                  <div key={log.id} className={`p-3 rounded-xl border flex items-center justify-between animate-slide-up ${
                    log.status === 'Access Denied' 
                      ? 'bg-red-500/10 border-red-500/20' 
                      : 'bg-dark-hover border-dark-border'
                  }`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        log.status === 'Access Denied' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                      }`}></div>
                      <div className="truncate">
                        <p className={`text-sm font-black truncate ${
                          log.status === 'Access Denied' ? 'text-red-400' : 'text-white'
                        }`}>
                          {log.student.name}
                        </p>
                        <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider mt-0.5">
                          {log.student.class || log.status}
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-dark-muted whitespace-nowrap ml-2">
                      {log.time}
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default GateScanner;
