import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  CreditCard,
  ShieldCheck,
  Hash,
  BookOpen,
  Clock,
  CheckCircle,
  GraduationCap,
  ClipboardCheck,
  CalendarDays,
  FileText,
  Award,
  History,
  Users,
  ExternalLink,
  Building2,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Calculator,
  RefreshCw,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Lock
} from 'lucide-react';

import GlassCard from '../../components/common/GlassCard';
import PayslipModal from '../../components/common/PayslipModal';
import { getSingleRecord, updateRecord, addRecord, getRecords } from '../../services/db';
import { uploadDocument, markForDeletion } from '../../services/cloudinary';
import { useAuth } from '../../context/AuthContext';
import { calculateMonthlyPayroll, validatePayrollEligibility, formatPeriod, summarizeStaffAttendance, exportStaffPayrollHistoryToCSV } from '../../utils/payrollUtils';

const StaffProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingEmployment, setEditingEmployment] = useState(false);

  const [editingStatus, setEditingStatus] = useState(false);
  const [statusForm, setStatusForm] = useState('Active');
  const [savingStatus, setSavingStatus] = useState(false);

  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    basicSalary: '',
    medicalAllowance: '',
    transportAllowance: '',
    otherDeductions: ''
  });
  const [savingSalary, setSavingSalary] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [processedSnapshot, setProcessedSnapshot] = useState(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [calculatedDraft, setCalculatedDraft] = useState(null);
  const [processingPayroll, setProcessingPayroll] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [allStaffPayrollRecords, setAllStaffPayrollRecords] = useState([]);
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState('ALL');
  const [selectedPayslipRecord, setSelectedPayslipRecord] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  const [employmentForm, setEmploymentForm] = useState({
    role: '',
    department: '',
    staffType: '',
    employmentType: '',
    joinDate: '',
    campus: '',
    reportingManager: '',
    assignedClass: '',
    assignedSection: ''
  });

  const [savingEmployment, setSavingEmployment] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(false);

  const [assignmentForm, setAssignmentForm] = useState({
    assignedClass: '',
    assignedSection: '',
    isClassTeacher: false,
    classTeacherOf: '',
    subjects: []
  });

  const [subjectInput, setSubjectInput] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(false);

  const [personalForm, setPersonalForm] = useState({
    name: '',
    cnic: '',
    phone: '',
    email: '',
    address: ''
  });

  const [savingPersonal, setSavingPersonal] = useState(false);

  const [editingQualification, setEditingQualification] = useState(false);
  const [qualificationForm, setQualificationForm] = useState({
    highestQualification: '',
    specialization: '',
    totalExperience: '',
    certifications: [],
    skills: []
  });

  const [qualificationInput, setQualificationInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [savingQualification, setSavingQualification] = useState(false);

  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentType, setDocumentType] = useState('Other');
  const [documentTitle, setDocumentTitle] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);

      try {
        const data = await getSingleRecord('staff', id);

        if (data && data.schoolId === userData?.schoolId) {
          setStaff(data);
        } else {
          alert('Staff member not found!');
          navigate('/school-admin/staff');
        }
      } catch (error) {
        console.error('Error fetching staff profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userData?.schoolId && id) {
      fetchStaff();
    }
  }, [id, userData, navigate]);

  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [manualAttendance, setManualAttendance] = useState({
    workingDays: 26,
    presentDays: 26,
    absentDays: 0,
    halfDays: 0
  });
  const [overrideAttendance, setOverrideAttendance] = useState(false);

  const isOverrideActive = useMemo(() => {
    if (overrideAttendance) return true;
    if (!attendanceSummary?.hasData) return false;
    return (
      Number(manualAttendance.workingDays) !== Number(attendanceSummary.totalWorkingDays) ||
      Number(manualAttendance.presentDays) !== Number(attendanceSummary.presentDays) ||
      Number(manualAttendance.absentDays) !== Number(attendanceSummary.absentDays) ||
      Number(manualAttendance.halfDays) !== Number(attendanceSummary.halfDays)
    );
  }, [manualAttendance, attendanceSummary, overrideAttendance]);

  const filteredHistoryRecords = useMemo(() => {
    if (!Array.isArray(allStaffPayrollRecords)) return [];
    if (historyPeriodFilter === 'ALL') return allStaffPayrollRecords;
    return allStaffPayrollRecords.filter(r => (r.period === historyPeriodFilter || r.month === historyPeriodFilter));
  }, [allStaffPayrollRecords, historyPeriodFilter]);

  const historyMetrics = useMemo(() => {
    let totalMonths = allStaffPayrollRecords.length;
    let lifetimeGross = 0;
    let lifetimeDeductions = 0;
    let lifetimeNet = 0;

    allStaffPayrollRecords.forEach(r => {
      lifetimeGross += Number(r.grossSalary || 0);
      lifetimeDeductions += Number(r.totalDeductions || 0);
      lifetimeNet += Number(r.netSalary || 0);
    });

    return { totalMonths, lifetimeGross, lifetimeDeductions, lifetimeNet };
  }, [allStaffPayrollRecords]);

  const fetchPeriodPayrollAndAttendance = async () => {
    if ((!staff?.id && !id) || !userData?.schoolId) return;
    setLoadingSnapshot(true);
    setHistoryError(null);
    try {
      const targetId = staff?.id || id;
      const empId = staff?.employeeId || staff?.staffId;

      const [resPayroll, resAtt] = await Promise.all([
        getRecords('payroll', userData.schoolId).catch(() => []),
        getRecords('attendance', userData.schoolId).catch(() => [])
      ]);

      if (Array.isArray(resPayroll)) {
        const staffRecords = resPayroll
          .filter((p) => {
            const isMatchId = p.staffId === targetId || (empId && p.staffId === empId) || (p.staffIdCode && staff?.staffId && p.staffIdCode === staff.staffId);
            const isMatchSchool = p.schoolId === userData.schoolId;
            return isMatchId && isMatchSchool;
          })
          .sort((a, b) => {
            const pA = String(a.period || a.month || '');
            const pB = String(b.period || b.month || '');
            return pB.localeCompare(pA);
          });

        setAllStaffPayrollRecords(staffRecords);

        const found = staffRecords.find(
          (p) => (p.period === selectedPeriod || p.month === selectedPeriod)
        );
        setProcessedSnapshot(found || null);
        setCalculatedDraft(null);
      }

      if (Array.isArray(resAtt)) {
        setAttendanceLogs(resAtt);
        const summary = summarizeStaffAttendance(resAtt, targetId, selectedPeriod, staff?.payrollSetup?.workingDays || 26);
        setAttendanceSummary(summary);
        if (summary.hasData) {
          setManualAttendance({
            workingDays: summary.totalWorkingDays,
            presentDays: summary.presentDays,
            absentDays: summary.absentDays,
            halfDays: summary.halfDays
          });
        } else {
          setManualAttendance({
            workingDays: Number(staff?.payrollSetup?.workingDays || 26),
            presentDays: 26,
            absentDays: 0,
            halfDays: 0
          });
        }
      }
    } catch (err) {
      console.error('Error fetching period payroll/attendance snapshot:', err);
      setHistoryError('Unable to load payroll history.');
    } finally {
      setLoadingSnapshot(false);
    }
  };

  useEffect(() => {
    fetchPeriodPayrollAndAttendance();
  }, [staff?.id, id, selectedPeriod, userData?.schoolId, staff?.payrollSetup?.workingDays]);

  /* -------------------------------------------------------
     SAFE DATE FORMATTER
     Handles:
     - Firestore Timestamp
     - JS Date
     - ISO/string dates
     - null/undefined
  ------------------------------------------------------- */
  const formatDate = (value) => {
    if (!value) return 'N/A';

    try {
      let date;

      if (value?.toDate && typeof value.toDate === 'function') {
        date = value.toDate();
      } else if (value instanceof Date) {
        date = value;
      } else if (
        typeof value === 'object' &&
        typeof value.seconds === 'number'
      ) {
        date = new Date(value.seconds * 1000);
      } else {
        date = new Date(value);
      }

      if (Number.isNaN(date.getTime())) {
        return 'N/A';
      }

      return date.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const getServiceDuration = (value) => {
    if (!value) return 'N/A';

    try {
      let start;

      if (value?.toDate && typeof value.toDate === 'function') {
        start = value.toDate();
      } else if (
        typeof value === 'object' &&
        typeof value.seconds === 'number'
      ) {
        start = new Date(value.seconds * 1000);
      } else {
        start = new Date(value);
      }

      if (Number.isNaN(start.getTime())) return 'N/A';

      const now = new Date();

      let years = now.getFullYear() - start.getFullYear();
      let months = now.getMonth() - start.getMonth();

      if (months < 0) {
        years--;
        months += 12;
      }

      if (years < 1) {
        return `${Math.max(months, 0)} month${months === 1 ? '' : 's'}`;
      }

      return `${years} year${years === 1 ? '' : 's'} ${months} month${months === 1 ? '' : 's'}`;
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-dark-muted font-bold">
        Loading staff profile...
      </div>
    );
  }

  if (!staff) return null;

  const isTeacher =
    staff.department === 'Academic' ||
    (staff.role &&
      staff.role.toLowerCase().includes('teacher'));

  const staffType =
    staff.staffType ||
    staff.type ||
    (isTeacher ? 'Teaching' : 'Non-Teaching');

  const employmentType =
    staff.employmentType ||
    staff.employment ||
    'N/A';

  const payrollSetup = staff.payrollSetup || {};


  const basicSalary =
    payrollSetup.basicSalary ??
    staff.salary ??
    0;








  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!userData?.schoolId) {
      alert('School information is not available.');
      event.target.value = '';
      return;
    }

    setUploadingDocument(true);

    try {
      const result = await uploadDocument(
        file,
        userData.schoolId,
        'documents'
      );

      if (!result?.success || !result?.url) {
        throw new Error(
          result?.error || 'Document upload failed.'
        );
      }

      const title =
        documentTitle.trim() ||
        file.name.replace(/\.[^/.]+$/, '');

      const newDocument = {
        id: `DOC-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        name: title,
        type: documentType || 'Other',
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        url: result.url,
        publicId: result.publicId || '',
        uploadedAt: new Date().toISOString()
      };

      const existingDocuments = Array.isArray(staff.documents)
        ? staff.documents
        : [];

      const updatedDocuments = [
        ...existingDocuments,
        newDocument
      ];

      await updateRecord('staff', staff.id || id, {
        documents: updatedDocuments
      });

      setStaff((prev) => ({
        ...prev,
        documents: updatedDocuments
      }));

      setDocumentTitle('');
      setDocumentType('Other');

      alert('Document uploaded successfully.');
    } catch (error) {
      console.error('Error uploading staff document:', error);

      alert(
        error?.message ||
        'Unable to upload document. Please try again.'
      );
    } finally {
      setUploadingDocument(false);
      event.target.value = '';
    }
  };

  const handleDocumentDelete = async (document) => {
    if (!document?.id) return;

    const confirmed = window.confirm(
      `Delete "${document.name || document.fileName || 'this document'}"?`
    );

    if (!confirmed) return;

    try {
      const existingDocuments = Array.isArray(staff.documents)
        ? staff.documents
        : [];

      const updatedDocuments = existingDocuments.filter(
        (item) => item.id !== document.id
      );

      await updateRecord('staff', staff.id || id, {
        documents: updatedDocuments
      });

      setStaff((prev) => ({
        ...prev,
        documents: updatedDocuments
      }));

      if (document.publicId) {
        await markForDeletion(document.publicId);
      }

      alert('Document deleted successfully.');
    } catch (error) {
      console.error('Error deleting staff document:', error);

      alert(
        error?.message ||
        'Unable to delete document. Please try again.'
      );
    }
  };
  const getStatusBadgeClass = (status) => {
    const canonical = status || 'Active';
    switch (canonical) {
      case 'Active':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'Inactive':
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
      case 'On Leave':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'Suspended':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'Former Staff':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const startStatusEdit = () => {
    setStatusForm(staff?.status || 'Active');
    setEditingStatus(true);
  };

  const cancelStatusEdit = () => {
    setEditingStatus(false);
    setStatusForm(staff?.status || 'Active');
  };

  const handleStatusSave = async () => {
    const VALID_STATUSES = ['Active', 'Inactive', 'On Leave', 'Suspended', 'Former Staff'];
    const selectedStatus = (statusForm || 'Active').trim();

    if (!VALID_STATUSES.includes(selectedStatus)) {
      alert('Please select a valid staff status.');
      return;
    }

    setSavingStatus(true);

    try {
      const result = await updateRecord('staff', staff.id || id, {
        status: selectedStatus
      });

      if (result && result.success) {
        setStaff((prev) => ({
          ...prev,
          status: selectedStatus
        }));
        setEditingStatus(false);
        alert(`Staff status updated to "${selectedStatus}" successfully.`);
      } else {
        throw new Error(result?.error?.message || 'Failed to update staff status.');
      }
    } catch (error) {
      console.error('Error updating staff status:', error);
      alert(error?.message || 'Unable to update staff status. Please try again.');
    } finally {
      setSavingStatus(false);
    }
  };

  const startSalaryEdit = () => {
    const ps = staff?.payrollSetup || {};
    setSalaryForm({
      basicSalary: ps.basicSalary ?? staff?.salary ?? '',
      medicalAllowance: ps.medicalAllowance ?? 0,
      transportAllowance: ps.transportAllowance ?? 0,
      otherDeductions: ps.otherDeductions ?? 0
    });
    setEditingSalary(true);
  };

  const cancelSalaryEdit = () => {
    setEditingSalary(false);
  };

  const handleSalarySave = async () => {
    const basic = Number(salaryForm.basicSalary);
    const medical = Number(salaryForm.medicalAllowance || 0);
    const transport = Number(salaryForm.transportAllowance || 0);
    const deductions = Number(salaryForm.otherDeductions || 0);

    if (salaryForm.basicSalary === '' || salaryForm.basicSalary === null || isNaN(basic) || basic < 0) {
      alert('Please enter a valid non-negative Basic Salary.');
      return;
    }
    if (isNaN(medical) || medical < 0 || isNaN(transport) || transport < 0 || isNaN(deductions) || deductions < 0) {
      alert('Allowance and deduction values must be non-negative numbers.');
      return;
    }

    setSavingSalary(true);

    try {
      const updatedPayrollSetup = {
        ...(staff.payrollSetup || {}),
        basicSalary: basic,
        medicalAllowance: medical,
        transportAllowance: transport,
        otherDeductions: deductions,
        updatedAt: new Date().toISOString()
      };

      const result = await updateRecord('staff', staff.id || id, {
        salary: basic,
        payrollSetup: updatedPayrollSetup
      });

      if (result && result.success) {
        setStaff((prev) => ({
          ...prev,
          salary: basic,
          payrollSetup: updatedPayrollSetup
        }));
        setEditingSalary(false);
        alert('Salary structure updated successfully.');
      } else {
        throw new Error(result?.error?.message || 'Failed to update salary structure.');
      }
    } catch (error) {
      console.error('Error saving salary structure:', error);
      alert(error?.message || 'Unable to save salary structure. Please try again.');
    } finally {
      setSavingSalary(false);
    }
  };


  const handleResetAttendance = () => {
    if (attendanceSummary && attendanceSummary.hasData) {
      setManualAttendance({
        workingDays: attendanceSummary.totalWorkingDays,
        presentDays: attendanceSummary.presentDays,
        absentDays: attendanceSummary.absentDays,
        halfDays: attendanceSummary.halfDays
      });
      setOverrideAttendance(false);
    } else {
      setManualAttendance({
        workingDays: Number(staff?.payrollSetup?.workingDays || 26),
        presentDays: 26,
        absentDays: 0,
        halfDays: 0
      });
      setOverrideAttendance(false);
    }
  };

  const handleRefreshAttendance = async () => {
    if (!userData?.schoolId || (!staff?.id && !id)) return;
    try {
      const targetId = staff?.id || id;
      const resAtt = await getRecords('attendance', userData.schoolId);
      if (Array.isArray(resAtt)) {
        setAttendanceLogs(resAtt);
        const summary = summarizeStaffAttendance(resAtt, targetId, selectedPeriod, staff?.payrollSetup?.workingDays || 26);
        setAttendanceSummary(summary);
        if (summary.hasData) {
          setManualAttendance({
            workingDays: summary.totalWorkingDays,
            presentDays: summary.presentDays,
            absentDays: summary.absentDays,
            halfDays: summary.halfDays
          });
        }
        setOverrideAttendance(false);
        alert('Attendance records refreshed from database.');
      }
    } catch (err) {
      console.error('Error refreshing attendance:', err);
    }
  };

  const getActiveAttendanceSummary = () => {
    if (isOverrideActive || !attendanceSummary?.hasData) {
      const wDays = Math.max(1, Number(manualAttendance.workingDays || 26));
      const pDays = Math.max(0, Number(manualAttendance.presentDays || 0));
      const aDays = Math.max(0, Number(manualAttendance.absentDays || 0));
      const hDays = Math.max(0, Number(manualAttendance.halfDays || 0));
      const lDays = Math.max(0, Number(attendanceSummary?.leaveDays || 0));
      return {
        hasData: true,
        totalWorkingDays: wDays,
        presentDays: pDays,
        absentDays: aDays,
        halfDays: hDays,
        leaveDays: lDays,
        paidEquivalentDays: pDays + (hDays * 0.5),
        attendanceDeductionDays: aDays + (hDays * 0.5)
      };
    }
    return attendanceSummary;
  };

  const handleCalculatePayroll = () => {
    const summary = getActiveAttendanceSummary();
    const calc = calculateMonthlyPayroll(staff?.payrollSetup, staff?.salary, summary);
    const check = validatePayrollEligibility(staff, calc, summary);

    if (!check.valid) {
      alert(check.error);
      return;
    }

    setCalculatedDraft({
      period: selectedPeriod,
      ...calc,
      status: 'Draft'
    });
  };

  const handleProcessPayroll = async () => {
    const summary = getActiveAttendanceSummary();
    const calc = calculatedDraft || calculateMonthlyPayroll(staff?.payrollSetup, staff?.salary, summary);
    const check = validatePayrollEligibility(staff, calc, summary);

    if (!check.valid) {
      alert(check.error);
      return;
    }

    if (processedSnapshot && processedSnapshot.status === 'Processed') {
      alert(`Payroll for ${formatPeriod(selectedPeriod)} has already been processed for this staff member.`);
      return;
    }

    setProcessingPayroll(true);

    try {
      // Pre-write database duplicate check
      const existingRecords = await getRecords('payroll', userData?.schoolId || 'default-school');
      if (Array.isArray(existingRecords)) {
        const targetId = staff.id || id;
        const alreadyExists = existingRecords.find(
          (p) => p.staffId === targetId && (p.period === selectedPeriod || p.month === selectedPeriod) && p.status === 'Processed'
        );
        if (alreadyExists) {
          setProcessedSnapshot(alreadyExists);
          setCalculatedDraft(null);
          alert(`Payroll for ${formatPeriod(selectedPeriod)} has already been processed for this staff member.`);
          setProcessingPayroll(false);
          return;
        }
      }

      const snapshot = {
        staffId: staff.id || id,
        staffName: staff.name,
        staffRole: staff.role || 'Staff',
        staffDepartment: staff.department || 'N/A',
        staffIdCode: staff.staffId || `EMP-${(staff.id || id).slice(0, 4)}`,
        schoolId: userData?.schoolId || 'default-school',
        period: selectedPeriod,
        month: selectedPeriod,

        // Attendance Snapshot
        totalWorkingDays: calc.totalWorkingDays,
        presentDays: calc.presentDays,
        absentDays: calc.absentDays,
        halfDays: calc.halfDays,
        leaveDays: calc.leaveDays ?? 0,
        paidEquivalentDays: calc.paidEquivalentDays,
        attendanceDeductionDays: calc.attendanceDeductionDays,
        attendanceDeduction: calc.attendanceDeduction,
        attendanceSnapshot: {
          totalWorkingDays: calc.totalWorkingDays,
          presentDays: calc.presentDays,
          absentDays: calc.absentDays,
          halfDays: calc.halfDays,
          leaveDays: calc.leaveDays ?? 0,
          paidEquivalentDays: calc.paidEquivalentDays,
          attendanceDeductionDays: calc.attendanceDeductionDays,
          attendanceDeduction: calc.attendanceDeduction,
          source: isOverrideActive ? 'manual' : 'attendance'
        },

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
        processedAt: new Date().toISOString(),
        createdBy: userData?.email || userData?.uid || 'Admin'
      };

      const result = await addRecord('payroll', snapshot, userData?.schoolId || 'default-school');

      if (result && result.success) {
        setProcessedSnapshot({ ...snapshot, id: result.id });
        setCalculatedDraft(null);
        await fetchPeriodPayrollAndAttendance();
        alert(`Monthly payroll for ${formatPeriod(selectedPeriod)} processed and saved successfully.`);
      } else {
        throw new Error(result?.error?.message || 'Failed to process monthly payroll.');
      }
    } catch (error) {
      console.error('Error processing monthly payroll:', error);
      alert(error?.message || 'Unable to process monthly payroll. Please try again.');
    } finally {
      setProcessingPayroll(false);
    }
  };

  const startQualificationEdit = () => {
    setQualificationForm({
      highestQualification: staff.highestQualification || '',
      specialization: staff.specialization || '',
      totalExperience: staff.totalExperience || '',
      certifications: Array.isArray(staff.certifications)
        ? [...staff.certifications]
        : [],
      skills: Array.isArray(staff.skills)
        ? [...staff.skills]
        : []
    });

    setQualificationInput('');
    setSkillInput('');
    setEditingQualification(true);
  };

  const cancelQualificationEdit = () => {
    setEditingQualification(false);
    setQualificationInput('');
    setSkillInput('');
  };

  const addCertification = () => {
    const value = qualificationInput.trim();

    if (!value) return;

    if (
      !qualificationForm.certifications.includes(value)
    ) {
      setQualificationForm((prev) => ({
        ...prev,
        certifications: [
          ...prev.certifications,
          value
        ]
      }));
    }

    setQualificationInput('');
  };

  const removeCertification = (index) => {
    setQualificationForm((prev) => ({
      ...prev,
      certifications: prev.certifications.filter(
        (_, i) => i !== index
      )
    }));
  };

  const addSkill = () => {
    const value = skillInput.trim();

    if (!value) return;

    if (!qualificationForm.skills.includes(value)) {
      setQualificationForm((prev) => ({
        ...prev,
        skills: [
          ...prev.skills,
          value
        ]
      }));
    }

    setSkillInput('');
  };

  const removeSkill = (index) => {
    setQualificationForm((prev) => ({
      ...prev,
      skills: prev.skills.filter(
        (_, i) => i !== index
      )
    }));
  };

  const handleQualificationSave = async () => {
    setSavingQualification(true);

    try {
      const updatedQualification = {
        highestQualification:
          qualificationForm.highestQualification.trim(),

        specialization:
          qualificationForm.specialization.trim(),

        totalExperience:
          qualificationForm.totalExperience,

        certifications:
          qualificationForm.certifications,

        skills:
          qualificationForm.skills
      };

      await updateRecord(
        'staff',
        staff.id || id,
        updatedQualification
      );

      setStaff((prev) => ({
        ...prev,
        ...updatedQualification
      }));

      setEditingQualification(false);

      alert('Qualification information updated successfully.');
    } catch (error) {
      console.error(
        'Error updating qualification:',
        error
      );

      alert(
        error?.message ||
        'Unable to update qualification information.'
      );
    } finally {
      setSavingQualification(false);
    }
  };

  const startEmploymentEdit = () => {
    setEmploymentForm({
      role: staff.role || '',
      department: staff.department || '',
      staffType: staff.staffType || staff.type || '',
      employmentType: staff.employmentType || staff.employment || '',
      joinDate: staff.joinDate
        ? (
          typeof staff.joinDate === 'string'
            ? staff.joinDate.slice(0, 10)
            : staff.joinDate?.toDate
              ? staff.joinDate.toDate().toISOString().split('T')[0]
              : typeof staff.joinDate === 'object' &&
                typeof staff.joinDate.seconds === 'number'
                ? new Date(
                  staff.joinDate.seconds * 1000
                ).toISOString().split('T')[0]
                : ''
        )
        : '',
      campus: staff.campus || '',
      reportingManager: staff.reportingManager || '',
      assignedClass: staff.assignedClass || '',
      assignedSection: staff.assignedSection || ''
    });

    setEditingEmployment(true);
  };

  const cancelEmploymentEdit = () => {
    setEditingEmployment(false);
  };

  const handleEmploymentSave = async () => {
    setSavingEmployment(true);

    try {
      const updatedEmployment = {
        role: employmentForm.role.trim(),
        department: employmentForm.department.trim(),
        staffType: employmentForm.staffType,
        employmentType: employmentForm.employmentType,
        joinDate: employmentForm.joinDate,
        campus: employmentForm.campus.trim(),
        reportingManager: employmentForm.reportingManager.trim(),
        assignedClass: employmentForm.assignedClass.trim(),
        assignedSection: employmentForm.assignedSection.trim()
      };

      await updateRecord(
        'staff',
        staff.id || id,
        updatedEmployment
      );

      setStaff((prev) => ({
        ...prev,
        ...updatedEmployment
      }));

      setEditingEmployment(false);

      alert('Employment information updated successfully.');
    } catch (error) {
      console.error(
        'Error updating employment:',
        error
      );

      alert(
        error?.message ||
        'Unable to update employment information.'
      );
    } finally {
      setSavingEmployment(false);
    }
  };
  const startAssignmentEdit = () => {
    setAssignmentForm({
      assignedClass: staff.assignedClass || '',
      assignedSection: staff.assignedSection || '',
      isClassTeacher: Boolean(staff.isClassTeacher),
      classTeacherOf: staff.classTeacherOf || '',
      subjects: Array.isArray(staff.subjects)
        ? [...staff.subjects]
        : []
    });

    setSubjectInput('');
    setEditingAssignment(true);
  };

  const cancelAssignmentEdit = () => {
    setEditingAssignment(false);
    setSubjectInput('');
  };

  const addAssignmentSubject = () => {
    const value = subjectInput.trim();

    if (!value) return;

    if (!assignmentForm.subjects.includes(value)) {
      setAssignmentForm((prev) => ({
        ...prev,
        subjects: [...prev.subjects, value]
      }));
    }

    setSubjectInput('');
  };

  const removeAssignmentSubject = (index) => {
    setAssignmentForm((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }));
  };

  const handleAssignmentSave = async () => {
    setSavingAssignment(true);

    try {
      const updatedAssignment = {
        assignedClass: assignmentForm.assignedClass.trim(),
        assignedSection: assignmentForm.assignedSection.trim(),
        isClassTeacher: Boolean(assignmentForm.isClassTeacher),
        classTeacherOf: assignmentForm.isClassTeacher
          ? assignmentForm.classTeacherOf.trim()
          : '',
        subjects: assignmentForm.subjects
      };

      await updateRecord(
        'staff',
        staff.id || id,
        updatedAssignment
      );

      setStaff((prev) => ({
        ...prev,
        ...updatedAssignment
      }));

      setEditingAssignment(false);

      alert('Assignment information updated successfully.');
    } catch (error) {
      console.error(
        'Error updating assignment:',
        error
      );

      alert(
        error?.message ||
        'Unable to update assignment information.'
      );
    } finally {
      setSavingAssignment(false);
    }
  };
  const startPersonalEdit = () => {
    setPersonalForm({
      name: staff.name || '',
      cnic: staff.cnic || '',
      phone: staff.phone || '',
      email: staff.email || '',
      address: staff.address || ''
    });

    setEditingPersonal(true);
  };

  const cancelPersonalEdit = () => {
    setEditingPersonal(false);
  };

  const handlePersonalSave = async () => {
    setSavingPersonal(true);

    try {
      const updatedPersonal = {
        name: personalForm.name.trim(),
        cnic: personalForm.cnic.trim(),
        phone: personalForm.phone.trim(),
        email: personalForm.email.trim(),
        address: personalForm.address.trim()
      };

      await updateRecord(
        'staff',
        staff.id || id,
        updatedPersonal
      );

      setStaff((prev) => ({
        ...prev,
        ...updatedPersonal
      }));

      setEditingPersonal(false);

      alert('Personal information updated successfully.');
    } catch (error) {
      console.error(
        'Error updating personal information:',
        error
      );

      alert(
        error?.message ||
        'Unable to update personal information.'
      );
    } finally {
      setSavingPersonal(false);
    }
  };
  const totalAllowances =
    Number(payrollSetup.medicalAllowance || 0) +
    Number(payrollSetup.transportAllowance || 0);

  const totalDeductions =
    Number(payrollSetup.otherDeductions || 0);

  const grossSalary = Number(basicSalary || 0) + totalAllowances;
  const netSalary = grossSalary - totalDeductions;

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: User
    },
    {
      id: 'employment',
      label: 'Employment',
      icon: Briefcase
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: ClipboardCheck
    },
    {
      id: 'leave',
      label: 'Leave',
      icon: CalendarDays
    },
    {
      id: 'assignment',
      label: 'Assignment',
      icon: Users
    },
    {
      id: 'payroll',
      label: 'Payroll',
      icon: CreditCard
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText
    },
    {
      id: 'qualification',
      label: 'Qualification',
      icon: GraduationCap
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: Award
    },
    {
      id: 'history',
      label: 'History',
      icon: History
    }
  ];

  const EmptyState = ({
    icon: Icon = AlertCircle,
    title,
    description,
    action,
    onAction
  }) => (
    <div className="text-center py-14 px-6">
      <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-4">
        <Icon size={30} className="text-primary-400" />
      </div>

      <h3 className="text-lg font-bold text-white mb-2">
        {title}
      </h3>

      <p className="text-dark-muted text-sm max-w-md mx-auto">
        {description}
      </p>

      {action && onAction && (
        <button
          onClick={onAction}
          className="mt-5 premium-button-primary text-sm"
        >
          {action}
        </button>
      )}
    </div>
  );

  const InfoItem = ({
    icon: Icon,
    label,
    value,
    mono = false
  }) => (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400 shrink-0">
        <Icon size={16} />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] uppercase font-bold text-dark-muted tracking-wider">
          {label}
        </p>

        <p
          className={`font-bold text-sm text-white mt-0.5 break-words ${mono ? 'font-mono' : ''
            }`}
        >
          {value || 'N/A'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* =====================================================
          PROFILE HEADER
      ====================================================== */}
      <div className="relative rounded-3xl overflow-hidden bg-dark-card border border-dark-border shadow-xl">

        <div className="h-32 bg-gradient-to-r from-purple-900/40 via-primary-900/40 to-blue-900/40 w-full absolute top-0 left-0" />

        <div className="relative pt-12 px-6 pb-6 sm:px-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">

          {/* Avatar */}
          <div className="w-32 h-32 rounded-full border-4 border-dark-card bg-dark-hover flex items-center justify-center overflow-hidden shrink-0 shadow-lg relative z-10">
            {staff.photoUrl ? (
              <img
                src={staff.photoUrl}
                alt={staff.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User
                size={48}
                className="text-dark-muted"
              />
            )}
          </div>

          {/* Main Identity */}
          <div className="flex-1 pb-2">

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
              <h1 className="text-3xl font-black text-white">
                {staff.name}
              </h1>

              <span
                className={`px-3.5 py-1 rounded-full text-xs font-bold w-fit mx-auto sm:mx-0 ${getStatusBadgeClass(staff.status)}`}
              >
                {staff.status || 'Active'}
              </span>
            </div>

            <p className="text-primary-400 font-bold text-lg mb-1">
              {staff.role || 'Staff'}
              <span className="text-dark-muted font-normal text-sm">
                {' '}
                ({staff.department || 'N/A'})
              </span>
            </p>

            <p className="text-dark-muted text-sm font-mono flex items-center justify-center sm:justify-start gap-2">
              <Hash size={14} />
              ID: {staff.staffId || 'N/A'}
            </p>

            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
              <span className="px-3 py-1 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-bold">
                {staffType}
              </span>

              <span className="px-3 py-1 rounded-lg bg-white/5 border border-dark-border text-dark-muted text-xs font-bold">
                Joined {formatDate(staff.joinDate)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">

            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 rounded-xl bg-dark-hover hover:bg-dark-border text-white text-sm font-bold flex items-center justify-center gap-2 transition-all border border-dark-border"
            >
              <ArrowLeft size={16} />
              Back to Directory
            </button>

            <button
              onClick={() =>
                navigate(`/school-admin/staff/edit/${staff.id}`)
              }
              className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 transition-all"
            >
              <User size={16} />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          TABS
      ====================================================== */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-dark-card border border-dark-border rounded-xl scrollbar-thin">

        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab.id
                ? 'bg-primary-500 text-white shadow-md'
                : 'text-dark-muted hover:bg-dark-hover hover:text-white'
                }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =====================================================
          OVERVIEW
      ====================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <GlassCard className="p-5">
              <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest">
                Employment Status
              </p>

              <div className="mt-2">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(staff.status)}`}>
                  {staff.status || 'Active'}
                </span>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest">
                Staff Type
              </p>

              <p className="text-xl font-black text-white mt-2">
                {staffType}
              </p>
            </GlassCard>

            <GlassCard className="p-5">
              <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest">
                Department
              </p>

              <p className="text-xl font-black text-white mt-2">
                {staff.department || 'N/A'}
              </p>
            </GlassCard>

            <GlassCard className="p-5">
              <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest">
                Service Duration
              </p>

              <p className="text-xl font-black text-white mt-2">
                {getServiceDuration(staff.joinDate)}
              </p>
            </GlassCard>

          </div>

          {/* Staff Lifecycle & Status Management */}
          <GlassCard className="p-6 border-t-4 border-amber-500">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <ShieldCheck size={18} className="text-amber-400" />
                  Staff Lifecycle & Status
                </h3>
                <p className="text-xs text-dark-muted mt-1">
                  Manage staff administrative status (Active, Inactive, On Leave, Suspended, Former Staff)
                </p>
              </div>

              {!editingStatus ? (
                <button
                  type="button"
                  onClick={startStatusEdit}
                  className="premium-button-primary text-sm"
                >
                  Edit Status
                </button>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={cancelStatusEdit}
                    className="premium-button-secondary text-sm"
                    disabled={savingStatus}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStatusSave}
                    className="premium-button-primary text-sm flex items-center gap-2"
                    disabled={savingStatus}
                  >
                    {savingStatus ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {!editingStatus ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-2">
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold w-fit ${getStatusBadgeClass(staff.status)}`}>
                  {staff.status || 'Active'}
                </span>
                <p className="text-xs text-dark-muted">
                  {staff.status === 'Former Staff'
                    ? 'Staff member is no longer active. Historical records, assignments, and qualifications are preserved.'
                    : staff.status === 'On Leave'
                    ? 'Staff member is currently on temporary leave.'
                    : staff.status === 'Suspended'
                    ? 'Staff member is under administrative suspension.'
                    : staff.status === 'Inactive'
                    ? 'Staff member is currently inactive.'
                    : 'Staff member is actively employed.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Current Lifecycle Status
                  </label>
                  <select
                    value={statusForm}
                    onChange={(e) => setStatusForm(e.target.value)}
                    className="premium-input w-full md:w-80"
                    disabled={savingStatus}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Former Staff">Former Staff</option>
                  </select>
                </div>
              </div>
            )}
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Personal */}
            <GlassCard className="lg:col-span-2 p-6">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <User
                      size={18}
                      className="text-primary-500"
                    />
                    Personal Information
                  </h3>

                  {!editingPersonal && (
                    <p className="text-xs text-dark-muted mt-1">
                      Basic personal and contact information
                    </p>
                  )}
                </div>

                {!editingPersonal ? (
                  <button
                    type="button"
                    onClick={startPersonalEdit}
                    className="premium-button-primary text-sm"
                  >
                    Edit Personal Information
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-3">

                    <button
                      type="button"
                      onClick={cancelPersonalEdit}
                      className="premium-button-secondary text-sm"
                      disabled={savingPersonal}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handlePersonalSave}
                      className="premium-button-primary text-sm"
                      disabled={savingPersonal}
                    >
                      {savingPersonal ? 'Saving...' : 'Save Changes'}
                    </button>

                  </div>
                )}

              </div>

              {!editingPersonal ? (

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                  <InfoItem
                    icon={User}
                    label="Full Name"
                    value={staff.name}
                  />

                  <InfoItem
                    icon={ShieldCheck}
                    label="CNIC / ID"
                    value={staff.cnic}
                    mono
                  />

                  <InfoItem
                    icon={Phone}
                    label="Phone Number"
                    value={staff.phone}
                    mono
                  />

                  <InfoItem
                    icon={Mail}
                    label="Email Address"
                    value={staff.email}
                  />

                  <div className="sm:col-span-2">
                    <InfoItem
                      icon={MapPin}
                      label="Home Address"
                      value={staff.address}
                    />
                  </div>

                </div>

              ) : (

                <div className="space-y-5">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Full Name
                      </label>

                      <input
                        type="text"
                        value={personalForm.name}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({
                            ...prev,
                            name: e.target.value
                          }))
                        }
                        placeholder="Enter full name"
                        className="premium-input w-full"
                      />
                    </div>

                    {/* CNIC */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        CNIC / ID
                      </label>

                      <input
                        type="text"
                        value={personalForm.cnic}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({
                            ...prev,
                            cnic: e.target.value
                          }))
                        }
                        placeholder="Enter CNIC / ID"
                        className="premium-input w-full"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Phone Number
                      </label>

                      <input
                        type="text"
                        value={personalForm.phone}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({
                            ...prev,
                            phone: e.target.value
                          }))
                        }
                        placeholder="03XXXXXXXXX"
                        className="premium-input w-full"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Email Address
                      </label>

                      <input
                        type="email"
                        value={personalForm.email}
                        onChange={(e) =>
                          setPersonalForm((prev) => ({
                            ...prev,
                            email: e.target.value
                          }))
                        }
                        placeholder="Enter email address"
                        className="premium-input w-full"
                      />
                    </div>

                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Home Address
                    </label>

                    <textarea
                      rows={4}
                      value={personalForm.address}
                      onChange={(e) =>
                        setPersonalForm((prev) => ({
                          ...prev,
                          address: e.target.value
                        }))
                      }
                      placeholder="Enter home address"
                      className="premium-input w-full resize-none"
                    />
                  </div>

                </div>

              )}

            </GlassCard>

            {/* Employment */}
            <GlassCard className="p-6 border-t-4 border-cyan-500">

              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Briefcase
                  size={18}
                  className="text-cyan-500"
                />
                Employment
              </h3>

              <div className="space-y-5">

                <InfoItem
                  icon={Briefcase}
                  label="Designation"
                  value={staff.role}
                />

                <InfoItem
                  icon={Building2}
                  label="Department"
                  value={staff.department}
                />

                <InfoItem
                  icon={Calendar}
                  label="Joining Date"
                  value={formatDate(staff.joinDate)}
                />

                <InfoItem
                  icon={CreditCard}
                  label="Basic Salary"
                  value={`Rs. ${Number(basicSalary || 0).toLocaleString()}`}
                />

              </div>
            </GlassCard>

          </div>

          {/* Academic Summary */}
          <GlassCard className="p-6">

            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <GraduationCap
                size={18}
                className="text-primary-500"
              />
              Academic Summary
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="p-5 rounded-2xl bg-dark-hover border border-dark-border">
                <p className="text-[10px] uppercase font-black text-dark-muted">
                  Qualification
                </p>
                <p className="font-bold text-white mt-2">
                  {staff.qualification || 'N/A'}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-dark-hover border border-dark-border">
                <p className="text-[10px] uppercase font-black text-dark-muted">
                  Specialization
                </p>
                <p className="font-bold text-white mt-2">
                  {staff.specialization || 'N/A'}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-dark-hover border border-dark-border">
                <p className="text-[10px] uppercase font-black text-dark-muted">
                  Experience
                </p>
                <p className="font-bold text-white mt-2">
                  {staff.experience || 'N/A'}
                </p>
              </div>

            </div>
          </GlassCard>

          {/* Emergency */}
          <GlassCard className="p-6">

            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Phone
                size={18}
                className="text-primary-500"
              />
              Emergency Contact
            </h3>

            {staff.emergencyContact ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <InfoItem
                  icon={User}
                  label="Contact"
                  value={
                    typeof staff.emergencyContact === 'string'
                      ? staff.emergencyContact
                      : staff.emergencyContact.name
                  }
                />

                {typeof staff.emergencyContact === 'object' && (
                  <>
                    <InfoItem
                      icon={Phone}
                      label="Phone"
                      value={staff.emergencyContact.phone}
                    />

                    <InfoItem
                      icon={Users}
                      label="Relation"
                      value={staff.emergencyContact.relation}
                    />
                  </>
                )}

              </div>
            ) : (
              <p className="text-dark-muted text-sm">
                No emergency contact information available.
              </p>
            )}

          </GlassCard>
        </div>
      )}

      {activeTab === 'employment' && (
        <GlassCard className="p-8">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">

            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Briefcase
                  size={22}
                  className="text-primary-500"
                />
                Employment Information
              </h2>

              <p className="text-dark-muted text-sm mt-1">
                Manage staff employment and assignment information.
              </p>
            </div>

            {!editingEmployment ? (
              <button
                type="button"
                onClick={startEmploymentEdit}
                className="px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
              >
                Edit Employment
              </button>
            ) : (
              <div className="flex items-center gap-3">

                <button
                  type="button"
                  onClick={cancelEmploymentEdit}
                  disabled={savingEmployment}
                  className="px-4 py-2.5 rounded-xl border border-dark-border text-dark-muted hover:text-white hover:bg-dark-hover transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleEmploymentSave}
                  disabled={savingEmployment}
                  className="px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {savingEmployment ? 'Saving...' : 'Save Changes'}
                </button>

              </div>
            )}

          </div>

          {!editingEmployment ? (

            /* ================= VIEW MODE ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

              <InfoItem
                icon={Hash}
                label="Staff ID"
                value={staff.staffId}
                mono
              />

              <InfoItem
                icon={Briefcase}
                label="Designation"
                value={staff.role}
              />

              <InfoItem
                icon={Building2}
                label="Department"
                value={staff.department}
              />

              <InfoItem
                icon={Users}
                label="Staff Type"
                value={staffType}
              />

              <InfoItem
                icon={UserCheck}
                label="Employment Type"
                value={employmentType}
              />

              <InfoItem
                icon={Calendar}
                label="Joining Date"
                value={formatDate(staff.joinDate)}
              />

              <InfoItem
                icon={Building2}
                label="Campus"
                value={staff.campus}
              />

              <InfoItem
                icon={User}
                label="Reporting Manager"
                value={staff.reportingManager}
              />

              <InfoItem
                icon={ShieldCheck}
                label="Current Status"
                value={staff.status || 'Active'}
              />

              <InfoItem
                icon={BookOpen}
                label="Assigned Class"
                value={
                  staff.assignedClass
                    ? `Class ${staff.assignedClass}`
                    : 'N/A'
                }
              />

              <InfoItem
                icon={Users}
                label="Assigned Section"
                value={staff.assignedSection || 'N/A'}
              />

            </div>

          ) : (

            /* ================= EDIT MODE ================= */
            <div className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Designation */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Designation
                  </label>

                  <input
                    type="text"
                    value={employmentForm.role}
                    onChange={(e) =>
                      setEmploymentForm((prev) => ({
                        ...prev,
                        role: e.target.value
                      }))
                    }
                    placeholder="e.g. Senior Teacher"
                    className="w-full px-4 py-3 rounded-xl bg-dark-hover border border-dark-border text-white outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Department
                  </label>

                  <input
                    type="text"
                    value={employmentForm.department}
                    onChange={(e) =>
                      setEmploymentForm((prev) => ({
                        ...prev,
                        department: e.target.value
                      }))
                    }
                    placeholder="e.g. Academic"
                    className="w-full px-4 py-3 rounded-xl bg-dark-hover border border-dark-border text-white outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                {/* Staff Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Staff Type
                  </label>

                  <select
                    value={employmentForm.staffType}
                    onChange={(e) =>
                      setEmploymentForm((prev) => ({
                        ...prev,
                        staffType: e.target.value
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-dark-hover border border-dark-border text-white outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="">Select Staff Type</option>
                    <option value="Teaching">Teaching</option>
                    <option value="Non-Teaching">Non-Teaching</option>
                  </select>
                </div>

                {/* Employment Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Employment Type
                  </label>

                  <select
                    value={employmentForm.employmentType}
                    onChange={(e) =>
                      setEmploymentForm((prev) => ({
                        ...prev,
                        employmentType: e.target.value
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-dark-hover border border-dark-border text-white outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="">Select Employment Type</option>
                    <option value="Permanent">Permanent</option>
                    <option value="Contract">Contract</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Probation">Probation</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>

                {/* Joining Date */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Joining Date
                  </label>

                  <input
                    type="date"
                    value={employmentForm.joinDate}
                    onChange={(e) =>
                      setEmploymentForm((prev) => ({
                        ...prev,
                        joinDate: e.target.value
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-dark-hover border border-dark-border text-white outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                {/* Campus */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Campus
                  </label>

                  <input
                    type="text"
                    value={employmentForm.campus}
                    onChange={(e) =>
                      setEmploymentForm((prev) => ({
                        ...prev,
                        campus: e.target.value
                      }))
                    }
                    placeholder="e.g. Main Campus"
                    className="w-full px-4 py-3 rounded-xl bg-dark-hover border border-dark-border text-white outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                {/* Reporting Manager */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Reporting Manager
                  </label>

                  <input
                    type="text"
                    value={employmentForm.reportingManager}
                    onChange={(e) =>
                      setEmploymentForm((prev) => ({
                        ...prev,
                        reportingManager: e.target.value
                      }))
                    }
                    placeholder="e.g. Principal"
                    className="w-full px-4 py-3 rounded-xl bg-dark-hover border border-dark-border text-white outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                {/* Assigned Class */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Assigned Class
                  </label>

                  <input
                    type="text"
                    value={employmentForm.assignedClass}
                    onChange={(e) =>
                      setEmploymentForm((prev) => ({
                        ...prev,
                        assignedClass: e.target.value
                      }))
                    }
                    placeholder="e.g. 8th"
                    className="w-full px-4 py-3 rounded-xl bg-dark-hover border border-dark-border text-white outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                {/* Assigned Section */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Assigned Section
                  </label>

                  <input
                    type="text"
                    value={employmentForm.assignedSection}
                    onChange={(e) =>
                      setEmploymentForm((prev) => ({
                        ...prev,
                        assignedSection: e.target.value
                      }))
                    }
                    placeholder="e.g. A"
                    className="w-full px-4 py-3 rounded-xl bg-dark-hover border border-dark-border text-white outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

              </div>

              {/* Read-only fields */}
              <div className="pt-5 border-t border-dark-border">

                <p className="text-xs text-dark-muted mb-4">
                  Staff ID and Current Status are managed separately and cannot
                  be changed from this section.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  <InfoItem
                    icon={Hash}
                    label="Staff ID"
                    value={staff.staffId}
                    mono
                  />

                  <InfoItem
                    icon={ShieldCheck}
                    label="Current Status"
                    value={staff.status || 'Active'}
                  />

                </div>

              </div>

            </div>

          )}

        </GlassCard>
      )}

      {/* =====================================================
          ATTENDANCE
      ====================================================== */}
      {activeTab === 'attendance' && (
        <GlassCard className="p-6 md:p-8 space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ClipboardCheck
                  size={22}
                  className="text-primary-500"
                />
                Staff Attendance History
              </h2>
              <p className="text-dark-muted text-xs md:text-sm mt-1">
                Attendance records saved from the Staff Attendance Register for this staff member.
              </p>
            </div>

            {/* Month & Period Selector */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={fetchPeriodPayrollAndAttendance}
                disabled={loadingSnapshot}
                className="p-1.5 px-3 rounded-xl bg-dark-bg border border-dark-border hover:bg-dark-paper text-dark-muted hover:text-dark-text transition-colors flex items-center gap-1.5 text-xs font-bold"
                title="Refresh Attendance Records"
              >
                <RefreshCw size={14} className={loadingSnapshot ? 'animate-spin text-primary-400' : ''} />
                <span>Refresh</span>
              </button>
              <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">
                Month:
              </label>
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-dark-bg border border-dark-border rounded-xl px-3 py-1.5 text-xs text-dark-text font-bold focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Monthly Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-dark-hover border border-emerald-500/20 rounded-2xl">
              <p className="text-[10px] uppercase font-black text-emerald-400">
                Present Days
              </p>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {attendanceSummary?.presentDays ?? 0}
              </p>
            </div>

            <div className="p-4 bg-dark-hover border border-red-500/20 rounded-2xl">
              <p className="text-[10px] uppercase font-black text-red-400">
                Absent Days
              </p>
              <p className="text-2xl font-black text-red-400 mt-1">
                {attendanceSummary?.absentDays ?? 0}
              </p>
            </div>

            <div className="p-4 bg-dark-hover border border-amber-500/20 rounded-2xl">
              <p className="text-[10px] uppercase font-black text-amber-400">
                Half Days
              </p>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {attendanceSummary?.halfDays ?? 0}
              </p>
            </div>

            <div className="p-4 bg-dark-hover border border-purple-500/20 rounded-2xl">
              <p className="text-[10px] uppercase font-black text-purple-400">
                Leave Days
              </p>
              <p className="text-2xl font-black text-purple-400 mt-1">
                {attendanceSummary?.leaveDays ?? 0}
              </p>
            </div>
          </div>

          {/* Daily Attendance Logs Table for Selected Period */}
          {loadingSnapshot ? (
            <div className="py-10 text-center text-dark-muted text-sm font-medium flex items-center justify-center gap-2">
              <RefreshCw size={18} className="animate-spin text-primary-400" />
              <span>Loading attendance history...</span>
            </div>
          ) : (() => {
            const targetId = staff?.id || id;
            const periodLogs = (attendanceLogs || []).filter((rec) => {
              const isStaffMatch = rec.staffId === targetId || rec.userId === targetId || rec.employeeId === targetId || rec.id?.startsWith(targetId);
              const isDateMatch = rec.date && typeof rec.date === 'string' && rec.date.startsWith(selectedPeriod);
              return isStaffMatch && isDateMatch;
            }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

            if (periodLogs.length === 0) {
              return (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No Attendance Records"
                  description={`No attendance records found for ${formatPeriod(selectedPeriod)}.`}
                />
              );
            }

            return (
              <div className="overflow-x-auto rounded-xl border border-dark-border">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-dark-paper/80 border-b border-dark-border text-xs uppercase font-bold text-dark-muted">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Day</th>
                      <th className="py-3 px-4">Attendance Status</th>
                      <th className="py-3 px-4">Notes / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/50">
                    {periodLogs.map((log) => {
                      const st = (log.status || '').toLowerCase().trim();
                      let statusBadge = (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-dark-bg text-dark-muted border border-dark-border">
                          {log.status || 'Unmarked'}
                        </span>
                      );

                      if (st === 'present') {
                        statusBadge = (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Present
                          </span>
                        );
                      } else if (st === 'absent') {
                        statusBadge = (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                            Absent
                          </span>
                        );
                      } else if (st === 'half' || st === 'halfday' || st === 'half day') {
                        statusBadge = (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Half Day
                          </span>
                        );
                      } else if (st === 'leave') {
                        statusBadge = (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            Leave
                          </span>
                        );
                      }

                      let dayOfWeek = '—';
                      if (log.date) {
                        try {
                          const dt = new Date(`${log.date}T00:00:00`);
                          if (!isNaN(dt.getTime())) {
                            dayOfWeek = dt.toLocaleDateString('en-US', { weekday: 'long' });
                          }
                        } catch (e) {}
                      }

                      return (
                        <tr key={log.id || `${log.staffId}_${log.date}`} className="hover:bg-dark-paper/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-dark-text">
                            {log.date}
                          </td>
                          <td className="py-3 px-4 text-dark-muted font-medium">
                            {dayOfWeek}
                          </td>
                          <td className="py-3 px-4">
                            {statusBadge}
                          </td>
                          <td className="py-3 px-4 text-dark-muted text-xs">
                            {log.notes || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

        </GlassCard>
      )}

      {/* =====================================================
          LEAVE
      ====================================================== */}
      {activeTab === 'leave' && (
        <GlassCard className="p-8">

          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <CalendarDays
              size={22}
              className="text-primary-500"
            />
            Leave Management
          </h2>

          <p className="text-dark-muted text-sm">
            Staff leave records will appear here when an existing leave data source is connected.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">

            {[
              'Total Leave',
              'Approved',
              'Pending',
              'Rejected'
            ].map((label) => (
              <div
                key={label}
                className="p-5 bg-dark-hover border border-dark-border rounded-2xl"
              >
                <p className="text-[10px] uppercase font-black text-dark-muted">
                  {label}
                </p>

                <p className="text-2xl font-black text-white mt-2">
                  —
                </p>
              </div>
            ))}

          </div>

          <EmptyState
            icon={CalendarDays}
            title="No leave records available"
            description="No staff leave records are currently connected to this profile."
          />

        </GlassCard>
      )}

      {/* =====================================================
          ASSIGNMENT
      ====================================================== */}
      {activeTab === 'assignment' && (
        <div className="space-y-6">

          <GlassCard className="p-8">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users
                    size={22}
                    className="text-primary-500"
                  />
                  Academic & Class Assignment
                </h2>

                <p className="text-sm text-dark-muted mt-1">
                  Manage class, section, class teacher status and teaching subjects.
                </p>
              </div>

              {!editingAssignment ? (
                <button
                  onClick={startAssignmentEdit}
                  className="premium-button-primary text-sm"
                >
                  Edit Assignment
                </button>
              ) : (
                <div className="flex flex-wrap gap-3">

                  <button
                    onClick={cancelAssignmentEdit}
                    type="button"
                    className="premium-button-secondary text-sm"
                    disabled={savingAssignment}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleAssignmentSave}
                    type="button"
                    className="premium-button-primary text-sm"
                    disabled={savingAssignment}
                  >
                    {savingAssignment ? 'Saving...' : 'Save Changes'}
                  </button>

                </div>
              )}

            </div>

            {!editingAssignment ? (

              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                  <div className="bg-dark-hover border border-dark-border p-5 rounded-2xl">

                    <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest mb-2">
                      Assigned Class
                    </p>

                    <p className="text-xl font-black text-white">

                      {staff.assignedClass
                        ? `Class ${staff.assignedClass}`
                        : 'Not Assigned'}

                      {staff.assignedSection && (
                        <span className="text-primary-400 text-base">
                          {' '}
                          — Section {staff.assignedSection}
                        </span>
                      )}

                    </p>

                  </div>

                  <div className="bg-dark-hover border border-dark-border p-5 rounded-2xl">

                    <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest mb-2">
                      Class Teacher
                    </p>

                    {staff.isClassTeacher ? (
                      <div className="flex items-center gap-2">

                        <CheckCircle
                          size={20}
                          className="text-green-400"
                        />

                        <p className="text-green-400 font-bold">
                          Yes — Class Teacher
                        </p>

                      </div>
                    ) : (
                      <p className="text-dark-muted">
                        Not a class teacher
                      </p>
                    )}

                  </div>

                  <div className="bg-dark-hover border border-dark-border p-5 rounded-2xl">

                    <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest mb-2">
                      Class Teacher Of
                    </p>

                    <p className="text-white font-bold">
                      {staff.classTeacherOf || 'N/A'}
                    </p>

                  </div>

                </div>

              </>

            ) : (

              <div className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Assigned Class
                    </label>

                    <input
                      type="text"
                      value={assignmentForm.assignedClass}
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({
                          ...prev,
                          assignedClass: e.target.value
                        }))
                      }
                      placeholder="e.g. 5"
                      className="premium-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Assigned Section
                    </label>

                    <input
                      type="text"
                      value={assignmentForm.assignedSection}
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({
                          ...prev,
                          assignedSection: e.target.value
                        }))
                      }
                      placeholder="e.g. A"
                      className="premium-input w-full"
                    />
                  </div>

                </div>

                <div className="bg-dark-hover border border-dark-border p-5 rounded-2xl">

                  <div className="flex items-center justify-between gap-4">

                    <div>
                      <p className="text-sm font-bold text-white">
                        Class Teacher
                      </p>

                      <p className="text-xs text-dark-muted mt-1">
                        Mark this staff member as a class teacher.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setAssignmentForm((prev) => ({
                          ...prev,
                          isClassTeacher: !prev.isClassTeacher,
                          classTeacherOf: !prev.isClassTeacher
                            ? prev.classTeacherOf
                            : ''
                        }))
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${assignmentForm.isClassTeacher
                        ? 'bg-primary-500'
                        : 'bg-dark-border'
                        }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${assignmentForm.isClassTeacher
                          ? 'translate-x-6'
                          : ''
                          }`}
                      />
                    </button>

                  </div>

                </div>

                {assignmentForm.isClassTeacher && (
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Class Teacher Of
                    </label>

                    <input
                      type="text"
                      value={assignmentForm.classTeacherOf}
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({
                          ...prev,
                          classTeacherOf: e.target.value
                        }))
                      }
                      placeholder="e.g. Class 5 - Section A"
                      className="premium-input w-full"
                    />
                  </div>
                )}

                <div>

                  <label className="block text-sm font-semibold text-white mb-2">
                    Teaching Subjects
                  </label>

                  <div className="flex flex-col sm:flex-row gap-3">

                    <input
                      type="text"
                      value={subjectInput}
                      onChange={(e) =>
                        setSubjectInput(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addAssignmentSubject();
                        }
                      }}
                      placeholder="Enter subject name"
                      className="premium-input flex-1"
                    />

                    <button
                      type="button"
                      onClick={addAssignmentSubject}
                      className="premium-button-secondary text-sm"
                    >
                      Add Subject
                    </button>

                  </div>

                  {assignmentForm.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-3 mt-4">

                      {assignmentForm.subjects.map((subject, index) => (
                        <div
                          key={`${subject}-${index}`}
                          className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-xl text-sm font-bold"
                        >

                          <CheckCircle
                            size={14}
                            className="text-green-400"
                          />

                          <span>{subject}</span>

                          <button
                            type="button"
                            onClick={() =>
                              removeAssignmentSubject(index)
                            }
                            className="ml-1 text-red-400 hover:text-red-300 font-black"
                            title="Remove subject"
                          >
                            ×
                          </button>

                        </div>
                      ))}

                    </div>
                  ) : (
                    <p className="text-sm text-dark-muted mt-4">
                      No teaching subjects added yet.
                    </p>
                  )}

                </div>

              </div>

            )}

          </GlassCard>

          <GlassCard className="p-6">

            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <BookOpen
                size={18}
                className="text-primary-500"
              />
              Subjects Taught
            </h3>

            {staff.subjects?.length > 0 ? (
              <div className="flex flex-wrap gap-3">

                {staff.subjects.map((subject, index) => (
                  <span
                    key={`${subject}-${index}`}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-xl text-sm font-bold"
                  >
                    <CheckCircle
                      size={14}
                      className="text-green-400"
                    />

                    {subject}
                  </span>
                ))}

              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No subjects assigned"
                description="No teaching subjects have been assigned to this staff member yet."
              />
            )}

          </GlassCard>

        </div>
      )}

      {/* =====================================================
          PAYROLL
      ====================================================== */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">

          <GlassCard className="p-8">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <CreditCard
                    size={22}
                    className="text-primary-500"
                  />
                  Payroll & Salary Structure
                </h2>

                <p className="text-dark-muted text-sm mt-1">
                  Define basic salary structure, recurring allowances, and fixed deductions.
                </p>
              </div>

              {!editingSalary ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={startSalaryEdit}
                    className="premium-button-primary text-sm flex items-center gap-2"
                  >
                    <CreditCard size={16} />
                    Edit Payroll Setup
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('/school-admin/staff/payroll')
                    }
                    className="premium-button-secondary text-sm flex items-center gap-2"
                  >
                    Open Payroll Engine
                    <ExternalLink size={15} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={cancelSalaryEdit}
                    className="premium-button-secondary text-sm"
                    disabled={savingSalary}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSalarySave}
                    className="premium-button-primary text-sm flex items-center gap-2"
                    disabled={savingSalary}
                  >
                    <CheckCircle size={16} />
                    {savingSalary ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}

            </div>

            {!editingSalary ? (
              <div className="space-y-6">

                {/* Salary & Allowances Breakdown */}
                <div>
                  <h3 className="text-xs uppercase font-bold text-dark-muted tracking-wider mb-3">
                    Salary & Recurring Allowances
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    <div className="p-5 bg-dark-hover border border-dark-border rounded-2xl">
                      <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest">
                        Basic Salary
                      </p>
                      <p className="text-2xl font-black text-white mt-2 font-mono">
                        Rs. {Number(basicSalary || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="p-5 bg-dark-hover border border-dark-border rounded-2xl">
                      <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest">
                        Medical Allowance
                      </p>
                      <p className="text-2xl font-black text-white mt-2 font-mono text-emerald-400">
                        Rs. {Number(payrollSetup.medicalAllowance || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="p-5 bg-dark-hover border border-dark-border rounded-2xl">
                      <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest">
                        Transport Allowance
                      </p>
                      <p className="text-2xl font-black text-white mt-2 font-mono text-emerald-400">
                        Rs. {Number(payrollSetup.transportAllowance || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="p-5 bg-primary-500/10 border border-primary-500/20 rounded-2xl">
                      <p className="text-[10px] uppercase font-black text-primary-400 tracking-widest">
                        Total Allowances
                      </p>
                      <p className="text-2xl font-black text-primary-300 mt-2 font-mono">
                        Rs. {totalAllowances.toLocaleString()}
                      </p>
                    </div>

                  </div>
                </div>

                {/* Deductions Breakdown */}
                <div>
                  <h3 className="text-xs uppercase font-bold text-dark-muted tracking-wider mb-3">
                    Recurring Deductions
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    <div className="p-5 bg-dark-hover border border-dark-border rounded-2xl">
                      <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest">
                        Other Deductions
                      </p>
                      <p className="text-2xl font-black text-red-400 mt-2 font-mono">
                        - Rs. {Number(payrollSetup.otherDeductions || 0).toLocaleString()}
                      </p>
                    </div>

                  </div>
                </div>

                {/* Payroll Summary */}
                <div className="p-6 bg-gradient-to-r from-purple-900/30 via-dark-card to-blue-900/30 border border-primary-500/20 rounded-2xl">
                  <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
                    Payroll Summary (Monthly Estimated)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

                    <div>
                      <p className="text-xs text-dark-muted uppercase font-bold">
                        Gross Salary
                      </p>
                      <p className="text-xl font-bold text-white mt-1 font-mono">
                        Rs. {grossSalary.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-dark-muted mt-0.5">
                        Basic ({Number(basicSalary || 0).toLocaleString()}) + Allowances ({totalAllowances.toLocaleString()})
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-dark-muted uppercase font-bold">
                        Total Deductions
                      </p>
                      <p className="text-xl font-bold text-red-400 mt-1 font-mono">
                        - Rs. {totalDeductions.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-dark-muted mt-0.5">
                        Fixed deductions
                      </p>
                    </div>

                    <div className="p-3 bg-primary-500/20 border border-primary-500/30 rounded-xl">
                      <p className="text-xs text-primary-300 uppercase font-black">
                        Net Salary
                      </p>
                      <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                        Rs. {netSalary.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-primary-300/80 mt-0.5">
                        Take-home estimated base
                      </p>
                    </div>

                  </div>
                </div>

              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                  {/* Basic Salary */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Basic Salary (Rs) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={salaryForm.basicSalary}
                      onChange={(e) =>
                        setSalaryForm((prev) => ({
                          ...prev,
                          basicSalary: e.target.value
                        }))
                      }
                      placeholder="e.g. 50000"
                      className="premium-input w-full font-mono"
                      disabled={savingSalary}
                    />
                  </div>

                  {/* Medical Allowance */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Medical Allowance (Rs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={salaryForm.medicalAllowance}
                      onChange={(e) =>
                        setSalaryForm((prev) => ({
                          ...prev,
                          medicalAllowance: e.target.value
                        }))
                      }
                      placeholder="e.g. 5000"
                      className="premium-input w-full font-mono"
                      disabled={savingSalary}
                    />
                  </div>

                  {/* Transport Allowance */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Transport Allowance (Rs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={salaryForm.transportAllowance}
                      onChange={(e) =>
                        setSalaryForm((prev) => ({
                          ...prev,
                          transportAllowance: e.target.value
                        }))
                      }
                      placeholder="e.g. 3000"
                      className="premium-input w-full font-mono"
                      disabled={savingSalary}
                    />
                  </div>

                  {/* Other Deductions */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Other Fixed Deductions (Rs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={salaryForm.otherDeductions}
                      onChange={(e) =>
                        setSalaryForm((prev) => ({
                          ...prev,
                          otherDeductions: e.target.value
                        }))
                      }
                      placeholder="e.g. 2000"
                      className="premium-input w-full font-mono text-red-400"
                      disabled={savingSalary}
                    />
                  </div>

                </div>

                {/* Live Preview Summary in Edit Mode */}
                {(() => {
                  const b = Math.max(0, Number(salaryForm.basicSalary) || 0);
                  const m = Math.max(0, Number(salaryForm.medicalAllowance) || 0);
                  const t = Math.max(0, Number(salaryForm.transportAllowance) || 0);
                  const d = Math.max(0, Number(salaryForm.otherDeductions) || 0);
                  const totAllow = m + t;
                  const gr = b + totAllow;
                  const nt = gr - d;

                  return (
                    <div className="p-4 rounded-xl bg-dark-hover border border-dark-border">
                      <p className="text-xs uppercase font-bold text-dark-muted mb-2">
                        Live Payroll Preview
                      </p>
                      <div className="flex flex-wrap items-center justify-between text-sm gap-4">
                        <span className="text-white">Gross: <strong className="font-mono text-emerald-400">Rs. {gr.toLocaleString()}</strong></span>
                        <span className="text-white">Deductions: <strong className="font-mono text-red-400">Rs. {d.toLocaleString()}</strong></span>
                        <span className="text-white">Estimated Net: <strong className="font-mono text-primary-300">Rs. {nt.toLocaleString()}</strong></span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

          </GlassCard>

          {/* Monthly Payroll Processing Section (Phase 6.3) */}
          <GlassCard className="p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Calendar size={22} className="text-emerald-400" />
                  Monthly Payroll Processing
                </h2>
                <p className="text-dark-muted text-sm mt-1">
                  Calculate and process monthly salary snapshot for selected period.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">
                  Period:
                </label>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {loadingSnapshot ? (
              <div className="py-8 text-center text-dark-muted font-bold text-sm">
                Checking payroll & attendance records for {formatPeriod(selectedPeriod)}...
              </div>
            ) : processedSnapshot && (processedSnapshot.status === 'Processed' || processedSnapshot.status === 'Locked' || processedSnapshot.status === 'Finalized') ? (
              <div className="space-y-6">
                {processedSnapshot.status === 'Locked' || processedSnapshot.status === 'Finalized' ? (
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Lock size={24} className="text-indigo-400" />
                      <div>
                        <h3 className="font-bold text-white text-base">
                          Payroll Finalized & Locked — {formatPeriod(selectedPeriod)}
                        </h3>
                        <p className="text-xs text-indigo-300">
                          Official snapshot finalized on {processedSnapshot.finalizedAt ? new Date(processedSnapshot.finalizedAt).toLocaleDateString() : 'Confirmed date'}. Historical snapshot is immutable.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                        <Lock size={12} /> Locked
                      </span>
                      <button
                        onClick={() => setShowPayslipModal(true)}
                        className="px-3.5 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText size={14} /> View Payslip
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={24} className="text-emerald-400" />
                      <div>
                        <h3 className="font-bold text-white text-base">
                          Payroll Processed — {formatPeriod(selectedPeriod)}
                        </h3>
                        <p className="text-xs text-emerald-300">
                          Historical Snapshot recorded on {processedSnapshot.processedAt ? new Date(processedSnapshot.processedAt).toLocaleDateString() : 'Confirmed date'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold uppercase">
                        Processed
                      </span>
                      <button
                        onClick={() => setShowPayslipModal(true)}
                        className="px-3.5 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText size={14} /> View Payslip
                      </button>
                    </div>
                  </div>
                )}

                {/* Attendance Summary Snapshot */}
                <div>
                  <h4 className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-3">
                    ATTENDANCE SUMMARY (Historical Snapshot)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3 bg-dark-hover border border-dark-border rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Working Days</p>
                      <p className="text-base font-bold text-white font-mono mt-0.5">
                        {processedSnapshot.totalWorkingDays ?? 26}
                      </p>
                    </div>
                    <div className="p-3 bg-dark-hover border border-dark-border rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Present Days</p>
                      <p className="text-base font-bold text-green-400 font-mono mt-0.5">
                        {processedSnapshot.presentDays ?? 0}
                      </p>
                    </div>
                    <div className="p-3 bg-dark-hover border border-dark-border rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Absent Days</p>
                      <p className="text-base font-bold text-red-400 font-mono mt-0.5">
                        {processedSnapshot.absentDays ?? 0}
                      </p>
                    </div>
                    <div className="p-3 bg-dark-hover border border-dark-border rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Half Days</p>
                      <p className="text-base font-bold text-amber-400 font-mono mt-0.5">
                        {processedSnapshot.halfDays ?? 0}
                      </p>
                    </div>
                    <div className="p-3 bg-dark-hover border border-dark-border rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Paid Days</p>
                      <p className="text-base font-bold text-emerald-300 font-mono mt-0.5">
                        {processedSnapshot.paidEquivalentDays ?? (processedSnapshot.presentDays || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary Snapshot */}
                <div>
                  <h4 className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-3">
                    PAYROLL SUMMARY (Historical Snapshot)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 bg-dark-hover border border-dark-border rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Basic Salary</p>
                      <p className="text-sm font-bold text-white font-mono mt-0.5">
                        Rs. {Number(processedSnapshot.basicSalary || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-dark-hover border border-dark-border rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Allowances</p>
                      <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                        + Rs. {Number(processedSnapshot.totalAllowances || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-dark-hover border border-dark-border rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Gross Salary</p>
                      <p className="text-sm font-bold text-white font-mono mt-0.5">
                        Rs. {Number(processedSnapshot.grossSalary || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-dark-hover border border-dark-border rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Att. Deduction</p>
                      <p className="text-sm font-bold text-red-400 font-mono mt-0.5">
                        - Rs. {Number(processedSnapshot.attendanceDeduction || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-dark-hover border border-dark-border rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Other Deductions</p>
                      <p className="text-sm font-bold text-red-400 font-mono mt-0.5">
                        - Rs. {Number(processedSnapshot.otherDeductions || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-emerald-400">Snapshot Net</p>
                      <p className="text-base font-black text-emerald-300 font-mono mt-0.5">
                        Rs. {Number(processedSnapshot.netSalary || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-dark-bg/60 border border-dark-border rounded-xl flex flex-wrap items-center justify-between text-xs gap-4 text-dark-muted">
                  <span>Medical Allowance: <strong className="text-white font-mono">Rs. {Number(processedSnapshot.medicalAllowance || 0).toLocaleString()}</strong></span>
                  <span>Transport Allowance: <strong className="text-white font-mono">Rs. {Number(processedSnapshot.transportAllowance || 0).toLocaleString()}</strong></span>
                  <span>Total Deductions: <strong className="text-red-400 font-mono">Rs. {Number(processedSnapshot.totalDeductions || 0).toLocaleString()}</strong></span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Attendance Summary Input / Auto-sync Card */}
                <div className="p-5 bg-dark-hover/40 border border-dark-border rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-dark-border pb-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <ClipboardCheck size={16} className="text-primary-400" />
                          Attendance Summary ({formatPeriod(selectedPeriod)})
                        </h3>
                        {isOverrideActive ? (
                          <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            <AlertCircle size={13} /> ⚠ Manual Override Active
                          </span>
                        ) : attendanceSummary?.hasData ? (
                          <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={13} /> ✓ Synced from Attendance
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-dark-muted mt-1">
                        {attendanceSummary?.hasData
                          ? 'Attendance auto-synchronized from Staff Attendance Hub. All values remain editable by School Admin.'
                          : 'No attendance records found for this period. Confirm or enter attendance days below.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {isOverrideActive && (
                        <button
                          type="button"
                          onClick={handleResetAttendance}
                          className="text-xs text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1"
                        >
                          <RefreshCw size={12} /> Reset to Attendance
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleRefreshAttendance}
                        className="text-xs text-primary-400 hover:text-primary-300 underline font-bold flex items-center gap-1"
                      >
                        <RefreshCw size={12} /> Refresh Attendance
                      </button>
                    </div>
                  </div>

                  {!attendanceSummary?.hasData && !isOverrideActive && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2.5">
                      <AlertCircle size={18} className="shrink-0 text-amber-400" />
                      <span>
                        <strong>Notice:</strong> No attendance records found for {formatPeriod(selectedPeriod)}. Enter or confirm working & attendance days below before processing payroll.
                      </span>
                    </div>
                  )}

                  {/* Inline Validation Warning when Marked > Working */}
                  {(() => {
                    const totalMarked = Number(manualAttendance.presentDays || 0) + Number(manualAttendance.absentDays || 0) + Number(manualAttendance.halfDays || 0);
                    const wDays = Number(manualAttendance.workingDays || 26);
                    if (totalMarked > wDays) {
                      return (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-bold flex items-center gap-2">
                          <AlertCircle size={16} className="shrink-0 text-red-400" />
                          <span>Attendance days exceed total working days ({totalMarked} days marked = {manualAttendance.presentDays} Present + {manualAttendance.absentDays} Absent + {manualAttendance.halfDays} Half vs {wDays} Working Days). Payroll processing disabled.</span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-dark-muted uppercase mb-1">
                        Total Working Days
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        step="1"
                        value={manualAttendance.workingDays}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setManualAttendance({ ...manualAttendance, workingDays: val });
                          setOverrideAttendance(true);
                        }}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-1.5 text-white font-mono text-sm focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-dark-muted uppercase mb-1">
                        Present Days (1.0 paid)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        step="1"
                        value={manualAttendance.presentDays}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setManualAttendance({ ...manualAttendance, presentDays: val });
                          setOverrideAttendance(true);
                        }}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-1.5 text-green-400 font-mono text-sm focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-dark-muted uppercase mb-1">
                        Absent Days (0.0 paid)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        step="1"
                        value={manualAttendance.absentDays}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setManualAttendance({ ...manualAttendance, absentDays: val });
                          setOverrideAttendance(true);
                        }}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-1.5 text-red-400 font-mono text-sm focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-dark-muted uppercase mb-1">
                        Half Days (0.5 paid)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        step="1"
                        value={manualAttendance.halfDays}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setManualAttendance({ ...manualAttendance, halfDays: val });
                          setOverrideAttendance(true);
                        }}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-1.5 text-amber-400 font-mono text-sm focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Attendance Calculation Strip */}
                  {(() => {
                    const activeSum = getActiveAttendanceSummary();
                    const bSal = Math.max(0, Number(staff?.payrollSetup?.basicSalary ?? staff?.salary ?? 0));
                    const dSal = bSal > 0 ? bSal / activeSum.totalWorkingDays : 0;
                    const attDed = Math.round((dSal * activeSum.attendanceDeductionDays) * 100) / 100;
                    return (
                      <div className="p-3 bg-dark-bg/60 rounded-xl flex flex-wrap items-center justify-between text-xs gap-3">
                        <span className="text-dark-muted">
                          Paid Days: <strong className="text-emerald-400 font-mono">{activeSum.paidEquivalentDays}</strong> / {activeSum.totalWorkingDays}
                        </span>
                        <span className="text-dark-muted">
                          Deduction Days: <strong className="text-red-400 font-mono">{activeSum.attendanceDeductionDays}</strong>
                        </span>
                        <span className="text-dark-muted">
                          Attendance Deduction: <strong className="text-red-400 font-mono">Rs. {attDed.toLocaleString()}</strong>
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-dark-hover border border-dark-border rounded-2xl">
                  <div>
                    <span className="text-xs uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                      <AlertCircle size={14} /> Status: Pending for {formatPeriod(selectedPeriod)}
                    </span>
                    <p className="text-xs text-dark-muted mt-1">
                      Staff Eligibility: <strong className={staff.status === 'Active' ? 'text-green-400' : 'text-amber-400'}>{staff.status || 'Active'}</strong>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const totalMarked = Number(manualAttendance.presentDays || 0) + Number(manualAttendance.absentDays || 0) + Number(manualAttendance.halfDays || 0);
                      const wDays = Number(manualAttendance.workingDays || 26);
                      const isInvalid = totalMarked > wDays;
                      return (
                        <>
                          <button
                            type="button"
                            onClick={handleCalculatePayroll}
                            disabled={isInvalid}
                            className="premium-button-secondary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Calculator size={16} />
                            Calculate Payroll
                          </button>

                          <button
                            type="button"
                            onClick={handleProcessPayroll}
                            disabled={processingPayroll || isInvalid}
                            className="premium-button-primary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle2 size={16} />
                            {processingPayroll ? 'Processing...' : 'Process Payroll'}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {calculatedDraft && (
                  <div className="p-5 bg-gradient-to-r from-emerald-900/20 via-dark-card to-blue-900/20 border border-emerald-500/30 rounded-2xl animate-fade-in space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        Calculated Payroll Draft ({formatPeriod(calculatedDraft.period)})
                      </h4>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold uppercase">
                        Draft
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="p-3 bg-dark-bg/60 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-dark-muted">Basic Salary</p>
                        <p className="text-sm font-bold text-white font-mono mt-0.5">
                          Rs. {calculatedDraft.basicSalary.toLocaleString()}
                        </p>
                      </div>

                      <div className="p-3 bg-dark-bg/60 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-dark-muted">Allowances</p>
                        <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                          + Rs. {calculatedDraft.totalAllowances.toLocaleString()}
                        </p>
                      </div>

                      <div className="p-3 bg-dark-bg/60 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-dark-muted">Gross Salary</p>
                        <p className="text-sm font-bold text-white font-mono mt-0.5">
                          Rs. {calculatedDraft.grossSalary.toLocaleString()}
                        </p>
                      </div>

                      <div className="p-3 bg-dark-bg/60 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-dark-muted">Att. Deduction</p>
                        <p className="text-sm font-bold text-red-400 font-mono mt-0.5">
                          - Rs. {calculatedDraft.attendanceDeduction.toLocaleString()}
                        </p>
                      </div>

                      <div className="p-3 bg-dark-bg/60 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-dark-muted">Other Deductions</p>
                        <p className="text-sm font-bold text-red-400 font-mono mt-0.5">
                          - Rs. {calculatedDraft.otherDeductions.toLocaleString()}
                        </p>
                      </div>

                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-emerald-400">Calculated Net</p>
                        <p className="text-base font-black text-emerald-300 font-mono mt-0.5">
                          Rs. {calculatedDraft.netSalary.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </GlassCard>

          {/* Payroll History Section */}
          <GlassCard className="p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <History size={22} className="text-blue-400" />
                  Payroll History & Archive
                </h2>
                <p className="text-dark-muted text-sm mt-1">
                  Historical processed payroll snapshots for <strong className="text-white">{staff?.name}</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={15} className="text-dark-muted" />
                  <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">
                    Filter Month:
                  </label>
                </div>
                <select
                  value={historyPeriodFilter}
                  onChange={(e) => setHistoryPeriodFilter(e.target.value)}
                  className="bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-blue-500 outline-none cursor-pointer"
                >
                  <option value="ALL">All Months ({allStaffPayrollRecords.length})</option>
                  {allStaffPayrollRecords.map((r) => {
                    const pVal = r.period || r.month;
                    return (
                      <option key={r.id || pVal} value={pVal}>
                        {formatPeriod(pVal)}
                      </option>
                    );
                  })}
                </select>

                {allStaffPayrollRecords.length > 0 && (
                  <button
                    onClick={() => exportStaffPayrollHistoryToCSV(staff, allStaffPayrollRecords)}
                    className="px-3.5 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Export Staff Payroll History to CSV"
                  >
                    <Download size={15} /> Export CSV
                  </button>
                )}
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-dark-bg/60 border border-dark-border rounded-xl">
                <div className="flex items-center justify-between text-xs font-bold text-dark-muted uppercase">
                  <span>Processed Cycles</span>
                  <Calendar size={16} className="text-blue-400" />
                </div>
                <p className="text-2xl font-black text-white font-mono mt-2">{historyMetrics.totalMonths}</p>
                <p className="text-[10px] text-dark-muted mt-0.5">Historical Months</p>
              </div>

              <div className="p-4 bg-dark-bg/60 border border-dark-border rounded-xl">
                <div className="flex items-center justify-between text-xs font-bold text-dark-muted uppercase">
                  <span>Lifetime Gross</span>
                  <TrendingUp size={16} className="text-purple-400" />
                </div>
                <p className="text-lg font-black text-white font-mono mt-2">
                  Rs. {historyMetrics.lifetimeGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-dark-muted mt-0.5">Basic + Allowances</p>
              </div>

              <div className="p-4 bg-dark-bg/60 border border-dark-border rounded-xl">
                <div className="flex items-center justify-between text-xs font-bold text-red-400 uppercase">
                  <span>Total Deductions</span>
                  <TrendingDown size={16} className="text-red-400" />
                </div>
                <p className="text-lg font-black text-red-400 font-mono mt-2">
                  - Rs. {historyMetrics.lifetimeDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-red-400/80 mt-0.5">Att. + Fixed Deductions</p>
              </div>

              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300 uppercase">
                  <span>Lifetime Net Disbursed</span>
                  <CreditCard size={16} className="text-emerald-400" />
                </div>
                <p className="text-xl font-black text-emerald-300 font-mono mt-2">
                  Rs. {historyMetrics.lifetimeNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-emerald-400/90 mt-0.5 font-bold">Total Disbursed</p>
              </div>
            </div>

            {/* History Table */}
            {loadingSnapshot ? (
              <div className="py-12 text-center text-dark-muted font-bold text-sm flex items-center justify-center gap-2">
                <RefreshCw size={18} className="animate-spin text-blue-400" />
                Loading payroll history...
              </div>
            ) : historyError ? (
              <div className="p-8 text-center text-red-400 font-bold space-y-2 border border-red-500/30 rounded-2xl bg-red-500/10">
                <AlertCircle size={24} className="mx-auto text-red-400" />
                <p className="text-base">{historyError}</p>
                <button
                  onClick={fetchPeriodPayrollAndAttendance}
                  className="px-4 py-1.5 bg-red-500/20 text-white rounded-xl text-xs font-bold hover:bg-red-500/30 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw size={13} /> Retry Loading
                </button>
              </div>
            ) : filteredHistoryRecords.length === 0 ? (
              <div className="p-12 text-center text-dark-muted font-bold space-y-2 border border-dark-border rounded-2xl bg-dark-bg/40">
                <div className="w-12 h-12 rounded-full bg-dark-card border border-dark-border flex items-center justify-center text-dark-muted mx-auto mb-2">
                  <History size={24} />
                </div>
                <p className="text-white text-base">No payroll history found.</p>
                <p className="text-xs font-normal text-dark-muted">
                  {historyPeriodFilter !== 'ALL'
                    ? `No processed payroll records for period ${formatPeriod(historyPeriodFilter)}.`
                    : `No payroll records have been processed for ${staff?.name} yet.`}
                </p>
              </div>
            ) : (
              <div className="border border-dark-border rounded-xl overflow-hidden bg-dark-bg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-dark-hover border-b border-dark-border text-xs font-bold text-dark-muted uppercase">
                        <th className="p-3.5">Payroll Month</th>
                        <th className="p-3.5">Attendance</th>
                        <th className="p-3.5">Basic Salary</th>
                        <th className="p-3.5">Allowances</th>
                        <th className="p-3.5">Gross Salary</th>
                        <th className="p-3.5">Att. Deduction</th>
                        <th className="p-3.5">Other Deductions</th>
                        <th className="p-3.5">Net Salary</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Processed Date</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/50 font-mono text-xs">
                      {filteredHistoryRecords.map((rec) => {
                        const periodLabel = formatPeriod(rec.period || rec.month);
                        const basic = Number(rec.basicSalary || 0);
                        const allowances = Number(rec.totalAllowances || 0);
                        const gross = Number(rec.grossSalary || 0);
                        const attDed = Number(rec.attendanceDeduction || 0);
                        const otherDed = Number(rec.otherDeductions || 0);
                        const net = Number(rec.netSalary || 0);
                        const processedDateStr = rec.processedAt
                          ? new Date(rec.processedAt).toLocaleDateString()
                          : '—';

                        return (
                          <tr key={rec.id || rec.period} className="hover:bg-white/5 transition-colors">
                            {/* Period */}
                            <td className="p-3.5 font-bold text-white">
                              {periodLabel}
                            </td>

                            {/* Attendance Summary */}
                            <td className="p-3.5 text-[11px] font-sans">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className="text-green-400">P:{rec.presentDays ?? 0}</span>
                                <span className="text-red-400">A:{rec.absentDays ?? 0}</span>
                                <span className="text-amber-400">H:{rec.halfDays ?? 0}</span>
                                <span className="text-purple-400">L:{rec.leaveDays ?? 0}</span>
                              </div>
                              <p className="text-[10px] text-dark-muted mt-0.5 font-mono">
                                Work: {rec.totalWorkingDays ?? 26}d | Paid: {rec.paidEquivalentDays ?? (rec.presentDays || 0)}d
                              </p>
                            </td>

                            {/* Basic */}
                            <td className="p-3.5 text-gray-300">
                              Rs. {basic.toLocaleString()}
                            </td>

                            {/* Allowances */}
                            <td className="p-3.5 text-emerald-400">
                              + Rs. {allowances.toLocaleString()}
                            </td>

                            {/* Gross */}
                            <td className="p-3.5 font-bold text-white">
                              Rs. {gross.toLocaleString()}
                            </td>

                            {/* Attendance Deduction */}
                            <td className="p-3.5 text-rose-400">
                              - Rs. {attDed.toLocaleString()}
                            </td>

                            {/* Other Deductions */}
                            <td className="p-3.5 text-red-400">
                              - Rs. {otherDed.toLocaleString()}
                            </td>

                            {/* Net Salary */}
                            <td className="p-3.5 font-black text-emerald-300 text-sm">
                              Rs. {net.toLocaleString()}
                            </td>

                            {/* Status */}
                            <td className="p-3.5 font-sans">
                              {rec.status === 'Locked' || rec.status === 'Finalized' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 uppercase">
                                  <Lock size={11} /> Locked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase">
                                  <CheckCircle2 size={11} /> {rec.status || 'Processed'}
                                </span>
                              )}
                            </td>

                            {/* Processed Date */}
                            <td className="p-3.5 text-dark-muted font-sans text-[11px]">
                              {processedDateStr}
                            </td>

                            {/* Actions */}
                            <td className="p-3.5 text-right font-sans">
                              <button
                                onClick={() => {
                                  setSelectedPayslipRecord(rec);
                                  setShowPayslipModal(true);
                                }}
                                className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                                title="View & Print Payslip"
                              >
                                <FileText size={13} /> Payslip
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Important: NO BANK DETAILS */}
          <GlassCard className="p-6">

            <div className="flex items-start gap-3">

              <ShieldCheck
                size={20}
                className="text-green-400 mt-0.5"
              />

              <div>
                <h3 className="font-bold text-white">
                  Payroll & Finance
                </h3>

                <p className="text-dark-muted text-sm mt-1">
                  Personal staff profile does not contain bank account,
                  IBAN, payment method or account-title information.
                  Such financial details, if required, should remain within
                  the dedicated Payroll/Finance workflow.
                </p>
              </div>

            </div>

          </GlassCard>

        </div>
      )}

      {/* =====================================================
          DOCUMENTS
      ====================================================== */}
      {activeTab === 'documents' && (
        <GlassCard className="p-8">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText
                  size={22}
                  className="text-primary-500"
                />
                Staff Documents
              </h2>

              <p className="text-dark-muted text-sm mt-1">
                Store and manage professional documents for this staff member.
              </p>
            </div>

            <div className="px-4 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-bold">
              {(Array.isArray(staff.documents)
                ? staff.documents.length
                : 0)} Documents
            </div>

          </div>

          {/* Upload Area */}
          <div className="p-5 rounded-2xl bg-dark-hover border border-dark-border mb-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

              {/* Document Title */}
              <div>
                <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2">
                  Document Title
                </label>

                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="e.g. B.Ed Certificate"
                  className="w-full px-4 py-3 rounded-xl bg-dark-card border border-dark-border text-white placeholder:text-dark-muted focus:outline-none focus:border-primary-500"
                  disabled={uploadingDocument}
                />
              </div>

              {/* Document Type */}
              <div>
                <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2">
                  Document Type
                </label>

                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-card border border-dark-border text-white focus:outline-none focus:border-primary-500"
                  disabled={uploadingDocument}
                >
                  <option value="CNIC">CNIC / ID</option>
                  <option value="Qualification">Qualification</option>
                  <option value="Certificate">Certificate</option>
                  <option value="Experience">Experience Letter</option>
                  <option value="Contract">Employment Contract</option>
                  <option value="Training">Training / Course</option>
                  <option value="Other">Other</option>
                </select>
              </div>

            </div>

            {/* File Upload */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">

              <label
                className={`premium-button-primary text-sm flex items-center justify-center gap-2 cursor-pointer ${uploadingDocument
                  ? 'opacity-60 pointer-events-none'
                  : ''
                  }`}
              >
                <FileText size={16} />

                {uploadingDocument
                  ? 'Uploading...'
                  : 'Upload Document'}

                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleDocumentUpload}
                  disabled={uploadingDocument}
                />
              </label>

              <p className="text-xs text-dark-muted">
                PDF, DOC or DOCX files
              </p>

            </div>

          </div>

          {/* Documents List */}
          {Array.isArray(staff.documents) &&
            staff.documents.length > 0 ? (

            <div className="space-y-3">

              {staff.documents.map((document, index) => (

                <div
                  key={document.id || `${document.name}-${index}`}
                  className="p-5 rounded-2xl bg-dark-hover border border-dark-border flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >

                  <div className="flex items-start gap-4 min-w-0">

                    <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                      <FileText
                        size={22}
                        className="text-primary-400"
                      />
                    </div>

                    <div className="min-w-0">

                      <h3 className="font-bold text-white truncate">
                        {document.name ||
                          document.fileName ||
                          'Untitled Document'}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 mt-1">

                        <span className="px-2.5 py-1 rounded-lg bg-primary-500/10 text-primary-400 text-[11px] font-bold">
                          {document.type || 'Other'}
                        </span>

                        <span className="text-xs text-dark-muted">
                          {document.fileName || 'Document'}
                        </span>

                        {document.uploadedAt && (
                          <span className="text-xs text-dark-muted">
                            • {formatDate(document.uploadedAt)}
                          </span>
                        )}

                      </div>

                    </div>

                  </div>

                  <div className="flex items-center gap-2 shrink-0">

                    {document.url && (
                      <a
                        href={document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500/20 text-sm font-bold flex items-center gap-2 transition-all"
                      >
                        <ExternalLink size={15} />
                        Open
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleDocumentDelete(document)
                      }
                      className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-bold transition-all"
                    >
                      Delete
                    </button>

                  </div>

                </div>

              ))}

            </div>

          ) : (

            <EmptyState
              icon={FileText}
              title="No documents uploaded yet"
              description="Upload qualification certificates, experience letters, contracts, training certificates or other professional documents."
            />

          )}

        </GlassCard>
      )}




      {/* =====================================================
          QUALIFICATION
      ====================================================== */}
      {activeTab === 'qualification' && (
        <GlassCard className="p-8">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <GraduationCap
                  size={22}
                  className="text-primary-500"
                />
                Qualification & Professional Profile
              </h2>

              <p className="text-dark-muted text-sm mt-1">
                Academic qualifications, professional experience,
                certifications and professional skills.
              </p>
            </div>

            {!editingQualification ? (
              <button
                type="button"
                onClick={startQualificationEdit}
                className="premium-button-primary flex items-center justify-center gap-2"
              >
                <Award size={16} />
                Edit Qualification
              </button>
            ) : (
              <div className="flex gap-2">

                <button
                  type="button"
                  onClick={cancelQualificationEdit}
                  disabled={savingQualification}
                  className="px-4 py-2 rounded-xl bg-dark-hover border border-dark-border text-dark-muted hover:text-white transition-all"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleQualificationSave}
                  disabled={savingQualification}
                  className="premium-button-primary flex items-center gap-2"
                >
                  <CheckCircle size={16} />

                  {savingQualification
                    ? 'Saving...'
                    : 'Save Changes'}
                </button>

              </div>
            )}

          </div>

          {!editingQualification ? (

            <>
              {/* VIEW MODE */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div className="p-5 bg-dark-hover border border-dark-border rounded-2xl">
                  <p className="text-[10px] uppercase font-black text-dark-muted">
                    Highest Qualification
                  </p>

                  <p className="text-white font-bold mt-2">
                    {staff.highestQualification || 'N/A'}
                  </p>
                </div>

                <div className="p-5 bg-dark-hover border border-dark-border rounded-2xl">
                  <p className="text-[10px] uppercase font-black text-dark-muted">
                    Specialization
                  </p>

                  <p className="text-white font-bold mt-2">
                    {staff.specialization || 'N/A'}
                  </p>
                </div>

                <div className="p-5 bg-dark-hover border border-dark-border rounded-2xl">
                  <p className="text-[10px] uppercase font-black text-dark-muted">
                    Total Experience
                  </p>

                  <p className="text-white font-bold mt-2">
                    {staff.totalExperience
                      ? `${staff.totalExperience} years`
                      : 'N/A'}
                  </p>
                </div>

              </div>

              {/* Certifications */}
              <div className="mt-5 p-5 bg-dark-hover border border-dark-border rounded-2xl">

                <div className="flex items-center gap-2 mb-3">
                  <Award
                    size={18}
                    className="text-primary-400"
                  />

                  <p className="text-[10px] uppercase font-black text-dark-muted">
                    Certifications
                  </p>
                </div>

                {Array.isArray(staff.certifications) &&
                  staff.certifications.length > 0 ? (

                  <div className="flex flex-wrap gap-2">

                    {staff.certifications.map(
                      (certificate, index) => (
                        <span
                          key={`${certificate}-${index}`}
                          className="px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-bold"
                        >
                          {certificate}
                        </span>
                      )
                    )}

                  </div>

                ) : (
                  <p className="text-white font-bold">
                    N/A
                  </p>
                )}

              </div>

              {/* Skills */}
              <div className="mt-5 p-5 bg-dark-hover border border-dark-border rounded-2xl">

                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle
                    size={18}
                    className="text-primary-400"
                  />

                  <p className="text-[10px] uppercase font-black text-dark-muted">
                    Professional Skills
                  </p>
                </div>

                {Array.isArray(staff.skills) &&
                  staff.skills.length > 0 ? (

                  <div className="flex flex-wrap gap-2">

                    {staff.skills.map((skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        className="px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-bold"
                      >
                        {skill}
                      </span>
                    ))}

                  </div>

                ) : (
                  <p className="text-white font-bold">
                    N/A
                  </p>
                )}

              </div>

            </>

          ) : (

            <>
              {/* EDIT MODE */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Highest Qualification */}
                <div>
                  <label className="block text-xs font-black text-dark-muted uppercase tracking-wider mb-2">
                    Highest Qualification
                  </label>

                  <input
                    type="text"
                    value={qualificationForm.highestQualification}
                    onChange={(e) =>
                      setQualificationForm((prev) => ({
                        ...prev,
                        highestQualification: e.target.value
                      }))
                    }
                    placeholder="e.g. M.Ed, M.A, B.Ed"
                    className="w-full px-4 py-3 rounded-xl bg-dark-card border border-dark-border text-white placeholder:text-dark-muted focus:outline-none focus:border-primary-500"
                    disabled={savingQualification}
                  />
                </div>

                {/* Specialization */}
                <div>
                  <label className="block text-xs font-black text-dark-muted uppercase tracking-wider mb-2">
                    Specialization
                  </label>

                  <input
                    type="text"
                    value={qualificationForm.specialization}
                    onChange={(e) =>
                      setQualificationForm((prev) => ({
                        ...prev,
                        specialization: e.target.value
                      }))
                    }
                    placeholder="e.g. Mathematics"
                    className="w-full px-4 py-3 rounded-xl bg-dark-card border border-dark-border text-white placeholder:text-dark-muted focus:outline-none focus:border-primary-500"
                    disabled={savingQualification}
                  />
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-xs font-black text-dark-muted uppercase tracking-wider mb-2">
                    Total Experience (Years)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={qualificationForm.totalExperience}
                    onChange={(e) =>
                      setQualificationForm((prev) => ({
                        ...prev,
                        totalExperience: e.target.value
                      }))
                    }
                    placeholder="e.g. 5"
                    className="w-full px-4 py-3 rounded-xl bg-dark-card border border-dark-border text-white placeholder:text-dark-muted focus:outline-none focus:border-primary-500"
                    disabled={savingQualification}
                  />
                </div>

              </div>

              {/* Certifications Editor */}
              <div className="mt-5 p-5 bg-dark-hover border border-dark-border rounded-2xl">

                <label className="block text-xs font-black text-dark-muted uppercase tracking-wider mb-2">
                  Certifications
                </label>

                <div className="flex flex-col sm:flex-row gap-2">

                  <input
                    type="text"
                    value={qualificationInput}
                    onChange={(e) =>
                      setQualificationInput(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCertification();
                      }
                    }}
                    placeholder="Enter certification"
                    className="flex-1 px-4 py-3 rounded-xl bg-dark-card border border-dark-border text-white placeholder:text-dark-muted focus:outline-none focus:border-primary-500"
                    disabled={savingQualification}
                  />

                  <button
                    type="button"
                    onClick={addCertification}
                    disabled={savingQualification}
                    className="premium-button-primary"
                  >
                    Add
                  </button>

                </div>

                {qualificationForm.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">

                    {qualificationForm.certifications.map(
                      (certificate, index) => (
                        <span
                          key={`${certificate}-${index}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-bold"
                        >
                          {certificate}

                          <button
                            type="button"
                            onClick={() =>
                              removeCertification(index)
                            }
                            className="text-red-400 hover:text-red-300"
                            disabled={savingQualification}
                          >
                            ×
                          </button>
                        </span>
                      )
                    )}

                  </div>
                )}

              </div>

              {/* Skills Editor */}
              <div className="mt-5 p-5 bg-dark-hover border border-dark-border rounded-2xl">

                <label className="block text-xs font-black text-dark-muted uppercase tracking-wider mb-2">
                  Professional Skills
                </label>

                <div className="flex flex-col sm:flex-row gap-2">

                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) =>
                      setSkillInput(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="Enter skill"
                    className="flex-1 px-4 py-3 rounded-xl bg-dark-card border border-dark-border text-white placeholder:text-dark-muted focus:outline-none focus:border-primary-500"
                    disabled={savingQualification}
                  />

                  <button
                    type="button"
                    onClick={addSkill}
                    disabled={savingQualification}
                    className="premium-button-primary"
                  >
                    Add
                  </button>

                </div>

                {qualificationForm.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">

                    {qualificationForm.skills.map(
                      (skill, index) => (
                        <span
                          key={`${skill}-${index}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-bold"
                        >
                          {skill}

                          <button
                            type="button"
                            onClick={() => removeSkill(index)}
                            className="text-red-400 hover:text-red-300"
                            disabled={savingQualification}
                          >
                            ×
                          </button>
                        </span>
                      )
                    )}

                  </div>
                )}

              </div>

            </>
          )}

        </GlassCard>
      )}

      {/* =====================================================
          PERFORMANCE
      ====================================================== */}
      {activeTab === 'performance' && (
        <GlassCard className="p-8">

          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Award
              size={22}
              className="text-primary-500"
            />
            Performance
          </h2>

          <p className="text-dark-muted text-sm">
            Performance reviews will appear here once the existing
            performance workflow is connected.
          </p>

          <EmptyState
            icon={Award}
            title="No performance records available"
            description="No performance review records are currently connected to this staff profile."
          />

        </GlassCard>
      )}

      {/* =====================================================
          HISTORY
      ====================================================== */}
      {activeTab === 'history' && (
        <GlassCard className="p-8">

          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <History
              size={22}
              className="text-primary-500"
            />
            Staff History
          </h2>

          <p className="text-dark-muted text-sm">
            Staff lifecycle history will appear here when an existing
            history source is available.
          </p>

          <EmptyState
            icon={History}
            title="No staff history records available"
            description="Promotion, transfer and other lifecycle history are not being stored in a new collection at this stage."
          />

        </GlassCard>
      )}

      {/* =====================================================
          LEGACY TIMETABLE ACCESS
          Existing timetable functionality remains accessible
          through Assignment information.
      ====================================================== */}

      {activeTab === 'assignment' && (
        <GlassCard className="p-6">

          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock
              size={18}
              className="text-primary-500"
            />
            Teaching Assignment / Timetable Summary
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="p-4 bg-white/5 border border-dark-border rounded-xl">

              <p className="text-[10px] uppercase font-black text-dark-muted mb-1">
                Assigned Class
              </p>

              <p className="font-bold text-white">
                {staff.assignedClass
                  ? `Class ${staff.assignedClass}${staff.assignedSection
                    ? ` - ${staff.assignedSection}`
                    : ''
                  }`
                  : '—'}
              </p>

            </div>

            <div className="p-4 bg-white/5 border border-dark-border rounded-xl">

              <p className="text-[10px] uppercase font-black text-dark-muted mb-1">
                Total Subjects
              </p>

              <p className="font-bold text-white">
                {staff.subjects?.length || 0} Subjects
              </p>

            </div>

            <div className="p-4 bg-white/5 border border-dark-border rounded-xl">

              <p className="text-[10px] uppercase font-black text-dark-muted mb-1">
                Role
              </p>

              <p className="font-bold text-white">
                {staff.isClassTeacher
                  ? 'Class Teacher'
                  : staff.role || '—'}
              </p>

            </div>

          </div>

        </GlassCard>
      )}

      {showPayslipModal && (selectedPayslipRecord || processedSnapshot) && (
        <PayslipModal
          payslipData={selectedPayslipRecord || processedSnapshot}
          userData={userData}
          onClose={() => {
            setShowPayslipModal(false);
            setSelectedPayslipRecord(null);
          }}
        />
      )}
    </div>
  );
};

export default StaffProfile;