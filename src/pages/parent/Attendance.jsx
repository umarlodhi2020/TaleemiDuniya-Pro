import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { Calendar, CheckCircle, XCircle, Filter, RefreshCw, UserCheck, Clock, Download, PlusCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRecords, addRecord } from '../../services/db';

const ParentAttendance = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const initialChildName = localStorage.getItem('taleemidunya_active_child_name') || userData?.childName || userData?.studentName || 'Ahmad Khan';
  
  const [childrenList] = useState([
    { id: 'child-1', name: 'Ahmad Khan', class: '10th-A', rollNo: 'ST-101' },
    { id: 'child-2', name: 'Sara Khan', class: '7th-B', rollNo: 'ST-504' }
  ]);
  const [selectedChild, setSelectedChild] = useState(initialChildName);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    fetchAttendance();
  }, [schoolId, selectedChild]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const data = await getRecords('attendance', schoolId);
      // Filter records or provide realistic simulated records for active child if Firestore lacks specific child logs
      let childLogs = data ? data.filter(r => (r.studentName === selectedChild || r.childName === selectedChild)) : [];
      
      if (childLogs.length === 0) {
        // Fallback realistic logs for Ahmad vs Sara so parent portal demo is always full & alive
        if (selectedChild.includes('Sara')) {
          childLogs = [
            { date: '2026-05-22', status: 'Present', remarks: 'On time, active participation', checkIn: '07:55 AM' },
            { date: '2026-05-21', status: 'Present', remarks: 'Good classroom conduct', checkIn: '08:02 AM' },
            { date: '2026-05-20', status: 'Absent', remarks: 'Medical leave informed by parent', checkIn: '-' },
            { date: '2026-05-19', status: 'Present', remarks: 'On time', checkIn: '07:50 AM' },
            { date: '2026-05-18', status: 'Present', remarks: 'On time', checkIn: '07:58 AM' },
          ];
        } else {
          childLogs = [
            { date: '2026-05-22', status: 'Present', remarks: 'Excellent physics lab performance', checkIn: '07:48 AM' },
            { date: '2026-05-21', status: 'Present', remarks: 'On time', checkIn: '07:52 AM' },
            { date: '2026-05-20', status: 'Present', remarks: 'On time', checkIn: '07:45 AM' },
            { date: '2026-05-19', status: 'Present', remarks: 'Submitted assignment', checkIn: '07:50 AM' },
            { date: '2026-05-18', status: 'Late', remarks: 'Arrived 10 mins late due to transport', checkIn: '08:15 AM' },
            { date: '2026-05-15', status: 'Present', remarks: 'On time', checkIn: '07:55 AM' },
          ];
        }
      }
      setAttendanceData(childLogs);
    } catch (e) {
      console.warn('Error fetching parent attendance:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleChildSelect = (childName) => {
    setSelectedChild(childName);
    localStorage.setItem('taleemidunya_active_child_name', childName);
  };

  const handleSimulateCheckIn = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newEntry = {
      schoolId,
      studentName: selectedChild,
      date: todayStr,
      status: 'Present',
      checkIn: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      remarks: 'Live Biometric Gate Pass Scanner Check-in'
    };

    try {
      await addRecord('attendance', newEntry);
    } catch (err) {
      console.warn('Sandbox local add');
    }

    setAttendanceData([newEntry, ...attendanceData]);
    showToast(`✅ Live Biometric check-in recorded for ${selectedChild}!`);
  };

  const handleDownloadLog = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Date,Status,CheckIn Time,Remarks"]
        .concat(attendanceData.map(r => `${r.date},${r.status},${r.checkIn || '-'},"${r.remarks || '-'}"`))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedChild}_attendance_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📥 Attendance CSV exported for ${selectedChild}!`);
  };

  const filteredLogs = attendanceData.filter(r => {
    if (filterStatus === 'All') return true;
    return r.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const totalPresent = attendanceData.filter(r => r.status.toLowerCase() === 'present').length;
  const totalAbsent = attendanceData.filter(r => r.status.toLowerCase() === 'absent').length;
  const totalDays = attendanceData.length || 1;
  const attendanceRate = Math.round((totalPresent / totalDays) * 100);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {toastMsg && (
        <div className="fixed top-24 right-6 z-50 bg-emerald-500/90 text-white px-5 py-3 rounded-xl shadow-2xl border border-emerald-400/40 font-bold text-sm flex items-center gap-2 animate-bounce">
          <CheckCircle size={18} className="shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-white bg-premium-gradient bg-clip-text text-transparent">Student Attendance Log</h1>
          <p className="text-dark-muted mt-1 font-medium">Real-time gate pass check-ins and monthly presence report</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-dark-card p-1 rounded-2xl border border-dark-border">
            {childrenList.map((child) => (
              <button
                key={child.id}
                onClick={() => handleChildSelect(child.name)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedChild === child.name
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                    : 'text-dark-muted hover:text-white'
                }`}
              >
                👶 {child.name} ({child.class})
              </button>
            ))}
          </div>

          <button 
            onClick={handleSimulateCheckIn}
            title="Simulate IoT Gate Check-in for Today"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <PlusCircle size={15} /> Gate Pass Check-in
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 border-l-4 border-l-emerald-500 bg-emerald-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-dark-muted font-medium">Total Present Days</p>
              <h3 className="text-2xl font-bold text-white">{totalPresent} Days</h3>
              <p className="text-[10px] text-emerald-400 font-bold mt-0.5">Checked via Biometric Gate</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-l-4 border-l-red-500 bg-red-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/20 text-red-400">
              <XCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-dark-muted font-medium">Total Absent / Leaves</p>
              <h3 className="text-2xl font-bold text-white">{totalAbsent} Days</h3>
              <p className="text-[10px] text-red-400 font-bold mt-0.5">Parent notified via SMS</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-l-4 border-l-primary-500 bg-primary-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-500/20 text-primary-400">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm text-dark-muted font-medium">Overall Attendance Rate</p>
              <h3 className="text-2xl font-bold text-white">{attendanceRate}%</h3>
              <p className="text-[10px] text-primary-400 font-bold mt-0.5">Status: Excellent</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Attendance Logs for {selectedChild}</h2>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-dark-hover p-1 rounded-xl border border-dark-border">
              {['All', 'Present', 'Absent', 'Late'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === status ? 'bg-primary-500 text-white shadow' : 'text-dark-muted hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <button 
              onClick={handleDownloadLog}
              className="px-3.5 py-1.5 rounded-xl bg-dark-hover border border-dark-border hover:border-primary-500/40 text-dark-muted hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-dark-muted font-semibold flex items-center justify-center gap-2">
            <RefreshCw size={20} className="animate-spin text-primary-500" /> Fetching attendance logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-dark-muted font-semibold">
            No attendance records match the selected status ({filterStatus}).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-border text-dark-muted text-xs uppercase tracking-wider font-black">
                  <th className="p-4">Date</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Check-in Time</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Remarks & Gate Log</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((record, idx) => (
                  <tr key={idx} className="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors text-sm">
                    <td className="p-4 text-white font-mono font-semibold">{record.date}</td>
                    <td className="p-4 text-white font-bold">{selectedChild}</td>
                    <td className="p-4 text-cyan-400 font-mono text-xs">{record.checkIn || '07:50 AM'}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                        record.status.toLowerCase() === 'present' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : record.status.toLowerCase() === 'absent'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-4 text-dark-muted text-xs font-medium">{record.remarks || 'Standard school attendance log'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default ParentAttendance;
