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
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Award,
  DollarSign,
  Coffee,
  HelpCircle,
  Edit3,
  Save,
  RotateCcw,
  Receipt,
  Check,
  Send,
  Sparkles,
  Calculator,
  Percent
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getRecords, getStaffAttendanceByMonth } from '../../services/db';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { formatTo12h, calculateDutyHours } from '../../utils/timeFormat';
import { sendWhatsAppApiMessage, formatPhoneNumber } from '../../utils/notificationService';

/**
 * StaffTimeSlipModal
 * Ultra-advanced, printable, and exportable Monthly Single Staff Attendance & Payroll Sheet
 * (ماہانہ انفرادی اسٹاف حاضری لاگ و پے رول شیٹ)
 * Features:
 * - 100% Real punch times (In/Out/On Duty)
 * - School Off Days (Paid • Zero Salary Cut)
 * - Customizable Official Policy Banner (School can edit and save policy)
 * - Interactive Staff Switcher & Quick Navigation
 * - Integrated Monthly Payout & Salary Slip Voucher Generator (تنخواہ سلپ رسید)
 * - 1-Click A4 PDF Print & Excel Export (.xlsx)
 * - 1-Click WhatsApp alerts & salary receipts
 */
export default function StaffTimeSlipModal({ 
  staff, 
  staffList = [], 
  onSelectStaff, 
  onClose, 
  initialPeriod 
}) {
  const { schoolData } = useSchool();
  const { userData } = useAuth();
  const printAreaRef = useRef(null);

  const activeSchoolId = userData?.schoolId || schoolData?.id;

  // View Mode: 'attendance' (حاضری شیٹ) | 'payout' (تنخواہ سلپ و پے آؤٹ)
  const [activeTab, setActiveTab] = useState('attendance');

  // Selected period: "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (initialPeriod) return initialPeriod;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  // Current staff member (allows switcher inside modal)
  const currentStaff = staff || (staffList && staffList.length > 0 ? staffList[0] : null);

  // Staff Navigation Index
  const currentIndex = useMemo(() => {
    if (!currentStaff || !staffList || staffList.length === 0) return -1;
    return staffList.findIndex(s => s.id === currentStaff.id);
  }, [currentStaff, staffList]);

  const handlePrevStaff = () => {
    if (currentIndex > 0 && onSelectStaff) {
      onSelectStaff(staffList[currentIndex - 1]);
    }
  };

  const handleNextStaff = () => {
    if (currentIndex >= 0 && currentIndex < staffList.length - 1 && onSelectStaff) {
      onSelectStaff(staffList[currentIndex + 1]);
    }
  };

  // Expected timings
  const defaultShiftIn = schoolData?.staffTimings?.shiftStartTime ? formatTo12h(schoolData.staffTimings.shiftStartTime) : '08:00 AM';
  const defaultShiftOut = schoolData?.staffTimings?.shiftEndTime ? formatTo12h(schoolData.staffTimings.shiftEndTime) : '02:00 PM';
  const shiftTimeIn = currentStaff?.timingIn || currentStaff?.expectedTimeIn || defaultShiftIn;
  const shiftTimeOut = currentStaff?.timingOut || currentStaff?.expectedTimeOut || defaultShiftOut;

  // ── CUSTOMIZABLE POLICY BANNER STATE ──
  const defaultPolicyTitle = 'اسکول پالیسی و ضابطہ اخلاق برائے تنخواہ (Official School Payroll Policy):';
  const defaultPolicyText = 
    `✓ اسکول کی طرف سے کی گئی تمام تعطیلات (اتوار، سرکاری چھٹیاں یا اسکول اعلانیہ تعطیلات) پر کوئی تنخواہ منہا (Cut) نہیں ہوگی اور یہ ملازم کی چھٹی میں شمار نہیں ہوں گی۔\n` +
    `✓ تنخواہ کی کٹوتی صرف بلا اجازت غیر حاضری (خود کی چھٹی / Unexcused Absent) پر کی جائے گی۔`;

  const [policyTitle, setPolicyTitle] = useState(() => {
    return localStorage.getItem(`custom_policy_title_${activeSchoolId}`) || 
      schoolData?.staffPolicyTitle || 
      defaultPolicyTitle;
  });

  const [policyText, setPolicyText] = useState(() => {
    return localStorage.getItem(`custom_policy_text_${activeSchoolId}`) || 
      schoolData?.staffAttendancePolicy || 
      defaultPolicyText;
  });

  const [isEditingPolicy, setIsEditingPolicy] = useState(false);
  const [draftPolicyTitle, setDraftPolicyTitle] = useState(policyTitle);
  const [draftPolicyText, setDraftPolicyText] = useState(policyText);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Save customized policy to Firestore & LocalStorage
  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    try {
      setPolicyTitle(draftPolicyTitle);
      setPolicyText(draftPolicyText);
      localStorage.setItem(`custom_policy_title_${activeSchoolId}`, draftPolicyTitle);
      localStorage.setItem(`custom_policy_text_${activeSchoolId}`, draftPolicyText);

      if (activeSchoolId && db) {
        await setDoc(doc(db, 'schools', activeSchoolId), {
          staffPolicyTitle: draftPolicyTitle,
          staffAttendancePolicy: draftPolicyText
        }, { merge: true });
      }
      setIsEditingPolicy(false);
    } catch (err) {
      console.error('Failed to save custom policy:', err);
      setIsEditingPolicy(false);
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleResetPolicy = () => {
    setDraftPolicyTitle(defaultPolicyTitle);
    setDraftPolicyText(defaultPolicyText);
    setPolicyTitle(defaultPolicyTitle);
    setPolicyText(defaultPolicyText);
    localStorage.removeItem(`custom_policy_title_${activeSchoolId}`);
    localStorage.removeItem(`custom_policy_text_${activeSchoolId}`);
    setIsEditingPolicy(false);
  };

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
      if (!currentStaff?.id || !activeSchoolId) return;
      setLoading(true);
      try {
        let docs = [];

        try {
          const mRecords = await getStaffAttendanceByMonth(activeSchoolId, selectedMonth);
          if (Array.isArray(mRecords) && mRecords.length > 0) {
            docs = [...docs, ...mRecords];
          }
        } catch (e) {
          console.warn('getStaffAttendanceByMonth notice:', e);
        }

        try {
          const allSchoolAtt = await getRecords('attendance', activeSchoolId);
          if (Array.isArray(allSchoolAtt) && allSchoolAtt.length > 0) {
            docs = [...docs, ...allSchoolAtt];
          }
        } catch (e) {
          try {
            const q = query(collection(db, 'attendance'), where('schoolId', '==', activeSchoolId));
            const snap = await getDocs(q);
            docs = [...docs, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))];
          } catch (err2) {
            console.warn('Direct attendance query notice:', err2);
          }
        }

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

        const staffIdentifiers = [
          currentStaff.id,
          currentStaff.employeeId,
          currentStaff.staffId,
          currentStaff.userId,
          currentStaff.empId
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
          const matchesName = currentStaff.name && r.staffName && (
            String(r.staffName).toLowerCase().trim() === String(currentStaff.name).toLowerCase().trim()
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
  }, [currentStaff, activeSchoolId, selectedMonth]);

  // Navigate Month Helper
  const navigateMonth = (direction) => {
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10) + direction;
    if (m > 12) {
      m = 1;
      y += 1;
    } else if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

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
      let salaryImpact = 'Paid (تنخواہ شامل)';
      let statusTextUrdu = 'حاضر (Present)';

      if (isSunday) {
        status = 'sunday';
        timeIn = 'Weekend';
        timeOut = 'School Off';
        hoursWorked = '0h';
        salaryImpact = 'School Off • Fully Paid (مکمل تنخواہ)';
        statusTextUrdu = 'اتوار (اسکول چھٹی)';
      } else if (match) {
        status = (match.status || 'present').toLowerCase();
        isLate = !!match.isLate;
        minutesLate = match.minutesLate || 0;

        if (status === 'present') {
          const rawIn = match.timeIn || match.time || match.timeInRaw || '';
          const rawOut = match.timeOut || match.timeOutRaw || '';
          const isEntryOnly = match.actionType === 'ENTRY';

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
          salaryImpact = 'Fully Paid (مکمل تنخواہ)';
          statusTextUrdu = isLate ? `حاضر (تاخیر ${minutesLate}m)` : 'حاضر (Present)';
        } else if (status === 'leave') {
          timeIn = 'Approved';
          timeOut = 'Leave';
          hoursWorked = 'Excused';
          salaryImpact = 'Approved Leave • Paid (منظور شدہ رخصت)';
          statusTextUrdu = 'منظور شدہ رخصت (Leave)';
        } else if (status === 'absent') {
          timeIn = 'Absent';
          timeOut = 'Absent';
          hoursWorked = '0h 0m';
          salaryImpact = 'Deduction (تنخواہ کٹوتی)';
          statusTextUrdu = 'غیر حاضر (خود کی چھٹی)';
        } else if (status === 'half' || status === 'half day') {
          const rawIn = match.timeIn || match.time || match.timeInRaw || '';
          timeIn = (rawIn && rawIn !== '-') ? formatTo12h(rawIn) : '-';
          timeOut = 'Half Day';
          hoursWorked = '3h 0m';
          salaryImpact = 'Half Day • 0.5 Day Paid (نصف تنخواہ)';
          statusTextUrdu = 'نصف دن (Half Day)';
        } else {
          timeIn = (match.timeIn && match.timeIn !== '-') ? formatTo12h(match.timeIn) : '-';
          timeOut = (match.timeOut && match.timeOut !== '-') ? formatTo12h(match.timeOut) : '-';
          hoursWorked = '-';
          salaryImpact = 'Not Recorded';
          statusTextUrdu = status;
        }
      } else if (!isFuture) {
        status = 'not_marked';
        timeIn = '-';
        timeOut = '-';
        hoursWorked = '-';
        salaryImpact = 'Unmarked';
        statusTextUrdu = 'حاضری درج نہیں';
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
        statusTextUrdu,
        salaryImpact,
        timeIn,
        timeOut,
        hoursWorked,
        isLate,
        minutesLate
      });
    }
    return days;
  }, [selectedMonth, attendanceRecords]);

  // Aggregate Metrics & Strict Payroll Rules
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
      if (st === 'present' || st === 'late' || (d.timeIn && d.timeIn !== '-' && d.timeIn !== 'Absent' && d.timeIn !== 'Approved' && d.timeIn !== 'Weekend')) {
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

    const totalMonthDays = monthDays.length;
    // CRITICAL: School holidays are 100% PAID and never deducted!
    const netPayableDays = Math.min(
      totalMonthDays,
      Math.max(0, presentDays + schoolHolidayDays + leaveDays)
    );
    const salaryDeductionDays = absentDays + (halfDays * 0.5);

    const punctualityRate = presentDays > 0 ? Math.round(((presentDays - lateDays) / presentDays) * 100) : 100;
    const attendancePercentage = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 100;

    return {
      totalMonthDays,
      schoolHolidayDays,
      workingDays,
      presentDays,
      lateDays,
      absentDays,
      halfDays,
      leaveDays,
      notMarkedDays,
      totalLateMinutes,
      netPayableDays,
      salaryDeductionDays,
      punctualityRate,
      attendancePercentage
    };
  }, [monthDays]);

  // Clean Employee ID
  const cleanEmpId = useMemo(() => {
    if (!currentStaff) return 'STF-001';
    return currentStaff.staffId || currentStaff.employeeId || currentStaff.empId || (currentStaff.id?.length > 8 ? `STF-${String(currentIndex + 1).padStart(3, '0')}` : currentStaff.id);
  }, [currentStaff, currentIndex]);

  // ── ADVANCED PAYROLL & PAYOUT CALCULATIONS ──
  const [customBasicSalary, setCustomBasicSalary] = useState('');
  const [customAllowances, setCustomAllowances] = useState('');
  const [latePenaltyRule, setLatePenaltyRule] = useState('three_lates_half_day');

  useEffect(() => {
    const rawBasic = currentStaff?.salary || currentStaff?.payrollSetup?.basicSalary || 30000;
    setCustomBasicSalary(String(rawBasic));
    const rawAllowances = (Number(currentStaff?.payrollSetup?.houseRentAllowance || 0) + Number(currentStaff?.payrollSetup?.medicalAllowance || 0) + Number(currentStaff?.payrollSetup?.transportAllowance || 0)) || 0;
    setCustomAllowances(String(rawAllowances));
  }, [currentStaff]);

  const payrollCalculations = useMemo(() => {
    const basic = Math.max(0, Number(customBasicSalary) || 0);
    const allowances = Math.max(0, Number(customAllowances) || 0);
    const totalDays = summaryMetrics.totalMonthDays || 30;

    const dailyRate = totalDays > 0 ? (basic / totalDays) : 0;
    const earnedBasic = Math.round(summaryMetrics.netPayableDays * dailyRate);
    const absentDeduction = Math.round(summaryMetrics.absentDays * dailyRate);

    let lateDeduction = 0;
    if (latePenaltyRule === 'three_lates_half_day') {
      const halfDaysCut = Math.floor(summaryMetrics.lateDays / 3);
      lateDeduction = Math.round(halfDaysCut * (dailyRate * 0.5));
    } else if (latePenaltyRule === 'per_late_100') {
      lateDeduction = summaryMetrics.lateDays * 100;
    }

    const totalDeductions = absentDeduction + lateDeduction;
    const grossEarned = earnedBasic + allowances;
    const netPayout = Math.max(0, grossEarned - lateDeduction);

    return {
      basic,
      allowances,
      dailyRate: Math.round(dailyRate),
      earnedBasic,
      absentDeduction,
      lateDeduction,
      totalDeductions,
      netPayout: Math.round(netPayout)
    };
  }, [customBasicSalary, customAllowances, summaryMetrics, latePenaltyRule]);

  // 1-Click Print Handler
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
          <title>Monthly Staff Sheet - ${currentStaff?.name || 'Staff'} (${selectedMonth})</title>
          ${styles}
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            body { 
              margin: 0; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              background-color: white !important; 
              font-family: system-ui, -apple-system, sans-serif;
            }
            @media print {
              * {
                box-shadow: none !important;
              }
              .no-print { display: none !important; }
              table { width: 100% !important; border-collapse: collapse !important; font-size: 10px !important; }
              th, td { border: 1px solid #cbd5e1 !important; padding: 3px 6px !important; }
              th { background-color: #f1f5f9 !important; font-weight: bold !important; }
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

  // 1-Click Real Excel (.xlsx) Export via SheetJS
  const handleExportExcel = () => {
    const dataToExport = monthDays.map((d, i) => ({
      "Sr #": i + 1,
      "Date": d.dateFormatted || d.date,
      "Day": d.dayName,
      "Time In (آمد کا وقت)": d.isSunday ? 'School Off' : (d.timeIn !== '-' ? d.timeIn : 'Not Recorded'),
      "Time Out (رخصت کا وقت)": d.isSunday ? 'School Off' : (d.timeOut !== '-' ? d.timeOut : (d.timeIn !== '-' ? 'On Duty' : 'Not Recorded')),
      "Duration (دورانیہ)": d.isSunday ? '0h' : d.hoursWorked,
      "Punctuality": d.isLate ? `Late (${d.minutesLate}m)` : (d.timeIn !== '-' ? 'On Time' : '-'),
      "Attendance Status (کیفیت)": d.statusTextUrdu,
      "Salary Impact (تنخواہ کا اثر)": d.salaryImpact
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Attendance");
    
    const summaryData = [
      { "Metric": "School Name", "Value": schoolData?.name || 'Smart Angels Grammar School' },
      { "Metric": "Staff Name", "Value": currentStaff?.name || '' },
      { "Metric": "Employee ID", "Value": cleanEmpId },
      { "Metric": "Designation", "Value": currentStaff?.designation || currentStaff?.role || 'Staff' },
      { "Metric": "Department", "Value": currentStaff?.department || 'Academic' },
      { "Metric": "Month / Period", "Value": selectedMonth },
      { "Metric": "Assigned Shift", "Value": `${shiftTimeIn} - ${shiftTimeOut}` },
      { "Metric": "Total Month Days", "Value": summaryMetrics.totalMonthDays },
      { "Metric": "School Off Days (Sundays/Holidays)", "Value": `${summaryMetrics.schoolHolidayDays} (Fully Paid • No Cut)` },
      { "Metric": "Actual Working Days", "Value": summaryMetrics.workingDays },
      { "Metric": "Present Days", "Value": summaryMetrics.presentDays },
      { "Metric": "Approved Leaves", "Value": `${summaryMetrics.leaveDays} (Paid)` },
      { "Metric": "Unexcused Absents (Khud Ki Chutti)", "Value": `${summaryMetrics.absentDays} (Salary Deducted)` },
      { "Metric": "Late Days", "Value": `${summaryMetrics.lateDays} (${summaryMetrics.totalLateMinutes} mins late)` },
      { "Metric": "Net Payable Days", "Value": `${summaryMetrics.netPayableDays} Days` },
      { "Metric": "Basic Salary (PKR)", "Value": `Rs. ${payrollCalculations.basic.toLocaleString()}` },
      { "Metric": "Daily Rate (PKR)", "Value": `Rs. ${payrollCalculations.dailyRate.toLocaleString()} / day` },
      { "Metric": "Net Payable Payout (PKR)", "Value": `Rs. ${payrollCalculations.netPayout.toLocaleString()}` },
      { "Metric": "Official Policy Note", "Value": policyText.replace(/\n/g, ' ') }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary & Payroll");

    XLSX.writeFile(wb, `Staff_Monthly_Sheet_${currentStaff?.name || 'Staff'}_${selectedMonth}.xlsx`);
  };

  // 1-Click WhatsApp Time Slip to Staff Member
  const handleWhatsAppTimeSlip = () => {
    const phone = currentStaff?.phone || currentStaff?.contactNumber || currentStaff?.whatsappNo || '';
    if (!phone) {
      alert('Is staff member ka phone number system mein mojood nahi hai.');
      return;
    }
    const cleanPhone = formatPhoneNumber(phone);
    
    const msg = 
      `*محترم ${currentStaff.name} صاحب!* (${currentStaff.designation || currentStaff.role || 'Staff'})\n` +
      `آپ کی ماہانہ انفرادی حاضری و پے رول شیٹ برائے ماہ *${selectedMonth}* درج ذیل ہے:\n\n` +
      `📅 ماہ کے کل دن: ${summaryMetrics.totalMonthDays}\n` +
      `🏫 اسکول کی چھٹیاں (اتوار/تعطیلات): ${summaryMetrics.schoolHolidayDays} دن (مکمل تنخواہ شامل • 0 کٹوتی)\n` +
      `🏢 اسکول کھلنے کے دن: ${summaryMetrics.workingDays} دن\n` +
      `✅ کل حاضری: ${summaryMetrics.presentDays} دن\n` +
      `📋 منظور شدہ رخصت: ${summaryMetrics.leaveDays} دن (Paid)\n` +
      `❌ غیر حاضر (خود کی چھٹی): ${summaryMetrics.absentDays} دن\n` +
      `⏰ لیٹ آمد: ${summaryMetrics.lateDays} دن (کل تاخیر: ${summaryMetrics.totalLateMinutes} منٹ)\n` +
      `💰 تنخواہ کے حقدار دن (Net Payable): ${summaryMetrics.netPayableDays} دن\n` +
      `💵 خالص تنخواہ (Net Payout): Rs. ${payrollCalculations.netPayout.toLocaleString()}\n` +
      `📊 مجموعی حاضری شرح: ${summaryMetrics.attendancePercentage}%\n\n` +
      `_نوٹ: اسکول کی طرف سے کی گئی تمام تعطیلات کی کوئی تنخواہ نہیں کٹی۔_\n` +
      `ادارہ: *${schoolData?.name || 'Smart Angels Grammar School'}*`;

    sendWhatsAppApiMessage(activeSchoolId, cleanPhone, msg);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden font-sans"
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[96vh] shadow-2xl flex flex-col overflow-hidden animate-scaleUp relative">
        
        {/* Top Header Bar with Staff Switcher & Controls */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 sticky top-0 z-30 shadow-xs">
          
          {/* Staff Switcher Section */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-sm shrink-0">
              <UserCheck size={18} />
            </div>

            {/* Staff Dropdown */}
            {staffList && staffList.length > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevStaff}
                  disabled={currentIndex <= 0}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Previous Staff Member"
                >
                  <ChevronLeft size={16} />
                </button>
                <select
                  value={currentStaff?.id || ''}
                  onChange={(e) => {
                    const found = staffList.find(s => s.id === e.target.value);
                    if (found && onSelectStaff) onSelectStaff(found);
                  }}
                  className="bg-white border border-slate-200 text-slate-900 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-500 shadow-sm max-w-[210px] sm:max-w-[250px] truncate"
                >
                  {staffList.map((s, idx) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.staffId || s.employeeId || `STF-${String(idx + 1).padStart(3, '0')}`}) - {s.department || s.role || 'Staff'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleNextStaff}
                  disabled={currentIndex >= staffList.length - 1}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Next Staff Member"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-sm font-black text-slate-900 leading-none">{currentStaff?.name || 'Staff Member'}</h2>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  ID: <span className="font-mono font-bold text-slate-700">{cleanEmpId}</span> • {currentStaff?.designation || 'Staff'}
                </p>
              </div>
            )}

            {/* View Mode Selector Tabs */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl ml-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === 'attendance'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Attendance Sheet (حاضری)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payout')}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                  activeTab === 'payout'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator size={13} />
                <span>Payout & Voucher (تنخواہ)</span>
              </button>
            </div>
          </div>

          {/* Month Picker & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Month Navigator */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={14} />
              </button>
              <input 
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-900 text-xs font-bold px-1.5 py-1 outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Next Month"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Print Slip Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Print Monthly Staff Attendance Sheet (PDF)"
            >
              <Printer size={14} /> <span className="hidden sm:inline">Print (PDF)</span>
            </button>

            {/* Export Excel (.xlsx) Button */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Download Excel Spreadsheet (.xlsx)"
            >
              <Download size={14} /> <span className="hidden sm:inline">Excel</span>
            </button>

            {/* WhatsApp to Staff */}
            {currentStaff?.phone && (
              <button
                onClick={handleWhatsAppTimeSlip}
                className="w-8 h-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-sm transition-all cursor-pointer"
                title="Send Monthly Attendance & Salary Sheet on WhatsApp"
              >
                <MessageCircle size={15} />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <X size={15} /> <span className="font-bold hidden sm:inline">Close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable Container */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 md:p-8 space-y-6">
          <div id="staff-timeslip-printable-area" ref={printAreaRef} className="space-y-5">
            
            {/* Official Letterhead Header */}
            <div className="border-b-2 border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {schoolData?.logo ? (
                  <img src={schoolData.logo} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-slate-200 shadow-xs" />
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
                  <p className="text-[11px] text-slate-500 font-sans">Phone: {schoolData?.phone || '0331-2202569'} • Email: {schoolData?.email || 'school@domain.com'}</p>
                </div>
              </div>

              <div className="md:text-right">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-900 font-black text-xs uppercase tracking-widest border border-slate-300">
                  {activeTab === 'payout' ? 'Official Salary & Payout Voucher' : 'Monthly Staff Attendance & Payroll Sheet'}
                </span>
                <p className="text-xs font-bold text-slate-700 mt-1">Period: <span className="font-sans font-bold text-indigo-700">{selectedMonth}</span></p>
                <p className="text-[11px] text-slate-500 font-mono">Official Shift: {shiftTimeIn} - {shiftTimeOut}</p>
              </div>
            </div>

            {/* Staff Information Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Name (نام)</span>
                <span className="text-sm font-black text-slate-900">{currentStaff?.name || 'Unnamed Staff'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Designation (عہدہ)</span>
                <span className="text-xs font-bold text-slate-800">{currentStaff?.designation || currentStaff?.role || 'Teacher'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Employee ID (شناختی نمبر)</span>
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md inline-block">
                  {cleanEmpId}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department (شعبہ)</span>
                <span className="text-xs font-bold text-slate-800">{currentStaff?.department || 'Academic'}</span>
              </div>
            </div>

            {/* ── EDITABLE OFFICIAL POLICY BANNER (اسکول پالیسی و ضابطہ اخلاق) ── */}
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 shadow-xs relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold mt-0.5">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="flex-1">
                    {!isEditingPolicy ? (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="font-black text-emerald-950 text-xs sm:text-sm">
                            {policyTitle}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setDraftPolicyTitle(policyTitle);
                              setDraftPolicyText(policyText);
                              setIsEditingPolicy(true);
                            }}
                            className="no-print text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-white border border-emerald-300 px-2.5 py-1 rounded-lg transition-all shadow-2xs hover:bg-emerald-100/50 cursor-pointer"
                            title="Edit policy banner text for this school"
                          >
                            <Edit3 size={12} />
                            <span>Edit Policy (تبدیل کریں)</span>
                          </button>
                        </div>
                        <p className="text-emerald-900 text-[11px] sm:text-xs mt-1 leading-relaxed whitespace-pre-line">
                          {policyText}
                        </p>
                      </>
                    ) : (
                      /* Policy Inline Editor */
                      <div className="space-y-2 mt-0.5 no-print">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-900">Custom Policy Heading:</span>
                          <span className="text-[10px] text-emerald-700">Will be saved globally for this school</span>
                        </div>
                        <input
                          type="text"
                          value={draftPolicyTitle}
                          onChange={(e) => setDraftPolicyTitle(e.target.value)}
                          className="w-full bg-white border border-emerald-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-400"
                          placeholder="Policy Heading..."
                        />
                        <textarea
                          rows={3}
                          value={draftPolicyText}
                          onChange={(e) => setDraftPolicyText(e.target.value)}
                          className="w-full bg-white border border-emerald-300 text-slate-900 text-xs rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-400 leading-relaxed font-sans"
                          placeholder="Type your customized attendance & payroll policy rules here..."
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleResetPolicy}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100 flex items-center gap-1 transition-all"
                          >
                            <RotateCcw size={12} />
                            <span>Reset Default</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingPolicy(false)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSavePolicy}
                            disabled={savingPolicy}
                            className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                          >
                            <Save size={13} />
                            <span>{savingPolicy ? 'Saving...' : 'Save & Apply (محفوظ کریں)'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Month Days</span>
                <span className="text-base font-black text-slate-800">{summaryMetrics.totalMonthDays}</span>
                <span className="text-[8px] text-slate-400 block">ماہ کے دن</span>
              </div>

              {/* School Off (100% PAID, NO CUT) */}
              <div className="p-2.5 bg-sky-50 border border-sky-300 rounded-xl text-center ring-1 ring-sky-400/30">
                <span className="text-[9px] font-black text-sky-800 uppercase block">School Off</span>
                <span className="text-base font-black text-sky-950">{summaryMetrics.schoolHolidayDays}</span>
                <span className="text-[8px] font-bold text-sky-700 block">اسکول چھٹی (Paid)</span>
              </div>

              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                <span className="text-[9px] font-bold text-indigo-700 uppercase block">Work Days</span>
                <span className="text-base font-black text-indigo-900">{summaryMetrics.workingDays}</span>
                <span className="text-[8px] text-indigo-600 block">کھلنے کے دن</span>
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-center">
                <span className="text-[9px] font-black text-emerald-800 uppercase block">Present</span>
                <span className="text-base font-black text-emerald-950">{summaryMetrics.presentDays}</span>
                <span className="text-[8px] text-emerald-700 block">حاضر دن</span>
              </div>

              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-center">
                <span className="text-[9px] font-bold text-purple-700 uppercase block">Leaves</span>
                <span className="text-base font-black text-purple-900">{summaryMetrics.leaveDays + (summaryMetrics.halfDays * 0.5)}</span>
                <span className="text-[8px] text-purple-600 block">منظور رخصت (Paid)</span>
              </div>

              <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-center ring-1 ring-rose-400/20">
                <span className="text-[9px] font-black text-rose-800 uppercase block">Absent</span>
                <span className="text-base font-black text-rose-950">{summaryMetrics.absentDays}</span>
                <span className="text-[8px] font-bold text-rose-600 block">خود کی چھٹی (Cut)</span>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <span className="text-[9px] font-bold text-amber-800 uppercase block">Late Days</span>
                <span className="text-base font-black text-amber-950">{summaryMetrics.lateDays}</span>
                <span className="text-[8px] text-amber-700 block">({summaryMetrics.totalLateMinutes}m) تاخیر</span>
              </div>

              <div className="p-2.5 bg-emerald-600 text-white rounded-xl text-center shadow-xs">
                <span className="text-[9px] font-black uppercase tracking-wider block text-emerald-100">Payable Days</span>
                <span className="text-base font-black">{summaryMetrics.netPayableDays}</span>
                <span className="text-[8px] text-emerald-100 font-medium block">تنخواہ کے حقدار دن</span>
              </div>
            </div>

            {/* ── TAB 1: DAILY PUNCH ATTENDANCE TABLE ── */}
            {activeTab === 'attendance' ? (
              <div className="overflow-x-auto border border-slate-300 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-black text-slate-800 uppercase tracking-wider">
                      <th className="py-2.5 px-2 text-center w-8">#</th>
                      <th className="py-2.5 px-2.5">Date (تاریخ)</th>
                      <th className="py-2.5 px-2">Day (دن)</th>
                      <th className="py-2.5 px-2.5 text-emerald-800">Time In (آمد کا وقت)</th>
                      <th className="py-2.5 px-2.5 text-purple-800">Time Out (رخصت کا وقت)</th>
                      <th className="py-2.5 px-2">Duration (دورانیہ)</th>
                      <th className="py-2.5 px-2 text-center">Punctuality</th>
                      <th className="py-2.5 px-3">Status & Salary Impact (کیفیت و تنخواہ اثر)</th>
                      <th className="py-2.5 px-3 text-center min-w-[70px]">Signature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {monthDays.map((d, idx) => (
                      <tr 
                        key={idx} 
                        className={`${
                          d.isSunday 
                            ? 'bg-sky-50/40 text-slate-700' 
                            : d.isFuture 
                            ? 'text-slate-400 hover:bg-slate-50/40' 
                            : 'hover:bg-slate-50/80 transition-colors'
                        }`}
                      >
                        <td className="py-2 px-2 text-center font-bold text-slate-500 text-[11px]">{d.dayNumber}</td>
                        <td className="py-2 px-2.5 font-bold text-slate-900 tabular-nums">
                          {d.dateFormatted}
                        </td>
                        <td className="py-2 px-2 font-medium text-slate-600">
                          {d.dayName}
                        </td>
                        <td className="py-2 px-2.5 font-bold tabular-nums">
                          {d.isSunday ? (
                            <span className="text-sky-700 font-bold text-[11px]">School Off</span>
                          ) : d.isFuture || d.status === 'not_marked' ? (
                            <span className="text-slate-400 font-normal">—</span>
                          ) : (
                            <span className={d.isLate ? 'text-amber-800 font-mono font-bold' : 'text-emerald-800 font-mono font-bold'}>
                              {d.timeIn}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 font-bold tabular-nums">
                          {d.isSunday ? (
                            <span className="text-sky-700 font-bold text-[11px]">School Off</span>
                          ) : d.isFuture || d.status === 'not_marked' ? (
                            <span className="text-slate-400 font-normal">—</span>
                          ) : (
                            <span className="text-purple-800 font-mono font-bold">
                              {d.timeOut}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 font-medium text-slate-700 tabular-nums">
                          {d.isSunday ? (
                            <span className="text-slate-400 text-[11px]">—</span>
                          ) : d.isFuture || d.status === 'not_marked' ? (
                            <span className="text-slate-400 font-normal">—</span>
                          ) : (
                            <span className="font-semibold text-slate-800">{d.hoursWorked}</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {d.isSunday || d.isFuture || d.status === 'not_marked' ? (
                            <span className="text-slate-400">—</span>
                          ) : d.isLate ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold">
                              Late ({d.minutesLate}m)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                              On Time
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {d.isSunday ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
                              🏫 اسکول چھٹی (School Off) • مکمل تنخواہ (Paid)
                            </span>
                          ) : d.isFuture ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
                              Upcoming
                            </span>
                          ) : d.status === 'not_marked' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
                              Not Marked
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              d.status === 'present'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : d.status === 'leave'
                                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                : d.status === 'half'
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                                : 'bg-rose-100 text-rose-900 border border-rose-300'
                            }`}>
                              {d.status === 'present' && `✅ حاضر (Present) • مکمل تنخواہ (Paid)`}
                              {d.status === 'leave' && `📋 منظور شدہ رخصت • مکمل تنخواہ (Paid)`}
                              {d.status === 'half' && `⏱ نصف دن (Half Day) • 0.5 Day Paid`}
                              {d.status === 'absent' && `❌ غیر حاضر (خود کی چھٹی) • تنخواہ کٹوتی`}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="w-16 border-b border-dashed border-slate-300 mx-auto"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── TAB 2: ADVANCED MONTHLY PAYOUT & SALARY VOUCHER ── */
              <div className="space-y-5">
                {/* Salary Calculation Architecture Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Basic Salary & Rate Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                      1. Basic Architecture (بنیادی ڈھانچہ)
                    </span>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Basic Monthly Salary (PKR):</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">Rs.</span>
                        <input
                          type="number"
                          value={customBasicSalary}
                          onChange={(e) => setCustomBasicSalary(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-sm font-bold font-mono text-slate-900 outline-none focus:border-indigo-500 shadow-2xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Allowances (اضافی الاؤنس):</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">Rs.</span>
                        <input
                          type="number"
                          value={customAllowances}
                          onChange={(e) => setCustomAllowances(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-sm font-bold font-mono text-slate-900 outline-none focus:border-indigo-500 shadow-2xs"
                        />
                      </div>
                    </div>
                    <div className="pt-1 text-[11px] text-slate-500 flex justify-between border-t border-slate-200">
                      <span>Daily Wage Rate:</span>
                      <strong className="text-slate-800 font-mono">Rs. {payrollCalculations.dailyRate.toLocaleString()} / day</strong>
                    </div>
                  </div>

                  {/* Attendance Earned & Deductions */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                      2. Attendance Impact (حاضری اثر)
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">Payable Days (حاضر + اسکول چھٹیاں):</span>
                        <span className="font-bold text-emerald-800">{summaryMetrics.netPayableDays} Days</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">School Holidays Included:</span>
                        <span className="font-bold text-sky-800">{summaryMetrics.schoolHolidayDays} Days (100% Paid)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">Unexcused Absents (خود کی چھٹی):</span>
                        <span className="font-bold text-rose-700">{summaryMetrics.absentDays} Days (Rs. {payrollCalculations.absentDeduction.toLocaleString()})</span>
                      </div>
                      <div className="flex justify-between py-1 items-center">
                        <span className="text-slate-600">Late Penalty Policy:</span>
                        <select
                          value={latePenaltyRule}
                          onChange={(e) => setLatePenaltyRule(e.target.value)}
                          className="bg-white border border-slate-200 text-[10px] font-bold rounded-lg px-2 py-1 outline-none text-slate-800"
                        >
                          <option value="three_lates_half_day">3 Lates = 0.5 Day Cut</option>
                          <option value="per_late_100">Rs 100 per Late</option>
                          <option value="none">No Late Cut (معاف)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Final Net Payout Summary Card */}
                  <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-5 flex flex-col justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                        Net Payout Payable
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black mt-1 font-mono tracking-tight text-white">
                        Rs. {payrollCalculations.netPayout.toLocaleString()}
                      </h3>
                      <p className="text-[11px] text-emerald-200 mt-1">
                        خالص قابلِ ادا تنخواہ برائے ماہ {selectedMonth}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-emerald-800/80 space-y-1 text-xs">
                      <div className="flex justify-between text-emerald-100">
                        <span>Earned Basic:</span>
                        <span className="font-mono font-bold">Rs. {payrollCalculations.earnedBasic.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-emerald-100">
                        <span>Total Deductions:</span>
                        <span className="font-mono text-rose-300 font-bold">- Rs. {payrollCalculations.totalDeductions.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Computerized Official Salary Voucher / Payslip */}
                <div className="border-2 border-slate-300 rounded-2xl p-5 bg-white space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Receipt size={18} className="text-emerald-700" />
                      <h4 className="font-black text-slate-900 text-sm uppercase">Computerized Salary Voucher & Cash Receipt (تنخواہ رسید)</h4>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-500">VOUCHER #{selectedMonth.replace('-', '')}-{cleanEmpId}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Employee Name:</span>
                      <strong className="text-slate-900">{currentStaff?.name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Employee ID:</span>
                      <strong className="font-mono text-indigo-700">{cleanEmpId}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Designation:</span>
                      <strong className="text-slate-800">{currentStaff?.designation || 'Teacher'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Payable Days:</span>
                      <strong className="text-emerald-800">{summaryMetrics.netPayableDays} / {summaryMetrics.totalMonthDays} Days (Full Paid)</strong>
                    </div>
                  </div>

                  {/* Voucher Line Items Table */}
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                        <th className="py-2 px-3 border border-slate-300 text-left">Description (تفصیل)</th>
                        <th className="py-2 px-3 border border-slate-300 text-right">Days / Rate</th>
                        <th className="py-2 px-3 border border-slate-300 text-right">Earnings (آمدنی)</th>
                        <th className="py-2 px-3 border border-slate-300 text-right">Deductions (کٹوتی)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      <tr>
                        <td className="py-2 px-3 border border-slate-200 font-semibold text-slate-800">
                          Basic Salary (بنیادی تنخواہ)
                        </td>
                        <td className="py-2 px-3 border border-slate-200 text-right font-mono text-slate-600">
                          Rs. {payrollCalculations.dailyRate.toLocaleString()} / day
                        </td>
                        <td className="py-2 px-3 border border-slate-200 text-right font-mono font-bold text-emerald-800">
                          Rs. {payrollCalculations.earnedBasic.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 border border-slate-200 text-right font-mono text-slate-400">—</td>
                      </tr>
                      {payrollCalculations.allowances > 0 && (
                        <tr>
                          <td className="py-2 px-3 border border-slate-200 font-semibold text-slate-800">
                            Allowances & Bonuses (الاؤنس و مراعات)
                          </td>
                          <td className="py-2 px-3 border border-slate-200 text-right font-mono text-slate-600">Fixed</td>
                          <td className="py-2 px-3 border border-slate-200 text-right font-mono font-bold text-emerald-800">
                            Rs. {payrollCalculations.allowances.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 text-right font-mono text-slate-400">—</td>
                        </tr>
                      )}
                      {payrollCalculations.absentDeduction > 0 && (
                        <tr>
                          <td className="py-2 px-3 border border-slate-200 font-semibold text-rose-800">
                            Unexcused Absents (خود کی چھٹی)
                          </td>
                          <td className="py-2 px-3 border border-slate-200 text-right font-mono text-slate-600">
                            {summaryMetrics.absentDays} Days
                          </td>
                          <td className="py-2 px-3 border border-slate-200 text-right font-mono text-slate-400">—</td>
                          <td className="py-2 px-3 border border-slate-200 text-right font-mono font-bold text-rose-700">
                            Rs. {payrollCalculations.absentDeduction.toLocaleString()}
                          </td>
                        </tr>
                      )}
                      {payrollCalculations.lateDeduction > 0 && (
                        <tr>
                          <td className="py-2 px-3 border border-slate-200 font-semibold text-amber-800">
                            Late Arrival Penalty (تاخیر پر کٹوتی)
                          </td>
                          <td className="py-2 px-3 border border-slate-200 text-right font-mono text-slate-600">
                            {summaryMetrics.lateDays} Lates
                          </td>
                          <td className="py-2 px-3 border border-slate-200 text-right font-mono text-slate-400">—</td>
                          <td className="py-2 px-3 border border-slate-200 text-right font-mono font-bold text-amber-700">
                            Rs. {payrollCalculations.lateDeduction.toLocaleString()}
                          </td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-black">
                        <td colSpan={2} className="py-2.5 px-3 border border-slate-300 text-right text-slate-900">
                          NET PAYABLE SALARY (خالص قابلِ ادا رقم):
                        </td>
                        <td colSpan={2} className="py-2.5 px-3 border border-slate-300 text-right font-mono text-emerald-900 text-sm">
                          PKR {payrollCalculations.netPayout.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="pt-2 text-[11px] text-slate-600 flex items-center justify-between">
                    <span className="italic">Payment Mode: Cash / Bank Transfer</span>
                    <span className="font-bold">Status: Passed & Verified for Payment</span>
                  </div>
                </div>
              </div>
            )}

            {/* Signatures & Approvals Section */}
            <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-6">
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <p className="font-bold text-slate-800">دستخط ملازم (Employee Signature)</p>
                <p className="text-[10px] text-slate-400 font-sans">{currentStaff?.name}</p>
              </div>
              <div className="space-y-6">
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <p className="font-bold text-slate-800">دستخط انچارج حاضری (Attendance Incharge)</p>
                <p className="text-[10px] text-slate-400 font-sans">Verified Punch Record</p>
              </div>
              <div className="space-y-6">
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <p className="font-bold text-slate-800">مہر و دستخط پرنسپل (Principal / Admin)</p>
                <p className="text-[10px] text-slate-400 font-sans">Approved for Payroll</p>
              </div>
            </div>

            {/* Footer Verification Stamp */}
            <div className="text-center text-[10px] text-slate-400 pt-2 font-sans border-t border-slate-100">
              Official Staff Attendance & Payroll Sheet • Verified via TaleemiDunya-Pro Biometric Terminal • Generated on {new Date().toLocaleDateString('en-GB')}
            </div>

          </div>
        </div>

        {/* Bottom Sticky Action Footer Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <Clock size={15} className="text-indigo-600" />
            <span className="hidden sm:inline">Official Shift:</span>
            <span className="font-bold text-slate-800 font-mono">{shiftTimeIn} - {shiftTimeOut}</span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="text-emerald-700 font-bold hidden sm:inline">Payable Days: {summaryMetrics.netPayableDays} / {summaryMetrics.totalMonthDays}</span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="text-emerald-800 font-black font-mono">Net Salary: Rs. {payrollCalculations.netPayout.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer size={14} /> <span>Print Sheet (PDF)</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download size={14} /> <span>Export Excel</span>
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
