import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Monitor, 
  Copy, 
  Check, 
  Download, 
  MessageCircle, 
  AlertTriangle, 
  RefreshCw, 
  Ban, 
  CheckCircle, 
  Calendar, 
  Building, 
  Plus, 
  Trash2,
  Lock,
  Unlock,
  Cpu
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { db } from '../../services/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { generateLicenseWebCrypto } from '../../services/licenseGenerator';
import { useLicense } from '../../context/LicenseContext';
import Swal from 'sweetalert2';

const STORAGE_KEY_SUPER_KEY = 'td_super_master_private_key';

export default function LicenseManager() {
  const { hwid: myLocalHwid } = useLicense();

  // Generator State
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [clientHwid, setClientHwid] = useState('');
  const [durationDays, setDurationDays] = useState(365);
  const [plan, setPlan] = useState('enterprise');
  const [maxStudents, setMaxStudents] = useState(5000);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Private Key Security
  const [privateKeyPem, setPrivateKeyPem] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Fleet / Registered Licenses State
  const [licenses, setLicenses] = useState([]);
  const [loadingLicenses, setLoadingLicenses] = useState(true);

  // Load private key from storage
  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY_SUPER_KEY) || '';
    setPrivateKeyPem(savedKey);
  }, []);

  // Fetch registered schools and licenses
  const fetchData = async () => {
    setLoadingLicenses(true);
    try {
      // 1. Fetch schools for dropdown
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      const schoolsList = schoolsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSchools(schoolsList);

      // 2. Fetch licenses fleet
      const licSnap = await getDocs(collection(db, 'licenses'));
      const licList = licSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLicenses(licList);
    } catch (err) {
      console.error('[LicenseManager] Fetch error:', err);
    } finally {
      setLoadingLicenses(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSchoolSelect = (e) => {
    const sId = e.target.value;
    setSelectedSchoolId(sId);
    const found = schools.find(s => s.id === sId);
    if (found) {
      setSchoolName(found.name || found.schoolName || '');
    }
  };

  const handleSavePrivateKey = () => {
    if (!privateKeyPem.trim().includes('PRIVATE KEY')) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Key Format',
        text: 'Please paste a valid RSA Private Key in PEM format (-----BEGIN PRIVATE KEY----- ...)'
      });
      return;
    }
    localStorage.setItem(STORAGE_KEY_SUPER_KEY, privateKeyPem.trim());
    setShowKeyInput(false);
    Swal.fire({
      icon: 'success',
      title: 'Private Key Saved',
      text: 'Master Private Key saved locally in this browser for generating licenses.'
    });
  };

  const handleGenerateLicense = async (e) => {
    e.preventDefault();

    if (!privateKeyPem.trim()) {
      setShowKeyInput(true);
      Swal.fire({
        icon: 'warning',
        title: 'Master Private Key Required',
        text: 'Please configure your Master RSA Private Key before generating signed licenses.'
      });
      return;
    }

    if (!clientHwid.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Machine ID Required',
        text: 'Please enter the client computer HWID (e.g. TD-XXXX-YYYY-ZZZZ-WWWW).'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateLicenseWebCrypto({
        schoolId: selectedSchoolId || 'SCH-' + Math.floor(1000 + Math.random() * 9000),
        schoolName: schoolName.trim() || 'Client School',
        hwid: clientHwid.trim().toUpperCase(),
        days: durationDays,
        plan,
        maxStudents: Number(maxStudents),
        features: ['all']
      }, privateKeyPem.trim());

      setGeneratedResult(result);

      // Save record to cloud Firestore for tracking and remote control
      const licenseRef = doc(db, 'licenses', result.payload.hwid);
      await setDoc(licenseRef, {
        hwid: result.payload.hwid,
        schoolId: result.payload.schoolId,
        schoolName: result.payload.schoolName,
        plan: result.payload.plan,
        maxStudents: result.payload.maxStudents,
        expiresAt: result.payload.expiresAt,
        issuedAt: result.payload.issuedAt,
        token: result.token,
        status: 'active',
        isRevoked: false,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Refresh list
      fetchData();

      Swal.fire({
        icon: 'success',
        title: 'License Generated Successfully!',
        text: `License locked to machine [${result.payload.hwid}] until ${new Date(result.payload.expiresAt).toLocaleDateString()}`
      });
    } catch (err) {
      console.error('[LicenseManager] Generation failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Generation Failed',
        text: err.message || 'Failed to sign license token.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = () => {
    if (!generatedResult?.token) return;
    navigator.clipboard.writeText(generatedResult.token);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDownloadLicenseFile = () => {
    if (!generatedResult?.token) return;
    const blob = new Blob([generatedResult.token], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generatedResult.payload.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${generatedResult.payload.hwid}.tdlic`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRemoteRevokeToggle = async (lic) => {
    const isCurrentlyRevoked = lic.isRevoked || lic.status === 'blocked';
    const actionText = isCurrentlyRevoked ? 'Reactivate' : 'Kill / Block';

    const confirm = await Swal.fire({
      title: `${actionText} License?`,
      text: isCurrentlyRevoked
        ? `Are you sure you want to restore access for ${lic.schoolName} (${lic.hwid})?`
        : `⚠️ This will instantly lock down the software on ${lic.schoolName}'s PC (${lic.hwid}) as soon as they connect!`,
      icon: isCurrentlyRevoked ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: isCurrentlyRevoked ? '#10b981' : '#ef4444',
      confirmButtonText: `Yes, ${actionText}`
    });

    if (confirm.isConfirmed) {
      try {
        const ref = doc(db, 'licenses', lic.hwid);
        await updateDoc(ref, {
          isRevoked: !isCurrentlyRevoked,
          status: isCurrentlyRevoked ? 'active' : 'blocked',
          updatedAt: new Date().toISOString()
        });
        Swal.fire({
          icon: 'success',
          title: `License ${isCurrentlyRevoked ? 'Reactivated' : 'Revoked'}!`,
          timer: 1500
        });
        fetchData();
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Action Failed', text: err.message });
      }
    }
  };

  const handleExtend30Days = async (lic) => {
    try {
      const currentExp = lic.expiresAt ? new Date(lic.expiresAt).getTime() : Date.now();
      const base = currentExp > Date.now() ? currentExp : Date.now();
      const newExp = new Date(base + 30 * 24 * 60 * 60 * 1000).toISOString();

      const ref = doc(db, 'licenses', lic.hwid);
      await updateDoc(ref, {
        expiresAt: newExp,
        status: 'active',
        isRevoked: false,
        updatedAt: new Date().toISOString()
      });

      Swal.fire({
        icon: 'success',
        title: '+30 Days Added!',
        text: `New expiry: ${new Date(newExp).toLocaleDateString()}`
      });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Extension Failed', text: err.message });
    }
  };

  const handleDeleteLicense = async (lic) => {
    const confirm = await Swal.fire({
      title: 'Delete License Record?',
      text: `Remove record for ${lic.schoolName} (${lic.hwid})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Delete'
    });

    if (confirm.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'licenses', lic.hwid));
        fetchData();
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Delete Failed', text: err.message });
      }
    }
  };

  const formatWhatsappLink = (token, payload) => {
    const msg = encodeURIComponent(
      `Assalam-o-Alaikum! TaleemiDunya Pro software ka official license key yeh hai:\n\n` +
      `🏫 School: ${payload.schoolName}\n` +
      `🖥️ Machine HWID: ${payload.hwid}\n` +
      `📅 Valid Until: ${new Date(payload.expiresAt).toLocaleDateString()}\n` +
      `⭐ Plan: ${payload.plan.toUpperCase()}\n\n` +
      `🔑 LICENSE KEY:\n${token}\n\n` +
      `Yeh key software open kar ke "Paste License Key" box me paste karain aur "Activate" par click karain.`
    );
    return `https://wa.me/?text=${msg}`;
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/70 border border-cyan-800/40 px-2.5 py-0.5 rounded-full">
                Super Admin Security
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                <Cpu className="w-3.5 h-3.5" /> RSA-2048 Asymmetric DRM
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Hardware License & DRM Manager
            </h1>
            <p className="text-sm text-slate-200 font-medium">
              Lock software installations to specific client PCs. Prevent source code theft & piracy.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowKeyInput(!showKeyInput)}
          className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition flex items-center gap-2"
        >
          <Key className="w-4 h-4 text-amber-400" />
          <span>{privateKeyPem ? 'Configure Master Key' : '⚠️ Set Master Key'}</span>
        </button>
      </div>

      {/* Private Key Drawer (if expanded) */}
      {showKeyInput && (
        <GlassCard className="p-6 border-amber-500/40 bg-amber-950/20">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Master RSA Private Key Setup
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Your Master Private Key is saved securely only in this browser's local memory. It is never exposed in the client software build.
              </p>
            </div>
            <button
              onClick={() => setShowKeyInput(false)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              Close
            </button>
          </div>

          <textarea
            value={privateKeyPem}
            onChange={(e) => setPrivateKeyPem(e.target.value)}
            rows={5}
            placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwgg...&#10;-----END PRIVATE KEY-----"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          />

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Key is stored in: <code className="text-cyan-400">master-license-keys/taleemidunya_master_private.pem</code>
            </span>
            <button
              onClick={handleSavePrivateKey}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition"
            >
              Save Private Key
            </button>
          </div>
        </GlassCard>
      )}

      {/* Generator & Fleet Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: License Generator Card */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="p-6 border-slate-800">
            <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-800">
              <Plus className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-black text-white">Generate Client License</h2>
            </div>

            <form onSubmit={handleGenerateLicense} className="space-y-4">
              {/* Select School */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Select Registered School (Optional):
                </label>
                <select
                  value={selectedSchoolId}
                  onChange={handleSchoolSelect}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">-- Manual Entry or Select School --</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.schoolName || s.id} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* School Name Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  School Name:
                </label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. The City School Campus 1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Machine HWID Lock */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Monitor className="w-3.5 h-3.5 text-cyan-400" /> Machine ID (HWID) or Multi-PC:
                  </label>
                  <div className="flex items-center gap-2">
                    {myLocalHwid && myLocalHwid.startsWith('TD-') && (
                      <button
                        type="button"
                        onClick={() => setClientHwid(myLocalHwid)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        My PC
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setClientHwid('ANY_MACHINE')}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                      title="Allow any computer for this school without HWID restriction"
                    >
                      All PCs (ANY_MACHINE)
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  required
                  value={clientHwid}
                  onChange={(e) => setClientHwid(e.target.value.toUpperCase())}
                  placeholder="e.g. TD-0588-ADCC-A54B-32C0 or multiple: TD-XXXX, TD-YYYY"
                  className="w-full font-mono bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-cyan-300 focus:border-cyan-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 <strong>1 PC:</strong> Client ka HWID daalain. | <strong>2-3 PCs:</strong> HWIDs comma laga kar likhain (<code>TD-PC1, TD-PC2</code>). | <strong>Sab PCs:</strong> <code>ANY_MACHINE</code> likhain.
                </p>
              </div>

              {/* Duration and Plan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Validity Duration:
                  </label>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value === 'lifetime' ? 'lifetime' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value={30}>1 Month (30 Days)</option>
                    <option value={90}>3 Months (90 Days)</option>
                    <option value={180}>6 Months (180 Days)</option>
                    <option value={365}>1 Year (365 Days)</option>
                    <option value={730}>2 Years (730 Days)</option>
                    <option value="lifetime">⭐ Lifetime (No Expiry)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Subscription Plan:
                  </label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="starter">Starter</option>
                    <option value="standard">Standard</option>
                    <option value="pro">Pro Plan</option>
                    <option value="enterprise">Enterprise (All Modules)</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-cyan-600/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing Cryptographic Key...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Generate & Sign License Key</span>
                  </>
                )}
              </button>
            </form>

            {/* Generated Result Output */}
            {generatedResult && (
              <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> License Key Ready:
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Expires: {new Date(generatedResult.payload.expiresAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    value={generatedResult.token}
                    rows={4}
                    className="w-full bg-slate-950 border border-emerald-500/30 rounded-xl p-3 font-mono text-xs text-emerald-300 focus:outline-none select-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleCopyKey}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>

                  <button
                    onClick={handleDownloadLicenseFile}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>Download</span>
                  </button>

                  <a
                    href={formatWhatsappLink(generatedResult.token, generatedResult.payload)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition text-center"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right: Registered Machines & Fleets */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard className="p-6 border-slate-800">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-black text-white">
                  Active Machines & Remote Kill-Switch ({licenses.length})
                </h2>
              </div>
              <button
                onClick={fetchData}
                className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLicenses ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingLicenses ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                Loading registered machines...
              </div>
            ) : licenses.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No active licenses found. Generate your first machine license on the left!
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {licenses.map((lic) => {
                  const isRevoked = lic.isRevoked || lic.status === 'blocked';
                  const isExp = lic.expiresAt && new Date(lic.expiresAt).getTime() < Date.now();

                  return (
                    <div
                      key={lic.id}
                      className={`p-4 rounded-2xl border transition ${
                        isRevoked
                          ? 'bg-rose-950/20 border-rose-800/50'
                          : isExp
                          ? 'bg-amber-950/20 border-amber-800/50'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-sm">
                              {lic.schoolName || 'Unnamed School'}
                            </h3>
                            <span className="text-[10px] font-mono uppercase bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                              {lic.plan || 'pro'}
                            </span>
                            {isRevoked ? (
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Ban className="w-2.5 h-2.5" /> Blocked / Revoked
                              </span>
                            ) : isExp ? (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full">
                                Expired
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle className="w-2.5 h-2.5" /> Active
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 font-mono">
                            <span className="text-cyan-400 flex items-center gap-1">
                              <Monitor className="w-3 h-3" /> {lic.hwid}
                            </span>
                            <span>•</span>
                            <span>Exp: {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : 'Lifetime'}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleExtend30Days(lic)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold transition"
                            title="Extend 30 Days"
                          >
                            +30 Days
                          </button>

                          <button
                            onClick={() => handleRemoteRevokeToggle(lic)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              isRevoked
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50'
                            }`}
                            title={isRevoked ? 'Unblock Machine' : 'Remote Kill Switch'}
                          >
                            {isRevoked ? <Unlock className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                            <span>{isRevoked ? 'Unblock' : 'Revoke'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteLicense(lic)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
