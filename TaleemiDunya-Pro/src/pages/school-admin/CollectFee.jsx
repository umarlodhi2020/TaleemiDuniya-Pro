import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { getRecords, updateRecord, subscribeToCollection } from '../../services/db';
import GlassCard from '../../components/common/GlassCard';
import {
  Search, Receipt, CheckCircle, Printer, MessageCircle,
  DollarSign, History, X, TrendingUp, Wallet, AlertCircle,
  Calendar, Users, ChevronRight, Tag, Banknote, Clock,
  CreditCard, Award, ArrowRight, Zap, Phone, ShoppingBag, Package, Trash2,
  FileText, Download, Filter, CheckCircle2, Clock3, RefreshCw, ArrowUpDown, Share2, Eye
} from 'lucide-react';

// ─── Helper Functions ───────────────────────────────────────────────────────
const getFamilyKey = (student) => {
  let key = student.familyId ? String(student.familyId).trim() : null;
  if (key && key !== '-' && key !== '') return key;
  const cnicKey = student.fatherCnic ? String(student.fatherCnic).replace(/[^0-9]/g, '') : null;
  const phoneKey = String(student.parentPhone || student.fatherPhone || student.phone || '');
  const cleanPhone = String(phoneKey).replace(/[^0-9]/g, '');
  const nameKey = student.fatherName ? String(student.fatherName).trim().toLowerCase() : 'unknown_father';
  const isScientificPhone = phoneKey.toUpperCase().includes('E');
  const isDummyPhone = cleanPhone === '00000000000' || cleanPhone === '1234567890' || cleanPhone === '03000000000';
  const isValidPhone = cleanPhone.length >= 10 && !isScientificPhone && !isDummyPhone;
  if (cnicKey && cnicKey.length > 8) return `cnic_${cnicKey}`;
  if (isValidPhone && nameKey !== 'unknown_father') return `phone_${cleanPhone}_fname_${nameKey.replace(/\s+/g, '_')}`;
  if (isValidPhone) return `phone_${cleanPhone}`;
  return `student_${student.id}`;
};

const doesVoucherBelongToFamily = (v, studs) => {
  if (!v || !studs || studs.length === 0) return false;
  const studIds = studs.map(s => s.id).filter(Boolean);

  if (v.selectionType === 'family') {
    // 1. Direct childrenIds match (highest accuracy)
    if (v.childrenIds && Array.isArray(v.childrenIds) && v.childrenIds.length > 0) {
      return v.childrenIds.some(cid => studIds.includes(cid));
    }

    // 2. Explicit familyId match
    const famId = studs[0]?.familyId ? String(studs[0].familyId).trim() : null;
    if (v.familyId && famId && v.familyId !== '-' && v.familyId === famId) {
      return true;
    }

    // 3. Father CNIC match (Strictly > 8 digits)
    const vCnic = String(v.fatherCnic || '').replace(/[^0-9]/g, '');
    const sCnic = String(studs[0]?.fatherCnic || '').replace(/[^0-9]/g, '');
    if (vCnic && sCnic && vCnic.length > 8 && vCnic === sCnic) return true;

    // 4. Father Name + Child Name match (never match solely on roll number!)
    const vFather = String(v.fatherName || '').trim().toLowerCase();
    const sFather = String(studs[0]?.fatherName || '').trim().toLowerCase();
    if (vFather && sFather && vFather === sFather) {
      if (v.childrenDetails && v.childrenDetails.length > 0) {
        return v.childrenDetails.some(vc => {
          const vcName = String(vc.name || vc.studentName || '').trim().toLowerCase();
          return studs.some(s => (s.name || '').trim().toLowerCase() === vcName);
        });
      }
      return true;
    }

    return false;
  } else {
    // Single student voucher
    return studIds.includes(v.studentId);
  }
};

