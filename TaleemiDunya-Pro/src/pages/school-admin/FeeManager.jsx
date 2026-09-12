import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, FileText, Download, Search, 
  CheckCircle, Clock, AlertCircle, RefreshCw, Trash2, Printer, History, X,
  AlertTriangle, CheckSquare, Square, Flame, ShieldAlert, Layers, Filter, Check
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { getRecords, deleteRecord, updateRecord, batchDelete } from '../../services/db';
import { useNavigate } from 'react-router-dom';

const FeeManager = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const navigate = useNavigate();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = schoolData?.name || schoolData?.schoolName || userData?.schoolName || 'SCHOOL';
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection and Delete Hub State
  const [selectedVoucherIds, setSelectedVoucherIds] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTab, setDeleteTab] = useState('all'); // 'all', 'month', 'status', 'selected'
  const [deleteMonth, setDeleteMonth] = useState('');
  const [deleteStatus, setDeleteStatus] = useState('Unpaid');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyVouchers, setHistoryVouchers] = useState([]);
  const [historyTitle, setHistoryTitle] = useState('');

  // Extract unique months from existing vouchers
  const availableMonths = [...new Set(vouchers.map(v => v.month).filter(Boolean))];

  useEffect(() => {
    if (availableMonths.length > 0 && !deleteMonth) {
      setDeleteMonth(availableMonths[0]);
    }
  }, [vouchers]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const openHistory = (c) => {
    const studentIds = [];
    if (c.studentId) studentIds.push(c.studentId);
    if (c.childrenIds && Array.isArray(c.childrenIds)) {
      c.childrenIds.forEach(id => { if (!studentIds.includes(id)) studentIds.push(id) });
    }
    
    const childMatches = [];
    if (c.childrenDetails && Array.isArray(c.childrenDetails)) {
      c.childrenDetails.forEach(ch => {
        if (ch.admNo && ch.name && !childMatches.some(cm => cm.admNo === String(ch.admNo).trim())) {
          childMatches.push({ admNo: String(ch.admNo).trim(), name: String(ch.name).trim().toLowerCase() });
        }
      });
    }

    let related = vouchers.filter(v => {
      let matches = false;
      if (c.fatherCnic && c.fatherCnic !== '-' && v.fatherCnic === c.fatherCnic) matches = true;
      if (v.studentId && studentIds.includes(v.studentId)) matches = true;
      if (v.childrenIds && v.childrenIds.some(id => studentIds.includes(id))) matches = true;
      if (v.childrenDetails && v.childrenDetails.some(ch => ch.admNo && ch.name && childMatches.some(cm => cm.admNo === String(ch.admNo).trim() && cm.name === String(ch.name).trim().toLowerCase()))) matches = true;
      if (!matches && c.familyId && v.familyId && c.familyId === v.familyId) matches = true;
      if (!matches) {
        const vPhone = String(v.phone || v.parentPhone || v.fatherPhone || '').replace(/[^0-9]/g, '');
        const cPhone = String(c.phone || c.parentPhone || '').replace(/[^0-9]/g, '');
        const isDummyPhone = (p) => p === '00000000000' || p === '1234567890' || p === '03000000000' || p === '0000000000';
        if (vPhone && cPhone && vPhone.length >= 10 && vPhone === cPhone && !isDummyPhone(vPhone)) matches = true;
      }
      return matches;
    });
    
    // sort chronological oldest first for ledger
    related.sort((a, b) => {
      const getMs = (dateObj) => {
        if (!dateObj) return 0;
        if (typeof dateObj.toDate === 'function') return dateObj.toDate().getTime();
        if (dateObj.seconds) return dateObj.seconds * 1000;
        const d = new Date(dateObj).getTime();
        return isNaN(d) ? 0 : d;
      };
      return getMs(a.createdAt) - getMs(b.createdAt) || (a.voucherNo || 0) - (b.voucherNo || 0);
    });
    setHistoryVouchers(related);
    setHistoryTitle(c.fatherName || c.studentName || 'Student');
    setHistoryModalOpen(true);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getRecords('vouchers', schoolId);
      // Sort by newest first
      data.sort((a, b) => (Number(b.voucherNo) || 0) - (Number(a.voucherNo) || 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setVouchers(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalRevenue = vouchers.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0);
  const paidChallans = vouchers.filter(c => c.status === 'Paid' || c.status === 'Partial');
  const pendingChallans = vouchers.filter(c => c.status !== 'Paid');
  const collected = paidChallans.reduce((s, c) => s + (Number(c.paidAmount) || Number(c.totalAmount) || 0), 0);
  const pending = vouchers.reduce((s, c) => {
      const rem = (Number(c.totalAmount) || 0) - (Number(c.paidAmount) || 0) - (Number(c.discountAmount) || 0);
      return rem > 0 ? s + rem : s;
  }, 0);

  const stats = [
    { title: 'Total Revenue', value: `PKR ${totalRevenue.toLocaleString()}`, icon: CreditCard, color: 'text-primary-500' },
    { title: 'Collected', value: `PKR ${collected.toLocaleString()}`, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Pending', value: `PKR ${pending.toLocaleString()}`, icon: Clock, color: 'text-orange-500' },
  ];

  const markAsPaid = async (id) => {
    const voucher = vouchers.find(v => v.id === id);
    const totalDue = Number(voucher?.totalAmount) || 0;
    await updateRecord('vouchers', id, { status: 'Paid', paidAmount: totalDue, paidAt: new Date().toISOString() });
    showToast(`Voucher #${voucher?.voucherNo || id.slice(0,6)} marked as Paid!`);
    fetchData();
  };

  // ─── Single Delete (Permanent — no backup) ──────────────────────────────
  const deleteChallan = async (id) => {
    const voucher = vouchers.find(v => v.id === id);
    const vNo = voucher?.voucherNo ? `#${voucher.voucherNo}` : '';
    if (!window.confirm(`کیا آپ واقعی voucher ${vNo} permanently delete کرنا چاہتے ہیں؟ یہ action undo نہیں ہو سکتا۔`)) return;
    
    setIsDeleting(true);
    try {
      // Permanently delete — no backup to deleted_vouchers
      await deleteRecord('vouchers', id);
      setVouchers(prev => prev.filter(v => v.id !== id));
      setSelectedVoucherIds(prev => prev.filter(vId => vId !== id));
      showToast(`Voucher ${vNo} permanently deleted.`);
    } catch (err) {
      console.error(err);
      alert('Error deleting voucher: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Bulk Delete Selected (Permanent — no backup) ────────────────────────
  const handleDeleteSelected = async () => {
    if (selectedVoucherIds.length === 0) return;
    if (!window.confirm(`کیا آپ ${selectedVoucherIds.length} منتخب vouchers permanently delete کرنا چاہتے ہیں؟ کوئی backup نہیں ہوگا۔`)) return;

    setIsDeleting(true);
    try {
      const count = selectedVoucherIds.length;
      // Permanently delete — no backup
      await batchDelete('vouchers', selectedVoucherIds);
      setVouchers(prev => prev.filter(v => !selectedVoucherIds.includes(v.id)));
      setSelectedVoucherIds([]);
      setDeleteModalOpen(false);
      showToast(`${count} vouchers permanently deleted.`);
    } catch (err) {
      console.error('Error deleting selected vouchers:', err);
      alert('Error deleting vouchers: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Delete All Vouchers + Clear deleted_vouchers backup ─────────────────
  const handleDeleteAllVouchers = async () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      alert('تصدیق کے لیے DELETE لکھیں۔');
      return;
    }
    if (vouchers.length === 0) {
      alert('کوئی voucher موجود نہیں ہے۔');
      return;
    }

    setIsDeleting(true);
    try {
      // Step 1: Permanently delete all active vouchers (NO backup)
      const allIds = vouchers.map(v => v.id);
      await batchDelete('vouchers', allIds);

      // Step 2: Also wipe deleted_vouchers collection so no old data interferes
      try {
        const deletedOld = await getRecords('deleted_vouchers', schoolId);
        if (deletedOld.length > 0) {
          await batchDelete('deleted_vouchers', deletedOld.map(d => d.id));
        }
      } catch(e) {
        // Non-critical — continue even if deleted_vouchers wipe fails
        console.warn('Could not clear deleted_vouchers:', e);
      }

      setVouchers([]);
      setSelectedVoucherIds([]);
      setDeleteModalOpen(false);
      setConfirmText('');
      showToast(`✅ تمام ${allIds.length} vouchers مکمل طور پر delete ہو گئے! اب نئی fees کے ساتھ fresh vouchers بنائیں۔`);
    } catch (err) {
      console.error('Error deleting all vouchers:', err);
      alert('Vouchers delete کرنے میں خرابی: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Delete By Month (Permanent — no backup) ──────────────────────────────
  const handleDeleteByMonth = async () => {
    if (!deleteMonth) return alert('مہینہ منتخب کریں۔');
    const monthVouchers = vouchers.filter(v => v.month === deleteMonth);
    if (monthVouchers.length === 0) return alert(`${deleteMonth} کے لیے کوئی voucher نہیں ملا۔`);

    if (!window.confirm(`کیا آپ ${deleteMonth} کے تمام ${monthVouchers.length} vouchers permanently delete کرنا چاہتے ہیں؟ یہ completely remove ہو جائیں گے اور نئی fees سے fresh بنائے جا سکیں گے۔`)) return;

    setIsDeleting(true);
    try {
      const ids = monthVouchers.map(v => v.id);
      // Permanently delete — NO backup to deleted_vouchers
      await batchDelete('vouchers', ids);
      setVouchers(prev => prev.filter(v => !ids.includes(v.id)));
      setSelectedVoucherIds(prev => prev.filter(id => !ids.includes(id)));
      setDeleteModalOpen(false);
      showToast(`✅ ${deleteMonth} کے ${ids.length} vouchers permanently delete ہو گئے! اب نئے vouchers بنائیں۔`);
    } catch (err) {
      console.error('Error deleting month vouchers:', err);
      alert('Vouchers delete کرنے میں خرابی: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Delete By Status (Permanent — no backup) ─────────────────────────────
  const handleDeleteByStatus = async () => {
    if (!deleteStatus) return alert('Status منتخب کریں۔');
    const statusVouchers = vouchers.filter(v => v.status === deleteStatus);
    if (statusVouchers.length === 0) return alert(`"${deleteStatus}" status کے vouchers نہیں ملے۔`);

    if (!window.confirm(`کیا آپ تمام ${statusVouchers.length} "${deleteStatus}" vouchers permanently delete کرنا چاہتے ہیں؟`)) return;

    setIsDeleting(true);
    try {
      const ids = statusVouchers.map(v => v.id);
      // Permanently delete — NO backup
      await batchDelete('vouchers', ids);
      setVouchers(prev => prev.filter(v => !ids.includes(v.id)));
      setSelectedVoucherIds(prev => prev.filter(id => !ids.includes(id)));
      setDeleteModalOpen(false);
      showToast(`✅ ${ids.length} "${deleteStatus}" vouchers permanently delete ہو گئے۔`);
    } catch (err) {
      console.error('Error deleting status vouchers:', err);
      alert('Vouchers delete کرنے میں خرابی: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Selection Helpers ────────────────────────────────────────────────────
  const toggleSelectAll = (list) => {
    const listIds = list.map(v => v.id);
    const allSelected = listIds.length > 0 && listIds.every(id => selectedVoucherIds.includes(id));
    if (allSelected) {
      setSelectedVoucherIds(prev => prev.filter(id => !listIds.includes(id)));
    } else {
      setSelectedVoucherIds(prev => [...new Set([...prev, ...listIds])]);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedVoucherIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filtered = vouchers.filter(c => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    
    const searchDigits = search.replace(/\D/g, '');
    const phoneMatch = searchDigits ? String(c.phone || '').replace(/\D/g, '').includes(searchDigits) : false;

    return (
      (c.fatherName || '').toLowerCase().includes(search) ||
      (c.studentName || '').toLowerCase().includes(search) ||
      (c.month || '').toLowerCase().includes(search) ||
      String(c.voucherNo || '').toLowerCase().includes(search) ||
      String(c.rollNo || '').toLowerCase().includes(search) ||
      String(c.rollNumber || '').toLowerCase().includes(search) ||
      phoneMatch ||
      (c.childrenDetails || []).some(child =>
        (child.name || '').toLowerCase().includes(search) ||
        String(child.admNo || '').toLowerCase().includes(search) ||
        String(child.rollNo || '').toLowerCase().includes(search) ||
        String(child.rollNumber || '').toLowerCase().includes(search)
      )
    );
  });

  const exportCSV = () => {
    const rows = [['Voucher No', 'Name', 'Month', 'Amount', 'Status', 'Due Date'],
      ...vouchers.map(c => [c.voucherNo || c.id, c.fatherName || c.studentName, c.month, c.totalAmount, c.status, c.dueDate])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `fee_report_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  // ─── Print Voucher ────────────────────────────────────────────────────────
  const handlePrintVoucher = (c) => {
    const logoHtml = schoolData?.logo
      ? `<img src="${schoolData.logo}" />`
      : `<div class="logo-fallback">${schoolName.charAt(0)}</div>`;
    
    const tDue  = Number(c.totalAmount) || 0;
    const tPaid = Number(c.paidAmount)  || 0;
    const tDisc = Number(c.discountAmount) || 0;
    const tBal  = Math.max(0, tDue - tPaid - tDisc);
    
    // Amount calculations for the voucher format (Fee vs Arrears vs Annual vs Others)
    let currentFee = 0;
    let prevArrears = 0;
    let annualFund = 0;
    let otherCharges = 0;
    let discount = 0;
    
    (c.feeItems || []).forEach(item => {
      const name = String(item.name || '').toLowerCase();
      const amt = Number(item.amount) || 0;
      if (name.includes('annual')) {
        annualFund += Math.abs(amt);
      } else if (name.includes('arrear') || name.includes('previous') || name.includes('balance') || name.includes('baqaya') || name.includes('opening')) {
        prevArrears += amt;
      } else if (name.includes('discount') || name.includes('scholarship') || amt < 0) {
        discount += Math.abs(amt);
      } else if (name.includes('tuition') || name.includes('monthly') || name === 'fee') {
        currentFee += amt;
      } else {
        otherCharges += amt;
      }
    });

    // Fallback if not explicitly present in feeItems but present in childrenDetails
    if (annualFund === 0 && c.childrenDetails && Array.isArray(c.childrenDetails)) {
      annualFund = c.childrenDetails.reduce((sum, ch) => sum + (Number(ch.annualFee) || 0), 0);
    }
    if (prevArrears === 0 && c.childrenDetails && Array.isArray(c.childrenDetails)) {
      prevArrears = c.childrenDetails.reduce((sum, ch) => sum + (Number(ch.arrears) || 0), 0);
    }

    const calculatedTotal = currentFee + annualFund + prevArrears + otherCharges - discount;
    const totalPayable = Math.max(tDue, calculatedTotal > 0 ? calculatedTotal : tDue);
    
    const childRows = (c.childrenDetails && c.childrenDetails.length > 0) ? c.childrenDetails.map((ch, idx) => {
      let childFee = Number(ch.fee || ch.feeAmount || ch.totalFee || ch.amount || 0);
      if (!childFee && c.feeItems) {
        if (c.childrenDetails.length === 1) {
          childFee = currentFee > 0 ? currentFee : tDue;
        } else {
          const item = c.feeItems.find(f => {
            const n = String(f.name || '').toLowerCase();
            return ch.name && n.includes(ch.name.toLowerCase()) && !n.includes('arrear') && !n.includes('annual');
          });
          if (item) childFee = Number(item.amount);
        }
      }
      return `<tr>
        <td class="text-center">${ch.admNo || '-'}</td>
        <td>${ch.name || '-'}</td>
        <td class="text-center">${ch.class || '-'}</td>
        <td style="text-align:right; padding-right:10px;">${childFee > 0 ? childFee.toLocaleString() : '-'}</td>
      </tr>`;
    }).join('') : `<tr>
      <td class="text-center">${c.rollNo || c.rollNumber || '-'}</td>
      <td>${c.studentName || '-'}</td>
      <td class="text-center">${c.class || '-'}</td>
      <td style="text-align:right; padding-right:10px;">${(currentFee > 0 ? currentFee : tDue).toLocaleString()}</td>
    </tr>`;
    
    const html = `<!DOCTYPE html>
<html>
<head>
<title>Voucher #${c.voucherNo || c.id?.slice(0,6)}</title>
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
  .totals-row.payable { background:#e5e7eb; font-size:13px; margin-top:15px; border:1px solid #6b7280; font-weight:900; }
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
    <button class="print-btn" onclick="window.print()">🖨️ Print Voucher</button>
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
              <span>${copyType}</span>
              <span>Voucher #${c.voucherNo || c.id?.slice(0,6)}</span>
            </div>
          </div>
        </div>
        <div class="info-grid">
          <div class="label">Month</div><div class="value">${c.month || '-'}</div>
          <div class="label">Due Date</div><div class="value">${c.dueDate || '-'}</div>
          <div class="label">Ft. Name</div><div class="value">${c.fatherName || c.studentName || '-'}</div>
          <div class="label">No Of child</div><div class="value">${c.childrenDetails?.length || 1}</div>
          <div class="label">NIC</div><div class="value">${c.fatherCnic || '-'}</div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th style="width:15%;" class="text-center">Adm#</th>
              <th style="width:40%;">Name</th>
              <th style="width:15%;" class="text-center">Class</th>
              <th style="width:30%; text-align:right; padding-right:10px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${childRows}
          </tbody>
        </table>
        ${annualFund > 0 ? `
          <div class="totals-row" style="background:#f0f9ff;">
            <span style="flex:1; text-align:right; padding-right:10px; color:#0369a1;">Annual Fund</span>
            <span style="width:30%; padding-left:6px; border-left:1px solid #6b7280; text-align:right; color:#0369a1;">PKR ${annualFund.toLocaleString()}</span>
          </div>
        ` : ''}
        ${otherCharges > 0 ? `
          <div class="totals-row">
            <span style="flex:1; text-align:right; padding-right:10px;">Other Charges</span>
            <span style="width:30%; padding-left:6px; border-left:1px solid #6b7280; text-align:right;">PKR ${otherCharges.toLocaleString()}</span>
          </div>
        ` : ''}
        ${prevArrears > 0 ? `
          <div class="totals-row" style="background:#fff1f2;">
            <span style="flex:1; text-align:right; padding-right:10px; color:#be123c;">Previous Balance / Arrears</span>
            <span style="width:30%; padding-left:6px; border-left:1px solid #6b7280; text-align:right; color:#be123c;">PKR ${prevArrears.toLocaleString()}</span>
          </div>
        ` : ''}
        ${discount > 0 ? `
          <div class="totals-row" style="background:#f0fdf4;">
            <span style="flex:1; text-align:right; padding-right:10px; color:#15803d;">Discount / Concession</span>
            <span style="width:30%; padding-left:6px; border-left:1px solid #6b7280; text-align:right; color:#15803d;">-PKR ${discount.toLocaleString()}</span>
          </div>
        ` : ''}
        <div class="totals-row payable">
          <span style="flex:1; text-align:right; padding-right:10px;">Total Payable</span>
          <span style="width:30%; padding-left:6px; border-left:1px solid #6b7280; text-align:right;">PKR ${totalPayable.toLocaleString()}</span>
        </div>
      </div>
    `).join('')}
  </div>
</div>
</body>
</html>`;
    const win = window.open('', '_blank', 'width=950,height=700');
    if (win) { win.document.write(html); win.document.close(); }
  };

  // ─── Action Buttons ───────────────────────────────────────────────────────
  const ActionButtons = ({ c }) => (
    <div className="flex gap-1.5 justify-end">
      <button onClick={() => openHistory(c)} className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/25 transition-all" title="View Ledger / History">
        <History size={15} />
      </button>
      <button onClick={() => handlePrintVoucher(c)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/25 transition-all" title="Print Voucher">
        <Printer size={15} />
      </button>
      {c.status !== 'Paid' && (
        <button onClick={() => markAsPaid(c.id)} className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20" title="Mark Paid">
          <CheckCircle size={15} />
        </button>
      )}
      <button onClick={() => deleteChallan(c.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20" title="Delete">
        <Trash2 size={15} />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-primary-500" size={32} />
        <p className="text-dark-muted ml-3">Loading fee data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-dark-card/95 border border-emerald-500/40 backdrop-blur-xl shadow-2xl rounded-2xl px-5 py-3.5 flex items-center gap-3 text-white animate-fade-in">
          <CheckCircle className="text-emerald-400" size={20} />
          <span className="text-sm font-bold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">Fee & Finance Manager</h1>
          <p className="text-dark-muted mt-1">Manage student fee collections, remove incorrect vouchers, and generate new challans.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button 
            onClick={() => { setDeleteTab('all'); setDeleteModalOpen(true); }}
            className="px-4 py-2.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <Trash2 size={16} /> Delete / Wipe Vouchers
          </button>
          <button onClick={exportCSV} className="premium-button-secondary"><FileText size={18} /> Export</button>
          <button onClick={() => navigate('/school-admin/fees/generate')} className="premium-button-primary">
            <Plus size={20} /> Generate Challan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <GlassCard key={i} className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-white/5 ${stat.color}`}><stat.icon size={24} /></div>
              <div>
                <p className="text-xs font-black text-dark-muted uppercase tracking-widest">{stat.title}</p>
                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-border pb-px">
        {['overview', 'challans', 'defaulters'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all relative ${
              activeTab === tab ? 'text-primary-500' : 'text-dark-muted hover:text-dark-text'
            }`}>
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <GlassCard className="lg:col-span-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Recent Collections</h2>
                {selectedVoucherIds.length > 0 && (
                  <span className="px-2.5 py-0.5 bg-primary-500/20 text-primary-400 rounded-full text-xs font-bold">
                    {selectedVoucherIds.length} selected
                  </span>
                )}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                <input type="text" placeholder="🔍 Name, Father, Roll No, Voucher #, Phone..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)} className="w-full premium-input pl-10 py-2 text-xs" />
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-dark-muted">
                <CreditCard size={40} className="mx-auto opacity-30 mb-3" />
                <p className="font-bold text-sm">No challans found</p>
                <p className="text-xs mt-1">Generate your first challan or new vouchers to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                      <th className="pb-4 px-3 w-10 text-center">
                        <input 
                          type="checkbox"
                          checked={filtered.slice(0, 10).length > 0 && filtered.slice(0, 10).every(c => selectedVoucherIds.includes(c.id))}
                          onChange={() => toggleSelectAll(filtered.slice(0, 10))}
                          className="w-4 h-4 rounded text-red-500 focus:ring-red-400 bg-dark-bg border-dark-border cursor-pointer accent-red-500"
                        />
                      </th>
                      <th className="pb-4 px-4">Voucher / Name</th>
                      <th className="pb-4 px-4">Month</th>
                      <th className="pb-4 px-4">Amount</th>
                      <th className="pb-4 px-4">Status</th>
                      <th className="pb-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {filtered.slice(0, 10).map((c) => {
                      const isSelected = selectedVoucherIds.includes(c.id);
                      return (
                        <tr key={c.id} className={`transition-colors ${isSelected ? 'bg-red-500/10' : 'hover:bg-white/5'}`}>
                          <td className="py-4 px-3 text-center">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(c.id)}
                              className="w-4 h-4 rounded text-red-500 focus:ring-red-400 bg-dark-bg border-dark-border cursor-pointer accent-red-500"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-bold text-white">
                              {c.studentName || c.fatherName || 'Unknown'}
                              {c.fatherName && c.childrenDetails && c.childrenDetails.length > 0 && (
                                <span className="text-dark-muted font-normal text-[10px] ml-1">
                                  ({c.childrenDetails.map(ch => ch.name).join(', ')})
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-dark-muted font-bold">Voucher #{c.voucherNo || c.id.slice(0,6)}</p>
                          </td>
                          <td className="py-4 px-4 text-sm text-dark-muted">{c.month}</td>
                          <td className="py-4 px-4 font-bold text-primary-400">PKR {Number(c.totalAmount).toLocaleString()}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              c.status === 'Paid' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                            }`}>{c.status}</span>
                          </td>
                          <td className="py-3 px-4">
                            <ActionButtons c={c} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          <div className="space-y-6">
            <GlassCard className="p-6 bg-primary-500/5 border-primary-500/20">
              <h3 className="font-bold flex items-center gap-2 mb-4"><FileText size={18} className="text-primary-500" /> Quick Actions</h3>
              <div className="space-y-3">
                <button onClick={() => navigate('/school-admin/fees/generate')} className="w-full premium-button-primary py-3">
                  <Plus size={18} /> New Challan
                </button>
                <button onClick={fetchData} className="w-full premium-button-secondary py-3">
                  <RefreshCw size={18} /> Refresh Data
                </button>
                <button 
                  onClick={() => { setDeleteTab('all'); setDeleteModalOpen(true); }}
                  className="w-full py-3 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Trash2 size={16} /> Delete / Wipe Vouchers
                </button>
              </div>
            </GlassCard>
            <GlassCard className="p-6 border-orange-500/20 bg-orange-500/5">
              <h3 className="font-bold flex items-center gap-2 mb-4 text-orange-500"><AlertCircle size={18} /> Pending</h3>
              <p className="text-xs text-dark-muted mb-4">{pendingChallans.length} challans pending worth PKR {pending.toLocaleString()}</p>
              <button onClick={() => setActiveTab('defaulters')} className="w-full premium-button-secondary text-orange-500 border-orange-500/20 hover:bg-orange-500/10 py-3">
                View Defaulters
              </button>
            </GlassCard>
          </div>
        </div>
      )}

      {/* All Challans Tab */}
      {activeTab === 'challans' && (
        <GlassCard className="p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">All Challans ({vouchers.length})</h2>
              {selectedVoucherIds.length > 0 && (
                <span className="px-2.5 py-0.5 bg-primary-500/20 text-primary-400 rounded-full text-xs font-bold">
                  {selectedVoucherIds.length} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                <input type="text" placeholder="🔍 Search vouchers..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)} className="w-full premium-input pl-10 py-2 text-xs" />
              </div>
              <button 
                onClick={() => { setDeleteTab('all'); setDeleteModalOpen(true); }}
                className="px-4 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
              >
                <Trash2 size={15} /> Delete / Wipe Vouchers
              </button>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-dark-muted">
              <FileText size={40} className="mx-auto opacity-30 mb-3" />
              <p className="font-bold">No challans found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                    <th className="pb-4 px-3 w-10 text-center">
                      <input 
                        type="checkbox"
                        checked={filtered.length > 0 && filtered.every(c => selectedVoucherIds.includes(c.id))}
                        onChange={() => toggleSelectAll(filtered)}
                        className="w-4 h-4 rounded text-red-500 focus:ring-red-400 bg-dark-bg border-dark-border cursor-pointer accent-red-500"
                      />
                    </th>
                    <th className="pb-4 px-4">Voucher / Name</th>
                    <th className="pb-4 px-4">Month</th>
                    <th className="pb-4 px-4">Fee Items</th>
                    <th className="pb-4 px-4">Total</th>
                    <th className="pb-4 px-4">Due Date</th>
                    <th className="pb-4 px-4">Status</th>
                    <th className="pb-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {filtered.map(c => {
                    const isSelected = selectedVoucherIds.includes(c.id);
                    return (
                      <tr key={c.id} className={`transition-colors ${isSelected ? 'bg-red-500/10' : 'hover:bg-white/5'}`}>
                        <td className="py-4 px-3 text-center">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(c.id)}
                            className="w-4 h-4 rounded text-red-500 focus:ring-red-400 bg-dark-bg border-dark-border cursor-pointer accent-red-500"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-white">
                            {c.studentName || c.fatherName || 'Unknown'}
                            {c.fatherName && c.childrenDetails && c.childrenDetails.length > 0 && (
                              <span className="text-dark-muted font-normal text-[10px] ml-1">
                                ({c.childrenDetails.map(ch => ch.name).join(', ')})
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-dark-muted font-bold">Voucher #{c.voucherNo || c.id.slice(0,6)}</p>
                        </td>
                        <td className="py-4 px-4 text-dark-muted">{c.month}</td>
                        <td className="py-4 px-4 text-xs text-dark-muted">{(c.feeItems || []).map(f => f.name).join(', ')}</td>
                        <td className="py-4 px-4 font-bold text-primary-400">PKR {Number(c.totalAmount).toLocaleString()}</td>
                        <td className="py-4 px-4 text-dark-muted">{c.dueDate || 'N/A'}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            c.status === 'Paid' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                          }`}>{c.status}</span>
                        </td>
                        <td className="py-3 px-4">
                          <ActionButtons c={c} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* Defaulters Tab */}
      {activeTab === 'defaulters' && (
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-orange-500 flex items-center gap-2">
              <AlertCircle size={22} /> Defaulters ({pendingChallans.length})
            </h2>
            {selectedVoucherIds.length > 0 && (
              <span className="px-2.5 py-0.5 bg-primary-500/20 text-primary-400 rounded-full text-xs font-bold">
                {selectedVoucherIds.length} selected
              </span>
            )}
          </div>
          {pendingChallans.length === 0 ? (
            <div className="text-center py-12 text-dark-muted">
              <CheckCircle size={40} className="mx-auto text-green-500 opacity-50 mb-3" />
              <p className="font-bold text-green-500">All Clear!</p>
              <p className="text-xs mt-1">No pending challans found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                    <th className="pb-4 px-3 w-10 text-center">
                      <input 
                        type="checkbox"
                        checked={pendingChallans.length > 0 && pendingChallans.every(c => selectedVoucherIds.includes(c.id))}
                        onChange={() => toggleSelectAll(pendingChallans)}
                        className="w-4 h-4 rounded text-red-500 focus:ring-red-400 bg-dark-bg border-dark-border cursor-pointer accent-red-500"
                      />
                    </th>
                    <th className="pb-4 px-4">Voucher / Name</th>
                    <th className="pb-4 px-4">Month</th>
                    <th className="pb-4 px-4">Amount Due</th>
                    <th className="pb-4 px-4">Due Date</th>
                    <th className="pb-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {pendingChallans.map(c => {
                    const rem = (Number(c.totalAmount) || 0) - (Number(c.paidAmount) || 0) - (Number(c.discountAmount) || 0);
                    if (rem <= 0) return null;
                    const isSelected = selectedVoucherIds.includes(c.id);
                    return (
                      <tr key={c.id} className={`transition-colors ${isSelected ? 'bg-red-500/10' : 'hover:bg-white/5'}`}>
                        <td className="py-4 px-3 text-center">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(c.id)}
                            className="w-4 h-4 rounded text-red-500 focus:ring-red-400 bg-dark-bg border-dark-border cursor-pointer accent-red-500"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-white">
                            {c.studentName || c.fatherName || 'Unknown'}
                            {c.fatherName && c.childrenDetails && c.childrenDetails.length > 0 && (
                              <span className="text-dark-muted font-normal text-[10px] ml-1">
                                ({c.childrenDetails.map(ch => ch.name).join(', ')})
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-dark-muted font-bold">Voucher #{c.voucherNo || c.id.slice(0,6)}</p>
                        </td>
                        <td className="py-4 px-4 text-dark-muted">{c.month}</td>
                        <td className="py-4 px-4 font-bold text-red-400">PKR {rem.toLocaleString()}</td>
                        <td className="py-4 px-4 text-dark-muted">{c.dueDate || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <ActionButtons c={c} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* ─── Floating Batch Action Bar ─── */}
      {selectedVoucherIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-dark-card/95 border border-red-500/40 backdrop-blur-xl shadow-2xl rounded-2xl px-6 py-3.5 flex items-center gap-6 animate-slide-up">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <CheckCircle className="text-primary-400" size={18} />
            <span><strong className="text-primary-400">{selectedVoucherIds.length}</strong> voucher(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={isDeleting}
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              <Trash2 size={15} />
              {isDeleting ? 'Deleting...' : `Delete Selected (${selectedVoucherIds.length})`}
            </button>
            <button 
              onClick={() => setSelectedVoucherIds([])}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-dark-muted hover:text-white rounded-xl text-xs font-semibold transition-all"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* ─── Voucher Cleanup & Delete Hub Modal ─── */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <GlassCard className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border-red-500/30 shadow-2xl shadow-red-950/40">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-red-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Voucher Management & Deletion Hub</h2>
                  <p className="text-xs text-dark-muted mt-0.5">Remove corrupt, incorrect, or outdated vouchers to start clean.</p>
                </div>
              </div>
              <button onClick={() => setDeleteModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-dark-muted hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-dark-border bg-dark-bg/60 px-6 gap-2">
              {[
                { id: 'all', label: 'Wipe All Vouchers', icon: Flame, badge: vouchers.length },
                { id: 'month', label: 'Delete by Month', icon: Layers, badge: availableMonths.length },
                { id: 'status', label: 'Delete by Status', icon: Filter },
                ...(selectedVoucherIds.length > 0 ? [{ id: 'selected', label: 'Selected Only', icon: CheckSquare, badge: selectedVoucherIds.length }] : [])
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDeleteTab(tab.id)}
                  className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                    deleteTab === tab.id
                      ? 'text-red-400 border-red-500 bg-red-500/10'
                      : 'text-dark-muted border-transparent hover:text-white'
                  }`}
                >
                  <tab.icon size={15} />
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${deleteTab === tab.id ? 'bg-red-500/30 text-red-300' : 'bg-white/10 text-dark-muted'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Tab 1: Wipe All Vouchers — PERMANENT FRESH START */}
              {deleteTab === 'all' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3.5">
                    <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={24} />
                    <div className="space-y-1 text-xs leading-relaxed text-dark-muted">
                      <p className="font-bold text-red-400 text-sm">🔥 مکمل Fresh Start — تمام Vouchers Permanently Delete</p>
                      <p>
                        یہ <strong className="text-white">{vouchers.length} vouchers</strong> کو completely اور permanently delete کر دے گا۔
                      </p>
                      <p className="text-emerald-400 font-bold">
                        ✅ deleted_vouchers backup بھی clear ہو گا — کوئی پرانا data نہیں رہے گا
                      </p>
                      <p className="text-yellow-300">
                        Delete کے بعد نئی fees کے ساتھ fresh vouchers generate کریں — fees صحیح ہوں گی۔
                      </p>
                    </div>
                  </div>

                  {vouchers.length === 0 ? (
                    <div className="text-center py-6 text-emerald-400 text-sm font-bold">
                      ✅ کوئی voucher موجود نہیں — آپ fresh vouchers generate کر سکتے ہیں!
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-dark-muted">
                          تصدیق کے لیے نیچے <span className="text-red-400 font-mono font-black">DELETE</span> لکھیں:
                        </label>
                        <input
                          type="text"
                          placeholder="DELETE لکھیں"
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          className="w-full bg-dark-bg border border-red-500/40 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-dark-muted/40 focus:outline-none focus:border-red-500 uppercase"
                        />
                      </div>

                      <button
                        disabled={isDeleting || confirmText.trim().toUpperCase() !== 'DELETE'}
                        onClick={handleDeleteAllVouchers}
                        className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Flame size={18} />
                        {isDeleting ? '🗑️ سب Vouchers Delete ہو رہے ہیں...' : `🔥 تمام ${vouchers.length} Vouchers مکمل Delete کریں (Fresh Start)`}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Delete by Month */}
              {deleteTab === 'month' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5">
                    <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={22} />
                    <div className="text-xs leading-relaxed text-dark-muted space-y-1">
                      <p className="font-bold text-amber-400 text-sm">Delete Vouchers for a Specific Month</p>
                      <p>
                        Select a billing month below to delete only the vouchers generated for that month. Other months will remain untouched.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-dark-muted">Select Target Month:</label>
                    {availableMonths.length > 0 ? (
                      <select
                        value={deleteMonth}
                        onChange={(e) => setDeleteMonth(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500"
                      >
                        {availableMonths.map(m => {
                          const count = vouchers.filter(v => v.month === m).length;
                          return (
                            <option key={m} value={m} className="bg-dark-card text-white">
                              {m} ({count} vouchers)
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        type="month"
                        value={deleteMonth}
                        onChange={(e) => setDeleteMonth(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white [color-scheme:dark]"
                      />
                    )}

                    <div className="p-3 bg-white/5 rounded-xl text-xs flex justify-between items-center text-dark-muted">
                      <span>Vouchers to be removed:</span>
                      <strong className="text-white text-sm">
                        {vouchers.filter(v => v.month === deleteMonth).length} Vouchers
                      </strong>
                    </div>

                    <button
                      disabled={isDeleting || vouchers.filter(v => v.month === deleteMonth).length === 0}
                      onClick={handleDeleteByMonth}
                      className="w-full mt-2 py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} />
                      {isDeleting ? 'Deleting Month Vouchers...' : `Delete All Vouchers for ${deleteMonth || 'Selected Month'}`}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Delete by Status */}
              {deleteTab === 'status' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3.5">
                    <Filter className="text-blue-400 shrink-0 mt-0.5" size={22} />
                    <div className="text-xs leading-relaxed text-dark-muted space-y-1">
                      <p className="font-bold text-blue-400 text-sm">Delete by Payment Status</p>
                      <p>
                        Choose whether to delete all Unpaid vouchers, Partial vouchers, or Paid vouchers.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'Unpaid', label: 'Unpaid', count: vouchers.filter(v => v.status === 'Unpaid').length, color: 'border-orange-500/40 text-orange-400' },
                      { id: 'Partial', label: 'Partial', count: vouchers.filter(v => v.status === 'Partial').length, color: 'border-yellow-500/40 text-yellow-400' },
                      { id: 'Paid', label: 'Paid', count: vouchers.filter(v => v.status === 'Paid').length, color: 'border-green-500/40 text-green-400' },
                    ].map(st => (
                      <button
                        key={st.id}
                        onClick={() => setDeleteStatus(st.id)}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          deleteStatus === st.id
                            ? 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/10'
                            : 'bg-dark-bg border-dark-border text-dark-muted hover:bg-white/5'
                        }`}
                      >
                        <p className="text-xs font-bold uppercase">{st.label}</p>
                        <p className="text-lg font-black mt-1">{st.count}</p>
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={isDeleting || vouchers.filter(v => v.status === deleteStatus).length === 0}
                    onClick={handleDeleteByStatus}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    {isDeleting ? 'Deleting...' : `Delete All "${deleteStatus}" Vouchers (${vouchers.filter(v => v.status === deleteStatus).length})`}
                  </button>
                </div>
              )}

              {/* Tab 4: Delete Selected */}
              {deleteTab === 'selected' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-start gap-3.5">
                    <CheckSquare className="text-primary-400 shrink-0 mt-0.5" size={22} />
                    <div className="text-xs leading-relaxed text-dark-muted space-y-1">
                      <p className="font-bold text-primary-400 text-sm">Selected Vouchers Deletion</p>
                      <p>
                        You have selected <strong className="text-white">{selectedVoucherIds.length} specific voucher(s)</strong> from the table.
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isDeleting || selectedVoucherIds.length === 0}
                    onClick={handleDeleteSelected}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    {isDeleting ? 'Deleting Selected...' : `Permanently Delete Selected (${selectedVoucherIds.length})`}
                  </button>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GlassCard className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History className="text-primary-400" />
                  Voucher History / Ledger
                </h2>
                <p className="text-sm text-dark-muted mt-1">{historyTitle}</p>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                      <th className="pb-4 px-4">Date</th>
                      <th className="pb-4 px-4">Month</th>
                      <th className="pb-4 px-4">Voucher #</th>
                      <th className="pb-4 px-4">Total Billed</th>
                      <th className="pb-4 px-4">Paid</th>
                      <th className="pb-4 px-4">Discount</th>
                      <th className="pb-4 px-4">Balance</th>
                      <th className="pb-4 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {historyVouchers.map((v, i) => {
                      const billed = Number(v.totalAmount) || 0;
                      const paid = Number(v.paidAmount) || 0;
                      const discount = Number(v.discountAmount) || 0;
                      const bal = billed - paid - discount;
                      
                      const date = v.createdAt ? new Date(
                        typeof v.createdAt?.toDate === 'function' ? v.createdAt.toDate() :
                        v.createdAt.seconds ? v.createdAt.seconds * 1000 : v.createdAt
                      ).toLocaleDateString() : 'N/A';

                      return (
                        <tr key={v.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 text-xs text-dark-muted">{date}</td>
                          <td className="py-4 px-4 text-sm">{v.month}</td>
                          <td className="py-4 px-4 font-bold text-white">#{v.voucherNo || v.id.slice(0,6)}</td>
                          <td className="py-4 px-4 text-primary-400">
                            PKR {billed.toLocaleString()}
                            {i === 0 && v.feeItems && v.feeItems.some(f => f.name && (f.name.includes('Previous Arrears') || f.name.includes('Opening Balance'))) && (
                               <div className="text-[9px] text-orange-400 mt-1 uppercase font-bold text-left">Incl. Opening Bal.</div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-green-400">PKR {paid.toLocaleString()}</td>
                          <td className="py-4 px-4 text-yellow-400">PKR {discount.toLocaleString()}</td>
                          <td className="py-4 px-4 font-bold text-orange-400">PKR {Math.max(0, bal).toLocaleString()}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              v.status === 'Paid' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                            }`}>{v.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-dark-border font-bold">
                    <tr>
                      <td colSpan="4" className="py-4 px-4 text-right">TOTAL PAID (Lifetime):</td>
                      <td className="py-4 px-4 text-green-400">PKR {historyVouchers.reduce((s, v) => s + (Number(v.paidAmount) || 0), 0).toLocaleString()}</td>
                      <td colSpan="3"></td>
                    </tr>
                    <tr>
                      <td colSpan="4" className="py-4 px-4 text-right text-orange-400">CURRENT OUTSTANDING BALANCE:</td>
                      <td colSpan="4" className="py-4 px-4 text-orange-400">
                        PKR {
                          (() => {
                            const sorted = [...historyVouchers].sort((a,b) => b.voucherNo - a.voucherNo);
                            const lastVoucher = sorted[0];
                            if (lastVoucher) {
                               return Math.max(0, (Number(lastVoucher.totalAmount) || 0) - (Number(lastVoucher.paidAmount) || 0) - (Number(lastVoucher.discountAmount) || 0)).toLocaleString();
                            }
                            return "0";
                          })()
                        }
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default FeeManager;

