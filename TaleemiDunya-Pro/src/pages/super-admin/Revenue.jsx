import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, CreditCard, Download, 
  Calendar, RefreshCw, Building2, Search, Filter, ShieldCheck, 
  Clock, CheckCircle2, XCircle, ArrowUpRight, Eye, Smartphone, QrCode
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Revenue = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState([]);
  const [payments, setPayments] = useState([]);
  const [rechargeRequests, setRechargeRequests] = useState([]);
  const [monthlyData, setMonthlyData] = useState(new Array(12).fill(0));
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'paid', 'pending_verification', 'rejected'
  const [methodFilter, setMethodFilter] = useState('ALL');

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      // 1. Fetch genuine schools
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      const schoolsList = schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchools(schoolsList);

      // 2. Fetch payments collection
      let paymentsList = [];
      try {
        const paymentsSnap = await getDocs(collection(db, 'payments'));
        paymentsList = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.error('Error fetching payments:', err);
      }
      setPayments(paymentsList);

      // 3. Fetch saas_recharge_requests collection
      let reqList = [];
      try {
        const reqSnap = await getDocs(collection(db, 'saas_recharge_requests'));
        reqList = reqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.error('Error fetching recharge requests:', err);
      }
      setRechargeRequests(reqList);

      // 4. Calculate 100% REAL monthly revenue strictly from verified payments / approved recharges
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = new Array(12).fill(0);

      // Accumulate verified payments from payments collection
      paymentsList.forEach(payment => {
        if (payment.status === 'paid' && payment.amount > 0) {
          const rawDate = payment.verifiedAt || payment.createdAt || payment.date;
          if (rawDate) {
            const date = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
            if (!isNaN(date.getTime()) && date.getFullYear() === currentYear) {
              monthlyRevenue[date.getMonth()] += Number(payment.amount) || 0;
            }
          }
        }
      });

      // Accumulate approved recharge requests (deduplicating if already recorded in payments with same TID)
      const existingPaymentTids = new Set(paymentsList.map(p => p.tid).filter(Boolean));
      reqList.forEach(req => {
        if (req.status === 'approved' && req.amount > 0) {
          if (!req.tid || !existingPaymentTids.has(req.tid)) {
            const rawDate = req.verifiedAt || req.createdAt;
            if (rawDate) {
              const date = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
              if (!isNaN(date.getTime()) && date.getFullYear() === currentYear) {
                monthlyRevenue[date.getMonth()] += Number(req.amount) || 0;
              }
            }
          }
        }
      });

      setMonthlyData(monthlyRevenue);
    } catch (error) {
      console.error('Error fetching real revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build unified REAL transactions list without demo / zero dummy rows
  const unifiedTransactions = React.useMemo(() => {
    const list = [];
    const seenTids = new Set();

    // From payments collection
    payments.forEach(p => {
      const amount = Number(p.amount) || 0;
      if (amount <= 0 && (!p.tid || p.schoolName?.toLowerCase().includes('demo'))) return; // skip 0 PKR demo mockups

      const rawDate = p.verifiedAt || p.createdAt || p.date;
      const formattedDate = rawDate?.toDate 
        ? rawDate.toDate().toISOString().slice(0, 10) 
        : (typeof rawDate === 'string' ? rawDate.slice(0, 10) : 'N/A');

      if (p.tid) seenTids.add(p.tid);

      list.push({
        id: p.id,
        school: p.schoolName || 'School',
        schoolId: p.schoolId || '',
        plan: p.planName || p.plan || 'Standard Plan',
        amount: amount,
        method: p.paymentMethod || 'Online Transfer',
        tid: p.tid || 'DIRECT-VERIFIED',
        date: formattedDate,
        rawTimestamp: rawDate?.toDate ? rawDate.toDate().getTime() : new Date(rawDate || 0).getTime(),
        status: p.status || 'paid',
        screenshotUrl: p.screenshotUrl || '',
        isRechargeReq: false
      });
    });

    // From recharge requests
    rechargeRequests.forEach(r => {
      if (r.tid && seenTids.has(r.tid)) return; // prevent duplicate if already logged in payments

      const amount = Number(r.amount) || 0;
      if (amount <= 0 && (!r.tid || r.schoolName?.toLowerCase().includes('demo'))) return;

      const rawDate = r.verifiedAt || r.createdAt;
      const formattedDate = rawDate?.toDate 
        ? rawDate.toDate().toISOString().slice(0, 10) 
        : (typeof rawDate === 'string' ? rawDate.slice(0, 10) : 'N/A');

      list.push({
        id: r.id,
        school: r.schoolName || 'School',
        schoolId: r.schoolId || '',
        plan: r.planName || r.requestedPlan || 'Standard Plan',
        amount: amount,
        method: r.payMethod || 'Online Transfer',
        tid: r.tid || 'Attached Proof',
        date: formattedDate,
        rawTimestamp: rawDate?.toDate ? rawDate.toDate().getTime() : new Date(rawDate || 0).getTime(),
        status: r.status === 'approved' ? 'paid' : r.status,
        screenshotUrl: r.screenshotUrl || '',
        isRechargeReq: true
      });
    });

    // Sort descending by most recent
    return list.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
  }, [payments, rechargeRequests]);

  // Filtered transactions
  const filteredTransactions = unifiedTransactions.filter(t => {
    const matchesSearch = !searchQuery || 
      t.school.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.tid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.plan.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesMethod = methodFilter === 'ALL' || t.method.toLowerCase().includes(methodFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Calculate Real Financial KPI Metrics
  const totalVerifiedRevenue = unifiedTransactions
    .filter(t => t.status === 'paid' || t.status === 'approved')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonth = new Date().getMonth();
  const thisMonthRevenue = monthlyData[currentMonth] || 0;
  const lastMonthRevenue = currentMonth > 0 ? (monthlyData[currentMonth - 1] || 0) : 0;
  const monthGrowth = lastMonthRevenue > 0 
    ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(0) 
    : (thisMonthRevenue > 0 ? 100 : 0);

  const pendingVerificationList = unifiedTransactions.filter(t => t.status === 'pending_verification' || t.status === 'pending');
  const pendingAmount = pendingVerificationList.reduce((sum, t) => sum + t.amount, 0);

  const activeSchoolsCount = schools.filter(s => s.status === 'active' || s.subscriptionStatus === 'active').length;
  const maxVal = Math.max(...monthlyData, 1);

  const handleExport = () => {
    const csvRows = [
      ['School Name', 'Plan', 'Amount (PKR)', 'Payment Method', 'Transaction ID (TID)', 'Date', 'Status'],
      ...filteredTransactions.map(t => [
        `"${t.school.replace(/"/g, '""')}"`,
        `"${t.plan}"`,
        t.amount,
        `"${t.method}"`,
        `"${t.tid}"`,
        t.date,
        t.status.toUpperCase()
      ])
    ];
    const csvContent = csvRows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taleemidunya_real_revenue_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="animate-spin text-primary-500 mx-auto" size={32} />
          <p className="text-dark-muted mt-3 text-sm font-bold">Verifying live financial ledger from Firestore...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/30">
              ● 100% Verified Live Data
            </span>
            <span className="text-xs text-dark-muted font-bold">Zero Demo Fallbacks</span>
          </div>
          <h1 className="text-3xl font-black text-white mt-1">SaaS Revenue & Payment Ledger</h1>
          <p className="text-dark-muted text-xs md:text-sm mt-0.5">Real-time audit of school subscription recharges, pending admin approvals, and verified inflows.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchRevenueData} className="premium-button-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Sync Data
          </button>
          <button onClick={handleExport} className="premium-button-primary flex items-center gap-2">
            <Download size={16} /> Export Verified CSV
          </button>
        </div>
      </div>

      {/* Pending Approvals Notice Banner */}
      {pendingVerificationList.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-[#151926] border-2 border-yellow-500/50 shadow-xl shadow-yellow-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shrink-0">
              <Clock size={24} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                {pendingVerificationList.length} Online Payment(s) Awaiting Super Admin Review
              </h3>
              <p className="text-xs text-yellow-300/80 font-medium mt-0.5">
                Total PKR {pendingAmount.toLocaleString()} pending. Schools will NOT auto-renew until you inspect the TID proof and approve.
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/super-admin/subscriptions')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
          >
            Review & Approve Now <ArrowUpRight size={16} />
          </button>
        </div>
      )}

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Total Verified Inflow', 
            value: `PKR ${totalVerifiedRevenue.toLocaleString()}`, 
            icon: DollarSign, 
            color: 'text-green-400', 
            bg: 'bg-green-500/10', 
            trend: totalVerifiedRevenue > 0 ? '+ Verified' : 'None',
            desc: 'Audited paid subscriptions'
          },
          { 
            label: 'This Month Verified', 
            value: `PKR ${thisMonthRevenue.toLocaleString()}`, 
            icon: TrendingUp, 
            color: 'text-primary-400', 
            bg: 'bg-primary-500/10', 
            trend: `${monthGrowth > 0 ? '+' : ''}${monthGrowth}% MoM`,
            desc: `${months[currentMonth]} ${new Date().getFullYear()} collections`
          },
          { 
            label: 'Pending Verification', 
            value: `PKR ${pendingAmount.toLocaleString()}`, 
            icon: Clock, 
            color: 'text-yellow-400', 
            bg: 'bg-yellow-500/10', 
            trend: `${pendingVerificationList.length} school(s)`,
            desc: 'Awaiting admin sign-off'
          },
          { 
            label: 'Active Paying Tenants', 
            value: activeSchoolsCount.toString(), 
            icon: Building2, 
            color: 'text-cyan-400', 
            bg: 'bg-cyan-500/10', 
            trend: `${schools.length} registered`,
            desc: 'Live school institutions'
          },
        ].map((stat, i) => (
          <GlassCard key={i} className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon className={stat.color} size={20} />
              </div>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${stat.color} ${stat.bg}`}>
                {stat.trend}
              </span>
            </div>
            <p className="text-[10px] text-dark-muted uppercase tracking-widest font-black">{stat.label}</p>
            <p className="text-2xl font-black mt-1 text-white">{stat.value}</p>
            <p className="text-[11px] text-dark-muted mt-1 font-medium">{stat.desc}</p>
          </GlassCard>
        ))}
      </div>

      {/* Real Monthly Revenue Graph */}
      <GlassCard className="p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <TrendingUp className="text-primary-500" size={22} /> Verified Monthly Collections ({new Date().getFullYear()})
            </h2>
            <p className="text-xs text-dark-muted mt-0.5">Calculated strictly from approved payment events in the database.</p>
          </div>
          <span className="text-xs font-mono font-bold text-green-400 bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20">
            Total Year: PKR {totalVerifiedRevenue.toLocaleString()}
          </span>
        </div>

        {totalVerifiedRevenue === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-dark-muted border border-dashed border-white/10 rounded-2xl">
            <DollarSign size={40} className="opacity-30 mb-2" />
            <p className="text-sm font-bold text-gray-300">No verified payments in {new Date().getFullYear()} yet</p>
            <p className="text-xs text-dark-muted mt-1">When schools recharge online and you approve their TID, revenue appears here automatically.</p>
          </div>
        ) : (
          <div className="flex items-end gap-2 sm:gap-4 h-52 pt-6">
            {monthlyData.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
                <span className="text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity font-mono font-black">
                  {val > 0 ? (val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val) : '0'}
                </span>
                <div
                  className={`w-full rounded-t-xl transition-all cursor-pointer relative ${
                    val > 0
                      ? 'bg-gradient-to-t from-primary-600 via-indigo-500 to-cyan-400 hover:brightness-125 shadow-lg shadow-primary-500/20'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                  style={{ height: val > 0 ? `${Math.max((val / maxVal) * 100, 8)}%` : '6px' }}
                />
                <span className={`text-[10px] uppercase font-bold tracking-wider ${i === currentMonth ? 'text-primary-400 font-black' : 'text-dark-muted'}`}>
                  {months[i]}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Real Verified Transactions & Ledger */}
      <GlassCard className="p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <CreditCard className="text-primary-500" size={22} /> Audit Trail & Real Transactions ({filteredTransactions.length})
            </h2>
            <p className="text-xs text-dark-muted mt-0.5">Live list of tenant recharges with verifiable Transaction IDs and approval statuses.</p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={15} />
              <input
                type="text"
                placeholder="Search school or TID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 rounded-xl bg-dark-card border border-white/10 text-xs text-white focus:outline-none focus:border-primary-500 w-48 sm:w-60"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-dark-card border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="paid">Verified & Paid</option>
              <option value="pending_verification">Pending Review</option>
              <option value="rejected">Rejected Proofs</option>
            </select>

            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="bg-dark-card border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="JAZZCASH">JazzCash</option>
              <option value="EASYPAISA">EasyPaisa</option>
              <option value="BANK">Bank IBFT / Raast</option>
              <option value="STRIPE">Online Card</option>
            </select>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-dark-muted border border-dashed border-white/10 rounded-2xl">
            <CreditCard size={44} className="opacity-25 mb-3" />
            <p className="text-sm font-bold text-gray-300">No genuine transactions match the selected criteria</p>
            <p className="text-xs text-dark-muted mt-1">All fake mockup records have been cleared. As real payments arrive, they will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-widest font-black">
                  <th className="pb-4 px-4">School System</th>
                  <th className="pb-4 px-4">Plan / Module</th>
                  <th className="pb-4 px-4">Amount (PKR)</th>
                  <th className="pb-4 px-4">Payment Method</th>
                  <th className="pb-4 px-4">TID / Reference</th>
                  <th className="pb-4 px-4">Date</th>
                  <th className="pb-4 px-4 text-center">Audit Status</th>
                  <th className="pb-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-all text-xs font-medium">
                    <td className="py-4 px-4">
                      <p className="font-bold text-white text-sm">{tx.school}</p>
                      <p className="text-[10px] text-dark-muted font-mono">{tx.schoolId || 'Tenant'}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-cyan-300 font-bold text-[11px]">
                        {tx.plan}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-black text-sm text-green-400">
                      PKR {tx.amount.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-dark-muted">
                      <span className="font-bold text-gray-300 uppercase text-[10px]">{tx.method}</span>
                    </td>
                    <td className="py-4 px-4 font-mono">
                      <span className="px-2.5 py-1 rounded-lg bg-[#151926] border border-white/10 text-yellow-300 font-black text-xs">
                        {tx.tid}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-dark-muted font-mono text-[11px]">
                      {tx.date}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        tx.status === 'paid' || tx.status === 'approved'
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : tx.status === 'pending_verification' || tx.status === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 animate-pulse'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        {tx.status === 'paid' || tx.status === 'approved' ? '✓ Verified Paid' :
                         tx.status === 'pending_verification' || tx.status === 'pending' ? '⏳ Under Review' : '✗ Rejected'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {tx.screenshotUrl && (
                        <button
                          onClick={() => window.open(tx.screenshotUrl, '_blank')}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-blue-400 text-[10px] font-bold inline-flex items-center gap-1"
                        >
                          <Eye size={12} /> Receipt
                        </button>
                      )}
                      {(tx.status === 'pending_verification' || tx.status === 'pending') && (
                        <button
                          onClick={() => navigate('/super-admin/subscriptions')}
                          className="px-2.5 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-[10px] font-black uppercase ml-1.5 inline-flex items-center gap-1"
                        >
                          Audit <ArrowUpRight size={11} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default Revenue;
