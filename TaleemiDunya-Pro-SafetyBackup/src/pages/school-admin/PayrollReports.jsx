import React, { useState, useEffect, useMemo } from 'react';
import GlassCard from '../../components/common/GlassCard';
import PayslipModal from '../../components/common/PayslipModal';
import { 
  Calculator, FileText, Printer, Search, Users, 
  TrendingUp, TrendingDown, DollarSign, Filter, RefreshCw, 
  Layers, Calendar, Lock, CheckCircle2, Clock, Download, 
  Building, UserCheck, ShieldCheck, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToCollection } from '../../services/db';
import { 
  formatPeriod, 
  exportPayrollReportToCSV,
  isAuthorizedPayrollAdmin 
} from '../../utils/payrollUtils';

const PayrollReports = () => {
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
        setError("Unable to load payroll report. Please check network connection.");
        setLoading(false);
      }
    );

    // 2. Subscribe to staff list for filter dropdowns
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

  // Available Month/Period Options (from saved payroll records + recent 12 months)
  const monthOptions = useMemo(() => {
    const periodSet = new Set();
    
    // Add periods from actual database records
    payrollData.forEach(p => {
      const per = p.period || p.month;
      if (per && typeof per === 'string') periodSet.add(per);
    });

    // Add recent 12 months for quick selection
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
      map.set(s.id, { id: s.id, name, code, department: s.department || '' });
    });

    payrollData.forEach(p => {
      if (p.staffId && !map.has(p.staffId)) {
        map.set(p.staffId, {
          id: p.staffId,
          name: p.staffName || 'Staff',
          code: p.staffIdCode || p.staffId,
          department: p.staffDepartment || ''
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

      // 2. Campus Isolation (Optional if specified)
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

      // 8. Search Term Filter (Name, Employee ID, Department)
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
      // Sort by period descending, then name ascending
      const perA = a.period || a.month || '';
      const perB = b.period || b.month || '';
      if (perA !== perB) return perB.localeCompare(perA);
      return (a.staffName || '').localeCompare(b.staffName || '');
    });
  }, [payrollData, selectedPeriod, selectedYear, selectedDepartment, selectedStaffId, selectedStatus, searchTerm, userData]);

  // Executive Aggregated Financial Metrics (Consuming Saved Payroll Records)
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

    return {
      totalRecords,
      totalBasic: Math.round(totalBasic),
      totalAllowances: Math.round(totalAllowances),
      totalGross: Math.round(totalGross),
      totalAttendanceDeductions: Math.round(totalAttendanceDeductions),
      totalOtherDeductions: Math.round(totalOtherDeductions),
      totalDeductions: Math.round(totalDeductions),
      totalNet: Math.round(totalNet),
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

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      if (showToast) showToast('info', 'No payroll records available for export matching current filters.');
      else alert('No payroll records available for export matching current filters.');
      return;
    }
    const ok = exportPayrollReportToCSV(filteredRecords, selectedPeriod !== 'All' ? selectedPeriod : '');
    if (ok && showToast) {
      showToast('success', `Exported payroll report containing ${filteredRecords.length} record(s).`);
    }
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

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
        <p className="text-base text-white">Loading payroll report...</p>
        <p className="text-xs text-dark-muted">Aggregating historical saved payroll snapshots</p>
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 animate-fade-in">
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400">
          <AlertCircle size={36} className="mx-auto mb-2 text-red-400" />
          <h3 className="text-lg font-bold">Unable to load payroll report</h3>
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
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in print:p-0 print:bg-white print:text-black">
      
      {/* ========================================================================= */}
      {/* PRINT-ONLY OFFICIAL DOCUMENT HEADER */}
      {/* ========================================================================= */}
      <div className="hidden print:block mb-6 border-b-2 border-gray-900 pb-4 text-black font-sans">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-gray-900">
              {userData?.schoolName || 'Taleemi Duniya School System'}
            </h1>
            <p className="text-xs font-bold text-gray-700 mt-0.5">
              Official HR & Payroll Summary Report
            </p>
          </div>
          <div className="text-right text-xs font-mono">
            <p><strong>Generated On:</strong> {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
            <p><strong>Total Records:</strong> {filteredRecords.length}</p>
          </div>
        </div>

        {/* Active Filter Criteria Legend in Print Header */}
        <div className="mt-3 p-2 bg-gray-100 rounded text-[11px] font-mono grid grid-cols-4 gap-2 border border-gray-300">
          <div><strong>Period:</strong> {selectedPeriod === 'All' ? 'All Months' : formatPeriod(selectedPeriod)}</div>
          <div><strong>Year:</strong> {selectedYear}</div>
          <div><strong>Department:</strong> {selectedDepartment}</div>
          <div><strong>Status:</strong> {selectedStatus}</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN UI HEADER & CONTROLS */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl shadow-lg shadow-teal-500/20">
              <FileText className="text-white" size={28} />
            </div>
            Payroll Reports & Financial Analytics
          </h1>
          <p className="text-dark-muted mt-1 max-w-2xl text-sm">
            Read-only financial reporting engine & attendance snapshot auditor for school payroll records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            title="Export filtered payroll records to CSV"
            className="px-4 py-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white font-bold transition-all flex items-center gap-2 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/10"
          >
            <Download size={18} /> Export CSV
          </button>

          <button 
            onClick={handlePrintReport}
            disabled={filteredRecords.length === 0}
            title="Print official payroll report document"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={18} /> Print Report
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER BAR CARD */}
      {/* ========================================================================= */}
      <GlassCard className="p-5 print:hidden border-teal-500/20 bg-dark-card/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dark-border/60 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Filter size={18} className="text-teal-400" />
            <span>Filter Report Parameters</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-dark-muted font-mono font-bold">
              Showing <span className="text-emerald-400">{filteredRecords.length}</span> of {payrollData.length} total record(s)
            </span>
            {(selectedPeriod !== 'All' || selectedYear !== 'All' || selectedDepartment !== 'All' || selectedStaffId !== 'All' || selectedStatus !== 'All' || searchTerm) && (
              <button 
                onClick={handleResetFilters}
                className="text-teal-400 hover:text-teal-300 font-bold underline cursor-pointer text-xs flex items-center gap-1"
              >
                <RefreshCw size={12} /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          
          {/* Filter 1: Payroll Month */}
          <div className="space-y-1">
            <label className="text-dark-muted font-bold uppercase tracking-wider text-[10px]">Payroll Month</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-teal-500 transition-all cursor-pointer"
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value} className="bg-dark-card text-white">{m.label}</option>
              ))}
            </select>
          </div>

          {/* Filter 2: Payroll Year */}
          <div className="space-y-1">
            <label className="text-dark-muted font-bold uppercase tracking-wider text-[10px]">Payroll Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-teal-500 transition-all cursor-pointer"
            >
              {yearOptions.map(y => (
                <option key={y.value} value={y.value} className="bg-dark-card text-white">{y.label}</option>
              ))}
            </select>
          </div>

          {/* Filter 3: Department */}
          <div className="space-y-1">
            <label className="text-dark-muted font-bold uppercase tracking-wider text-[10px]">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-teal-500 transition-all cursor-pointer"
            >
              {departmentOptions.map(d => (
                <option key={d.value} value={d.value} className="bg-dark-card text-white">{d.label}</option>
              ))}
            </select>
          </div>

          {/* Filter 4: Staff Member */}
          <div className="space-y-1">
            <label className="text-dark-muted font-bold uppercase tracking-wider text-[10px]">Staff Member</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-teal-500 transition-all cursor-pointer"
            >
              {staffOptions.map(s => (
                <option key={s.value} value={s.value} className="bg-dark-card text-white">{s.label}</option>
              ))}
            </select>
          </div>

          {/* Filter 5: Status */}
          <div className="space-y-1">
            <label className="text-dark-muted font-bold uppercase tracking-wider text-[10px]">Payroll Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-teal-500 transition-all cursor-pointer"
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
            placeholder="Search report by employee name, staff ID code, role, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder-dark-muted outline-none focus:border-teal-500 transition-all"
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
      {/* EXECUTIVE SUMMARY KPI CARDS GRID */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 print:grid-cols-4 print:gap-2">
        
        {/* Card 1: Total Payroll Records */}
        <GlassCard className="p-3 flex flex-col justify-between print:border print:border-gray-300 print:bg-white print:text-black">
          <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider print:text-gray-600">Records</span>
          <div className="mt-2">
            <p className="text-xl font-black text-white font-mono print:text-black">{summaryMetrics.totalRecords}</p>
            <p className="text-[9px] text-dark-muted print:text-gray-500 mt-0.5">Slips Loaded</p>
          </div>
        </GlassCard>

        {/* Card 2: Total Basic Salary */}
        <GlassCard className="p-3 flex flex-col justify-between print:border print:border-gray-300 print:bg-white print:text-black">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider print:text-blue-800">Basic Salary</span>
          <div className="mt-2">
            <p className="text-sm font-black text-white font-mono print:text-black">Rs. {summaryMetrics.totalBasic.toLocaleString()}</p>
            <p className="text-[9px] text-blue-400/80 print:text-gray-500 mt-0.5">Base Structure</p>
          </div>
        </GlassCard>

        {/* Card 3: Total Allowances */}
        <GlassCard className="p-3 flex flex-col justify-between print:border print:border-gray-300 print:bg-white print:text-black">
          <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider print:text-teal-800">Allowances</span>
          <div className="mt-2">
            <p className="text-sm font-black text-teal-400 font-mono print:text-black">+ Rs. {summaryMetrics.totalAllowances.toLocaleString()}</p>
            <p className="text-[9px] text-teal-400/80 print:text-gray-500 mt-0.5">Medical + Transport</p>
          </div>
        </GlassCard>

        {/* Card 4: Total Gross Salary */}
        <GlassCard className="p-3 flex flex-col justify-between print:border print:border-gray-300 print:bg-white print:text-black">
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider print:text-purple-800">Gross Payroll</span>
          <div className="mt-2">
            <p className="text-sm font-black text-purple-300 font-mono print:text-black">Rs. {summaryMetrics.totalGross.toLocaleString()}</p>
            <p className="text-[9px] text-purple-400/80 print:text-gray-500 mt-0.5">Basic + Allowances</p>
          </div>
        </GlassCard>

        {/* Card 5: Total Attendance Deductions */}
        <GlassCard className="p-3 flex flex-col justify-between print:border print:border-gray-300 print:bg-white print:text-black">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider print:text-amber-800">Att. Deductions</span>
          <div className="mt-2">
            <p className="text-sm font-black text-amber-400 font-mono print:text-black">- Rs. {summaryMetrics.totalAttendanceDeductions.toLocaleString()}</p>
            <p className="text-[9px] text-amber-400/80 print:text-gray-500 mt-0.5">Absent + Half Days</p>
          </div>
        </GlassCard>

        {/* Card 6: Total Other Deductions */}
        <GlassCard className="p-3 flex flex-col justify-between print:border print:border-gray-300 print:bg-white print:text-black">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider print:text-rose-800">Other Deductions</span>
          <div className="mt-2">
            <p className="text-sm font-black text-rose-400 font-mono print:text-black">- Rs. {summaryMetrics.totalOtherDeductions.toLocaleString()}</p>
            <p className="text-[9px] text-rose-400/80 print:text-gray-500 mt-0.5">Fixed Deductions</p>
          </div>
        </GlassCard>

        {/* Card 7: Total Deductions */}
        <GlassCard className="p-3 flex flex-col justify-between print:border print:border-gray-300 print:bg-white print:text-black">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider print:text-red-800">Total Deductions</span>
          <div className="mt-2">
            <p className="text-sm font-black text-red-400 font-mono print:text-black">- Rs. {summaryMetrics.totalDeductions.toLocaleString()}</p>
            <p className="text-[9px] text-red-400/80 print:text-gray-500 mt-0.5">All Deductions</p>
          </div>
        </GlassCard>

        {/* Card 8: Net Payable Salary */}
        <GlassCard className="p-3 flex flex-col justify-between bg-gradient-to-br from-emerald-950/50 to-teal-950/50 border-emerald-500/40 print:border print:border-emerald-700 print:bg-gray-50 print:text-black">
          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider print:text-emerald-900">Net Payable</span>
          <div className="mt-2">
            <p className="text-base font-black text-emerald-400 font-mono print:text-emerald-900">Rs. {summaryMetrics.totalNet.toLocaleString()}</p>
            <p className="text-[9px] text-emerald-400/90 font-bold print:text-gray-700 mt-0.5">Net Payroll Total</p>
          </div>
        </GlassCard>

      </div>

      {/* ========================================================================= */}
      {/* ATTENDANCE SNAPSHOT AGGREGATION CARD */}
      {/* ========================================================================= */}
      {summaryMetrics.totalRecords > 0 && (
        <GlassCard className="p-4 border-indigo-500/20 bg-indigo-950/10 print:bg-white print:border print:border-gray-300 print:text-black">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-indigo-500/20 print:border-gray-300 pb-2">
            <h3 className="text-xs font-bold text-indigo-300 print:text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} /> Aggregate Attendance Snapshot ({summaryMetrics.totalRecords} Saved Payroll Slips)
            </h3>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-emerald-400 print:text-emerald-800 font-bold">
                Processed: {summaryMetrics.processedCount}
              </span>
              <span className="text-indigo-400 print:text-indigo-800 font-bold">
                Locked: {summaryMetrics.lockedCount}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center font-mono text-xs">
            <div className="p-2 bg-dark-bg/60 print:bg-gray-50 rounded-xl border border-dark-border print:border-gray-200">
              <p className="text-[10px] text-dark-muted print:text-gray-600 font-bold uppercase">Present Days</p>
              <p className="text-base font-black text-green-400 print:text-green-800 mt-0.5">{summaryMetrics.totalPresentDays}</p>
            </div>
            <div className="p-2 bg-dark-bg/60 print:bg-gray-50 rounded-xl border border-dark-border print:border-gray-200">
              <p className="text-[10px] text-dark-muted print:text-gray-600 font-bold uppercase">Absent Days</p>
              <p className="text-base font-black text-red-400 print:text-red-800 mt-0.5">{summaryMetrics.totalAbsentDays}</p>
            </div>
            <div className="p-2 bg-dark-bg/60 print:bg-gray-50 rounded-xl border border-dark-border print:border-gray-200">
              <p className="text-[10px] text-dark-muted print:text-gray-600 font-bold uppercase">Half Days</p>
              <p className="text-base font-black text-amber-400 print:text-amber-800 mt-0.5">{summaryMetrics.totalHalfDays}</p>
            </div>
            <div className="p-2 bg-dark-bg/60 print:bg-gray-50 rounded-xl border border-dark-border print:border-gray-200">
              <p className="text-[10px] text-dark-muted print:text-gray-600 font-bold uppercase">Leave Days</p>
              <p className="text-base font-black text-blue-400 print:text-blue-800 mt-0.5">{summaryMetrics.totalLeaveDays}</p>
            </div>
            <div className="p-2 bg-dark-bg/60 print:bg-gray-50 rounded-xl border border-dark-border print:border-gray-200">
              <p className="text-[10px] text-dark-muted print:text-gray-600 font-bold uppercase">Paid Equivalent</p>
              <p className="text-base font-black text-emerald-300 print:text-emerald-800 mt-0.5">{summaryMetrics.totalPaidDays}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* COMPREHENSIVE PAYROLL REPORT TABLE */}
      {/* ========================================================================= */}
      <GlassCard className="p-0 overflow-hidden border-dark-border print:border print:border-gray-400 print:bg-white print:text-black">
        
        {/* Table Header Bar */}
        <div className="p-4 border-b border-dark-border bg-dark-bg/40 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-teal-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Payroll Breakdown Records</h3>
          </div>
          <span className="text-xs font-mono text-dark-muted">
            {filteredRecords.length} Record(s) Filtered
          </span>
        </div>

        {/* Empty State */}
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle size={40} className="mx-auto text-dark-muted opacity-50" />
            <h4 className="text-base font-bold text-white print:text-black">No payroll records found for the selected filters.</h4>
            <p className="text-xs text-dark-muted max-w-md mx-auto print:text-gray-600">
              Try adjusting your filter options (Payroll Month, Year, Department, Staff Member, or Status) or process staff payroll for the target period.
            </p>
            <button 
              onClick={handleResetFilters}
              className="mt-2 px-4 py-2 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold hover:bg-teal-500 hover:text-white transition-all cursor-pointer inline-flex items-center gap-2 print:hidden"
            >
              <RefreshCw size={14} /> Show All Payroll Records
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse print:text-[10px]">
              
              {/* Table Head */}
              <thead className="bg-dark-bg/90 text-dark-muted font-bold uppercase tracking-wider border-b border-dark-border print:bg-gray-100 print:text-gray-900">
                <tr>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Staff ID</th>
                  <th className="py-3 px-3">Dept</th>
                  <th className="py-3 px-3">Period</th>
                  <th className="py-3 px-3 text-center">Attendance</th>
                  <th className="py-3 px-3 text-right">Basic</th>
                  <th className="py-3 px-3 text-right">Allowances</th>
                  <th className="py-3 px-3 text-right">Gross</th>
                  <th className="py-3 px-3 text-right">Att. Ded.</th>
                  <th className="py-3 px-3 text-right">Other Ded.</th>
                  <th className="py-3 px-3 text-right">Total Ded.</th>
                  <th className="py-3 px-3 text-right font-black">Net Salary</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center print:hidden">Action</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-dark-border/40 text-white print:text-black print:divide-gray-200">
                {filteredRecords.map((r, index) => {
                  const statusStr = String(r.status || 'Draft').toLowerCase();
                  const isLocked = statusStr === 'locked' || statusStr === 'finalized';
                  const isProcessed = statusStr === 'processed';

                  return (
                    <tr 
                      key={r.id || index}
                      className="hover:bg-dark-bg/50 transition-colors print:hover:bg-transparent"
                    >
                      {/* Employee Name & Role */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-white print:text-black">{r.staffName || 'Staff Member'}</div>
                        <div className="text-[10px] text-dark-muted print:text-gray-600">{r.staffRole || 'Staff'}</div>
                      </td>

                      {/* Staff ID */}
                      <td className="py-3 px-3 font-mono text-dark-muted print:text-gray-700">
                        {r.staffIdCode || r.staffId || '—'}
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3 text-dark-muted print:text-gray-700">
                        {r.staffDepartment || r.department || 'N/A'}
                      </td>

                      {/* Period */}
                      <td className="py-3 px-3 font-mono font-bold text-teal-400 print:text-gray-900">
                        {formatPeriod(r.period || r.month)}
                      </td>

                      {/* Attendance Breakdown */}
                      <td className="py-3 px-3 text-center font-mono">
                        <div className="text-[11px]">
                          <span className="text-green-400 font-bold" title="Present">{r.presentDays ?? 0}P</span> / 
                          <span className="text-red-400 font-bold ml-1" title="Absent">{r.absentDays ?? 0}A</span> / 
                          <span className="text-amber-400 font-bold ml-1" title="Half Day">{r.halfDays ?? 0}H</span> / 
                          <span className="text-blue-400 font-bold ml-1" title="Leave">{r.leaveDays ?? 0}L</span>
                        </div>
                        <div className="text-[9px] text-dark-muted">
                          {r.totalWorkingDays ?? 26} Working Days
                        </div>
                      </td>

                      {/* Basic Salary */}
                      <td className="py-3 px-3 text-right font-mono">
                        Rs. {Number(r.basicSalary || 0).toLocaleString()}
                      </td>

                      {/* Allowances */}
                      <td className="py-3 px-3 text-right font-mono text-teal-400 print:text-black">
                        + Rs. {Number(r.totalAllowances || (Number(r.medicalAllowance || 0) + Number(r.transportAllowance || 0))).toLocaleString()}
                      </td>

                      {/* Gross Salary */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-purple-300 print:text-black">
                        Rs. {Number(r.grossSalary || 0).toLocaleString()}
                      </td>

                      {/* Attendance Deduction */}
                      <td className="py-3 px-3 text-right font-mono text-amber-400 print:text-black">
                        - Rs. {Number(r.attendanceDeduction || 0).toLocaleString()}
                      </td>

                      {/* Other Deductions */}
                      <td className="py-3 px-3 text-right font-mono text-rose-400 print:text-black">
                        - Rs. {Number(r.otherDeductions || 0).toLocaleString()}
                      </td>

                      {/* Total Deductions */}
                      <td className="py-3 px-3 text-right font-mono text-red-400 print:text-black font-bold">
                        - Rs. {Number(r.totalDeductions || 0).toLocaleString()}
                      </td>

                      {/* Net Salary */}
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 print:text-gray-900 text-sm">
                        Rs. {Number(r.netSalary || 0).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {isLocked ? (
                          <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 uppercase print:border-gray-400 print:text-black">
                            <Lock size={10} className="text-indigo-400 print:text-black" /> Locked
                          </span>
                        ) : isProcessed ? (
                          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 uppercase print:border-gray-400 print:text-black">
                            <CheckCircle2 size={10} className="text-emerald-400 print:text-black" /> Processed
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 uppercase print:border-gray-400 print:text-black">
                            <Clock size={10} className="text-amber-400 print:text-black" /> Draft
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center print:hidden">
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

              {/* Table Footer Totals Row */}
              <tfoot className="bg-dark-bg/95 font-mono text-white border-t-2 border-teal-500/40 print:bg-gray-100 print:text-black print:border-gray-900">
                <tr>
                  <td colSpan={5} className="py-3 px-3 font-bold uppercase tracking-wider text-right">
                    Report Totals ({filteredRecords.length} records):
                  </td>
                  <td className="py-3 px-3 text-right font-bold">
                    Rs. {summaryMetrics.totalBasic.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-teal-400 print:text-black">
                    Rs. {summaryMetrics.totalAllowances.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-purple-300 print:text-black">
                    Rs. {summaryMetrics.totalGross.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-amber-400 print:text-black">
                    Rs. {summaryMetrics.totalAttendanceDeductions.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-rose-400 print:text-black">
                    Rs. {summaryMetrics.totalOtherDeductions.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-red-400 print:text-black">
                    Rs. {summaryMetrics.totalDeductions.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-400 print:text-gray-900 text-sm">
                    Rs. {summaryMetrics.totalNet.toLocaleString()}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-center text-[10px] text-dark-muted print:text-gray-700 font-sans">
                    Read-Only Report
                  </td>
                </tr>
              </tfoot>

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

export default PayrollReports;
