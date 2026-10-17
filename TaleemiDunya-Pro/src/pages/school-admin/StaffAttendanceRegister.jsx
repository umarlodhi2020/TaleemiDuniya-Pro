import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowLeftRight
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { 
  getRecords, 
  getStaffAttendanceByDate, 
  getStaffAttendanceByMonth, 
  saveStaffAttendanceBatch 
} from '../../services/db';
import StaffTimeSlipModal from '../../components/common/StaffTimeSlipModal';

const ATTENDANCE_STATUSES = [
  { id: 'present', label: 'Present', short: 'P', color: 'emerald', bgClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' },
  { id: 'absent', label: 'Absent', short: 'A', color: 'red', bgClass: 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20' },
  { id: 'half', label: 'Half Day', short: 'H', color: 'amber', bgClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' },
  { id: 'leave', label: 'Leave', short: 'L', color: 'purple', bgClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20' },
];

const StaffAttendanceRegister = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId;

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

  // Time Slip Modal State
  const [timeSlipStaff, setTimeSlipStaff] = useState(null);

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

  // 1. Fetch Staff List
  useEffect(() => {
    if (!schoolId) return;
    fetchStaff();
  }, [schoolId]);

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const data = await getRecords('staff', schoolId);
      // Filter out non-active staff if status exists
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
        const key = r.staffId || r.id;
        if (key) {
          map[key] = {
            status: r.status || 'present',
            notes: r.notes || '',
            timeIn: r.timeIn || r.time || '',
            timeOut: r.timeOut || '',
            existingDocId: r.id
          };
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

  // Check if current daily map has unsaved edits
  const isDirty = useMemo(() => {
    for (const s of filteredStaff) {
      const current = dailyAttendanceMap[s.id] || {};
      const saved = savedDailyAttendanceMap[s.id] || {};
      if (current.status !== saved.status || (current.notes || '') !== (saved.notes || '') || (current.timeIn || '') !== (saved.timeIn || '') || (current.timeOut || '') !== (saved.timeOut || '')) {
        return true;
      }
    }
    return false;
  }, [filteredStaff, dailyAttendanceMap, savedDailyAttendanceMap]);

  // Handle status toggle in Daily Register
  const handleStatusChange = (staffId, status) => {
    setDailyAttendanceMap(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        status
      }
    }));
  };

  // Handle notes change in Daily Register
  const handleNotesChange = (staffId, notes) => {
    setDailyAttendanceMap(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        notes
      }
    }));
  };

  // Handle time in change in Daily Register
  const handleTimeInChange = (staffId, timeIn) => {
    setDailyAttendanceMap(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        timeIn
      }
    }));
  };

  // Handle time out change in Daily Register
  const handleTimeOutChange = (staffId, timeOut) => {
    setDailyAttendanceMap(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        timeOut
      }
    }));
  };

  // Bulk mark all visible staff
  const handleBulkMark = (status) => {
    setDailyAttendanceMap(prev => {
      const next = { ...prev };
      filteredStaff.forEach(s => {
        next[s.id] = {
          ...next[s.id],
          status
        };
      });
      return next;
    });
  };

  // Batch Save Attendance
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
        const att = dailyAttendanceMap[staff.id] || {};
        return {
          staffId: staff.id,
          employeeId: staff.employeeId || staff.id,
          staffName: staff.name || '',
          schoolId,
          campusId: staff.campusId || null,
          department: staff.department || 'General',
          designation: staff.designation || staff.role || '',
          date: selectedDate,
          status: att.status || 'present', // Default to present if unmarked upon saving
          notes: att.notes || '',
          timeIn: att.timeIn || '',
          timeOut: att.timeOut || '',
        };
      });

      const result = await saveStaffAttendanceBatch(recordsToSave, schoolId);

      if (result.success) {
        showToast('success', `Attendance saved successfully for ${recordsToSave.length} staff members on ${selectedDate}!`);
        // Re-fetch to reconcile with saved Firestore state
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
    const date = new Date(year, month, 0); // last day of month
    const totalDays = date.getDate();
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }, [selectedMonth]);

  // Index monthly attendance by staffId and day number
  const monthlyDataByStaff = useMemo(() => {
    const map = {};
    monthlyAttendanceList.forEach(rec => {
      const staffKey = rec.staffId || rec.id;
      if (!staffKey || !rec.date) return;
      
      const dayNum = parseInt(rec.date.split('-')[2], 10);
      if (!map[staffKey]) {
        map[staffKey] = {};
      }
      map[staffKey][dayNum] = rec.status;
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
            : 'bg-red-950/90 text-red-200 border-red-500/50'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
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
              <h1 className="text-2xl md:text-3xl font-black text-dark-text tracking-tight">
                Staff Attendance Register
              </h1>
              <p className="text-dark-muted text-xs md:text-sm">
                Daily attendance marking, updating, and monthly matrix overview for school staff.
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
                : 'text-dark-muted hover:text-dark-text hover:bg-dark-paper/50'
            }`}
          >
            <CalendarDays size={16} />
            <span>Daily Register</span>
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'monthly'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'text-dark-muted hover:text-dark-text hover:bg-dark-paper/50'
            }`}
          >
            <Grid size={16} />
            <span>Monthly Matrix</span>
          </button>
        </div>
      </div>

      {/* Filter & Date Navigation Toolbar */}
      <GlassCard className="p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* Date Selector (Daily Tab) or Month Selector (Monthly Tab) */}
          {activeTab === 'daily' ? (
            <div>
              <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-primary-400" />
                <span>Attendance Date</span>
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
                <Calendar size={14} className="text-primary-400" />
                <span>Select Month & Year</span>
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

          {/* Action Buttons for Daily View */}
          {activeTab === 'daily' && (
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
          )}
        </div>
      </GlassCard>

      {/* TAB 1: DAILY ATTENDANCE REGISTER */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Quick Bulk Actions & Unsaved Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-dark-bg/40 p-3 rounded-xl border border-dark-border/40">
            <div className="flex items-center gap-2 text-xs font-bold text-dark-muted">
              <span>Quick Actions for visible staff ({filteredStaff.length}):</span>
              {isDirty && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] uppercase tracking-wider font-extrabold animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkMark('present')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 size={13} />
                <span>Mark All Present</span>
              </button>
              <button
                onClick={() => handleBulkMark('absent')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-1.5"
              >
                <XCircle size={13} />
                <span>Mark All Absent</span>
              </button>
            </div>
          </div>

          {/* Daily Table */}
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
                    <tr className="bg-dark-paper/70 border-b border-dark-border text-xs uppercase font-bold tracking-wider text-dark-muted">
                      <th className="py-3.5 px-4">Staff Member</th>
                      <th className="py-3.5 px-4">Employee ID</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4 text-center">Time In/Out</th>
                      <th className="py-3.5 px-4 text-center">Attendance Status</th>
                      <th className="py-3.5 px-4">Notes / Remarks</th>
                      <th className="py-3.5 px-4 text-center">Time Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/50 text-sm">
                    {filteredStaff.map((staff) => {
                      const att = dailyAttendanceMap[staff.id] || {};
                      const currentStatus = att.status || '';
                      const savedAtt = savedDailyAttendanceMap[staff.id] || {};
                      const isEdited = att.status !== savedAtt.status || (att.notes || '') !== (savedAtt.notes || '');

                      return (
                        <tr key={staff.id} className="hover:bg-dark-paper/40 transition-colors">
                          {/* Staff Details */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                                {staff.name ? staff.name.charAt(0).toUpperCase() : <User size={16} />}
                              </div>
                              <div>
                                <div className="font-bold text-dark-text flex items-center gap-2">
                                  <span>{staff.name || 'Unnamed Staff'}</span>
                                  {isEdited && (
                                    <span className="w-2 h-2 rounded-full bg-amber-400" title="Modified in session" />
                                  )}
                                </div>
                                <div className="text-xs text-dark-muted">{staff.designation || staff.role || 'Staff'}</div>
                              </div>
                            </div>
                          </td>

                          {/* Employee ID */}
                          <td className="py-3.5 px-4 font-mono text-xs text-dark-muted font-medium">
                            {staff.staffId || staff.employeeId || staff.id}
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-4 text-dark-text font-medium">
                            <span className="inline-block px-2.5 py-1 rounded-md bg-dark-bg border border-dark-border/60 text-xs font-semibold">
                              {staff.department || 'General'}
                            </span>
                          </td>

                          {/* Time In / Out */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-dark-muted w-8">IN</span>
                                <input
                                  type="time"
                                  value={att.timeIn || ''}
                                  onChange={(e) => handleTimeInChange(staff.id, e.target.value)}
                                  className="w-full bg-dark-bg/60 border border-dark-border/60 rounded-md px-2 py-1 text-xs text-dark-text focus:outline-none focus:border-primary-500"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-dark-muted w-8">OUT</span>
                                <input
                                  type="time"
                                  value={att.timeOut || ''}
                                  onChange={(e) => handleTimeOutChange(staff.id, e.target.value)}
                                  className="w-full bg-dark-bg/60 border border-dark-border/60 rounded-md px-2 py-1 text-xs text-dark-text focus:outline-none focus:border-primary-500"
                                />
                              </div>
                            </div>
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
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
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
                              placeholder="Add remark..."
                              value={att.notes || ''}
                              onChange={(e) => handleNotesChange(staff.id, e.target.value)}
                              className="w-full bg-dark-bg/60 border border-dark-border/60 rounded-lg px-2.5 py-1.5 text-xs text-dark-text placeholder-dark-muted focus:outline-none focus:border-primary-500"
                            />
                          </td>

                          {/* Time Slip (In / Out) */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setTimeSlipStaff(staff)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold inline-flex items-center gap-1 transition-all"
                              title="View & Print Staff Time Slip (In / Out Log)"
                            >
                              <Clock size={13} />
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
          <div className="flex items-center justify-between p-4 rounded-xl bg-dark-paper/40 border border-dark-border/60">
            <div className="text-xs text-dark-muted font-medium flex items-center gap-2">
              <span>Showing <strong className="text-dark-text">{filteredStaff.length}</strong> staff member(s) for <strong className="text-primary-400">{selectedDate}</strong></span>
              {isDirty && (
                <span className="text-amber-400 font-bold text-[11px]">• You have unsaved attendance edits</span>
              )}
            </div>
            <button
              onClick={handleSaveAttendance}
              disabled={savingDaily || loadingStaff}
              className="premium-button-primary py-2.5 px-6 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-lg shadow-primary-500/20 disabled:opacity-50"
            >
              {savingDaily ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Attendance</span>
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
                    <tr className="bg-dark-paper/70 border-b border-dark-border text-[11px] uppercase font-bold tracking-wider text-dark-muted">
                      <th className="py-3 px-3 sticky left-0 bg-dark-paper/90 backdrop-blur z-10 border-r border-dark-border min-w-[180px]">
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
                      const staffAttMap = monthlyDataByStaff[staff.id] || {};
                      let presentCount = 0;
                      let absentCount = 0;
                      let halfCount = 0;
                      let leaveCount = 0;

                      daysInSelectedMonth.forEach(day => {
                        const st = staffAttMap[day];
                        if (st === 'present') presentCount++;
                        else if (st === 'absent') absentCount++;
                        else if (st === 'half') halfCount++;
                        else if (st === 'leave') leaveCount++;
                      });

                      return (
                        <tr key={staff.id} className="hover:bg-dark-paper/40 transition-colors">
                          {/* Sticky Staff Name Column */}
                          <td className="py-2.5 px-3 font-semibold text-dark-text sticky left-0 bg-dark-bg/90 backdrop-blur z-10 border-r border-dark-border">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="truncate font-bold max-w-[130px]" title={staff.name}>
                                  {staff.name || 'Unnamed'}
                                </div>
                                <div className="text-[10px] text-dark-muted font-mono">{staff.staffId || staff.employeeId || staff.id}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setTimeSlipStaff(staff)}
                                className="p-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 ml-1 shrink-0"
                                title="View Monthly Time Slip"
                              >
                                <Clock size={12} />
                              </button>
                            </div>
                          </td>

                          {/* Dept */}
                          <td className="py-2.5 px-2 text-dark-muted font-medium border-r border-dark-border truncate max-w-[90px]">
                            {staff.department || 'General'}
                          </td>

                          {/* Daily Status Cells */}
                          {daysInSelectedMonth.map(day => {
                            const status = staffAttMap[day];
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

                            return (
                              <td key={day} className="py-2 px-1 text-center border-r border-dark-border/40">
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

      {/* Staff Time Slip Modal */}
      {timeSlipStaff && (
        <StaffTimeSlipModal
          staff={timeSlipStaff}
          initialPeriod={selectedMonth}
          onClose={() => setTimeSlipStaff(null)}
        />
      )}
    </div>
  );
};

export default StaffAttendanceRegister;
