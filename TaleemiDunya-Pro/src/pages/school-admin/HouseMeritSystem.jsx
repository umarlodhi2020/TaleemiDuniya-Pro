import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Award, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Search, 
  Printer, 
  FileText, 
  Sparkles, 
  User, 
  Star, 
  Flame, 
  Medal,
  ThumbsUp,
  ThumbsDown,
  RotateCcw
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const PRELOADED_HOUSES = [
  { id: 'h_1', name: 'Jinnah House', color: 'emerald', captain: 'Hamza Tariq (Class 10)', points: 485, motto: 'Unity, Faith and Discipline' },
  { id: 'h_2', name: 'Iqbal House', color: 'indigo', captain: 'Bilal Hassan (Class 10)', points: 460, motto: 'Khudi Ko Kar Buland Itna' },
  { id: 'h_3', name: 'Sir Syed House', color: 'amber', captain: 'Saad Ahmed (Class 9)', points: 420, motto: 'Education & Enlightenment' },
  { id: 'h_4', name: 'Liaquat House', color: 'rose', captain: 'Abdullah Khan (Class 9)', points: 395, motto: 'Service & Sacrifice' }
];

const PRELOADED_MERIT_LOGS = [
  { id: 'm_1', studentName: 'Muhammad Ahmad', rollNo: '104', className: 'Class 9', house: 'Jinnah House', type: 'MERIT', points: 15, reason: '1st Position in Inter-School Science Quiz', date: new Date().toISOString().split('T')[0], awardedBy: 'Sir Usman' },
  { id: 'm_2', studentName: 'Aisha Fatima', rollNo: '108', className: 'Class 9', house: 'Iqbal House', type: 'MERIT', points: 10, reason: 'High Discipline & Helping Librarian', date: new Date().toISOString().split('T')[0], awardedBy: 'Madam Sarah' },
  { id: 'm_3', studentName: 'Ali Raza Lodhi', rollNo: '112', className: 'Class 8', house: 'Sir Syed House', type: 'DEMERIT', points: -5, reason: 'Late arrival to morning assembly (3rd time)', date: new Date().toISOString().split('T')[0], awardedBy: 'PTI Master Riaz' }
];

const MERIT_REASONS = [
  { label: '🏆 Academic Quiz / Exam Excellence (+15)', points: 15, type: 'MERIT' },
  { label: '⚽ Sports Gala Champion (+10)', points: 10, type: 'MERIT' },
  { label: '🌟 Honesty & Returned Lost Property (+10)', points: 10, type: 'MERIT' },
  { label: '🌱 Cleanliness & Campus Helper (+5)', points: 5, type: 'MERIT' },
  { label: '⚠️ Late Assembly Arrival (-5)', points: -5, type: 'DEMERIT' },
  { label: '🚫 Incomplete Uniform / No ID Card (-5)', points: -5, type: 'DEMERIT' },
  { label: '🚨 Class Disruption / Indiscipline (-10)', points: -10, type: 'DEMERIT' },
  { label: '📕 Unfinished Homework 3 Consecutive Days (-5)', points: -5, type: 'DEMERIT' }
];

