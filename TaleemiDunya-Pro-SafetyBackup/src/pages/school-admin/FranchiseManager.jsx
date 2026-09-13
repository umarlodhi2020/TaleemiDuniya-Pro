import React, { useState, useEffect } from 'react';
import { 
  Globe, DollarSign, Award, CheckCircle2, AlertTriangle, Plus, 
  FileText, ShieldCheck, Download, Search, RefreshCw, Trash2, 
  MapPin, Calendar, Percent, UserCheck, Sparkles, X, Check, Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRecords, addRecord, deleteRecord } from '../../services/db';

const FranchiseManager = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('partners'); // 'partners', 'royalty', 'quality'
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [form, setForm] = useState({
    name: '',
    city: 'Rawalpindi',
    owner: '',
    phone: '',
    royaltyRate: '8',
    studentsCount: '450',
    signupFee: '500000',
    royaltyDue: '120000',
    royaltyPaid: '120000',
    status: 'Active',
    agreementExpiry: '2029-06-30',
    grade: 'A+ Grade'
  });

  useEffect(() => {
    fetchFranchiseData();
  }, [schoolId]);

  const fetchFranchiseData = async () => {
    setLoading(true);
    try {
      const data = await getRecords('franchise_network', schoolId);
      setFranchises(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFranchise = async (e) => {
    e.preventDefault();
    const newPartner = {
      ...form,
      royaltyRate: Number(form.royaltyRate || 8),
      studentsCount: Number(form.studentsCount || 0),
      signupFee: Number(form.signupFee || 0),
      royaltyDue: Number(form.royaltyDue || 0),
      royaltyPaid: Number(form.royaltyPaid || 0),
      complianceScore: 95,
      createdAt: new Date()
    };
    const res = await addRecord('franchise_network', newPartner, schoolId);
    if (res.success) {
      setFranchises([{ id: res.id, ...newPartner }, ...franchises]);
      setShowAddModal(false);
      setForm({
        name: '',
        city: 'Rawalpindi',
        owner: '',
        phone: '',
        royaltyRate: '8',
        studentsCount: '450',
        signupFee: '500000',
        royaltyDue: '120000',
        royaltyPaid: '120000',
        status: 'Active',
        agreementExpiry: '2029-06-30',
        grade: 'A+ Grade'
      });
    }
  };

  const handleDeleteFranchise = async (id) => {
    if (!window.confirm('Are you sure you want to terminate/remove this franchise partner record?')) return;
    await deleteRecord('franchise_network', id, schoolId);
    setFranchises(franchises.filter(f => f.id !== id));
  };

  // KPIs
  const totalPartners = franchises.length;
  const totalFranchiseStudents = franchises.reduce((acc, f) => acc + Number(f?.studentsCount || 0), 0);
  const totalRoyaltyDue = franchises.reduce((acc, f) => acc + Number(f?.royaltyDue || 0), 0);
  const totalRoyaltyCollected = franchises.reduce((acc, f) => acc + Number(f?.royaltyPaid || 0), 0);
  const royaltyPending = Math.max(totalRoyaltyDue - totalRoyaltyCollected, 0);

  const filteredFranchises = franchises.filter(f => 
    f?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f?.owner?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in select-none pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-blue-900/40 border border-purple-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-600/30">
              <Globe size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] font-black text-purple-300 uppercase tracking-widest">
                  Brand & Royalty Hub
                </span>
                <span className="text-xs text-green-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Active Chain
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white mt-1">Franchise Network Management</h1>
              <p className="text-xs text-gray-300 font-medium">
                Manage franchise partners, collect monthly royalty percentages, audit quality standards, and issue licensing agreements.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all active:scale-95"
            >
              <Plus size={16} /> Register Franchise Partner
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-card border border-dark-border p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-dark-muted uppercase tracking-wider block">Total Franchisees</span>
            <span className="text-2xl font-black text-white mt-0.5 block">{totalPartners} <span className="text-xs text-purple-400 font-normal">Registered</span></span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Globe size={24} />
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-dark-muted uppercase tracking-wider block">Franchise Student Reach</span>
            <span className="text-2xl font-black text-white mt-0.5 block">{totalFranchiseStudents.toLocaleString()} <span className="text-xs text-cyan-400 font-normal">Students</span></span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <UserCheck size={24} />
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-dark-muted uppercase tracking-wider block">Total Royalty Collected</span>
            <span className="text-2xl font-black text-emerald-400 mt-0.5 block">Rs. {totalRoyaltyCollected.toLocaleString()}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-dark-muted uppercase tracking-wider block">Pending Royalty Balance</span>
            <span className="text-2xl font-black text-amber-400 mt-0.5 block">Rs. {royaltyPending.toLocaleString()}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-card/60 border border-dark-border p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl border border-dark-border">
          <button
            onClick={() => setActiveTab('partners')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'partners'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-dark-muted hover:text-white'
            }`}
          >
            <Globe size={14} /> Franchise Directory ({franchises.length})
          </button>
          <button
            onClick={() => setActiveTab('royalty')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'royalty'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-dark-muted hover:text-white'
            }`}
          >
            <DollarSign size={14} /> Royalty & Fee Ledgers
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'quality'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-dark-muted hover:text-white'
            }`}
          >
            <Award size={14} /> Quality Audit & Compliance
          </button>
        </div>

        {activeTab === 'partners' && (
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
            <input
              type="text"
              placeholder="Search by franchise, city or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-dark-border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-medium transition-all"
            />
          </div>
        )}
      </div>

      {/* Tab 1: Franchise Partners Directory */}
      {activeTab === 'partners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFranchises.map((f) => (
            <div 
              key={f.id} 
              className="bg-dark-card border border-dark-border hover:border-purple-500/40 rounded-3xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all pointer-events-none" />
              
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 font-mono text-[10px] font-black text-purple-400">
                      Royalty: {f.royaltyRate}%
                    </span>
                    <h3 className="text-lg font-black text-white mt-3 group-hover:text-purple-300 transition-colors">
                      {f.name}
                    </h3>
                    <p className="text-xs text-dark-muted flex items-center gap-1.5 mt-1 font-medium">
                      <MapPin size={13} className="text-purple-400 flex-shrink-0" /> {f.city}, Pakistan
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    f.status === 'Active' 
                      ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                      : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  }`}>
                    <CheckCircle2 size={11} /> {f.status}
                  </span>
                </div>

                <div className="my-5 pt-4 border-t border-dark-border/60 space-y-3 text-xs">
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="text-dark-muted flex items-center gap-2 font-medium">
                      <UserCheck size={14} className="text-cyan-400" /> Franchise Owner:
                    </span>
                    <span className="font-bold text-white">{f.owner || 'Assigned Soon'}</span>
                  </div>

                  <div className="flex items-center justify-between text-gray-300">
                    <span className="text-dark-muted flex items-center gap-2 font-medium">
                      <Calendar size={14} className="text-amber-400" /> License Expiry:
                    </span>
                    <span className="font-mono text-white font-semibold">{f.agreementExpiry}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-black/30 border border-dark-border/70 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-dark-muted font-bold uppercase block">Students Count</span>
                      <span className="text-base font-black text-cyan-400">{Number(f?.studentsCount || 0).toLocaleString()}</span>
                    </div>
                    <div className="bg-black/30 border border-dark-border/70 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-dark-muted font-bold uppercase block">Quality Audit Grade</span>
                      <span className="text-base font-black text-emerald-400">{f.grade || 'A Grade'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-dark-border/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedInvoice(f)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/20 flex items-center justify-center gap-1.5 transition-all"
                >
                  <FileText size={14} /> Royalty Invoice
                </button>
                <button
                  onClick={() => handleDeleteFranchise(f.id)}
                  className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                  title="Terminate Partner Record"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Royalty Ledgers */}
      {activeTab === 'royalty' && (
        <div className="bg-dark-card border border-dark-border rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/20">
            <div>
              <h3 className="text-base font-black text-white">Consolidated Royalty Ledger & Collection</h3>
              <p className="text-xs text-dark-muted font-medium">Verify monthly percentage cuts ({franchises[0]?.royaltyRate || 8}%) due and received from partner campuses.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-dark-border text-[10px] font-black uppercase text-dark-muted tracking-wider">
                  <th className="py-3.5 px-5">Franchise Partner Name</th>
                  <th className="py-3.5 px-4">Royalty Rate (%)</th>
                  <th className="py-3.5 px-4">Students Enrolled</th>
                  <th className="py-3.5 px-4">Monthly Royalty Due</th>
                  <th className="py-3.5 px-4">Amount Paid</th>
                  <th className="py-3.5 px-4">Balance Pending</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-xs font-medium text-gray-300">
                {franchises.map((f) => {
                  const pending = Math.max(Number(f?.royaltyDue || 0) - Number(f?.royaltyPaid || 0), 0);
                  return (
                    <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-5 font-bold text-white">{f.name}</td>
                      <td className="py-4 px-4 font-mono font-bold text-purple-400">{f.royaltyRate}%</td>
                      <td className="py-4 px-4 font-mono">{Number(f?.studentsCount || 0).toLocaleString()}</td>
                      <td className="py-4 px-4 font-mono font-bold text-gray-200">Rs. {Number(f?.royaltyDue || 0).toLocaleString()}</td>
                      <td className="py-4 px-4 font-mono font-bold text-emerald-400">Rs. {Number(f?.royaltyPaid || 0).toLocaleString()}</td>
                      <td className="py-4 px-4 font-mono font-bold text-red-400">
                        {pending > 0 ? `Rs. ${pending.toLocaleString()}` : 'Cleared (Rs. 0)'}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => setSelectedInvoice(f)}
                          className="py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-[11px] border border-dark-border"
                        >
                          Generate Bill
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Quality Audit */}
      {activeTab === 'quality' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {franchises.map((f) => (
            <div key={f.id} className="bg-dark-card border border-dark-border p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-white text-base">{f.name}</h4>
                  <span className="text-[11px] text-dark-muted font-medium">{f.city} Campus</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black text-emerald-400">
                  {f.grade || 'A+ Grade'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-dark-border/40 pb-1.5">
                  <span className="text-dark-muted">Curriculum Compliance</span>
                  <span className="font-bold text-cyan-400 font-mono">{f.complianceScore || 95}%</span>
                </div>
                <div className="flex justify-between border-b border-dark-border/40 pb-1.5">
                  <span className="text-dark-muted">Staff Training Level</span>
                  <span className="font-bold text-white">Certified</span>
                </div>
                <div className="flex justify-between pb-1 text-green-400">
                  <span className="text-dark-muted">Brand Guidelines</span>
                  <span className="font-bold">100% Verified</span>
                </div>
              </div>

              <button
                onClick={() => alert(`AI Quality & Curriculum Audit Report for ${f.name} downloaded successfully.`)}
                className="w-full py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <Award size={14} /> Download Quality Certificate
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal 1: Add Franchise Partner */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-dark-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Register Franchise Partner</h3>
                  <p className="text-[11px] text-dark-muted font-medium">Link a new franchise school with royalty and compliance terms.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFranchise} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Franchise School Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TaleemiDunya Franchise - Sialkot"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">City / Location *</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Royalty Rate (%) *</label>
                  <input
                    type="number"
                    required
                    value={form.royaltyRate}
                    onChange={e => setForm({ ...form, royaltyRate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white font-mono focus:outline-none focus:border-purple-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Partner / Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Malik Kamran"
                    value={form.owner}
                    onChange={e => setForm({ ...form, owner: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +92 300 9988776"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Initial Signup Fee (Rs.)</label>
                  <input
                    type="number"
                    value={form.signupFee}
                    onChange={e => setForm({ ...form, signupFee: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Monthly Royalty Due (Rs.)</label>
                  <input
                    type="number"
                    value={form.royaltyDue}
                    onChange={e => setForm({ ...form, royaltyDue: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black shadow-lg shadow-purple-600/30 transition-all"
                >
                  Register Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Royalty Invoice Preview Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
              <FileText size={32} />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-widest">
                Official Royalty Invoice
              </span>
              <h3 className="text-lg font-black text-white mt-2">{selectedInvoice.name}</h3>
              <p className="text-xs text-dark-muted mt-1">Monthly Franchise Fee Voucher</p>
            </div>

            <div className="bg-black/40 border border-dark-border p-4 rounded-2xl text-left space-y-2.5 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Franchise Owner</span>
                <span className="font-bold text-white">{selectedInvoice.owner}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Contract Rate</span>
                <span className="font-mono font-bold text-purple-400">{selectedInvoice.royaltyRate}% Royalty</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Enrolled Students</span>
                <span className="font-mono text-white">{selectedInvoice.studentsCount} Students</span>
              </div>
              <div className="flex justify-between border-t border-dark-border/60 pt-2 text-sm font-black text-white">
                <span>Total Amount Due:</span>
                <span className="text-emerald-400 font-mono">Rs. {Number(selectedInvoice.royaltyDue).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  alert(`Invoice sent to ${selectedInvoice.name} via WhatsApp & Email successfully!`);
                  setSelectedInvoice(null);
                }}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition-all"
              >
                Send Invoice Voucher
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FranchiseManager;
