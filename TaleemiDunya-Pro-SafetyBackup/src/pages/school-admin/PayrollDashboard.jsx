import React, { useState, useEffect, useMemo } from 'react';
import GlassCard from '../../components/common/GlassCard';
import PayslipModal from '../../components/common/PayslipModal';
import { 
  Calculator, FileText, Search, Users, TrendingUp, TrendingDown, 
  DollarSign, Filter, RefreshCw, Layers, Calendar, Lock, CheckCircle2, 
  Clock, Building, ShieldCheck, AlertCircle, ArrowUpRight, BarChart3, 
  PieChart, Award, ChevronRight, Activity, Percent
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToCollection } from '../../services/db';
import { formatPeriod, isAuthorizedPayrollAdmin } from '../../utils/payrollUtils';

const PayrollDashboard = () => {
  const { userData, showToast } = useAuth();

  // Filter States
  const currentPeriodStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const currentYearStr = useMemo(() => {
    return String(new Date().getFullYear());
  }, []);

  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriodStr);
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStaffId, setSelectedStaffId] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Data States
  const [payrollData, setPayrollData] = useState([]);
  const [staffData, setStaffData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  // Administrative Authorization Flag
  const isAuthorized = useMemo(() => {
    return isAuthorizedPayrollAdmin(userData);
  }, [userData]);

  // Subscribe to payroll & staff with school multi-tenancy isolation
  useEffect(() => {
    if (!userData?.schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // 1. Subscribe to payroll records for current school
    const unsubPayroll = subscribeToCollection(
      'payroll', 
      userData.schoolId, 
      (data) => {
        setPayrollData(data || []);
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to payroll records:", err);
        setError("Unable to load payroll dashboard. Please check network connection.");
        setLoading(false);
      }
    );

    // 2. Subscribe to staff list for filter options
    const unsubStaff = subscribeToCollection(
      'staff', 
      userData.schoolId, 
      (data) => {
        setStaffData(data || []);
      }
    );

    return () => {
      if (typeof unsubPayroll === 'function') unsubPayroll();
      if (typeof unsubStaff === 'function') unsubStaff();
    };
  }, [userData?.schoolId]);

  // Available Period Options
  const monthOptions = useMemo(() => {
    const periodSet = new Set();
    
    payrollData.forEach(p => {
      const per = p.period || p.month;
      if (per && typeof per === 'string') periodSet.add(per);
    });

    const d = new Date();
    d.setMonth(d.getMonth() - 10);
    for (let i = 0; i < 14; i++) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      periodSet.add(`${y}-${m}`);
      d.setMonth(d.getMonth() + 1);
    }

    const sortedPeriods = Array.from(periodSet).sort((a, b) => b.localeCompare(a));
    return [
      { value: 'All', label: 'All Months' },
      ...sortedPeriods.map(p => ({ value: p, label: formatPeriod(p) }))
    ];
  }, [payrollData]);

  // Available Year Options
  const yearOptions = useMemo(() => {
    const yearSet = new Set();
    payrollData.forEach(p => {
      const per = p.period || p.month;
      if (per && per.includes('-')) {
        yearSet.add(per.split('-')[0]);
      }
    });
    yearSet.add(currentYearStr);
    const sortedYears = Array.from(yearSet).sort((a, b) => b.localeCompare(a));
    return [
      { value: 'All', label: 'All Years' },
      ...sortedYears.map(y => ({ value: y, label: `Year ${y}` }))
    ];
  }, [payrollData, currentYearStr]);

  // Available Department Options
  const departmentOptions = useMemo(() => {
    const deptSet = new Set();
    
    staffData.forEach(s => {
      if (s.department && typeof s.department === 'string') {
        deptSet.add(s.department.trim());
      }
    });

    payrollData.forEach(p => {
      const d = p.staffDepartment || p.department;
      if (d && typeof d === 'string') {
        deptSet.add(d.trim());
      }
    });

    const sortedDepts = Array.from(deptSet).sort();
    return [
      { value: 'All', label: 'All Departments' },
      ...sortedDepts.map(d => ({ value: d, label: d }))
    ];
  }, [staffData, payrollData]);

  // Available Staff Options
  const staffOptions = useMemo(() => {
    const map = new Map();

    staffData.forEach(s => {
      const name = s.name || s.fullName || 'Staff';
      const code = s.staffId || s.employeeId || s.id;
      map.set(s.id, { id: s.id, name, code });
    });

    payrollData.forEach(p => {
      if (p.staffId && !map.has(p.staffId)) {
        map.set(p.staffId, {
          id: p.staffId,
          name: p.staffName || 'Staff',
          code: p.staffIdCode || p.staffId
        });
      }
    });

    const list = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    return [
      { value: 'All', label: 'All Staff Members' },
      ...list.map(s => ({ value: s.id, label: `${s.name} (${s.code || s.id})` }))
    ];
  }, [staffData, payrollData]);

  // Filtered Payroll Records Calculation
  const filteredRecords = useMemo(() => {
    if (!Array.isArray(payrollData)) return [];

    return payrollData.filter(rec => {
      // 1. School Isolation (Mandatory)
      if (userData?.schoolId && rec.schoolId && rec.schoolId !== userData.schoolId) {
        return false;
      }

      // 2. Campus Isolation (Optional if set)
      if (userData?.campusId && rec.campusId && rec.campusId !== userData.campusId) {
        return false;
      }

      // 3. Period / Month Filter
      if (selectedPeriod !== 'All') {
        const p = rec.period || rec.month;
        if (p !== selectedPeriod) return false;
      }

      // 4. Year Filter
      if (selectedYear !== 'All') {
        const p = rec.period || rec.month || '';
        if (!p.startsWith(selectedYear)) return false;
      }

      // 5. Department Filter
      if (selectedDepartment !== 'All') {
        const dept = (rec.staffDepartment || rec.department || '').trim();
        if (dept !== selectedDepartment.trim()) return false;
      }

      // 6. Staff Member Filter
      if (selectedStaffId !== 'All') {
        const sId = rec.staffId || rec.userId;
        if (sId !== selectedStaffId) return false;
      }

      // 7. Status Filter
      if (selectedStatus !== 'All') {
        const st = String(rec.status || 'Draft').toLowerCase();
        const targetSt = String(selectedStatus).toLowerCase();
        if (st !== targetSt && !(targetSt === 'locked' && (st === 'finalized' || st === 'locked'))) {
          return false;
        }
      }

      // 8. Search Term Filter
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase().trim();
        const name = String(rec.staffName || '').toLowerCase();
        const code = String(rec.staffIdCode || rec.staffId || '').toLowerCase();
        const dept = String(rec.staffDepartment || rec.department || '').toLowerCase();
        const role = String(rec.staffRole || '').toLowerCase();
        if (!name.includes(term) && !code.includes(term) && !dept.includes(term) && !role.includes(term)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const perA = a.period || a.month || '';
      const perB = b.period || b.month || '';
      if (perA !== perB) return perB.localeCompare(perA);
      return (a.staffName || '').localeCompare(b.staffName || '');
    });
  }, [payrollData, selectedPeriod, selectedYear, selectedDepartment, selectedStaffId, selectedStatus, searchTerm, userData]);

  // Executive KPI Summary Aggregations
  const summaryMetrics = useMemo(() => {
    let totalRecords = filteredRecords.length;
    let totalBasic = 0;
    let totalAllowances = 0;
    let totalGross = 0;
    let totalAttendanceDeductions = 0;
    let totalOtherDeductions = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    let totalWorkingDays = 0;
    let totalPresentDays = 0;
    let totalAbsentDays = 0;
    let totalHalfDays = 0;
    let totalLeaveDays = 0;
    let totalPaidDays = 0;

    let processedCount = 0;
    let lockedCount = 0;
    let draftCount = 0;

    filteredRecords.forEach(r => {
      totalBasic += Number(r.basicSalary || 0);
      totalAllowances += Number(r.totalAllowances || (Number(r.medicalAllowance || 0) + Number(r.transportAllowance || 0)));
      totalGross += Number(r.grossSalary || 0);
      totalAttendanceDeductions += Number(r.attendanceDeduction || 0);
      totalOtherDeductions += Number(r.otherDeductions || 0);
      totalDeductions += Number(r.totalDeductions || 0);
      totalNet += Number(r.netSalary || 0);

      totalWorkingDays += Number(r.totalWorkingDays || 26);
      totalPresentDays += Number(r.presentDays || 0);
      totalAbsentDays += Number(r.absentDays || 0);
      totalHalfDays += Number(r.halfDays || 0);
      totalLeaveDays += Number(r.leaveDays || 0);
      totalPaidDays += Number(r.paidEquivalentDays || 0);

      const st = String(r.status || '').toLowerCase();
      if (st === 'locked' || st === 'finalized') {
        lockedCount += 1;
      } else if (st === 'processed') {
        processedCount += 1;
      } else {
        draftCount += 1;
      }
    });

    const averageNet = totalRecords > 0 ? Math.round(totalNet / totalRecords) : 0;
    const deductionPctOfGross = totalGross > 0 ? Math.round((totalDeductions / totalGross) * 100) : 0;
    const netPctOfGross = totalGross > 0 ? Math.round((totalNet / totalGross) * 100) : 0;

    return {
      totalRecords,
      totalBasic: Math.round(totalBasic),
      totalAllowances: Math.round(totalAllowances),
      totalGross: Math.round(totalGross),
      totalAttendanceDeductions: Math.round(totalAttendanceDeductions),
      totalOtherDeductions: Math.round(totalOtherDeductions),
      totalDeductions: Math.round(totalDeductions),
      totalNet: Math.round(totalNet),
      averageNet,
      deductionPctOfGross,
      netPctOfGross,
      totalWorkingDays,
      totalPresentDays,
      totalAbsentDays,
      totalHalfDays,
      totalLeaveDays,
      totalPaidDays,
      processedCount,
      lockedCount,
      draftCount
    };
  }, [filteredRecords]);

  // Monthly Payroll Trend Analytics (Actual Historical Months in Database)
  const monthlyTrendData = useMemo(() => {
    if (!Array.isArray(payrollData)) return [];

    const map = new Map();
    
    // Group records by period
    payrollData.forEach(p => {
      // Respect School Isolation
      if (userData?.schoolId && p.schoolId && p.schoolId !== userData.schoolId) return;

      const per = p.period || p.month;
      if (!per || typeof per !== 'string') return;

      if (!map.has(per)) {
        map.set(per, { period: per, count: 0, gross: 0, deductions: 0, net: 0 });
      }

      const item = map.get(per);
      item.count += 1;
      item.gross += Number(p.grossSalary || 0);
      item.deductions += Number(p.totalDeductions || 0);
      item.net += Number(p.netSalary || 0);
    });

    const list = Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
    const maxNet = Math.max(1, ...list.map(d => d.net));

    return list.slice(-8).map(d => ({
      ...d,
      periodLabel: formatPeriod(d.period),
      netBarPct: Math.round((d.net / maxNet) * 100),
      grossBarPct: Math.round((d.gross / (maxNet * 1.25)) * 100),
      deductionsBarPct: Math.round((d.deductions / (maxNet * 1.25)) * 100)
    }));
  }, [payrollData, userData]);

  // Department-Wise Payroll Analytics Summary
  const departmentBreakdown = useMemo(() => {
    const map = new Map();

    filteredRecords.forEach(r => {
      const dept = (r.staffDepartment || r.department || 'General / Unassigned').trim();
      if (!map.has(dept)) {
        map.set(dept, {
          dept,
          count: 0,
          basic: 0,
          allowances: 0,
          gross: 0,
          attDeduction: 0,
          otherDeduction: 0,
          totalDeductions: 0,
          net: 0
        });
      }

      const item = map.get(dept);
      item.count += 1;
      item.basic += Number(r.basicSalary || 0);
      item.allowances += Number(r.totalAllowances || 0);
      item.gross += Number(r.grossSalary || 0);
      item.attDeduction += Number(r.attendanceDeduction || 0);
      item.otherDeduction += Number(r.otherDeductions || 0);
      item.totalDeductions += Number(r.totalDeductions || 0);
      item.net += Number(r.netSalary || 0);
    });

    const list = Array.from(map.values()).sort((a, b) => b.net - a.net);
    const overallNet = summaryMetrics.totalNet || 1;

    return list.map(d => ({
      ...d,
      sharePct: summaryMetrics.totalNet > 0 ? Math.round((d.net / overallNet) * 100) : 0
    }));
  }, [filteredRecords, summaryMetrics.totalNet]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSelectedPeriod('All');
    setSelectedYear('All');
    setSelectedDepartment('All');
    setSelectedStaffId('All');
    setSelectedStatus('All');
    setSearchTerm('');
  };

  // Render Loading State
  if (loading) {
    return (
      <div className="p-8 text-center text-dark-muted font-bold animate-fade-in space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-base text-white">Loading payroll dashboard & analytics...</p>
        <p className="text-xs text-dark-muted">Aggregating historical saved payroll metrics</p>
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 animate-fade-in">
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400">
          <AlertCircle size={36} className="mx-auto mb-2 text-red-400" />
          <h3 className="text-lg font-bold">Unable to load payroll dashboard</h3>
          <p className="text-xs mt-1 text-red-300">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-bold hover:bg-dark-card transition-all flex items-center gap-2 mx-auto cursor-pointer"
        >
          <RefreshCw size={14} /> Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      
      {/* ========================================================================= */}
      {/* SCREEN UI HEADER & SUMMARY TITLE */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/20">
              <BarChart3 className="text-white" size={28} />
            </div>
            Payroll Analytics & Financial Dashboard
          </h1>
          <p className="text-dark-muted mt-1 max-w-2xl text-sm">
            Read-only executive overview of monthly salary distribution, attendance deductions, and department payroll trends.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold font-mono flex items-center gap-2">
            <ShieldCheck size={16} /> Read-Only Data Visualizer
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER CONTROLS BAR */}
      {/* ========================================================================= */}
      <GlassCard className="p-5 border-emerald-500/20 bg-dark-card/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dark-border/60 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Filter size={18} className="text-emerald-400" />
            <span>Dashboard Analytics Scope Filters</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-dark-muted font-mono font-bold">
              Showing <span className="text-emerald-400">{filteredRecords.length}</span> of {payrollData.length} saved slip(s)
            </span>
            {(selectedPeriod !== 'All' || selectedYear !== 'All' || selectedDepartment !== 'All' || selectedStaffId !== 'All' || selectedStatus !== 'All' || searchTerm) && (
              <button 
                onClick={handleResetFilters}
                className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer text-xs flex items-center gap-1"
              >
                <RefreshCw size={12} /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Filters Selectors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          
          {/* Period Filter */}
          <div className="space-y-1">
            <label className="text-dark-muted font-bold uppercase tracking-wider text-[10px]">Payroll Month</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-emerald-500 transition-all cursor-pointer"
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value} className="bg-dark-card text-white">{m.label}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="space-y-1">
            <label className="text-dark-muted font-bold uppercase tracking-wider text-[10px]">Payroll Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-emerald-500 transition-all cursor-pointer"
            >
              {yearOptions.map(y => (
                <option key={y.value} value={y.value} className="bg-dark-card text-white">{y.label}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="space-y-1">
            <label className="text-dark-muted font-bold uppercase tracking-wider text-[10px]">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-emerald-500 transition-all cursor-pointer"
            >
              {departmentOptions.map(d => (
                <option key={d.value} value={d.value} className="bg-dark-card text-white">{d.label}</option>
              ))}
            </select>
          </div>

          {/* Staff Filter */}
          <div className="space-y-1">
            <label className="text-dark-muted font-bold uppercase tracking-wider text-[10px]">Staff Member</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-emerald-500 transition-all cursor-pointer"
            >
              {staffOptions.map(s => (
                <option key={s.value} value={s.value} className="bg-dark-card text-white">{s.label}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-dark-muted font-bold uppercase tracking-wider text-[10px]">Payroll Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="All" className="bg-dark-card text-white">All Statuses</option>
              <option value="Processed" className="bg-dark-card text-white">Processed</option>
              <option value="Locked" className="bg-dark-card text-white">Locked / Finalized</option>
              <option value="Draft" className="bg-dark-card text-white">Draft / Pending</option>
            </select>
          </div>

        </div>

        {/* Search Bar Input */}
        <div className="relative pt-1">
          <Search size={16} className="absolute left-3.5 top-4 text-dark-muted" />
          <input 
            type="text"
            placeholder="Search analytics by employee name, staff ID code, role, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted outline-none focus:border-emerald-500 transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3.5 text-xs text-dark-muted hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </GlassCard>

      {/* ========================================================================= */}
      {/* 11 EXECUTIVE KPI SUMMARY CARDS GRID */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* KPI 1: Total Payroll Slips */}
        <GlassCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">Total Payrolls</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-white font-mono">{summaryMetrics.totalRecords}</p>
            <p className="text-[9px] text-dark-muted mt-0.5">Matching Slips</p>
          </div>
        </GlassCard>

        {/* KPI 2: Total Basic Salary */}
        <GlassCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Basic Salary</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-base font-black text-white font-mono">Rs. {summaryMetrics.totalBasic.toLocaleString()}</p>
            <p className="text-[9px] text-blue-400/80 mt-0.5">Base Structure</p>
          </div>
        </GlassCard>

        {/* KPI 3: Total Allowances */}
        <GlassCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Total Allowances</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-base font-black text-teal-400 font-mono">+ Rs. {summaryMetrics.totalAllowances.toLocaleString()}</p>
            <p className="text-[9px] text-teal-400/80 mt-0.5">Medical + Transport</p>
          </div>
        </GlassCard>

        {/* KPI 4: Total Gross Salary */}
        <GlassCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Gross Payroll</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <BarChart3 size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-base font-black text-purple-300 font-mono">Rs. {summaryMetrics.totalGross.toLocaleString()}</p>
            <p className="text-[9px] text-purple-400/80 mt-0.5">Basic + Allowances</p>
          </div>
        </GlassCard>

        {/* KPI 5: Total Attendance Deductions */}
        <GlassCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Att. Deductions</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-base font-black text-amber-400 font-mono">- Rs. {summaryMetrics.totalAttendanceDeductions.toLocaleString()}</p>
            <p className="text-[9px] text-amber-400/80 mt-0.5">Absents & Half Days</p>
          </div>
        </GlassCard>

        {/* KPI 6: Total Other Deductions */}
        <GlassCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Other Deductions</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-base font-black text-rose-400 font-mono">- Rs. {summaryMetrics.totalOtherDeductions.toLocaleString()}</p>
            <p className="text-[9px] text-rose-400/80 mt-0.5">Fixed Deductions</p>
          </div>
        </GlassCard>

        {/* KPI 7: Total Deductions */}
        <GlassCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Total Deductions</span>
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-base font-black text-red-400 font-mono">- Rs. {summaryMetrics.totalDeductions.toLocaleString()}</p>
            <p className="text-[9px] text-red-400/80 mt-0.5">{summaryMetrics.deductionPctOfGross}% of Gross</p>
          </div>
        </GlassCard>

        {/* KPI 8: Total Net Salary */}
        <GlassCard className="p-3.5 flex flex-col justify-between bg-gradient-to-br from-emerald-950/40 to-teal-950/40 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Net Payable</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-lg font-black text-emerald-300 font-mono">Rs. {summaryMetrics.totalNet.toLocaleString()}</p>
            <p className="text-[9px] text-emerald-400/90 font-bold mt-0.5">{summaryMetrics.netPctOfGross}% of Gross</p>
          </div>
        </GlassCard>

        {/* KPI 9: Average Net Salary */}
        <GlassCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">Average Net</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-base font-black text-white font-mono">Rs. {summaryMetrics.averageNet.toLocaleString()}</p>
            <p className="text-[9px] text-dark-muted mt-0.5">Per Staff Slip</p>
          </div>
        </GlassCard>

        {/* KPI 10: Locked Count */}
        <GlassCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Locked Slips</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Lock size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-indigo-300 font-mono">{summaryMetrics.lockedCount}</p>
            <p className="text-[9px] text-indigo-400/80 mt-0.5">Finalized & Locked</p>
          </div>
        </GlassCard>

        {/* KPI 11: Processed Count */}
        <GlassCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Processed Slips</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-emerald-400 font-mono">{summaryMetrics.processedCount}</p>
            <p className="text-[9px] text-emerald-500/80 mt-0.5">Processed Active</p>
          </div>
        </GlassCard>

        {/* KPI 12: Draft Count */}
        <GlassCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Draft / Pending</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-amber-400 font-mono">{summaryMetrics.draftCount}</p>
            <p className="text-[9px] text-amber-500/80 mt-0.5">Pending Action</p>
          </div>
        </GlassCard>

      </div>

      {/* ========================================================================= */}
      {/* VISUAL CHARTS SECTION (MONTHLY TREND & PROPORTIONAL BREAKDOWN) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Monthly Financial Trend Chart (Historical Available Database Months) */}
        <GlassCard className="p-5 flex flex-col justify-between border-emerald-500/20">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-dark-border pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" /> Historical Monthly Net Payroll Trend
              </h3>
              <span className="text-xs font-mono text-dark-muted font-bold">
                {monthlyTrendData.length} Month(s) Recorded
              </span>
            </div>

            {monthlyTrendData.length === 0 ? (
              <div className="p-8 text-center text-dark-muted text-xs font-bold">
                No historical payroll trend data recorded yet.
              </div>
            ) : (
              <div className="h-56 flex items-end justify-between gap-3 sm:gap-4 pt-6 px-2">
                {monthlyTrendData.map((item, idx) => (
                  <div key={item.period} className="flex-1 flex flex-col items-center gap-2 group">
                    
                    {/* Tooltip Hover Value */}
                    <div className="text-[10px] font-mono font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity bg-dark-bg/90 px-1.5 py-0.5 rounded border border-emerald-500/30 whitespace-nowrap shadow-md">
                      Rs.{item.net.toLocaleString()}
                    </div>

                    {/* Bar Visual Column */}
                    <div className="w-full bg-dark-bg/80 border border-dark-border rounded-t-lg overflow-hidden h-40 flex items-end justify-center">
                      <div 
                        className="w-full bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 rounded-t-lg transition-all duration-700 group-hover:from-emerald-500 group-hover:to-teal-300 shadow-lg" 
                        style={{ height: `${Math.max(8, item.netBarPct)}%` }} 
                      />
                    </div>

                    {/* Period Label */}
                    <span className="text-[10px] font-mono font-bold text-dark-muted group-hover:text-white truncate max-w-[60px]" title={item.periodLabel}>
                      {item.periodLabel.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-dark-border/60 flex items-center justify-between text-[11px] font-mono text-dark-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Net Payable Salary
            </span>
            <span>Based on saved database snapshots</span>
          </div>
        </GlassCard>

        {/* Chart 2: Proportional Salary Distribution Analytics */}
        <GlassCard className="p-5 flex flex-col justify-between border-purple-500/20">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-dark-border pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PieChart size={18} className="text-purple-400" /> Proportional Financial Salary Distribution
              </h3>
              <span className="text-xs font-mono text-purple-300 font-bold">
                Gross: Rs. {summaryMetrics.totalGross.toLocaleString()}
              </span>
            </div>

            <div className="space-y-4 pt-1">
              
              {/* Basic Salary Component */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> Basic Salary Structure
                  </span>
                  <span className="font-mono text-blue-400">
                    Rs. {summaryMetrics.totalBasic.toLocaleString()} ({summaryMetrics.totalGross > 0 ? Math.round((summaryMetrics.totalBasic / summaryMetrics.totalGross) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-700" 
                    style={{ width: `${summaryMetrics.totalGross > 0 ? (summaryMetrics.totalBasic / summaryMetrics.totalGross) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Total Allowances Component */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" /> Medical & Transport Allowances
                  </span>
                  <span className="font-mono text-teal-400">
                    Rs. {summaryMetrics.totalAllowances.toLocaleString()} ({summaryMetrics.totalGross > 0 ? Math.round((summaryMetrics.totalAllowances / summaryMetrics.totalGross) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
                  <div 
                    className="h-full bg-teal-400 rounded-full transition-all duration-700" 
                    style={{ width: `${summaryMetrics.totalGross > 0 ? (summaryMetrics.totalAllowances / summaryMetrics.totalGross) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Attendance Deductions Component */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Attendance Salary Deductions
                  </span>
                  <span className="font-mono text-amber-400">
                    - Rs. {summaryMetrics.totalAttendanceDeductions.toLocaleString()} ({summaryMetrics.totalGross > 0 ? Math.round((summaryMetrics.totalAttendanceDeductions / summaryMetrics.totalGross) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
                  <div 
                    className="h-full bg-amber-400 rounded-full transition-all duration-700" 
                    style={{ width: `${summaryMetrics.totalGross > 0 ? (summaryMetrics.totalAttendanceDeductions / summaryMetrics.totalGross) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Other Deductions Component */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" /> Other / Fixed Deductions
                  </span>
                  <span className="font-mono text-rose-400">
                    - Rs. {summaryMetrics.totalOtherDeductions.toLocaleString()} ({summaryMetrics.totalGross > 0 ? Math.round((summaryMetrics.totalOtherDeductions / summaryMetrics.totalGross) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-700" 
                    style={{ width: `${summaryMetrics.totalGross > 0 ? (summaryMetrics.totalOtherDeductions / summaryMetrics.totalGross) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Net Salary Payable */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-black">
                  <span className="text-emerald-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Net Payable Salary
                  </span>
                  <span className="font-mono text-emerald-400">
                    Rs. {summaryMetrics.totalNet.toLocaleString()} ({summaryMetrics.netPctOfGross}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-dark-bg rounded-full overflow-hidden border border-emerald-500/30">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700" 
                    style={{ width: `${summaryMetrics.netPctOfGross}%` }}
                  />
                </div>
              </div>

            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-dark-border/60 text-[11px] text-dark-muted font-mono flex items-center justify-between">
            <span>Deduction Impact: {summaryMetrics.deductionPctOfGross}% of Gross</span>
            <span className="text-emerald-400 font-bold">Net Payout: {summaryMetrics.netPctOfGross}%</span>
          </div>
        </GlassCard>

      </div>

      {/* ========================================================================= */}
      {/* DEDUCTION & ATTENDANCE ANALYTICS CARD */}
      {/* ========================================================================= */}
      {summaryMetrics.totalRecords > 0 && (
        <GlassCard className="p-5 border-amber-500/20 bg-amber-950/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
            <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={18} /> Aggregate Attendance Snapshot & Deduction Analytics
            </h3>
            <span className="text-xs font-mono font-bold text-amber-400">
              Total Attendance Deductions: - Rs. {summaryMetrics.totalAttendanceDeductions.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center font-mono text-xs">
            
            <div className="p-3 bg-dark-bg/60 rounded-xl border border-dark-border">
              <p className="text-[10px] text-dark-muted font-bold uppercase">Working Days</p>
              <p className="text-lg font-black text-white mt-1">{summaryMetrics.totalWorkingDays}</p>
            </div>

            <div className="p-3 bg-dark-bg/60 rounded-xl border border-dark-border">
              <p className="text-[10px] text-dark-muted font-bold uppercase">Present Days</p>
              <p className="text-lg font-black text-green-400 mt-1">{summaryMetrics.totalPresentDays}</p>
            </div>

            <div className="p-3 bg-dark-bg/60 rounded-xl border border-dark-border">
              <p className="text-[10px] text-dark-muted font-bold uppercase">Absent Days</p>
              <p className="text-lg font-black text-red-400 mt-1">{summaryMetrics.totalAbsentDays}</p>
            </div>

            <div className="p-3 bg-dark-bg/60 rounded-xl border border-dark-border">
              <p className="text-[10px] text-dark-muted font-bold uppercase">Half Days</p>
              <p className="text-lg font-black text-amber-400 mt-1">{summaryMetrics.totalHalfDays}</p>
            </div>

            <div className="p-3 bg-dark-bg/60 rounded-xl border border-dark-border">
              <p className="text-[10px] text-dark-muted font-bold uppercase">Leave Days</p>
              <p className="text-lg font-black text-blue-400 mt-1">{summaryMetrics.totalLeaveDays}</p>
            </div>

            <div className="p-3 bg-dark-bg/60 rounded-xl border border-dark-border">
              <p className="text-[10px] text-dark-muted font-bold uppercase">Paid Equivalent</p>
              <p className="text-lg font-black text-emerald-300 mt-1">{summaryMetrics.totalPaidDays}</p>
            </div>

          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* DEPARTMENT-WISE PAYROLL SUMMARY TABLE */}
      {/* ========================================================================= */}
      <GlassCard className="p-0 overflow-hidden border-purple-500/20">
        <div className="p-4 border-b border-dark-border bg-dark-bg/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Department Financial Breakdown</h3>
          </div>
          <span className="text-xs font-mono text-dark-muted font-bold">
            {departmentBreakdown.length} Department(s) Rendered
          </span>
        </div>

        {departmentBreakdown.length === 0 ? (
          <div className="p-8 text-center text-dark-muted text-xs font-bold">
            No department breakdown data available for selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-dark-bg/90 text-dark-muted font-bold uppercase tracking-wider border-b border-dark-border">
                <tr>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3 text-center">Staff Count</th>
                  <th className="py-3 px-3 text-right">Basic Salary</th>
                  <th className="py-3 px-3 text-right">Allowances</th>
                  <th className="py-3 px-3 text-right">Gross Salary</th>
                  <th className="py-3 px-3 text-right">Att. Deduction</th>
                  <th className="py-3 px-3 text-right">Other Ded.</th>
                  <th className="py-3 px-3 text-right">Total Ded.</th>
                  <th className="py-3 px-3 text-right font-black">Net Salary</th>
                  <th className="py-3 px-3 text-center">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-white">
                {departmentBreakdown.map((dept) => (
                  <tr key={dept.dept} className="hover:bg-dark-bg/50 transition-colors">
                    
                    {/* Department Name */}
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <Building size={14} className="text-purple-400" />
                      {dept.dept}
                    </td>

                    {/* Staff Count */}
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                        {dept.count} Staff
                      </span>
                    </td>

                    {/* Basic */}
                    <td className="py-3 px-3 text-right font-mono">
                      Rs. {dept.basic.toLocaleString()}
                    </td>

                    {/* Allowances */}
                    <td className="py-3 px-3 text-right font-mono text-teal-400">
                      + Rs. {dept.allowances.toLocaleString()}
                    </td>

                    {/* Gross */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-purple-300">
                      Rs. {dept.gross.toLocaleString()}
                    </td>

                    {/* Attendance Deduction */}
                    <td className="py-3 px-3 text-right font-mono text-amber-400">
                      - Rs. {dept.attDeduction.toLocaleString()}
                    </td>

                    {/* Other Deduction */}
                    <td className="py-3 px-3 text-right font-mono text-rose-400">
                      - Rs. {dept.otherDeduction.toLocaleString()}
                    </td>

                    {/* Total Deductions */}
                    <td className="py-3 px-3 text-right font-mono text-red-400 font-bold">
                      - Rs. {dept.totalDeductions.toLocaleString()}
                    </td>

                    {/* Net Salary */}
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 text-sm">
                      Rs. {dept.net.toLocaleString()}
                    </td>

                    {/* Share Pct */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-purple-300">
                      {dept.sharePct}%
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ========================================================================= */}
      {/* STAFF PAYROLL BREAKDOWN TABLE */}
      {/* ========================================================================= */}
      <GlassCard className="p-0 overflow-hidden border-dark-border">
        <div className="p-4 border-b border-dark-border bg-dark-bg/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Staff Payroll Summary</h3>
          </div>
          <span className="text-xs font-mono text-dark-muted">
            {filteredRecords.length} Staff Member(s)
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-dark-muted text-xs font-bold">
            No staff payroll data available for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-dark-bg/90 text-dark-muted font-bold uppercase tracking-wider border-b border-dark-border">
                <tr>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Staff ID</th>
                  <th className="py-3 px-3">Dept</th>
                  <th className="py-3 px-3 text-right">Gross Salary</th>
                  <th className="py-3 px-3 text-right">Att. Deduction</th>
                  <th className="py-3 px-3 text-right">Total Deductions</th>
                  <th className="py-3 px-3 text-right font-black">Net Salary</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-white">
                {filteredRecords.map((r, index) => {
                  const statusStr = String(r.status || 'Draft').toLowerCase();
                  const isLocked = statusStr === 'locked' || statusStr === 'finalized';
                  const isProcessed = statusStr === 'processed';

                  return (
                    <tr key={r.id || index} className="hover:bg-dark-bg/50 transition-colors">
                      
                      {/* Employee Name & Role */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{r.staffName || 'Staff Member'}</div>
                        <div className="text-[10px] text-dark-muted">{r.staffRole || 'Staff'}</div>
                      </td>

                      {/* Staff ID */}
                      <td className="py-3 px-3 font-mono text-dark-muted">
                        {r.staffIdCode || r.staffId || '—'}
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3 text-dark-muted">
                        {r.staffDepartment || r.department || 'N/A'}
                      </td>

                      {/* Gross */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-purple-300">
                        Rs. {Number(r.grossSalary || 0).toLocaleString()}
                      </td>

                      {/* Att Deduction */}
                      <td className="py-3 px-3 text-right font-mono text-amber-400">
                        - Rs. {Number(r.attendanceDeduction || 0).toLocaleString()}
                      </td>

                      {/* Total Deductions */}
                      <td className="py-3 px-3 text-right font-mono text-red-400 font-bold">
                        - Rs. {Number(r.totalDeductions || 0).toLocaleString()}
                      </td>

                      {/* Net Salary */}
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 text-sm">
                        Rs. {Number(r.netSalary || 0).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {isLocked ? (
                          <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 uppercase">
                            <Lock size={10} className="text-indigo-400" /> Locked
                          </span>
                        ) : isProcessed ? (
                          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 uppercase">
                            <CheckCircle2 size={10} className="text-emerald-400" /> Processed
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 uppercase">
                            <Clock size={10} className="text-amber-400" /> Draft
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center">
                        <button 
                          onClick={() => setSelectedPayslip(r)}
                          className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500 hover:text-white font-bold transition-all text-[11px] cursor-pointer inline-flex items-center gap-1"
                        >
                          <FileText size={12} /> Payslip
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Payslip Modal Integration */}
      {selectedPayslip && (
        <PayslipModal 
          payslipData={selectedPayslip} 
          onClose={() => setSelectedPayslip(null)} 
        />
      )}

    </div>
  );
};

export default PayrollDashboard;
