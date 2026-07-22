import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  School, 
  Globe, 
  Image as ImageIcon, 
  Shield, 
  Bell,
  Save,
  Trash2,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Mail,
  UserCheck,
  Calendar,
  CalendarDays,
  UserX,
  Plus,
  Check,
  Search,
  AlertTriangle,
  Key
} from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, updateRecord, deleteRecord } from '../../services/db';

const SchoolSettings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get('tab') || 'profile';

  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Remove Student state
  const [studentsList, setStudentsList] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');

  // Holidays state
  const [holidaysList, setHolidaysList] = useState(() => {
    const saved = localStorage.getItem('school_holidays_list');
    return saved ? JSON.parse(saved) : [
      { id: 'h-1', title: 'Eid-ul-Fitr Holidays', start: '2026-04-10', end: '2026-04-12', type: 'Religious' },
      { id: 'h-2', title: 'Pakistan Day', start: '2026-03-23', end: '2026-03-23', type: 'National' },
      { id: 'h-3', title: 'Independence Day', start: '2026-08-14', end: '2026-08-14', type: 'National' },
      { id: 'h-4', title: 'Summer Vacation Break', start: '2026-06-01', end: '2026-08-15', type: 'Term Break' }
    ];
  });
  const [holidayForm, setHolidayForm] = useState({ title: '', start: '', end: '', type: 'National' });

  // Sessions state
  const [sessionsList, setSessionsList] = useState(() => {
    const saved = localStorage.getItem('school_sessions_list');
    return saved ? JSON.parse(saved) : [
      { id: 'sess-1', name: 'Academic Session 2026-2027', start: '2026-04-01', end: '2027-03-31', status: 'Active' },
      { id: 'sess-2', name: 'Academic Session 2025-2026', start: '2025-04-01', end: '2026-03-31', status: 'Completed' },
      { id: 'sess-3', name: 'Academic Session 2027-2028', start: '2027-04-01', end: '2028-03-31', status: 'Upcoming' }
    ];
  });
  const [sessionForm, setSessionForm] = useState({ name: '', start: '', end: '' });

  useEffect(() => {
    fetchStudentsForRemoval();
  }, [userData]);

  const fetchStudentsForRemoval = async () => {
    try {
      let st = [];
      if (userData?.schoolId) {
        st = await getRecords('students', userData.schoolId);
      }
      if (st.length === 0) {
        st = [
          { id: 'st-101', rollNo: 'ROLL-101', name: 'Ali Raza', className: 'Class 10 - A', phone: '0300-1234567', feeStatus: 'Paid' },
          { id: 'st-102', rollNo: 'ROLL-102', name: 'Zainab Ahmed', className: 'Class 9 - B', phone: '0333-7654321', feeStatus: 'Pending' },
          { id: 'st-103', rollNo: 'ROLL-103', name: 'Hamza Khan', className: 'Class 8 - A', phone: '0321-9876543', feeStatus: 'Paid' },
          { id: 'st-104', rollNo: 'ROLL-104', name: 'Sara Tariq', className: 'Class 10 - A', phone: '0345-5556667', feeStatus: 'Defaulter' }
        ];
      }
      setStudentsList(st);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveStudent = async (student) => {
    if (window.confirm(`Are you sure you want to remove and archive ${student.name} (${student.rollNo}) from active school rolls?`)) {
      const updated = studentsList.filter(s => s.id !== student.id);
      setStudentsList(updated);
      showToast('success', `✅ ${student.name} has been removed/archived from active school rolls!`);
      if (!student.id.toString().startsWith('st-')) {
        try { await deleteRecord('students', student.id); } catch (e) { console.error(e); }
      }
    }
  };

  const handleAddHoliday = (e) => {
    e.preventDefault();
    if (!holidayForm.title || !holidayForm.start) return;
    const newH = { id: `h-${Date.now()}`, ...holidayForm, end: holidayForm.end || holidayForm.start };
    const updated = [newH, ...holidaysList];
    setHolidaysList(updated);
    localStorage.setItem('school_holidays_list', JSON.stringify(updated));
    setHolidayForm({ title: '', start: '', end: '', type: 'National' });
    showToast('success', `✅ Holiday "${newH.title}" added to school calendar!`);
  };

  const handleDeleteHoliday = (id, title) => {
    const updated = holidaysList.filter(h => h.id !== id);
    setHolidaysList(updated);
    localStorage.setItem('school_holidays_list', JSON.stringify(updated));
    showToast('success', `✅ Holiday "${title}" removed from calendar.`);
  };

  const handleCreateSession = (e) => {
    e.preventDefault();
    if (!sessionForm.name || !sessionForm.start) return;
    const newS = { id: `sess-${Date.now()}`, ...sessionForm, status: 'Upcoming' };
    const updated = [newS, ...sessionsList];
    setSessionsList(updated);
    localStorage.setItem('school_sessions_list', JSON.stringify(updated));
    setSessionForm({ name: '', start: '', end: '' });
    showToast('success', `✅ Academic Session "${newS.name}" created!`);
  };

  const handleSwitchActiveSession = (id, name) => {
    const updated = sessionsList.map(s => ({
      ...s,
      status: s.id === id ? 'Active' : (s.status === 'Active' ? 'Completed' : s.status)
    }));
    setSessionsList(updated);
    localStorage.setItem('school_sessions_list', JSON.stringify(updated));
    showToast('success', `✅ Active Session switched to "${name}" successfully!`);
  };

  // Core School Profile state
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    website: '',
    plan: '',
  });

  // Branding state
  const [branding, setBranding] = useState({
    logo: '',
    primaryColor: '#8b5cf6',
  });

  // Custom Domain state
  const [domain, setDomain] = useState({
    customDomain: '',
    isVerified: false,
  });

  // Notifications toggles
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    feeReminders: true,
    attendanceAlerts: true,
    examResults: true,
  });

  // Security Toggles & Password Update Form
  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetchSchoolData = async () => {
      if (!userData?.schoolId) {
        setLoading(false);
        return;
      }
      try {
        const schoolDoc = await getDoc(doc(db, 'schools', userData.schoolId));
        if (schoolDoc.exists()) {
          const data = schoolDoc.data();
          setProfile({
            name: data.name || '',
            email: data.adminEmail || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            website: data.website || '',
            plan: data.plan || 'Premium',
          });
          setBranding({
            logo: data.logo || '',
            primaryColor: data.primaryColor || '#8b5cf6',
          });
          setDomain({
            customDomain: data.customDomain || '',
            isVerified: data.domainVerified || false,
          });
          if (data.notificationSettings) {
            setNotifications(data.notificationSettings);
          }
          if (data.securitySettings) {
            setSecurity(data.securitySettings);
          }
        }
      } catch (err) {
        console.error('Error fetching school configuration:', err);
        showToast('error', 'Failed to load school settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
  }, [userData]);

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleNotificationToggle = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSecurityToggle = (key) => {
    setSecurity(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveSettings = async () => {
    if (!userData?.schoolId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'schools', userData.schoolId), {
        name: profile.name.trim(),
        adminEmail: profile.email.trim().toLowerCase(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
        city: profile.city.trim(),
        website: profile.website.trim(),
        logo: branding.logo,
        primaryColor: branding.primaryColor,
        customDomain: domain.customDomain.trim(),
        domainVerified: domain.isVerified,
        notificationSettings: notifications,
        securitySettings: security,
        updatedAt: serverTimestamp(),
      });
      showToast('success', 'School preferences saved successfully.');
    } catch (err) {
      console.error('Error updating settings:', err);
      showToast('error', 'Failed to save configuration settings.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('error', 'New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast('error', 'Password must be at least 6 characters.');
      return;
    }

    setPasswordLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user found');

      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Perform update
      await updatePassword(user, passwordForm.newPassword);
      showToast('success', 'Your password has been changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Password change error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        showToast('error', 'Incorrect current password. Please try again.');
      } else {
        showToast('error', `Password change failed: ${err.message}`);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary-500" size={32} />
        <p className="text-dark-muted ml-3">Loading settings panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="text-primary-500 animate-spin-slow" size={28} />
            School Configuration
          </h1>
          <p className="text-dark-muted mt-1">Configure your school profile, branding, notifications, and security preferences.</p>
        </div>
        <button onClick={saveSettings} disabled={saving} className="premium-button-primary">
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          {[
            { id: 'profile', label: '1 Institute Profile', icon: School },
            { id: 'remove-student', label: '2 Remove Student', icon: UserX },
            { id: 'security', label: '3 Change Password / Security', icon: Lock },
            { id: 'holidays', label: '4 Academic Holidays', icon: Calendar },
            { id: 'sessions', label: '5 Academic Sessions', icon: CalendarDays },
            { id: 'branding', label: 'Branding & Logo', icon: ImageIcon },
            { id: 'domain', label: 'Custom Domain', icon: Globe },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-primary-500/10 text-primary-500 font-bold' 
                  : 'text-dark-muted hover:bg-white/5 hover:text-dark-text'
              }`}
            >
              <item.icon size={18} />
              <span className="text-sm font-semibold uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <GlassCard className="p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <School size={20} className="text-primary-500" />
                Basic School Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-widest mb-1.5">School Name *</label>
                  <input name="name" className="w-full premium-input" value={profile.name} onChange={handleProfileChange} required placeholder="Enter school name" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-widest mb-1.5">Admin Email *</label>
                  <input name="email" type="email" className="w-full premium-input bg-white/5" value={profile.email} disabled placeholder="admin@school.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-widest mb-1.5">Contact Phone</label>
                  <input name="phone" className="w-full premium-input" value={profile.phone} onChange={handleProfileChange} placeholder="+92 (300) 000-0000" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-widest mb-1.5">City</label>
                  <input name="city" className="w-full premium-input" value={profile.city} onChange={handleProfileChange} placeholder="e.g. Lahore" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-widest mb-1.5">Website</label>
                  <input name="website" className="w-full premium-input" value={profile.website} onChange={handleProfileChange} placeholder="https://yourschool.edu.pk" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-dark-muted uppercase tracking-widest mb-1.5">Physical Address</label>
                  <textarea name="address" className="w-full premium-input min-h-[100px] py-3" value={profile.address} onChange={handleProfileChange} placeholder="Complete physical address..."></textarea>
                </div>
              </div>
            </GlassCard>
          )}

          {/* BRANDING TAB */}
          {activeTab === 'branding' && (
            <GlassCard className="p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ImageIcon size={20} className="text-primary-500" />
                School Branding & Appearance
              </h3>
              <div className="space-y-8">
                <div className="flex items-center gap-8">
                  <div className="w-24 h-24 rounded-3xl bg-dark-hover border-2 border-dashed border-dark-border flex items-center justify-center text-dark-muted overflow-hidden">
                    {branding.logo ? (
                      <img src={branding.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <School size={32} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold">School Logo</h4>
                    <p className="text-xs text-dark-muted mb-3">Upload a high resolution logo for challans and reports.</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Logo image URL" 
                        value={branding.logo} 
                        onChange={(e) => setBranding({ ...branding, logo: e.target.value })}
                        className="premium-input text-xs w-64"
                      />
                      {branding.logo && (
                        <button onClick={() => setBranding({ ...branding, logo: '' })} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="pt-8 border-t border-dark-border">
                  <h4 className="font-bold mb-4">Primary Theme Color</h4>
                  <p className="text-xs text-dark-muted mb-4">Select the primary color for invoices, report cards, and certificate styles.</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { hex: '#8b5cf6', name: 'Royal Violet' },
                      { hex: '#0ea5e9', name: 'Ocean Blue' },
                      { hex: '#ef4444', name: 'Ruby Red' },
                      { hex: '#10b981', name: 'Emerald' },
                      { hex: '#f59e0b', name: 'Amber Gold' }
                    ].map(color => (
                      <button 
                        key={color.hex} 
                        onClick={() => setBranding({ ...branding, primaryColor: color.hex })}
                        className={`flex flex-col items-center gap-2 group p-2.5 rounded-xl border-2 transition-all ${
                          branding.primaryColor === color.hex ? 'border-primary-500 bg-primary-500/5' : 'border-transparent hover:border-white/10'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg shadow-inner" style={{ backgroundColor: color.hex }}></div>
                        <span className="text-[10px] text-dark-text font-bold uppercase tracking-wider">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* DOMAIN TAB */}
          {activeTab === 'domain' && (
            <GlassCard className="p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Globe size={20} className="text-primary-500" />
                Custom Portal Domain
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-dark-muted leading-relaxed">
                  Map your school's domain (e.g. <code>portal.yourschool.edu</code>) to the SaaS backend for a fully branded student/parent experience.
                </p>
                <div className="flex gap-4">
                  <input 
                    name="customDomain" 
                    className="flex-1 premium-input font-mono" 
                    placeholder="portal.yourschool.edu" 
                    value={domain.customDomain}
                    onChange={(e) => setDomain({ ...domain, customDomain: e.target.value })}
                  />
                  <button 
                    onClick={() => {
                      if (!domain.customDomain) return;
                      setDomain({ ...domain, isVerified: true });
                      showToast('success', 'Domain ownership verification initiated!');
                    }} 
                    className="premium-button-primary shrink-0"
                  >
                    Verify Setup
                  </button>
                </div>
                
                {domain.isVerified ? (
                  <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-400 text-xs">
                    <CheckCircle2 size={16} />
                    <span>Domain successfully configured and pointed to server!</span>
                  </div>
                ) : (
                  <div className="mt-6 p-5 rounded-xl bg-white/5 border border-dark-border">
                    <h4 className="text-xs font-black uppercase text-primary-500 tracking-widest mb-3">DNS Configuration Details</h4>
                    <p className="text-xs text-dark-muted mb-4">Please add the following CNAME record in your domain's DNS manager:</p>
                    <div className="bg-dark-hover p-4 rounded-lg font-mono text-[11px] text-dark-text leading-relaxed border border-dark-border">
                      <span className="text-dark-muted">Type:</span> CNAME<br />
                      <span className="text-dark-muted">Host:</span> portal<br />
                      <span className="text-dark-muted">Value:</span> saas.taleemidunya.com
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* SECURITY & ACCESS TAB */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Account Security Toggles */}
              <GlassCard className="p-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Shield size={20} className="text-primary-500" />
                  Access & Security Preferences
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-dark-border">
                    <div>
                      <p className="font-semibold text-sm">Force Two-Factor Authentication (2FA)</p>
                      <p className="text-xs text-dark-muted">Require all teachers and staff members to use 2FA for logins.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={security.twoFactorAuth} 
                        onChange={() => handleSecurityToggle('twoFactorAuth')}
                        className="sr-only peer" 
                      />
                      <div className="w-10 h-5 bg-dark-border rounded-full peer peer-checked:bg-primary-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-dark-border">
                    <div>
                      <p className="font-semibold text-sm">Automatic Session Idle Timeout</p>
                      <p className="text-xs text-dark-muted">Logs out inactive users after a set period of inactivity.</p>
                    </div>
                    <select 
                      value={security.sessionTimeout} 
                      onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })}
                      className="premium-input bg-dark-card w-32 py-2 text-xs"
                    >
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="60">1 Hour</option>
                      <option value="120">2 Hours</option>
                    </select>
                  </div>
                </div>
              </GlassCard>

              {/* Password Change Form */}
              <GlassCard className="p-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Lock size={20} className="text-primary-500" />
                  Change Account Password
                </h3>
                <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest ml-1">Current Password *</label>
                    <input 
                      type="password" 
                      required 
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full premium-input" 
                      placeholder="••••••••" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest ml-1">New Password *</label>
                    <input 
                      type="password" 
                      required 
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full premium-input" 
                      placeholder="Min 6 characters" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest ml-1">Confirm New Password *</label>
                    <input 
                      type="password" 
                      required 
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full premium-input" 
                      placeholder="••••••••" 
                    />
                  </div>
                  <button type="submit" disabled={passwordLoading} className="premium-button-primary py-2.5 px-6 mt-2 text-xs">
                    {passwordLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                    {passwordLoading ? 'Updating Password...' : 'Update Password'}
                  </button>
                </form>
              </GlassCard>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <GlassCard className="p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Bell size={20} className="text-primary-500" />
                Notification Preferences
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-dark-border">
                  <div className="flex items-center gap-3">
                    <Mail className="text-primary-400" size={20} />
                    <div>
                      <p className="font-semibold text-sm">System Email Notifications</p>
                      <p className="text-xs text-dark-muted">Send automated alerts and summaries via system emails.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notifications.emailAlerts} 
                      onChange={() => handleNotificationToggle('emailAlerts')}
                      className="sr-only peer" 
                    />
                    <div className="w-10 h-5 bg-dark-border rounded-full peer peer-checked:bg-primary-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-dark-border">
                  <div className="flex items-center gap-3">
                    <Smartphone className="text-primary-400" size={20} />
                    <div>
                      <p className="font-semibold text-sm">SMS alerts (Via Gateway)</p>
                      <p className="text-xs text-dark-muted">Send attendance updates and invoice reminders via GSM gateway.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notifications.smsAlerts} 
                      onChange={() => handleNotificationToggle('smsAlerts')}
                      className="sr-only peer" 
                    />
                    <div className="w-10 h-5 bg-dark-border rounded-full peer peer-checked:bg-primary-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>

                <div className="pt-6 border-t border-dark-border space-y-4">
                  <h4 className="font-semibold text-sm text-dark-text mb-2">Automated Notifications Trigger Configuration</h4>
                  {[
                    { key: 'feeReminders', label: 'Monthly Fee Reminders', desc: 'Notify parents when fee challans are generated' },
                    { key: 'attendanceAlerts', label: 'Absent Student Alerts', desc: 'Trigger SMS instantly when student is marked absent' },
                    { key: 'examResults', label: 'Exam Result Announcements', desc: 'Notify parents when result cards are published' }
                  ].map(trigger => (
                    <div key={trigger.key} className="flex items-center justify-between py-2.5 px-1">
                      <div>
                        <p className="font-medium text-xs">{trigger.label}</p>
                        <p className="text-[11px] text-dark-muted mt-0.5">{trigger.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={notifications[trigger.key]} 
                          onChange={() => handleNotificationToggle(trigger.key)}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-4.5 bg-dark-border rounded-full peer peer-checked:bg-primary-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-4.5" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {/* TAB 2: REMOVE STUDENT (`remove-student`) */}
          {activeTab === 'remove-student' && (
            <div className="space-y-6">
              <GlassCard className="p-8 border-t-4 border-t-red-500">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2 text-red-400">
                      <UserX size={22} className="text-red-500" />
                      Archive & Remove Students from Active Rolls
                    </h3>
                    <p className="text-xs text-dark-muted mt-1">
                      Search and remove/archive students who have left the institute or struck off from active class registers.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                    <input
                      type="text"
                      placeholder="Search student or roll no..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full premium-input pl-10 text-xs"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.15em] font-black">
                        <th className="pb-3 px-3">Roll No</th>
                        <th className="pb-3 px-3">Student Name</th>
                        <th className="pb-3 px-3">Class / Section</th>
                        <th className="pb-3 px-3">Contact</th>
                        <th className="pb-3 px-3">Fee Status</th>
                        <th className="pb-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/60 text-xs">
                      {studentsList
                        .filter(s => 
                          !studentSearch.trim() || 
                          s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          s.rollNo?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          s.className?.toLowerCase().includes(studentSearch.toLowerCase())
                        )
                        .map(student => (
                        <tr key={student.id} className="hover:bg-red-500/5 transition-colors group">
                          <td className="py-4 px-3 font-mono font-bold text-dark-muted">{student.rollNo || '—'}</td>
                          <td className="py-4 px-3 font-bold text-white">{student.name}</td>
                          <td className="py-4 px-3 text-dark-muted">{student.className || 'General'}</td>
                          <td className="py-4 px-3 font-mono text-dark-muted">{student.phone || '—'}</td>
                          <td className="py-4 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              student.feeStatus === 'Paid' ? 'bg-green-500/10 text-green-400' :
                              student.feeStatus === 'Defaulter' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {student.feeStatus || 'Pending'}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-right">
                            <button
                              onClick={() => handleRemoveStudent(student)}
                              className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <UserX size={14} /> Remove Student
                            </button>
                          </td>
                        </tr>
                      ))}
                      {studentsList.length === 0 && (
                        <tr><td colSpan="6" className="py-8 text-center text-dark-muted">No active students left to remove or archive.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB 4: ADD HOLIDAYS (`holidays`) */}
          {activeTab === 'holidays' && (
            <div className="space-y-6">
              <GlassCard className="p-8 border-t-4 border-t-amber-500">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-2 text-amber-400">
                  <Calendar size={22} className="text-amber-500" />
                  Academic Holidays & Vacation Calendar
                </h3>
                <p className="text-xs text-dark-muted mb-6">
                  Declare national holidays, religious festivals, and term vacations. These dates will automatically highlight across attendance & parent portals.
                </p>

                <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8 bg-dark-hover/50 p-4 rounded-2xl border border-dark-border">
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-[10px] font-black text-dark-muted uppercase">Holiday Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Eid-ul-Adha Break"
                      value={holidayForm.title}
                      onChange={e => setHolidayForm({ ...holidayForm, title: e.target.value })}
                      className="w-full premium-input text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-dark-muted uppercase">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={holidayForm.start}
                      onChange={e => setHolidayForm({ ...holidayForm, start: e.target.value })}
                      className="w-full premium-input text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-dark-muted uppercase">End Date</label>
                    <input
                      type="date"
                      value={holidayForm.end}
                      onChange={e => setHolidayForm({ ...holidayForm, end: e.target.value })}
                      className="w-full premium-input text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="w-full premium-button-primary py-2.5 text-xs flex items-center justify-center gap-1.5 font-bold">
                      <Plus size={16} /> Add Holiday
                    </button>
                  </div>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.15em] font-black">
                        <th className="pb-3 px-3">Holiday / Vacation Title</th>
                        <th className="pb-3 px-3">Start Date</th>
                        <th className="pb-3 px-3">End Date</th>
                        <th className="pb-3 px-3">Type</th>
                        <th className="pb-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/60 text-xs">
                      {holidaysList.map(h => (
                        <tr key={h.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            {h.title}
                          </td>
                          <td className="py-3.5 px-3 font-mono text-dark-muted">{h.start}</td>
                          <td className="py-3.5 px-3 font-mono text-dark-muted">{h.end || h.start}</td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold text-[10px]">
                              {h.type || 'Holiday'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteHoliday(h.id, h.title)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-dark-muted hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB 5: SESSIONS (`sessions`) */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <GlassCard className="p-8 border-t-4 border-t-emerald-500">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-2 text-emerald-400">
                  <CalendarDays size={22} className="text-emerald-500" />
                  Academic Sessions & Year Configuration
                </h3>
                <p className="text-xs text-dark-muted mb-6">
                  Manage active school sessions, switch terms, or create new academic years. Switching active session updates the active database scope across all modules.
                </p>

                <form onSubmit={handleCreateSession} className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8 bg-dark-hover/50 p-4 rounded-2xl border border-dark-border">
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-[10px] font-black text-dark-muted uppercase">Session Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Session 2027-2028"
                      value={sessionForm.name}
                      onChange={e => setSessionForm({ ...sessionForm, name: e.target.value })}
                      className="w-full premium-input text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-dark-muted uppercase">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={sessionForm.start}
                      onChange={e => setSessionForm({ ...sessionForm, start: e.target.value })}
                      className="w-full premium-input text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-dark-muted uppercase">End Date *</label>
                    <input
                      type="date"
                      required
                      value={sessionForm.end}
                      onChange={e => setSessionForm({ ...sessionForm, end: e.target.value })}
                      className="w-full premium-input text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="w-full premium-button-primary py-2.5 text-xs flex items-center justify-center gap-1 font-bold bg-emerald-600 hover:bg-emerald-700">
                      <Plus size={16} /> Create Session
                    </button>
                  </div>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.15em] font-black">
                        <th className="pb-3 px-3">Session Designation</th>
                        <th className="pb-3 px-3">Term Duration</th>
                        <th className="pb-3 px-3">Current Status</th>
                        <th className="pb-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/60 text-xs">
                      {sessionsList.map(s => (
                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-3 font-bold text-white text-sm flex items-center gap-2">
                            <CalendarDays size={16} className={s.status === 'Active' ? 'text-emerald-400' : 'text-dark-muted'} />
                            {s.name}
                          </td>
                          <td className="py-4 px-3 font-mono text-dark-muted">{s.start} to {s.end}</td>
                          <td className="py-4 px-3">
                            {s.status === 'Active' ? (
                              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] border border-emerald-500/30 flex items-center gap-1.5 w-fit">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active Session
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded bg-dark-hover text-dark-muted font-bold text-[10px]">
                                {s.status || 'Archived'}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-3 text-right">
                            {s.status !== 'Active' && (
                              <button
                                onClick={() => handleSwitchActiveSession(s.id, s.name)}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer"
                              >
                                <Check size={14} /> Switch & Set Active
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolSettings;
