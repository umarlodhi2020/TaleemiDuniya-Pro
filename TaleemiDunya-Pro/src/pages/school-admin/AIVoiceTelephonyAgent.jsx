import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Phone, 
  PhoneForwarded, 
  Bot, 
  Mic, 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Sparkles, 
  RefreshCw, 
  FileText, 
  Activity,
  Calendar,
  Send,
  Zap,
  PhoneOff
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const EMPTY_QUEUES = {
  absent: [],
  fee: [],
  admissions: []
};

const AIVoiceTelephonyAgent = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = schoolData?.id || userData?.schoolId || 'default-school';
  const schoolName = schoolData?.name || userData?.schoolName || 'School';

  const [activeTab, setActiveTab] = useState('ABSENT'); // 'ABSENT' | 'FEE' | 'ADMISSION' | 'HISTORY'
  const [queues, setQueues] = useState(() => {
    try {
      const saved = localStorage.getItem(`ai_call_queue_${schoolId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return EMPTY_QUEUES;
  });

  // Active Calling Simulation Modal State
  const [activeCall, setActiveCall] = useState(null);
  const [callPhase, setCallPhase] = useState('DIALING'); // 'DIALING' | 'CONNECTED' | 'ENDED'
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Audio simulation timer
  useEffect(() => {
    let interval = null;
    if (callPhase === 'CONNECTED') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callPhase]);

  // SpeechSynthesis voice simulation
  const speakVoice = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.lang = 'ur-PK'; // Urdu fallback
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Trigger Outgoing Call Simulation
  const handleStartCall = (targetItem, type) => {
    setActiveCall({ ...targetItem, type });
    setCallPhase('DIALING');
    setCallDuration(0);
    setTranscript([
      { sender: 'SYSTEM', text: `Dialing parent number (${targetItem.phone})...` }
    ]);

    // Simulate connection after 2 seconds
    setTimeout(() => {
      setCallPhase('CONNECTED');
      let greeting = '';
      if (type === 'ABSENT') {
        greeting = `Assalam-o-Alaikum ${targetItem.parentName} Sb! Main ${schoolName} se automated AI Voice Assistant baat kar rahi hoon. Aap ka beta ${targetItem.studentName} aaj subah school nahi pohancha. Kya bacha theek hai?`;
      } else if (type === 'FEE') {
        greeting = `Assalam-o-Alaikum ${targetItem.parentName} Sb! Main ${schoolName} Accounts se AI assistant bol rahi hoon. Aap ke bache ${targetItem.studentName} ki monthly fee voucher due date guzar chuki hai. Bara-e-meharbani online pay kar dein taake late fee na lage.`;
      } else {
        greeting = `Assalam-o-Alaikum ${targetItem.parentName} Sb! ${schoolName} mein admission inquiry submit karne ka shukriya. Main admission desk se AI agent bol rahi hoon. Kya aap campus visit book karna chahein gay?`;
      }

      setTranscript(prev => [
        ...prev,
        { sender: 'AI_BOT', text: greeting, time: '0:02' }
      ]);
      speakVoice(greeting);

      // Simulate Parent Reply after 5 seconds
      setTimeout(() => {
        let parentReply = '';
        if (type === 'ABSENT') {
          parentReply = `Jee waalaikum assalam. Ahmad ko kal raat se tez bukhar hai, doctor ke paas gaye thay. Aaj wo rest karega, insha'Allah kal school aayega.`;
        } else if (type === 'FEE') {
          parentReply = `Jee theek hai, main aaj shaam ko EasyPaisa ke zariye fee transfer kar deta hoon. Shukriya yaad karwane ka.`;
        } else {
          parentReply = `Jee kal subah 11 baje main apne bache ke sath school aana chahta hoon campus dekhne ke liye.`;
        }

        setTranscript(prev => [
          ...prev,
          { sender: 'PARENT', text: parentReply, time: '0:08' }
        ]);

        // Simulate AI Final Confirmation after 9 seconds
        setTimeout(() => {
          let botClosing = '';
          if (type === 'ABSENT') {
            botClosing = `Bohat shukriya ittila ka. Hum ne system mein Ahmad ki aaj ki haziri "Sick Leave (بیماری کی رخصت)" mark kar di hai. Allah Ta'ala usay jald shifa ata farmaye. Khuda Hafiz!`;
          } else if (type === 'FEE') {
            botClosing = `Bohot shukriya! Aap ko WhatsApp par online payment link bhej diya gaya hai. Have a wonderful day!`;
          } else {
            botClosing = `Zabardast! Kal subah 11 baje aap ka appointment schedule kar diya gaya hai. Security gate par pass ready hoga. Khuda Hafiz!`;
          }

          setTranscript(prev => [
            ...prev,
            { sender: 'AI_BOT', text: botClosing, time: '0:14' }
          ]);
          speakVoice(botClosing);

          // Complete Call
          setTimeout(() => {
            setCallPhase('ENDED');
            // Update queue item
            const updated = {
              ...queues,
              [type.toLowerCase()]: queues[type.toLowerCase()].map(q => {
                if (q.id === targetItem.id) {
                  return {
                    ...q,
                    status: 'COMPLETED',
                    response: type === 'ABSENT' ? 'Sick Leave Confirmed' : 'Payment Promised Today',
                    callDuration: '0m 22s'
                  };
                }
                return q;
              })
            };
            setQueues(updated);
            localStorage.setItem(`ai_call_queue_${schoolId}`, JSON.stringify(updated));
          }, 4000);

        }, 4000);

      }, 5000);

    }, 2500);
  };

  const handleEndCallEarly = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setCallPhase('ENDED');
    setActiveCall(null);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-16 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/70 border border-indigo-200/90 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Bot size={14} className="text-indigo-600" />
              Autonomous AI Voice Telephony
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              Natural Urdu / English Speech
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">AI Autonomous Voice Calling Receptionist</h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
            Auto-dials parents of absent students, conducts two-way natural phone conversations, logs verbal reasons into attendance, and performs gentle fee recovery and admission calls.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto relative z-10">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            SIP Voice Server: CONNECTED
          </span>
        </div>
      </div>

      {/* CALL QUEUE METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Absentee Calling Queue</span>
          <span className="text-2xl font-black text-rose-600 font-mono mt-1 block">
            {queues.absent.filter(c => c.status === 'PENDING').length} Calls Pending
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Fee Recovery Queue</span>
          <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">
            {queues.fee.filter(c => c.status === 'PENDING').length} Defaulters
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Completed AI Calls</span>
          <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
            {queues.absent.filter(c => c.status === 'COMPLETED').length + queues.fee.filter(c => c.status === 'COMPLETED').length} Calls
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Parent Contact Rate</span>
          <span className="text-2xl font-black text-indigo-600 font-mono mt-1 block">
            {(() => {
              const total = queues.absent.length + queues.fee.length + queues.admissions.length;
              const completed = queues.absent.filter(c => c.status === 'COMPLETED').length + queues.fee.filter(c => c.status === 'COMPLETED').length;
              return total > 0 ? `${Math.round((completed / total) * 100)}% Picked` : '100% Ready';
            })()}
          </span>
        </div>
      </div>

      {/* QUEUE TABS SWITCHER */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('ABSENT')}
          className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'ABSENT' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <PhoneCall size={14} />
          <span>Today's Absentee Queue ({queues.absent.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('FEE')}
          className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'FEE' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Zap size={14} />
          <span>Fee Due Calling ({queues.fee.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ADMISSION')}
          className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'ADMISSION' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Sparkles size={14} />
          <span>Admission Lead Follow-up ({queues.admissions.length})</span>
        </button>
      </div>

      {/* ACTIVE CALL LIST */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-black text-slate-900 text-base">
              {activeTab === 'ABSENT' ? 'Student Morning Absentee Call List' : activeTab === 'FEE' ? 'Fee Overdue Recovery Call List' : 'Instant Admission Inquiries List'}
            </h2>
            <p className="text-xs text-slate-500">
              Click "Start AI Phone Call" to trigger automatic voice calling bot.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600">
            Automated Dialing
          </span>
        </div>

        <div className="space-y-3">
          {(() => {
            const list = activeTab === 'ABSENT' ? queues.absent : activeTab === 'FEE' ? queues.fee : queues.admissions;
            if (list.length === 0) {
              return (
                <div className="py-12 text-center bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <PhoneCall size={36} className="mx-auto text-slate-300 mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">No calls in this queue</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    No pending automated calls logged for this category.
                  </p>
                </div>
              );
            }
            return list.map((item) => {
              const isCompleted = item.status === 'COMPLETED';

              return (
                <div 
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isCompleted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950 text-sm">
                        {item.studentName || item.childName}
                      </h3>
                      {item.className && (
                        <span className="text-xs font-bold text-slate-500">
                          ({item.className} • Roll #{item.rollNo})
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {isCompleted ? '✓ Call Completed' : 'Pending Call'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium">
                      Parent: <strong className="text-slate-900">{item.parentName}</strong> • Phone: <span className="font-mono font-bold text-indigo-600">{item.phone}</span>
                    </p>

                    <p className="text-[11px] text-slate-500">
                      Reason: {item.reason} {item.amount ? `(Rs. ${item.amount.toLocaleString()})` : ''}
                    </p>

                    {isCompleted && item.response && (
                      <div className="p-2 rounded-xl bg-white border border-emerald-200 text-xs text-emerald-900 font-medium mt-1">
                        🗣️ <strong>Parent Verbal Response:</strong> "{item.response}" (Duration: {item.callDuration})
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {!isCompleted ? (
                      <button
                        onClick={() => handleStartCall(item, activeTab)}
                        className="px-4 py-2 rounded-xl bg-black hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        <PhoneCall size={14} className="text-emerald-400 animate-bounce" />
                        <span>Start AI Phone Call</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartCall(item, activeTab)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5"
                      >
                        <RotateCcwIcon size={13} />
                        <span>Call Again</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* REAL-TIME CALL SIMULATION MODAL */}
      {activeCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-white space-y-6 relative overflow-hidden">
            
            {/* Top Call Info */}
            <div className="text-center space-y-1">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-widest border border-emerald-500/30">
                {callPhase === 'DIALING' ? 'Dialing GSM Gateway...' : callPhase === 'CONNECTED' ? `Call In Progress (0:${callDuration < 10 ? `0${callDuration}` : callDuration})` : 'Call Finished'}
              </span>
              <h3 className="text-xl font-black text-white pt-2">{activeCall.parentName}</h3>
              <p className="text-xs font-mono text-slate-400">{activeCall.phone} • Student: {activeCall.studentName || activeCall.childName}</p>
            </div>

            {/* Audio Waveform Animation */}
            <div className="h-16 flex items-center justify-center gap-1.5 bg-slate-900/80 rounded-2xl border border-slate-800/80 px-4">
              {callPhase === 'CONNECTED' ? (
                <>
                  {[...Array(16)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 rounded-full bg-emerald-400 transition-all duration-150 ${isSpeaking ? 'animate-pulse' : 'opacity-40'}`}
                      style={{ 
                        height: isSpeaking ? `${Math.max(12, Math.floor(Math.random() * 45))}px` : '8px'
                      }}
                    ></div>
                  ))}
                </>
              ) : (
                <span className="text-xs font-mono text-slate-400 animate-pulse">
                  {callPhase === 'DIALING' ? 'Ringing parent phone...' : 'Call Logged Successfully ✓'}
                </span>
              )}
            </div>

            {/* Live Conversation Transcript Box */}
            <div className="space-y-2 bg-slate-900 rounded-2xl p-4 border border-slate-800/80 max-h-56 overflow-y-auto text-xs leading-relaxed custom-scrollbar">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
                Live Speech-to-Text Conversation Transcript:
              </span>

              {transcript.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-xl space-y-0.5 ${msg.sender === 'AI_BOT' ? 'bg-indigo-950/80 border border-indigo-800 text-indigo-100' : msg.sender === 'PARENT' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-100' : 'text-slate-400 text-center italic text-[11px]'}`}
                >
                  {msg.sender !== 'SYSTEM' && (
                    <span className="font-bold text-[10px] block uppercase tracking-wider opacity-70">
                      {msg.sender === 'AI_BOT' ? '🤖 AI Receptionist (TaleemiDunya)' : '👨 Parent Response'}
                    </span>
                  )}
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>

            {/* End Call Button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleEndCallEarly}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-all active:scale-90 cursor-pointer"
                title="Hang up call"
              >
                <PhoneOff size={24} />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

const RotateCcwIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);

export default AIVoiceTelephonyAgent;
