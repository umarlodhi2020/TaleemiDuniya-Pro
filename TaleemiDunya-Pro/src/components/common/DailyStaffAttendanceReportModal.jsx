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
  Calendar,
  Building,
  LogIn,
  LogOut,
  UserCheck,
  Search,
  Scan
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSchool } from '../../context/SchoolContext';
import { formatTo12h, calculateDutyHours } from '../../utils/timeFormat';
import { normalizeTo24h } from '../../pages/school-admin/StaffAttendanceRegister';

/**
 * DailyStaffAttendanceReportModal
 * Single-Day Staff Attendance & Punch Log Sheet ("Rozana Hazri aur In/Out Time Sheet").
 * Features A4 Landscape/Portrait print layout, PDF export, Excel export, and live punch details.
 */
export default function DailyStaffAttendanceReportModal({ 
  isOpen, 
  onClose, 
  selectedDate = new Date().toISOString().split('T')[0], 
  staffList = [], 
  dailyAttendanceMap = {},
  onDateChange
}) {
  const { schoolData } = useSchool();
  const printAreaRef = useRef(null);

  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [searchTerm, setSearchTerm] = useState('');

  // Sync internal date with props
  const activeDate = onDateChange ? selectedDate : currentDate;

  const handleDateChangeInternal = (newDate) => {
    setCurrentDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  // Active School Settings Shift Timings
  const defaultShiftIn = schoolData?.staffTimings?.shiftStartTime 
    ? formatTo12h(schoolData.staffTimings.shiftStartTime) 
    : '08:00 AM';
  const defaultShiftOut = schoolData?.staffTimings?.shiftEndTime 
    ? formatTo12h(schoolData.staffTimings.shiftEndTime) 
    : '02:00 PM';

  // Format date labels
  const { formattedDateEng, formattedDayName, formattedDateUrdu } = useMemo(() => {
    try {
      const parts = activeDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const eng = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      const day = d.toLocaleDateString('en-US', { weekday: 'long' });
      
      const urduDays = {
        'Sunday': 'اتوار',
        'Monday': 'پیر',
        'Tuesday': 'منگل',
        'Wednesday': 'بدھ',
        'Thursday': 'جمعرات',
        'Friday': 'جمعہ',
        'Saturday': 'ہفتہ'
      };

      return {
        formattedDateEng: eng,
        formattedDayName: day,
        formattedDateUrdu: `${urduDays[day] || day}، بتاریخ ${activeDate}`
      };
    } catch {
      return {
        formattedDateEng: activeDate,
        formattedDayName: '',
        formattedDateUrdu: activeDate
      };
    }
  }, [activeDate]);

  // Aggregate daily staff data
  const staffRows = useMemo(() => {
    return staffList.map((st, index) => {
      const att = dailyAttendanceMap[st.id] ||
        dailyAttendanceMap[st.employeeId] ||
        dailyAttendanceMap[st.staffId] ||
        dailyAttendanceMap[`name_${String(st.name || '').toLowerCase().trim()}`] ||
        {};

      const currentStatus = (att.status || '').toLowerCase();

      // Role/Department based assigned shift
      let assignedShiftIn = st.timingIn || st.shiftStartTime || st.expectedTimeIn;
      let assignedShiftOut = st.timingOut || st.shiftEndTime || st.expectedTimeOut;

      if (!assignedShiftIn || !assignedShiftOut) {
        const dept = String(st.department || '').toLowerCase();
        const desig = String(st.designation || st.role || '').toLowerCase();
        if (dept.includes('support') || desig.includes('peon') || desig.includes('guard') || desig.includes('maid')) {
          assignedShiftIn = '07:00 AM';
          assignedShiftOut = '02:00 PM';
        } else if (dept.includes('management') || desig.includes('principal') || desig.includes('head') || desig.includes('vice')) {
          assignedShiftIn = '07:45 AM';
          assignedShiftOut = '02:00 PM';
        } else if (dept.includes('account') || desig.includes('cashier')) {
          assignedShiftIn = '08:00 AM';
          assignedShiftOut = '02:00 PM';
        } else {
          assignedShiftIn = defaultShiftIn;
          assignedShiftOut = defaultShiftOut;
        }
      }
      assignedShiftIn = formatTo12h(assignedShiftIn);
      assignedShiftOut = formatTo12h(assignedShiftOut);
      const assignedShiftStr = `${assignedShiftIn} - ${assignedShiftOut}`;

      // In/Out and Duty duration (100% REAL: TimeOut is ONLY shown if actually clocked out)
      const rawIn = att.timeIn || '';
      const rawOut = (att.actionType === 'ENTRY') ? '' : (att.timeOut || '');
      const displayTimeIn = rawIn ? formatTo12h(rawIn) : '';
      const displayTimeOut = rawOut ? formatTo12h(rawOut) : '';
      const duty = (displayTimeIn && displayTimeOut) ? calculateDutyHours(displayTimeIn, displayTimeOut) : null;

      // Check punctuality
      let isLate = !!att.isLate;
      let minutesLate = att.minutesLate || 0;
      if (!isLate && displayTimeIn && assignedShiftIn) {
        try {
          const [inH, inM] = normalizeTo24h(displayTimeIn).split(':').map(Number);
          const [sH, sM] = normalizeTo24h(assignedShiftIn).split(':').map(Number);
          const diff = (inH * 60 + inM) - (sH * 60 + sM);
          if (diff > 0) {
            isLate = true;
            minutesLate = diff;
          }
        } catch {
          // ignore parsing error
        }
      }

      // Clean, professional staff ID
      const cleanEmpId = st.staffId || st.employeeId || st.empId || (st.id && st.id.length > 8 ? `STF-${String(index + 1).padStart(3, '0')}` : st.id);

      return {
        srNo: index + 1,
        id: st.id,
        name: st.name || 'Unnamed Staff',
        employeeId: cleanEmpId,
        department: st.department || 'Academic',
        designation: st.designation || st.role || 'Teacher',
        phone: st.phone || '',
        assignedShiftStr,
        assignedShiftIn,
        assignedShiftOut,
        timeIn: displayTimeIn,
        timeOut: displayTimeOut,
        dutyDuration: duty ? duty.formatted : (displayTimeIn ? 'On Duty (حاضر)' : '-'),
        isLate,
        minutesLate,
        isCardScan: !!att.isCardScan,
        status: currentStatus || 'not_marked',
        notes: att.notes || ''
      };
    });
  }, [staffList, dailyAttendanceMap, defaultShiftIn, defaultShiftOut]);

  // Filtered rows by search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return staffRows;
    const q = searchTerm.toLowerCase().trim();
    return staffRows.filter(r => 
      r.name.toLowerCase().includes(q) ||
      r.employeeId.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.designation.toLowerCase().includes(q)
    );
  }, [staffRows, searchTerm]);

  // Daily Summary Metrics
  const summary = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let half = 0;
    let leave = 0;
    let notMarked = 0;

    staffRows.forEach(r => {
      if (r.status === 'present') {
        present++;
        if (r.isLate) late++;
      } else if (r.status === 'absent') {
        absent++;
      } else if (r.status === 'half' || r.status === 'half day') {
        half++;
        present += 0.5;
      } else if (r.status === 'leave') {
        leave++;
      } else {
        notMarked++;
      }
    });

    const totalStaff = staffRows.length;
    const attPercent = totalStaff > 0 ? Math.round((present / totalStaff) * 100) : 0;

    return {
      totalStaff,
      present,
      late,
      absent,
      half,
      leave,
      notMarked,
      attPercent
    };
  }, [staffRows]);

  // 1-Click Print
  const handlePrint = () => {
    window.print();
  };

  // 1-Click Excel Export
  const handleExportExcel = () => {
    const dataToExport = filteredRows.map(r => ({
      "Sr #": r.srNo,
      "Staff Name": r.name,
      "Employee ID": r.employeeId,
      "Designation": r.designation,
      "Department": r.department,
      "Official Shift": r.assignedShiftStr,
      "Time In (آمد)": r.timeIn || 'Not Clocked In',
      "Time Out (رخصت)": r.timeOut || 'Not Clocked Out',
      "Duration (دورانیہ)": r.dutyDuration,
      "Punctuality": r.isLate ? `Late (${r.minutesLate}m)` : (r.timeIn ? 'On Time' : '-'),
      "Attendance Status": r.status.toUpperCase(),
      "Punch Source": r.isCardScan ? 'ID Card Scanner' : 'Manual / Auto Shift',
      "Remarks / Notes": r.notes
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Staff Attendance");

    // Auto-fit column widths
    const colWidths = [
      { wch: 6 },
      { wch: 22 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 25 },
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `Staff_Daily_Attendance_${activeDate}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      {/* Print-specific style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #daily-staff-print-area, #daily-staff-print-area * {
            visibility: visible;
          }
          #daily-staff-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[96vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Interactive Action Bar (Hidden on Print) */}
        <div className="no-print p-4 sm:px-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-400 border border-primary-500/30 flex items-center justify-center font-bold">
              <Calendar size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Daily Staff Attendance Sheet</h2>
                <span className="text-[10px] bg-primary-500/20 text-primary-300 font-bold px-2 py-0.5 rounded-full border border-primary-500/30">
                  روزانہ ٹائم شیٹ
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {formattedDayName}, {formattedDateEng} &nbsp;•&nbsp; {staffList.length} Total Staff Members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Selector */}
            <input 
              type="date"
              value={activeDate}
              onChange={(e) => handleDateChangeInternal(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-primary-400 shadow-sm"
              title="Change date of attendance sheet"
            />

            {/* Print Sheet PDF Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-primary-500/20 transition-all cursor-pointer"
              title="Print official single-day sheet or Save as PDF"
            >
              <Printer size={15} />
              <span>Print Sheet (PDF)</span>
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              title="Download Excel Sheet"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar (Hidden on Print) */}
        <div className="no-print p-3 sm:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <input 
              type="text"
              placeholder="Search by staff name, ID or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary-500 font-medium"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{filteredRows.length}</span> of {staffRows.length} staff
          </div>
        </div>

        {/* PRINTABLE AREA */}
        <div ref={printAreaRef} id="daily-staff-print-area" className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white">
          <div className="space-y-6">

            {/* Official School Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b-2 border-slate-900">
              <div className="flex items-center gap-4 text-center sm:text-left">
                {schoolData?.logo ? (
                  <img src={schoolData.logo} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-slate-200 shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-sm">
                    {(schoolData?.name || 'T')[0]}
                  </div>
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {schoolData?.name || 'Smart Angels Grammar School'}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">{schoolData?.address || 'Campus Address, Pakistan'}</p>
                  <p className="text-xs text-slate-500">Phone: {schoolData?.phone || '0331-2202569'} &nbsp;•&nbsp; Email: {schoolData?.email || 'school@taleemidunya.com'}</p>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest">
                  DAILY STAFF ATTENDANCE SHEET
                </span>
                <p className="text-sm font-black text-slate-900 mt-1 font-mono">{formattedDateEng}</p>
                <p className="text-xs font-bold text-primary-700">{formattedDateUrdu}</p>
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Staff (کل عملہ)</span>
                <span className="text-base font-black text-slate-900">{summary.totalStaff}</span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Present (حاضر عملہ)</span>
                <span className="text-base font-black text-emerald-900">{summary.present}</span>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-[10px] font-bold text-amber-700 uppercase block">Late Arrivals (تاخیر)</span>
                <span className="text-base font-black text-amber-900">{summary.late}</span>
              </div>
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="text-[10px] font-bold text-rose-700 uppercase block">Absents (غیر حاضر)</span>
                <span className="text-base font-black text-rose-900">{summary.absent}</span>
              </div>
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                <span className="text-[10px] font-bold text-purple-700 uppercase block">Leaves / Half Day</span>
                <span className="text-base font-black text-purple-900">{summary.leave + summary.half}</span>
              </div>
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="text-[10px] font-bold text-indigo-700 uppercase block">Attendance Rate</span>
                <span className="text-base font-black text-indigo-900">{summary.attPercent}%</span>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-black text-slate-800 uppercase tracking-wider">
                    <th className="py-2.5 px-2 text-center w-8">#</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Staff Member</th>
                    <th className="py-2.5 px-2 min-w-[110px]">Role / Department</th>
                    <th className="py-2.5 px-2 text-center min-w-[100px]">Official Shift</th>
                    <th className="py-2.5 px-2 text-center min-w-[110px] bg-emerald-50 text-emerald-950 font-black">
                      Time In (وقت آمد)
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[110px] bg-purple-50 text-purple-950 font-black">
                      Time Out (وقت رخصت)
                    </th>
                    <th className="py-2.5 px-2 text-center w-16">Duration</th>
                    <th className="py-2.5 px-2 text-center w-20">Punctuality</th>
                    <th className="py-2.5 px-2 text-center w-24">Status (کیفیت)</th>
                    <th className="py-2.5 px-3 text-center min-w-[100px]">Staff Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-8 text-center text-slate-400 font-medium">
                        No staff attendance recorded for this date.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-2 text-center font-bold text-slate-500">{r.srNo}</td>
                        
                        {/* Name & ID */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{r.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono font-bold flex items-center gap-1.5">
                            <span>ID: {r.employeeId}</span>
                            {r.isCardScan && (
                              <span className="px-1.5 py-0.2 rounded-full bg-cyan-100 text-cyan-800 text-[8px] font-black uppercase">
                                Card Scan
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Role & Dept */}
                        <td className="py-2.5 px-2">
                          <div className="font-semibold text-slate-800">{r.designation}</div>
                          <div className="text-[10px] text-slate-500">{r.department}</div>
                        </td>

                        {/* Shift */}
                        <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600">
                          {r.assignedShiftStr}
                        </td>

                        {/* Time In */}
                        <td className="py-2.5 px-2 text-center font-mono text-xs bg-emerald-50/40">
                          {r.timeIn ? (
                            <span className="font-black text-emerald-800 flex items-center justify-center gap-1">
                              <LogIn size={11} className="text-emerald-600" />
                              <span>{r.timeIn}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">--:--</span>
                          )}
                        </td>

                        {/* Time Out */}
                        <td className="py-2.5 px-2 text-center font-mono text-xs bg-purple-50/40">
                          {r.timeOut ? (
                            <span className="font-black text-purple-800 flex items-center justify-center gap-1">
                              <LogOut size={11} className="text-purple-600" />
                              <span>{r.timeOut}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">--:--</span>
                          )}
                        </td>

                        {/* Duration */}
                        <td className="py-2.5 px-2 text-center font-mono text-[11px] font-bold text-slate-700">
                          {r.dutyDuration}
                        </td>

                        {/* Punctuality */}
                        <td className="py-2.5 px-2 text-center">
                          {r.status === 'present' ? (
                            r.isLate ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black">
                                Late ({r.minutesLate}m)
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                On Time
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            r.status === 'present'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : r.status === 'absent'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : r.status === 'leave'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : r.status === 'half'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}>
                            {r.status === 'present' 
                              ? 'Present حاضر' 
                              : r.status === 'absent' 
                              ? 'Absent غیر حاضر' 
                              : r.status === 'leave' 
                              ? 'Leave رخصت' 
                              : r.status === 'half' 
                              ? 'Half Day نصف' 
                              : 'Not Marked'}
                          </span>
                        </td>

                        {/* Signature Line */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="h-6 border-b border-dashed border-slate-400"></div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Verification Signatures at Bottom */}
            <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-4">
                <div className="h-8 border-b border-dashed border-slate-400"></div>
                <p className="font-bold text-slate-800 uppercase tracking-wider">Attendance Incharge</p>
                <p className="text-[10px] text-slate-500">ناظمِ حاضری لاگ</p>
              </div>
              <div className="space-y-4">
                <div className="h-8 border-b border-dashed border-slate-400"></div>
                <p className="font-bold text-slate-800 uppercase tracking-wider">Principal / Head Office</p>
                <p className="text-[10px] text-slate-500">تصدیق پرنسپل / ڈائریکٹر</p>
              </div>
              <div className="space-y-4">
                <div className="h-8 border-b border-dashed border-slate-400"></div>
                <p className="font-bold text-slate-800 uppercase tracking-wider">Official Stamp</p>
                <p className="text-[10px] text-slate-500">مہر ادارہ</p>
              </div>
            </div>

            {/* Generated Timestamp */}
            <div className="pt-2 text-[10px] text-slate-400 text-center font-mono">
              Generated by Taleemi Dunya Pro Cloud ERP on {new Date().toLocaleString()} • Official School Record
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

