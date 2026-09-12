import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import {
  Bed, Home, User, Users, Plus, Edit2, Trash2, DollarSign,
  Utensils, CheckCircle2, AlertCircle, RefreshCw, Save, X, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const HostelManager = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    roomNumber: '',
    hostelName: 'Boys Hostel Wing A',
    totalBeds: '4',
    roomFeeMonthly: '4000',
    messFeeMonthly: '6500',
    wardenName: 'Sir Rizwan'
  });

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'hostel_rooms'));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => !r.schoolId || r.schoolId === schoolId);

      setRooms(list);

      const stSnap = await getDocs(collection(db, 'students'));
      setStudents(stSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    if (!form.roomNumber) return;

    try {
      const payload = {
        ...form,
        totalBeds: Number(form.totalBeds) || 4,
        occupiedBeds: 0,
        roomFeeMonthly: Number(form.roomFeeMonthly) || 0,
        messFeeMonthly: Number(form.messFeeMonthly) || 0,
        schoolId,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'hostel_rooms', editingId), payload);
        setRooms(prev => prev.map(r => r.id === editingId ? { ...r, ...payload } : r));
      } else {
        const docRef = await addDoc(collection(db, 'hostel_rooms'), { ...payload, createdAt: serverTimestamp() });
        setRooms(prev => [{ id: docRef.id, ...payload }, ...prev]);
      }

      setShowAddModal(false);
      setEditingId(null);
      setForm({ roomNumber: '', hostelName: 'Boys Hostel Wing A', totalBeds: '4', roomFeeMonthly: '4000', messFeeMonthly: '6500', wardenName: 'Sir Rizwan' });
    } catch (err) {
      alert(`Error saving room: ${err.message}`);
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!confirm('Delete hostel room configuration?')) return;
    try {
      if (!id.startsWith('demo-')) {
        await deleteDoc(doc(db, 'hostel_rooms', id));
      }
      setRooms(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  const startEdit = (room) => {
    setEditingId(room.id);
    setForm({ ...room });
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-primary-500 mr-3" size={32} />
        <p className="text-dark-muted font-bold">Loading Hostel & Boarding House Manager...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Bed className="text-purple-400" size={32} />
            Hostel & Boarding House Manager
          </h1>
          <p className="text-dark-muted mt-1 font-medium">
            Manage dormitory rooms, bed availability, warden allocation, and monthly food/mess fee charges.
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm({ roomNumber: '', hostelName: 'Boys Hostel Wing A', totalBeds: '4', roomFeeMonthly: '4000', messFeeMonthly: '6500', wardenName: 'Sir Rizwan' }); setShowAddModal(true); }}
          className="premium-button-primary flex items-center gap-2 self-start md:self-auto"
        >
          <Plus size={18} /> Add New Dorm Room
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-5 border-l-4 border-l-purple-500">
          <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Total Hostel Rooms</p>
          <p className="text-3xl font-black text-purple-400 mt-1">{rooms.length} <span className="text-xs text-dark-muted font-normal">Rooms</span></p>
        </GlassCard>
        <GlassCard className="p-5 border-l-4 border-l-cyan-500">
          <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Total Dormitory Beds</p>
          <p className="text-3xl font-black text-cyan-400 mt-1">
            {rooms.reduce((sum, r) => sum + Number(r.totalBeds || 0), 0)} <span className="text-xs text-dark-muted font-normal">Beds</span>
          </p>
        </GlassCard>
        <GlassCard className="p-5 border-l-4 border-l-green-500">
          <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Occupied Beds</p>
          <p className="text-3xl font-black text-green-400 mt-1">
            {rooms.reduce((sum, r) => sum + Number(r.occupiedBeds || 0), 0)} <span className="text-xs text-dark-muted font-normal">Students</span>
          </p>
        </GlassCard>
        <GlassCard className="p-5 border-l-4 border-l-amber-500">
          <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Est. Monthly Boarding Revenue</p>
          <p className="text-3xl font-black text-amber-400 mt-1">
            Rs. {rooms.reduce((sum, r) => sum + (Number(r.roomFeeMonthly || 0) + Number(r.messFeeMonthly || 0)) * Number(r.occupiedBeds || 2), 0).toLocaleString()}
          </p>
        </GlassCard>
      </div>

      {/* ROOMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rooms.map((room) => {
          const isFull = room.occupiedBeds >= room.totalBeds;

          return (
            <GlassCard key={room.id} className="p-6 rounded-3xl border-2 border-dark-border hover:border-purple-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-dark-border mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-black">
                      <Bed size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{room.roomNumber}</h3>
                      <span className="text-xs text-purple-400 font-bold block">{room.hostelName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => startEdit(room)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"><Edit2 size={15} /></button>
                    <button onClick={() => handleDeleteRoom(room.id)} className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400"><Trash2 size={15} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 my-4">
                  <div className="p-3 rounded-2xl bg-white/5 space-y-0.5">
                    <span className="text-[10px] font-bold text-dark-muted uppercase block">Warden In-charge</span>
                    <span className="text-sm font-black text-white block">{room.wardenName}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 space-y-0.5">
                    <span className="text-[10px] font-bold text-dark-muted uppercase block">Bed Occupancy</span>
                    <span className={`text-sm font-black block ${isFull ? 'text-red-400' : 'text-green-400'}`}>
                      {room.occupiedBeds || 0} / {room.totalBeds} Beds Occupied
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#151926] border border-white/5 my-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-dark-muted uppercase block">Room Rent Fee</span>
                    <span className="text-sm font-black text-white">Rs. {Number(room.roomFeeMonthly).toLocaleString()}/mo</span>
                  </div>
                  <div className="h-8 w-px bg-dark-border"></div>
                  <div>
                    <span className="text-[10px] font-bold text-dark-muted uppercase flex items-center gap-1"><Utensils size={11} /> Food Mess Fee</span>
                    <span className="text-sm font-black text-green-400">Rs. {Number(room.messFeeMonthly).toLocaleString()}/mo</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-dark-border flex items-center justify-between text-xs">
                <span className="text-dark-muted font-bold">Status:</span>
                <span className={`px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-wider ${
                  isFull ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-green-500/20 text-green-400 border border-green-500/40'
                }`}>
                  {isFull ? '🔴 Room Full (0 Beds Left)' : '🟢 Beds Available ✓'}
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ADD / EDIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <GlassCard className="p-8 w-full max-w-lg rounded-3xl border-2 border-purple-500/60 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-dark-border mb-6">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Bed className="text-purple-400" size={22} />
                {editingId ? 'Edit Dormitory Room' : 'Add New Dormitory Room'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Room Number</label>
                  <input type="text" required value={form.roomNumber} onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value }))} placeholder="e.g. Room #101" className="w-full premium-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Hostel Block Name</label>
                  <input type="text" required value={form.hostelName} onChange={e => setForm(f => ({ ...f, hostelName: e.target.value }))} placeholder="e.g. Boys Hostel Block A" className="w-full premium-input text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Total Dorm Beds</label>
                  <input type="number" required value={form.totalBeds} onChange={e => setForm(f => ({ ...f, totalBeds: e.target.value }))} placeholder="4" className="w-full premium-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Warden Name</label>
                  <input type="text" required value={form.wardenName} onChange={e => setForm(f => ({ ...f, wardenName: e.target.value }))} placeholder="e.g. Sir Rizwan" className="w-full premium-input text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Monthly Room Rent Fee (PKR)</label>
                  <input type="number" required value={form.roomFeeMonthly} onChange={e => setForm(f => ({ ...f, roomFeeMonthly: e.target.value }))} placeholder="4500" className="w-full premium-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-dark-muted mb-1">Monthly Mess / Food Fee (PKR)</label>
                  <input type="number" required value={form.messFeeMonthly} onChange={e => setForm(f => ({ ...f, messFeeMonthly: e.target.value }))} placeholder="7000" className="w-full premium-input text-sm" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-dark-border">
                <button type="submit" className="flex-1 premium-button-primary flex items-center justify-center gap-2"><Save size={16} /> Save Room</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 premium-button-secondary">Cancel</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default HostelManager;
