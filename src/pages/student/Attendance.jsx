import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const Attendance = () => {
  const { userData, currentUser } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const studentId = currentUser?.uid || '';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, [userData]);

  const seedStudentData = async () => {
    try {
      // 1. Seed Student profile record in 'students'
      await setDoc(doc(db, 'students', studentId), {
        id: studentId,
        name: userData?.name || 'LODHI STUDENT',
        fatherName: 'Lodhi Senior',
        dob: '2010-06-15',
        gender: 'Male',
        rollNumber: userData?.rollNo || 'LODHI-101',
        class: userData?.class || '10',
        section: 'A',
        phone: '+92 300 1234567',
        address: 'Lodhi School Campus, Lahore',
        status: 'Active',
        feeStatus: 'Pending',
        schoolId: schoolId,
        createdAt: new Date()
      });

      // 2. Seed Subjects
      const subjectsToSeed = [
        { name: 'Computer Science', teacher: 'Prof. Farooq Lodhi', progress: 85, schoolId },
        { name: 'Mathematics', teacher: 'Sir Imran Khan', progress: 92, schoolId },
        { name: 'English Literature', teacher: 'Miss Sarah Ali', progress: 78, schoolId },
        { name: 'Chemistry', teacher: 'Dr. Yasmin Raza', progress: 60, schoolId }
      ];
      for (const sub of subjectsToSeed) {
        await addDoc(collection(db, 'subjects'), sub);
      }

      // 3. Seed Attendance Log
      const attendanceToSeed = [
        { studentId, studentName: userData?.name || 'LODHI STUDENT', rollNumber: userData?.rollNo || 'LODHI-101', class: userData?.class || '10', date: '2026-05-12', status: 'present', schoolId },
        { studentId, studentName: userData?.name || 'LODHI STUDENT', rollNumber: userData?.rollNo || 'LODHI-101', class: userData?.class || '10', date: '2026-05-13', status: 'present', schoolId },
        { studentId, studentName: userData?.name || 'LODHI STUDENT', rollNumber: userData?.rollNo || 'LODHI-101', class: userData?.class || '10', date: '2026-05-14', status: 'present', schoolId },
        { studentId, studentName: userData?.name || 'LODHI STUDENT', rollNumber: userData?.rollNo || 'LODHI-101', class: userData?.class || '10', date: '2026-05-15', status: 'late', schoolId },
        { studentId, studentName: userData?.name || 'LODHI STUDENT', rollNumber: userData?.rollNo || 'LODHI-101', class: userData?.class || '10', date: '2026-05-16', status: 'absent', schoolId }
      ];
      for (const att of attendanceToSeed) {
        await addDoc(collection(db, 'attendance'), att);
      }

      // 4. Seed Results
      const resultsToSeed = [
        { studentId, exam: 'Mid-Term Board Exam', subject: 'Computer Science', obtainedMarks: 94, totalMarks: 100, grade: 'A+', schoolId },
        { studentId, exam: 'Mid-Term Board Exam', subject: 'Mathematics', obtainedMarks: 91, totalMarks: 100, grade: 'A+', schoolId },
        { studentId, exam: 'Mid-Term Board Exam', subject: 'English Literature', obtainedMarks: 82, totalMarks: 100, grade: 'A', schoolId },
        { studentId, exam: 'Mid-Term Board Exam', subject: 'Chemistry', obtainedMarks: 74, totalMarks: 100, grade: 'B', schoolId }
      ];
      for (const res of resultsToSeed) {
        await addDoc(collection(db, 'results'), res);
      }

      // 5. Seed Homework Tasks
      const homeworkToSeed = [
        { task: 'Complete Exercise 4.2 in Mathematics notebook.', subject: 'Mathematics', due: 'Tomorrow', status: 'Pending', schoolId },
        { task: 'Prepare chapter 2 summary for Computer Science test.', subject: 'Computer Science', due: 'Next Monday', status: 'Pending', schoolId },
        { task: 'Write character sketch of Macbeth in English diary.', subject: 'English Literature', due: 'Completed', status: 'Done', schoolId }
      ];
      for (const hw of homeworkToSeed) {
        await addDoc(collection(db, 'homework'), hw);
      }

      // 6. Seed Upcoming Exams
      const examsToSeed = [
        { title: 'Final Term Theory Exam', status: 'Upcoming', schoolId },
        { title: 'Chemistry Lab Practical Viva', status: 'Scheduled', schoolId }
      ];
      for (const ex of examsToSeed) {
        await addDoc(collection(db, 'exams'), ex);
      }

      // 7. Seed Unpaid Fee Challan
      await addDoc(collection(db, 'challans'), {
        studentId,
        studentName: userData?.name || 'LODHI STUDENT',
        rollNumber: userData?.rollNo || 'LODHI-101',
        class: userData?.class || '10',
        month: 'May 2026',
        totalAmount: 4500,
        status: 'Unpaid',
        dueDate: '2026-05-25',
        schoolId
      });
    } catch (e) {
      console.error('Error seeding data:', e);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'attendance'),
        where('schoolId', '==', schoolId),
        where('studentId', '==', studentId)
      );
      let snap = await getDocs(q);
      
      if (snap.empty && studentId) {
        await seedStudentData();
        snap = await getDocs(q);
      }

      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const total = records.length;
  const percentage = total > 0 ? ((presentCount / total) * 100).toFixed(0) : '0';

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">My Attendance</h1>
          <p className="text-dark-muted mt-1">Track your daily attendance record and percentages.</p>
        </div>
        <button onClick={fetchAttendance} className="premium-button-secondary">
          <RefreshCw size={18} /> Sync
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard className="p-6 border-b-2 border-green-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-green-500/10 text-green-500"><CheckCircle2 size={24} /></div>
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Present Days</p>
              <h3 className="text-2xl font-bold mt-1">{presentCount}</h3>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-b-2 border-red-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-red-500/10 text-red-500"><XCircle size={24} /></div>
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Absent Days</p>
              <h3 className="text-2xl font-bold mt-1">{absentCount}</h3>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-b-2 border-yellow-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-yellow-500/10 text-yellow-500"><AlertCircle size={24} /></div>
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Late Days</p>
              <h3 className="text-2xl font-bold mt-1">{lateCount}</h3>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-b-2 border-primary-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary-500/10 text-primary-500"><Calendar size={24} /></div>
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Percentage</p>
              <h3 className="text-2xl font-bold mt-1">{percentage}%</h3>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-8">
        <h2 className="text-xl font-bold mb-6">Attendance Log</h2>
        {loading ? (
          <div className="py-12 text-center text-dark-muted">Loading attendance...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-dark-muted">No attendance marked yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                  <th className="pb-4 px-4">Date</th>
                  <th className="pb-4 px-4">Status</th>
                  <th className="pb-4 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {records.map(record => (
                  <tr key={record.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-bold">{record.date || record.createdAt?.toDate()?.toLocaleDateString()}</td>
                    <td className="py-4 px-4">
                      {record.status === 'present' && (
                        <span className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-xs font-bold">Present</span>
                      )}
                      {record.status === 'absent' && (
                        <span className="px-2 py-1 rounded bg-red-500/10 text-red-500 text-xs font-bold">Absent</span>
                      )}
                      {record.status === 'late' && (
                        <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 text-xs font-bold">Late</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-dark-muted">{record.remarks || 'None'}</td>
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

export default Attendance;
