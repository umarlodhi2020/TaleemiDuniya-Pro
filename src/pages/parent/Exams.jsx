import React from 'react';
import GlassCard from '../../components/common/GlassCard';
import { Award } from 'lucide-react';

const ParentExams = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-white">Exam Results</h1>
        <p className="text-dark-muted mt-1">Track academic performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6 relative overflow-hidden group hover:border-primary-500/50 transition-all cursor-pointer">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-all"></div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">First Term Exams 2026</h3>
              <p className="text-sm text-dark-muted mb-4">Class 5 - Section A</p>
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 w-max px-3 py-1 rounded-lg text-sm font-bold">
                <Award size={16} /> Grade: A+
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-white">88%</span>
            </div>
          </div>
          <button className="w-full mt-6 py-2 rounded-xl bg-dark-border/50 text-white font-semibold text-sm hover:bg-primary-500 hover:text-white transition-all">
            View Full Report Card
          </button>
        </GlassCard>
      </div>
    </div>
  );
};

export default ParentExams;
