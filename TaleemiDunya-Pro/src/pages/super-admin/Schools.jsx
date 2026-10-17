import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  School, Plus, Search, CheckCircle2, XCircle, Calendar,
  CreditCard, Edit, Trash2, ShieldAlert, ShieldCheck,
  Filter, Users, Mail, RefreshCw, Loader2, Sparkles, Clock, AlertTriangle,
  Eye, Check, ExternalLink, ArrowRight, DollarSign, Image as ImageIcon,
  CheckCircle, AlertCircle, Phone, ArrowUpRight, Zap, MessageCircle, Send, Smartphone
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const planColors = {
  Basic: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Standard: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  Premium: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Enterprise: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

// Calculate real-time subscription & payment metrics for a school
export const getSchoolSubscriptionMetrics = (school, rechargeList = []) => {
  const rawExpiry = school.expiryDate || school.expiry || '';
  let daysLeft = null;
  let expiryStatus = 'no_date'; // 'safe', 'warning', 'urgent', 'expired', 'no_date'

  if (rawExpiry) {
    const expDate = new Date(rawExpiry);
    if (!isNaN(expDate.getTime())) {
      const now = new Date();
      const expClean = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
      const todayClean = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      daysLeft = Math.round((expClean - todayClean) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        expiryStatus = 'expired';
      } else if (daysLeft === 0) {
        expiryStatus = 'urgent'; // Expires Today!
      } else if (daysLeft <= 7) {
        expiryStatus = 'warning'; // Expiring Soon (< 7 days)
      } else {
        expiryStatus = 'safe';
      }
    }
  }

  // Cross-reference against pending payment verification requests
  const schoolRequests = rechargeList.filter(r => r.schoolId === school.id);
  const pendingProof = schoolRequests.find(r => r.status === 'pending_verification');
  const latestApproved = schoolRequests.find(r => r.status === 'approved');

  // Determine Payment Status
  let paymentStatus = 'unpaid'; // 'paid', 'pending_proof', 'unpaid'
  let paymentLabel = 'Unpaid / Overdue';

  if (pendingProof) {
    paymentStatus = 'pending_proof';
    paymentLabel = 'Proof Under Review';
  } else if (daysLeft !== null && daysLeft > 0 && school.status === 'active') {
    paymentStatus = 'paid';
    paymentLabel = 'Verified Paid';
  } else if (daysLeft !== null && daysLeft <= 0) {
    paymentStatus = 'unpaid';
    paymentLabel = 'Unpaid / Expired';
  } else if (school.status === 'active') {
    paymentStatus = 'paid';
    paymentLabel = 'Active (Paid)';
  } else {
    paymentStatus = 'unpaid';
    paymentLabel = 'Disabled / Unpaid';
  }

  return {
    rawExpiry,
    daysLeft,
    expiryStatus,
    paymentStatus,
    paymentLabel,
    pendingProof,
    latestApproved,
    isActive: school.status === 'active'
  };
};

const SchoolsManager = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [rechargeRequests, setRechargeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState('all'); // 'all', 'active', 'inactive', 'expiring_soon', 'expired', 'pending_proof', 'paid', 'unpaid'
  const [filterPlan, setFilterPlan] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletePin, setDeletePin] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  // Quick Renewal Modal State
  const [renewModal, setRenewModal] = useState(null);
  const [renewPlan, setRenewPlan] = useState('Premium');
  const [renewDate, setRenewDate] = useState('');
  const [renewLoading, setRenewLoading] = useState(false);

  // Quick Payment Proof Review Modal State
  const [proofModal, setProofModal] = useState(null);
  const [proofDaysToAdd, setProofDaysToAdd] = useState(30);
  const [proofAdminNote, setProofAdminNote] = useState('');
  const [proofPlan, setProofPlan] = useState('Premium');
  const [availablePlans, setAvailablePlans] = useState([]);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [zoomScreenshot, setZoomScreenshot] = useState(false);

  // WhatsApp Expiry & Payment Reminder States
  const WA_SERVER = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'https://umarhayat.alwaysdata.net';
  const [singleReminderModal, setSingleReminderModal] = useState(null); // { school, metrics, text, phone }
  const [batchReminderModal, setBatchReminderModal] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const [schoolsSnap, reqSnap, plansSnap] = await Promise.all([
        getDocs(query(collection(db, 'schools'))),
        getDocs(collection(db, 'saas_recharge_requests')),
        getDocs(collection(db, 'plans'))
      ]);

      const reqList = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRechargeRequests(reqList);

      if (plansSnap && plansSnap.docs.length > 0) {
        setAvailablePlans(plansSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setAvailablePlans([
          { id: 'Basic', name: 'Basic Plan' },
          { id: 'Standard', name: 'Standard Plan' },
          { id: 'Premium', name: 'Premium Pro Plan' },
          { id: 'Enterprise', name: 'Enterprise Elite Plan' },
        ]);
      }

      const data = await Promise.all(
        schoolsSnap.docs.map(async (d) => {
          const school = { id: d.id, ...d.data() };
          try {
            const [studentsSnap, staffSnap] = await Promise.all([
              getDocs(collection(db, 'schools', d.id, 'students')),
              getDocs(collection(db, 'schools', d.id, 'staff')),
            ]);
            school.students = studentsSnap.size;
            school.staff = staffSnap.size;
          } catch (e) {
            school.students = school.students || 0;
            school.staff = school.staff || 0;
          }
          return school;
        })
      );
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

  // Compute school metrics map for lightning-fast lookups
  const schoolMetricsMap = useMemo(() => {
    const map = {};
    schools.forEach(school => {
      map[school.id] = getSchoolSubscriptionMetrics(school, rechargeRequests);
    });
    return map;
  }, [schools, rechargeRequests]);

  // Summary counts for KPI stat cards
  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let expiringSoon = 0;
    let expired = 0;
    let pendingProofs = 0;
    let paid = 0;
    let unpaid = 0;

    schools.forEach(s => {
      const m = schoolMetricsMap[s.id];
      if (!m) return;
      if (m.isActive) active++; else inactive++;
      if (m.expiryStatus === 'warning' || m.expiryStatus === 'urgent') expiringSoon++;
      if (m.expiryStatus === 'expired') expired++;
      if (m.paymentStatus === 'pending_proof') pendingProofs++;
      if (m.paymentStatus === 'paid') paid++;
      if (m.paymentStatus === 'unpaid') unpaid++;
    });

    const planPrices = { premium: 5000, standard: 3500, enterprise: 8000, basic: 2500 };
    const totalRev = schools
      .filter(s => s.status === 'active')
      .reduce((sum, s) => {
        const planKey = (s.plan || '').toLowerCase();
        return sum + (planPrices[planKey] || s.revenue || 0);
      }, 0);

    return {
      total: schools.length,
      active,
      inactive,
      expiringSoon,
      expired,
      pendingProofs,
      paid,
      unpaid,
      monthlyRevenue: totalRev
    };
  }, [schools, schoolMetricsMap]);

  // Filtering
  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      const m = schoolMetricsMap[s.id] || {};
      const matchSearch =
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.adminEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchPlan = filterPlan === 'all' || s.plan === filterPlan;

      let matchQuick = true;
      if (quickFilter === 'active') matchQuick = m.isActive;
      else if (quickFilter === 'inactive') matchQuick = !m.isActive;
      else if (quickFilter === 'expiring_soon') matchQuick = m.expiryStatus === 'warning' || m.expiryStatus === 'urgent';
      else if (quickFilter === 'expired') matchQuick = m.expiryStatus === 'expired';
      else if (quickFilter === 'pending_proof') matchQuick = m.paymentStatus === 'pending_proof';
      else if (quickFilter === 'paid') matchQuick = m.paymentStatus === 'paid';
      else if (quickFilter === 'unpaid') matchQuick = m.paymentStatus === 'unpaid';

      return matchSearch && matchPlan && matchQuick;
    });
  }, [schools, schoolMetricsMap, searchTerm, filterPlan, quickFilter]);

  // 1-Click Activate / Deactivate Toggle
  const toggleStatus = async (school) => {
    const newStatus = school.status === 'active' ? 'inactive' : 'active';
    setActionLoading(school.id + '-status');
    try {
      await updateDoc(doc(db, 'schools', school.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      setSchools(prev => prev.map(s => s.id === school.id ? { ...s, status: newStatus } : s));
      showToast('success', `${school.name} is now ${newStatus === 'active' ? 'ACTIVE' : 'DISABLED'}.`);
    } catch (error) {
      console.error(error);
      showToast('error', 'Failed to update status. Check permissions.');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete School
  const deleteSchool = async (id) => {
    setActionLoading(id + '-delete');
    try {
      await deleteDoc(doc(db, 'schools', id));
      setSchools(prev => prev.filter(s => s.id !== id));
      setDeleteConfirm(null);
      setDeletePin('');
      showToast('success', 'School permanently removed from SaaS.');
    } catch (error) {
      console.error(error);
      showToast('error', 'Failed to delete school. Check permissions.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAttempt = () => {
    if (deletePin !== '2121') {
      showToast('error', 'Incorrect PIN code! Deletion cancelled.');
      return;
    }
    deleteSchool(deleteConfirm);
  };

  // Open Renew Modal
  const openRenewModal = (school) => {
    setRenewModal(school);
    setRenewPlan(school.plan || 'Premium');
    const current = school.expiryDate || school.expiry || '';
    const now = new Date();
    const currentParsed = current ? new Date(current) : now;
    const start = (isNaN(currentParsed.getTime()) || currentParsed < now) ? now : currentParsed;
    const nextMonth = new Date(start);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setRenewDate(nextMonth.toISOString().split('T')[0]);
  };

  const setExtensionMonths = (months) => {
    const now = new Date();
    const currentRaw = renewModal?.expiryDate || renewModal?.expiry || '';
    const currentParsed = currentRaw ? new Date(currentRaw) : now;
    const start = (isNaN(currentParsed.getTime()) || currentParsed < now) ? now : currentParsed;
    const next = new Date(start);
    next.setMonth(next.getMonth() + months);
    setRenewDate(next.toISOString().split('T')[0]);
  };

  const handleSaveRenewal = async () => {
    if (!renewModal || !renewDate) return;
    setRenewLoading(true);
    try {
      await updateDoc(doc(db, 'schools', renewModal.id), {
        expiryDate: renewDate,
        expiry: renewDate,
        plan: renewPlan,
        status: 'active',
        subscriptionStatus: 'active',
        updatedAt: serverTimestamp()
      });
      setSchools(prev => prev.map(s => s.id === renewModal.id ? { 
        ...s, 
        expiryDate: renewDate, 
        expiry: renewDate, 
        plan: renewPlan, 
        status: 'active',
        subscriptionStatus: 'active'
      } : s));
      showToast('success', `✅ ${renewModal.name} renewed until ${renewDate} successfully!`);
      setRenewModal(null);
    } catch (err) {
      console.error('Error renewing subscription:', err);
      showToast('error', 'Failed to renew subscription. Check permissions.');
    } finally {
      setRenewLoading(false);
    }
  };

  // Open Proof Review Modal
  const openProofModal = (school, pendingReq) => {
    setProofModal({ school, req: pendingReq });
    setProofPlan(pendingReq?.requestedPlan || school?.plan || 'Premium');
    setProofDaysToAdd(30);
    setProofAdminNote('');
    setShowRejectBox(false);
    setRejectionReasonInput('Payment TID could not be verified in the bank ledger.');
    setZoomScreenshot(false);
  };

  // Approve Proof Directly
  const handleApproveProof = async () => {
    if (!proofModal || !proofModal.req) return;
    setActionLoading('approve-proof');
    const { school, req } = proofModal;
    const assignedPlan = proofPlan || req.requestedPlan || school?.plan || 'Premium';
    const matchedPlan = availablePlans.find(p => p.id === assignedPlan || (p.name && p.name.toLowerCase() === assignedPlan.toLowerCase()));
    const planNameFormatted = matchedPlan?.name || assignedPlan;

    try {
      const now = new Date();
      let startDate = now;
      if (school?.expiryDate || school?.expiry) {
        const curExp = new Date(school.expiryDate || school.expiry);
        if (!isNaN(curExp.getTime()) && curExp > now) {
          startDate = curExp;
        }
      }
      const newExpiry = new Date(startDate.getTime() + Number(proofDaysToAdd) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // 1. Update saas_recharge_requests
      await updateDoc(doc(db, 'saas_recharge_requests', req.id), {
        status: 'approved',
        verifiedAt: serverTimestamp(),
        verifiedBy: 'SaaS Super Admin',
        extendedDays: Number(proofDaysToAdd),
        newExpiryDate: newExpiry,
        approvedPlan: assignedPlan,
        adminNotes: proofAdminNote || 'Verified & Activated by SaaS Super Admin'
      });

      // 2. Add real transaction to payments ledger
      await addDoc(collection(db, 'payments'), {
        schoolId: req.schoolId,
        schoolName: req.schoolName || school?.name || 'School',
        plan: assignedPlan,
        planName: planNameFormatted,
        amount: Number(req.amount) || 0,
        paymentMethod: req.payMethod || 'Online Transfer',
        tid: req.tid || 'VERIFIED-PROOF',
        screenshotUrl: req.screenshotUrl || '',
        status: 'paid',
        type: 'subscription',
        date: new Date().toISOString().slice(0, 10),
        notes: proofAdminNote || 'Approved from Schools Dashboard',
        createdAt: serverTimestamp(),
        verifiedAt: serverTimestamp(),
        verifiedBy: 'SaaS Super Admin'
      });

      // 3. Update schools document in Firestore
      await updateDoc(doc(db, 'schools', school.id), {
        status: 'active',
        subscriptionStatus: 'active',
        expiryDate: newExpiry,
        expiry: newExpiry,
        plan: assignedPlan,
        subscriptionPlan: assignedPlan,
        updatedAt: serverTimestamp()
      });

      // Update state locally
      setSchools(prev => prev.map(s => s.id === school.id ? {
        ...s,
        status: 'active',
        subscriptionStatus: 'active',
        expiryDate: newExpiry,
        expiry: newExpiry,
        plan: assignedPlan
      } : s));

      setRechargeRequests(prev => prev.map(r => r.id === req.id ? {
        ...r,
        status: 'approved',
        newExpiryDate: newExpiry
      } : r));

      showToast('success', `🎉 Payment approved! ${school?.name} is active until ${newExpiry}`);
      setProofModal(null);
    } catch (err) {
      console.error('Error approving payment proof:', err);
      showToast('error', 'Failed to approve payment: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Reject Proof
  const handleRejectProof = async () => {
    if (!proofModal || !proofModal.req) return;
    setActionLoading('reject-proof');
    const { school, req } = proofModal;
    try {
      await updateDoc(doc(db, 'saas_recharge_requests', req.id), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectionReason: rejectionReasonInput || 'Payment TID could not be verified.',
        verifiedBy: 'SaaS Super Admin'
      });

      setRechargeRequests(prev => prev.map(r => r.id === req.id ? {
        ...r,
        status: 'rejected',
        rejectionReason: rejectionReasonInput
      } : r));

      showToast('success', `Proof rejected for ${school?.name}. School admin notified.`);
      setProofModal(null);
    } catch (err) {
      console.error('Error rejecting payment proof:', err);
      showToast('error', 'Failed to reject proof.');
    } finally {
      setActionLoading(null);
    }
  };

  // Generate professional bilingual Urdu/English expiry notification text
  const generateReminderText = (school, daysLeft) => {
    const schoolName = school.name || 'Respected School Admin';
    const planName = (school.plan || 'Standard').toUpperCase();
    const rawDate = school.expiryDate || school.expiry || '';
    const expiryFormatted = rawDate ? rawDate.toString().slice(0, 10) : 'Near Expiry';
    const timeDesc = daysLeft === null ? 'Soon' : daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} days ago` : daysLeft === 0 ? 'Expires TODAY' : `Expiring in ${daysLeft} days`;

    return `🔔 *TALEEMIDUNYA PRO — SUBSCRIPTION EXPIRY NOTICE* 🔔\n\nAssalam-o-Alaikum, *${schoolName}*!\n\nAap ka TaleemiDunya Pro School Management Portal ka subscription *${expiryFormatted}* (${timeDesc}) ko renew hone wala hai.\n\n📦 *Current Plan:* ${planName}\n⚡ *Status:* ${school.status === 'active' ? 'Active' : 'Suspended'}\n\nAap ke school portal ki uninterrupted service, online attendance aur parent portal chalu rakhne ke liye bara-e-meharbani subscription time par renew karein.\n\n🔗 *Recharge / Upgrade Portal:*\n${window.location.origin}/#/school-admin/subscription\n\n💳 *Bank & Online Transfer Accounts:*\n• Bank: Meezan Bank Ltd\n• Account Title: TaleemiDunya Private Limited\n• Account No / IBAN: PK45MEZN0012345678901234\n• JazzCash / Easypaisa: 0317-2234518\n\nFee jama karwane ke baad slip portal par upload karein ya is WhatsApp number par send karein.\nShukriya!\nTaleemiDunya Pro SaaS Administration`;
  };

  const handleOpenSingleReminder = (school, metrics) => {
    const rawPhone = (school.phone || school.contact || school.adminPhone || '').toString().replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.startsWith('0') ? '92' + rawPhone.slice(1) : rawPhone;
    const initialText = generateReminderText(school, metrics.daysLeft);
    setSingleReminderModal({
      school,
      metrics,
      text: initialText,
      phone: cleanPhone || '+92'
    });
  };

  const handleSendSingleReminder = async (mode = 'gateway') => {
    if (!singleReminderModal) return;
    const { school, text, phone } = singleReminderModal;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      showToast('error', 'Please enter a valid phone number with country code (e.g. 923001234567).');
      return;
    }

    if (mode === 'wa_web') {
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
      showToast('info', `Opened WhatsApp chat with ${school.name}`);
      setSingleReminderModal(null);
      return;
    }

    setReminderSending(true);
    try {
      const res = await fetch(`${WA_SERVER}/api/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: 'default_school',
          phone: cleanPhone,
          message: text
        })
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        showToast('success', `✅ WhatsApp Expiry Reminder sent to ${school.name}!`);
        setSingleReminderModal(null);
      } else {
        showToast('error', data.error || 'Gateway failed. Opening WhatsApp Web...');
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
        setSingleReminderModal(null);
      }
    } catch (e) {
      showToast('error', 'Gateway error. Opening WhatsApp Web...');
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
      setSingleReminderModal(null);
    } finally {
      setReminderSending(false);
    }
  };

  // Get list of all expiring or overdue schools (< 7 days or expired)
  const expiringSchools = useMemo(() => {
    return schools.map(s => {
      const m = getSchoolSubscriptionMetrics(s, rechargeRequests);
      return { school: s, metrics: m };
    }).filter(item => (item.metrics.daysLeft !== null && item.metrics.daysLeft <= 7) || item.metrics.paymentStatus === 'unpaid');
  }, [schools, rechargeRequests]);

  const handleSendBatchReminders = async () => {
    if (expiringSchools.length === 0) {
      showToast('info', 'No schools currently due for expiry reminders.');
      return;
    }
    setReminderSending(true);
    let sentCount = 0;
    setBatchProgress({ current: 0, total: expiringSchools.length });

    for (let i = 0; i < expiringSchools.length; i++) {
      const { school, metrics } = expiringSchools[i];
      setBatchProgress({ current: i + 1, total: expiringSchools.length });
      const rawPhone = (school.phone || school.contact || school.adminPhone || '').toString().replace(/[^0-9]/g, '');
      const cleanPhone = rawPhone.startsWith('0') ? '92' + rawPhone.slice(1) : rawPhone;
      
      if (cleanPhone && cleanPhone.length >= 10) {
        const text = generateReminderText(school, metrics.daysLeft);
        try {
          const res = await fetch(`${WA_SERVER}/api/message/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              schoolId: 'default_school',
              phone: cleanPhone,
              message: text
            })
          });
          const d = await res.json();
          if (res.ok && d.success !== false) {
            sentCount++;
          }
        } catch (e) {}
      }
      await new Promise(r => setTimeout(r, 600));
    }

    setReminderSending(false);
    setBatchReminderModal(false);
    showToast('success', `🎉 Dispatched ${sentCount} of ${expiringSchools.length} WhatsApp reminders successfully!`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-fade-in ${
          toast.type === 'success'
            ? 'bg-green-500/15 border-green-500/40 text-green-300 backdrop-blur-md'
            : 'bg-red-500/15 border-red-500/40 text-red-300 backdrop-blur-md'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} className="text-green-400" /> : <XCircle size={20} className="text-red-400" />}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
            <School className="text-primary-500" size={30} /> School Tenants & Subscription Status
          </h1>
          <p className="text-dark-muted mt-1 text-sm">
            Live overview of remaining days, active/disabled status, pending payment approvals, and school packages.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchSchools}
            className="p-2.5 hover:bg-dark-hover rounded-xl text-dark-muted hover:text-white transition-all border border-dark-border"
            title="Refresh All Schools"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setBatchReminderModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 hover:text-white hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2 relative shadow-sm"
            title="Broadcast WhatsApp Payment & Expiry Reminders"
          >
            <MessageCircle size={16} />
            <span>WhatsApp Reminders</span>
            {expiringSchools.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {expiringSchools.length} Due
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/super-admin/subscriptions')}
            className="px-4 py-2.5 rounded-xl bg-purple-500/15 text-purple-300 hover:text-white hover:bg-purple-600/30 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-2"
          >
            <CreditCard size={16} /> Subscriptions & Matrix
          </button>
          <button
            onClick={() => navigate('/super-admin/schools/add')}
            className="premium-button-primary flex items-center gap-2 text-xs font-bold"
          >
            <Plus size={18} /> Onboard New School
          </button>
        </div>
      </div>

      {/* Interactive SaaS Status Stat Cards (Clickable Quick Filters) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Schools */}
        <button
          onClick={() => setQuickFilter('all')}
          className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden ${
            quickFilter === 'all'
              ? 'bg-primary-500/20 border-primary-500/50 shadow-lg shadow-primary-500/10'
              : 'bg-dark-card/60 hover:bg-dark-card border-dark-border hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-dark-muted uppercase font-black tracking-widest">Total Schools</span>
            <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400"><School size={16} /></div>
          </div>
          <h3 className="text-2xl font-black text-white">{stats.total}</h3>
          <p className="text-[11px] text-dark-muted mt-1 font-medium">All registered schools</p>
        </button>

        {/* Active Schools */}
        <button
          onClick={() => setQuickFilter('active')}
          className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden ${
            quickFilter === 'active'
              ? 'bg-green-500/20 border-green-500/50 shadow-lg shadow-green-500/10'
              : 'bg-dark-card/60 hover:bg-dark-card border-dark-border hover:border-green-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-green-400 uppercase font-black tracking-widest">Active</span>
            <div className="p-1.5 rounded-lg bg-green-500/15 text-green-400"><CheckCircle2 size={16} /></div>
          </div>
          <h3 className="text-2xl font-black text-green-400">{stats.active}</h3>
          <p className="text-[11px] text-dark-muted mt-1 font-medium">Operational portals</p>
        </button>

        {/* Disabled / Inactive Schools */}
        <button
          onClick={() => setQuickFilter('inactive')}
          className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden ${
            quickFilter === 'inactive'
              ? 'bg-red-500/20 border-red-500/50 shadow-lg shadow-red-500/10'
              : 'bg-dark-card/60 hover:bg-dark-card border-dark-border hover:border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-red-400 uppercase font-black tracking-widest">Disabled</span>
            <div className="p-1.5 rounded-lg bg-red-500/15 text-red-400"><ShieldAlert size={16} /></div>
          </div>
          <h3 className="text-2xl font-black text-red-400">{stats.inactive}</h3>
          <p className="text-[11px] text-dark-muted mt-1 font-medium">Locked / Suspended</p>
        </button>

        {/* Expiring Soon (< 7 Days) */}
        <button
          onClick={() => setQuickFilter('expiring_soon')}
          className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden ${
            quickFilter === 'expiring_soon'
              ? 'bg-amber-500/25 border-amber-500/60 shadow-lg shadow-amber-500/20 ring-1 ring-amber-500/50'
              : stats.expiringSoon > 0
              ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15'
              : 'bg-dark-card/60 hover:bg-dark-card border-dark-border hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-amber-400 uppercase font-black tracking-widest flex items-center gap-1">
              {stats.expiringSoon > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
              Expiring &le;7d
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400"><AlertTriangle size={16} /></div>
          </div>
          <h3 className="text-2xl font-black text-amber-400">{stats.expiringSoon}</h3>
          <p className="text-[11px] text-dark-muted mt-1 font-medium">Expires in 7 days</p>
        </button>

        {/* Expired / Overdue */}
        <button
          onClick={() => setQuickFilter('expired')}
          className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden ${
            quickFilter === 'expired'
              ? 'bg-rose-500/20 border-rose-500/50 shadow-lg shadow-rose-500/10'
              : stats.expired > 0
              ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15'
              : 'bg-dark-card/60 hover:bg-dark-card border-dark-border hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-rose-400 uppercase font-black tracking-widest">Expired</span>
            <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400"><Clock size={16} /></div>
          </div>
          <h3 className="text-2xl font-black text-rose-400">{stats.expired}</h3>
          <p className="text-[11px] text-dark-muted mt-1 font-medium">Needs renewal</p>
        </button>

        {/* Pending Payment Proofs */}
        <button
          onClick={() => setQuickFilter('pending_proof')}
          className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden ${
            quickFilter === 'pending_proof'
              ? 'bg-indigo-500/25 border-indigo-500/60 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/50'
              : stats.pendingProofs > 0
              ? 'bg-indigo-500/10 border-indigo-500/40 hover:bg-indigo-500/20 animate-pulse'
              : 'bg-dark-card/60 hover:bg-dark-card border-dark-border hover:border-indigo-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-indigo-300 uppercase font-black tracking-widest flex items-center gap-1">
              {stats.pendingProofs > 0 && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />}
              Pending Proof
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400"><CreditCard size={16} /></div>
          </div>
          <h3 className="text-2xl font-black text-indigo-300">{stats.pendingProofs}</h3>
          <p className="text-[11px] text-dark-muted mt-1 font-medium">Payment approval needed</p>
        </button>
      </div>

      {/* Main Table Card */}
      <GlassCard className="p-6">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
            <input
              type="text"
              placeholder="Search by school name, city, email or phone..."
              className="w-full premium-input pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`premium-button-secondary flex items-center gap-2 text-xs font-bold ${showFilters ? 'border-primary-500/50 text-primary-400' : ''}`}
          >
            <Filter size={15} /> Advanced Filters
            {(quickFilter !== 'all' || filterPlan !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-primary-500" />
            )}
          </button>
          <button
            onClick={() => { setSearchTerm(''); setQuickFilter('all'); setFilterPlan('all'); }}
            className="p-2.5 hover:bg-dark-hover rounded-xl text-dark-muted hover:text-white transition-all border border-dark-border"
            title="Reset All Filters"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Quick Filter Status Pills */}
        <div className="flex flex-wrap items-center gap-2 pb-4 mb-4 border-b border-white/5 overflow-x-auto text-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-dark-muted mr-1">Status Filter:</span>
          {[
            { id: 'all', label: `All (${stats.total})` },
            { id: 'active', label: `🟢 Active (${stats.active})` },
            { id: 'inactive', label: `🔴 Disabled (${stats.inactive})` },
            { id: 'expiring_soon', label: `⚠️ Expiring Soon (${stats.expiringSoon})` },
            { id: 'expired', label: `🚨 Expired (${stats.expired})` },
            { id: 'pending_proof', label: `⏳ Proof Submitted (${stats.pendingProofs})` },
            { id: 'paid', label: `✓ Paid (${stats.paid})` },
            { id: 'unpaid', label: `❌ Unpaid (${stats.unpaid})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setQuickFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                quickFilter === tab.id
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25 border border-primary-400'
                  : 'bg-white/5 text-dark-muted hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Advanced Filters Expandable Box */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 mb-5 p-4 bg-dark-hover/70 rounded-2xl border border-dark-border animate-fade-in">
            <div>
              <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest mb-2">Package Plan</p>
              <div className="flex gap-2">
                {['all', 'Basic', 'Standard', 'Premium', 'Enterprise'].map(p => (
                  <button
                    key={p}
                    onClick={() => setFilterPlan(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterPlan === p
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-card text-dark-muted hover:text-white border border-dark-border'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-dark-muted gap-3">
            <Loader2 size={38} className="animate-spin text-primary-500" />
            <p className="text-sm font-semibold tracking-wide">Syncing schools and payment statuses from database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-widest font-black">
                  <th className="pb-4 px-3">School Tenant</th>
                  <th className="pb-4 px-3">Students / Staff</th>
                  <th className="pb-4 px-3">Package Plan</th>
                  <th className="pb-4 px-3">Days Remaining & Expiry</th>
                  <th className="pb-4 px-3">Payment Status</th>
                  <th className="pb-4 px-3 text-center">Tenant State</th>
                  <th className="pb-4 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-dark-muted">
                      <School size={44} className="mx-auto mb-3 opacity-25" />
                      <p className="font-bold text-base text-white/80">No schools matching current filter.</p>
                      <p className="text-xs mt-1 text-dark-muted">Try changing the search keyword or status filter pill above.</p>
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((school) => {
                    const m = schoolMetricsMap[school.id] || {};
                    return (
                      <tr key={school.id} className="group hover:bg-white/[0.03] transition-all">
                        {/* School Details */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-dark-hover border border-dark-border flex items-center justify-center text-primary-500 font-black text-lg group-hover:border-primary-500/40 transition-all shrink-0">
                              {school.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm text-white group-hover:text-primary-400 transition-colors">
                                  {school.name}
                                </p>
                                {m.pendingProof && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 animate-pulse">
                                    <Sparkles size={10} /> Proof Submitted
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-dark-muted font-medium">{school.city || 'Pakistan'}</p>
                              <p className="text-xs text-dark-muted flex items-center gap-1.5 mt-0.5 font-mono">
                                <Mail size={11} className="text-primary-400" /> {school.adminEmail}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Students / Staff */}
                        <td className="py-4 px-3">
                          <div className="space-y-1">
                            <p className="text-xs text-dark-muted flex items-center gap-1.5">
                              <Users size={12} className="text-blue-400" />
                              <span className="font-bold text-white">{school.students || 0}</span> students
                            </p>
                            <p className="text-xs text-dark-muted flex items-center gap-1.5">
                              <Users size={12} className="text-purple-400" />
                              <span className="font-bold text-white">{school.staff || 0}</span> staff
                            </p>
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="py-4 px-3">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${planColors[school.plan] || 'bg-dark-hover text-dark-muted'}`}>
                            {school.plan || 'Standard'}
                          </span>
                        </td>

                        {/* Days Remaining & Expiry */}
                        <td className="py-4 px-3">
                          <div className="space-y-1">
                            {/* Days Remaining Badge */}
                            {m.expiryStatus === 'safe' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-green-500/15 text-green-300 border border-green-500/30">
                                <CheckCircle2 size={12} className="text-green-400" />
                                {m.daysLeft} Days Left
                              </span>
                            )}
                            {m.expiryStatus === 'warning' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <AlertTriangle size={12} className="text-amber-400" />
                                {m.daysLeft} {m.daysLeft === 1 ? 'Day Left' : 'Days Left'}
                              </span>
                            )}
                            {m.expiryStatus === 'urgent' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-red-500/25 text-red-300 border border-red-500/50 animate-pulse">
                                <AlertTriangle size={12} className="text-red-400" />
                                Expires Today!
                              </span>
                            )}
                            {m.expiryStatus === 'expired' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                <XCircle size={12} className="text-rose-400" />
                                Expired {Math.abs(m.daysLeft)}d ago
                              </span>
                            )}
                            {m.expiryStatus === 'no_date' && (
                              <span className="text-xs text-dark-muted italic">No expiry set</span>
                            )}

                            {/* Raw Expiry Date */}
                            <p className="text-[11px] text-dark-muted flex items-center gap-1 font-mono">
                              <Calendar size={11} /> {m.rawExpiry ? m.rawExpiry.toString().slice(0, 10) : '—'}
                            </p>
                          </div>
                        </td>

                        {/* Payment Status (Who has paid vs who has not) */}
                        <td className="py-4 px-3">
                          {m.paymentStatus === 'pending_proof' ? (
                            <div className="space-y-1">
                              <button
                                onClick={() => openProofModal(school, m.pendingProof)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/40 transition-all shadow-sm group/btn"
                                title="Click to view slip & approve"
                              >
                                <Clock size={12} className="text-indigo-400 animate-spin" />
                                Proof Under Review
                                <ArrowUpRight size={12} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                              </button>
                              <p className="text-[10px] text-indigo-400/80 font-mono">
                                TID: {m.pendingProof.tid || 'Slip Uploaded'}
                              </p>
                            </div>
                          ) : m.paymentStatus === 'paid' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                                <CheckCircle size={12} />
                                Verified Paid
                              </span>
                              <p className="text-[10px] text-dark-muted mt-0.5">Package active & current</p>
                            </div>
                          ) : (
                            <div>
                              <button
                                onClick={() => openRenewModal(school)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                              >
                                <AlertCircle size={12} />
                                Unpaid / Overdue
                              </button>
                              <p className="text-[10px] text-dark-muted mt-0.5">Click to extend/renew</p>
                            </div>
                          )}
                        </td>

                        {/* Tenant State (Active vs Disabled) */}
                        <td className="py-4 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                            school.status === 'active'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {school.status === 'active' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                            {school.status === 'active' ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Active / Deactivate */}
                            <button
                              onClick={() => toggleStatus(school)}
                              disabled={actionLoading === school.id + '-status'}
                              title={school.status === 'active' ? 'Deactivate School Tenant' : 'Activate School Tenant'}
                              className={`p-2 rounded-xl transition-all text-xs flex items-center gap-1 font-bold disabled:opacity-50 ${
                                school.status === 'active'
                                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                                  : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                              }`}
                            >
                              {actionLoading === school.id + '-status' ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : school.status === 'active' ? (
                                <><XCircle size={14} /><span className="hidden xl:inline">Disable</span></>
                              ) : (
                                <><ShieldCheck size={14} /><span className="hidden xl:inline">Activate</span></>
                              )}
                            </button>

                            {/* Direct WhatsApp Reminder Button */}
                            <button
                              onClick={() => handleOpenSingleReminder(school, m)}
                              disabled={actionLoading === school.id + '-wa'}
                              title={`Send WhatsApp Payment & Expiry Reminder to ${school.name}`}
                              className="p-2 bg-emerald-500/15 text-emerald-400 hover:text-white hover:bg-emerald-600 border border-emerald-500/30 rounded-xl transition-all flex items-center gap-1 text-xs font-bold shadow-sm disabled:opacity-50"
                            >
                              {actionLoading === school.id + '-wa' ? (
                                <Loader2 size={14} className="animate-spin text-emerald-400" />
                              ) : (
                                <MessageCircle size={14} className="text-emerald-400" />
                              )}
                              <span className="hidden xl:inline">WhatsApp</span>
                            </button>

                            {/* Renew Modal Trigger */}
                            <button
                              onClick={() => openRenewModal(school)}
                              title="Renew Subscription & Extend Expiry"
                              className="p-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 hover:text-white hover:from-purple-600 hover:to-indigo-600 border border-purple-500/30 rounded-xl transition-all flex items-center gap-1 text-xs font-bold shadow-sm"
                            >
                              <Sparkles size={14} className="text-purple-400" />
                              <span className="hidden xl:inline">Renew</span>
                            </button>

                            {/* Edit School */}
                            <button
                              onClick={() => navigate(`/super-admin/schools/edit/${school.id}`)}
                              title="Edit School Details"
                              className="p-2 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 border border-primary-500/20 rounded-xl transition-all flex items-center gap-1 text-xs font-bold"
                            >
                              <Edit size={14} />
                              <span className="hidden xl:inline">Edit</span>
                            </button>

                            {/* Delete School */}
                            <button
                              onClick={() => setDeleteConfirm(school.id)}
                              title="Delete School (PIN Protected)"
                              className="p-2 bg-dark-hover text-dark-muted hover:bg-red-500/15 hover:text-red-400 border border-dark-border rounded-xl transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {filteredSchools.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dark-border flex items-center justify-between text-xs text-dark-muted">
                <span>
                  Showing <strong className="text-white">{filteredSchools.length}</strong> of <strong className="text-white">{schools.length}</strong> schools
                </span>
                <span className="text-[11px]">
                  Tip: Click on any school's <strong>Proof Under Review</strong> to audit and approve bank slips instantly.
                </span>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Direct Payment Proof Audit & Approval Modal */}
      {proofModal && proofModal.req && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <GlassCard className="p-6 md:p-8 w-full max-w-xl border border-indigo-500/40 bg-[#0c101d] shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Review Online Payment Proof</h3>
                  <p className="text-xs text-dark-muted font-medium">
                    {proofModal.school?.name} ({proofModal.school?.city || 'Pakistan'})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setProofModal(null)}
                className="p-1.5 rounded-lg text-dark-muted hover:text-white hover:bg-white/5 transition-all"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Payment Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-dark-muted block">Amount Paid</span>
                <span className="text-base font-black text-emerald-400 mt-0.5 block">
                  PKR {Number(proofModal.req.amount || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-dark-muted block">Transaction ID (TID)</span>
                <span className="text-xs font-mono font-bold text-white mt-1 block truncate">
                  {proofModal.req.tid || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-dark-muted block">Payment Method</span>
                <span className="text-xs font-bold text-cyan-300 mt-1 block capitalize">
                  {proofModal.req.payMethod || 'Online Transfer'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-dark-muted block">Requested Plan</span>
                <span className="text-xs font-black text-purple-400 uppercase mt-1 block">
                  {proofModal.req.requestedPlan || proofModal.school?.plan || 'Premium'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-dark-muted block">Submission Date</span>
                <span className="text-xs font-mono text-dark-muted mt-1 block">
                  {proofModal.req.createdAt ? proofModal.req.createdAt.toString().slice(0, 10) : 'Today'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-dark-muted block">Current Expiry</span>
                <span className="text-xs font-mono text-white mt-1 block">
                  {proofModal.school?.expiryDate || proofModal.school?.expiry || 'Not set'}
                </span>
              </div>
            </div>

            {/* Receipt / Screenshot Lightbox */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-dark-muted">Bank Slip / Screenshot Preview</label>
                {proofModal.req.screenshotUrl && (
                  <button
                    type="button"
                    onClick={() => setZoomScreenshot(!zoomScreenshot)}
                    className="text-xs text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1"
                  >
                    <Eye size={13} /> {zoomScreenshot ? 'Zoom Out' : 'Zoom In'}
                  </button>
                )}
              </div>
              {proofModal.req.screenshotUrl ? (
                <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 flex justify-center items-center">
                  <img
                    src={proofModal.req.screenshotUrl}
                    alt="Payment Slip"
                    className={`transition-all rounded-lg object-contain ${
                      zoomScreenshot ? 'max-h-[500px] w-full' : 'max-h-56 w-auto'
                    }`}
                  />
                </div>
              ) : (
                <div className="p-8 text-center bg-white/5 rounded-xl border border-white/5 text-dark-muted">
                  <ImageIcon size={30} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No screenshot attachment provided.</p>
                  <p className="text-[11px] text-dark-muted mt-0.5">Verify TID in bank portal directly before approving.</p>
                </div>
              )}
            </div>

            {/* Plan Tier Selector from Created Plans */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-dark-muted">
                  Activated Plan Tier (From Created Plans)
                </label>
                <span className="text-xs font-bold text-indigo-400">
                  Selected: {availablePlans.find(p => p.id === proofPlan || p.name === proofPlan)?.name || proofPlan}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availablePlans.map(p => {
                  const pName = p.name || p.id;
                  const isSelected = (proofPlan || '').toLowerCase() === pName.toLowerCase() || (proofPlan || '').toLowerCase() === p.id.toLowerCase();
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProofPlan(pName)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30 font-black'
                          : 'bg-white/5 text-dark-muted hover:text-white border-white/5'
                      }`}
                    >
                      {pName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Days to Add */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-dark-muted">Extend Subscription Validity By</label>
                <span className="text-xs font-black text-indigo-400 font-mono">+{proofDaysToAdd} Days</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '+30 Days (1m)', val: 30 },
                  { label: '+60 Days (2m)', val: 60 },
                  { label: '+90 Days (3m)', val: 90 },
                  { label: '+365 Days (1y)', val: 365 },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setProofDaysToAdd(opt.val)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                      proofDaysToAdd === opt.val
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                        : 'bg-white/5 text-dark-muted hover:text-white border-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Note */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-dark-muted">Approval Audit Note (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Verified in Meezan Bank IBFT statement"
                value={proofAdminNote}
                onChange={(e) => setProofAdminNote(e.target.value)}
                className="w-full premium-input text-xs"
              />
            </div>

            {/* Rejection Section Toggle */}
            {showRejectBox ? (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Specify Rejection Reason
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(false)}
                    className="text-xs text-dark-muted hover:text-white"
                  >
                    Cancel Reject
                  </button>
                </div>
                <input
                  type="text"
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  className="w-full premium-input text-xs bg-dark-bg border-red-500/40"
                  placeholder="Reason for school admin..."
                />
                <button
                  type="button"
                  disabled={actionLoading === 'reject-proof'}
                  onClick={handleRejectProof}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading === 'reject-proof' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Confirm Rejection & Notify School
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowRejectBox(true)}
                  className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 hover:underline"
                >
                  <XCircle size={13} /> Reject this payment proof
                </button>
              </div>
            )}

            {/* Main Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProofModal(null)}
                className="flex-1 py-3 rounded-xl border border-dark-border text-dark-muted hover:text-white transition-all font-bold text-xs"
              >
                Close
              </button>
              <button
                type="button"
                disabled={actionLoading === 'approve-proof'}
                onClick={handleApproveProof}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading === 'approve-proof' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Approve Payment & Activate (+{proofDaysToAdd}d)
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Delete Confirm Modal with PIN Protection */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="p-8 w-full max-w-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-400" size={26} />
            </div>
            <h2 className="text-xl font-bold mb-2">Delete School Tenant?</h2>
            <p className="text-dark-muted text-sm mb-4">
              This will permanently remove <strong className="text-white">
                {schools.find(s => s.id === deleteConfirm)?.name}
              </strong> and its data. This cannot be undone.
            </p>

            <div className="mb-6 text-left">
              <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest mb-1.5 block">
                Enter Master Security PIN (2121)
              </label>
              <input 
                type="password" 
                value={deletePin} 
                onChange={(e) => setDeletePin(e.target.value)}
                placeholder="Enter PIN" 
                className="w-full premium-input bg-dark-bg text-center tracking-[0.5em] font-mono text-lg"
                maxLength={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAttempt}
                disabled={!!actionLoading || deletePin.length !== 4}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Yes, Delete
              </button>
              <button
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeletePin('');
                }}
                className="flex-1 premium-button-secondary py-3"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Quick Renew Subscription Modal */}
      {renewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <GlassCard className="p-6 md:p-8 w-full max-w-lg border border-purple-500/30 bg-[#0f1322] shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Renew School Subscription</h3>
                  <p className="text-xs text-dark-muted font-medium">{renewModal.name} ({renewModal.city || 'School'})</p>
                </div>
              </div>
              <button 
                onClick={() => setRenewModal(null)}
                className="p-1.5 rounded-lg text-dark-muted hover:text-white hover:bg-white/5 transition-all"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Current Info */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-dark-muted block">Current Plan</span>
                <span className="font-black text-purple-400 uppercase text-sm mt-0.5 block">{renewModal.plan || 'Premium'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-dark-muted block">Current Expiry</span>
                <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                  {renewModal.expiryDate || renewModal.expiry || 'Not Set'}
                </span>
              </div>
            </div>

            {/* Plan Tier Selector from Created Plans */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-dark-muted px-1">Subscription Plan Tier (Created Plans)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availablePlans.map(p => {
                  const planName = p.name || p.id;
                  const isSelected = (renewPlan || '').toLowerCase() === planName.toLowerCase() || (renewPlan || '').toLowerCase() === p.id.toLowerCase();
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setRenewPlan(planName)}
                      className={`py-2 px-2 rounded-xl text-xs font-black uppercase transition-all border ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/30'
                          : 'bg-dark-hover text-dark-muted hover:text-white border-dark-border'
                      }`}
                    >
                      {planName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Extension Buttons */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-dark-muted px-1">Quick Extend Expiry</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: '+1 Month', months: 1 },
                  { label: '+3 Months', months: 3 },
                  { label: '+6 Months', months: 6 },
                  { label: '+1 Year', months: 12 },
                ].map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setExtensionMonths(opt.months)}
                    className="py-2 px-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 hover:border-purple-500/50 transition-all text-center"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Expiry Date Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-dark-muted px-1">New Expiry Date (YYYY-MM-DD)</label>
              <input
                type="date"
                required
                value={renewDate}
                onChange={(e) => setRenewDate(e.target.value)}
                className="w-full premium-input text-sm font-mono text-white bg-dark-bg"
              />
              <p className="text-[10px] text-dark-muted px-1">
                Is date tak school admin aur unka staff portal bina kisi rukawat ke active rahega.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRenewModal(null)}
                className="flex-1 py-3 rounded-xl border border-dark-border text-dark-muted hover:text-white transition-all font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={renewLoading || !renewDate}
                onClick={handleSaveRenewal}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {renewLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Confirm & Renew Package
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 🟢 SINGLE WHATSAPP EXIRY REMINDER MODAL */}
      {singleReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <GlassCard className="max-w-xl w-full p-6 space-y-4 border border-emerald-500/40 relative shadow-2xl">
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Send WhatsApp Expiry Reminder</h3>
                  <p className="text-xs text-dark-muted font-medium">
                    {singleReminderModal.school?.name} ({singleReminderModal.school?.city || 'Pakistan'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSingleReminderModal(null)}
                className="p-1.5 rounded-lg text-dark-muted hover:text-white hover:bg-white/5 transition-all"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* School & Gateway Badge */}
            <div className="p-3 rounded-xl bg-dark-bg/60 border border-dark-border flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-dark-muted">Current Plan:</span>
                <span className="font-bold text-purple-400 uppercase">{singleReminderModal.school?.plan || 'Standard'}</span>
                <span className="text-dark-muted">|</span>
                <span className="text-dark-muted">Days Left:</span>
                <span className={`font-black ${
                  singleReminderModal.metrics?.daysLeft < 0 ? 'text-red-400' :
                  singleReminderModal.metrics?.daysLeft <= 3 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {singleReminderModal.metrics?.daysLeft !== null ? `${singleReminderModal.metrics.daysLeft}d` : 'Expired'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                AI WhatsApp Bot Gateway Live
              </div>
            </div>

            {/* Recipient Phone */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-dark-muted flex items-center gap-1.5">
                <Smartphone size={13} className="text-emerald-400" /> WhatsApp Recipient Number (with Country Code)
              </label>
              <input
                type="text"
                value={singleReminderModal.phone}
                onChange={(e) => setSingleReminderModal(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="923001234567"
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Editable Message Preview */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-dark-muted flex items-center justify-between">
                <span>WhatsApp Notice Message</span>
                <span className="text-[10px] text-emerald-400 font-medium lowercase">bilingual urdu/english</span>
              </label>
              <textarea
                rows={9}
                value={singleReminderModal.text}
                onChange={(e) => setSingleReminderModal(prev => ({ ...prev, text: e.target.value }))}
                className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-xs text-white/90 font-mono leading-relaxed focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSingleReminderModal(null)}
                className="py-2.5 px-4 rounded-xl border border-dark-border text-dark-muted hover:text-white transition-all font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSendSingleReminder('wa_web')}
                className="py-2.5 px-4 rounded-xl bg-dark-bg hover:bg-dark-hover border border-dark-border text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink size={14} className="text-blue-400" />
                Open WhatsApp Web
              </button>
              <button
                type="button"
                disabled={reminderSending}
                onClick={() => handleSendSingleReminder('gateway')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {reminderSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Send via WhatsApp Bot
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 📢 BATCH WHATSAPP REMINDERS MODAL */}
      {batchReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <GlassCard className="max-w-2xl w-full p-6 space-y-4 border border-emerald-500/40 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <MessageCircle size={26} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">Broadcast Expiry Reminders</h3>
                  <p className="text-xs text-dark-muted font-medium mt-0.5">
                    Automated WhatsApp dispatch to all schools expiring in ≤ 7 days or overdue.
                  </p>
                </div>
              </div>
              <button
                onClick={() => !reminderSending && setBatchReminderModal(false)}
                disabled={reminderSending}
                className="p-1.5 rounded-lg text-dark-muted hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Recipient Count Summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-dark-bg border border-dark-border">
                <span className="text-[10px] text-dark-muted uppercase font-black block">Expiring Due</span>
                <span className="text-xl font-black text-amber-400 mt-1 block">{expiringSchools.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-dark-bg border border-dark-border">
                <span className="text-[10px] text-dark-muted uppercase font-black block">Gateway</span>
                <span className="text-xs font-bold text-emerald-400 mt-1.5 block">24/7 AI Bot Active</span>
              </div>
              <div className="p-3 rounded-xl bg-dark-bg border border-dark-border">
                <span className="text-[10px] text-dark-muted uppercase font-black block">Delivery Channel</span>
                <span className="text-xs font-bold text-cyan-300 mt-1.5 block">Official WhatsApp</span>
              </div>
            </div>

            {/* Recipient Schools Table */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-dark-muted">
                Recipient School Tenants ({expiringSchools.length})
              </label>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-dark-border bg-dark-bg/60 divide-y divide-dark-border">
                {expiringSchools.length === 0 ? (
                  <p className="p-4 text-center text-xs text-dark-muted">No schools currently due for expiry reminders. All active plans are healthy!</p>
                ) : (
                  expiringSchools.map(({ school, metrics }, idx) => (
                    <div key={school.id || idx} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white block">{school.name}</span>
                        <span className="text-[11px] text-dark-muted font-mono">{school.phone || school.contact || 'No Phone Registered'}</span>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/15 text-purple-300 uppercase mr-2">
                          {school.plan || 'Standard'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          metrics.daysLeft < 0 ? 'bg-red-500/20 text-red-400' :
                          metrics.daysLeft === 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {metrics.daysLeft < 0 ? `Expired ${Math.abs(metrics.daysLeft)}d ago` : metrics.daysLeft === 0 ? 'Expires Today' : `${metrics.daysLeft}d left`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live Progress Indicator */}
            {reminderSending && (
              <div className="space-y-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Dispatching WhatsApp Reminders...
                  </span>
                  <span>{batchProgress.current} / {batchProgress.total}</span>
                </div>
                <div className="w-full bg-dark-bg rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${(batchProgress.current / Math.max(batchProgress.total, 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={reminderSending}
                onClick={() => setBatchReminderModal(false)}
                className="flex-1 py-3 rounded-xl border border-dark-border text-dark-muted hover:text-white transition-all font-bold text-xs disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reminderSending || expiringSchools.length === 0}
                onClick={handleSendBatchReminders}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {reminderSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Dispatch All {expiringSchools.length} Reminders
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default SchoolsManager;
