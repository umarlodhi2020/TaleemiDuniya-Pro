import React, { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle2, AlertCircle, Layout, MessageSquare, Phone, Building, Smartphone, CreditCard } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const LandingPageCMS = () => {
  const [gateways, setGateways] = useState({
    developerWhatsapp: {
      enabled: true,
      number: '+923000000000',
      message: 'Hello, I want to know more about TaleemiDunya Pro plans!'
    },
    manualPayments: {
      jazzcash: { accountTitle: '', accountNumber: '' },
      easypaisa: { accountTitle: '', accountNumber: '' },
      bank: { bankName: '', accountTitle: '', accountNumber: '' }
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchGateways = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'system', 'gateways'));
        if (docSnap.exists()) {
          setGateways(docSnap.data());
        }
      } catch (error) {
        console.error('Error fetching landing page settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGateways();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Check if it's a manual payment field
    if (name.startsWith('manual_')) {
      const parts = name.split('_'); // e.g., manual_jazzcash_accountTitle
      const category = parts[1];
      const field = parts[2];
      
      setGateways(s => ({
        ...s,
        manualPayments: {
          ...s.manualPayments,
          [category]: {
            ...s.manualPayments?.[category],
            [field]: value
          }
        }
      }));
      return;
    }
    
    setGateways(s => ({
      ...s,
      developerWhatsapp: {
        ...s.developerWhatsapp,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system', 'gateways'), {
        ...gateways,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      showToast('success', 'Landing Page settings saved successfully.');
    } catch (error) {
      console.error('Error saving landing page settings:', error);
      showToast('error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary-500" size={32} />
        <p className="text-dark-muted ml-3">Loading Landing Page Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-fade-in max-w-sm ${
          toast.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Layout className="text-primary-500" size={28} /> Landing Page</h1>
          <p className="text-dark-muted mt-1">Control your public-facing website features and contact details.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="premium-button-primary">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* WhatsApp Contact Controls */}
        <GlassCard className="p-8 border border-primary-500/20">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-dark-border">
            <h2 className="text-xl font-bold flex items-center gap-3 text-green-400">
              <MessageSquare size={24} /> WhatsApp Floating Button & Footer Contact
            </h2>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                name="enabled" 
                checked={gateways?.developerWhatsapp?.enabled || false} 
                onChange={handleChange} 
                className="sr-only peer" 
              />
              <div className="w-12 h-6 bg-dark-border rounded-full peer peer-checked:bg-green-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-6" />
              <span className="ml-3 text-sm font-semibold text-dark-muted peer-checked:text-green-400">
                {gateways?.developerWhatsapp?.enabled ? 'Active on Website' : 'Hidden'}
              </span>
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-dark-muted uppercase tracking-widest flex items-center gap-2">
                <Phone size={14} className="text-green-400" /> WhatsApp Number
              </label>
              <input 
                name="number" 
                type="text" 
                placeholder="e.g. +923001234567"
                value={gateways?.developerWhatsapp?.number || ''} 
                onChange={handleChange} 
                className="w-full premium-input focus:ring-green-500/50" 
              />
              <p className="text-xs text-dark-muted mt-2">Enter your official WhatsApp number with country code.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-dark-muted uppercase tracking-widest flex items-center gap-2">
                <MessageSquare size={14} className="text-green-400" /> Pre-filled Message
              </label>
              <textarea 
                name="message" 
                rows="3"
                placeholder="Hello, I want to know more about TaleemiDunya Pro plans!"
                value={gateways?.developerWhatsapp?.message || ''} 
                onChange={handleChange} 
                className="w-full premium-input focus:ring-green-500/50 resize-none" 
              />
              <p className="text-xs text-dark-muted mt-2">This text will be automatically typed when a customer clicks the WhatsApp button.</p>
            </div>
          </div>
        </GlassCard>

        {/* Manual Payment Methods (for Checkout Page) */}
        <GlassCard className="p-8 border border-primary-500/20">
          <div className="mb-8 pb-4 border-b border-dark-border">
            <h2 className="text-xl font-bold flex items-center gap-3 text-amber-400">
              <CreditCard size={24} /> Manual Payment Details (Checkout Page)
            </h2>
            <p className="text-xs text-dark-muted mt-2">These details will be shown to users when they buy a subscription on the Landing Page.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* JazzCash */}
            <div className="space-y-4 p-5 rounded-2xl bg-red-950/20 border border-red-500/20">
              <h3 className="font-bold flex items-center gap-2 text-red-400"><Smartphone size={16} /> JazzCash Account</h3>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Account Title</label>
                <input name="manual_jazzcash_accountTitle" type="text" placeholder="E.g. Ali Raza" value={gateways?.manualPayments?.jazzcash?.accountTitle || ''} onChange={handleChange} className="w-full premium-input bg-dark-bg/50 text-sm focus:ring-red-500/50 border-red-500/20" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Account Number</label>
                <input name="manual_jazzcash_accountNumber" type="text" placeholder="E.g. 03001234567" value={gateways?.manualPayments?.jazzcash?.accountNumber || ''} onChange={handleChange} className="w-full premium-input bg-dark-bg/50 text-sm focus:ring-red-500/50 border-red-500/20" />
              </div>
            </div>

            {/* EasyPaisa */}
            <div className="space-y-4 p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
              <h3 className="font-bold flex items-center gap-2 text-emerald-400"><Smartphone size={16} /> EasyPaisa Account</h3>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Account Title</label>
                <input name="manual_easypaisa_accountTitle" type="text" placeholder="E.g. Usman Ali" value={gateways?.manualPayments?.easypaisa?.accountTitle || ''} onChange={handleChange} className="w-full premium-input bg-dark-bg/50 text-sm focus:ring-emerald-500/50 border-emerald-500/20" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Account Number</label>
                <input name="manual_easypaisa_accountNumber" type="text" placeholder="E.g. 03451234567" value={gateways?.manualPayments?.easypaisa?.accountNumber || ''} onChange={handleChange} className="w-full premium-input bg-dark-bg/50 text-sm focus:ring-emerald-500/50 border-emerald-500/20" />
              </div>
            </div>

            {/* Bank Transfer */}
            <div className="space-y-4 p-5 rounded-2xl bg-blue-950/20 border border-blue-500/20">
              <h3 className="font-bold flex items-center gap-2 text-blue-400"><Building size={16} /> Bank Account</h3>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Bank Name</label>
                <input name="manual_bank_bankName" type="text" placeholder="E.g. Meezan Bank" value={gateways?.manualPayments?.bank?.bankName || ''} onChange={handleChange} className="w-full premium-input bg-dark-bg/50 text-sm focus:ring-blue-500/50 border-blue-500/20" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest">Account Title</label>
                <input name="manual_bank_accountTitle" type="text" placeholder="E.g. TaleemiDunya" value={gateways?.manualPayments?.bank?.accountTitle || ''} onChange={handleChange} className="w-full premium-input bg-dark-bg/50 text-sm focus:ring-blue-500/50 border-blue-500/20" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest">IBAN / Acc No</label>
                <input name="manual_bank_accountNumber" type="text" placeholder="E.g. PK00MEZN000123" value={gateways?.manualPayments?.bank?.accountNumber || ''} onChange={handleChange} className="w-full premium-input bg-dark-bg/50 text-sm focus:ring-blue-500/50 border-blue-500/20" />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Future Placeholder for Hero/Pricing edits */}
        <GlassCard className="p-8 border border-dashed border-dark-border bg-dark-bg/50">
          <div className="text-center opacity-50">
            <Layout size={40} className="mx-auto mb-4 text-dark-muted" />
            <h3 className="text-lg font-bold text-white mb-2">More Controls Coming Soon</h3>
            <p className="text-sm text-dark-muted">Future updates will allow you to edit Hero Banner Text, Pricing Plans, and Features List directly from here.</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default LandingPageCMS;
