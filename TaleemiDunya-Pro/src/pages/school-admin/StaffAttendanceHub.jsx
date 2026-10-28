import React, { useState } from 'react';
import { CalendarCheck, Clock, FileText, Database, Shield, DollarSign, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';

const StaffAttendanceHub = () => {
  const [activeTab, setActiveTab] = useState('take');
  const [logs, setLogs] = useState([]);

  const tabs = [
    { id: 'take', name: '1 Take Attendance' },
    { id: 'raw', name: '2 Add raw punches' },
    { id: 'view', name: '3 View Attendance' },
    { id: 'process', name: '4 Process Raw Data' },
    { id: 'machine', name: '5 Machine Logs' },
    { id: 'summary', name: '6 Summary Attendance' },
    { id: 'rule', name: '7 Attendance Rule' },
    { id: 'salary', name: '8 Salary' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="border-b border-dark-border pb-4">
        <h1 className="text-3xl font-bold text-dark-text tracking-tight flex items-center gap-3">
          <CalendarCheck className="text-primary-500" /> Staff Attendance & Biometric Machine Hub
        </h1>
        <p className="text-xs text-primary-400 font-mono font-bold uppercase tracking-wider mt-1">
          Home / Staff Attendance / {tabs.find(t => t.id === activeTab)?.name}
        </p>
      </div>

      {/* 8 Exact Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === t.id ? 'bg-primary-500 text-white shadow-lg' : 'bg-dark-card text-dark-muted hover:text-dark-text border border-dark-border'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <GlassCard className="p-6">
        {activeTab === 'take' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-dark-text border-b border-dark-border pb-2">1. Take Daily Staff Attendance</h2>
            <p className="text-xs text-dark-muted">Mark manual attendance or sync directly from ZKTeco biometric machine.</p>
            <div className="flex gap-3">
              <button onClick={() => alert('Biometric machine sync completed successfully.')} className="premium-button-primary"><RefreshCw size={16} /> Sync Live Biometric Machine</button>
              <button onClick={() => alert('All present marked!')} className="premium-button-secondary">Mark All Present</button>
            </div>
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-bold text-dark-text border-b border-dark-border pb-2">2. Add Raw Machine Punches</h2>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Staff ID / ZKTeco Card ID</label>
              <input type="text" placeholder="e.g. EMP-104 or Card #88219" className="w-full premium-input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Punch Time</label>
              <input type="datetime-local" className="w-full premium-input text-sm text-dark-text" />
            </div>
            <button onClick={() => alert('Raw punch injected into verification queue!')} className="premium-button-primary">Add Raw Punch</button>
          </div>
        )}

        {(activeTab === 'view' || activeTab === 'machine' || activeTab === 'summary') && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-dark-text border-b border-dark-border pb-2">
              {activeTab === 'view' ? '3. View Daily Staff Attendance' : activeTab === 'machine' ? '5. Biometric Machine Raw Logs' : '6. Monthly Summary Attendance'}
            </h2>
            <table className="w-full text-left text-xs border border-dark-border rounded-xl overflow-hidden">
              <thead className="bg-dark-hover/60 text-dark-muted uppercase font-black">
                <tr>
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Punch Time</th>
                  <th className="p-3">Verification Source</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-dark-muted">
                      No biometric punches recorded for today.
                    </td>
                  </tr>
                ) : (
                  logs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3 font-bold text-dark-text">{l.staff}</td>
                      <td className="p-3 font-mono">{l.time}</td>
                      <td className="p-3 text-dark-muted">{l.type}</td>
                      <td className="p-3 font-bold text-green-500 dark:text-green-400">{l.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'process' && (
          <div className="space-y-4 text-center py-10">
            <Database size={48} className="mx-auto text-blue-500 dark:text-blue-400 mb-2" />
            <h3 className="text-xl font-bold text-dark-text">4. Process Raw Machine Data</h3>
            <p className="text-xs text-dark-muted max-w-md mx-auto">
              Run verification engine to match raw ZKTeco / face scanner punches against staff shift rules and calculate overtime or deductions.
            </p>
            <button onClick={() => alert('Raw machine data processed successfully.')} className="premium-button-primary">Process Raw Data Now</button>
          </div>
        )}

        {activeTab === 'rule' && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-bold text-dark-text border-b border-dark-border pb-2">7. Attendance Rules & Late Deductions</h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Shift Start Time</label>
                <input type="time" defaultValue="08:00" className="w-full premium-input" />
              </div>
              <div>
                <label className="block font-bold mb-1">Grace Period (Minutes)</label>
                <input type="number" defaultValue="15" className="w-full premium-input" />
              </div>
              <div>
                <label className="block font-bold mb-1">Late Deduction Rule</label>
                <select className="w-full premium-input">
                  <option>Deduct 0.5 day salary after 3 late arrivals</option>
                  <option>Deduct 1 full day salary after 4 late arrivals</option>
                </select>
              </div>
              <button onClick={() => alert('Attendance rules saved!')} className="premium-button-primary">Save Rules</button>
            </div>
          </div>
        )}

        {activeTab === 'salary' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-dark-text border-b border-dark-border pb-2">8. Attendance-Linked Salary Calculation</h2>
            <p className="text-xs text-dark-muted">Calculated monthly payroll based on biometric present days and late deductions.</p>
            <div className="p-8 text-center text-dark-muted bg-dark-hover/30 rounded-xl border border-dark-border">
              <DollarSign size={36} className="mx-auto text-dark-muted mb-2" />
              <p className="font-bold text-sm text-dark-text">No active payroll records calculated</p>
              <p className="text-xs text-dark-muted mt-1">Processed attendance shifts will calculate payroll automatically.</p>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default StaffAttendanceHub;
