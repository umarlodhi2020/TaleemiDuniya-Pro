import React, { useState, useEffect, useMemo } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { Calculator, FileText, Download, Printer, CheckCircle2, AlertCircle, X, CheckSquare, Search, Landmark } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRecords, addRecord, subscribeToCollection } from '../../services/db';

const PayrollManager = () => {
  const { userData, showToast } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Set default month to current month
  const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear);
  
  const [staffData, setStaffData] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Editable Absents state
  const [absentsInput, setAbsentsInput] = useState({});

  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Constants for tax and allowances
  const MEDICAL_ALLOWANCE_PCT = 0.10;
  const TRANSPORT_ALLOWANCE = 5000;

  // Month options (last 6 months and next 2)
  const monthOptions = useMemo(() => {
    const opts = [];
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    for (let i = 0; i < 9; i++) {
      opts.push(d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
      d.setMonth(d.getMonth() + 1);
    }
    return opts;
  }, []);

  useEffect(() => {
    if (!userData?.schoolId) return;

    // Subscribe to staff
    const unsubStaff = subscribeToCollection('staff', userData.schoolId, (data) => {
      setStaffData(data.filter(s => s.status !== 'Inactive'));
    });

    // Subscribe to payroll
    const unsubPayroll = subscribeToCollection('payroll', userData.schoolId, (data) => {
      setPayrollData(data);
      setLoading(false);
    });

    return () => {
      if(unsubStaff) unsubStaff();
      if(unsubPayroll) unsubPayroll();
    };
  }, [userData]);

  const calculateTax = (annualSalary) => {
    // Simplified Tax Bracket
    if (annualSalary > 1200000) return (annualSalary - 1200000) * 0.15 / 12;
    if (annualSalary > 600000) return (annualSalary - 600000) * 0.05 / 12;
    return 0;
  };

  // Combine staff and payroll for the selected month
  const staffList = useMemo(() => {
    return staffData.map(staff => {
      const existingSlip = payrollData.find(p => p.staffId === staff.id && p.month === selectedMonth);
      const absents = absentsInput[staff.id] !== undefined ? absentsInput[staff.id] : 0;
      
      const basicSalary = Number(staff.salary) || 0;

      if (existingSlip) {
        return {
          ...staff,
          basicSalary,
          absents: existingSlip.absents || 0,
          status: 'processed',
          payrollData: existingSlip
        };
      } else {
        return {
          ...staff,
          basicSalary,
          absents,
          status: 'pending',
          payrollData: null
        };
      }
    });
  }, [staffData, payrollData, selectedMonth, absentsInput]);

  const handleAbsentChange = (staffId, value) => {
    setAbsentsInput(prev => ({
      ...prev,
      [staffId]: Number(value) >= 0 ? Number(value) : 0
    }));
  };

  const processStaffPayroll = async (staff) => {
    const basicSalary = staff.basicSalary;
    const medical = basicSalary * MEDICAL_ALLOWANCE_PCT;
    const transport = TRANSPORT_ALLOWANCE;
    const grossSalary = basicSalary + medical + transport;

    const perDaySalary = basicSalary / 30;
    const absentDeduction = staff.absents * perDaySalary;
    const annualSalary = grossSalary * 12;
    const incomeTax = calculateTax(annualSalary);
    
    const totalDeductions = absentDeduction + incomeTax;
    const netSalary = grossSalary - totalDeductions;

    const slip = {
      staffId: staff.id,
      staffName: staff.name,
      staffRole: staff.role,
      staffIdCode: staff.staffId || `EMP-${staff.id.slice(0,4)}`,
      month: selectedMonth,
      absents: staff.absents,
      basicSalary,
      medical,
      transport,
      grossSalary,
      absentDeduction,
      incomeTax,
      totalDeductions,
      netSalary,
      schoolId: userData?.schoolId || 'default-school',
      createdAt: new Date().toISOString()
    };

    try {
      await addRecord('payroll', slip, null, userData?.schoolId || 'default-school');
    } catch (error) {
      console.error("Error processing payroll:", error);
      throw error;
    }
  };

  const handleGeneratePayroll = async (staffId) => {
    setIsProcessing(true);
    try {
      if (staffId === 'all') {
        const pendingStaff = staffList.filter(s => s.status === 'pending' && s.basicSalary > 0);
        for (const s of pendingStaff) {
          await processStaffPayroll(s);
        }
        showToast('success', 'All pending payrolls generated successfully!');
      } else {
        const staff = staffList.find(s => s.id === staffId);
        if (staff && staff.basicSalary > 0) {
          await processStaffPayroll(staff);
          showToast('success', 'Payroll generated successfully!');
        } else {
          showToast('error', 'Staff has no valid salary set.');
        }
      }
    } catch (err) {
      showToast('error', 'Failed to generate payroll.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredStaff = staffList.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-8 text-center text-dark-muted font-bold">Loading Payroll Engine...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in print:p-0 print:bg-white print:text-black">
      
      {/* Header - Hidden in print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
              <Calculator className="text-white" size={28} />
            </div>
            HR & Payroll Engine
          </h1>
          <p className="text-dark-muted mt-2 max-w-2xl">
            Automatically calculate salaries, absents, allowances, and taxes to generate professional payslips.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:border-emerald-500 outline-none appearance-none font-bold"
          >
            {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button 
            onClick={() => handleGeneratePayroll('all')}
            disabled={isProcessing || staffList.every(s => s.status === 'processed' || s.basicSalary === 0)}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? <AlertCircle className="animate-spin" size={18} /> : <CheckSquare size={18} />}
            Process All
          </button>
        </div>
      </div>

      {/* Main Content - Hidden in Print if Payslip is open */}
      <div className={`space-y-6 ${selectedPayslip ? 'print:hidden' : ''}`}>
        
        {/* Search Bar */}
        <div className="relative print:hidden">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={20} />
          <input 
            type="text" 
            placeholder="Search staff by name or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-xl pl-12 p-4 text-white focus:border-emerald-500 outline-none shadow-sm"
          />
        </div>

        {/* Staff Table */}
        <GlassCard className="p-0 overflow-hidden print:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-dark-bg border-b border-dark-border">
                  <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Staff Details</th>
                  <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Base Salary</th>
                  <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Absents</th>
                  <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/50">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white">{staff.name}</p>
                      <p className="text-xs text-emerald-400 font-mono mt-1">{staff.role || 'Staff'}</p>
                    </td>
                    <td className="p-4 font-mono text-white font-bold">
                      Rs {staff.basicSalary.toLocaleString()}
                    </td>
                    <td className="p-4">
                      {staff.status === 'processed' ? (
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${staff.absents > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {staff.absents} Days
                        </span>
                      ) : (
                        <input 
                          type="number" 
                          min="0"
                          max="31"
                          value={staff.absents}
                          onChange={(e) => handleAbsentChange(staff.id, e.target.value)}
                          className="w-16 bg-dark-bg border border-dark-border rounded-lg px-2 py-1 text-white focus:border-emerald-500 outline-none text-center"
                        />
                      )}
                    </td>
                    <td className="p-4">
                      {staff.status === 'processed' ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full w-fit border border-emerald-500/20">
                          <CheckCircle2 size={14} /> Processed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full w-fit border border-amber-500/20">
                          <AlertCircle size={14} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      {staff.status === 'pending' ? (
                        <button 
                          onClick={() => handleGeneratePayroll(staff.id)}
                          disabled={isProcessing || staff.basicSalary === 0}
                          className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          Calculate
                        </button>
                      ) : (
                        <button 
                          onClick={() => setSelectedPayslip(staff)}
                          className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-2"
                        >
                          <FileText size={16} /> View Payslip
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-dark-muted font-bold">
                      No staff records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* Payslip Modal (Also used for printing) */}
      {selectedPayslip && selectedPayslip.payrollData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:static print:h-auto bg-black/60 backdrop-blur-sm print:bg-transparent print:backdrop-blur-none animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl print:shadow-none print:border-0 print:rounded-none">
            
            {/* Modal Header (Hidden in Print) */}
            <div className="p-4 bg-dark-bg border-b border-dark-border flex justify-between items-center print:hidden">
              <h3 className="font-bold text-white flex items-center gap-2">
                <FileText className="text-blue-400" size={20} /> Salary Slip Generated
              </h3>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="p-2 bg-dark-card border border-dark-border text-white hover:text-blue-400 rounded-lg transition-colors cursor-pointer" title="Print PDF">
                  <Printer size={18} />
                </button>
                <button onClick={() => setSelectedPayslip(null)} className="p-2 bg-dark-card border border-dark-border text-white hover:text-red-400 rounded-lg transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Payslip Content */}
            <div className="p-8 print:p-0 bg-white text-black print:text-black print:mt-10">
              
              {/* School Header */}
              <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-6">
                <div>
                  <h1 className="text-3xl font-black text-indigo-900 tracking-tight flex items-center gap-2">
                    <Landmark size={28} /> {userData?.schoolName || 'TaleemiDunya School'}
                  </h1>
                  <p className="text-gray-500 mt-1">{userData?.schoolAddress || 'School Address Line'}</p>
                  <p className="text-gray-500">info@taleemidunya.com</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-widest">Payslip</h2>
                  <p className="text-indigo-600 font-bold mt-1 bg-indigo-50 px-3 py-1 rounded-md inline-block">For the month of {selectedPayslip.payrollData.month}</p>
                </div>
              </div>

              {/* Employee Details */}
              <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <div className="space-y-2">
                  <p className="flex justify-between"><span className="text-gray-500 font-bold">Employee Name:</span> <span className="font-bold text-gray-800">{selectedPayslip.payrollData.staffName}</span></p>
                  <p className="flex justify-between"><span className="text-gray-500 font-bold">Designation:</span> <span className="font-bold text-gray-800">{selectedPayslip.payrollData.staffRole || 'Staff'}</span></p>
                  <p className="flex justify-between"><span className="text-gray-500 font-bold">Employee ID:</span> <span className="font-mono text-gray-800">{selectedPayslip.payrollData.staffIdCode}</span></p>
                </div>
                <div className="space-y-2">
                  <p className="flex justify-between"><span className="text-gray-500 font-bold">Total Days:</span> <span className="font-bold text-gray-800">30</span></p>
                  <p className="flex justify-between"><span className="text-gray-500 font-bold">Absents:</span> <span className="font-bold text-red-600">{selectedPayslip.payrollData.absents}</span></p>
                  <p className="flex justify-between"><span className="text-gray-500 font-bold">Payment Mode:</span> <span className="font-bold text-gray-800">Bank Transfer / Cash</span></p>
                </div>
              </div>

              {/* Financials Table */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                {/* Earnings */}
                <div>
                  <h3 className="text-lg font-black text-gray-800 border-b-2 border-green-500 pb-2 mb-4 uppercase tracking-wider">Earnings</h3>
                  <div className="space-y-3 font-mono text-sm">
                    <p className="flex justify-between"><span className="text-gray-600">Basic Salary</span> <span className="font-bold">Rs {selectedPayslip.payrollData.basicSalary.toLocaleString()}</span></p>
                    <p className="flex justify-between"><span className="text-gray-600">Medical Allowance (10%)</span> <span className="font-bold">Rs {selectedPayslip.payrollData.medical.toLocaleString()}</span></p>
                    <p className="flex justify-between"><span className="text-gray-600">Transport Allowance</span> <span className="font-bold">Rs {selectedPayslip.payrollData.transport.toLocaleString()}</span></p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between font-bold text-green-700 bg-green-50 p-2 rounded-md">
                    <span>Gross Earnings</span>
                    <span>Rs {selectedPayslip.payrollData.grossSalary.toLocaleString()}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h3 className="text-lg font-black text-gray-800 border-b-2 border-red-500 pb-2 mb-4 uppercase tracking-wider">Deductions</h3>
                  <div className="space-y-3 font-mono text-sm">
                    <p className="flex justify-between"><span className="text-gray-600">Unpaid Leaves ({selectedPayslip.payrollData.absents})</span> <span className="font-bold text-red-600">Rs {selectedPayslip.payrollData.absentDeduction.toFixed(0).toLocaleString()}</span></p>
                    <p className="flex justify-between"><span className="text-gray-600">Income Tax (Est.)</span> <span className="font-bold text-red-600">Rs {selectedPayslip.payrollData.incomeTax.toFixed(0).toLocaleString()}</span></p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between font-bold text-red-700 bg-red-50 p-2 rounded-md">
                    <span>Total Deductions</span>
                    <span>Rs {selectedPayslip.payrollData.totalDeductions.toFixed(0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="bg-indigo-900 text-white rounded-xl p-6 flex items-center justify-between shadow-lg print:shadow-none print:border-2 print:border-black print:bg-white print:text-black">
                <div>
                  <p className="text-indigo-200 font-bold uppercase tracking-wider text-sm print:text-gray-600">Net Payable Amount</p>
                  <p className="text-xs text-indigo-300 mt-1 print:text-gray-500">Amount transferred to registered bank account.</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black font-mono tracking-tight">Rs {selectedPayslip.payrollData.netSalary.toFixed(0).toLocaleString()}</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 mt-16 pt-8 border-t border-gray-200 text-center text-sm font-bold text-gray-500 uppercase tracking-wider">
                <div>
                  <div className="w-48 border-b-2 border-gray-300 mx-auto mb-2"></div>
                  Employer Signature
                </div>
                <div>
                  <div className="w-48 border-b-2 border-gray-300 mx-auto mb-2"></div>
                  Employee Signature
                </div>
              </div>

              <div className="mt-12 text-center text-[10px] text-gray-400 print:text-gray-500">
                <p>This is a computer-generated document and does not require a physical signature.</p>
                <p>Generated securely by TaleemiDunya-Pro AI Payroll Engine.</p>
              </div>

            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed, .fixed * {
            visibility: visible;
          }
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default PayrollManager;
