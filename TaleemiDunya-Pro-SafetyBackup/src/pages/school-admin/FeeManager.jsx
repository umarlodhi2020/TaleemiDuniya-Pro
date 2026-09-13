import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, FileText, Download, Search, 
  CheckCircle, Clock, AlertCircle, RefreshCw, Trash2, Printer, History, X
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { getRecords, deleteRecord, updateRecord, addRecord } from '../../services/db';
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
  
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyVouchers, setHistoryVouchers] = useState([]);
  const [historyTitle, setHistoryTitle] = useState('');

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
      if (!matches && c.fatherName && v.fatherName === c.fatherName) matches = true;
      if (!matches && c.studentName && v.studentName === c.studentName) matches = true;
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
      data.sort((a, b) => b.voucherNo - a.voucherNo || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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
    fetchData();
  };

  const deleteChallan = async (id) => {
    if (!window.confirm('Delete this voucher? It will be moved to Backup and its balance will NOT be counted in future vouchers.')) return;
    const voucher = vouchers.find(v => v.id === id);
    if (voucher) {
      await addRecord('deleted_vouchers', { ...voucher, deletedAt: new Date().toISOString() }, userData?.schoolId || 'default-school');
    }
    await deleteRecord('vouchers', id);
    fetchData();
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
    
    // Amount calculations for the voucher format (Fee vs Arrears)
    let currentFee = 0;
    let prevArrears = 0;
    
    (c.feeItems || []).forEach(item => {
      if (String(item.name).toLowerCase().includes('arrear')) {
        prevArrears += Number(item.amount) || 0;
      } else {
        currentFee += Number(item.amount) || 0;
      }
    });

    // Fallback if no arrears explicitly listed but total > fees
    if (prevArrears === 0 && tDue > currentFee && currentFee > 0) {
      prevArrears = tDue - currentFee;
    }
    
    const totalPayable = tDue;
    
    const childRows = (c.childrenDetails && c.childrenDetails.length > 0) ? c.childrenDetails.map((ch, idx) => {
      let childFee = Number(ch.fee || ch.feeAmount || ch.totalFee || ch.amount || 0);
      if (!childFee && c.feeItems) {
        // Fallback: try to find it in feeItems (either matching name or just use currentFee if only 1 child)
        if (c.childrenDetails.length === 1) {
          childFee = currentFee;
        } else {
          const item = c.feeItems.find(f => f.name && f.name.includes(ch.name) && !f.name.includes('Arrears'));
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
      <td style="text-align:right; padding-right:10px;">${currentFee > 0 ? currentFee.toLocaleString() : '-'}</td>
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
  .totals-row.payable { background:#e5e7eb; font-size:13px; margin-top:30px; border:1px solid #6b7280; }
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
        <div class="totals-row">
          <span style="flex:1; text-align:right; padding-right:10px;">Total Previous Arrears</span>
          <span style="width:30%; padding-left:6px; border-left:1px solid #6b7280; text-align:right;">${prevArrears.toLocaleString()}</span>
        </div>
        <div class="totals-row payable">
          <span style="flex:1; text-align:right; padding-right:10px;">Total Payable</span>
          <span style="width:30%; padding-left:6px; border-left:1px solid #6b7280; text-align:right;">${totalPayable.toLocaleString()}</span>
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">Fee & Finance Manager</h1>
          <p className="text-dark-muted mt-1">Manage student fee collections and generate challans.</p>
        </div>
        <div className="flex gap-4">
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Recent Collections</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                <input type="text" placeholder="🔍 Name, Father, Roll No, Voucher #, Phone..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)} className="w-full premium-input pl-10 py-2 text-xs" />
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-dark-muted">
                <CreditCard size={40} className="mx-auto opacity-30 mb-3" />
                <p className="font-bold text-sm">No challans found</p>
                <p className="text-xs mt-1">Generate your first challan to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                      <th className="pb-4 px-4">Voucher / Name</th>
                      <th className="pb-4 px-4">Month</th>
                      <th className="pb-4 px-4">Amount</th>
                      <th className="pb-4 px-4">Status</th>
                      <th className="pb-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {filtered.slice(0, 10).map((c) => (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4">
                          <p className="font-bold text-white">
                            {c.studentName || c.fatherName || 'Unknown'}
                            {c.fatherName && c.childrenDetails && c.childrenDetails.length > 0 && (
                              <span className="text-dark-muted font-normal text-[10px] ml-1">
                                ({c.childrenDetails.map(ch => ch.name).join(', ')})
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-dark-muted font-bold">
                            Voucher #{c.voucherNo || c.id.slice(0,6)}
                            {c.familyId ? ` • Family ID: ${c.familyId}` : ''}
                          </p>
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
                    ))}
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
          <h2 className="text-xl font-bold mb-6">All Challans ({vouchers.length})</h2>
          {vouchers.length === 0 ? (
            <div className="text-center py-12 text-dark-muted">
              <FileText size={40} className="mx-auto opacity-30 mb-3" />
              <p className="font-bold">No challans generated yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
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
                  {vouchers.map(c => (
                    <tr key={c.id} className="hover:bg-white/5">
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* Defaulters Tab */}
      {activeTab === 'defaulters' && (
        <GlassCard className="p-8">
          <h2 className="text-xl font-bold mb-6 text-orange-500 flex items-center gap-2">
            <AlertCircle size={22} /> Defaulters ({pendingChallans.length})
          </h2>
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
                    <th className="pb-4 px-4">Voucher / Name</th>
                    <th className="pb-4 px-4">Month</th>
                    <th className="pb-4 px-4">Amount Due</th>
                    <th className="pb-4 px-4">Due Date</th>
                    <th className="pb-4 px-4 text-right">Mark Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {pendingChallans.map(c => {
                    const rem = (Number(c.totalAmount) || 0) - (Number(c.paidAmount) || 0) - (Number(c.discountAmount) || 0);
                    if (rem <= 0) return null;
                    return (
                    <tr key={c.id} className="hover:bg-white/5">
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
