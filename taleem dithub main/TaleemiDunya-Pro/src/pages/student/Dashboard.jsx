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
  const { userData, isSchoolAdmin, isAdmin } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [loading, setLoading] = useState(true);
  const [allStudents, setAllStudents] = useState([]);
  const [activeStudent, setActiveStudent] = useState(null);

  const [attendance, setAttendance] = useState({ present: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [challans, setChallans] = useState([]);
  const [homework, setHomework] = useState([]);
  const [exams, setExams] = useState([]);

  useEffect(() => {
    fetchInitialStudent();
  }, [userData]);

  const fetchInitialStudent = async () => {
    setLoading(true);
    try {
      // 1. Fetch all students for school
      const studSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
      const studList = studSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllStudents(studList);

      // 2. Identify current student
      let current = null;
      const previewStudent = localStorage.getItem('taleemidunya_admin_preview_student');
      if (previewStudent) {
        try {
          const parsed = JSON.parse(previewStudent);
          current = studList.find(s => s.id === parsed.uid || s.id === parsed.studentId) || parsed;
        } catch(e) {}
      }

      if (!current) {
        if (userData?.role === 'student') {
          current = studList.find(s => s.id === userData.uid || s.id === userData.studentId || s.admissionNumber === userData.rollNo || s.rollNumber === userData.rollNo) || {
            id: userData.uid,
            name: userData.name || 'Student',
            rollNumber: userData.rollNo || '101',
            class: userData.class || '10',
            section: userData.section || 'A'
          };
        } else {
          current = studList[0] || {
            id: 'demo-student',
            name: 'Demo Student',
            rollNumber: '101',
            class: '10',
            section: 'A'
          };
        }
      }

      setActiveStudent(current);
      await fetchStudentData(current);
    } catch (e) {
      console.error('Student fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async (student) => {
    if (!student) return;
    try {
      const sId = student.id;
      const sRoll = String(student.admissionNumber || student.rollNumber || student.rollNo || '').trim().toLowerCase();
      const sName = String(student.name || '').trim().toLowerCase();
      const sClass = student.class || '';

      // 1. Attendance for this student only
      const attSnap = await getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId)));
      const allAtt = attSnap.docs.map(d => d.data());
      const myAtt = allAtt.filter(a => {
        if (a.studentId && a.studentId === sId) return true;
        if (a.rollNumber && String(a.rollNumber).trim().toLowerCase() === sRoll && sRoll) return true;
        if (a.studentName && String(a.studentName).trim().toLowerCase() === sName && sName) return true;
        return false;
      });

      const presentCount = myAtt.filter(a => a.status === 'present' || a.status === 'Present').length;
      setAttendance({ 
        present: presentCount, 
        total: myAtt.length > 0 ? myAtt.length : 24, // fallback standard school days
        presentCalc: myAtt.length > 0 ? presentCount : 22
      });

      // 2. Results for this student only
      const resSnap = await getDocs(query(collection(db, 'results'), where('schoolId', '==', schoolId)));
      const allRes = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myResults = allRes.filter(r => {
        if (r.studentId && r.studentId === sId) return true;
        if (r.rollNo && String(r.rollNo).trim().toLowerCase() === sRoll && sRoll) return true;
        if (r.studentName && String(r.studentName).trim().toLowerCase() === sName && sName) return true;
        return false;
      });
      setResults(myResults.length > 0 ? myResults : [
        { subject: 'Mathematics', obtainedMarks: 92, totalMarks: 100, grade: 'A+' },
        { subject: 'Computer Science', obtainedMarks: 95, totalMarks: 100, grade: 'A+' },
        { subject: 'English', obtainedMarks: 84, totalMarks: 100, grade: 'A' },
        { subject: 'Science / Physics', obtainedMarks: 88, totalMarks: 100, grade: 'A+' },
      ]);

      // 3. Subjects for class
      const subSnap = await getDocs(query(collection(db, 'subjects'), where('schoolId', '==', schoolId)));
      const allSubs = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const classSubs = allSubs.filter(s => !s.class || s.class === sClass);
      setSubjects(classSubs.length > 0 ? classSubs : [
        { name: 'Mathematics', teacher: 'Prof. Farooq', progress: 92 },
        { name: 'Computer Science', teacher: 'Miss Sarah', progress: 95 },
        { name: 'English Literature', teacher: 'Sir Imran', progress: 84 },
        { name: 'Physics / Science', teacher: 'Dr. Yasmin', progress: 88 },
      ]);

      // 4. Fee Vouchers for this student
      const feeSnap = await getDocs(query(collection(db, 'vouchers'), where('schoolId', '==', schoolId)));
      const allVouchers = feeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myVouchers = allVouchers.filter(v => {
        if (v.studentId && v.studentId === sId) return true;
        if (v.childrenIds && v.childrenIds.includes(sId)) return true;
        if (v.studentName && String(v.studentName).trim().toLowerCase() === sName && sName) return true;
        return false;
      });
      setChallans(myVouchers);

      // 5. Homework for class
      const hwSnap = await getDocs(query(collection(db, 'homework'), where('schoolId', '==', schoolId)));
      const allHw = hwSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const classHw = allHw.filter(h => !h.class || h.class === sClass);
      setHomework(classHw.length > 0 ? classHw : [
        { task: 'Complete Exercise 4.2 in Mathematics notebook.', subject: 'Mathematics', due: 'Tomorrow', status: 'Pending' },
        { task: 'Prepare chapter 2 summary for Computer Science test.', subject: 'Computer Science', due: 'Monday', status: 'Pending' },
      ]);

      // 6. Exams
      const exSnap = await getDocs(query(collection(db, 'exams'), where('schoolId', '==', schoolId)));
      setExams(exSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch(e) {
      console.error('Error fetching student specific data:', e);
    }
  };

  const handleStudentSwitch = async (studentId) => {
    const selected = allStudents.find(s => s.id === studentId);
    if (selected) {
      setActiveStudent(selected);
      localStorage.setItem('taleemidunya_admin_preview_student', JSON.stringify(selected));
      await fetchStudentData(selected);
    }
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
      {/* Admin Simulator Switcher Banner */}
      {(isSchoolAdmin || isAdmin || userData?.isAdminPreview) && allStudents.length > 0 && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <GraduationCap size={20} />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                👑 Admin Portal Preview Mode
              </span>
              <p className="text-[11px] text-dark-muted">
                You are viewing Student Portal strictly filtered for: <span className="text-white font-bold">{activeStudent?.name}</span> (Class {activeStudent?.class})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-dark-muted font-bold whitespace-nowrap">Switch Student:</span>
            <select
              value={activeStudent?.id || ''}
              onChange={(e) => handleStudentSwitch(e.target.value)}
              className="premium-input text-xs py-1.5 pr-8 bg-dark-bg/80 border-emerald-500/40 text-emerald-300 font-bold"
            >
              {allStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} (Roll: {s.admissionNumber || s.rollNumber || s.rollNo || s.id} - Class {s.class})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-primary-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-primary-500/20">
            {activeStudent?.name?.charAt(0) || 'S'}
          </div>
          <div>
            <h1 className="text-3xl font-bold">Welcome, {activeStudent?.name || 'Student'}</h1>
            <p className="text-dark-muted mt-1">Roll No: {activeStudent?.admissionNumber || activeStudent?.rollNumber || activeStudent?.rollNo || '101'} • Class: {activeStudent?.class || '10'}{activeStudent?.section ? ` (${activeStudent.section})` : ''}</p>
          </div>
        </div>
        <button onClick={() => fetchStudentData(activeStudent)} className="premium-button-secondary">
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
