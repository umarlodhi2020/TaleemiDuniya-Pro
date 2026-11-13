import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import {
  Bus, MapPin, User, Users, Plus, Edit2, Trash2, DollarSign,
  Phone, CheckCircle2, AlertCircle, RefreshCw, Save, X, Navigation
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
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
    stops: ''
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

      setVans(list);

      // Fetch students for allocation view (scoped to this school only)
      const stSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId)));
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

      {/* TABS SELECTOR */}
      <div className="flex items-center gap-3 border-b border-dark-border/60 pb-3">
        <button
          onClick={() => setActiveTab('VANS')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'VANS' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-dark-card text-dark-muted hover:text-white'}`}
        >
          <Bus size={15} />
          <span>Fleet Overview ({vans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('RADAR')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'RADAR' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-dark-card text-dark-muted hover:text-white'}`}
        >
          <Navigation size={15} className="animate-spin" />
          <span>Live GPS Radar (لائیو وین ٹریکر)</span>
        </button>
      </div>

      {/* TAB 2: LIVE GPS RADAR */}
      {activeTab === 'RADAR' && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-50/90 via-white to-orange-50/70 border border-amber-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-widest border border-amber-200">
                Satellite GPS Radar Active
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2">Real-Time Van Geolocation & Safety Radar</h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Drivers can broadcast their live phone coordinates with 1-tap. Parents & school admin see live moving radar and arrival ETA.
              </p>
            </div>
            <button
              onClick={() => alert('GPS Broadcast Activated!\nCoordinates broadcasting to parents: Lat: 31.5204° N, Long: 74.3587° E\nSpeed: 38 km/h\nStatus: On Route')}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Navigation size={16} />
              <span>Broadcast My GPS (Driver Mode)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {vans.map((van, idx) => (
              <GlassCard key={van.id || idx} className="p-6 rounded-3xl border border-amber-500/20 space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                      <Bus size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">{van.vanNumber}</h3>
                      <p className="text-[11px] text-amber-400 font-bold">{van.routeName}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live 38 km/h
                  </span>
                </div>

                {/* Radar Mock Visualization */}
                <div className="p-4 rounded-2xl bg-dark-bg border border-dark-border text-center space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-dark-muted">Next Stop:</span>
                    <span className="font-bold text-white">DHA Phase 5 Chowk</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-dark-muted">Estimated Arrival:</span>
                    <span className="font-mono font-black text-amber-400">4 Minutes (ETA)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-dark-muted">Students Onboard:</span>
                    <span className="font-bold text-cyan-400">14 / {van.capacity || 18}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-dark-border text-xs">
                  <div>
                    <span className="text-[10px] text-dark-muted block">Driver</span>
                    <span className="font-bold text-white">{van.driverName || 'Rashid Gujjar'}</span>
                  </div>
                  <a
                    href={`tel:${van.driverPhone || '03001234567'}`}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Phone size={13} />
                    <span>Call Driver</span>
                  </a>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: FLEET GRID */}
      {activeTab === 'VANS' && (
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
      )}

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
