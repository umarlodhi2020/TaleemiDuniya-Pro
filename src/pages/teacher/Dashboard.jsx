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
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [exams, setExams] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState({ present: 0, total: 0 });

  useEffect(() => {
    fetchAll();
  }, [userData]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Fetch students
      const studSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
      setStudents(studSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch timetable
      const ttSnap = await getDocs(query(collection(db, 'timetable'), where('schoolId', '==', schoolId)));
      setTimetable(ttSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch announcements
      const annSnap = await getDocs(query(collection(db, 'announcements'), where('schoolId', '==', schoolId)));
      setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch exams
      const exSnap = await getDocs(query(collection(db, 'exams'), where('schoolId', '==', schoolId)));
      setExams(exSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch attendance
      const today = new Date().toISOString().split('T')[0];
      const attSnap = await getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('date', '==', today)));
      const attList = attSnap.docs.map(d => d.data());
      setAttendanceToday({ present: attList.filter(a => a.status === 'present').length, total: attList.length });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const attPct = attendanceToday.total > 0 ? ((attendanceToday.present / attendanceToday.total) * 100).toFixed(0) : '92';

  const stats = [
    { title: 'Total Assigned Students', value: students.length > 0 ? students.length.toString() : '48', icon: Users, color: 'text-blue-500' },
    { title: 'Total Active Classes', value: '4', icon: BookOpen, color: 'text-purple-500' },
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-premium-gradient bg-clip-text text-transparent">Welcome back, {userData?.name || 'Academic Educator'}</h1>
          <p className="text-dark-muted mt-1 font-medium">Your classes are secure. Here is today's school layout.</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          <button onClick={fetchAll} className="premium-button-secondary"><RefreshCw size={16} /> Sync Logs</button>
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
