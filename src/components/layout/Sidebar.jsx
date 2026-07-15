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
  UploadCloud,
  ChevronDown,
  AlertTriangle,
  Briefcase,
  FileText,
  UserPlus,
  Laptop,
  QrCode,
  Bed,
  Home,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ role }) => {
  const { logout } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const [expanded, setExpanded] = React.useState({ 'Student Attendance': true });

  // Dynamic preview detection so school-admin can sandbox other portals
  let displayRole = role;
  if (role === 'school-admin') {
    if (currentPath.startsWith('/student')) displayRole = 'student';
    else if (currentPath.startsWith('/teacher')) displayRole = 'teacher';
    else if (currentPath.startsWith('/parent')) displayRole = 'parent';
  }

  const isPreview = role === 'school-admin' && displayRole !== role;

  const getHomePath = () => {
    if (displayRole === 'super-admin') return '/super-admin/dashboard';
    if (displayRole === 'teacher') return '/teacher/dashboard';
    if (displayRole === 'student') return '/student/dashboard';
    if (displayRole === 'parent') return '/parent/dashboard';
    return '/school-admin/dashboard';
  };

  const schoolAdminLinks = [
    {
      title: 'Main',
      links: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/school-admin/dashboard' },
        { name: 'Android Pocket App (Mini)', icon: Smartphone, path: '/school-admin/pocket-app' },
        { name: 'SaaS Plan & Recharge', icon: CreditCard, path: '/school-admin/subscription' },
        { name: 'AI Assistant', icon: Bot, path: '/school-admin/ai-agent' },
        { name: 'Add Inquiry', icon: PlusCircle, path: '/school-admin/inquiries/add' },
        { name: 'Inquiries', icon: MessageSquare, path: '/school-admin/inquiries' },
      ]
    },
    {
      title: 'Users',
      links: [
        { name: 'Online Admission CRM', icon: UserPlus, path: '/school-admin/admissions/crm' },
        { name: 'Add Student', icon: PlusCircle, path: '/school-admin/students/add' },
        { name: 'Students', icon: GraduationCap, path: '/school-admin/students' },
        { name: 'Family Tree / Siblings', icon: Users, path: '/school-admin/family-tree' },
        { name: 'Add Staff', icon: PlusCircle, path: '/school-admin/staff/add' },
        { name: 'Staff', icon: UserSquare2, path: '/school-admin/staff' },
        { name: 'Staff Salary & Payroll', icon: Briefcase, path: '/school-admin/staff/payroll' },
        { 
          name: 'Student Attendance', 
          icon: CalendarCheck, 
          sublinks: [
            { name: '1 Take Attendance', path: '/school-admin/attendance' },
            { name: '2 Attendance Register', path: '/school-admin/attendance-register' }
          ]
        },
        { name: 'ID Cards Generator', icon: Award, path: '/school-admin/students/id-cards' },
        { name: 'Bulk Data Import', icon: UploadCloud, path: '/school-admin/import' },
        { name: 'Google Drive & Cloud Vault', icon: HardDrive, path: '/school-admin/cloud-backup' },
      ]
    },
    {
      title: 'Finance',
      links: [
        { name: 'Fee Defaulters & Recovery', icon: AlertTriangle, path: '/school-admin/fees/defaulters' },
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
        { name: 'Online MCQ Quiz Engine', icon: Laptop, path: '/school-admin/academics/online-quiz' },
        { name: 'Daily Homework Diary', icon: FileText, path: '/school-admin/academics/daily-diary' },
        { name: 'Academics', icon: BookOpen, path: '/school-admin/academics' },
        { name: 'Exams', icon: ClipboardCheck, path: '/school-admin/exams' },
        { name: 'Period Bell', icon: Clock, path: '/school-admin/period-bell' },
        { name: 'Report Templates', icon: Award, path: '/school-admin/academics/report-templates' },
        { name: 'Timetable Builder', icon: Clock, path: '/school-admin/academics/timetable-builder' },
      ]
    },
    {
      title: 'Resources & Facilities',
      links: [
        { name: 'Google Drive & Cloud Vault', icon: HardDrive, path: '/school-admin/cloud-backup' },
        { name: 'WhatsApp Cron Automation', icon: Bot, path: '/school-admin/whatsapp-automation' },
        { name: 'Mobile PWA & Offline Engine', icon: Smartphone, path: '/school-admin/pwa-offline' },
        { name: 'Launch Security & Audit Hub', icon: ShieldCheck, path: '/school-admin/system-health-audit' },
        { name: 'Live ID Card Gate Scanner', icon: QrCode, path: '/school-admin/security/gate-scanner' },
        { name: 'Bus & Van Transport Fleet', icon: Bus, path: '/school-admin/transport' },
        { name: 'Digital Library & Notes Hub', icon: BookOpen, path: '/school-admin/library' },
        { name: 'Official Certificate Press', icon: Award, path: '/school-admin/certificates' },
        { name: 'Hostel & Dormitory Manager', icon: Bed, path: '/school-admin/hostel' },
        { name: 'Security Gate Pass Logs', icon: ShieldCheck, path: '/school-admin/security/gate-pass' },
        { name: 'Inventory & Stock Store', icon: Archive, path: '/school-admin/inventory' },
        { name: 'Assign Role & Access', icon: ShieldCheck, path: '/school-admin/roles' },
        { name: 'Reminders & Tasks', icon: Bell, path: '/school-admin/reminders' },
        { name: 'Official Call Log', icon: PhoneCall, path: '/school-admin/call-log' },
      ]
    },
    {
      title: 'Portals & Services',
      links: [
        { name: 'Student Portal', icon: UserCircle, path: '/student/dashboard' },
        { name: 'Teacher Portal', icon: UserCircle, path: '/teacher/dashboard' },
        { name: 'Parent Portal', icon: UserCircle, path: '/parent/dashboard' },
        { name: 'WhatsApp & SMS Bot', icon: Smartphone, path: '/school-admin/sms' },
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
        
        {/* Sleek Sidebar Header Emblem (Clickable to navigate Home) */}
        <NavLink to={getHomePath()} className="h-20 border-b border-dark-border flex items-center px-3 gap-2.5 flex-shrink-0 hover:bg-white/5 transition-colors cursor-pointer" title="Go to Dashboard Home">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-white relative shrink-0">
            <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-pulse" />
            <GraduationCap size={20} className="relative z-10 text-white animate-pulse" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm font-black text-white tracking-wide leading-tight truncate">
              TaleemiDunya
            </h2>
            <div className="flex items-center mt-0.5">
              <span className="px-1 py-[1px] rounded bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-[8px] font-black tracking-wider flex items-center gap-1 shadow-sm">
                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                v2.5.0 PRO
              </span>
            </div>
          </div>
        </NavLink>

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

              {section.links.map((link) => 
                link.sublinks ? (
                  <div key={link.name} className="space-y-1">
                    <div
                      onClick={() => setExpanded(prev => ({ ...prev, [link.name]: !prev[link.name] }))}
                      className="sidebar-item flex items-center justify-between cursor-pointer px-3 py-2 gap-2 transition-all hover:bg-white/5 rounded-xl"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <link.icon size={16} className="flex-shrink-0 text-primary-400" />
                        <span className="text-xs font-semibold whitespace-nowrap overflow-hidden max-w-[130px] ml-2 text-white">{link.name}</span>
                      </div>
                      <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-300 ${expanded[link.name] ? 'rotate-180 text-primary-400' : 'text-dark-muted'}`} />
                    </div>
                    {expanded[link.name] && (
                      <div className="ml-5 pl-3 border-l border-primary-500/30 space-y-1 mt-1">
                        {link.sublinks.map((sub) => (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            className={({ isActive }) =>
                              `${isActive ? 'text-primary-400 font-bold bg-primary-500/10 border border-primary-500/20' : 'text-dark-muted hover:text-white hover:bg-white/5'} flex items-center transition-all duration-200 px-3 py-1.5 text-xs gap-2 rounded-lg`
                            }
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                            <span className="truncate">{sub.name}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
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
                )
              )}
            </div>
          ))}
        </nav>

        {/* Logout Footer */}
        <div className="p-2 border-t border-dark-border bg-dark-card">
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
