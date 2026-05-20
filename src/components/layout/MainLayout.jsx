import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../../context/AuthContext';
import { Bot, Send, Sparkles, X, Copy, Check, Save, RefreshCw } from 'lucide-react';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { addRecord } from '../../services/db';

const MainLayout = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am your global TaleemiDunya AI Assistant. Ask me to draft notices, SMS reminders, timetables, or email templates! I will help you instantly."
    }
  ]);
  const [executing, setExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const quickPrompts = [
    {
      title: '📢 Draft Vacation Notice',
      text: 'Draft a professional school notice for Summer Vacation.',
      category: 'notice',
      draft: {
        title: 'Summer Vacation Official Notice',
        content: 'Dear Parents, Students, and Staff,\n\nWe wish to inform you that TaleemiDunya Academy will remain closed for Summer Vacation starting from June 1, 2026, till July 31, 2026.\n\nRegards,\nSchool Administration',
        type: 'Notices'
      }
    },
    {
      title: '📝 Fee Absent SMS Template',
      text: 'Create a direct, urgent fee reminder SMS template for parents.',
      category: 'sms',
      draft: {
        title: 'Urgent Dues Alert',
        content: 'Dear Parent,\n\nThis is a friendly reminder that the tuition fee for the current month remains unpaid. Please clear outstanding dues.\n\nRegards,\nTaleemiDunya Academy',
        type: 'SMS Template'
      }
    }
  ];

  const handleSend = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMsg = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMsg]);
    setExecuting(true);
    setPrompt('');
    setSaveStatus('');

    // Simulate AI response and generation step
    setTimeout(() => {
      let draftObj = null;

      if (prompt.toLowerCase().includes('notice') || prompt.toLowerCase().includes('vacation')) {
        draftObj = quickPrompts[0].draft;
      } else {
        draftObj = quickPrompts[1].draft;
      }

      const aiResponseContent = `I have generated the following professional ${draftObj.type} for you:\n\n**Title:** ${draftObj.title}\n\n**Body:**\n${draftObj.content}\n\nClick below to save this directly to Firestore!`;

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponseContent, draft: draftObj }]);
      setExecuting(false);
    }, 1500);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveToFirestore = async (draft) => {
    if (!draft) return;
    setExecuting(true);
    setSaveStatus('Saving...');
    try {
      let collectionName = 'notifications';
      if (draft.type === 'Notices') collectionName = 'notices';
      else if (draft.type === 'SMS Template') collectionName = 'sms_templates';
      else if (draft.type === 'Schedules') collectionName = 'bell_schedules';
      else collectionName = 'email_templates';

      const recordData = {
        title: draft.title,
        message: draft.content,
        content: draft.content,
        type: draft.type,
        date: new Date().toLocaleDateString(),
        createdAt: new Date(),
        author: userData?.name || 'AI Assistant Agent'
      };

      const res = await addRecord(collectionName, recordData, schoolId);
      if (res.success) {
        setSaveStatus(`Saved to '${collectionName}' in Firestore.`);
      } else {
        setSaveStatus('Failed to write database.');
      }
    } catch (e) {
      console.error(e);
      setSaveStatus('Error saving.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex">
      <Sidebar role={userData?.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="p-8 flex-1 transition-all duration-300 ml-52">
          <div className="max-w-7xl mx-auto">
            {/* Elegant Offline Banner */}
            {!isOnline && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-amber-400 text-xs animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="font-semibold">Offline Mode Active</span>
                  <span className="text-dark-muted hidden md:inline">| All your changes are cached locally in IndexedDB and will automatically sync once you are back online.</span>
                </div>
                <div className="bg-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest text-amber-300">
                  Offline
                </div>
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating WhatsApp-Style AI Button */}
      <button
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110 active:scale-95 cursor-pointer bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 border border-white/20 shadow-cyan-500/20"
        title="Talk to TaleemiDunya AI"
      >
        <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />
        <Bot className="text-white relative z-10 w-7 h-7" />
      </button>

      {/* Sliding WhatsApp-Style AI Chat Drawer */}
      <div className={`fixed top-0 right-0 h-screen w-96 z-50 bg-dark-bg/95 border-l border-dark-border backdrop-blur-2xl shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out transform ${isAiOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
        {/* Drawer Header */}
        <div className="p-4 border-b border-dark-border flex items-center justify-between bg-dark-card/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-white relative">
              <span className="absolute inset-0 rounded-full bg-cyan-400/30 animate-pulse" />
              <Bot size={20} className="relative z-10 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">TDM AI Assistant</h4>
              {isOnline ? (
                <p className="text-[10px] text-green-400 font-mono tracking-widest uppercase animate-pulse">● online</p>
              ) : (
                <p className="text-[10px] text-amber-500 font-mono tracking-widest uppercase animate-pulse">● offline</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsAiOpen(false)}
            className="p-2 hover:bg-white/10 rounded-full text-dark-muted hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Messages list */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                  <Bot size={14} />
                </div>
              )}
              <div className={`p-3 rounded-2xl max-w-[80%] border text-xs ${m.role === 'user'
                  ? 'bg-cyan-500/10 border-cyan-500/20 text-white rounded-tr-none'
                  : 'bg-white/5 border-dark-border text-dark-text rounded-tl-none'
                }`}>
                <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                {m.draft && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
                    <button
                      onClick={() => copyToClipboard(m.draft.content)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 font-bold flex items-center gap-1 transition-all text-white text-[10px]"
                    >
                      {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                      Copy
                    </button>
                    <button
                      onClick={() => saveToFirestore(m.draft)}
                      disabled={executing}
                      className="px-2 py-1 rounded bg-cyan-500 hover:bg-cyan-600 text-white font-bold flex items-center gap-1 transition-all text-[10px]"
                    >
                      <Save size={10} />
                      Save
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {executing && (
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <RefreshCw className="animate-spin" size={14} />
              </div>
              <div className="px-3 py-2 rounded-2xl bg-white/5 border border-dark-border text-[9px] font-mono uppercase tracking-widest text-cyan-400/80 animate-pulse">
                AI Thinking...
              </div>
            </div>
          )}

          {saveStatus && (
            <div className="p-2 rounded bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 text-center font-mono">
              {saveStatus}
            </div>
          )}
        </div>

        {/* Quick Suggestion buttons */}
        <div className="px-4 py-2 border-t border-dark-border/50 bg-dark-card/30 flex gap-2 overflow-x-auto custom-scrollbar">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(qp.text);
              }}
              className="px-3 py-1.5 rounded-full border border-dark-border bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-white whitespace-nowrap transition-all"
            >
              {qp.title.split(' ')[0]} {qp.title.split(' ').slice(1).join(' ')}
            </button>
          ))}
        </div>

        {/* Input area */}
        <form onSubmit={handleSend} className="p-4 border-t border-dark-border flex gap-2 bg-dark-card/50">
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Type message to AI..."
            className="flex-1 premium-input py-2 text-xs"
            required
          />
          <button
            type="submit"
            className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl transition-all"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default MainLayout;
