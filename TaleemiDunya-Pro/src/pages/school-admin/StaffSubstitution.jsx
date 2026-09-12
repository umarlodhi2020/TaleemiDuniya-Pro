import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { UserX, Users, Bot, CheckCircle2, AlertTriangle, Calendar as CalendarIcon, ArrowRight, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const StaffSubstitution = () => {
  const { userData, showToast } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [substitutions, setSubstitutions] = useState(null);

  // Mock data for absent teachers today
  const absentTeachers = [
    { id: 1, name: 'Sir Ahmed', subject: 'Mathematics', periods: [{ p: 2, class: '10-A' }, { p: 4, class: '9-B' }] },
    { id: 2, name: 'Miss Ayesha', subject: 'English', periods: [{ p: 1, class: '8-C' }, { p: 3, class: '10-A' }, { p: 5, class: '7-B' }] }
  ];

  const handleAutoAssign = () => {
    setIsProcessing(true);
    // Simulate AI proxy assignment
    setTimeout(() => {
      setIsProcessing(false);
      setSubstitutions([
        { 
          absent: 'Sir Ahmed', 
          proxy: 'Sir Ali (Physics)', 
          period: 2, 
          className: '10-A',
          matchScore: 95 
        },
        { 
          absent: 'Sir Ahmed', 
          proxy: 'Miss Hira (Maths)', 
          period: 4, 
          className: '9-B',
          matchScore: 98
        },
        { 
          absent: 'Miss Ayesha', 
          proxy: 'Sir Usman (Urdu)', 
          period: 1, 
          className: '8-C',
          matchScore: 82
        },
        { 
          absent: 'Miss Ayesha', 
          proxy: 'Miss Fatima (English)', 
          period: 3, 
          className: '10-A',
          matchScore: 100
        },
        { 
          absent: 'Miss Ayesha', 
          proxy: 'Sir Bilal (Islamiat)', 
          period: 5, 
          className: '7-B',
          matchScore: 75
        }
      ]);
      showToast('success', 'AI Proxy Assignment Completed!');
    }, 2000);
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
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserX className="text-red-400" size={24} /> Absent Today ({absentTeachers.length})
          </h2>
          
          {absentTeachers.map(t => (
            <GlassCard key={t.id} className="p-4 border-l-4 border-l-red-500 bg-red-500/5 hover:bg-red-500/10 transition-colors">
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
          ))}

          {!substitutions && (
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
                  <p className="text-sm">Click "Run AI Proxy Auto-Assign" to generate the substitution plan.</p>
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
                      <strong>AI Insight:</strong> 100% of classes have been successfully covered. Teachers with identical subjects (e.g., Miss Hira & Miss Fatima) were prioritized for proxy periods to maintain academic flow.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default StaffSubstitution;
