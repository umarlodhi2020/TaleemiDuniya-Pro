import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  School,
  Users,
  GraduationCap,
  UserSquare2,
  CalendarCheck,
  CreditCard,
  BookOpen,
  Settings,
  LogOut,
  BellRing,
  MessageSquare,
  ClipboardCheck,
  Archive,
  Globe,
  PlusCircle,
  Receipt,
  Bell,
  Clock,
  Award,
  ShieldCheck,
  PhoneCall,
  UserCircle,
  Smartphone,
  Share2,
  Bot,
  ArrowLeft,
  Bus,
  UploadCloud
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ role }) => {
  const { logout } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  // Dynamic preview detection so school-admin can sandbox other portals
  let displayRole = role;
  if (role === 'school-admin') {
    if (currentPath.startsWith('/student')) displayRole = 'student';
    else if (currentPath.startsWith('/teacher')) displayRole = 'teacher';
    else if (currentPath.startsWith('/parent')) displayRole = 'parent';
  }

  const isPreview = role === 'school-admin' && displayRole !== role;

  const schoolAdminLinks = [
    {
      title: 'Main',
      links: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/school-admin/dashboard' },
        { name: 'AI Assistant', icon: Bot, path: '/school-admin/ai-agent' },
        { name: 'Add Inquiry', icon: PlusCircle, path: '/school-admin/inquiries/add' },
        { name: 'Inquiries', icon: MessageSquare, path: '/school-admin/inquiries' },
      ]
    },
    {
      title: 'Users',
      links: [
        { name: 'Add Student', icon: PlusCircle, path: '/school-admin/students/add' },
        { name: 'Students', icon: GraduationCap, path: '/school-admin/students' },
        { name: 'Add Staff', icon: PlusCircle, path: '/school-admin/staff/add' },
        { name: 'Staff', icon: UserSquare2, path: '/school-admin/staff' },
        { name: 'Attendance', icon: CalendarCheck, path: '/school-admin/attendance' },
        { name: 'ID Cards Generator', icon: Award, path: '/school-admin/students/id-cards' },
        { name: 'Bulk Data Import', icon: UploadCloud, path: '/school-admin/import' },
      ]
    },
    {
      title: 'Finance',
      links: [
        { name: 'Add Fee', icon: PlusCircle, path: '/school-admin/fees/add' },
        { name: 'Generate Challan', icon: Receipt, path: '/school-admin/fees/generate' },
        { name: 'Challan Manager', icon: CreditCard, path: '/school-admin/fees' },
        { name: 'Collection', icon: BookOpen, path: '/school-admin/collection' },
        { name: 'Accounts', icon: BookOpen, path: '/school-admin/accounts' },
        { name: 'Multi-part Challan', icon: Receipt, path: '/school-admin/fees/challan-book' },
        { name: 'Expense Cashbook', icon: CreditCard, path: '/school-admin/accounts/expenses' },
      ]
    },
    {
      title: 'Academic',
      links: [
        { name: 'Academics', icon: BookOpen, path: '/school-admin/academics' },
        { name: 'Exams', icon: ClipboardCheck, path: '/school-admin/exams' },
        { name: 'Period Bell', icon: Clock, path: '/school-admin/period-bell' },
        { name: 'Report Templates', icon: Award, path: '/school-admin/academics/report-templates' },
        { name: 'Timetable Builder', icon: Clock, path: '/school-admin/academics/timetable-builder' },
      ]
    },
    {
      title: 'Resources',
      links: [
        { name: 'Library', icon: BookOpen, path: '/school-admin/library' },
        { name: 'Transport', icon: Bus, path: '/school-admin/transport' },
        { name: 'Inventory', icon: Archive, path: '/school-admin/inventory' },
        { name: 'E-Certificates', icon: Award, path: '/school-admin/certificates' },
        { name: 'Assign Role', icon: ShieldCheck, path: '/school-admin/roles' },
        { name: 'Reminder', icon: Bell, path: '/school-admin/reminders' },
        { name: 'Call Log', icon: PhoneCall, path: '/school-admin/call-log' },
      ]
    },
    {
      title: 'Portals & Services',
      links: [
        { name: 'Student Portal', icon: UserCircle, path: '/student/dashboard' },
        { name: 'Teacher Portal', icon: UserCircle, path: '/teacher/dashboard' },
        { name: 'Parent Portal', icon: UserCircle, path: '/parent/dashboard' },
        { name: 'SMS', icon: Smartphone, path: '/school-admin/sms' },
        { name: 'E-Services', icon: Globe, path: '/school-admin/e-services' },
        { name: 'Social Post', icon: Share2, path: '/school-admin/social' },
        { name: 'Settings', icon: Settings, path: '/school-admin/settings' },
      ]
    }
  ];

  const getNavSections = () => {
    switch (displayRole) {
      case 'super-admin':
        return [
          {
            title: 'Core',
            links: [
              { name: 'Dashboard', icon: LayoutDashboard, path: '/super-admin/dashboard' },
              { name: 'SaaS AI Agent', icon: Bot, path: '/super-admin/ai-agent' },
              { name: 'Manage Schools', icon: School, path: '/super-admin/schools' },
              { name: 'Subscriptions', icon: CreditCard, path: '/super-admin/subscriptions' },
            ]
          },
          {
            title: 'Management',
            links: [
              { name: 'Revenue', icon: BookOpen, path: '/super-admin/revenue' },
              { name: 'Notifications', icon: BellRing, path: '/super-admin/notifications' },
              { name: 'Support Center', icon: MessageSquare, path: '/super-admin/support' },
              { name: 'Bulk Data Import', icon: UploadCloud, path: '/school-admin/import' },
              { name: 'Settings', icon: Settings, path: '/super-admin/settings' },
            ]
          }
        ];
      case 'teacher':
        return [
          {
            title: 'Academic Portal',
            links: [
              { name: 'Dashboard', icon: LayoutDashboard, path: '/teacher/dashboard' },
              { name: 'Students', icon: Users, path: '/teacher/students' },
              { name: 'Attendance', icon: CalendarCheck, path: '/teacher/attendance' },
              { name: 'Exams & Marks', icon: ClipboardCheck, path: '/teacher/exams' },
              { name: 'Homework', icon: BookOpen, path: '/teacher/homework' },
              { name: 'Timetable', icon: Clock, path: '/teacher/timetable' },
              { name: 'Communication', icon: MessageSquare, path: '/teacher/communication' },
              { name: 'Leave Requests', icon: PlusCircle, path: '/teacher/leave' },
              { name: 'Study Material', icon: Archive, path: '/teacher/material' },
            ]
          }
        ];
      case 'student':
        return [
          {
            title: 'Student Portal',
            links: [
              { name: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
              { name: 'Attendance', icon: CalendarCheck, path: '/student/attendance' },
              { name: 'Exams & Marks', icon: ClipboardCheck, path: '/student/exams' },
              { name: 'Homework', icon: BookOpen, path: '/student/homework' },
              { name: 'Timetable', icon: Clock, path: '/student/timetable' },
              { name: 'Study Material', icon: Archive, path: '/student/material' },
            ]
          }
        ];
      case 'parent':
        return [
          {
            title: 'Parent Portal',
            links: [
              { name: 'Dashboard', icon: LayoutDashboard, path: '/parent/dashboard' },
              { name: 'Attendance', icon: CalendarCheck, path: '/parent/attendance' },
              { name: 'Fees & Challans', icon: CreditCard, path: '/parent/fees' },
              { name: 'Exams & Results', icon: ClipboardCheck, path: '/parent/exams' },
            ]
          }
        ];
      default:
        return schoolAdminLinks;
    }
  };

  const navSections = getNavSections();

  return (
    <>
      {/* Permanent Static Sidebar Body */}
      <div className="h-screen bg-dark-card border-r border-dark-border flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 w-52">
        
        {/* Sleek Sidebar Header Emblem (Fixed h-20 to match Navbar) */}
        <div className="h-20 border-b border-dark-border flex items-center justify-center flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-white relative">
            <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-pulse" />
            <GraduationCap size={22} className="relative z-10 text-white animate-pulse" />
          </div>
        </div>

        {/* Return to Admin Button if Sandbox Mode */}
        {isPreview && (
          <div className="px-2 pt-4 pb-3 border-b border-dark-border/40">
            <NavLink
              to="/school-admin/dashboard"
              className="flex items-center justify-center rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500 hover:text-white transition-all font-bold text-xs w-full py-2 px-2 gap-2"
              title="Return to Admin Panel"
            >
              <ArrowLeft size={14} className="flex-shrink-0" />
              <span>Back to Admin</span>
            </NavLink>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 px-2 space-y-5 overflow-y-auto mt-4 pb-10 custom-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[9px] font-black text-dark-muted uppercase tracking-[0.2em] mb-2 transition-all duration-300">
                {section.title}
              </p>

              {section.links.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `${isActive ? 'sidebar-item-active' : 'sidebar-item'} flex items-center transition-all duration-300 px-3 py-2 gap-2 justify-start`
                  }
                >
                  <link.icon size={16} className="flex-shrink-0" />
                  <span className="text-xs font-semibold transition-all duration-300 whitespace-nowrap overflow-hidden opacity-100 max-w-[130px] ml-2">{link.name}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Version Badge & Logout Footer */}
        <div className="p-2 border-t border-dark-border bg-dark-card space-y-2">
          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-dark-border flex flex-col items-start justify-center">
            <span className="text-[10px] font-black tracking-wider uppercase text-green-400 flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              v2.5.0 (PRO BUILD)
            </span>
            <span className="text-[9px] text-dark-muted font-medium truncate w-full">Dual WhatsApp & Bulk Import</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-semibold cursor-pointer px-3 py-2.5 gap-2 justify-start"
          >
            <LogOut size={18} className="flex-shrink-0" />
            <span className="text-xs font-semibold transition-all duration-300 whitespace-nowrap overflow-hidden opacity-100 max-w-[130px] ml-2">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
