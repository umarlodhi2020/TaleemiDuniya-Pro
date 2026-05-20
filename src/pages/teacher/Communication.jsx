import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Users, ShieldAlert, Award, FileText } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, getDocs, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

const Communication = () => {
  const { userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([
    { id: 'chat_zahid', name: 'Zahid Khan (10 Grade Parent)', lastMsg: 'Sir is Mathematics test scheduled tomorrow?', time: '10:45 AM', active: true },
    { id: 'chat_ayesha', name: 'Ayesha Bibi (9 Grade Parent)', lastMsg: 'Thank you for updating the attendance report.', time: 'Yesterday', active: false },
    { id: 'chat_farooq', name: 'Farooq Lodhi (Principal)', lastMsg: 'Please submit the monthly grading report by Friday.', time: 'Monday', active: false }
  ]);
  const [currentChat, setCurrentChat] = useState(chats[0]);
  const [newNotice, setNewNotice] = useState({ title: '', desc: '', type: 'all' });
  const [typedMessage, setTypedMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentChat || !userData?.schoolId) return;

    const q = query(
      collection(db, 'chats_messages'),
      where('schoolId', '==', userData?.schoolId || 'default-school'),
      where('chatId', '==', currentChat.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Client-side sort by createdAt securely
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeA - timeB;
      });
      setMessages(msgs);
    }, (err) => {
      console.error("Chats load error:", err);
    });

    return () => unsubscribe();
  }, [currentChat, userData]);

  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.desc) return;
    try {
      await addDoc(collection(db, 'announcements'), {
        title: newNotice.title,
        desc: newNotice.desc,
        schoolId: userData?.schoolId || 'default-school',
        type: newNotice.type,
        createdAt: serverTimestamp()
      });
      alert('Notice published to student noticeboard!');
      setNewNotice({ title: '', desc: '', type: 'all' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;
    const msgText = typedMessage;
    setTypedMessage('');
    try {
      await addDoc(collection(db, 'chats_messages'), {
        chatId: currentChat.id,
        text: msgText,
        sender: 'me',
        schoolId: userData?.schoolId || 'default-school',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Communication Center</h1>
          <p className="text-dark-muted mt-1">Broadcast announcements to classes or text parents individually.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="lg:col-span-1 p-6 h-fit">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Users className="text-primary-500" /> Broadcast Notice</h2>
          <form onSubmit={handlePostNotice} className="space-y-5">
            <div>
              <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Notice Title</label>
              <input 
                type="text" 
                placeholder="Math Test Postponed" 
                value={newNotice.title} 
                onChange={(e) => setNewNotice(p => ({ ...p, title: e.target.value }))}
                className="w-full premium-input"
                required
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Target Audience</label>
              <select 
                value={newNotice.type} 
                onChange={(e) => setNewNotice(p => ({ ...p, type: e.target.value }))}
                className="w-full premium-input bg-dark-card"
              >
                <option value="all">All Assigned Classes</option>
                <option value="10">10th Class Only</option>
                <option value="9">9th Class Only</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase text-dark-muted block mb-1.5">Notice Description</label>
              <textarea 
                rows={4}
                placeholder="Write announcements here..." 
                value={newNotice.desc} 
                onChange={(e) => setNewNotice(p => ({ ...p, desc: e.target.value }))}
                className="w-full premium-input"
                required
              />
            </div>
            <button type="submit" className="w-full premium-button-primary py-3">
              Post Broadcast Notice
            </button>
          </form>
        </GlassCard>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 bg-dark-card/30 border border-dark-border rounded-3xl overflow-hidden min-h-[500px]">
          {/* Chat List */}
          <div className="md:col-span-1 border-r border-dark-border p-4 space-y-4">
            <h3 className="font-bold text-sm text-dark-muted uppercase tracking-wider px-2">Inbox</h3>
            <div className="space-y-2">
              {chats.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => setCurrentChat(c)}
                  className={`p-3 rounded-2xl cursor-pointer hover:bg-white/5 transition-all text-left ${currentChat.id === c.id ? 'bg-primary-500/10 border border-primary-500/20' : 'border border-transparent'}`}
                >
                  <p className="font-bold text-sm text-white truncate">{c.name}</p>
                  <p className="text-xs text-dark-muted truncate mt-1">{c.lastMsg}</p>
                  <p className="text-[9px] text-dark-muted text-right mt-1 font-mono">{c.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Pane */}
          <div className="md:col-span-2 flex flex-col justify-between p-4 h-full min-h-[500px]">
            <div className="border-b border-dark-border pb-3 mb-4">
              <p className="font-bold text-white text-base">{currentChat.name}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-0.5">Online</p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[350px] custom-scrollbar pr-2 mb-4">
              <div className="bg-white/5 border border-dark-border p-3 rounded-2xl text-sm max-w-[80%] text-left text-dark-muted">
                {currentChat.lastMsg}
              </div>
              {messages.map((m, idx) => (
                <div key={idx} className="flex justify-end">
                  <div className="bg-primary-500 text-white p-3 rounded-2xl text-sm max-w-[80%] text-left shadow-lg shadow-primary-500/15">
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Type your message..." 
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                className="flex-1 premium-input pl-4"
              />
              <button type="submit" className="p-3 bg-primary-500 text-white hover:bg-primary-400 rounded-xl transition-all shadow-lg shadow-primary-500/20">
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Communication;
