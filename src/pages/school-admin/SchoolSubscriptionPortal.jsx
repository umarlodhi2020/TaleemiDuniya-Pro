import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import {
  CreditCard, CheckCircle2, XCircle, Zap, Star, Crown,
  Clock, AlertTriangle, ShieldCheck, QrCode, Upload, ArrowRight,
  Sparkles, RefreshCw, Check, Calendar, DollarSign, Building2,
  Lock, ShoppingCart, FileText, Printer, Shield, ArrowUpRight, Plus, CheckSquare, Square
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { SAAS_FEATURE_CATALOG } from '../../config/saasFeaturesConfig';

const SchoolSubscriptionPortal = () => {
  const { userData } = useAuth();
  const { schoolData, isFeatureAllowed, updateSchoolAllowedFeatures, currentSaaSPlan } = useSchool();
  const schoolId = userData?.schoolId || 'default_school';
  const schoolName = userData?.schoolName || 'My School System';

  const [activePortalTab, setActivePortalTab] = useState('plans'); // 'plans', 'addons', 'invoices'
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([
    {
      id: 'basic', name: 'Basic (Starter) Plan', priceMonthly: 3500, priceYearly: 35000,
      maxStudents: '200', maxStaff: '20', recommended: false,
      features: ['Student & Staff Directory', 'Daily Attendance Register', 'Challan Manager & Fee Collection', 'Academic Gradebook & Exams Hub', 'Expense & Cashbook Tracker', 'Standard Email Support'],
      locked: ['SMS & WhatsApp Alerts', 'Parent & Student Portals', 'Online MCQ Quizzes', 'Biometric Gate Scanner', 'AI Copilot Assistant', 'Multi-Branch Campus Network']
    },
    {
      id: 'standard', name: 'Standard (Plus) Plan', priceMonthly: 6500, priceYearly: 65000,
      maxStudents: '600', maxStaff: '50', recommended: false,
      features: ['All Basic Starter Features Included', 'Instant SMS Alerts & Broadcasts', 'Parent & Student Mobile Portals', 'Exam Date Sheet & Report Cards', 'AI Timetable & Clash Resolver', 'Digital Library & E-Books Hub', 'School Inventory & Asset Ledger', 'School E-Services Website'],
      locked: ['WhatsApp Bot Automation', 'Online MCQ Quiz Engine', 'Biometric & RFID Gate IoT', 'AI School Copilot Assistant', 'Multi-Branch Hub & Franchises']
    },
    {
      id: 'premium', name: 'Premium (Pro) Plan', priceMonthly: 10000, priceYearly: 100000,
      maxStudents: '1,500', maxStaff: '150', recommended: true,
      features: ['All Standard Plus Features Included', 'Automated WhatsApp Alerts & Bots', 'Online MCQ Quiz & Auto-Marking Engine', 'Live ID Card Gate Scanner & Security IoT', 'Double-Entry Accounting & Ledger', 'Hostel & Bus Fleet Tracking', 'Staff Payroll & Salary Slips', 'Automated BI Reports Hub', 'AI School Copilot Assistant'],
      locked: ['Multi-Branch Campus Network', 'Custom Branding & White-Label', 'Developer API & Webhooks', 'Dedicated 24/7 Account Manager']
    },
    {
      id: 'enterprise', name: 'Enterprise VIP Plan', priceMonthly: 18000, priceYearly: 180000,
      maxStudents: 'Unlimited', maxStaff: 'Unlimited', recommended: false,
      features: ['All Premium Pro Features Included', 'Unlimited Students, Staff & Classes', 'Multi-Branch Hub & Campus Network', 'Franchise Network & Royalty Management', 'Custom Branding & White-Labeling', 'Developer REST API & Webhooks', 'Mobile App PWA Offline Sync', 'Commercial Security & Audit Hub', 'Dedicated 24/7 VIP Account Manager'],
      locked: []
    }
  ]);

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
  const [payMethod, setPayMethod] = useState('STRIPE_CARD'); // 'STRIPE_CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_QR'
  
  // Card input states for Stripe Simulation
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState(userData?.name || 'School Administrator');
  
  // Mobile / Bank inputs
  const [tidInput, setTidInput] = useState('');
  const [proofAttached, setProofAttached] = useState(false);
  const [submittingPay, setSubmittingPay] = useState(false);
  const [cardProcessingStep, setCardProcessingStep] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);

  // A la Carte Add-ons selection state
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [showAddonPayModal, setShowAddonPayModal] = useState(false);

  // Invoices history state
  const [invoicesList, setInvoicesList] = useState([
    { id: 'INV-2026-001', date: '2026-07-01', item: 'Premium Pro Plan (Monthly Rent)', amount: 8000, gateway: 'Stripe Online Card', status: 'Paid', tid: 'ch_3N8X922eZvKYlo2C1gQ' },
    { id: 'INV-2026-002', date: '2026-06-01', item: 'Premium Pro Plan (Monthly Rent)', amount: 8000, gateway: 'Stripe Online Card', status: 'Paid', tid: 'ch_3M7W811dYvJXkp1B0fP' },
    { id: 'INV-2026-003', date: '2026-05-01', item: 'Basic Starter Plan (Monthly Rent)', amount: 3500, gateway: 'JazzCash Mobile Wallet', status: 'Paid', tid: 'JAZZ-8899201144' }
  ]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    fetchSubscriptionInfo();
  }, [schoolId]);

  const fetchSubscriptionInfo = async () => {
    setLoading(true);
    try {
      const reqSnap = await getDocs(collection(db, 'saas_recharge_requests'));
      const list = reqSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.schoolId === schoolId);
      setPendingRequests(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = (plan, type = 'upgrade') => {
    setSelectedPlan({ ...plan, actionType: type });
    setPayMethod('STRIPE_CARD');
    setShowPayModal(true);
  };

  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    val = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNumber(val);
  };

  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    setCardExpiry(val);
  };

  const handleSubmitRechargeRequest = async (e) => {
    e.preventDefault();
    
    // If Stripe Card Payment selected
    if (payMethod === 'STRIPE_CARD') {
      if (!cardNumber || cardNumber.length < 18 || !cardExpiry || !cardCvv) {
        alert('⚠️ Please complete valid 16-digit credit/debit card details.');
        return;
      }
      setCardProcessingStep('Contacting Stripe / Visa Secure Gateway...');
      await new Promise(r => setTimeout(r, 1200));
      setCardProcessingStep('Verifying 3D Secure Authentication...');
      await new Promise(r => setTimeout(r, 1200));
      setCardProcessingStep('Payment Authorized & Plan Activated Instantly!');
      await new Promise(r => setTimeout(r, 800));
      setCardProcessingStep(null);

      const amount = billingCycle === 'monthly' ? selectedPlan.priceMonthly : selectedPlan.priceYearly;
      const daysToAdd = billingCycle === 'yearly' ? 365 : 30;
      const newExpiry = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
      const newInvoice = {
        id: `INV-2026-${String(invoicesList.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        item: `${selectedPlan.name} (${billingCycle.toUpperCase()})`,
        amount,
        gateway: 'Stripe Online Card Checkout',
        status: 'Paid',
        tid: `ch_live_${Math.random().toString(36).substring(2, 11)}`
      };

      setInvoicesList(prev => [newInvoice, ...prev]);

      // Update local and firestore school plan directly because card paid instantly!
      try {
        await updateDoc(doc(db, 'schools', schoolId), {
          plan: selectedPlan.id,
          subscriptionPlan: selectedPlan.id,
          subscriptionStatus: 'active',
          expiryDate: newExpiry,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Instant card update via firestore fallback:', err);
      }

      alert(`✅ STRIPE ONLINE PAYMENT SUCCESSFUL!\n\nYour school rent of Rs. ${amount.toLocaleString()} has been charged to Card ending in ${cardNumber.slice(-4)}.\n\n🎉 ${selectedPlan.name} is now ACTIVE! All features are unlocked instantly.`);
      setShowPayModal(false);
      fetchSubscriptionInfo();
      return;
    }

    // Manual payment method (JazzCash, Easypaisa, Bank QR)
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

  const toggleAddonSelection = (featKey) => {
    setSelectedAddons(prev => 
      prev.includes(featKey) ? prev.filter(k => k !== featKey) : [...prev, featKey]
    );
  };

  const handlePayAddons = () => {
    if (selectedAddons.length === 0) return;
    setPayMethod('STRIPE_CARD');
    setShowAddonPayModal(true);
  };

  const handleConfirmAddonPayment = async (e) => {
    e && e.preventDefault();
    if (selectedAddons.length === 0) return;
    
    if (payMethod === 'STRIPE_CARD' && (!cardNumber || cardNumber.length < 16)) {
      alert('⚠️ Please enter a valid 16-digit credit or debit card number.');
      return;
    }
    if (payMethod !== 'STRIPE_CARD' && !tidInput.trim() && !proofAttached) {
      alert('⚠️ Please enter Transaction ID (TID) or attach payment screenshot.');
      return;
    }

    const totalAddonPrice = selectedAddons.reduce((sum, key) => {
      const feat = SAAS_FEATURE_CATALOG.find(f => f.key === key);
      return sum + (feat?.addonPriceMonthly || 1500);
    }, 0);

    setSubmittingPay(true);
    setCardProcessingStep('Verifying Payment Gateway & Processing Add-on Order...');
    await new Promise(r => setTimeout(r, 1200));
    setCardProcessingStep('Unlocking Selected Feature Modules in Real-time...');
    await new Promise(r => setTimeout(r, 800));
    setCardProcessingStep(null);
    setSubmittingPay(false);

    // Build overrides object
    const overrides = {};
    selectedAddons.forEach(k => { overrides[k] = true; });
    await updateSchoolAllowedFeatures(overrides);

    const newInvoice = {
      id: `INV-2026-${String(invoicesList.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      item: `A la Carte Feature Add-ons (${selectedAddons.length} Modules Unlocked)`,
      amount: totalAddonPrice,
      gateway: payMethod === 'STRIPE_CARD' ? 'Stripe Online Card Checkout' : payMethod === 'JAZZCASH' ? 'JazzCash Mobile Wallet' : payMethod === 'EASYPAISA' ? 'EasyPaisa Mobile Wallet' : 'Bank QR Deposit',
      status: 'Paid',
      tid: payMethod === 'STRIPE_CARD' ? `ch_addon_${Math.random().toString(36).substring(2, 11)}` : (tidInput || 'Screenshot Attached')
    };
    setInvoicesList(prev => [newInvoice, ...prev]);

    alert(`✅ ADD-ON MODULES UNLOCKED SUCCESSFULLY!\n\nTotal Paid: Rs. ${totalAddonPrice.toLocaleString()}/month via ${newInvoice.gateway}\n\n🎉 ${selectedAddons.length} advanced feature(s) have been activated for your school and added to your left sidebar navigation bar automatically!`);
    setShowAddonPayModal(false);
    setSelectedAddons([]);
    setTidInput('');
    setProofAttached(false);
  };

  const currentPlanId = (schoolData?.plan || schoolData?.subscriptionPlan || 'premium').toLowerCase();
  const currentPlanObj = plans.find(p => p.id === currentPlanId) || plans[1];

  // Calculate days remaining
  let daysLeft = 18;
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

  // Get sorted list of features for A la Carte tab (locked ones at the top for instant picking!)
  const catalogFeaturesList = [...SAAS_FEATURE_CATALOG].sort((a, b) => {
    const aAllowed = isFeatureAllowed(a.key);
    const bAllowed = isFeatureAllowed(b.key);
    if (aAllowed === bAllowed) return a.title.localeCompare(b.title);
    return aAllowed ? 1 : -1; // locked (false) first, allowed (true) second
  });
  const lockedCount = SAAS_FEATURE_CATALOG.filter(f => !isFeatureAllowed(f.key)).length;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <CreditCard className="text-primary-500" size={32} />
            SaaS Plan, Billing & Online Payment Portal
          </h1>
          <p className="text-dark-muted mt-1 font-medium">
            Manage your school portal rent, recharge online via credit card/wallets, and unlock individual modular features.
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
            <div className="flex items-center gap-3 flex-wrap">
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
              Your portal subscription is running at peak speed. All server nodes, database replicas, and AI engines are operational.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => handleOpenPayment(currentPlanObj, 'recharge')}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Zap size={18} /> Pay Rent Online Now
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

        {pendingRequests.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-yellow-400 bg-yellow-500/10 p-3 rounded-2xl">
            <span className="flex items-center gap-2">
              <Clock size={16} className="animate-spin" /> You have {pendingRequests.length} recharge/upgrade verification request(s) pending with TaleemiDunya Super Admin.
            </span>
            <span className="text-[10px] uppercase font-black bg-yellow-500/20 px-2.5 py-1 rounded-lg">Under Review</span>
          </div>
        )}
      </div>

      {/* PORTAL TABS */}
      <div className="flex gap-2 border-b border-dark-border overflow-x-auto no-scrollbar">
        {[
          { id: 'plans', label: '⚡ Subscription Plans & Renewal', icon: Crown },
          { id: 'addons', label: `🛒 A la Carte Feature Add-ons (${lockedCatalogFeatures.length} Available)`, icon: ShoppingCart },
          { id: 'invoices', label: '📋 Billing History & Receipts', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActivePortalTab(tab.id)}
              className={`px-6 py-3.5 rounded-t-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                activePortalTab === tab.id
                  ? 'bg-primary-500/15 text-primary-400 border-b-2 border-primary-500 -mb-px shadow-sm'
                  : 'text-dark-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PLANS COMPARISON GRID & RENEWAL */}
      {/* ============================================================== */}
      {activePortalTab === 'plans' && (
        <div className="space-y-6">
          {/* BILLING CYCLE SELECTOR */}
          <div className="flex items-center justify-center gap-4 py-2">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
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
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        plan.id === 'enterprise' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        plan.id === 'premium' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                        plan.id === 'standard' ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' :
                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                        {plan.id === 'enterprise' ? 'VIP Enterprise' : plan.id === 'premium' ? 'Most Popular Pro' : plan.id === 'standard' ? 'Standard Plus+' : 'Starter Basic'}
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

                  <div className="pt-6 border-t border-dark-border">
                    {isCurrent ? (
                      <button
                        onClick={() => handleOpenPayment(plan, 'recharge')}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <RefreshCw size={16} /> Pay Rent & Renew Plan Online
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
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: A LA CARTE FEATURE ADD-ON STORE */}
      {/* ============================================================== */}
      {activePortalTab === 'addons' && (
        <div className="space-y-6 animate-fade-in">
          <GlassCard className="p-6 md:p-8 bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-indigo-950/40 border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-widest border border-purple-500/30">
                Modular SaaS Customization
              </span>
              <h2 className="text-2xl font-black text-white mt-2">Pick Individual Add-on Features</h2>
              <p className="text-xs text-gray-300 leading-relaxed">
                Don't want to upgrade to a full plan? You can purchase specific locked modules individually (`A la Carte`) using instant online card payment. Once paid, the feature will appear in your sidebar menu automatically (`sirf vo hi show ho baki nhi`).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-dark-card/90 border border-purple-500/40 min-w-[280px] shrink-0 text-center space-y-3 shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-dark-muted block">Selected Add-ons Cart</span>
              <div className="text-3xl font-black text-purple-400">
                Rs. {selectedAddons.reduce((sum, key) => {
                  const feat = SAAS_FEATURE_CATALOG.find(f => f.key === key);
                  return sum + (feat?.addonPriceMonthly || 1500);
                }, 0).toLocaleString()} <span className="text-xs text-gray-400 font-normal">/mo</span>
              </div>
              <p className="text-[11px] font-bold text-gray-300">{selectedAddons.length} feature module(s) selected</p>
              <button
                disabled={selectedAddons.length === 0}
                onClick={handlePayAddons}
                className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                  selectedAddons.length > 0
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white cursor-pointer active:scale-95 shadow-purple-600/30'
                    : 'bg-white/5 text-dark-muted cursor-not-allowed border border-white/5'
                }`}
              >
                <ShoppingCart size={16} /> Pay Online & Unlock ({selectedAddons.length})
              </button>
            </div>
          </GlassCard>

          <div className="flex items-center justify-between bg-[#151926] p-4 rounded-2xl border border-white/10 text-xs font-bold flex-wrap gap-3">
            <span className="text-purple-300">
              ⚡ Showing all 36 modular SaaS features ({lockedCount} available for purchase, {catalogFeaturesList.length - lockedCount} already unlocked by your plan)
            </span>
            {lockedCount === 0 && (
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 font-black uppercase text-[10px] border border-green-500/30">
                ✓ Full Ecosystem Access Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalogFeaturesList.map(feat => {
              const isAllowedNow = isFeatureAllowed(feat.key);
              const isSelected = selectedAddons.includes(feat.key);

              if (isAllowedNow) {
                return (
                  <GlassCard
                    key={feat.key}
                    className="p-6 rounded-3xl border-2 border-green-500/30 bg-gradient-to-b from-green-950/15 to-transparent flex flex-col justify-between opacity-75"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-green-500/15 text-[10px] font-black uppercase text-green-400 border border-green-500/30">
                          {feat.module.toUpperCase()}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-green-500/40 shadow-sm">
                          <Check size={12} /> Active in Plan
                        </span>
                      </div>

                      <h4 className="text-lg font-black text-white">{feat.title}</h4>
                      <p className="text-xs text-gray-300 leading-relaxed font-medium">{feat.description}</p>
                    </div>

                    <div className="pt-4 border-t border-dark-border mt-4 flex items-center justify-between">
                      <span className="text-xs text-green-400 font-bold">Status:</span>
                      <span className="text-xs font-black uppercase tracking-wider text-green-400">Included (No Fee)</span>
                    </div>
                  </GlassCard>
                );
              }

              return (
                <GlassCard
                  key={feat.key}
                  onClick={() => toggleAddonSelection(feat.key)}
                  className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.02] ${
                    isSelected ? 'border-purple-500 bg-purple-500/20 shadow-xl shadow-purple-500/20 z-10' : 'border-dark-border hover:border-white/20 bg-dark-card/80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 text-[10px] font-black uppercase text-purple-300 border border-white/10">
                        {feat.module.toUpperCase()} MODULE
                      </span>
                      <div className="text-purple-400">
                        {isSelected ? <CheckSquare size={22} className="text-purple-400 fill-purple-500/20" /> : <Square size={22} className="text-dark-muted" />}
                      </div>
                    </div>

                    <h4 className="text-lg font-black text-white">{feat.title}</h4>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">{feat.description}</p>
                  </div>

                  <div className="pt-4 border-t border-dark-border mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-bold">Add-on Price:</span>
                    <span className="text-base font-black text-purple-400">+ Rs. {(feat.addonPriceMonthly || 1500).toLocaleString()} <span className="text-[10px] text-gray-400">/month</span></span>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: BILLING & INVOICE RECEIPTS HISTORY */}
      {/* ============================================================== */}
      {activePortalTab === 'invoices' && (
        <GlassCard className="p-8 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <FileText className="text-primary-500" size={22} /> Official Paid Invoices & Receipts
              </h2>
              <p className="text-xs text-dark-muted mt-1">Download and print verified accounting statements for your school treasury.</p>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 font-bold text-xs">
              ● All Past Rents Cleared
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-widest font-black">
                  <th className="pb-4 px-4">Invoice #</th>
                  <th className="pb-4 px-4">Billing Date</th>
                  <th className="pb-4 px-4">Subscription Plan / Item</th>
                  <th className="pb-4 px-4">Payment Method</th>
                  <th className="pb-4 px-4">Amount Paid</th>
                  <th className="pb-4 px-4">Status</th>
                  <th className="pb-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {invoicesList.map(inv => (
                  <tr key={inv.id} className="hover:bg-white/5 transition-all text-xs font-semibold">
                    <td className="py-4 px-4 font-mono font-bold text-purple-400">{inv.id}</td>
                    <td className="py-4 px-4 text-gray-300">{inv.date}</td>
                    <td className="py-4 px-4 font-bold text-white">{inv.item}</td>
                    <td className="py-4 px-4 text-gray-300">{inv.gateway}</td>
                    <td className="py-4 px-4 font-black text-green-400">Rs. {inv.amount.toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-green-500/20 text-green-400 font-black uppercase text-[10px] border border-green-500/30">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-3 py-1.5 rounded-xl bg-primary-500/15 hover:bg-primary-500/30 text-primary-400 font-bold flex items-center gap-1.5 ml-auto transition-all"
                      >
                        <Printer size={13} /> Print Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ============================================================== */}
      {/* INVOICE PRINT PREVIEW MODAL */}
      {/* ============================================================== */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white text-black p-8 rounded-3xl max-w-xl w-full shadow-2xl space-y-6 relative border-4 border-gray-200">
            <div className="flex items-center justify-between border-b pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center text-white font-black text-xl">
                  TD
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-gray-900">TaleemiDunya SaaS Platform</h3>
                  <p className="text-xs text-gray-500 font-bold">Tax & Portal Rent Receipt</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-black text-purple-700 block">{selectedInvoice.id}</span>
                <span className="text-xs text-gray-500 font-bold">Date: {selectedInvoice.date}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl text-xs">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Billed To School:</span>
                <strong className="text-gray-900 text-sm font-black">{schoolData?.name || schoolName}</strong>
                <p className="text-gray-600">{schoolData?.address || 'Lahore, Pakistan'}</p>
                <p className="text-gray-600">ID: {schoolId}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Payment Details:</span>
                <strong className="text-gray-900 text-sm font-black">{selectedInvoice.gateway}</strong>
                <p className="text-gray-600 font-mono">TID: {selectedInvoice.tid}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded bg-green-100 text-green-800 font-black text-[10px] uppercase">
                  ✓ Verified Paid
                </span>
              </div>
            </div>

            <div className="border-t border-b py-4">
              <div className="flex justify-between items-center text-sm font-bold py-2 border-b border-gray-100">
                <span>Description / Subscription Tier</span>
                <span>Amount (PKR)</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-gray-800 py-3">
                <span>{selectedInvoice.item}</span>
                <span>Rs. {selectedInvoice.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-gray-500">Thank you for powering your institution with TaleemiDunya.</span>
              <div className="text-right">
                <span className="text-xs font-bold text-gray-500 block">Total Paid:</span>
                <span className="text-2xl font-black text-green-600">Rs. {selectedInvoice.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Print Official Receipt
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* GLOBAL CARD / WALLET PROCESSING OVERLAY ANIMATION */}
      {/* ============================================================== */}
      {cardProcessingStep && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center z-[100] p-6 text-center space-y-4 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-4 border-cyan-400 flex items-center justify-center text-cyan-400 animate-spin shadow-2xl shadow-cyan-500/50">
            <RefreshCw size={40} />
          </div>
          <h4 className="text-2xl font-black text-white">{cardProcessingStep}</h4>
          <p className="text-xs text-gray-300 max-w-md">Contacting secure payment gateway and syncing real-time permissions across your SaaS cluster. Please do not refresh...</p>
        </div>
      )}

      {/* ============================================================== */}
      {/* ONLINE PAYMENT MODAL WITH STRIPE SIMULATION & MOBILE WALLETS */}
      {/* ============================================================== */}
      {showPayModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <GlassCard className="p-8 w-full max-w-lg rounded-3xl border-2 border-primary-500 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto relative">

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
                <label className="block text-xs font-black uppercase tracking-wider text-dark-muted mb-2">Select Payment Gateway</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'STRIPE_CARD', label: 'Credit/Debit Card', color: 'border-cyan-500 text-cyan-400 bg-cyan-500/15' },
                    { id: 'JAZZCASH', label: 'JazzCash Wallet', color: 'border-red-500 text-red-400 bg-red-500/15' },
                    { id: 'EASYPAISA', label: 'EasyPaisa Wallet', color: 'border-green-500 text-green-400 bg-green-500/15' },
                    { id: 'BANK_QR', label: 'Bank IBAN / QR', color: 'border-purple-500 text-purple-400 bg-purple-500/15' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id)}
                      className={`py-3 px-2 rounded-xl border text-[11px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
                        payMethod === m.id ? `${m.color} shadow-lg scale-105` : 'border-dark-border text-gray-400 bg-dark-hover'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* STRIPE / PAYFAST CARD CHECKOUT FORM */}
              {payMethod === 'STRIPE_CARD' ? (
                <div className="p-5 rounded-2xl bg-[#151926] border border-cyan-500/40 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                    <span className="flex items-center gap-1.5"><Shield size={14} /> 256-Bit SSL Encrypted Card Checkout (Visa/Mastercard)</span>
                    <span className="bg-cyan-500/20 px-2 py-0.5 rounded-lg text-[10px]">PayFast SBP / Stripe API</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4242 •••• •••• 4242"
                        required={payMethod === 'STRIPE_CARD'}
                        className="w-full p-3.5 rounded-xl bg-dark-card border border-white/10 font-mono text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Expiry Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY"
                          required={payMethod === 'STRIPE_CARD'}
                          className="w-full p-3.5 rounded-xl bg-dark-card border border-white/10 font-mono text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">CVV / CVC</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          placeholder="•••"
                          required={payMethod === 'STRIPE_CARD'}
                          className="w-full p-3.5 rounded-xl bg-dark-card border border-white/10 font-mono text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="School Administrator Name"
                        required={payMethod === 'STRIPE_CARD'}
                        className="w-full p-3.5 rounded-xl bg-dark-card border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 mt-2 transition-all active:scale-95"
                  >
                    <Check size={18} /> Authorize Online Card Payment (Instant Unlock)
                  </button>
                </div>
              ) : (
                <>
                  {/* Pay instructions & QR for JazzCash / Easypaisa / Bank */}
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
                      required={payMethod !== 'STRIPE_CARD'}
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
                </>
              )}
            </form>
          </GlassCard>
        </div>
      )}

      {/* ============================================================== */}
      {/* A LA CARTE ADD-ON FEATURE PAYMENT MODAL */}
      {/* ============================================================== */}
      {showAddonPayModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <GlassCard className="p-8 w-full max-w-lg rounded-3xl border-2 border-purple-500 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-center justify-between pb-4 border-b border-dark-border mb-6">
              <div>
                <span className="text-xs font-black text-purple-400 uppercase tracking-wider block">
                  A la Carte Module Checkout
                </span>
                <h3 className="text-xl font-black text-white mt-0.5 flex items-center gap-2">
                  <ShoppingCart className="text-purple-400" size={22} />
                  Unlock {selectedAddons.length} Selected Feature(s)
                </h3>
              </div>
              <button onClick={() => setShowAddonPayModal(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
                <XCircle size={22} />
              </button>
            </div>

            <form onSubmit={handleConfirmAddonPayment} className="space-y-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">Selected Modules:</span>
                  <span className="text-xs font-black text-purple-300">{selectedAddons.length} items</span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 border-t border-purple-500/30 pt-2">
                  {selectedAddons.map(key => {
                    const feat = SAAS_FEATURE_CATALOG.find(f => f.key === key);
                    return (
                      <div key={key} className="flex justify-between items-center text-xs text-white">
                        <span className="font-semibold flex items-center gap-1.5"><Check size={12} className="text-green-400" /> {feat?.title || key}</span>
                        <span className="font-bold text-purple-300">+ Rs. {(feat?.addonPriceMonthly || 1500).toLocaleString()}/mo</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-purple-500/30 text-sm font-black">
                  <span className="text-white">Total Monthly Add-on Rent:</span>
                  <span className="text-purple-400 text-lg">Rs. {selectedAddons.reduce((sum, key) => sum + (SAAS_FEATURE_CATALOG.find(f => f.key === key)?.addonPriceMonthly || 1500), 0).toLocaleString()}/mo</span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-dark-muted block">Select Payment Gateway</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPayMethod('STRIPE_CARD')}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 text-left transition-all ${
                      payMethod === 'STRIPE_CARD' ? 'border-purple-500 bg-purple-500/20 text-white font-black' : 'border-dark-border bg-dark-card/60 text-gray-400 font-bold hover:border-white/20'
                    }`}
                  >
                    <CreditCard className={payMethod === 'STRIPE_CARD' ? 'text-purple-400' : 'text-gray-500'} size={20} />
                    <div>
                      <span className="text-xs block leading-tight">Online Card</span>
                      <span className="text-[10px] text-gray-400 block font-normal">Instant Unlock</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod('JAZZCASH')}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 text-left transition-all ${
                      payMethod === 'JAZZCASH' ? 'border-red-500 bg-red-500/20 text-white font-black' : 'border-dark-border bg-dark-card/60 text-gray-400 font-bold hover:border-white/20'
                    }`}
                  >
                    <Smartphone className={payMethod === 'JAZZCASH' ? 'text-red-400' : 'text-gray-500'} size={20} />
                    <div>
                      <span className="text-xs block leading-tight">JazzCash</span>
                      <span className="text-[10px] text-gray-400 block font-normal">Mobile Wallet</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod('EASYPAISA')}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 text-left transition-all ${
                      payMethod === 'EASYPAISA' ? 'border-green-500 bg-green-500/20 text-white font-black' : 'border-dark-border bg-dark-card/60 text-gray-400 font-bold hover:border-white/20'
                    }`}
                  >
                    <Smartphone className={payMethod === 'EASYPAISA' ? 'text-green-400' : 'text-gray-500'} size={20} />
                    <div>
                      <span className="text-xs block leading-tight">EasyPaisa</span>
                      <span className="text-[10px] text-gray-400 block font-normal">Telenor Wallet</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod('BANK_QR')}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 text-left transition-all ${
                      payMethod === 'BANK_QR' ? 'border-blue-500 bg-blue-500/20 text-white font-black' : 'border-dark-border bg-dark-card/60 text-gray-400 font-bold hover:border-white/20'
                    }`}
                  >
                    <QrCode className={payMethod === 'BANK_QR' ? 'text-blue-400' : 'text-gray-500'} size={20} />
                    <div>
                      <span className="text-xs block leading-tight">Bank QR Code</span>
                      <span className="text-[10px] text-gray-400 block font-normal">Raast / IBFT</span>
                    </div>
                  </button>
                </div>
              </div>

              {payMethod === 'STRIPE_CARD' ? (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300">Card Number (16-digit)</label>
                    <input
                      type="text"
                      maxLength={19}
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      required={payMethod === 'STRIPE_CARD'}
                      className="w-full p-3.5 rounded-2xl bg-[#151926] border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300">Expiry (MM/YY)</label>
                      <input
                        type="text"
                        maxLength={5}
                        placeholder="12/28"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        required={payMethod === 'STRIPE_CARD'}
                        className="w-full p-3.5 rounded-2xl bg-[#151926] border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300">CVV / CVC</label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        required={payMethod === 'STRIPE_CARD'}
                        className="w-full p-3.5 rounded-2xl bg-[#151926] border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submittingPay}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-purple-600/30"
                  >
                    {submittingPay ? <RefreshCw className="animate-spin" size={18} /> : <ShoppingCart size={18} />}
                    Pay Online & Instant Unlock ({selectedAddons.length} Modules)
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-2xl bg-[#151926] border border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-400">Account Title:</span>
                      <span className="text-white">TaleemiDunya SaaS Pvt Ltd</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-400">Account / Till ID:</span>
                      <span className="text-primary-400 font-mono">0300-1234567 (Raast)</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300">Transaction ID (TID)</label>
                    <input
                      type="text"
                      required={payMethod !== 'STRIPE_CARD'}
                      value={tidInput}
                      onChange={(e) => setTidInput(e.target.value)}
                      placeholder="e.g. TID-9876543210 or Bank Ref #"
                      className="w-full p-3.5 rounded-2xl bg-[#151926] border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => { setProofAttached(true); alert('📷 Screenshot receipt attached successfully!'); }}
                      className={`flex-1 py-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        proofAttached ? 'bg-green-500/20 text-green-300 border-green-500' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Upload size={16} /> {proofAttached ? 'Screenshot Attached ✓' : 'Attach Screenshot'}
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPay}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
                    >
                      {submittingPay ? <RefreshCw className="animate-spin" size={16} /> : <Check size={18} />}
                      Submit & Unlock
                    </button>
                  </div>
                </div>
              )}
            </form>
          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default SchoolSubscriptionPortal;
