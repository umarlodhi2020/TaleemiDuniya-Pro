import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Search, User, ChevronDown, ChevronLeft, ChevronRight, Sun, Moon, Command, Monitor, Zap, UserPlus, CalendarCheck, DollarSign, Activity, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import PwaInstallButton from '../common/PwaInstallButton';
import GlobalSearchModal from '../common/GlobalSearchModal';

const Navbar = () => {
  const { userData } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [uiZoom, setUiZoom] = useState(() => localStorage.getItem('taleemidunya_ui_zoom') || '90');
  const shortcutsRef = useRef(null);

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
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    { title: 'Collect Fee', subtitle: 'Receive student payment', path: '/school-admin/fees/add', icon: DollarSign, color: 'text-green-400' },
    { title: 'Add Expense', subtitle: 'Record school voucher', path: '/school-admin/accounts/expenses', icon: Activity, color: 'text-rose-400' },
    { title: '25 Reports Hub', subtitle: 'Financial & balance sheet', path: '/school-admin/reports-hub', icon: BarChart3, color: 'text-amber-400' },
    { title: 'School Settings', subtitle: 'Config & logo profile', path: '/school-admin/settings', icon: Settings, color: 'text-cyan-400' },
  ];

  return (
    <>
      <header className="h-20 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between transition-all duration-300 w-full max-w-full overflow-hidden shrink-0">
        <div className="flex items-center gap-4 min-w-0">

          {/* Web App Brand Title (Clickable to Home) */}
          <NavLink to={getHomePath()} className="flex flex-col gap-1 hover:opacity-80 transition-opacity cursor-pointer shrink-0" title="Go to Home Dashboard">
            <h1 className="text-xl font-extrabold bg-premium-gradient bg-clip-text text-transparent tracking-wide leading-none">
              TaleemiDunya
            </h1>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-[9px] font-black tracking-wider flex items-center gap-1 shadow-sm">
                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                v2.5.0 PRO
              </span>
              <span className="text-[9px] text-dark-muted font-bold uppercase tracking-widest">
                • {userData?.role === 'super-admin' ? 'Super Admin' : 'School Admin'}
              </span>
            </div>
          </NavLink>

          <div 
            onClick={() => setIsSearchOpen(true)}
            className="hidden lg:flex items-center justify-between gap-3 bg-dark-card border border-dark-border hover:border-primary-500/50 px-3.5 py-2 rounded-xl w-56 ml-2 cursor-pointer transition-all group shadow-sm shrink-0"
          >
            <div className="flex items-center gap-2 text-dark-muted group-hover:text-white transition-colors truncate">
              <Search size={15} className="text-primary-500 shrink-0" />
              <span className="text-xs font-medium truncate">Search students, records...</span>
            </div>
            <kbd className="hidden xl:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-dark-border text-[9px] font-mono text-dark-muted uppercase font-bold group-hover:border-primary-500/40 group-hover:text-primary-400 transition-all">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </div>
        </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* PWA 1-Click Install Button */}
        <PwaInstallButton />

        {/* Global Quick Shortcuts Dropdown */}
        {userData?.role === 'school-admin' && (
          <div className="relative" ref={shortcutsRef}>
            <button
              onClick={() => setIsShortcutsOpen(!isShortcutsOpen)}
              title="Quick Action Shortcuts (Inquiry, Attendance, Fees, Reports)"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-500/20 to-purple-500/20 hover:from-primary-500/30 hover:to-purple-500/30 border border-primary-500/40 text-primary-300 hover:text-white transition-all duration-300 shadow-sm flex items-center gap-1.5 cursor-pointer font-bold text-xs shrink-0"
            >
              <Zap size={15} className="text-amber-400 animate-bounce" />
              <span>⚡ Shortcuts</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isShortcutsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isShortcutsOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#131120]/95 border border-primary-500/30 shadow-2xl backdrop-blur-xl p-3 z-50 animate-fade-in space-y-2">
                <div className="flex items-center justify-between px-2 pb-2 border-b border-white/10 text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5"><Zap size={14} className="text-amber-400" /> Quick Operations</span>
                  <span className="text-[10px] font-mono text-primary-400">Ctrl/Cmd + K</span>
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
                        className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all flex items-center gap-3 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <IconComp size={16} className={item.color} />
                        </div>
                        <div className="truncate">
                          <h5 className="text-xs font-bold text-white group-hover:text-primary-300 transition-colors">{item.title}</h5>
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
          className="px-2.5 py-1.5 rounded-xl bg-dark-card border border-dark-border text-dark-muted hover:text-cyan-400 hover:border-cyan-500/50 transition-all duration-300 shadow-sm flex items-center gap-1.5 cursor-pointer font-mono text-[11px] font-bold shrink-0"
        >
          <Monitor size={15} className="text-cyan-400 shrink-0" />
          <span className="hidden sm:inline">{uiZoom === '90' ? '90% Sleek' : uiZoom === '85' ? '85% Compact' : '100% Norm'}</span>
        </button>

        {/* 1-Click Theme Switcher Button (Dark Mode / White Mode) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to White / Light Mode' : 'Switch to Dark / Glass Mode'}
          className="p-2.5 rounded-xl bg-dark-card border border-dark-border text-dark-muted hover:text-primary-500 hover:border-primary-500/50 transition-all duration-300 shadow-sm flex items-center justify-center cursor-pointer shrink-0"
        >
          {theme === 'dark' ? (
            <Sun size={20} className="text-amber-400 hover:rotate-45 transition-transform duration-500" />
          ) : (
            <Moon size={20} className="text-primary-600 hover:-rotate-12 transition-transform duration-500" />
          )}
        </button>

        <button className="relative p-2 text-dark-muted hover:text-white transition-colors shrink-0">
          <Bell size={22} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full border-2 border-dark-bg"></span>
        </button>

        <div className="h-8 w-px bg-dark-border shrink-0"></div>

        <div className="flex items-center gap-2.5 cursor-pointer group shrink-0 max-w-[160px]">
          <div className="text-right hidden sm:block max-w-[110px] overflow-hidden">
            <p className="text-sm font-semibold text-dark-text group-hover:text-primary-500 transition-colors truncate whitespace-nowrap" title={userData?.name || 'User Name'}>
              {userData?.name || 'User Name'}
            </p>
            <p className="text-xs text-dark-muted capitalize truncate whitespace-nowrap" title={userData?.role?.replace('-', ' ') || 'Role'}>
              {userData?.role?.replace('-', ' ') || 'Role'}
            </p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-premium-gradient p-0.5">
            <div className="w-full h-full rounded-[10px] bg-dark-card flex items-center justify-center">
              <User size={20} className="text-primary-500" />
            </div>
          </div>
          <ChevronDown size={16} className="text-dark-muted" />
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
