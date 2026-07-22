import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { Video, Calendar, Clock, Link as LinkIcon, PlusCircle, Users, Copy, CheckCircle2, PlayCircle, VideoIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LiveClasses = () => {
  const { userData, showToast } = useAuth();
  
  const [form, setForm] = useState({
    title: '',
    classId: '10',
    subject: 'Physics',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
    duration: '45',
    platform: 'Zoom',
    link: ''
  });

  const [classes, setClasses] = useState([
    {
      id: 1,
      title: 'Thermodynamics Revision',
      classId: '10',
      subject: 'Physics',
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM',
      platform: 'Zoom',
      status: 'live',
      link: 'https://zoom.us/j/123456789'
    },
    {
      id: 2,
      title: 'Algebra Basics',
      classId: '8',
      subject: 'Mathematics',
      date: new Date().toISOString().split('T')[0],
      time: '02:00 PM',
      platform: 'Google Meet',
      status: 'upcoming',
      link: 'https://meet.google.com/abc-defg-hij'
    }
  ]);

  const [copied, setCopied] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    showToast('success', 'Meeting link copied to clipboard!');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.link) {
      showToast('error', 'Please fill all required fields');
      return;
    }
    
    setClasses([{ ...form, id: Date.now(), status: 'upcoming' }, ...classes]);
    setForm({ ...form, title: '', link: '' });
    showToast('success', 'Live class scheduled successfully!');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Video className="text-white" size={28} />
            </div>
            Live Classes Hub
          </h1>
          <p className="text-dark-muted mt-2 max-w-2xl">
            Schedule and manage interactive online sessions via Zoom, Google Meet, or Microsoft Teams.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Schedule Form */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <PlusCircle className="text-blue-400" size={20} /> Schedule New Class
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 block">Topic / Title</label>
                <input 
                  type="text" 
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                  placeholder="e.g. Chapter 4 Revision"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 block">Class/Grade</label>
                  <select 
                    value={form.classId}
                    onChange={(e) => setForm({...form, classId: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:border-blue-500 outline-none appearance-none"
                  >
                    {[8, 9, 10].map(c => <option key={c} value={c}>Grade {c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 block">Subject</label>
                  <select 
                    value={form.subject}
                    onChange={(e) => setForm({...form, subject: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:border-blue-500 outline-none appearance-none"
                  >
                    {['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 block">Date</label>
                  <input 
                    type="date" 
                    value={form.date}
                    onChange={(e) => setForm({...form, date: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 block">Time</label>
                  <input 
                    type="time" 
                    value={form.time}
                    onChange={(e) => setForm({...form, time: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 block">Platform</label>
                  <select 
                    value={form.platform}
                    onChange={(e) => setForm({...form, platform: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:border-blue-500 outline-none appearance-none"
                  >
                    <option value="Zoom">Zoom</option>
                    <option value="Google Meet">Google Meet</option>
                    <option value="MS Teams">MS Teams</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 block">Duration (Mins)</label>
                  <input 
                    type="number" 
                    value={form.duration}
                    onChange={(e) => setForm({...form, duration: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 block">Meeting URL (Invite Link)</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="url" 
                    value={form.link}
                    onChange={(e) => setForm({...form, link: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl pl-10 p-3 text-cyan-400 font-mono text-sm focus:border-blue-500 outline-none"
                    placeholder="https://zoom.us/j/..."
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full mt-4 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                Schedule Class
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Classes List */}
        <div className="lg:col-span-2 space-y-4">
          {classes.map(c => (
            <GlassCard key={c.id} className={`p-0 overflow-hidden border-l-4 ${c.status === 'live' ? 'border-l-red-500' : 'border-l-blue-500'}`}>
              <div className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                
                <div className="flex-grow space-y-2">
                  <div className="flex items-center gap-3">
                    {c.status === 'live' && (
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider rounded-md border border-red-500/30 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></div> Live Now
                      </span>
                    )}
                    <h3 className="text-xl font-bold text-white">{c.title}</h3>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-dark-muted font-bold">
                    <span className="flex items-center gap-1.5"><Users size={14} className="text-blue-400" /> Grade {c.classId}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={14} className="text-purple-400" /> {c.date}</span>
                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-amber-400" /> {c.time}</span>
                    <span className="flex items-center gap-1.5"><VideoIcon size={14} className="text-cyan-400" /> {c.platform}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => handleCopy(c.link, c.id)}
                    className="p-3 bg-dark-bg border border-dark-border rounded-xl text-dark-muted hover:text-white transition-colors cursor-pointer"
                    title="Copy Link"
                  >
                    {copied === c.id ? <CheckCircle2 size={20} className="text-green-500" /> : <Copy size={20} />}
                  </button>
                  <a 
                    href={c.link} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`flex-grow md:flex-none px-6 py-3 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                      c.status === 'live' 
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20' 
                        : 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white'
                    }`}
                  >
                    {c.status === 'live' ? <><PlayCircle size={18} /> Join Class</> : 'Join Link'}
                  </a>
                </div>

              </div>
            </GlassCard>
          ))}
          
          {classes.length === 0 && (
            <div className="text-center py-20 text-dark-muted">
              <VideoIcon size={48} className="mx-auto mb-4 opacity-20" />
              <p>No live classes scheduled.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default LiveClasses;
