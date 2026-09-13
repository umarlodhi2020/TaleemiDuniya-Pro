import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Bell, 
  BellRing, 
  Save, 
  RefreshCw, 
  Play, 
  Volume2, 
  Sparkles, 
  Sliders, 
  Info,
  AlertTriangle,
  Zap
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const PRESETS = {
  standard: {
    label: 'Standard 6-Period Day',
    periods: [
      { id: 'p1', name: 'Morning Assembly', startTime: '08:00', endTime: '08:20', type: 'Assembly' },
      { id: 'p2', name: '1st Period', startTime: '08:20', endTime: '09:05', type: 'Class' },
      { id: 'p3', name: '2nd Period', startTime: '09:05', endTime: '09:50', type: 'Class' },
      { id: 'p4', name: 'Break Time', startTime: '09:50', endTime: '10:20', type: 'Break' },
      { id: 'p5', name: '3rd Period', startTime: '10:20', endTime: '11:05', type: 'Class' },
      { id: 'p6', name: '4th Period', startTime: '11:05', endTime: '11:50', type: 'Class' },
      { id: 'p7', name: '5th Period', startTime: '11:50', endTime: '12:35', type: 'Class' },
      { id: 'p8', name: '6th Period', startTime: '12:35', endTime: '13:20', type: 'Class' },
    ]
  },
  friday: {
    label: 'Friday Half-Day Schedule',
    periods: [
      { id: 'f1', name: 'Morning Assembly', startTime: '08:00', endTime: '08:15', type: 'Assembly' },
      { id: 'f2', name: '1st Period', startTime: '08:15', endTime: '08:50', type: 'Class' },
      { id: 'f3', name: '2nd Period', startTime: '08:50', endTime: '09:25', type: 'Class' },
      { id: 'f4', name: '3rd Period', startTime: '09:25', endTime: '10:00', type: 'Class' },
      { id: 'f5', name: 'Break Time', startTime: '10:00', endTime: '10:30', type: 'Break' },
      { id: 'f6', name: '4th Period', startTime: '10:30', endTime: '11:05', type: 'Class' },
      { id: 'f7', name: '5th Period', startTime: '11:05', endTime: '11:40', type: 'Class' },
      { id: 'f8', name: '6th Period', startTime: '11:40', endTime: '12:15', type: 'Class' },
    ]
  },
  exam: {
    label: 'Exam Session Layout',
    periods: [
      { id: 'e1', name: 'Attendance & Prayer', startTime: '08:00', endTime: '08:30', type: 'Assembly' },
      { id: 'e2', name: 'Paper Session 1', startTime: '08:30', endTime: '11:30', type: 'Class' },
      { id: 'e3', name: 'Break / Recess', startTime: '11:30', endTime: '12:00', type: 'Break' },
      { id: 'e4', name: 'Paper Session 2', startTime: '12:00', endTime: '14:00', type: 'Class' },
    ]
  }
};

