import React, { useState } from 'react';
import { Bot, Send, Sparkles, AlertCircle, Copy, Check, Save, Play, RefreshCw, Layers } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { addRecord } from '../../services/db';
import { generateAIReply } from '../../services/ai';
import { useAuth } from '../../context/AuthContext';

const AiAgent = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am your TaleemiDunya AI Admin Agent. I can help you automate school operations, draft notices, compose SMS templates, outline timetables, and publish items directly to your Firestore database. Try selecting a quick command below or type your request!"
    }
  ]);
  const [executing, setExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const quickPrompts = [
    {
      title: '📢 Draft Vacation Notice',
      text: 'Draft a professional school notice for Summer Vacation from June 1st to July 31st.',
      category: 'notice',
      draft: {
        title: 'Summer Vacation Official Notice',
        content: 'Dear Parents, Students, and Staff,\n\nWe wish to inform you that TaleemiDunya Academy will remain closed for Summer Vacation starting from June 1, 2026, till July 31, 2026. The school administrative block will operate with limited timings (9:00 AM to 1:00 PM). Online homework sets have been uploaded to the Student Portal.\n\nEnjoy a safe and productive summer break!\n\nRegards,\nSchool Administration',
        type: 'Notices'
      }
    },
    {
      title: '📝 Fee Absent SMS Template',
      text: 'Create a direct, urgent fee reminder SMS template for parents with pending dues.',
      category: 'sms',
      draft: {
        title: 'Urgent Dues Alert',
        content: 'Dear Parent,\n\nThis is a friendly reminder that the tuition fee for the current month remains unpaid. Please clear all outstanding dues before the due date (May 25, 2026) to avoid late fee charges. Thank you for your cooperation.\n\nRegards,\nTaleemiDunya Academy',
        type: 'SMS Template'
      }
    },
    {
      title: '⏰ Exam Timings Schedule',
      text: 'Outline standard bell schedule timings for Mid-term exam periods.',
      category: 'timetable',
      draft: {
        title: 'Mid-Term Exam Period Timings',
        content: 'Exam Bell timings scheduled as follows:\n\n- Period 1 (Reading & Prep): 08:30 AM — 09:00 AM\n- Period 2 (Theory Exam Paper): 09:00 AM — 11:30 AM\n- Break (Interval Recess): 11:30 AM — 12:00 PM\n- Period 3 (Practical Viva): 12:00 PM — 02:00 PM\n\nAll teachers must report in assigned test halls 15 minutes prior to start.',
        type: 'Schedules'
      }
    },
    {
      title: '✉️ Admission Follow-up',
      text: 'Draft a premium follow-up email response for parent registration inquiries.',
      category: 'email',
      draft: {
        title: 'TaleemiDunya Academy Admission Enquiry Follow-up',
        content: 'Dear Guardian,\n\nThank you for reaching out regarding admissions at TaleemiDunya Academy. We are pleased to inform you that registrations are open for the academic term. We provide modern learning systems, glassmorphic student portals, and experienced faculty.\n\nPlease visit the campus front office or contact our admission coordinator at +92 300 1234567 for your diagnostic test booking.\n\nBest Regards,\nAdmissions Team',
        type: 'Email Template'
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

    // Try calling real AI service; fall back to simulated quick drafts if API key is not present or call fails.
    try {
      const systemPrompt = 'You are a helpful assistant that outputs concise school admin artifacts such as Notices, SMS templates, Schedules, or Email Templates. When appropriate include a short Title and Body.';
      const aiText = await generateAIReply(prompt, { systemPrompt });

      // Attempt to detect a simple title/body structure from the AI output.
      let detectedDraft = null;
      const titleMatch = aiText.match(/title[:\-\s]*([\s\S]{1,200})/i);
      const bodyMatch = aiText.match(/body[:\-\s]*([\s\S]+)/i);
      if (titleMatch && bodyMatch) {
        detectedDraft = { title: titleMatch[1].trim(), content: bodyMatch[1].trim(), type: 'AI Generated' };
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiText, draft: detectedDraft, aiRaw: aiText }]);
    } catch (err) {
      // Fallback to previous simulated behavior when API key missing or request errors.
      console.warn('AI service unavailable, falling back to simulated drafts:', err?.message);
      let aiResponseContent = "";
      let draftObj = null;

      if (prompt.toLowerCase().includes('notice') || prompt.toLowerCase().includes('vacation')) {
        draftObj = quickPrompts[0].draft;
      } else if (prompt.toLowerCase().includes('fee') || prompt.toLowerCase().includes('sms')) {
        draftObj = quickPrompts[1].draft;
      } else if (prompt.toLowerCase().includes('bell') || prompt.toLowerCase().includes('exam') || prompt.toLowerCase().includes('timing')) {
        draftObj = quickPrompts[2].draft;
      } else {
        draftObj = quickPrompts[3].draft;
      }

      aiResponseContent = `Sure! I have generated the following professional ${draftObj.type} for you:\n\n**Title:** ${draftObj.title}\n\n**Body:**\n${draftObj.content}\n\nWould you like me to commit this directly to your Firestore database as an official school asset? Click the "Publish to Database" button below.`;

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

    (async () => {
      try {
        // Try AI for a richer response; if unavailable fall back to provided draft
        const systemPrompt = 'You are a helpful assistant that outputs concise school admin artifacts such as Notices, SMS templates, Schedules, or Email Templates.';
        const aiText = await generateAIReply(qp.text, { systemPrompt });
        // Provide AI response but attach the qp.draft as a suggested record for quick save
        setMessages(prev => [...prev, { role: 'assistant', content: aiText, draft: qp.draft, aiRaw: aiText }]);
      } catch (err) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Generated draft:\n\n${qp.draft.content}`, draft: qp.draft }]);
      } finally {
        setExecuting(false);
      }
    })();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveToFirestore = async (draft) => {
    if (!draft) return;
    setExecuting(true);
    setSaveStatus('Saving to Firestore...');
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
        setSaveStatus(`Success! Committed to collection '${collectionName}' in Firestore.`);
      } else {
        setSaveStatus('Failed to write to database: ' + res.error.message);
      }
    } catch (e) {
      console.error(e);
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
            <Bot className="text-primary-500 animate-pulse" size={36} /> AI Assistant Agent
          </h1>
          <p className="text-dark-muted mt-1">Automate notices, SMS, and schedulers with intelligent AI workflows linked to Firestore.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 flex flex-col h-[70vh]">
          {/* Chat Terminal */}
          <GlassCard className="p-6 flex-1 flex flex-col justify-between overflow-hidden relative border-primary-500/20 bg-dark-card/60 backdrop-blur-xl">
            
            {/* Absolute decorative cyber elements */}
            <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-primary-500/30 uppercase tracking-widest pointer-events-none select-none">
              TDM-AG-SYS // REALTIME SYNC ACTIVE
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
                    
                    {/* Render Interactive Actions if Draft exists */}
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
                          Publish to Firestore
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
                    AI Agent is processing command...
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Form */}
            <form onSubmit={handleSend} className="relative flex gap-3 border-t border-dark-border pt-4">
              <input 
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Ask AI Agent to draft, build, or write notices..."
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

          {/* Database Write Logger */}
          {saveStatus && (
            <GlassCard className="p-4 bg-green-500/5 border-green-500/20 flex items-center gap-3">
              <Sparkles className="text-green-400 animate-bounce" size={20} />
              <div className="text-xs font-mono text-green-400">{saveStatus}</div>
            </GlassCard>
          )}
        </div>

        {/* Quick Action Side Panel */}
        <div className="space-y-6">
          <GlassCard className="p-6 bg-gradient-to-br from-primary-500/10 to-purple-500/10 border-primary-500/20 relative overflow-hidden group">
            <h3 className="font-bold mb-2 flex items-center gap-2 text-primary-400">
              <Sparkles size={18} /> AI Core Engine
            </h3>
            <p className="text-xs text-dark-muted leading-relaxed mb-4">
              Our TaleemiDunya AI Core parses natural language commands to compile structural assets, isolated under your unique <b>schoolId</b>.
            </p>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 rounded bg-white/10 text-[9px] uppercase font-bold text-white font-mono">TENANT ACTIVE</span>
              <span className="px-2 py-0.5 rounded bg-primary-500/20 text-[9px] uppercase font-bold text-primary-400 font-mono">ID: {schoolId.slice(0, 8)}</span>
            </div>
          </GlassCard>

          <GlassCard className="p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-dark-muted">Quick Actions</h3>
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

export default AiAgent;
