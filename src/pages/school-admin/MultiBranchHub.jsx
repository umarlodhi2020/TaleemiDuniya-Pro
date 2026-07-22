import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, ArrowRightLeft, Users, DollarSign, TrendingUp, 
  MapPin, Phone, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, 
  Trash2, Edit3, ExternalLink, Globe, Search, Filter, Sparkles, X, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRecords, addRecord, deleteRecord, updateRecord } from '../../services/db';

const MultiBranchHub = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [branches, setBranches] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'transfers', 'analytics'
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Add Branch Form
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    city: 'Lahore',
    principal: '',
    phone: '',
    studentsCount: '',
    staffCount: '',
    revenueTarget: '500000',
    currentRevenue: '0',
    status: 'Active'
  });

  // Transfer Form
  const [transferForm, setTransferForm] = useState({
    studentName: '',
    rollNo: '',
    fromBranch: 'Main Campus - Lahore',
    toBranch: 'Girls Branch - Johar Town',
    reason: 'Family Relocation / Residential Shift',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchBranchesData();
  }, [schoolId]);

  const fetchBranchesData = async () => {
    setLoading(true);
    try {
      const data = await getRecords('branches', schoolId);
      setBranches(Array.isArray(data) ? data : []);

      // Fetch transfers
      const transferData = await getRecords('inter_branch_transfers', schoolId);
      setTransfers(Array.isArray(transferData) ? transferData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    const newBranch = {
      ...branchForm,
      studentsCount: Number(branchForm.studentsCount || 0),
      staffCount: Number(branchForm.staffCount || 0),
      revenueTarget: Number(branchForm.revenueTarget || 0),
      currentRevenue: Number(branchForm.currentRevenue || 0),
      attendanceRate: 95.0,
      createdAt: new Date()
    };

    const res = await addRecord('branches', newBranch, schoolId);
    if (res.success) {
      setBranches([...branches, { id: res.id, ...newBranch }]);
      setShowAddModal(false);
      setBranchForm({
        name: '',
        code: '',
        city: 'Lahore',
        principal: '',
        phone: '',
        studentsCount: '',
        staffCount: '',
        revenueTarget: '500000',
        currentRevenue: '0',
        status: 'Active'
      });
    }
  };

  const handleDeleteBranch = async (id) => {
    if (!window.confirm('Are you sure you want to remove this branch from the hub network?')) return;
    await deleteRecord('branches', id, schoolId);
    setBranches(branches.filter(b => b.id !== id));
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    const newTransfer = {
      ...transferForm,
      status: 'Approved',
      createdAt: new Date()
    };
    const res = await addRecord('inter_branch_transfers', newTransfer, schoolId);
    if (res.success) {
      setTransfers([{ id: res.id, ...newTransfer }, ...transfers]);
      setShowTransferModal(false);
      setTransferForm({
        studentName: '',
        rollNo: '',
        fromBranch: branches[0]?.name || 'Main Campus',
        toBranch: branches[1]?.name || 'Branch #2',
        reason: 'Family Relocation / Residential Shift',
        date: new Date().toISOString().split('T')[0]
      });
    }
  };

  // KPI Calculations
  const totalStudents = branches.reduce((acc, b) => acc + Number(b?.studentsCount || 0), 0);
  const totalStaff = branches.reduce((acc, b) => acc + Number(b?.staffCount || 0), 0);
  const totalRevenue = branches.reduce((acc, b) => acc + Number(b?.currentRevenue || 0), 0);
  const avgAttendance = branches.length > 0 
    ? (branches.reduce((acc, b) => acc + Number(b?.attendanceRate || 95), 0) / branches.length).toFixed(1) 
    : '95.0';

  const filteredBranches = branches.filter(b => 
    b?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b?.principal?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in select-none pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 border border-blue-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
              <Building2 size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-black text-blue-300 uppercase tracking-widest">
                  Multi-Campus Network
                </span>
                <span className="text-xs text-green-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" /> Synchronized Live
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white mt-1">Multi-Branch Central Hub</h1>
              <p className="text-xs text-gray-300 font-medium">
                Monitor, control, and transfer students/staff across all your school campuses from one executive control desk.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowTransferModal(true)}
              className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-2 transition-all active:scale-95 shadow-md"
            >
              <ArrowRightLeft size={15} className="text-cyan-400" /> Inter-Branch Transfer
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              <Plus size={16} /> Add New Campus Branch
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-card border border-dark-border p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-dark-muted uppercase tracking-wider block">Total Network Campuses</span>
            <span className="text-2xl font-black text-white mt-0.5 block">{branches.length} <span className="text-xs text-cyan-400 font-normal">Active Branches</span></span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Building2 size={24} />
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-dark-muted uppercase tracking-wider block">Total Network Strength</span>
            <span className="text-2xl font-black text-white mt-0.5 block">{totalStudents.toLocaleString()} <span className="text-xs text-purple-400 font-normal">Students</span></span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-dark-muted uppercase tracking-wider block">Total Network Faculty</span>
            <span className="text-2xl font-black text-white mt-0.5 block">{totalStaff} <span className="text-xs text-emerald-400 font-normal">Teachers & Staff</span></span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-dark-muted uppercase tracking-wider block">Network Monthly Revenue</span>
            <span className="text-2xl font-black text-emerald-400 mt-0.5 block">Rs. {(totalRevenue / 100000).toFixed(2)} Lakhs</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Tabs & Search Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-card/60 border border-dark-border p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl border border-dark-border">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-dark-muted hover:text-white'
            }`}
          >
            <Building2 size={14} /> Campus Directory ({branches.length})
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'transfers'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-dark-muted hover:text-white'
            }`}
          >
            <ArrowRightLeft size={14} /> Inter-Branch Transfers ({transfers.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-dark-muted hover:text-white'
            }`}
          >
            <TrendingUp size={14} /> Network Financial Analytics
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
            <input
              type="text"
              placeholder="Search by campus, code or principal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-dark-border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-medium transition-all"
            />
          </div>
        )}
      </div>

      {/* Tab 1: Campus Directory Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((b) => {
            const revenueProgress = b.revenueTarget > 0 
              ? Math.min(Math.round((b.currentRevenue / b.revenueTarget) * 100), 100) 
              : 85;

            return (
              <div 
                key={b.id} 
                className="bg-dark-card border border-dark-border hover:border-blue-500/40 rounded-3xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
                
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 font-mono text-[10px] font-black text-blue-400">
                        {b.code}
                      </span>
                      <h3 className="text-lg font-black text-white mt-3 group-hover:text-blue-300 transition-colors">
                        {b.name}
                      </h3>
                      <p className="text-xs text-dark-muted flex items-center gap-1.5 mt-1 font-medium">
                        <MapPin size={13} className="text-cyan-400 flex-shrink-0" /> {b.city}, Pakistan
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={11} /> {b.status}
                    </span>
                  </div>

                  <div className="my-5 pt-4 border-t border-dark-border/60 space-y-3 text-xs">
                    <div className="flex items-center justify-between text-gray-300">
                      <span className="text-dark-muted flex items-center gap-2 font-medium">
                        <ShieldCheck size={14} className="text-purple-400" /> Campus Principal:
                      </span>
                      <span className="font-bold text-white">{b.principal || 'Assigned Soon'}</span>
                    </div>

                    <div className="flex items-center justify-between text-gray-300">
                      <span className="text-dark-muted flex items-center gap-2 font-medium">
                        <Phone size={14} className="text-emerald-400" /> Helpline Contact:
                      </span>
                      <span className="font-mono text-white font-semibold">{b.phone || 'N/A'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-black/30 border border-dark-border/70 p-3 rounded-xl text-center">
                        <span className="text-[10px] text-dark-muted font-bold uppercase block">Enrolled Students</span>
                        <span className="text-base font-black text-cyan-400">{Number(b?.studentsCount || 0).toLocaleString()}</span>
                      </div>
                      <div className="bg-black/30 border border-dark-border/70 p-3 rounded-xl text-center">
                        <span className="text-[10px] text-dark-muted font-bold uppercase block">Teaching Faculty</span>
                        <span className="text-base font-black text-purple-400">{b.staffCount || 0}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between text-[10px] font-bold mb-1.5">
                        <span className="text-dark-muted">Revenue Target Progress</span>
                        <span className="text-emerald-400 font-mono">Rs. {Number(b?.currentRevenue || 0).toLocaleString()} ({revenueProgress}%)</span>
                      </div>
                      <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-dark-border/50">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500" 
                          style={{ width: `${revenueProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-dark-border/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => alert(`Switching Active Workplace context to: ${b.name}... Complete.`)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-bold text-xs border border-blue-500/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Globe size={14} /> Switch to Branch
                  </button>
                  <button
                    onClick={() => handleDeleteBranch(b.id)}
                    className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                    title="Delete Campus Record"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Inter-Branch Transfers */}
      {activeTab === 'transfers' && (
        <div className="bg-dark-card border border-dark-border rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/20">
            <div>
              <h3 className="text-base font-black text-white">Inter-Campus Transfer Logs</h3>
              <p className="text-xs text-dark-muted font-medium">Record and approve student or faculty transfers between campuses without data loss.</p>
            </div>
            <button
              onClick={() => setShowTransferModal(true)}
              className="py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
            >
              <Plus size={15} /> New Transfer Request
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-dark-border text-[10px] font-black uppercase text-dark-muted tracking-wider">
                  <th className="py-3.5 px-5">Student / Faculty Member</th>
                  <th className="py-3.5 px-4">Roll / ID Number</th>
                  <th className="py-3.5 px-4">Transfer From Branch</th>
                  <th className="py-3.5 px-4">Transfer To Branch</th>
                  <th className="py-3.5 px-4">Reason for Relocation</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-5 text-right">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-xs font-medium text-gray-300">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-5 font-bold text-white flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-xs">
                        {t.studentName.charAt(0)}
                      </div>
                      {t.studentName}
                    </td>
                    <td className="py-4 px-4 font-mono text-cyan-400 font-semibold">{t.rollNo}</td>
                    <td className="py-4 px-4 font-semibold text-gray-400">{t.fromBranch}</td>
                    <td className="py-4 px-4 font-bold text-indigo-300 flex items-center gap-1.5">
                      <ArrowRightLeft size={13} className="text-cyan-400" /> {t.toBranch}
                    </td>
                    <td className="py-4 px-4 text-dark-muted max-w-xs truncate">{t.reason}</td>
                    <td className="py-4 px-4 font-mono text-[11px] text-gray-400">{t.date}</td>
                    <td className="py-4 px-5 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                        t.status === 'Approved' 
                          ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                      }`}>
                        {t.status === 'Approved' ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />} {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Financial Analytics */}
      {activeTab === 'analytics' && (
        <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-2xl space-y-6">
          <div>
            <h3 className="text-lg font-black text-white">Consolidated Branch Performance Comparison</h3>
            <p className="text-xs text-dark-muted font-medium">Compare monthly collection, student enrollment, and active targets across campuses.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {branches.map((b) => (
              <div key={b.id} className="bg-black/30 border border-dark-border p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-white text-base">{b.name}</h4>
                    <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase">{b.code}</span>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-400">Rs. {Number(b?.currentRevenue || 0).toLocaleString()}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-dark-border/40 pb-1.5">
                    <span className="text-dark-muted">Revenue Target</span>
                    <span className="font-bold text-gray-300 font-mono">Rs. {Number(b?.revenueTarget || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-dark-border/40 pb-1.5">
                    <span className="text-dark-muted">Student per Teacher Ratio</span>
                    <span className="font-bold text-cyan-400 font-mono">
                      {b.staffCount > 0 ? (b.studentsCount / b.staffCount).toFixed(1) : 0} : 1
                    </span>
                  </div>
                  <div className="flex justify-between pb-1 text-green-400">
                    <span className="text-dark-muted">Campus Efficiency Score</span>
                    <span className="font-black">98.4% (A+ Grade)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal 1: Add New Campus Branch */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-dark-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Add New Campus Branch</h3>
                  <p className="text-[11px] text-dark-muted font-medium">Expand your school network by linking a new campus code.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Campus Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Campus - Model Town"
                  value={branchForm.name}
                  onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Branch Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TD-MT-04"
                    value={branchForm.code}
                    onChange={e => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">City / Region *</label>
                  <input
                    type="text"
                    required
                    value={branchForm.city}
                    onChange={e => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Principal / Incharge Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sir Naveed Qureshi"
                    value={branchForm.principal}
                    onChange={e => setBranchForm({ ...branchForm, principal: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +92 300 1122334"
                    value={branchForm.phone}
                    onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-medium font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Enrolled Students Count</label>
                  <input
                    type="number"
                    placeholder="e.g. 350"
                    value={branchForm.studentsCount}
                    onChange={e => setBranchForm({ ...branchForm, studentsCount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Teaching Staff Count</label>
                  <input
                    type="number"
                    placeholder="e.g. 28"
                    value={branchForm.staffCount}
                    onChange={e => setBranchForm({ ...branchForm, staffCount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Monthly Revenue Target (Rs.)</label>
                  <input
                    type="number"
                    value={branchForm.revenueTarget}
                    onChange={e => setBranchForm({ ...branchForm, revenueTarget: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Current Collection (Rs.)</label>
                  <input
                    type="number"
                    value={branchForm.currentRevenue}
                    onChange={e => setBranchForm({ ...branchForm, currentRevenue: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
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
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black shadow-lg shadow-blue-600/30 transition-all"
                >
                  Save Campus Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Inter-Branch Transfer Request */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-dark-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-black">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Initiate Inter-Campus Transfer</h3>
                  <p className="text-[11px] text-dark-muted font-medium">Seamlessly shift student or teacher profile without data loss.</p>
                </div>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Usman Ali"
                    value={transferForm.studentName}
                    onChange={e => setTransferForm({ ...transferForm, studentName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Roll / Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STD-2024-301"
                    value={transferForm.rollNo}
                    onChange={e => setTransferForm({ ...transferForm, rollNo: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Transfer From Branch *</label>
                  <select
                    value={transferForm.fromBranch}
                    onChange={e => setTransferForm({ ...transferForm, fromBranch: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white font-semibold focus:outline-none focus:border-cyan-500"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.name} className="bg-dark-card text-white">{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Transfer To Branch *</label>
                  <select
                    value={transferForm.toBranch}
                    onChange={e => setTransferForm({ ...transferForm, toBranch: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white font-semibold focus:outline-none focus:border-cyan-500"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.name} className="bg-dark-card text-white">{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1">Reason for Relocation *</label>
                <textarea
                  rows="2"
                  required
                  placeholder="Explain why the student/staff is moving to another campus..."
                  value={transferForm.reason}
                  onChange={e => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-dark-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-black shadow-lg shadow-cyan-500/20 transition-all"
                >
                  Confirm Instant Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiBranchHub;
