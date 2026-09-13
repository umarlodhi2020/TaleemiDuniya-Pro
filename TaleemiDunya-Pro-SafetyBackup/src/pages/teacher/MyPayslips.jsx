import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import PayslipModal from '../../components/common/PayslipModal';
import { Receipt, FileText, CheckCircle2, Search, Calendar, Landmark, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToCollection, getRecords } from '../../services/db';
import { formatPeriod } from '../../utils/payrollUtils';

const MyPayslips = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const staffId = userData?.staffId || userData?.uid || userData?.id;

  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!schoolId) return;

    // Subscribe to payroll collection with school isolation
    const unsub = subscribeToCollection('payroll', schoolId, (data) => {
      // Security Filter: Employee sees ONLY their own processed payslips
      const myRecords = data.filter((item) => {
        const isMyStaff = item.staffId === staffId || 
                          item.staffId === userData?.uid || 
                          item.staffIdCode === userData?.staffId || 
                          (userData?.email && item.staffEmail === userData.email);
        const isProcessed = item.status === 'Processed' || item.status === 'processed';
        return isMyStaff && isProcessed;
      });

      // Sort by period descending (newest first)
      myRecords.sort((a, b) => String(b.period || b.month || '').localeCompare(String(a.period || a.month || '')));

      setPayslips(myRecords);
      setLoading(false);
    });

    return () => {
      if (unsub) unsub();
    };
  }, [schoolId, staffId, userData]);

  const filteredSlips = payslips.filter((slip) => {
    const periodLabel = formatPeriod(slip.period || slip.month || '');
    return periodLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
           String(slip.period || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-dark-muted font-bold animate-fade-in">
        Loading My Payslips...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in print:p-0 print:bg-white print:text-black">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-emerald-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Receipt className="text-white" size={28} />
            </div>
            My Payslips
          </h1>
          <p className="text-dark-muted mt-2 max-w-xl text-sm">
            View and print your official processed monthly salary slips.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className={`space-y-6 ${selectedSlip ? 'print:hidden' : ''}`}>
        
        {/* Search Bar */}
        <div className="relative print:hidden">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
          <input 
            type="text" 
            placeholder="Search by period or month (e.g. September 2026)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-xl pl-12 p-3 text-sm text-white focus:border-emerald-500 outline-none shadow-sm font-medium"
          />
        </div>

        {/* Payslips List */}
        <GlassCard className="p-0 overflow-hidden print:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-dark-bg border-b border-dark-border">
                  <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Payroll Period</th>
                  <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Basic Salary</th>
                  <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Allowances</th>
                  <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Deductions</th>
                  <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Net Salary</th>
                  <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/50">
                {filteredSlips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-indigo-400" />
                        <span>{formatPeriod(slip.period || slip.month)}</span>
                      </div>
                      <p className="text-[10px] text-dark-muted font-mono mt-1">ID: {slip.id?.slice(0, 8)}</p>
                    </td>
                    <td className="p-4 font-mono text-white text-sm">
                      Rs. {Number(slip.basicSalary || 0).toLocaleString()}
                    </td>
                    <td className="p-4 font-mono text-emerald-400 text-sm">
                      + Rs. {Number(slip.totalAllowances || 0).toLocaleString()}
                    </td>
                    <td className="p-4 font-mono text-red-400 text-sm">
                      - Rs. {Number(slip.totalDeductions || 0).toLocaleString()}
                    </td>
                    <td className="p-4 font-mono text-emerald-300 font-black text-base">
                      Rs. {Number(slip.netSalary || 0).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full w-fit border border-emerald-500/20">
                        <CheckCircle2 size={13} /> Processed
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedSlip(slip)}
                        className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        <FileText size={14} /> View Payslip
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredSlips.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-dark-muted font-bold space-y-2">
                      <div className="w-12 h-12 rounded-full bg-dark-bg border border-dark-border flex items-center justify-center text-dark-muted mx-auto mb-2">
                        <Receipt size={24} />
                      </div>
                      <p>No processed payslips found for your account.</p>
                      <p className="text-xs font-normal text-dark-muted">Payslips will appear here once finalized by the school administration.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* Reusable Printable Payslip Modal */}
      {selectedSlip && (
        <PayslipModal 
          payslipData={selectedSlip}
          userData={userData}
          onClose={() => setSelectedSlip(null)}
        />
      )}

    </div>
  );
};

export default MyPayslips;
