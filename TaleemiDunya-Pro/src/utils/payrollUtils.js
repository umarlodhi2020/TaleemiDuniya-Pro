import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getRecords } from '../services/db';

/**
 * Payroll Utility Functions — TaleemiDunya-Pro
 * Attendance-Based Salary Deduction Integration & Safety Audited
 */

/**
 * Verifies if user has authorized administrative role to process or modify payroll.
 * 
 * @param {Object} userData - User profile object from AuthContext
 * @returns {boolean} True if user holds administrative role
 */
export const isAuthorizedPayrollAdmin = (userData) => {
  if (!userData || typeof userData !== 'object') return false;
  const role = String(userData.role || '').toLowerCase().trim();
  return role === 'school-admin' || role === 'admin' || role === 'super-admin';
};

/**
 * Summarizes raw attendance records for a staff member for a specific YYYY-MM period.
 * 
 * @param {Array} attendanceRecords - Array of attendance documents from Firestore
 * @param {string} staffId - Target staff member ID
 * @param {string} period - YYYY-MM period string
 * @param {number} [customWorkingDays] - Optional default working days (e.g. 26)
 * @returns {Object} Summarized attendance stats
 */
export const summarizeStaffAttendance = (attendanceRecords = [], staffId, period, customWorkingDays = 26) => {
  const workingDays = Math.max(1, Number(customWorkingDays || 26));

  if (!Array.isArray(attendanceRecords) || !staffId || !period) {
    return {
      hasData: false,
      totalWorkingDays: workingDays,
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      leaveDays: 0,
      paidEquivalentDays: workingDays,
      attendanceDeductionDays: 0
    };
  }

  // Filter records for this staff member and period
  const periodLogs = attendanceRecords.filter((rec) => {
    const isStaffMatch = rec.staffId === staffId || rec.userId === staffId || rec.employeeId === staffId;
    const isDateMatch = rec.date && typeof rec.date === 'string' && rec.date.startsWith(period);
    return isStaffMatch && isDateMatch;
  });

  if (periodLogs.length === 0) {
    return {
      hasData: false,
      totalWorkingDays: workingDays,
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      leaveDays: 0,
      paidEquivalentDays: workingDays,
      attendanceDeductionDays: 0
    };
  }

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let leaveDays = 0;

  periodLogs.forEach((rec) => {
    const st = String(rec.status || '').toLowerCase().trim();
    if (st === 'present' || st === 'present day' || st === 'in' || st === 'late' || st === 'verified') {
      presentDays += 1;
    } else if (st === 'absent') {
      absentDays += 1;
    } else if (st === 'half' || st === 'halfday' || st === 'half day' || st === 'half-day') {
      halfDays += 1;
    } else if (st === 'leave' || st === 'on leave' || st === 'approved_leave') {
      leaveDays += 1;
    }
  });

  const paidEquivalentDays = presentDays + (halfDays * 0.5);
  const attendanceDeductionDays = absentDays + (halfDays * 0.5);

  return {
    hasData: true,
    totalWorkingDays: workingDays,
    presentDays,
    absentDays,
    halfDays,
    leaveDays,
    paidEquivalentDays,
    attendanceDeductionDays
  };
};

/**
 * Calculates monthly payroll breakdown including attendance-based salary deduction.
 * 
 * Rules:
 * Daily Salary = Basic Salary / Total Working Days
 * Absent Deduction = Daily Salary * Absent Days
 * Half Day Deduction = Daily Salary * 0.5 * Half Days
 * Total Attendance Deduction = Absent Deduction + Half Day Deduction
 * Total Deductions = Attendance Deduction + Other Deductions
 * Gross Salary = Basic Salary + Total Allowances (Medical + Transport)
 * Net Salary = Gross Salary - Total Deductions
 * 
 * @param {Object} payrollSetup - Staff payroll setup object
 * @param {number} staffSalary - Legacy staff.salary fallback
 * @param {Object} [attendanceSummary] - Attendance summary details
 * @returns {Object} Calculated payroll breakdown
 */
