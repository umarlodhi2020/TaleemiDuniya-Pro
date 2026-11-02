yhm ky howa login kr na ka import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Search, User, ChevronDown, ChevronLeft, ChevronRight, Sun, Moon, Command, Monitor, Zap, UserPlus, CalendarCheck, DollarSign, Activity, BarChart3, Settings, Menu, Palette, Check, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { useTheme } from '../../context/ThemeContext';
import PwaInstallButton from '../common/PwaInstallButton';
import GlobalSearchModal from '../common/GlobalSearchModal';

const Navbar = ({ toggleSidebar }) => {
  const { userData, logout } = useAuth();
  const { schoolData } = useSchool();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [uiZoom, setUiZoom] = useState(() => localStorage.getItem('taleemidunya_ui_zoom') || '90');
  const shortcutsRef = useRef(null);
  const profileRef = useRef(null);
  const themeRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-ui-zoom', uiZoom);
  }, [uiZoom]);

  const cycleZoom = () => {
    const next = uiZoom === '90' ? '85' : uiZoom === '85' ? '100' : '90';
    setUiZoom(next);
    localStorage.setItem('taleemidunya_ui_zoom', next);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    const handleClickOutside = (e) => {
      if (shortcutsRef.current && !shortcutsRef.current.contains(e.target)) {
        setIsShortcutsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target)) {
        setIsThemeOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    if (window.confirm('Are you sure you want to log out? / Kya aap logout karna chahte hain?')) {
      await logout();
      navigate('/login');
    }
  };

  const getHomePath = () => {
    if (userData?.role === 'super-admin') return '/super-admin/dashboard';
    if (userData?.role === 'teacher') return '/teacher/dashboard';
    if (userData?.role === 'student') return '/student/dashboard';
    if (userData?.role === 'parent') return '/parent/dashboard';
    return '/school-admin/dashboard';
  };

  const shortcutsList = [
    { title: 'Inquiry Student', subtitle: 'New lead & admission', path: '/school-admin/inquiry-student', icon: UserPlus, color: 'text-blue-400' },
    { title: 'Mark Attendance', subtitle: 'Daily class registry', path: '/school-admin/attendance', icon: CalendarCheck, color: 'text-purple-400' },
    { title: 'Collect Fee', subtitle: 'Receive student payment', path: '/school-admin/fees/collect', icon: DollarSign, color: 'text-green-400' },
    { title: 'Add Expense', subtitle: 'Record school voucher', path: '/school-admin/accounts/expenses', icon: Activity, color: 'text-rose-400' },
    { title: '25 Reports Hub', subtitle: 'Financial & balance sheet', path: '/school-admin/reports-hub', icon: BarChart3, color: 'text-amber-400' },
    { title: 'School Settings', subtitle: 'Config & logo profile', path: '/school-admin/settings', icon: Settings, color: 'text-cyan-400' },
  ];

  return (
    <>
      <header className="h-20 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border sticky top-0 z-50 px-4 sm:px-6 flex items-center justify-between transition-all duration-300 w-full max-w-full shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Mobile Menu Toggle */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 -ml-2 text-dark-muted hover:text-primary-600 dark:hover:text-white shrink-0"
          >
            <Menu size={24} />
          </button>

          {/* Web App Brand Title (Clickable to Home) */}
          <NavLink to={getHomePath()} className="flex flex-col gap-0.5 hover:opacity-80 transition-opacity cursor-pointer shrink-0" title="Go to Home Dashboard">
            <h1 className="text-base sm:text-xl font-extrabold text-primary-400 tracking-wide leading-none truncate">
              TaleemiDunya
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-700 font-mono text-[9px] font-black tracking-wider flex items-center gap-1 shadow-sm shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-ping shrink-0" />
                <span>v2.5.0 PRO <span className="hidden sm:inline">• AI CLOUD SYNC</span></span>
              </span>
              <span className="text-[9px] text-dark-muted font-bold uppercase tracking-widest hidden sm:inline">
                • {userData?.role === 'super-admin' ? 'Super Admin' : userData?.role === 'teacher' ? 'Teacher' : userData?.role === 'student' ? 'Student' : userData?.role === 'parent' ? 'Parent' : 'School Admin'}
                {userData?.role === 'school-admin' && (schoolData?.idNumber || userData?.idNumber) && ` | ID: ${schoolData?.idNumber || userData?.idNumber}`}
              </span>
            </div>
          </NavLink>

          <div
            onClick={() => setIsSearchOpen(true)}
            className="hidden xl:flex items-center justify-between gap-3 bg-dark-card border border-dark-border hover:border-primary-500/50 px-3.5 py-2 rounded-xl w-56 ml-2 cursor-pointer transition-all group shadow-sm shrink-0"
          >
            <div className="flex items-center gap-2 text-dark-muted group-hover:text-white transition-colors truncate">
              <Search size={15} className="text-primary-500 shrink-0" />
              <span className="text-xs font-medium truncate">Search students, records...</span>
            </div>
            <kbd className="hidden xl:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-dark-card/5 border border-dark-border text-[9px] font-mono text-dark-muted uppercase font-bold group-hover:border-primary-500/40 group-hover:text-primary-400 transition-all">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* PWA 1-Click Install Button */}
          <PwaInstallButton />

          {/* Global Quick Shortcuts Dropdown */}
          {userData?.role === 'school-admin' && (
            <div className="relative hidden sm:block" ref={shortcutsRef}>
              <button
                onClick={() => setIsShortcutsOpen(!isShortcutsOpen)}
                title="Quick Action Shortcuts (Inquiry, Attendance, Fees, Reports)"
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-500/20 to-purple-500/20 hover:from-primary-500/30 hover:to-purple-500/30 border border-primary-500/40 !text-primary-600 hover:!text-primary-700 transition-all duration-300 shadow-sm flex items-center gap-1.5 cursor-pointer font-bold text-xs shrink-0"
              >
                <Zap size={15} className="text-amber-500 animate-bounce shrink-0" />
                <span className="hidden lg:inline">⚡ Shortcuts</span>
                <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${isShortcutsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isShortcutsOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#131120]/95 border border-slate-200 dark:border-primary-500/30 shadow-2xl backdrop-blur-xl p-3 z-50 animate-fade-in space-y-2">
                  <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-dark-text">
                    <span className="flex items-center gap-1.5"><Zap size={14} className="text-amber-500" /> Quick Operations</span>
                    <span className="text-[10px] font-mono text-primary-500">Ctrl/Cmd + K</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 max-h-80 overflow-y-auto custom-scrollbar">
                    {shortcutsList.map((item, idx) => {
                      const IconComp = item.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setIsShortcutsOpen(false);
                            navigate(item.path);
                          }}
                          className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-dark-card/5 hover:bg-slate-100 dark:hover:bg-dark-card/10 transition-all flex items-center gap-3 group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-dark-card/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <IconComp size={16} className={item.color} />
                          </div>
                          <div className="truncate">
                            <h5 className="text-xs font-bold text-dark-text group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors">{item.title}</h5>
                            <p className="text-[10px] text-dark-muted font-medium truncate">{item.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 1-Click UI Zoom / Display Density Switcher Button (`zoom in kam kro mtb tura chuta kro`) */}
          <button
            onClick={cycleZoom}
            title="Adjust Screen Scale (90% Compact / 85% High Density / 100% Normal)"
            className="hidden md:flex px-2.5 py-1.5 rounded-xl bg-dark-card border border-dark-border !text-slate-700 hover:!text-cyan-600 hover:border-cyan-500/50 transition-all duration-300 shadow-sm items-center gap-1.5 cursor-pointer font-mono text-[11px] font-bold shrink-0"
          >
            <Monitor size={15} className="!text-cyan-600 shrink-0" />
            <span className="hidden lg:inline">{uiZoom === '90' ? '90% Sleek' : uiZoom === '85' ? '85% Compact' : '100% Norm'}</span>
          </button>

          {/* Theme Toggle Switch */}
          <button
            onClick={toggleTheme}
            title="Toggle Light/Dark Mode"
            className={`relative inline-flex items-center h-7 rounded-full w-14 transition-colors shrink-0 border ${theme === 'dark' ? 'bg-[#0f172a] border-slate-700' : 'bg-slate-200 border-slate-300'}`}
          >
            <span className={`inline-block w-5 h-5 transform rounded-full bg-white shadow-md transition-transform flex items-center justify-center ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`}>
              {theme === 'dark' ? <Moon size={12} className="text-indigo-600" /> : <Sun size={12} className="text-amber-500" />}
            </span>
          </button>
          <button
            onClick={() => navigate(userData?.role === 'super-admin' ? '/super-admin/notifications' : '/school-admin/sms')}
            title="Notifications & Alerts"
            className="relative p-2 text-dark-muted hover:text-primary-600 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <Bell size={22} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full border-2 border-dark-bg"></span>
          </button>

          <div className="h-8 w-px bg-dark-border shrink-0"></div>

          <div className="relative" ref={profileRef}>
            <div
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 cursor-pointer group shrink-0 max-w-[170px] select-none p-1 rounded-xl hover:bg-dark-hover/50 transition-colors"
            >
              <div className="text-right hidden sm:block max-w-[110px] overflow-hidden">
                <p className="text-sm font-semibold text-dark-text group-hover:text-primary-500 transition-colors truncate whitespace-nowrap" title={userData?.name || 'User Name'}>
                  {userData?.name || 'User Name'}
                </p>
                <p className="text-xs text-dark-muted capitalize truncate whitespace-nowrap" title={userData?.role?.replace('-', ' ') || 'Role'}>
                  {userData?.role?.replace('-', ' ') || 'Role'}
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-premium-gradient p-0.5 shrink-0">
                <div className="w-full h-full rounded-[10px] bg-dark-card flex items-center justify-center">
                  <User size={20} className="text-primary-500" />
                </div>
              </div>
              <ChevronDown size={16} className={`text-dark-muted transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* User Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#131120]/95 border border-slate-200 dark:border-primary-500/30 shadow-2xl backdrop-blur-xl p-3 z-50 animate-fade-in space-y-2">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-white/10">
                  <p className="text-xs font-bold text-dark-text truncate">{userData?.name || 'User Account'}</p>
                  <p className="text-[11px] text-dark-muted truncate">{userData?.email || userData?.username || 'No email'}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500 text-[10px] font-bold uppercase tracking-wider">
                      {userData?.role?.replace('-', ' ') || 'User'}
                    </span>
                    {(schoolData?.idNumber || userData?.idNumber) && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-dark-muted text-[10px] font-mono">
                        ID: {schoolData?.idNumber || userData?.idNumber}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  {userData?.role === 'school-admin' && (
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/school-admin/settings');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-dark-text hover:bg-slate-100 dark:hover:bg-dark-hover flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Settings size={15} className="text-primary-500" />
                      <span>School Settings</span>
                    </button>
                  )}

                  {userData?.role === 'super-admin' && (
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/super-admin/settings');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-dark-text hover:bg-slate-100 dark:hover:bg-dark-hover flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Settings size={15} className="text-primary-500" />
                      <span>Super Admin Settings</span>
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-100 dark:border-white/5 pt-2"
                  >
                    <LogOut size={15} className="text-rose-500" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};

export default Navbar;
