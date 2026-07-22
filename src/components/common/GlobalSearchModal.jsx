import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, Users, School, Compass, ArrowRight, Sparkles, Command, ShieldCheck, Zap } from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

const GlobalSearchModal = ({ isOpen, onClose }) => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [schools, setSchools] = useState([]);
  const inputRef = useRef(null);

  // Quick navigation modules based on role
  const getQuickModules = () => {
    const role = userData?.role || 'school-admin';
    if (role === 'super-admin') {
      return [
        { title: 'Super Dashboard', path: '/super-admin/dashboard', icon: Zap, category: 'Navigation' },
        { title: 'Manage Schools', path: '/super-admin/schools', icon: School, category: 'Navigation' },
        { title: 'Onboard New School', path: '/super-admin/schools/add', icon: School, category: 'Action' },
        { title: 'Subscription Plans', path: '/super-admin/subscriptions', icon: ShieldCheck, category: 'Navigation' },
        { title: 'AI Assistant & Server', path: '/super-admin/ai-agent', icon: Sparkles, category: 'Module' },
        { title: 'Support Tickets', path: '/super-admin/support', icon: Compass, category: 'Support' },
      ];
    }
    if (role === 'teacher') {
      return [
        { title: 'Teacher Dashboard', path: '/teacher/dashboard', icon: Zap, category: 'Navigation' },
        { title: 'My Students', path: '/teacher/students', icon: User, category: 'Students' },
        { title: 'Mark Attendance', path: '/teacher/attendance', icon: Compass, category: 'Module' },
        { title: 'Class Schedule', path: '/teacher/schedule', icon: Compass, category: 'Navigation' },
      ];
    }
    // Default School Admin modules
    return [
      { title: 'Admin Dashboard', path: '/school-admin/dashboard', icon: Zap, category: 'Navigation' },
      { title: 'Students List', path: '/school-admin/students', icon: User, category: 'Students' },
      { title: 'Add New Student', path: '/school-admin/students/add', icon: User, category: 'Action' },
      { title: 'Staff & Teacher List', path: '/school-admin/staff', icon: Users, category: 'Staff' },
      { title: 'Attendance Register', path: '/school-admin/attendance', icon: Compass, category: 'Module' },
      { title: 'Fee Management', path: '/school-admin/fees', icon: Compass, category: 'Finance' },
      { title: 'Fee Defaulters', path: '/school-admin/fee-defaulters', icon: Compass, category: 'Finance' },
      { title: 'Gate Pass Manager', path: '/school-admin/gatepass', icon: ShieldCheck, category: 'Security' },
      { title: 'Admission CRM', path: '/school-admin/admissions', icon: Compass, category: 'Admissions' },
      { title: 'Accounts & Expense', path: '/school-admin/accounts', icon: Compass, category: 'Finance' },
      { title: 'AI WhatsApp & Bot', path: '/school-admin/ai-agent', icon: Sparkles, category: 'AI Assistant' },
      { title: 'Mini Pocket App', path: '/school-admin/pocket', icon: Zap, category: 'Mobile App' },
    ];
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (students.length === 0 && staff.length === 0 && schools.length === 0) {
        fetchInitialData();
      }
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Handle keyboard shortcuts (Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const schoolId = userData?.schoolId || 'default-school';
      const role = userData?.role || 'school-admin';

      if (role === 'super-admin') {
        const schoolsSnap = await getDocs(query(collection(db, 'schools'), limit(100)));
        setSchools(schoolsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        const studentsSnap = await getDocs(query(collection(db, 'students'), limit(300)));
        const listStudents = studentsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(s => s.schoolId === schoolId || !s.schoolId);
        setStudents(listStudents);

        const staffSnap = await getDocs(query(collection(db, 'staff'), limit(100)));
        const listStaff = staffSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(s => s.schoolId === schoolId || !s.schoolId);
        setStaff(listStaff);
      }
    } catch (error) {
      console.error('Global search error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const q = searchQuery.toLowerCase().trim();

  // Filter Modules
  const filteredModules = getQuickModules().filter(m =>
    m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
  );

  // Filter Students
  const filteredStudents = q ? students.filter(s =>
    String(s.name || '').toLowerCase().includes(q) ||
    String(s.rollNumber || '').toLowerCase().includes(q) ||
    String(s.class || '').toLowerCase().includes(q) ||
    String(s.phone || '').toLowerCase().includes(q)
  ).slice(0, 8) : [];

  // Filter Staff
  const filteredStaff = q ? staff.filter(s =>
    String(s.name || '').toLowerCase().includes(q) ||
    String(s.role || '').toLowerCase().includes(q) ||
    String(s.phone || '').toLowerCase().includes(q)
  ).slice(0, 5) : [];

  // Filter Schools (for Super Admin)
  const filteredSchools = q ? schools.filter(s =>
    String(s.name || '').toLowerCase().includes(q) ||
    String(s.city || '').toLowerCase().includes(q) ||
    String(s.adminEmail || '').toLowerCase().includes(q)
  ).slice(0, 8) : [];

  const handleSelect = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-16 px-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-dark-card border border-dark-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-dark-border bg-dark-bg/60">
          <Search className="text-primary-500 shrink-0" size={22} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search students, staff, roll numbers or quick pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-white placeholder-dark-muted font-medium text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-lg hover:bg-white/10 text-dark-muted hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-dark-border text-[10px] text-dark-muted font-mono uppercase font-bold shrink-0">
            <span>ESC</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-dark-hover border border-dark-border text-dark-muted hover:text-white transition-all sm:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {loading && (
            <div className="py-8 text-center text-sm font-semibold text-dark-muted animate-pulse flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
              Searching database...
            </div>
          )}

          {/* Navigation / Quick Modules */}
          {filteredModules.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-dark-muted px-2 mb-2 flex items-center gap-1.5">
                <Compass size={12} className="text-primary-500" /> Quick Navigation & Modules
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredModules.map((item, idx) => {
                  const Icon = item.icon || Compass;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelect(item.path)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-dark-hover/50 hover:bg-primary-500/15 border border-transparent hover:border-primary-500/30 cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/5 text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-all">
                          <Icon size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-primary-300 transition-colors">{item.title}</p>
                          <p className="text-[10px] text-dark-muted font-semibold">{item.category}</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-dark-muted group-hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Students Results */}
          {filteredStudents.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-dark-muted px-2 mb-2 flex items-center gap-1.5">
                <User size={12} className="text-blue-400" /> Students Found ({filteredStudents.length})
              </p>
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleSelect('/school-admin/students')}
                    className="flex items-center justify-between p-3 rounded-2xl bg-dark-hover/40 hover:bg-blue-500/15 border border-transparent hover:border-blue-500/30 cursor-pointer group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-xs">
                        {student.name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-blue-300">{student.name}</p>
                        <p className="text-[10px] text-dark-muted font-mono">
                          Roll: <span className="text-blue-400 font-bold">{student.rollNumber || 'N/A'}</span> • Class: {student.class || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      View Student
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff Results */}
          {filteredStaff.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-dark-muted px-2 mb-2 flex items-center gap-1.5">
                <Users size={12} className="text-purple-400" /> Staff & Teachers ({filteredStaff.length})
              </p>
              <div className="space-y-2">
                {filteredStaff.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => handleSelect('/school-admin/staff')}
                    className="flex items-center justify-between p-3 rounded-2xl bg-dark-hover/40 hover:bg-purple-500/15 border border-transparent hover:border-purple-500/30 cursor-pointer group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black text-xs">
                        {st.name?.charAt(0) || 'T'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-purple-300">{st.name}</p>
                        <p className="text-[10px] text-dark-muted font-semibold">{st.role || 'Teacher'} • {st.phone || ''}</p>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      View Profile
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schools Results (Super Admin) */}
          {filteredSchools.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-dark-muted px-2 mb-2 flex items-center gap-1.5">
                <School size={12} className="text-amber-400" /> Schools Registered ({filteredSchools.length})
              </p>
              <div className="space-y-2">
                {filteredSchools.map((sch) => (
                  <div
                    key={sch.id}
                    onClick={() => handleSelect('/super-admin/schools')}
                    className="flex items-center justify-between p-3 rounded-2xl bg-dark-hover/40 hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30 cursor-pointer group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-xs">
                        {sch.name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-amber-300">{sch.name}</p>
                        <p className="text-[10px] text-dark-muted font-mono">{sch.city || 'N/A'} • {sch.adminEmail || ''}</p>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      View School
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results state */}
          {q && filteredModules.length === 0 && filteredStudents.length === 0 && filteredStaff.length === 0 && filteredSchools.length === 0 && !loading && (
            <div className="text-center py-12 text-dark-muted">
              <Search size={36} className="mx-auto opacity-30 mb-3" />
              <p className="font-bold text-sm text-white">No exact match found for "{searchQuery}"</p>
              <p className="text-xs mt-1">Try searching by student name, roll number, school name or module.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-dark-border bg-dark-bg/80 flex items-center justify-between text-[11px] text-dark-muted font-medium">
          <div className="flex items-center gap-2">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono font-bold text-[10px]">Ctrl + K</kbd> anywhere to open</span>
          </div>
          <span>TaleemiDunya PRO Instant Search</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
