import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Phone, 
  User, 
  Clock, 
  CheckCircle,
  MoreVertical,
  Filter
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const InquiryManager = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const data = await getRecords('inquiries', userData?.schoolId || 'default-school');
      setInquiries(data);
      setLoading(false);
    };
    fetchData();
  }, [userData]);

  const filteredInquiries = inquiries.filter(inq => 
    inq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inq.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inquiry Manager</h1>
          <p className="text-dark-muted mt-1">Manage new admission inquiries and follow-ups.</p>
        </div>
        
        <button 
          onClick={() => navigate('/school-admin/inquiries/add')}
          className="premium-button-primary"
        >
          <Plus size={20} />
          New Inquiry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard className="p-6 text-center">
          <h3 className="text-3xl font-black">{inquiries.length}</h3>
          <p className="text-xs text-dark-muted uppercase font-black tracking-widest mt-1">Total Inquiries</p>
        </GlassCard>
        <GlassCard className="p-6 text-center">
          <h3 className="text-3xl font-black text-blue-500">
            {inquiries.filter(i => i.createdAt?.toDate()?.toDateString() === new Date().toDateString()).length}
          </h3>
          <p className="text-xs text-dark-muted uppercase font-black tracking-widest mt-1">Today's New</p>
        </GlassCard>
        <GlassCard className="p-6 text-center">
          <h3 className="text-3xl font-black text-orange-500">{inquiries.filter(i => i.status === 'Pending').length}</h3>
          <p className="text-xs text-dark-muted uppercase font-black tracking-widest mt-1">Pending Follow-up</p>
        </GlassCard>
        <GlassCard className="p-6 text-center">
          <h3 className="text-3xl font-black text-green-500">{inquiries.filter(i => i.status === 'Converted').length}</h3>
          <p className="text-xs text-dark-muted uppercase font-black tracking-widest mt-1">Converted</p>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search inquiries by name or phone..." 
              className="w-full premium-input pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button className="premium-button-secondary">
            <Filter size={18} />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black">
                <th className="pb-4 px-4">Lead Info</th>
                <th className="pb-4 px-4">Class Interest</th>
                <th className="pb-4 px-4">Source</th>
                <th className="pb-4 px-4">Inquiry Date</th>
                <th className="pb-4 px-4 text-center">Status</th>
                <th className="pb-4 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {filteredInquiries.map((inq) => (
                <tr key={inq.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{inq.name}</p>
                        <p className="text-xs text-dark-muted">{inq.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm font-semibold">{inq.classInterest} Grade</span>
                  </td>
                  <td className="py-4 px-4 text-xs font-medium text-dark-muted uppercase">{inq.source}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-xs text-dark-muted">
                      <Clock size={14} /> {inq.createdAt?.toDate()?.toLocaleDateString() || 'N/A'}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                      inq.status === 'Converted' ? 'bg-green-500/10 text-green-500' : 
                      inq.status === 'Pending' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {inq.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          const cleanPhone = (inq.phone || '').replace(/[^0-9]/g, '');
                          const msg = encodeURIComponent(`Hello ${inq.name}, regarding your admission inquiry for ${inq.classInterest} Grade at TaleemiDunya Pro school...`);
                          window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                        }}
                        className="p-2 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold"
                        title="Direct WhatsApp Web Chat"
                      >
                        <MessageSquare size={16} />
                        <span>WhatsApp</span>
                      </button>
                      <button className="p-2 hover:bg-dark-hover rounded-lg text-dark-muted">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInquiries.length === 0 && (
            <div className="text-center py-10 text-dark-muted">
              No inquiries found.
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default InquiryManager;
