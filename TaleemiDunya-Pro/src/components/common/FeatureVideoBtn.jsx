import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, X, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

const FeatureVideoBtn = ({ featureId, variant = 'default' }) => {
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!featureId) return;
    const fetchVideo = async () => {
      try {
        const q = query(collection(db, 'featureVideos'), where('featureId', '==', featureId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setVideoUrl(data.videoUrl);
          setVideoTitle(data.title || 'How it works');
        }
      } catch (err) {
        console.error('Failed to load feature video:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [featureId]);

  if (loading || !videoUrl) return null;

  // Attempt to parse YouTube URL to embed
  const getEmbedUrl = (url) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
      }
    }
    return url; // fallback for raw mp4 or already embedded urls
  };

  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  const src = getEmbedUrl(videoUrl);

  return (
    <>
      {variant === 'icon' ? (
        <button 
          onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
          className="p-0.5 rounded-md hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-all flex items-center justify-center group"
          title="Watch tutorial video"
        >
          <Play size={14} className="fill-current group-hover:scale-110 transition-transform" />
        </button>
      ) : (
        <button 
          onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
          title="Watch tutorial video"
        >
          <Play size={14} className="fill-current" />
          <span>How it works</span>
        </button>
      )}

      {showModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-4xl bg-[#111] rounded-2xl overflow-hidden shadow-2xl relative border border-white/10 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/80 border-b border-white/10 z-10">
              <h3 className="text-white font-bold text-sm">{videoTitle}</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 bg-white/10 hover:bg-red-500 rounded-full text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Player */}
            <div className="aspect-video w-full bg-black flex items-center justify-center">
              {isYouTube ? (
                <iframe
                  src={src}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <video 
                  src={src} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default FeatureVideoBtn;
