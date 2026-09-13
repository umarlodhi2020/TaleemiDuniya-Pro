import React, { useState, useEffect, useRef } from 'react';
import { FileText, CheckCircle, AlertCircle, Printer, Loader2, Calendar, Filter, Search, MessageCircle, RefreshCw, Download, Trash2 } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const FeeRecord = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = schoolData?.name || schoolData?.schoolName || userData?.schoolName || 'SCHOOL';

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingWa, setSendingWa] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Filters
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedClass, setSelectedClass] = useState('All');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'paid', 'unpaid'

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [studs, vouch] = await Promise.all([
          getRecords('students', schoolId),
          getRecords('vouchers', schoolId)
        ]);
        setStudents(studs || []);
        setVouchers(vouch || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [schoolId]);

  // Unique classes from students
  const uniqueClasses = [...new Set(students.map(s => s.class).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Format month for display: "2026-08" → "August 2026"
  const formatMonthLabel = (ym) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    return `${MONTHS[parseInt(m) - 1]} ${y}`;
  };

  // Build per-student row data
  const buildRows = () => {
    let studs = students;
    if (selectedClass !== 'All') studs = studs.filter(s => s.class === selectedClass);

    return studs.map((student, idx) => {
      // Find vouchers for this student in the selected month
      const monthLabel = formatMonthLabel(selectedMonth);
      const studentVouchers = vouchers.filter(v => {
        const monthMatch = v.month === monthLabel || v.month === selectedMonth;
        if (!monthMatch) return false;
        if (v.studentId === student.id) return true;
        if (v.childrenIds?.includes(student.id)) return true;
        if (v.childrenDetails?.some(c =>
          (student.rollNumber && String(student.rollNumber).trim() === String(c.admNo || '').trim()) ||
          (student.rollNo && String(student.rollNo).trim() === String(c.admNo || '').trim())
        )) return true;
        return false;
      });

      // Monthly fee from student record or class settings
      const monthlyFee = Number(student.monthlyFee) || 0;

      let annualFee = 0;
      let explicitMonthFee = 0;
      let explicitPreviousBalance = 0;
      let explicitOther = 0;

      if (studentVouchers.length > 0) {
        studentVouchers.forEach(v => {
          v.feeItems?.forEach(item => {
            const name = String(item.name || '').toLowerCase();
            const amt = Number(item.amount) || 0;
            if (name.includes('annual')) {
              annualFee += Math.abs(amt);
            } else if (name.includes('arrear') || name.includes('previous') || name.includes('balance') || name.includes('past')) {
              explicitPreviousBalance += amt;
            } else if (name.includes('tuition') || name.includes('monthly') || name === 'fee') {
              explicitMonthFee += amt;
            } else {
              explicitOther += amt;
            }
          });
        });
      }

      // Previous balance (arrears from vouchers before this month)
      const calculatedPreviousBalance = vouchers.filter(v => {
        const monthMatch = v.month !== monthLabel && v.month !== selectedMonth;
        if (!monthMatch) return false;
        if (v.status === 'Paid') return false;
        if (v.studentId === student.id) return true;
        if (v.childrenIds?.includes(student.id)) return true;
        return false;
      }).reduce((sum, v) => {
        const rem = (Number(v.totalAmount) || 0) - (Number(v.paidAmount) || 0) - (Number(v.discountAmount) || 0);
        return sum + Math.max(0, rem);
      }, 0);

      const previousBalance = explicitPreviousBalance > 0 ? explicitPreviousBalance : calculatedPreviousBalance;

      // Paid amount for this month
      const paidAmount = studentVouchers.reduce((sum, v) => sum + (Number(v.paidAmount) || 0), 0);

      // Total this month's voucher amount
      const thisMonthTotal = studentVouchers.reduce((sum, v) => sum + (Number(v.totalAmount) || 0), 0);
      
      const monthFee = explicitMonthFee > 0 ? explicitMonthFee : (thisMonthTotal > 0 ? 0 : monthlyFee);
      // If thisMonthTotal > 0 but explicitMonthFee is 0, it means it was added as something else, so it's in other.
      
      const other = explicitOther;

      // "Pay on Due Date" = this month's fee (voucher total or monthlyFee)
      const payOnDueDate = thisMonthTotal > 0 ? thisMonthTotal : (monthFee + previousBalance + annualFee + other);

      // Total balance = remaining due across all vouchers for this student in this month
      const totalBalance = payOnDueDate - paidAmount;

      // Status
      const status = paidAmount >= payOnDueDate && payOnDueDate > 0
        ? 'Paid'
        : paidAmount > 0
        ? 'Partial'
        : 'Unpaid';

      const gr = student.admissionNumber || student.rollNo || student.grNo || student.grNumber || student.rollNumber || '-';

      return {
        sr: idx + 1,
        id: student.id,
        gr,
        name: student.name || '-',
        fatherName: student.fatherName || '-',
        class: student.class || '-',
        annualFee,
        monthFee: monthFee,
        previousBalance,
        other: other,
        payOnDueDate,
        paid: paidAmount,
        totalBalance,
        status,
        phone: student.parentPhone || student.fatherPhone || student.phone || ''
      };
    });
  };

  const allRows = buildRows();
  const paidRows = allRows.filter(r => r.status === 'Paid');
  const unpaidRows = allRows.filter(r => r.status !== 'Paid');
  const searchFiltered = (activeTab === 'paid' ? paidRows : activeTab === 'unpaid' ? unpaidRows : allRows)
    .filter(r => !searchTerm || 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.gr).includes(searchTerm) ||
      r.class.toLowerCase().includes(searchTerm.toLowerCase())
    );
  const displayRows = searchFiltered;

  // Summary stats
  const totalFee = allRows.reduce((s, r) => s + r.payOnDueDate, 0);
  const totalPaid = allRows.reduce((s, r) => s + r.paid, 0);
  const totalBalance = allRows.reduce((s, r) => s + Math.max(0, r.totalBalance), 0);

  // WhatsApp Fee Reminder with retry logic
  const sendWaReminder = async (row) => {
    if (!row.phone) { alert('No phone number for ' + row.name); return; }
    setSendingWa(row.id);
    const msg = `📋 *FEE REMINDER*\n\nDear Parent,\n\nThis is a reminder that the fee for *${row.name}* (Class: ${row.class}, Roll: ${row.gr}) for *${formatMonthLabel(selectedMonth)}* is:\n\n💰 Total Due: *Rs. ${row.payOnDueDate.toLocaleString()}*\n✅ Paid: Rs. ${row.paid.toLocaleString()}\n⚠️ Balance: *Rs. ${Math.max(0, row.totalBalance).toLocaleString()}*\n\nPlease clear the balance at the earliest.\n\nRegards,\n${schoolName}`;

    const endpoints = [
      'https://umarhayat.alwaysdata.net/api/message/send',
    ];
    
    let sent = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: schoolId, phone: row.phone, message: msg })
          });
          const data = await res.json();
          if (data.success && data.results?.[0]?.status === 'sent') {
            sent = true;
            break;
          }
          // Retry with default_school
          const res2 = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: 'default_school', phone: row.phone, message: msg })
          });
          const data2 = await res2.json();
          if (data2.success) { sent = true; break; }
        } catch(e) {
          await new Promise(r => setTimeout(r, 1500)); // wait 1.5s before retry
        }
      }
      if (sent) break;
      await new Promise(r => setTimeout(r, 2000)); // 2s between attempts
    }
    setSendingWa(null);
    if (sent) {
      alert(`✅ Fee reminder sent to ${row.name}'s parent (${row.phone}) via WhatsApp!`);
    } else {
      alert(`❌ Failed to send after 3 attempts. WhatsApp bot may be offline.`);
    }
  };

  // ─── Delete Voucher Handler ──────────────────────────────────────────────
  const handleDeleteVoucher = async (row) => {
    // Find all vouchers linked to this student in the selected month
    const monthLabel = formatMonthLabel(selectedMonth);
    const studentVouchers = vouchers.filter(v => {
      const monthMatch = v.month === monthLabel || v.month === selectedMonth;
      if (!monthMatch) return false;
      if (v.studentId === row.id) return true;
      if (v.childrenIds?.includes(row.id)) return true;
      return false;
    });

    if (studentVouchers.length === 0) {
      return alert('No voucher found for this student in the selected month.');
    }

    if (!window.confirm(`Are you sure you want to DELETE the voucher for ${row.name} (${formatMonthLabel(selectedMonth)})? This action cannot be undone.`)) return;

    setDeletingId(row.id);
    try {
      for (const v of studentVouchers) {
        await deleteRecord('vouchers', v.id, schoolId);
      }
      // Remove from local state
      setVouchers(prev => prev.filter(v => !studentVouchers.some(sv => sv.id === v.id)));
      alert(`✅ Voucher for ${row.name} deleted successfully!`);
    } catch (err) {
      console.error(err);
      alert('Failed to delete voucher. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Print Function ────────────────────────────────────────────────────────
  const handlePrint = (mode) => {
    const printRows = mode === 'paid' ? paidRows : mode === 'unpaid' ? unpaidRows : allRows;
    const title = mode === 'blank' ? 'MONTHLY FEE COLLECTION REGISTER (BLANK)'
      : mode === 'paid' ? 'PAID STUDENTS REGISTER'
      : mode === 'unpaid' ? 'UNPAID / DEFAULTERS REGISTER'
      : 'MONTHLY FEE COLLECTION REGISTER';

    const monthName = formatMonthLabel(selectedMonth).split(' ')[0].substring(0, 3);
    const yearName = formatMonthLabel(selectedMonth).split(' ')[1];
    const shortMonth = `${monthName} ${yearName}`;

    // Group by fatherName
    const grouped = {};
    printRows.forEach(r => {
      const key = r.fatherName || 'Unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    let sr = 1;
    let rowsHtml = '';

    Object.values(grouped).forEach(familyRows => {
      const rowspan = familyRows.length;
      
      const familyMonthFee = familyRows.reduce((sum, r) => sum + r.monthFee, 0) / rowspan;
      const familyPreBalance = familyRows.reduce((sum, r) => sum + r.previousBalance, 0) / rowspan;
      const familyOther = familyRows.reduce((sum, r) => sum + r.other, 0) / rowspan;
      const familyPayOnDueDate = familyRows.reduce((sum, r) => sum + r.payOnDueDate, 0) / rowspan;
      const familyPaid = familyRows.reduce((sum, r) => sum + r.paid, 0) / rowspan;
      const familyTotalBalance = familyRows.reduce((sum, r) => sum + r.totalBalance, 0) / rowspan;

      familyRows.forEach((r, index) => {
        const isFirst = index === 0;
        
        rowsHtml += `<tr>
          <td style="text-align:center;">${sr++}</td>
          <td style="text-align:center;">${r.gr}</td>
          <td style="font-weight:bold;">${r.name}</td>
          ${isFirst ? `<td rowspan="${rowspan}" style="text-align:center; vertical-align:middle;">${r.fatherName}</td>` : ''}
          <td style="text-align:center;">${r.class}</td>
          <td style="text-align:center;">${r.annualFee > 0 ? r.annualFee.toLocaleString() : '0'}</td>
          ${isFirst ? `<td rowspan="${rowspan}" class="thick-border bold-text" style="text-align:center; vertical-align:middle;">${familyMonthFee > 0 ? familyMonthFee.toLocaleString() : '0'}</td>` : ''}
          ${isFirst ? `<td rowspan="${rowspan}" class="bg-blue bold-text" style="text-align:center; vertical-align:middle;">${familyPreBalance > 0 ? familyPreBalance.toLocaleString() : '0'}</td>` : ''}
          ${isFirst ? `<td rowspan="${rowspan}" class="thick-border-left bold-text" style="text-align:center; vertical-align:middle;">${familyOther > 0 ? familyOther.toLocaleString() : '0'}</td>` : ''}
          ${isFirst ? `<td rowspan="${rowspan}" class="bg-green thick-border bold-text" style="text-align:center; vertical-align:middle;">${familyPayOnDueDate > 0 ? familyPayOnDueDate.toLocaleString() : '0'}</td>` : ''}
          ${isFirst ? `<td rowspan="${rowspan}" class="bold-text" style="text-align:center; vertical-align:middle; color: #070;">${(mode === 'paid' || mode === 'all') && familyPaid > 0 ? familyPaid.toLocaleString() : '0'}</td>` : ''}
          ${isFirst ? `<td rowspan="${rowspan}" class="thick-border-left bold-text" style="text-align:center; vertical-align:middle; color: #c00;">${(mode === 'unpaid' || mode === 'all') && familyTotalBalance > 0 ? Math.abs(familyTotalBalance).toLocaleString() : '0'}</td>` : ''}
        </tr>`;
      });
    });

    const totalPayOnDueDate = printRows.reduce((s, r) => s + r.payOnDueDate, 0);
    const totalPaidAmount = printRows.reduce((s, r) => s + r.paid, 0);
    const totalBalanceAmount = printRows.reduce((s, r) => s + r.totalBalance, 0);

    const totalsHtml = `
      <tr>
        <td colspan="9" style="text-align:right; font-weight:bold; padding-right:15px; border:2px solid #000;">GRAND TOTAL</td>
        <td class="bg-green thick-border bold-text" style="text-align:center;">${totalPayOnDueDate > 0 ? totalPayOnDueDate.toLocaleString() : ''}</td>
        <td class="bold-text" style="text-align:center; color: ${mode === 'blank' ? '#000' : '#070'};">${mode === 'blank' ? '' : (totalPaidAmount > 0 ? totalPaidAmount.toLocaleString() : '')}</td>
        <td class="thick-border-left bold-text" style="text-align:center; color: ${totalBalanceAmount > 0 ? '#c00' : '#070'};">${mode === 'blank' ? '' : (totalBalanceAmount !== 0 ? Math.abs(totalBalanceAmount).toLocaleString() : '0')}</td>
      </tr>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 20px; }
          h1 { font-size: 18px; text-align: center; font-weight: bold; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
          th { background: #f0f0f0; padding: 6px; border: 1px solid #000; text-align: center; font-size: 10px; font-weight: bold; }
          td { font-size: 10.5px; border: 1px solid #000; padding: 5px; }
          .thick-border { border: 2px solid #000 !important; }
          .thick-border-left { border-left: 2px solid #000 !important; }
          .bg-blue { background-color: #bae6fd !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-green { background-color: #bbf7d0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bold-text { font-weight: bold; }
          @media print { 
            body { padding: 10px; }
            .bg-blue { background-color: #bae6fd !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .bg-green { background-color: #bbf7d0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1>${title} - ${formatMonthLabel(selectedMonth)}</h1>
        <table>
          <thead>
            <tr>
              <th style="width: 3%;">SR#</th>
              <th style="width: 5%;">GR#</th>
              <th style="width: 15%; text-align: left;">Name</th>
              <th style="width: 15%; text-align: left;">Father Name</th>
              <th style="width: 5%;">Class</th>
              <th style="width: 5%;">A.<br>Fee</th>
              <th class="thick-border" style="width: 7%;">${shortMonth}</th>
              <th class="bg-blue" style="width: 7%;">Pre.<br>Balance</th>
              <th class="thick-border-left" style="width: 5%;">Other</th>
              <th class="bg-green thick-border" style="width: 8%;">Pay on Due<br>Date</th>
              <th style="width: 7%;">Paid</th>
              <th class="thick-border-left" style="width: 8%;">Total<br>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            ${totalsHtml}
          </tbody>
        </table>
        <div style="margin-top:40px; display:flex; justify-content:space-between;">
          <div><div style="width:160px; border-bottom:1px solid #000; margin-bottom:4px;"></div><span>Accountant Signature</span></div>
          <div><div style="width:160px; border-bottom:1px solid #000; margin-bottom:4px;"></div><span>Principal Signature</span></div>
        </div>
        <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-16">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <FileText className="text-blue-400" size={30} /> Fee Reports
          </h1>
          <p className="text-dark-muted text-sm font-bold mt-1">Printable monthly fee collection registers • WhatsApp reminders.</p>
        </div>

        {/* Print Buttons */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setLoading(true); setStudents([]); setVouchers([]); setTimeout(() => window.location.reload(), 100); }}
            className="flex items-center gap-2 px-3 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs font-black text-dark-muted hover:bg-white/5 transition-all">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => handlePrint('blank')}
            className="flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs font-black text-white hover:bg-white/5 hover:border-blue-500/40 transition-all uppercase tracking-widest">
            <FileText size={14} /> Blank Register
          </button>
          <button onClick={() => handlePrint('paid')}
            className="flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs font-black text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all uppercase tracking-widest">
            <CheckCircle size={14} /> Paid Record
          </button>
          <button onClick={() => handlePrint('unpaid')}
            className="flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs font-black text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all uppercase tracking-widest">
            <AlertCircle size={14} /> Unpaid Record
          </button>
          <button onClick={() => handlePrint('all')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/20 transition-all uppercase tracking-widest">
            <Printer size={14} /> Print Register
          </button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Students', val: allRows.length, color: 'blue' },
          { label: 'Total Payable', val: `Rs. ${totalFee.toLocaleString()}`, color: 'white' },
          { label: 'Total Collected', val: `Rs. ${totalPaid.toLocaleString()}`, color: 'emerald' },
          { label: 'Total Pending', val: `Rs. ${totalBalance.toLocaleString()}`, color: 'rose' },
        ].map((s, i) => (
          <GlassCard key={i} className={`p-4 border-b-2 border-b-${s.color}-500`}>
            <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">{s.label}</p>
            <p className={`text-xl font-black mt-1 text-${s.color === 'white' ? 'white' : s.color + '-400'}`}>{s.val}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Controls ── */}
      <GlassCard className="p-0 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-dark-border flex flex-col md:flex-row items-center gap-4 justify-between">
          {/* Tabs */}
          <div className="flex gap-1 bg-dark-bg rounded-xl p-1 border border-dark-border">
            {[
              { key: 'all', label: `All (${allRows.length})` },
              { key: 'paid', label: `Paid (${paidRows.length})`, color: 'emerald' },
              { key: 'unpaid', label: `Unpaid (${unpaidRows.length})`, color: 'rose' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all uppercase tracking-widest ${
                  activeTab === tab.key
                    ? tab.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : tab.color === 'rose' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-dark-muted hover:text-white'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
              <input
                type="text"
                placeholder="Search student, father, class..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-dark-bg pl-9 pr-4 py-2 rounded-xl border border-dark-border text-sm text-white outline-none focus:border-blue-500 transition-all w-56"
              />
            </div>
            <div className="flex items-center gap-2 bg-dark-bg px-3 py-2 rounded-xl border border-dark-border">
              <Calendar size={15} className="text-dark-muted" />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>
            <div className="flex items-center gap-2 bg-dark-bg px-3 py-2 rounded-xl border border-dark-border">
              <Filter size={15} className="text-dark-muted" />
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
              >
                <option value="All" className="bg-dark-card">All Classes</option>
                {uniqueClasses.map(c => (
                  <option key={c} value={c} className="bg-dark-card">Class {c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 size={36} className="animate-spin text-blue-400 mx-auto mb-3" />
              <p className="text-dark-muted font-bold text-sm">Loading fee records...</p>
            </div>
          ) : displayRows.length === 0 ? (
            <div className="py-20 text-center">
              <FileText size={48} className="text-dark-muted opacity-20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No Records Found</h3>
              <p className="text-dark-muted text-sm">No students found for the selected filters.</p>
            </div>
          ) : (
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="bg-dark-bg/60 border-b border-dark-border text-[10px] font-black text-dark-muted uppercase tracking-[0.15em]">
                  <th className="py-3 px-3 text-center">SR#</th>
                  <th className="py-3 px-3">GR#</th>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Father Name</th>
                  <th className="py-3 px-3 text-center">Class</th>
                  <th className="py-3 px-3 text-right">A. Fee</th>
                  <th className="py-3 px-3 text-right">{formatMonthLabel(selectedMonth).split(' ')[0].slice(0,3)} {formatMonthLabel(selectedMonth).split(' ')[1]}</th>
                  <th className="py-3 px-3 text-right">Pre. Balance</th>
                  <th className="py-3 px-3 text-right">Other</th>
                  <th className="py-3 px-3 text-right">Pay on Due Date</th>
                  <th className="py-3 px-3 text-right">Paid</th>
                  <th className="py-3 px-3 text-right">Total Balance</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">📲</th>
                  <th className="py-3 px-3 text-center">🗑️</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const grouped = {};
                  displayRows.forEach(r => {
                    const key = r.fatherName || 'Unknown';
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(r);
                  });

                  let sr = 1;
                  return Object.values(grouped).map((familyRows, fIdx) => {
                    const rowspan = familyRows.length;
                    const familyMonthFee = familyRows.reduce((sum, r) => sum + r.monthFee, 0) / rowspan;
                    const familyPreBalance = familyRows.reduce((sum, r) => sum + r.previousBalance, 0) / rowspan;
                    const familyOther = familyRows.reduce((sum, r) => sum + r.other, 0) / rowspan;
                    const familyPayOnDueDate = familyRows.reduce((sum, r) => sum + r.payOnDueDate, 0) / rowspan;
                    const familyPaid = familyRows.reduce((sum, r) => sum + r.paid, 0) / rowspan;
                    const familyTotalBalance = familyRows.reduce((sum, r) => sum + r.totalBalance, 0) / rowspan;
                    
                    // Determine family status
                    const familyStatus = familyPaid >= familyPayOnDueDate && familyPayOnDueDate > 0
                      ? 'Paid'
                      : familyPaid > 0 ? 'Partial' : 'Unpaid';

                    return familyRows.map((row, index) => {
                      const isFirst = index === 0;
                      return (
                        <tr key={row.id} className={`border-b border-dark-border/30 hover:bg-white/3 transition-colors text-sm ${familyStatus === 'Paid' ? 'bg-emerald-500/3' : familyStatus === 'Partial' ? 'bg-amber-500/3' : ''}`}>
                          <td className="py-2.5 px-3 text-dark-muted font-bold text-center">{sr++}</td>
                          <td className="py-2.5 px-3 text-dark-muted font-mono text-xs">{row.gr}</td>
                          <td className="py-2.5 px-3 font-bold text-white">{row.name}</td>
                          
                          {isFirst && (
                            <td rowSpan={rowspan} className="py-2.5 px-3 text-dark-muted text-xs align-middle">{row.fatherName}</td>
                          )}
                          
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-black border border-blue-500/20">{row.class}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs text-dark-muted">{row.annualFee > 0 ? row.annualFee.toLocaleString() : '0'}</td>
                          
                          {isFirst && (
                            <>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-right font-mono font-bold text-white align-middle">{familyMonthFee > 0 ? familyMonthFee.toLocaleString() : '0'}</td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-right font-mono text-xs text-rose-400 align-middle">{familyPreBalance > 0 ? familyPreBalance.toLocaleString() : '0'}</td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-right text-dark-muted text-xs align-middle">{familyOther > 0 ? familyOther.toLocaleString() : '0'}</td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-right font-mono font-bold text-white align-middle">{familyPayOnDueDate > 0 ? familyPayOnDueDate.toLocaleString() : '0'}</td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 align-middle">{familyPaid > 0 ? familyPaid.toLocaleString() : '0'}</td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-right align-middle">
                                {familyTotalBalance > 0 ? (
                                  <span className="font-mono font-bold text-rose-400">{familyTotalBalance.toLocaleString()}</span>
                                ) : familyTotalBalance < 0 ? (
                                  <span className="font-mono font-bold text-emerald-400">Advance</span>
                                ) : (
                                  <span className="font-mono text-emerald-400 font-bold">0</span>
                                )}
                              </td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-center align-middle">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${
                                  familyStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : familyStatus === 'Partial' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                }`}>{familyStatus}</span>
                              </td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-center align-middle">
                                {familyStatus !== 'Paid' && familyRows[0].phone && (
                                  <button
                                    onClick={() => sendWaReminder(familyRows[0])}
                                    disabled={sendingWa === familyRows[0].id}
                                    title="Send WhatsApp Fee Reminder"
                                    className="w-8 h-8 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 transition-all mx-auto disabled:opacity-40"
                                  >
                                    {sendingWa === familyRows[0].id ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                                  </button>
                                )}
                              </td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-center align-middle">
                                <button
                                  onClick={() => handleDeleteVoucher(familyRows[0])}
                                  disabled={deletingId === familyRows[0].id}
                                  title="Delete Family Voucher"
                                  className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 transition-all mx-auto disabled:opacity-40"
                                >
                                  {deletingId === familyRows[0].id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    });
                  });
                })()}
              </tbody>
              {/* Totals Row */}
              <tfoot>
                <tr className="bg-dark-bg/80 border-t-2 border-blue-500/30 text-sm font-black">
                  <td colSpan={9} className="py-3 px-3 text-right text-dark-muted uppercase tracking-widest text-[10px]">Totals</td>
                  <td className="py-3 px-3 text-right text-white font-mono">
                    {displayRows.reduce((s, r) => s + r.payOnDueDate, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-mono">
                    {displayRows.reduce((s, r) => s + r.paid, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-400 font-mono">
                    {displayRows.reduce((s, r) => s + Math.max(0, r.totalBalance), 0).toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default FeeRecord;
