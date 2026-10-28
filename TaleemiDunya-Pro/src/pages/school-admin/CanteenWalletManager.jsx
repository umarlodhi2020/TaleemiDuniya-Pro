import React, { useState, useEffect } from 'react';
import { 
  Coffee, 
  CreditCard, 
  Plus, 
  Trash2, 
  Search, 
  ScanBarcode, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  ShoppingBag, 
  ShieldAlert, 
  Receipt, 
  Printer, 
  User, 
  Zap,
  TrendingUp,
  Apple
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

import { getRecords } from '../../services/db';

const MENU_ITEMS = [
  { id: 'm1', name: 'Chicken Club Sandwich', price: 90, category: 'Meals', icon: '🥪' },
  { id: 'm2', name: 'Fresh Apple / Orange Juice', price: 60, category: 'Drinks', icon: '🧃' },
  { id: 'm3', name: 'Crispy Potato Samosa (2 pcs)', price: 40, category: 'Snacks', icon: '🥟' },
  { id: 'm4', name: 'Flavored Milk Pack (250ml)', price: 55, category: 'Dairy', icon: '🥛' },
  { id: 'm5', name: 'Fresh Seasonal Fruit Cup', price: 70, category: 'Healthy', icon: '🍎' },
  { id: 'm6', name: 'Chocolate Wafer Biscuit', price: 35, category: 'Snacks', icon: '🍪' },
  { id: 'm7', name: 'Cold Mineral Water (500ml)', price: 40, category: 'Drinks', icon: '💧' },
  { id: 'm8', name: 'Vegetable Roll', price: 60, category: 'Snacks', icon: '🌯' }
];

const CanteenWalletManager = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = schoolData?.id || userData?.schoolId || 'default-school';

  const [wallets, setWallets] = useState(() => {
    try {
      const saved = localStorage.getItem(`canteen_wallets_${schoolId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [purchases, setPurchases] = useState(() => {
    try {
      const saved = localStorage.getItem(`canteen_purchases_${schoolId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const dbStudents = await getRecords('students', schoolId);
        if (Array.isArray(dbStudents) && dbStudents.length > 0) {
          setWallets(prev => {
            if (prev.length > 0) return prev;
            return dbStudents.map(s => ({
              id: s.id,
              studentName: s.name,
              rollNo: s.rollNumber || s.rollNo || s.admissionNo || 'N/A',
              className: s.class || s.className || 'N/A',
              balance: Number(s.canteenBalance || 0),
              dailyLimit: Number(s.dailyLimit || 200),
              spentToday: 0,
              allergy: s.medicalNotes || s.allergy || 'None',
              photo: s.photoUrl || s.photo || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&h=150&fit=crop'
            }));
          });
        }
      } catch (e) {
        console.error('Error fetching students for canteen:', e);
      }
    };
    fetchStudents();
  }, [schoolId]);

  const [activeTab, setActiveTab] = useState('POS'); // 'POS' | 'WALLETS' | 'SALES'
  const [selectedStudentRoll, setSelectedStudentRoll] = useState('');
  const [cart, setCart] = useState([]);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(500);

  const selectedStudent = wallets.find(w => w.rollNo === selectedStudentRoll) || wallets[0] || {
    studentName: 'No Student Selected',
    rollNo: 'N/A',
    className: 'N/A',
    balance: 0,
    dailyLimit: 0,
    spentToday: 0,
    allergy: 'None',
    photo: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&h=150&fit=crop'
  };

  const saveWallets = (updatedW, updatedP) => {
    setWallets(updatedW);
    if (updatedP) setPurchases(updatedP);
    try {
      localStorage.setItem(`canteen_wallets_${schoolId}`, JSON.stringify(updatedW));
      if (updatedP) localStorage.setItem(`canteen_purchases_${schoolId}`, JSON.stringify(updatedP));
    } catch (e) {
      console.error(e);
    }
  };

  const addToCart = (item) => {
    setCart(prev => [...prev, item]);
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (selectedStudent.balance < cartTotal) {
      alert(`⚠️ Insufficient Wallet Balance!\nStudent balance: Rs. ${selectedStudent.balance}\nCart total: Rs. ${cartTotal}`);
      return;
    }

    if ((selectedStudent.spentToday + cartTotal) > selectedStudent.dailyLimit) {
      alert(`🚨 Daily Spending Limit Exceeded!\nParent has set a daily limit of Rs. ${selectedStudent.dailyLimit}.\nAlready spent today: Rs. ${selectedStudent.spentToday}.\nThis order: Rs. ${cartTotal}.`);
      return;
    }

    // Deduct from wallet
    const updatedWallets = wallets.map(w => {
      if (w.id === selectedStudent.id) {
        return {
          ...w,
          balance: w.balance - cartTotal,
          spentToday: w.spentToday + cartTotal
        };
      }
      return w;
    });

    const newPurchase = {
      id: `p_${Date.now()}`,
      studentName: selectedStudent.studentName,
      rollNo: selectedStudent.rollNo,
      className: selectedStudent.className,
      items: cart.map(i => i.name).join(', '),
      total: cartTotal,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0]
    };

    const updatedPurchases = [newPurchase, ...purchases];
    saveWallets(updatedWallets, updatedPurchases);
    setCart([]);
    alert(`✅ Transaction Approved!\nRs. ${cartTotal} deducted from ${selectedStudent.studentName}'s digital card.\nRemaining Balance: Rs. ${selectedStudent.balance - cartTotal}`);
  };

  const handleTopup = (e) => {
    e.preventDefault();
    const updatedWallets = wallets.map(w => {
      if (w.id === selectedStudent.id) {
        return { ...w, balance: w.balance + Number(topupAmount) };
      }
      return w;
    });
    saveWallets(updatedWallets);
    setShowTopupModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-16 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/70 border border-emerald-200/90 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={14} className="text-emerald-700" />
              Cashless School Canteen POS
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
              Parent Top-Up & Daily Limits
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Canteen Cashless Wallet & Tuck Shop</h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
            Students buy healthy lunch and snacks using their ID Card wallet without carrying cash. Parents set daily spending caps and monitor lunch purchases online.
          </p>
        </div>

        <button 
          onClick={() => setShowTopupModal(true)}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all self-start md:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Top-Up Student Wallet</span>
        </button>
      </div>

      {/* POS BILLING GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Canteen Menu Grid (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Coffee size={18} className="text-emerald-600" />
                <span>Canteen Quick Food & Drink Items</span>
              </h2>
              <span className="text-xs font-bold text-slate-500">Tap item to add to tray</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left space-y-2 group cursor-pointer active:scale-95"
                >
                  <span className="text-2xl block">{item.icon}</span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-emerald-700">{item.name}</h3>
                    <span className="text-xs font-black font-mono text-emerald-600">Rs. {item.price}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* RECENT CANTEEN TRANSACTIONS */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="font-black text-slate-900 text-sm">Today's Live Canteen Sales Activity</h3>
            <div className="space-y-2">
              {purchases.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No canteen sales recorded today.</p>
              ) : (
                purchases.slice(0, 4).map((p) => (
                  <div key={p.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{p.studentName} ({p.className})</span>
                      <p className="text-[11px] text-slate-500">{p.items}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black font-mono text-slate-900">Rs. {p.total}</span>
                      <span className="text-[10px] text-slate-400 block">{p.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Student Digital Card & Checkout Tray (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Student Scanner & Balance Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black uppercase text-slate-400">Student ID Card POS</span>
              <select
                value={selectedStudentRoll}
                onChange={(e) => setSelectedStudentRoll(e.target.value)}
                className="text-xs font-bold py-1 px-2.5 rounded-lg border-slate-300 bg-slate-50"
              >
                {wallets.map(w => <option key={w.id} value={w.rollNo}>{w.studentName} ({w.rollNo})</option>)}
              </select>
            </div>

            {/* Student Info */}
            <div className="flex items-center gap-3">
              <img 
                src={selectedStudent.photo} 
                alt="Avatar" 
                className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-900 shadow-sm"
              />
              <div>
                <h3 className="font-black text-slate-950 text-sm">{selectedStudent.studentName}</h3>
                <p className="text-xs text-slate-500 font-bold">{selectedStudent.className} • Roll #{selectedStudent.rollNo}</p>
                {selectedStudent.allergy !== 'None' && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                    ⚠️ {selectedStudent.allergy}
                  </span>
                )}
              </div>
            </div>

            {/* Wallet Balance Widget */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-800 uppercase font-black block">Available Balance</span>
                <span className="text-2xl font-black font-mono text-emerald-700">Rs. {selectedStudent.balance}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Daily Limit: Rs. {selectedStudent.dailyLimit}</span>
                <span className="text-[11px] font-mono font-bold text-slate-700">Spent Today: Rs. {selectedStudent.spentToday}</span>
              </div>
            </div>

            {/* Current Cart Tray */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-black uppercase text-slate-500 block">Current Lunch Tray ({cart.length})</span>
              {cart.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No items added to tray yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-xs">
                      <span className="font-medium text-slate-800 truncate max-w-[170px]">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black font-mono text-slate-900">Rs. {item.price}</span>
                        <button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cart Total & Charge Button */}
              {cart.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-sm font-black">
                    <span>Payable Total:</span>
                    <span className="font-mono text-emerald-600 text-base">Rs. {cartTotal}</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full py-3.5 rounded-2xl bg-black hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    <Receipt size={16} className="text-emerald-400" />
                    <span>Deduct from Student Card</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* MODAL: TOPUP WALLET */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-600" />
              <span>Top-Up Canteen Wallet</span>
            </h3>

            <p className="text-xs text-slate-600">
              Student: <strong>{selectedStudent.studentName}</strong> (Roll #{selectedStudent.rollNo})
            </p>

            <form onSubmit={handleTopup} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Recharge Amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {[200, 500, 1000].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setTopupAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-black font-mono transition-all ${topupAmount === amt ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-800'}`}
                    >
                      Rs. {amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Custom Amount (Rs.)</label>
                <input 
                  type="number" 
                  min="50" 
                  max="10000"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(Number(e.target.value))}
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowTopupModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black"
                >
                  Confirm Recharge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CanteenWalletManager;
