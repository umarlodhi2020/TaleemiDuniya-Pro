import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Download, Calendar, ArrowUpRight, CheckCircle } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const Collection = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      try {
        const data = await getRecords('challans', userData?.schoolId || 'default-school');
        // Only show paid challans/fees in collection report
        setCollections(data.filter(c => c.status === 'Paid'));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCollections();
  }, [userData]);

  const totalCollected = collections.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0);
  
  const filtered = collections.filter(c => 
    (c.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.class || '').toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">Daily Collection</h1>
          <p className="text-dark-muted mt-1">Track and manage daily revenue and fee receipts.</p>
        </div>
        <button className="premium-button-secondary">
          <Download size={18} /> Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 col-span-1 md:col-span-3 bg-gradient-to-r from-primary-500/10 to-transparent border-primary-500/20">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-primary-500/20 text-primary-500">
              <BookOpen size={32} />
            </div>
            <div>
              <p className="text-xs font-black text-primary-500 uppercase tracking-widest mb-1">Total Net Collection</p>
              <h2 className="text-4xl font-black text-white flex items-center gap-3">
                PKR {totalCollected.toLocaleString()}
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded-lg flex items-center gap-1">
                  <ArrowUpRight size={14} /> +12%
                </span>
              </h2>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><CheckCircle className="text-green-500" size={20}/> Collection Ledger</h2>
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
            <input 
              type="text" 
              placeholder="Search receipts..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full premium-input pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-dark-muted">Loading collections...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-dark-muted border-dashed border-2 border-dark-border rounded-xl">
            <BookOpen size={40} className="mx-auto opacity-30 mb-3" />
            <p className="font-bold">No collections found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                  <th className="pb-4 px-4">Receipt Date</th>
                  <th className="pb-4 px-4">Student / Detail</th>
                  <th className="pb-4 px-4">Month/Ref</th>
                  <th className="pb-4 px-4 text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-sm text-dark-muted">
                        <Calendar size={14}/> 
                        {c.paidAt ? new Date(c.paidAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold">
                      {c.studentName || `Class ${c.class}`}
                      <span className="block text-xs font-normal text-dark-muted mt-0.5">{c.type || 'Challan Payment'}</span>
                    </td>
                    <td className="py-4 px-4 text-sm text-dark-muted uppercase">{c.month}</td>
                    <td className="py-4 px-4 text-right font-black text-green-400">
                      + PKR {Number(c.totalAmount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default Collection;