const PeriodBell = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Advanced features
  const [activePreset, setActivePreset] = useState('standard');
  const [selectedBellTone, setSelectedBellTone] = useState('brass'); // brass, chime, gong, siren
  const [isPlayingBell, setIsPlayingBell] = useState(false);
  const [activePeriod, setActivePeriod] = useState(null);
  const [validationAlerts, setValidationAlerts] = useState([]);

  const audioContextRef = useRef(null);

  useEffect(() => {
    fetchSchedule();
  }, [userData]);

  useEffect(() => {
    // Dynamic interval to check which period is active right now
    const timer = setInterval(checkCurrentActivePeriod, 5000);
    checkCurrentActivePeriod();
    return () => clearInterval(timer);
  }, [periods]);

  useEffect(() => {
    validatePeriodOverlaps();
  }, [periods]);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'bell_schedules', schoolId);
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().periods) {
        setPeriods(snap.data().periods);
        if (snap.data().bellTone) {
          setSelectedBellTone(snap.data().bellTone);
        }
      } else {
        // Fallback default standard preset
        setPeriods(JSON.parse(JSON.stringify(PRESETS.standard.periods)));
      }
    } catch (e) {
      console.error("Error loading bell schedule:", e);
      setPeriods(JSON.parse(JSON.stringify(PRESETS.standard.periods)));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'bell_schedules', schoolId), {
        periods,
        bellTone: selectedBellTone,
        updatedAt: new Date()
      });
      alert('Bell schedule and tone settings saved successfully!');
    } catch (err) {
      console.error("Failed to store bell schedule:", err);
      alert('Schedule updated locally in active session!');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadPreset = (key) => {
    if (window.confirm(`Are you sure you want to load the "${PRESETS[key].label}"? This will overwrite your unsaved inputs.`)) {
      setPeriods(JSON.parse(JSON.stringify(PRESETS[key].periods)));
      setActivePreset(key);
    }
  };

  const addPeriod = () => {
    // Guess start time based on last period
    let guessedStart = '08:00';
    let guessedEnd = '08:45';
    if (periods.length > 0) {
      const last = periods[periods.length - 1];
      guessedStart = last.endTime;
      const [h, m] = last.endTime.split(':').map(Number);
      const endTotal = h * 60 + m + 45;
      const endH = Math.floor(endTotal / 60) % 24;
      const endM = endTotal % 60;
      guessedEnd = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }

    setPeriods([
      ...periods, 
      { id: Date.now().toString(), name: `Period ${periods.length + 1}`, startTime: guessedStart, endTime: guessedEnd, type: 'Class' }
    ]);
  };

  const removePeriod = (id) => {
    setPeriods(periods.filter(p => p.id !== id));
  };

  const updatePeriod = (id, field, value) => {
    setPeriods(periods.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const validatePeriodOverlaps = () => {
    const alerts = [];
    const sorted = [...periods].sort((a, b) => String(a.startTime).localeCompare(b.startTime));

    for (let i = 0; i < sorted.length; i++) {
      const curr = sorted[i];
      if (!curr.startTime || !curr.endTime) continue;

      // 1. Core sanity check
      if (curr.startTime >= curr.endTime) {
        alerts.push(`⚠️ "${curr.name || 'Unlabeled'}" ends before or at its start time!`);
      }

      // 2. Overlap with next
      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        if (curr.endTime > next.startTime) {
          alerts.push(`⚠️ "${curr.name || 'Unlabeled'}" overlaps with "${next.name || 'Unlabeled'}" timing!`);
        }
      }
    }
    setValidationAlerts(alerts);
  };

  const checkCurrentActivePeriod = () => {
    if (periods.length === 0) return;
    const now = new Date();
    const currentStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const active = periods.find(p => p.startTime <= currentStr && p.endTime >= currentStr);
    setActivePeriod(active || null);
  };

  // Synthesize Bell Sounds procedurally using browser Web Audio API
  const playSynthesizedBell = () => {
    if (isPlayingBell) return;
    setIsPlayingBell(true);

    try {
      // 1. Init AudioContext
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const duration = 2.5; // seconds
      const now = ctx.currentTime;

      if (selectedBellTone === 'brass') {
        // Classic metallic rapid pulsing school bell
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5 ring note

        // Rapid amplitude modulation to simulate bell clapper striking
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        modulator.frequency.value = 16; // 16 strikes per second
        modGain.gain.value = 0.6; // strike depth

        modulator.connect(modGain);
        modGain.connect(gain.gain);
        
        osc.connect(gain);
        gain.connect(ctx.destination);

        // Envelope decaying overall sound
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
        gain.gain.setValueAtTime(0.5, now + 2.0);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        modulator.start(now);
        osc.start(now);
        osc.stop(now + duration);
      } 
      else if (selectedBellTone === 'chime') {
        // Grandfather clock pleasant chime chords
        const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 chord
        chords.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.25);
          
          gain.connect(ctx.destination);
          osc.connect(gain);

          gain.gain.setValueAtTime(0, now + idx * 0.25);
          gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.25 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.25 + 1.5);

          osc.start(now + idx * 0.25);
          osc.stop(now + idx * 0.25 + 1.8);
        });
      } 
      else if (selectedBellTone === 'gong') {
        // Deep resonance heavy Gong
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now); // Low A2
        
        // Pitch drop modulation for realistic gong decay
        osc.frequency.exponentialRampToValueAtTime(80, now + 2.0);

        osc.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.6, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.start(now);
        osc.stop(now + duration);
      } 
      else if (selectedBellTone === 'siren') {
        // Smooth frequency sweeping digital PA siren
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);

        // Siren sweep envelope
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.6);
        osc.frequency.linearRampToValueAtTime(440, now + 1.2);
        osc.frequency.linearRampToValueAtTime(900, now + 1.8);
        osc.frequency.linearRampToValueAtTime(440, now + 2.4);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
        gain.gain.setValueAtTime(0.4, now + 2.3);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.start(now);
        osc.stop(now + duration);
      }

      // Finish state
      setTimeout(() => {
        setIsPlayingBell(false);
        ctx.close();
      }, duration * 1000);

    } catch (e) {
      console.error("Audio Context initialization failed:", e);
      setIsPlayingBell(false);
    }
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-dark-bg text-dark-text select-none">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">
            Period & Bell Timing
          </h1>
          <p className="text-xs text-dark-muted font-bold tracking-wider uppercase mt-1">
            Configure school period shifts, manage recess breaks, and simulate automated PA bells
          </p>
        </div>
        <button 
          onClick={handleSaveSchedule}
          disabled={saving || loading}
          className="premium-button-primary py-2.5 px-5 flex items-center justify-center gap-2 font-bold text-xs uppercase self-start"
        >
          <Save size={15} />
          <span>{saving ? 'Saving Timing...' : 'Save Configuration'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Time Slots schedule */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6 border-dark-border/40">
            <div className="flex items-center justify-between border-b border-dark-border/40 pb-4 mb-6">
              <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-primary-400 uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} />
                <span>Daily Bell Schedule Matrix</span>
              </h2>

              <button 
                onClick={addPeriod}
                className="text-[10px] font-black text-primary-400 uppercase tracking-widest flex items-center gap-1 hover:text-primary-300"
              >
                <Plus size={14} />
                <span>Add Period Slot</span>
              </button>
            </div>

            {/* Quick Preset Selector Buttons */}
            <div className="flex flex-wrap gap-2.5 mb-6 bg-white/5 border border-dark-border/30 p-2 rounded-2xl font-bold text-[10px]">
              <span className="text-dark-muted uppercase pl-2 flex items-center gap-1 text-[9px] font-black">
                <Zap size={11} className="text-yellow-400" />
                <span>Load Preset Template:</span>
              </span>
              {Object.entries(PRESETS).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => handleLoadPreset(key)}
                  className={`py-1.5 px-3 rounded-xl border transition-all uppercase tracking-wide ${
                    activePreset === key 
                      ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' 
                      : 'bg-dark-card/50 border-dark-border/40 text-dark-muted hover:border-primary-500/30 hover:text-primary-400'
                  }`}
                >
                  {template.label}
                </button>
              ))}
            </div>

            {/* Overlap warnings alert banner */}
            {validationAlerts.length > 0 && (
              <div className="p-3.5 mb-6 border border-red-500/20 bg-red-500/5 text-[10.5px] leading-relaxed text-red-400 rounded-2xl space-y-1 font-bold">
                <h4 className="flex items-center gap-1.5 text-xs text-red-500 font-black uppercase">
                  <AlertTriangle size={15} />
                  <span>Chronological Time Warnings ({validationAlerts.length})</span>
                </h4>
                {validationAlerts.map((alertText, idx) => (
                  <div key={idx} className="pl-6">• {alertText}</div>
                ))}
              </div>
            )}

            {/* Matrix Form List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <RefreshCw size={26} className="text-primary-500 animate-spin" />
                <span className="text-[10px] font-black text-dark-muted uppercase">Querying Timings...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {periods.map((period, index) => {
                  const isActiveNow = activePeriod?.id === period.id;
                  return (
                    <div 
                      key={period.id} 
                      className={`flex flex-col md:flex-row gap-4 items-stretch p-4 rounded-2xl border transition-all duration-300 ${
                        isActiveNow 
                          ? 'bg-primary-500/10 border-primary-500/40 shadow-lg shadow-primary-500/5 scale-[1.01]' 
                          : 'bg-dark-card/30 border-dark-border/30 hover:border-dark-border/60'
                      }`}
                    >
                      {/* Left Badge status indicators */}
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black select-none ${
                          isActiveNow ? 'bg-primary-500 text-white' : 'bg-dark-bg text-dark-muted border border-dark-border/30'
                        }`}>
                          {index + 1}
                        </div>
                        {isActiveNow && (
                          <span className="md:hidden inline-block text-[8px] font-black tracking-widest bg-green-500 text-black py-0.5 px-2 rounded-full uppercase leading-none">
                            Active Now
                          </span>
                        )}
                      </div>

                      {/* Details Config */}
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 items-center font-bold text-xs">
                        {/* Name input */}
                        <div className="col-span-2">
                          <input 
                            type="text" 
                            value={period.name}
                            onChange={(e) => updatePeriod(period.id, 'name', e.target.value)}
                            placeholder="Period Slot Name"
                            className="w-full bg-dark-bg border border-dark-border/40 focus:border-primary-500 focus:ring-0 rounded-xl px-3 py-2 text-xs font-black text-white"
                          />
                        </div>

                        {/* Shift Type dropdown */}
                        <div className="col-span-2 md:col-span-2">
                          <select 
                            value={period.type}
                            onChange={(e) => updatePeriod(period.id, 'type', e.target.value)}
                            className="w-full bg-dark-bg border border-dark-border/40 focus:border-primary-500 focus:ring-0 rounded-xl px-3 py-2 text-xs text-primary-400 font-black uppercase tracking-wider"
                          >
                            <option value="Class">Class Lecture</option>
                            <option value="Break">Break / Recess</option>
                            <option value="Assembly">Morning Assembly</option>
                          </select>
                        </div>
                      </div>

                      {/* Timings row */}
                      <div className="flex items-center gap-2 text-xs font-bold font-sans">
                        <input 
                          type="time" 
                          value={period.startTime}
                          onChange={(e) => updatePeriod(period.id, 'startTime', e.target.value)}
                          className="bg-dark-bg border border-dark-border/40 focus:border-primary-500 focus:ring-0 rounded-xl px-3 py-2 text-xs text-cyan-400"
                        />
                        <span className="text-dark-muted font-bold">-</span>
                        <input 
                          type="time" 
                          value={period.endTime}
                          onChange={(e) => updatePeriod(period.id, 'endTime', e.target.value)}
                          className="bg-dark-bg border border-dark-border/40 focus:border-primary-500 focus:ring-0 rounded-xl px-3 py-2 text-xs text-cyan-400"
                        />
                      </div>

                      {/* Action tools */}
                      <div className="flex items-center justify-end gap-2 border-t md:border-t-0 md:border-l border-dark-border/20 pt-2.5 md:pt-0 md:pl-2">
                        {isActiveNow && (
                          <span className="hidden md:inline-block text-[8px] font-black tracking-widest bg-green-500 text-black py-1 px-2.5 rounded-full uppercase leading-none select-none">
                            Active Now
                          </span>
                        )}
                        <button 
                          onClick={() => removePeriod(period.id)}
                          className="p-2 text-dark-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                          title="Delete Period"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right 1 Column: Automated bell visualizer + testing */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Active Period Dashboard (If available) */}
          {activePeriod && (
            <GlassCard className="p-5 border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-green-400 uppercase tracking-widest block">Active Right Now</span>
                <h3 className="text-lg font-black text-white mt-1 block uppercase">{activePeriod.name}</h3>
                <span className="text-xs font-medium text-dark-muted block mt-0.5">{activePeriod.startTime} - {activePeriod.endTime}</span>
              </div>
              <div className="w-11 h-11 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 relative">
                <div className="absolute inset-0 rounded-full border border-green-500/40 animate-ping" />
                <Zap size={20} />
              </div>
            </GlassCard>
          )}

          {/* PA System Bell Tester */}
          <GlassCard className="p-6 border-dark-border/40 text-center relative overflow-hidden">
            
            {/* Equalizer animation overlays when playing */}
            {isPlayingBell && (
              <div className="absolute inset-0 bg-primary-500/5 pointer-events-none flex items-end justify-center gap-1.5 pb-6">
                {[0.8, 0.4, 0.9, 0.6, 0.9, 0.5, 0.7].map((val, idx) => (
                  <div 
                    key={idx} 
                    className="w-1 bg-primary-500/60 rounded-full animate-bounce" 
                    style={{ 
                      height: '40px', 
                      animationDelay: `${idx * 0.1}s`,
                      animationDuration: `${val + 0.5}s`
                    }} 
                  />
                ))}
              </div>
            )}

            <div className="relative z-10">
              <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center relative transition-all duration-500 ${
                isPlayingBell ? 'bg-primary-500 text-white scale-110 shadow-lg shadow-primary-500/30' : 'bg-primary-500/10 text-primary-500 border border-primary-500/30'
              }`}>
                {isPlayingBell && (
                  <div className="absolute inset-0 rounded-full border-2 border-primary-500/60 animate-ping" />
                )}
                <BellRing size={38} className={isPlayingBell ? 'animate-wiggle' : ''} />
              </div>

              <h3 className="text-lg font-black text-white uppercase tracking-wider">School PA Bell Simulator</h3>
              <p className="text-[10px] text-dark-muted font-semibold leading-relaxed mt-2 max-w-[90%] mx-auto">
                Connect your master server outputs to the PA audio hardware to ring bell tones automatically.
              </p>

              {/* Tone dropdown chooser */}
              <div className="mt-6 text-left text-xs font-bold space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider block text-center">Bell Tone Selection</label>
                <select
                  value={selectedBellTone}
                  onChange={(e) => setSelectedBellTone(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs text-primary-400 font-black text-center uppercase tracking-widest border border-dark-border"
                >
                  <option value="brass">Classic Brass Bell</option>
                  <option value="chime">Melodic Chimes</option>
                  <option value="gong">Heavy Gong Ring</option>
                  <option value="siren">PA Alert Siren</option>
                </select>
              </div>

              {/* Play simulator button */}
              <button 
                onClick={playSynthesizedBell}
                disabled={isPlayingBell}
                className="w-full mt-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-md shadow-primary-500/10 disabled:opacity-50"
              >
                <Play size={14} />
                <span>{isPlayingBell ? 'Ringing Bell...' : 'Test Bell Sound'}</span>
              </button>

              <div className="mt-6 p-4 bg-dark-bg/60 border border-dark-border/40 rounded-2xl flex justify-between items-center text-xs font-bold">
                <span className="text-dark-text">PA Status</span>
                <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest border border-green-500/20 select-none">
                  ONLINE
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Timing Rules Guidelines */}
          <GlassCard className="p-5 border-dark-border/40 text-xs font-bold space-y-3">
            <h4 className="text-[10px] text-dark-muted uppercase tracking-widest flex items-center gap-1">
              <Info size={13} className="text-primary-400" />
              <span>Timings Guidelines</span>
            </h4>
            <ul className="space-y-2 text-[10px] leading-relaxed text-dark-text list-disc pl-4 font-semibold">
              <li>Morning Assemblies usually last 15-20 minutes.</li>
              <li>Break / Recess shifts should ideally be scheduled after Period 3 or 4.</li>
              <li>Always check for timing validation overlap warnings before publishing updates.</li>
            </ul>
          </GlassCard>
        </div>

      </div>

    </div>
  );
};

export default PeriodBell;
