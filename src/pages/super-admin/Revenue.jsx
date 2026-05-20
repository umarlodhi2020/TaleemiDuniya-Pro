import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Download, Calendar, RefreshCw, Building2 } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Revenue = () => {
  const [period, setPeriod] = useState('yearly');
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState([]);
  const [payments, setPayments] = useState([]);
  const [monthlyData, setMonthlyData] = useState(new Array(12).fill(0));

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      // Fetch schools
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      const schoolsList = schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchools(schoolsList);

      // Fetch payments
      const paymentsSnap = await getDocs(collection(db, 'payments'));
      const paymentsList = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(paymentsList);

      // Calculate monthly revenue from payments
      const monthlyRevenue = new Array(12).fill(0);
      paymentsList.forEach(payment => {
        if (payment.status === 'paid' && payment.createdAt) {
          const date = payment.createdAt.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt);
          const month = date.getMonth();
          monthlyRevenue[month] += Number(payment.amount) || 0;
        }
      });

      // Also calculate from schools' subscription revenue
      schoolsList.forEach(school => {
        if (school.status === 'active' && school.revenue) {
          const createdDate = school.createdAt?.toDate ? school.createdAt.toDate() : new Date();
          const month = createdDate.getMonth();
          // Spread monthly subscription revenue
          for (let m = month; m < 12; m++) {
            monthlyRevenue[m] += Number(school.revenue) || 0;
          }
        }
      });

      setMonthlyData(monthlyRevenue);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalRevenue = monthlyData.reduce((a, b) => a + b, 0);
  const currentMonth = new Date().getMonth();
  const thisMonthRevenue = monthlyData[currentMonth] || 0;
  const lastMonthRevenue = monthlyData[currentMonth - 1] || 0;
  const monthGrowth = lastMonthRevenue > 0 ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(0) : 0;

  const activeSchools = schools.filter(s => s.status === 'active').length;
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const overduePayments = payments.filter(p => p.status === 'overdue');
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const overdueAmount = overduePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const maxVal = Math.max(...monthlyData, 1);

  // Build transactions from payments + schools
  const recentTransactions = payments.length > 0
    ? payments.slice(0, 10).map(p => ({
        school: p.schoolName || 'Unknown School',
        plan: p.plan || 'N/A',
        amount: Number(p.amount) || 0,
        date: p.createdAt?.toDate ? p.createdAt.toDate().toISOString().slice(0, 10) : (p.date || 'N/A'),
        status: p.status || 'pending'
      }))
    : schools.filter(s => s.status === 'active').map(s => ({
        school: s.name || s.schoolName || 'Unknown',
        plan: s.plan || s.subscriptionPlan || 'Basic',
        amount: Number(s.revenue) || 0,
        date: s.createdAt?.toDate ? s.createdAt.toDate().toISOString().slice(0, 10) : 'N/A',
        status: 'paid'
      }));

  const handleExport = () => {
    const csvRows = [
      ['School', 'Plan', 'Amount (PKR)', 'Date', 'Status'],
      ...recentTransactions.map(t => [t.school, t.plan, t.amount, t.date, t.status])
    ];
    const csvContent = csvRows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="animate-spin text-primary-500 mx-auto" size={32} />
          <p className="text-dark-muted mt-3 text-sm">Loading revenue data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revenue Management</h1>
          <p className="text-dark-muted mt-1">Track earnings, billing cycles, and payment statuses.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchRevenueData} className="premium-button-secondary">
            <RefreshCw size={18} /> Refresh
          </button>
          <button onClick={handleExport} className="premium-button-primary">
            <Download size={18} /> Export Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `PKR ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', trend: totalRevenue > 0 ? '+' + monthGrowth + '%' : '0%' },
          { label: 'This Month', value: `PKR ${thisMonthRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-primary-400', bg: 'bg-primary-500/10', trend: `${monthGrowth}%` },
          { label: 'Pending', value: `PKR ${pendingAmount.toLocaleString()}`, icon: Calendar, color: 'text-yellow-400', bg: 'bg-yellow-500/10', trend: `${pendingPayments.length} payments` },
          { label: 'Active Schools', value: activeSchools.toString(), icon: Building2, color: 'text-cyan-400', bg: 'bg-cyan-500/10', trend: `${schools.length} total` },
        ].map((stat, i) => (
          <GlassCard key={i} className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <stat.icon className={stat.color} size={20} />
              </div>
              <span className="text-xs text-green-400 font-bold">{stat.trend}</span>
            </div>
            <p className="text-xs text-dark-muted uppercase tracking-widest font-black">{stat.label}</p>
            <p className="text-2xl font-black mt-1">{stat.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Revenue Bar Chart */}
      <GlassCard className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="text-primary-500" size={22} /> Monthly Revenue ({new Date().getFullYear()})
          </h2>
          <div className="flex gap-2">
            {['monthly', 'yearly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${period === p ? 'bg-primary-500 text-white' : 'bg-dark-hover text-dark-muted'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {totalRevenue === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-dark-muted">
            <DollarSign size={40} className="opacity-30 mb-3" />
            <p className="text-sm font-bold">No revenue data yet</p>
            <p className="text-xs mt-1">Revenue will appear here when schools make payments</p>
          </div>
        ) : (
          <div className="flex items-end gap-2 h-48">
            {monthlyData.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[9px] text-dark-muted opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                  {val > 0 ? (val / 1000).toFixed(0) + 'k' : '0'}
                </span>
                <div
                  className={`w-full rounded-t-lg transition-all cursor-pointer ${
                    val > 0
                      ? 'bg-gradient-to-t from-primary-600 to-primary-400 hover:from-primary-500 hover:to-secondary-400'
                      : 'bg-dark-hover'
                  }`}
                  style={{ height: val > 0 ? `${(val / maxVal) * 100}%` : '4px', minHeight: '4px' }}
                />
                <span className={`text-[9px] ${i === currentMonth ? 'text-primary-400 font-bold' : 'text-dark-muted'}`}>
                  {months[i]}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Transactions Table */}
      <GlassCard className="p-8">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <CreditCard className="text-primary-500" size={22} /> Recent Transactions
        </h2>
        {recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-dark-muted">
            <CreditCard size={40} className="opacity-30 mb-3" />
            <p className="text-sm font-bold">No transactions yet</p>
            <p className="text-xs mt-1">Transactions will appear when schools subscribe and pay</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-widest font-black">
                  <th className="pb-4 px-4">School</th>
                  <th className="pb-4 px-4">Plan</th>
                  <th className="pb-4 px-4">Amount</th>
                  <th className="pb-4 px-4">Date</th>
                  <th className="pb-4 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {recentTransactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-all">
                    <td className="py-4 px-4 font-semibold">{tx.school}</td>
                    <td className="py-4 px-4 text-sm text-dark-muted">{tx.plan}</td>
                    <td className="py-4 px-4 font-bold text-green-400">PKR {tx.amount.toLocaleString()}</td>
                    <td className="py-4 px-4 text-sm text-dark-muted">{tx.date}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                        tx.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20'
                        : tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>{tx.status}</span>
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
