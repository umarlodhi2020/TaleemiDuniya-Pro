import React from 'react';
import GlassCard from '../../components/common/GlassCard';
import { BookOpen, BookUp, BookDown } from 'lucide-react';

const LibraryManager = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white">Library Manager</h1>
          <p className="text-dark-muted mt-1">Manage books inventory and issuance</p>
        </div>
        <button className="premium-button-primary py-2 px-4 shadow-primary-500/20 flex items-center gap-2">
          <BookOpen size={18} /> Add New Book
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 flex items-center gap-4">
          <div className="p-3 bg-primary-500/20 text-primary-400 rounded-xl">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm text-dark-muted font-medium">Total Books</p>
            <h3 className="text-2xl font-bold text-white">5,240</h3>
          </div>
        </GlassCard>
        <GlassCard className="p-6 flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
            <BookUp size={24} />
          </div>
          <div>
            <p className="text-sm text-dark-muted font-medium">Books Issued</p>
            <h3 className="text-2xl font-bold text-white">128</h3>
          </div>
        </GlassCard>
        <GlassCard className="p-6 flex items-center gap-4">
          <div className="p-3 bg-red-500/20 text-red-500 rounded-xl">
            <BookDown size={24} />
          </div>
          <div>
            <p className="text-sm text-dark-muted font-medium">Overdue Returns</p>
            <h3 className="text-2xl font-bold text-white">14</h3>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-white mb-4">Recent Book Issuance</h2>
        <p className="text-dark-muted italic">Library database connection is initializing...</p>
      </GlassCard>
    </div>
  );
};

export default LibraryManager;
