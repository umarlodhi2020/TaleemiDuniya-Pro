import React from 'react';
import { Hammer, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';

const ComingSoon = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract path name nicely for the UI
  const pathName = location.pathname.split('/').pop().replace('-', ' ').toUpperCase();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 animate-fade-in">
      <GlassCard className="max-w-md w-full p-10 text-center relative overflow-hidden">
        {/* Background blobs for design */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-secondary-500/10 rounded-full blur-3xl"></div>
        
        <div className="w-24 h-24 bg-dark-hover rounded-full flex items-center justify-center mx-auto mb-6 border border-dark-border relative z-10">
          <Hammer className="text-primary-500 w-10 h-10 animate-pulse" />
        </div>
        
        <h1 className="text-2xl font-bold text-dark-text mb-2 relative z-10">
          {pathName}
        </h1>
        <h2 className="text-lg font-semibold text-primary-400 mb-4 relative z-10">
          Coming Soon
        </h2>
        
        <p className="text-dark-muted text-sm mb-8 relative z-10">
          We are currently building this feature to make your experience even better. Stay tuned for updates!
        </p>
        
        <button 
          onClick={() => navigate(-1)}
          className="premium-button-secondary w-full flex items-center justify-center gap-2 relative z-10"
        >
          <ArrowLeft size={18} />
          Go Back
        </button>
      </GlassCard>
    </div>
  );
};

export default ComingSoon;
