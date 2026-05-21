import React from 'react';
import GlassCard from '../../components/common/GlassCard';
import { Bus, MapPin, Users } from 'lucide-react';

const TransportManager = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white">Transport Manager</h1>
          <p className="text-dark-muted mt-1">Manage routes, vehicles, and student transport</p>
        </div>
        <button className="premium-button-primary py-2 px-4 shadow-primary-500/20 flex items-center gap-2">
          <Bus size={18} /> Add Vehicle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 flex items-center gap-4">
          <div className="p-3 bg-primary-500/20 text-primary-400 rounded-xl">
            <Bus size={24} />
          </div>
          <div>
            <p className="text-sm text-dark-muted font-medium">Total Vehicles</p>
            <h3 className="text-2xl font-bold text-white">12</h3>
          </div>
        </GlassCard>
        <GlassCard className="p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <MapPin size={24} />
          </div>
          <div>
            <p className="text-sm text-dark-muted font-medium">Active Routes</p>
            <h3 className="text-2xl font-bold text-white">8</h3>
          </div>
        </GlassCard>
        <GlassCard className="p-6 flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-dark-muted font-medium">Students Enrolled</p>
            <h3 className="text-2xl font-bold text-white">450</h3>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-white mb-4">Route List</h2>
        <p className="text-dark-muted italic">Transport module is being configured for this campus...</p>
      </GlassCard>
    </div>
  );
};

export default TransportManager;
