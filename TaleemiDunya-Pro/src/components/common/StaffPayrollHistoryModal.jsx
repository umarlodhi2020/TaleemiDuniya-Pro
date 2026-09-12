import React, { useMemo } from 'react';
import { History, FileText, X, CheckCircle2, DollarSign, Calendar, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { formatPeriod, exportStaffPayrollHistoryToCSV } from '../../utils/payrollUtils';

/**
 * Reusable Employee Payroll History Modal
 * Displays historical processed payroll snapshots for a specific staff member across all periods.
 * Strictly consumes stored historical snapshot data from Firestore.
 */
const StaffPayrollHistoryModal = ({ staffMember, payrollData = [], userData, onClose, onSelectPayslip }) => {
  if (!staffMember) return null;

  // Filter and sort historical payroll records for this staff member (newest period first)
  const historyRecords = useMemo(() => {
    if (!Array.isArray(payrollData)) return [];
    
    return payrollData
      .filter(p => {
        const isMatchId = p.staffId === staffMember.id || p.staffIdCode === staffMember.staffId;
        const isProcessed = p.status === 'Processed' || p.status === 'processed';
        return isMatchId && isProcessed;
      })
      .sort((a, b) => {
        const pA = a.period || a.month || '';
        const pB = b.period || b.month || '';
        return pB.localeCompare(pA);
      });
  }, [payrollData, staffMember]);

  // Executive Lifetime Metrics for this Staff Member
  const lifetimeMetrics = useMemo(() => {
    let totalMonths = historyRecords.length;
    let lifetimeGross = 0;
    let lifetimeDeductions = 0;
    let lifetimeNet = 0;

    historyRecords.forEach(r => {
      lifetimeGross += Number(r.grossSalary || 0);
      lifetimeDeductions += Number(r.totalDeductions || 0);
      lifetimeNet += Number(r.netSalary || 0);
    });

    return {
      totalMonths,
      lifetimeGross,
      lifetimeDeductions,
      lifetimeNet
    };
  }, [historyRecords]);

  const handleExportCSV = () => {
    if (historyRecords.length === 0) {
      alert(`No processed payroll history available to export for ${staffMember.name}.`);
      return;
    }
    exportStaffPayrollHistoryToCSV(staffMember, historyRecords);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto print:hidden">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[90vh]">
        
        {/* Modal Top Bar */}
        <div className="p-5 bg-dark-bg border-b border-dark-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <History size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                Employee Payroll History & Archive
              </h3>
              <p className="text-xs text-dark-muted mt-0.5">
                Staff: <span className="text-white font-bold">{staffMember.name}</span> ({staffMember.role || 'Staff'}) | ID: <span className="font-mono text-emerald-400 font-bold">{staffMember.staffId || `EMP-${staffMember.id?.slice(0, 4)}`}</span> | Dept: <span className="text-gray-300 font-mono">{staffMember.department || 'N/A'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={historyRecords.length === 0}
              className="px-3.5 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export Employee Payroll History to CSV"
            >
              <Download size={15} /> Export CSV
            </button>
            <button 
              onClick={onClose} 
              className="p-2 bg-dark-card border border-dark-border text-dark-muted hover:text-red-400 rounded-xl transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Lifetime Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            {/* Months Processed */}
            <div className="p-4 bg-dark-bg/60 border border-dark-border rounded-xl">
              <div className="flex items-center justify-between text-xs font-bold text-dark-muted uppercase">
                <span>Processed Months</span>
                <Calendar size={16} className="text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white font-mono mt-2">{lifetimeMetrics.totalMonths}</p>
              <p className="text-[10px] text-dark-muted mt-0.5">Historical Cycles</p>
            </div>

            {/* Lifetime Gross Earnings */}
            <div className="p-4 bg-dark-bg/60 border border-dark-border rounded-xl">
              <div className="flex items-center justify-between text-xs font-bold text-dark-muted uppercase">
                <span>Lifetime Gross</span>
                <TrendingUp size={16} className="text-purple-400" />
              </div>
              <p className="text-lg font-black text-white font-mono mt-2">
                Rs. {lifetimeMetrics.lifetimeGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-dark-muted mt-0.5">Basic + Allowances</p>
            </div>

            {/* Lifetime Deductions */}
            <div className="p-4 bg-dark-bg/60 border border-dark-border rounded-xl">
              <div className="flex items-center justify-between text-xs font-bold text-red-400 uppercase">
                <span>Total Deductions</span>
                <TrendingDown size={16} className="text-red-400" />
              </div>
              <p className="text-lg font-black text-red-400 font-mono mt-2">
                - Rs. {lifetimeMetrics.lifetimeDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-red-400/80 mt-0.5">Att. + Fixed Deductions</p>
            </div>

            {/* Lifetime Net Paid */}
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-300 uppercase">
                <span>Lifetime Net Paid</span>
                <DollarSign size={16} className="text-emerald-400" />
              </div>
              <p className="text-xl font-black text-emerald-300 font-mono mt-2">
                Rs. {lifetimeMetrics.lifetimeNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-emerald-400/90 mt-0.5 font-bold">Total Disbursed</p>
            </div>

          </div>

          {/* Historical Payroll Records Table */}
          <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
            <div className="p-4 bg-dark-bg border-b border-dark-border flex justify-between items-center">
              <h4 className="text-xs font-bold text-dark-muted uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" /> Past Payroll Snapshot Records ({historyRecords.length})
              </h4>
              <span className="text-xs text-dark-muted font-mono">Sorted Newest First</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-dark-bg/80 border-b border-dark-border text-xs font-bold text-dark-muted uppercase">
                    <th className="p-3.5">Payroll Month</th>
                    <th className="p-3.5">Attendance</th>
                    <th className="p-3.5">Basic Salary</th>
                    <th className="p-3.5">Allowances</th>
                    <th className="p-3.5">Gross Salary</th>
                    <th className="p-3.5">Att. Deduction</th>
                    <th className="p-3.5">Total Deductions</th>
                    <th className="p-3.5">Net Salary</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Processed Date</th>
                    <th className="p-3.5 text-right">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/50 font-mono text-xs">
                  {historyRecords.map((rec) => {
                    const periodLabel = formatPeriod(rec.period || rec.month);
                    const basic = Number(rec.basicSalary || 0);
                    const allowances = Number(rec.totalAllowances || 0);
                    const gross = Number(rec.grossSalary || 0);
                    const attDed = Number(rec.attendanceDeduction || 0);
                    const totDed = Number(rec.totalDeductions || 0);
                    const net = Number(rec.netSalary || 0);
                    const processedDateStr = rec.processedAt
                      ? new Date(rec.processedAt).toLocaleDateString()
                      : '—';

                    return (
                      <tr key={rec.id || rec.period} className="hover:bg-white/5 transition-colors">
                        
                        {/* Period */}
                        <td className="p-3.5 font-bold text-white">
                          {periodLabel}
                        </td>

                        {/* Attendance Summary */}
                        <td className="p-3.5 text-[11px] font-sans">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-green-400">P:{rec.presentDays ?? 0}</span>
                            <span className="text-red-400">A:{rec.absentDays ?? 0}</span>
                            <span className="text-amber-400">H:{rec.halfDays ?? 0}</span>
                            <span className="text-purple-400">L:{rec.leaveDays ?? 0}</span>
                          </div>
                          <p className="text-[10px] text-dark-muted mt-0.5 font-mono">
                            Work: {rec.totalWorkingDays ?? 26}d | Paid: {rec.paidEquivalentDays ?? (rec.presentDays || 0)}d
                          </p>
                        </td>

                        {/* Basic */}
                        <td className="p-3.5 text-gray-300">
                          Rs. {basic.toLocaleString()}
                        </td>

                        {/* Allowances */}
                        <td className="p-3.5 text-emerald-400">
                          + Rs. {allowances.toLocaleString()}
                        </td>

                        {/* Gross */}
                        <td className="p-3.5 font-bold text-white">
                          Rs. {gross.toLocaleString()}
                        </td>

                        {/* Attendance Deduction */}
                        <td className="p-3.5 text-rose-400">
                          - Rs. {attDed.toLocaleString()}
                        </td>

                        {/* Total Deductions */}
                        <td className="p-3.5 text-red-400 font-bold">
                          - Rs. {totDed.toLocaleString()}
                        </td>

                        {/* Net Salary */}
                        <td className="p-3.5 font-black text-emerald-300 text-sm">
                          Rs. {net.toLocaleString()}
                        </td>

                        {/* Status */}
                        <td className="p-3.5 font-sans">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase">
                            <CheckCircle2 size={11} /> {rec.status || 'Processed'}
                          </span>
                        </td>

                        {/* Processed Date */}
                        <td className="p-3.5 text-dark-muted font-sans text-[11px]">
                          {processedDateStr}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right font-sans">
                          <button
                            onClick={() => onSelectPayslip && onSelectPayslip(rec)}
                            className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            title="View / Print Payslip"
                          >
                            <FileText size={12} /> Payslip
                          </button>
                        </td>

                      </tr>
                    );
                  })}

                  {historyRecords.length === 0 && (
                    <tr>
                      <td colSpan="11" className="p-8 text-center text-dark-muted font-sans font-bold">
                        No processed payroll history found for {staffMember.name}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-dark-bg border-t border-dark-border flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-dark-card border border-dark-border text-white hover:bg-white/5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close History
          </button>
        </div>

      </div>
    </div>
  );
};

export default StaffPayrollHistoryModal;
