import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  GraduationCap,
  Mail,
  Phone,
  Trash2,
  Edit2,
  Eye,
  UploadCloud,
  MessageSquare
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useNavigate } from 'react-router-dom';
import { getRecords, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const StudentManager = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [userData]);

  const fetchStudents = async () => {
    try {
      const data = await getRecords('students', userData?.schoolId || 'default-school');
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteRecord('students', id);
        setStudents(students.filter(s => s.id !== id));
      } catch (error) {
        console.error("Error deleting student:", error);
      }
    }
  };

  const filteredStudents = students.filter(student => 
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.class?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ... header ... */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Manager</h1>
          <p className="text-dark-muted mt-1">Total {students.length} students enrolled.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/school-admin/import')} className="premium-button-secondary">
            <UploadCloud size={18} />
            Import Excel/CSV
          </button>
          <button className="premium-button-secondary">
            <Download size={18} />
            Export
          </button>
          <button 
            onClick={() => navigate('/school-admin/students/add')}
            className="premium-button-primary"
          >
            <Plus size={20} />
            Add Student
          </button>
        </div>
      </div>
      {/* ... stats ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="flex flex-col items-center justify-center py-6 text-center border-b-2 border-primary-500">
          <h3 className="text-3xl font-black">{students.length}</h3>
          <p className="text-[10px] text-dark-muted uppercase tracking-[0.2em] font-bold mt-1">Total Students</p>
        </GlassCard>
        <GlassCard className="flex flex-col items-center justify-center py-6 text-center border-b-2 border-green-500">
          <h3 className="text-3xl font-black text-green-500">{students.filter(s => s.status === 'Active').length}</h3>
          <p className="text-[10px] text-dark-muted uppercase tracking-[0.2em] font-bold mt-1">Active Now</p>
        </GlassCard>
        <GlassCard className="flex flex-col items-center justify-center py-6 text-center border-b-2 border-orange-500">
          <h3 className="text-3xl font-black text-orange-500">
            {students.filter(s => s.feeStatus === 'Pending').length}
          </h3>
          <p className="text-[10px] text-dark-muted uppercase tracking-[0.2em] font-bold mt-1">Pending Fees</p>
        </GlassCard>
        <GlassCard className="flex flex-col items-center justify-center py-6 text-center border-b-2 border-purple-500">
          <h3 className="text-3xl font-black text-purple-500">
            {students.filter(s => s.createdAt?.toDate()?.toDateString() === new Date().toDateString()).length}
          </h3>
          <p className="text-[10px] text-dark-muted uppercase tracking-[0.2em] font-bold mt-1">New Today</p>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, roll number or class..." 
              className="w-full premium-input pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button className="premium-button-secondary">
            <Filter size={18} />
            Filter Records
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black">
                <th className="pb-4 px-4">Student Identity</th>
                <th className="pb-4 px-4">Roll No</th>
                <th className="pb-4 px-4">Class & Section</th>
                <th className="pb-4 px-4">Parent/Guardian</th>
                <th className="pb-4 px-4">Status</th>
                <th className="pb-4 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="group hover:bg-white/5 transition-all">
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-dark-hover flex items-center justify-center text-primary-500 font-bold border border-dark-border group-hover:border-primary-500/30 transition-all uppercase overflow-hidden">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          student.name?.charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-dark-text group-hover:text-primary-500 transition-colors">
                          {student.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-dark-muted font-mono uppercase">
                          <span>ID: {student.id.slice(0,6)}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4 font-mono text-xs font-bold text-primary-400">{student.rollNumber}</td>
                  <td className="py-5 px-4">
                    <span className="px-2 py-1 rounded-lg bg-white/5 border border-dark-border text-xs font-black uppercase tracking-tighter">
                      {student.class} — {student.section || 'N/A'}
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <p className="text-sm font-semibold">{student.fatherName}</p>
                    <p className="text-[10px] text-dark-muted">{student.phone}</p>
                  </td>
                  <td className="py-5 px-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                      student.status === 'Active' 
                        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="py-5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          const cleanPhone = (student.phone || student.parentPhone || '').replace(/[^0-9]/g, '');
                          const msg = encodeURIComponent(`Assalam-o-Alaikum, regarding student ${student.name} (Roll # ${student.rollNumber}) in class ${student.class}...`);
                          window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                        }}
                        className="p-2 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white rounded-lg transition-all flex items-center gap-1 text-xs font-bold"
                        title="Direct WhatsApp Web Chat"
                      >
                        <MessageSquare size={16} />
                        <span className="hidden xl:inline">WhatsApp</span>
                      </button>
                      <button
                        onClick={() => navigate(`/school-admin/students/edit/${student.id}`)}
                        className="p-2 hover:bg-primary-500/10 text-dark-muted hover:text-primary-500 rounded-lg transition-all"
                        title="View Profile"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => navigate(`/school-admin/students/edit/${student.id}`)}
                        className="p-2 hover:bg-blue-500/10 text-dark-muted hover:text-blue-500 rounded-lg transition-all" 
                        title="Edit Student"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(student.id)}
                        className="p-2 hover:bg-red-500/10 text-dark-muted hover:text-red-500 rounded-lg transition-all" 
                        title="Delete Student"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStudents.length === 0 && !loading && (
            <div className="text-center py-20">
              <div className="p-4 bg-dark-hover rounded-full inline-block mb-4 text-dark-muted">
                <GraduationCap size={48} />
              </div>
              <h3 className="text-xl font-bold">No Students Found</h3>
              <p className="text-dark-muted max-w-xs mx-auto mt-2">
                We couldn't find any student records matching your search criteria.
              </p>
              <button 
                onClick={() => navigate('/school-admin/students/add')}
                className="mt-6 premium-button-primary inline-flex"
              >
                <Plus size={20} />
                Add First Student
              </button>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default StudentManager;
