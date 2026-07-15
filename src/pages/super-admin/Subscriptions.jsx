import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import {
  CreditCard, CheckCircle2, XCircle, Plus, Edit2,
  Zap, Building2, Star, Crown, Users, Save, X, ToggleLeft, ToggleRight, RefreshCw,
  Clock, Check, AlertCircle, DollarSign
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const defaultPlans = [
  {
    id: 'basic', name: 'Basic', priceMonthly: 3500, priceYearly: 35000,
    maxStudents: 200, maxStaff: 20, maxClasses: 10, enabled: true, recommended: false,
    features: ['Student Management', 'Fee Management', 'Attendance Tracking', 'Basic Reports', 'Email Support'],
    locked: ['SMS Alerts', 'E-Services', 'Custom Branding', 'Priority Support'],
  },
  {
    id: 'premium', name: 'Premium', priceMonthly: 8000, priceYearly: 80000,
    maxStudents: 1000, maxStaff: 100, maxClasses: 50, enabled: true, recommended: true,
    features: ['All Basic Features', 'SMS Alerts', 'E-Services', 'Inventory Manager', 'Advanced Reports', 'Priority Support', 'Parent Portal'],
    locked: ['Custom Branding', 'Dedicated Manager'],
  },
  {
    id: 'enterprise', name: 'Enterprise', priceMonthly: 15000, priceYearly: 150000,
    maxStudents: 'Unlimited', maxStaff: 'Unlimited', maxClasses: 'Unlimited', enabled: true, recommended: false,
    features: ['All Premium Features', 'Custom Branding', 'Dedicated Manager', 'API Access', 'Multi-Branch Support', 'White-label Option', '24/7 Phone Support'],
    locked: [],
  },
];

const Subscriptions = () => {
  const [billing, setBilling] = useState('monthly');
  const [activeTab, setActiveTab] = useState('plans');
  const [editingId, setEditingId] = useState(null);
  const [newPlanModal, setNewPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', priceMonthly: '', priceYearly: '', maxStudents: '', maxStaff: '' });
  const [plans, setPlans] = useState(defaultPlans);
  const [schools, setSchools] = useState([]);
  const [rechargeRequests, setRechargeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch schools
      const snap = await getDocs(collection(db, 'schools'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSchools(list);

      // Fetch plans from Firestore (if any)
      const plansSnap = await getDocs(collection(db, 'plans'));
      if (plansSnap.docs.length > 0) {
        setPlans(plansSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }

      // Fetch pending recharge/upgrade requests
      const reqSnap = await getDocs(collection(db, 'saas_recharge_requests'));
      setRechargeRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
    } catch (err) { console.error('Fetch error:', err); }
    finally { setLoading(false); }
  };

  const approveRecharge = async (req) => {
    try {
      await updateDoc(doc(db, 'saas_recharge_requests', req.id), { status: 'approved', verifiedAt: serverTimestamp() });
      const daysToAdd = req.billingCycle === 'yearly' ? 365 : 30;
      const newExpiry = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
      await updateDoc(doc(db, 'schools', req.schoolId), {
        plan: req.requestedPlan,
        subscriptionPlan: req.requestedPlan,
        subscriptionStatus: 'active',
        expiryDate: newExpiry,
        updatedAt: serverTimestamp()
      });
      alert(`✅ Recharge Approved!\nSchool: ${req.schoolName}\nPlan activated: ${req.planName} (${req.billingCycle})\nValid till: ${new Date(newExpiry).toLocaleDateString()}`);
      fetchData();
    } catch (e) {
      alert(`❌ Error approving recharge: ${e.message}`);
    }
  };

  const rejectRecharge = async (req) => {
    try {
      await updateDoc(doc(db, 'saas_recharge_requests', req.id), { status: 'rejected', verifiedAt: serverTimestamp() });
      alert(`❌ Recharge request from ${req.schoolName} rejected.`);
      fetchData();
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  };

  const savePlanToFirestore = async (plan) => {
    try {
      await setDoc(doc(db, 'plans', plan.id), { ...plan, updatedAt: serverTimestamp() });
    } catch (e) { console.error('Save plan error:', e); }
  };

  const startEdit = (plan) => { setEditingId(plan.id); setEditForm({ ...plan }); };

  const saveEdit = async () => {
    const updated = plans.map(p => p.id === editingId ? { ...p, ...editForm } : p);
    setPlans(updated);
    setEditingId(null);
    await savePlanToFirestore(updated.find(p => p.id === editingId));
  };

  const togglePlan = async (id) => {
    const updated = plans.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p);
    setPlans(updated);
    await savePlanToFirestore(updated.find(p => p.id === id));
  };

  const assignPlan = async (schoolId, planId) => {
    setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, plan: planId, subscriptionPlan: planId } : s));
    try {
      await updateDoc(doc(db, 'schools', schoolId), { plan: planId, subscriptionPlan: planId, updatedAt: serverTimestamp() });
    } catch (e) { console.error('Assign error:', e); }
  };

  const addPlan = async () => {
    if (!newPlan.name) return;
    const plan = {
      id: newPlan.name.toLowerCase().replace(/\s+/g, '-'),
      name: newPlan.name,
      priceMonthly: Number(newPlan.priceMonthly) || 0,
      priceYearly: Number(newPlan.priceYearly) || 0,
      maxStudents: newPlan.maxStudents || '100',
      maxStaff: newPlan.maxStaff || '10',
      maxClasses: '20', enabled: true, recommended: false,
      features: ['Student Management', 'Fee Management'], locked: [],
    };
    setPlans(prev => [...prev, plan]);
    setNewPlan({ name: '', priceMonthly: '', priceYearly: '', maxStudents: '', maxStaff: '' });
    setNewPlanModal(false);
    await savePlanToFirestore(plan);
  };

  // Count schools per plan from real data
  const getSchoolCount = (planId) => schools.filter(s => (s.plan || s.subscriptionPlan || '').toLowerCase() === planId.toLowerCase()).length;

  const planStyle = {
    basic: { iconBg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', badge: 'bg-blue-500/20 text-blue-400' },
    premium: { iconBg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', badge: 'bg-purple-500/20 text-purple-400' },
    enterprise: { iconBg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', badge: 'bg-amber-500/20 text-amber-400' },
  };
  const getPlanStyle = (id) => planStyle[id] || { iconBg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', badge: 'bg-cyan-500/20 text-cyan-400' };
  const PlanIcon = ({ id, size = 22 }) => {
    if (id === 'basic') return <Zap size={size} />;
    if (id === 'premium') return <Star size={size} />;
    if (id === 'enterprise') return <Crown size={size} />;
    return <Building2 size={size} />;
  };

  const monthlyRevenue = schools.reduce((sum, s) => {
    const plan = plans.find(p => p.id === (s.plan || s.subscriptionPlan || '').toLowerCase());
    return sum + (plan?.priceMonthly || Number(s.revenue) || 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-primary-500" size={32} />
        <p className="text-dark-muted ml-3">Loading subscriptions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="text-primary-500" size={28} /> Subscription Plans
          </h1>
          <p className="text-dark-muted mt-1">Manage pricing plans and assign them to schools.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="premium-button-secondary"><RefreshCw size={18} /> Refresh</button>
          <button onClick={() => setNewPlanModal(true)} className="premium-button-primary"><Plus size={18} /> New Plan</button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Plans', value: plans.length, color: 'text-primary-400' },
          { label: 'Active Plans', value: plans.filter(p => p.enabled).length, color: 'text-green-400' },
          { label: 'Total Schools', value: schools.length, color: 'text-blue-400' },
          { label: 'Monthly Revenue', value: `PKR ${monthlyRevenue.toLocaleString()}`, color: 'text-amber-400' },
        ].map((stat, i) => (
          <GlassCard key={i} className="p-5">
            <p className="text-xs font-black text-dark-muted uppercase tracking-widest">{stat.label}</p>
            <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Subscription Distribution Chart */}
      <GlassCard className="p-8">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Users className="text-primary-500" size={20} /> Subscription Distribution
        </h2>
        {schools.length === 0 ? (
          <div className="text-center py-8 text-dark-muted">
            <Building2 size={40} className="mx-auto opacity-30 mb-3" />
            <p className="font-bold">No schools registered yet</p>
            <p className="text-xs mt-1">Distribution will appear when schools are added</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map(plan => {
              const count = getSchoolCount(plan.id);
              const pct = schools.length > 0 ? ((count / schools.length) * 100).toFixed(0) : 0;
              const style = getPlanStyle(plan.id);
              return (
                <div key={plan.id} className="flex items-center gap-4">
                  <div className="w-28 flex items-center gap-2">
                    <span className={style.text}><PlanIcon id={plan.id} size={16} /></span>
                    <span className="text-sm font-bold">{plan.name}</span>
                  </div>
                  <div className="flex-1 bg-dark-hover rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2 ${
                        plan.id === 'basic' ? 'bg-gradient-to-r from-blue-600 to-blue-400'
                        : plan.id === 'premium' ? 'bg-gradient-to-r from-purple-600 to-purple-400'
                        : plan.id === 'enterprise' ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                        : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                      }`}
                      style={{ width: `${Math.max(Number(pct), count > 0 ? 8 : 0)}%` }}
                    >
                      {count > 0 && <span className="text-[10px] font-black text-white">{pct}%</span>}
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <span className={`text-sm font-black ${style.text}`}>{count}</span>
                    <span className="text-xs text-dark-muted"> schools</span>
                  </div>
                </div>
              );
            })}
            {/* Unassigned */}
            {(() => {
              const assigned = plans.reduce((s, p) => s + getSchoolCount(p.id), 0);
              const unassigned = schools.length - assigned;
              if (unassigned <= 0) return null;
              const pct = ((unassigned / schools.length) * 100).toFixed(0);
              return (
                <div className="flex items-center gap-4">
                  <div className="w-28 flex items-center gap-2">
                    <span className="text-dark-muted"><Building2 size={16} /></span>
                    <span className="text-sm font-bold text-dark-muted">No Plan</span>
                  </div>
                  <div className="flex-1 bg-dark-hover rounded-full h-6 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-gray-600 to-gray-400 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(Number(pct), 8)}%` }}>
                      <span className="text-[10px] font-black text-white">{pct}%</span>
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-sm font-black text-dark-muted">{unassigned}</span>
                    <span className="text-xs text-dark-muted"> schools</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </GlassCard>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-dark-border overflow-x-auto">
        {[
          { id: 'plans', label: '📋 Manage Plans' },
          { id: 'schools', label: '🏫 School Assignments' },
          { id: 'requests', label: `⚡ Recharge / Upgrade Proofs (${rechargeRequests.filter(r => r.status === 'pending_verification').length})` }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-bold transition-all rounded-t-xl whitespace-nowrap ${
              activeTab === tab.id ? 'bg-primary-500/10 text-primary-400 border-b-2 border-primary-500 -mb-px' : 'text-dark-muted hover:text-dark-text'
            }`}>{tab.label}</button>
        ))}
      </div>

      {/* PLANS TAB */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-4 py-2">
            <span className={`text-sm font-bold transition-colors ${billing === 'monthly' ? 'text-white' : 'text-dark-muted'}`}>Monthly</span>
            <button onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-14 h-7 rounded-full transition-colors bg-dark-border focus:outline-none"
              style={{ background: billing === 'yearly' ? 'rgb(99 102 241)' : '' }}>
              <span className="absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all" style={{ left: billing === 'yearly' ? '30px' : '4px' }} />
            </button>
            <span className={`text-sm font-bold transition-colors ${billing === 'yearly' ? 'text-white' : 'text-dark-muted'}`}>
              Yearly <span className="text-xs text-green-400 font-black">(Save ~17%)</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => {
              const style = getPlanStyle(plan.id);
              const isEditing = editingId === plan.id;
              const price = billing === 'monthly' ? plan.priceMonthly : plan.priceYearly;
              const schoolCount = getSchoolCount(plan.id);

              return (
                <div key={plan.id}
                  className={`relative rounded-2xl border-2 overflow-hidden transition-all ${plan.enabled ? style.border : 'border-dark-border opacity-60'} ${plan.recommended ? 'shadow-lg shadow-purple-500/10' : ''}`}
                  style={{ background: 'rgba(15,15,30,0.8)' }}>
                  {plan.recommended && (
                    <div className="absolute top-0 right-0 bg-purple-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">⭐ Popular</div>
                  )}
                  <div className={`px-6 py-3 flex items-center justify-between ${style.iconBg}`}>
                    <div className="flex items-center gap-3">
                      <span className={`${style.text} font-black text-base`}><PlanIcon id={plan.id} size={18} /></span>
                      <span className={`font-black text-sm uppercase tracking-widest ${style.text}`}>{plan.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(plan)} className="p-1.5 hover:bg-white/10 rounded-lg text-dark-muted hover:text-white transition-all" title="Edit"><Edit2 size={14} /></button>
                      <button onClick={() => togglePlan(plan.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${plan.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {plan.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {plan.enabled ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {isEditing ? (
                      <div className="space-y-3">
                        {[
                          { label: 'Plan Name', key: 'name', type: 'text' },
                          { label: 'Monthly Price (PKR)', key: 'priceMonthly', type: 'number' },
                          { label: 'Yearly Price (PKR)', key: 'priceYearly', type: 'number' },
                          { label: 'Max Students', key: 'maxStudents', type: 'text' },
                          { label: 'Max Staff', key: 'maxStaff', type: 'text' },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="text-[10px] text-dark-muted uppercase font-black tracking-widest block mb-1">{f.label}</label>
                            <input type={f.type} value={editForm[f.key] || ''} onChange={e => setEditForm(ef => ({ ...ef, [f.key]: e.target.value }))} className="w-full premium-input text-sm" />
                          </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                          <button onClick={saveEdit} className="flex-1 premium-button-primary py-2 text-sm"><Save size={14} /> Save</button>
                          <button onClick={() => setEditingId(null)} className="flex-1 premium-button-secondary py-2 text-sm"><X size={14} /> Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-5">
                          <p className="text-4xl font-black">PKR <span className={style.text}>{Number(price).toLocaleString()}</span></p>
                          <p className="text-xs text-dark-muted mt-1">per school / {billing}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-5">
                          {[{ label: 'Students', value: plan.maxStudents }, { label: 'Staff', value: plan.maxStaff }, { label: 'Classes', value: plan.maxClasses }].map(m => (
                            <div key={m.label} className="text-center bg-white/5 rounded-xl p-2 border border-white/5">
                              <p className={`text-sm font-black ${style.text}`}>{m.value}</p>
                              <p className="text-[10px] text-dark-muted">{m.label}</p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2 mb-4">
                          {(plan.features || []).map(f => (
                            <div key={f} className="flex items-center gap-2 text-xs"><CheckCircle2 className="text-green-400 shrink-0" size={13} /><span>{f}</span></div>
                          ))}
                          {(plan.locked || []).map(f => (
                            <div key={f} className="flex items-center gap-2 text-xs opacity-40"><XCircle className="text-dark-muted shrink-0" size={13} /><span className="line-through">{f}</span></div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <span className="text-xs text-dark-muted flex items-center gap-1"><Users size={12} /><strong>{schoolCount}</strong> schools</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${plan.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {plan.enabled ? '✓ Active' : '✗ Disabled'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SCHOOLS TAB */}
      {activeTab === 'schools' && (
        <GlassCard className="p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Building2 className="text-primary-500" size={20} /> School Plan Assignments</h2>
          {schools.length === 0 ? (
            <div className="text-center py-12 text-dark-muted">
              <Building2 size={40} className="mx-auto opacity-30 mb-3" />
              <p className="font-bold">No schools found</p>
              <p className="text-xs mt-1">Add schools first to assign plans</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-widest font-black">
                    <th className="pb-4 px-4">School</th>
                    <th className="pb-4 px-4">Current Plan</th>
                    <th className="pb-4 px-4">Status</th>
                    <th className="pb-4 px-4 text-right">Change Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {schools.map(school => {
                    const sPlan = (school.plan || school.subscriptionPlan || '').toLowerCase();
                    const currentPlan = plans.find(p => p.id === sPlan);
                    const currentStyle = getPlanStyle(sPlan);
                    return (
                      <tr key={school.id} className="hover:bg-white/5 transition-all">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-dark-hover border border-dark-border flex items-center justify-center font-bold text-primary-500 text-sm">
                              {(school.name || school.schoolName || '?').charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{school.name || school.schoolName}</p>
                              <p className="text-xs text-dark-muted">{school.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${currentStyle.badge}`}>
                            {currentPlan?.name || sPlan || 'None'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            school.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                          }`}>{school.status || 'pending'}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {plans.filter(p => p.enabled && p.id !== sPlan).map(p => {
                              const s = getPlanStyle(p.id);
                              return (
                                <button key={p.id} onClick={() => assignPlan(school.id, p.id)}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all hover:scale-105 ${s.badge}`}>
                                  → {p.name}
                                </button>
                              );
                            })}
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
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'requests' && (
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Zap className="text-amber-400" size={20} /> Pending Online Recharge & Plan Upgrade Proofs
            </h2>
            <button onClick={fetchData} className="premium-button-secondary py-1.5 text-xs">
              <RefreshCw size={14} /> Refresh Requests
            </button>
          </div>

          {rechargeRequests.length === 0 ? (
            <div className="text-center py-12 text-dark-muted">
              <CreditCard size={44} className="mx-auto opacity-30 mb-3" />
              <p className="font-bold text-base">No online recharge requests found</p>
              <p className="text-xs mt-1">When schools recharge or upgrade online, their payment proofs (TID) will appear here for 1-click verification.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-widest font-black">
                    <th className="pb-4 px-4">School Name</th>
                    <th className="pb-4 px-4">Requested Plan</th>
                    <th className="pb-4 px-4">Billing & Amount</th>
                    <th className="pb-4 px-4">TID / Payment Proof</th>
                    <th className="pb-4 px-4">Submitted At</th>
                    <th className="pb-4 px-4">Status</th>
                    <th className="pb-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {rechargeRequests.map(req => {
                    const isPending = req.status === 'pending_verification';
                    return (
                      <tr key={req.id} className="hover:bg-white/5 transition-all">
                        <td className="py-4 px-4">
                          <p className="font-bold text-sm text-white">{req.schoolName || req.schoolId}</p>
                          <p className="text-[11px] text-dark-muted font-mono">{req.schoolId}</p>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                            req.requestedPlan === 'enterprise' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            req.requestedPlan === 'premium' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {req.planName || req.requestedPlan}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-black text-sm text-green-400">Rs. {Number(req.amount || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-dark-muted uppercase font-bold">{req.billingCycle || 'monthly'} ({req.payMethod || 'JAZZCASH'})</p>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 rounded-xl bg-[#151926] border border-white/10 font-mono text-xs text-yellow-300 font-black">
                            {req.tid || 'Screenshot Attached'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-dark-muted">
                          {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Just now'}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            req.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/40' :
                            req.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 animate-pulse'
                          }`}>
                            {req.status === 'approved' ? '✓ Activated' : req.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => approveRecharge(req)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-green-600/20"
                              >
                                <Check size={14} /> Approve & Activate
                              </button>
                              <button
                                onClick={() => rejectRecharge(req)}
                                className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-xs"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-dark-muted font-bold">Processed ✓</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* NEW PLAN MODAL */}
      {newPlanModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Plus className="text-primary-500" size={20} /> Create New Plan</h2>
              <button onClick={() => setNewPlanModal(false)} className="p-2 hover:bg-dark-hover rounded-lg text-dark-muted"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Plan Name', key: 'name', type: 'text', placeholder: 'e.g. Starter' },
                { label: 'Monthly Price (PKR)', key: 'priceMonthly', type: 'number', placeholder: '5000' },
                { label: 'Yearly Price (PKR)', key: 'priceYearly', type: 'number', placeholder: '50000' },
                { label: 'Max Students', key: 'maxStudents', type: 'text', placeholder: '500' },
                { label: 'Max Staff', key: 'maxStaff', type: 'text', placeholder: '50' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-black text-dark-muted uppercase tracking-widest block mb-1.5">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={newPlan[f.key]}
                    onChange={e => setNewPlan(p => ({ ...p, [f.key]: e.target.value }))} className="w-full premium-input" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={addPlan} className="flex-1 premium-button-primary"><Save size={16} /> Create Plan</button>
              <button onClick={() => setNewPlanModal(false)} className="flex-1 premium-button-secondary"><X size={16} /> Cancel</button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
