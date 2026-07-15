import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import {
  CreditCard, CheckCircle2, XCircle, Zap, Star, Crown,
  Clock, AlertTriangle, ShieldCheck, QrCode, Upload, ArrowRight,
  Sparkles, RefreshCw, Check, Calendar, DollarSign, Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const SchoolSubscriptionPortal = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default_school';
  const schoolName = userData?.schoolName || 'My School System';

  const [loading, setLoading] = useState(true);
  const [schoolData, setSchoolData] = useState(null);
  const [plans, setPlans] = useState([
    {
      id: 'basic', name: 'Basic Plan', priceMonthly: 3500, priceYearly: 35000,
      maxStudents: '200', maxStaff: '20', recommended: false,
      features: ['Student Management', 'Fee Challan Generation', 'Daily Attendance Tracking', 'Basic Reports', 'Email Support'],
      locked: ['AI WhatsApp Bots & Alerts', 'Gate Pass Security IoT', 'Custom Report Card Templates', '24/7 Priority Support']
    },
    {
      id: 'premium', name: 'Premium Pro Plan', priceMonthly: 8000, priceYearly: 80000,
      maxStudents: '1,000', maxStaff: '100', recommended: true,
      features: ['All Basic Features Included', 'AI WhatsApp Bots & Alerts', 'Gate Pass Security IoT', 'Custom Report Card Templates', 'Online Quiz Engine', 'Parent & Student Portal Access', 'Priority Support'],
      locked: ['Dedicated Account Manager', 'White-label Custom Branding']
    },
    {
      id: 'enterprise', name: 'Enterprise VIP Plan', priceMonthly: 15000, priceYearly: 150000,
      maxStudents: 'Unlimited', maxStaff: 'Unlimited', recommended: false,
      features: ['All Premium Pro Features', 'Unlimited Students & Staff', 'Dedicated Account Manager', 'White-label Custom Branding', 'Multi-Branch Support', 'API Access', '24/7 Phone & VIP Support'],
      locked: []
    }
  ]);

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
  const [payMethod, setPayMethod] = useState('JAZZCASH');
  const [tidInput, setTidInput] = useState('');
  const [proofAttached, setProofAttached] = useState(false);
  const [submittingPay, setSubmittingPay] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    fetchSubscriptionInfo();
  }, [schoolId]);

  const fetchSubscriptionInfo = async () => {
    setLoading(true);
    try {
      // Get school profile
      const sDoc = await getDoc(doc(db, 'schools', schoolId));
      if (sDoc.exists()) {
        setSchoolData({ id: sDoc.id, ...sDoc.data() });
      } else {
        setSchoolData({
          id: schoolId,
          name: schoolName,
          plan: 'basic',
          subscriptionStatus: 'expiring_soon',
          expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days left demo
        });
      }

      // Get pending recharge requests for this school
      const reqSnap = await getDocs(collection(db, 'saas_recharge_requests'));
      const list = reqSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.schoolId === schoolId);
      setPendingRequests(list);
    } catch (e) {
      console.error(e);
      setSchoolData({
        id: schoolId,
        name: schoolName,
        plan: 'basic',
        subscriptionStatus: 'active',
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = (plan, type = 'upgrade') => {
    setSelectedPlan({ ...plan, actionType: type });
    setShowPayModal(true);
  };

  const handleSubmitRechargeRequest = async (e) => {
    e.preventDefault();
    if (!tidInput.trim() && !proofAttached) {
      alert('⚠️ Please enter Transaction ID (TID) or attach payment screenshot.');
      return;
    }
    setSubmittingPay(true);
    try {
      const amount = billingCycle === 'monthly' ? selectedPlan.priceMonthly : selectedPlan.priceYearly;
      const reqPayload = {
        schoolId,
        schoolName: schoolData?.name || schoolName,
        requestedPlan: selectedPlan.id,
        planName: selectedPlan.name,
        billingCycle,
        amount,
        payMethod,
        tid: tidInput || 'Screenshot Attached',
        status: 'pending_verification',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'saas_recharge_requests'), reqPayload);
      alert(`✅ RECHARGE REQUEST SUBMITTED!\n\nPlan: ${selectedPlan.name} (${billingCycle.toUpperCase()})\nAmount: Rs. ${amount.toLocaleString()}\nTID: ${reqPayload.tid}\n\nYour request has been delivered to TaleemiDunya SaaS Super Admin Panel for instant verification and activation.`);
      setShowPayModal(false);
      setTidInput('');
      setProofAttached(false);
      fetchSubscriptionInfo();
    } catch (err) {
      alert(`❌ Error submitting recharge: ${err.message}`);
    } finally {
      setSubmittingPay(false);
    }
  };

  const currentPlanId = (schoolData?.plan || schoolData?.subscriptionPlan || 'basic').toLowerCase();
  const currentPlanObj = plans.find(p => p.id === currentPlanId) || plans[0];

  // Calculate days remaining
  let daysLeft = 14;
  if (schoolData?.expiryDate) {
    const diff = new Date(schoolData.expiryDate).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-primary-500 mr-3" size={32} />
        <p className="text-dark-muted font-bold">Checking SaaS subscription & plan status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <CreditCard className="text-primary-500" size={32} />
            My SaaS Subscription & Plan Portal
          </h1>
          <p className="text-dark-muted mt-1 font-medium">
            Manage your school portal rent, recharge online, and upgrade plans to unlock premium features.
          </p>
        </div>
        <button
          onClick={fetchSubscriptionInfo}
          className="premium-button-secondary self-start md:self-auto flex items-center gap-2"
        >
          <RefreshCw size={16} /> Refresh Status
        </button>
      </div>

      {/* CURRENT SUBSCRIPTION & EXPIRY ALERT CARD */}
      <div className={`p-6 md:p-8 rounded-3xl border-2 shadow-2xl relative overflow-hidden transition-all ${
        daysLeft <= 3
          ? 'bg-gradient-to-r from-red-900/40 via-[#151926] to-[#1e2336] border-red-500/60 shadow-red-500/10'
          : 'bg-gradient-to-r from-purple-900/40 via-[#151926] to-[#1e2336] border-purple-500/40 shadow-purple-500/10'
      }`}>
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Building2 size={180} className="text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                currentPlanId === 'enterprise' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                currentPlanId === 'premium' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' :
                'bg-blue-500/20 text-blue-400 border border-blue-500/40'
              }`}>
                Current Plan: {currentPlanObj.name}
              </span>

              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                daysLeft === 0 ? 'bg-red-600 text-white border-red-400 animate-pulse' :
                daysLeft <= 3 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 animate-bounce' :
                'bg-green-500/20 text-green-400 border-green-500/40'
              }`}>
                <Clock size={14} />
                {daysLeft === 0 ? 'Rent Expired!' : `${daysLeft} Days Remaining`}
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-white">
              {schoolData?.name || schoolName}
            </h2>
            <p className="text-sm text-gray-300 max-w-xl font-medium leading-relaxed">
              {daysLeft <= 3
                ? `🚨 URGENT: Your monthly portal subscription / rent is expiring in ${daysLeft} days. Please recharge right now to keep AI WhatsApp bots, SMS alerts, and staff payroll running smoothly.`
                : 'Your portal subscription is active. All server nodes, database replicas, and AI engines are fully operational.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleOpenPayment(currentPlanObj, 'recharge')}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Zap size={18} /> Recharge / Renew Rent Now
            </button>
            {currentPlanId !== 'enterprise' && (
              <button
                onClick={() => handleOpenPayment(plans[currentPlanId === 'basic' ? 1 : 2], 'upgrade')}
                className="px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Sparkles size={18} /> Upgrade Plan
              </button>
            )}
          </div>
        </div>

        {/* PENDING REQUESTS WARNING */}
        {pendingRequests.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-yellow-400 bg-yellow-500/10 p-3 rounded-2xl">
            <span className="flex items-center gap-2">
              <Clock size={16} className="animate-spin" /> You have {pendingRequests.length} recharge/upgrade verification request(s) pending with TaleemiDunya Super Admin.
            </span>
            <span className="text-[10px] uppercase font-black bg-yellow-500/20 px-2.5 py-1 rounded-lg">Under Review</span>
          </div>
        )}
      </div>

      {/* BILLING CYCLE SELECTOR */}
      <div className="flex items-center justify-center gap-4 py-4">
        <span className={`text-sm font-bold cursor-pointer ${billingCycle === 'monthly' ? 'text-white' : 'text-dark-muted'}`} onClick={() => setBillingCycle('monthly')}>
          Monthly Billing
        </span>
        <button
          onClick={() => setBillingCycle(b => b === 'monthly' ? 'yearly' : 'monthly')}
          className="w-14 h-7 rounded-full bg-dark-border relative transition-all focus:outline-none"
          style={{ background: billingCycle === 'yearly' ? 'rgb(147 51 234)' : '' }}
        >
          <span
            className="absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all"
            style={{ left: billingCycle === 'yearly' ? '30px' : '4px' }}
          />
        </button>
        <span className={`text-sm font-bold cursor-pointer flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-white' : 'text-dark-muted'}`} onClick={() => setBillingCycle('yearly')}>
          Yearly Billing <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-black text-xs">Save ~17% (2 Months Free)</span>
        </span>
      </div>

      {/* PLANS COMPARISON GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;

          return (
            <GlassCard
              key={plan.id}
              className={`p-7 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-green-500 shadow-xl shadow-green-500/10 bg-gradient-to-b from-green-950/20 to-transparent'
                  : plan.recommended
                  ? 'border-purple-500 shadow-xl shadow-purple-500/10 bg-gradient-to-b from-purple-950/20 to-transparent scale-105 z-10'
                  : 'border-dark-border hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    plan.id === 'enterprise' ? 'bg-amber-500/20 text-amber-400' :
                    plan.id === 'premium' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {plan.id === 'enterprise' ? 'VIP Enterprise' : plan.id === 'premium' ? 'Most Popular Pro' : 'Starter Basic'}
                  </span>
                  {isCurrent && (
                    <span className="px-2.5 py-1 rounded-full bg-green-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <Check size={12} /> Active Plan
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                <div className="my-4">
                  <span className="text-4xl font-black text-white">Rs. {price.toLocaleString()}</span>
                  <span className="text-xs text-dark-muted font-bold block mt-1">
                    per school / {billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 my-4 pt-4 border-t border-dark-border">
                  <div className="p-2.5 rounded-xl bg-white/5 text-center">
                    <span className="text-[10px] font-bold text-dark-muted uppercase block">Students</span>
                    <span className="text-sm font-black text-white">{plan.maxStudents}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 text-center">
                    <span className="text-[10px] font-bold text-dark-muted uppercase block">Staff</span>
                    <span className="text-sm font-black text-white">{plan.maxStaff}</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-3 my-6">
                  <span className="text-[11px] font-black uppercase tracking-wider text-primary-400 block">Included Features:</span>
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-gray-200 font-semibold">
                      <CheckCircle2 className="text-green-400 shrink-0 mt-0.5" size={15} />
                      <span>{feat}</span>
                    </div>
                  ))}

                  {plan.locked && plan.locked.length > 0 && (
                    <div className="pt-3 space-y-2 border-t border-dark-border mt-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-dark-muted block">Locked in {plan.name}:</span>
                      {plan.locked.map((lck, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-dark-muted font-medium opacity-60">
                          <XCircle className="text-red-400 shrink-0 mt-0.5" size={15} />
                          <span className="line-through">{lck}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-6 border-t border-dark-border">
                {isCurrent ? (
                  <button
                    onClick={() => handleOpenPayment(plan, 'recharge')}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <RefreshCw size={16} /> Recharge / Renew Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenPayment(plan, 'upgrade')}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                      plan.recommended
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white shadow-purple-600/30'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                    }`}
                  >
                    <Sparkles size={16} /> {plan.priceMonthly > currentPlanObj.priceMonthly ? 'Upgrade to ' + plan.name : 'Switch to ' + plan.name}
                  </button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ONLINE PAYMENT MODAL */}
      {showPayModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <GlassCard className="p-8 w-full max-w-lg rounded-3xl border-2 border-primary-500 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-dark-border mb-6">
              <div>
                <span className="text-xs font-black text-primary-400 uppercase tracking-wider block">
                  {selectedPlan.actionType === 'recharge' ? 'Renew School Subscription' : 'Upgrade School Plan'}
                </span>
                <h3 className="text-xl font-black text-white mt-0.5 flex items-center gap-2">
                  <CreditCard className="text-green-400" size={22} />
                  {selectedPlan.name} ({billingCycle.toUpperCase()})
                </h3>
              </div>
              <button onClick={() => setShowPayModal(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
                <XCircle size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmitRechargeRequest} className="space-y-6">
              {/* Amount Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/40 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-300 font-bold block">Total Amount Payable</span>
                  <span className="text-3xl font-black text-white">
                    Rs. {(billingCycle === 'monthly' ? selectedPlan.priceMonthly : selectedPlan.priceYearly).toLocaleString()}
                  </span>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-purple-500 text-white font-black text-xs uppercase">
                  {billingCycle === 'monthly' ? '30 Days Rent' : '365 Days Rent'}
                </span>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-dark-muted mb-2">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'JAZZCASH', label: 'JazzCash', color: 'border-red-500 text-red-400 bg-red-500/10' },
                    { id: 'EASYPAISA', label: 'EasyPaisa', color: 'border-green-500 text-green-400 bg-green-500/10' },
                    { id: 'BANK_QR', label: 'Bank IBAN / QR', color: 'border-purple-500 text-purple-400 bg-purple-500/10' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id)}
                      className={`py-3 rounded-xl border text-xs font-black uppercase transition-all flex items-center justify-center gap-1 ${
                        payMethod === m.id ? `${m.color} shadow-lg scale-105` : 'border-dark-border text-gray-400 bg-dark-hover'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pay instructions & QR */}
              <div className="p-4 rounded-2xl bg-[#151926] border border-white/10 text-center space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase block">Send Exact Amount to TaleemiDunya SaaS Account:</span>
                <span className="text-xl font-mono font-black text-white tracking-wider block">
                  {payMethod === 'JAZZCASH' ? '0300-1234567 (TaleemiDunya SaaS)' : payMethod === 'EASYPAISA' ? '0345-7654321 (TaleemiDunya SaaS)' : 'PK36MEZN000012345678910 (Meezan Bank)'}
                </span>
                <div className="w-32 h-32 mx-auto bg-white p-2.5 rounded-2xl flex items-center justify-center my-3 shadow-inner">
                  <QrCode size={110} className="text-black" />
                </div>
                <span className="text-[10px] text-green-400 font-bold block">Scan QR Code from your mobile banking app</span>
              </div>

              {/* TID / Screenshot input */}
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-dark-muted">Enter Transaction ID / Reference #</label>
                <input
                  type="text"
                  required
                  value={tidInput}
                  onChange={(e) => setTidInput(e.target.value)}
                  placeholder="e.g. TID-9876543210 or Bank Ref #"
                  className="w-full p-3.5 rounded-2xl bg-[#151926] border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-primary-500"
                />

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setProofAttached(true); alert('📷 Payment screenshot receipt attached successfully!'); }}
                    className={`flex-1 py-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      proofAttached ? 'bg-green-500/20 text-green-300 border-green-500' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Upload size={16} /> {proofAttached ? 'Screenshot Attached ✓' : 'Attach Screenshot'}
                  </button>

                  <button
                    type="submit"
                    disabled={submittingPay}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
                  >
                    {submittingPay ? <RefreshCw className="animate-spin" size={16} /> : <Check size={18} />}
                    Submit Payment Proof
                  </button>
                </div>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default SchoolSubscriptionPortal;
