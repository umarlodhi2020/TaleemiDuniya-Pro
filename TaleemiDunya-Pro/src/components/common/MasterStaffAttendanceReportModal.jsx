import React, { useState, useMemo, useRef } from 'react';
import { 
  Printer, 
  X, 
  Clock, 
  Download, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Calendar,
  Building,
  Check,
  Percent,
  Coins,
  ShieldAlert,
  Sparkles,
  Search
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSchool } from '../../context/SchoolContext';
import { formatTo12h } from '../../utils/timeFormat';

export default function MasterStaffAttendanceReportModal({ 
  isOpen, 
  onClose, 
  staffList = [], 
  monthlyDataByStaff = {}, 
  selectedMonth = '2026-11' 
}) {
  const { schoolData } = useSchool();
  const printAreaRef = useRef(null);

  // View Mode: 'standard' | 'payroll'
  const [viewMode, setViewMode] = useState('standard');
  
  // Late Deduction Policy: '3_lates_half' (3 lates = 0.5 day cut) | '3_lates_full' (3 lates = 1 day cut) | 'none'
  const [lateDeductionPolicy, setLateDeductionPolicy] = useState('3_lates_half');

  // Search filter
  const [reportSearch, setReportSearch] = useState('');

  // Active School Settings Shift Timings
  const shiftIn = schoolData?.staffTimings?.shiftStartTime 
    ? formatTo12h(schoolData.staffTimings.shiftStartTime) 
    : '08:00 AM';
  const shiftOut = schoolData?.staffTimings?.shiftEndTime 
    ? formatTo12h(schoolData.staffTimings.shiftEndTime) 
    : '02:00 PM';

  // Month details
  const { year, month, daysInMonth, sundayCount, workingDaysInMonth, monthLabel } = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const totalDays = new Date(y, m, 0).getDate();

    let sundays = 0;
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(y, m - 1, day);
      if (d.getDay() === 0) {
        sundays++;
      }
    }

    const dObj = new Date(y, m - 1, 1);
    const label = dObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return {
      year: y,
      month: m,
      daysInMonth: totalDays,
      sundayCount: sundays,
      workingDaysInMonth: totalDays - sundays,
      monthLabel: label
    };
  }, [selectedMonth]);

  // Aggregate Data for all staff members with Payroll Deduction Engine
  const staffReportData = useMemo(() => {
    return staffList.map((st, index) => {
      const staffAttMap = monthlyDataByStaff[st.id] || monthlyDataByStaff[st.employeeId] || {};
      
      let presentDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let halfDays = 0;
      let lateDays = 0;
      let lateMinutes = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dObj = new Date(year, month - 1, day);
        if (dObj.getDay() === 0) continue; // Sunday is school holiday

        const dayRec = staffAttMap[day];
        if (!dayRec) continue;

        const status = (typeof dayRec === 'string' ? dayRec : (dayRec.status || '')).toLowerCase();
        
        if (status === 'present') {
          presentDays += 1;
          if (dayRec.isLate) {
            lateDays += 1;
            lateMinutes += (dayRec.minutesLate || 15);
          }
        } else if (status === 'half' || status === 'half day') {
          halfDays += 1;
          presentDays += 0.5;
        } else if (status === 'leave') {
          leaveDays += 1;
        } else if (status === 'absent') {
          absentDays += 1;
        }
      }

      // Expected duty hours: 6h per working day
      const totalDutyHoursRendered = Math.round((presentDays * 6) * 10) / 10;
      const expectedDutyHours = workingDaysInMonth * 6;
      const attendancePercent = workingDaysInMonth > 0 
        ? Math.round((presentDays / workingDaysInMonth) * 100) 
        : 100;

      // Smart Payroll Deduction Engine
      // 1. Late arrival penalty
      let latePenaltyDays = 0;
      if (lateDeductionPolicy === '3_lates_half') {
        latePenaltyDays = Math.floor(lateDays / 3) * 0.5;
      } else if (lateDeductionPolicy === '3_lates_full') {
        latePenaltyDays = Math.floor(lateDays / 3) * 1.0;
      }

      // 2. Unexcused absents deduction (1 absent = 1 day cut)
      const absentDeductionDays = absentDays;

      // 3. Half day remaining deduction (0.5 day cut per half day)
      const halfDayDeductionDays = halfDays * 0.5;

      // Total deduction days
      const totalDeductionDays = absentDeductionDays + latePenaltyDays + halfDayDeductionDays;

      // Net payable days for the month (Sundays & Paid Holidays included)
      const netPayableDays = Math.max(0, daysInMonth - totalDeductionDays);

      const staffShiftIn = st.timingIn ? formatTo12h(st.timingIn) : shiftIn;
      const staffShiftOut = st.timingOut ? formatTo12h(st.timingOut) : shiftOut;

      return {
        srNo: index + 1,
        id: st.id,
        name: st.name || 'Unnamed Staff',
        employeeId: st.employeeId || st.empId || st.id,
        department: st.department || 'Academic',
        designation: st.designation || st.role || 'Teacher',
        phone: st.phone || '',
        shiftTimings: `${staffShiftIn} - ${staffShiftOut}`,
        totalDays: daysInMonth,
        schoolHolidays: sundayCount,
        workingDays: workingDaysInMonth,
        presentDays,
        leaveDays: leaveDays + halfDays,
        absentDays, // Khud ki chuti
        lateDays,
        lateMinutes,
        latePenaltyDays,
        totalDeductionDays,
        netPayableDays,
        dutyHours: `${totalDutyHoursRendered}h / ${expectedDutyHours}h`,
        attendancePercent
      };
    });
  }, [staffList, monthlyDataByStaff, daysInMonth, sundayCount, workingDaysInMonth, year, month, shiftIn, shiftOut, lateDeductionPolicy]);

  // Filtered by search
  const filteredReportData = useMemo(() => {
    if (!reportSearch.trim()) return staffReportData;
    const q = reportSearch.toLowerCase().trim();
    return staffReportData.filter(s => 
      s.name.toLowerCase().includes(q) || 
      String(s.employeeId).toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q)
    );
  }, [staffReportData, reportSearch]);

  // Overall School Totals
  const overallTotals = useMemo(() => {
    let totalPresent = 0;
    let totalLeaves = 0;
    let totalAbsents = 0;
    let totalLate = 0;
    let totalDeduction = 0;

    staffReportData.forEach(s => {
      totalPresent += s.presentDays;
      totalLeaves += s.leaveDays;
      totalAbsents += s.absentDays;
      totalLate += s.lateDays;
      totalDeduction += s.totalDeductionDays;
    });

    return {
      totalStaff: staffReportData.length,
      totalPresent,
      totalLeaves,
      totalAbsents,
      totalLate,
      totalDeduction
    };
  }, [staffReportData]);

  // Print Handler
  const handlePrint = () => {
    const printContent = document.getElementById('master-staff-attendance-printable');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print.");
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Master Staff Attendance Sheet - ${monthLabel}</title>
          ${styles}
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { 
              margin: 0; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              background-color: white !important; 
              font-family: system-ui, -apple-system, sans-serif;
            }
            @media print {
              .no-print { display: none !important; }
              table { width: 100% !important; border-collapse: collapse !important; font-size: 10px !important; }
              th, td { border: 1px solid #475569 !important; padding: 4px 6px !important; }
              th { background-color: #f1f5f9 !important; font-weight: bold !important; color: #0f172a !important; }
            }
          </style>
        </head>
        <body class="bg-white p-2">
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    const rows = filteredReportData.map(s => ({
      "S#": s.srNo,
      "Staff Name": s.name,
      "Staff ID": s.employeeId,
      "Designation": s.designation,
      "Department": s.department,
      "Official Timings": s.shiftTimings,
      "Total Month Days": s.totalDays,
      "School Off (Sundays)": s.schoolHolidays,
      "Working Days (تدریسی دن)": s.workingDays,
      "Present Days (حاضر)": s.presentDays,
      "Approved Leaves (رخصت)": s.leaveDays,
      "Khud Ki Chuti / Absent (غیر حاضر)": s.absentDays,
      "Late Count (تاخیر)": `${s.lateDays} (${s.lateMinutes} mins)`,
      "Salary Deduction Days (کٹوتی)": s.totalDeductionDays,
      "Net Payable Days (قابلِ تنخواہ)": s.netPayableDays,
      "Duty Hours": s.dutyHours,
      "Attendance %": `${s.attendancePercent}%`
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff Attendance");
    XLSX.writeFile(workbook, `Master_Staff_Attendance_${selectedMonth}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden font-sans"
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-7xl max-h-[95vh] shadow-2xl flex flex-col overflow-hidden animate-scaleUp relative">
        
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-sm">
              <Calendar size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Master Staff Attendance & Payroll Sheet</h2>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-black px-2 py-0.5 rounded-full uppercase">
                  ماسٹر حاضری و تنخواہ شیٹ
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {monthLabel} • {staffReportData.length} Staff • Shift: {shiftIn} - {shiftOut}
              </p>
            </div>
          </div>

          {/* Mode Switch & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('standard')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'standard' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('payroll')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'payroll' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coins size={13} />
                <span>Payroll & Deduction</span>
              </button>
            </div>

            {/* Late Deduction Rule Selector (Only shown in payroll mode) */}
            {viewMode === 'payroll' && (
              <select
                value={lateDeductionPolicy}
                onChange={(e) => setLateDeductionPolicy(e.target.value)}
                className="bg-white border border-indigo-200 text-indigo-900 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none shadow-sm cursor-pointer"
                title="Select Late Arrival Salary Deduction Policy"
              >
                <option value="3_lates_half">Policy: 3 Lates = 0.5 Day Cut</option>
                <option value="3_lates_full">Policy: 3 Lates = 1 Day Cut</option>
                <option value="none">Policy: No Late Penalty</option>
              </select>
            )}

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer size={14} /> <span>Print Sheet (PDF)</span>
            </button>

            {/* Excel Button */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download size={14} /> <span>Export Excel</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ml-1"
            >
              <X size={16} /> <span>Close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable Container */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          <div id="master-staff-attendance-printable" ref={printAreaRef} className="space-y-6">
            
            {/* School Letterhead Header */}
            <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {schoolData?.logo ? (
                  <img src={schoolData.logo} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-slate-200" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-sm">
                    {(schoolData?.name || 'T')[0]}
                  </div>
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {schoolData?.name || 'Smart Angels Grammar School'}
                  </h1>
                  <p className="text-xs text-slate-600">{schoolData?.address || 'Campus Address, Pakistan'}</p>
                  <p className="text-xs text-slate-500 font-sans">Phone: {schoolData?.phone || 'N/A'} • Email: {schoolData?.email || 'N/A'}</p>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-900 font-black text-xs uppercase tracking-widest border border-slate-300">
                  {viewMode === 'payroll' ? 'Official Payroll & Attendance Register' : 'Monthly Master Attendance Register'}
                </span>
                <p className="text-xs font-bold text-slate-700 mt-1">Period: <strong className="text-slate-950 font-black">{monthLabel}</strong></p>
                <p className="text-[11px] text-slate-500 font-medium">Standard Shift: {shiftIn} to {shiftOut}</p>
              </div>
            </div>

            {/* Quick 6-Way Summary KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Staff</span>
                <span className="text-xl font-black text-slate-900">{overallTotals.totalStaff}</span>
                <span className="text-[10px] text-slate-500 block">کل ملازمین</span>
              </div>
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-sky-700 uppercase block">School Holidays</span>
                <span className="text-xl font-black text-sky-900">{sundayCount} Days</span>
                <span className="text-[10px] text-sky-600 block">اسکول چھٹیاں / اتوار</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Present Days</span>
                <span className="text-xl font-black text-emerald-900">{overallTotals.totalPresent}</span>
                <span className="text-[10px] text-emerald-600 block">مجموعی حاضری</span>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-purple-700 uppercase block">Approved Leaves</span>
                <span className="text-xl font-black text-purple-900">{overallTotals.totalLeaves}</span>
                <span className="text-[10px] text-purple-600 block">منظور شدہ رخصت</span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-rose-700 uppercase block">Khud Ki Chuti (Absent)</span>
                <span className="text-xl font-black text-rose-900">{overallTotals.totalAbsents}</span>
                <span className="text-[10px] text-rose-600 block">غیر حاضر / خود چھٹی</span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-amber-700 uppercase block">
                  {viewMode === 'payroll' ? 'Salary Deduction' : 'Late Arrivals'}
                </span>
                <span className="text-xl font-black text-amber-900">
                  {viewMode === 'payroll' ? `${overallTotals.totalDeduction} Days` : overallTotals.totalLate}
                </span>
                <span className="text-[10px] text-amber-700 block">
                  {viewMode === 'payroll' ? 'تنخواہ کٹوتی ایام' : 'تاخیر آمد'}
                </span>
              </div>
            </div>

            {/* Quick In-Modal Search Bar (No Print) */}
            <div className="no-print flex items-center justify-between gap-3">
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Filter staff in table..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
              </div>

              {viewMode === 'payroll' && (
                <div className="text-xs text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 font-bold flex items-center gap-1.5">
                  <ShieldAlert size={14} />
                  <span>Formula: Unexcused Absent (100% Cut) + {lateDeductionPolicy === '3_lates_half' ? '3 Lates = 0.5 Day Cut' : lateDeductionPolicy === '3_lates_full' ? '3 Lates = 1 Day Cut' : 'No late penalty'}</span>
                </div>
              )}
            </div>

            {/* Master Attendance Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-black text-slate-800 uppercase tracking-wider">
                    <th className="py-2.5 px-2 text-center w-8">#</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Staff Member</th>
                    <th className="py-2.5 px-2 min-w-[75px]">Role / Dept</th>
                    <th className="py-2.5 px-2 text-center min-w-[90px]">Timings</th>
                    <th className="py-2.5 px-2 text-center w-12" title="Days in Month">Month Days</th>
                    <th className="py-2.5 px-2 text-center w-12 bg-sky-50 text-sky-900" title="School Off (Sundays/Holidays)">School Off</th>
                    <th className="py-2.5 px-2 text-center w-12" title="Net Working Days">Work Days</th>
                    <th className="py-2.5 px-2 text-center w-12 bg-emerald-50 text-emerald-900 font-black">Present (حاضر)</th>
                    <th className="py-2.5 px-2 text-center w-12 bg-purple-50 text-purple-900">Leaves (رخصت)</th>
                    <th className="py-2.5 px-2 text-center w-12 bg-rose-50 text-rose-900">Absent (خود چھٹی)</th>
                    <th className="py-2.5 px-2 text-center w-14 bg-amber-50 text-amber-900">Late (تاخیر)</th>
                    
                    {/* Additional Payroll Columns */}
                    {viewMode === 'payroll' && (
                      <>
                        <th className="py-2.5 px-2 text-center w-14 bg-rose-100 text-rose-900 font-black border-l border-r border-rose-300">
                          Cut Days (کٹوتی)
                        </th>
                        <th className="py-2.5 px-2 text-center w-16 bg-emerald-100 text-emerald-950 font-black border-r border-emerald-300">
                          Payable Days (قابل ادا)
                        </th>
                      </>
                    )}

                    <th className="py-2.5 px-2 text-center min-w-[75px]">Duty Hours</th>
                    <th className="py-2.5 px-2 text-center w-14 font-black">Att %</th>
                    <th className="py-2.5 px-3 text-center min-w-[75px]">Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredReportData.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-2 text-center font-bold text-slate-500">{s.srNo}</td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ID: {s.employeeId}</div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="font-semibold text-slate-800">{s.designation}</div>
                        <div className="text-[10px] text-slate-500">{s.department}</div>
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600">
                        {s.shiftTimings}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-600 font-semibold">{s.totalDays}</td>
                      <td className="py-2 px-2 text-center text-sky-800 font-bold bg-sky-50/50">{s.schoolHolidays}</td>
                      <td className="py-2 px-2 text-center text-slate-800 font-bold">{s.workingDays}</td>
                      <td className="py-2 px-2 text-center text-emerald-800 font-black bg-emerald-50/50 text-sm">
                        {s.presentDays}
                      </td>
                      <td className="py-2 px-2 text-center text-purple-800 font-bold bg-purple-50/50">
                        {s.leaveDays}
                      </td>
                      <td className="py-2 px-2 text-center text-rose-800 font-bold bg-rose-50/50">
                        {s.absentDays}
                      </td>
                      <td className="py-2 px-2 text-center text-amber-800 font-semibold bg-amber-50/50">
                        {s.lateDays > 0 ? `${s.lateDays} (${s.lateMinutes}m)` : '-'}
                      </td>

                      {/* Payroll Dynamic Columns */}
                      {viewMode === 'payroll' && (
                        <>
                          <td className="py-2 px-2 text-center font-black bg-rose-50 text-rose-700 border-l border-r border-rose-200">
                            {s.totalDeductionDays > 0 ? `-${s.totalDeductionDays}d` : '0d'}
                          </td>
                          <td className="py-2 px-2 text-center font-black bg-emerald-50 text-emerald-900 border-r border-emerald-200 text-sm">
                            {s.netPayableDays}d
                          </td>
                        </>
                      )}

                      <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-700">
                        {s.dutyHours}
                      </td>
                      <td className="py-2 px-2 text-center font-black">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                          s.attendancePercent >= 90 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : s.attendancePercent >= 75 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {s.attendancePercent}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="h-6 border-b border-dashed border-slate-300"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Principal Signature & School Stamp */}
            <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-4">
                <div className="h-8 border-b border-dashed border-slate-400"></div>
                <p className="font-bold text-slate-800">Prepared By (تیار کردہ)</p>
              </div>
              <div className="space-y-4">
                <div className="h-8 border-b border-dashed border-slate-400"></div>
                <p className="font-bold text-slate-800">مہر ادارہ (School Official Stamp)</p>
              </div>
              <div className="space-y-4">
                <div className="h-8 border-b border-dashed border-slate-400"></div>
                <p className="font-bold text-slate-800">دستخط پرنسپل (Principal / Admin Sign)</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
