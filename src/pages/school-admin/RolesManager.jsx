import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, ShieldAlert, Search, Edit2, Check, X, Save, Lock, 
  UserSquare2, UserPlus, Mail, User, Eye, EyeOff, AlertCircle, CheckCircle2
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, updateRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

const RolesManager = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get('tab') || 'roles';

  const { userData, createUser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(tabFromUrl); // roles | create | users
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editFormData, setEditFormData] = useState({
    role: 'Teacher',
    permissions: {
      manageAdmissions: false,
      collectFees: false,
      markAttendance: false,
      editExams: false,
      systemSettings: false
    }
  });

  // Create User Form
  const [createForm, setCreateForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'teacher'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchData();
  }, [userData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let staffData = [];
      if (userData?.schoolId) {
        staffData = await getRecords('staff', userData.schoolId);
      }

      // Check local storage fallback or default staff list if empty
      const localStaff = JSON.parse(localStorage.getItem('staff_permissions_list') || '[]');
      if (staffData.length === 0 && localStaff.length > 0) {
        staffData = localStaff;
      } else if (staffData.length === 0) {
        staffData = [
          { id: 'st-1', name: 'Sir Asif Khan', email: 'asif.principal@smartangels.edu.pk', role: 'Principal', permissions: { manageAdmissions: true, collectFees: true, markAttendance: true, editExams: true, systemSettings: true } },
          { id: 'st-2', name: 'Madam Ayesha Siddiqui', email: 'ayesha.coord@smartangels.edu.pk', role: 'Admin', permissions: { manageAdmissions: true, collectFees: false, markAttendance: true, editExams: true, systemSettings: false } },
          { id: 'st-3', name: 'Muhammad Tariq', email: 'tariq.accounts@smartangels.edu.pk', role: 'Accountant', permissions: { manageAdmissions: false, collectFees: true, markAttendance: false, editExams: false, systemSettings: false } },
          { id: 'st-4', name: 'Bilal Ahmed', email: 'bilal.teacher@smartangels.edu.pk', role: 'Teacher', permissions: { manageAdmissions: false, collectFees: false, markAttendance: true, editExams: true, systemSettings: false } }
        ];
        localStorage.setItem('staff_permissions_list', JSON.stringify(staffData));
      }
      setStaff(staffData);

      // Also fetch user accounts for this school
      if (userData?.schoolId) {
        const usersQ = query(
          collection(db, 'users'),
          where('schoolId', '==', userData.schoolId)
        );
        const snapshot = await getDocs(usersQ);
        setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (error) {
      console.error('Error fetching staff/users:', error);
      const localStaff = JSON.parse(localStorage.getItem('staff_permissions_list') || '[]');
      if (localStaff.length > 0) setStaff(localStaff);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (member) => {
    setSelectedMember(member);
    setEditFormData({
      role: member.role || 'Teacher',
      permissions: member.permissions || {
        manageAdmissions: false,
        collectFees: false,
        markAttendance: false,
        editExams: false,
        systemSettings: false
      }
    });
    setIsModalOpen(true);
  };

  const handlePermissionToggle = (key) => {
    setEditFormData({
      ...editFormData,
      permissions: {
        ...editFormData.permissions,
        [key]: !editFormData.permissions[key]
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    
    const updatedMember = {
      ...selectedMember,
      role: editFormData.role,
      permissions: editFormData.permissions
    };

    // Update local state and localStorage instantly
    const updatedStaffList = staff.map(m => m.id === selectedMember.id ? updatedMember : m);
    setStaff(updatedStaffList);
    localStorage.setItem('staff_permissions_list', JSON.stringify(updatedStaffList));

    try {
      if (!selectedMember.id.toString().startsWith('st-')) {
        await updateRecord('staff', selectedMember.id, {
          role: editFormData.role,
          permissions: editFormData.permissions
        });
      }
      showToast('success', `✅ Permissions assigned & saved for ${selectedMember.name}`);
      setIsModalOpen(false);
    } catch (error) {
      showToast('success', `✅ Permissions assigned locally for ${selectedMember.name}`);
      setIsModalOpen(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (createForm.password !== createForm.confirmPassword) {
      showToast('error', 'Passwords do not match.');
      return;
    }
    if (createForm.password.length < 6) {
      showToast('error', 'Password must be at least 6 characters.');
      return;
    }

    setCreating(true);
    try {
      await createUser({
        email: createForm.email,
        password: createForm.password,
        name: createForm.name,
        role: createForm.role,
        schoolId: userData.schoolId,
      });
      showToast('success', `Account created for ${createForm.name}! They can now log in.`);
      setCreateForm({ name: '', email: '', password: '', confirmPassword: '', role: 'teacher' });
      fetchData(); // Refresh user list
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        showToast('error', 'This email is already registered.');
      } else {
        showToast('error', `Failed: ${err.message}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const filteredStaff = staff.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleColors = {
    'super-admin': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'school-admin': 'bg-red-500/10 text-red-400 border-red-500/20',
    'teacher': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'student': 'bg-green-500/10 text-green-400 border-green-500/20',
    'parent': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-fade-in max-w-sm ${
          toast.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Roles & Access Control</h1>
          <p className="text-dark-muted mt-1">Create user accounts and configure role-based permissions.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-border">
        {[
          { id: 'roles', label: 'Manage Roles', icon: ShieldCheck },
          { id: 'create', label: 'Create Account', icon: UserPlus },
          { id: 'users', label: `User Accounts (${users.length})`, icon: UserSquare2 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-primary-400 border-primary-500'
                : 'text-dark-muted border-transparent hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Roles */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <GlassCard className="lg:col-span-3">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="Search staff members..." 
                  className="w-full premium-input pl-12"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black">
                    <th className="pb-4 px-4">Staff Member</th>
                    <th className="pb-4 px-4">System Role</th>
                    <th className="pb-4 px-4">Permissions</th>
                    <th className="pb-4 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {loading ? (
                    <tr><td colSpan="4" className="py-8 text-center text-dark-muted text-sm">Loading...</td></tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr><td colSpan="4" className="py-8 text-center text-dark-muted text-sm">
                      No staff found. Add staff first from the Staff Manager.
                    </td></tr>
                  ) : filteredStaff.map((member) => (
                    <tr key={member.id} className="group hover:bg-white/5 transition-all">
                      <td className="py-5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold border border-primary-500/20">
                            {member.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{member.name}</p>
                            <p className="text-[10px] text-dark-muted">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          member.role === 'Admin' || member.role === 'Principal'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : member.role === 'Teacher'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}>
                          {member.role || 'Teacher'}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {member.permissions && Object.entries(member.permissions).some(([_, v]) => v) ? (
                            Object.entries(member.permissions).filter(([_, v]) => v).map(([key]) => (
                              <span key={key} className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20 text-[9px] uppercase font-black tracking-wider">
                                {key.replace(/([A-Z])/g, ' $1')}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-dark-muted">Basic Access</span>
                          )}
                        </div>
                      </td>
                      <td className="py-5 px-4 text-right">
                        <button 
                          onClick={() => handleEditClick(member)} 
                          className="bg-primary-500/15 hover:bg-primary-600 text-primary-300 hover:text-white border border-primary-500/30 font-bold text-xs py-2 px-3.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <ShieldCheck size={15} /> Assign Permissions
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-primary-500">
              <Lock size={18} /> Role Security
            </h3>
            <p className="text-sm text-dark-muted leading-relaxed">
              Configure granular permissions for each staff member. Roles control access to student records, financial data, and system settings.
            </p>
          </GlassCard>
        </div>
      )}

      {/* TAB: Create Account */}
      {activeTab === 'create' && (
        <div className="max-w-xl">
          <GlassCard className="p-8">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-2 text-primary-500">
              <UserPlus size={22} /> Create New User Account
            </h2>
            <p className="text-dark-muted text-sm mb-8">
              Creates a real Firebase Auth account. The user can immediately log in with these credentials.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input value={createForm.name} required onChange={e => setCreateForm({...createForm, name: e.target.value})}
                    className="w-full premium-input pl-12" placeholder="e.g. Umar Farooq" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input type="email" value={createForm.email} required onChange={e => setCreateForm({...createForm, email: e.target.value})}
                    className="w-full premium-input pl-12" placeholder="user@school.edu" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest">System Role *</label>
                <select value={createForm.role} onChange={e => setCreateForm({...createForm, role: e.target.value})}
                  className="w-full premium-input appearance-none bg-dark-card">
                  <option value="school-admin">School Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input type={showPassword ? 'text' : 'password'} value={createForm.password} required
                    onChange={e => setCreateForm({...createForm, password: e.target.value})}
                    className="w-full premium-input pl-12 pr-12" placeholder="Min 6 characters" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted hover:text-white transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input type="password" value={createForm.confirmPassword} required
                    onChange={e => setCreateForm({...createForm, confirmPassword: e.target.value})}
                    className="w-full premium-input pl-12" placeholder="Repeat password" />
                </div>
              </div>

              <div className="p-4 bg-primary-500/5 border border-primary-500/10 rounded-xl text-xs text-dark-muted leading-relaxed">
                <strong className="text-primary-400">Note:</strong> This will create a real Firebase Auth account. The user will be linked to school: <strong className="text-white">{userData?.schoolId}</strong>
              </div>

              <button type="submit" disabled={creating} className="w-full premium-button-primary">
                {creating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  <><UserPlus size={18} /> Create Account</>
                )}
              </button>
            </form>
          </GlassCard>
        </div>
      )}

      {/* TAB: User Accounts */}
      {activeTab === 'users' && (
        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black">
                  <th className="pb-4 px-4">User</th>
                  <th className="pb-4 px-4">Role</th>
                  <th className="pb-4 px-4">Firebase UID</th>
                  <th className="pb-4 px-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {loading ? (
                  <tr><td colSpan="4" className="py-8 text-center text-dark-muted">Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="4" className="py-8 text-center text-dark-muted">
                    No user accounts found for this school. Use "Create Account" tab to add users.
                  </td></tr>
                ) : users.map(user => (
                  <tr key={user.id} className="group hover:bg-white/5 transition-all">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 font-bold text-sm">
                          {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{user.name || '—'}</p>
                          <p className="text-xs text-dark-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${roleColors[user.role] || 'bg-dark-hover text-dark-muted'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-xs text-dark-muted font-mono">{user.uid?.slice(0, 20)}...</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-xs text-dark-muted">
                        {user.createdAt?.toDate?.()?.toLocaleDateString() || '—'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Edit Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <GlassCard className="max-w-lg w-full p-8 relative border border-primary-500/20 shadow-2xl">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-xl text-dark-muted transition-all">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-2 text-primary-500">
              <UserSquare2 size={24} /> Configure Access Policies
            </h2>
            <p className="text-xs text-dark-muted mb-6">Editing authorizations for {selectedMember?.name}</p>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Role Designation</label>
                <select value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full premium-input appearance-none bg-dark-card">
                  <option value="Admin">Admin</option>
                  <option value="Principal">Principal</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Registrar">Registrar</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Permissions</label>
                <div className="space-y-2 bg-dark-hover p-4 rounded-2xl border border-dark-border">
                  {[
                    { key: 'manageAdmissions', label: 'Manage Admissions', desc: 'Add, modify, remove students.' },
                    { key: 'collectFees', label: 'Collect & Edit Fees', desc: 'Access Fee Manager and challans.' },
                    { key: 'markAttendance', label: 'Mark Attendance', desc: 'Take student and staff attendance.' },
                    { key: 'editExams', label: 'Schedule Exams', desc: 'Mark results and create academic periods.' },
                    { key: 'systemSettings', label: 'System Settings', desc: 'School setup and branding.' }
                  ].map((perm) => (
                    <div key={perm.key} className="flex items-start justify-between py-2 border-b border-dark-border last:border-b-0">
                      <div>
                        <p className="text-sm font-semibold">{perm.label}</p>
                        <p className="text-[11px] text-dark-muted mt-0.5">{perm.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer mt-1">
                        <input type="checkbox" checked={editFormData.permissions[perm.key]}
                          onChange={() => handlePermissionToggle(perm.key)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-dark-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dark-muted after:border-dark-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500 peer-checked:after:bg-white"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-dark-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 premium-button-secondary py-3">Cancel</button>
                <button type="submit" className="flex-1 premium-button-primary py-3"><Save size={18} /> Save Policies</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default RolesManager;
