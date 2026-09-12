import React, { useState, useEffect } from 'react';
import { 
  School, 
  ArrowLeft, 
  Save, 
  Mail, 
  MapPin, 
  CreditCard,
  ShieldCheck,
  Globe,
  Loader2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { getSingleRecord, updateRecord } from '../../services/db';

const EditSchool = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    adminEmail: '',
    city: '',
    address: '',
    plan: 'Premium',
    status: 'active',
    expiry: '',
    revenue: 0,
    website: ''
  });

  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        const data = await getSingleRecord('schools', schoolId);
        if (data) {
          setFormData({
            name: data.name || '',
            adminEmail: data.adminEmail || '',
            city: data.city || '',
            address: data.address || '',
            plan: data.plan || 'Premium',
            status: data.status || 'active',
            expiry: data.expiry || '',
            revenue: data.revenue || 0,
            website: data.website || ''
          });
        } else {
          alert('School not found!');
          navigate('/super-admin/schools');
        }
      } catch (error) {
        console.error("Error loading school details:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchSchoolData();
  }, [schoolId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await updateRecord('schools', schoolId, formData);
      if (result.success) {
        alert('School details updated successfully!');
        navigate('/super-admin/schools');
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error(error);
      alert('Error updating school details.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (fetching) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl text-dark-muted transition-all">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Edit School Details</h1>
          <p className="text-dark-muted text-sm mt-0.5">Modify subscription, plan, and profiles for {formData.name}.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary-500">
              <School size={20} /> School Profile
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">School Full Name</label>
                <div className="relative">
                  <School className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full premium-input pl-12" 
                    placeholder="e.g. Beaconhouse School System"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    name="adminEmail"
                    type="email"
                    required
                    value={formData.adminEmail}
                    onChange={handleChange}
                    className="w-full premium-input pl-12" 
                    placeholder="admin@school.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">City</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full premium-input pl-12" 
                    placeholder="e.g. Lahore"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Website URL</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full premium-input pl-12" 
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Physical Address</label>
                <textarea 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full premium-input h-24 py-4" 
                  placeholder="Complete school address..."
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary-500">
              <ShieldCheck size={20} /> Subscription & Tenant Status
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Plan Type</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <select 
                    name="plan"
                    value={formData.plan}
                    onChange={handleChange}
                    className="w-full premium-input pl-12 appearance-none bg-dark-card"
                  >
                    <option value="Basic">Basic Plan</option>
                    <option value="Premium">Premium Plan</option>
                    <option value="Enterprise">Enterprise Plan</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Subscription Expiry</label>
                <input 
                  name="expiry"
                  type="date"
                  value={formData.expiry}
                  onChange={handleChange}
                  className="w-full premium-input" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Tenant Status</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full premium-input bg-dark-card"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6">Modify School</h2>
            <p className="text-xs text-dark-muted mb-6 leading-relaxed">
              Updating these fields immediately shifts the school's billing tier and modifies client feature access across all tenant profiles.
            </p>
            <div className="mt-10">
              <button 
                type="submit"
                disabled={loading}
                className="w-full premium-button-primary"
              >
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Updates'}
              </button>
            </div>
          </GlassCard>
        </div>
      </form>
    </div>
  );
};

export default EditSchool;
