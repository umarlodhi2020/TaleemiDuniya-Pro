import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Printer, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Calendar,
  X,
  CreditCard,
  Layers,
  Award,
  RefreshCw
} from 'lucide-react';
import { getRecords, addRecord, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/common/GlassCard';

const CATEGORIES = {
  utilities: { label: 'Utilities & Bills', color: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/20' },
  entertainment: { label: 'Tea & Entertainment', color: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  stationery: { label: 'Printing & Stationery', color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/20' },
  fuel: { label: 'Generator & Fuel', color: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/20' },
  salary: { label: 'Staff Salaries', color: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  maintenance: { label: 'School Maintenance', color: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/20' },
  others: { label: 'General / Miscellaneous', color: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500/20' }
};

const ExpenseManager = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = userData?.schoolName || 'Lodhi School System';

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form State
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('stationery');
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [refNo, setRefNo] = useState('');

  // Filtering / Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Petty Cash Voucher Modal
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, [schoolId]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const data = await getRecords('expenses', schoolId);
      if (data && data.length > 0) {
        setExpenses(data);
      } else {
        setExpenses([]);
      }
    } catch (e) {
      console.error("Error loading expenses ledger:", e);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    setAdding(true);
    
    const newRecord = {
      description: description.trim(),
      category,
      amount: parseFloat(amount),
      payMethod,
      date,
      refNo: refNo.trim() || `REF-${Math.floor(100 + Math.random() * 900)}`
    };

    try {
      const res = await addRecord('expenses', newRecord, schoolId);
      if (res.success) {
        // Clear Form
        setDescription('');
        setAmount('');
        setRefNo('');
        fetchExpenses();
      }
    } catch (err) {
      console.error("Failed to append expense voucher:", err);
      // Append locally for testing
      setExpenses([{ id: Date.now().toString(), ...newRecord }, ...expenses]);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense voucher?")) return;
    try {
      await deleteRecord('expenses', id);
      fetchExpenses();
    } catch (err) {
      setExpenses(expenses.filter(ex => ex.id !== id));
    }
  };

  // Calculations
  const filteredExpenses = expenses.filter(ex => {
    const matchesSearch = String(ex.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          String(ex.refNo || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'ALL' || ex.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const highestExpense = expenses.length > 0 ? Math.max(...expenses.map(ex => ex.amount)) : 0;
  const averageExpense = expenses.length > 0 ? (totalExpense / expenses.length).toFixed(0) : 0;

  // Category distributions for visualization
  const categoryTotals = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});

  const handlePrintVoucher = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-dark-bg text-dark-text select-none">
      
      {/* Print settings specifically for A6 Voucher Receipt */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: transparent !important;
          }
          #print-voucher-area, #print-voucher-area * {
            visibility: visible;
          }
          #print-voucher-area {
            position: absolute;
            left: 50%;
            top: 40%;
            transform: translate(-50%, -50%);
            width: 450px !important;
            padding: 1.5cm !border-width !important;
            border: 2px solid #000000 !important;
            display: block !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">
            Daily Cashbook & Expense Manager
          </h1>
          <p className="text-xs text-dark-muted font-bold tracking-wider uppercase mt-1">
            Track daily petty cash expenditures, monthly distribution charts, and print official vouchers
          </p>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 no-print">
        <GlassCard className="p-5 border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block">Total Expenditures</span>
            <span className="text-2xl font-black text-red-500 mt-1 block">Rs. {totalExpense.toLocaleString()}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
            <TrendingDown size={24} />
          </div>
        </GlassCard>

        <GlassCard className="p-5 border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest block">Average Voucher Value</span>
            <span className="text-2xl font-black text-yellow-500 mt-1 block">Rs. {parseFloat(averageExpense).toLocaleString()}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
            <DollarSign size={24} />
          </div>
        </GlassCard>

        <GlassCard className="p-5 border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block">Highest Expense logged</span>
            <span className="text-2xl font-black text-cyan-400 mt-1 block">Rs. {highestExpense.toLocaleString()}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <FileText size={24} />
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        
        {/* Left Side: Add expense Form & visual distribution */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="p-5 border-dark-border/40">
            <h2 className="text-sm font-black text-primary-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Plus size={16} />
              <span>Log New Expense</span>
            </h2>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs font-bold">
              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Description / Payee Details</label>
                <input 
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Tea and biscuits for exam inspectors"
                  className="w-full premium-input bg-dark-card text-xs"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Expense Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs text-primary-400"
                >
                  {Object.entries(CATEGORIES).map(([key, item]) => (
                    <option key={key} value={key}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] text-dark-muted uppercase tracking-wider">Amount (PKR)</label>
                  <input 
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full premium-input bg-dark-card text-xs text-yellow-400 font-sans"
                  />
                </div>

                {/* Reference No */}
                <div className="space-y-1">
                  <label className="text-[10px] text-dark-muted uppercase tracking-wider">Invoice/Ref No</label>
                  <input 
                    type="text"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    placeholder="e.g. INV-283"
                    className="w-full premium-input bg-dark-card text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Pay Method */}
                <div className="space-y-1">
                  <label className="text-[10px] text-dark-muted uppercase tracking-wider">Payment Method</label>
                  <select 
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full premium-input bg-dark-card text-xs"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-[10px] text-dark-muted uppercase tracking-wider">Payment Date</label>
                  <input 
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full premium-input bg-dark-card text-xs font-sans text-primary-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={adding}
                className="w-full mt-2 py-2.5 rounded-xl bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500 hover:text-white font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5"
              >
                <Plus size={14} />
                <span>{adding ? 'Adding...' : 'Log Expense'}</span>
              </button>
            </form>
          </GlassCard>

          {/* Graphical category visualizer using beautiful native HSL/progress bars */}
          <GlassCard className="p-5 border-dark-border/40">
            <h2 className="text-sm font-black text-primary-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Layers size={16} />
              <span>Category Breakdown</span>
            </h2>

            <div className="space-y-3.5 text-[11px] font-bold">
              {Object.entries(CATEGORIES).map(([key, item]) => {
                const total = categoryTotals[key] || 0;
                const percentage = totalExpense > 0 ? ((total / totalExpense) * 100).toFixed(0) : 0;
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="uppercase text-dark-text">{item.label}</span>
                      <span className={`${item.text} font-black`}>Rs.{total.toLocaleString()} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 border border-dark-border/40 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Ledger records */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 border-dark-border/40 min-h-[500px]">
            {/* Search filter row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-border/40 pb-4 mb-6">
              <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-primary-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} />
                <span>Daily Expenses Ledger</span>
              </h2>

              <div className="flex flex-col md:flex-row gap-2 font-bold text-xs">
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-dark-muted" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ledger..."
                    className="pl-8 py-2 w-[180px] bg-dark-card border border-dark-border rounded-xl text-xs"
                  />
                </div>

                {/* Category filter */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="py-2 px-3 bg-dark-card border border-dark-border rounded-xl text-xs text-primary-400"
                >
                  <option value="ALL">ALL CATEGORIES</option>
                  {Object.entries(CATEGORIES).map(([key, item]) => (
                    <option key={key} value={key}>{item.label.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <RefreshCw size={30} className="text-primary-500 animate-spin" />
                <span className="text-[10px] font-black text-dark-muted uppercase">Fetching Ledger Vouchers...</span>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-dark-muted text-center gap-1.5">
                <span className="text-lg">☕</span>
                <p className="text-[10px] font-black uppercase">No expenses found matching filter criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-dark-text border-collapse">
                  <thead>
                    <tr className="border-b border-dark-border/40 text-[9px] text-dark-muted uppercase tracking-wider">
                      <th className="py-2 px-1">Date</th>
                      <th className="py-2">Description</th>
                      <th className="py-2">Category</th>
                      <th className="py-2 text-right">Amount</th>
                      <th className="py-2 text-center no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((ex) => {
                      const catInfo = CATEGORIES[ex.category] || CATEGORIES.others;
                      return (
                        <tr key={ex.id} className="border-b border-dark-border/10 hover:bg-white/5 transition-all">
                          <td className="py-3 px-1 text-primary-400 font-sans text-[11px] whitespace-nowrap">
                            {ex.date}
                          </td>
                          <td className="py-3">
                            <span className="font-extrabold block">{ex.description}</span>
                            <span className="text-[9px] font-mono text-dark-muted block mt-0.5">Ref/Invoice: {ex.refNo} ({ex.payMethod})</span>
                          </td>
                          <td className="py-3">
                            <span className={`inline-block text-[8px] font-black px-2 py-0.5 rounded-full border ${catInfo.text} ${catInfo.border} bg-white/5 uppercase`}>
                              {catInfo.label.split(' ')[0]}
                            </span>
                          </td>
                          <td className="py-3 text-right text-yellow-400 font-extrabold">
                            Rs.{ex.amount.toLocaleString()}
                          </td>
                          <td className="py-3 text-center no-print">
                            <div className="flex items-center justify-center gap-2.5">
                              <button 
                                onClick={() => setSelectedVoucher(ex)}
                                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 text-[9px] uppercase font-black"
                                title="Print Petty Cash Voucher Receipt"
                              >
                                <Printer size={12} />
                                <span>Voucher</span>
                              </button>
                              <button 
                                onClick={() => handleDeleteExpense(ex.id)}
                                className="text-red-400 hover:text-red-300"
                                title="Delete Record"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>

      </div>

      {/* ========================================================
          PETTY CASH VOUCHER printable modal A6 size
      ======================================================== */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 no-print select-none">
          <GlassCard className="p-6 max-w-[480px] w-full border-dark-border relative text-black bg-white select-text">
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedVoucher(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X size={20} />
            </button>

            {/* Voucher Body layout */}
            <div className="border-[2px] border-black p-4 rounded-xl flex flex-col justify-between font-sans bg-white min-h-[300px]">
              
              {/* Header block */}
              <div className="flex justify-between border-b-[2px] border-black pb-2 items-center">
                <div className="text-left leading-tight">
                  <h3 className="text-xs font-black uppercase text-gray-800 tracking-wide leading-none">{schoolName}</h3>
                  <span className="text-[7.5px] text-gray-500 font-extrabold uppercase">Official Accounts System</span>
                </div>
                <div className="text-right">
                  <span className="inline-block text-[11px] font-black uppercase tracking-widest border border-black py-0.5 px-2 bg-gray-50 text-gray-900 rounded">
                    PETTY CASH VOUCHER
                  </span>
                </div>
              </div>

              {/* Meta details (Voucher No / Date) */}
              <div className="grid grid-cols-2 border-b border-gray-200 py-2.5 text-[10px] font-bold text-gray-800 gap-4">
                <div>
                  <span className="text-gray-400 uppercase text-[8px]">Voucher Ref No:</span>
                  <span className="block font-mono font-black text-gray-900 text-[11px]">{selectedVoucher.refNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 uppercase text-[8px]">Payment Date:</span>
                  <span className="block text-gray-900">{selectedVoucher.date}</span>
                </div>
              </div>

              {/* Details table description */}
              <div className="flex-1 my-3 text-[10.5px]">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-400 uppercase text-[8px] font-bold">Debit Head (Account Description)</span>
                  <span className="text-gray-400 uppercase text-[8px] font-bold text-right">Amount</span>
                </div>
                
                <div className="flex justify-between items-start py-2">
                  <div className="text-left font-bold max-w-[80%] uppercase">
                    <span className="block text-gray-900 font-black">{selectedVoucher.description}</span>
                    <span className="block text-[8px] text-gray-400 mt-0.5">Category: {CATEGORIES[selectedVoucher.category]?.label || 'General'} ({selectedVoucher.payMethod})</span>
                  </div>
                  <div className="text-right text-[11.5px] font-black text-gray-900 font-sans">
                    Rs.{selectedVoucher.amount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Total Amount card */}
              <div className="bg-gray-100 border border-gray-300 p-2.5 rounded-lg flex justify-between items-center text-[11px] font-black text-gray-900">
                <span className="uppercase text-[9px]">Amount Paid In Cash / Transfer:</span>
                <span className="text-[12px] text-primary-700 font-sans font-black">Rs. {selectedVoucher.amount.toLocaleString()}</span>
              </div>

              {/* Signatures */}
              <div className="mt-6 pt-3 border-t border-gray-300 flex justify-between text-[8px] font-black text-gray-500 uppercase">
                <div className="text-center min-w-[100px]">
                  <div className="h-6 border-b border-gray-300 w-full mb-1"></div>
                  <span>Prepared By</span>
                </div>
                <div className="text-center min-w-[100px]">
                  <div className="h-6 border-b border-gray-300 w-full mb-1"></div>
                  <span>Received By (Sign)</span>
                </div>
              </div>

            </div>

            {/* Print and Close controls */}
            <div className="flex gap-2.5 mt-5">
              <button 
                onClick={handlePrintVoucher}
                className="flex-1 py-2 rounded-xl bg-primary-600 border border-primary-700 text-white hover:bg-primary-700 font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-md"
              >
                <Printer size={14} />
                <span>Print Voucher Receipt</span>
              </button>
              <button 
                onClick={() => setSelectedVoucher(null)}
                className="py-2 px-5 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 font-bold text-xs uppercase"
              >
                Close
              </button>
            </div>

          </GlassCard>
        </div>
      )}

      {/* ========================================================
          SECRET PRINT HIDDEN VOUCHER LAYOUT
      ======================================================== */}
      {selectedVoucher && (
        <div id="print-voucher-area" className="hidden print:block text-black bg-white">
          <div className="border-[2px] border-black p-6 rounded-2xl flex flex-col justify-between font-sans bg-white min-h-[320px]">
            <div className="flex justify-between border-b-[2px] border-black pb-2.5 items-center">
              <div className="text-left leading-tight">
                <h3 className="text-xs font-black uppercase text-gray-800 tracking-wide leading-none">{schoolName}</h3>
                <span className="text-[7.5px] text-gray-500 font-extrabold uppercase">Official Accounts System</span>
              </div>
              <div className="text-right">
                <span className="inline-block text-[11px] font-black uppercase tracking-widest border border-black py-0.5 px-3 bg-gray-50 text-gray-900 rounded">
                  PETTY CASH VOUCHER
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 border-b border-gray-200 py-3 text-[10px] font-bold text-gray-800 gap-4">
              <div>
                <span className="text-gray-400 uppercase text-[8px]">Voucher Ref No:</span>
                <span className="block font-mono font-black text-gray-900 text-[11px]">{selectedVoucher.refNo}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 uppercase text-[8px]">Payment Date:</span>
                <span className="block text-gray-900">{selectedVoucher.date}</span>
              </div>
            </div>

            <div className="flex-1 my-4 text-[10.5px]">
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-400 uppercase text-[8px] font-bold">Debit Head (Account Description)</span>
                <span className="text-gray-400 uppercase text-[8px] font-bold text-right">Amount</span>
              </div>
              
              <div className="flex justify-between items-start py-2.5">
                <div className="text-left font-bold max-w-[80%] uppercase">
                  <span className="block text-gray-900 font-black">{selectedVoucher.description}</span>
                  <span className="block text-[8px] text-gray-400 mt-0.5">Category: {CATEGORIES[selectedVoucher.category]?.label || 'General'} ({selectedVoucher.payMethod})</span>
                </div>
                <div className="text-right text-[11.5px] font-black text-gray-900 font-sans">
                  Rs.{selectedVoucher.amount.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="bg-gray-100 border border-gray-300 p-3 rounded-xl flex justify-between items-center text-[11px] font-black text-gray-900">
              <span className="uppercase text-[9px]">Amount Paid In Cash / Transfer:</span>
              <span className="text-[12px] text-primary-700 font-sans font-black">Rs. {selectedVoucher.amount.toLocaleString()}</span>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between text-[8px] font-black text-gray-500 uppercase">
              <div className="text-center min-w-[120px]">
                <div className="h-6 border-b border-gray-300 w-full mb-1"></div>
                <span>Prepared By</span>
              </div>
              <div className="text-center min-w-[120px]">
                <div className="h-6 border-b border-gray-300 w-full mb-1"></div>
                <span>Received By (Sign)</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExpenseManager;
