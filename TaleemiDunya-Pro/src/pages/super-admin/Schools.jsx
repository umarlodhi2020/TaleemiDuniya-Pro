import React, { useState, useEffect, useCallback } from 'react';
import {
  School, Plus, Search, CheckCircle2, XCircle, Calendar,
  CreditCard, Edit, Trash2, ShieldAlert, ShieldCheck,
  Filter, Users, Mail, RefreshCw, Loader2
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const planColors = {
  Basic: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Premium: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Enterprise: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

const SchoolsManager = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'schools'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSchools(data);
    } catch (error) {
      console.error('Error fetching schools:', error);
      showToast('error', 'Failed to load schools. Check Firestore rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const toggleStatus = async (school) => {
    const newStatus = school.status === 'active' ? 'inactive' : 'active';
    setActionLoading(school.id + '-status');
    try {
      await updateDoc(doc(db, 'schools', school.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      setSchools(prev => prev.map(s => s.id === school.id ? { ...s, status: newStatus } : s));
      showToast('success', `School ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`);
    } catch (error) {
      console.error(error);
      showToast('error', 'Failed to update status. Check permissions.');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteSchool = async (id) => {
    setActionLoading(id + '-delete');
    try {
      await deleteDoc(doc(db, 'schools', id));
      setSchools(prev => prev.filter(s => s.id !== id));
      setDeleteConfirm(null);
      showToast('success', 'School permanently deleted.');
    } catch (error) {
      console.error(error);
      showToast('error', 'Failed to delete school. Check permissions.');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = schools.filter(s => {
    const matchSearch =
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.adminEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchPlan = filterPlan === 'all' || s.plan === filterPlan;
    return matchSearch && matchStatus && matchPlan;
  });

  const activeCount = schools.filter(s => s.status === 'active').length;
  const inactiveCount = schools.filter(s => s.status !== 'active').length;
  const totalRevenue = schools.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.revenue || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-fade-in ${
          toast.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <School className="text-primary-500" size={28} /> School Management
          </h1>
          <p className="text-dark-muted mt-1">Manage, activate, and monitor all school tenants.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchSchools}
            className="p-2.5 hover:bg-dark-hover rounded-xl text-dark-muted hover:text-white transition-all border border-dark-border"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/super-admin/schools/add')}
            className="premium-button-primary"
          >
            <Plus size={18} /> Onboard New School
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-5 border-b-2 border-primary-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Total Schools</p>
              <h3 className="text-3xl font-black mt-1">{schools.length}</h3>
            </div>
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500"><School size={20} /></div>
          </div>
        </GlassCard>
        <GlassCard className="p-5 border-b-2 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Active</p>
              <h3 className="text-3xl font-black mt-1 text-green-400">{activeCount}</h3>
            </div>
            <div className="p-2 rounded-xl bg-green-500/10 text-green-400"><CheckCircle2 size={20} /></div>
          </div>
        </GlassCard>
        <GlassCard className="p-5 border-b-2 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Inactive</p>
              <h3 className="text-3xl font-black mt-1 text-red-400">{inactiveCount}</h3>
            </div>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400"><ShieldAlert size={20} /></div>
          </div>
        </GlassCard>
        <GlassCard className="p-5 border-b-2 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Monthly Revenue</p>
              <h3 className="text-2xl font-black mt-1 text-amber-400">PKR {totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><CreditCard size={20} /></div>
          </div>
        </GlassCard>
      </div>

      {/* Search + Filter */}
      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
            <input
              type="text"
              placeholder="Search by school name, city or email..."
              className="w-full premium-input pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`premium-button-secondary flex items-center gap-2 ${showFilters ? 'border-primary-500/50 text-primary-400' : ''}`}
          >
            <Filter size={16} /> Filters
            {(filterStatus !== 'all' || filterPlan !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-primary-500" />
            )}
          </button>
          <button
            onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterPlan('all'); }}
            className="p-2.5 hover:bg-dark-hover rounded-xl text-dark-muted hover:text-white transition-all"
            title="Reset Filters"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 mb-4 p-4 bg-dark-hover rounded-xl border border-dark-border">
            <div>
              <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest mb-2">Status</p>
              <div className="flex gap-2">
                {['all', 'active', 'inactive'].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filterStatus === s ? 'bg-primary-500 text-white' : 'bg-dark-card text-dark-muted hover:text-white border border-dark-border'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest mb-2">Plan</p>
              <div className="flex gap-2">
                {['all', 'Basic', 'Premium', 'Enterprise'].map(p => (
                  <button key={p} onClick={() => setFilterPlan(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterPlan === p ? 'bg-primary-500 text-white' : 'bg-dark-card text-dark-muted hover:text-white border border-dark-border'}`}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-dark-muted gap-3">
            <Loader2 size={36} className="animate-spin text-primary-500" />
            <p className="text-sm font-medium">Loading schools from database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-widest font-black">
                  <th className="pb-4 px-3">School Details</th>
                  <th className="pb-4 px-3">Students / Staff</th>
                  <th className="pb-4 px-3">Plan</th>
                  <th className="pb-4 px-3">Expiry</th>
                  <th className="pb-4 px-3 text-center">Status</th>
                  <th className="pb-4 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-dark-muted">
                      <School size={36} className="mx-auto mb-3 opacity-30" />
                      <p className="font-semibold">No schools found.</p>
                      <p className="text-xs mt-1">Click "Onboard New School" to add one.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((school) => (
                    <tr key={school.id} className="group hover:bg-white/5 transition-all">
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-dark-hover border border-dark-border flex items-center justify-center text-primary-500 font-bold text-base group-hover:border-primary-500/40 transition-all shrink-0">
                            {school.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-sm group-hover:text-primary-400 transition-colors">{school.name}</p>
                            <p className="text-xs text-dark-muted">{school.city}</p>
                            <p className="text-xs text-dark-muted flex items-center gap-1 mt-0.5">
                              <Mail size={10} /> {school.adminEmail}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="space-y-1">
                          <p className="text-xs text-dark-muted flex items-center gap-1.5">
                            <Users size={11} className="text-blue-400" />
                            <span className="font-bold text-white">{school.students || 0}</span> students
                          </p>
                          <p className="text-xs text-dark-muted flex items-center gap-1.5">
                            <Users size={11} className="text-purple-400" />
                            <span className="font-bold text-white">{school.staff || 0}</span> staff
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${planColors[school.plan] || 'bg-dark-hover text-dark-muted'}`}>
                          {school.plan || 'Basic'}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-1.5 text-xs text-dark-muted">
                          <Calendar size={12} />
                          {school.expiry || '—'}
                        </div>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                          school.status === 'active'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {school.status === 'active' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {school.status}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleStatus(school)}
                            disabled={actionLoading === school.id + '-status'}
                            title={school.status === 'active' ? 'Deactivate School' : 'Activate School'}
                            className={`p-2 rounded-lg transition-all text-xs flex items-center gap-1 font-bold disabled:opacity-50 ${
                              school.status === 'active'
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            }`}
                          >
                            {actionLoading === school.id + '-status'
                              ? <Loader2 size={14} className="animate-spin" />
                              : school.status === 'active'
                              ? <><XCircle size={14} /><span className="hidden md:inline">Deactivate</span></>
                              : <><ShieldCheck size={14} /><span className="hidden md:inline">Activate</span></>
                            }
                          </button>
                          <button
                            onClick={() => navigate(`/super-admin/schools/edit/${school.id}`)}
                            title="Edit School"
                            className="p-2 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 rounded-lg transition-all flex items-center gap-1 text-xs font-bold"
                          >
                            <Edit size={14} />
                            <span className="hidden md:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(school.id)}
                            title="Delete School"
                            className="p-2 bg-dark-hover text-dark-muted hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {filtered.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dark-border flex items-center justify-between text-xs text-dark-muted">
                <span>Showing <strong className="text-white">{filtered.length}</strong> of <strong className="text-white">{schools.length}</strong> schools</span>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="p-8 w-full max-w-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-400" size={26} />
            </div>
            <h2 className="text-xl font-bold mb-2">Delete School?</h2>
            <p className="text-dark-muted text-sm mb-6">
              This will permanently remove <strong className="text-white">
                {schools.find(s => s.id === deleteConfirm)?.name}
              </strong> from the database. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteSchool(deleteConfirm)}
                disabled={!!actionLoading}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 premium-button-secondary py-3"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default SchoolsManager;
