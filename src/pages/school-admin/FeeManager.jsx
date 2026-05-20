import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, FileText, Download, Search, 
  CheckCircle, Clock, AlertCircle, RefreshCw, Eye, Trash2, Printer
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { getRecords, deleteRecord, updateRecord } from '../../services/db';
import { useNavigate } from 'react-router-dom';

const FeeManager = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const schoolId = userData?.schoolId || 'default-school';
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [challans, setChallans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getRecords('challans', schoolId);
      setChallans(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalRevenue = challans.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0);
  const paidChallans = challans.filter(c => c.status === 'Paid');
  const pendingChallans = challans.filter(c => c.status !== 'Paid');
  const collected = paidChallans.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0);
  const pending = pendingChallans.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0);

  const stats = [
    { title: 'Total Revenue', value: `PKR ${totalRevenue.toLocaleString()}`, icon: CreditCard, color: 'text-primary-500' },
    { title: 'Collected', value: `PKR ${collected.toLocaleString()}`, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Pending', value: `PKR ${pending.toLocaleString()}`, icon: Clock, color: 'text-orange-500' },
  ];

  const markAsPaid = async (id) => {
    await updateRecord('challans', id, { status: 'Paid', paidAt: new Date().toISOString() });
    fetchData();
  };

  const deleteChallan = async (id) => {
    if (!window.confirm('Delete this challan?')) return;
    await deleteRecord('challans', id);
    fetchData();
  };

  const filtered = challans.filter(c =>
    (c.class || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.month || '').includes(searchTerm)
  );

  const exportCSV = () => {
    const rows = [['Class', 'Month', 'Amount', 'Status', 'Due Date'],
      ...challans.map(c => [c.class, c.month, c.totalAmount, c.status, c.dueDate])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `fee_report_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

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
                <input type="text" placeholder="Search..." value={searchTerm}
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
                      <th className="pb-4 px-4">Class</th>
                      <th className="pb-4 px-4">Month</th>
                      <th className="pb-4 px-4">Amount</th>
                      <th className="pb-4 px-4">Status</th>
                      <th className="pb-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {filtered.slice(0, 10).map((c) => (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-bold">Class {c.class}</td>
                        <td className="py-4 px-4 text-sm text-dark-muted">{c.month}</td>
                        <td className="py-4 px-4 font-bold text-primary-400">PKR {Number(c.totalAmount).toLocaleString()}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            c.status === 'Paid' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                          }`}>{c.status}</span>
                        </td>
                        <td className="py-4 px-4 text-right flex gap-2 justify-end">
                          {c.status !== 'Paid' && (
                            <button onClick={() => markAsPaid(c.id)} className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20" title="Mark Paid">
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button onClick={() => deleteChallan(c.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20" title="Delete">
                            <Trash2 size={16} />
                          </button>
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
          <h2 className="text-xl font-bold mb-6">All Challans ({challans.length})</h2>
          {challans.length === 0 ? (
            <div className="text-center py-12 text-dark-muted">
              <FileText size={40} className="mx-auto opacity-30 mb-3" />
              <p className="font-bold">No challans generated yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
                    <th className="pb-4 px-4">Class</th>
                    <th className="pb-4 px-4">Month</th>
                    <th className="pb-4 px-4">Fee Items</th>
                    <th className="pb-4 px-4">Total</th>
                    <th className="pb-4 px-4">Due Date</th>
                    <th className="pb-4 px-4">Status</th>
                    <th className="pb-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {challans.map(c => (
                    <tr key={c.id} className="hover:bg-white/5">
                      <td className="py-4 px-4 font-bold">Class {c.class}</td>
                      <td className="py-4 px-4 text-dark-muted">{c.month}</td>
                      <td className="py-4 px-4 text-xs text-dark-muted">{(c.feeItems || []).map(f => f.name).join(', ')}</td>
                      <td className="py-4 px-4 font-bold text-primary-400">PKR {Number(c.totalAmount).toLocaleString()}</td>
                      <td className="py-4 px-4 text-dark-muted">{c.dueDate || 'N/A'}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          c.status === 'Paid' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                        }`}>{c.status}</span>
                      </td>
                      <td className="py-4 px-4 text-right flex gap-2 justify-end">
                        {c.status !== 'Paid' && (
                          <button onClick={() => markAsPaid(c.id)} className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20">
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button onClick={() => deleteChallan(c.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20">
                          <Trash2 size={16} />
                        </button>
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
                    <th className="pb-4 px-4">Class</th>
                    <th className="pb-4 px-4">Month</th>
                    <th className="pb-4 px-4">Amount Due</th>
                    <th className="pb-4 px-4">Due Date</th>
                    <th className="pb-4 px-4 text-right">Mark Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {pendingChallans.map(c => (
                    <tr key={c.id} className="hover:bg-white/5">
                      <td className="py-4 px-4 font-bold">Class {c.class}</td>
                      <td className="py-4 px-4 text-dark-muted">{c.month}</td>
                      <td className="py-4 px-4 font-bold text-red-400">PKR {Number(c.totalAmount).toLocaleString()}</td>
                      <td className="py-4 px-4 text-dark-muted">{c.dueDate || 'N/A'}</td>
                      <td className="py-4 px-4 text-right">
                        <button onClick={() => markAsPaid(c.id)} className="premium-button-primary py-2 px-4 text-xs">
                          <CheckCircle size={14} /> Mark Paid
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
};

export default FeeManager;
