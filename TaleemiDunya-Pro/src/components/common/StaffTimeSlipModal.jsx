import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Printer, 
  X, 
  Clock, 
  Calendar, 
  Download, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  MessageCircle,
  Building,
  Briefcase,
  ShieldCheck,
  TrendingUp,
  Percent
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getRecords, getStaffAttendanceByMonth } from '../../services/db';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { formatTo12h, calculateDutyHours } from '../../utils/timeFormat';

/**
 * StaffTimeSlipModal
 * Ultra-advanced, printable, and exportable Staff Time Slip & Punch Log ("Kub Aaya aur Kub Gya").
 */
export default function StaffTimeSlipModal({ staff, onClose, initialPeriod }) {
  const { schoolData } = useSchool();
  const { userData } = useAuth();
  const printAreaRef = useRef(null);

  const activeSchoolId = userData?.schoolId || schoolData?.id;

  // Selected period: "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (initialPeriod) return initialPeriod;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  // Expected timings (checks staff individual timing, falls back to School Settings staffTimings, then default)
  const defaultShiftIn = schoolData?.staffTimings?.shiftStartTime ? formatTo12h(schoolData.staffTimings.shiftStartTime) : '08:00 AM';
  const defaultShiftOut = schoolData?.staffTimings?.shiftEndTime ? formatTo12h(schoolData.staffTimings.shiftEndTime) : '02:00 PM';
  const shiftTimeIn = staff?.timingIn || staff?.expectedTimeIn || defaultShiftIn;
  const shiftTimeOut = staff?.timingOut || staff?.expectedTimeOut || defaultShiftOut;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch real staff attendance for selected month
  useEffect(() => {
    const fetchStaffAttendance = async () => {
      if (!staff?.id || !activeSchoolId) return;
      setLoading(true);
      try {
        let docs = [];

        // 1. Fetch monthly records via db helper
        try {
          const mRecords = await getStaffAttendanceByMonth(activeSchoolId, selectedMonth);
          if (Array.isArray(mRecords) && mRecords.length > 0) {
            docs = [...docs, ...mRecords];
          }
        } catch (e) {
          console.warn('getStaffAttendanceByMonth notice:', e);
        }

        // 2. Fetch from attendance collection for this school (safe non-composite query)
        try {
          const allSchoolAtt = await getRecords('attendance', activeSchoolId);
          if (Array.isArray(allSchoolAtt) && allSchoolAtt.length > 0) {
            docs = [...docs, ...allSchoolAtt];
          }
        } catch (e) {
          // Direct fallback query by schoolId only
          try {
            const q = query(collection(db, 'attendance'), where('schoolId', '==', activeSchoolId));
            const snap = await getDocs(q);
            docs = [...docs, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))];
          } catch (err2) {
            console.warn('Direct attendance query notice:', err2);
          }
        }

        // 3. Also check subcollection schools/{schoolId}/attendance
        try {
          const subSnap = await getDocs(collection(db, 'schools', activeSchoolId, 'attendance'));
          if (!subSnap.empty) {
            docs = [...docs, ...subSnap.docs.map(d => ({ id: d.id, ...d.data() }))];
          }
        } catch (e) {
          // Subcollection optional
        }

        // De-duplicate docs by unique key
        const uniqueDocs = [];
        const seenKeys = new Set();
        for (const item of docs) {
          if (!item) continue;
          const k = item.id || `${item.staffId || ''}_${item.date || ''}`;
          if (!seenKeys.has(k)) {
            seenKeys.add(k);
            uniqueDocs.push(item);
          }
        }

        // Match staff member identifiers
        const staffIdentifiers = [
          staff.id,
          staff.employeeId,
          staff.staffId,
          staff.userId,
          staff.empId
        ].filter(Boolean);

        const staffDocs = uniqueDocs.filter(r => {
          if (!r.date || !String(r.date).startsWith(selectedMonth)) return false;

          const recordStaffIds = [
            r.staffId,
            r.employeeId,
            r.userId,
            r.id ? r.id.split('_')[0] : null
          ].filter(Boolean);

          const matchesId = staffIdentifiers.some(sid => recordStaffIds.includes(sid));
          const matchesName = staff.name && r.staffName && (
            String(r.staffName).toLowerCase().trim() === String(staff.name).toLowerCase().trim()
          );

          return matchesId || matchesName;
        });

        setAttendanceRecords(staffDocs);
      } catch (err) {
        console.error('Failed to load real staff attendance:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffAttendance();
  }, [staff, activeSchoolId, selectedMonth]);

  // Generate all calendar days of the selected month
  const monthDays = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const days = [];
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dObj = new Date(year, month - 1, dayNum);
      const dayName = dObj.toLocaleDateString('en-US', { weekday: 'short' });
      const isSunday = dObj.getDay() === 0;
      const isFuture = dateStr > todayStr;
      const dateFormatted = dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      // Find matching attendance record
      const match = attendanceRecords.find(r => r.date === dateStr);

      let status = isFuture ? 'upcoming' : match ? (match.status || 'present') : 'not_marked';
      let timeIn = '-';
      let timeOut = '-';
      let hoursWorked = '-';
      let isLate = false;
      let minutesLate = 0;

      if (isSunday) {
        status = 'sunday';
        timeIn = 'Weekend';
        timeOut = 'Off';
        hoursWorked = '0h';
      } else if (match) {
        status = (match.status || 'present').toLowerCase();
        isLate = !!match.isLate;
        minutesLate = match.minutesLate || 0;

        if (status === 'present') {
          const rawIn = match.timeIn || match.time || match.timeInRaw || '';
          const rawOut = match.timeOut || match.timeOutRaw || '';
          const isEntryOnly = match.actionType === 'ENTRY';

          // 100% REAL DATA: Sirf tab time show hoga jab waqai scan ya clock hua ho
          timeIn = (rawIn && rawIn !== '-') ? formatTo12h(rawIn) : '-';
          timeOut = (rawOut && rawOut !== '-' && !isEntryOnly) ? formatTo12h(rawOut) : '-';
          
          if (timeIn && timeIn !== '-' && timeOut && timeOut !== '-') {
            const duty = calculateDutyHours(timeIn, timeOut);
            hoursWorked = duty ? duty.formatted : '-';
          } else if (timeIn && timeIn !== '-') {
            hoursWorked = 'On Duty (حاضر)';
          } else {
            hoursWorked = '-';
          }
        } else if (status === 'leave') {
          timeIn = 'Approved';
          timeOut = 'Leave';
          hoursWorked = 'Excused';
        } else if (status === 'absent') {
          timeIn = 'Absent';
          timeOut = 'Absent';
          hoursWorked = '0h 0m';
        } else if (status === 'half') {
          const rawIn = match.timeIn || match.time || match.timeInRaw || '';
          timeIn = (rawIn && rawIn !== '-') ? formatTo12h(rawIn) : '-';
          timeOut = 'Half Day';
          hoursWorked = '3h 0m';
        } else {
          timeIn = (match.timeIn && match.timeIn !== '-') ? formatTo12h(match.timeIn) : '-';
          timeOut = (match.timeOut && match.timeOut !== '-') ? formatTo12h(match.timeOut) : '-';
          hoursWorked = '-';
        }
      }

      days.push({
        date: dateStr,
        dateFormatted,
        dayNumber: dayNum,
        dayName,
        isSunday,
        isFuture,
        record: match,
        status,
        timeIn,
        timeOut,
        hoursWorked,
        isLate,
        minutesLate
      });
    }
    return days;
  }, [selectedMonth, attendanceRecords]);

  // Aggregate Metrics
  const summaryMetrics = useMemo(() => {
    let workingDays = 0;
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let leaveDays = 0;
    let schoolHolidayDays = 0;
    let notMarkedDays = 0;
    let totalLateMinutes = 0;

    monthDays.forEach(d => {
      if (d.isSunday) {
        schoolHolidayDays += 1;
        return;
      }
      if (d.isFuture) return;

      workingDays += 1;

      const st = String(d.status).toLowerCase();
      if (st === 'present' || st === 'late' || (d.timeIn && d.timeIn !== '-' && d.timeIn !== 'Absent' && d.timeIn !== 'Approved')) {
        presentDays += 1;
        if (d.isLate) {
          lateDays += 1;
          totalLateMinutes += (d.minutesLate || 0);
        }
      } else if (st === 'half' || st === 'half day') {
        halfDays += 1;
        presentDays += 0.5;
      } else if (st === 'leave') {
        leaveDays += 1;
      } else if (st === 'absent') {
        absentDays += 1;
      } else {
        notMarkedDays += 1;
      }
    });

    const punctualityRate = presentDays > 0 ? Math.round(((presentDays - lateDays) / presentDays) * 100) : 100;
    const attendancePercentage = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 100;

    return {
      totalMonthDays: monthDays.length,
      schoolHolidayDays,
      workingDays,
      presentDays,
      lateDays,
      absentDays,
      halfDays,
      leaveDays,
      notMarkedDays,
      totalLateMinutes,
      punctualityRate,
      attendancePercentage
    };
  }, [monthDays]);

  // Print Handler
  const handlePrint = () => {
    const printContent = document.getElementById('staff-timeslip-printable-area');
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
          <title>Staff Time Slip - ${staff?.name || 'Staff'}</title>
          ${styles}
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { 
              margin: 0; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              background-color: white !important; 
              font-family: system-ui, -apple-system, sans-serif;
            }
            @media print {
              * {
                color: black !important;
                background-color: transparent !important;
                box-shadow: none !important;
              }
              .no-print { display: none !important; }
              table { width: 100% !important; border-collapse: collapse !important; }
              th, td { border: 1px solid #cbd5e1 !important; padding: 4px 8px !important; }
              th { background-color: #f1f5f9 !important; font-weight: bold !important; }
            }
          </style>
        </head>
        <body class="bg-white p-4">
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

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Day', 'Time In (Kub Aaya)', 'Time Out (Kub Gya)', 'Duration', 'Status', 'Late Minutes'];
    const rows = monthDays.map(d => [
      d.dateFormatted || d.date,
      d.dayName,
      d.isSunday || d.isFuture ? '-' : d.timeIn,
      d.isSunday || d.isFuture ? '-' : d.timeOut,
      d.isSunday || d.isFuture ? '-' : d.hoursWorked,
      d.isSunday ? 'Sunday Holiday' : d.isFuture ? 'Upcoming' : d.status,
      d.minutesLate || 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TimeSlip_${staff?.name || 'Staff'}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp Time Slip to Staff Member
  const handleWhatsAppTimeSlip = () => {
    const phone = staff?.phone || staff?.contactNumber || staff?.whatsappNo || '';
    if (!phone) {
      alert('Is staff member ka phone number mojood nahi hai.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
    
    const msg = encodeURIComponent(
      `*محترم ${staff.name} صاحب!* (${staff.designation || staff.role || 'Staff'})\n` +
      `آپ کی ماہانہ ٹائم سلپ اور حاضری رپورٹ برائے ماہ *${selectedMonth}* درج ذیل ہے:\n\n` +
      `📅 کل ورکنگ ڈیز: ${summaryMetrics.workingDays}\n` +
      `✅ کل حاضری: ${summaryMetrics.presentDays} دن\n` +
      `⏰ لیٹ آمد: ${summaryMetrics.lateDays} دن (کل تاخیر: ${summaryMetrics.totalLateMinutes} منٹ)\n` +
      `❌ غیر حاضر: ${summaryMetrics.absentDays} دن\n` +
      `📊 مجموعی حاضری شرح: ${summaryMetrics.attendancePercentage}%\n\n` +
      `ادارہ: *${schoolData?.name || 'TaleemiDunya School'}*`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden font-sans"
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-scaleUp relative">
        
        {/* Top Header Bar (Fixed & Sticky) */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-sm">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Staff Time Slip & Punch Log</h2>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-black px-2 py-0.5 rounded-full uppercase">
                  آمد و رخصت لاگ
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {staff?.name} • {staff?.designation || staff?.role || 'Staff'} • ID: {staff?.staffId || staff?.employeeId || staff?.empId || (staff?.id?.length > 8 ? staff?.id.slice(0, 8) : staff?.id)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Month Picker */}
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-indigo-500 shadow-sm"
            />

            {/* Print Slip Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer size={14} /> <span className="hidden sm:inline">Print Slip</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download size={14} /> <span className="hidden sm:inline">Export</span>
            </button>

            {/* WhatsApp to Staff */}
            {staff?.phone && (
              <button
                onClick={handleWhatsAppTimeSlip}
                className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-sm transition-all cursor-pointer"
                title="Send Time Slip summary on WhatsApp"
              >
                <MessageCircle size={16} />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ml-1"
              title="Close Time Slip (Esc)"
            >
              <X size={16} /> <span className="font-bold">Close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable Container */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 md:p-8 space-y-6">
          <div id="staff-timeslip-printable-area" ref={printAreaRef} className="space-y-6">
            
            {/* Official Letterhead Header */}
            <div className="border-b-2 border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {schoolData?.logo ? (
                  <img src={schoolData.logo} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-slate-200" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-sm">
                    {(schoolData?.name || 'T')[0]}
                  </div>
                )}
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {schoolData?.name || 'Smart Angels Grammar School'}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">{schoolData?.address || 'Campus Address, Pakistan'}</p>
                  <p className="text-xs text-slate-500 font-sans">Phone: {schoolData?.phone || 'N/A'} • Email: {schoolData?.email || 'N/A'}</p>
                </div>
              </div>

              <div className="md:text-right">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-900 font-black text-xs uppercase tracking-widest border border-slate-300">
                  Official Staff Time Slip
                </span>
                <p className="text-xs font-bold text-slate-700 mt-1">Period: <span className="font-sans font-bold">{selectedMonth}</span></p>
                <p className="text-[11px] text-slate-500">Shift Timings: {shiftTimeIn} - {shiftTimeOut}</p>
              </div>
            </div>

            {/* Staff Information Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Name</span>
                <span className="text-sm font-black text-slate-900">{staff?.name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Designation</span>
                <span className="text-xs font-bold text-slate-800">{staff?.designation || staff?.role || 'Staff'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Employee ID</span>
                <span className="text-xs font-bold text-slate-800 tabular-nums">{staff?.staffId || staff?.employeeId || staff?.empId || (staff?.id?.length > 8 ? staff?.id.slice(0, 8) : staff?.id)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
                <span className="text-xs font-bold text-slate-800">{staff?.department || 'General'}</span>
              </div>
            </div>

            {/* Quick Metrics KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Present (حاضر)</span>
                <span className="text-lg font-black text-emerald-900">{summaryMetrics.presentDays} / {summaryMetrics.workingDays}</span>
              </div>
              <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-sky-700 uppercase block">School Off (اسکول چھٹی)</span>
                <span className="text-lg font-black text-sky-900">{summaryMetrics.schoolHolidayDays}</span>
                <span className="text-[9px] text-sky-600 block">Sundays / Holidays</span>
              </div>
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-purple-700 uppercase block">Leaves (رخصت)</span>
                <span className="text-lg font-black text-purple-900">{summaryMetrics.leaveDays + summaryMetrics.halfDays}</span>
                <span className="text-[9px] text-purple-600 block">Approved Leaves</span>
              </div>
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-rose-700 uppercase block">Absent (خود چھٹی)</span>
                <span className="text-lg font-black text-rose-900">{summaryMetrics.absentDays}</span>
                <span className="text-[9px] text-rose-600 block">Unexcused</span>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-amber-700 uppercase block">Late (تاخیر)</span>
                <span className="text-lg font-black text-amber-900">{summaryMetrics.lateDays}</span>
                <span className="text-[9px] text-amber-700 block font-medium">({summaryMetrics.totalLateMinutes}m)</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-600 uppercase block">Attendance %</span>
                <span className="text-lg font-black text-slate-900">{summaryMetrics.attendancePercentage}%</span>
                <span className="text-[9px] text-slate-500 block">Monthly Rate</span>
              </div>
            </div>

            {/* Daily Punch In / Out Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Day</th>
                    <th className="py-2.5 px-3 text-emerald-800">Time In (وقت آمد)</th>
                    <th className="py-2.5 px-3 text-amber-800">Time Out (وقت رخصت)</th>
                    <th className="py-2.5 px-3">Duration (دورانیہ)</th>
                    <th className="py-2.5 px-3">Status (کیفیت)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthDays.map((d, idx) => (
                    <tr 
                      key={idx} 
                      className={`${
                        d.isSunday 
                          ? 'bg-slate-50/70 text-slate-400' 
                          : d.isFuture 
                          ? 'text-slate-400 hover:bg-slate-50/40' 
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-800 tabular-nums">
                        {d.dateFormatted}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-600">
                        {d.dayName}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 tabular-nums">
                        {d.isSunday || d.isFuture || d.status === 'not_marked' ? (
                          <span className="text-slate-400 font-normal">—</span>
                        ) : (
                          <span className={d.isLate ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                            {d.timeIn}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 tabular-nums">
                        {d.isSunday || d.isFuture || d.status === 'not_marked' ? (
                          <span className="text-slate-400 font-normal">—</span>
                        ) : (
                          d.timeOut
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700 tabular-nums">
                        {d.isSunday || d.isFuture || d.status === 'not_marked' ? (
                          <span className="text-slate-400 font-normal">—</span>
                        ) : (
                          d.hoursWorked
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {d.isSunday ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Sunday
                          </span>
                        ) : d.isFuture ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
                            Upcoming
                          </span>
                        ) : d.status === 'not_marked' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100/70 text-slate-400 border border-slate-200">
                            Not Marked
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            d.isLate 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : d.status === 'present' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : d.status === 'leave'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : d.status === 'half'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {d.isLate 
                              ? `Late (${d.minutesLate}m) تاخیر` 
                              : d.status === 'present' 
                              ? 'Present حاضر' 
                              : d.status === 'leave' 
                              ? 'Leave منظور شدہ' 
                              : d.status === 'half' 
                              ? 'Half Day نصف دن' 
                              : 'Absent خود چھٹی'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatures & Approvals Section */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-6">
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <p className="font-bold text-slate-800">دستخط ملازم (Employee Signature)</p>
              </div>
              <div className="space-y-6">
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <p className="font-bold text-slate-800">مہر ادارہ (School Stamp)</p>
              </div>
              <div className="space-y-6">
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <p className="font-bold text-slate-800">دستخط پرنسپل / ایڈمن (Principal Sign)</p>
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center text-[10px] text-slate-400 pt-2 font-sans">
              Generated via TaleemiDunya-Pro Biometric & 2D/1D Scanner Terminal • Computerized Verification
            </div>

          </div>
        </div>

        {/* Bottom Sticky Action Footer Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <Clock size={15} className="text-indigo-600" />
            <span className="hidden sm:inline">Official Shift:</span>
            <span className="font-bold text-slate-800">{shiftTimeIn} - {shiftTimeOut}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer size={14} /> <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <X size={15} /> <span>Close (بند کریں)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