const HouseMeritSystem = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = schoolData?.id || userData?.schoolId || 'default-school';
  const schoolName = schoolData?.name || userData?.schoolName || 'Lodhi Model School System';

  const [houses, setHouses] = useState(() => {
    try {
      const saved = localStorage.getItem(`house_system_${schoolId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return PRELOADED_HOUSES;
  });

  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(`merit_logs_${schoolId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return PRELOADED_MERIT_LOGS;
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedStudentForCert, setSelectedStudentForCert] = useState(null);

  // Form State
  const [formStudent, setFormStudent] = useState('');
  const [formRollNo, setFormRollNo] = useState('');
  const [formClass, setFormClass] = useState('Class 9');
  const [formHouse, setFormHouse] = useState('Jinnah House');
  const [formReasonIdx, setFormReasonIdx] = useState(0);

  const saveState = (newHouses, newLogs) => {
    setHouses(newHouses);
    setLogs(newLogs);
    try {
      localStorage.setItem(`house_system_${schoolId}`, JSON.stringify(newHouses));
      localStorage.setItem(`merit_logs_${schoolId}`, JSON.stringify(newLogs));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignPoints = (e) => {
    e.preventDefault();
    if (!formStudent || !formRollNo) return;

    const selectedReason = MERIT_REASONS[formReasonIdx];
    const newLog = {
      id: `log_${Date.now()}`,
      studentName: formStudent,
      rollNo: formRollNo,
      className: formClass,
      house: formHouse,
      type: selectedReason.type,
      points: selectedReason.points,
      reason: selectedReason.label,
      date: new Date().toISOString().split('T')[0],
      awardedBy: userData?.name || 'Class Teacher'
    };

    // Update House total points
    const updatedHouses = houses.map(h => {
      if (h.name === formHouse) {
        return { ...h, points: Math.max(0, h.points + selectedReason.points) };
      }
      return h;
    });

    const updatedLogs = [newLog, ...logs];
    saveState(updatedHouses, updatedLogs);
    setShowAssignModal(false);
    setFormStudent('');
    setFormRollNo('');
  };

  const handleDeleteLog = (id) => {
    const target = logs.find(l => l.id === id);
    if (!target) return;
    const updatedLogs = logs.filter(l => l.id !== id);
    const updatedHouses = houses.map(h => {
      if (h.name === target.house) {
        return { ...h, points: Math.max(0, h.points - target.points) };
      }
      return h;
    });
    saveState(updatedHouses, updatedLogs);
  };

  // Sort houses by points descending
  const sortedHouses = [...houses].sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-16 font-sans">
      
      {/* HEADER SECTION */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-50/90 via-white to-yellow-50/70 border border-amber-200/90 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Trophy size={14} className="text-amber-600" />
              School House & Discipline System
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
              Merit, Demerit & Leaderboard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Student House Points & Merit Board</h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
            Award green merit points for academic excellence, sports, and good behavior. Issue disciplinary demerit cards and generate verified Character & Conduct Certificates.
          </p>
        </div>

        <button 
          onClick={() => setShowAssignModal(true)}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all self-start md:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Award Merit / Demerit</span>
        </button>
      </div>

      {/* HOUSE LEADERBOARD PODIUM */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedHouses.map((h, idx) => {
          const isFirst = idx === 0;
          return (
            <div 
              key={h.id}
              className={`p-5 rounded-3xl border transition-all space-y-3 relative overflow-hidden shadow-sm ${isFirst ? 'bg-gradient-to-b from-amber-50 to-white border-amber-300 shadow-md ring-2 ring-amber-400/30' : 'bg-white border-slate-200'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isFirst ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {idx === 0 ? '🏆 1st Rank' : idx === 1 ? '🥈 2nd Rank' : idx === 2 ? '🥉 3rd Rank' : '4th Rank'}
                  </span>
                  <h3 className="font-black text-slate-950 text-base mt-1.5">{h.name}</h3>
                </div>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${isFirst ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-700'}`}>
                  {isFirst ? <Trophy size={20} /> : <Medal size={20} />}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-3xl font-black text-slate-950 font-mono block">
                  {h.points} <span className="text-xs text-slate-400 font-sans font-bold">PTS</span>
                </span>
                <p className="text-[11px] text-slate-500 font-medium italic">"{h.motto}"</p>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-bold">
                Captain: <span className="text-slate-800">{h.captain}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* RECENT MERIT & DISCIPLINE ACTIVITY */}
      <div className="print:hidden bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-black text-slate-900 text-base">Student Merit & Disciplinary Logs</h2>
            <p className="text-xs text-slate-500">Live records of awarded merits and demerits across classes.</p>
          </div>
          <span className="text-xs font-bold text-slate-600">{logs.length} Total Logs</span>
        </div>

        <div className="space-y-3">
          {logs.map((log) => {
            const isMerit = log.type === 'MERIT';

            return (
              <div 
                key={log.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isMerit ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'}`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono ${isMerit ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                      {isMerit ? `+${log.points} PTS` : `${log.points} PTS`}
                    </span>
                    <h3 className="font-black text-slate-950 text-sm">{log.studentName}</h3>
                    <span className="text-xs font-bold text-slate-500">
                      (Roll #{log.rollNo} • {log.className})
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                      {log.house}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium">
                    {log.reason}
                  </p>

                  <p className="text-[11px] text-slate-400 font-medium">
                    Awarded by: <strong className="text-slate-600">{log.awardedBy}</strong> on {log.date}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => {
                      setSelectedStudentForCert(log);
                      setShowCertModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Award size={13} />
                    <span>Print Certificate</span>
                  </button>

                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: ASSIGN MERIT / DEMERIT */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              <span>Award House Merit / Demerit</span>
            </h3>

            <form onSubmit={handleAssignPoints} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Student Full Name</label>
                <input 
                  type="text" 
                  value={formStudent}
                  onChange={(e) => setFormStudent(e.target.value)}
                  placeholder="e.g. Muhammad Ahmad"
                  required
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Roll No</label>
                  <input 
                    type="text" 
                    value={formRollNo}
                    onChange={(e) => setFormRollNo(e.target.value)}
                    placeholder="e.g. 104"
                    required
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Class Grade</label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  >
                    <option value="Class 10">Class 10</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 8">Class 8</option>
                    <option value="Class 7">Class 7</option>
                    <option value="Class 6">Class 6</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Assigned House</label>
                <select
                  value={formHouse}
                  onChange={(e) => setFormHouse(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                >
                  {houses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason & Point Action</label>
                <select
                  value={formReasonIdx}
                  onChange={(e) => setFormReasonIdx(Number(e.target.value))}
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                >
                  {MERIT_REASONS.map((r, idx) => (
                    <option key={idx} value={idx}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl bg-black hover:bg-slate-900 text-white text-xs font-black"
                >
                  Confirm Points
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHARACTER / MERIT CERTIFICATE */}
      {showCertModal && selectedStudentForCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-center">
            
            {/* PRINT CERTIFICATE CANVAS */}
            <div className="border-4 border-double border-amber-600 rounded-2xl p-6 text-center space-y-4 bg-amber-50/20 font-serif">
              <div className="space-y-0.5">
                <h3 className="font-black text-xl tracking-wider uppercase text-slate-950 font-sans">{schoolName}</h3>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-widest font-sans">Certificate of Merit & Good Conduct</p>
              </div>

              <div className="w-16 h-1 bg-amber-600 mx-auto"></div>

              <p className="text-xs text-slate-700 leading-relaxed italic">
                This is proudly presented to:
              </p>

              <h2 className="text-2xl font-black text-slate-950 underline decoration-amber-600 font-sans">
                {selectedStudentForCert.studentName}
              </h2>

              <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
                Student of <strong>{selectedStudentForCert.className}</strong> (Roll #{selectedStudentForCert.rollNo}), belonging to <strong>{selectedStudentForCert.house}</strong>, in recognition of outstanding performance:
              </p>

              <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-200 text-xs font-bold text-amber-950 font-sans">
                ⭐ {selectedStudentForCert.reason}
              </div>

              <div className="flex justify-between items-end pt-8 text-[11px] font-sans font-bold text-slate-800">
                <div className="border-t border-slate-500 pt-1 w-32 text-center">House Master</div>
                <div className="border-t border-slate-500 pt-1 w-32 text-center">Principal Seal</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button 
                onClick={() => setShowCertModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 font-sans"
              >
                Close
              </button>
              <button 
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-black hover:bg-slate-900 text-white text-xs font-black flex items-center gap-1.5 shadow-md font-sans"
              >
                <Printer size={14} />
                <span>Print Official Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HouseMeritSystem;
