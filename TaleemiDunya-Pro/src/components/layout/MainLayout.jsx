import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ErrorBoundary from '../common/ErrorBoundary';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { Bot, Send, Sparkles, X, Copy, Check, Save, RefreshCw, AlertTriangle, Crown, Zap, Clock, CreditCard, Lock, ArrowRight } from 'lucide-react';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { addRecord } from '../../services/db';

const MainLayout = () => {
  const { userData } = useAuth();
  const { 
    isFeatureAllowed, 
    getFeatureInfo, 
    currentSaaSPlan, 
    schoolData,
    isOverdue,
    isExpiring,
    daysLeft,
    daysOverdue,
    isOverdueMoreThan7Days,
    suspensionGraceDays,
    suspensionPolicy
  } = useSchool();
  const location = useLocation();
  const navigate = useNavigate();
  const schoolId = userData?.schoolId || 'default-school';

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  // SaaS Expiry Warning & Feature Lock Popups State
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState('AI WhatsApp Assistant & IoT Security');
  const [unclosableSeconds, setUnclosableSeconds] = useState(0);

  useEffect(() => {
    // Check if School Admin rent is expiring or overdue
    if (userData?.role === 'school-admin') {
      const isPaymentRoute = location.pathname.includes('/billing') || location.pathname.includes('/subscription');

      if (isOverdue) {
        // Expiry date passed: On EVERY feature click/navigation, trigger popup with 10s unclosable timer
        if (!isPaymentRoute) {
          setShowExpiryWarning(true);
          setUnclosableSeconds(10);
        }
      } else if (isExpiring) {
        // Expiring soon (1-5 days left): Trigger popup with 10s timer
        const isExpiringShownThisSession = sessionStorage.getItem('saas_expiring_popup_session_shown');
        if (!isPaymentRoute && !isExpiringShownThisSession) {
          setTimeout(() => {
            setShowExpiryWarning(true);
            setUnclosableSeconds(10);
            sessionStorage.setItem('saas_expiring_popup_session_shown', 'true');
          }, 1200);
        }
      }
    }

    // Attach global window trigger so any component can pop up the upgrade / expiry modal
    window.triggerSaaSExpiryPopup = () => {
      setShowExpiryWarning(true);
      setUnclosableSeconds(10);
    };
    window.triggerSaaSFeatureLock = (featName = 'Premium Pro Feature') => {
      setLockedFeatureName(featName);
      setShowUpgradeModal(true);
    };
  }, [userData, schoolData, location.pathname, isOverdue, isExpiring]);

  useEffect(() => {
    let timer;
    if (showExpiryWarning && unclosableSeconds > 0) {
      timer = setInterval(() => {
        setUnclosableSeconds(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showExpiryWarning, unclosableSeconds]);

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
    <div className="min-h-screen bg-dark-bg print:bg-white flex print:block relative">
      <Sidebar role={userData?.role} isOpen={isMobileSidebarOpen} setIsOpen={setIsMobileSidebarOpen} />
      
      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden print:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col print:block min-w-0 md:pl-56 print:pl-0 w-full max-w-full relative">
        <Navbar toggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />

        <main className="py-6 px-4 sm:px-6 lg:px-8 print:p-0 flex-1 print:block transition-all duration-300 max-w-full overflow-x-hidden print:overflow-visible">
          <div className={`${location.pathname.includes('qr-scanner') ? 'max-w-[1500px]' : 'max-w-6xl'} mx-auto print:max-w-full print:mx-0 print:block`}>
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
            <ErrorBoundary>
              {(() => {
                const isCurrentAllowed = isFeatureAllowed(location.pathname);
                const featInfo = getFeatureInfo(location.pathname);
                if (userData?.role === 'school-admin' && !isCurrentAllowed) {
                  if (isOverdueMoreThan7Days) {
                    return (
                      <div className="py-12 px-6 bg-gradient-to-br from-[#2a1116] to-[#160a0d] rounded-3xl border-2 border-red-500/80 shadow-2xl text-center max-w-2xl mx-auto space-y-6 animate-fade-in my-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                          <AlertTriangle size={160} className="text-red-500" />
                        </div>
                        <div className="w-20 h-20 rounded-3xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400 shadow-lg shadow-red-500/20">
                          <Lock size={38} className="animate-bounce" />
                        </div>
                        <div>
                          <span className="px-3.5 py-1 rounded-full bg-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-widest border border-red-500/30">
                            🚨 {suspensionGraceDays === 0 ? 'Immediate Expiry Lock' : `${suspensionGraceDays} Day${suspensionGraceDays > 1 ? 's' : ''} Cutoff / Grace Period Reached`}
                          </span>
                          <h2 className="text-2xl md:text-3xl font-black text-white mt-3">
                            Feature Suspended (سروس معطل ہے)
                          </h2>
                          <p className="text-sm text-red-200 font-bold mt-1">
                            {featInfo?.title || 'Operational Module'} — Access Disabled
                          </p>
                        </div>

                        {/* Bilingual Alert Details */}
                        <div className="p-4 rounded-2xl bg-black/40 border border-red-500/30 text-left space-y-3 text-xs text-gray-200 max-w-lg mx-auto">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-red-400 block mb-0.5">📢 Roman Urdu:</span>
                            <p className="leading-relaxed">
                              {suspensionPolicy?.messageRoman ? (
                                suspensionPolicy.messageRoman.replace('{days}', daysOverdue).replace('{graceDays}', suspensionGraceDays)
                              ) : (
                                <>Aap ke school ki subscription date ko guzray <strong>{daysOverdue} din</strong> ho chukay hain ({suspensionGraceDays} din ki grace / reminder period khatam ho chuki hai). Fees ada na honay ki wajah se yeh feature temporary tor par muattal (disabled) kar diya gaya hai. Foran online payment kar ke account reactivate karein.</>
                              )}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-white/10 text-right" dir="rtl">
                            <span className="text-[10px] font-black uppercase tracking-wider text-red-400 block mb-0.5 text-right">🇵🇰 اردو پیغام:</span>
                            <p className="leading-relaxed">
                              {suspensionPolicy?.messageUrdu ? (
                                suspensionPolicy.messageUrdu.replace('{days}', daysOverdue).replace('{graceDays}', suspensionGraceDays)
                              ) : (
                                <>آپ کے اسکول کی سافٹ ویئر فیس کی مقررہ تاریخ کو گزرے ہوئے {daysOverdue} دن ہو چکے ہیں۔ فیس ادا نہ ہونے کی وجہ سے یہ سروس عارضی طور پر بند کر دی گئی ہے۔ تمام فیچرز فوری بحال کرنے کے لیے ابھی آن لائن ادائیگی کریں۔</>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                          <button
                            onClick={() => navigate('/school-admin/billing')}
                            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                          >
                            <CreditCard size={16} /> Pay Online Now / ابھی فیس ادا کریں (Reactivate)
                          </button>
                          <button
                            onClick={() => navigate('/school-admin/dashboard')}
                            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-all"
                          >
                            Return to Dashboard
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="py-12 px-6 bg-gradient-to-br from-[#1b1e32] to-[#121422] rounded-3xl border-2 border-purple-500/50 shadow-2xl text-center max-w-2xl mx-auto space-y-6 animate-fade-in my-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Lock size={160} className="text-purple-400" />
                      </div>
                      <div className="w-20 h-20 rounded-3xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-400 shadow-lg shadow-purple-500/20">
                        <Lock size={38} className="animate-bounce" />
                      </div>
                      <div>
                        <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-widest border border-purple-500/30">
                          SaaS Plan Permission Gate
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black text-white mt-3">
                          {featInfo?.title || 'Restricted Advanced Feature'}
                        </h2>
                        <p className="text-sm text-gray-300 mt-2 max-w-lg mx-auto font-medium leading-relaxed">
                          {featInfo?.description || 'This advanced module is not included in your current subscription tier.'}
                        </p>
                        <p className="text-xs text-purple-300 font-bold mt-2">
                          Your Current Plan: <span className="uppercase tracking-wider underline">{currentSaaSPlan || 'Basic Starter'}</span>
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-dark-card/80 border border-dark-border text-left text-xs text-gray-300 space-y-2 max-w-md mx-auto">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block">Why Upgrade?</span>
                        <div className="flex items-center gap-2"><Check size={14} className="text-green-400 shrink-0" /> <span>Unlock all 45+ specialized school management modules</span></div>
                        <div className="flex items-center gap-2"><Check size={14} className="text-green-400 shrink-0" /> <span>Real-time WhatsApp bots, IoT gate pass & online fee gateways</span></div>
                        <div className="flex items-center gap-2"><Check size={14} className="text-green-400 shrink-0" /> <span>Instant activation with online payment or bank transfer</span></div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => navigate('/school-admin/billing')}
                          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                        >
                          <Zap size={16} /> Upgrade Plan / Online Pay Now
                        </button>
                        <button
                          onClick={() => navigate('/school-admin/dashboard')}
                          className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-all"
                        >
                          Return to Dashboard
                        </button>
                      </div>
                    </div>
                  );
                }
                return <Outlet />;
              })()}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Floating WhatsApp-Style AI Button */}
      <button
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110 active:scale-[0.99] cursor-pointer bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 border border-white/20 shadow-cyan-500/20"
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

      {/* ============================================================== */}
      {/* 🚨 POPUP 1: SAAS RENT / SUBSCRIPTION EXPIRY WARNING MODAL */}
      {/* ============================================================== */}
      {showExpiryWarning && (() => {
        const isCriticalOverdue = isOverdueMoreThan7Days;
        const titleEn = isOverdue ? 'SUBSCRIPTION OVERDUE!' : 'SUBSCRIPTION EXPIRING SOON!';
        const titleUr = isOverdue ? 'سافٹ ویئر فیس کی میعاد ختم ہو چکی ہے' : 'پلان کی میعاد جلد ختم ہونے والی ہے';
        
        const romanMsg = isOverdue
          ? isCriticalOverdue
            ? `Aap ki subscription date ko guzray ${daysOverdue} din ho chukay hain (7 din ki grace period khatam). Important features disable ho chukay hain. Foran payment karein taake TaleemiDunya chalta rahay.`
            : `Aap ke school plan ki date expire ho chuki hai (${daysOverdue || 1} din guzar chukay hain). Bara-e-meharbani apni subscription renew karein taake TaleemiDunya ki sahuliyat bina rukawat chalti rahein.`
          : `Aap ke school plan ki date jald expire hone wali hai (${daysLeft} din baqi hain). Bara-e-meharbani waqt par payment karein taake koi feature band na ho.`;

        const urduMsg = isOverdue
          ? isCriticalOverdue
            ? `آپ کے اسکول کی سافٹ ویئر فیس کی تاریخ کو گزرے 7 دن سے زیادہ ہو چکے ہیں۔ اہم سروسز معطل ہو رہی ہیں۔ فوری فیس ادا کر کے اکاؤنٹ بحال کروائیں۔`
            : `آپ کے اسکول کے سافٹ ویئر پلان کی تاریخ ختم ہو چکی ہے۔ برائے مہربانی فوری آن لائن فیس ادا کریں تاکہ سسٹم بلا تعطل کام کرتا رہے۔`
          : `آپ کے اسکول کے پلان کی میعاد جلد ختم ہونے والی ہے۔ بغیر تعطل سسٹم استعمال کرنے کے لیے وقت پر رینیو کروائیں۔`;

        return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
            
            {/* Top-Right Close Button & Adjacent Countdown Timer */}
            <div className="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center gap-2 z-20">
              {unclosableSeconds > 0 ? (
                <>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-mono font-bold shadow-xs">
                    <Clock size={13} className="text-amber-600 animate-spin" />
                    <span>{unclosableSeconds}s</span>
                  </div>
                  <button 
                    disabled 
                    className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center cursor-not-allowed opacity-60"
                    title={`انتظار فرمائیں ${unclosableSeconds} سیکنڈ`}
                    aria-label="Wait to close"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setShowExpiryWarning(false)}
                  className="w-8 h-8 rounded-full bg-black hover:bg-slate-800 text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
                  title="بند کریں / Close"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            {/* Top Alert Icon */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-sm border ${isOverdue ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
              <AlertTriangle size={30} className="animate-bounce" />
            </div>
            
            {/* Bilingual Black Titles */}
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{titleEn}</h2>
            <p className="text-slate-700 font-bold text-sm mt-0.5">{titleUr}</p>

            {/* Status Pill */}
            <div className="my-3 flex justify-center">
              {isCriticalOverdue ? (
                <span className="px-3 py-1 rounded-full bg-red-100 text-red-900 border border-red-300 text-[11px] font-black uppercase tracking-wider">
                  🚨 7+ Days Overdue (سروس معطل)
                </span>
              ) : isOverdue ? (
                <span className="px-3 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 text-[11px] font-black uppercase tracking-wider">
                  ⚠️ Overdue: {daysOverdue || 1} Days ({daysOverdue || 1} دن تاخیر)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-black uppercase tracking-wider">
                  ⏳ {daysLeft} Days Remaining ({daysLeft} دن باقی)
                </span>
              )}
            </div>

            {/* Bilingual Messages in Clean Light Cards with Black Text */}
            <div className="space-y-2.5 my-4 text-left">
              {/* Roman Urdu Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                <span className="font-black text-slate-900 block mb-1 text-[11px] uppercase tracking-wider">📢 Roman Urdu Message:</span>
                <p>{romanMsg}</p>
              </div>

              {/* Urdu Script Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium text-right" dir="rtl">
                <span className="font-black text-slate-900 block mb-1 text-[11px] text-right">🇵🇰 اردو پیغام:</span>
                <p>{urduMsg}</p>
              </div>
            </div>
            
            {/* Buttons: Black Color Buttons with White Text */}
            <div className="space-y-2.5 pt-2">
              {/* BUTTON 1: Black Pay Online Button with White Text */}
              <button 
                onClick={() => {
                  setShowExpiryWarning(false);
                  navigate('/school-admin/billing');
                }}
                className="w-full py-3.5 rounded-2xl bg-black hover:bg-slate-900 text-white font-black text-xs sm:text-sm uppercase shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <CreditCard size={17} className="text-white" />
                <span>Pay Online Now / ابھی فیس ادا کریں</span>
              </button>

              {/* BUTTON 2: Close Button with 10s Countdown */}
              {unclosableSeconds > 0 ? (
                <button 
                  disabled 
                  className="w-full py-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Clock size={15} className="animate-spin text-slate-600" />
                  <span>Wait {unclosableSeconds}s to Close (انتظار فرمائیں {unclosableSeconds} سیکنڈ)</span>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setShowExpiryWarning(false);
                  }}
                  className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <X size={15} className="text-white" />
                  <span>Close / Samjh Gaya (بند کریں)</span>
                </button>
              )}
            </div>

          </div>
        </div>
        );
      })()}

      {/* ============================================================== */}
      {/* 💎 POPUP 2: LOCKED FEATURE SAAS PLAN UPGRADE MODAL */}
      {/* ============================================================== */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-gradient-to-b from-[#1e1535] to-[#120f20] border-2 border-purple-500/70 rounded-3xl p-7 max-w-md w-full shadow-2xl text-center space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <Crown size={140} className="text-purple-400" />
            </div>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center mx-auto text-white shadow-lg shadow-purple-600/30 animate-pulse">
              <Crown size={36} />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-widest border border-purple-500/30">
                SaaS Feature Gate
              </span>
              <h3 className="text-2xl font-black text-white mt-2">Upgrade to Pro Plan</h3>
              <p className="text-xs text-gray-300 mt-2 font-medium leading-relaxed">
                The feature <strong className="text-purple-400 font-bold">"{lockedFeatureName}"</strong> is restricted on your current <span className="underline decoration-purple-400">Basic Starter Plan</span>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#151926] border border-purple-500/30 text-left text-xs space-y-2 text-gray-300">
              <span className="font-black text-purple-300 uppercase tracking-wider block text-[10px]">What You Unlock in Premium Pro:</span>
              <div className="flex items-center gap-2"><Check size={14} className="text-green-400" /> <span>Automated WhatsApp AI Assistant & IoT Gate Pass</span></div>
              <div className="flex items-center gap-2"><Check size={14} className="text-green-400" /> <span>Online Quiz Engine & Student/Parent Mobile Portal</span></div>
              <div className="flex items-center gap-2"><Check size={14} className="text-green-400" /> <span>Up to 1,000 Active Students + Priority Support</span></div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  window.location.hash = '#/school-admin/subscription';
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
              >
                <Sparkles size={17} /> Upgrade Plan Online (Rs. 8,000/mo)
              </button>

              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold transition-all"
              >
                Keep Current Basic Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
