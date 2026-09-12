import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Plus, ArrowUpRight, ArrowDownLeft, 
  Search, Filter, Download, X, Save, RefreshCw
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const AccountsManager = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [newTx, setNewTx] = useState({ description: '', amount: '', type: 'income', category: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => { fetchTransactions(); }, [userData]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await getRecords('transactions', schoolId);
      setTransactions(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleAddTransaction = async () => {
    if (!newTx.description || !newTx.amount) return;
    try {
      await addRecord('transactions', newTx, schoolId);
      setShowModal(false);
      setNewTx({ description: '', amount: '', type: 'income', category: '', date: new Date().toISOString().split('T')[0] });
      fetchTransactions();
    } catch (e) { console.error(e); }
  };

  const exportCSV = () => {
    const rows = [['Description', 'Type', 'Category', 'Date', 'Amount'],
      ...transactions.map(t => [t.description, t.type, t.category, t.date, t.amount])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `accounts_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

  const filtered = transactions.filter(t => {
    const matchSearch = (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || t.type === filterType;
    return matchSearch && matchType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-primary-500" size={32} />
        <p className="text-dark-muted ml-3">Loading accounts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts & Finance</h1>
          <p className="text-dark-muted mt-1">Monitor income, expenses, and cash flow.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={exportCSV} className="premium-button-secondary"><Download size={18} /> Statement</button>
          <button onClick={() => setShowModal(true)} className="premium-button-primary"><Plus size={20} /> Add Transaction</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 border-b-2 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Total Income</p>
              <h3 className="text-3xl font-black mt-1 text-green-500">PKR {income.toLocaleString()}</h3>
            </div>
            <div className="p-3 rounded-2xl bg-green-500/10 text-green-500"><TrendingUp size={24} /></div>
          </div>
        </GlassCard>
        <GlassCard className="p-6 border-b-2 border-red-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Total Expense</p>
              <h3 className="text-3xl font-black mt-1 text-red-500">PKR {expense.toLocaleString()}</h3>
            </div>
            <div className="p-3 rounded-2xl bg-red-500/10 text-red-500"><TrendingDown size={24} /></div>
          </div>
        </GlassCard>
        <GlassCard className="p-6 border-b-2 border-primary-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Net Balance</p>
              <h3 className={`text-3xl font-black mt-1 ${income - expense >= 0 ? 'text-primary-500' : 'text-red-500'}`}>PKR {(income - expense).toLocaleString()}</h3>
            </div>
            <div className="p-3 rounded-2xl bg-primary-500/10 text-primary-500"><DollarSign size={24} /></div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
            <input type="text" placeholder="Search by description or category..." className="w-full premium-input pl-12"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {['all', 'income', 'expense'].map(f => (
              <button key={f} onClick={() => setFilterType(f)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  filterType === f ? 'bg-primary-500 text-white' : 'bg-dark-card border border-dark-border text-dark-muted hover:border-primary-500/30'
                }`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black">
                <th className="pb-4 px-4">Transaction Details</th>
                <th className="pb-4 px-4">Category</th>
                <th className="pb-4 px-4">Date</th>
                <th className="pb-4 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-20 text-center text-dark-muted">
                    <DollarSign size={40} className="mx-auto opacity-30 mb-3" />
                    <p className="font-bold">No transactions found</p>
                    <p className="text-xs mt-1">Add your first transaction to get started</p>
                  </td>
                </tr>
              ) : filtered.map((t) => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${t.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {t.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                      </div>
                      <p className="font-bold text-sm">{t.description}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs font-medium text-dark-muted uppercase">{t.category}</td>
                  <td className="py-4 px-4 text-xs text-dark-muted">{t.date || (t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : '')}</td>
                  <td className={`py-4 px-4 text-right font-black ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'} PKR {Number(t.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Transaction</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-dark-hover rounded-lg text-dark-muted"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest block mb-1.5">Type</label>
                <div className="flex gap-2">
                  {['income', 'expense'].map(t => (
                    <button key={t} type="button" onClick={() => setNewTx(p => ({ ...p, type: t }))}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold uppercase transition-all ${
                        newTx.type === t 
                          ? t === 'income' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          : 'bg-dark-card border border-dark-border text-dark-muted'
                      }`}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest block mb-1.5">Description</label>
                <input type="text" value={newTx.description} onChange={e => setNewTx(p => ({...p, description: e.target.value}))}
                  className="w-full premium-input" placeholder="e.g. Fee Collection from Class 10" />
              </div>
              <div>
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest block mb-1.5">Amount (PKR)</label>
                <input type="number" value={newTx.amount} onChange={e => setNewTx(p => ({...p, amount: e.target.value}))}
                  className="w-full premium-input" placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest block mb-1.5">Category</label>
                <select value={newTx.category} onChange={e => setNewTx(p => ({...p, category: e.target.value}))} className="w-full premium-input">
                  <option value="">Select Category</option>
                  <option value="fees">Fee Collection</option>
                  <option value="salary">Salary</option>
                  <option value="utilities">Utilities</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="supplies">Supplies</option>
                  <option value="transport">Transport</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest block mb-1.5">Date</label>
                <input type="date" value={newTx.date} onChange={e => setNewTx(p => ({...p, date: e.target.value}))} className="w-full premium-input" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleAddTransaction} className="flex-1 premium-button-primary"><Save size={16} /> Save</button>
              <button onClick={() => setShowModal(false)} className="flex-1 premium-button-secondary">Cancel</button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default AccountsManager;
