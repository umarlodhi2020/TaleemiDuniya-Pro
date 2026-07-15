import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import {
  Bus, MapPin, User, Users, Plus, Edit2, Trash2, DollarSign,
  Phone, CheckCircle2, AlertCircle, RefreshCw, Save, X, Navigation
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const TransportManager = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [vans, setVans] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('VANS'); // 'VANS' or 'ALLOCATIONS'

  const [form, setForm] = useState({
    vanNumber: '',
    routeName: '',
    driverName: '',
    driverPhone: '',
    capacity: '18',
    monthlyFee: '2500',
    stops: 'Model Town, DHA, Kalma Chowk'
  });

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'transport_vans'));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(v => !v.schoolId || v.schoolId === schoolId);

      if (list.length === 0) {
        // Demo default vans
        setVans([
          {
            id: 'demo-van-1',
            vanNumber: 'LHR-402 (Bus #1)',
            routeName: 'Johar Town / Model Town Route',
            driverName: 'Ustad Aslam',
            driverPhone: '0300-4455667',
            capacity: '20',
            monthlyFee: 3000,
            stops: 'Barkat Market, Model Town Link Road, Johar Town G-Block',
            allocatedCount: 16
          },
          {
            id: 'demo-van-2',
            vanNumber: 'LEA-908 (Van #2)',
            routeName: 'DHA / Cantt Express Route',
            driverName: 'Muhammad Tariq',
            driverPhone: '0321-9988776',
            capacity: '16',
            monthlyFee: 4500,
            stops: 'DHA Phase 3, Phase 5, Cavalry Ground',
            allocatedCount: 14
          }
        ]);
      } else {
        setVans(list);
      }

      // Fetch students for allocation view
      const stSnap = await getDocs(collection(db, 'students'));
      setStudents(stSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVan = async (e) => {
    e.preventDefault();
    if (!form.vanNumber || !form.routeName) return;

    try {
      const payload = {
        ...form,
        monthlyFee: Number(form.monthlyFee) || 0,
        allocatedCount: 0,
        schoolId,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'transport_vans', editingId), payload);
        setVans(prev => prev.map(v => v.id === editingId ? { ...v, ...payload } : v));
      } else {
        const docRef = await addDoc(collection(db, 'transport_vans'), { ...payload, createdAt: serverTimestamp() });
        setVans(prev => [{ id: docRef.id, ...payload }, ...prev]);
      }

      setShowAddModal(false);
      setEditingId(null);
      setForm({ vanNumber: '', routeName: '', driverName: '', driverPhone: '', capacity: '18', monthlyFee: '2500', stops: '' });
    } catch (err) {
      alert(`Error saving transport van: ${err.message}`);
    }
  };

  const handleDeleteVan = async (id) => {
    if (!confirm('Delete this transport van?')) return;
    try {
      if (!id.startsWith('demo-')) {
        await deleteDoc(doc(db, 'transport_vans', id));
      }
      setVans(prev => prev.filter(v => v.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  const startEdit = (van) => {
    setEditingId(van.id);
    setForm({ ...van });
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-primary-500 mr-3" size={32} />
        <p className="text-dark-muted font-bold">Loading Transport & Bus Route Fleet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Bus className="text-amber-400" size={32} />
            School Bus & Van Transport Fleet Manager
          </h1>
          <p className="text-dark-muted mt-1 font-medium">
            Manage school buses, van routes, stop-wise transport fees, and driver emergency contacts.
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm({ vanNumber: '', routeName: '', driverName: '', driverPhone: '', capacity: '18', monthlyFee: '2500', stops: '' }); setShowAddModal(true); }}
          className="premium-button-primary flex items-center gap-2 self-start md:self-auto"
        >
          <Plus size={18} /> Add New Van / Route
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-5 border-l-4 border-l-amber-500">
          <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Total Fleet Vehicles</p>
          <p className="text-3xl font-black text-amber-400 mt-1">{vans.length} <span className="text-xs text-dark-muted font-normal">Buses / Vans</span></p>
        </GlassCard>
        <GlassCard className="p-5 border-l-4 border-l-cyan-500">
          <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Total Seating Capacity</p>
          <p className="text-3xl font-black text-cyan-400 mt-1">
            {vans.reduce((sum, v) => sum + Number(v.capacity || 0), 0)} <span className="text-xs text-dark-muted font-normal">Seats</span>
          </p>
        </GlassCard>
        <GlassCard className="p-5 border-l-4 border-l-green-500">
          <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Allocated Students</p>
          <p className="text-3xl font-black text-green-400 mt-1">
            {vans.reduce((sum, v) => sum + Number(v.allocatedCount || 0), 0)} <span className="text-xs text-dark-muted font-normal">Students</span>
          </p>
        </GlassCard>
        <GlassCard className="p-5 border-l-4 border-l-purple-500">
          <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Est. Monthly Transport Revenue</p>
          <p className="text-3xl font-black text-purple-400 mt-1">
            Rs. {vans.reduce((sum, v) => sum + Number(v.monthlyFee || 0) * Number(v.allocatedCount || 15), 0).toLocaleString()}
          </p>
        </GlassCard>
      </div>

      {/* FLEET GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vans.map((van) => (
          <GlassCard key={van.id} className="p-6 rounded-3xl border-2 border-dark-border hover:border-amber-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-dark-border mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black">
                    <Bus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{van.vanNumber}</h3>
                    <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                      <Navigation size={12} /> {van.routeName}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => startEdit(van)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"><Edit2 size={15} /></button>
                  <button onClick={() => handleDeleteVan(van.id)} className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 my-4">
                <div className="p-3 rounded-2xl bg-white/5 space-y-0.5">
                  <span className="text-[10px] font-bold text-dark-muted uppercase block">Driver Contact</span>
                  <span className="text-sm font-black text-white block">{van.driverName}</span>
                  <span className="text-xs font-mono text-cyan-300 block">{van.driverPhone}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 space-y-0.5">
                  <span className="text-[10px] font-bold text-dark-muted uppercase block">Monthly Transport Fee</span>
                  <span className="text-lg font-black text-green-400 block">Rs. {Number(van.monthlyFee).toLocaleString()}</span>
                  <span className="text-[10px] text-dark-muted block">Per Student / Month</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#151926] border border-white/5 my-4">
                <span className="text-[10px] font-black text-dark-muted uppercase tracking-wider block mb-1">Assigned Route Stops:</span>
                <p className="text-xs text-gray-300 font-medium leading-relaxed">{van.stops || 'No specific stops configured'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-dark-border flex items-center justify-between text-xs">
              <span className="text-dark-muted font-bold flex items-center gap-1.5">
                <Users size={14} className="text-cyan-400" />
                Capacity: <strong className="text-white font-black">{van.allocatedCount || 15} / {van.capacity}</strong> Seats Allocated
              </span>
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 font-black text-[10px] uppercase">
                Active Route ✓
              </span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* ADD / EDIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <GlassCard className="p-8 w-full max-w-lg rounded-3xl border-2 border-amber-500/60 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-dark-border mb-6">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Bus className="text-amber-400" size={22} />
                {editingId ? 'Edit Transport Van / Route' : 'Add New Van & Driver'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveVan} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Van / Bus Number</label>
                  <input type="text" required value={form.vanNumber} onChange={e => setForm(f => ({ ...f, vanNumber: e.target.value }))} placeholder="e.g. LHR-402 (Bus #1)" className="w-full premium-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Route Name</label>
                  <input type="text" required value={form.routeName} onChange={e => setForm(f => ({ ...f, routeName: e.target.value }))} placeholder="e.g. Model Town Express Route" className="w-full premium-input text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Driver Name</label>
                  <input type="text" required value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} placeholder="e.g. Ustad Aslam" className="w-full premium-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Driver Mobile Phone</label>
                  <input type="text" required value={form.driverPhone} onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))} placeholder="e.g. 0300-4455667" className="w-full premium-input text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Total Seating Capacity</label>
                  <input type="number" required value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="18" className="w-full premium-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Monthly Transport Fee (PKR)</label>
                  <input type="number" required value={form.monthlyFee} onChange={e => setForm(f => ({ ...f, monthlyFee: e.target.value }))} placeholder="3000" className="w-full premium-input text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-dark-muted mb-1">Route Stops (Comma separated)</label>
                <textarea rows="2" value={form.stops} onChange={e => setForm(f => ({ ...f, stops: e.target.value }))} placeholder="e.g. Barkat Market, Garden Town, Kalma Chowk, Model Town Link Road" className="w-full premium-input text-sm" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-dark-border">
                <button type="submit" className="flex-1 premium-button-primary flex items-center justify-center gap-2"><Save size={16} /> Save Fleet Vehicle</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 premium-button-secondary">Cancel</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default TransportManager;
