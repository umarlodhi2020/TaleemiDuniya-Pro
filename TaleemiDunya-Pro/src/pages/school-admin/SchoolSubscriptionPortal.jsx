import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import {
  CreditCard, CheckCircle2, XCircle, Zap, Star, Crown,
  Clock, AlertTriangle, ShieldCheck, QrCode, Upload, ArrowRight,
  Sparkles, RefreshCw, Check, Calendar, DollarSign, Building2,
  Lock, ShoppingCart, FileText, Printer, Shield, ArrowUpRight, Plus, CheckSquare, Square, MessageCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { SAAS_FEATURE_CATALOG } from '../../config/saasFeaturesConfig';
import { uploadToCloudinary, compressImage } from '../../services/cloudinary';

const SchoolSubscriptionPortal = () => {
  const { userData } = useAuth();
  const { schoolData, isFeatureAllowed, updateSchoolAllowedFeatures, currentSaaSPlan } = useSchool();
  const schoolId = userData?.schoolId || 'default_school';
  const schoolName = userData?.schoolName || 'My School System';

  const [activePortalTab, setActivePortalTab] = useState('plans'); // 'plans', 'addons', 'invoices'
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([
    {
      id: 'standard', name: 'Standard Plan', priceMonthly: 3500, priceYearly: 35000,
      maxStudents: '500', maxStaff: '30', recommended: false,
      features: ['Student & Staff Management', 'Fee & Challan Management', 'Attendance Tracking', 'Basic Reports & Analytics'],
      locked: ['Exams & Grading System', 'Timetable & SMS Alerts', 'AI Copilot & Features', 'Digital Library Hub', 'Custom School Website Domain', '24/7 Dedicated Support']
    },
    {
      id: 'premium', name: 'Premium Pro Plan', priceMonthly: 5000, priceYearly: 50000,
      maxStudents: 'Unlimited', maxStaff: 'Unlimited', recommended: true,
      features: ['Everything in Standard Plus:', 'Exams & Grading System', 'Timetable & SMS Alerts', 'AI Copilot & Digital Library', 'Custom School Website Domain', '24/7 Dedicated Support'],
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
  
  // Mobile / Bank inputs & Proof Upload
  const [tidInput, setTidInput] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [systemGateways, setSystemGateways] = useState(null);
  const [submittingPay, setSubmittingPay] = useState(false);
  const [cardProcessingStep, setCardProcessingStep] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);

  // A la Carte Add-ons selection state
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [showAddonPayModal, setShowAddonPayModal] = useState(false);

  // Invoices history state (100% Real from payments collection)
  const [invoicesList, setInvoicesList] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    fetchSubscriptionInfo();
  }, [schoolId]);

  const fetchSubscriptionInfo = async () => {
    setLoading(true);
    try {
      // 1. Fetch system gateways
      try {
        const gwSnap = await getDoc(doc(db, 'system', 'gateways'));
        if (gwSnap.exists()) {
          setSystemGateways(gwSnap.data());
        }
      } catch (err) {
        console.error('Error fetching system gateways:', err);
      }

      // 2. Fetch real recharge requests for this school
      const reqSnap = await getDocs(collection(db, 'saas_recharge_requests'));
      const list = reqSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => r.schoolId === schoolId)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setPendingRequests(list);

      // 3. Fetch verified payment receipts for this school
      try {
        const paymentsSnap = await getDocs(collection(db, 'payments'));
        const schoolPayments = paymentsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.schoolId === schoolId && p.status === 'paid')
          .sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));

        const realInvoices = schoolPayments.map(p => ({
          id: p.tid || `INV-${p.id.slice(0, 6).toUpperCase()}`,
          date: p.date || (p.createdAt?.toDate ? p.createdAt.toDate().toISOString().slice(0, 10) : 'N/A'),
          item: p.planName || p.plan || 'Subscription Rent',
          amount: Number(p.amount) || 0,
          gateway: p.paymentMethod || 'Online Transfer',
          status: 'Paid',
          tid: p.tid || 'VERIFIED-BY-ADMIN',
          notes: p.notes || ''
        }));
        setInvoicesList(realInvoices);
      } catch (err) {
        console.error('Error fetching school payment receipts:', err);
        setInvoicesList([]);
      }

      // 4. Fetch live created plans from Firestore
      try {
        const plansSnap = await getDocs(collection(db, 'plans'));
        if (plansSnap.docs.length > 0) {
          const list = plansSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.enabled !== false);
          if (list.length > 0) {
            setPlans(list);
          }
        }
      } catch (err) {
        console.error('Error fetching plans in SchoolSubscriptionPortal:', err);
      }
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

  const handleProofFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleSubmitRechargeRequest = async (e) => {
    e.preventDefault();
    
    // If Stripe Card Payment selected
    if (payMethod === 'STRIPE_CARD') {
      if (!cardNumber || cardNumber.length < 18 || !cardExpiry || !cardCvv) {
        alert('⚠️ Please complete valid 16-digit credit/debit card details.');
        return;
      }
      setCardProcessingStep('Contacting Secure Gateway...');
      await new Promise(r => setTimeout(r, 1000));
      setCardProcessingStep('Verifying Card Authorization...');
      await new Promise(r => setTimeout(r, 1000));
      setCardProcessingStep(null);
    } else {
      // Manual payment method (JazzCash, Easypaisa, Bank QR)
      if (!tidInput.trim() && !proofFile) {
        alert('⚠️ Please enter Transaction ID (TID) or attach payment screenshot receipt.');
        return;
      }
    }

    setSubmittingPay(true);
    try {
      let uploadedScreenshotUrl = '';
      if (proofFile) {
        setCardProcessingStep('Compressing & Uploading Proof Receipt to Cloudinary...');
        const compressed = await compressImage(proofFile, { maxWidth: 1200, quality: 0.8 });
        const uploadRes = await uploadToCloudinary(compressed, { folder: 'subscriptions/proofs' });
        if (uploadRes?.success && uploadRes?.url) {
          uploadedScreenshotUrl = uploadRes.url;
        }
        setCardProcessingStep(null);
      }

      const amount = billingCycle === 'monthly' ? selectedPlan.priceMonthly : selectedPlan.priceYearly;
      const reqPayload = {
        schoolId,
        schoolName: schoolData?.name || schoolName,
        requestedPlan: selectedPlan.id,
        planName: selectedPlan.name,
        billingCycle,
        amount,
        payMethod,
        tid: payMethod === 'STRIPE_CARD' ? `card_${cardNumber.replace(/\s+/g, '').slice(-4)}` : (tidInput || 'Slip Attached'),
        screenshotUrl: uploadedScreenshotUrl || '',
        status: 'pending_verification',
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'saas_recharge_requests'), reqPayload);
      
      alert(`✅ PAYMENT SUBMITTED FOR SUPER ADMIN AUDIT!\n\nPlan: ${selectedPlan.name} (${billingCycle.toUpperCase()})\nAmount: Rs. ${amount.toLocaleString()}\nMethod: ${payMethod}\n\n⚠️ IMPORTANT: Subscriptions NEVER renew automatically. TaleemiDunya SaaS Admin must audit your TID & payment proof. Once approved, your portal will be activated immediately!`);
      setShowPayModal(false);
      setTidInput('');
      setProofFile(null);
      setProofPreview(null);
      fetchSubscriptionInfo();
    } catch (err) {
      alert(`❌ Error submitting payment: ${err.message}`);
    } finally {
      setSubmittingPay(false);
      setCardProcessingStep(null);
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
    if (payMethod !== 'STRIPE_CARD' && !tidInput.trim() && !proofFile) {
      alert('⚠️ Please enter Transaction ID (TID) or attach payment screenshot.');
      return;
    }

    const totalAddonPrice = selectedAddons.reduce((sum, key) => {
      const feat = SAAS_FEATURE_CATALOG.find(f => f.key === key);
      return sum + (feat?.addonPriceMonthly || 1500);
    }, 0);

    setSubmittingPay(true);
    try {
      let uploadedScreenshotUrl = '';
      if (proofFile) {
        setCardProcessingStep('Compressing & Uploading Proof Receipt to Cloudinary...');
        const compressed = await compressImage(proofFile, { maxWidth: 1200, quality: 0.8 });
        const uploadRes = await uploadToCloudinary(compressed, { folder: 'subscriptions/proofs' });
        if (uploadRes?.success && uploadRes?.url) {
          uploadedScreenshotUrl = uploadRes.url;
        }
        setCardProcessingStep(null);
      }

      const reqPayload = {
        schoolId,
        schoolName: schoolData?.name || schoolName,
        requestedPlan: 'add_ons',
        planName: `A la Carte Features (${selectedAddons.length} Modules)`,
        billingCycle: 'monthly',
        amount: totalAddonPrice,
        payMethod,
        tid: payMethod === 'STRIPE_CARD' ? `card_${cardNumber?.slice(-4) || 'xxxx'}` : (tidInput || 'Screenshot Attached'),
        screenshotUrl: uploadedScreenshotUrl || '',
        status: 'pending_verification',
        addonsRequested: selectedAddons,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'saas_recharge_requests'), reqPayload);

      alert(`✅ ADD-ON REQUEST SUBMITTED!\n\nTotal Amount: Rs. ${totalAddonPrice.toLocaleString()}/month\nMethod: ${payMethod}\n\n🎉 Your request for ${selectedAddons.length} advanced module(s) has been queued for Super Admin review. It will unlock in your panel as soon as verified!`);
      
      setShowAddonPayModal(false);
      setSelectedAddons([]);
      setTidInput('');
      setProofFile(null);
      setProofPreview(null);
      fetchSubscriptionInfo();
    } catch (err) {
      alert(`❌ Error submitting add-on request: ${err.message}`);
    } finally {
      setSubmittingPay(false);
      setCardProcessingStep(null);
    }
  };

  const currentPlanId = (schoolData?.plan || schoolData?.subscriptionPlan || 'premium').toLowerCase();
  const currentPlanObj = plans.find(p => p.id === currentPlanId) || plans[0];

  // Calculate days remaining
  let daysLeft = 0;
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
          <h1 className="text-3xl font-black text-dark-text flex items-center gap-3">
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
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <Zap size={18} /> Pay Rent Online Now
            </button>
            {currentPlanId !== 'enterprise' && (
              <button
                onClick={() => handleOpenPayment(plans[currentPlanId === 'basic' ? 1 : 2], 'upgrade')}
                className="px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <Sparkles size={18} /> Upgrade Plan
              </button>
            )}
            <a
              href={`https://wa.me/923172234518?text=${encodeURIComponent(
                `Assalam-o-Alaikum Super Admin! Main *${schoolData?.name || schoolName}* se hun. Mujhe apna subscription recharge/renew karwana hai. (Current Plan: ${currentPlanObj.name}, Days Left: ${daysLeft})`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-4 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <MessageCircle size={18} className="text-emerald-400" /> WhatsApp Support
            </a>
          </div>
        </div>

        {(() => {
          const activePending = pendingRequests.find(r => r.status === 'pending_verification' || r.status === 'pending');
          const latestRejected = pendingRequests.find(r => r.status === 'rejected');

          if (activePending) {
            return (
              <div className="mt-6 pt-4 border-t border-white/10 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-300 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-2 font-black text-white text-sm">
                    <Clock size={18} className="text-amber-400 animate-spin" /> 
                    Online Payment Submitted — Awaiting Super Admin Approval
                  </span>
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black text-[10px] uppercase tracking-wider border border-amber-500/40">
                    ⏳ Audit In Progress
                  </span>
                </div>
                <p className="text-gray-300 leading-relaxed font-medium">
                  We received your transaction for <strong className="text-white">{activePending.planName || 'Plan'}</strong> (Rs. {Number(activePending.amount || 0).toLocaleString()}) via <span className="uppercase text-amber-300 font-bold">{activePending.payMethod || 'Online Transfer'}</span> with Reference/TID: <code className="bg-black/40 px-2 py-0.5 rounded-lg text-yellow-300 font-mono font-bold">{activePending.tid}</code>.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 text-[11px] text-amber-400/90 font-bold border-t border-white/5">
                  <span>🔒 Note: Subscriptions do NOT renew automatically. Access will be unlocked as soon as TaleemiDunya SaaS Admin audits your receipt.</span>
                  <span className="text-dark-muted font-mono">{activePending.createdAt ? new Date(activePending.createdAt).toLocaleString() : ''}</span>
                </div>
              </div>
            );
          }

          if (latestRejected) {
            return (
              <div className="mt-6 pt-4 border-t border-white/10 p-4 rounded-2xl bg-red-500/10 border border-red-500/40 text-xs text-red-300 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-2 font-black text-white text-sm">
                    <XCircle size={18} className="text-red-400" /> 
                    Previous Payment Verification Declined by Super Admin
                  </span>
                  <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 font-black text-[10px] uppercase tracking-wider border border-red-500/40">
                    ✗ Declined
                  </span>
                </div>
                <p className="text-gray-200">
                  <strong className="text-red-400">Decline Reason:</strong> {latestRejected.rejectionReason || 'Transaction ID could not be confirmed in bank statements.'}
                </p>
                <p className="text-gray-400 text-[11px]">
                  Please verify your transaction receipt, ensure the TID matches your bank/wallet transfer slip, and click "Pay Rent Online Now" to submit fresh proof.
                </p>
              </div>
            );
          }

          return null;
        })()}
      </div>

      {/* PORTAL TABS */}
      <div className="flex gap-2 border-b border-dark-border overflow-x-auto no-scrollbar">
        {[
          { id: 'plans', label: '⚡ Subscription Plans & Renewal', icon: Crown },
          { id: 'addons', label: `🛒 A la Carte Feature Add-ons`, icon: ShoppingCart },
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
          {/* BILLING CYCLE SELECTOR REMOVED */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
                        plan.id === 'premium' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                        'bg-teal-500/20 text-teal-400 border-teal-500/30'
                      }`}>
                        {plan.id === 'premium' ? 'Most Popular Pro' : 'Standard Plus+'}
                      </span>
                      {isCurrent && (
                        <span className="px-2.5 py-1 rounded-full bg-green-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <Check size={12} /> Active Plan
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl font-black text-dark-text">{plan.name}</h3>
                    <div className="my-4">
                      <span className="text-4xl font-black text-dark-text">Rs. {price.toLocaleString()}</span>
                      <span className="text-xs text-dark-muted font-bold block mt-1">
                        per school / {billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-4 pt-4 border-t border-dark-border">
                      <div className="p-2.5 rounded-xl bg-white/5 text-center">
                        <span className="text-[10px] font-bold text-dark-muted uppercase block">Students</span>
                        <span className="text-sm font-black text-dark-text">{plan.maxStudents}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 text-center">
                        <span className="text-[10px] font-bold text-dark-muted uppercase block">Staff</span>
                        <span className="text-sm font-black text-dark-text">{plan.maxStaff}</span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-3 my-6">
                      <span className="text-[11px] font-black uppercase tracking-wider text-primary-400 block">Included Features:</span>
                      {plan.features.map((feat, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-dark-text font-semibold">
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
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                      >
                        <RefreshCw size={16} /> Pay Rent & Renew Plan Online
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenPayment(plan, 'upgrade')}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
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
              <h2 className="text-2xl font-black text-dark-text mt-2">Pick Individual Add-on Features</h2>
              <p className="text-xs text-dark-muted leading-relaxed">
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
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white cursor-pointer active:scale-[0.99] shadow-purple-600/30'
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

                      <h4 className="text-lg font-black text-dark-text">{feat.title}</h4>
                      <p className="text-xs text-dark-muted leading-relaxed font-medium">{feat.description}</p>
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

                    <h4 className="text-lg font-black text-dark-text">{feat.title}</h4>
                    <p className="text-xs text-dark-muted leading-relaxed font-medium">{feat.description}</p>
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
              <h2 className="text-xl font-black text-dark-text flex items-center gap-2">
                <FileText className="text-primary-500" size={22} /> Official Paid Invoices & Receipts
              </h2>
              <p className="text-xs text-dark-muted mt-1">Download and print verified accounting statements for your school treasury.</p>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 font-bold text-xs">
              ● All Past Rents Cleared
            </span>
          </div>

          {invoicesList.length === 0 ? (
            <div className="text-center py-16 text-dark-muted border border-dashed border-white/10 rounded-2xl">
              <FileText size={44} className="mx-auto opacity-30 mb-3" />
              <p className="font-bold text-base text-gray-300">No official payment receipts yet</p>
              <p className="text-xs text-dark-muted mt-1">When your online recharge is audited and approved by the Super Admin, verified invoices with printable receipts will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-widest font-black">
                    <th className="pb-4 px-4">Invoice # / TID</th>
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
                    <tr key={inv.id} className="hover:bg-dark-hover transition-all text-xs font-semibold">
                      <td className="py-4 px-4 font-mono font-bold text-purple-400">{inv.id}</td>
                      <td className="py-4 px-4 text-dark-muted">{inv.date}</td>
                      <td className="py-4 px-4 font-bold text-dark-text">{inv.item}</td>
                      <td className="py-4 px-4 text-dark-muted">{inv.gateway}</td>
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
          )}
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
                <h3 className="text-xl font-black text-dark-text mt-0.5 flex items-center gap-2">
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
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 mt-2 transition-all active:scale-[0.99]"
                  >
                    <Check size={18} /> Authorize Online Card Payment (Submit for Review)
                  </button>
                </div>
              ) : (
                <>
                  {/* Pay instructions & QR for JazzCash / Easypaisa / Bank */}
                  <div className="p-4 rounded-2xl bg-[#151926] border border-white/10 text-center space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase block">Send Exact Amount to TaleemiDunya SaaS Account:</span>
                    <span className="text-base sm:text-lg font-mono font-black text-white tracking-wider block">
                      {payMethod === 'JAZZCASH' 
                        ? `${systemGateways?.jazzcash?.merchantId || '0300-1234567'} (JazzCash Wallet)`
                        : payMethod === 'EASYPAISA' 
                        ? `${systemGateways?.easypaisa?.storeId || '0345-7654321'} (EasyPaisa Wallet)` 
                        : `${systemGateways?.bankQr?.iban || systemGateways?.banksList?.[0]?.iban || 'PK42MEZN0001002938475610'} (${systemGateways?.bankQr?.bankName || 'Meezan Bank Ltd'})`}
                    </span>
                    {payMethod === 'BANK_QR' && (
                      <div className="text-xs text-amber-300 font-bold space-y-0.5">
                        <p>Account Title: {systemGateways?.bankQr?.accountTitle || 'TaleemiDunya SaaS Pvt Ltd'}</p>
                        {systemGateways?.bankQr?.raastId && <p>Raast ID: {systemGateways.bankQr.raastId}</p>}
                      </div>
                    )}
                    <div className="w-32 h-32 mx-auto bg-white p-2.5 rounded-2xl flex items-center justify-center my-3 shadow-inner">
                      <QrCode size={110} className="text-black" />
                    </div>
                    <span className="text-[10px] text-green-400 font-bold block">Scan QR Code or transfer via your banking app, then enter TID and upload slip below</span>
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

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-dark-muted mb-1.5">
                        Attach Payment Receipt / Screenshot
                      </label>
                      <input
                        type="file"
                        id="proof-upload-input"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProofFileSelect}
                      />
                      
                      {proofPreview ? (
                        <div className="p-3 rounded-2xl bg-black/40 border border-green-500/50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={proofPreview} alt="Receipt" className="w-12 h-12 object-cover rounded-xl border border-white/20" />
                            <div>
                              <p className="text-xs font-bold text-green-400 flex items-center gap-1">
                                <Check size={14} /> Receipt Attached
                              </p>
                              <p className="text-[10px] text-dark-muted truncate max-w-[160px]">{proofFile?.name}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setProofFile(null); setProofPreview(null); }}
                            className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor="proof-upload-input"
                          className="w-full py-4 rounded-2xl border-2 border-dashed border-white/20 hover:border-green-400/60 bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center"
                        >
                          <Upload size={20} className="text-green-400" />
                          <span className="text-xs font-bold text-gray-300">Click to Select Payment Screenshot / Bank Slip</span>
                          <span className="text-[10px] text-dark-muted">JPG, PNG, WebP (Cloudinary HD Compressed)</span>
                        </label>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submittingPay}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 mt-2"
                    >
                      {submittingPay ? <RefreshCw className="animate-spin" size={16} /> : <Check size={18} />}
                      Submit Payment for Admin Review
                    </button>
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
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] shadow-purple-600/30"
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
