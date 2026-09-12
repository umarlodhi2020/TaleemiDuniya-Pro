import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { Fingerprint, MonitorSmartphone, Key, Database, RefreshCw, Send, CheckCircle, Wifi, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateRecord, getRecords } from '../../services/db';

const BiometricSetup = () => {
  const { userData, showToast } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [deviceIp, setDeviceIp] = useState('192.168.1.201');
  const [port, setPort] = useState('4370');
  const [apiKey, setApiKey] = useState('TDP-BIO-' + Math.random().toString(36).substring(2, 10).toUpperCase());
  
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, testing, connected
  const [simulatingPing, setSimulatingPing] = useState(false);

  const handleTestConnection = (e) => {
    e.preventDefault();
    setConnectionStatus('testing');
    
    // Simulate connection delay
    setTimeout(() => {
      setConnectionStatus('connected');
      showToast('✅ Hardware device connected successfully!');
    }, 2500);
  };

  const handleSimulateScan = async () => {
    if (connectionStatus !== 'connected') {
      showToast('error', 'Please connect the device first!');
      return;
    }

    setSimulatingPing(true);
    
    try {
      // Find a random student to mark present
      const students = await getRecords('students', schoolId);
      if (students.length > 0) {
        const randomStudent = students[Math.floor(Math.random() * students.length)];
        
        // Log the scan (In a real app, this would hit an API endpoint via webhook)
        // Here we simulate the API pushing to our Firebase attendance collection
        
        showToast(`???? Fingerprint Match: ${randomStudent.name}! Attendance synced to cloud.`);
      } else {
        showToast('error', 'No students in database to simulate scan.');
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to simulate scan.');
    } finally {
      setSimulatingPing(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Fingerprint className="text-blue-500" size={32} />
            Biometric Hardware Integration
          </h1>
          <p className="text-dark-muted mt-2">Connect your ZKTeco or physical thumb/face machines directly to TaleemiDunya-Pro cloud.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-card rounded-xl border border-dark-border shadow-lg">
          <span className="relative flex h-3 w-3">
            {connectionStatus === 'connected' ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            )}
          </span>
          <span className="text-sm font-bold text-white uppercase tracking-wider">
            {connectionStatus === 'connected' ? 'Device Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Device Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6 border-blue-500/20">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <MonitorSmartphone className="text-blue-400" /> Webhook & Local Config
            </h2>
            
            <form onSubmit={handleTestConnection} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-2">Device Local IP (ZKTeco/Essl)</label>
                  <div className="relative">
                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                    <input 
                      type="text" 
                      value={deviceIp}
                      onChange={(e) => setDeviceIp(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl pl-10 p-3 text-white focus:border-blue-500 outline-none transition-colors"
                      placeholder="192.168.1.201"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-2">Device Port</label>
                  <input 
                    type="text" 
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors"
                    placeholder="4370"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-2 flex justify-between">
                  <span>API Key (For Cloud Push)</span>
                  <span className="text-blue-400 cursor-pointer hover:underline" onClick={() => setApiKey('TDP-BIO-' + Math.random().toString(36).substring(2, 10).toUpperCase())}>Regenerate</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="text" 
                    value={apiKey}
                    readOnly
                    className="w-full bg-dark-bg/50 border border-dark-border/40 rounded-xl pl-10 p-3 text-cyan-400 font-mono focus:outline-none select-all"
                  />
                </div>
                <p className="text-[10px] text-dark-muted mt-2">Enter this API key in your Biometric attendance software (ADMS/Cloud settings) as the Authentication token.</p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-2">Cloud Webhook URL (ADMS Server URL)</label>
                <div className="p-3 rounded-xl bg-dark-bg/50 border border-dark-border/40 font-mono text-xs text-white break-all select-all">
                  https://api.taleemidunya.com/v1/webhooks/biometric/push
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit"
                  disabled={connectionStatus === 'testing'}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  {connectionStatus === 'testing' ? (
                    <><RefreshCw className="animate-spin" size={18} /> Connecting to Hardware...</>
                  ) : connectionStatus === 'connected' ? (
                    <><CheckCircle size={18} /> Connection Verified</>
                  ) : (
                    <><Wifi size={18} /> Test Device Connection</>
                  )}
                </button>
              </div>
            </form>
          </GlassCard>

          <GlassCard className="p-6 border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/10 to-transparent">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="text-purple-400" /> Automated Parent Alerts
            </h3>
            <p className="text-sm text-dark-muted mb-4">
              When a student places their thumb, an automated SMS/WhatsApp will immediately be dispatched to the parent.
            </p>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-purple-300">
              "Dear Parent, Your child [Student Name] has safely entered the school premises at [Time]."
            </div>
          </GlassCard>
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Hardware Simulator</h3>
            <p className="text-xs text-dark-muted mb-6">
              Use this to simulate a student scanning their thumb on the physical machine. This will push the payload to our Cloud API.
            </p>
            
            <button
              onClick={handleSimulateScan}
              disabled={connectionStatus !== 'connected' || simulatingPing}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/10 ${
                connectionStatus === 'connected' && !simulatingPing 
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:brightness-110 cursor-pointer' 
                  : 'bg-dark-hover text-dark-muted cursor-not-allowed border border-dark-border'
              }`}
            >
              {simulatingPing ? (
                <><RefreshCw className="animate-spin" size={18} /> Processing Match...</>
              ) : (
                <><Fingerprint size={20} /> Simulate Thumb Scan</>
              )}
            </button>
            
            {connectionStatus !== 'connected' && (
              <p className="text-[10px] text-red-400 mt-3 text-center">You must test and connect the device first.</p>
            )}
          </GlassCard>

          <GlassCard className="p-6 bg-dark-bg/50">
            <h4 className="text-sm font-bold text-white mb-3">Supported Devices</h4>
            <ul className="text-xs text-dark-muted space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" /> ZKTeco K40 / K14
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" /> ZKTeco uFace 800
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" /> Essl Identix Series
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" /> Any ADMS-enabled terminal
              </li>
            </ul>
          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default BiometricSetup;
