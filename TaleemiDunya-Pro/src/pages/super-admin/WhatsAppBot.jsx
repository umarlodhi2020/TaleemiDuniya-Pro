import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Smartphone,
  RefreshCw,
  Zap,
  Globe,
  Wifi,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';

const SuperAdminWhatsAppBot = () => {
  const { userData } = useAuth();
  const WA_SERVER = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'https://umarhayat.alwaysdata.net';
  const schoolId = 'default_school'; // Master SaaS Gateway (+92 317-2234518)

  // Live Server State
  const [liveQrDataUrl, setLiveQrDataUrl] = useState(null);
  const [isLiveServerConnected, setIsLiveServerConnected] = useState(false);
  const [liveServerStatus, setLiveServerStatus] = useState('CHECKING'); // 'CONNECTED' | 'QR_READY' | 'DISCONNECTED' | 'OFFLINE'

  // QR Gateway & AI Bot State
  const [isQrLinked, setIsQrLinked] = useState(false);
  const [qrTimer, setQrTimer] = useState(24);
  const [linkedPhone, setLinkedPhone] = useState('+92 300-0000000');
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);

  // Poll Real Baileys Server if running on Alwaysdata Cloud
  useEffect(() => {
    let interval;
    const checkLiveStatus = async () => {
      try {
        const res = await fetch(`${WA_SERVER}/api/session/status?schoolId=${schoolId}`);
        if (res.ok) {
          const data = await res.json();
          setIsLiveServerConnected(true);
          setLiveServerStatus(data.status);
          if (data.qrDataUrl) {
            setLiveQrDataUrl(data.qrDataUrl);
          } else {
            setLiveQrDataUrl(null);
          }
          if (data.status === 'CONNECTED') {
            setIsQrLinked(true);
            setLinkedPhone(data.phone || 'SaaS Connected Number');
          } else if (data.status === 'QR_READY') {
            setIsQrLinked(false);
          }
        } else {
          setIsLiveServerConnected(false);
          setLiveServerStatus('OFFLINE');
        }
      } catch (err) {
        setIsLiveServerConnected(false);
        setLiveServerStatus('OFFLINE');
      }
    };

    checkLiveStatus();
    interval = setInterval(checkLiveStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // QR countdown timer simulation when unlinked
  useEffect(() => {
    let timer;
    if (!isQrLinked) {
      timer = setInterval(() => {
        setQrTimer((prev) => (prev <= 1 ? 30 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isQrLinked]);

  const handleSimulateScan = async () => {
    if (isLiveServerConnected) {
      try {
        await fetch(`${WA_SERVER}/api/session/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId })
        });
        alert('🔄 Session initialization triggered! Please scan the QR code displayed on screen from your WhatsApp App.');
        return;
      } catch (e) {}
    }
    setIsSimulatingScan(true);
    setTimeout(() => {
      setIsSimulatingScan(false);
      setIsQrLinked(true);
      alert(`✅ SaaS WhatsApp paired successfully! Your global AI Bot is now active 24/7.`);
    }, 1800);
  };

  const handleDisconnectQr = async () => {
    if (window.confirm('Disconnect SaaS WhatsApp number from the AI Bot Gateway?')) {
      try {
        await fetch(`${WA_SERVER}/api/session/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId })
        });
      } catch (e) {
        console.error('Disconnect error:', e);
      }
      setIsQrLinked(false);
      setQrTimer(30);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-dark-border pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">SaaS WhatsApp Bot Hub</h1>
          <p className="text-xs text-primary-400 font-mono font-bold uppercase tracking-wider mt-1">
            Super Admin / WhatsApp Global Bot
          </p>
        </div>
      </div>

      <GlassCard className="border-t-4 border-t-primary-500 relative overflow-hidden">
        {/* Animated Background Pulse */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>

        <div className="flex items-center gap-4 mb-6">
          <div className={`p-4 rounded-2xl ${isQrLinked ? 'bg-green-500/20 text-green-500' : 'bg-primary-500/20 text-primary-500'}`}>
            <Bot size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">SaaS Bot Gateway Connection</h2>
            <p className="text-dark-muted text-sm mt-1 max-w-2xl">
              Connect your official SaaS WhatsApp number to automate platform-wide inquiries and support.
            </p>
          </div>
        </div>

        <div className="bg-dark-hover border border-dark-border rounded-2xl p-6 lg:p-8 relative overflow-hidden">
          {isQrLinked ? (
            <div className="flex flex-col md:flex-row items-center gap-8 animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full"></div>
                <div className="w-32 h-32 rounded-full border-4 border-green-500 p-2 relative bg-dark-bg flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                  <Smartphone size={48} className="text-green-500" />
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-4 border-dark-bg">
                    <CheckCircle2 size={20} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-black text-white mb-2 flex items-center justify-center md:justify-start gap-2">
                  Device Connected <span className="text-green-500">Live</span>
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
                  <div className="bg-dark-bg border border-dark-border px-4 py-3 rounded-xl flex items-center gap-3">
                    <Smartphone size={16} className="text-primary-400" />
                    <div>
                      <p className="text-[10px] text-dark-muted uppercase font-bold">Linked Number</p>
                      <p className="text-sm font-bold text-white">{linkedPhone}</p>
                    </div>
                  </div>
                  <div className="bg-dark-bg border border-dark-border px-4 py-3 rounded-xl flex items-center gap-3">
                    <Globe size={16} className="text-blue-400" />
                    <div>
                      <p className="text-[10px] text-dark-muted uppercase font-bold">Server Engine</p>
                      <p className="text-sm font-bold text-white">Alwaysdata Cloud</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-left bg-black/40 p-3.5 rounded-xl border border-dark-border mt-4">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider block flex items-center gap-1.5"><Globe size={12}/> Public Chat Bot Link:</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-dark-bg border border-dark-border text-white text-[11px] py-2 px-3 rounded-lg overflow-hidden text-ellipsis whitespace-nowrap opacity-80">
                      https://wa.me/{linkedPhone.replace(/[^0-9]/g, '')}?text=Hello
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://wa.me/${linkedPhone.replace(/[^0-9]/g, '')}?text=Hello`);
                        alert('✅ Chat Bot Link Copied to Clipboard!');
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-lg transition-all shadow-md flex items-center gap-1"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleDisconnectQr}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/30 font-bold text-sm hover:bg-red-500 hover:text-white transition-all w-full sm:w-auto"
                >
                  Disconnect Device
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 animate-fade-in">
              <div className="relative group shrink-0">
                <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-2xl group-hover:blur-2xl transition-all"></div>
                <div className="w-56 h-56 bg-white rounded-2xl p-4 relative shadow-2xl flex flex-col items-center justify-center text-center">
                  {liveQrDataUrl ? (
                    <img src={liveQrDataUrl} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <>
                      {isSimulatingScan ? (
                        <div className="flex flex-col items-center gap-3 text-primary-600">
                          <RefreshCw size={40} className="animate-spin" />
                          <span className="font-bold">Syncing...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-[scan_2s_ease-in-out_infinite] opacity-50 shadow-[0_0_10px_#22c55e]"></div>
                             <span className="text-gray-400 font-mono text-xs">Awaiting Network</span>
                          </div>
                          {isLiveServerConnected && liveServerStatus !== 'QR_READY' && (
                             <p className="text-xs font-bold text-blue-600 mt-2">Server Initializing...</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {isLiveServerConnected && (
                    <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg z-10" title="Connected to Real Cloud Server">
                      <Wifi size={18} className="text-white" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 max-w-lg text-center md:text-left">
                <h3 className="text-xl lg:text-2xl font-black text-white mb-3">
                  Scan QR to Link SaaS Bot
                </h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                    <p className="text-sm text-dark-muted">Open WhatsApp on your SaaS Admin phone.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                    <p className="text-sm text-dark-muted">Tap <b>Menu (⋮)</b> or <b>Settings (⚙️)</b> and select <b>Linked Devices</b>.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center shrink-0 font-bold text-xs">3</div>
                    <p className="text-sm text-dark-muted">Tap on <b>Link a Device</b> and point your camera at the QR code.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border">
                    <RefreshCw size={14} className={`text-primary-400 ${qrTimer <= 5 ? 'animate-spin' : ''}`} />
                    <span className="text-xs font-mono font-bold text-dark-muted">QR Refreshes in {qrTimer}s</span>
                  </div>
                  
                  {!isLiveServerConnected && (
                    <button 
                      onClick={handleSimulateScan}
                      disabled={isSimulatingScan}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                    >
                      <Zap size={14} />
                      {isSimulatingScan ? 'Starting Demo Backend...' : 'Force Connect'}
                    </button>
                  )}
                  {isLiveServerConnected && !liveQrDataUrl && liveServerStatus !== 'CONNECTED' && (
                     <button 
                     onClick={handleSimulateScan}
                     disabled={isSimulatingScan}
                     className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                   >
                     <RefreshCw size={14} className={isSimulatingScan ? 'animate-spin' : ''} />
                     Generate QR
                   </button>
                  )}
                </div>
                
                {isLiveServerConnected ? (
                  <div className="mt-4 p-2 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <p className="text-[10px] text-green-400 font-bold">Connected to Live Alwaysdata Cloud Server.</p>
                  </div>
                ) : (
                  <div className="mt-4 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                    <AlertCircle size={14} className="text-yellow-500" />
                    <p className="text-[10px] text-yellow-400">Live Server offline. Click Force Connect to simulate.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default SuperAdminWhatsAppBot;
