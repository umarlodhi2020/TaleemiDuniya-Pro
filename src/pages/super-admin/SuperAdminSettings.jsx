import React, { useState, useEffect } from 'react';
import { Settings, Save, Shield, Bell, Globe, Database, Palette, Key, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const SuperAdminSettings = () => {
  const [settings, setSettings] = useState({
    platformName: 'TaleemiDunya Pro',
    supportEmail: 'support@taleemidunya.pro',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    language: 'English',
    maintenanceMode: false,
    emailNotifications: true,
    smsAlerts: false,
    autoRenew: true,
    trialDays: '14',
    basicPrice: '3500',
    premiumPrice: '8000',
    enterprisePrice: '15000',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'system', 'settings'));
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(s => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system', 'settings'), {
        ...settings,
        updatedAt: serverTimestamp(),
      });
      showToast('success', 'Settings saved successfully.');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary-500" size={32} />
        <p className="text-dark-muted ml-3">Loading global settings...</p>
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
          <h1 className="text-3xl font-bold flex items-center gap-3"><Settings className="text-primary-500" size={28} /> Global Settings</h1>
          <p className="text-dark-muted mt-1">Configure platform-wide settings and preferences.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="premium-button-primary">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform */}
        <GlassCard className="p-8">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary-500"><Globe size={20} /> Platform Configuration</h2>
          <div className="space-y-4">
            {[
              { label: 'Platform Name', name: 'platformName', type: 'text' },
              { label: 'Support Email', name: 'supportEmail', type: 'email' },
              { label: 'Default Currency', name: 'currency', type: 'text' },
              { label: 'Timezone', name: 'timezone', type: 'text' },
              { label: 'Default Language', name: 'language', type: 'text' },
            ].map(f => (
              <div key={f.name} className="space-y-1">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest">{f.label}</label>
                <input name={f.name} type={f.type} value={settings[f.name]} onChange={handleChange} className="w-full premium-input" />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Pricing */}
        <GlassCard className="p-8">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary-500"><Key size={20} /> Subscription Pricing</h2>
          <div className="space-y-4">
            {[
              { label: 'Trial Period (Days)', name: 'trialDays' },
              { label: 'Basic Plan (PKR/month)', name: 'basicPrice' },
              { label: 'Premium Plan (PKR/month)', name: 'premiumPrice' },
              { label: 'Enterprise Plan (PKR/month)', name: 'enterprisePrice' },
            ].map(f => (
              <div key={f.name} className="space-y-1">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest">{f.label}</label>
                <input name={f.name} type="number" value={settings[f.name]} onChange={handleChange} className="w-full premium-input" />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Notifications */}
        <GlassCard className="p-8">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary-500"><Bell size={20} /> Notification Settings</h2>
          <div className="space-y-4">
            {[
              { label: 'Email Notifications', name: 'emailNotifications', desc: 'Send system alerts via email' },
              { label: 'SMS Alerts', name: 'smsAlerts', desc: 'Send critical alerts via SMS' },
              { label: 'Auto-Renewal Reminders', name: 'autoRenew', desc: 'Remind schools 7 days before expiry' },
              { label: 'Maintenance Mode', name: 'maintenanceMode', desc: 'Temporarily disable school access' },
            ].map(f => (
              <div key={f.name} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-dark-border">
                <div>
                  <p className="font-semibold text-sm">{f.label}</p>
                  <p className="text-xs text-dark-muted">{f.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name={f.name} checked={settings[f.name]} onChange={handleChange} className="sr-only peer" />
                  <div className="w-10 h-5 bg-dark-border rounded-full peer peer-checked:bg-primary-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Security */}
        <GlassCard className="p-8">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary-500"><Shield size={20} /> Security & Access</h2>
          <div className="space-y-3">
            {[
              { label: 'Force 2FA for Admins', desc: 'Require two-factor authentication for all school admins' },
              { label: 'IP Whitelist', desc: 'Restrict super admin access to whitelisted IPs only' },
              { label: 'Audit Logging', desc: 'Log all critical admin actions for compliance' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-dark-border">
                <div>
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs text-dark-muted">{item.desc}</p>
                </div>
                <button className="px-3 py-1.5 text-xs font-bold bg-dark-hover text-dark-muted rounded-lg hover:border-primary-500/30 border border-dark-border transition-all">
                  Configure
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default SuperAdminSettings;