export const calculateMonthlyPayroll = (payrollSetup = {}, staffSalary = 0, attendanceSummary = null) => {
  const basicSalary = Math.max(0, Number(payrollSetup?.basicSalary ?? staffSalary ?? 0));
  const medicalAllowance = Math.max(0, Number(payrollSetup?.medicalAllowance ?? 0));
  const transportAllowance = Math.max(0, Number(payrollSetup?.transportAllowance ?? 0));
  const otherDeductions = Math.max(0, Number(payrollSetup?.otherDeductions ?? 0));

  const totalAllowances = medicalAllowance + transportAllowance;
  const grossSalary = basicSalary + totalAllowances;

  let totalWorkingDays = Math.max(1, Number(attendanceSummary?.totalWorkingDays ?? payrollSetup?.workingDays ?? 26));
  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let leaveDays = 0;
  let paidEquivalentDays = totalWorkingDays;
  let attendanceDeductionDays = 0;
  let attendanceDeduction = 0;
  let hasAttendanceData = false;

  if (attendanceSummary && typeof attendanceSummary === 'object' && attendanceSummary.hasData) {
    hasAttendanceData = true;
    totalWorkingDays = Math.max(1, Number(attendanceSummary.totalWorkingDays || 26));
    presentDays = Math.max(0, Number(attendanceSummary.presentDays || 0));
    absentDays = Math.max(0, Number(attendanceSummary.absentDays || 0));
    halfDays = Math.max(0, Number(attendanceSummary.halfDays || 0));
    leaveDays = Math.max(0, Number(attendanceSummary.leaveDays || 0));

    paidEquivalentDays = presentDays + (halfDays * 0.5);
    attendanceDeductionDays = absentDays + (halfDays * 0.5);

    const dailySalary = basicSalary > 0 ? basicSalary / totalWorkingDays : 0;
    attendanceDeduction = Math.round((dailySalary * attendanceDeductionDays) * 100) / 100;
  }

  const totalDeductions = Math.round((attendanceDeduction + otherDeductions) * 100) / 100;
  const netSalary = Math.max(0, Math.round((grossSalary - totalDeductions) * 100) / 100);

  return {
    basicSalary,
    medicalAllowance,
    transportAllowance,
    totalAllowances,
    grossSalary,
    otherDeductions,
    totalWorkingDays,
    presentDays,
    absentDays,
    halfDays,
    leaveDays,
    paidEquivalentDays,
    attendanceDeductionDays,
    attendanceDeduction,
    totalDeductions,
    netSalary,
    hasAttendanceData
  };
};

/**
 * Validates staff eligibility, attendance consistency, permissions, and numeric rules.
 * 
 * @param {Object} staff - Staff member object
 * @param {Object} calcResult - Result of calculateMonthlyPayroll
 * @param {Object} [attendanceSummary] - Attendance summary details
 * @param {Object} [userData] - User authentication profile object
 * @returns {{valid: boolean, error?: string, warning?: string}}
 */
export const validatePayrollEligibility = (staff, calcResult, attendanceSummary = null, userData = null) => {
  if (!staff) {
    return { valid: false, error: 'Staff member record is missing.' };
  }

  // Permission Check
  if (userData && !isAuthorizedPayrollAdmin(userData)) {
    return {
      valid: false,
      error: 'You do not have administrative permission to process or modify payroll.'
    };
  }

  // Check Staff Lifecycle status
  const status = staff.status || 'Active';
  if (status !== 'Active') {
    return {
      valid: false,
      error: `Payroll can only be processed for Active staff members. Current status: "${status}".`
    };
  }

  // Check Basic Salary
  if (!calcResult || calcResult.basicSalary <= 0) {
    return {
      valid: false,
      error: 'Basic salary is required before payroll can be processed.'
    };
  }

  // Check Attendance Data Presence
  if (attendanceSummary && attendanceSummary.hasData === false) {
    return {
      valid: false,
      error: 'Attendance data is missing/incomplete for this payroll period. Please record staff attendance before processing payroll.'
    };
  }

  // Validate Present + Absent + Half Day <= Total Working Days
  if (calcResult && calcResult.hasAttendanceData) {
    const totalMarked = calcResult.presentDays + calcResult.absentDays + calcResult.halfDays;
    if (totalMarked > calcResult.totalWorkingDays) {
      return {
        valid: false,
        error: `Invalid attendance: Total marked days (${totalMarked} days = ${calcResult.presentDays} Present + ${calcResult.absentDays} Absent + ${calcResult.halfDays} Half) exceed Total Working Days (${calcResult.totalWorkingDays}).`
      };
    }
  }

  // Check Deductions <= Gross Salary
  if (calcResult.totalDeductions > calcResult.grossSalary) {
    return {
      valid: false,
      error: `Total deductions (Rs. ${calcResult.totalDeductions.toLocaleString()}) cannot exceed gross salary (Rs. ${calcResult.grossSalary.toLocaleString()}).`
    };
  }

  return { valid: true };
};

