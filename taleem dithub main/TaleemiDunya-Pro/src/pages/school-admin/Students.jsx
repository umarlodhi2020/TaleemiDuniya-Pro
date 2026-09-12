import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  GraduationCap, 
  Phone, 
  Trash2, 
  Edit2, 
  Eye, 
  UploadCloud, 
  MessageSquare, 
  CheckCircle, 
  DollarSign, 
  Bell, 
  AlertCircle, 
  AlertTriangle, 
  Send, 
  Sparkles, 
  X, 
  CheckCheck, 
  Loader2, 
  FileSpreadsheet, 
  Wallet, 
  ExternalLink,
  Receipt,
  Bus,
  FileText,
  Printer
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useNavigate } from 'react-router-dom';
import { getRecords, deleteRecord, updateRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const StudentManager = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = userData?.schoolName || 'TaleemiDunya School';

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingWaId, setSendingWaId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFeeStatus, setFilterFeeStatus] = useState('');
  const [filterArrears, setFilterArrears] = useState('all'); // 'all' | 'has_arrears' | 'no_arrears'
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);

  // Bulk Edit Modal State
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkActiveTab, setBulkActiveTab] = useState('fees'); // 'fees' | 'academic' | 'reminders'
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Bulk Edit Form State
  const [bulkEditForm, setBulkEditForm] = useState({
    // Academic & Status
    class: '',
    section: '',
    status: '',
    
    // Monthly Fee
    monthlyFeeMode: 'no_change', // 'no_change' | 'set' | 'increase' | 'decrease' | 'percent'
    monthlyFeeValue: '',
    
    // Previous Balance (Remainder Arrears / Purana Baqaya)
    arrearsMode: 'no_change', // 'no_change' | 'set' | 'add' | 'reduce' | 'clear'
    arrearsValue: '',
    
    // Admission Fee
    admissionFeeMode: 'no_change', // 'no_change' | 'set' | 'clear'
    admissionFeeValue: '',
    
    // Annual Fund / Fee
    annualFeeMode: 'no_change', // 'no_change' | 'set' | 'clear'
    annualFeeValue: '',

    // Exam Fee
    examFeeMode: 'no_change', // 'no_change' | 'set' | 'clear'
    examFeeValue: '',

    // Other Fee
    otherFeeMode: 'no_change', // 'no_change' | 'set' | 'clear'
    otherFeeValue: '',

    // Transport / Van Fee
    transportFeeMode: 'no_change', // 'no_change' | 'set' | 'clear'
    transportFeeValue: '',

    // Discount
    discountMode: 'no_change', // 'no_change' | 'set' | 'clear'
    discountValue: '',

    // Fee Status & Due Date
    feeStatus: '', // '' | 'Pending' | 'Paid' | 'Defaulter' | 'Partial' | 'Concession'
    feeDueDate: '',
  });

  // Bulk Fee Reminder State
  const [reminderTemplate, setReminderTemplate] = useState('detailed_arrears');
  const [customReminderText, setCustomReminderText] = useState(
    `Assalam-o-Alaikum Respected Parent of *{name}* (Class: {class}, Roll #: {roll_no}).\n\nCurrent Fee Summary:\n💵 Monthly Fee: Rs. {monthly_fee}\n⚠️ Previous Balance (Arrears): Rs. {arrears}\n💰 Total Due: *Rs. {total_due}*\n📅 Due Date: {due_date}\n\nKindly clear the remaining balance at the earliest.\n\n*Administration - {school_name}*`
  );
  const [reminderTargetOnlyDues, setReminderTargetOnlyDues] = useState(true);
  const [reminderDueDate, setReminderDueDate] = useState('10th of this month');
  const [isSendingBulkReminders, setIsSendingBulkReminders] = useState(false);
  const [reminderProgress, setReminderProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [reminderLogs, setReminderLogs] = useState([]);

  // Single Student Reminder Modal State
  const [singleReminderStudent, setSingleReminderStudent] = useState(null);
  const [singleReminderText, setSingleReminderText] = useState('');
  const [isSendingSingleReminder, setIsSendingSingleReminder] = useState(false);

  // Spreadsheet Mode State
  const [isSpreadsheetMode, setIsSpreadsheetMode] = useState(false);
  const [inlineEdits, setInlineEdits] = useState({});
  const [isSavingInline, setIsSavingInline] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [userData]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getRecords('students', schoolId);
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper getters for numerical fees
  const getStudentArrears = (s) => {
    const val = s.balance !== undefined ? Number(s.balance) : (s.arrears !== undefined ? Number(s.arrears) : 0);
    return isNaN(val) ? 0 : val;
  };

  const getStudentMonthlyFee = (s) => {
    // Check all possible field names where monthly fee might be stored
    const val = s.monthlyFee ?? s.tuitionFee ?? s.fee ?? s.monthFee ?? s.monthly ?? s.feeAmount ?? s.classFee ?? 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const getStudentOtherFee = (s) => {
    if (!s) return 0;
    const val = s.otherFee !== undefined ? s.otherFee : (s.otherCharges !== undefined ? s.otherCharges : (s.otherBalance !== undefined ? s.otherBalance : (s.other !== undefined ? s.other : (s.miscFee || 0))));
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const getStudentAdmissionFee = (s) => Number(s.admissionFee || 0) || 0;
  const getStudentAnnualFee = (s) => Number(s.annualFee || 0) || 0;
  const getStudentExamFee = (s) => Number(s.examFee || 0) || 0;
  const getStudentTransportFee = (s) => Number(s.transportFee !== undefined ? s.transportFee : (s.vanFee || 0)) || 0;
  const getStudentDiscount = (s) => Number(s.discount || 0) || 0;

  const getStudentTotalDue = (s) => {
    const monthly = getStudentMonthlyFee(s);
    const arrears = getStudentArrears(s);
    const admission = getStudentAdmissionFee(s);
    const annual = getStudentAnnualFee(s);
    const exam = getStudentExamFee(s);
    const other = getStudentOtherFee(s);
    const transport = getStudentTransportFee(s);
    const discount = getStudentDiscount(s);
    return Math.max(0, monthly + arrears + admission + annual + exam + other + transport - discount);
  };

  // Helper: Generate WhatsApp Reminder message
  const generateReminderMessage = (student, templateKey = reminderTemplate, dueDate = reminderDueDate, customText = customReminderText) => {
    const monthly = getStudentMonthlyFee(student);
    const arrears = getStudentArrears(student);
    const discount = getStudentDiscount(student);
    const otherCharges = getStudentAdmissionFee(student) + getStudentAnnualFee(student) + getStudentExamFee(student) + getStudentOtherFee(student) + getStudentTransportFee(student);
    const totalDue = getStudentTotalDue(student);

    const sName = student.name || 'Student';
    const sFather = student.fatherName || 'Parent';
    const sRoll = student.rollNumber || 'N/A';
    const sClass = student.class || 'N/A';
    const sPhone = student.phone || student.parentPhone || '';

    if (templateKey === 'detailed_arrears') {
      return `📢 *FEE & BALANCE REMINDER*\n*${schoolName}*\n\nRespected Parent of *${sName}* (Class: ${sClass}, Roll #: ${sRoll}, Father: ${sFather}).\n\nCurrent Fee Breakdown:\n💵 *Monthly Tuition Fee:* Rs. ${monthly.toLocaleString()}\n⚠️ *Previous Balance / Arrears:* Rs. ${arrears.toLocaleString()}\n${otherCharges > 0 ? `📦 *Other Charges / Funds:* Rs. ${otherCharges.toLocaleString()}\n` : ''}${discount > 0 ? `🎁 *Discount / Concession:* -Rs. ${discount.toLocaleString()}\n` : ''}━━━━━━━━━━━━━━━━━━━━\n💰 *TOTAL PAYABLE DUE:* *Rs. ${totalDue.toLocaleString()}*\n📅 *Due Date:* ${dueDate}\n\nKindly deposit the outstanding fees at the school accounts office or via online portal before the due date. Thank you for your cooperation!\n\n*Regards,*\n*Accounts & Administration - ${schoolName}*`;
    }

    if (templateKey === 'polite_monthly') {
      return `Assalam-o-Alaikum Respected Parent of *${sName}* (Class: ${sClass}, Roll #: ${sRoll}).\n\nThis is a gentle reminder that the fee dues for *${sName}* amounting to *Rs. ${totalDue.toLocaleString()}* (including previous balance of Rs. ${arrears.toLocaleString()}) are payable by *${dueDate}*.\n\nPlease submit at the school accounts office. Thank you!\n*${schoolName}*`;
    }

    if (templateKey === 'final_warning') {
      return `🚨 *FINAL NOTICE: OVERDUE FEE BALANCE*\n*${schoolName}*\n\nDear Parent of *${sName}* (Class: ${sClass}, Roll #: ${sRoll}),\n\nOur records show an overdue balance of *Rs. ${totalDue.toLocaleString()}* (Previous Balance: Rs. ${arrears.toLocaleString()}). Despite earlier communications, this amount remains pending.\n\nPlease clear the balance within 3 working days to ensure uninterrupted academic services.\n\n*Accounts Office - ${schoolName}*`;
    }

    if (templateKey === 'custom') {
      let text = customText || '';
      text = text.replaceAll('{name}', sName);
      text = text.replaceAll('{father_name}', sFather);
      text = text.replaceAll('{roll_no}', sRoll);
      text = text.replaceAll('{class}', sClass);
      text = text.replaceAll('{monthly_fee}', monthly.toLocaleString());
      text = text.replaceAll('{arrears}', arrears.toLocaleString());
      text = text.replaceAll('{discount}', discount.toLocaleString());
      text = text.replaceAll('{total_due}', totalDue.toLocaleString());
      text = text.replaceAll('{due_date}', dueDate);
      text = text.replaceAll('{school_name}', schoolName);
      text = text.replaceAll('{phone}', sPhone);
      return text;
    }

    return `Assalam-o-Alaikum Respected Parent of *${sName}*. Total fee balance is Rs. ${totalDue.toLocaleString()}. - *${schoolName}*`;
  };

  // WhatsApp API send
  const sendWhatsAppApi = async (cleanPhone, messageText) => {
    let res = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId, phone: cleanPhone, message: messageText })
    });
    let data = await res.json();
    if (!data.success && (schoolId && schoolId !== 'default_school')) {
      res = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: 'default_school', phone: cleanPhone, message: messageText })
      });
      data = await res.json();
    }
    return data;
  };

  const handleSendStudentWhatsApp = async (student) => {
    const cleanPhone = (student.phone || student.parentPhone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert('Please update student profile with a valid WhatsApp phone number.');
      return;
    }
    const messageText = `Assalam-o-Alaikum Respected Parent of *${student.name}* (Roll: ${student.rollNumber || 'N/A'}, Grade: ${student.class || 'N/A'}).\n\nThis is an official communication from *${schoolName}*. Please check your Parent Portal for attendance logs and fee records.\n\nThank you!\n*Administration - ${schoolName}*`;

    setSendingWaId(student.id || 'temp');
    try {
      const data = await sendWhatsAppApi(cleanPhone, messageText);
      if (data.success && data.results?.[0]?.status === 'sent') {
        alert(`✅ Official Notice sent to ${student.name}'s parent (${cleanPhone})!`);
      } else {
        const fallback = window.confirm(`ℹ️ WhatsApp Cloud Server (${data.error || 'Session offline'}).\n\nOpen WhatsApp Web to send directly?`);
        if (fallback) window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`, '_blank');
      }
    } catch {
      const fallback = window.confirm(`🌐 WhatsApp Server offline. Open WhatsApp Web to send directly?`);
      if (fallback) window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`, '_blank');
    } finally {
      setSendingWaId(null);
    }
  };

  // Open single student fee reminder modal
  const handleOpenSingleFeeReminder = (student) => {
    setSingleReminderStudent(student);
    setSingleReminderText(generateReminderMessage(student, 'detailed_arrears', reminderDueDate));
  };

  const handleSendSingleFeeReminder = async () => {
    if (!singleReminderStudent) return;
    const cleanPhone = (singleReminderStudent.phone || singleReminderStudent.parentPhone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert('Student does not have a valid mobile/WhatsApp number.');
      return;
    }

    setIsSendingSingleReminder(true);
    try {
      const data = await sendWhatsAppApi(cleanPhone, singleReminderText);
      if (data.success && data.results?.[0]?.status === 'sent') {
        alert(`✅ Fee Reminder successfully delivered to ${singleReminderStudent.name}'s parent (${cleanPhone})!`);
        setSingleReminderStudent(null);
      } else {
        const fallback = window.confirm(`ℹ️ WhatsApp Cloud Bot (${data.error || 'Session offline'}).\n\nOpen WhatsApp Web to send directly?`);
        if (fallback) {
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(singleReminderText)}`, '_blank');
          setSingleReminderStudent(null);
        }
      }
    } catch {
      const fallback = window.confirm(`🌐 WhatsApp Cloud Bot unreachable. Open WhatsApp Web to send directly?`);
      if (fallback) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(singleReminderText)}`, '_blank');
        setSingleReminderStudent(null);
      }
    } finally {
      setIsSendingSingleReminder(false);
    }
  };

  // Bulk WhatsApp fee reminders
  const handleSendBulkFeeReminders = async () => {
    const targetStudents = students.filter(s => selectedIds.includes(s.id));
    if (targetStudents.length === 0) {
      alert('Please select at least one student.');
      return;
    }

    const eligibleStudents = reminderTargetOnlyDues 
      ? targetStudents.filter(s => getStudentTotalDue(s) > 0)
      : targetStudents;

    if (eligibleStudents.length === 0) {
      alert('None of the selected students have pending fees / balance (> Rs. 0).');
      return;
    }

    if (!window.confirm(`Send WhatsApp Fee Reminders to ${eligibleStudents.length} student parents?`)) return;

    setIsSendingBulkReminders(true);
    setReminderProgress({ current: 0, total: eligibleStudents.length, success: 0, failed: 0 });
    setReminderLogs([]);

    let successCount = 0;
    let failCount = 0;
    const logs = [];

    for (let i = 0; i < eligibleStudents.length; i++) {
      const st = eligibleStudents[i];
      const cleanPhone = (st.phone || st.parentPhone || '').replace(/[^0-9]/g, '');
      const msg = generateReminderMessage(st, reminderTemplate, reminderDueDate, customReminderText);
      
      setReminderProgress({ current: i + 1, total: eligibleStudents.length, success: successCount, failed: failCount });

      if (!cleanPhone || cleanPhone.length < 10) {
        failCount++;
        logs.push({ name: st.name, roll: st.rollNumber, phone: 'Missing', status: 'failed', error: 'Invalid phone' });
        continue;
      }

      try {
        const res = await sendWhatsAppApi(cleanPhone, msg);
        if (res.success && res.results?.[0]?.status === 'sent') {
          successCount++;
          logs.push({ name: st.name, roll: st.rollNumber, phone: cleanPhone, status: 'sent', message: msg });
        } else {
          failCount++;
          logs.push({ name: st.name, roll: st.rollNumber, phone: cleanPhone, status: 'failed', error: res.error || 'Failed', message: msg });
        }
      } catch (err) {
        failCount++;
        logs.push({ name: st.name, roll: st.rollNumber, phone: cleanPhone, status: 'failed', error: err.message, message: msg });
      }

      await new Promise(r => setTimeout(r, 350));
    }

    setReminderProgress({ current: eligibleStudents.length, total: eligibleStudents.length, success: successCount, failed: failCount });
    setReminderLogs(logs);
    setIsSendingBulkReminders(false);
  };

  // Delete student
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteRecord('students', id);
        setStudents(students.filter(s => s.id !== id));
        setSelectedIds(prev => prev.filter(x => x !== id));
      } catch (error) {
        console.error("Error deleting student:", error);
      }
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const q = (searchTerm || '').toLowerCase().trim();
      const matchSearch = !q || (
        String(student.name || '').toLowerCase().includes(q) ||
        String(student.rollNumber || '').toLowerCase().includes(q) ||
        String(student.class || '').toLowerCase().includes(q) ||
        String(student.section || '').toLowerCase().includes(q) ||
        String(student.fatherName || '').toLowerCase().includes(q) ||
        String(student.phone || '').toLowerCase().includes(q) ||
        String(student.id || '').toLowerCase().includes(q)
      );

      const matchClass = !filterClass || student.class === filterClass;
      const matchStatus = !filterStatus || student.status === filterStatus;
      const matchFeeStatus = !filterFeeStatus || student.feeStatus === filterFeeStatus;

      let matchArrears = true;
      const arr = getStudentArrears(student);
      if (filterArrears === 'has_arrears') matchArrears = arr > 0;
      else if (filterArrears === 'no_arrears') matchArrears = arr === 0;

      return matchSearch && matchClass && matchStatus && matchFeeStatus && matchArrears;
    }).sort((a, b) => {
      const fA = (a.fatherName || '').toLowerCase();
      const fB = (b.fatherName || '').toLowerCase();
      if (fA < fB) return -1;
      if (fA > fB) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [students, searchTerm, filterClass, filterStatus, filterFeeStatus, filterArrears]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const selectAllWithArrears = () => {
    const withArrears = filteredStudents.filter(s => getStudentArrears(s) > 0 || getStudentTotalDue(s) > 0).map(s => s.id);
    if (withArrears.length === 0) {
      alert("No students found with pending balance or arrears in the current view.");
      return;
    }
    setSelectedIds(withArrears);
  };

  // Bulk Edit Form Submission Handler (Supports ALL Fee Fields)
  const handleBulkEditSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      alert("No students selected.");
      return;
    }

    const { 
      class: newClass, 
      section: newSection, 
      status: newStatus,
      monthlyFeeMode, monthlyFeeValue,
      arrearsMode, arrearsValue,
      admissionFeeMode, admissionFeeValue,
      annualFeeMode, annualFeeValue,
      examFeeMode, examFeeValue,
      otherFeeMode, otherFeeValue,
      transportFeeMode, transportFeeValue,
      discountMode, discountValue,
      feeStatus, feeDueDate
    } = bulkEditForm;

    const hasAnyChange = Boolean(
      newClass || newSection || newStatus ||
      monthlyFeeMode !== 'no_change' ||
      arrearsMode !== 'no_change' ||
      admissionFeeMode !== 'no_change' ||
      annualFeeMode !== 'no_change' ||
      examFeeMode !== 'no_change' ||
      otherFeeMode !== 'no_change' ||
      transportFeeMode !== 'no_change' ||
      discountMode !== 'no_change' ||
      feeStatus || feeDueDate
    );

    if (!hasAnyChange) {
      alert("Please specify at least one field or fee adjustment to update.");
      return;
    }

    if (!window.confirm(`Are you sure you want to bulk update ${selectedIds.length} selected students?`)) return;

    setIsBulkUpdating(true);
    try {
      const updatedList = [...students];

      for (const id of selectedIds) {
        const student = students.find(s => s.id === id);
        if (!student) continue;

        const updates = {};

        // 1. Academic & Status
        if (newClass) updates.class = newClass;
        if (newSection) updates.section = newSection;
        if (newStatus) updates.status = newStatus;

        // 2. Monthly Fee
        const curMonthly = getStudentMonthlyFee(student);
        const mVal = Number(monthlyFeeValue || 0);
        if (monthlyFeeMode === 'set') {
          updates.monthlyFee = Math.max(0, mVal);
          updates.tuitionFee = Math.max(0, mVal);
        } else if (monthlyFeeMode === 'increase') {
          updates.monthlyFee = Math.max(0, curMonthly + mVal);
          updates.tuitionFee = updates.monthlyFee;
        } else if (monthlyFeeMode === 'decrease') {
          updates.monthlyFee = Math.max(0, curMonthly - mVal);
          updates.tuitionFee = updates.monthlyFee;
        } else if (monthlyFeeMode === 'percent') {
          updates.monthlyFee = Math.max(0, Math.round(curMonthly * (1 + mVal / 100)));
          updates.tuitionFee = updates.monthlyFee;
        }

        // 3. Previous Balance / Arrears (Syncs balance & arrears)
        const curArrears = getStudentArrears(student);
        const aVal = Number(arrearsValue || 0);
        if (arrearsMode === 'set') {
          updates.balance = Math.max(0, aVal);
          updates.arrears = updates.balance;
        } else if (arrearsMode === 'add') {
          updates.balance = Math.max(0, curArrears + aVal);
          updates.arrears = updates.balance;
        } else if (arrearsMode === 'reduce') {
          updates.balance = Math.max(0, curArrears - aVal);
          updates.arrears = updates.balance;
        } else if (arrearsMode === 'clear') {
          updates.balance = 0;
          updates.arrears = 0;
        }

        // 4. Admission Fee
        if (admissionFeeMode === 'set') updates.admissionFee = Math.max(0, Number(admissionFeeValue || 0));
        else if (admissionFeeMode === 'clear') updates.admissionFee = 0;

        // 5. Annual Fee / Fund
        if (annualFeeMode === 'set') updates.annualFee = Math.max(0, Number(annualFeeValue || 0));
        else if (annualFeeMode === 'clear') updates.annualFee = 0;

        // 6. Exam Fee
        if (examFeeMode === 'set') updates.examFee = Math.max(0, Number(examFeeValue || 0));
        else if (examFeeMode === 'clear') updates.examFee = 0;

        // 7. Other Fee
        if (otherFeeMode === 'set') updates.otherFee = Math.max(0, Number(otherFeeValue || 0));
        else if (otherFeeMode === 'clear') updates.otherFee = 0;

        // 8. Transport / Van Fee
        if (transportFeeMode === 'set') {
          updates.transportFee = Math.max(0, Number(transportFeeValue || 0));
          updates.vanFee = updates.transportFee;
        } else if (transportFeeMode === 'clear') {
          updates.transportFee = 0;
          updates.vanFee = 0;
        }

        // 9. Discount
        if (discountMode === 'set') updates.discount = Math.max(0, Number(discountValue || 0));
        else if (discountMode === 'clear') updates.discount = 0;

        // 10. Fee Status & Due Date
        if (feeStatus) updates.feeStatus = feeStatus;
        if (feeDueDate) updates.feeDueDate = feeDueDate;

        await updateRecord('students', id, updates);

        const idx = updatedList.findIndex(s => s.id === id);
        if (idx !== -1) updatedList[idx] = { ...updatedList[idx], ...updates };
      }

      setStudents(updatedList);
      setIsBulkEditOpen(false);
      alert(`🎉 Successfully updated ${selectedIds.length} students with fee adjustments!`);
    } catch (err) {
      console.error(err);
      alert("Error occurred during bulk update.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Spreadsheet Inline Edit Handler
  const handleInlineChange = (id, field, value) => {
    setInlineEdits(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  // Save All Spreadsheet Inline Edits
  const saveInlineEdits = async () => {
    const editIds = Object.keys(inlineEdits);
    if (editIds.length === 0) {
      setIsSpreadsheetMode(false);
      return;
    }

    setIsSavingInline(true);
    try {
      const updatedList = [...students];
      for (const id of editIds) {
        const edits = inlineEdits[id];
        const updates = { ...edits };

        // Parse numerical fields safely
        if (updates.monthlyFee !== undefined) {
          updates.monthlyFee = Number(updates.monthlyFee) || 0;
          updates.tuitionFee = updates.monthlyFee;
        }
        if (updates.balance !== undefined) {
          updates.balance = Number(updates.balance) || 0;
          updates.arrears = updates.balance;
        }
        if (updates.admissionFee !== undefined) updates.admissionFee = Number(updates.admissionFee) || 0;
        if (updates.annualFee !== undefined) updates.annualFee = Number(updates.annualFee) || 0;
        if (updates.examFee !== undefined) updates.examFee = Number(updates.examFee) || 0;
        if (updates.otherFee !== undefined) updates.otherFee = Number(updates.otherFee) || 0;
        if (updates.transportFee !== undefined) {
          updates.transportFee = Number(updates.transportFee) || 0;
          updates.vanFee = updates.transportFee;
        }
        if (updates.discount !== undefined) updates.discount = Number(updates.discount) || 0;

        await updateRecord('students', id, updates);

        const idx = updatedList.findIndex(s => s.id === id);
        if (idx !== -1) updatedList[idx] = { ...updatedList[idx], ...updates };
      }

      setStudents(updatedList);
      setInlineEdits({});
      setIsSpreadsheetMode(false);
      alert('✅ All spreadsheet fee and student records saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving spreadsheet changes.');
    } finally {
      setIsSavingInline(false);
    }
  };

  // Metrics
  const totalArrearsSum = useMemo(() => students.reduce((sum, s) => sum + getStudentArrears(s), 0), [students]);
  const totalMonthlyFeeSum = useMemo(() => students.filter(s => s.status === 'Active').reduce((sum, s) => sum + getStudentMonthlyFee(s), 0), [students]);
  const arrearsDefaultersCount = useMemo(() => students.filter(s => getStudentArrears(s) > 0).length, [students]);
  const existingClasses = useMemo(() => [...new Set(students.map(s => s.class).filter(Boolean))], [students]);
  const sampleSelectedStudent = useMemo(() => {
    if (selectedIds.length === 0) return students[0] || null;
    return students.find(s => selectedIds.includes(s.id)) || students[0] || null;
  }, [students, selectedIds]);

  // Print Blank Monthly Fee Collection Register (matches exact printed format)
  const handlePrintBlankRegister = () => {
    const d = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const curMonth = monthNames[d.getMonth()];
    const curYear = d.getFullYear();
    const shortMonth = `${curMonth.substring(0, 3)} ${curYear}`;
    const title = `MONTHLY FEE COLLECTION REGISTER (BLANK) - ${curMonth} ${curYear}`;

    // Group filtered/all students by unique family key
    const grouped = {};
    const list = filteredStudents.length > 0 ? filteredStudents : students;
    list.forEach(student => {
      const fname = (student.fatherName || 'Unknown').trim().toLowerCase().replace(/\s+/g, '_');
      const phone = String(student.parentPhone || student.fatherPhone || student.phone || '').replace(/[^0-9]/g, '');
      const cnic = String(student.fatherCnic || '').replace(/[^0-9]/g, '');
      const isDummyPhone = phone === '00000000000' || phone === '1234567890';
      
      let key = '';
      if (student.familyId) {
        // familyId is unique per family — ALWAYS use it as top priority
        key = `family_${student.familyId}`;
      } else if (cnic.length >= 13) {
        key = `family_${fname}_cnic_${cnic}`;
      } else if (phone.length >= 10 && !isDummyPhone) {
        key = `family_${fname}_phone_${phone}`;
      } else {
        key = `student_${student.id}`;
      }
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(student);
    });

    const sortedFamilyKeys = Object.keys(grouped).sort((a, b) => {
      const nameA = (grouped[a][0].fatherName || '').toLowerCase();
      const nameB = (grouped[b][0].fatherName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    let sr = 1;
    let rowsHtml = '';
    let grandPayOnDueDate = 0;

    sortedFamilyKeys.forEach(familyKey => {
      const familyRows = grouped[familyKey];
      const rowspan = familyRows.length;
      
      const familyMonthFee = familyRows.reduce((sum, s) => sum + getStudentMonthlyFee(s), 0);
      const familyPreBalance = familyRows.reduce((sum, s) => sum + getStudentArrears(s), 0);
      const familyOther = familyRows.reduce((sum, s) => sum + getStudentOtherFee(s) + getStudentTransportFee(s) + getStudentExamFee(s) + getStudentAnnualFee(s) + getStudentAdmissionFee(s), 0);
      const familyDiscount = familyRows.reduce((sum, s) => sum + getStudentDiscount(s), 0);
      const familyPayOnDueDate = Math.max(0, familyMonthFee + familyPreBalance + familyOther - familyDiscount);

      grandPayOnDueDate += familyPayOnDueDate;

      familyRows.forEach((s, index) => {
        const isFirst = index === 0;
        const sAdmissionAnnual = getStudentAnnualFee(s) + getStudentAdmissionFee(s);
        const gr = s.admissionNumber || s.rollNo || s.grNo || s.grNumber || s.rollNumber || '-';

        rowsHtml += `<tr>
          <td style="text-align:center;">${sr++}</td>
          <td style="text-align:center; font-family:monospace;">${gr}</td>
          <td style="font-weight:600; text-align:left;">${s.name || '-'}</td>
          ${isFirst ? `<td rowspan="${rowspan}" style="text-align:left; vertical-align:middle; font-weight:500;">${s.fatherName || '-'}</td>` : ''}
          <td style="text-align:center;">${s.class || '-'}</td>
          <td style="text-align:center;">${getStudentMonthlyFee(s) > 0 ? Math.round(getStudentMonthlyFee(s)).toLocaleString() : '0'}</td>
          ${isFirst ? `<td rowspan="${rowspan}" class="thick-border bold-text" style="text-align:center; vertical-align:middle;">${familyMonthFee > 0 ? Math.round(familyMonthFee).toLocaleString() : '0'}</td>` : ''}
          ${isFirst ? `<td rowspan="${rowspan}" class="bg-blue bold-text" style="text-align:center; vertical-align:middle;">${familyPreBalance > 0 ? Math.round(familyPreBalance).toLocaleString() : '0'}</td>` : ''}
          ${isFirst ? `<td rowspan="${rowspan}" class="thick-border-left bold-text" style="text-align:center; vertical-align:middle;">${familyOther > 0 ? Math.round(familyOther).toLocaleString() : '0'}</td>` : ''}
          ${isFirst ? `<td rowspan="${rowspan}" class="bg-green thick-border bold-text" style="text-align:center; vertical-align:middle;">${familyPayOnDueDate > 0 ? Math.round(familyPayOnDueDate).toLocaleString() : '0'}</td>` : ''}
          ${isFirst ? `<td rowspan="${rowspan}" class="bold-text" style="text-align:center; vertical-align:middle;"></td>` : ''}
          ${isFirst ? `<td rowspan="${rowspan}" class="thick-border-left bold-text" style="text-align:center; vertical-align:middle;"></td>` : ''}
        </tr>`;
      });
    });

    const totalsHtml = `
      <tr style="background:#f8fafc; font-weight:bold;">
        <td colspan="9" style="text-align:right; font-weight:bold; padding-right:15px; border:2px solid #000;">GRAND TOTAL</td>
        <td class="bg-green thick-border bold-text" style="text-align:center;">${grandPayOnDueDate > 0 ? Math.round(grandPayOnDueDate).toLocaleString() : '0'}</td>
        <td class="bold-text" style="text-align:center;"></td>
        <td class="thick-border-left bold-text" style="text-align:center;"></td>
      </tr>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 15px; }
          h1 { font-size: 17px; text-align: center; font-weight: bold; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
          th { background: #f0f0f0; padding: 5px 4px; border: 1px solid #000; text-align: center; font-size: 10px; font-weight: bold; }
          td { font-size: 10px; border: 1px solid #000; padding: 4px 5px; }
          .thick-border { border: 2px solid #000 !important; }
          .thick-border-left { border-left: 2px solid #000 !important; }
          .bg-blue { background-color: #d9edf7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-green { background-color: #dff0d8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bold-text { font-weight: bold; }
          @media print { 
            body { padding: 10px; }
            .bg-blue { background-color: #d9edf7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .bg-green { background-color: #dff0d8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>
              <th style="width: 3%;">SR#</th>
              <th style="width: 5%;">GR#</th>
              <th style="width: 14%; text-align: left;">Name</th>
              <th style="width: 14%; text-align: left;">Father Name</th>
              <th style="width: 5%;">Class</th>
              <th style="width: 5%;">A.<br>Fee</th>
              <th class="thick-border" style="width: 7%;">${shortMonth}</th>
              <th class="bg-blue" style="width: 7%;">Pre.<br>Balance</th>
              <th class="thick-border-left" style="width: 5%;">Other</th>
              <th class="bg-green thick-border" style="width: 8%;">Pay on Due<br>Date</th>
              <th style="width: 6%; color: #c00;">Paid</th>
              <th class="thick-border-left" style="width: 8%; color: #c00;">Total<br>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            ${totalsHtml}
          </tbody>
        </table>
        <div style="margin-top:35px; display:flex; justify-content:space-between; padding:0 20px;">
          <div><div style="width:160px; border-bottom:1px solid #000; margin-bottom:4px;"></div><span style="font-size:11px; font-weight:bold;">Accountant Signature</span></div>
          <div><div style="width:160px; border-bottom:1px solid #000; margin-bottom:4px;"></div><span style="font-size:11px; font-weight:bold;">Principal Signature</span></div>
        </div>
        <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  return (
    <div className="space-y-6 animate-fade-in text-dark-text pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP HEADER & CONTROLS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <GraduationCap className="text-primary-400" size={32} />
              Student Manager
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20">
              {students.length} Enrolled
            </span>
          </div>
          <p className="text-dark-muted text-sm mt-1">
            Manage student records, monthly fee packages, previous balances (arrears), admission/annual funds, and bulk reminders.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={handlePrintBlankRegister} 
            className="premium-button-secondary text-xs font-bold flex items-center gap-1.5 shadow-sm"
            title="Print Monthly Fee Collection Register (Blank Sheet)"
          >
            <Printer size={15} className="text-primary-400" />
            Blank Register
          </button>

          <button 
            onClick={() => navigate('/school-admin/import')} 
            className="premium-button-secondary text-xs font-bold"
          >
            <UploadCloud size={16} />
            Import Excel
          </button>
          
          <button 
            onClick={() => {
              if (isSpreadsheetMode) {
                saveInlineEdits();
              } else {
                setIsSpreadsheetMode(true);
              }
            }}
            disabled={isSavingInline}
            className={`premium-button-primary text-xs font-bold ${
              isSpreadsheetMode ? '!bg-green-600 hover:!bg-green-700 !border-green-500' : '!bg-indigo-600 hover:!bg-indigo-700'
            }`}
          >
            {isSavingInline ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Saving...
              </span>
            ) : isSpreadsheetMode ? (
              <span className="flex items-center gap-2">
                <CheckCircle size={16} /> Save All Changes ({Object.keys(inlineEdits).length})
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileSpreadsheet size={16} /> Spreadsheet Mode
              </span>
            )}
          </button>

          {isSpreadsheetMode && (
            <button 
              onClick={() => {
                setIsSpreadsheetMode(false);
                setInlineEdits({});
              }}
              className="premium-button-secondary !bg-red-500/10 !text-red-400 !border-red-500/20 hover:!bg-red-500/20 text-xs font-bold"
            >
              Cancel
            </button>
          )}

          {!isSpreadsheetMode && (
            <button 
              onClick={() => navigate('/school-admin/students/add')}
              className="premium-button-primary text-xs font-bold shadow-lg shadow-primary-500/20"
            >
              <Plus size={18} />
              Add Student
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. METRIC STATS CARDS
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5 border-l-4 border-l-primary-500 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-dark-muted">Total Students</p>
            <h3 className="text-2xl font-black text-white mt-1">{students.length}</h3>
            <span className="text-[11px] text-primary-400 font-medium">All Classes &amp; Sections</span>
          </div>
          <div className="p-3 bg-primary-500/10 rounded-2xl border border-primary-500/20 text-primary-400">
            <GraduationCap size={24} />
          </div>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-dark-muted">Active Students</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">
              {students.filter(s => s.status === 'Active').length}
            </h3>
            <span className="text-[11px] text-dark-muted font-medium">
              {students.filter(s => s.status === 'Left').length} Left / Withdrawn
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
            <CheckCircle size={24} />
          </div>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-rose-500 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-rose-400">Previous Balance</p>
              <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 text-[10px] font-bold rounded">
                {arrearsDefaultersCount} Students
              </span>
            </div>
            <h3 className="text-2xl font-black text-rose-400 mt-1">
              Rs. {totalArrearsSum.toLocaleString()}
            </h3>
            <span className="text-[11px] text-dark-muted font-medium">Total Unpaid Arrears</span>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-400">
            <AlertTriangle size={24} />
          </div>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-purple-500 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-dark-muted">Monthly Fee Base</p>
            <h3 className="text-2xl font-black text-purple-400 mt-1">
              Rs. {totalMonthlyFeeSum.toLocaleString()}
            </h3>
            <span className="text-[11px] text-purple-300/80 font-medium">Expected Active Monthly</span>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400">
            <Wallet size={24} />
          </div>
        </GlassCard>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN TABLE & SPREADSHEET VIEW
         ───────────────────────────────────────────────────────────── */}
      <GlassCard className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search by student name, roll number, class, father name, or mobile phone..." 
              className="w-full premium-input pl-11 text-sm bg-dark-bg/60"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isSpreadsheetMode}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {arrearsDefaultersCount > 0 && !isSpreadsheetMode && (
              <button
                type="button"
                onClick={selectAllWithArrears}
                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Select all students with previous balance / arrears"
              >
                <AlertCircle size={14} />
                Select Defaulters ({arrearsDefaultersCount})
              </button>
            )}

            {selectedIds.length > 0 && !isSpreadsheetMode && (
              <div className="flex items-center gap-2 animate-fade-in">
                <button 
                  onClick={() => {
                    setBulkActiveTab('fees');
                    setIsBulkEditOpen(true);
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all"
                >
                  <Edit2 size={14} />
                  Bulk Edit ({selectedIds.length})
                </button>

                <button 
                  onClick={() => {
                    setBulkActiveTab('reminders');
                    setIsBulkEditOpen(true);
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
                >
                  <MessageSquare size={14} />
                  Fee Reminders ({selectedIds.length})
                </button>

                <button 
                  onClick={() => setSelectedIds([])}
                  className="p-2 text-dark-muted hover:text-white rounded-lg hover:bg-dark-hover transition-colors"
                  title="Deselect All"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                showFilters 
                  ? 'bg-primary-500/20 border-primary-500 text-primary-400' 
                  : 'bg-dark-hover border-dark-border text-dark-muted hover:text-white'
              }`}
            >
              <Filter size={14} />
              Filter Records
            </button>
          </div>
        </div>

        {/* Filter Dropdown Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 p-4 bg-dark-bg/40 rounded-2xl border border-dark-border animate-fade-in">
            <div>
              <label className="block text-[10px] font-black text-dark-muted mb-1.5 uppercase tracking-wider">Class</label>
              <select 
                value={filterClass} 
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full premium-input text-xs"
              >
                <option value="">All Classes ({existingClasses.length})</option>
                {existingClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-dark-muted mb-1.5 uppercase tracking-wider">Student Status</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full premium-input text-xs"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Left">Left / Withdrawn</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-dark-muted mb-1.5 uppercase tracking-wider">Fee Status</label>
              <select 
                value={filterFeeStatus} 
                onChange={(e) => setFilterFeeStatus(e.target.value)}
                className="w-full premium-input text-xs"
              >
                <option value="">All Fee Statuses</option>
                <option value="Pending">Pending (واجب الادا)</option>
                <option value="Paid">Paid (ادا شدہ)</option>
                <option value="Defaulter">Defaulter (بقایا دار)</option>
                <option value="Partial">Partial (جزوی)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-dark-muted mb-1.5 uppercase tracking-wider">Previous Balance</label>
              <select 
                value={filterArrears} 
                onChange={(e) => setFilterArrears(e.target.value)}
                className="w-full premium-input text-xs"
              >
                <option value="all">All Records</option>
                <option value="has_arrears">⚠️ Has Previous Balance (&gt; Rs. 0)</option>
                <option value="no_arrears">✅ Zero Balance (Clear)</option>
              </select>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="border border-dark-border/60 rounded-2xl overflow-hidden bg-dark-bg/40">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dark-border bg-dark-bg/90 text-dark-muted text-[10px] uppercase tracking-wider font-black">
                  {!isSpreadsheetMode && (
                    <th className="py-2.5 px-2 w-8 text-center">
                      <input 
                        type="checkbox" 
                        checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded border-dark-border bg-dark-hover text-primary-500 focus:ring-primary-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="py-2.5 px-2">Student Name</th>
                  <th className="py-2.5 px-1.5 text-center">Roll #</th>
                  <th className="py-2.5 px-2">Class (Sec)</th>
                  <th className="py-2.5 px-2">Father Name</th>
                  <th className="py-2.5 px-2">Mobile No</th>
                  <th className="py-2.5 px-2">Monthly Fee</th>
                  <th className="py-2.5 px-2">Prev. Balance</th>
                  
                  {/* SPREADSHEET EXTRA COLUMNS */}
                  {isSpreadsheetMode ? (
                    <>
                      <th className="py-2 px-1">Admission</th>
                      <th className="py-2 px-1">Annual</th>
                      <th className="py-2 px-1">Exam</th>
                      <th className="py-2 px-1">Other</th>
                      <th className="py-2 px-1">Van</th>
                      <th className="py-2 px-1">Discount</th>
                    </>
                  ) : (
                    <th className="py-2.5 px-2">Other Dues</th>
                  )}

                  <th className="py-2.5 px-2 text-center">Fee Status</th>
                  {!isSpreadsheetMode && <th className="py-2.5 px-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40">
                {filteredStudents.map((student) => {
                  const isEdited = inlineEdits[student.id] !== undefined;
                  const s = { ...student, ...(inlineEdits[student.id] || {}) };
                  const monthlyFeeNum = getStudentMonthlyFee(s);
                  const arrearsNum = getStudentArrears(s);
                  const admissionNum = getStudentAdmissionFee(s);
                  const annualNum = getStudentAnnualFee(s);
                  const examNum = getStudentExamFee(s);
                  const otherNum = getStudentOtherFee(s);
                  const transportNum = getStudentTransportFee(s);
                  const discountNum = getStudentDiscount(s);
                  const otherTotal = admissionNum + annualNum + examNum + otherNum + transportNum;
                  const isSelected = selectedIds.includes(student.id);

                  return (
                    <tr 
                      key={student.id} 
                      className={`group hover:bg-white/[0.03] transition-all ${
                        isSelected || isEdited ? 'bg-primary-500/[0.07]' : ''
                      }`}
                    >
                      {!isSpreadsheetMode && (
                        <td className="py-2 px-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelect(student.id)}
                            className="w-3.5 h-3.5 rounded border-dark-border bg-dark-hover text-primary-500 focus:ring-primary-500 cursor-pointer"
                          />
                        </td>
                      )}
                      
                      {/* SPREADSHEET INLINE EDIT ROW */}
                      {isSpreadsheetMode ? (
                        <>
                          <td className="py-1 px-1">
                            <input 
                              type="text" 
                              value={s.name || ''} 
                              onChange={(e) => handleInlineChange(student.id, 'name', e.target.value)} 
                              className="w-28 bg-dark-bg border border-dark-border rounded px-1.5 py-0.5 text-xs focus:border-primary-500 outline-none text-white font-medium" 
                            />
                          </td>
                          <td className="py-1 px-1">
                            <input 
                              type="text" 
                              value={s.rollNumber || ''} 
                              onChange={(e) => handleInlineChange(student.id, 'rollNumber', e.target.value)} 
                              className="w-12 bg-dark-bg border border-dark-border rounded px-1 py-0.5 text-xs font-mono text-primary-400 focus:border-primary-500 outline-none text-center" 
                            />
                          </td>
                          <td className="py-1 px-1">
                            <div className="flex items-center gap-1">
                              <input 
                                type="text" 
                                value={s.class || ''} 
                                onChange={(e) => handleInlineChange(student.id, 'class', e.target.value)} 
                                className="w-14 bg-dark-bg border border-dark-border rounded px-1 py-0.5 text-xs focus:border-primary-500 outline-none" 
                                placeholder="Class"
                              />
                              <input 
                                type="text" 
                                value={s.section || ''} 
                                onChange={(e) => handleInlineChange(student.id, 'section', e.target.value)} 
                                className="w-8 bg-dark-bg border border-dark-border rounded px-0.5 py-0.5 text-xs focus:border-primary-500 outline-none text-center font-bold" 
                                placeholder="Sec"
                              />
                            </div>
                          </td>
                          <td className="py-1 px-1">
                            <input 
                              type="text" 
                              value={s.fatherName || ''} 
                              onChange={(e) => handleInlineChange(student.id, 'fatherName', e.target.value)} 
                              className="w-24 bg-dark-bg border border-dark-border rounded px-1.5 py-0.5 text-xs focus:border-primary-500 outline-none" 
                            />
                          </td>
                          <td className="py-1 px-1">
                            <input 
                              type="text" 
                              value={s.phone || s.parentPhone || ''} 
                              onChange={(e) => handleInlineChange(student.id, 'phone', e.target.value)} 
                              className="w-24 bg-dark-bg border border-dark-border rounded px-1 py-0.5 text-[11px] font-mono focus:border-primary-500 outline-none" 
                              placeholder="03XX..." 
                            />
                          </td>
                          {/* Monthly Fee */}
                          <td className="py-1 px-1">
                            <input 
                              type="number" 
                              value={s.monthlyFee !== undefined ? s.monthlyFee : ''} 
                              onChange={(e) => handleInlineChange(student.id, 'monthlyFee', e.target.value)} 
                              className="w-16 bg-dark-bg border border-dark-border rounded px-1 py-0.5 text-xs font-bold text-emerald-400 focus:border-primary-500 outline-none text-right" 
                              placeholder="0" 
                            />
                          </td>
                          {/* Previous Balance / Arrears */}
                          <td className="py-1 px-1">
                            <input 
                              type="number" 
                              value={s.balance !== undefined ? s.balance : (s.arrears !== undefined ? s.arrears : '')} 
                              onChange={(e) => handleInlineChange(student.id, 'balance', e.target.value)} 
                              className={`w-16 bg-dark-bg border rounded px-1 py-0.5 text-xs font-bold outline-none text-right ${
                                Number(s.balance || s.arrears || 0) > 0 ? 'border-rose-500/50 text-rose-400' : 'border-dark-border text-dark-muted'
                              }`} 
                              placeholder="0" 
                            />
                          </td>
                          {/* Admission Fee */}
                          <td className="py-1 px-1">
                            <input 
                              type="number" 
                              value={s.admissionFee !== undefined ? s.admissionFee : ''} 
                              onChange={(e) => handleInlineChange(student.id, 'admissionFee', e.target.value)} 
                              className="w-14 bg-dark-bg border border-dark-border rounded px-1 py-0.5 text-xs text-blue-400 focus:border-primary-500 outline-none text-right" 
                              placeholder="0" 
                            />
                          </td>
                          {/* Annual Fee */}
                          <td className="py-1 px-1">
                            <input 
                              type="number" 
                              value={s.annualFee !== undefined ? s.annualFee : ''} 
                              onChange={(e) => handleInlineChange(student.id, 'annualFee', e.target.value)} 
                              className="w-14 bg-dark-bg border border-dark-border rounded px-1 py-0.5 text-xs text-purple-400 focus:border-primary-500 outline-none text-right" 
                              placeholder="0" 
                            />
                          </td>
                          {/* Exam Fee */}
                          <td className="py-1 px-1">
                            <input 
                              type="number" 
                              value={s.examFee !== undefined ? s.examFee : ''} 
                              onChange={(e) => handleInlineChange(student.id, 'examFee', e.target.value)} 
                              className="w-14 bg-dark-bg border border-dark-border rounded px-1 py-0.5 text-xs text-indigo-400 focus:border-primary-500 outline-none text-right" 
                              placeholder="0" 
                            />
                          </td>
                          {/* Other Fee */}
                          <td className="py-1 px-1">
                            <input 
                              type="number" 
                              value={s.otherFee !== undefined ? s.otherFee : ''} 
                              onChange={(e) => handleInlineChange(student.id, 'otherFee', e.target.value)} 
                              className="w-14 bg-dark-bg border border-dark-border rounded px-1 py-0.5 text-xs text-yellow-400 focus:border-primary-500 outline-none text-right" 
                              placeholder="0" 
                            />
                          </td>
                          {/* Transport / Van Fee */}
                          <td className="py-1 px-1">
                            <input 
                              type="number" 
                              value={s.transportFee !== undefined ? s.transportFee : (s.vanFee !== undefined ? s.vanFee : '')} 
                              onChange={(e) => handleInlineChange(student.id, 'transportFee', e.target.value)} 
                              className="w-14 bg-dark-bg border border-dark-border rounded px-1 py-0.5 text-xs text-cyan-400 focus:border-primary-500 outline-none text-right" 
                              placeholder="0" 
                            />
                          </td>
                          {/* Discount */}
                          <td className="py-1 px-1">
                            <input 
                              type="number" 
                              value={s.discount !== undefined ? s.discount : ''} 
                              onChange={(e) => handleInlineChange(student.id, 'discount', e.target.value)} 
                              className="w-12 bg-dark-bg border border-dark-border rounded px-1 py-0.5 text-xs text-amber-400 focus:border-primary-500 outline-none text-right" 
                              placeholder="0" 
                            />
                          </td>
                          {/* Fee Status */}
                          <td className="py-1 px-1 text-center">
                            <select 
                              value={s.feeStatus || 'Pending'} 
                              onChange={(e) => handleInlineChange(student.id, 'feeStatus', e.target.value)} 
                              className="w-20 bg-dark-bg border border-dark-border rounded px-1 py-0.5 text-[11px] focus:border-primary-500 outline-none"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Paid">Paid</option>
                              <option value="Defaulter">Defaulter</option>
                              <option value="Partial">Partial</option>
                              <option value="Concession">Concession</option>
                            </select>
                          </td>
                        </>
                      ) : (
                        /* ULTRA-COMPACT REGULAR VIEW ROW (No Horizontal Scroll Needed) */
                        <>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-dark-hover flex items-center justify-center text-primary-400 font-bold border border-dark-border uppercase overflow-hidden shrink-0 text-[10px]">
                                {student.photoUrl ? (
                                  <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                                ) : (
                                  student.name?.charAt(0) || 'S'
                                )}
                              </div>
                              <span className="font-bold text-white group-hover:text-primary-400 transition-colors truncate max-w-[130px]" title={student.name}>
                                {student.name}
                              </span>
                            </div>
                          </td>

                          {/* Roll No */}
                          <td className="py-2 px-1.5 text-center font-mono font-bold text-primary-400 text-xs">
                            {student.rollNumber || '-'}
                          </td>

                          {/* Merged Class & Section */}
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-white">{student.class}</span>
                              <span className="text-[10px] text-dark-muted font-mono bg-dark-hover px-1 rounded border border-dark-border/40">
                                {student.section || 'A'}
                              </span>
                            </div>
                          </td>

                          {/* Father Name */}
                          <td className="py-2 px-2 text-dark-muted truncate max-w-[110px]" title={student.fatherName}>
                            {student.fatherName || '-'}
                          </td>

                          {/* Mobile Phone */}
                          <td className="py-2 px-2 font-mono text-dark-muted text-[11px]">
                            {student.phone || student.parentPhone || '-'}
                          </td>
                          
                          {/* Monthly Fee */}
                          <td className="py-2 px-2 font-bold text-emerald-400 text-xs">
                            {monthlyFeeNum > 0 ? `Rs. ${monthlyFeeNum.toLocaleString()}` : '-'}
                          </td>

                          {/* Previous Balance (Arrears) */}
                          <td className="py-2 px-2">
                            {arrearsNum > 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-0.5 w-fit">
                                <AlertCircle size={10} />
                                Rs. {arrearsNum.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-dark-muted text-[11px] font-mono">Rs. 0</span>
                            )}
                          </td>

                          {/* Other Fees Overview Tag */}
                          <td className="py-2 px-2">
                            {otherTotal > 0 ? (
                              <span 
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 cursor-help"
                                title={`Admission: Rs. ${admissionNum} | Annual: Rs. ${annualNum} | Exam: Rs. ${examNum} | Van: Rs. ${transportNum} | Other: Rs. ${otherNum}`}
                              >
                                +Rs. {otherTotal.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-dark-muted text-[10px]">-</span>
                            )}
                          </td>

                          {/* Fee Status Badge + Status */}
                          <td className="py-2 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border inline-block ${
                              student.feeStatus === 'Paid' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : student.feeStatus === 'Defaulter'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : student.feeStatus === 'Partial'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}>
                              {student.feeStatus || (arrearsNum > 0 ? 'Pending' : 'Paid')}
                            </span>
                            {student.status && student.status !== 'Active' && (
                              <span className="ml-1 px-1 py-0.2 rounded text-[8px] font-black uppercase bg-red-500/20 text-red-400">
                                {student.status}
                              </span>
                            )}
                          </td>

                          {/* Actions Bar */}
                          <td className="py-2 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => handleOpenSingleFeeReminder(student)}
                                className="p-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-md transition-all"
                                title="Send WhatsApp Fee Reminder"
                              >
                                <Bell size={13} />
                              </button>

                              <button 
                                onClick={() => handleSendStudentWhatsApp(student)}
                                disabled={sendingWaId === student.id}
                                className="p-1 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white rounded-md transition-all disabled:opacity-50"
                                title="Send Official Notice via AI Bot"
                              >
                                {sendingWaId === student.id ? (
                                  <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <MessageSquare size={13} />
                                )}
                              </button>

                              <button 
                                onClick={() => navigate(`/school-admin/students/${student.id}`)} 
                                className="p-1 hover:bg-primary-500/10 text-dark-muted hover:text-primary-400 rounded-md transition-all"
                                title="View 360"
                              >
                                <Eye size={13} />
                              </button>

                              <button 
                                onClick={() => navigate(`/school-admin/students/edit/${student.id}`)} 
                                className="p-1 hover:bg-blue-500/10 text-dark-muted hover:text-blue-400 rounded-md transition-all"
                                title="Edit"
                              >
                                <Edit2 size={13} />
                              </button>

                              <button 
                                onClick={() => handleDelete(student.id)} 
                                className="p-1 hover:bg-rose-500/10 text-dark-muted hover:text-rose-400 rounded-md transition-all"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <div className="p-4 bg-dark-hover rounded-full inline-block mb-3 text-dark-muted">
                <GraduationCap size={44} />
              </div>
              <h3 className="text-lg font-bold text-white">No Students Found</h3>
              <p className="text-dark-muted text-xs max-w-sm mx-auto mt-1">
                We couldn't find any student records matching your filter or search criteria.
              </p>
              <button 
                onClick={() => navigate('/school-admin/students/add')}
                className="mt-5 premium-button-primary text-xs font-bold inline-flex"
              >
                <Plus size={16} />
                Add New Student
              </button>
            </div>
          )}
        </div>

        {/* Spreadsheet Footer */}
        {isSpreadsheetMode && (
          <div className="mt-4 p-3 bg-dark-bg/80 border border-dark-border rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
            <div className="flex items-center gap-4 text-dark-muted">
              <span>Rows Visible: <strong className="text-white">{filteredStudents.length}</strong></span>
              <span>Pending Edits: <strong className="text-primary-400">{Object.keys(inlineEdits).length}</strong></span>
            </div>
            <div className="flex items-center gap-4">
              <span>Total Monthly Base: <strong className="text-emerald-400">Rs. {filteredStudents.reduce((s, st) => s + getStudentMonthlyFee(st), 0).toLocaleString()}</strong></span>
              <span>Total Previous Balance: <strong className="text-rose-400">Rs. {filteredStudents.reduce((s, st) => s + getStudentArrears(st), 0).toLocaleString()}</strong></span>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ─────────────────────────────────────────────────────────────
          4. COMPREHENSIVE MULTI-TAB BULK EDIT MODAL
         ───────────────────────────────────────────────────────────── */}
      {isBulkEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <GlassCard className="w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/15 shadow-2xl">
            <div className="flex items-start justify-between pb-4 border-b border-dark-border">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Sparkles className="text-primary-400" size={20} />
                  Bulk Manager ({selectedIds.length} Students Selected)
                </h2>
                <p className="text-xs text-dark-muted mt-1">
                  Update monthly fees, previous balance (arrears), admission/annual funds, or dispatch WhatsApp fee notices.
                </p>
              </div>
              <button 
                onClick={() => setIsBulkEditOpen(false)}
                className="p-1.5 text-dark-muted hover:text-white rounded-lg hover:bg-dark-hover transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-dark-border mt-4 gap-1">
              <button
                type="button"
                onClick={() => setBulkActiveTab('fees')}
                className={`py-2.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
                  bulkActiveTab === 'fees'
                    ? 'border-primary-500 text-primary-400 bg-primary-500/10 rounded-t-xl'
                    : 'border-transparent text-dark-muted hover:text-white'
                }`}
              >
                <DollarSign size={16} />
                1. Fees &amp; Previous Balance
              </button>
              <button
                type="button"
                onClick={() => setBulkActiveTab('academic')}
                className={`py-2.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
                  bulkActiveTab === 'academic'
                    ? 'border-primary-500 text-primary-400 bg-primary-500/10 rounded-t-xl'
                    : 'border-transparent text-dark-muted hover:text-white'
                }`}
              >
                <GraduationCap size={16} />
                2. Academic &amp; Status
              </button>
              <button
                type="button"
                onClick={() => setBulkActiveTab('reminders')}
                className={`py-2.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
                  bulkActiveTab === 'reminders'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-xl'
                    : 'border-transparent text-dark-muted hover:text-white'
                }`}
              >
                <MessageSquare size={16} />
                3. WhatsApp Fee Reminders
              </button>
            </div>

            {/* TAB 1: FEES & PREVIOUS BALANCE */}
            {bulkActiveTab === 'fees' && (
              <form onSubmit={handleBulkEditSubmit} className="space-y-4 pt-5 animate-fade-in">
                {/* Monthly Fee */}
                <div className="p-4 bg-dark-bg/60 rounded-2xl border border-dark-border space-y-3">
                  <label className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
                    <Wallet size={16} className="text-emerald-400" />
                    Monthly Tuition Fee (ماہانہ فیس)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-dark-muted uppercase font-bold mb-1">Adjustment Mode</label>
                      <select
                        value={bulkEditForm.monthlyFeeMode}
                        onChange={e => setBulkEditForm({...bulkEditForm, monthlyFeeMode: e.target.value})}
                        className="w-full premium-input text-xs"
                      >
                        <option value="no_change">-- No Change --</option>
                        <option value="set">Set Fixed Amount (مقرر کریں)</option>
                        <option value="increase">Increase By (+ Rs. اضافہ)</option>
                        <option value="decrease">Decrease By (- Rs. کمی)</option>
                        <option value="percent">Percentage Increase (+ % اضافہ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-dark-muted uppercase font-bold mb-1">Amount / Value</label>
                      <input 
                        type="number"
                        value={bulkEditForm.monthlyFeeValue}
                        onChange={e => setBulkEditForm({...bulkEditForm, monthlyFeeValue: e.target.value})}
                        disabled={bulkEditForm.monthlyFeeMode === 'no_change'}
                        placeholder={bulkEditForm.monthlyFeeMode === 'percent' ? "e.g. 10" : "e.g. 3500"}
                        className="w-full premium-input text-xs font-bold text-emerald-400 disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>

                {/* Previous Balance / Arrears */}
                <div className="p-4 bg-rose-500/[0.04] rounded-2xl border border-rose-500/20 space-y-3">
                  <label className="text-xs font-black text-rose-400 flex items-center gap-2 uppercase tracking-wider">
                    <AlertCircle size={16} />
                    Previous Balance / Arrears (پرانا بقایا جات)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-dark-muted uppercase font-bold mb-1">Operation</label>
                      <select
                        value={bulkEditForm.arrearsMode}
                        onChange={e => setBulkEditForm({...bulkEditForm, arrearsMode: e.target.value})}
                        className="w-full premium-input text-xs border-rose-500/30 text-rose-300"
                      >
                        <option value="no_change">-- No Change --</option>
                        <option value="set">Set Fixed Balance (مقرر بقایا جات)</option>
                        <option value="add">Add To Existing Balance (+ Rs.)</option>
                        <option value="reduce">Reduce Balance (- Rs.)</option>
                        <option value="clear">Clear All Balance (0 Rs. ختم کریں)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-dark-muted uppercase font-bold mb-1">Amount (Rs.)</label>
                      <input 
                        type="number"
                        value={bulkEditForm.arrearsValue}
                        onChange={e => setBulkEditForm({...bulkEditForm, arrearsValue: e.target.value})}
                        disabled={bulkEditForm.arrearsMode === 'no_change' || bulkEditForm.arrearsMode === 'clear'}
                        placeholder="e.g. 1500"
                        className="w-full premium-input text-xs font-bold text-rose-400 disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Fee Fields: Admission & Annual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Admission Fee */}
                  <div className="p-3 bg-dark-bg/60 rounded-xl border border-dark-border space-y-2">
                    <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider">Admission Fee (Rs.)</label>
                    <select
                      value={bulkEditForm.admissionFeeMode}
                      onChange={e => setBulkEditForm({...bulkEditForm, admissionFeeMode: e.target.value})}
                      className="w-full premium-input text-xs mb-1"
                    >
                      <option value="no_change">-- No Change --</option>
                      <option value="set">Set Admission Fee (Rs.)</option>
                      <option value="clear">Clear (0 Rs.)</option>
                    </select>
                    {bulkEditForm.admissionFeeMode === 'set' && (
                      <input 
                        type="number"
                        value={bulkEditForm.admissionFeeValue}
                        onChange={e => setBulkEditForm({...bulkEditForm, admissionFeeValue: e.target.value})}
                        placeholder="e.g. 5000"
                        className="w-full premium-input text-xs text-blue-400 font-bold"
                      />
                    )}
                  </div>

                  {/* Annual Fund */}
                  <div className="p-3 bg-dark-bg/60 rounded-xl border border-dark-border space-y-2">
                    <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider">Annual Fund / Fee (Rs.)</label>
                    <select
                      value={bulkEditForm.annualFeeMode}
                      onChange={e => setBulkEditForm({...bulkEditForm, annualFeeMode: e.target.value})}
                      className="w-full premium-input text-xs mb-1"
                    >
                      <option value="no_change">-- No Change --</option>
                      <option value="set">Set Annual Fee (Rs.)</option>
                      <option value="clear">Clear (0 Rs.)</option>
                    </select>
                    {bulkEditForm.annualFeeMode === 'set' && (
                      <input 
                        type="number"
                        value={bulkEditForm.annualFeeValue}
                        onChange={e => setBulkEditForm({...bulkEditForm, annualFeeValue: e.target.value})}
                        placeholder="e.g. 2000"
                        className="w-full premium-input text-xs text-purple-400 font-bold"
                      />
                    )}
                  </div>
                </div>

                {/* Additional Fee Fields: Exam & Van / Transport */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Exam Fee */}
                  <div className="p-3 bg-dark-bg/60 rounded-xl border border-dark-border space-y-2">
                    <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider">Exam Fee (Rs.)</label>
                    <select
                      value={bulkEditForm.examFeeMode}
                      onChange={e => setBulkEditForm({...bulkEditForm, examFeeMode: e.target.value})}
                      className="w-full premium-input text-xs mb-1"
                    >
                      <option value="no_change">-- No Change --</option>
                      <option value="set">Set Exam Fee (Rs.)</option>
                      <option value="clear">Clear (0 Rs.)</option>
                    </select>
                    {bulkEditForm.examFeeMode === 'set' && (
                      <input 
                        type="number"
                        value={bulkEditForm.examFeeValue}
                        onChange={e => setBulkEditForm({...bulkEditForm, examFeeValue: e.target.value})}
                        placeholder="e.g. 500"
                        className="w-full premium-input text-xs text-indigo-400 font-bold"
                      />
                    )}
                  </div>

                  {/* Van / Transport Fee */}
                  <div className="p-3 bg-dark-bg/60 rounded-xl border border-dark-border space-y-2">
                    <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider">Van / Transport Fee (Rs.)</label>
                    <select
                      value={bulkEditForm.transportFeeMode}
                      onChange={e => setBulkEditForm({...bulkEditForm, transportFeeMode: e.target.value})}
                      className="w-full premium-input text-xs mb-1"
                    >
                      <option value="no_change">-- No Change --</option>
                      <option value="set">Set Van Fee (Rs.)</option>
                      <option value="clear">Clear (0 Rs.)</option>
                    </select>
                    {bulkEditForm.transportFeeMode === 'set' && (
                      <input 
                        type="number"
                        value={bulkEditForm.transportFeeValue}
                        onChange={e => setBulkEditForm({...bulkEditForm, transportFeeValue: e.target.value})}
                        placeholder="e.g. 1500"
                        className="w-full premium-input text-xs text-cyan-400 font-bold"
                      />
                    )}
                  </div>
                </div>

                {/* Other Fee & Discount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Other Fee */}
                  <div className="p-3 bg-dark-bg/60 rounded-xl border border-dark-border space-y-2">
                    <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider">Other / Misc Charges (Rs.)</label>
                    <select
                      value={bulkEditForm.otherFeeMode}
                      onChange={e => setBulkEditForm({...bulkEditForm, otherFeeMode: e.target.value})}
                      className="w-full premium-input text-xs mb-1"
                    >
                      <option value="no_change">-- No Change --</option>
                      <option value="set">Set Other Fee (Rs.)</option>
                      <option value="clear">Clear (0 Rs.)</option>
                    </select>
                    {bulkEditForm.otherFeeMode === 'set' && (
                      <input 
                        type="number"
                        value={bulkEditForm.otherFeeValue}
                        onChange={e => setBulkEditForm({...bulkEditForm, otherFeeValue: e.target.value})}
                        placeholder="e.g. 300"
                        className="w-full premium-input text-xs text-yellow-400 font-bold"
                      />
                    )}
                  </div>

                  {/* Fee Discount */}
                  <div className="p-3 bg-dark-bg/60 rounded-xl border border-dark-border space-y-2">
                    <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider">Fee Discount / Concession (Rs.)</label>
                    <select
                      value={bulkEditForm.discountMode}
                      onChange={e => setBulkEditForm({...bulkEditForm, discountMode: e.target.value})}
                      className="w-full premium-input text-xs mb-1"
                    >
                      <option value="no_change">-- No Change --</option>
                      <option value="set">Set Discount (Rs.)</option>
                      <option value="clear">Remove Discount (0 Rs.)</option>
                    </select>
                    {bulkEditForm.discountMode === 'set' && (
                      <input 
                        type="number"
                        value={bulkEditForm.discountValue}
                        onChange={e => setBulkEditForm({...bulkEditForm, discountValue: e.target.value})}
                        placeholder="e.g. 500"
                        className="w-full premium-input text-xs text-amber-400 font-bold"
                      />
                    )}
                  </div>
                </div>

                {/* Fee Status & Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Fee Status</label>
                    <select 
                      value={bulkEditForm.feeStatus}
                      onChange={e => setBulkEditForm({...bulkEditForm, feeStatus: e.target.value})}
                      className="w-full premium-input text-xs"
                    >
                      <option value="">-- No Change --</option>
                      <option value="Pending">Pending (واجب الادا)</option>
                      <option value="Paid">Paid (ادا شدہ)</option>
                      <option value="Defaulter">Defaulter (بقایا دار)</option>
                      <option value="Partial">Partial (جزوی)</option>
                      <option value="Concession">Concession (رعایت)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Due Date Remarks</label>
                    <input 
                      type="text" 
                      value={bulkEditForm.feeDueDate}
                      onChange={e => setBulkEditForm({...bulkEditForm, feeDueDate: e.target.value})}
                      placeholder="e.g. 10th of every month"
                      className="w-full premium-input text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-border">
                  <button 
                    type="button" 
                    onClick={() => setIsBulkEditOpen(false)}
                    className="px-4 py-2.5 text-xs text-dark-muted hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isBulkUpdating}
                    className="premium-button-primary !bg-purple-600 hover:!bg-purple-700 text-xs font-bold px-6 py-2.5 flex items-center gap-2"
                  >
                    {isBulkUpdating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Updating Fees...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Apply to {selectedIds.length} Students
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: ACADEMIC & STATUS */}
            {bulkActiveTab === 'academic' && (
              <form onSubmit={handleBulkEditSubmit} className="space-y-4 pt-5 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-dark-muted mb-1.5">Update Class</label>
                  <input 
                    type="text" 
                    value={bulkEditForm.class}
                    onChange={e => setBulkEditForm({...bulkEditForm, class: e.target.value})}
                    className="w-full premium-input text-sm"
                    placeholder="e.g. 5th, 6th, 10th-Science"
                  />
                  {existingClasses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] text-dark-muted mr-1 self-center">Existing:</span>
                      {existingClasses.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBulkEditForm({...bulkEditForm, class: c})}
                          className="px-2 py-0.5 rounded bg-dark-hover hover:bg-primary-500/20 text-dark-muted hover:text-primary-300 text-[10px] border border-dark-border"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-muted mb-1.5">Update Section</label>
                  <input 
                    type="text" 
                    value={bulkEditForm.section}
                    onChange={e => setBulkEditForm({...bulkEditForm, section: e.target.value})}
                    className="w-full premium-input text-sm"
                    placeholder="e.g. A, Blue, Lotus"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-muted mb-1.5">Update Student Status</label>
                  <select 
                    value={bulkEditForm.status}
                    onChange={e => setBulkEditForm({...bulkEditForm, status: e.target.value})}
                    className="w-full premium-input text-sm"
                  >
                    <option value="">-- No Change --</option>
                    <option value="Active">Active (حاضر طالب علم)</option>
                    <option value="Inactive">Inactive (غیر فعال)</option>
                    <option value="Left">Left / Withdrawn (اسکول چھوڑ چکے)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-dark-border">
                  <button 
                    type="button" 
                    onClick={() => setIsBulkEditOpen(false)}
                    className="px-4 py-2.5 text-xs text-dark-muted hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isBulkUpdating}
                    className="premium-button-primary !bg-purple-600 hover:!bg-purple-700 text-xs font-bold px-6 py-2.5 flex items-center gap-2"
                  >
                    {isBulkUpdating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Updating Academic Info...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Apply Academic Updates
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: WHATSAPP FEE REMINDERS */}
            {bulkActiveTab === 'reminders' && (
              <div className="space-y-5 pt-5 animate-fade-in">
                <div className="p-4 bg-emerald-500/[0.06] rounded-2xl border border-emerald-500/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare size={16} />
                      WhatsApp Reminder Setup
                    </label>
                    <span className="text-[11px] font-bold text-white">
                      Target: {selectedIds.length} Parents
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-white text-xs">
                    <input 
                      type="checkbox"
                      checked={reminderTargetOnlyDues}
                      onChange={e => setReminderTargetOnlyDues(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-dark-bg border-dark-border"
                    />
                    <span>Only send to students with pending fees / previous balance (&gt; Rs. 0)</span>
                  </label>
                </div>

                {/* Templates */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-dark-muted uppercase tracking-wider">
                    Message Template (میسج فارمیٹ)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setReminderTemplate('detailed_arrears')}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        reminderTemplate === 'detailed_arrears'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold'
                          : 'border-dark-border bg-dark-bg/60 text-dark-muted hover:text-white'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1 mb-1">
                        <AlertCircle size={14} />
                        Detailed Breakdown
                      </div>
                      <span className="text-[10px] opacity-80 block">تفصیلی فیس و پرانا بقایا</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReminderTemplate('polite_monthly')}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        reminderTemplate === 'polite_monthly'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold'
                          : 'border-dark-border bg-dark-bg/60 text-dark-muted hover:text-white'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1 mb-1">
                        <Bell size={14} />
                        Polite Monthly
                      </div>
                      <span className="text-[10px] opacity-80 block">شائستہ یاد دہانی</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReminderTemplate('final_warning')}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        reminderTemplate === 'final_warning'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-300 font-bold'
                          : 'border-dark-border bg-dark-bg/60 text-dark-muted hover:text-white'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1 mb-1">
                        <AlertTriangle size={14} />
                        Final Defaulter
                      </div>
                      <span className="text-[10px] opacity-80 block">حتمی وارننگ نوٹس</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-dark-muted uppercase tracking-wider mb-1">
                    Due Date in Message
                  </label>
                  <input 
                    type="text" 
                    value={reminderDueDate}
                    onChange={e => setReminderDueDate(e.target.value)}
                    placeholder="e.g. 10th of this month"
                    className="w-full premium-input text-xs"
                  />
                </div>

                {/* Preview */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-dark-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Eye size={12} />
                    Live WhatsApp Preview ({sampleSelectedStudent ? sampleSelectedStudent.name : 'Sample'})
                  </label>
                  <div className="p-4 bg-[#0b141a] border border-[#222e35] rounded-2xl relative shadow-inner">
                    <div className="max-w-md bg-[#202c33] text-[#e9edef] text-xs p-3.5 rounded-2xl rounded-tl-none whitespace-pre-wrap font-sans leading-relaxed border border-[#374248]">
                      {sampleSelectedStudent 
                        ? generateReminderMessage(sampleSelectedStudent, reminderTemplate, reminderDueDate, customReminderText)
                        : "Select students to preview message"}
                    </div>
                  </div>
                </div>

                {/* Progress or Button */}
                {isSendingBulkReminders ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2 text-center animate-fade-in">
                    <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-400">
                      <Loader2 size={18} className="animate-spin" />
                      Sending Reminders ({reminderProgress.current} / {reminderProgress.total})...
                    </div>
                    <div className="w-full bg-dark-bg rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${(reminderProgress.current / (reminderProgress.total || 1)) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-dark-muted">
                      Delivered: <strong className="text-emerald-400">{reminderProgress.success}</strong> | Failed: <strong className="text-rose-400">{reminderProgress.failed}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-border">
                    <button 
                      type="button" 
                      onClick={() => setIsBulkEditOpen(false)}
                      className="px-4 py-2.5 text-xs text-dark-muted hover:text-white transition-colors"
                    >
                      Close
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSendBulkFeeReminders}
                      className="premium-button-primary !bg-emerald-600 hover:!bg-emerald-700 text-xs font-bold px-6 py-2.5 flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                    >
                      <Send size={16} />
                      🚀 Dispatch WhatsApp Fee Reminders ({selectedIds.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. SINGLE STUDENT FEE REMINDER PREVIEW MODAL
         ───────────────────────────────────────────────────────────── */}
      {singleReminderStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <GlassCard className="w-full max-w-lg p-6 relative border border-white/15 shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-dark-border">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bell className="text-emerald-400" size={18} />
                  Fee Reminder: {singleReminderStudent.name}
                </h3>
                <p className="text-xs text-dark-muted mt-0.5">
                  Roll #: {singleReminderStudent.rollNumber} | Class: {singleReminderStudent.class} | Father: {singleReminderStudent.fatherName}
                </p>
              </div>
              <button 
                onClick={() => setSingleReminderStudent(null)}
                className="p-1.5 text-dark-muted hover:text-white rounded-lg hover:bg-dark-hover transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 my-4 text-center">
              <div className="p-2.5 bg-dark-bg/60 rounded-xl border border-dark-border">
                <span className="text-[10px] uppercase text-dark-muted block">Monthly Fee</span>
                <span className="text-xs font-bold text-emerald-400">Rs. {getStudentMonthlyFee(singleReminderStudent).toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-dark-bg/60 rounded-xl border border-dark-border">
                <span className="text-[10px] uppercase text-dark-muted block">Previous Balance</span>
                <span className="text-xs font-bold text-rose-400">Rs. {getStudentArrears(singleReminderStudent).toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] uppercase text-emerald-300 block">Total Due</span>
                <span className="text-xs font-black text-emerald-400">Rs. {getStudentTotalDue(singleReminderStudent).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-black text-dark-muted uppercase tracking-wider">
                WhatsApp Message Content
              </label>
              <textarea
                rows={7}
                value={singleReminderText}
                onChange={e => setSingleReminderText(e.target.value)}
                className="w-full bg-[#0b141a] border border-[#222e35] text-[#e9edef] rounded-xl p-3 text-xs font-sans focus:border-emerald-500 outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-dark-border">
              <button
                type="button"
                onClick={() => {
                  const cleanPhone = (singleReminderStudent.phone || singleReminderStudent.parentPhone || '').replace(/[^0-9]/g, '');
                  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(singleReminderText)}`, '_blank');
                  setSingleReminderStudent(null);
                }}
                className="px-4 py-2 bg-dark-hover hover:bg-dark-border text-dark-muted hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <ExternalLink size={14} />
                WhatsApp Web
              </button>

              <button
                type="button"
                onClick={handleSendSingleFeeReminder}
                disabled={isSendingSingleReminder}
                className="premium-button-primary !bg-emerald-600 hover:!bg-emerald-700 text-xs font-bold px-5 py-2 flex items-center gap-2 shadow-lg shadow-emerald-600/30"
              >
                {isSendingSingleReminder ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Send via AI Bot
                  </>
                )}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default StudentManager;
