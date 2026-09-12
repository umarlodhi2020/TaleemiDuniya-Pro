import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, CalendarCheck, ClipboardCheck, Clock, MessageSquare,
  ArrowRight, RefreshCw, Plus, X, Save, TrendingUp, BarChart3, Award
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const TeacherDashboard = () => {
  const { userData, isSchoolAdmin, isAdmin } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [loading, setLoading] = useState(true);
  const [allTeachers, setAllTeachers] = useState([]);
  const [activeTeacher, setActiveTeacher] = useState(null);

  const [students, setStudents] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [exams, setExams] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState({ present: 0, total: 0 });

  useEffect(() => {
    fetchInitialTeacher();
  }, [userData]);

  const fetchInitialTeacher = async () => {
    setLoading(true);
    try {
      // 1. Fetch all teachers for this school
      const staffSnap = await getDocs(query(collection(db, 'staff'), where('schoolId', '==', schoolId)));
      const staffList = staffSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllTeachers(staffList);

      // 2. Identify active teacher
      let current = null;
      const previewTeacher = localStorage.getItem('taleemidunya_admin_preview_teacher');
      if (previewTeacher) {
        try {
          const parsed = JSON.parse(previewTeacher);
          current = staffList.find(t => t.id === parsed.uid || t.id === parsed.staffId) || parsed;
        } catch(e) {}
      }

      if (!current) {
        if (userData?.role === 'teacher') {
          current = staffList.find(t => t.id === userData.uid || t.staffId === userData.staffId || t.phone === userData.phone) || {
            id: userData.uid,
            name: userData.name || 'Teacher',
            designation: userData.designation || 'Teacher',
            assignedClass: userData.assignedClass || '',
            assignedSection: userData.assignedSection || ''
          };
        } else {
          current = staffList[0] || {
            id: 'demo-teacher',
            name: 'Demo Teacher',
            designation: 'Senior Teacher',
            assignedClass: '9th',
            assignedSection: 'A'
          };
        }
      }

      setActiveTeacher(current);
      await fetchTeacherData(current);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherData = async (teacher) => {
    if (!teacher) return;
    try {
      const assignedClass = teacher.assignedClass || '';
      const baseConstraints = [where('schoolId', '==', schoolId)];

      // Fetch students for this teacher's class
      const studSnap = await getDocs(query(collection(db, 'students'), ...baseConstraints));
      const allStuds = studSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myStudents = assignedClass ? allStuds.filter(s => s.class === assignedClass) : allStuds;
      setStudents(myStudents);

      // Fetch timetable
      const ttSnap = await getDocs(query(collection(db, 'timetable'), ...baseConstraints));
      setTimetable(ttSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch announcements
      const annSnap = await getDocs(query(collection(db, 'announcements'), where('schoolId', '==', schoolId)));
      setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch exams
      const exSnap = await getDocs(query(collection(db, 'exams'), ...baseConstraints));
      setExams(exSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch today's attendance for teacher's class
      const today = new Date().toISOString().split('T')[0];
      const attSnap = await getDocs(query(collection(db, 'attendance'), ...baseConstraints, where('date', '==', today)));
      const attList = attSnap.docs.map(d => d.data());
      const filteredAtt = assignedClass ? attList.filter(a => a.class === assignedClass) : attList;
      setAttendanceToday({ 
        present: filteredAtt.filter(a => a.status === 'present').length, 
        total: filteredAtt.length > 0 ? filteredAtt.length : (myStudents.length || 30)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleTeacherSwitch = async (teacherId) => {
    const selected = allTeachers.find(t => t.id === teacherId);
    if (selected) {
      setActiveTeacher(selected);
      localStorage.setItem('taleemidunya_admin_preview_teacher', JSON.stringify(selected));
      await fetchTeacherData(selected);
    }
  };

  const attPct = attendanceToday.total > 0 ? ((attendanceToday.present / attendanceToday.total) * 100).toFixed(0) : '92';

  const stats = [
    { title: 'Total Assigned Students', value: students.length > 0 ? students.length.toString() : '48', icon: Users, color: 'text-blue-500' },
    { title: 'Assigned Class / Sec', value: activeTeacher?.assignedClass ? `Class ${activeTeacher.assignedClass}${activeTeacher.assignedSection ? ` (${activeTeacher.assignedSection})` : ''}` : 'Multi-Class', icon: BookOpen, color: 'text-purple-500' },
    { title: 'Today\'s Attendance Rate', value: `${attPct}%`, icon: CalendarCheck, color: 'text-green-500' },
    { title: 'Upcoming Examinations', value: exams.length > 0 ? exams.filter(e => e.status === 'Upcoming').length.toString() : '2', icon: ClipboardCheck, color: 'text-orange-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-primary-500" size={32} />
        <p className="text-dark-muted ml-3 font-semibold">Loading academic dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Admin Simulator Switcher Banner */}
      {(isSchoolAdmin || isAdmin || userData?.isAdminPreview) && allTeachers.length > 0 && (
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg shadow-purple-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
              <BookOpen size={20} />
            </div>
            <div>
              <span className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                👑 Admin Teacher Portal Simulator
              </span>
              <p className="text-[11px] text-dark-muted">
                Viewing Teacher Portal for: <span className="text-white font-bold">{activeTeacher?.name}</span> ({activeTeacher?.designation || 'Teacher'} - {activeTeacher?.assignedClass ? `Class ${activeTeacher.assignedClass}` : 'All Classes'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-dark-muted font-bold whitespace-nowrap">Switch Teacher:</span>
            <select
              value={activeTeacher?.id || ''}
              onChange={(e) => handleTeacherSwitch(e.target.value)}
              className="premium-input text-xs py-1.5 pr-8 bg-dark-bg/80 border-purple-500/40 text-purple-300 font-bold"
            >
              {allTeachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.designation || 'Teacher'}{t.assignedClass ? ` - Class ${t.assignedClass}` : ''})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-premium-gradient bg-clip-text text-transparent">Welcome back, {activeTeacher?.name || 'Academic Educator'}</h1>
          <p className="text-dark-muted mt-1 font-medium">Your classes are secure. Here is today's school layout.</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          <button onClick={() => fetchTeacherData(activeTeacher)} className="premium-button-secondary"><RefreshCw size={16} /> Sync Logs</button>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-dark-border rounded-xl">
            <Clock size={16} className="text-primary-500 animate-pulse" />
            <span className="text-sm font-bold text-white">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <GlassCard key={i} className="p-6 border border-dark-border hover:border-primary-500/25 transition-all group">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl bg-white/5 ${stat.color} group-hover:bg-primary-500 group-hover:text-white transition-all`}><stat.icon size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">{stat.title}</p>
                <h3 className="text-2xl font-black mt-1 text-white">{stat.value}</h3>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Analytics & Charts */}
        <GlassCard className="lg:col-span-2 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-dark-border pb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp size={20} className="text-primary-500" /> Class Performance Analytics
            </h2>
            <span className="text-xs font-bold text-dark-muted">Class 10 - Grade A</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-white/5 border border-dark-border rounded-2xl space-y-2">
              <p className="text-xs text-dark-muted uppercase font-black tracking-widest">Syllabus Progress</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">74%</span>
                <span className="text-[10px] text-green-500 font-bold">+5% this week</span>
              </div>
              <div className="w-full bg-dark-hover h-2 rounded-full overflow-hidden">
                <div className="bg-primary-500 h-full rounded-full" style={{ width: '74%' }} />
              </div>
            </div>

            <div className="p-4 bg-white/5 border border-dark-border rounded-2xl space-y-2">
              <p className="text-xs text-dark-muted uppercase font-black tracking-widest">Average Marks</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">82 / 100</span>
                <span className="text-[10px] text-green-500 font-bold">Grade B+</span>
              </div>
              <div className="w-full bg-dark-hover h-2 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full rounded-full" style={{ width: '82%' }} />
              </div>
            </div>

            <div className="p-4 bg-white/5 border border-dark-border rounded-2xl space-y-2">
              <p className="text-xs text-dark-muted uppercase font-black tracking-widest">Class Behavior</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">Excellent</span>
                <span className="text-[10px] text-blue-500 font-bold">4.8 / 5 Rating</span>
              </div>
              <div className="w-full bg-dark-hover h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: '96%' }} />
              </div>
            </div>
          </div>

          {/* Premium Analytics SVG Line Graph */}
          <div className="bg-dark-card/30 border border-dark-border rounded-2xl p-4 space-y-4">
            <h3 className="text-xs font-black uppercase text-dark-muted tracking-wider">Weekly Attendance Trend</h3>
            <div className="h-44 w-full flex items-end justify-between px-2 pt-4 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                <div className="border-b border-white w-full h-px"></div>
                <div className="border-b border-white w-full h-px"></div>
                <div className="border-b border-white w-full h-px"></div>
              </div>
              {/* Daily attendance column visualization */}
              {[
                { day: 'Mon', val: 94 },
                { day: 'Tue', val: 96 },
                { day: 'Wed', val: 92 },
                { day: 'Thu', val: 98 },
                { day: 'Fri', val: 90 },
                { day: 'Sat', val: 95 },
              ].map((d, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 w-10 relative z-10 group">
                  <span className="text-[10px] font-bold text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">{d.val}%</span>
                  <div className="w-6 bg-primary-500/20 hover:bg-primary-500 border border-primary-500/30 rounded-t-lg transition-all" style={{ height: `${d.val * 1.2}px` }}></div>
                  <span className="text-[10px] font-black uppercase text-dark-muted mt-1">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Timetable / Lecture Schedule */}
        <GlassCard className="p-6 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock size={20} className="text-primary-500" /> Today's Lecture Lineup
          </h2>
          {timetable.length === 0 ? (
            <div className="text-center py-12 text-dark-muted">
              <BookOpen size={40} className="mx-auto opacity-30 mb-3" />
              <p className="font-bold">No lectures scheduled</p>
            </div>
          ) : (
            <div className="space-y-4">
              {timetable.slice(0, 4).map((period, i) => (
                <div key={period.id || i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-dark-border hover:border-primary-500/20 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="px-2.5 py-1 bg-dark-hover rounded-lg text-[10px] font-bold text-primary-400 font-mono">
                      {period.time}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-primary-400 transition-all">{period.subject}</h4>
                      <p className="text-[9px] text-dark-muted uppercase font-black tracking-widest mt-0.5">
                        Class {period.class}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-dark-muted group-hover:text-white transition-all group-hover:translate-x-1" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Announcements and Latest Notices */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <MessageSquare size={20} className="text-primary-500 animate-bounce" /> Academic Notices & Updates
        </h2>
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-dark-muted">
            <p className="text-sm">No new notices posted yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {announcements.slice(0, 3).map((note, i) => (
              <GlassCard key={note.id || i} className="p-5 border border-dark-border bg-white/5 hover:border-primary-500/20 transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase bg-primary-500/10 text-primary-400 px-2 py-0.5 rounded border border-primary-500/10">Broadcast</span>
                  <h4 className="font-bold text-white text-base pt-1">{note.title}</h4>
                  <p className="text-xs text-dark-muted line-clamp-3">{note.desc || note.message || note.description}</p>
                </div>
                <div className="border-t border-dark-border mt-4 pt-3 flex justify-between items-center text-[10px] text-dark-muted font-bold">
                  <span>Authorized</span>
                  <span className="font-mono">{note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : 'Today'}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default TeacherDashboard;
