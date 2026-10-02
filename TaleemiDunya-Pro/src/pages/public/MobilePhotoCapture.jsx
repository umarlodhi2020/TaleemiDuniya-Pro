import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Upload, CheckCircle, Loader2, RefreshCw, Smartphone, ShieldCheck } from 'lucide-react';
import { addRecordWithId } from '../../services/db';

const MobilePhotoCapture = () => {
  const { sessionId } = useParams();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionId) {
      // Instantly notify PC desktop that this mobile device is paired and online
      addRecordWithId('photo_sessions', sessionId, {
        device_connected: true,
        status: 'connected',
        last_connected_at: Date.now()
      }, 'remote_mobile').catch(err => console.log('Handshake err:', err));
    }
  }, [sessionId]);

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > width && height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          } else if (width > maxDim) {
            width = maxDim;
            height = maxDim;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG/PNG).');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const compressedData = await compressImage(file);
      setPreview(compressedData);
      
      // Upload to Firestore for instantaneous PC desktop sync
      const res = await addRecordWithId('photo_sessions', sessionId, {
        photoData: compressedData,
        status: 'completed',
        timestamp: Date.now()
      }, 'remote_mobile');

      if (res.success) {
        setSynced(true);
      } else {
        throw new Error('Failed to sync with desktop.');
      }
    } catch (err) {
      console.error(err);
      setError('Unable to transmit picture. Please verify your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-500 mx-auto flex items-center justify-center shadow-lg shadow-primary-500/30 mb-6 animate-pulse">
          <Smartphone size={32} className="text-white" />
        </div>

        <h1 className="text-2xl font-black tracking-tight mb-2">TaleemiDunya Cam</h1>
        <p className="text-xs text-indigo-200/70 mb-6 uppercase tracking-wider font-bold">Remote Smartphone Capture Bridge</p>

        {synced ? (
          <div className="py-6 space-y-6 animate-fade-in">
            <div className="w-48 h-48 mx-auto rounded-3xl overflow-hidden border-4 border-green-500 shadow-2xl relative">
              <img src={preview} alt="Synced" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                <CheckCircle size={56} className="text-white drop-shadow-lg" />
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30">
              <h3 className="text-lg font-black text-green-400 mb-1 flex items-center justify-center gap-2">
                <ShieldCheck size={20} /> Synced & Paired!
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Photo instantly transferred to your PC screen! <strong className="text-emerald-300 font-black">Your device is now permanently paired.</strong> No need to rescan QR code for future students!
              </p>
            </div>
            <button
              onClick={() => { setSynced(false); setPreview(null); }}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-[0.99]"
            >
              <RefreshCw size={18} className="animate-spin-slow" /> 🟢 Ready for Next Student (Take New Snap)
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {preview && !loading && (
              <div className="w-40 h-40 mx-auto rounded-3xl overflow-hidden border-2 border-indigo-500 shadow-xl">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <Loader2 size={40} className="animate-spin text-primary-500" />
                <p className="text-sm font-bold text-indigo-300 animate-pulse">Compressing & syncing with desktop screen...</p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <label className="w-full py-4 px-6 bg-gradient-to-r from-primary-500 via-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-2xl shadow-xl shadow-indigo-500/20 font-black text-sm flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.99] border border-white/20">
                  <Camera size={22} />
                  <span>📸 TAP TO OPEN PHONE CAMERA</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                <label className="w-full py-3.5 px-6 bg-white/5 hover:bg-white/10 text-indigo-200 border border-white/10 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
                  <Upload size={18} />
                  <span>Browse Mobile Gallery / Folder</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs">
                {error}
              </div>
            )}
            
            <div className="pt-4 border-t border-white/5 text-[11px] text-gray-400 leading-relaxed">
              💡 <strong className="text-gray-200">How it works:</strong> Taking a photo here automatically pushes it securely across the cloud to the exact student form on your desktop screen in real-time.
            </div>
          </div>
        )}
      </div>
      <p className="mt-8 text-[11px] text-slate-500 font-medium">© TaleemiDunya Enterprise Software Solutions</p>
    </div>
  );
};

export default MobilePhotoCapture;
