import React from 'react';
import { NavLink } from 'react-router-dom';
import { Bell, Search, User, ChevronDown, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import PwaInstallButton from '../common/PwaInstallButton';

const Navbar = () => {
  const { userData } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getHomePath = () => {
    if (userData?.role === 'super-admin') return '/super-admin/dashboard';
    if (userData?.role === 'teacher') return '/teacher/dashboard';
    if (userData?.role === 'student') return '/student/dashboard';
    if (userData?.role === 'parent') return '/parent/dashboard';
    return '/school-admin/dashboard';
  };

  return (
    <header className="h-20 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between transition-all duration-300 ml-52">
      <div className="flex items-center gap-6">

        {/* Web App Brand Title (Clickable to Home) */}
        <NavLink to={getHomePath()} className="flex flex-col gap-1 hover:opacity-80 transition-opacity cursor-pointer" title="Go to Home Dashboard">
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

        <div className="hidden md:flex items-center gap-4 bg-dark-card border border-dark-border px-4 py-2 rounded-xl w-48 ml-2">
          <Search size={14} className="text-dark-muted" />
          <input
            type="text"
            placeholder="Search students, staff or records..."
            className="bg-transparent border-none outline-none text-xs w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* PWA 1-Click Install Button */}
        <PwaInstallButton />

        {/* Quick SaaS Demo / Test Buttons */}
        {userData?.role === 'school-admin' && (
          <div className="hidden md:flex items-center gap-1.5 bg-dark-hover p-1 rounded-xl border border-dark-border">
            <button
              onClick={() => window.triggerSaaSExpiryPopup && window.triggerSaaSExpiryPopup()}
              title="Test SaaS Rent Expiry Warning Popup"
              className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] font-black uppercase transition-all flex items-center gap-1"
            >
              🚨 Expiry Demo
            </button>
            <button
              onClick={() => window.triggerSaaSFeatureLock && window.triggerSaaSFeatureLock('IoT Gate Pass & AI WhatsApp')}
              title="Test SaaS Feature Lock Upgrade Popup"
              className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-[10px] font-black uppercase transition-all flex items-center gap-1"
            >
              💎 Upgrade Demo
            </button>
          </div>
        )}

        {/* 1-Click Theme Switcher Button (Dark Mode / White Mode) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to White / Light Mode' : 'Switch to Dark / Glass Mode'}
          className="p-2.5 rounded-xl bg-dark-card border border-dark-border text-dark-muted hover:text-primary-500 hover:border-primary-500/50 transition-all duration-300 shadow-sm flex items-center justify-center cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun size={20} className="text-amber-400 hover:rotate-45 transition-transform duration-500" />
          ) : (
            <Moon size={20} className="text-primary-600 hover:-rotate-12 transition-transform duration-500" />
          )}
        </button>

        <button className="relative p-2 text-dark-muted hover:text-white transition-colors">
          <Bell size={22} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full border-2 border-dark-bg"></span>
        </button>

        <div className="h-8 w-px bg-dark-border"></div>

        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-dark-text group-hover:text-primary-500 transition-colors">
              {userData?.name || 'User Name'}
            </p>
            <p className="text-xs text-dark-muted capitalize">
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
  );
};

export default Navbar;
