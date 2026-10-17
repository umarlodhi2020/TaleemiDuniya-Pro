import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Send, 
  Clock, 
  MapPin, 
  Tag, 
  Eye, 
  Package, 
  Check, 
  HelpCircle,
  Filter
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const PRELOADED_ITEMS = [
  {
    id: 'item_1',
    title: 'Blue Milton Insulated Water Bottle',
    category: 'Bottles & Lunchboxes',
    location: 'Playground Bench (near Canteen)',
    dateFound: new Date().toISOString().split('T')[0],
    foundBy: 'Peon Aslam',
    status: 'UNCLAIMED',
    claimedBy: null,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&h=300&fit=crop'
  },
  {
    id: 'item_2',
    title: 'Navy Blue School Blazer with Crest (Size 32)',
    category: 'Uniform & Clothing',
    location: 'Auditorium Row 4',
    dateFound: new Date().toISOString().split('T')[0],
    foundBy: 'Madam Sarah',
    status: 'UNCLAIMED',
    claimedBy: null,
    image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=300&h=300&fit=crop'
  },
  {
    id: 'item_3',
    title: 'Casio Scientific Calculator fx-991ES',
    category: 'Stationery & Books',
    location: 'Physics Lab Bench #2',
    dateFound: new Date().toISOString().split('T')[0],
    foundBy: 'Sir Usman',
    status: 'CLAIMED',
    claimedBy: 'Saad Ahmed (Class 10)',
    claimDate: new Date().toISOString().split('T')[0],
    image: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=300&h=300&fit=crop'
  }
];

const CATEGORIES = ['All', 'Bottles & Lunchboxes', 'Uniform & Clothing', 'Stationery & Books', 'Electronics & Watches', 'Other'];

