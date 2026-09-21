import React, { useState, useEffect } from 'react';
import { doc, serverTimestamp, collection, getDocs, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Video, Play, Trash2, Plus, Edit, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';

const FeatureVideos = () => {
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [featureVideos, setFeatureVideos] = useState([]);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [newVideo, setNewVideo] = useState({ featureId: '', title: '', videoUrl: '' });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

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
        showToast('success', 'Video updated successfully.');
      } else {
        const docRef = await addDoc(collection(db, 'featureVideos'), { ...newVideo, createdAt: serverTimestamp() });
        setFeatureVideos(prev => [...prev, { id: docRef.id, ...newVideo }]);
        showToast('success', 'Video added successfully.');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary-500" size={32} />
        <p className="text-dark-muted ml-3">Loading feature videos...</p>
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

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3"><Video className="text-primary-500" size={28} /> Feature Videos</h1>
        <p className="text-dark-muted mt-1">Configure 'How it works' videos that appear on specific pages across the platform.</p>
      </div>

      <GlassCard className="p-8">
        <div className="flex items-center justify-between mb-6 border-b border-dark-border pb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">Managed Videos</h2>
          <button 
            onClick={() => {
              setEditingVideo(null);
              setNewVideo({ featureId: '', title: '', videoUrl: '' });
              setShowVideoModal(true);
            }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg"
          >
            <Plus size={14} /> Add Video
          </button>
        </div>

        <div className="space-y-4">
          {featureVideos.map(video => (
            <div key={video.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/5 border border-dark-border hover:border-white/20 transition-all gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center shrink-0">
                  <Play size={20} className="text-primary-500 ml-1" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">{video.title}</p>
                  <p className="text-[10px] text-dark-muted font-mono uppercase tracking-wider mt-1 flex gap-2 break-all">
                    <span className="text-primary-400">ID: {video.featureId}</span> • <span>{video.videoUrl}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:shrink-0">
                <button 
                  onClick={() => {
                    setEditingVideo(video);
                    setNewVideo(video);
                    setShowVideoModal(true);
                  }}
                  className="p-2 text-dark-muted hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteVideo(video.id)}
                  className="p-2 text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {featureVideos.length === 0 && (
            <div className="text-center py-8 text-dark-muted text-sm border border-dashed border-dark-border rounded-xl">
              No feature videos configured yet.
            </div>
          )}
        </div>
      </GlassCard>

      {/* Add/Edit Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#1a1f37] border border-dark-border rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h3 className="text-lg font-black text-white mb-6">
              {editingVideo ? 'Edit Feature Video' : 'Add Feature Video'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-dark-muted uppercase tracking-widest mb-1.5">Feature ID</label>
                <select 
                  value={newVideo.featureId}
                  onChange={(e) => setNewVideo({...newVideo, featureId: e.target.value})}
                  className="w-full premium-input font-mono cursor-pointer"
                >
                  <option value="">-- Select a Module --</option>
                  <option value="dashboard-core">Dashboard & Core</option>
                  <option value="student-management">Student Management</option>
                  <option value="staff-management">Staff Management</option>
                  <option value="finance-accounts">Finance & Accounts</option>
                  <option value="academic">Academic</option>
                  <option value="exam-results">Exam & Results</option>
                  <option value="resources-facilities">Resources & Facilities</option>
                  <option value="portal-services">Portal & Services</option>
                </select>
                <p className="text-[10px] text-dark-muted mt-1">Select the feature where this video will appear.</p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-dark-muted uppercase tracking-widest mb-1.5">Video Title</label>
                <input 
                  type="text" 
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({...newVideo, title: e.target.value})}
                  placeholder="e.g. How to generate admit cards"
                  className="w-full premium-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-dark-muted uppercase tracking-widest mb-1.5">Video URL (YouTube or MP4)</label>
                <input 
                  type="text" 
                  value={newVideo.videoUrl}
                  onChange={(e) => setNewVideo({...newVideo, videoUrl: e.target.value})}
                  placeholder="https://www.youtube.com/watch?v=... or https://.../video.mp4"
                  className="w-full premium-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8">
              <button 
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 text-xs font-bold text-dark-muted hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveVideo}
                disabled={saving}
                className="premium-button flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Video'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureVideos;
