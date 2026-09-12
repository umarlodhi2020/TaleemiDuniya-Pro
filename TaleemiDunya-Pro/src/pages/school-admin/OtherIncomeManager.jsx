import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DollarSign, Plus, Receipt, FileText, CheckCircle, Tag, TrendingUp, Edit, Trash2, ArrowLeft, Save, X, GraduationCap, Phone, Printer } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';

const OtherIncomeManager = () => {
  const { userData } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const tabFromQuery = queryParams.get('tab') || 'invoices';

  const [activeTab, setActiveTab] = useState(tabFromQuery);

  // Sync activeTab with URL changes when clicking sidebar links
  useEffect(() => {
    if (tabFromQuery) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  // Persistent Categories in localStorage
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('other_income_categories');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [
      { id: 1, name: 'Canteen & Tuck Shop Rent' },
      { id: 2, name: 'School Ground / Auditorium Evening Rental' },
      { id: 3, name: 'Books & Uniform Commission / Sales Margin' },
      { id: 4, name: 'Donations & Grants' }
    ];
  });

  // Persistent Records / Invoices in localStorage
  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem('other_income_records');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [
      { id: 101, category: 'Canteen & Tuck Shop Rent', title: 'July Canteen Rent from Contractor', amount: 45000, date: '2026-07-01', method: 'Cash' },
      { id: 102, category: 'School Ground / Auditorium Evening Rental', title: 'Evening Football Turf Rental', amount: 15000, date: '2026-07-04', method: 'Bank Deposit' }
    ];
  });

  // Persistent School Billing Invoices in localStorage (Exact match to STASU Reference)
  const [schoolInvoices, setSchoolInvoices] = useState(() => {
    const saved = localStorage.getItem('school_billing_invoices');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [
      { id: 1, dueDate: '10 Apr 2026', subtotal: 2000.00, tax: 0.00, total: 2000.00, status: 'Unpaid' },
      { id: 2, dueDate: '01 Mar 2026', subtotal: 2000.00, tax: 0.00, total: 2000.00, status: 'Paid' },
      { id: 3, dueDate: '01 Feb 2026', subtotal: 2000.00, tax: 0.00, total: 2000.00, status: 'Paid' },
      { id: 4, dueDate: '01 Jan 2026', subtotal: 2000.00, tax: 0.00, total: 2000.00, status: 'Paid' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('school_billing_invoices', JSON.stringify(schoolInvoices));
  }, [schoolInvoices]);

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const handleMarkInvoicePaid = (invId) => {
    setSchoolInvoices(schoolInvoices.map(inv => inv.id === invId ? { ...inv, status: 'Paid' } : inv));
    if (selectedInvoice && selectedInvoice.id === invId) {
      setSelectedInvoice({ ...selectedInvoice, status: 'Paid' });
    }
    alert('✅ Invoice #' + invId + ' marked as Paid via simulated payment gateway!');
  };

  const handleCreateNewInvoice = () => {
    const newId = schoolInvoices.length > 0 ? Math.max(...schoolInvoices.map(i => i.id)) + 1 : 1;
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 1);
    const dateStr = nextDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const newInv = {
      id: newId,
      dueDate: dateStr,
      subtotal: 2000.00,
      tax: 0.00,
      total: 2000.00,
      status: 'Unpaid'
    };
    setSchoolInvoices([newInv, ...schoolInvoices]);
    alert('✅ New monthly subscription invoice #' + newId + ' generated!');
  };

  // Save to localStorage whenever categories or records change
  useEffect(() => {
    localStorage.setItem('other_income_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('other_income_records', JSON.stringify(records));
  }, [records]);

  // Form states for Category tab
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Form states for Add Income tab
  const [newIncomeCat, setNewIncomeCat] = useState('');
  const [newIncomeTitle, setNewIncomeTitle] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newIncomeDate, setNewIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [newIncomeMethod, setNewIncomeMethod] = useState('Cash');

  // Editing Income state
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editingRecordCat, setEditingRecordCat] = useState('');
  const [editingRecordTitle, setEditingRecordTitle] = useState('');
  const [editingRecordAmount, setEditingRecordAmount] = useState('');
  const [editingRecordDate, setEditingRecordDate] = useState('');
  const [editingRecordMethod, setEditingRecordMethod] = useState('Cash');

  // Handlers for Categories
  const handleSaveCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newCat = {
      id: Date.now(),
      name: newCatName.trim()
    };
    setCategories([...categories, newCat]);
    setNewCatName('');
  };

  const handleDeleteCategory = (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const handleStartEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const handleUpdateCategory = (e) => {
    e.preventDefault();
    if (!editingCatName.trim()) return;
    setCategories(categories.map(c => c.id === editingCatId ? { ...c, name: editingCatName.trim() } : c));
    setEditingCatId(null);
    setEditingCatName('');
  };

  // Handlers for Income Records
  const handleSaveIncome = (e) => {
    e.preventDefault();
    if (!newIncomeTitle.trim() || !newIncomeAmount) return;
    const chosenCat = newIncomeCat || (categories[0] ? categories[0].name : 'General');
    const newRec = {
      id: Date.now(),
      category: chosenCat,
      title: newIncomeTitle.trim(),
      amount: Number(newIncomeAmount),
      date: newIncomeDate,
      method: newIncomeMethod
    };
    setRecords([newRec, ...records]);
    setNewIncomeTitle('');
    setNewIncomeAmount('');
    alert('Other Income saved successfully!');
  };

  const handleDeleteIncome = (id) => {
    if (window.confirm('Are you sure you want to delete this income record?')) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const handleStartEditIncome = (rec) => {
    setEditingRecordId(rec.id);
    setEditingRecordCat(rec.category);
    setEditingRecordTitle(rec.title);
    setEditingRecordAmount(rec.amount);
    setEditingRecordDate(rec.date);
    setEditingRecordMethod(rec.method);
  };

  const handleUpdateIncome = (e) => {
    e.preventDefault();
    setRecords(records.map(r => r.id === editingRecordId ? {
      ...r,
      category: editingRecordCat,
      title: editingRecordTitle.trim(),
      amount: Number(editingRecordAmount),
      date: editingRecordDate,
      method: editingRecordMethod
    } : r));
    setEditingRecordId(null);
  };

  const updateUrlTab = (tabKey) => {
    setActiveTab(tabKey);
    navigate(`/school-admin/other-income?tab=${tabKey}`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 text-dark-text">
      {/* Back to Dashboard Button */}
      <div>
        <button
          onClick={() => navigate('/school-admin/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold rounded-lg shadow transition-all"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>

      <div className="border-b border-dark-border pb-4">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <TrendingUp className="text-blue-500" /> Billing & Other Income Hub
        </h1>
        <p className="text-xs text-primary-400 font-mono font-bold uppercase tracking-wider mt-1">
          Home / {activeTab === 'invoices' ? 'Billing / 1 Invoices' : activeTab === 'cat' ? 'Other income / 1 Other Income Category' : 'Other income / 2 Add Other Income'}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => updateUrlTab('cat')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeTab === 'cat' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-dark-card text-dark-muted hover:text-white border border-dark-border'
          }`}
        >
          <Tag size={16} /> Other income — 1 Other Income Category
        </button>
        <button
          onClick={() => updateUrlTab('add')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeTab === 'add' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-dark-card text-dark-muted hover:text-white border border-dark-border'
          }`}
        >
          <Plus size={16} /> Other income — 2 Add Other Income
        </button>
        <button
          onClick={() => updateUrlTab('invoices')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeTab === 'invoices' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-dark-card text-dark-muted hover:text-white border border-dark-border'
          }`}
        >
          <Receipt size={16} /> Billing — 1 Invoices
        </button>
      </div>

      {/* TAB 1: OTHER INCOME CATEGORY (Exact match to User Screenshot) */}
      {activeTab === 'cat' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Create Other Income Category</h2>

          {/* Box 1: Add Category */}
          <GlassCard className="p-6 border-t-4 border-t-blue-500 shadow-xl bg-dark-card/90">
            <h3 className="text-blue-400 font-bold text-base mb-4 pb-2 border-b border-dark-border">Add Category</h3>
            <form onSubmit={handleSaveCategory} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-dark-muted mb-1.5">Category Name*</label>
                <input
                  type="text"
                  required
                  placeholder="Category Name"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-hover/80 border border-dark-border text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-blue-500/30 transition-all"
                >
                  Save
                </button>
              </div>
            </form>
          </GlassCard>

          {/* Box 2: All Other Income Categories Table */}
          <GlassCard className="p-6 border-t-4 border-t-blue-500 shadow-xl bg-dark-card/90 overflow-hidden">
            <h3 className="text-blue-400 font-bold text-base mb-4 pb-2 border-b border-dark-border">All Other Income Categories</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-dark-border rounded-xl">
                <thead className="bg-dark-hover/90 text-dark-text font-extrabold border-b border-dark-border">
                  <tr>
                    <th className="p-3 w-16 text-center">#</th>
                    <th className="p-3">Category Name</th>
                    <th className="p-3 w-28 text-center">Edit</th>
                    <th className="p-3 w-28 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/60 text-sm">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-dark-muted italic">No categories created yet. Add one above!</td>
                    </tr>
                  ) : (
                    categories.map((cat, index) => (
                      <tr key={cat.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-center font-mono text-dark-muted">{index + 1}</td>
                        <td className="p-3 font-bold text-white">
                          {editingCatId === cat.id ? (
                            <form onSubmit={handleUpdateCategory} className="flex gap-2">
                              <input
                                type="text"
                                value={editingCatName}
                                onChange={(e) => setEditingCatName(e.target.value)}
                                className="px-2 py-1 rounded bg-dark-hover border border-dark-border text-xs text-white flex-1"
                                autoFocus
                              />
                              <button type="submit" className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs">Save</button>
                              <button type="button" onClick={() => setEditingCatId(null)} className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs">X</button>
                            </form>
                          ) : (
                            cat.name
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleStartEditCategory(cat)}
                            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded font-bold text-xs inline-flex items-center gap-1 transition-all"
                          >
                            <Edit size={13} /> Edit
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded font-bold text-xs inline-flex items-center gap-1 transition-all"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 2: ADD OTHER INCOME */}
      {activeTab === 'add' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Add Other Income</h2>

          {/* Box 1: Form */}
          <GlassCard className="p-6 border-t-4 border-t-blue-500 shadow-xl bg-dark-card/90">
            <h3 className="text-blue-400 font-bold text-base mb-4 pb-2 border-b border-dark-border">Add Other Income Record</h3>
            <form onSubmit={handleSaveIncome} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-dark-muted mb-1.5">Income Category*</label>
                <select
                  required
                  value={newIncomeCat}
                  onChange={(e) => setNewIncomeCat(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-hover/80 border border-dark-border text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  {categories.length === 0 ? (
                    <option value="">No Categories Available (Create in Tab 1)</option>
                  ) : (
                    <>
                      <option value="">Select Category...</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-muted mb-1.5">Title / Particulars*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Auditorium Hall Booking by Sports Club"
                  value={newIncomeTitle}
                  onChange={(e) => setNewIncomeTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-hover/80 border border-dark-border text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark-muted mb-1.5">Amount (Rs.)*</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={newIncomeAmount}
                    onChange={(e) => setNewIncomeAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-hover/80 border border-dark-border text-green-400 font-mono font-bold text-sm focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-muted mb-1.5">Date*</label>
                  <input
                    type="date"
                    required
                    value={newIncomeDate}
                    onChange={(e) => setNewIncomeDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-hover/80 border border-dark-border text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-muted mb-1.5">Payment Method</label>
                <select
                  value={newIncomeMethod}
                  onChange={(e) => setNewIncomeMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-dark-hover/80 border border-dark-border text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="Cash">Cash at School Counter</option>
                  <option value="Bank Deposit">Bank Deposit / Transfer</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Easypaisa">Easypaisa</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-blue-500/30 transition-all inline-flex items-center gap-2"
                >
                  <Plus size={16} /> Save Income Record
                </button>
              </div>
            </form>
          </GlassCard>

          {/* Box 2: History Table */}
          <GlassCard className="p-6 border-t-4 border-t-blue-500 shadow-xl bg-dark-card/90 overflow-hidden">
            <h3 className="text-blue-400 font-bold text-base mb-4 pb-2 border-b border-dark-border">All Other Income Records</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-dark-border rounded-xl">
                <thead className="bg-dark-hover/90 text-dark-text font-extrabold border-b border-dark-border">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Title / Description</th>
                    <th className="p-3 font-mono">Date</th>
                    <th className="p-3">Method</th>
                    <th className="p-3 text-right">Amount (Rs.)</th>
                    <th className="p-3 w-24 text-center">Edit</th>
                    <th className="p-3 w-24 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/60 text-sm">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-dark-muted italic">No income records saved yet.</td>
                    </tr>
                  ) : (
                    records.map((rec, index) => (
                      <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                        {editingRecordId === rec.id ? (
                          <>
                            <td className="p-3 font-mono text-center text-dark-muted">{index + 1}</td>
                            <td className="p-3">
                              <select value={editingRecordCat} onChange={e => setEditingRecordCat(e.target.value)} className="px-2 py-1 rounded bg-dark-hover text-xs border border-dark-border text-white">
                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                              </select>
                            </td>
                            <td className="p-3">
                              <input type="text" value={editingRecordTitle} onChange={e => setEditingRecordTitle(e.target.value)} className="w-full px-2 py-1 rounded bg-dark-hover text-xs border border-dark-border text-white" />
                            </td>
                            <td className="p-3">
                              <input type="date" value={editingRecordDate} onChange={e => setEditingRecordDate(e.target.value)} className="px-2 py-1 rounded bg-dark-hover text-xs border border-dark-border text-white font-mono" />
                            </td>
                            <td className="p-3">
                              <select value={editingRecordMethod} onChange={e => setEditingRecordMethod(e.target.value)} className="px-2 py-1 rounded bg-dark-hover text-xs border border-dark-border text-white">
                                <option value="Cash">Cash</option>
                                <option value="Bank Deposit">Bank Deposit</option>
                                <option value="JazzCash">JazzCash</option>
                                <option value="Easypaisa">Easypaisa</option>
                              </select>
                            </td>
                            <td className="p-3 text-right">
                              <input type="number" value={editingRecordAmount} onChange={e => setEditingRecordAmount(e.target.value)} className="w-24 px-2 py-1 rounded bg-dark-hover text-xs border border-dark-border font-mono text-green-400 font-bold text-right" />
                            </td>
                            <td className="p-3 text-center">
                              <button onClick={handleUpdateIncome} className="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold">Save</button>
                            </td>
                            <td className="p-3 text-center">
                              <button onClick={() => setEditingRecordId(null)} className="px-2 py-1 bg-gray-600 text-white rounded text-xs">Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 text-center font-mono text-dark-muted">{index + 1}</td>
                            <td className="p-3 font-bold text-blue-300">{rec.category}</td>
                            <td className="p-3 text-white font-semibold">{rec.title}</td>
                            <td className="p-3 font-mono text-dark-muted">{rec.date}</td>
                            <td className="p-3 text-xs text-dark-muted">{rec.method}</td>
                            <td className="p-3 text-right font-mono font-bold text-green-400">Rs. {rec.amount.toLocaleString()}</td>
                            <td className="p-3 text-center">
                              <button onClick={() => handleStartEditIncome(rec)} className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded font-bold text-xs inline-flex items-center gap-1 transition-all">
                                <Edit size={12} /> Edit
                              </button>
                            </td>
                            <td className="p-3 text-center">
                              <button onClick={() => handleDeleteIncome(rec.id)} className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded font-bold text-xs inline-flex items-center gap-1 transition-all">
                                <Trash2 size={12} /> Delete
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 3: BILLING / INVOICES (Exact Match to STASU Reference Layout) */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          {/* Title Bar with User Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
              <FileText className="text-blue-400" size={28} />
              <span>School Invoices</span>
            </h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleCreateNewInvoice}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center gap-1.5"
              >
                <Plus size={14} /> Generate Invoice
              </button>
              <span className="px-3.5 py-1.5 rounded-lg bg-black text-white font-black text-xs font-mono tracking-wider border border-white/10 shadow">
                User: 13588
              </span>
            </div>
          </div>

          {/* Debug/Info Alert Banner EXACT match to reference screenshot */}
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-2 shadow-sm">
            <span>Debug Info: Found ({schoolInvoices.length}) invoices for this user.</span>
          </div>

          {/* Invoice List Card EXACT match to reference screenshot */}
          <GlassCard className="p-6 border-t-4 border-t-blue-500 shadow-xl bg-dark-card/90 overflow-hidden">
            <h3 className="text-blue-400 font-bold text-base mb-4 pb-3 border-b border-dark-border">Invoice List</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-dark-border rounded-xl">
                <thead className="bg-dark-hover/90 text-dark-text font-extrabold border-b border-dark-border uppercase">
                  <tr>
                    <th className="p-3 w-16 text-center">#</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-right">Tax</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/60 text-sm">
                  {schoolInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5 font-mono text-center font-bold text-dark-muted">{inv.id}</td>
                      <td className="p-3.5 font-mono font-semibold text-white">{inv.dueDate}</td>
                      <td className="p-3.5 text-right font-mono text-dark-muted">{inv.subtotal.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono text-dark-muted">{inv.tax.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-green-400">{inv.total.toFixed(2)}</td>
                      <td className="p-3.5 text-center">
                        {inv.status === 'Paid' ? (
                          <span className="px-3 py-1 rounded bg-green-600 text-white font-extrabold text-xs shadow-sm inline-block min-w-[65px] text-center">
                            Paid
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded bg-red-500 text-white font-extrabold text-xs shadow-sm inline-block min-w-[65px] text-center animate-pulse">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-3 py-1 rounded border border-blue-500 text-blue-400 hover:bg-blue-600 hover:text-white font-bold text-xs transition-all shadow-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Modal for Invoice Preview / Action (Exact STASU invoice2.php White Sheet Layout with TaleemiDunya PRO Logo) */}
          {selectedInvoice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
              <div className="max-w-3xl w-full my-8 space-y-4">
                
                {/* Action Buttons Bar at Top */}
                <div className="flex items-center justify-between bg-dark-card border border-dark-border p-3.5 rounded-2xl shadow-xl">
                  <span className="text-xs font-bold text-dark-muted flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Action View Preview</span>
                  </span>
                  <div className="flex items-center gap-2.5">
                    {selectedInvoice.status === 'Unpaid' && (
                      <button
                        onClick={() => handleMarkInvoicePaid(selectedInvoice.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle size={16} /> Pay / Mark Paid
                      </button>
                    )}
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={16} /> Print / Download PDF
                    </button>
                    <button
                      onClick={() => setSelectedInvoice(null)}
                      className="px-3.5 py-2 bg-dark-hover hover:bg-red-500/20 hover:text-red-400 text-dark-muted font-bold text-xs rounded-xl transition-all border border-dark-border flex items-center gap-1 cursor-pointer"
                    >
                      <X size={16} /> Close
                    </button>
                  </div>
                </div>

                {/* Exact White Sheet Invoice Card (invoice2.php clone) */}
                <div className="bg-white text-gray-900 rounded-3xl shadow-2xl p-8 sm:p-12 relative overflow-hidden font-sans border border-gray-200">
                  
                  {/* Diagonal Stamp in Center (PAID / UNPAID) exactly like photo */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 z-10 pointer-events-none select-none transform -rotate-12">
                    {selectedInvoice.status === 'Paid' ? (
                      <div className="border-[6px] border-green-500/80 text-green-600/80 rounded-3xl px-10 py-4 font-black text-6xl sm:text-7xl tracking-[0.2em] uppercase bg-green-50/60 shadow-lg backdrop-blur-[1px]">
                        PAID
                      </div>
                    ) : (
                      <div className="border-[6px] border-red-500/80 text-red-600/80 rounded-3xl px-10 py-4 font-black text-6xl sm:text-7xl tracking-[0.2em] uppercase bg-red-50/60 shadow-lg backdrop-blur-[1px] animate-pulse">
                        UNPAID
                      </div>
                    )}
                  </div>

                  {/* Top Header Row: TaleemiDunya PRO Logo (Left) + Invoice # / Due Date (Right) */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0 relative">
                        <GraduationCap size={36} className="relative z-10" />
                        <span className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse" />
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-none flex items-center gap-1">
                          <span>TaleemiDunya</span>
                        </h1>
                        <p className="text-xs font-bold text-indigo-600 font-mono tracking-widest uppercase mt-1">
                          PRO CLOUD SYSTEMS
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right font-mono space-y-1">
                      <p className="text-sm font-bold text-gray-800">
                        Invoice #: <span className="font-extrabold text-gray-900">{selectedInvoice.id}</span>
                      </p>
                      <p className="text-sm font-semibold text-gray-600">
                        Due: <span className="text-gray-800 font-bold">{selectedInvoice.dueDate}</span>
                      </p>
                    </div>
                  </div>

                  {/* Bill To Section */}
                  <div className="mt-8 space-y-1">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Bill To:</h3>
                    <p className="text-base font-bold text-gray-800">
                      {userData?.schoolName || userData?.name || 'TaleemiDunya Pro School System'} (ID: {userData?.schoolId || '13588'})
                    </p>
                    <p className="text-sm font-mono font-bold text-gray-600 flex items-center gap-1.5 pt-0.5">
                      <Phone size={14} className="text-indigo-600 inline" />
                      <span>923133815850</span>
                    </p>
                  </div>

                  {/* Table / Item Breakdown */}
                  <div className="mt-8">
                    <div className="flex justify-between items-center py-3 border-t-2 border-b-2 border-gray-200 font-black text-gray-900 text-sm uppercase tracking-wider">
                      <span>Item</span>
                      <span>Price</span>
                    </div>

                    <div className="flex justify-between items-center py-5 border-b border-gray-100 text-gray-800 text-base font-semibold">
                      <span>erp subscription</span>
                      <span className="font-mono font-bold">Rs {selectedInvoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Totals Section */}
                  <div className="mt-6 flex justify-end">
                    <div className="w-full sm:w-64 space-y-2 text-right font-semibold text-gray-700 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-mono font-bold text-gray-900">Rs {selectedInvoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span className="font-mono font-bold text-gray-900">Rs {selectedInvoice.tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="pt-3 border-t border-gray-200 flex justify-between items-center text-blue-600 font-black text-lg sm:text-xl">
                        <span>Total:</span>
                        <span className="font-mono tracking-tight">Rs {selectedInvoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer note inside card */}
                  <div className="mt-12 pt-4 border-t border-gray-100 text-center text-xs text-gray-400 font-medium">
                    Copyright © 2015-2026 TaleemiDunya PRO Cloud. All rights reserved. • Controlled power systems
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OtherIncomeManager;
