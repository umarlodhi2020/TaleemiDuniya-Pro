import React from 'react';
import { Bell, Search, User, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { userData } = useAuth();

  return (
    <header className="h-20 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between transition-all duration-300 ml-52">
      <div className="flex items-center gap-6">

        {/* Web App Brand Title */}
        <div className="flex flex-col">
          <h1 className="text-lg font-extrabold bg-premium-gradient bg-clip-text text-transparent tracking-wide leading-none">
            TaleemiDunya
          </h1>
          <span className="text-[9px] text-dark-muted font-bold uppercase tracking-widest mt-1">
            {userData?.role === 'super-admin' ? 'Super Admin Portal' : 'School Admin Portal'}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4 bg-dark-card border border-dark-border px-4 py-2 rounded-xl w-48 ml-2">
          <Search size={14} className="text-dark-muted" />
          <input
            type="text"
            placeholder="Search students, staff or records..."
            className="bg-transparent border-none outline-none text-xs w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
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
