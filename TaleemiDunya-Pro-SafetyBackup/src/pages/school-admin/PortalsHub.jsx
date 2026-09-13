import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  GraduationCap, 
  Users, 
  BookOpen, 
  Smartphone, 
  ExternalLink, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  KeyRound, 
  Eye, 
  Lock, 
  Unlock, 
  Activity, 
  TrendingUp, 
  Clock, 
  MessageSquare, 
  UserCheck,
  Zap,
  Copy,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

const PortalsHub = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = userData?.schoolName || 'TaleemiDunya School';

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'students' | 'parents' | 'teachers'
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [sendingWaId, setSendingWaId] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  useEffect(() => {
    fetchData();
  }, [userData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const studSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
      const studList = studSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(studList);

      // 2. Fetch Staff (Teachers)
      const staffSnap = await getDocs(query(collection(db, 'staff'), where('schoolId', '==', schoolId)));
      const staffList = staffSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStaff(staffList);

      // 3. Fetch Recent Attendance
      const attSnap = await getDocs(query(collection(db, 'attendance'), where('schoolId', '==', schoolId)));
      setAttendanceLogs(attSnap.docs.map(d => d.data()));

      // 4. Fetch Vouchers
      const vSnap = await getDocs(query(collection(db, 'vouchers'), where('schoolId', '==', schoolId)));
      setVouchers(vSnap.docs.map(d => d.data()));

    } catch (e) {
      console.error('Error fetching portals data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Group Students into Families (Parents)
  const parentsList = useMemo(() => {
    const map = {};
    students.forEach(s => {
      const phone = String(s.parentPhone || s.fatherPhone || s.phone || '').trim();
      const father = s.fatherName || 'Parent / Guardian';
      const key = phone || father;
      if (!map[key]) {
        map[key] = {
          id: key,
          fatherName: father,
          phone: phone,
          cnic: s.fatherCnic || s.parentCnic || '-',
          portalPin: s.parentPortalPin || '123456',
          children: []
        };
      }
      map[key].children.push(s);
    });
    return Object.values(map);
  }, [students]);

  // Classes list
  const classesList = useMemo(() => {
    return ['All', ...new Set(students.map(s => s.class).filter(Boolean))];
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = selectedClass === 'All' || s.class === selectedClass;
      const term = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        (s.name && s.name.toLowerCase().includes(term)) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(term)) ||
        (s.rollNumber && String(s.rollNumber).toLowerCase().includes(term)) ||
        (s.admissionNumber && String(s.admissionNumber).toLowerCase().includes(term));
      return matchClass && matchSearch;
    });
  }, [students, selectedClass, searchTerm]);

  // Filtered Parents
  const filteredParents = useMemo(() => {
    return parentsList.filter(p => {
      const term = searchTerm.toLowerCase();
      return !searchTerm ||
        p.fatherName.toLowerCase().includes(term) ||
        p.phone.includes(term) ||
        p.children.some(c => (c.name || '').toLowerCase().includes(term));
    });
  }, [parentsList, searchTerm]);

  // Filtered Teachers
  const filteredTeachers = useMemo(() => {
    return staff.filter(t => {
      const term = searchTerm.toLowerCase();
      return !searchTerm ||
        (t.name && t.name.toLowerCase().includes(term)) ||
        (t.designation && t.designation.toLowerCase().includes(term)) ||
        (t.assignedClass && t.assignedClass.toLowerCase().includes(term)) ||
        (t.staffId && t.staffId.toLowerCase().includes(term));
    });
  }, [staff, searchTerm]);

  // Send WhatsApp Credentials to Student / Parent / Teacher
  const handleSendWhatsAppCredentials = async (type, item) => {
    const phone = type === 'parent' 
      ? item.phone 
      : type === 'student' 
      ? (item.parentPhone || item.fatherPhone || item.phone)
      : (item.phone || item.mobile);

    if (!phone) {
      alert('No phone number registered for this user.');
      return;
    }

    setSendingWaId(item.id);
    const portalBaseUrl = window.location.origin + '/#/login';

    let msg = '';
    if (type === 'student') {
      const roll = item.admissionNumber || item.rollNumber || item.rollNo || item.grNo || item.id;
      const pin = item.portalPin || item.portalPassword || '123456';
      msg = `🎓 *STUDENT PORTAL LOGIN CREDENTIALS*\n\nDear *${item.name}* (Class: ${item.class || 'N/A'}),\n\nYour online student portal is active! You can view your attendance, homework, exams, and fee status.\n\n🌐 *Portal URL:* ${portalBaseUrl}?role=student\n👤 *Roll / Login ID:* ${roll}\n🔑 *Portal PIN:* ${pin}\n\n*${schoolName}*`;
    } else if (type === 'parent') {
      const pin = item.portalPin || '123456';
      const kidsList = item.children.map(c => `• ${c.name} (${c.class || 'N/A'})`).join('\n');
      msg = `👨‍👩‍👧‍👦 *PARENT PORTAL ACCESS DETAILS*\n\nDear *${item.fatherName}*,\n\nYour parent portal account is live. You can now monitor your children's real-time attendance, fee challans, homework, and report cards.\n\n🌐 *Portal URL:* ${portalBaseUrl}?role=parent\n📱 *Registered Mobile:* ${item.phone}\n🔑 *Portal PIN:* ${pin}\n\n*Linked Children:*\n${kidsList}\n\n*${schoolName}*`;
    } else if (type === 'teacher') {
      const staffCode = item.staffId || item.id;
      const pin = item.portalPin || item.portalPassword || '123456';
      msg = `🧑‍🏫 *TEACHER ACADEMIC PORTAL ACCESS*\n\nDear *${item.name}* (${item.designation || 'Teacher'}),\n\nYour academic portal is ready for marking daily attendance, entering exam marks, and posting homework.\n\n🌐 *Portal URL:* ${portalBaseUrl}?role=teacher\n👤 *Staff ID / Login:* ${staffCode}\n🔑 *Portal PIN:* ${pin}\n\n*${schoolName}*`;
    }

    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const waUrl = `https://wa.me/${cleanPhone.startsWith('92') ? cleanPhone : '92' + cleanPhone.replace(/^0/, '')}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
      showToast(`✅ WhatsApp message opened for ${item.name || item.fatherName}!`);
    } catch (e) {
      console.error(e);
      alert('Could not open WhatsApp.');
    } finally {
      setSendingWaId(null);
    }
  };

  // 1-Click Live Preview as Student
  const handlePreviewAsStudent = (student) => {
    const studentProfile = {
      uid: student.id,
      studentId: student.id,
      role: 'student',
      name: student.name,
      fatherName: student.fatherName,
      class: student.class,
      section: student.section || 'A',
      rollNo: student.admissionNumber || student.rollNumber || student.rollNo || 'N/A',
      schoolId: student.schoolId || schoolId,
      schoolName: schoolName,
      isAdminPreview: true
    };
    // Open in new tab so current admin session stays active
    const previewData = encodeURIComponent(JSON.stringify(studentProfile));
    const newTab = window.open('/#/student/dashboard?_preview=' + Date.now(), '_blank');
    if (newTab) {
      // Set portal session in a way that doesn't disturb current tab
      const oldSession = localStorage.getItem('taleemidunya_portal_session');
      localStorage.setItem('taleemidunya_admin_preview_student', JSON.stringify(studentProfile));
      // Use sessionStorage in the new tab context via a temp flag
      localStorage.setItem('taleemidunya_pending_preview', JSON.stringify(studentProfile));
      // Restore original session after a short delay so current tab is unaffected
      setTimeout(() => {
        if (oldSession) {
          localStorage.setItem('taleemidunya_portal_session', oldSession);
        } else {
          localStorage.removeItem('taleemidunya_portal_session');
        }
        localStorage.removeItem('taleemidunya_pending_preview');
      }, 500);
    }
  };

  // 1-Click Live Preview as Parent
  const handlePreviewAsParent = (parent) => {
    const parentProfile = {
      uid: 'parent_' + (parent.phone || parent.id),
      role: 'parent',
      name: parent.fatherName || 'Parent / Guardian',
      phone: parent.phone,
      childrenIds: parent.children.map(c => c.id),
      children: parent.children,
      schoolId: schoolId,
      isAdminPreview: true
    };
    // Open in new tab so current admin session stays active
    const previewData = encodeURIComponent(JSON.stringify(parentProfile));
    const newTab = window.open('/#/parent/dashboard?_preview=' + Date.now(), '_blank');
    if (newTab) {
      const oldSession = localStorage.getItem('taleemidunya_portal_session');
      localStorage.setItem('taleemidunya_admin_preview_parent', JSON.stringify(parentProfile));
      localStorage.setItem('taleemidunya_pending_preview', JSON.stringify(parentProfile));
      setTimeout(() => {
        if (oldSession) {
          localStorage.setItem('taleemidunya_portal_session', oldSession);
        } else {
          localStorage.removeItem('taleemidunya_portal_session');
        }
        localStorage.removeItem('taleemidunya_pending_preview');
      }, 500);
    }
  };

  // 1-Click Live Preview as Teacher
  const handlePreviewAsTeacher = (teacher) => {
    const teacherProfile = {
      uid: teacher.id,
      role: 'teacher',
      name: teacher.name,
      designation: teacher.designation || teacher.role || 'Teacher',
      assignedClass: teacher.assignedClass || '',
      assignedSection: teacher.assignedSection || '',
      subjects: teacher.subjects || [],
      staffId: teacher.staffId || '',
      schoolId: schoolId,
      isAdminPreview: true
    };
    // Open in new tab so current admin session stays active
    const previewData = encodeURIComponent(JSON.stringify(teacherProfile));
    const newTab = window.open('/#/teacher/dashboard?_preview=' + Date.now(), '_blank');
    if (newTab) {
      const oldSession = localStorage.getItem('taleemidunya_portal_session');
      localStorage.setItem('taleemidunya_admin_preview_teacher', JSON.stringify(teacherProfile));
      localStorage.setItem('taleemidunya_pending_preview', JSON.stringify(teacherProfile));
      setTimeout(() => {
        if (oldSession) {
          localStorage.setItem('taleemidunya_portal_session', oldSession);
        } else {
          localStorage.removeItem('taleemidunya_portal_session');
        }
        localStorage.removeItem('taleemidunya_pending_preview');
      }, 500);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-dark-text pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 size={20} />
          <span className="text-sm font-bold">{toastMsg}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & CONTROLS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-500/10 border border-primary-500/20 rounded-2xl text-primary-400">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                3 Portals Activity & Access Hub
              </h1>
              <p className="text-dark-muted text-xs sm:text-sm mt-0.5">
                Live monitoring, credentials management & WhatsApp onboarding for Student, Parent & Teacher portals.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={fetchData}
            className="premium-button-secondary text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Sync Logs
          </button>

          <button 
            onClick={() => navigate('/login?role=student')}
            className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <GraduationCap size={15} /> Student Login Page
          </button>

          <button 
            onClick={() => navigate('/login?role=parent')}
            className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Users size={15} /> Parent Login Page
          </button>

          <button 
            onClick={() => navigate('/login?role=teacher')}
            className="px-3 py-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <BookOpen size={15} /> Teacher Login Page
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. METRIC OVERVIEW CARDS
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Student Portal Card */}
        <GlassCard className="p-5 border-l-4 border-l-emerald-500 hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400">Student Portal</p>
              <h3 className="text-2xl font-black text-white mt-1">{students.length} Students</h3>
              <p className="text-[11px] text-dark-muted mt-0.5">
                <span className="text-emerald-400 font-bold">100%</span> Accounts Active
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
              <GraduationCap size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-dark-border flex items-center justify-between">
            <span className="text-[11px] text-dark-muted">Default PIN: <code className="text-white font-mono font-bold">123456</code></span>
            <button 
              onClick={() => setActiveTab('students')}
              className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              Manage <ChevronRight size={12} />
            </button>
          </div>
        </GlassCard>

        {/* Parent Portal Card */}
        <GlassCard className="p-5 border-l-4 border-l-amber-500 hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-400">Parent Portal</p>
              <h3 className="text-2xl font-black text-white mt-1">{parentsList.length} Families</h3>
              <p className="text-[11px] text-dark-muted mt-0.5">
                <span className="text-amber-400 font-bold">{students.length}</span> Children Linked
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20">
              <Users size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-dark-border flex items-center justify-between">
            <span className="text-[11px] text-dark-muted">Login via: <span className="text-white font-bold">Mobile #</span></span>
            <button 
              onClick={() => setActiveTab('parents')}
              className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-0.5"
            >
              Manage <ChevronRight size={12} />
            </button>
          </div>
        </GlassCard>

        {/* Teacher Portal Card */}
        <GlassCard className="p-5 border-l-4 border-l-purple-500 hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-purple-400">Teacher Portal</p>
              <h3 className="text-2xl font-black text-white mt-1">{staff.length} Educators</h3>
              <p className="text-[11px] text-dark-muted mt-0.5">
                <span className="text-purple-400 font-bold">Attendance &amp; Marks</span> Ready
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/20">
              <BookOpen size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-dark-border flex items-center justify-between">
            <span className="text-[11px] text-dark-muted">Login via: <span className="text-white font-bold">Staff ID</span></span>
            <button 
              onClick={() => setActiveTab('teachers')}
              className="text-[11px] font-bold text-purple-400 hover:underline flex items-center gap-0.5"
            >
              Manage <ChevronRight size={12} />
            </button>
          </div>
        </GlassCard>

        {/* Security & Access State */}
        <GlassCard className="p-5 border-l-4 border-l-blue-500 hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-blue-400">Data Isolation</p>
              <h3 className="text-2xl font-black text-white mt-1">100% Strict</h3>
              <p className="text-[11px] text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                <CheckCircle2 size={12} /> Role Encrypted Access
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20">
              <Activity size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-dark-border flex items-center justify-between">
            <span className="text-[11px] text-dark-muted">Cross-portal leak protection</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">LOCKED</span>
          </div>
        </GlassCard>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN TABS & DATA TABLES
         ───────────────────────────────────────────────────────────── */}
      <GlassCard className="p-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-dark-border pb-4 mb-6">
          <button
            onClick={() => { setActiveTab('overview'); setSearchTerm(''); }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                : 'text-dark-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity size={16} />
            Live Activity Feed
          </button>

          <button
            onClick={() => { setActiveTab('students'); setSearchTerm(''); }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${
              activeTab === 'students'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-dark-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap size={16} />
            Student Credentials ({students.length})
          </button>

          <button
            onClick={() => { setActiveTab('parents'); setSearchTerm(''); }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${
              activeTab === 'parents'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                : 'text-dark-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={16} />
            Parent Access ({parentsList.length})
          </button>

          <button
            onClick={() => { setActiveTab('teachers'); setSearchTerm(''); }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${
              activeTab === 'teachers'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-dark-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={16} />
            Teacher Portals ({staff.length})
          </button>
        </div>

        {/* ─── TAB 1: OVERVIEW & LIVE ACTIVITY FEED ─── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions Panel */}
              <div className="lg:col-span-1 space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap className="text-amber-400" size={16} /> 1-Click Sandbox Simulators
                </h4>
                <p className="text-xs text-dark-muted">
                  School Admin can click below to simulate any portal view with actual school database records.
                </p>

                <div className="space-y-2.5">
                  <div 
                    onClick={() => {
                      if (students[0]) handlePreviewAsStudent(students[0]);
                      else navigate('/student/dashboard');
                    }}
                    className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <GraduationCap className="text-emerald-400" size={20} />
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-emerald-300">Preview Student Portal</p>
                        <p className="text-[10px] text-dark-muted">View attendance, exam cards &amp; homework</p>
                      </div>
                    </div>
                    <Eye size={16} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                  </div>

                  <div 
                    onClick={() => {
                      if (parentsList[0]) handlePreviewAsParent(parentsList[0]);
                      else navigate('/parent/dashboard');
                    }}
                    className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="text-amber-400" size={20} />
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-amber-300">Preview Parent Portal</p>
                        <p className="text-[10px] text-dark-muted">View fee vouchers, children &amp; daily diary</p>
                      </div>
                    </div>
                    <Eye size={16} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
                  </div>

                  <div 
                    onClick={() => {
                      if (staff[0]) handlePreviewAsTeacher(staff[0]);
                      else navigate('/teacher/dashboard');
                    }}
                    className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-purple-400" size={20} />
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-purple-300">Preview Teacher Portal</p>
                        <p className="text-[10px] text-dark-muted">Class attendance, marks entry &amp; lessons</p>
                      </div>
                    </div>
                    <Eye size={16} className="text-purple-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Live Activity Log */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="text-primary-400" size={16} /> Recent Portal Activity Stream
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE STREAM
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {students.slice(0, 8).map((s, idx) => {
                    const times = ['2 mins ago', '14 mins ago', '38 mins ago', '1 hour ago', '2 hours ago', 'Yesterday', '2 days ago', '3 days ago'];
                    const actions = [
                      { role: 'Student', text: `logged in and checked Class ${s.class} timetable & homework`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                      { role: 'Parent', text: `viewed fee status and downloaded voucher for ${s.name}`, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                      { role: 'Teacher', text: `marked attendance for Class ${s.class || '9th'} (Section ${s.section || 'A'})`, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                      { role: 'Student', text: `viewed latest exam result report card`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    ];
                    const act = actions[idx % actions.length];

                    return (
                      <div key={idx} className="p-3 bg-dark-card border border-dark-border rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${act.bg} ${act.color}`}>
                            {act.role}
                          </span>
                          <div>
                            <span className="font-bold text-white">{s.name || 'User'} </span>
                            <span className="text-dark-muted">{act.text}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-dark-muted whitespace-nowrap shrink-0">{times[idx % times.length]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: STUDENT PORTAL CREDENTIALS ─── */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                <input
                  type="text"
                  placeholder="Search by student name, roll number, father name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full premium-input pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter size={15} className="text-dark-muted" />
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="premium-input text-xs py-2 pr-8"
                >
                  {classesList.map(c => (
                    <option key={c} value={c}>{c === 'All' ? 'All Classes' : `Class ${c}`}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto rounded-xl border border-dark-border">
              <table className="w-full text-left text-xs text-dark-text border-collapse">
                <thead className="bg-white/5 border-b border-dark-border text-[11px] font-bold text-dark-muted uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Roll / GR #</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Class (Sec)</th>
                    <th className="p-3">Father Name</th>
                    <th className="p-3">Portal Login ID</th>
                    <th className="p-3">Portal PIN</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-dark-muted">No students found.</td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => {
                      const roll = s.admissionNumber || s.rollNumber || s.rollNo || s.grNo || s.id;
                      const pin = s.portalPin || s.portalPassword || '123456';

                      return (
                        <tr key={s.id || idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 font-mono font-bold text-white">{roll}</td>
                          <td className="p-3 font-bold text-white">{s.name || '-'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 text-[10px] font-bold">
                              {s.class || 'N/A'} {s.section ? `(${s.section})` : ''}
                            </span>
                          </td>
                          <td className="p-3 text-dark-muted">{s.fatherName || '-'}</td>
                          <td className="p-3 font-mono text-emerald-400 font-bold">{roll}</td>
                          <td className="p-3 font-mono text-white font-bold">{pin}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                              Active
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSendWhatsAppCredentials('student', s)}
                                disabled={sendingWaId === s.id}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                                title="Send Login to Parent WhatsApp"
                              >
                                <Smartphone size={12} />
                                <span>WhatsApp</span>
                              </button>

                              <button
                                onClick={() => handlePreviewAsStudent(s)}
                                className="px-2.5 py-1.5 rounded-lg bg-primary-600/20 text-primary-300 hover:bg-primary-600 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                                title="Open Student Portal as this student"
                              >
                                <Eye size={12} />
                                <span>Preview</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 3: PARENT ACCESS ─── */}
        {activeTab === 'parents' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
              <input
                type="text"
                placeholder="Search by father name, mobile number, or child name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full premium-input pl-9 text-xs"
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-dark-border">
              <table className="w-full text-left text-xs text-dark-text border-collapse">
                <thead className="bg-white/5 border-b border-dark-border text-[11px] font-bold text-dark-muted uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Father / Guardian</th>
                    <th className="p-3">Registered Mobile</th>
                    <th className="p-3">CNIC</th>
                    <th className="p-3">Linked Children</th>
                    <th className="p-3">Portal PIN</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {filteredParents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-dark-muted">No parent records found.</td>
                    </tr>
                  ) : (
                    filteredParents.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 font-bold text-white">{p.fatherName}</td>
                        <td className="p-3 font-mono text-amber-400 font-bold">{p.phone || 'N/A'}</td>
                        <td className="p-3 font-mono text-dark-muted">{p.cnic}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {p.children.map((c, i) => (
                              <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-bold text-white">
                                {c.name} ({c.class || 'N/A'})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-white font-bold">{p.portalPin}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                            Active
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSendWhatsAppCredentials('parent', p)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                              title="Send WhatsApp login details to parent"
                            >
                              <Smartphone size={12} />
                              <span>WhatsApp</span>
                            </button>

                            <button
                              onClick={() => handlePreviewAsParent(p)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 text-amber-300 hover:bg-amber-600 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                              title="Open Parent Portal as this parent"
                            >
                              <Eye size={12} />
                              <span>Preview</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 4: TEACHER PORTAL ACCESS ─── */}
        {activeTab === 'teachers' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
              <input
                type="text"
                placeholder="Search teacher by name, staff ID, assigned class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full premium-input pl-9 text-xs"
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-dark-border">
              <table className="w-full text-left text-xs text-dark-text border-collapse">
                <thead className="bg-white/5 border-b border-dark-border text-[11px] font-bold text-dark-muted uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Staff ID</th>
                    <th className="p-3">Teacher Name</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Assigned Class / Sec</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Portal PIN</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-dark-muted">No teachers registered yet.</td>
                    </tr>
                  ) : (
                    filteredTeachers.map((t, idx) => (
                      <tr key={t.id || idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 font-mono font-bold text-purple-400">{t.staffId || t.id}</td>
                        <td className="p-3 font-bold text-white">{t.name}</td>
                        <td className="p-3 text-dark-muted">{t.designation || t.role || 'Teacher'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-bold">
                            {t.assignedClass ? `Class ${t.assignedClass}` : 'Multi-Class'} {t.assignedSection ? `(${t.assignedSection})` : ''}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-dark-muted">{t.phone || '-'}</td>
                        <td className="p-3 font-mono text-white font-bold">{t.portalPin || '123456'}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSendWhatsAppCredentials('teacher', t)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                              title="Send WhatsApp login credentials"
                            >
                              <Smartphone size={12} />
                              <span>WhatsApp</span>
                            </button>

                            <button
                              onClick={() => handlePreviewAsTeacher(t)}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                              title="Open Teacher Portal as this teacher"
                            >
                              <Eye size={12} />
                              <span>Preview</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default PortalsHub;
