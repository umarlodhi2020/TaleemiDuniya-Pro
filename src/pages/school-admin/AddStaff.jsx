import React, { useState } from 'react';
import { 
  Save, 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  ShieldCheck,
  Calendar,
  CreditCard,
  ChevronDown,
  Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const AddStaff = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    department: '',
    email: '',
    phone: '',
    cnic: '',
    salary: '',
    joinDate: new Date().toISOString().split('T')[0],
    address: '',
    status: 'Active'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await addRecord('staff', formData, userData?.schoolId || 'default-school');
      if (result.success) {
        alert('Staff member added successfully!');
        navigate('/school-admin/staff');
      } else {
        alert('Error: ' + result.error.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-dark-hover rounded-xl text-dark-muted transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Add Staff Member</h1>
          <p className="text-dark-muted text-sm mt-0.5">Register a new teacher or employee to the school.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <User size={18} className="text-primary-500" /> Personal Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="text" 
                    name="name"
                    required
                    placeholder="Staff Full Name" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="email" 
                    name="email"
                    required
                    placeholder="email@school.com" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="tel" 
                    name="phone"
                    required
                    placeholder="+92 XXX XXXXXXX" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">CNIC / ID Number</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="text" 
                    name="cnic"
                    required
                    placeholder="XXXXX-XXXXXXX-X" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Home Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 text-dark-muted" size={18} />
                <textarea 
                  name="address"
                  rows="2"
                  placeholder="Permanent Address" 
                  className="w-full premium-input pl-12 resize-none"
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Briefcase size={18} className="text-primary-500" /> Employment Info
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Designation</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="text" 
                    name="role"
                    required
                    placeholder="e.g. Science Teacher" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Department</label>
                <div className="relative">
                  <select 
                    name="department"
                    required
                    className="w-full premium-input appearance-none"
                    onChange={handleChange}
                  >
                    <option value="">Select Department</option>
                    <option value="Academic">Academic</option>
                    <option value="Management">Management</option>
                    <option value="Accounts">Accounts</option>
                    <option value="Support">Support Staff</option>
                    <option value="IT">IT Department</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Monthly Salary</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="number" 
                    name="salary"
                    required
                    placeholder="Amount in PKR" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Joining Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="date" 
                    name="joinDate"
                    required
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-8 text-center flex flex-col items-center">
            <h2 className="text-lg font-bold mb-6 w-full text-left">Staff Photo</h2>
            <div className="w-32 h-32 rounded-full bg-dark-hover border-2 border-dashed border-dark-border flex flex-col items-center justify-center gap-2 group cursor-pointer hover:border-primary-500 transition-all relative overflow-hidden">
              <Camera size={32} className="text-dark-muted group-hover:text-primary-500 transition-all" />
              <span className="text-[10px] uppercase font-black tracking-widest text-dark-muted group-hover:text-primary-500">Upload</span>
            </div>
            <p className="text-[10px] text-dark-muted mt-4">Passport size photo, max 1MB</p>
          </GlassCard>

          <div className="space-y-3">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full premium-button-primary disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Staff Record'}
            </button>
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              className="w-full premium-button-secondary"
            >
              Discard
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddStaff;
