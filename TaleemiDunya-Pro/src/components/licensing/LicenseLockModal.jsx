import React, { useState } from 'react';
import { useLicense } from '../../context/LicenseContext';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Copy, 
  Check, 
  Key, 
  MessageCircle, 
  RefreshCw, 
  Upload, 
  AlertTriangle,
  Monitor,
  Lock
} from 'lucide-react';

const SUPPORT_WHATSAPP_NUMBER = '923000000000'; // Can be adjusted or set via env

export default function LicenseLockModal() {
  const { 
    isLicensed, 
    isChecking, 
    licenseError, 
    errorMessage, 
    hwid, 
    activateLicense, 
    recheckLicense,
    isDesktop 
  } = useLicense();

  const [inputKey, setInputKey] = useState('');
  const [copiedHwid, setCopiedHwid] = useState(false);
  const [activating, setActivating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState(false);

  // If already licensed or currently checking initial state, don't show the modal
  if (isChecking || isLicensed) {
    return null;
  }

  const handleCopyHwid = () => {
    if (!hwid) return;
    navigator.clipboard.writeText(hwid);
    setCopiedHwid(true);
    setTimeout(() => setCopiedHwid(false), 2500);
  };

  const handleActivate = async (e) => {
    e?.preventDefault();
    if (!inputKey.trim()) {
      setActionError('Please paste your license key.');
      return;
    }

    setActivating(true);
    setActionError('');
    setActionSuccess(false);

    try {
      const res = await activateLicense(inputKey.trim());
      if (res.success) {
        setActionSuccess(true);
      } else {
        setActionError(res.error || 'Invalid license key.');
      }
    } catch (err) {
      setActionError(err.message || 'Activation failed.');
    } finally {
      setActivating(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setInputKey(content.trim());
        setActionError('');
      }
    };
    reader.readAsText(file);
  };

  const whatsappMessage = encodeURIComponent(
    `Assalam-o-Alaikum! Mujhe TaleemiDunya Pro activate karwana hai.\n\n` +
    `🖥️ My Computer Machine ID (HWID):\n${hwid}\n\n` +
    `Barah-e-karam meri license key issue farma dain.`
  );
  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${whatsappMessage}`;

  const getErrorBadge = () => {
    switch (licenseError) {
      case 'HWID_MISMATCH':
        return {
          title: 'Unauthorized Computer (HWID Mismatch)',
          urdu: 'Yeh license kisi doosre computer ke liye register hai. Naye computer par chalane ke liye new key zaroori hai.',
          color: 'from-amber-500/20 to-red-500/20 border-amber-500/40 text-amber-300'
        };
      case 'EXPIRED':
        return {
          title: 'License Expired',
          urdu: 'Aap ka TaleemiDunya Pro license expire ho chuka hai. Barah-e-karam renewal ke liye rabta karain.',
          color: 'from-red-500/20 to-rose-500/20 border-red-500/40 text-red-300'
        };
      case 'CLOCK_TAMPERED':
        return {
          title: 'System Time Tampering Detected',
          urdu: 'Computer ki tareekh ya waqt peeche kiya gaya hai. Barah-e-karam accurate internet time set karain.',
          color: 'from-orange-500/20 to-red-500/20 border-orange-500/40 text-orange-300'
        };
      case 'REMOTE_REVOKED':
        return {
          title: 'License Suspended or Revoked',
          urdu: 'Yeh license software administrator ki taraf se suspend kar diya gaya hai.',
          color: 'from-red-600/30 to-purple-600/30 border-red-500/50 text-red-300'
        };
      case 'UNAUTHORIZED_DOMAIN':
        return {
          title: 'Piracy Protection: Unauthorized Domain',
          urdu: 'Yeh website/domain TaleemiDunya Pro source code chalane ke liye authorized nahi hai.',
          color: 'from-red-600/30 to-orange-600/30 border-red-500/50 text-red-300'
        };
      default:
        return {
          title: 'Software Activation Required',
          urdu: 'TaleemiDunya Pro chalane ke liye valid machine license key darqaar hai.',
          color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-300'
        };
    }
  };

  const badge = getErrorBadge();

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl overflow-y-auto select-none">
      {/* Background Animated Gradient Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/40 text-slate-100">
        {/* Header with Security Shield */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-slate-800">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-500 text-white shadow-lg shadow-cyan-500/25 flex-shrink-0">
            <Lock className="w-8 h-8" />
            <div className="absolute -bottom-1 -right-1 p-1 bg-slate-900 rounded-full border border-slate-700">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase bg-cyan-950/70 border border-cyan-800/50 px-2.5 py-0.5 rounded-full">
                Security & Anti-Theft Guard
              </span>
              {isDesktop && (
                <span className="text-xs font-bold tracking-wider text-slate-400 uppercase bg-slate-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Monitor className="w-3 h-3" /> Desktop PC Lock
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              TaleemiDunya Pro — Activation Required
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Hardware-Bound Cryptographic DRM Protected
            </p>
          </div>
        </div>

        {/* Dynamic Status Banner */}
        <div className={`mt-5 p-4 rounded-2xl border bg-gradient-to-r ${badge.color} flex items-start gap-3`}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <div className="font-bold">{badge.title}</div>
            <div className="opacity-90 mt-0.5 font-sans leading-relaxed">{badge.urdu}</div>
            {errorMessage && (
              <div className="mt-1 font-mono text-[11px] opacity-75">{errorMessage}</div>
            )}
          </div>
        </div>

        {/* Machine Hardware ID Box */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              This Computer's Machine Code (HWID):
            </span>
            <span className="text-[11px] text-slate-500">Hardware Fingerprint</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono font-bold text-sm sm:text-base tracking-wider text-cyan-300 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 select-all overflow-x-auto">
              {hwid || 'Detecting hardware fingerprint...'}
            </div>
            <button
              onClick={handleCopyHwid}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition active:scale-95 border border-slate-700 shadow-sm"
              title="Copy Machine ID"
            >
              {copiedHwid ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Yeh Machine ID developer ko bhaijain. Wo is computer ke hardware se lock shuda license key issue karain gay.
          </p>
        </div>

        {/* License Activation Form */}
        <form onSubmit={handleActivate} className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              Paste License Key (TDLIC-...):
            </label>
            <label className="cursor-pointer text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold">
              <Upload className="w-3 h-3" /> Select .tdlic File
              <input 
                type="file" 
                accept=".tdlic,.txt" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </label>
          </div>

          <textarea
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="TDLIC-eyJhcHAiOiJUYWxlZW1pRHVueWEtUHJvI..."
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition resize-none"
          />

          {actionError && (
            <div className="mt-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="mt-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>License activated successfully! Reloading...</span>
            </div>
          )}

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={activating || !inputKey.trim()}
              className="flex-1 py-3 px-5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-cyan-600/20 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {activating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying RSA Signature...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Activate Software</span>
                </>
              )}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-5 rounded-xl font-bold text-sm bg-emerald-700/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Get Key on WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={recheckLicense}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
              title="Refresh / Re-check"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recheck</span>
            </button>
          </div>
        </form>

        {/* Footer Notice */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500">
          TaleemiDunya Pro &copy; 2026. All rights reserved. Cryptographically protected against source code piracy and unauthorized machine deployment.
        </div>
      </div>
    </div>
  );
}
