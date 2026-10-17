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
  UserSquare2, 
  UploadCloud,
  Eye,
  Clock,
  DollarSign,
  Calculator,
  ClipboardCheck
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import StaffTimeSlipModal from '../../components/common/StaffTimeSlipModal';

const StaffManager = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [staffTypeFilter, setStaffTypeFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [timeSlipStaff, setTimeSlipStaff] = useState(null);

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

  const handleDeleteStaff = async (staffMember) => {
    const docId = staffMember.raw?.id || staffMember.id;
    const name = staffMember.name || 'this staff member';

    const result = await Swal.fire({
      title: 'Delete Staff Member?',
      text: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const res = await deleteRecord('staff', docId);
        if (res && res.success === false) {
          throw new Error(res.error || 'Failed to delete');
        }
        setStaff(prev => prev.filter(s => s.id !== docId && s.staffId !== docId));
        Swal.fire({
          title: 'Deleted!',
          text: `"${name}" has been removed successfully.`,
          icon: 'success',
          timer: 1800,
          showConfirmButton: false
        });
      } catch (error) {
        console.error("Error deleting staff:", error);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to delete staff member.',
          icon: 'error'
        });
      }
    }
  };

  const filteredStaff = staff.filter(s => {
    const q = (searchTerm || '').toLowerCase().trim();
    if (!q) return true;
    return (
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.role || '').toLowerCase().includes(q) ||
      String(s.phone || '').toLowerCase().includes(q) ||
      String(s.email || '').toLowerCase().includes(q)
    );
  });

  // derive filters and apply them
  const departments = [...new Set(staff.map(s => s.department).filter(Boolean))];
  const statuses = [...new Set(staff.map(s => s.status).filter(Boolean))];

  const normalizeToString = (v) => {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    if (Array.isArray(v)) return v.map(item => normalizeToString(item)).filter(Boolean).join(', ');
    if (typeof v === 'object') {
      if (v.name) return String(v.name);
      if (v.label) return String(v.label);
      if (v.toDate) {
        try { return String(v.toDate()); } catch(e) {}
      }
      // Fall back to JSON-safe string
      try { return JSON.stringify(v); } catch(e) { return String(v); }
    }
    return String(v);
  }

  const formatDate = (val) => {
    if (!val && val !== 0) return '';
    // Firestore Timestamp has toMillis or seconds
    try {
      if (val?.toMillis && typeof val.toMillis === 'function') {
        const d = new Date(val.toMillis());
        return d.toISOString().slice(0,10);
      }
      if (val?.seconds && typeof val.seconds === 'number') {
        const d = new Date(val.seconds * 1000);
        return d.toISOString().slice(0,10);
      }
      if (val instanceof Date) {
        return val.toISOString().slice(0,10);
      }
      if (typeof val === 'number') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toISOString().slice(0,10);
      }
      if (typeof val === 'string') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? val.slice(0,10) : d.toISOString().slice(0,10);
      }
      return String(val);
    } catch (e) {
      return '';
    }
  }

  const CANONICAL_STATUSES = ['Active', 'Inactive', 'On Leave', 'Suspended', 'Former Staff'];

  // normalize departments and statuses to strings for selects
  const departmentsNormalized = [...new Set(staff.map(s => normalizeToString(s.department)).filter(Boolean))];
  const rawStatuses = staff.map(s => normalizeToString(s.status)).filter(Boolean);
  const statusesNormalized = Array.from(new Set([...CANONICAL_STATUSES, ...rawStatuses]));

  const getStatusBadgeStyle = (status) => {
    const s = status || 'Active';
    switch (s) {
      case 'Active':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Inactive':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      case 'On Leave':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Suspended':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Former Staff':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const isTeaching = (s) => {
    if (!s) return false;
    if (s.isClassTeacher) return true;
    if (Array.isArray(s.subjects) && s.subjects.length > 0) return true;
    if (s.role && /teacher/i.test(String(s.role))) return true;
    return false;
  }

  const fullyFiltered = staff.filter(s => {
    const q = (searchTerm || '').toLowerCase().trim();
    if (q) {
      const match = (
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.role || '').toLowerCase().includes(q) ||
        String(s.phone || '').toLowerCase().includes(q) ||
        String(s.email || '').toLowerCase().includes(q)
      );
      if (!match) return false;
    }
    if (staffTypeFilter === 'Teaching' && !isTeaching(s)) return false;
    if (staffTypeFilter === 'Non-Teaching' && isTeaching(s)) return false;
    if (departmentFilter !== 'All' && normalizeToString(s.department || 'Unassigned') !== departmentFilter) return false;
    if (statusFilter !== 'All' && normalizeToString(s.status || 'Unknown') !== statusFilter) return false;
    return true;
  });

  const teachingCount = staff.filter(isTeaching).length;
  const nonTeachingCount = staff.length - teachingCount;

  const rows = fullyFiltered.map(m => ({
    raw: m,
    id: normalizeToString(m.id || m.staffId || ''),
    staffId: normalizeToString(m.staffId || m.id || ''),
    name: normalizeToString(m.name || ''),
    photo: m.photoUrl || m.profilePhoto || m.photo || m.avatar || m.imageUrl || m.picture || '',
    role: normalizeToString(m.role || m.designation || ''),
    department: normalizeToString(m.department || ''),
    staffType: isTeaching(m) ? 'Teaching' : 'Non-Teaching',
    joinDate: formatDate(m.joinDate || m.createdAt),
    email: normalizeToString(m.email || ''),
    phone: normalizeToString(m.phone || ''),
    status: normalizeToString(m.status || '')
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Manager</h1>
          <p className="text-dark-muted mt-1">Manage all employees and teachers.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/school-admin/import')} className="premium-button-secondary">
              <UploadCloud size={18} />
              Import Excel/CSV
            </button>
            <button onClick={() => {
              // export currently filtered staff
              const rows = fullyFiltered.map(s => ({
                id: s.id,
                staffId: s.staffId || s.id,
                name: s.name || '',
                designation: s.role || s.designation || '',
                department: s.department || '',
                phone: s.phone || '',
                email: s.email || '',
                status: s.status || ''
              }));
              const header = Object.keys(rows[0] || {}).join(',');
              const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${String(v || '').replace(/"/g,'""')}"`).join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `staff-export-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
            }} className="premium-button-secondary">
              <Users size={18} />
              Export Staff
            </button>
            <button 
              onClick={() => navigate('/school-admin/staff-attendance')}
              className="premium-button-secondary"
              title="Staff Attendance Register"
            >
              <ClipboardCheck size={18} className="text-emerald-500" />
              Attendance
            </button>
            <button 
              onClick={() => navigate('/school-admin/staff/salary-setup')}
              className="premium-button-secondary"
              title="Staff Salary Setup"
            >
              <DollarSign size={18} className="text-indigo-500" />
              Salary Setup
            </button>
            <button 
              onClick={() => navigate('/school-admin/staff/payroll')}
              className="premium-button-secondary"
              title="Payroll & Payslips"
            >
              <Calculator size={18} className="text-amber-500" />
              Payroll
            </button>
            <button 
              onClick={() => navigate('/school-admin/staff/add')}
              className="premium-button-primary"
            >
              <Plus size={20} />
              Add Staff
            </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <h3 className="text-2xl font-bold">{staff.filter(s => (s.status || 'Active') === 'Active').length}</h3>
              <p className="text-xs text-dark-muted uppercase font-black tracking-widest">Active Staff</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6 border-l-4 border-purple-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
              <UserSquare2 size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{teachingCount}</h3>
              <p className="text-xs text-dark-muted uppercase font-black tracking-widest">Teaching Staff</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6 border-l-4 border-amber-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
              <UserSquare2 size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{nonTeachingCount}</h3>
              <p className="text-xs text-dark-muted uppercase font-black tracking-widest">Non-Teaching Staff</p>
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

          <div className="flex items-center gap-3">
            <select className="premium-input" value={staffTypeFilter} onChange={(e) => setStaffTypeFilter(e.target.value)}>
              <option value="All">All Types</option>
              <option value="Teaching">Teaching</option>
              <option value="Non-Teaching">Non-Teaching</option>
            </select>
            <select className="premium-input" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
              <option value="All">All Departments</option>
              {departmentsNormalized.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="premium-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              {statusesNormalized.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black">
                <th className="pb-4 px-4">Staff Member</th>
                <th className="pb-4 px-4">Designation</th>
                <th className="pb-4 px-4">Department</th>
                <th className="pb-4 px-4">Staff Type</th>
                <th className="pb-4 px-4">Joining Date</th>
                <th className="pb-4 px-4">Contact</th>
                <th className="pb-4 px-4">Status</th>
                <th className="pb-4 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {rows.map((r) => (
                <tr key={r.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold border border-primary-500/20 overflow-hidden shrink-0">
                        {r.photo ? (
                          <img
                            src={r.photo}
                            alt={r.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.parentElement) {
                                e.currentTarget.parentElement.innerText = String(r.name || '').charAt(0);
                              }
                            }}
                          />
                        ) : (
                          String(r.name || '').charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{r.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-dark-muted font-mono uppercase">ID: {r.staffId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.role}</p>
                  </td>
                  <td className="py-5 px-4 text-sm text-slate-600 dark:text-dark-muted">{r.department}</td>
                  <td className="py-5 px-4 text-sm text-slate-600 dark:text-dark-muted">{r.staffType}</td>
                  <td className="py-5 px-4 text-sm text-slate-600 dark:text-dark-muted">{r.joinDate}</td>
                  <td className="py-5 px-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-dark-muted">
                        <Mail size={12} /> {r.email}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-dark-muted">
                        <Phone size={12} /> {r.phone}
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${getStatusBadgeStyle(r.status)}`}>
                      {r.status || 'Active'}
                    </span>
                  </td>
                  <td className="py-5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button 
                        onClick={() => setTimeSlipStaff(r.raw || r)}
                        className="p-2 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 rounded-lg transition-colors cursor-pointer"
                        title="View Staff Time Slip (Kub Aaya / Kub Gya)"
                      >
                        <Clock size={16} />
                      </button>
                      <button 
                        onClick={() => navigate(`/school-admin/staff/salary-setup`)}
                        className="p-2 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors cursor-pointer"
                        title="Configure Salary"
                      >
                        <DollarSign size={16} />
                      </button>
                      <button 
                        onClick={() => navigate(`/school-admin/staff/${r.raw.id || r.raw.staffId || r.id}`)}
                        className="p-2 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors cursor-pointer"
                        title="View Profile"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => navigate(`/school-admin/staff/edit/${r.raw.id || r.raw.staffId || r.id}`)}
                        className="p-2 hover:bg-primary-500/10 text-slate-400 hover:text-primary-500 rounded-lg transition-colors cursor-pointer"
                        title="Edit Profile"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteStaff(r)}
                        className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        title="Delete Staff"
                      >
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

      {/* Staff Time Slip Modal */}
      {timeSlipStaff && (
        <StaffTimeSlipModal 
          staff={timeSlipStaff} 
          onClose={() => setTimeSlipStaff(null)} 
        />
      )}
    </div>
  );
};

export default StaffManager;
