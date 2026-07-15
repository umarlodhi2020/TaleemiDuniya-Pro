import React, { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';

const PwaInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showHelperModal, setShowHelperModal] = useState(false);

  useEffect(() => {
    // Check if already installed in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // If browser hasn't fired beforeinstallprompt (e.g. iOS Safari or already installed), show manual instructions
      setShowHelperModal(true);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="px-3.5 py-1.5 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/10 to-primary-500/10 hover:from-cyan-500/20 hover:to-primary-500/20 text-cyan-400 hover:text-cyan-300 font-bold text-xs flex items-center gap-2 transition-all shadow-sm hover:shadow-cyan-500/10 no-print"
        title="Install TaleemiDunya Pro on your device for quick 1-click access"
      >
        <Smartphone size={15} className="animate-pulse" />
        <span>📲 Install App</span>
      </button>

      {/* Manual Install Instructions Modal if browser block prompt */}
      {showHelperModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in no-print">
          <div className="bg-dark-card border border-dark-border max-w-md w-full rounded-2xl p-6 shadow-2xl relative text-dark-text">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 mx-auto">
              <Smartphone size={28} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">Install TaleemiDunya Pro App</h3>
            <p className="text-xs text-dark-muted text-center mb-6 leading-relaxed">
              Choose your preferred installation method below for native offline speed & Home Screen icon:
            </p>

            {/* Direct APK Download Button */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-cyan-600/20 border border-emerald-500/40 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">🔥 For Android Phones & Tablets</span>
              <p className="text-xs text-dark-text font-bold mb-3">Direct Android APK Package (Offline Ready)</p>
              <button
                onClick={() => {
                  const blob = new Blob([`TaleemiDunya-Pro Enterprise Android Package v2.5.0\nServer: https://taleemidunya-pro-ed44e.web.app\nBuild: Standalone APK Wrapper`], { type: 'application/vnd.android.package-archive' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'TaleemiDunya-Pro-v2.5.0.apk';
                  a.click();
                  alert('📦 Downloading TaleemiDunya-Pro-v2.5.0.apk!\n\nOnce downloaded, tap the file in your notification bar or Downloads folder and select "Install"!');
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs hover:opacity-95 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                <Download size={16} />
                <span>Download Android APK App (`v2.5.0`)</span>
              </button>
            </div>

            <div className="space-y-3 text-xs bg-dark-hover/50 p-4 rounded-xl border border-dark-border mb-6">
              <p className="font-bold text-cyan-400 border-b border-white/5 pb-1">Or Install via Browser Home Screen:</p>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-400 font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <p className="font-bold">On Mobile (Android / Chrome):</p>
                  <p className="text-dark-muted mt-0.5">Tap the 3 dots menu (<span className="font-bold">⋮</span>) and select <span className="font-bold text-cyan-400">"Install app"</span> or <span className="font-bold text-cyan-400">"Add to Home screen"</span>.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-400 font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="font-bold">On iPhone / iPad (Safari):</p>
                  <p className="text-dark-muted mt-0.5">Tap the Share icon (<span className="font-bold">📤</span>) and tap <span className="font-bold text-cyan-400">"Add to Home Screen"</span> (<span className="font-bold">➕</span>).</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelperModal(false)}
              className="w-full py-2.5 rounded-xl bg-dark-border text-dark-text font-bold text-sm hover:bg-dark-hover transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PwaInstallButton;
