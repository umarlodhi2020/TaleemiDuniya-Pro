import React, { useState } from 'react';
import { 
  School, 
  ArrowLeft, 
  Save, 
  Mail, 
  MapPin, 
  CreditCard,
  ShieldCheck,
  Globe,
  CheckCircle2,
  AlertCircle,
  Users,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

const AddSchool = () => {
  const navigate = useNavigate();
  const { createUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    adminEmail: '',
    adminPassword: '',
    city: '',
    address: '',
    plan: 'Premium',
    status: 'active',
    expiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    revenue: '',
    website: '',
    students: 0,
    staff: 0,
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Save school details to Firestore
      const docRef = await addDoc(collection(db, 'schools'), {
        name: formData.name.trim(),
        adminEmail: formData.adminEmail.trim().toLowerCase(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        plan: formData.plan,
        status: formData.status,
        expiry: formData.expiry,
        revenue: parseFloat(formData.revenue) || 0,
        website: formData.website.trim(),
        students: parseInt(formData.students) || 0,
        staff: parseInt(formData.staff) || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Automatically create the corresponding school-admin user account
      await createUser({
        email: formData.adminEmail.trim().toLowerCase(),
        password: formData.adminPassword,
        role: 'school-admin',
        name: `${formData.name.trim()} Admin`,
        schoolId: docRef.id,
      });

      showToast('success', `"${formData.name}" onboarded successfully and admin account created!`);
      setTimeout(() => navigate('/super-admin/schools'), 1800);
    } catch (error) {
      console.error('Error adding school:', error);
      if (error.code === 'auth/email-already-in-use') {
        showToast('error', 'Admin email is already in use. Use a unique email.');
      } else if (error.code === 'permission-denied') {
        showToast('error', 'Permission denied. Update your Firestore security rules.');
      } else {
        showToast('error', 'Failed to onboard school. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
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

      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl text-dark-muted transition-all">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Onboard New School</h1>
          <p className="text-dark-muted text-sm mt-0.5">Register a new school tenant on the platform.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* School Profile */}
          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary-500">
              <School size={20} /> School Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">School Full Name *</label>
                <div className="relative">
                  <School className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input name="name" required value={formData.name} onChange={handleChange}
                    className="w-full premium-input pl-12" placeholder="e.g. Beaconhouse School System" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Admin Email *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input name="adminEmail" type="email" required value={formData.adminEmail} onChange={handleChange}
                    className="w-full premium-input pl-12" placeholder="admin@school.com" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Admin Password *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input name="adminPassword" type="password" required minLength="6" value={formData.adminPassword} onChange={handleChange}
                    className="w-full premium-input pl-12" placeholder="••••••••" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">City *</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input name="city" required value={formData.city} onChange={handleChange}
                    className="w-full premium-input pl-12" placeholder="e.g. Lahore" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Website</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input name="website" value={formData.website} onChange={handleChange}
                    className="w-full premium-input pl-12" placeholder="https://school.edu.pk" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Monthly Revenue (PKR)</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input name="revenue" type="number" min="0" value={formData.revenue} onChange={handleChange}
                    className="w-full premium-input pl-12" placeholder="e.g. 8000" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Est. Students</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input name="students" type="number" min="0" value={formData.students} onChange={handleChange}
                    className="w-full premium-input pl-12" placeholder="e.g. 500" />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Physical Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange}
                  className="w-full premium-input h-24 py-4" placeholder="Complete school address..." />
              </div>
            </div>
          </GlassCard>

          {/* Subscription */}
          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary-500">
              <ShieldCheck size={20} /> Subscription Setup
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Plan Type</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <select name="plan" value={formData.plan} onChange={handleChange}
                    className="w-full premium-input pl-12 appearance-none bg-dark-card">
                    <option value="Basic">Basic Plan</option>
                    <option value="Premium">Premium Plan</option>
                    <option value="Enterprise">Enterprise Plan</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Expiry Date</label>
                <input name="expiry" type="date" value={formData.expiry} onChange={handleChange}
                  className="w-full premium-input" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Status</label>
                <select name="status" value={formData.status} onChange={handleChange}
                  className="w-full premium-input appearance-none bg-dark-card">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6">Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-muted">School</span>
                <span className="font-bold text-right max-w-[160px] truncate">{formData.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-muted">City</span>
                <span className="font-bold">{formData.city || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-muted">Plan</span>
                <span className="font-bold text-primary-400">{formData.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-muted">Status</span>
                <span className={`font-bold uppercase tracking-widest ${formData.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                  {formData.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-muted">Expiry</span>
                <span className="font-bold">{formData.expiry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-muted">Revenue/mo</span>
                <span className="font-bold text-amber-400">PKR {parseFloat(formData.revenue || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-8">
              <button type="submit" disabled={loading} className="w-full premium-button-primary">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Saving to Database...
                  </span>
                ) : (
                  <><Save size={18} /> Onboard School</>
                )}
              </button>
            </div>

            <p className="text-xs text-dark-muted text-center mt-4 leading-relaxed">
              School data will be saved to Firestore and immediately visible in the Schools list.
            </p>
          </GlassCard>
        </div>
      </form>
    </div>
  );
};

export default AddSchool;
