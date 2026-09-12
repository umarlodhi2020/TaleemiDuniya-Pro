import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  Award, 
  TrendingUp, 
  GraduationCap, 
  ArrowRight,
  Settings2
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';

const ExamResultsDashboard = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Marks Entry',
      description: 'Enter or update marks for students in an exam.',
      icon: <ClipboardCheck size={32} className="text-blue-500" />,
      path: '/school-admin/exams/mark',
      color: 'from-blue-500/20 to-blue-500/5',
      borderColor: 'border-blue-500/20'
    },
    {
      title: 'Report Cards',
      description: 'Generate, view, and print official student report cards.',
      icon: <Award size={32} className="text-purple-500" />,
      path: '/school-admin/exams/report-cards',
      color: 'from-purple-500/20 to-purple-500/5',
      borderColor: 'border-purple-500/20'
    },
    {
      title: 'Class Analytics',
      description: 'View detailed statistics, pass ratios, and class performance.',
      icon: <TrendingUp size={32} className="text-green-500" />,
      path: '/school-admin/exams/analytics',
      color: 'from-green-500/20 to-green-500/5',
      borderColor: 'border-green-500/20'
    },
    {
      title: 'Student Promotions',
      description: 'Promote students to the next class based on exam results.',
      icon: <GraduationCap size={32} className="text-orange-500" />,
      path: '/school-admin/exams/promotions',
      color: 'from-orange-500/20 to-orange-500/5',
      borderColor: 'border-orange-500/20'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary-400 to-indigo-500 bg-clip-text text-transparent">
            Exam Results Hub
          </h1>
          <p className="text-dark-muted mt-1 text-sm">
            Manage marks, generate report cards, and analyze student performance.
          </p>
        </div>
        <button 
          onClick={() => navigate('/school-admin/grading-rules')}
          className="premium-button-secondary py-2 px-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider"
        >
          <Settings2 size={16} />
          Grading Rules
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feat, idx) => (
          <GlassCard 
            key={idx}
            className={`p-6 cursor-pointer group hover:scale-105 transition-all duration-300 relative overflow-hidden bg-gradient-to-br ${feat.color} border ${feat.borderColor}`}
            onClick={() => navigate(feat.path)}
          >
            <div className="mb-4 bg-dark-bg/50 p-4 rounded-2xl w-fit group-hover:scale-110 transition-transform">
              {feat.icon}
            </div>
            <h3 className="text-lg font-black text-white mb-2">{feat.title}</h3>
            <p className="text-xs text-dark-muted font-medium mb-6 leading-relaxed">
              {feat.description}
            </p>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary-400 group-hover:text-primary-300 transition-colors">
              <span>Open Portal</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
            
            {/* Decorative background glow */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors pointer-events-none" />
          </GlassCard>
        ))}
      </div>

    </div>
  );
};

export default ExamResultsDashboard;
