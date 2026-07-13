import React from 'react';
import { 
  PlusCircle, 
  Users, 
  UserPlus,
  UserCheck,
  GraduationCap, 
  Calendar, 
  CreditCard, 
  BookOpen, 
  ClipboardCheck, 
  FileText, 
  Settings,
  MessageSquare,
  BarChart3,
  Bell,
  Archive,
  Phone,
  Layout,
  Bot,
  Smartphone,
  Globe,
  UploadCloud
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { Link } from 'react-router-dom';

const modules = [
  // Student Management
  { name: 'Add Student', icon: UserPlus, color: 'text-green-400', path: '/school-admin/students/add', category: 'Students' },
  { name: 'Student Manager', icon: GraduationCap, color: 'text-green-500', path: '/school-admin/students', category: 'Students' },
  { name: 'Bulk Data Import', icon: UploadCloud, color: 'text-cyan-400', path: '/school-admin/import', category: 'Students' },
  { name: 'Student Portal', icon: Layout, color: 'text-green-600', path: '/student/dashboard', category: 'Portals' },
  
  // Inquiry Management
  { name: 'Add Inquiry', icon: PlusCircle, color: 'text-blue-400', path: '/school-admin/inquiries/add', category: 'Inquiries' },
  { name: 'Inquiry Manager', icon: Archive, color: 'text-blue-500', path: '/school-admin/inquiries', category: 'Inquiries' },
  
  // Staff Management
  { name: 'Add Staff', icon: UserPlus, color: 'text-purple-400', path: '/school-admin/staff/add', category: 'Staff' },
  { name: 'Staff Manager', icon: Users, color: 'text-purple-500', path: '/school-admin/staff', category: 'Staff' },
  { name: 'Teacher Portal', icon: Layout, color: 'text-purple-600', path: '/teacher/dashboard', category: 'Portals' },

  // Attendance
  { name: 'Attendance', icon: Calendar, color: 'text-orange-400', path: '/school-admin/attendance', category: 'Attendance' },
  { name: 'Attendance Report', icon: ClipboardCheck, color: 'text-orange-500', path: '/school-admin/attendance', category: 'Attendance' },

  // Finance
  { name: 'Add Fee', icon: CreditCard, color: 'text-yellow-400', path: '/school-admin/fees', category: 'Finance' },
  { name: 'Generate Challan', icon: FileText, color: 'text-yellow-500', path: '/school-admin/fees/generate', category: 'Finance' },
  { name: 'Challan Manager', icon: Archive, color: 'text-yellow-600', path: '/school-admin/fees', category: 'Finance' },
  { name: 'Collection', icon: BarChart3, color: 'text-yellow-700', path: '/school-admin/collection', category: 'Finance' },

  // Academic
  { name: 'Academics', icon: BookOpen, color: 'text-indigo-400', path: '/school-admin/academics', category: 'Academic' },
  { name: 'Academic Manager', icon: Settings, color: 'text-indigo-500', path: '/school-admin/academics', category: 'Academic' },
  { name: 'Exams', icon: ClipboardCheck, color: 'text-red-400', path: '/school-admin/exams', category: 'Academic' },
  { name: 'Exam Manager', icon: Settings, color: 'text-red-500', path: '/school-admin/exams', category: 'Academic' },

  // Accounts
  { name: 'Accounts', icon: BarChart3, color: 'text-emerald-400', path: '/school-admin/accounts', category: 'Finance' },
  { name: 'Accounts Manager', icon: Settings, color: 'text-emerald-500', path: '/school-admin/accounts', category: 'Finance' },

  // Utilities
  { name: 'Period Bell', icon: Bell, color: 'text-cyan-400', path: '/school-admin/period-bell', category: 'Utilities' },
  { name: 'E-Certificates', icon: FileText, color: 'text-cyan-500', path: '/school-admin/certificates', category: 'Utilities' },
  { name: 'Assign Role', icon: Settings, color: 'text-cyan-600', path: '/school-admin/roles', category: 'Utilities' },
  { name: 'Inventory', icon: Archive, color: 'text-orange-600', path: '/school-admin/inventory', category: 'Utilities' },
  { name: 'Reminder', icon: Bell, color: 'text-pink-400', path: '/school-admin/reminders', category: 'Utilities' },
  { name: 'Call Log', icon: Phone, color: 'text-slate-400', path: '/school-admin/call-log', category: 'Utilities' },
  { name: 'AI Assistant', icon: Bot, color: 'text-fuchsia-500', path: '/school-admin/ai-agent', category: 'Utilities' },

  // Portals & Services
  { name: 'Parent Portal', icon: Layout, color: 'text-violet-400', path: '/parent/dashboard', category: 'Portals' },
  { name: 'SMS Panel', icon: MessageSquare, color: 'text-sky-400', path: '/school-admin/sms', category: 'Services' },
  { name: 'E-Services', icon: Globe, color: 'text-sky-500', path: '/school-admin/e-services', category: 'Services' },
  { name: 'Social Post', icon: Globe, color: 'text-sky-600', path: '/school-admin/social', category: 'Services' },
];

const ModuleGrid = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {modules.map((module, index) => (
        <Link key={index} to={module.path} className="group">
          <GlassCard className="flex flex-col items-center justify-center p-6 text-center hover:scale-[1.02] active:scale-95 transition-all cursor-pointer h-full border-white/5 hover:border-primary-500/30 hover:bg-white/10">
            <div className={`p-4 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-all mb-4 ${module.color} group-hover:scale-110`}>
              <module.icon size={28} />
            </div>
            <span className="text-xs font-black text-dark-muted group-hover:text-dark-text transition-colors uppercase tracking-wider">
              {module.name}
            </span>
            <span className="text-[10px] text-dark-muted/50 mt-1 uppercase tracking-tighter">
              {module.category}
            </span>
          </GlassCard>
        </Link>
      ))}
    </div>
  );
};

export default ModuleGrid;
