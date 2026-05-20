import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, BookOpen, Calendar, Award, Clock, FileText,
  TrendingUp, Download, CreditCard, RefreshCw
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const StudentDashboard = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const studentId = userData?.uid || '';
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState({ present: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [challans, setChallans] = useState([]);
  const [homework, setHomework] = useState([]);
  const [exams, setExams] = useState([]);

  useEffect(() => { fetchAll(); }, [userData]);

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

  const fetchAll = async () => {
    setLoading(true);
    try {
      // 1. Fetch Attendance
      let attSnap = await getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('studentId', '==', studentId)));
      
      // Auto-Seed if no data found
      if (attSnap.empty && studentId) {
        await seedStudentData();
        attSnap = await getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('studentId', '==', studentId)));
      }

      const attList = attSnap.docs.map(d => d.data());
      setAttendance({ present: attList.filter(a => a.status === 'present').length, total: attList.length });

      // Results
      const resSnap = await getDocs(query(collection(db, 'results'), where('schoolId', '==', schoolId)));
      const resList = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myResults = resList.filter(r => r.studentId === studentId || !r.studentId);
      setResults(myResults);

      // Subjects / Timetable
      const subSnap = await getDocs(query(collection(db, 'subjects'), where('schoolId', '==', schoolId)));
      setSubjects(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fee challans
      const feeSnap = await getDocs(query(collection(db, 'challans'), where('schoolId', '==', schoolId)));
      const feeList = feeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setChallans(feeList.filter(c => c.status !== 'Paid'));

      // Homework
      const hwSnap = await getDocs(query(collection(db, 'homework'), where('schoolId', '==', schoolId)));
      setHomework(hwSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Exams
      const exSnap = await getDocs(query(collection(db, 'exams'), where('schoolId', '==', schoolId)));
      setExams(exSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (e) { console.error('Student fetch error:', e); }
    finally { setLoading(false); }
  };

  const attPct = attendance.total > 0 ? ((attendance.present / attendance.total) * 100).toFixed(0) : '0';
  const pendingExams = exams.filter(e => e.status === 'Upcoming' || e.status === 'Scheduled').length;
  const pendingHw = homework.filter(h => h.status !== 'Done' && h.status !== 'Completed').length;
  const latestFee = challans.length > 0 ? challans[0] : null;

  const stats = [
    { title: 'Attendance', value: `${attPct}%`, icon: Calendar, color: 'text-green-500' },
    { title: 'Results', value: results.length.toString(), icon: TrendingUp, color: 'text-primary-500' },
    { title: 'Homework', value: pendingHw > 0 ? `${pendingHw} pending` : '0', icon: FileText, color: 'text-orange-500' },
    { title: 'Active Exams', value: pendingExams.toString(), icon: Clock, color: 'text-purple-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-primary-500" size={32} />
        <p className="text-dark-muted ml-3">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-primary-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-primary-500/20">
            {userData?.name?.charAt(0) || 'S'}
          </div>
          <div>
            <h1 className="text-3xl font-bold">Welcome, {userData?.name || 'Student'}</h1>
            <p className="text-dark-muted mt-1">Roll No: {userData?.rollNo || 'N/A'} • Class: {userData?.class || 'N/A'}</p>
          </div>
        </div>
        <button onClick={fetchAll} className="premium-button-secondary">
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <GlassCard key={i} className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-white/5 ${stat.color}`}><stat.icon size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">{stat.title}</p>
                <h3 className="text-2xl font-bold mt-0.5">{stat.value}</h3>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Subjects */}
          <GlassCard>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BookOpen size={20} className="text-primary-500" /> Current Subjects
              </h2>
            </div>
            {subjects.length === 0 ? (
              <div className="text-center py-10 text-dark-muted">
                <BookOpen size={40} className="mx-auto opacity-30 mb-3" />
                <p className="font-bold">No subjects found</p>
                <p className="text-xs mt-1">Subjects will appear when added by your school</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjects.map((sub, i) => {
                  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-amber-500', 'bg-cyan-500'];
                  return (
                    <div key={sub.id || i} className="p-4 bg-white/5 border border-dark-border rounded-2xl hover:border-primary-500/30 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold">{sub.name}</h4>
                          <p className="text-[10px] text-dark-muted uppercase font-black">{sub.teacher || 'N/A'}</p>
                        </div>
                        <span className="text-xs font-bold text-dark-text">{sub.progress || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-dark-border rounded-full overflow-hidden">
                        <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all`} style={{ width: `${sub.progress || 0}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Results */}
          <GlassCard>
            <h2 className="text-xl font-bold mb-6">Latest Exam Results</h2>
            {results.length === 0 ? (
              <div className="text-center py-10 text-dark-muted">
                <Award size={40} className="mx-auto opacity-30 mb-3" />
                <p className="font-bold">No results published yet</p>
                <p className="text-xs mt-1">Your exam results will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.slice(0, 5).map((res, i) => (
                  <div key={res.id || i} className="flex items-center justify-between p-4 bg-dark-hover rounded-2xl border border-dark-border">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-500/10 text-green-500 rounded-lg"><Award size={18} /></div>
                      <div>
                        <h4 className="font-bold text-sm">{res.exam || res.title || 'Exam'}</h4>
                        <p className="text-[10px] text-dark-muted uppercase tracking-widest">
                          {res.date || (res.createdAt?.toDate ? res.createdAt.toDate().toLocaleDateString() : '')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-primary-400">{res.marks || res.obtainedMarks || 'N/A'}/{res.totalMarks || ''}</p>
                      <p className="text-xs font-bold text-green-500">Grade: {res.grade || 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        <div className="space-y-8">
          {/* Fee Card */}
          <GlassCard className="p-6 bg-premium-gradient relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-white">Upcoming Fee</h3>
              {latestFee ? (
                <>
                  <p className="text-white/80 text-xs mt-1">Challan for {latestFee.month || 'this month'}</p>
                  <div className="mt-6">
                    <p className="text-[10px] text-white/60 uppercase font-black tracking-widest">Payable Amount</p>
                    <h2 className="text-4xl font-black text-white mt-1">PKR {Number(latestFee.totalAmount || 0).toLocaleString()}</h2>
                  </div>
                  <p className="text-xs text-white/60 mt-2">Due: {latestFee.dueDate || 'N/A'}</p>
                </>
              ) : (
                <>
                  <p className="text-white/80 text-xs mt-1">No pending fees</p>
                  <div className="mt-6">
                    <p className="text-[10px] text-white/60 uppercase font-black tracking-widest">Status</p>
                    <h2 className="text-2xl font-black text-white mt-1">All Clear ✓</h2>
                  </div>
                </>
              )}
            </div>
            <CreditCard className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform" />
          </GlassCard>

          {/* Homework */}
          <GlassCard>
            <h2 className="text-xl font-bold mb-6">Home Tasks</h2>
            {homework.length === 0 ? (
              <div className="text-center py-8 text-dark-muted">
                <FileText size={32} className="mx-auto opacity-30 mb-2" />
                <p className="text-sm font-bold">No homework assigned</p>
              </div>
            ) : (
              <div className="space-y-4">
                {homework.slice(0, 5).map((t, i) => (
                  <div key={t.id || i} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${t.status === 'Done' || t.status === 'Completed' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${t.status === 'Done' || t.status === 'Completed' ? 'text-dark-muted line-through' : ''}`}>
                        {t.task || t.title}
                      </p>
                      <p className="text-[10px] text-dark-muted uppercase font-black">
                        {t.due || t.dueDate || (t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : '')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Attendance Progress */}
          <GlassCard className="p-6 bg-green-500/5 border-green-500/20">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-green-500" /> Attendance Summary
            </h3>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1 bg-dark-hover rounded-full h-3 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${attPct}%` }} />
              </div>
              <span className="text-sm font-black text-green-400">{attPct}%</span>
            </div>
            <p className="text-xs text-dark-muted">{attendance.present} present out of {attendance.total} days</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
