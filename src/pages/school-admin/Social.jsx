import React, { useState, useEffect } from 'react';
import { Share2, Send, Image as ImageIcon, RefreshCw, Trash2 } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const Social = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [targets, setTargets] = useState({ facebook: true, instagram: true });

  useEffect(() => {
    fetchPosts();
  }, [userData]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await getRecords('posts', schoolId);
      setPosts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!postText.trim()) return;
    setPublishing(true);
    try {
      const activePlatforms = Object.keys(targets).filter(k => targets[k]);
      const postData = {
        text: postText,
        platforms: activePlatforms,
        date: new Date().toLocaleDateString(),
        author: userData?.name || 'School Admin'
      };
      const result = await addRecord('posts', postData, schoolId);
      if (result.success) {
        setPostText('');
        fetchPosts();
        alert('Post published successfully!');
      } else {
        alert('Error: ' + result.error.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deleteRecord('posts', id);
        setPosts(posts.filter(p => p.id !== id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">Social Post</h1>
          <p className="text-dark-muted mt-1">Publish updates directly to your school's social feed.</p>
        </div>
        <button onClick={fetchPosts} className="premium-button-secondary">
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard className="p-8">
          <h2 className="font-bold mb-6 flex items-center gap-2 text-primary-500">
            <Share2 size={20} /> Create Post
          </h2>
          
          <form onSubmit={handlePublish} className="space-y-4">
            <textarea 
              rows="5"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              className="w-full premium-input resize-none"
              placeholder="What's happening at your school?"
              required
            />
            
            <div className="flex gap-4 p-4 border border-dark-border rounded-xl bg-dark-bg items-center justify-center border-dashed cursor-pointer hover:border-primary-500/50 transition-colors">
              <ImageIcon className="text-dark-muted" />
              <span className="text-sm text-dark-muted font-medium">Click to upload image or video</span>
            </div>

            <div className="pt-4 space-y-2">
              <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Publish To</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-dark-border bg-dark-bg hover:border-blue-500 transition-colors">
                  <input 
                    type="checkbox" 
                    className="text-blue-500 focus:ring-blue-500 bg-dark-bg" 
                    checked={targets.facebook} 
                    onChange={e => setTargets({...targets, facebook: e.target.checked})}
                  />
                  <svg className="text-blue-500 w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-sm font-bold">Facebook</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-dark-border bg-dark-bg hover:border-pink-500 transition-colors">
                  <input 
                    type="checkbox" 
                    className="text-pink-500 focus:ring-pink-500 bg-dark-bg" 
                    checked={targets.instagram} 
                    onChange={e => setTargets({...targets, instagram: e.target.checked})}
                  />
                  <svg className="text-pink-500 w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                  <span className="text-sm font-bold">Instagram</span>
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={publishing}
              className="w-full premium-button-primary mt-4 flex items-center gap-2 justify-center"
            >
              <Send size={18} /> {publishing ? 'Publishing...' : 'Publish Now'}
            </button>
          </form>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-8">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-primary-500">
              <Share2 size={20} /> Social Feed Log
            </h3>
            {loading ? (
              <div className="py-10 text-center text-dark-muted">Loading feed...</div>
            ) : posts.length === 0 ? (
              <div className="py-10 text-center text-dark-muted">No published updates found.</div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {posts.map(post => (
                  <div key={post.id} className="p-4 bg-white/5 border border-dark-border rounded-xl space-y-2 relative group">
                    <button 
                      onClick={() => handleDelete(post.id)}
                      className="absolute top-2 right-2 p-1.5 hover:bg-red-500/10 text-dark-muted hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    <p className="text-sm text-white">{post.text}</p>
                    <div className="flex justify-between items-center text-[10px] text-dark-muted pt-2 border-t border-dark-border">
                      <span className="font-semibold">By: {post.author}</span>
                      <div className="flex gap-2">
                        {post.platforms?.map(p => (
                          <span key={p} className="px-1.5 py-0.5 rounded bg-white/10 text-[8px] uppercase font-black font-mono">{p}</span>
                        ))}
                        <span>{post.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Social;
