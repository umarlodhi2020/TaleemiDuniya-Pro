import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Edit, Eye, ShieldCheck, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const ParentManager = () => {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchParents();
  }, []);

  const fetchParents = async () => {
    try {
      if (!userData?.schoolId) return;
      const schoolId = userData.schoolId;
      // Extract unique parents from students
      const students = await getRecords('students', schoolId);
      
// Helper to build consistent family key
const getFamilyKey = (student) => {
  if (student.familyId) return student.familyId;
  const cnicKey = student.fatherCnic ? String(student.fatherCnic).replace(/[^0-9]/g, '') : null;
  const phoneKey = String(student.parentPhone || student.fatherPhone || student.phone || '');
  const cleanPhone = phoneKey.replace(/[^0-9]/g, '');
  const nameKey = student.fatherName ? String(student.fatherName).trim().toLowerCase() : 'unknown';
  if (cnicKey && cnicKey.length > 8) return `cnic_${cnicKey}`;
  if (cleanPhone.length >= 10 && nameKey !== 'unknown') return `phone_${cleanPhone}_fname_${nameKey.replace(/\s+/g, '_')}`;
  if (cleanPhone.length >= 10) return `phone_${cleanPhone}`;
  return `name_${nameKey}_${cleanPhone || 'nophone'}`;
};

      const parentMap = new Map();
      students.forEach(student => {
        if (student.fatherName || student.parentCnic || student.parentPhone) {
          const key = student.parentCnic || student.parentPhone || student.fatherName;
          if (!parentMap.has(key)) {
            parentMap.set(key, {
              id: student.id, // using first student's ID as parent reference
              familyKey: getFamilyKey(student),
              name: student.fatherName || 'Unknown Parent',
              cnic: student.parentCnic || 'N/A',
              phone: student.parentPhone || 'N/A',
              email: student.parentEmail || 'N/A',
              childrenCount: 1,
              students: [student]
            });
          } else {
            const existing = parentMap.get(key);
            existing.childrenCount += 1;
            existing.students.push(student);
          }
        }
      });
      
      setParents(Array.from(parentMap.values()));
    } catch (error) {
      console.error("Error fetching parents:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredParents = parents.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.cnic.includes(searchTerm) || 
    p.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-dark-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-white">Parent Profiles</h1>
          <p className="text-xs text-dark-muted font-bold uppercase tracking-wider mt-1">Manage Parent/Guardian Accounts</p>
        </div>
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-dark-muted" />
            <input
              type="text"
              placeholder="Search by parent name, CNIC, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-dark-hover border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-dark-muted focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-border text-xs uppercase tracking-wider text-dark-muted">
                  <th className="p-4 font-black">Parent Info</th>
                  <th className="p-4 font-black">Contact</th>
                  <th className="p-4 font-black text-center">Children</th>
                  <th className="p-4 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/50">
                {filteredParents.map((parent, idx) => (
                  <tr key={idx} className="hover:bg-dark-hover/40 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold uppercase">
                          {parent.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{parent.name}</p>
                          <p className="text-[10px] font-mono text-dark-muted mt-0.5 flex items-center gap-1">
                            <ShieldCheck size={10} className="text-blue-400" />
                            CNIC: {parent.cnic}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <p className="text-xs text-white font-medium flex items-center gap-1.5">
                          <Phone size={12} className="text-green-400" />
                          {parent.phone}
                        </p>
                        {parent.email !== 'N/A' && (
                          <p className="text-xs text-dark-muted flex items-center gap-1.5">
                            <Mail size={12} />
                            {parent.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs">
                        {parent.childrenCount}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => navigate(`/school-admin/parents/${encodeURIComponent(parent.familyKey)}`)}
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all inline-flex"
                        title="View Parent Profile"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => navigate(`/school-admin/parents/edit/${parent.id}`)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all inline-flex"
                        title="Edit Parent Profile"
                      >
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredParents.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-dark-muted text-sm italic">
                      No parent profiles found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default ParentManager;
