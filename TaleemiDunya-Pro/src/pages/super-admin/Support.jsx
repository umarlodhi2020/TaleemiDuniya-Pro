import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, Clock, ChevronRight, Send, Plus, RefreshCw, X } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { collection, getDocs, addDoc, updateDoc, doc, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const priorityColor = { high: 'text-red-400 bg-red-500/10 border-red-500/20', medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', low: 'text-green-400 bg-green-500/10 border-green-500/20' };
const statusColor = { open: 'text-blue-400 bg-blue-500/10 border-blue-500/20', 'in-progress': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', resolved: 'text-green-400 bg-green-500/10 border-green-500/20' };

const SupportCenter = () => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTicket, setNewTicket] = useState({ school: '', subject: '', priority: 'medium', message: '' });

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'support_tickets'));
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createTicket = async () => {
    if (!newTicket.subject) return;
    try {
      await addDoc(collection(db, 'support_tickets'), {
        ...newTicket, status: 'open', messages: [{ from: 'admin', text: newTicket.message, time: new Date().toISOString() }],
        createdAt: serverTimestamp()
      });
      setShowNew(false);
      setNewTicket({ school: '', subject: '', priority: 'medium', message: '' });
      fetchTickets();
    } catch (e) { console.error(e); }
  };

  const sendReply = async () => {
    if (!reply || !selected) return;
    try {
      const msgs = [...(selected.messages || []), { from: 'support', text: reply, time: new Date().toISOString() }];
      await updateDoc(doc(db, 'support_tickets', selected.id), { messages: msgs });
      setSelected({ ...selected, messages: msgs });
      setReply('');
      fetchTickets();
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, 'support_tickets', id), { status });
    fetchTickets();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const filtered = tickets.filter(t =>
    (t.school || '').toLowerCase().includes(search.toLowerCase()) || (t.subject || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="animate-spin text-primary-500" size={32} /><p className="text-dark-muted ml-3">Loading tickets...</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><MessageSquare className="text-primary-500" size={28} /> Support Center</h1>
          <p className="text-dark-muted mt-1">Manage all school support tickets and requests.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchTickets} className="premium-button-secondary"><RefreshCw size={18} /> Refresh</button>
          <button onClick={() => setShowNew(true)} className="premium-button-primary"><Plus size={18} /> New Ticket</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
            <input type="text" placeholder="Search tickets..." className="w-full premium-input pl-10 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-dark-muted">
              <MessageSquare size={40} className="mx-auto opacity-30 mb-3" />
              <p className="font-bold">No tickets found</p>
              <p className="text-xs mt-1">Create a new ticket to get started</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filtered.map(ticket => (
                <div key={ticket.id} onClick={() => setSelected(ticket)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-primary-500/30 ${selected?.id === ticket.id ? 'border-primary-500/50 bg-primary-500/5' : 'border-dark-border'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${priorityColor[ticket.priority] || priorityColor.medium}`}>{ticket.priority}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${statusColor[ticket.status] || statusColor.open}`}>{ticket.status}</span>
                      </div>
                      <p className="font-semibold text-sm">{ticket.subject}</p>
                      <p className="text-xs text-dark-muted mt-0.5">{ticket.school || 'Unknown School'}</p>
                    </div>
                    <ChevronRight className="text-dark-muted mt-1 shrink-0" size={16} />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-dark-muted">
                    <span className="flex items-center gap-1"><Clock size={10} /> {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={10} /> {(ticket.messages || []).length} msgs</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          {selected ? (
            <div className="flex flex-col h-full">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold">{selected.subject}</h2>
                  <p className="text-sm text-dark-muted">{selected.school}</p>
                </div>
                <div className="flex gap-2">
                  {selected.status !== 'resolved' && (
                    <button onClick={() => updateStatus(selected.id, 'resolved')} className="px-3 py-1 text-[10px] font-black uppercase bg-green-500/10 text-green-400 rounded-lg">Resolve</button>
                  )}
                  {selected.status === 'open' && (
                    <button onClick={() => updateStatus(selected.id, 'in-progress')} className="px-3 py-1 text-[10px] font-black uppercase bg-yellow-500/10 text-yellow-400 rounded-lg">In Progress</button>
                  )}
                </div>
              </div>
              <div className="flex-1 bg-dark-hover rounded-xl p-4 mb-4 space-y-3 max-h-[350px] overflow-y-auto">
                {(selected.messages || []).map((msg, i) => (
                  <div key={i} className={`rounded-xl p-3 text-sm ${msg.from === 'support' ? 'bg-primary-500/10 ml-8' : 'bg-dark-card'}`}>
                    <p className="font-bold text-xs text-primary-400 mb-1">{msg.from === 'support' ? 'Support Team' : 'School Admin'}</p>
                    <p className="text-dark-muted">{msg.text}</p>
                    <p className="text-[9px] text-dark-muted/50 mt-1">{msg.time ? new Date(msg.time).toLocaleString() : ''}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Type your reply..." className="flex-1 premium-input text-sm" value={reply} onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendReply()} />
                <button onClick={sendReply} className="premium-button-primary px-4"><Send size={16} /></button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 text-dark-muted">
              <MessageSquare size={40} className="mb-3 opacity-30" />
              <p>Select a ticket to view details</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* New Ticket Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">New Support Ticket</h2>
              <button onClick={() => setShowNew(false)} className="p-2 hover:bg-dark-hover rounded-lg text-dark-muted"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest block mb-1.5">School Name</label>
                <input type="text" value={newTicket.school} onChange={e => setNewTicket(p => ({...p, school: e.target.value}))} className="w-full premium-input" placeholder="School name" />
              </div>
              <div>
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest block mb-1.5">Subject</label>
                <input type="text" value={newTicket.subject} onChange={e => setNewTicket(p => ({...p, subject: e.target.value}))} className="w-full premium-input" placeholder="Issue subject" />
              </div>
              <div>
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest block mb-1.5">Priority</label>
                <select value={newTicket.priority} onChange={e => setNewTicket(p => ({...p, priority: e.target.value}))} className="w-full premium-input">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest block mb-1.5">Message</label>
                <textarea value={newTicket.message} onChange={e => setNewTicket(p => ({...p, message: e.target.value}))} className="w-full premium-input h-24 resize-none" placeholder="Describe the issue..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={createTicket} className="flex-1 premium-button-primary">Create Ticket</button>
              <button onClick={() => setShowNew(false)} className="flex-1 premium-button-secondary">Cancel</button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default SupportCenter;
