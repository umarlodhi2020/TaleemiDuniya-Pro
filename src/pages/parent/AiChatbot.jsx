import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ParentAiChatbot = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      text: `Hello ${userData?.name || 'Parent'}! I am the TaleemiDunya AI Assistant. I can help you with your child's attendance, fee status, and exam results. How can I help you today?`,
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response based on keywords
    setTimeout(() => {
      let botResponse = "I'm sorry, I don't have that information right now. Please contact the school administration.";
      const lowerInput = userMessage.text.toLowerCase();

      if (lowerInput.includes('attendance') || lowerInput.includes('present') || lowerInput.includes('absent')) {
        botResponse = "Your child was marked PRESENT today. Their overall attendance for this month is 95%.";
      } else if (lowerInput.includes('fee') || lowerInput.includes('challan') || lowerInput.includes('due')) {
        botResponse = "The current fee challan has been PAID. There are no outstanding dues for this month.";
      } else if (lowerInput.includes('exam') || lowerInput.includes('result') || lowerInput.includes('marks')) {
        botResponse = "The Mid-Term exam results are out. Your child scored an overall Grade A. You can view detailed marks in the Exams section.";
      } else if (lowerInput.includes('holiday') || lowerInput.includes('leave') || lowerInput.includes('vacation')) {
        botResponse = "The school will remain closed this Friday for a public holiday. Normal classes will resume on Monday.";
      } else if (lowerInput.includes('hi') || lowerInput.includes('hello')) {
        botResponse = "Hello! How can I assist you with your child's school updates today?";
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-4xl mx-auto h-[85vh] flex flex-col">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-dark-hover rounded-xl text-dark-muted transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Bot className="text-primary-500" size={28} /> AI Parent Assistant
          </h1>
          <p className="text-dark-muted mt-1 text-sm">Ask anything about your child's progress, attendance, or fees.</p>
        </div>
      </div>

      <GlassCard className="flex-1 flex flex-col overflow-hidden border border-primary-500/20 shadow-2xl shadow-primary-500/10">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-dark-bg/30">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.sender === 'user' ? 'bg-primary-500 text-white' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-purple-500/20'
                }`}>
                  {msg.sender === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                </div>
                <div className={`p-4 rounded-2xl ${
                  msg.sender === 'user' 
                    ? 'bg-primary-500 text-white rounded-tr-sm' 
                    : 'bg-dark-hover border border-dark-border text-gray-200 rounded-tl-sm shadow-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <span className={`text-[10px] mt-2 block ${msg.sender === 'user' ? 'text-primary-100 text-right' : 'text-dark-muted'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
                <div className="p-4 rounded-2xl bg-dark-hover border border-dark-border rounded-tl-sm flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-primary-500" />
                  <span className="text-sm text-dark-muted">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-dark-card border-t border-dark-border">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about attendance, fees, or results..."
              className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-white placeholder-dark-muted"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-primary-500/25"
            >
              <Send size={18} className={input.trim() ? 'translate-x-1 transition-transform' : ''} />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default ParentAiChatbot;
