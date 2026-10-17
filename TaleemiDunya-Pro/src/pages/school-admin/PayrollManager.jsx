import React, { useState, useEffect, useMemo } from 'react';
import GlassCard from '../../components/common/GlassCard';
import PayslipModal from '../../components/common/PayslipModal';
import BatchPayslipModal from '../../components/common/BatchPayslipModal';
import StaffPayrollHistoryModal from '../../components/common/StaffPayrollHistoryModal';
import { 
  Calculator, FileText, Printer, CheckCircle2, AlertCircle, X, 
  CheckSquare, Search, Landmark, Clock, UserCheck, Users, 
  TrendingUp, TrendingDown, DollarSign, Filter, RefreshCw, Layers, Calendar, ShieldAlert, History, Download, Lock, ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRecords, addRecord, subscribeToCollection } from '../../services/db';
import { 
  calculateMonthlyPayroll, 
  validatePayrollEligibility, 
  formatPeriod, 
  summarizeStaffAttendance,
  isAuthorizedPayrollAdmin,
  exportPayrollReportToCSV,
  finalizePayrollMonth
} from '../../utils/payrollUtils';

import PayrollReports from './PayrollReports';

const PayrollManager = () => {
  const { userData, showToast } = useAuth();
  
  const [activeTab, setActiveTab] = useState('processing');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  
  // Set default period to current YYYY-MM
  const currentPeriod = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
  const [staffData, setStaffData] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [historyStaff, setHistoryStaff] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showBatchPayslipModal, setShowBatchPayslipModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  // Administrative Authorization Flag
  const isAuthorized = useMemo(() => {
    return isAuthorizedPayrollAdmin(userData);
  }, [userData]);

  // Month options (last 6 months and next 2) in YYYY-MM format
  const monthOptions = useMemo(() => {
    const opts = [];
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    for (let i = 0; i < 9; i++) {
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${year}-${monthNum}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      opts.push({ value: val, label });
      d.setMonth(d.getMonth() + 1);
    }
    return opts;
  }, []);

  // Department options dynamically populated from staffData
  const departmentOptions = useMemo(() => {
    const deps = new Set();
    staffData.forEach(s => {
      if (s.department) deps.add(s.department.trim());
    });
    return Array.from(deps).sort();
  }, [staffData]);

  useEffect(() => {
    if (!userData?.schoolId) return;

    // Subscribe to staff with school isolation
    const unsubStaff = subscribeToCollection('staff', userData.schoolId, (data) => {
      setStaffData(data);
    });

    // Subscribe to payroll with school isolation
    const unsubPayroll = subscribeToCollection('payroll', userData.schoolId, (data) => {
      setPayrollData(data);
      setLoading(false);
    });

    // Subscribe to attendance with school isolation
    const unsubAtt = subscribeToCollection('attendance', userData.schoolId, (data) => {
      setAttendanceData(data);
    });

    // Subscribe to audit logs with school isolation
    const unsubAudit = subscribeToCollection('audit_logs', userData.schoolId, (data) => {
      const payrollLogs = (data || [])
        .filter(l => l.action === 'PAYROLL_FINALIZED' || l.action?.startsWith('PAYROLL_'))
        .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));
      setAuditLogs(payrollLogs);
    });

    return () => {
      if (unsubStaff) unsubStaff();
      if (unsubPayroll) unsubPayroll();
      if (unsubAtt) unsubAtt();
      if (unsubAudit) unsubAudit();
    };
  }, [userData]);

  // Combine staff, attendance, and payroll for the selected period
  const staffList = useMemo(() => {
    return staffData.map(staff => {
      const existingSlip = payrollData.find(
        p => p.staffId === staff.id && (p.period === selectedPeriod || p.month === selectedPeriod)
      );

      const staffStatus = staff.status || 'Active';

      const isCompletedStatus = existingSlip && (
        existingSlip.status === 'Processed' ||
        existingSlip.status === 'processed' ||
        existingSlip.status === 'Locked' ||
        existingSlip.status === 'Finalized' ||
        existingSlip.status === 'locked'
      );

      if (isCompletedStatus) {
        // PROCESSED / LOCKED STATE: Use historical snapshot exclusively
        const attSummary = {
          hasData: true,
          totalWorkingDays: Number(existingSlip.totalWorkingDays ?? 26),
          presentDays: Number(existingSlip.presentDays ?? 0),
          absentDays: Number(existingSlip.absentDays ?? 0),
          halfDays: Number(existingSlip.halfDays ?? 0),
          leaveDays: Number(existingSlip.leaveDays ?? 0),
          paidEquivalentDays: Number(existingSlip.paidEquivalentDays ?? 0),
          attendanceDeductionDays: Number(existingSlip.attendanceDeductionDays ?? existingSlip.deductionDays ?? 0)
        };

        return {
          ...staff,
          staffStatus,
          department: staff.department || existingSlip.staffDepartment || 'N/A',
          basicSalary: Number(existingSlip.basicSalary ?? 0),
          medicalAllowance: Number(existingSlip.medicalAllowance ?? 0),
          transportAllowance: Number(existingSlip.transportAllowance ?? 0),
          totalAllowances: Number(existingSlip.totalAllowances ?? 0),
          grossSalary: Number(existingSlip.grossSalary ?? 0),
          attendanceDeduction: Number(existingSlip.attendanceDeduction ?? 0),
          otherDeductions: Number(existingSlip.otherDeductions ?? 0),
          totalDeductions: Number(existingSlip.totalDeductions ?? 0),
          netSalary: Number(existingSlip.netSalary ?? 0),
          status: existingSlip.status || 'Processed',
          payrollData: existingSlip,
          attSummary
        };
      } else {
        // DRAFT STATE: Calculate preview dynamically from current setup & live attendance
        const attSummary = summarizeStaffAttendance(attendanceData, staff.id, selectedPeriod, staff.payrollSetup?.workingDays || 26);
        const calc = calculateMonthlyPayroll(staff.payrollSetup, staff.salary, attSummary);

        return {
          ...staff,
          staffStatus,
          department: staff.department || 'N/A',
          basicSalary: calc.basicSalary,
          medicalAllowance: calc.medicalAllowance,
          transportAllowance: calc.transportAllowance,
          totalAllowances: calc.totalAllowances,
          grossSalary: calc.grossSalary,
          attendanceDeduction: calc.attendanceDeduction,
          otherDeductions: calc.otherDeductions,
          totalDeductions: calc.totalDeductions,
          netSalary: calc.netSalary,
          status: 'Draft',
          payrollData: null,
          attSummary
        };
      }
    });
  }, [staffData, payrollData, attendanceData, selectedPeriod]);

  // Filtered staff list for table display based on search, status filter, & department filter
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const matchesSearch = !searchTerm || 
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.staffId && String(s.staffId).toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
      const matchesDept = departmentFilter === 'All' || s.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [staffList, searchTerm, statusFilter, departmentFilter]);

  // Month lock status for selectedPeriod
  const periodMonthStatus = useMemo(() => {
    const periodRecords = payrollData.filter(p => (p.period === selectedPeriod || p.month === selectedPeriod) && (p.schoolId === userData?.schoolId || !p.schoolId));
    if (periodRecords.length === 0) return 'Draft';
    const hasLocked = periodRecords.some(p => p.status === 'Locked' || p.status === 'Finalized');
    if (hasLocked) return 'Locked';
    const hasProcessed = periodRecords.some(p => p.status === 'Processed' || p.status === 'processed');
    if (hasProcessed) return 'Processed';
    return 'Draft';
  }, [payrollData, selectedPeriod, userData]);

  const processedPeriodRecords = useMemo(() => {
    return payrollData.filter(p => 
      (p.period === selectedPeriod || p.month === selectedPeriod) && 
      (p.schoolId === userData?.schoolId || !p.schoolId) &&
      (p.status === 'Processed' || p.status === 'processed' || p.status === 'Locked' || p.status === 'Finalized' || p.status === 'locked')
    );
  }, [payrollData, selectedPeriod, userData]);

  const isPeriodLocked = periodMonthStatus === 'Locked';



  const handleConfirmFinalize = async () => {
    if (!isAuthorized) {
      if (showToast) showToast('error', 'You do not have administrative permission to finalize payroll.');
      else alert('You do not have administrative permission to finalize payroll.');
      return;
    }

    setIsFinalizing(true);

    try {
      const res = await finalizePayrollMonth(selectedPeriod, userData.schoolId, userData);
      if (res && res.success) {
        const msg = `Payroll for ${formatPeriod(selectedPeriod)} finalized and locked successfully (${res.finalizedCount} staff record(s) locked).`;
        if (showToast) showToast('success', msg);
        else alert(msg);
        setShowFinalizeModal(false);
      } else {
        throw new Error(res?.error || 'Failed to finalize payroll.');
      }
    } catch (err) {
      console.error('Error finalizing month:', err);
      if (showToast) showToast('error', err.message || 'Failed to finalize payroll.');
      else alert(err.message || 'Failed to finalize payroll.');
    } finally {
      setIsFinalizing(false);
    }
  };

  // Executive Metrics (Dynamically aggregated from filteredStaff dataset)
  const monthMetrics = useMemo(() => {
    const totalEmployees = filteredStaff.length;

    let processedCount = 0;
    let draftCount = 0;
    let grossPayroll = 0;
    let totalDeductions = 0;
    let netPayroll = 0;

    let totalWorkingDays = 0;
    let totalPresentDays = 0;
    let totalAbsentDays = 0;
    let totalHalfDays = 0;
    let totalPaidDays = 0;
    let totalDeductionDays = 0;
    let totalAttendanceDeduction = 0;

    filteredStaff.forEach(s => {
      if (s.status === 'Processed') {
        processedCount += 1;
        grossPayroll += Number(s.grossSalary || 0);
        totalDeductions += Number(s.totalDeductions || 0);
        netPayroll += Number(s.netSalary || 0);

        if (s.attSummary) {
          totalWorkingDays += Number(s.attSummary.totalWorkingDays || 26);
          totalPresentDays += Number(s.attSummary.presentDays || 0);
          totalAbsentDays += Number(s.attSummary.absentDays || 0);
          totalHalfDays += Number(s.attSummary.halfDays || 0);
          totalPaidDays += Number(s.attSummary.paidEquivalentDays || 0);
          totalDeductionDays += Number(s.attSummary.attendanceDeductionDays || 0);
        }
        totalAttendanceDeduction += Number(s.attendanceDeduction || 0);
      } else {
        draftCount += 1;
      }
    });

    return {
      totalEmployees,
      processedCount,
      draftCount,
      grossPayroll,
      totalDeductions,
      netPayroll,
      totalWorkingDays,
      totalPresentDays,
      totalAbsentDays,
      totalHalfDays,
      totalPaidDays,
      totalDeductionDays,
      totalAttendanceDeduction
    };
  }, [filteredStaff]);

  // Department-Wise Financial Analytics Breakdown
  const departmentMetrics = useMemo(() => {
    const map = new Map();

    filteredStaff.forEach(s => {
      const dept = s.department?.trim() || 'General / Unassigned';
      if (!map.has(dept)) {
        map.set(dept, { dept, count: 0, gross: 0, deductions: 0, net: 0, processedCount: 0 });
      }
      const item = map.get(dept);
      item.count += 1;
      if (s.status === 'Processed') {
        item.processedCount += 1;
        item.gross += Number(s.grossSalary || 0);
        item.deductions += Number(s.totalDeductions || 0);
        item.net += Number(s.netSalary || 0);
      }
    });

    const list = Array.from(map.values()).sort((a, b) => b.net - a.net);
    const totalNet = list.reduce((sum, d) => sum + d.net, 0);

    return list.map(d => ({
      ...d,
      sharePct: totalNet > 0 ? Math.round((d.net / totalNet) * 100) : 0
    }));
  }, [filteredStaff]);

  // Cross-Period Historical Monthly Payroll Cost Trend (Last 6 Months)
  const monthlyTrend = useMemo(() => {
    if (!Array.isArray(payrollData)) return [];

    const map = new Map();
    payrollData.forEach(p => {
      if (p.status === 'Processed' || p.status === 'processed') {
        const per = p.period || p.month || 'Unknown';
        if (!map.has(per)) {
          map.set(per, { period: per, count: 0, gross: 0, deductions: 0, net: 0 });
        }
        const item = map.get(per);
        item.count += 1;
        item.gross += Number(p.grossSalary || 0);
        item.deductions += Number(p.totalDeductions || 0);
        item.net += Number(p.netSalary || 0);
      }
    });

    return Array.from(map.values())
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-6);
  }, [payrollData]);

  const handleExportReportCSV = () => {
    if (filteredStaff.length === 0) {
      if (showToast) showToast('info', 'No payroll records available for export matching current filters.');
      else alert('No payroll records available for export matching current filters.');
      return;
    }
    const ok = exportPayrollReportToCSV(filteredStaff, selectedPeriod);
    if (ok && showToast) {
      showToast('success', `Exported payroll report for ${filteredStaff.length} staff record(s).`);
    }
  };

  const processStaffPayroll = async (staff) => {
    // 0. Handler-Level Administrative Authorization Guard
    if (!isAuthorizedPayrollAdmin(userData)) {
      const msg = "You do not have administrative permission to process or modify payroll.";
      if (showToast) showToast('error', msg);
      else alert(msg);
      return false;
    }

    // 1. Verify staff lifecycle status
    const staffStatus = staff.staffStatus || staff.status || 'Active';
    if (staffStatus !== 'Active') {
      const msg = `Payroll can only be processed for Active staff members. Current status: "${staffStatus}".`;
      if (showToast) showToast('error', msg);
      else alert(msg);
      return false;
    }

    const attSummary = summarizeStaffAttendance(attendanceData, staff.id, selectedPeriod, staff.payrollSetup?.workingDays || 26);
    const calc = calculateMonthlyPayroll(staff.payrollSetup, staff.salary, attSummary);
    const check = validatePayrollEligibility(staff, calc, attSummary, userData);

    if (!check.valid) {
      if (showToast) showToast('error', check.error);
      else alert(check.error);
      return false;
    }

    // 2. Re-verify duplicate processing in database records
    const existingSlip = payrollData.find(
      p => p.staffId === staff.id && (p.period === selectedPeriod || p.month === selectedPeriod)
    );
    
    if (existingSlip && (existingSlip.status === 'Processed' || existingSlip.status === 'processed')) {
      const msg = `Payroll for ${formatPeriod(selectedPeriod)} has already been processed for ${staff.name}.`;
      if (showToast) showToast('error', msg);
      else alert(msg);
      return false;
    }

    // 3. Build immutable snapshot record
    const slip = {
      staffId: staff.id,
      staffName: staff.name,
      staffRole: staff.role || 'Staff',
      staffDepartment: staff.department || 'N/A',
      staffIdCode: staff.staffId || `EMP-${staff.id.slice(0, 4)}`,
      period: selectedPeriod,
      month: selectedPeriod,

      // Attendance Snapshot
      totalWorkingDays: calc.totalWorkingDays,
      presentDays: calc.presentDays,
      absentDays: calc.absentDays,
      halfDays: calc.halfDays,
      leaveDays: calc.leaveDays || 0,
      paidEquivalentDays: calc.paidEquivalentDays,
      attendanceDeductionDays: calc.attendanceDeductionDays,
      attendanceDeduction: calc.attendanceDeduction,

      // Financial Snapshot
      basicSalary: calc.basicSalary,
      medicalAllowance: calc.medicalAllowance,
      transportAllowance: calc.transportAllowance,
      totalAllowances: calc.totalAllowances,
      grossSalary: calc.grossSalary,
      otherDeductions: calc.otherDeductions,
      totalDeductions: calc.totalDeductions,
      netSalary: calc.netSalary,

      status: 'Processed',
      schoolId: userData?.schoolId || 'default-school',
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: userData?.email || userData?.uid || 'Admin'
    };

    try {
      const res = await addRecord('payroll', slip, userData?.schoolId || 'default-school');
      if (res && res.success) {
        return true;
      }
      throw new Error(res?.error?.message || 'Database write failed');
    } catch (error) {
      console.error("Error processing payroll:", error);
      if (showToast) showToast('error', `Failed to process payroll for ${staff.name}: ${error?.message || 'Database write error'}`);
      return false;
    }
  };

  const handleGeneratePayroll = async (staffId) => {
    // Handler Guard: Authorization Check & Double-Submission Lock
    if (!isAuthorized) {
      if (showToast) showToast('error', 'You do not have permission to process or modify payroll.');
      return;
    }

    if (isProcessing) return; // Prevent double-clicks

    setIsProcessing(true);
    try {
      if (staffId === 'all') {
        const eligibleStaff = staffList.filter(
          s => s.status === 'Draft' && s.basicSalary > 0 && s.staffStatus === 'Active'
        );
        if (eligibleStaff.length === 0) {
          if (showToast) showToast('info', 'No eligible draft staff members for processing.');
          setIsProcessing(false);
          return;
        }

        let processedCount = 0;
        for (const s of eligibleStaff) {
          const ok = await processStaffPayroll(s);
          if (ok) processedCount++;
        }
        if (showToast) showToast('success', `Processed payroll for ${processedCount} staff member(s).`);
      } else {
        const staff = staffList.find(s => s.id === staffId);
        if (staff) {
          if (staff.status === 'Processed') {
            if (showToast) showToast('info', `Payroll for ${staff.name} is already Processed.`);
            setIsProcessing(false);
            return;
          }
          const ok = await processStaffPayroll(staff);
          if (ok && showToast) {
            showToast('success', `Payroll for ${staff.name} processed successfully!`);
          }
        }
      }
    } catch (err) {
      console.error('Error generating payroll:', err);
      if (showToast) showToast('error', 'Failed to generate payroll.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-dark-muted font-bold animate-fade-in">
        Loading Payroll Engine & Overview Dashboard...
      </div>
    );
  }

  const allProcessed = staffList.length > 0 && staffList.every(s => s.status === 'Processed' || s.basicSalary === 0 || s.staffStatus !== 'Active');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in print:p-0 print:bg-white print:text-black">
      
      {/* Module Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-dark-border/60 pb-3 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('processing')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'processing'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-dark-bg/60 text-dark-muted hover:text-white border border-dark-border'
          }`}
        >
          <Calculator size={18} /> Payroll Processing & Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
              : 'bg-dark-bg/60 text-dark-muted hover:text-white border border-dark-border'
          }`}
        >
          <FileText size={18} /> Payroll Reports & Export
        </button>
      </div>

      {activeTab === 'reports' ? (
        <PayrollReports />
      ) : (
        <>
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
              <Calculator className="text-white" size={28} />
            </div>
            HR & Payroll Engine
          </h1>
          <p className="text-slate-500 dark:text-dark-muted mt-1 max-w-2xl text-sm">
            Executive management dashboard & monthly payroll processing engine (Period: <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{formatPeriod(selectedPeriod)}</span>).
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl px-3 py-1.5">
            <Calendar size={18} className="text-emerald-600 dark:text-emerald-400" />
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white font-bold outline-none cursor-pointer text-sm"
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value} className="bg-white dark:bg-dark-card text-slate-900 dark:text-white">{m.label}</option>
              ))}
            </select>
          </div>

          {/* Month Status Badge */}
          {isPeriodLocked ? (
            <span className="px-3.5 py-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 uppercase">
              <Lock size={14} className="text-indigo-400" /> Locked & Finalized
            </span>
          ) : periodMonthStatus === 'Processed' ? (
            <span className="px-3.5 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 uppercase">
              <CheckCircle2 size={14} className="text-emerald-400" /> Processed
            </span>
          ) : (
            <span className="px-3.5 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 uppercase">
              <Clock size={14} className="text-amber-400" /> Pending / Draft
            </span>
          )}

          <button 
            onClick={handleExportReportCSV}
            disabled={filteredStaff.length === 0}
            title="Export Currently Filtered Payroll Report to CSV"
            className="px-4 py-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white font-bold transition-all flex items-center gap-2 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} /> Export CSV
          </button>

          {processedPeriodRecords.length > 0 && (
            <button
              onClick={() => setShowBatchPayslipModal(true)}
              title="Print All Salary Slips for Period"
              className="px-4 py-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white font-bold transition-all flex items-center gap-2 cursor-pointer text-sm"
            >
              <Printer size={18} /> Batch Salary Slips ({processedPeriodRecords.length})
            </button>
          )}

          {!isPeriodLocked && periodMonthStatus === 'Processed' && (
            <button
              onClick={() => setShowFinalizeModal(true)}
              disabled={!isAuthorized || isFinalizing}
              title="Finalize & Lock Payroll for this Month"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock size={18} /> Finalize Month
            </button>
          )}

          <button 
            onClick={() => handleGeneratePayroll('all')}
            disabled={isProcessing || allProcessed || !isAuthorized || isPeriodLocked}
            title={isPeriodLocked ? "Month is locked against modification" : !isAuthorized ? "Administrative permission required to process payroll" : "Process All Eligible Staff"}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? <AlertCircle className="animate-spin" size={18} /> : <CheckSquare size={18} />}
            Process All Eligible
          </button>
        </div>
      </div>

      {/* Permission Warning Banner if non-admin */}
      {!isAuthorized && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-300 text-xs font-medium print:hidden">
          <ShieldAlert size={20} className="text-amber-400 shrink-0" />
          <span>
            <strong>Read-Only Mode:</strong> Your user account does not have administrative permission to process or modify payroll records.
          </span>
        </div>
      )}

      {/* Executive Summary Analytics Cards Grid (Phase 6.7) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 print:hidden">
        
        {/* Card 1: Total Employees */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-muted uppercase tracking-wider">Total Staff</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{monthMetrics.totalEmployees}</p>
            <p className="text-[10px] text-dark-muted mt-0.5">Staff in Period</p>
          </div>
        </GlassCard>

        {/* Card 2: Processed Count */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Processed</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{monthMetrics.processedCount}</p>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500/80 mt-0.5">Finalized Slips</p>
          </div>
        </GlassCard>

        {/* Card 3: Draft Count */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Draft</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{monthMetrics.draftCount}</p>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-500/80 mt-0.5">Pending Action</p>
          </div>
        </GlassCard>

        {/* Card 4: Gross Payroll */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-muted uppercase tracking-wider">Gross Payroll</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-lg font-black text-slate-900 dark:text-white font-mono">Rs. {monthMetrics.grossPayroll.toLocaleString()}</p>
            <p className="text-[10px] text-dark-muted mt-0.5">Basic + Allowances</p>
          </div>
        </GlassCard>

        {/* Card 5: Total Deductions */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Deductions</span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-lg font-black text-red-400 font-mono">- Rs. {monthMetrics.totalDeductions.toLocaleString()}</p>
            <p className="text-[10px] text-red-400/80 mt-0.5">Att. + Fixed Deductions</p>
          </div>
        </GlassCard>

        {/* Card 6: Net Payroll */}
        <GlassCard className="p-4 flex flex-col justify-between bg-gradient-to-br from-emerald-950/40 to-teal-950/40 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Net Payable</span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl font-black text-emerald-300 font-mono">Rs. {monthMetrics.netPayroll.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-400/90 mt-0.5 font-bold">Processed Monthly Total</p>
          </div>
        </GlassCard>

      </div>

      {/* Attendance Analytics Snapshot Card */}
      {monthMetrics.processedCount > 0 && (
        <GlassCard className="p-4 print:hidden border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-indigo-200 dark:border-indigo-500/20 pb-2">
            <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} /> Attendance Snapshot Analytics ({monthMetrics.processedCount} Processed Staff)
            </h3>
            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
              Total Attendance Deductions: - Rs. {monthMetrics.totalAttendanceDeduction.toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center font-mono text-xs">
            <div className="p-2 bg-white dark:bg-dark-bg/60 rounded-xl border border-slate-200 dark:border-dark-border shadow-xs">
              <p className="text-[10px] text-dark-muted font-bold uppercase">Present Days</p>
              <p className="text-base font-black text-emerald-600 dark:text-green-400 mt-0.5">{monthMetrics.totalPresentDays}</p>
            </div>
            <div className="p-2 bg-white dark:bg-dark-bg/60 rounded-xl border border-slate-200 dark:border-dark-border shadow-xs">
              <p className="text-[10px] text-dark-muted font-bold uppercase">Absent Days</p>
              <p className="text-base font-black text-red-600 dark:text-red-400 mt-0.5">{monthMetrics.totalAbsentDays}</p>
            </div>
            <div className="p-2 bg-white dark:bg-dark-bg/60 rounded-xl border border-slate-200 dark:border-dark-border shadow-xs">
              <p className="text-[10px] text-dark-muted font-bold uppercase">Half Days</p>
              <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">{monthMetrics.totalHalfDays}</p>
            </div>
            <div className="p-2 bg-white dark:bg-dark-bg/60 rounded-xl border border-slate-200 dark:border-dark-border shadow-xs">
              <p className="text-[10px] text-dark-muted font-bold uppercase">Paid Days</p>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-300 mt-0.5">{monthMetrics.totalPaidDays}</p>
            </div>
            <div className="p-2 bg-white dark:bg-dark-bg/60 rounded-xl border border-slate-200 dark:border-dark-border shadow-xs">
              <p className="text-[10px] text-dark-muted font-bold uppercase">Deduction Days</p>
              <p className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">{monthMetrics.totalDeductionDays}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Department Breakdown & Monthly Trend Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
        
        {/* Department Financial Breakdown */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-dark-border pb-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} className="text-purple-600 dark:text-purple-400" /> Department Financial Payroll Breakdown
              </h3>
              <span className="text-[11px] font-mono text-dark-muted font-bold">
                {departmentMetrics.length} Active Depts
              </span>
            </div>

            <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
              {departmentMetrics.map(dept => (
                <div key={dept.dept} className="p-3 bg-slate-50 dark:bg-dark-bg/60 border border-slate-200 dark:border-dark-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-900 dark:text-white flex items-center gap-2">
                      {dept.dept}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                        {dept.count} Staff ({dept.processedCount} Processed)
                      </span>
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      Rs. {dept.net.toLocaleString()} ({dept.sharePct}%)
                    </span>
                  </div>
                  {/* Share Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-dark-card h-2 rounded-full overflow-hidden border border-slate-300/60 dark:border-dark-border">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-emerald-500 h-full transition-all duration-500 rounded-full" 
                      style={{ width: `${Math.max(5, dept.sharePct)}%` }}
                    />
                  </div>
                </div>
              ))}

              {departmentMetrics.length === 0 && (
                <p className="text-xs text-center text-dark-muted py-6 font-bold">
                  No department financial data available for selected filters.
                </p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Monthly Historical Trend */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-dark-border pb-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" /> Historical Monthly Net Payroll Cost Trend
              </h3>
              <span className="text-[11px] font-mono text-dark-muted font-bold">Last 6 Cycles</span>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {monthlyTrend.map((trend) => (
                <div key={trend.period} className="p-3 bg-slate-50 dark:bg-dark-bg/60 border border-slate-200 dark:border-dark-border rounded-xl flex items-center justify-between font-mono text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{formatPeriod(trend.period)}</p>
                    <p className="text-[10px] text-dark-muted mt-0.5">
                      {trend.count} Processed Slips
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      Rs. {trend.net.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-dark-muted mt-0.5">
                      Gross: Rs. {trend.gross.toLocaleString()} | Ded: -Rs. {trend.deductions.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}

              {monthlyTrend.length === 0 && (
                <p className="text-xs text-center text-dark-muted py-6 font-bold">
                  No historical processed payroll cycles recorded yet.
                </p>
              )}
            </div>
          </div>
        </GlassCard>

      </div>

      {/* Main Table & Filters Area */}
      <div className={`space-y-4 ${selectedPayslip ? 'print:hidden' : ''}`}>
        
        {/* Interactive Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-center gap-3 print:hidden">
          
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search staff by name, role, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl pl-10 p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-dark-muted focus:border-emerald-500 outline-none shadow-sm font-medium"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-600 dark:text-dark-muted uppercase whitespace-nowrap hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-auto bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option value="All">All Statuses ({monthMetrics.totalEmployees})</option>
              <option value="Processed">Processed Only ({monthMetrics.processedCount})</option>
              <option value="Draft">Draft Only ({monthMetrics.draftCount})</option>
            </select>
          </div>

          {/* Department Filter Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-600 dark:text-dark-muted uppercase whitespace-nowrap hidden sm:inline">Dept:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full md:w-auto bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option value="All">All Departments</option>
              {departmentOptions.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Staff & Payroll Table */}
        <GlassCard className="p-0 overflow-hidden print:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-dark-bg border-b border-slate-200 dark:border-dark-border">
                  <th className="p-4 text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider">Staff Details</th>
                  <th className="p-4 text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider">Department</th>
                  <th className="p-4 text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider">Basic Salary</th>
                  <th className="p-4 text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider">Allowances</th>
                  <th className="p-4 text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider">Gross Salary</th>
                  <th className="p-4 text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider">Att. Deduction</th>
                  <th className="p-4 text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider">Total Deductions</th>
                  <th className="p-4 text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider">Net Salary</th>
                  <th className="p-4 text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-700 dark:text-dark-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-dark-border/50">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    
                    {/* Staff Details */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-white">{staff.name}</p>
                        {staff.staffStatus && staff.staffStatus !== 'Active' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30">
                            {staff.staffStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{staff.role || 'Staff'}</p>
                    </td>

                    {/* Department */}
                    <td className="p-4 font-mono text-xs text-slate-600 dark:text-dark-muted font-bold">
                      {staff.department || 'N/A'}
                    </td>

                    {/* Basic */}
                    <td className="p-4 font-mono text-slate-900 dark:text-white font-bold text-xs">
                      Rs. {staff.basicSalary.toLocaleString()}
                    </td>

                    {/* Allowances */}
                    <td className="p-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      + Rs. {staff.totalAllowances.toLocaleString()}
                    </td>

                    {/* Gross */}
                    <td className="p-4 font-mono text-slate-900 dark:text-white font-bold text-xs">
                      Rs. {staff.grossSalary.toLocaleString()}
                    </td>

                    {/* Attendance Deduction */}
                    <td className="p-4 font-mono text-rose-600 dark:text-rose-400 font-bold text-xs">
                      - Rs. {staff.attendanceDeduction.toLocaleString()}
                    </td>

                    {/* Total Deductions */}
                    <td className="p-4 font-mono text-red-600 dark:text-red-400 font-bold text-xs">
                      - Rs. {staff.totalDeductions.toLocaleString()}
                    </td>

                    {/* Net Salary */}
                    <td className="p-4 font-mono text-emerald-700 dark:text-emerald-300 font-black text-sm">
                      Rs. {staff.netSalary.toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      {staff.status === 'Processed' ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full w-fit border border-emerald-500/20">
                          <CheckCircle2 size={13} /> PROCESSED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full w-fit border border-amber-500/20">
                          <Clock size={13} /> DRAFT
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      {staff.status === 'Draft' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleGeneratePayroll(staff.id)}
                            disabled={isProcessing || staff.basicSalary === 0 || staff.staffStatus !== 'Active' || !isAuthorized}
                            title={
                              !isAuthorized ? "Administrative permission required to process payroll" :
                              staff.staffStatus !== 'Active' ? `Cannot process: Staff is ${staff.staffStatus}` : 
                              'Process Payroll'
                            }
                            className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Process
                          </button>
                          <button 
                            onClick={() => setHistoryStaff(staff)}
                            title="View Employee Payroll History"
                            className="px-2.5 py-1.5 bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <History size={13} /> History
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedPayslip(staff)}
                            className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <FileText size={13} /> Salary Slip
                          </button>
                          <button 
                            onClick={() => setHistoryStaff(staff)}
                            title="View Employee Payroll History"
                            className="px-2.5 py-1.5 bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <History size={13} /> History
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan="10" className="p-10 text-center text-dark-muted font-bold">
                      No payroll records found matching the selected filters for {formatPeriod(selectedPeriod)}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* Reusable Printable Payslip Modal */}
      {selectedPayslip && (
        <PayslipModal 
          payslipData={selectedPayslip.payrollData || selectedPayslip}
          userData={userData}
          onClose={() => setSelectedPayslip(null)}
        />
      )}

      {/* Batch Salary Slips Modal */}
      {showBatchPayslipModal && (
        <BatchPayslipModal
          batchData={processedPeriodRecords}
          userData={userData}
          onClose={() => setShowBatchPayslipModal(false)}
        />
      )}

      {/* Employee Payroll History Modal */}
      {historyStaff && (
        <StaffPayrollHistoryModal 
          staffMember={historyStaff}
          payrollData={payrollData}
          userData={userData}
          onClose={() => setHistoryStaff(null)}
          onSelectPayslip={(slip) => setSelectedPayslip(slip)}
        />
      )}

      {/* Audit Trail Section (Phase 8 & 9) */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-dark-border pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                Payroll Audit Trail & Activity Log
              </h3>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                System-verified audit records for month finalizations and critical administrative payroll actions.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/20">
            {auditLogs.length} Audit Event(s)
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 dark:text-dark-muted font-bold border border-dashed border-slate-200 dark:border-dark-border rounded-xl">
            No payroll finalization audit records recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id || log.timestamp} className="p-3.5 bg-slate-50 dark:bg-dark-bg/60 border border-slate-200 dark:border-dark-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-md font-bold uppercase font-mono text-[10px]">
                    {log.action || 'PAYROLL_FINALIZED'}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      Month: <span className="text-emerald-600 dark:text-emerald-400">{log.periodLabel || formatPeriod(log.period)}</span> ({log.recordsCount ?? 0} staff records locked)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-dark-muted mt-0.5">
                      Performed by: <strong className="text-slate-800 dark:text-gray-300">{log.performedByName || log.performedByEmail || 'Admin'}</strong>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-dark-muted">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Confirmation Modal for Month Finalization (Phase 5) */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in print:hidden">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
                <Lock size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Finalize Payroll Month — {formatPeriod(selectedPeriod)}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
                  Confirm month locking for tenant <strong className="text-slate-800 dark:text-white font-semibold">{userData?.schoolName || 'Current School'}</strong>
                </p>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs space-y-2.5">
              <p className="font-bold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" /> Important Notice:
              </p>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                After finalization, all processed payroll records for <strong className="text-slate-900 dark:text-white font-bold">{formatPeriod(selectedPeriod)}</strong> will be permanently locked.
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-700 dark:text-slate-200 font-medium text-xs pt-1">
                <li>Salary structures & deductions cannot be edited</li>
                <li>Historical attendance snapshots will remain immutable</li>
                <li>Records cannot be re-processed or overwritten</li>
                <li>Viewing and printing payslips will remain active</li>
              </ul>
            </div>

            <div className="flex justify-end items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                disabled={isFinalizing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-dark-hover border border-slate-300 dark:border-dark-border text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFinalize}
                disabled={isFinalizing}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
              >
                {isFinalizing ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                {isFinalizing ? 'Finalizing...' : 'Finalize & Lock Payroll'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

    </div>
  );
};

export default PayrollManager;
