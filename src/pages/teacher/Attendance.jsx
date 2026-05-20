import React, { useState, useEffect } from 'react';
import { Calendar, Save, Filter, UserCheck, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { setDoc, doc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

const Attendance = () => {
  const { userData } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('10');
  const [selectedSection, setSelectedSection] = useState('A');
  const [students, setStudents] = useState([]);
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [activeTab, setActiveTab] = useState('mark'); // 'mark' | 'report'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeTab === 'mark') {
      fetchStudents();
    } else {
      fetchMonthlyReport();
    }
  }, [selectedClass, selectedSection, selectedDate, activeTab, userData]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getRecords('students', userData?.schoolId || 'default-school', [
        { field: 'class', operator: '==', value: selectedClass }
      ]);
      const filtered = selectedSection ? data.filter(s => (s.section || 'A').toUpperCase() === selectedSection.toUpperCase()) : data;
      setStudents(filtered.map(s => ({ ...s, status: 'present', time: '08:00 AM' })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(selectedDate);
      startOfMonth.setDate(1);
      const startStr = startOfMonth.toISOString().split('T')[0];

      const endOfMonth = new Date(selectedDate);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      const endStr = endOfMonth.toISOString().split('T')[0];

      const q = query(
        collection(db, 'attendance'),
        where('schoolId', '==', userData?.schoolId || 'default-school'),
        where('class', '==', selectedClass),
        where('date', '>=', startStr),
        where('date', '<=', endStr)
      );
      const snap = await getDocs(q);
      const reportData = snap.docs.map(d => d.data());
      setAttendanceReport(reportData);
    } catch (e) {
      console.error(e);
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
      const promises = students.map(s => {
        const attendanceId = `${s.id}_${selectedDate}`;
        return setDoc(doc(db, 'attendance', attendanceId), {
          studentId: s.id,
          studentName: s.name,
          rollNumber: s.rollNumber || '',
          class: selectedClass,
          section: selectedSection,
          date: selectedDate,
          status: s.status,
          markedBy: userData?.name || 'Teacher',
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

  const getStudentReportStats = (studentId) => {
    const studentRecords = attendanceReport.filter(r => r.studentId === studentId);
    const present = studentRecords.filter(r => r.status === 'present').length;
    const absent = studentRecords.filter(r => r.status === 'absent').length;
    const late = studentRecords.filter(r => r.status === 'late').length;
    return { present, absent, late, total: studentRecords.length };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Management</h1>
          <p className="text-dark-muted mt-1">Track, record and generate reports for student attendance.</p>
        </div>

        <div className="flex gap-2 bg-dark-card border border-dark-border p-1.5 rounded-xl">
          <button 
            onClick={() => setActiveTab('mark')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'mark' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-dark-muted hover:text-white'}`}
          >
            Mark Daily
          </button>
          <button 
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'report' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-dark-muted hover:text-white'}`}
          >
            Monthly Reports
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6 h-fit space-y-5">
          <h3 className="font-bold flex items-center gap-2 border-b border-dark-border pb-3">
            <Filter size={18} className="text-primary-500" /> Filters
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-dark-muted uppercase tracking-wider block mb-1.5">Date / Month</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full premium-input"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-dark-muted uppercase tracking-wider block mb-1.5">Class</label>
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full premium-input bg-dark-card"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(c => <option key={c} value={c}>{c} Grade</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-dark-muted uppercase tracking-wider block mb-1.5">Section</label>
              <select 
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full premium-input bg-dark-card"
              >
                {['A', 'B', 'C'].map(s => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>
          </div>
        </GlassCard>

        <div className="lg:col-span-3">
          {activeTab === 'mark' ? (
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold">{new Date(selectedDate).toDateString()}</h2>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setStudents(students.map(s => ({ ...s, status: 'present' })))}
                    className="px-4 py-2 bg-green-500/10 text-green-500 text-xs font-black uppercase rounded-lg border border-green-500/20"
                  >
                    Mark All Present
                  </button>
                  <button 
                    onClick={handleSaveAttendance}
                    disabled={saving || students.length === 0}
                    className="premium-button-primary disabled:opacity-50"
                  >
                    <Save size={16} /> {saving ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-20 text-dark-muted">Loading students...</div>
              ) : students.length === 0 ? (
                <div className="text-center py-20 text-dark-muted">No students found in this class.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                        <th className="pb-4 px-4">Roll No</th>
                        <th className="pb-4 px-4">Student Name</th>
                        <th className="pb-4 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 font-mono text-sm">{student.rollNumber || 'N/A'}</td>
                          <td className="py-4 px-4 font-bold text-sm">{student.name}</td>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          ) : (
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold mb-6">Monthly Report Card</h2>
              {loading ? (
                <div className="text-center py-20 text-dark-muted">Loading reports...</div>
              ) : attendanceReport.length === 0 ? (
                <div className="text-center py-20 text-dark-muted">No attendance logs found for this month.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                        <th className="pb-4 px-4">Student Name</th>
                        <th className="pb-4 px-4 text-center">Present</th>
                        <th className="pb-4 px-4 text-center">Absent</th>
                        <th className="pb-4 px-4 text-center">Late</th>
                        <th className="pb-4 px-4 text-right">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border">
                      {[...new Set(attendanceReport.map(r => r.studentId))].map(studentId => {
                        const rec = attendanceReport.find(r => r.studentId === studentId);
                        const stats = getStudentReportStats(studentId);
                        const rate = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(0) : '0';
                        return (
                          <tr key={studentId} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4 font-bold text-sm">{rec?.studentName}</td>
                            <td className="py-4 px-4 text-center text-green-500 font-bold">{stats.present}</td>
                            <td className="py-4 px-4 text-center text-red-500 font-bold">{stats.absent}</td>
                            <td className="py-4 px-4 text-center text-orange-500 font-bold">{stats.late}</td>
                            <td className="py-4 px-4 text-right font-mono font-bold text-primary-400">{rate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
