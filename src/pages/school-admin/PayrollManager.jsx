import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  UserCheck, 
  Calendar, 
  Printer, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowLeft, 
  CreditCard,
  Briefcase,
  Award,
  X,
  Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db as firestore } from '../../services/firebase';

const PayrollManager = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = userData?.schoolName || 'Lodhi School System';

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlip, setSelectedSlip] = useState(null);

  useEffect(() => {
    fetchStaffPayroll();
  }, [selectedMonth, schoolId]);

  const fetchStaffPayroll = async () => {
    setLoading(true);
    try {
      const staffRecords = await getRecords('staff', schoolId);
      if (Array.isArray(staffRecords) && staffRecords.length > 0) {
        const mapped = staffRecords.map(s => {
          const basicPay = Number(s?.salary || s?.basicPay || 50000) || 50000;
          const absents = Number(s?.absents || 0) || 0;
          const advanceTaken = Number(s?.advanceTaken || 0) || 0;
          const allowance = Number(s?.allowance || 2000) || 2000;
          const perDay = Math.round(basicPay / 26) || 0;
          const deduction = absents * perDay + advanceTaken;
          const netPay = Math.max(0, basicPay + allowance - deduction);

          return {
            id: s?.id || Math.random().toString(36).substring(2, 9),
            name: String(s?.name || s?.fullName || 'Staff Member'),
            role: String(s?.designation || s?.role || 'Teacher'),
            basicPay,
            absents,
            advanceTaken,
            allowance,
            perDay,
            deduction,
            netPay,
            status: s?.payrollStatus || 'unpaid'
          };
        });
        setStaffList(mapped);
      } else {
        setStaffList([]);
      }
    } catch (e) {
      console.error('Error fetching staff payroll:', e);
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    setStaffList(staffList.map(s => s.id === id ? { ...s, status: nextStatus } : s));
  };

  const safeSearch = String(searchQuery || '').toLowerCase().trim();
  const filteredStaff = (Array.isArray(staffList) ? staffList : []).filter(s => 
    String(s?.name || '').toLowerCase().includes(safeSearch) || 
    String(s?.role || '').toLowerCase().includes(safeSearch)
  );

  const totalPayrollAmount = filteredStaff.reduce((acc, curr) => acc + (Number(curr?.netPay) || 0), 0);
  const totalPaidAmount = filteredStaff.filter(s => s?.status === 'paid').reduce((acc, curr) => acc + (Number(curr?.netPay) || 0), 0);
  const totalPendingAmount = totalPayrollAmount - totalPaidAmount;

  const handlePrintPayrollSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 min-h-screen bg-dark-bg text-dark-text select-none">
      
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: transparent !important;
          }
          #print-salary-voucher, #print-salary-voucher * {
            visibility: visible;
          }
          #print-salary-voucher {
            position: absolute;
            left: 50%;
            top: 40%;
            transform: translate(-50%, -50%);
            width: 460px !important;
            padding: 1.5cm !important;
            border: 2px solid #000000 !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-emerald-200 animate-pulse" />
            Staff Salary Payroll & Advance Manager
          </h1>
          <p className="text-emerald-100 text-xs md:text-sm font-medium mt-1">
            Automated salary calculations, leave deductions, advance recovery & official printable salary slip vouchers
          </p>
        </div>
        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <button 
            onClick={() => navigate('/school-admin/staff')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-xl border border-white/20 transition-all flex items-center gap-2 backdrop-blur-sm"
          >
            <ArrowLeft size={16} /> Back to Staff Manager
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <GlassCard className="p-5 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Total Payable Payroll ({selectedMonth})</span>
            <span className="text-2xl font-black text-emerald-500 mt-1 block">Rs. {totalPayrollAmount.toLocaleString()}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <DollarSign size={26} />
          </div>
        </GlassCard>

        <GlassCard className="p-5 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block">Disbursed (Paid Out)</span>
            <span className="text-2xl font-black text-cyan-400 mt-1 block">Rs. {totalPaidAmount.toLocaleString()}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <CheckCircle2 size={26} />
          </div>
        </GlassCard>

        <GlassCard className="p-5 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest block">Pending Disbursal</span>
            <span className="text-2xl font-black text-yellow-500 mt-1 block">Rs. {totalPendingAmount.toLocaleString()}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
            <CreditCard size={26} />
          </div>
        </GlassCard>
      </div>

      {/* Control Bar */}
      <GlassCard className="p-6 border-dark-border/40 no-print">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search size={16} className="absolute left-3.5 top-3 text-dark-muted" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff name or designation..."
                className="pl-10 py-2.5 w-full sm:w-[240px] bg-dark-card border border-dark-border rounded-xl text-xs font-bold text-dark-text"
              />
            </div>

            <div>
              <input 
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="py-2 px-3 bg-dark-card border border-dark-border rounded-xl text-xs font-bold text-emerald-400"
              />
            </div>
          </div>

          <button
            onClick={handlePrintPayrollSheet}
            className="px-4 py-2.5 bg-dark-card hover:bg-white/5 border border-dark-border rounded-xl text-xs font-bold flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
          >
            <Printer size={15} /> Print Full Payroll Register
          </button>
        </div>
      </GlassCard>

      {/* Payroll Staff Table */}
      <GlassCard className="p-0 overflow-hidden border border-dark-border shadow-2xl no-print">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <RefreshCw size={30} className="text-emerald-500 animate-spin" />
            <span className="text-xs font-black text-dark-muted uppercase">Calculating Staff Salaries...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-24 text-center text-dark-muted font-bold">No staff records found.</div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-card border-b border-dark-border text-[10px] text-dark-muted font-black uppercase tracking-wider">
                  <th className="py-4 px-4">Staff Member</th>
                  <th className="py-4 px-4 text-right">Basic Pay</th>
                  <th className="py-4 px-4 text-center">Absents</th>
                  <th className="py-4 px-4 text-right">Advance Taken</th>
                  <th className="py-4 px-4 text-right">Allowance</th>
                  <th className="py-4 px-4 text-right">Net Payable Salary</th>
                  <th className="py-4 px-4 text-center">Disbursal Status</th>
                  <th className="py-4 px-4 text-center">Salary Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60 text-xs font-medium">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-4 px-4">
                      <span className="font-extrabold text-dark-text block text-sm">{staff.name}</span>
                      <span className="text-[10px] font-bold text-primary-400">{staff.role}</span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-dark-text font-bold">
                      Rs. {staff.basicPay.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-center font-bold">
                      {staff.absents > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]">
                          {staff.absents} Days (-Rs.{staff.absents * staff.perDay})
                        </span>
                      ) : (
                        <span className="text-green-400 text-[10px]">0 (Full)</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-orange-400 font-bold">
                      {staff.advanceTaken > 0 ? `Rs. ${staff.advanceTaken.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-green-400 font-bold">
                      +{staff.allowance > 0 ? `Rs. ${staff.allowance.toLocaleString()}` : '0'}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-black text-yellow-400 text-sm">
                      Rs. {staff.netPay.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(staff.id, staff.status)}
                        className={`px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-wider transition-all ${
                          staff.status === 'paid'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500 hover:text-black'
                        }`}
                      >
                        {staff.status === 'paid' ? 'PAID ✓' : 'PENDING'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => setSelectedSlip(staff)}
                        className="px-3 py-1.5 rounded-xl bg-primary-500/10 hover:bg-primary-500 hover:text-white text-primary-400 border border-primary-500/20 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 mx-auto transition-all"
                      >
                        <Printer size={12} />
                        <span>Voucher Slip</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* SINGLE SALARY SLIP PRINTABLE MODAL */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 no-print select-none">
          <GlassCard className="p-6 max-w-[460px] w-full border-dark-border relative text-black bg-white select-text">
            <button
              onClick={() => setSelectedSlip(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X size={20} />
            </button>

            <div className="border-2 border-black p-5 rounded-xl flex flex-col justify-between font-sans bg-white min-h-[360px]">
              <div className="flex justify-between border-b-2 border-black pb-2.5 items-center">
                <div>
                  <h3 className="text-xs font-black uppercase text-gray-800 tracking-wide leading-none">{schoolName}</h3>
                  <span className="text-[7.5px] text-gray-500 font-extrabold uppercase">Official Staff Payroll System</span>
                </div>
                <div className="text-right">
                  <span className="inline-block text-[10px] font-black uppercase tracking-widest border border-black py-0.5 px-2 bg-gray-50 text-gray-900 rounded">
                    SALARY SLIP VOUCHER
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b border-gray-200 py-2.5 text-[10px] font-bold text-gray-800 gap-4">
                <div>
                  <span className="text-gray-400 uppercase text-[8px]">Employee Details:</span>
                  <span className="block font-black text-gray-900 text-xs">{selectedSlip.name}</span>
                  <span className="text-[9px] text-gray-600 font-semibold">{selectedSlip.role}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 uppercase text-[8px]">Payroll Month:</span>
                  <span className="block text-gray-900 font-black">{selectedMonth}</span>
                </div>
              </div>

              <div className="flex-1 my-3 text-[11px] space-y-1.5 font-semibold">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span>Basic Salary</span>
                  <span className="font-mono font-bold">Rs. {Number(selectedSlip?.basicPay || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1 text-green-700">
                  <span>+ Monthly Allowances</span>
                  <span className="font-mono font-bold">Rs. {Number(selectedSlip?.allowance || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1 text-red-600">
                  <span>- Absents Deduction ({Number(selectedSlip?.absents || 0)} Days)</span>
                  <span className="font-mono font-bold">Rs. {Number((selectedSlip?.absents || 0) * (selectedSlip?.perDay || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1 text-orange-600">
                  <span>- Advance / Loan Deduction</span>
                  <span className="font-mono font-bold">Rs. {Number(selectedSlip?.advanceTaken || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-gray-100 border border-gray-300 p-3 rounded-xl flex justify-between items-center text-xs font-black text-gray-900">
                <span className="uppercase text-[10px]">Net Payable Amount:</span>
                <span className="text-sm text-emerald-700 font-sans font-black">Rs. {Number(selectedSlip?.netPay || 0).toLocaleString()}</span>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between text-[8px] font-black text-gray-500 uppercase">
                <div className="text-center min-w-[110px]">
                  <div className="h-6 border-b border-gray-300 w-full mb-1"></div>
                  <span>Accountant Signature</span>
                </div>
                <div className="text-center min-w-[110px]">
                  <div className="h-6 border-b border-gray-300 w-full mb-1"></div>
                  <span>Employee Signature</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 border border-emerald-700 text-white hover:bg-emerald-700 font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-md"
              >
                <Printer size={15} />
                <span>Print Official Voucher</span>
              </button>
              <button 
                onClick={() => setSelectedSlip(null)}
                className="py-2.5 px-5 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 font-bold text-xs uppercase"
              >
                Close
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* HIDDEN PRINT CONTAINER */}
      {selectedSlip && (
        <div id="print-salary-voucher" className="hidden print:block text-black bg-white">
          <div className="border-2 border-black p-6 rounded-xl flex flex-col justify-between font-sans bg-white min-h-[380px]">
            <div className="flex justify-between border-b-2 border-black pb-2.5 items-center">
              <div>
                <h3 className="text-xs font-black uppercase text-gray-800 tracking-wide leading-none">{schoolName}</h3>
                <span className="text-[7.5px] text-gray-500 font-extrabold uppercase">Official Staff Payroll System</span>
              </div>
              <div className="text-right">
                <span className="inline-block text-[10px] font-black uppercase tracking-widest border border-black py-0.5 px-2 bg-gray-50 text-gray-900 rounded">
                  SALARY SLIP VOUCHER
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 border-b border-gray-200 py-3 text-[10px] font-bold text-gray-800 gap-4">
              <div>
                <span className="text-gray-400 uppercase text-[8px]">Employee Details:</span>
                <span className="block font-black text-gray-900 text-xs">{selectedSlip.name}</span>
                <span className="text-[9px] text-gray-600 font-semibold">{selectedSlip.role}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 uppercase text-[8px]">Payroll Month:</span>
                <span className="block text-gray-900 font-black">{selectedMonth}</span>
              </div>
            </div>

            <div className="flex-1 my-4 text-[11px] space-y-2 font-semibold">
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span>Basic Salary</span>
                <span className="font-mono font-bold">Rs. {Number(selectedSlip?.basicPay || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1 text-green-700">
                <span>+ Monthly Allowances</span>
                <span className="font-mono font-bold">Rs. {Number(selectedSlip?.allowance || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1 text-red-600">
                <span>- Absents Deduction ({Number(selectedSlip?.absents || 0)} Days)</span>
                <span className="font-mono font-bold">Rs. {Number((selectedSlip?.absents || 0) * (selectedSlip?.perDay || 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1 text-orange-600">
                <span>- Advance / Loan Deduction</span>
                <span className="font-mono font-bold">Rs. {Number(selectedSlip?.advanceTaken || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-gray-100 border border-gray-300 p-3.5 rounded-xl flex justify-between items-center text-xs font-black text-gray-900">
              <span className="uppercase text-[10px]">Net Payable Amount:</span>
              <span className="text-sm text-emerald-700 font-sans font-black">Rs. {Number(selectedSlip?.netPay || 0).toLocaleString()}</span>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between text-[8px] font-black text-gray-500 uppercase">
              <div className="text-center min-w-[120px]">
                <div className="h-6 border-b border-gray-300 w-full mb-1"></div>
                <span>Accountant Signature</span>
              </div>
              <div className="text-center min-w-[120px]">
                <div className="h-6 border-b border-gray-300 w-full mb-1"></div>
                <span>Employee Signature</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PayrollManager;
