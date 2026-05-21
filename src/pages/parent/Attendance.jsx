import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';

const ParentAttendance = () => {
  const [selectedChild, setSelectedChild] = useState('child-1');

  // Dummy data
  const attendanceData = [
    { date: '2026-05-20', status: 'present' },
    { date: '2026-05-19', status: 'absent' },
    { date: '2026-05-18', status: 'present' },
    { date: '2026-05-17', status: 'present' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Student Attendance</h1>
          <p className="text-dark-muted mt-1">Track your child's daily presence</p>
        </div>
        <select 
          className="premium-input bg-dark-bg/50 border-dark-border"
          value={selectedChild}
          onChange={(e) => setSelectedChild(e.target.value)}
        >
          <option value="child-1">Ali Khan (Class 5)</option>
          <option value="child-2">Sara Khan (Class 3)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-dark-muted font-medium">Total Present</p>
              <h3 className="text-2xl font-bold text-white">142 Days</h3>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6 border-l-4 border-l-red-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/20 text-red-400">
              <XCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-dark-muted font-medium">Total Absent</p>
              <h3 className="text-2xl font-bold text-white">5 Days</h3>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6 border-l-4 border-l-primary-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-500/20 text-primary-400">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm text-dark-muted font-medium">Attendance %</p>
              <h3 className="text-2xl font-bold text-white">96.5%</h3>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-white mb-4">Recent Record</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-border text-dark-muted text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((record, idx) => (
                <tr key={idx} className="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors">
                  <td className="p-4 text-white font-medium">{record.date}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      record.status === 'present' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {record.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-dark-muted text-sm">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default ParentAttendance;
