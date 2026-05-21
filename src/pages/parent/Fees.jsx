import React from 'react';
import GlassCard from '../../components/common/GlassCard';
import { CreditCard, Download, ExternalLink } from 'lucide-react';

const ParentFees = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-white">Fee Vouchers</h1>
        <p className="text-dark-muted mt-1">View and download fee challans</p>
      </div>

      <GlassCard className="p-6 border-l-4 border-l-amber-500 bg-amber-500/5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-amber-500/20 text-amber-500">
              <CreditCard size={28} />
            </div>
            <div>
              <p className="text-sm text-dark-muted font-medium">Pending Dues</p>
              <h3 className="text-3xl font-black text-white">Rs. 4,500</h3>
              <p className="text-xs text-amber-500 mt-1">Due Date: 25 May, 2026</p>
            </div>
          </div>
          <button className="premium-button-primary py-2 px-6 shadow-amber-500/20">
            Pay Online Now
          </button>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-white mb-4">Challan History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-border text-dark-muted text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Month</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors">
                <td className="p-4 text-white font-medium">May 2026</td>
                <td className="p-4 text-white">Rs. 4,500</td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-500">Unpaid</span>
                </td>
                <td className="p-4">
                  <button className="flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm font-semibold">
                    <Download size={16} /> Download
                  </button>
                </td>
              </tr>
              <tr className="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors">
                <td className="p-4 text-white font-medium">April 2026</td>
                <td className="p-4 text-white">Rs. 4,500</td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">Paid</span>
                </td>
                <td className="p-4">
                  <button className="flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm font-semibold">
                    <ExternalLink size={16} /> Receipt
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default ParentFees;
