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
  HardDrive,
  Building2,
  ShieldAlert,
  PieChart,
  DollarSign,
  Search,
  Sparkles,
  Command,
  ChevronRight,
  Zap,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import GlobalSearchModal from '../common/GlobalSearchModal';

const Sidebar = ({ role }) => {
  const { logout, userData } = useAuth();
  const { isFeatureAllowed, allowedFeaturesMap, currentSaaSPlan } = useSchool();
  const location = useLocation();
  const currentPath = location.pathname;
  const [expanded, setExpanded] = React.useState({ 'Student Attendance': true });
  const [menuSearch, setMenuSearch] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('All');
  const [collapsedSections, setCollapsedSections] = React.useState({
    'Academic': false,
    'Resources & Facilities': false,
    'Portals & Services': false
  });
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [navMode, setNavMode] = React.useState(() => {
    return localStorage.getItem('taleemidunya_sidebar_mode') || 'smart';
  });

  const toggleNavMode = (mode) => {
    setNavMode(mode);
    localStorage.setItem('taleemidunya_sidebar_mode', mode);
  };

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
              { name: 'Subscriptions & Matrix', icon: CreditCard, path: '/super-admin/subscriptions' },
            ]
          },
          {
            title: 'Management',
            links: [
              { name: 'Revenue & Billing', icon: BookOpen, path: '/super-admin/revenue' },
              { name: 'Notifications', icon: BellRing, path: '/super-admin/notifications' },
              { name: 'Support Center', icon: MessageSquare, path: '/super-admin/support' },
              { name: 'Bulk Data Import', icon: UploadCloud, path: '/school-admin/import' },
              { name: 'Settings', icon: Settings, path: '/super-admin/settings' },
              { name: 'Landing Page', icon: Globe, path: '/super-admin/landing-page' },
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
              { name: 'My Attendance', icon: CalendarCheck, path: '/student/attendance' },
              { name: 'Exams & Results', icon: ClipboardCheck, path: '/student/exams' },
              { name: 'Daily Homework', icon: BookOpen, path: '/student/homework' },
              { name: 'Class Timetable', icon: Clock, path: '/student/timetable' },
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
              { name: 'Child Attendance', icon: CalendarCheck, path: '/parent/attendance' },
              { name: 'Fee Challans', icon: Receipt, path: '/parent/fees' },
              { name: 'Exam Reports', icon: ClipboardCheck, path: '/parent/exams' },
              { name: 'AI Assistant', icon: Bot, path: '/parent/ai-chatbot' },
            ]
          }
        ];
      default:
        return [
          {
            title: 'Dashboard & Core',
            categoryKey: 'Core',
            links: [
              { name: 'Executive Dashboard', icon: LayoutDashboard, path: '/school-admin/dashboard', featureKey: 'executive-dashboard' },
              { name: 'Multi-Branch Hub', icon: Building2, path: '/school-admin/branches', featureKey: 'multi-branch' },
              { name: 'Franchise Network Management', icon: Globe, path: '/school-admin/franchise-manager', featureKey: 'franchise-manager' },
              { name: 'AI School Copilot', icon: Bot, path: '/school-admin/copilot', featureKey: 'ai-copilot' },
              { name: 'SaaS Plan & Online Pay', icon: CreditCard, path: '/school-admin/billing', featureKey: 'saas-billing-portal' },
              { name: 'Super Admin Configuration', icon: ShieldAlert, path: '/super-admin/dashboard', featureKey: 'executive-dashboard' },
              { name: 'Automated Reports & BI Hub', icon: PieChart, path: '/school-admin/reports-hub', featureKey: 'reports-hub' },
              { name: 'Student Inquiry & CRM', icon: Users, path: '/school-admin/inquiries', featureKey: 'inquiry-student' },
              { name: 'Certificate & Document Hub', icon: FileText, path: '/school-admin/certificates', featureKey: 'certificates' },
              { name: 'Other Income Manager', icon: DollarSign, path: '/school-admin/other-income?tab=invoices', featureKey: 'other-income' },
            ]
          },
          {
            title: 'Users',
            categoryKey: 'Users',
            links: [
              { name: 'Inquiry Student', icon: UserPlus, path: '/school-admin/inquiry-student', featureKey: 'inquiry-student' },
              { name: 'Online Admission CRM', icon: UserPlus, path: '/school-admin/admissions/crm', featureKey: 'admission-crm' },
              { name: 'Add Student', icon: PlusCircle, path: '/school-admin/students/add', featureKey: 'students-manager' },
              { name: 'Students', icon: GraduationCap, path: '/school-admin/students', featureKey: 'students-manager' },
              { name: 'Family Tree / Siblings', icon: Users, path: '/school-admin/family-tree', featureKey: 'family-tree' },
              { name: 'Add Staff', icon: PlusCircle, path: '/school-admin/staff/add', featureKey: 'staff-manager' },
              { name: 'Staff', icon: UserSquare2, path: '/school-admin/staff', featureKey: 'staff-manager' },
              { name: 'Staff Salary & Payroll', icon: Briefcase, path: '/school-admin/staff/payroll', featureKey: 'staff-payroll' },
              { 
                name: 'Student Attendance', 
                icon: CalendarCheck, 
                featureKey: 'student-attendance',
                sublinks: [
                  { name: 'Take Attendance', path: '/school-admin/attendance', featureKey: 'student-attendance' },
                  { name: 'Attendance Register', path: '/school-admin/attendance-register', featureKey: 'student-attendance' }
                ]
              },
              { name: 'ID Cards Generator', icon: Award, path: '/school-admin/students/id-cards', featureKey: 'id-cards' },
              { name: 'Bulk Data Import', icon: UploadCloud, path: '/school-admin/import', featureKey: 'data-import' },
              { name: 'Google Drive & Cloud Vault', icon: HardDrive, path: '/school-admin/cloud-backup', featureKey: 'cloud-backup' },
            ]
          },
          {
            title: 'Finance',
            categoryKey: 'Finance',
            links: [
              { name: 'Fee Defaulters & Recovery', icon: AlertTriangle, path: '/school-admin/fees/defaulters', featureKey: 'fee-defaulters' },
              { name: 'Add Fee', icon: PlusCircle, path: '/school-admin/fees/add', featureKey: 'challan-manager' },
              { name: 'Generate Challan', icon: Receipt, path: '/school-admin/fees/generate', featureKey: 'challan-generate' },
              { name: 'Challan Manager', icon: CreditCard, path: '/school-admin/fees', featureKey: 'challan-manager' },
              { name: 'Collection', icon: BookOpen, path: '/school-admin/collection', featureKey: 'collection-tracker' },
              { name: 'Accounts & Ledger', icon: BookOpen, path: '/school-admin/accounts', featureKey: 'accounts-ledger' },
              { name: 'Multi-part Challan Book', icon: Receipt, path: '/school-admin/fees/challan-book', featureKey: 'challan-book' },
              { name: 'Expense Cashbook', icon: CreditCard, path: '/school-admin/accounts/expenses', featureKey: 'expense-cashbook' },
            ]
          },
          {
            title: 'Academic',
            categoryKey: 'Academic',
            links: [
              { name: 'Online MCQ Quiz Engine', icon: Laptop, path: '/school-admin/academics/online-quiz', featureKey: 'online-quiz' },
              { name: 'Daily Homework Diary', icon: FileText, path: '/school-admin/academics/daily-diary', featureKey: 'daily-diary' },
              { name: 'Academics & Gradebook', icon: BookOpen, path: '/school-admin/academics', featureKey: 'academics-manager' },
              { name: 'Exams & Results', icon: ClipboardCheck, path: '/school-admin/exams', featureKey: 'exams-hub' },
              { name: 'Period Bell IoT', icon: Clock, path: '/school-admin/period-bell', featureKey: 'period-bell' },
              { name: 'Report Card Templates', icon: Award, path: '/school-admin/academics/report-templates', featureKey: 'report-templates' },
              { name: 'Timetable Builder', icon: Clock, path: '/school-admin/academics/timetable-builder', featureKey: 'timetable-builder' },
            ]
          },
          {
            title: 'Resources & Facilities',
            categoryKey: 'Resources',
            links: [
              { name: 'WhatsApp Cron Automation', icon: Bot, path: '/school-admin/whatsapp-automation', featureKey: 'whatsapp-automation' },
              { name: 'Mobile PWA & Offline Engine', icon: Smartphone, path: '/school-admin/pwa-offline', featureKey: 'pwa-offline' },
              { name: 'Launch Security & Audit Hub', icon: ShieldCheck, path: '/school-admin/system-health-audit', featureKey: 'system-audit' },
              { name: 'Live ID Card Gate Scanner', icon: QrCode, path: '/school-admin/security/gate-scanner', featureKey: 'gate-scanner' },
              { name: 'Bus & Van Transport Fleet', icon: Bus, path: '/school-admin/transport', featureKey: 'transport-fleet' },
              { name: 'Digital Library & Notes Hub', icon: BookOpen, path: '/school-admin/library', featureKey: 'digital-library' },
              { name: 'Hostel & Dormitory Manager', icon: Bed, path: '/school-admin/hostel', featureKey: 'hostel-manager' },
              { name: 'Security Gate Pass Logs', icon: ShieldCheck, path: '/school-admin/security/gate-pass', featureKey: 'gate-pass' },
              { name: 'Inventory & Stock Store', icon: Archive, path: '/school-admin/inventory', featureKey: 'inventory-store' },
              { name: 'Assign Role & Access', icon: ShieldCheck, path: '/school-admin/roles', featureKey: 'roles-access' },
              { name: 'Reminders & Tasks', icon: Bell, path: '/school-admin/reminders', featureKey: 'reminders-tasks' },
              { name: 'Official Call Log', icon: PhoneCall, path: '/school-admin/call-log', featureKey: 'call-log' },
            ]
          },
          {
            title: 'Portals & Services',
            categoryKey: 'Portals',
            links: [
              { name: 'Student Portal', icon: UserCircle, path: '/student/dashboard', featureKey: 'student-portal-access' },
              { name: 'Teacher Portal', icon: UserCircle, path: '/teacher/dashboard', featureKey: 'teacher-portal-access' },
              { name: 'Parent Portal', icon: UserCircle, path: '/parent/dashboard', featureKey: 'parent-portal-access' },
              { name: 'WhatsApp & SMS Bot Hub', icon: Smartphone, path: '/school-admin/sms', featureKey: 'sms-bot' },
              { name: 'E-Services & Website', icon: Globe, path: '/school-admin/e-services', featureKey: 'e-services' },
              { name: 'Social Post Feed', icon: Share2, path: '/school-admin/social', featureKey: 'social-feed' },
              { name: 'Settings', icon: Settings, path: '/school-admin/settings', featureKey: 'settings' },
            ]
          }
        ];
    }
  };

  // Filter sections and enforce strictly: "school ki ju fetaues alloow kr hai sirf vo hi show ho baki nhi"
  const navSections = getNavSections().filter(section => {
    if (navMode === 'classic') return true;
    if (activeCategory !== 'All' && section.categoryKey && section.categoryKey !== activeCategory) {
      return false;
    }
    return true;
  }).map(section => {
    // 1. First, strictly filter out any links that are NOT allowed for this school's plan/overrides!
    const allowedLinks = section.links.filter(link => {
      if (displayRole !== 'school-admin' || userData?.role === 'super-admin') return true;
      const keyOrPath = link.featureKey || link.path;
      return isFeatureAllowed(keyOrPath);
    });

    // 2. Then apply search filter if user typed in menuSearch
    if (!menuSearch.trim()) return { ...section, links: allowedLinks };
    const query = menuSearch.toLowerCase();
    const searchedLinks = allowedLinks.filter(link => {
      const matchName = link.name.toLowerCase().includes(query);
      const matchSub = link.sublinks && link.sublinks.some(sub => sub.name.toLowerCase().includes(query));
      return matchName || matchSub;
    }).map(link => {
      if (link.sublinks) {
        const filteredSubs = link.sublinks.filter(sub => sub.name.toLowerCase().includes(query) || link.name.toLowerCase().includes(query));
        return { ...link, sublinks: filteredSubs };
      }
      return link;
    });
    return { ...section, links: searchedLinks };
  }).filter(section => section.links.length > 0);

  const toggleSection = (sectionTitle) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  const categories = ['All', 'Core', 'Users', 'Finance', 'Academic', 'Resources', 'Portals'];

  // Calculate total allowed features count for visual meter
  const totalCatalogFeatures = 36;
  const activeFeaturesCount = Object.keys(allowedFeaturesMap || {}).filter(k => allowedFeaturesMap[k] === true).length || 24;

  return (
    <>
      <div className="fixed inset-y-0 left-0 top-0 bottom-0 z-40 w-56 bg-dark-card border-r border-dark-border flex flex-col transition-all duration-300 h-full min-h-screen">
        
        {/* Sleek Sidebar Header Emblem (Clickable to navigate Home) */}
        <div className="flex items-center justify-between border-b border-dark-border px-3 h-16 flex-shrink-0 bg-dark-card/95">
          <NavLink to={getHomePath()} className="flex items-center gap-2.5 hover:opacity-90 transition-opacity flex-1 overflow-hidden" title="Go to Dashboard Home">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-white relative shrink-0 shadow-md shadow-cyan-500/20">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <h2 className="text-xs font-black text-white tracking-wide leading-tight truncate">
                TaleemiDunya
              </h2>
              <span className="text-[9px] font-bold text-cyan-400 tracking-wider font-mono">
                v2.5.0 PRO
              </span>
            </div>
          </NavLink>
          <button 
            onClick={() => setIsSearchOpen(true)}
            title="Global Command+K Search"
            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 hover:bg-primary-500/20 hover:border-primary-500/40 transition-all shrink-0"
          >
            <Command size={14} />
          </button>
        </div>

        {/* Return to Admin Button if Sandbox Mode */}
        {isPreview && (
          <div className="px-2 pt-3 pb-2 border-b border-dark-border/40">
            <NavLink
              to="/school-admin/dashboard"
              className="flex items-center justify-center rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500 hover:text-white transition-all font-bold text-xs w-full py-1.5 px-2 gap-2"
              title="Return to Admin Panel"
            >
              <ArrowLeft size={14} className="flex-shrink-0" />
              <span>Back to Admin</span>
            </NavLink>
          </div>
        )}

        {/* Instant Search Box right inside sidebar */}
        <div className="px-2.5 pt-2.5 pb-1">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-dark-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Filter allowed features..."
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              className="w-full bg-dark-hover/90 border border-dark-border rounded-lg py-1.5 pl-8 pr-6 text-xs text-white placeholder-dark-muted focus:outline-none focus:border-cyan-500 transition-all shadow-inner"
            />
            {menuSearch && (
              <button
                onClick={() => setMenuSearch('')}
                className="absolute right-2 text-[10px] text-dark-muted hover:text-white bg-white/10 rounded px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Header for Smart Mode */}
        {navMode === 'smart' && displayRole === 'school-admin' && (
          <div className="px-2 pt-1.5 pb-2 border-b border-dark-border/50 overflow-x-auto no-scrollbar flex items-center gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30'
                    : 'text-dark-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3 custom-scrollbar">
          {navSections.map((section, idx) => {
            const isCollapsed = collapsedSections[section.title];
            return (
              <div key={section.title || idx} className="space-y-1">
                {section.title && (
                  <div
                    onClick={() => toggleSection(section.title)}
                    className="flex items-center justify-between px-2.5 py-1 text-[10px] font-black text-dark-muted uppercase tracking-wider cursor-pointer hover:text-white transition-colors group select-none"
                  >
                    <span>{section.title}</span>
                    <ChevronDown
                      size={12}
                      className={`text-dark-muted group-hover:text-white transition-transform duration-200 ${
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      }`}
                    />
                  </div>
                )}
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {section.links.map((link) =>
                      link.sublinks ? (
                        <div key={link.name} className="space-y-0.5">
                          <div
                            onClick={() => setExpanded(prev => ({ ...prev, [link.name]: !prev[link.name] }))}
                            className="sidebar-item flex items-center justify-between cursor-pointer px-2.5 py-1.5 gap-2 transition-all hover:bg-white/5 rounded-xl"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <link.icon size={15} className="flex-shrink-0 text-cyan-400" />
                              <span className="text-xs font-semibold whitespace-nowrap overflow-hidden max-w-[125px] ml-1.5 text-white">{link.name}</span>
                            </div>
                            <ChevronDown size={13} className={`flex-shrink-0 transition-transform duration-300 ${expanded[link.name] ? 'rotate-180 text-cyan-400' : 'text-dark-muted'}`} />
                          </div>
                          {expanded[link.name] && (
                            <div className="ml-5 pl-2.5 border-l border-cyan-500/30 space-y-0.5 mt-0.5">
                              {link.sublinks.map((sub) => (
                                <NavLink
                                  key={sub.path}
                                  to={sub.path}
                                  className={({ isActive }) =>
                                    `${isActive ? 'text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 shadow-sm' : 'text-dark-muted hover:text-white hover:bg-white/5'} flex items-center transition-all duration-200 px-2.5 py-1 text-xs gap-2 rounded-lg`
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
                            `${isActive ? 'sidebar-item-active !bg-gradient-to-r !from-cyan-500/20 !to-blue-500/10 !border-cyan-500/30 !text-cyan-400 font-bold shadow-sm' : 'sidebar-item text-dark-muted hover:text-white'} flex items-center transition-all duration-200 px-2.5 py-1.5 gap-2 justify-start rounded-xl`
                          }
                        >
                          <link.icon size={15} className="flex-shrink-0 text-cyan-400/80" />
                          <span className="text-xs font-semibold transition-all duration-200 whitespace-nowrap overflow-hidden opacity-100 max-w-[125px] ml-1.5">{link.name}</span>
                        </NavLink>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Dynamic SaaS Plan & Active Features Badge for School Admin */}
        {displayRole === 'school-admin' && (
          <div className="mx-2 mb-2 p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-500/30 text-white shrink-0 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <Zap size={12} className="text-amber-400 animate-pulse" /> {currentSaaSPlan || 'Premium'} Plan
              </span>
              <span className="text-[9px] font-black bg-white/10 px-1.5 py-0.5 rounded text-gray-300">
                {activeFeaturesCount}/{totalCatalogFeatures} Active
              </span>
            </div>
            <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mb-2">
              <div 
                className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((activeFeaturesCount / totalCatalogFeatures) * 100))}%` }}
              />
            </div>
            <NavLink
              to="/school-admin/billing"
              className="w-full py-1.5 px-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow transition-all active:scale-95"
            >
              <span>⚡ Online Pay & Add-ons</span>
            </NavLink>
          </div>
        )}

        {/* Logout Footer */}
        <div className="p-2 border-t border-dark-border bg-dark-card flex items-center gap-1.5 shrink-0">
          <button
            onClick={logout}
            className="flex-1 flex items-center rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all font-semibold cursor-pointer px-3 py-2 gap-2 justify-start text-xs border border-transparent hover:border-red-500/20"
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span className="truncate">Logout</span>
          </button>
          <button
            onClick={() => setIsSearchOpen(true)}
            title="Global Search (Command + K)"
            className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all shrink-0"
          >
            <Search size={15} />
          </button>
        </div>
      </div>

      {/* Global Command+K Quick Search Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Sidebar;