const parseDateSafely = (val) => {
  if (!val) return new Date(0);
  if (typeof val === 'object' && val.toDate) return val.toDate();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

// ─── Main Component ──────────────────────────────────────────────────────────
const CollectFee = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolName = schoolData?.name || schoolData?.schoolName || userData?.schoolName || 'SCHOOL';
  const schoolId = schoolData?.id || userData?.schoolId || 'default-school';

  const [loading, setLoading] = useState(true);
  const [allStudents, setAllStudents] = useState([]);
  const [allVouchers, setAllVouchers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({ today: 0, month: 0, arrears: 0 });
  const [recentPayments, setRecentPayments] = useState([]);

  // Sheet Mode & Filters
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState(() => searchParams.get('tab') === 'sheet' ? 'sheet' : 'counter');
  const [sheetStatusFilter, setSheetStatusFilter] = useState(() => searchParams.get('filter') || 'all');
  const [sheetClassFilter, setSheetClassFilter] = useState('All');
  const [sheetMonthFilter, setSheetMonthFilter] = useState('All');
  const [sheetSearch, setSheetSearch] = useState('');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'sheet') {
      setViewMode('sheet');
    }
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      setSheetStatusFilter(filterParam);
    }
  }, [searchParams]);

  // Step-based Flow (for Counter Mode)
  const [step, setStep] = useState(1); // 1=Search, 2=Details, 3=Success
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const [selectedFamily, setSelectedFamily] = useState(null);
  const [familyStudents, setFamilyStudents] = useState([]);
  const [pendingVouchers, setPendingVouchers] = useState([]);
  const [paidVouchersForFamily, setPaidVouchersForFamily] = useState([]);

  // Payment state (one entry per voucher)
  const [paymentEntries, setPaymentEntries] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [lastReceipt, setLastReceipt] = useState(null);

  // Edit Payment State
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [editForm, setEditForm] = useState({ paidAmount: '', discountAmount: '', status: 'Paid' });
  const [editProcessing, setEditProcessing] = useState(false);

  // Voucher Detail Modal State
  const [detailVoucher, setDetailVoucher] = useState(null);

  // ─── Sheet View Calculations & Mappings ──────────────────────────────────
  const sheetRows = useMemo(() => {
    if (!allVouchers || allVouchers.length === 0) return [];

    const rows = [];
    allVouchers.forEach(v => {
      const isFamily = v.selectionType === 'family' || (v.childrenDetails && v.childrenDetails.length > 1);
      const totalDue = Number(v.totalAmount) || 0;
      const paid = Number(v.paidAmount) || 0;
      const discount = Number(v.discountAmount) || 0;
      const balance = Math.max(0, totalDue - paid - discount);

      let status = 'Unpaid';
      if (paid >= totalDue && totalDue > 0) status = 'Paid';
      else if (paid > 0) status = 'Partial';
      else if (totalDue === 0) status = 'Paid';

      const paidDateObj = v.paidAt ? parseDateSafely(v.paidAt) : null;
      let paidDateStr = null;
      if (paidDateObj && paidDateObj.getTime() > 0) {
        try {
          paidDateStr = paidDateObj.toISOString().split('T')[0];
        } catch (e) {}
      }

      if (isFamily && v.childrenDetails && v.childrenDetails.length > 0) {
        v.childrenDetails.forEach((child, cIdx) => {
          const childProfile = allStudents.find(s => s.id === child.id || s.name === child.name) || {};
          const rollNo = child.admNo || child.rollNumber || child.rollNo || childProfile.admissionNumber || childProfile.rollNo || '-';
          const className = child.class || childProfile.class || 'N/A';

          rows.push({
            id: `${v.id}_${cIdx}`,
            voucherId: v.id,
            voucherNo: v.voucherNo || v.id?.slice(0, 6),
            studentId: child.id || childProfile.id,
            studentName: child.name || childProfile.name || 'Student',
            fatherName: v.fatherName || childProfile.fatherName || '-',
            fatherPhone: v.phone || childProfile.parentPhone || childProfile.fatherPhone || childProfile.phone || '',
            className: className,
            rollNo: rollNo,
            month: v.month || '-',
            totalDue: totalDue,
            paidAmount: paid,
            discountAmount: discount,
            balance: balance,
            status: status,
            paidAt: v.paidAt,
            paidDateObj: paidDateObj,
            paidDateStr: paidDateStr,
            createdAt: v.createdAt,
            isFamily: true,
            rawVoucher: v
          });
        });
      } else {
        const studentProfile = allStudents.find(s => s.id === v.studentId) || {};
        const rollNo = v.rollNo || v.studentRollNo || studentProfile.admissionNumber || studentProfile.rollNo || '-';
        const className = v.class || studentProfile.class || 'N/A';

        rows.push({
          id: v.id,
          voucherId: v.id,
          voucherNo: v.voucherNo || v.id?.slice(0, 6),
          studentId: v.studentId || studentProfile.id,
          studentName: v.studentName || studentProfile.name || v.fatherName || 'Student',
          fatherName: v.fatherName || studentProfile.fatherName || '-',
          fatherPhone: v.phone || studentProfile.parentPhone || studentProfile.fatherPhone || studentProfile.phone || '',
          className: className,
          rollNo: rollNo,
          month: v.month || '-',
          totalDue: totalDue,
          paidAmount: paid,
          discountAmount: discount,
          balance: balance,
          status: status,
          paidAt: v.paidAt,
          paidDateObj: paidDateObj,
          paidDateStr: paidDateStr,
          createdAt: v.createdAt,
          isFamily: false,
          rawVoucher: v
        });
      }
    });

    return rows;
  }, [allVouchers, allStudents]);

  const uniqueClassesList = useMemo(() => {
    const clsSet = new Set();
    allStudents.forEach(s => {
      const c = s.class || s.className;
      if (c) clsSet.add(c);
    });
    allVouchers.forEach(v => {
      if (v.class) clsSet.add(v.class);
      if (v.childrenDetails) {
        v.childrenDetails.forEach(c => {
          if (c.class) clsSet.add(c.class);
        });
      }
    });
    return Array.from(clsSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allStudents, allVouchers]);

  const uniqueMonthsList = useMemo(() => {
    const mSet = new Set();
    allVouchers.forEach(v => {
      if (v.month) mSet.add(v.month);
    });
    return Array.from(mSet).sort().reverse();
  }, [allVouchers]);

  const filteredSheetRows = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    return sheetRows.filter(row => {
      if (sheetStatusFilter === 'today') {
        if (!row.paidDateStr || row.paidDateStr !== todayStr || (row.status !== 'Paid' && row.status !== 'Partial')) {
          return false;
        }
      } else if (sheetStatusFilter === 'month') {
        if (!row.paidDateObj || row.paidDateObj.getMonth() !== thisMonth || row.paidDateObj.getFullYear() !== thisYear || (row.status !== 'Paid' && row.status !== 'Partial')) {
          return false;
        }
      } else if (sheetStatusFilter === 'paid') {
        if (row.status !== 'Paid') return false;
      } else if (sheetStatusFilter === 'partial') {
        if (row.status !== 'Partial') return false;
      } else if (sheetStatusFilter === 'unpaid') {
        if (row.status !== 'Unpaid' && row.balance <= 0) return false;
      }

      if (sheetClassFilter !== 'All') {
        if (String(row.className).toLowerCase() !== String(sheetClassFilter).toLowerCase()) {
          return false;
        }
      }

      if (sheetMonthFilter !== 'All') {
        if (String(row.month).toLowerCase() !== String(sheetMonthFilter).toLowerCase()) {
          return false;
        }
      }

      if (sheetSearch.trim()) {
        const q = sheetSearch.toLowerCase();
        const matchesName = String(row.studentName || '').toLowerCase().includes(q);
        const matchesFather = String(row.fatherName || '').toLowerCase().includes(q);
        const matchesRoll = String(row.rollNo || '').toLowerCase().includes(q);
        const matchesVoucher = String(row.voucherNo || '').toLowerCase().includes(q);
        const matchesPhone = String(row.fatherPhone || '').toLowerCase().includes(q);
        if (!matchesName && !matchesFather && !matchesRoll && !matchesVoucher && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }, [sheetRows, sheetStatusFilter, sheetClassFilter, sheetMonthFilter, sheetSearch]);

  const sortedSheetRows = useMemo(() => {
    return [...filteredSheetRows].sort((a, b) => {
      if (sheetStatusFilter === 'today' || sheetStatusFilter === 'month' || sheetStatusFilter === 'paid' || sheetStatusFilter === 'partial') {
        const tA = a.paidDateObj ? a.paidDateObj.getTime() : 0;
        const tB = b.paidDateObj ? b.paidDateObj.getTime() : 0;
        return tB - tA;
      }
      if (a.className !== b.className) {
        return String(a.className).localeCompare(String(b.className), undefined, { numeric: true });
      }
      return String(a.studentName).localeCompare(String(b.studentName));
    });
  }, [filteredSheetRows, sheetStatusFilter]);

  const sheetMetrics = useMemo(() => {
    let totalDue = 0;
    let totalCollected = 0;
    let totalBalance = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    sortedSheetRows.forEach(r => {
      totalDue += r.totalDue;
      totalCollected += r.paidAmount;
      totalBalance += r.balance;
      if (r.status === 'Paid') paidCount++;
      else if (r.status === 'Partial') partialCount++;
      else unpaidCount++;
    });

    return {
      totalCount: sortedSheetRows.length,
      totalDue,
      totalCollected,
      totalBalance,
      paidCount,
      partialCount,
      unpaidCount
    };
  }, [sortedSheetRows]);

  const sheetPillCounts = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    let todayCount = 0;
    let monthCount = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    sheetRows.forEach(r => {
      if (r.paidDateStr === todayStr && (r.status === 'Paid' || r.status === 'Partial')) {
        todayCount++;
      }
      if (r.paidDateObj && r.paidDateObj.getMonth() === thisMonth && r.paidDateObj.getFullYear() === thisYear && (r.status === 'Paid' || r.status === 'Partial')) {
        monthCount++;
      }
      if (r.status === 'Paid') paidCount++;
      else if (r.status === 'Partial') partialCount++;
      if (r.status === 'Unpaid' || r.balance > 0) unpaidCount++;
    });

    return {
      all: sheetRows.length,
      today: todayCount,
      month: monthCount,
      paid: paidCount,
      partial: partialCount,
      unpaid: unpaidCount
    };
  }, [sheetRows]);

  const handlePrintSheet = () => {
    if (sortedSheetRows.length === 0) {
      alert('Is sheet me print karne ke liye koi record mojood nahi hai.');
      return;
    }

    const printWin = window.open('', '_blank', 'width=1100,height=850');
    if (!printWin) {
      alert('Popup blocked. Please allow popups for this site.');
      return;
    }

    const filterTitle = sheetStatusFilter === 'today' ? "TODAY'S FEE COLLECTION REGISTER (آج کی وصولی)"
      : sheetStatusFilter === 'month' ? "THIS MONTH'S FEE COLLECTION REGISTER (اس ماہ کی وصولی)"
      : sheetStatusFilter === 'paid' ? "CLEARED / PAID STUDENTS REGISTER (فیس ادا شدہ)"
      : sheetStatusFilter === 'partial' ? "PARTIAL FEE COLLECTION REGISTER (نامکمل فیس)"
      : sheetStatusFilter === 'unpaid' ? "FEE DEFAULTERS & PENDING ARREARS SHEET (بقایا جات شیٹ)"
      : "STUDENT FEE COLLECTION & PAYMENT STATUS REGISTER";

    const dateStr = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let rowsHtml = sortedSheetRows.map((r, i) => {
      const pTimeStr = r.paidDateObj && r.paidDateObj.getTime() > 0
        ? r.paidDateObj.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' }) + ' ' + r.paidDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '-';

      const statusBadge = r.status === 'Paid'
        ? '<span style="color:#059669; font-weight:bold; background:#d1fae5; padding:2px 8px; border-radius:4px; font-size:10px;">PAID</span>'
        : r.status === 'Partial'
        ? '<span style="color:#d97706; font-weight:bold; background:#fef3c7; padding:2px 8px; border-radius:4px; font-size:10px;">PARTIAL</span>'
        : '<span style="color:#dc2626; font-weight:bold; background:#fee2e2; padding:2px 8px; border-radius:4px; font-size:10px;">UNPAID</span>';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; text-align: center; color: #64748b;">${i + 1}</td>
          <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; color: #1e293b;">#${r.voucherNo}</td>
          <td style="padding: 6px 8px; font-weight: bold; color: #0f172a;">${r.studentName}</td>
          <td style="padding: 6px 8px; text-align: center; color: #475569;">${r.rollNo}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: #2563eb;">${r.className}</td>
          <td style="padding: 6px 8px; color: #334155;">${r.fatherName}<br/><span style="font-size:9px; color:#64748b;">${r.fatherPhone || '-'}</span></td>
          <td style="padding: 6px 8px; text-align: center; color: #64748b;">${r.month}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #0f172a;">${r.totalDue.toLocaleString()}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #059669;">${r.paidAmount.toLocaleString()}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: ${r.balance > 0 ? '#dc2626' : '#64748b'};">${r.balance.toLocaleString()}</td>
          <td style="padding: 6px 8px; text-align: center; font-size: 10px; color: #475569;">${pTimeStr}</td>
          <td style="padding: 6px 8px; text-align: center;">${statusBadge}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filterTitle} - ${schoolName}</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 15px; color: #0f172a; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 12px; }
            .school-name { font-size: 22px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; margin: 0; }
            .sub-title { font-size: 13px; font-weight: 800; color: #2563eb; margin: 4px 0; }
            .meta { font-size: 11px; color: #64748b; margin-top: 4px; display: flex; justify-content: space-between; }
            .summary-box { display: flex; gap: 15px; justify-content: space-around; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 11px; }
            .summary-box div { text-align: center; }
            .summary-box div b { display: block; font-size: 14px; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background: #f1f5f9; color: #1e293b; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 8px; border-bottom: 2px solid #94a3b8; text-align: left; }
            .signatures { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #475569; padding: 0 40px; }
            .sig-line { border-top: 1px solid #94a3b8; width: 180px; text-align: center; padding-top: 5px; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 15px; text-align: right;">
            <button onclick="window.print()" style="padding: 8px 18px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Print Now</button>
            <button onclick="window.close()" style="padding: 8px 18px; background: #64748b; color: white; border: none; border-radius: 6px; font-weight: bold; margin-left: 8px; cursor: pointer;">Close</button>
          </div>

          <div class="header">
            <h1 class="school-name">${schoolName}</h1>
            <div class="sub-title">${filterTitle}</div>
            <div class="meta">
              <span><b>Class Filter:</b> ${sheetClassFilter} | <b>Month:</b> ${sheetMonthFilter}</span>
              <span><b>Printed On:</b> ${dateStr} at ${timeStr}</span>
            </div>
          </div>

          <div class="summary-box">
            <div>Total Students<b>${sheetMetrics.totalCount}</b></div>
            <div>Fully Paid<b><span style="color:#059669;">${sheetMetrics.paidCount}</span></b></div>
            <div>Partial<b><span style="color:#d97706;">${sheetMetrics.partialCount}</span></b></div>
            <div>Unpaid / Defaulters<b><span style="color:#dc2626;">${sheetMetrics.unpaidCount}</span></b></div>
            <div>Total Fee Due<b>Rs. ${sheetMetrics.totalDue.toLocaleString()}</b></div>
            <div>Total Collected<b><span style="color:#059669;">Rs. ${sheetMetrics.totalCollected.toLocaleString()}</span></b></div>
            <div>Total Balance Arrears<b><span style="color:#dc2626;">Rs. ${sheetMetrics.totalBalance.toLocaleString()}</span></b></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 30px;">#</th>
                <th style="width: 70px;">Voucher</th>
                <th>Student Name</th>
                <th style="text-align: center; width: 60px;">Roll No</th>
                <th style="text-align: center; width: 60px;">Class</th>
                <th>Father Name & Phone</th>
                <th style="text-align: center; width: 70px;">Month</th>
                <th style="text-align: right; width: 80px;">Total Due</th>
                <th style="text-align: right; width: 80px;">Paid</th>
                <th style="text-align: right; width: 80px;">Balance</th>
                <th style="text-align: center; width: 120px;">Payment Date & Time</th>
                <th style="text-align: center; width: 70px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-line">Fee Incharge / Cashier</div>
            <div class="sig-line">Accountant / Auditor</div>
            <div class="sig-line">Principal Signature & Stamp</div>
          </div>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  const handleExportCSV = () => {
    if (sortedSheetRows.length === 0) {
      alert('Is sheet me export karne ke liye koi record mojood nahi hai.');
      return;
    }

    const headers = [
      'Sr',
      'Voucher No',
      'Student Name',
      'Roll / GR No',
      'Class',
      'Father Name',
      'Father Phone',
      'Month',
      'Total Due (Rs)',
      'Paid Amount (Rs)',
      'Balance Remaining (Rs)',
      'Payment Date & Time',
      'Status'
    ];

    const rows = sortedSheetRows.map((r, idx) => {
      const pTimeStr = r.paidDateObj && r.paidDateObj.getTime() > 0
        ? r.paidDateObj.toLocaleDateString('en-PK') + ' ' + r.paidDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : 'Not Paid';

      return [
        idx + 1,
        `"${r.voucherNo || ''}"`,
        `"${r.studentName || ''}"`,
        `"${r.rollNo || ''}"`,
        `"${r.className || ''}"`,
        `"${r.fatherName || ''}"`,
        `"${r.fatherPhone || ''}"`,
        `"${r.month || ''}"`,
        r.totalDue,
        r.paidAmount,
        r.balance,
        `"${pTimeStr}"`,
        `"${r.status}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Fee_Payment_Sheet_${sheetStatusFilter}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendWhatsAppReceiptOrReminder = (row) => {
    const phone = row.fatherPhone;
    if (!phone) {
      alert('Is student ke record me phone number mojood nahi hai.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;

    let text = '';
    if (row.status === 'Paid') {
      text = encodeURIComponent(`السلام علیکم! محترم والدین، آپ کے بچے *${row.studentName}* (کلاس: ${row.className}، رول نمبر: ${row.rollNo}) کی ماہ *${row.month}* کی فیس مبلغ *روپے ${row.paidAmount.toLocaleString()}* موصول ہو چکی ہے۔ شکریہ! ادارہ: *${schoolName}*`);
    } else if (row.status === 'Partial') {
      text = encodeURIComponent(`السلام علیکم! محترم والدین، آپ کے بچے *${row.studentName}* (کلاس: ${row.className}) کی ماہ *${row.month}* کی فیس میں سے مبلغ *روپے ${row.paidAmount.toLocaleString()}* وصول ہوئے۔ بقیہ واجب الادا رقم: *روپے ${row.balance.toLocaleString()}* ہے۔ برائے مہربانی بقیہ رقم جلد ادا فرمائیں۔ ادارہ: *${schoolName}*`);
    } else {
      text = encodeURIComponent(`السلام علیکم! محترم والدین، آپ کے بچے *${row.studentName}* (کلاس: ${row.className}، رول نمبر: ${row.rollNo}) کی ماہ *${row.month}* کی فیس مبلغ *روپے ${row.totalDue.toLocaleString()}* ابھی تک واجب الادا ہے۔ برائے مہربانی سکول آفس میں فیس فوری جمع کروائیں۔ شکریہ! ادارہ: *${schoolName}*`);
    }

    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  // ─── Real-time Data Listener ────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    let latestStudents = [], latestVouchers = [], studentsLoaded = false, vouchersLoaded = false;

    const processData = (students, vouchers) => {
      setAllStudents(students);
      setAllVouchers(vouchers);
      const paidVouchers = vouchers
        .filter(v => (v.status === 'Paid' || v.status === 'Partial') && v.paidAt)
        .sort((a, b) => parseDateSafely(b.paidAt) - parseDateSafely(a.paidAt));
      setRecentPayments(paidVouchers.slice(0, 50));
      let todayTotal = 0, monthTotal = 0, arrearsTotal = 0;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const thisMonth = today.getMonth(), thisYear = today.getFullYear();
      vouchers.forEach(v => {
        const tot = Number(v.totalAmount) || 0;
        const paid = Number(v.paidAmount) || 0;
        const rem = tot - paid;
        if (rem > 0) arrearsTotal += rem;
        if (v.paidAt && (v.status === 'Paid' || v.status === 'Partial')) {
          const pDate = parseDateSafely(v.paidAt);
          if (pDate.toISOString().split('T')[0] === todayStr) todayTotal += paid;
          if (pDate.getMonth() === thisMonth && pDate.getFullYear() === thisYear) monthTotal += paid;
        }
      });
      setDashboardStats({ today: todayTotal, month: monthTotal, arrears: arrearsTotal });
      setLoading(false);
    };

    const unsubStudents = subscribeToCollection('students', schoolId, (s) => {
      latestStudents = s || []; studentsLoaded = true;
      if (vouchersLoaded) processData(latestStudents, latestVouchers);
    });
    const unsubVouchers = subscribeToCollection('vouchers', schoolId, (v) => {
      latestVouchers = v || []; vouchersLoaded = true;
      if (studentsLoaded) processData(latestStudents, latestVouchers);
    });
    return () => { unsubStudents(); unsubVouchers(); };
  }, [schoolId]);

  // ─── Update pending vouchers when family is selected ─────────────────────
  useEffect(() => {
    if (!selectedFamily) return;
    const studs = allStudents.filter(s => getFamilyKey(s) === selectedFamily.key);
    setFamilyStudents(studs);

    let pending = allVouchers.filter(v => v.status !== 'Paid' && doesVoucherBelongToFamily(v, studs));

    // Only show the most recent pending voucher to avoid double payments of rolled-over arrears
    pending.sort((a, b) => {
      const dateA = parseDateSafely(a.createdAt || a.month || 0);
      const dateB = parseDateSafely(b.createdAt || b.month || 0);
      return dateB - dateA;
    });
    if (pending.length > 1) {
      pending = [pending[0]];
    }

    const paid = allVouchers
      .filter(v => (v.status === 'Paid' || v.status === 'Partial') && doesVoucherBelongToFamily(v, studs))
      .sort((a, b) => parseDateSafely(b.paidAt) - parseDateSafely(a.paidAt));

    setPendingVouchers(pending);
    setPaidVouchersForFamily(paid);

    const entries = {};
    pending.forEach(v => {
      const rem = (Number(v.totalAmount) || 0) - (Number(v.paidAmount) || 0) - (Number(v.discountAmount) || 0);
      entries[v.id] = { payAmount: rem > 0 ? rem : 0, discountAmount: '', payDate: new Date().toISOString().split('T')[0] };
    });
    setPaymentEntries(entries);
  }, [selectedFamily, allVouchers, allStudents]);

  // ─── Click Outside to close suggestions ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Search Logic ─────────────────────────────────────────────────────────
  const searchSuggestions = searchTerm.length >= 2 ? (() => {
    const term = searchTerm.toLowerCase();
    const families = new Map();
    allStudents.forEach(s => {
      const gr = String(s.admissionNumber || s.rollNo || s.grNo || s.grNumber || s.rollNumber || '').toLowerCase();
      const match = String(s.name || '').toLowerCase().includes(term) ||
        String(s.fatherName || '').toLowerCase().includes(term) ||
        gr.includes(term);
      const voucherMatch = !match && allVouchers.some(v => {
        const vNo = String(v.voucherNo || v.voucherNumber || v.id || '').toLowerCase();
        if (!vNo.includes(term)) return false;
        if (v.studentId) return v.studentId === s.id;
        return v.childrenDetails?.some(vc =>
          gr && String(vc.admNo || '').trim().toLowerCase() === gr
        );
      });
      if (match || voucherMatch) {
        const key = getFamilyKey(s);
        if (!families.has(key)) {
          families.set(key, { key, fatherName: s.fatherName || 'Unknown', phone: s.parentPhone || s.fatherPhone || s.phone || '', students: [] });
        }
        const entry = families.get(key);
        if (!entry.students.find(x => x.id === s.id)) entry.students.push(s);
      }
    });
    return Array.from(families.values()).slice(0, 8);
  })() : [];

  const handleSelectFamily = (fam) => {
    setSelectedFamily(fam);
    setSearchTerm('');
    setShowSuggestions(false);
    setStep(2);
    setLastReceipt(null);
  };

  const resetSearch = () => {
    setSelectedFamily(null);
    setFamilyStudents([]);
    setPendingVouchers([]);
    setStep(1);
    setSearchTerm('');
    setLastReceipt(null);
  };

  // ─── Pay / Collect Direct Unbilled Product Charge ─────────────────────────
  const [payingProductChargeId, setPayingProductChargeId] = useState(null);

  const handlePayProductCharge = async (student, charge) => {
    if (!window.confirm(`Collect payment of Rs. ${Number(charge.totalAmount || charge.amount || 0).toLocaleString()} for "${charge.itemName || charge.name}"?`)) {
      return;
    }

    setPayingProductChargeId(charge.id || charge.invoiceNo);
    try {
      const chargeAmount = Number(charge.totalAmount || charge.amount || 0);

      // 1. Mark charge as billed/paid on student document & update student balance
      const latestStudent = familyStudents.find(s => s.id === student.id) || student;
      const currentCharges = Array.isArray(latestStudent.pendingProductCharges) ? latestStudent.pendingProductCharges : [];
      const updatedCharges = currentCharges.map(p => {
        if ((p.id && p.id === charge.id) || (p.invoiceNo && p.invoiceNo === charge.invoiceNo)) {
          return { ...p, status: 'paid', paidAt: new Date().toISOString() };
        }
        return p;
      });

      const currentBal = Number(latestStudent.balance !== undefined ? latestStudent.balance : (latestStudent.arrears || 0)) || 0;
      const newBal = Math.max(0, currentBal - chargeAmount);

      // 2. Add to productPaymentHistory for Transaction Ledger
      const existingHistory = Array.isArray(latestStudent.productPaymentHistory) ? latestStudent.productPaymentHistory : [];
      const newHistoryEntry = {
        id: `PPH-${Date.now()}`,
        itemName: charge.itemName || charge.name || 'Store Item',
        category: charge.category || 'Store Item',
        invoiceNo: charge.invoiceNo || '',
        quantity: charge.quantity || 1,
        unit: charge.unit || 'pcs',
        amount: chargeAmount,
        paidAt: new Date().toISOString(),
        month: (charge.date || new Date().toISOString()).slice(0, 7),
        feeType: 'Product Fee',
      };
      const updatedHistory = [...existingHistory, newHistoryEntry];

      await updateRecord('students', student.id, {
        balance: newBal,
        arrears: newBal,
        pendingProductCharges: updatedCharges,
        productPaymentHistory: updatedHistory,
      });

      // 3. Also update in local state for instantaneous feedback
      setFamilyStudents(prev => prev.map(s => s.id === student.id ? {
        ...s,
        balance: newBal,
        arrears: newBal,
        pendingProductCharges: updatedCharges,
        productPaymentHistory: updatedHistory,
      } : s));

      // 3. Generate receipt popup
      const fatherName = student.fatherName || familyStudents[0]?.fatherName || 'Parent';
      const phone = student.parentPhone || student.fatherPhone || student.phone || '';

      setLastReceipt({
        voucherNo: charge.invoiceNo || `POS-${Date.now().toString().slice(-4)}`,
        fatherName,
        phone,
        month: new Date().toISOString().slice(0, 7),
        totalDue: chargeAmount,
        paidAmount: chargeAmount,
        discountAmount: 0,
        currentPaid: chargeAmount,
        previousPaid: 0,
        status: 'Paid',
        remaining: 0,
        isProductReceipt: true,
        productName: charge.itemName || charge.name,
        quantity: charge.quantity || 1
      });

      setStep(3);
      alert(`✅ Payment of Rs. ${chargeAmount.toLocaleString()} for "${charge.itemName || charge.name}" collected successfully!`);
    } catch (err) {
      console.error('Error paying product charge:', err);
      alert('Failed to record product payment: ' + err.message);
    } finally {
      setPayingProductChargeId(null);
    }
  };

  const handleRemoveProductCharge = async (student, charge) => {
    if (!window.confirm(`Kya aap waqai is item "${charge.itemName || charge.name}" (Rs. ${Number(charge.totalAmount || charge.amount || 0).toLocaleString()}) ko student ke record se mukammal remove karna chahte hain?`)) {
      return;
    }

    try {
      const chargeAmount = Number(charge.totalAmount || charge.amount || 0);
      const currentCharges = Array.isArray(student.pendingProductCharges) ? student.pendingProductCharges : [];
      const updatedCharges = currentCharges.filter(p => {
        if (p.id && charge.id && p.id === charge.id) return false;
        if (p.invoiceNo && charge.invoiceNo && p.invoiceNo === charge.invoiceNo) return false;
        return true;
      });

      const currentBal = Number(student.balance !== undefined ? student.balance : (student.arrears || 0)) || 0;
      const newBal = Math.max(0, currentBal - chargeAmount);

      await updateRecord('students', student.id, {
        balance: newBal,
        arrears: newBal,
        pendingProductCharges: updatedCharges
      });

      setFamilyStudents(prev => prev.map(s => s.id === student.id ? {
        ...s,
        balance: newBal,
        arrears: newBal,
        pendingProductCharges: updatedCharges
      } : s));

      alert(`🗑️ "${charge.itemName || charge.name}" student ke record se kamyabi ke sath remove kar diya gaya!`);
    } catch (err) {
      console.error('Error removing product charge:', err);
      alert('Failed to remove product charge: ' + err.message);
    }
  };

  // ─── Add Product Fee to Monthly Voucher ────────────────────────────────────
  const handleAddProductToVoucher = async (group, voucher) => {
    if (!voucher || !voucher.id) {
      alert('Koi pending voucher nahi mila. Pehle voucher generate karein.');
      return;
    }
    const confirmed = window.confirm(
      `"${group.itemName}" (Rs. ${group.totalAmount.toLocaleString()}) ko ${voucher.month} ke voucher mein add karein?\n\nYeh amount voucher ki total mein add ho jayegi. Agar parent sirf school fees pay kare, toh baki amount arrears mein chala jayega aur next month ke voucher mein show hoga.`
    );
    if (!confirmed) return;

    try {
      const existingStoreItems = Array.isArray(voucher.storeItems) ? voucher.storeItems : [];
      const newStoreItem = {
        id: `SI-${Date.now()}`,
        itemName: group.itemName,
        category: group.category || 'Store Item',
        quantity: group.totalQty,
        unit: group.unit || 'pcs',
        amount: group.totalAmount,
        studentId: group.student.id,
        studentName: group.student.name,
        addedAt: new Date().toISOString(),
        invoices: group.charges.map(c => c.invoiceNo).filter(Boolean),
      };
      const updatedStoreItems = [...existingStoreItems, newStoreItem];
      const newVoucherTotal = (Number(voucher.totalAmount) || 0) + group.totalAmount;

      await updateRecord('vouchers', voucher.id, {
        totalAmount: newVoucherTotal,
        storeItems: updatedStoreItems,
      });

      const student = group.student;
      const latestStudent = familyStudents.find(s => s.id === student.id) || student;
      const currentCharges = Array.isArray(latestStudent.pendingProductCharges) ? latestStudent.pendingProductCharges : [];
      const removeInvoices = new Set(group.charges.map(ch => ch.invoiceNo).filter(Boolean));
      const removeIds = new Set(group.charges.map(ch => ch.id).filter(Boolean));
      const updatedCharges = currentCharges.map(p => {
        if ((p.invoiceNo && removeInvoices.has(p.invoiceNo)) || (p.id && removeIds.has(p.id))) {
          return { ...p, status: 'billed', voucherId: voucher.id, billedAt: new Date().toISOString() };
        }
        return p;
      });

      await updateRecord('students', student.id, { pendingProductCharges: updatedCharges });

      setFamilyStudents(prev => prev.map(s => s.id === student.id ? { ...s, pendingProductCharges: updatedCharges } : s));

      setPendingVouchers(prev => prev.map(v => v.id === voucher.id ? {
        ...v, totalAmount: newVoucherTotal, storeItems: updatedStoreItems,
      } : v));

      const newRemaining = newVoucherTotal - (Number(voucher.paidAmount) || 0) - (Number(voucher.discountAmount) || 0);
      setPaymentEntries(prev => ({
        ...prev,
        [voucher.id]: { ...prev[voucher.id], payAmount: Math.max(0, newRemaining) }
      }));

      alert(`✅ "${group.itemName}" (Rs. ${group.totalAmount.toLocaleString()}) ${voucher.month} ke voucher mein add ho gaya!\n\nAgar parent sirf school fees pay kare, toh Rs. ${group.totalAmount.toLocaleString()} automatically arrears mein chala jayega aur next month ke voucher mein show hoga.`);
    } catch (err) {
      console.error('Error adding product to voucher:', err);
      alert('Voucher mein add karne mein masla: ' + err.message);
    }
  };

  // ─── Payment Handler ──────────────────────────────────────────────────────
  const handlePayNow = async (voucher) => {
    const entry = paymentEntries[voucher.id] || {};
    const payAmount = Number(entry.payAmount) || 0;
    const newDiscount = Number(entry.discountAmount) || 0;
    if (payAmount <= 0 && newDiscount <= 0) { alert('Please enter a payment or discount amount'); return; }

    const totalDue = Number(voucher.totalAmount) || 0;
    const alreadyPaid = Number(voucher.paidAmount) || 0;
    const alreadyDisc = Number(voucher.discountAmount) || 0;
    const remaining = totalDue - alreadyPaid - alreadyDisc;

    if ((payAmount + newDiscount) > remaining + 1) {
      alert(`Cannot exceed remaining amount: Rs. ${remaining.toLocaleString()}`);
      return;
    }

    setProcessingId(voucher.id);
    try {
      const newPaid = alreadyPaid + payAmount;
      const totalDisc = alreadyDisc + newDiscount;
      let newStatus = (newPaid + totalDisc) >= totalDue ? 'Paid' : (newPaid > 0 || totalDisc > 0) ? 'Partial' : 'Unpaid';

      const historyEntry = {
        amount: payAmount,
        discount: newDiscount,
        date: entry.payDate || new Date().toISOString(),
        id: Date.now().toString()
      };
      const updatedHistory = [...(voucher.paymentHistory || []), historyEntry];

      await updateRecord('vouchers', voucher.id, {
        status: newStatus, paidAmount: newPaid, discountAmount: totalDisc,
        paidAt: entry.payDate || new Date().toISOString(),
        paymentHistory: updatedHistory
      });

      const phone = voucher.parentPhone || voucher.fatherPhone || voucher.phone ||
        familyStudents[0]?.parentPhone || familyStudents[0]?.fatherPhone || familyStudents[0]?.phone || '';
      const fatherName = voucher.fatherName || familyStudents[0]?.fatherName || 'Parent';

      setLastReceipt({
        voucherNo: voucher.voucherNo || voucher.voucherNumber || voucher.id.slice(0, 6),
        fatherName, phone, month: voucher.month, totalDue,
        paidAmount: newPaid, discountAmount: totalDisc,
        currentPaid: payAmount,
        previousPaid: alreadyPaid,
        status: newStatus, remaining: totalDue - newPaid - totalDisc
      });

      if (whatsappEnabled && phone) {
        const childrenText = voucher.selectionType === 'family' && voucher.childrenDetails
          ? voucher.childrenDetails.map((c, i) =>
              `${i + 1}. *${c.name}* | Grade: ${c.class || 'N/A'} | Roll: ${c.admNo || 'N/A'}`
            ).join('\n')
          : `*${voucher.studentName || 'Student'}*`;
        const msg = `✅ *FEE PAYMENT RECEIPT*\n\nAssalam-o-Alaikum *${fatherName}* Sb!\n\n📚 *Children:*\n${childrenText}\n\n━━━━━━━━━━━━━━━━━━\n📅 Month: ${voucher.month || '-'}\n🧾 Voucher #: ${voucher.voucherNo || voucher.id.slice(0, 6)}\n💰 Total Due: Rs. ${totalDue.toLocaleString()}\n🎁 Discount: Rs. ${totalDisc.toLocaleString()}\n${alreadyPaid > 0 ? `🕒 Previously Paid: Rs. ${alreadyPaid.toLocaleString()}\n` : ''}✅ Amount Paid: *Rs. ${payAmount.toLocaleString()}*\n📉 Remaining: Rs. ${(totalDue - newPaid - totalDisc).toLocaleString()}\n━━━━━━━━━━━━━━━━━━\n\nShukria! Fees pay karne par bahut shukriya.\n— ${schoolName}`;
        fetch('https://umarhayat.alwaysdata.net/api/message/send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId, phone, message: msg })
        }).catch(() => {});
      }

      setStep(3);
    } catch (err) {
      console.error(err); alert('Payment failed. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePayAll = async () => {
    const totalRemaining = pendingVouchers.reduce((acc, v) => acc + Math.max(0, (Number(v.totalAmount)||0) - (Number(v.paidAmount)||0) - (Number(v.discountAmount)||0)), 0);
    if (totalRemaining <= 0) return;
    
    if (!window.confirm(`Are you sure you want to pay ALL pending dues (Rs. ${totalRemaining.toLocaleString()})?`)) return;

    setProcessingId('all');
    try {
      const updates = pendingVouchers.map(async (voucher) => {
        const totalDue = Number(voucher.totalAmount) || 0;
        const alreadyDisc = Number(voucher.discountAmount) || 0;
        const newPaid = totalDue - alreadyDisc; // Pay remaining full
        
        await updateRecord('vouchers', voucher.id, {
          status: 'Paid', 
          paidAmount: newPaid, 
          paidAt: new Date().toISOString()
        });
      });

      await Promise.all(updates);
      alert('✅ All pending vouchers marked as Paid successfully!');
      
      const phone = familyStudents[0]?.parentPhone || familyStudents[0]?.fatherPhone || familyStudents[0]?.phone || '';
      const fatherName = familyStudents[0]?.fatherName || 'Parent';

      if (whatsappEnabled && phone) {
        const msg = `✅ *FEE PAYMENT RECEIPT*\n\nAssalam-o-Alaikum *${fatherName}* Sb!\n\nAll pending dues of *Rs. ${totalRemaining.toLocaleString()}* have been successfully paid. Thank you!\n— ${schoolName}`;
        fetch('https://umarhayat.alwaysdata.net/api/message/send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId, phone, message: msg })
        }).catch(() => {});
      }

      setStep(1); // Go back to search or refresh
      resetSearch();
    } catch (err) {
      console.error(err); alert('Payment failed. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  // ─── Edit Payment Handler ──────────────────────────────────────────────────
  const openEditModal = (v) => {
    setEditingVoucher(v);
    setEditForm({
      paidAmount: String(Number(v.paidAmount) || 0),
      discountAmount: String(Number(v.discountAmount) || 0),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingVoucher) return;
    setEditProcessing(true);
    const newPaid = Number(editForm.paidAmount) || 0;
    const newDisc = Number(editForm.discountAmount) || 0;
    const totalDue = Number(editingVoucher.totalAmount) || 0;
    let autoStatus = (newPaid + newDisc) >= totalDue ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';
    try {
      const historyEntry = {
        amount: newPaid,
        discount: newDisc,
        date: new Date().toISOString(),
        id: Date.now().toString(),
        note: 'Manual Adjustment'
      };
      const updatedHistory = [...(editingVoucher.paymentHistory || []), historyEntry];

      await updateRecord('vouchers', editingVoucher.id, {
        paidAmount: newPaid, discountAmount: newDisc, status: autoStatus,
        paymentHistory: updatedHistory
      });
      alert(`✅ Voucher updated! Status: ${autoStatus} | Paid: Rs. ${newPaid.toLocaleString()}`);
      setEditingVoucher(null);
    } catch(err) {
      alert('❌ Error: ' + err.message);
    } finally {
      setEditProcessing(false);
    }
  };

  // ─── Print Receipt Handler ───────────────────────────────────────────
  const handlePrintReceipt = (receipt) => {
    const logoHtml = schoolData?.logo
      ? `<img src="${schoolData.logo}" />`
      : `<div class="logo-fallback">${schoolName.charAt(0)}</div>`;

    const tDue = Number(receipt.totalDue || receipt.totalAmount) || 0;
    const tDisc = Number(receipt.discountAmount) || 0;
    
    // Check if we have current transaction amounts, otherwise fallback to cumulative totals
    const tPaid = receipt.currentPaid !== undefined ? Number(receipt.currentPaid) : (Number(receipt.paidAmount) || 0);
    const tPrevPaid = Number(receipt.previousPaid) || 0;
    
    const tBal = Math.max(0, tDue - (tPrevPaid + tPaid) - tDisc);
    
    let currentFee = 0;
    let prevArrears = 0;
    
    if (receipt.feeItems && receipt.feeItems.length > 0) {
      receipt.feeItems.forEach(item => {
        if (String(item.name).toLowerCase().includes('arrear')) {
          prevArrears += Number(item.amount) || 0;
        } else {
          currentFee += Number(item.amount) || 0;
        }
      });
      if (prevArrears === 0 && tDue > currentFee && currentFee > 0) {
        prevArrears = tDue - currentFee;
      }
    } else {
      currentFee = (receipt.childrenDetails || []).reduce((sum, c) => sum + (Number(c.fee || c.feeAmount || c.totalFee || c.amount || 0)), 0);
      prevArrears = Math.max(0, tDue - currentFee);
    }
    
    const childRows = (receipt.childrenDetails && receipt.childrenDetails.length > 0) ? receipt.childrenDetails.map((c, idx) => {
      return `<tr>
        <td class="text-center">${c.admNo || '-'}</td>
        <td>${c.name || '-'}</td>
        <td class="text-center">${c.class || '-'}</td>
        ${idx === 0 ? `<td class="amount-cell"><div class="amt-row"><span>Fee</span><span>${currentFee.toLocaleString()}</span></div><div class="amt-row"><span>Arrears</span><span>${prevArrears.toLocaleString()}</span></div></td>` : `<td></td>`}
      </tr>`;
    }).join('') : `<tr>
        <td class="text-center">-</td>
        <td>${receipt.fatherName || '-'}</td>
        <td class="text-center">-</td>
        <td class="amount-cell"><div class="amt-row"><span>Fee</span><span>${currentFee.toLocaleString()}</span></div><div class="amt-row"><span>Arrears</span><span>${prevArrears.toLocaleString()}</span></div></td>
      </tr>`;
      
    const html = `<!DOCTYPE html>
<html>
<head>
<title>Fee Receipt - #${receipt.voucherNo}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Arial', sans-serif; font-size:12px; }
  body { background:#f3f4f6; display:flex; justify-content:center; padding:20px; }
  .no-print { text-align:center; margin-bottom: 20px; }
  .print-btn { padding:10px 20px; background:#4f46e5; color:#fff; border:none; border-radius:5px; cursor:pointer; font-weight:bold; font-size: 14px; }
  .voucher-wrapper { display:flex; flex-direction: row; gap: 0; background:#f3f4f6; }
  .voucher { width: 105mm; background: #fff; padding: 20px; position: relative; border: 1px solid #d1d5db; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
  .cut-line { width: 20px; display: flex; flex-direction: column; align-items: center; justify-content: space-around; position: relative; }
  .cut-line::before { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; border-left: 1px dashed #9ca3af; }
  .cut-icon { font-size: 14px; color: #9ca3af; background: #f3f4f6; z-index: 10; padding: 5px 0; }
  .header { display:flex; align-items:center; gap:10px; border-bottom: 1px solid #000; padding-bottom:10px; margin-bottom:15px; }
  .logo img { width:55px; height:55px; object-fit:contain; }
  .logo-fallback { width:55px; height:55px; border-radius:50%; background:#4f46e5; display:flex; align-items:center; justify-content:center; color:white; font-size:24px; font-weight:900; }
  .school-title { font-size:16px; font-weight:bold; color:#000; }
  .branch-name { font-size:12px; color:#555; margin-top:2px; }
  .copy-header { display:flex; justify-content:space-between; align-items:flex-end; font-weight:bold; margin-top:10px; text-transform:uppercase; font-size:11px; }
  .info-grid { display:grid; grid-template-columns: 80px 1fr; row-gap: 6px; margin-bottom: 15px; font-size:12px; font-weight:bold; }
  .info-grid .label { font-weight:bold; color:#000; }
  .info-grid .value { font-weight:normal; color:#000; }
  .table { width:100%; border-collapse:collapse; margin-bottom: 0; }
  .table th, .table td { border:1px solid #6b7280; padding:6px; text-align:left; }
  .table th { background:#6b7280; color:#fff; font-size: 11px; font-weight:bold; border: 1px solid #6b7280; }
  .text-center { text-align:center !important; }
  .amount-cell { padding: 0 !important; }
  .amt-row { display:flex; justify-content:space-between; padding: 4px 6px; border-bottom: 1px solid #6b7280; }
  .amt-row:last-child { border-bottom: none; }
  .totals-row { display:flex; justify-content:space-between; font-weight:bold; font-size:12px; padding:6px; border:1px solid #6b7280; border-top:none; }
  .totals-row.payable { background:#e5e7eb; font-size:13px; margin-top:10px; border:1px solid #6b7280; }
  .totals-row.received { background:#dcfce7; color:#166534; font-size:13px; border:1px solid #6b7280; border-top:none; }
  .totals-row.balance { background:#fef2f2; color:#991b1b; font-size:12px; border:1px solid #6b7280; border-top:none; }
  @media print {
    body { background:#fff; padding:0; display:block; }
    .voucher-wrapper { box-shadow:none; background:#fff; }
    .voucher { border:1px solid #d1d5db; box-shadow:none; }
    .cut-icon { background:#fff; }
    .no-print { display:none !important; }
  }
</style>
</head>
<body>
<div>
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Print Receipt</button>
  </div>
  <div class="voucher-wrapper">
    ${['SCHOOL COPY', 'PARENT COPY'].map((copyType, idx) => `
      ${idx > 0 ? '<div class="cut-line"><div class="cut-icon">✂</div><div class="cut-icon">✂</div><div class="cut-icon">✂</div></div>' : ''}
      <div class="voucher">
        <div class="header">
          <div class="logo">${logoHtml}</div>
          <div style="flex:1;">
            <div class="school-title">${schoolName}</div>
            <div class="branch-name">Main</div>
            <div class="copy-header">
              <span>${copyType} (RECEIPT)</span>
              <span>Voucher #${receipt.voucherNo}</span>
            </div>
          </div>
        </div>
        <div class="info-grid">
          <div class="label">Month</div><div class="value">${receipt.month || '-'}</div>
          <div class="label">Due Date</div><div class="value">${receipt.dueDate || '-'}</div>
          <div class="label">Ft. Name</div><div class="value">${receipt.fatherName || '-'}</div>
          <div class="label">No Of child</div><div class="value">${receipt.childrenDetails?.length || 1}</div>
          <div class="label">NIC</div><div class="value">${receipt.fatherCnic || '-'}</div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th style="width:15%;" class="text-center">Adm#</th>
              <th style="width:40%;">Name</th>
              <th style="width:15%;" class="text-center">Class</th>
              <th style="width:30%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${childRows}
          </tbody>
        </table>
        <div class="totals-row payable">
          <span style="flex:1; text-align:right; padding-right:10px;">Total Payable</span>
          <span style="width:30%; padding-left:6px; border-left:1px solid #6b7280; text-align:right;">${tDue.toLocaleString()}</span>
        </div>
        <div class="totals-row received">
          <span style="flex:1; text-align:right; padding-right:10px;">Amount Received</span>
          <span style="width:30%; padding-left:6px; border-left:1px solid #6b7280; text-align:right;">${tPaid.toLocaleString()}</span>
        </div>
        ${tBal > 0 ? `<div class="totals-row balance">
          <span style="flex:1; text-align:right; padding-right:10px;">Balance Remaining</span>
          <span style="width:30%; padding-left:6px; border-left:1px solid #6b7280; text-align:right;">${tBal.toLocaleString()}</span>
        </div>` : `<div class="totals-row balance" style="background:#f0fdf4; color:#16a34a;">
          <span style="flex:1; text-align:right; padding-right:10px;">Balance Remaining</span>
          <span style="width:30%; padding-left:6px; border-left:1px solid #6b7280; text-align:right;">0</span>
        </div>`}
      </div>
    `).join('')}
  </div>
</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=950,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  // ─── Thermal Receipt (80mm POS Roll) Handler ─────────────────────────────
  const handlePrintThermalReceipt = (receipt) => {
    const tDue = Number(receipt.totalDue || receipt.totalAmount) || 0;
    const tDisc = Number(receipt.discountAmount) || 0;
    const tPaid = receipt.currentPaid !== undefined ? Number(receipt.currentPaid) : (Number(receipt.paidAmount) || 0);
    const tPrevPaid = Number(receipt.previousPaid) || 0;
    const tBal = Math.max(0, tDue - (tPrevPaid + tPaid) - tDisc);
    const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });

    const studentRows = (receipt.childrenDetails || []).map(c => `
      <div style="display:flex; justify-content:space-between; margin-bottom:3px; font-size:12px;">
        <span style="font-weight:bold;">${c.name || 'Student'}</span>
        <span>Class: ${c.class || '-'}${c.admNo ? ` (Adm: ${c.admNo})` : ''}</span>
      </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Thermal Receipt - ${receipt.voucherNo || 'Fee'}</title>
<style>
  @page {
    size: 80mm auto;
    margin: 0;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    color: #000;
  }
  body {
    width: 76mm;
    margin: 0 auto;
    padding: 10px 4px;
    background: #fff;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .school-title { font-size: 16px; font-weight: 900; margin-bottom: 2px; }
  .school-sub { font-size: 10px; margin-bottom: 3px; }
  .divider { border-top: 1px dashed #000; margin: 8px 0; }
  .double-divider { border-top: 2px dashed #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .amount-box { background: #f0f0f0; padding: 4px; margin: 6px 0; }
  .big-amt { font-size: 15px; font-weight: 900; }
  .no-print { text-align: center; margin-bottom: 12px; }
  .btn {
    padding: 8px 16px;
    background: #000;
    color: #fff;
    border: none;
    font-weight: bold;
    font-family: sans-serif;
    cursor: pointer;
    border-radius: 4px;
  }
  @media print {
    .no-print { display: none !important; }
    body { padding: 4px; }
  }
</style>
</head>
<body>
  <div class="no-print">
    <button class="btn" onclick="window.print()">🖨️ Print 80mm Thermal Slip</button>
  </div>

  <div class="center">
    <div class="school-title">${schoolName}</div>
    ${schoolData?.address ? `<div class="school-sub">${schoolData.address}</div>` : ''}
    ${schoolData?.phone ? `<div class="school-sub">Helpline: ${schoolData.phone}</div>` : ''}
    <div class="bold" style="font-size:13px; margin-top:4px; text-transform:uppercase;">** FEE PAYMENT RECEIPT **</div>
  </div>

  <div class="divider"></div>

  <div class="row"><span>Receipt No:</span><span class="bold">#${receipt.voucherNo || receipt.id?.slice(0, 8) || 'REC'}</span></div>
  <div class="row"><span>Date/Time:</span><span>${printDate}</span></div>
  <div class="row"><span>Billing Month:</span><span class="bold">${receipt.month || '-'}</span></div>
  <div class="row"><span>Parent:</span><span class="bold">${receipt.fatherName || 'Parent'}</span></div>
  ${receipt.fatherPhone ? `<div class="row"><span>Phone:</span><span>${receipt.fatherPhone}</span></div>` : ''}

  <div class="divider"></div>
  <div class="bold" style="margin-bottom:4px;">STUDENT(S) BILLED:</div>
  ${studentRows || `<div class="row"><span>${receipt.fatherName || 'Student'}</span><span>-</span></div>`}

  <div class="double-divider"></div>

  <div class="row"><span>Total Due Amount:</span><span>Rs. ${tDue.toLocaleString()}</span></div>
  ${tDisc > 0 ? `<div class="row"><span>Special Discount:</span><span>- Rs. ${tDisc.toLocaleString()}</span></div>` : ''}
  ${tPrevPaid > 0 ? `<div class="row"><span>Previously Paid:</span><span>Rs. ${tPrevPaid.toLocaleString()}</span></div>` : ''}

  <div class="divider"></div>

  <div class="row amount-box">
    <span class="big-amt">PAID NOW:</span>
    <span class="big-amt">Rs. ${tPaid.toLocaleString()}</span>
  </div>

  <div class="row bold" style="margin-top:4px;">
    <span>REMAINING BALANCE:</span>
    <span>Rs. ${tBal.toLocaleString()}</span>
  </div>

  <div class="double-divider"></div>

  <div class="center" style="font-size:10px;">
    <p>Computer Generated Fee Slip</p>
    <p style="margin-top:2px; font-weight:bold;">Thank you for your cooperation!</p>
    <p style="margin-top:4px; font-size:9px;">Powered by TaleemiDunya Pro</p>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=420,height=600');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handleSendReminder = async (voucher) => {
    const phone = voucher.parentPhone || voucher.fatherPhone || voucher.phone ||
      familyStudents[0]?.parentPhone || familyStudents[0]?.fatherPhone || '';
    const fatherName = voucher.fatherName || familyStudents[0]?.fatherName || 'Parent';
    const remaining = (Number(voucher.totalAmount) || 0) - (Number(voucher.paidAmount) || 0) - (Number(voucher.discountAmount) || 0);
    if (!phone) { alert('No phone number found!'); return; }
    const msg = `⚠️ *FEE REMINDER*\n\nAssalam-o-Alaikum *${fatherName}* Sb!\n\n📅 *Month:* ${voucher.month || '-'}\n💰 *Outstanding Balance:* *Rs. ${remaining.toLocaleString()}*\n\nBraaye meherbani jald az jald fees ada karein.\nShukriya!\n— ${schoolName}`;
    try {
      await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, phone, message: msg })
      });
      alert(`✅ Reminder sent to ${phone}`);
    } catch (e) { alert('Failed to send reminder'); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 dark:text-dark-muted text-sm font-bold uppercase tracking-widest mt-4">Loading Fee System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in pb-32">

      {/* ── Top Stats (Clickable to jump directly to Sheet Register) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: 'today', label: "Today's Collection", value: dashboardStats.today, icon: Zap, color: 'emerald', textLight: 'text-emerald-600', textDark: 'dark:text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-500/5' },
          { key: 'month', label: "This Month", value: dashboardStats.month, icon: Calendar, color: 'blue', textLight: 'text-blue-600', textDark: 'dark:text-blue-400', gradient: 'from-blue-500/20 to-blue-500/5' },
          { key: 'arrears', label: "Total Arrears", value: dashboardStats.arrears, icon: AlertCircle, color: 'rose', textLight: 'text-rose-600', textDark: 'dark:text-rose-400', gradient: 'from-rose-500/20 to-rose-500/5' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <GlassCard
              key={i}
              onClick={() => {
                setViewMode('sheet');
                if (stat.key === 'today') setSheetStatusFilter('today');
                else if (stat.key === 'month') setSheetStatusFilter('month');
                else if (stat.key === 'arrears') setSheetStatusFilter('unpaid');
              }}
              className={`p-5 bg-gradient-to-br ${stat.gradient} border-b-2 border-b-${stat.color}-500 shadow-sm cursor-pointer hover:scale-[1.01] hover:shadow-md transition-all active:scale-[0.99] group`}
              title="Click karke detailed sheet / register dekhein"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-black text-slate-600 dark:text-dark-muted uppercase tracking-widest">{stat.label}</p>
                    <span className="text-[9px] font-bold text-blue-500 dark:text-blue-400 opacity-80 group-hover:opacity-100 transition-opacity">
                      View Sheet ↗
                    </span>
                  </div>
                  <p className={`text-2xl font-black ${stat.textLight} ${stat.textDark} mt-1`}>Rs. {stat.value.toLocaleString()}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center ${stat.textLight} ${stat.textDark} group-hover:scale-110 transition-transform`}>
                  <Icon size={22} />
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ── Mode Switcher: Counter vs Payment Sheet ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/70 dark:bg-dark-card/70 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setViewMode('counter')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              viewMode === 'counter'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-dark-muted hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Zap size={16} className={viewMode === 'counter' ? 'text-yellow-300' : ''} />
            <span>⚡ Quick Fee Counter</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('sheet')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              viewMode === 'sheet'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-dark-muted hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <FileText size={16} />
            <span>📋 Fee Payment Sheet & Register</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              viewMode === 'sheet' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-dark-text'
            }`}>
              {sheetRows.length}
            </span>
          </button>
        </div>

        {viewMode === 'sheet' && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrintSheet}
              className="px-3.5 py-2 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border border-slate-700"
              title="Print School Payment Register / Sheet"
            >
              <Printer size={14} className="text-emerald-400" />
              <span>Print Sheet</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Export to Excel / CSV"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Mode 1: Quick Fee Counter (Step 1, 2, 3) ── */}
      {viewMode === 'counter' && (
        <>
          {/* ── Step 1: Search ── */}
          {step === 1 && (
        <div className="space-y-6">
          <GlassCard className="p-8 border-t-4 border-t-blue-500 relative z-50 shadow-sm">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Search size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Collect Fee</h2>
                  <p className="text-slate-600 dark:text-dark-muted text-sm font-bold">Search student by Roll No, Father Name, or Voucher No</p>
                </div>
              </div>

              <div ref={wrapperRef} className="relative max-w-2xl z-50">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={20} className="text-slate-400 dark:text-dark-muted group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Type Roll No, Father Name, Student Name or Voucher No..."
                    className="w-full bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border text-slate-900 dark:text-white rounded-2xl py-5 pl-12 pr-5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold text-base placeholder:text-slate-400 dark:placeholder:text-dark-muted/60 shadow-sm"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 dark:text-dark-muted dark:hover:text-white transition-colors cursor-pointer">
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl overflow-hidden shadow-2xl z-50">
                    {searchSuggestions.map((fam, idx) => (
                      <button key={idx} onClick={() => handleSelectFamily(fam)}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-dark-hover transition-colors border-b border-slate-100 dark:border-dark-border/50 last:border-none text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-base uppercase">
                            {(fam.students[0]?.name || fam.fatherName || '?').charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 dark:text-white text-sm">
                              {fam.students.map(s => s.name).join(' & ')}
                            </p>
                            <p className="text-[11px] font-bold text-slate-600 dark:text-dark-muted">
                              S/O {fam.fatherName} • Roll No: {fam.students.map(s => s.admissionNumber || s.rollNo || s.rollNumber || s.grNo || '-').join(', ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {fam.phone && (
                            <span className="text-[10px] font-bold text-slate-500 dark:text-dark-muted">{fam.phone}</span>
                          )}
                          <ChevronRight size={16} className="text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showSuggestions && searchTerm.length >= 2 && searchSuggestions.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 text-center z-50 shadow-xl">
                    <p className="text-slate-600 dark:text-dark-muted font-bold text-sm">No results found for "<span className="text-slate-900 dark:text-white font-bold">{searchTerm}</span>"</p>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Recent Payments */}
          {recentPayments.length > 0 && (
            <GlassCard className="p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <History size={20} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest">Recent Payments</h3>
              </div>
              <div className="space-y-2">
                {recentPayments.map((v, i) => {
                  const tDue = Number(v.totalAmount) || 0;
                  const tPaid = Number(v.paidAmount) || 0;
                  const tDisc = Number(v.discountAmount) || 0;
                  const tBal = Math.max(0, tDue - tPaid - tDisc);
                  const pct = tDue > 0 ? Math.round(((tPaid + tDisc) / tDue) * 100) : 0;
                  return (
                    <button key={i} onClick={() => setDetailVoucher(v)}
                      className="w-full p-4 bg-white dark:bg-dark-card/50 rounded-xl border border-slate-200 dark:border-dark-border/30 hover:border-blue-500/40 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left group cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm">
                            {(v.fatherName || v.studentName || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{v.fatherName || v.studentName || 'Unknown'}</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-dark-muted uppercase tracking-wider">{v.month} • #{v.voucherNo || v.id?.slice(0,6)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">Rs. {tPaid.toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-slate-500 dark:text-dark-muted">{parseDateSafely(v.paidAt).toLocaleString('en-US', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                        </div>
                      </div>
                      {/* Mini progress bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-dark-border rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                        </div>
                        <span className={`text-[10px] font-black ${tBal > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {tBal > 0 ? `Rs. ${tBal.toLocaleString()} remaining` : 'Cleared ✅'}
                        </span>
                        <ChevronRight size={14} className="text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* ── Step 2: Fee Details & Payment ── */}
      {step === 2 && selectedFamily && (
        <div className="space-y-6 animate-fade-in">
          {/* Dashboard Header */}
          <GlassCard className="p-0 border border-slate-200 dark:border-dark-border/50 relative overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-dark-border/50 flex items-center justify-between bg-slate-50/70 dark:bg-transparent">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-center text-slate-900 dark:text-white font-black text-xl shadow-sm">
                  {(selectedFamily.fatherName || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{selectedFamily.fatherName}</h2>
                  <p className="text-xs text-slate-600 dark:text-dark-muted font-bold flex items-center gap-2">
                    Family Financial Dashboard 
                    {selectedFamily.phone && <span>• {selectedFamily.phone}</span>}
                  </p>
                </div>
              </div>
              <button onClick={resetSearch} className="w-8 h-8 rounded-full bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-center hover:bg-slate-100 dark:hover:bg-dark-hover transition-colors shadow-sm cursor-pointer">
                <X size={16} className="text-slate-600 dark:text-dark-muted" />
              </button>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50/50 dark:bg-dark-bg/50">
              {(() => {
                const familyVouchers = allVouchers.filter(v => doesVoucherBelongToFamily(v, familyStudents));
                const lifetimeBilled = familyVouchers.reduce((sum, v) => sum + (Number(v.totalAmount) || 0), 0);
                const lifetimePaid = familyVouchers.reduce((sum, v) => sum + (Number(v.paidAmount) || 0) + (Number(v.discountAmount) || 0), 0);
                const arrears = Math.max(0, lifetimeBilled - lifetimePaid);
                return (
                  <>
                    <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Receipt size={24} /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 dark:text-dark-muted uppercase tracking-widest">LIFETIME BILLED</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">Rs. {lifetimeBilled.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><CheckCircle size={24} /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 dark:text-dark-muted uppercase tracking-widest">LIFETIME PAID</p>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">Rs. {lifetimePaid.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-dark-card border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center"><DollarSign size={24} /></div>
                      <div>
                        <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">REMAINING ARREARS</p>
                        <p className="text-xl font-black text-rose-600 dark:text-rose-500">Rs. {arrears.toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </GlassCard>

          {/* Enrolled Students */}
          <div>
            <h3 className="text-xs font-black text-slate-600 dark:text-dark-muted uppercase tracking-widest mb-3">ENROLLED STUDENTS</h3>
            <div className="flex flex-wrap gap-4">
              {familyStudents.map((stud) => {
                 const gr = stud.admissionNumber || stud.rollNo || stud.grNo || stud.grNumber || stud.rollNumber || 'N/A';
                 return (
                   <div key={stud.id} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3 pr-8 flex items-center gap-4 min-w-[200px] shadow-sm">
                     <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-dark-hover flex items-center justify-center font-black text-blue-700 dark:text-white border border-blue-200 dark:border-transparent">
                       {stud.name.charAt(0)}
                     </div>
                     <div>
                       <p className="font-bold text-slate-900 dark:text-white text-sm">{stud.name}</p>
                       <p className="text-[10px] text-slate-600 dark:text-dark-muted font-bold">Class {stud.class} • GR: {gr}</p>
                     </div>
                   </div>
                 );
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              UNBILLED STORE & INVENTORY PRODUCT CHARGES (Books, Uniform, Stationery)
          ══════════════════════════════════════════════════════════════════════ */}
          {(() => {
            // ── Collect all unbilled charges ──────────────────────────────────
            const allUnbilledCharges = [];
            familyStudents.forEach(st => {
              const pCharges = Array.isArray(st.pendingProductCharges) ? st.pendingProductCharges : [];
              pCharges.forEach(ch => {
                if (ch.status === 'unbilled' || ch.status === 'direct_collected' || (!ch.status && !ch.paidAt)) {
                  allUnbilledCharges.push({ student: st, charge: ch });
                }
              });
            });

            if (allUnbilledCharges.length === 0) return null;

            // ── Group by: studentId + itemName + month ────────────────────────
            const grouped = {};
            allUnbilledCharges.forEach(({ student, charge }) => {
              const month = (charge.date || '').slice(0, 7); // "2026-11"
              const key = `${student.id}__${(charge.itemName || charge.name || '').trim().toLowerCase()}__${month}`;
              if (!grouped[key]) {
                grouped[key] = {
                  student,
                  charges: [],
                  itemName: charge.itemName || charge.name || 'Store Item',
                  category: charge.category || 'Store Item',
                  unit: charge.unit || 'pcs',
                  totalQty: 0,
                  totalAmount: 0,
                  month,
                };
              }
              grouped[key].charges.push(charge);
              grouped[key].totalQty += Number(charge.quantity || 1);
              grouped[key].totalAmount += Number(charge.totalAmount || charge.amount || 0);
            });
            const groupedCards = Object.values(grouped);

            // ── Month label helper ────────────────────────────────────────────
            const monthLabel = (m) => {
              if (!m) return 'Recent';
              const [y, mo] = m.split('-');
              const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              return `${names[parseInt(mo,10)-1] || mo} ${y}`;
            };

            // ── Grand total ───────────────────────────────────────────────────
            const grandTotal = groupedCards.reduce((s, g) => s + g.totalAmount, 0);

            // ── Handlers for grouped pay/delete ──────────────────────────────
            const handlePayGroup = async (group) => {
              // Pay all charges in group one by one (each has its own toast)
              for (const ch of group.charges) {
                await handlePayProductCharge(group.student, ch);
              }
            };

            const handleDeleteGroup = async (group) => {
              // Single confirm for the whole group
              const totalAmt = group.totalAmount.toLocaleString();
              const confirmed = window.confirm(
                `Kya aap "${group.itemName}" (${group.charges.length} entries, Rs. ${totalAmt}) ko student ke record se remove karna chahte hain?`
              );
              if (!confirmed) return;

              try {
                const student = group.student;
                // Get the latest student from state to avoid stale data
                const latestStudent = familyStudents.find(s => s.id === student.id) || student;
                const currentCharges = Array.isArray(latestStudent.pendingProductCharges)
                  ? latestStudent.pendingProductCharges : [];

                // Build set of invoice numbers / IDs to remove
                const removeInvoices = new Set(group.charges.map(ch => ch.invoiceNo).filter(Boolean));
                const removeIds = new Set(group.charges.map(ch => ch.id).filter(Boolean));

                // Filter them all out at once
                const updatedCharges = currentCharges.filter(p => {
                  if (p.invoiceNo && removeInvoices.has(p.invoiceNo)) return false;
                  if (p.id && removeIds.has(p.id)) return false;
                  return true;
                });

                // Recalculate balance
                const currentBal = Number(latestStudent.balance !== undefined
                  ? latestStudent.balance : (latestStudent.arrears || 0)) || 0;
                const newBal = Math.max(0, currentBal - group.totalAmount);

                await updateRecord('students', student.id, {
                  balance: newBal,
                  arrears: newBal,
                  pendingProductCharges: updatedCharges
                });

                setFamilyStudents(prev => prev.map(s => s.id === student.id ? {
                  ...s,
                  balance: newBal,
                  arrears: newBal,
                  pendingProductCharges: updatedCharges
                } : s));

                alert(`🗑️ "${group.itemName}" (${group.charges.length} entries) kamyabi ke sath remove kar diya gaya!`);
              } catch (err) {
                console.error('Error deleting group:', err);
                alert('Remove karne mein masla: ' + err.message);
              }
            };

            return (
              <div className="border-2 border-dashed border-purple-300 dark:border-purple-500/40 rounded-2xl p-5 bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-purple-50/70 dark:from-purple-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 shadow-sm animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-purple-200 dark:border-purple-500/20 mb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-md shadow-purple-500/30">
                      <ShoppingBag size={17} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-purple-900 dark:text-purple-300 flex items-center gap-2 flex-wrap">
                        Store &amp; Inventory Dues (Books / Uniforms / Store Items)
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-200 text-purple-900 dark:bg-purple-500/30 dark:text-purple-300">
                          {groupedCards.length} Item{groupedCards.length > 1 ? 's' : ''}
                        </span>
                      </h3>
                      <p className="text-[11px] text-purple-700 dark:text-purple-400">
                        Same product same mahine ka ek card mein group kiya gaya hai — asaan collection ke liye!
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-purple-900 dark:text-purple-200 whitespace-nowrap">
                    Total: Rs. {grandTotal.toLocaleString()}
                  </span>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {groupedCards.map((group, idx) => {
                    const isProcessingThis = payingProductChargeId === (group.charges[0]?.id || group.charges[0]?.invoiceNo);
                    const isMerged = group.charges.length > 1;

                    return (
                      <div key={idx} className={`bg-white dark:bg-dark-card border rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition-shadow ${isMerged ? 'border-indigo-300 dark:border-indigo-500/40' : 'border-purple-200 dark:border-purple-500/30'}`}>
                        <div>
                          {/* Top row: category • student + qty badge */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                {group.category} • {group.student.name}
                              </span>
                              <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
                                {group.itemName}
                              </h4>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black whitespace-nowrap ${isMerged ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300'}`}>
                              {group.totalQty} {group.unit}
                            </span>
                          </div>

                          {/* Month + merged badge row */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                              <Calendar size={9} />
                              {monthLabel(group.month)}
                            </span>
                            {isMerged && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                                {group.charges.length} entries merged
                              </span>
                            )}
                          </div>

                          {/* Invoice list (compact) */}
                          <div className="text-[10px] text-slate-400 dark:text-dark-muted mt-2 pt-2 border-t border-slate-100 dark:border-dark-border/40 font-mono leading-relaxed">
                            {group.charges.map((ch, ci) => (
                              <span key={ci} className="mr-2">{ch.invoiceNo || 'N/A'}</span>
                            ))}
                          </div>
                        </div>

                        {/* Bottom: amount + actions */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-dark-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">AMOUNT</span>
                              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                Rs. {group.totalAmount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDeleteGroup(group)}
                                title="Remove all charges in this group"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/20 transition-all cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePayGroup(group)}
                                disabled={isProcessingThis}
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-transform hover:scale-105 flex items-center gap-1"
                              >
                                <CheckCircle size={13} />
                                <span>{isProcessingThis ? '...' : 'Collect'}</span>
                              </button>
                            </div>
                          </div>
                          {/* Add to Voucher button — only if pending voucher exists */}
                          {pendingVouchers.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleAddProductToVoucher(group, pendingVouchers[0])}
                              className="w-full py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-[11px] cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1.5"
                              title={`${pendingVouchers[0].month} ke voucher mein add karo — arrears mein chala jayega`}
                            >
                              <span>➕</span>
                              <span>Add to {pendingVouchers[0].month} Voucher</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Pending Dues Breakdown */}
          {pendingVouchers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <DollarSign size={14} /> Pending Dues Breakdown & Quick Pay
                </h3>
                {pendingVouchers.length > 1 && (
                  <button 
                    onClick={handlePayAll}
                    disabled={processingId === 'all'}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {processingId === 'all' ? 'Processing...' : `Pay All Dues (Rs. ${pendingVouchers.reduce((acc, v) => acc + Math.max(0, (Number(v.totalAmount)||0) - (Number(v.paidAmount)||0) - (Number(v.discountAmount)||0)), 0).toLocaleString()})`}
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {pendingVouchers.map((voucher) => {
                  const totalDue = Number(voucher.totalAmount) || 0;
                  const alreadyPaid = (Number(voucher.paidAmount) || 0) + (Number(voucher.discountAmount) || 0);
                  const remaining = Math.max(0, totalDue - alreadyPaid);
                  const entry = paymentEntries[voucher.id] || { payAmount: remaining };
                  const isProcessing = processingId === voucher.id;

                  return (
                    <div key={voucher.id} className="border border-rose-200 dark:border-rose-500/30 rounded-xl overflow-hidden bg-white dark:bg-dark-card/30 shadow-sm">
                      {/* Header */}
                      <div className="px-5 py-3 border-b border-rose-100 dark:border-dark-border/50 bg-rose-50/60 dark:bg-rose-950/20 flex items-center gap-3">
                        <span className="text-sm font-black text-slate-900 dark:text-white">{voucher.month}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${voucher.status === 'Partial' ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'}`}>
                          {voucher.status}
                        </span>
                        <span className="text-[10px] text-slate-600 dark:text-dark-muted font-bold">Voucher #{voucher.voucherNo || voucher.id?.slice(0,6)}</span>
                      </div>
                      
                      {/* Body */}
                      <div className="p-5 flex flex-col lg:flex-row gap-6 items-stretch">
                        <div className="flex-1 flex flex-wrap gap-6">
                          {(() => {
                            const children = voucher.childrenDetails && voucher.childrenDetails.length > 0 ? voucher.childrenDetails : familyStudents;
                            const hasChildIds = voucher.feeItems?.some(item => item.childId);
                            
                            if (hasChildIds) {
                              // Items are assigned to specific children — show per-child columns
                              return children.map((child, idx) => {
                                const childItems = voucher.feeItems?.filter(item => item.childId === child.id) || [];
                                if (childItems.length === 0) return null;
                                return (
                                  <div key={idx} className="flex-1 min-w-[200px] bg-slate-50 dark:bg-dark-bg rounded-xl p-4 border border-slate-200 dark:border-dark-border/50">
                                    <p className="font-bold text-slate-900 dark:text-white text-sm mb-3">{child.name}</p>
                                    <div className="space-y-2">
                                      {childItems.map((item, i) => (
                                        <div key={i} className="flex justify-between text-xs font-bold">
                                          <span className="text-slate-600 dark:text-dark-muted">{item.name}</span>
                                          <span className="text-slate-900 dark:text-white">Rs. {Number(item.amount).toLocaleString()}</span>
                                        </div>
                                      ))}
                                      <div className="border-t border-slate-200 dark:border-dark-border mt-2 pt-2 flex justify-between text-xs font-black">
                                        <span className="text-rose-600 dark:text-rose-400">TOTAL</span>
                                        <span className="text-rose-600 dark:text-rose-400">Rs. {childItems.reduce((s, item) => s + Number(item.amount), 0).toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            } else {
                              // No childId on items — show items once in a single shared column
                              const items = voucher.feeItems || [];
                              const storeItems = Array.isArray(voucher.storeItems) ? voucher.storeItems : [];
                              return (
                                <div className="flex-1 min-w-[200px] bg-slate-50 dark:bg-dark-bg rounded-xl p-4 border border-slate-200 dark:border-dark-border/50">
                                  <p className="font-bold text-slate-900 dark:text-white text-sm mb-3">Fee Breakdown</p>
                                  <div className="space-y-2">
                                    {items.length > 0 ? items.map((item, i) => (
                                      <div key={i} className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-600 dark:text-dark-muted">{item.name}</span>
                                        <span className="text-slate-900 dark:text-white">Rs. {Number(item.amount).toLocaleString()}</span>
                                      </div>
                                    )) : children.map((child, i) => (
                                      <div key={i} className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-600 dark:text-dark-muted">{child.name}</span>
                                        <span className="text-slate-900 dark:text-white">Rs. {(Number(child.fee) || 0).toLocaleString()}</span>
                                      </div>
                                    ))}
                                    {/* Store Items added to this voucher */}
                                    {storeItems.length > 0 && (
                                      <>
                                        <div className="border-t border-purple-200 dark:border-purple-500/30 pt-2 mt-2">
                                          <p className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1.5">📦 Store / Inventory</p>
                                          {storeItems.map((si, i) => (
                                            <div key={i} className="flex justify-between text-xs font-bold mb-1">
                                              <span className="text-purple-700 dark:text-purple-300">{si.itemName} ({si.quantity} {si.unit})</span>
                                              <span className="text-purple-700 dark:text-purple-300">Rs. {Number(si.amount).toLocaleString()}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                    <div className="border-t border-slate-200 dark:border-dark-border mt-2 pt-2 flex justify-between text-xs font-black">
                                      <span className="text-rose-600 dark:text-rose-400">TOTAL</span>
                                      <span className="text-rose-600 dark:text-rose-400">Rs. {Number(voucher.totalAmount || 0).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          })()}
                        </div>
                        
                        {/* Quick Pay Box */}
                        <div className="w-full lg:w-64 bg-slate-50 dark:bg-dark-bg rounded-xl p-5 border border-slate-200 dark:border-dark-border flex flex-col justify-center">
                           <div className="flex items-end gap-3 mb-4">
                             <div>
                               <p className="text-[10px] font-black text-slate-500 dark:text-dark-muted uppercase">REMAINING</p>
                               <p className="text-xl font-black text-rose-600 dark:text-rose-500">Rs. {remaining.toLocaleString()}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-2 mb-3">
                             <input 
                               type="number" 
                               value={entry.payAmount}
                               onChange={e => setPaymentEntries(prev => ({...prev, [voucher.id]: {...prev[voucher.id], payAmount: e.target.value}}))}
                               className="w-full bg-white dark:bg-dark-card border border-slate-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-rose-500 outline-none shadow-sm"
                             />
                             <button
                               onClick={() => handlePayNow(voucher)}
                               disabled={isProcessing}
                               className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm px-4 py-2 rounded-lg whitespace-nowrap disabled:opacity-50 transition-colors shadow cursor-pointer"
                             >
                               {isProcessing ? 'Wait...' : 'Pay Now'}
                             </button>
                           </div>
                           <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-dark-muted">
                             <span>Discount: Rs. {Number(entry.discountAmount || 0)}</span>
                             <button 
                               onClick={() => {
                                 const val = prompt('Enter discount amount:', entry.discountAmount || 0);
                                 if (val !== null) setPaymentEntries(prev => ({...prev, [voucher.id]: {...prev[voucher.id], discountAmount: val}}));
                               }}
                               className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                             >Edit</button>
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transaction History Ledger */}
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5 shadow-sm">
             <div className="flex items-center gap-2 mb-4">
               <History size={16} className="text-slate-500 dark:text-dark-muted" />
               <h3 className="text-xs font-black text-slate-700 dark:text-dark-muted uppercase tracking-widest">TRANSACTION HISTORY LEDGER</h3>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead>
                   <tr className="border-b border-slate-200 dark:border-dark-border/50 text-[10px] font-black text-slate-500 dark:text-dark-muted uppercase tracking-widest">
                     <th className="pb-3 px-2">Month/Title</th>
                     <th className="pb-3 px-2 text-center">Fee Type</th>

                     <th className="pb-3 px-2 text-center">Total Fee</th>
                     <th className="pb-3 px-2 text-center">Paid</th>
                     <th className="pb-3 px-2 text-center">Discount</th>
                     <th className="pb-3 px-2 text-center">Remaining</th>
                     <th className="pb-3 px-2 text-center">Status</th>
                     <th className="pb-3 px-2">Date & Time</th>
                     <th className="pb-3 px-2 text-center">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-dark-border/30">
                    {(() => {
                      // Build voucher rows
                      const voucherRows = paidVouchersForFamily.flatMap(v => {
                        if (v.paymentHistory && v.paymentHistory.length > 0) {
                          const historyList = [...v.paymentHistory];
                          const totalHistPaid = historyList.reduce((acc, h) => acc + (Number(h.amount) || 0), 0);
                          const totalHistDisc = historyList.reduce((acc, h) => acc + (Number(h.discount) || 0), 0);
                          const currentVoucherPaid = Number(v.paidAmount) || 0;
                          const currentVoucherDisc = Number(v.discountAmount) || 0;
                          if (totalHistPaid < currentVoucherPaid || totalHistDisc < currentVoucherDisc) {
                            historyList.unshift({ id: 'legacy', amount: Math.max(0, currentVoucherPaid - totalHistPaid), discount: Math.max(0, currentVoucherDisc - totalHistDisc), date: v.paidAt || v.createdAt || new Date().toISOString() });
                          }
                          let cumulativePaid = 0, cumulativeDisc = 0;
                          return historyList.map((hist, idx) => {
                            const tDue = Number(v.totalAmount) || 0;
                            const tPaid = Number(hist.amount) || 0;
                            const tDisc = Number(hist.discount) || 0;
                            const previousPaid = cumulativePaid;
                            cumulativePaid += tPaid; cumulativeDisc += tDisc;
                            const tBal = Math.max(0, tDue - cumulativePaid - cumulativeDisc);
                            const status = (cumulativePaid + cumulativeDisc) >= tDue ? 'Paid' : 'Partial';
                            return { id: `${v.id}_${hist.id || idx}`, feeType: 'school', voucher: v, month: v.month, title: `Voucher #${v.voucherNo || v.id.slice(0,6)}`, tDue, tPaid, tDisc, tBal, status, paidAt: hist.date, previousPaid };
                          });
                        } else {
                          return [{ id: v.id, feeType: 'school', voucher: v, month: v.month, title: `Voucher #${v.voucherNo || v.id.slice(0,6)}`, tDue: Number(v.totalAmount) || 0, tPaid: Number(v.paidAmount) || 0, tDisc: Number(v.discountAmount) || 0, tBal: Math.max(0, (Number(v.totalAmount)||0) - (Number(v.paidAmount)||0) - (Number(v.discountAmount)||0)), status: v.status, paidAt: v.paidAt, previousPaid: 0 }];
                        }
                      });
                      // Build product payment rows
                      const productRows = [];
                      familyStudents.forEach(st => {
                        const ph = Array.isArray(st.productPaymentHistory) ? st.productPaymentHistory : [];
                        ph.forEach(h => {
                          productRows.push({ id: h.id || `prod_${h.paidAt}`, feeType: 'product', student: st, month: h.month || (h.paidAt || '').slice(0, 7), title: h.itemName || 'Store Item', invoiceNo: h.invoiceNo || '', quantity: h.quantity || 1, unit: h.unit || 'pcs', tDue: Number(h.amount) || 0, tPaid: Number(h.amount) || 0, tDisc: 0, tBal: 0, status: 'Paid', paidAt: h.paidAt, previousPaid: 0 });
                        });
                      });
                      const allRows = [...voucherRows, ...productRows].sort((a, b) => parseDateSafely(b.paidAt) - parseDateSafely(a.paidAt));
                      if (allRows.length === 0) {
                        return (<tr><td colSpan="9" className="py-8 text-center text-slate-500 dark:text-dark-muted font-bold text-xs">No transaction history found.</td></tr>);
                      }
                      return allRows.map(item => (
                        <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-dark-hover/50 transition-colors ${item.feeType === 'product' ? 'bg-purple-50/40 dark:bg-purple-900/10' : ''}`}>
                          <td className="py-3 px-2">
                            <p className="font-bold text-slate-900 dark:text-white">{item.month}</p>
                            <p className="text-[10px] text-slate-500 dark:text-dark-muted font-bold">{item.title}</p>
                            {item.feeType === 'product' && item.invoiceNo && (<p className="text-[9px] text-purple-500 font-mono">{item.invoiceNo}</p>)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {item.feeType === 'product' ? (
                              <span className="text-[9px] font-black px-2 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30 whitespace-nowrap block mb-0.5">📦 Product</span>
                            ) : (
                              <span className="text-[9px] font-black px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 whitespace-nowrap block mb-0.5">🏫 School</span>
                            )}
                            {item.feeType === 'product' && (<span className="text-[9px] text-slate-400">{item.quantity} {item.unit}</span>)}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-900 dark:text-white">Rs. {item.tDue.toLocaleString()}</td>
                          <td className="py-3 px-2 text-center font-black text-emerald-600 dark:text-emerald-400">Rs. {item.tPaid.toLocaleString()}</td>
                          <td className="py-3 px-2 text-center font-bold text-amber-600 dark:text-amber-400">{item.tDisc > 0 ? 'Rs. ' + item.tDisc.toLocaleString() : 'Rs. -'}</td>
                          <td className="py-3 px-2 text-center font-bold text-rose-600 dark:text-rose-400">Rs. {item.tBal.toLocaleString()}</td>
                          <td className="py-3 px-2 text-center">
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${item.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'}`}>{item.status}</span>
                          </td>
                          <td className="py-3 px-2 text-[10px] text-slate-500 dark:text-dark-muted font-bold">
                            {item.paidAt ? parseDateSafely(item.paidAt).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}
                          </td>
                          <td className="py-3 px-2 flex justify-center gap-2">
                            {item.feeType === 'school' ? (
                              <>
                                <button onClick={() => openEditModal(item.voucher)} className="w-7 h-7 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center transition-colors cursor-pointer" title="Edit">✏️</button>
                                <button onClick={() => handlePrintReceipt({...item.voucher, fatherName: selectedFamily.fatherName, currentPaid: item.tPaid, previousPaid: item.previousPaid, status: item.status })} className="w-7 h-7 rounded bg-purple-50 hover:bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center transition-colors cursor-pointer" title="Print">🖨️</button>
                              </>
                            ) : (
                              <span className="text-[9px] text-slate-400 font-bold">Store</span>
                            )}
                          </td>
                        </tr>
                      ));
                    })()}

                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}
      
      {/* ── Step 3: Success Screen ── */}
      {step === 3 && lastReceipt && (
        <div className="flex items-center justify-center py-8">
          <GlassCard className="p-10 max-w-lg w-full text-center border-t-4 border-t-emerald-500 relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>
            <div className="relative z-10">
              {/* Animated checkmark */}
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle size={40} className="text-emerald-500 dark:text-emerald-400" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Payment Received!</h2>
              <p className="text-slate-600 dark:text-dark-muted font-bold">
                {lastReceipt.isProductReceipt ? '📦 Store/Inventory fee collected.' : '🏫 School fee has been recorded.'}
              </p>

              {/* Fee Type Badge */}
              {lastReceipt.isProductReceipt ? (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 font-black text-xs border border-purple-300 dark:border-purple-500/30">
                  📦 Product Fee — {lastReceipt.productName}
                </div>
              ) : (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 font-black text-xs border border-blue-300 dark:border-blue-500/30">
                  🏫 School Fees
                </div>
              )}

              {/* Receipt Card */}
              <div className="mt-6 p-5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl text-left space-y-3 shadow-sm">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-dark-muted font-bold">
                    {lastReceipt.isProductReceipt ? 'Invoice #' : 'Voucher #'}
                  </span>
                  <span className="font-black text-slate-900 dark:text-white">{lastReceipt.voucherNo}</span>
                </div>
                {lastReceipt.isProductReceipt && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-dark-muted font-bold">Item</span>
                      <span className="font-black text-slate-900 dark:text-white">{lastReceipt.productName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-dark-muted font-bold">Quantity</span>
                      <span className="font-black text-slate-900 dark:text-white">{lastReceipt.quantity} pcs</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-dark-muted font-bold">Father Name</span>
                  <span className="font-black text-slate-900 dark:text-white">{lastReceipt.fatherName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-dark-muted font-bold">Month</span>
                  <span className="font-black text-slate-900 dark:text-white">{lastReceipt.month}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-dark-border pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-dark-muted font-bold">Total Due</span>
                    <span className="font-bold text-slate-900 dark:text-white">Rs. {lastReceipt.totalDue.toLocaleString()}</span>
                  </div>
                  {lastReceipt.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-dark-muted font-bold">Discount</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">-Rs. {lastReceipt.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {lastReceipt.previousPaid > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-dark-muted font-bold">Previously Paid</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-500">-Rs. {lastReceipt.previousPaid.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-slate-200 dark:border-dark-border pt-2">
                    <span className="font-black text-slate-900 dark:text-white">Amount Paid</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">Rs. {(lastReceipt.currentPaid || lastReceipt.paidAmount).toLocaleString()}</span>
                  </div>
                  {lastReceipt.remaining > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-dark-muted font-bold">Balance Remaining</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">Rs. {lastReceipt.remaining.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {whatsappEnabled && lastReceipt.phone && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <MessageCircle size={14} /> WhatsApp receipt sent to {lastReceipt.phone}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                {/* Print Buttons: Thermal & A4 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handlePrintThermalReceipt({
                      ...lastReceipt,
                      childrenDetails: pendingVouchers[0]?.childrenDetails || []
                    })}
                    className="py-3 px-4 rounded-xl font-black text-xs text-white bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer border border-slate-700"
                    title="Print on standard 80mm / 58mm Thermal Receipt POS Machine"
                  >
                    <Receipt size={16} className="text-emerald-400" />
                    <span>🧾 80mm Thermal Slip</span>
                  </button>

                  <button
                    onClick={() => handlePrintReceipt({
                      ...lastReceipt,
                      childrenDetails: pendingVouchers[0]?.childrenDetails || []
                    })}
                    className="py-3 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
                    title="Print 2-Copy A4 Slip (School Copy + Parent Copy)"
                  >
                    <Printer size={16} />
                    <span>🖨️ Standard 2-Part Slip</span>
                  </button>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setStep(2); setLastReceipt(null); }}
                    className="flex-1 py-3 border border-slate-300 dark:border-dark-border rounded-xl font-black text-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                  >
                    View More Vouchers
                  </button>
                  <button onClick={resetSearch}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-black text-sm text-white hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
                  >
                    New Collection
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
        </>
      )}

      {/* ── Mode 2: Fee Payment Sheet & Register ── */}
      {viewMode === 'sheet' && (
        <div className="space-y-6">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All Records', count: sheetPillCounts.all },
              { id: 'today', label: "⚡ Today's Paid", count: sheetPillCounts.today },
              { id: 'month', label: '📅 This Month Paid', count: sheetPillCounts.month },
              { id: 'paid', label: '✅ Fully Paid', count: sheetPillCounts.paid },
              { id: 'partial', label: '⚠️ Partial / Half Paid', count: sheetPillCounts.partial },
              { id: 'unpaid', label: '❌ Unpaid / Defaulters', count: sheetPillCounts.unpaid },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSheetStatusFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  sheetStatusFilter === tab.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-[1.02]'
                    : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-600 dark:text-dark-muted hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  sheetStatusFilter === tab.id
                    ? 'bg-white/20 dark:bg-black/20 text-current'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-dark-text'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Filters Bar: Search, Class, Month, Reset */}
          <GlassCard className="p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search Box */}
              <div className="md:col-span-5 relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" />
                <input
                  type="text"
                  value={sheetSearch}
                  onChange={(e) => setSheetSearch(e.target.value)}
                  placeholder="Search student, father, roll no, voucher #, phone..."
                  className="w-full pl-10 pr-8 py-2.5 text-xs bg-slate-50 dark:bg-dark-hover border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-dark-muted focus:outline-none focus:border-blue-500 font-bold"
                />
                {sheetSearch && (
                  <button
                    type="button"
                    onClick={() => setSheetSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Class Filter */}
              <div className="md:col-span-3">
                <select
                  value={sheetClassFilter}
                  onChange={(e) => setSheetClassFilter(e.target.value)}
                  className="w-full py-2.5 px-3 text-xs bg-slate-50 dark:bg-dark-hover border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="All">All Classes ({uniqueClassesList.length})</option>
                  {uniqueClassesList.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div className="md:col-span-3">
                <select
                  value={sheetMonthFilter}
                  onChange={(e) => setSheetMonthFilter(e.target.value)}
                  className="w-full py-2.5 px-3 text-xs bg-slate-50 dark:bg-dark-hover border border-slate-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="All">All Fee Months ({uniqueMonthsList.length})</option>
                  {uniqueMonthsList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Reset */}
              <div className="md:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSheetStatusFilter('all');
                    setSheetClassFilter('All');
                    setSheetMonthFilter('All');
                    setSheetSearch('');
                  }}
                  title="Reset all filters"
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-dark-muted hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-dark-border"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Live Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border p-4 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-dark-muted">Students / Vouchers</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{sheetMetrics.totalCount}</p>
              <p className="text-[10px] text-slate-500 dark:text-dark-muted font-bold mt-0.5">
                {sheetMetrics.paidCount} Paid • {sheetMetrics.unpaidCount} Pending
              </p>
            </div>
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border p-4 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-dark-muted">Total Due (Wajib-ul-Ada)</p>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">Rs. {sheetMetrics.totalDue.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 dark:text-dark-muted font-bold mt-0.5">Billable fee total</p>
            </div>
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border p-4 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Collected (Wasool)</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">Rs. {sheetMetrics.totalCollected.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                {sheetMetrics.totalDue > 0 ? Math.round((sheetMetrics.totalCollected / sheetMetrics.totalDue) * 100) : 0}% recovery rate
              </p>
            </div>
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border p-4 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Total Arrears (Baqaya)</p>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">Rs. {sheetMetrics.totalBalance.toLocaleString()}</p>
              <p className="text-[10px] text-rose-700 dark:text-rose-400 font-bold mt-0.5">
                {sheetMetrics.unpaidCount} unpaid / partial
              </p>
            </div>
          </div>

          {/* Table Container */}
          <GlassCard className="p-0 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Payment Records Register ({sortedSheetRows.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-dark-muted font-bold">
                Sorted by: {sheetStatusFilter === 'today' || sheetStatusFilter === 'month' ? 'Recent Payment Time' : 'Class & Student Name'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-dark-border bg-slate-100/60 dark:bg-white/5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-muted">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-4">Student Info</th>
                    <th className="py-3 px-3">Class</th>
                    <th className="py-3 px-3">Father / Guardian</th>
                    <th className="py-3 px-3">Month & Voucher</th>
                    <th className="py-3 px-3 text-right">Total Due</th>
                    <th className="py-3 px-3 text-right">Paid</th>
                    <th className="py-3 px-3 text-right">Balance</th>
                    <th className="py-3 px-4 text-center">Payment Date & Time (Kab Pay Hui)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                  {sortedSheetRows.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="py-16 text-center text-slate-400 dark:text-dark-muted">
                        <FileText size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
                        <p className="font-black text-sm text-slate-600 dark:text-white">Is filter me koi record mojood nahi hai</p>
                        <p className="text-xs mt-1 text-slate-500">Filters tabdeel karke dubara check karein</p>
                      </td>
                    </tr>
                  ) : (
                    sortedSheetRows.map((row, idx) => {
                      const isPaid = row.status === 'Paid';
                      const isPartial = row.status === 'Partial';
                      const isUnpaid = row.status === 'Unpaid';

                      return (
                        <tr key={row.id} className="hover:bg-blue-50/40 dark:hover:bg-white/[0.03] transition-colors group">
                          <td className="py-3 px-3 text-center font-bold text-slate-400 dark:text-dark-muted">
                            {idx + 1}
                          </td>

                          {/* Student Info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                                isPaid ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                isPartial ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}>
                                {row.studentName?.charAt(0)?.toUpperCase() || 'S'}
                              </div>
                              <div>
                                <p className="font-black text-slate-900 dark:text-white">{row.studentName}</p>
                                <p className="text-[10px] text-slate-500 dark:text-dark-muted font-bold">
                                  Roll: <span className="text-blue-600 dark:text-blue-400">{row.rollNo || '—'}</span>
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Class */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 font-black text-[11px] text-slate-700 dark:text-slate-300">
                              {row.className}
                            </span>
                          </td>

                          {/* Father */}
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-800 dark:text-slate-200">{row.fatherName || '—'}</p>
                            <p className="text-[10px] text-slate-400 dark:text-dark-muted font-mono">{row.fatherPhone || '—'}</p>
                          </td>

                          {/* Month & Voucher */}
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-800 dark:text-slate-200">{row.month || '—'}</p>
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">
                              #{row.voucherNo}
                            </p>
                          </td>

                          {/* Due */}
                          <td className="py-3 px-3 text-right font-black text-slate-800 dark:text-slate-200">
                            Rs. {row.totalDue.toLocaleString()}
                          </td>

                          {/* Paid */}
                          <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                            Rs. {row.paidAmount.toLocaleString()}
                          </td>

                          {/* Balance */}
                          <td className="py-3 px-3 text-right font-black text-rose-600 dark:text-rose-400">
                            {row.balance > 0 ? `Rs. ${row.balance.toLocaleString()}` : '—'}
                          </td>

                          {/* Exact Payment Date & Time (Kab Pay Hui) */}
                          <td className="py-3 px-4 text-center">
                            {row.paidAtFormatted ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-[11px]">
                                  <Clock3 size={12} />
                                  {row.paidAtFormatted}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-dark-muted text-[11px] italic">
                                — Not Paid Yet
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            {isPaid && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 size={11} /> Paid
                              </span>
                            )}
                            {isPartial && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                ⚠️ Partial
                              </span>
                            )}
                            {isUnpaid && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                ✕ Unpaid
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Thermal Print */}
                              {row.paidAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handlePrintThermalReceipt({
                                    voucherNo: row.voucherNo,
                                    studentName: row.studentName,
                                    fatherName: row.fatherName,
                                    rollNo: row.rollNo,
                                    className: row.className,
                                    month: row.month,
                                    totalAmount: row.totalDue,
                                    paidAmount: row.paidAmount,
                                    discount: row.discount || 0,
                                    remainingBalance: row.balance,
                                    paymentDate: row.paidAtFormatted || 'Today',
                                    paymentMode: row.voucher?.paymentMethod || 'Cash'
                                  })}
                                  title="Print 80mm Thermal Receipt"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                                >
                                  <Receipt size={14} className="text-emerald-500" />
                                </button>
                              )}

                              {/* Standard Print */}
                              {row.paidAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handlePrintReceipt({
                                    voucherNo: row.voucherNo,
                                    studentName: row.studentName,
                                    fatherName: row.fatherName,
                                    rollNo: row.rollNo,
                                    className: row.className,
                                    month: row.month,
                                    totalAmount: row.totalDue,
                                    paidAmount: row.paidAmount,
                                    discount: row.discount || 0,
                                    remainingBalance: row.balance,
                                    paymentDate: row.paidAtFormatted || 'Today',
                                    paymentMode: row.voucher?.paymentMethod || 'Cash'
                                  })}
                                  title="Print Standard 2-Part Slip"
                                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer"
                                >
                                  <Printer size={14} />
                                </button>
                              )}

                              {/* WhatsApp Receipt / Reminder */}
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppReceiptOrReminder(row)}
                                title={row.paidAmount > 0 ? "Send WhatsApp Receipt" : "Send WhatsApp Fee Reminder"}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer"
                              >
                                <Share2 size={14} />
                              </button>

                              {/* Open in counter / Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (row.voucher) {
                                    setEditingVoucher(row.voucher);
                                    setEditForm({
                                      paidAmount: String(row.paidAmount),
                                      discountAmount: String(row.discount || 0)
                                    });
                                  } else {
                                    setSearchTerm(row.studentName);
                                    setViewMode('counter');
                                    setStep(1);
                                  }
                                }}
                                title="Edit / Collect Voucher"
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-all cursor-pointer"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer Info */}
            <div className="p-4 border-t border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-dark-muted font-bold">
              <span>Showing {sortedSheetRows.length} of {sheetRows.length} total student records</span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-600 dark:text-emerald-400 font-black">● Paid: {sheetMetrics.paidCount}</span>
                <span className="text-amber-600 dark:text-amber-400 font-black">● Partial: {sheetMetrics.partialCount}</span>
                <span className="text-rose-600 dark:text-rose-400 font-black">● Unpaid: {sheetMetrics.unpaidCount}</span>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
      {/* ✏️ Edit Payment Modal */}
      {editingVoucher && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border max-w-md w-full rounded-3xl p-7 shadow-2xl text-slate-900 dark:text-dark-text">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-xl text-slate-900 dark:text-white">✏️ Edit Payment</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">
                  #{editingVoucher.voucherNo || editingVoucher.id?.slice(0,6)} • {editingVoucher.month}
                </p>
              </div>
              <button onClick={() => setEditingVoucher(null)} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-dark-muted hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer">✕</button>
            </div>

            {/* Total Due Info */}
            <div className="mb-5 p-4 bg-slate-50 dark:bg-dark-hover rounded-2xl border border-slate-200 dark:border-dark-border">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-dark-muted font-bold">Total Voucher Amount:</span>
                <span className="font-black text-slate-900 dark:text-white">Rs. {(Number(editingVoucher.totalAmount) || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block">Correct Paid Amount (Rs.)</label>
                <input
                  type="number"
                  value={editForm.paidAmount}
                  onChange={e => setEditForm({...editForm, paidAmount: e.target.value})}
                  className="w-full bg-white dark:bg-dark-hover border border-slate-300 dark:border-dark-border text-slate-900 dark:text-white rounded-xl py-3 px-4 font-bold outline-none focus:border-emerald-500 transition-all shadow-sm"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest block">Discount / Concession (Rs.)</label>
                <input
                  type="number"
                  value={editForm.discountAmount}
                  onChange={e => setEditForm({...editForm, discountAmount: e.target.value})}
                  className="w-full bg-white dark:bg-dark-hover border border-slate-300 dark:border-dark-border text-slate-900 dark:text-white rounded-xl py-3 px-4 font-bold outline-none focus:border-amber-500 transition-all shadow-sm"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Live Preview */}
            <div className="mb-6 p-4 bg-slate-50 dark:bg-dark-hover rounded-2xl border border-slate-200 dark:border-dark-border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-dark-muted font-bold">Total Due:</span>
                <span className="font-black text-slate-900 dark:text-white">Rs. {(Number(editingVoucher.totalAmount)||0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-dark-muted font-bold">Paid:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">Rs. {(Number(editForm.paidAmount)||0).toLocaleString()}</span>
              </div>
              {Number(editForm.discountAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-dark-muted font-bold">Discount:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400">Rs. {(Number(editForm.discountAmount)||0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 dark:border-dark-border pt-2">
                <span className="font-black text-slate-900 dark:text-white">Balance Remaining:</span>
                <span className={`font-black ${
                  ((Number(editingVoucher.totalAmount)||0) - (Number(editForm.paidAmount)||0) - (Number(editForm.discountAmount)||0)) <= 0
                    ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  Rs. {Math.max(0, (Number(editingVoucher.totalAmount)||0) - (Number(editForm.paidAmount)||0) - (Number(editForm.discountAmount)||0)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-dark-muted font-bold">New Status:</span>
                <span className={`font-black px-2 py-0.5 rounded text-[10px] uppercase border ${
                  ((Number(editForm.paidAmount)||0) + (Number(editForm.discountAmount)||0)) >= (Number(editingVoucher.totalAmount)||0)
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                    : (Number(editForm.paidAmount)||0) > 0
                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                    : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                }`}>
                  {((Number(editForm.paidAmount)||0) + (Number(editForm.discountAmount)||0)) >= (Number(editingVoucher.totalAmount)||0)
                    ? 'Paid ✅' : (Number(editForm.paidAmount)||0) > 0 ? 'Partial ⚡' : 'Unpaid ❌'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditingVoucher(null)} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-dark-hover dark:text-dark-muted dark:hover:bg-dark-border font-bold text-sm transition-all cursor-pointer">Cancel</button>
              <button
                onClick={handleSaveEdit}
                disabled={editProcessing}
                className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
              >
                {editProcessing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : '✅ Save Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Voucher Detail Modal ── */}
      {detailVoucher && (() => {
        const dv = detailVoucher;
        const tDue = Number(dv.totalAmount) || 0;
        const tPaid = Number(dv.paidAmount) || 0;
        const tDisc = Number(dv.discountAmount) || 0;
        const tBal = Math.max(0, tDue - tPaid - tDisc);
        const pct = tDue > 0 ? Math.round(((tPaid + tDisc) / tDue) * 100) : 0;
        const paidDate = dv.paidAt ? parseDateSafely(dv.paidAt) : null;
        const children = dv.childrenDetails || [];
        const isFamily = dv.selectionType === 'family' && children.length > 0;

        // Find all vouchers for this same family/student to show payment timeline
        const relatedVouchers = allVouchers.filter(v => {
          if (dv.selectionType === 'family' && dv.fatherCnic) {
            return String(v.fatherCnic || '').replace(/[^0-9]/g, '') === String(dv.fatherCnic || '').replace(/[^0-9]/g, '');
          }
          if (dv.studentId) return v.studentId === dv.studentId;
          return false;
        }).sort((a, b) => parseDateSafely(b.paidAt || b.createdAt) - parseDateSafely(a.paidAt || a.createdAt));

        const totalAllDue = relatedVouchers.reduce((s, v) => s + (Number(v.totalAmount) || 0), 0);
        const totalAllPaid = relatedVouchers.reduce((s, v) => s + (Number(v.paidAmount) || 0), 0);
        const totalAllDisc = relatedVouchers.reduce((s, v) => s + (Number(v.discountAmount) || 0), 0);
        const totalAllBal = Math.max(0, totalAllDue - totalAllPaid - totalAllDisc);
        const pendingCount = relatedVouchers.filter(v => v.status !== 'Paid').length;

        return (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setDetailVoucher(null)}>
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border max-w-2xl w-full rounded-3xl shadow-2xl text-slate-900 dark:text-dark-text max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-dark-border/50 bg-slate-50 dark:bg-gradient-to-r dark:from-blue-500/10 dark:to-indigo-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400 flex items-center justify-center font-black text-2xl shadow-sm">
                      {(dv.fatherName || dv.studentName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-slate-900 dark:text-white">{dv.fatherName || dv.studentName || 'Unknown'}</h3>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                        Voucher #{dv.voucherNo || dv.id?.slice(0,6)} • {dv.month || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setDetailVoucher(null)} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-dark-muted hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer">✕</button>
                </div>
              </div>

              {/* Status & Payment Summary */}
              <div className="p-6 space-y-5">
                {/* Status Badge Row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border ${
                    dv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                    : dv.status === 'Partial' ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                    : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                  }`}>{dv.status || 'Unpaid'}</span>
                  {isFamily && <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 rounded-full text-[11px] font-black dark:border-blue-500/30">👨‍👩‍👧‍👦 Family ({children.length} children)</span>}
                  {paidDate && <span className="text-[11px] font-bold text-slate-600 dark:text-dark-muted">📅 Paid on {paidDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                </div>

                {/* Fee Breakdown Card */}
                <div className="p-5 bg-slate-50 dark:bg-dark-hover rounded-2xl border border-slate-200 dark:border-dark-border space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-dark-muted font-bold">Total Fee Due</span>
                    <span className="font-black text-slate-900 dark:text-white">Rs. {tDue.toLocaleString()}</span>
                  </div>
                  {tDisc > 0 && <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-dark-muted font-bold">🎁 Discount</span>
                    <span className="font-black text-amber-600 dark:text-amber-400">- Rs. {tDisc.toLocaleString()}</span>
                  </div>}
                  <div className="flex justify-between text-sm border-t border-slate-200 dark:border-dark-border pt-2">
                    <span className="font-black text-slate-900 dark:text-white">Amount Paid</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">Rs. {tPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-600 dark:text-dark-muted">Balance Remaining</span>
                    <span className={`font-black ${tBal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {tBal > 0 ? `Rs. ${tBal.toLocaleString()}` : 'Cleared ✅'}
                    </span>
                  </div>
                  {/* Progress */}
                  <div className="pt-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-dark-muted mb-1">
                      <span>{pct}% paid</span>
                      <span>Rs. {tPaid.toLocaleString()} / {tDue.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 bg-slate-200 dark:bg-dark-border rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Fee Items Breakdown */}
                {dv.feeItems?.length > 0 && (
                  <div className="p-5 bg-slate-50 dark:bg-dark-hover rounded-2xl border border-slate-200 dark:border-dark-border">
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">📋 Fee Items Breakdown</p>
                    <div className="space-y-2">
                      {dv.feeItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-dark-muted font-bold">{item.name}</span>
                          <span className={`font-black ${Number(item.amount) < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>Rs. {Math.abs(Number(item.amount)).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Children Details (if Family) */}
                {isFamily && (
                  <div className="p-5 bg-slate-50 dark:bg-dark-hover rounded-2xl border border-slate-200 dark:border-dark-border">
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">👨‍👩‍👧‍👦 Children in this Voucher</p>
                    <div className="space-y-2">
                      {children.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-dark-card/50 rounded-xl border border-slate-200 dark:border-dark-border/30 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                              {(c.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-sm">{c.name || 'N/A'}</p>
                              <p className="text-[10px] font-bold text-slate-500 dark:text-dark-muted">Class: {c.class || 'N/A'} • GR: {c.admNo || 'N/A'}</p>
                            </div>
                          </div>
                          {c.fee && <span className="text-xs font-black text-slate-900 dark:text-white">Rs. {Number(c.fee).toLocaleString()}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overall Account Summary */}
                {relatedVouchers.length > 1 && (
                  <div className="p-5 bg-slate-50 dark:bg-gradient-to-r dark:from-indigo-500/10 dark:to-purple-500/10 rounded-2xl border border-slate-200 dark:border-indigo-500/20">
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">📊 Overall Account Summary</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center p-3 bg-white dark:bg-dark-card/50 rounded-xl border border-slate-200 dark:border-transparent shadow-sm">
                        <p className="text-[9px] font-black text-slate-500 dark:text-dark-muted uppercase">Total Vouchers</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{relatedVouchers.length}</p>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-dark-card/50 rounded-xl border border-slate-200 dark:border-transparent shadow-sm">
                        <p className="text-[9px] font-black text-slate-500 dark:text-dark-muted uppercase">Total Fees</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">Rs. {totalAllDue.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-dark-card/50 rounded-xl border border-slate-200 dark:border-transparent shadow-sm">
                        <p className="text-[9px] font-black text-slate-500 dark:text-dark-muted uppercase">Total Paid</p>
                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">Rs. {totalAllPaid.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-dark-card/50 rounded-xl border border-slate-200 dark:border-transparent shadow-sm">
                        <p className="text-[9px] font-black text-slate-500 dark:text-dark-muted uppercase">Total Balance</p>
                        <p className={`text-lg font-black ${totalAllBal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {totalAllBal > 0 ? `Rs. ${totalAllBal.toLocaleString()}` : 'All Clear ✅'}
                        </p>
                      </div>
                    </div>
                    {pendingCount > 0 && (
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-3 text-center">⚠️ {pendingCount} pending voucher{pendingCount > 1 ? 's' : ''} remaining</p>
                    )}
                  </div>
                )}

                {/* Payment Timeline (last 5 vouchers) */}
                {relatedVouchers.length > 1 && (
                  <div className="p-5 bg-slate-50 dark:bg-dark-hover rounded-2xl border border-slate-200 dark:border-dark-border">
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">🕐 Payment Timeline</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {relatedVouchers.slice(0, 8).map((rv, idx) => {
                        const rvPaid = Number(rv.paidAmount) || 0;
                        const rvDue = Number(rv.totalAmount) || 0;
                        const rvBal = Math.max(0, rvDue - rvPaid - (Number(rv.discountAmount) || 0));
                        return (
                          <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            rv.id === dv.id ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30' : 'bg-white border-slate-200 dark:bg-dark-card/30 dark:border-dark-border/20 shadow-sm'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full ${rv.status === 'Paid' ? 'bg-emerald-500' : rv.status === 'Partial' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-xs">{rv.month || 'N/A'}</p>
                                <p className="text-[9px] text-slate-500 dark:text-dark-muted font-bold">
                                  {rv.paidAt ? parseDateSafely(rv.paidAt).toLocaleDateString('en-GB') : 'Not paid'}
                                  {rv.id === dv.id && ' ← current'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">Rs. {rvPaid.toLocaleString()}</p>
                              {rvBal > 0 && <p className="text-[9px] font-bold text-rose-600 dark:text-rose-400">Bal: Rs. {rvBal.toLocaleString()}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      handlePrintReceipt({ ...dv, fatherName: dv.fatherName || 'Parent' });
                    }}
                    className="flex-1 min-w-[140px] py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
                  >
                    <Printer size={16} /> 🖨️ Print Voucher
                  </button>
                  {tBal > 0 && (
                    <button
                      onClick={() => {
                        handleSendReminder(dv);
                      }}
                      className="flex-1 min-w-[140px] py-3 rounded-xl font-black text-sm text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <MessageCircle size={16} /> Send Reminder
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setDetailVoucher(null);
                      // Find the family for this voucher and navigate to step 2
                      const matchStudent = allStudents.find(s => s.id === dv.studentId) ||
                        allStudents.find(s => dv.childrenDetails?.some(c =>
                          (s.rollNumber && String(s.rollNumber).trim() === String(c.admNo).trim()) ||
                          (s.rollNo && String(s.rollNo).trim() === String(c.admNo).trim())
                        ));
                      if (matchStudent) {
                        const key = getFamilyKey(matchStudent);
                        const fam = { key, fatherName: matchStudent.fatherName || 'Unknown', phone: matchStudent.parentPhone || matchStudent.fatherPhone || '', students: allStudents.filter(s => getFamilyKey(s) === key) };
                        handleSelectFamily(fam);
                      }
                    }}
                    className="flex-1 min-w-[140px] py-3 rounded-xl font-black text-sm text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ArrowRight size={16} /> View Full Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CollectFee;
