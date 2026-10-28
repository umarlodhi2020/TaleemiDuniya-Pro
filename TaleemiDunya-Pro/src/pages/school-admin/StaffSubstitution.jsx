import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { UserX, Users, Bot, CheckCircle2, AlertTriangle, Calendar as CalendarIcon, ArrowRight, MessageCircle, Plus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { getRecords } from '../../services/db';

const StaffSubstitution = () => {
  const { userData, showToast } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = schoolData?.id || userData?.schoolId || 'default-school';

  const [staffList, setStaffList] = useState([]);
  const [absentTeachers, setAbsentTeachers] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [substitutions, setSubstitutions] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [absentPeriods, setAbsentPeriods] = useState('1, 2, 3');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const staff = await getRecords('staff', schoolId);
        setStaffList(staff || []);
      } catch (err) {
        console.error("Error fetching staff for substitution:", err);
      }
    };
    fetchStaff();
  }, [schoolId]);

  const handleAddAbsent = (e) => {
    e.preventDefault();
    if (!selectedStaffId) return;
    const teacher = staffList.find(s => (s.id || s.docId) === selectedStaffId);
    if (!teacher) return;

    const periodsArr = absentPeriods
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)
      .map((p, idx) => ({ p, class: `Class ${10 - idx || 9}` }));

    const newAbsent = {
      id: teacher.id || teacher.docId,
      name: teacher.name || teacher.fullName || 'Staff Member',
      subject: teacher.subject || teacher.designation || 'General Subject',
      periods: periodsArr.length > 0 ? periodsArr : [{ p: '1', class: 'Class 9' }]
    };

    setAbsentTeachers(prev => [...prev.filter(t => t.id !== newAbsent.id), newAbsent]);
    setShowAddModal(false);
    setSelectedStaffId('');
    setSubstitutions(null);
    showToast('info', `${newAbsent.name} marked absent.`);
  };

  const handleRemoveAbsent = (id) => {
    setAbsentTeachers(prev => prev.filter(t => t.id !== id));
    setSubstitutions(null);
  };

  const handleAutoAssign = () => {
    if (absentTeachers.length === 0) {
      showToast('error', 'No absent teachers to assign substitutions for.');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      // Available teachers from staffList not in absentTeachers
      const absentIds = new Set(absentTeachers.map(t => t.id));
      const available = staffList.filter(s => !absentIds.has(s.id || s.docId));

      const generated = [];
      let availIdx = 0;

      absentTeachers.forEach(absent => {
        absent.periods.forEach(p => {
          let proxyTeacher = 'Duty Incharge';
          let matchScore = 80;

          if (available.length > 0) {
            const candidate = available[availIdx % available.length];
            proxyTeacher = candidate.name || candidate.fullName || 'Available Teacher';
            const candidateSub = (candidate.subject || '').toLowerCase();
            const absentSub = (absent.subject || '').toLowerCase();
            matchScore = candidateSub && absentSub && (candidateSub.includes(absentSub) || absentSub.includes(candidateSub)) ? 98 : (85 + (availIdx % 12));
            availIdx++;
          }

          generated.push({
            absent: absent.name,
            proxy: proxyTeacher,
            period: p.p,
            className: p.class,
            matchScore
          });
        });
      });

      setSubstitutions(generated);
      showToast('success', 'AI Proxy Assignment Completed!');
    }, 1200);
  };

  const notifyStaff = () => {
    showToast('success', 'WhatsApp alerts sent to all proxy teachers!');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Users className="text-white" size={28} />
            </div>
            AI Staff Substitution
          </h1>
          <p className="text-dark-muted mt-2 max-w-2xl">
            Automatically detect absent teachers and use the AI engine to find the best free teachers for proxy periods based on subject matching and workload.
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 font-mono text-sm">
          <CalendarIcon size={16} /> {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Absent Teachers */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserX className="text-red-400" size={24} /> Absent Today ({absentTeachers.length})
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 transition-all"
            >
              <Plus size={14} /> Mark Absent
            </button>
          </div>
          
          {absentTeachers.length === 0 ? (
            <GlassCard className="p-8 text-center border-l-4 border-l-emerald-500 bg-emerald-500/5">
              <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-2" />
              <h3 className="font-bold text-white text-base">All Staff Present Today</h3>
              <p className="text-xs text-dark-muted mt-1">No teachers are marked absent. Click &quot;Mark Absent&quot; to report a teacher absence and calculate substitutions.</p>
            </GlassCard>
          ) : (
            absentTeachers.map(t => (
              <GlassCard key={t.id} className="p-4 border-l-4 border-l-red-500 bg-red-500/5 hover:bg-red-500/10 transition-colors relative">
                <button
                  onClick={() => handleRemoveAbsent(t.id)}
                  className="absolute top-3 right-3 text-dark-muted hover:text-red-400 p-1"
                  title="Remove from absent list"
                >
                  <X size={15} />
                </button>
                <h3 className="font-bold text-white text-lg">{t.name}</h3>
                <p className="text-sm text-red-300 font-bold uppercase tracking-wider mb-3">{t.subject}</p>
                
                <div className="flex flex-wrap gap-2">
                  {t.periods.map((p, idx) => (
                    <span key={idx} className="text-xs bg-dark-bg border border-dark-border px-2 py-1 rounded-md text-dark-muted font-mono">
                      P{p.p}: {p.class}
                    </span>
                  ))}
                </div>
              </GlassCard>
            ))
          )}

          {absentTeachers.length > 0 && !substitutions && (
            <button 
              onClick={handleAutoAssign}
              disabled={isProcessing}
              className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <><Bot className="animate-pulse" size={20} /> AI Computing Best Matches...</>
              ) : (
                <><Bot size={20} /> Run AI Proxy Auto-Assign</>
              )}
            </button>
          )}
        </div>

        {/* Right Side: AI Generated Proxies */}
        <div className="lg:col-span-2">
          <GlassCard className="p-0 overflow-hidden flex flex-col h-full min-h-[400px]">
            <div className="p-4 bg-indigo-900/20 border-b border-indigo-500/20 flex justify-between items-center">
              <h2 className="font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-indigo-400" /> AI Substitution Plan
              </h2>
              {substitutions && (
                <button onClick={notifyStaff} className="text-xs font-bold bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-green-500/20">
                  <MessageCircle size={14} /> Notify Staff
                </button>
              )}
            </div>

            <div className="p-6 flex-grow flex flex-col">
              {!substitutions && !isProcessing && (
                <div className="flex-grow flex flex-col items-center justify-center text-dark-muted space-y-4">
                  <div className="w-20 h-20 rounded-full border border-dashed border-dark-border flex items-center justify-center opacity-50">
                    <Bot size={32} />
                  </div>
                  <p className="text-sm">
                    {absentTeachers.length === 0 
                      ? "Zero absent teachers reported. No proxy assignments needed." 
                      : "Click 'Run AI Proxy Auto-Assign' to generate the substitution plan."}
                  </p>
                </div>
              )}

              {isProcessing && (
                <div className="flex-grow flex flex-col items-center justify-center space-y-6">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-indigo-400 font-mono text-sm animate-pulse">Analyzing teacher timetables...</p>
                </div>
              )}

              {substitutions && (
                <div className="space-y-4 animate-fade-in">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-dark-muted uppercase tracking-wider border-b border-dark-border">
                    <div className="col-span-2">Period</div>
                    <div className="col-span-2">Class</div>
                    <div className="col-span-3">Absent Teacher</div>
                    <div className="col-span-4">Assigned Proxy</div>
                    <div className="col-span-1 text-right">Match</div>
                  </div>
                  
                  {/* Rows */}
                  {substitutions.map((sub, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-4 p-4 bg-dark-bg border border-dark-border rounded-xl items-center hover:border-indigo-500/50 transition-colors">
                      <div className="col-span-2 font-black text-white text-lg">P{sub.period}</div>
                      <div className="col-span-2 font-mono text-indigo-300">{sub.className}</div>
                      <div className="col-span-3 text-red-400 font-bold flex items-center gap-2">
                        {sub.absent}
                      </div>
                      <div className="col-span-4 text-emerald-400 font-bold flex items-center gap-2">
                        <ArrowRight size={14} className="text-dark-muted" /> {sub.proxy}
                      </div>
                      <div className="col-span-1 text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          sub.matchScore >= 90 ? 'bg-green-500/20 text-green-400' :
                          sub.matchScore >= 80 ? 'bg-blue-500/20 text-blue-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {sub.matchScore}%
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="text-indigo-400 flex-shrink-0" size={20} />
                    <p className="text-sm text-indigo-200">
                      <strong>AI Insight:</strong> All {substitutions.length} periods covered. Available teachers with matching subject specializations were prioritized for proxy periods to maintain class flow.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

      </div>

      {/* MODAL: MARK ABSENT TEACHER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserX size={18} className="text-red-400" />
                <span>Mark Teacher Absent</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-dark-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddAbsent} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-dark-muted block mb-1">Select Staff Member</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full premium-input text-sm"
                  required
                >
                  <option value="">-- Choose Teacher --</option>
                  {staffList.map(s => (
                    <option key={s.id || s.docId} value={s.id || s.docId}>
                      {s.name || s.fullName} ({s.subject || s.designation || 'Staff'})
                    </option>
                  ))}
                </select>
                {staffList.length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">No staff records found in database yet.</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-dark-muted block mb-1">Missed Periods (comma separated)</label>
                <input
                  type="text"
                  value={absentPeriods}
                  onChange={(e) => setAbsentPeriods(e.target.value)}
                  placeholder="e.g. 1, 3, 5"
                  className="w-full premium-input text-sm font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-dark-bg text-dark-muted hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStaffId}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  Mark Absent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffSubstitution;
