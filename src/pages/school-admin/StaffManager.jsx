import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Trash2, 
  Edit2, 
  ShieldCheck,
  UserSquare2
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const StaffManager = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStaff();
  }, [userData]);

  const fetchStaff = async () => {
    try {
      const data = await getRecords('staff', userData?.schoolId || 'default-school');
      setStaff(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Manager</h1>
          <p className="text-dark-muted mt-1">Manage all employees and teachers.</p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => navigate('/school-admin/staff/add')}
            className="premium-button-primary"
          >
            <Plus size={20} />
            Add Staff Member
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 border-l-4 border-primary-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary-500/10 text-primary-500">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{staff.length}</h3>
              <p className="text-xs text-dark-muted uppercase font-black tracking-widest">Total Staff</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6 border-l-4 border-green-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-green-500/10 text-green-500">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{staff.filter(s => s.status === 'Active').length}</h3>
              <p className="text-xs text-dark-muted uppercase font-black tracking-widest">Active Members</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6 border-l-4 border-purple-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
              <UserSquare2 size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{new Set(staff.map(s => s.department).filter(Boolean)).size || 0}</h3>
              <p className="text-xs text-dark-muted uppercase font-black tracking-widest">Departments</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search staff by name or role..." 
              className="w-full premium-input pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black">
                <th className="pb-4 px-4">Staff Member</th>
                <th className="pb-4 px-4">Designation</th>
                <th className="pb-4 px-4">Department</th>
                <th className="pb-4 px-4">Contact</th>
                <th className="pb-4 px-4">Status</th>
                <th className="pb-4 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {filteredStaff.map((member) => (
                <tr key={member.id} className="group hover:bg-white/5 transition-all">
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold border border-primary-500/20">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{member.name}</p>
                        <p className="text-[10px] text-dark-muted font-mono uppercase">ID: {member.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <p className="text-sm font-semibold">{member.role}</p>
                  </td>
                  <td className="py-5 px-4 text-sm text-dark-muted">{member.department}</td>
                  <td className="py-5 px-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-xs text-dark-muted">
                        <Mail size={12} /> {member.email}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-dark-muted">
                        <Phone size={12} /> {member.phone}
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-green-500/10 text-green-500 border border-green-500/20">
                      {member.status}
                    </span>
                  </td>
                  <td className="py-5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-primary-500/10 text-dark-muted hover:text-primary-500 rounded-lg">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 hover:bg-red-500/10 text-dark-muted hover:text-red-500 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default StaffManager;
