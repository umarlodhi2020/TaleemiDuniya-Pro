import React, { useState, useEffect } from 'react';
import { doc, serverTimestamp, collection, getDocs, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { 
  Video, 
  Play, 
  Trash2, 
  Plus, 
  Edit, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Search, 
  ExternalLink 
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { DEFAULT_FEATURE_VIDEOS } from '../../components/common/FeatureVideoBtn';

const FEATURE_MODULE_OPTIONS = [
  { value: 'dashboard-core', label: '1. Dashboard & Core (ڈیش بورڈ اور سسٹم اوور ویو)' },
  { value: 'student-management', label: '2. Student Management (طالب علم ریکارڈ اور داخلہ جات)' },
  { value: 'staff-management', label: '3. Staff Management (اسٹاف اور اساتذہ مینجمنٹ)' },
  { value: 'finance-accounts', label: '4. Finance & Accounts (فیس چالان اور مالیاتی لیجر)' },
  { value: 'academic', label: '5. Academic Operations (ٹائم ٹیبل، ڈائری اور اکیڈمکس)' },
  { value: 'exam-results', label: '6. Exam & Results (امتحانات، نمبرز انٹری اور رزلٹ کارڈز)' },
  { value: 'resources-facilities', label: '7. Resources & Facilities (گیٹ پاس، لائبریری اور ٹرانسپورٹ)' },
  { value: 'portal-services', label: '8. Portal & Services (واٹس ایپ بوٹ اور سسٹم سیٹنگز)' },
  { value: 'admission-crm', label: '⚡ Online Admission CRM (آن لائن داخلہ سی آر ایم)' },
  { value: 'family-tree', label: '⚡ Family Tree / Siblings (فیملی ٹری اور بہن بھائی رعایت)' },
  { value: 'attendance', label: '⚡ Student Attendance & QR (حاضری اور کیو آر اسکینر)' },
  { value: 'admit-cards', label: '⚡ Admit Cards & Roll Slips (رول نمبر سلپس اور ایڈمٹ کارڈز)' },
  { value: 'payroll', label: '⚡ Staff Payroll & Salaries (تنخواہیں اور پے سلپس)' },
  { value: 'whatsapp-automation', label: '⚡ WhatsApp AI Bot & Alerts (واٹس ایپ آٹو میشن اور بوٹ)' },
  { value: 'cloud-backup', label: '⚡ Google Drive Cloud Backup (گوگل ڈرائیو کلاؤڈ بیک اپ)' }
];

const FeatureVideos = () => {
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [featureVideos, setFeatureVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [newVideo, setNewVideo] = useState({ featureId: '', title: '', videoUrl: '', description: '' });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchVideos = async () => {
    try {
      const videosSnap = await getDocs(collection(db, 'featureVideos'));
      const videosData = [];
      videosSnap.forEach(d => {
        videosData.push({ id: d.id, ...d.data() });
      });
      setFeatureVideos(videosData);
    } catch (error) {
      console.error('Error fetching videos:', error);
      showToast('error', 'Failed to fetch videos from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // One-Click Bulk Seed / Sync All Tutorial Videos
  const handleSeedAllVideos = async () => {
    const confirmSeed = window.confirm(
      'Are you sure you want to seed/update tutorial videos for ALL platform features? This will configure videos for all 8 core modules and key sub-features.'
    );
    if (!confirmSeed) return;

    setSyncingAll(true);
    let addedCount = 0;
    let updatedCount = 0;

    try {
      const existingMap = new Map();
      featureVideos.forEach(v => {
        if (v.featureId) existingMap.set(v.featureId, v);
      });

      for (const [fId, item] of Object.entries(DEFAULT_FEATURE_VIDEOS)) {
        if (existingMap.has(fId)) {
          const existing = existingMap.get(fId);
          // If existing is missing a URL or title, update it
          if (!existing.videoUrl || !existing.title) {
            await updateDoc(doc(db, 'featureVideos', existing.id), {
              title: item.title,
              videoUrl: item.videoUrl,
              description: item.description || '',
              updatedAt: serverTimestamp()
            });
            updatedCount++;
          }
        } else {
          await addDoc(collection(db, 'featureVideos'), {
            featureId: fId,
            title: item.title,
            videoUrl: item.videoUrl,
            description: item.description || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          addedCount++;
        }
      }

      await fetchVideos();
      showToast('success', `Tutorial videos synced successfully! (${addedCount} added, ${updatedCount} updated)`);
    } catch (err) {
      console.error('Error seeding all videos:', err);
      showToast('error', 'Failed to seed all videos. Check console.');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSaveVideo = async () => {
    if (!newVideo.featureId || !newVideo.videoUrl) {
      showToast('error', 'Feature ID and Video URL are required.');
      return;
    }
    setSaving(true);
    try {
      if (editingVideo) {
        const docRef = doc(db, 'featureVideos', editingVideo.id);
        await updateDoc(docRef, { ...newVideo, updatedAt: serverTimestamp() });
        setFeatureVideos(prev => prev.map(v => v.id === editingVideo.id ? { ...v, ...newVideo } : v));
        showToast('success', 'Video tutorial updated successfully.');
      } else {
        const docRef = await addDoc(collection(db, 'featureVideos'), { ...newVideo, createdAt: serverTimestamp() });
        setFeatureVideos(prev => [...prev, { id: docRef.id, ...newVideo }]);
        showToast('success', 'New feature video tutorial registered.');
      }
      setShowVideoModal(false);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to save video mapping.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVideo = async (id) => {
    if (window.confirm('Are you sure you want to delete this video mapping?')) {
      try {
        await deleteDoc(doc(db, 'featureVideos', id));
        setFeatureVideos(prev => prev.filter(v => v.id !== id));
        showToast('success', 'Video deleted.');
      } catch (err) {
        showToast('error', 'Failed to delete video.');
      }
    }
  };

  const filteredVideos = featureVideos.filter(v => {
    const term = searchTerm.toLowerCase();
    return (
      (v.title || '').toLowerCase().includes(term) ||
      (v.featureId || '').toLowerCase().includes(term) ||
      (v.videoUrl || '').toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary-500" size={32} />
        <p className="text-dark-muted ml-3 font-semibold">Loading feature video tutorials...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
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

      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3 text-white">
            <Video className="text-red-500" size={32} /> Feature Videos & Video Tutorials
          </h1>
          <p className="text-dark-muted mt-1 text-xs md:text-sm">
            Configure 'How it works' video tutorials that appear across the software sidebar and platform modules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={handleSeedAllVideos}
            disabled={syncingAll}
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all disabled:opacity-50"
            title="Automatically add tutorial video mappings for all 8 core modules and sub-features"
          >
            {syncingAll ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            <span>{syncingAll ? 'Syncing...' : '🚀 Sync All Feature Tutorials'}</span>
          </button>

          <button 
            onClick={() => {
              setEditingVideo(null);
              setNewVideo({ featureId: '', title: '', videoUrl: '', description: '' });
              setShowVideoModal(true);
            }}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg"
          >
            <Plus size={15} /> Add Custom Video
          </button>
        </div>
      </div>

      <GlassCard className="p-6">
        
        {/* Search & Stats Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-dark-border pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Managed Feature Videos</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-mono font-bold">
              {featureVideos.length} Active
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3.5 top-3 text-dark-muted" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by title or ID..."
              className="w-full pl-9 pr-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white placeholder:text-dark-muted outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Video List */}
        <div className="space-y-3">
          {filteredVideos.map(video => (
            <div key={video.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-dark-border hover:border-white/20 transition-all gap-4 group">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 text-red-500">
                  <Play size={18} className="fill-current ml-0.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-white truncate">{video.title}</p>
                  <div className="text-[10px] text-dark-muted font-mono uppercase tracking-wider mt-1 flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-dark-bg border border-dark-border text-primary-400 font-bold">
                      ID: {video.featureId}
                    </span>
                    <a 
                      href={video.videoUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-slate-400 hover:text-white flex items-center gap-1 hover:underline truncate max-w-[260px] sm:max-w-md"
                    >
                      <span>{video.videoUrl}</span>
                      <ExternalLink size={10} className="shrink-0" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button 
                  onClick={() => {
                    setEditingVideo(video);
                    setNewVideo({
                      featureId: video.featureId || '',
                      title: video.title || '',
                      videoUrl: video.videoUrl || '',
                      description: video.description || ''
                    });
                    setShowVideoModal(true);
                  }}
                  className="p-2 text-dark-muted hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                  title="Edit tutorial mapping"
                >
                  <Edit size={15} />
                </button>
                <button 
                  onClick={() => handleDeleteVideo(video.id)}
                  className="p-2 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 rounded-xl transition-colors"
                  title="Delete mapping"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          {filteredVideos.length === 0 && (
            <div className="text-center py-12 text-dark-muted text-xs border border-dashed border-dark-border rounded-2xl space-y-3">
              <Video className="mx-auto text-dark-muted opacity-40" size={36} />
              <p>No feature tutorial videos found matching criteria.</p>
              <button
                onClick={handleSeedAllVideos}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                🚀 Click Here to Auto-Sync All Feature Video Tutorials
              </button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Add/Edit Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#121827] border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl p-6 text-white space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Video className="text-red-500" size={20} />
                {editingVideo ? 'Edit Feature Tutorial Video' : 'Add New Feature Video'}
              </h3>
            </div>
            
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Target Platform Module / Feature ID <span className="text-red-400">*</span>
                </label>
                <select 
                  value={newVideo.featureId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const def = DEFAULT_FEATURE_VIDEOS[selId];
                    setNewVideo({
                      ...newVideo,
                      featureId: selId,
                      title: newVideo.title || def?.title || '',
                      videoUrl: newVideo.videoUrl || def?.videoUrl || '',
                      description: newVideo.description || def?.description || ''
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-red-500 transition-all cursor-pointer"
                >
                  <option value="">-- Select Module or Sub-Feature --</option>
                  {FEATURE_MODULE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  The red Play icon on this feature in the sidebar and headers will play this video.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Tutorial Video Title <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text" 
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({...newVideo, title: e.target.value})}
                  placeholder="e.g. How to generate student fee challans"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-red-500 transition-all placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  YouTube Video Link or MP4 URL <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text" 
                  value={newVideo.videoUrl}
                  onChange={(e) => setNewVideo({...newVideo, videoUrl: e.target.value})}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-300 font-mono text-xs outline-none focus:border-red-500 transition-all placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Short Description / Key Points (Optional)
                </label>
                <textarea 
                  rows={2}
                  value={newVideo.description || ''}
                  onChange={(e) => setNewVideo({...newVideo, description: e.target.value})}
                  placeholder="Short explanation of what users will learn in this video..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-red-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button 
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveVideo}
                disabled={saving}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                <span>{saving ? 'Saving...' : 'Save Tutorial Video'}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureVideos;