/**
 * Formats YYYY-MM period string to human-readable month string (e.g. "2026-09" -> "September 2026")
 * 
 * @param {string} period - Period string in YYYY-MM format
 * @returns {string} Human-readable month string
 */
export const formatPeriod = (period) => {
  if (!period || typeof period !== 'string' || !period.includes('-')) {
    return period || 'Current Period';
  }
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (isNaN(year) || isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return period;
  }
  const d = new Date(year, monthIdx, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * Safely escapes a single value for CSV output (quotes, commas, line breaks)
 */
export const escapeCSVCell = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
};

/**
 * Triggers a browser file download of CSV content with a sanitized filename
 */
export const downloadCSV = (filename, csvContent) => {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports a dataset of staff payroll records to CSV format
 */
export const exportPayrollReportToCSV = (records = [], selectedPeriod = '') => {
  if (!Array.isArray(records) || records.length === 0) {
    return false;
  }

  const headers = [
    'Staff ID',
    'Employee Name',
    'Role',
    'Department',
    'Staff Status',
    'Payroll Month',
    'Working Days',
    'Present Days',
    'Absent Days',
    'Half Days',
    'Leave Days',
    'Paid Days',
    'Basic Salary (PKR)',
    'Medical Allowance (PKR)',
    'Transport Allowance (PKR)',
    'Total Allowances (PKR)',
    'Gross Salary (PKR)',
    'Attendance Deduction (PKR)',
    'Other Deductions (PKR)',
    'Total Deductions (PKR)',
    'Net Salary (PKR)',
    'Payroll Status'
  ];

  const rows = records.map(r => {
    const att = r.attSummary || {};
    return [
      escapeCSVCell(r.staffIdCode || r.staffId || r.id),
      escapeCSVCell(r.staffName || r.name),
      escapeCSVCell(r.staffRole || r.role || 'Staff'),
      escapeCSVCell(r.staffDepartment || r.department || 'N/A'),
      escapeCSVCell(r.staffStatus || r.status || 'Active'),
      escapeCSVCell(formatPeriod(r.period || r.month || selectedPeriod)),
      escapeCSVCell(r.totalWorkingDays ?? att.totalWorkingDays ?? 26),
      escapeCSVCell(r.presentDays ?? att.presentDays ?? 0),
      escapeCSVCell(r.absentDays ?? att.absentDays ?? 0),
      escapeCSVCell(r.halfDays ?? att.halfDays ?? 0),
      escapeCSVCell(r.leaveDays ?? att.leaveDays ?? 0),
      escapeCSVCell(r.paidEquivalentDays ?? att.paidEquivalentDays ?? 0),
      escapeCSVCell(Number(r.basicSalary || 0)),
      escapeCSVCell(Number(r.medicalAllowance || 0)),
      escapeCSVCell(Number(r.transportAllowance || 0)),
      escapeCSVCell(Number(r.totalAllowances || 0)),
      escapeCSVCell(Number(r.grossSalary || 0)),
      escapeCSVCell(Number(r.attendanceDeduction || 0)),
      escapeCSVCell(Number(r.otherDeductions || 0)),
      escapeCSVCell(Number(r.totalDeductions || 0)),
      escapeCSVCell(Number(r.netSalary || 0)),
      escapeCSVCell(r.status || 'Draft')
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const periodSlug = selectedPeriod ? formatPeriod(selectedPeriod).replace(/[^a-zA-Z0-9]/g, '_') : 'All_Periods';
  const filename = `Payroll_Report_${periodSlug}.csv`;

  downloadCSV(filename, csvContent);
  return true;
};

/**
 * Exports historical processed payroll records for a single staff member to CSV
 */
export const exportStaffPayrollHistoryToCSV = (staffMember, historyRecords = []) => {
  if (!staffMember || !Array.isArray(historyRecords) || historyRecords.length === 0) {
    return false;
  }

  const headers = [
    'Payroll Period',
    'Staff ID',
    'Employee Name',
    'Role',
    'Department',
    'Working Days',
    'Present Days',
    'Absent Days',
    'Half Days',
    'Leave Days',
    'Paid Days',
    'Basic Salary (PKR)',
    'Total Allowances (PKR)',
    'Gross Salary (PKR)',
    'Attendance Deduction (PKR)',
    'Other Deductions (PKR)',
    'Total Deductions (PKR)',
    'Net Salary (PKR)',
    'Status',
    'Processed At',
    'Processed By'
  ];

  const rows = historyRecords.map(r => [
    escapeCSVCell(formatPeriod(r.period || r.month)),
    escapeCSVCell(r.staffIdCode || r.staffId || staffMember.staffId || staffMember.id),
    escapeCSVCell(staffMember.name || r.staffName),
    escapeCSVCell(staffMember.role || r.staffRole || 'Staff'),
    escapeCSVCell(staffMember.department || r.staffDepartment || 'N/A'),
    escapeCSVCell(r.totalWorkingDays ?? 26),
    escapeCSVCell(r.presentDays ?? 0),
    escapeCSVCell(r.absentDays ?? 0),
    escapeCSVCell(r.halfDays ?? 0),
    escapeCSVCell(r.leaveDays ?? 0),
    escapeCSVCell(r.paidEquivalentDays ?? 0),
    escapeCSVCell(Number(r.basicSalary || 0)),
    escapeCSVCell(Number(r.totalAllowances || 0)),
    escapeCSVCell(Number(r.grossSalary || 0)),
    escapeCSVCell(Number(r.attendanceDeduction || 0)),
    escapeCSVCell(Number(r.otherDeductions || 0)),
    escapeCSVCell(Number(r.totalDeductions || 0)),
    escapeCSVCell(Number(r.netSalary || 0)),
    escapeCSVCell(r.status || 'Processed'),
    escapeCSVCell(r.processedAt ? new Date(r.processedAt).toLocaleString() : 'N/A'),
    escapeCSVCell(r.createdBy || 'Admin')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const empIdSlug = (staffMember.staffId || staffMember.id || 'Staff').replace(/[^a-zA-Z0-9]/g, '_');
  const nameSlug = (staffMember.name || '').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Payroll_History_${empIdSlug}_${nameSlug}.csv`;

  downloadCSV(filename, csvContent);
  return true;
};

/**
 * Exports a single payslip document payload to CSV format
 */
export const exportPayslipToCSV = (payslipData) => {
  if (!payslipData) return false;

  const periodStr = formatPeriod(payslipData.period || payslipData.month);
  const empId = payslipData.staffIdCode || payslipData.staffId || 'EMP';

  const rows = [
    ['Field', 'Details'],
    ['Document Type', 'Official Employee Payslip'],
    ['Payroll Period', periodStr],
    ['Status', payslipData.status || 'Processed'],
    ['Employee ID', empId],
    ['Employee Name', payslipData.staffName || 'N/A'],
    ['Designation / Role', payslipData.staffRole || 'Staff'],
    ['Department', payslipData.staffDepartment || 'N/A'],
    ['Working Days', payslipData.totalWorkingDays ?? 26],
    ['Present Days', payslipData.presentDays ?? 0],
    ['Absent Days', payslipData.absentDays ?? 0],
    ['Half Days', payslipData.halfDays ?? 0],
    ['Leave Days', payslipData.leaveDays ?? 0],
    ['Paid Equivalent Days', payslipData.paidEquivalentDays ?? 0],
    ['Basic Salary (PKR)', Number(payslipData.basicSalary || 0)],
    ['Medical Allowance (PKR)', Number(payslipData.medicalAllowance || 0)],
    ['Transport Allowance (PKR)', Number(payslipData.transportAllowance || 0)],
    ['Total Allowances (PKR)', Number(payslipData.totalAllowances || 0)],
    ['Gross Salary (PKR)', Number(payslipData.grossSalary || 0)],
    ['Attendance Deduction (PKR)', Number(payslipData.attendanceDeduction || 0)],
    ['Other Deductions (PKR)', Number(payslipData.otherDeductions || 0)],
    ['Total Deductions (PKR)', Number(payslipData.totalDeductions || 0)],
    ['Net Payable Salary (PKR)', Number(payslipData.netSalary || 0)],
    ['Processed At', payslipData.processedAt ? new Date(payslipData.processedAt).toLocaleString() : 'N/A'],
    ['Processed By', payslipData.createdBy || 'Admin']
  ];

  const csvContent = rows.map(r => [escapeCSVCell(r[0]), escapeCSVCell(r[1])].join(',')).join('\n');
  const filename = `Payslip_${empId.replace(/[^a-zA-Z0-9]/g, '_')}_${(payslipData.period || payslipData.month || '').replace(/[^a-zA-Z0-9]/g, '_')}.csv`;

  downloadCSV(filename, csvContent);
  return true;
};

/**
 * Finalizes and locks all processed payroll records for a given month and school.
 * Performs pre-finalization validation and records an audit log entry atomically in Firestore via batch write.
 * 
 * @param {string} period - YYYY-MM period string (e.g. "2026-09")
 * @param {string} schoolId - School ID for multi-tenancy
 * @param {Object} userData - User authentication profile object
 * @param {string} [campusId] - Optional campus ID
 * @returns {Promise<{success: boolean, finalizedCount?: number, error?: string}>}
 */
export const finalizePayrollMonth = async (period, schoolId, userData, campusId = null) => {
  if (!period || !schoolId || !userData) {
    return { success: false, error: 'Missing period, schoolId, or user authentication details.' };
  }

  if (!isAuthorizedPayrollAdmin(userData)) {
    return { success: false, error: 'You do not have administrative permission to finalize payroll.' };
  }

  try {
    const records = await getRecords('payroll', schoolId);
    const periodRecords = records.filter(p => (p.period === period || p.month === period));

    if (periodRecords.length === 0) {
      return {
        success: false,
        error: `No processed payroll records found for ${formatPeriod(period)}. Please process staff payroll first.`
      };
    }

    const allLocked = periodRecords.every(p => p.status === 'Locked' || p.status === 'Finalized');
    if (allLocked) {
      return {
        success: false,
        error: `Payroll for ${formatPeriod(period)} is already finalized and locked.`
      };
    }

    // Pre-finalization Validation (Phase 6)
    const invalidRecord = periodRecords.find(p => {
      if (!p.staffId || (!p.period && !p.month)) return true;
      const net = Number(p.netSalary ?? 0);
      const gross = Number(p.grossSalary ?? 0);
      const deductions = Number(p.totalDeductions ?? 0);
      if (isNaN(net) || net < 0 || isNaN(gross) || gross < 0 || deductions > gross) return true;
      return false;
    });

    if (invalidRecord) {
      return {
        success: false,
        error: `Validation failed: Record for "${invalidRecord.staffName || invalidRecord.staffId}" contains incomplete or invalid salary data.`
      };
    }

    const recordsToLock = periodRecords.filter(p => p.status === 'Processed' || p.status === 'processed');
    if (recordsToLock.length === 0) {
      return {
        success: false,
        error: `No 'Processed' payroll records available to lock for ${formatPeriod(period)}.`
      };
    }

    const now = new Date().toISOString();
    const batch = writeBatch(db);

    // 1. Lock all processed records for this period & school
    recordsToLock.forEach(p => {
      const docRef = doc(db, 'payroll', p.id);
      batch.update(docRef, {
        status: 'Locked',
        finalizedAt: now,
        finalizedBy: userData.email || userData.uid || 'Admin',
        updatedAt: serverTimestamp()
      });
    });

    // 2. Add Audit Log Entry (Phase 8)
    const auditRef = doc(collection(db, 'audit_logs'));
    batch.set(auditRef, {
      action: 'PAYROLL_FINALIZED',
      period,
      month: period,
      periodLabel: formatPeriod(period),
      schoolId,
      campusId: campusId || userData?.campusId || null,
      performedBy: userData?.uid || 'admin',
      performedByName: userData?.name || userData?.email || 'School Admin',
      performedByEmail: userData?.email || 'Admin',
      timestamp: now,
      createdAt: serverTimestamp(),
      recordsCount: recordsToLock.length,
      details: `Finalized payroll month ${formatPeriod(period)} containing ${recordsToLock.length} staff record(s).`
    });

    await batch.commit();

    return {
      success: true,
      finalizedCount: recordsToLock.length
    };
  } catch (error) {
    console.error('Error finalizing payroll month:', error);
    return {
      success: false,
      error: error?.message || 'Database write error while finalizing payroll month.'
    };
  }
};

/**
 * Fetches recent audit trail entries for a school filtered by action or general scope
 */
export const fetchPayrollAuditLogs = async (schoolId) => {
  if (!schoolId) return [];
  try {
    const logs = await getRecords('audit_logs', schoolId);
    return logs
      .filter(l => l.action === 'PAYROLL_FINALIZED' || l.action?.startsWith('PAYROLL_'))
      .sort((a, b) => {
        const tA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const tB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return tB - tA;
      });
  } catch (err) {
    console.error('Error fetching payroll audit logs:', err);
    return [];
  }
};

