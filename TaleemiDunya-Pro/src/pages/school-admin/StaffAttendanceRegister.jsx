import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Search, 
  Filter, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  Grid, 
  ChevronLeft, 
  ChevronRight, 
  User,
  Sparkles,
  ClipboardList,
  CalendarDays,
  Zap,
  Settings,
  LogIn,
  LogOut,
  Timer,
  Printer
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { 
  getRecords, 
  getStaffAttendanceByDate, 
  getStaffAttendanceByMonth, 
  saveStaffAttendanceBatch 
} from '../../services/db';
import StaffTimeSlipModal from '../../components/common/StaffTimeSlipModal';
import MasterStaffAttendanceReportModal from '../../components/common/MasterStaffAttendanceReportModal';

// ── Time Formatting & Normalization Helpers ──
export const normalizeTo24h = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const trimmed = timeStr.trim();
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) {
    return trimmed;
  }
  if (/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([APap][Mm])?$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const modifier = match[3] ? match[3].toUpperCase() : null;
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  return '';
};

export const formatTo12h = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return '-';
  const trimmed = timeStr.trim();
  if (/[APap][Mm]/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return trimmed;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

export const calculateDutyHours = (timeIn, timeOut) => {
  const normIn = normalizeTo24h(timeIn);
  const normOut = normalizeTo24h(timeOut);
  if (!normIn || !normOut) return null;
  const [inH, inM] = normIn.split(':').map(Number);
  const [outH, outM] = normOut.split(':').map(Number);
  let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  if (diffMinutes < 0) diffMinutes += 24 * 60; // overnight shift
  const hrs = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return { 
    hrs, 
    mins, 
    totalMinutes: diffMinutes, 
    formatted: `${hrs}h ${mins > 0 ? `${mins}m` : '0m'}`.trim() 
  };
};

const ATTENDANCE_STATUSES = [
  { id: 'present', label: 'Present', short: 'P', color: 'emerald', bgClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' },
  { id: 'absent', label: 'Absent', short: 'A', color: 'red', bgClass: 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20' },
  { id: 'half', label: 'Half Day', short: 'H', color: 'amber', bgClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' },
  { id: 'leave', label: 'Leave', short: 'L', color: 'purple', bgClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20' },
];

const StaffAttendanceRegister = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = userData?.schoolId || schoolData?.id;

  // Active School Settings Staff Shift Timings
  const defaultShiftIn = normalizeTo24h(schoolData?.staffTimings?.shiftStartTime || schoolData?.shiftStartTime || '08:00') || '08:00';
  const defaultShiftOut = normalizeTo24h(schoolData?.staffTimings?.shiftEndTime || schoolData?.shiftEndTime || '14:00') || '14:00';

  // Tabs: 'daily' | 'monthly'
  const [activeTab, setActiveTab] = useState('daily');

  // Common filters
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Daily Register state
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [dailyAttendanceMap, setDailyAttendanceMap] = useState({});
  const [savedDailyAttendanceMap, setSavedDailyAttendanceMap] = useState({});
  const [loadingDailyAtt, setLoadingDailyAtt] = useState(false);
  const [savingDaily, setSavingDaily] = useState(false);

  // Monthly Matrix state
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [monthlyAttendanceList, setMonthlyAttendanceList] = useState([]);
  const [loadingMonthlyAtt, setLoadingMonthlyAtt] = useState(false);

  // Time Slip Modal State ("Kub Aaya Kub Gya")
  const [timeSlipStaff, setTimeSlipStaff] = useState(null);

  // Master Monthly Report Modal State
  const [showMasterReport, setShowMasterReport] = useState(false);

  // Toast message
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Date navigation helper
  const navigateDate = (deltaDays) => {
    const current = new Date(selectedDate);
    if (isNaN(current.getTime())) return;
    current.setDate(current.getDate() + deltaDays);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Month navigation helper
  const navigateMonth = (deltaMonths) => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) + deltaMonths;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  // Get specific staff's default shift (checks individual staff timing first, falls back to School Settings)
  const getStaffDefaultTimings = (staff) => {
    const customIn = staff?.timingIn || staff?.shiftStartTime || staff?.expectedTimeIn;
    const customOut = staff?.timingOut || staff?.shiftEndTime || staff?.expectedTimeOut;
    const shiftIn = normalizeTo24h(customIn) || defaultShiftIn;
    const shiftOut = normalizeTo24h(customOut) || defaultShiftOut;
    return {
      shiftIn,
      shiftOut,
      shiftInFormatted: formatTo12h(shiftIn),
      shiftOutFormatted: formatTo12h(shiftOut)
    };
  };

  // 1. Fetch Staff List
  useEffect(() => {
    if (!schoolId) return;
    fetchStaff();
  }, [schoolId]);

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const data = await getRecords('staff', schoolId);
      const activeStaff = data.filter(s => !s.status || s.status === 'Active' || s.status === 'active');
      setStaffList(activeStaff.length > 0 ? activeStaff : data);
    } catch (error) {
      console.error("Error fetching staff for attendance:", error);
      showToast('error', 'Failed to load staff members.');
    } finally {
      setLoadingStaff(false);
    }
  };

  // 2. Fetch Daily Attendance when date or schoolId changes
  useEffect(() => {
    if (!schoolId || !selectedDate || activeTab !== 'daily') return;
    fetchDailyAttendance();
  }, [schoolId, selectedDate, activeTab]);

  const fetchDailyAttendance = async () => {
    setLoadingDailyAtt(true);
    try {
      const records = await getStaffAttendanceByDate(schoolId, selectedDate);
      const map = {};
      records.forEach(r => {
        const rawIn = r.timeIn || r.time || r.checkIn || '';
        const rawOut = r.timeOut || r.checkOut || '';
        const normalizedIn = normalizeTo24h(rawIn);
        const normalizedOut = normalizeTo24h(rawOut);

        const recordData = {
          status: (r.status || 'present').toLowerCase(),
          notes: r.notes || '',
          timeIn: normalizedIn || rawIn,
          timeOut: normalizedOut || rawOut,
          timeInRaw: rawIn,
          timeOutRaw: rawOut,
          isLate: !!r.isLate,
          minutesLate: r.minutesLate || 0,
          existingDocId: r.id
        };

        const keys = [
          r.staffId,
          r.employeeId,
          r.userId,
          r.id && r.id.includes('_') ? r.id.split('_')[0] : r.id
        ].filter(Boolean);

        keys.forEach(k => {
          map[k] = recordData;
        });

        if (r.staffName) {
          map[`name_${String(r.staffName).toLowerCase().trim()}`] = recordData;
        }
      });

      setDailyAttendanceMap(map);
      setSavedDailyAttendanceMap(map);
    } catch (error) {
      console.error("Error fetching daily staff attendance:", error);
      showToast('error', 'Failed to fetch attendance for selected date.');
    } finally {
      setLoadingDailyAtt(false);
    }
  };

  // 3. Fetch Monthly Attendance when month or schoolId changes
  useEffect(() => {
    if (!schoolId || !selectedMonth || activeTab !== 'monthly') return;
    fetchMonthlyAttendance();
  }, [schoolId, selectedMonth, activeTab]);

  const fetchMonthlyAttendance = async () => {
    setLoadingMonthlyAtt(true);
    try {
      const records = await getStaffAttendanceByMonth(schoolId, selectedMonth);
      setMonthlyAttendanceList(records);
    } catch (error) {
      console.error("Error fetching monthly staff attendance:", error);
      showToast('error', 'Failed to fetch monthly attendance records.');
    } finally {
      setLoadingMonthlyAtt(false);
    }
  };

  // Derived departments list
  const departments = useMemo(() => {
    const set = new Set();
    staffList.forEach(s => {
      if (s.department) set.add(s.department);
    });
    return ['All', ...Array.from(set).sort()];
  }, [staffList]);

  // Filtered staff list based on department and search
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const matchesDept = departmentFilter === 'All' || s.department === departmentFilter;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.employeeId || s.id || '').toLowerCase().includes(q) ||
        String(s.designation || s.role || '').toLowerCase().includes(q);
      return matchesDept && matchesSearch;
    });
  }, [staffList, departmentFilter, searchTerm]);

  // Lookup helper for a staff member's record in state
  const getStaffAttendance = (staff) => {
    if (!staff) return {};
    return dailyAttendanceMap[staff.id] ||
      dailyAttendanceMap[staff.employeeId] ||
      dailyAttendanceMap[staff.staffId] ||
      dailyAttendanceMap[`name_${String(staff.name || '').toLowerCase().trim()}`] ||
      {};
  };

  // Check if current daily map has unsaved edits
  const isDirty = useMemo(() => {
    for (const s of filteredStaff) {
      const current = getStaffAttendance(s);
      const saved = savedDailyAttendanceMap[s.id] || savedDailyAttendanceMap[s.employeeId] || {};
      if (
        (current.status || '') !== (saved.status || '') ||
        (current.notes || '') !== (saved.notes || '') ||
        (current.timeIn || '') !== (saved.timeIn || '') ||
        (current.timeOut || '') !== (saved.timeOut || '')
      ) {
        return true;
      }
    }
    return false;
  }, [filteredStaff, dailyAttendanceMap, savedDailyAttendanceMap]);

  // Handle status toggle in Daily Register (AUTOMATICALLY sets shift timings on Present)
  const handleStatusChange = (staffId, status) => {
    const staff = staffList.find(s => s.id === staffId);
    const { shiftIn, shiftOut } = getStaffDefaultTimings(staff);

    setDailyAttendanceMap(prev => {
      const current = prev[staffId] || {};
      let nextTimeIn = current.timeIn;
      let nextTimeOut = current.timeOut;

      if (status === 'present') {
        // Automatic assignment from School Settings shift timings if currently empty
        if (!nextTimeIn) nextTimeIn = shiftIn;
        if (!nextTimeOut) nextTimeOut = shiftOut;
      } else if (status === 'half') {
        if (!nextTimeIn) nextTimeIn = shiftIn;
        if (!nextTimeOut) nextTimeOut = '11:30';
      } else if (status === 'absent' || status === 'leave') {
        nextTimeIn = '';
        nextTimeOut = '';
      }

      return {
        ...prev,
        [staffId]: {
          ...current,
          status,
          timeIn: nextTimeIn,
          timeOut: nextTimeOut
        }
      };
    });
  };

  // Handle manual time in change
  const handleTimeInChange = (staffId, timeIn) => {
    setDailyAttendanceMap(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        timeIn
      }
    }));
  };

  // Handle manual time out change
  const handleTimeOutChange = (staffId, timeOut) => {
    setDailyAttendanceMap(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        timeOut
      }
    }));
  };

  // Handle notes change
  const handleNotesChange = (staffId, notes) => {
    setDailyAttendanceMap(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        notes
      }
    }));
  };

  // Quick 1-tap stamp: Sets timeIn to current clock time
  const handleStampNowIn = (staffId) => {
    const now24 = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    handleTimeInChange(staffId, now24);
    showToast('info', `Clock In set to ${formatTo12h(now24)}`);
  };

  // Quick 1-tap stamp: Sets timeOut to current clock time
  const handleStampNowOut = (staffId) => {
    const now24 = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    handleTimeOutChange(staffId, now24);
    showToast('info', `Clock Out set to ${formatTo12h(now24)}`);
  };

  // Bulk mark all visible staff with automatic shift timings
  const handleBulkMark = (status) => {
    setDailyAttendanceMap(prev => {
      const next = { ...prev };
      filteredStaff.forEach(s => {
        const current = next[s.id] || {};
        const { shiftIn, shiftOut } = getStaffDefaultTimings(s);
        let nextTimeIn = current.timeIn;
        let nextTimeOut = current.timeOut;

        if (status === 'present') {
          if (!nextTimeIn) nextTimeIn = shiftIn;
          if (!nextTimeOut) nextTimeOut = shiftOut;
        } else if (status === 'absent' || status === 'leave') {
          nextTimeIn = '';
          nextTimeOut = '';
        }

        next[s.id] = {
          ...current,
          status,
          timeIn: nextTimeIn,
          timeOut: nextTimeOut
        };
      });
      return next;
    });
    showToast('info', `Marked all visible staff as ${status.toUpperCase()} with automatic shift timings!`);
  };

  // 1-Click: Auto-fill default shift timings for all present staff
  const handleAutoFillAllShiftTimings = () => {
    setDailyAttendanceMap(prev => {
      const next = { ...prev };
      filteredStaff.forEach(s => {
        const current = next[s.id] || {};
        const { shiftIn, shiftOut } = getStaffDefaultTimings(s);
        next[s.id] = {
          ...current,
          status: current.status || 'present',
          timeIn: shiftIn,
          timeOut: shiftOut
        };
      });
      return next;
    });
    showToast('success', `Applied Settings shift timings (${formatTo12h(defaultShiftIn)} - ${formatTo12h(defaultShiftOut)}) to all staff!`);
  };

  // 1-Click: Stamp live clock time for all present staff
  const handleStampCurrentTimeInAll = () => {
    const now24 = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setDailyAttendanceMap(prev => {
      const next = { ...prev };
      filteredStaff.forEach(s => {
        const current = next[s.id] || {};
        if (current.status !== 'absent' && current.status !== 'leave') {
          next[s.id] = {
            ...current,
            status: 'present',
            timeIn: now24,
            timeOut: current.timeOut || getStaffDefaultTimings(s).shiftOut
          };
        }
      });
      return next;
    });
    showToast('success', `Clocked In all staff at ${formatTo12h(now24)}!`);
  };

  // Batch Save Attendance to Firestore
  const handleSaveAttendance = async () => {
    if (!schoolId) {
      showToast('error', 'School context missing.');
      return;
    }

    if (filteredStaff.length === 0) {
      showToast('error', 'No staff members selected to save.');
      return;
    }

    setSavingDaily(true);

    try {
      const recordsToSave = filteredStaff.map(staff => {
        const att = getStaffAttendance(staff);
        const { shiftIn, shiftOut } = getStaffDefaultTimings(staff);
        
        const finalStatus = att.status || 'present';
        const finalTimeIn = att.timeIn || (finalStatus === 'present' ? shiftIn : '');
        const finalTimeOut = att.timeOut || (finalStatus === 'present' ? shiftOut : '');
        const duty = calculateDutyHours(finalTimeIn, finalTimeOut);

        // Calculate late arrival
        let isLate = false;
        let minutesLate = 0;
        if (finalTimeIn && shiftIn) {
          const [inH, inM] = normalizeTo24h(finalTimeIn).split(':').map(Number);
          const [sH, sM] = normalizeTo24h(shiftIn).split(':').map(Number);
          const diff = (inH * 60 + inM) - (sH * 60 + sM);
          if (diff > 5) {
            isLate = true;
            minutesLate = diff;
          }
        }

        return {
          staffId: staff.id,
          employeeId: staff.employeeId || staff.staffId || staff.id,
          staffName: staff.name || '',
          schoolId,
          campusId: staff.campusId || null,
          department: staff.department || 'General',
          designation: staff.designation || staff.role || '',
          date: selectedDate,
          status: finalStatus,
          notes: att.notes || '',
          timeIn: finalTimeIn,
          timeInFormatted: formatTo12h(finalTimeIn),
          timeOut: finalTimeOut,
          timeOutFormatted: formatTo12h(finalTimeOut),
          hoursWorked: duty ? duty.formatted : '-',
          totalMinutesWorked: duty ? duty.totalMinutes : 0,
          isLate,
          minutesLate,
          expectedShift: `${formatTo12h(shiftIn)} - ${formatTo12h(shiftOut)}`
        };
      });

      const result = await saveStaffAttendanceBatch(recordsToSave, schoolId);

      if (result.success) {
        showToast('success', `Attendance saved successfully for ${recordsToSave.length} staff members on ${selectedDate}!`);
        await fetchDailyAttendance();
      } else {
        throw result.error || new Error('Failed to save attendance records.');
      }
    } catch (error) {
      console.error("Save staff attendance error:", error);
      showToast('error', error.message || 'An error occurred while saving attendance.');
    } finally {
      setSavingDaily(false);
    }
  };

  // Monthly Matrix Helpers
  const daysInSelectedMonth = useMemo(() => {
    if (!selectedMonth || !selectedMonth.includes('-')) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 0);
    const totalDays = date.getDate();
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }, [selectedMonth]);

  // Index monthly attendance by staffId and day number
  const monthlyDataByStaff = useMemo(() => {
    const map = {};
    monthlyAttendanceList.forEach(rec => {
      const staffKey = rec.staffId || rec.employeeId || rec.id;
      if (!staffKey || !rec.date) return;
      
      const dayNum = parseInt(rec.date.split('-')[2], 10);
      if (!map[staffKey]) {
        map[staffKey] = {};
      }
      map[staffKey][dayNum] = {
        status: (rec.status || '').toLowerCase(),
        timeIn: rec.timeIn || rec.time || '-',
        timeOut: rec.timeOut || '-',
        hoursWorked: rec.hoursWorked || '-'
      };
    });
    return map;
  }, [monthlyAttendanceList]);

  // Aggregated Summary Metrics for Monthly View
  const monthlySummaryMetrics = useMemo(() => {
    let present = 0;
    let absent = 0;
    let half = 0;
    let leave = 0;

    monthlyAttendanceList.forEach(rec => {
      const st = (rec.status || '').toLowerCase().trim();
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'half') half++;
      else if (st === 'leave') leave++;
    });

    return { present, absent, half, leave, totalLogs: monthlyAttendanceList.length };
  }, [monthlyAttendanceList]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-fade-in ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50' 
            : toast.type === 'info'
            ? 'bg-indigo-950/90 text-indigo-200 border-indigo-500/50'
            : 'bg-red-950/90 text-red-200 border-red-500/50'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
          ) : toast.type === 'info' ? (
            <Sparkles size={22} className="text-indigo-400 shrink-0" />
          ) : (
            <AlertCircle size={22} className="text-red-400 shrink-0" />
          )}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
              <ClipboardList size={26} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-dark-text tracking-tight flex items-center gap-2">
                <span>Staff Attendance & Shift Register</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                  AUTO-TIMINGS
                </span>
              </h1>
              <p className="text-dark-muted text-xs md:text-sm">
                Real-time arrival (In) & departure (Out) recording with auto-shift synchronization.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Switches */}
        <div className="flex items-center p-1.5 rounded-xl bg-dark-bg/60 border border-dark-border/50 shrink-0">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'daily'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            <Calendar size={16} />
            <span>Daily Register</span>
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'monthly'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            <Grid size={16} />
            <span>Monthly Matrix</span>
          </button>
        </div>
      </div>

      {/* SETTINGS STAFF TIMINGS BANNER */}
      <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-purple-400">Settings Staff Shift Timings:</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase">
                Active in System
              </span>
            </div>
            <p className="text-sm font-black text-dark-text mt-0.5">
              Shift In: <span className="text-emerald-400 font-mono font-bold">{formatTo12h(defaultShiftIn)}</span> &nbsp;•&nbsp; 
              Shift Out: <span className="text-purple-400 font-mono font-bold">{formatTo12h(defaultShiftOut)}</span> &nbsp;•&nbsp; 
              <span className="text-xs text-dark-muted font-normal">Auto-assigned jab staff Present mark ho</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAutoFillAllShiftTimings}
            className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Auto-fill shift timings for all staff"
          >
            <Zap size={14} className="text-amber-400" />
            <span>Auto-Fill Shift ({formatTo12h(defaultShiftIn)} - {formatTo12h(defaultShiftOut)})</span>
          </button>
          <button
            type="button"
            onClick={handleStampCurrentTimeInAll}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Stamp live current time for all staff"
          >
            <Timer size={14} className="text-emerald-400" />
            <span>Stamp Live Clock-In</span>
          </button>
          <NavLink
            to="/school-admin/settings"
            className="p-2 rounded-xl bg-dark-bg/60 border border-dark-border/60 text-dark-muted hover:text-dark-text hover:bg-dark-paper transition-all flex items-center gap-1.5 text-xs font-bold"
            title="Change default staff shift timings in School Settings"
          >
            <Settings size={15} />
            <span className="hidden sm:inline">Settings</span>
          </NavLink>
        </div>
      </div>

      {/* FILTER & DATE CONTROLS BAR */}
      <GlassCard className="p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Daily Date Selector */}
          {activeTab === 'daily' ? (
            <div>
              <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-primary-400" />
                <span>Selected Date</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => navigateDate(-1)}
                  className="p-2 rounded-xl bg-dark-bg/80 border border-dark-border hover:bg-dark-paper text-dark-text transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-dark-bg/80 border border-dark-border rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-primary-500 font-medium text-center"
                />
                <button
                  type="button"
                  onClick={() => navigateDate(1)}
                  className="p-2 rounded-xl bg-dark-bg/80 border border-dark-border hover:bg-dark-paper text-dark-text transition-colors"
                  title="Next Day"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CalendarDays size={14} className="text-primary-400" />
                <span>Selected Month</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => navigateMonth(-1)}
                  className="p-2 rounded-xl bg-dark-bg/80 border border-dark-border hover:bg-dark-paper text-dark-text transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-dark-bg/80 border border-dark-border rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-primary-500 font-medium text-center"
                />
                <button
                  type="button"
                  onClick={() => navigateMonth(1)}
                  className="p-2 rounded-xl bg-dark-bg/80 border border-dark-border hover:bg-dark-paper text-dark-text transition-colors"
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Filter size={14} className="text-primary-400" />
              <span>Department</span>
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full bg-dark-bg/80 border border-dark-border rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-primary-500 font-medium capitalize"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept} className="bg-dark-paper text-dark-text">
                  {dept === 'All' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Search size={14} className="text-primary-400" />
              <span>Search Staff</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name, ID or designation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-dark-bg/80 border border-dark-border rounded-xl pl-9 pr-3 py-2 text-sm text-dark-text placeholder-dark-muted focus:outline-none focus:border-primary-500 font-medium"
              />
              <Search size={16} className="absolute left-3 top-2.5 text-dark-muted" />
            </div>
          </div>

          {/* Action Buttons */}
          {activeTab === 'daily' ? (
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-1.5 opacity-0 hidden sm:block">
                Actions
              </label>
              <button
                onClick={handleSaveAttendance}
                disabled={savingDaily || loadingStaff}
                className="w-full premium-button-primary py-2 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20"
              >
                {savingDaily ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Saving Batch...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Attendance</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-1.5 opacity-0 hidden sm:block">
                Master Report
              </label>
              <button
                type="button"
                onClick={() => setShowMasterReport(true)}
                className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <Printer size={16} />
                <span>Print Master Sheet</span>
              </button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* TAB 1: DAILY ATTENDANCE REGISTER */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Quick Bulk Actions & Unsaved Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-dark-bg/40 p-3.5 rounded-xl border border-dark-border/40">
            <div className="flex items-center gap-2 text-xs font-bold text-dark-muted">
              <span>Quick Actions for visible staff ({filteredStaff.length}):</span>
              {isDirty && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] uppercase tracking-wider font-extrabold animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkMark('present')}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle2 size={14} />
                <span>Mark All Present (Auto-Shift)</span>
              </button>
              <button
                type="button"
                onClick={() => handleBulkMark('absent')}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <XCircle size={14} />
                <span>Mark All Absent</span>
              </button>
            </div>
          </div>

          {/* Daily Table with Clear In/Out Display */}
          <GlassCard className="p-0 overflow-hidden">
            {loadingStaff || loadingDailyAtt ? (
              <div className="p-12 text-center text-dark-muted flex flex-col items-center justify-center gap-3">
                <RefreshCw size={32} className="animate-spin text-primary-400" />
                <p className="text-sm font-medium">Loading staff attendance register...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-12 text-center text-dark-muted flex flex-col items-center justify-center gap-2">
                <Users size={36} className="text-dark-muted opacity-40" />
                <p className="font-semibold text-dark-text">No staff members found</p>
                <p className="text-xs">Try adjusting your department or search filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-dark-paper/80 border-b border-dark-border text-xs uppercase font-black tracking-wider text-dark-muted">
                      <th className="py-3.5 px-4">Staff Member</th>
                      <th className="py-3.5 px-4">Employee ID</th>
                      <th className="py-3.5 px-4 text-center">
                        <span className="flex items-center justify-center gap-1.5 text-emerald-400">
                          <LogIn size={14} /> Aane Ka Waqt (Time In)
                        </span>
                      </th>
                      <th className="py-3.5 px-4 text-center">
                        <span className="flex items-center justify-center gap-1.5 text-purple-400">
                          <LogOut size={14} /> Jaane Ka Waqt (Time Out)
                        </span>
                      </th>
                      <th className="py-3.5 px-4 text-center">Duty Duration</th>
                      <th className="py-3.5 px-4 text-center">Attendance Status</th>
                      <th className="py-3.5 px-4">Notes / Remarks</th>
                      <th className="py-3.5 px-4 text-center">Time Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/50 text-sm">
                    {filteredStaff.map((staff) => {
                      const att = getStaffAttendance(staff);
                      const currentStatus = att.status || '';
                      const { shiftIn, shiftOut } = getStaffDefaultTimings(staff);

                      const displayTimeIn = att.timeIn || (currentStatus === 'present' ? shiftIn : '');
                      const displayTimeOut = att.timeOut || (currentStatus === 'present' ? shiftOut : '');
                      const duty = calculateDutyHours(displayTimeIn, displayTimeOut);

                      // Check punctuality against shift start time
                      let isLate = false;
                      let minutesLate = 0;
                      if (displayTimeIn && shiftIn) {
                        const [inH, inM] = normalizeTo24h(displayTimeIn).split(':').map(Number);
                        const [sH, sM] = normalizeTo24h(shiftIn).split(':').map(Number);
                        const diff = (inH * 60 + inM) - (sH * 60 + sM);
                        if (diff > 5) {
                          isLate = true;
                          minutesLate = diff;
                        }
                      }

                      return (
                        <tr key={staff.id} className="hover:bg-dark-paper/40 transition-colors">
                          {/* Staff Details */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                                {staff.name ? staff.name.charAt(0).toUpperCase() : <User size={16} />}
                              </div>
                              <div>
                                <div className="font-bold text-dark-text flex items-center gap-2">
                                  <span>{staff.name || 'Unnamed Staff'}</span>
                                </div>
                                <div className="text-xs text-dark-muted flex items-center gap-1.5 mt-0.5">
                                  <span>{staff.designation || staff.role || 'Staff'}</span>
                                  <span>•</span>
                                  <span className="font-medium text-primary-400/80">{staff.department || 'General'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Employee ID */}
                          <td className="py-3.5 px-4 font-mono text-xs text-dark-muted font-bold">
                            <span className="px-2 py-1 rounded-md bg-dark-bg border border-dark-border/60">
                              {staff.staffId || staff.employeeId || staff.id.slice(0, 8)}
                            </span>
                          </td>

                          {/* TIME IN (Aane Ka Waqt) */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col items-center gap-1.5 min-w-[130px]">
                              <div className="flex items-center gap-1.5 w-full">
                                <input
                                  type="time"
                                  value={normalizeTo24h(att.timeIn || (currentStatus === 'present' ? shiftIn : ''))}
                                  onChange={(e) => handleTimeInChange(staff.id, e.target.value)}
                                  className="w-full bg-dark-bg/80 border border-emerald-500/30 focus:border-emerald-500 rounded-lg px-2 py-1 text-xs text-dark-text font-mono font-bold text-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleStampNowIn(staff.id)}
                                  className="px-1.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-black shrink-0"
                                  title="Stamp current live time as Time In"
                                >
                                  Now
                                </button>
                              </div>

                              {displayTimeIn ? (
                                <div className="flex items-center gap-1 flex-wrap justify-center">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
                                    <Clock size={10} />
                                    <span>{formatTo12h(displayTimeIn)}</span>
                                  </span>
                                  {isLate ? (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold">
                                      Late ({minutesLate}m)
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">
                                      On Time
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-dark-muted italic">Not Clocked In</span>
                              )}
                            </div>
                          </td>

                          {/* TIME OUT (Jaane Ka Waqt) */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col items-center gap-1.5 min-w-[130px]">
                              <div className="flex items-center gap-1.5 w-full">
                                <input
                                  type="time"
                                  value={normalizeTo24h(att.timeOut || (currentStatus === 'present' ? shiftOut : ''))}
                                  onChange={(e) => handleTimeOutChange(staff.id, e.target.value)}
                                  className="w-full bg-dark-bg/80 border border-purple-500/30 focus:border-purple-500 rounded-lg px-2 py-1 text-xs text-dark-text font-mono font-bold text-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleStampNowOut(staff.id)}
                                  className="px-1.5 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-[10px] font-black shrink-0"
                                  title="Stamp current live time as Time Out"
                                >
                                  Now
                                </button>
                              </div>

                              {displayTimeOut ? (
                                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
                                  <Clock size={10} />
                                  <span>{formatTo12h(displayTimeOut)}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-dark-muted italic">Not Clocked Out</span>
                              )}
                            </div>
                          </td>

                          {/* DUTY DURATION */}
                          <td className="py-3.5 px-4 text-center">
                            {duty ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-extrabold text-xs">
                                {duty.formatted}
                              </span>
                            ) : (
                              <span className="text-dark-muted font-mono text-xs">-</span>
                            )}
                          </td>

                          {/* Status Options */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {ATTENDANCE_STATUSES.map((st) => {
                                const isSelected = currentStatus === st.id;
                                return (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => handleStatusChange(staff.id, st.id)}
                                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                      isSelected
                                        ? st.bgClass + ' ring-2 ring-primary-500/40 shadow-sm'
                                        : 'bg-dark-bg/60 border-dark-border/60 text-dark-muted hover:text-dark-text hover:bg-dark-paper'
                                    }`}
                                  >
                                    <span>{st.label}</span>
                                    {isSelected && <Check size={12} className="stroke-[3]" />}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Notes / Remarks */}
                          <td className="py-3.5 px-4">
                            <input
                              type="text"
                              placeholder="Remarks / notes..."
                              value={att.notes || ''}
                              onChange={(e) => handleNotesChange(staff.id, e.target.value)}
                              className="w-full bg-dark-bg/60 border border-dark-border/60 rounded-lg px-2.5 py-1.5 text-xs text-dark-text placeholder-dark-muted focus:outline-none focus:border-primary-500"
                            />
                          </td>

                          {/* Time Slip ("Kub Aaya Kub Gya") */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setTimeSlipStaff(staff)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                              title="Staff Time Slip (Kub Aaya aur Kub Gya)"
                            >
                              <FileText size={13} />
                              <span>Time Slip</span>
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

          {/* Bottom Save Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-dark-paper/40 border border-dark-border/60">
            <div className="text-xs text-dark-muted font-medium flex items-center gap-2">
              <span>Showing <strong className="text-dark-text">{filteredStaff.length}</strong> staff member(s) for <strong className="text-primary-400">{selectedDate}</strong></span>
              {isDirty && (
                <span className="text-amber-400 font-bold text-[11px]">• You have unsaved attendance edits</span>
              )}
            </div>
            <button
              onClick={handleSaveAttendance}
              disabled={savingDaily || loadingStaff}
              className="premium-button-primary py-2.5 px-6 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-lg shadow-primary-500/20 disabled:opacity-50 cursor-pointer"
            >
              {savingDaily ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Attendance & Timings</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY ATTENDANCE MATRIX */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GlassCard className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div className="text-xl font-black text-emerald-400">{monthlySummaryMetrics.present}</div>
                <div className="text-xs text-dark-muted font-medium">Total Present Days</div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                <XCircle size={22} />
              </div>
              <div>
                <div className="text-xl font-black text-red-400">{monthlySummaryMetrics.absent}</div>
                <div className="text-xs text-dark-muted font-medium">Total Absent Days</div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock size={22} />
              </div>
              <div>
                <div className="text-xl font-black text-amber-400">{monthlySummaryMetrics.half}</div>
                <div className="text-xs text-dark-muted font-medium">Total Half Days</div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <FileText size={22} />
              </div>
              <div>
                <div className="text-xl font-black text-purple-400">{monthlySummaryMetrics.leave}</div>
                <div className="text-xs text-dark-muted font-medium">Total Leave Days</div>
              </div>
            </GlassCard>
          </div>

          {/* Quick Print Master Sheet Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-dark-bg/40 p-3.5 rounded-xl border border-dark-border/40">
            <div className="flex items-center gap-2 text-xs font-bold text-dark-muted">
              <span>Monthly Overview for <strong className="text-primary-400">{filteredStaff.length}</strong> Staff Members ({selectedMonth})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMasterReport(true)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-500/20"
              >
                <Printer size={15} />
                <span>Print Master Attendance Sheet (PDF / Excel)</span>
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <GlassCard className="p-0 overflow-hidden">
            {loadingStaff || loadingMonthlyAtt ? (
              <div className="p-12 text-center text-dark-muted flex flex-col items-center justify-center gap-3">
                <RefreshCw size={32} className="animate-spin text-primary-400" />
                <p className="text-sm font-medium">Generating monthly attendance matrix...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-12 text-center text-dark-muted flex flex-col items-center justify-center gap-2">
                <Users size={36} className="text-dark-muted opacity-40" />
                <p className="font-semibold text-dark-text">No staff members found</p>
                <p className="text-xs">Try adjusting your department or search filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-dark-paper/80 border-b border-dark-border text-[11px] uppercase font-black tracking-wider text-dark-muted">
                      <th className="py-3 px-3 sticky left-0 bg-dark-paper/95 backdrop-blur z-10 border-r border-dark-border min-w-[180px]">
                        Staff Member
                      </th>
                      <th className="py-3 px-2 border-r border-dark-border min-w-[90px]">
                        Dept
                      </th>
                      {/* Day Headers 1..N */}
                      {daysInSelectedMonth.map(day => (
                        <th key={day} className="py-3 px-1 text-center border-r border-dark-border/40 min-w-[28px] max-w-[32px]">
                          {day}
                        </th>
                      ))}
                      {/* Monthly Summary Totals */}
                      <th className="py-3 px-2 text-center bg-emerald-500/10 text-emerald-400 font-black border-r border-dark-border min-w-[36px]">
                        P
                      </th>
                      <th className="py-3 px-2 text-center bg-red-500/10 text-red-400 font-black border-r border-dark-border min-w-[36px]">
                        A
                      </th>
                      <th className="py-3 px-2 text-center bg-amber-500/10 text-amber-400 font-black border-r border-dark-border min-w-[36px]">
                        H
                      </th>
                      <th className="py-3 px-2 text-center bg-purple-500/10 text-purple-400 font-black min-w-[36px]">
                        L
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/50 text-xs">
                    {filteredStaff.map((staff) => {
                      const staffAttMap = monthlyDataByStaff[staff.id] || monthlyDataByStaff[staff.employeeId] || {};
                      let presentCount = 0;
                      let absentCount = 0;
                      let halfCount = 0;
                      let leaveCount = 0;

                      daysInSelectedMonth.forEach(day => {
                        const dayRec = staffAttMap[day];
                        const st = dayRec?.status || (typeof dayRec === 'string' ? dayRec : '');
                        if (st === 'present') presentCount++;
                        else if (st === 'absent') absentCount++;
                        else if (st === 'half') halfCount++;
                        else if (st === 'leave') leaveCount++;
                      });

                      return (
                        <tr key={staff.id} className="hover:bg-dark-paper/40 transition-colors">
                          {/* Sticky Staff Name Column */}
                          <td className="py-2.5 px-3 font-semibold text-dark-text sticky left-0 bg-dark-bg/95 backdrop-blur z-10 border-r border-dark-border">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="truncate font-bold max-w-[130px]" title={staff.name}>
                                  {staff.name || 'Unnamed'}
                                </div>
                                <div className="text-[10px] text-dark-muted font-mono">{staff.staffId || staff.employeeId || staff.id.slice(0, 8)}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setTimeSlipStaff(staff)}
                                className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 ml-1 shrink-0 cursor-pointer"
                                title="View & Print Monthly Time Slip"
                              >
                                <FileText size={12} />
                              </button>
                            </div>
                          </td>

                          {/* Dept */}
                          <td className="py-2.5 px-2 text-dark-muted font-medium border-r border-dark-border truncate max-w-[90px]">
                            {staff.department || 'General'}
                          </td>

                          {/* Daily Status Cells with In/Out Tooltip */}
                          {daysInSelectedMonth.map(day => {
                            const dayRec = staffAttMap[day];
                            const status = dayRec?.status || (typeof dayRec === 'string' ? dayRec : '');
                            let cellContent = '-';
                            let cellClass = 'text-dark-muted opacity-30';

                            if (status === 'present') {
                              cellContent = 'P';
                              cellClass = 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30';
                            } else if (status === 'absent') {
                              cellContent = 'A';
                              cellClass = 'bg-red-500/20 text-red-400 font-bold border border-red-500/30';
                            } else if (status === 'half') {
                              cellContent = 'H';
                              cellClass = 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30';
                            } else if (status === 'leave') {
                              cellContent = 'L';
                              cellClass = 'bg-purple-500/20 text-purple-400 font-bold border border-purple-500/30';
                            }

                            const tooltipText = dayRec?.timeIn 
                              ? `Day ${day}: In ${formatTo12h(dayRec.timeIn)} - Out ${formatTo12h(dayRec.timeOut)} (${dayRec.hoursWorked || 'Shift'})`
                              : `Day ${day}: ${status || 'Not marked'}`;

                            return (
                              <td key={day} className="py-2 px-1 text-center border-r border-dark-border/40" title={tooltipText}>
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] ${cellClass}`}>
                                  {cellContent}
                                </span>
                              </td>
                            );
                          })}

                          {/* Totals */}
                          <td className="py-2 px-2 text-center font-bold text-emerald-400 bg-emerald-500/5 border-r border-dark-border">
                            {presentCount}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-red-400 bg-red-500/5 border-r border-dark-border">
                            {absentCount}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-amber-400 bg-amber-500/5 border-r border-dark-border">
                            {halfCount}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-purple-400 bg-purple-500/5">
                            {leaveCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Staff Time Slip Modal ("Kub Aaya Kub Gya") */}
      {timeSlipStaff && (
        <StaffTimeSlipModal
          staff={timeSlipStaff}
          initialPeriod={selectedMonth}
          onClose={() => setTimeSlipStaff(null)}
        />
      )}

      {/* Master Staff Attendance Report Modal (PDF & Excel) */}
      {showMasterReport && (
        <MasterStaffAttendanceReportModal
          isOpen={showMasterReport}
          onClose={() => setShowMasterReport(false)}
          staffList={filteredStaff}
          monthlyDataByStaff={monthlyDataByStaff}
          selectedMonth={selectedMonth}
        />
      )}
    </div>
  );
};

export default StaffAttendanceRegister;
