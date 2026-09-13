import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Save,
  Fingerprint,
  Activity
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db as firestore } from '../../services/firebase';

const AttendanceManager = () => {
  const { userData } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('10');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncMode, setSyncMode] = useState('manual'); // 'manual' | 'live'
  const [lastScanned, setLastScanned] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, [selectedClass, userData]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getRecords('students', userData?.schoolId || 'default-school', [
        { field: 'class', operator: '==', value: selectedClass }
      ]);
      // Initialize with default status
      setStudents(data.map(s => ({ ...s, status: 'present', time: '08:00 AM' })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (id, status) => {
    setStudents(students.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      // Save each attendance record to a 'attendance' collection
      const promises = students.map(s => {
        const attendanceId = `${s.id}_${selectedDate}`;
        return setDoc(doc(firestore, 'attendance', attendanceId), {
          studentId: s.id,
          studentName: s.name,
          rollNumber: s.rollNumber,
          class: selectedClass,
          date: selectedDate,
          status: s.status,
          markedBy: userData?.name || 'Admin',
          schoolId: userData?.schoolId || 'default-school',
          createdAt: new Date()
        });
      });
      await Promise.all(promises);
      alert('Attendance saved successfully for ' + students.length + ' students.');
    } catch (error) {
      console.error(error);
      alert('Error saving attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Manager</h1>
          <p className="text-dark-muted mt-1">Mark daily attendance for students.</p>
        </div>
        
        <div className="flex gap-4">
          <button className="premium-button-secondary">
            View History
          </button>
          <button 
            onClick={handleSaveAttendance}
            disabled={saving || students.length === 0}
            className="premium-button-primary disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <GlassCard className="lg:col-span-1 p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Filter size={18} className="text-primary-500" />
            Filters
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-dark-muted uppercase mb-1.5">Date</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full premium-input" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-dark-muted uppercase mb-1.5">Class</label>
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full premium-input appearance-none bg-dark-card"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                  <option key={c} value={c.toString()}>{c} Grade</option>
                ))}
              </select>
            </div>
            <div className="pt-4 border-t border-dark-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-dark-muted font-bold">Total Present</span>
                <span className="text-sm font-bold text-green-500">{students.filter(s => s.status === 'present').length}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-dark-muted font-bold">Total Absent</span>
                <span className="text-sm font-bold text-red-500">{students.filter(s => s.status === 'absent').length}</span>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-white/5 rounded-lg text-dark-muted">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-bold">{new Date(selectedDate).toDateString()}</h2>
              <button className="p-2 hover:bg-white/5 rounded-lg text-dark-muted">
                <ChevronRight size={20} />
              </button>
            </div>
            
            <div className="flex gap-2">
              <div className="bg-black/30 border border-dark-border rounded-xl p-1 flex">
                <button 
                  onClick={() => setSyncMode('manual')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${syncMode === 'manual' ? 'bg-dark-hover text-white' : 'text-dark-muted hover:text-white'}`}
                >
                  Manual Entry
                </button>
                <button 
                  onClick={() => setSyncMode('live')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${syncMode === 'live' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-dark-muted hover:text-white'}`}
                >
                  <Fingerprint size={14} /> Live Biometric Sync
                </button>
              </div>
            </div>
          </div>

          {syncMode === 'live' ? (
            <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-blue-500/30 rounded-2xl bg-blue-500/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 relative border border-blue-500/30">
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
                  <Fingerprint size={48} className="text-blue-400 animate-pulse" />
                </div>
                
                <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
                  <Activity className="text-blue-400 animate-pulse" size={24} /> Listening to ADMS Server...
                </h3>
                <p className="text-sm text-blue-200 max-w-md text-center">
                  Waiting for biometric scans from ZKTeco/Hardware devices. Attendance will be marked automatically as soon as a student scans.
                </p>

                <div className="mt-8 p-4 bg-black/40 rounded-xl border border-white/10 w-full max-w-md">
                  <div className="flex items-center justify-between text-xs font-bold text-dark-muted mb-3 uppercase tracking-wider">
                    <span>Recent Scans</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div> Live</span>
                  </div>
                  {lastScanned ? (
                    <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg animate-fade-in">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{lastScanned.name}</p>
                        <p className="text-xs text-emerald-400">Marked Present at {lastScanned.time}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-dark-muted italic text-xs">
                      No scans received in current session.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex justify-end mb-4">
                <button 
                  onClick={() => setStudents(students.map(s => ({ ...s, status: 'present' })))}
                  className="px-4 py-2 bg-green-500/10 text-green-500 text-xs font-black uppercase rounded-lg border border-green-500/20 hover:bg-green-500 hover:text-white transition-colors"
                >
                  Mark All Present
                </button>
              </div>
              {loading ? (
                <div className="text-center py-20 text-dark-muted">Loading students...</div>
              ) : students.length === 0 ? (
                <div className="text-center py-20 text-dark-muted">No students found in this class.</div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                      <th className="pb-4 px-4">Roll No</th>
                      <th className="pb-4 px-4">Student Name</th>
                      <th className="pb-4 px-4 text-center">Status</th>
                      <th className="pb-4 px-4 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                        <td className="py-4 px-4 font-mono text-sm">{student.rollNumber}</td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-sm">{student.name}</p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-3">
                            <button 
                              onClick={() => updateStatus(student.id, 'present')}
                              className={`p-2 rounded-xl transition-all ${student.status === 'present' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-white/5 text-dark-muted hover:bg-green-500/10'}`}
                            >
                              <UserCheck size={20} />
                            </button>
                            <button 
                              onClick={() => updateStatus(student.id, 'absent')}
                              className={`p-2 rounded-xl transition-all ${student.status === 'absent' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 text-dark-muted hover:bg-red-500/10'}`}
                            >
                              <XCircle size={20} />
                            </button>
                            <button 
                              onClick={() => updateStatus(student.id, 'late')}
                              className={`p-2 rounded-xl transition-all ${student.status === 'late' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-dark-muted hover:bg-orange-500/10'}`}
                            >
                              <Clock size={20} />
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-xs font-mono text-dark-muted italic">{student.time}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default AttendanceManager;