const LostAndFound = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = schoolData?.id || userData?.schoolId || 'default-school';
  const schoolName = schoolData?.name || userData?.schoolName || 'Lodhi Model School System';

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(`lost_and_found_${schoolId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return PRELOADED_ITEMS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'UNCLAIMED' | 'CLAIMED'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedItemForClaim, setSelectedItemForClaim] = useState(null);

  // New Item Form
  const [newItem, setNewItem] = useState({
    title: '',
    category: 'Bottles & Lunchboxes',
    location: 'Junior Playground',
    foundBy: 'Class Teacher',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&h=300&fit=crop'
  });

  // Claim Form
  const [claimStudentName, setClaimStudentName] = useState('');

  const saveItems = (updated) => {
    setItems(updated);
    try {
      localStorage.setItem(`lost_and_found_${schoolId}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.title) return;

    const obj = {
      id: `item_${Date.now()}`,
      dateFound: new Date().toISOString().split('T')[0],
      status: 'UNCLAIMED',
      claimedBy: null,
      ...newItem
    };

    const updated = [obj, ...items];
    saveItems(updated);
    setNewItem({
      title: '',
      category: 'Bottles & Lunchboxes',
      location: 'Junior Playground',
      foundBy: 'Class Teacher',
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&h=300&fit=crop'
    });
    setShowAddModal(false);
  };

  const handleConfirmClaim = (e) => {
    e.preventDefault();
    if (!selectedItemForClaim || !claimStudentName) return;

    const updated = items.map(item => {
      if (item.id === selectedItemForClaim.id) {
        return {
          ...item,
          status: 'CLAIMED',
          claimedBy: claimStudentName,
          claimDate: new Date().toISOString().split('T')[0]
        };
      }
      return item;
    });

    saveItems(updated);
    setShowClaimModal(false);
    setClaimStudentName('');
  };

  const handleDeleteItem = (id) => {
    if (!window.confirm('Delete this item entry?')) return;
    const updated = items.filter(i => i.id !== id);
    saveItems(updated);
  };

  // WhatsApp Broadcast for Lost Property
  const handleBroadcastWhatsApp = () => {
    const unclaimed = items.filter(i => i.status === 'UNCLAIMED');
    let msg = `*🔍 ${schoolName.toUpperCase()} — LOST & FOUND NOTICE*\n\n`;
    msg += `Assalam-o-Alaikum Parents! School campus mein daryaft shuda ashya (Lost Property) ki fehrist:\n\n`;
    unclaimed.forEach((it, idx) => {
      msg += `${idx + 1}. *${it.title}* (Location: ${it.location})\n`;
    });
    msg += `\nAgar aap ke bache ki koi cheez gumm hui hai, toh reception counter se apni cheez pehchan kar wasool karein.\n\n`;
    msg += `🔗 *Online Portal:* https://taleemidunya-pro-ed44e.web.app/#/parent-quick-view/demo`;

    const encoded = encodeURI(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const filteredItems = items.filter(i => {
    const matchesSearch = i.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          i.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || i.category === selectedCategory;
    const matchesStatus = filterStatus === 'ALL' || i.status === filterStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-16 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-cyan-50/90 via-white to-sky-50/70 border border-cyan-200/90 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-100 border border-cyan-200 text-cyan-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Package size={14} className="text-cyan-600" />
              Digital Lost & Found Board
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
              Parent Portal Sync
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Lost & Found Property Noticeboard</h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
            Post photos of lost blazers, water bottles, lunchboxes, and calculators found on campus. Parents can view unclaimed items from home and claim them.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto relative z-10">
          <button 
            onClick={handleBroadcastWhatsApp}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Send size={15} />
            <span>Broadcast Unclaimed List</span>
          </button>

          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-slate-300 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Post Found Item</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Unclaimed Items</span>
          <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">
            {items.filter(i => i.status === 'UNCLAIMED').length} Items
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Successfully Returned</span>
          <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
            {items.filter(i => i.status === 'CLAIMED').length} Handed Over
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Logged</span>
          <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
            {items.length} Total
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Storage Custodian</span>
          <span className="text-sm font-black text-slate-800 mt-2 block">
            Admin Helpdesk Counter
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items by title or location found..."
            className="w-full text-xs font-bold pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-bold py-2 px-3 rounded-xl bg-slate-50 border border-slate-200"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filterStatus === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('UNCLAIMED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filterStatus === 'UNCLAIMED' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Unclaimed
            </button>
            <button
              onClick={() => setFilterStatus('CLAIMED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filterStatus === 'CLAIMED' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Returned
            </button>
          </div>
        </div>
      </div>

      {/* ITEMS GALLERY GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item) => {
          const isUnclaimed = item.status === 'UNCLAIMED';

          return (
            <div 
              key={item.id} 
              className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Photo Thumbnail */}
                <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover" 
                  />
                  <span className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isUnclaimed ? 'bg-amber-500 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'}`}>
                    {isUnclaimed ? '🟡 Unclaimed' : '✓ Returned to Owner'}
                  </span>
                  <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold">
                    {item.category}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-black text-slate-950 text-sm leading-snug">{item.title}</h3>
                  <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
                    <MapPin size={13} className="text-cyan-600 shrink-0" />
                    <span>Found at: {item.location}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Date: {item.dateFound} • Handed by: {item.foundBy}
                  </p>
                </div>

                {/* Claimer Information if returned */}
                {!isUnclaimed && item.claimedBy && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                    ✓ Handed over to: <strong>{item.claimedBy}</strong> on {item.claimDate}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                {isUnclaimed ? (
                  <button
                    onClick={() => {
                      setSelectedItemForClaim(item);
                      setShowClaimModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Check size={14} />
                    <span>Mark as Claimed</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 font-bold">Closed Case ✓</span>
                )}

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: POST FOUND ITEM */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Package size={18} className="text-cyan-600" />
              <span>Post Found Property Item</span>
            </h3>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Item Title / Description</label>
                <input 
                  type="text" 
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="e.g. Red Milton Water Bottle / Black Casio Watch"
                  required
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Where was it found?</label>
                <input 
                  type="text" 
                  value={newItem.location}
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  placeholder="e.g. Playground bench, Library table #3, Van 4"
                  required
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Found by (Staff Name)</label>
                <input 
                  type="text" 
                  value={newItem.foundBy}
                  onChange={(e) => setNewItem({ ...newItem, foundBy: e.target.value })}
                  placeholder="e.g. Peon Aslam / Madam Aisha"
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl bg-black hover:bg-slate-900 text-white text-xs font-black"
                >
                  Post to Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CLAIM ITEM */}
      {showClaimModal && selectedItemForClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>Mark Item as Claimed & Returned</span>
            </h3>

            <p className="text-xs text-slate-600">
              Item: <strong>{selectedItemForClaim.title}</strong>
            </p>

            <form onSubmit={handleConfirmClaim} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Claimer Student / Parent Name & Roll No</label>
                <input 
                  type="text" 
                  value={claimStudentName}
                  onChange={(e) => setClaimStudentName(e.target.value)}
                  placeholder="e.g. Muhammad Ahmad (Roll #104, Class 9)"
                  required
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black"
                >
                  Confirm Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LostAndFound;
