import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRecords } from '../../services/db';

const ParentAttendance = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const childName = userData?.childName || userData?.studentName || userData?.name || 'Active Student';
  
  const [selectedChild, setSelectedChild] = useState('child-1');
  const [attendanceData, setAttendanceData] = useState([]);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const data = await getRecords('attendance', schoolId);
        if (data && data.length > 0) {
          setAttendanceData(data);
        } else {
          setAttendanceData([]);
        }
      } catch (e) {
        setAttendanceData([]);
      }
    };
    fetchAttendance();
  }, [schoolId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Student Attendance</h1>
          <p className="text-dark-muted mt-1">Track daily presence and logs</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-dark-card border border-dark-border text-cyan-400 font-bold text-xs flex items-center gap-2">
          <span>👤 Student:</span>
          <span className="text-white">{childName}</span>
        </div>
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
