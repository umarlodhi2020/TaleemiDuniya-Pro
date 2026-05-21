import React, { useState } from 'react';
import { Bot, Send, Sparkles, Copy, Check, Save, RefreshCw } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { addRecord } from '../../services/db';
import { generateAIReply } from '../../services/ai';
import { useAuth } from '../../context/AuthContext';

const SuperAdminAiAgent = () => {
  const { userData } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello Super Admin! I am your TaleemiDunya SaaS AI Agent. I can help you draft platform updates, create marketing emails, manage subscriptions notices, or outline global configurations. Try a quick command or type your request!"
    }
  ]);
  const [executing, setExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const quickPrompts = [
    {
      title: '📢 Platform Update Notice',
      text: 'Draft a system-wide notice for a new feature release (Parent Portal & Transport Module).',
      category: 'notice',
      draft: {
        title: 'New Features Release: Parent Portal & Transport',
        content: 'Dear School Administrators,\n\nWe are excited to announce a major update to the TaleemiDunya Platform. You now have access to the comprehensive Parent Portal and Transport Management Module. Parents can track attendance, fees, and results directly. The new Transport Manager lets you configure buses and routes seamlessly.\n\nPlease check your dashboards for these new modules.\n\nRegards,\nTaleemiDunya SaaS Team',
        type: 'System Notice'
      }
    },
    {
      title: '💳 Subscription Reminder',
      text: 'Create a professional email for schools whose subscription is expiring in 7 days.',
      category: 'billing',
      draft: {
        title: 'Subscription Renewal Reminder',
        content: 'Dear Admin,\n\nThis is a friendly reminder that your TaleemiDunya-Pro subscription is scheduled to expire in 7 days. To ensure uninterrupted access to your school management tools, please renew your subscription from the Billing section.\n\nThank you for choosing us as your technology partner.\n\nBest Regards,\nTaleemiDunya Billing',
        type: 'Email Template'
      }
    },
    {
      title: '✉️ Marketing Email',
      text: 'Draft a promotional email to onboard new schools highlighting AI and offline capabilities.',
      category: 'marketing',
      draft: {
        title: 'Transform Your School with AI-Powered TaleemiDunya-Pro',
        content: 'Hello Educator,\n\nStruggling with administrative overload? TaleemiDunya-Pro is here to help! Our comprehensive school management system features built-in AI Assistants, offline data syncing, and dedicated portals for Teachers, Parents, and Students.\n\nBook a demo today to see how we can digitize your entire campus effortlessly.\n\nBest,\nThe TaleemiDunya Team',
        type: 'Marketing Email'
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

    try {
      const systemPrompt = 'You are a SaaS Super Admin assistant for a school management platform. Output concise, professional artifacts like system notices, marketing emails, or subscription alerts. Include a short Title and Body.';
      const aiText = await generateAIReply(prompt, { systemPrompt });

      let detectedDraft = null;
      const titleMatch = aiText.match(/title[:\-\s]*([\s\S]{1,100})/i);
      const bodyMatch = aiText.match(/body[:\-\s]*([\s\S]+)/i);
      
      if (titleMatch && bodyMatch) {
        detectedDraft = { title: titleMatch[1].trim(), content: bodyMatch[1].trim(), type: 'AI Generated' };
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiText, draft: detectedDraft }]);
    } catch (err) {
      console.warn('AI fallback:', err?.message);
      let draftObj = quickPrompts[0].draft;
      if (prompt.toLowerCase().includes('sub') || prompt.toLowerCase().includes('bill')) draftObj = quickPrompts[1].draft;
      if (prompt.toLowerCase().includes('market') || prompt.toLowerCase().includes('promo')) draftObj = quickPrompts[2].draft;

      const aiResponseContent = `Sure! I generated this SaaS artifact:\n\n**Title:** ${draftObj.title}\n\n**Body:**\n${draftObj.content}`;
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponseContent, draft: draftObj }]);
    } finally {
      setExecuting(false);
      setPrompt('');
    }
  };

  const handleSelectQuick = (qp) => {
    setMessages(prev => [...prev, { role: 'user', content: qp.text }]);
    setExecuting(true);
    setSaveStatus('');

    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Draft generated based on your command:\n\n**Title:** ${qp.draft.title}\n\n${qp.draft.content}`, 
        draft: qp.draft 
      }]);
      setExecuting(false);
    }, 1000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveToFirestore = async (draft) => {
    if (!draft) return;
    setExecuting(true);
    setSaveStatus('Publishing globally...');
    try {
      const recordData = {
        title: draft.title,
        message: draft.content,
        type: draft.type,
        date: new Date().toLocaleDateString(),
        createdAt: new Date(),
        author: 'SaaS AI Agent'
      };
      
      // Global notifications collection for super admins
      const res = await addRecord('global_notifications', recordData, 'GLOBAL');
      if (res.success) {
        setSaveStatus(`Success! Published to global platform notifications.`);
      } else {
        setSaveStatus('Failed to write: ' + res.error.message);
      }
    } catch (e) {
      setSaveStatus('Error saving: ' + e.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-premium-gradient bg-clip-text text-transparent flex items-center gap-3">
            <Bot className="text-primary-500 animate-pulse" size={36} /> SaaS AI Agent
          </h1>
          <p className="text-dark-muted mt-1">Super Admin assistant for global platform management and automation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 flex flex-col h-[70vh]">
          <GlassCard className="p-6 flex-1 flex flex-col justify-between overflow-hidden relative border-primary-500/20 bg-dark-card/60 backdrop-blur-xl">
            <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-primary-500/30 uppercase tracking-widest pointer-events-none select-none">
              SAAS-CORE-AI // GLOBAL ACCESS
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-4">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-9 h-9 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-500 flex-shrink-0">
                      <Bot size={18} className="animate-pulse" />
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl max-w-[80%] border ${
                    m.role === 'user' 
                      ? 'bg-primary-500/10 border-primary-500/20 text-white rounded-tr-none' 
                      : 'bg-white/5 border-dark-border text-dark-text rounded-tl-none'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    
                    {m.draft && (
                      <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-3">
                        <button 
                          onClick={() => copyToClipboard(m.draft.content)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all text-white"
                        >
                          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                          {copied ? 'Copied!' : 'Copy Draft'}
                        </button>
                        <button 
                          onClick={() => saveToFirestore(m.draft)}
                          disabled={executing}
                          className="px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-xs font-bold flex items-center gap-1.5 transition-all text-white disabled:opacity-50"
                        >
                          <Save size={12} />
                          Publish Globally
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {executing && (
                <div className="flex gap-4 items-center">
                  <div className="w-9 h-9 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-500 flex-shrink-0">
                    <RefreshCw className="animate-spin" size={18} />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-white/5 border border-dark-border text-dark-muted text-xs font-mono uppercase tracking-wider animate-pulse">
                    Processing SaaS command...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="relative flex gap-3 border-t border-dark-border pt-4">
              <input 
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Ask AI to draft system updates, marketing emails..."
                className="flex-1 premium-input pr-12"
                required
              />
              <button 
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-primary-500/20 text-primary-500 rounded-lg transition-all"
              >
                <Send size={18} />
              </button>
            </form>
          </GlassCard>

          {saveStatus && (
            <GlassCard className="p-4 bg-green-500/5 border-green-500/20 flex items-center gap-3">
              <Sparkles className="text-green-400 animate-bounce" size={20} />
              <div className="text-xs font-mono text-green-400">{saveStatus}</div>
            </GlassCard>
          )}
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6 bg-gradient-to-br from-primary-500/10 to-indigo-500/10 border-primary-500/20 relative overflow-hidden group">
            <h3 className="font-bold mb-2 flex items-center gap-2 text-primary-400">
              <Sparkles size={18} /> Global SaaS AI Core
            </h3>
            <p className="text-xs text-dark-muted leading-relaxed mb-4">
              Control the entire platform through AI. Generate announcements and templates instantly across all tenant schools.
            </p>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-[9px] uppercase font-bold text-red-400 font-mono">SUPER ADMIN PRIVILEGES</span>
            </div>
          </GlassCard>

          <GlassCard className="p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-dark-muted">Global Actions</h3>
            <div className="space-y-3">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectQuick(qp)}
                  className="w-full text-left p-4 bg-white/5 border border-dark-border hover:border-primary-500/30 rounded-2xl flex flex-col gap-1 hover:bg-white/10 transition-all group"
                >
                  <span className="text-xs font-bold text-white group-hover:text-primary-500 transition-colors">{qp.title}</span>
                  <span className="text-[10px] text-dark-muted leading-relaxed">{qp.text}</span>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAiAgent;
