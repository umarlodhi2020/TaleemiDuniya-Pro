import React, { useState } from 'react';
import { 
  Save, 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  BookOpen, 
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const AddInquiry = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    classInterest: '',
    source: 'Walk-in',
    message: '',
    status: 'Pending'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await addRecord('inquiries', formData, userData?.schoolId || 'default-school');
      if (result.success) {
        alert('Inquiry saved successfully!');
        navigate('/school-admin/inquiries');
      } else {
        alert('Error saving inquiry: ' + result.error.message);
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
          <h1 className="text-2xl font-bold">New Admission Inquiry</h1>
          <p className="text-dark-muted text-sm mt-0.5">Enter lead details to track potential admissions.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <User size={18} className="text-primary-500" /> Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Candidate Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="text" 
                    name="name"
                    required
                    placeholder="Full Name" 
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
                    placeholder="+92 3XX XXXXXXX" 
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
                    placeholder="example@mail.com" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Class of Interest</label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <select 
                    name="classInterest"
                    required
                    className="w-full premium-input pl-12 appearance-none"
                    onChange={handleChange}
                  >
                    <option value="">Select Class</option>
                    <option value="Playgroup">Playgroup</option>
                    <option value="Nursery">Nursery</option>
                    <option value="Prep">Prep</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                      <option key={c} value={c}>{c} Class</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Address</label>
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
              <MessageSquare size={18} className="text-primary-500" /> Additional Notes
            </h2>
            <textarea 
              name="message"
              rows="4"
              placeholder="Any specific requirements or notes about this inquiry..." 
              className="w-full premium-input resize-none"
              onChange={handleChange}
            ></textarea>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6">Inquiry Meta</h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Source</label>
                <div className="relative">
                  <select 
                    name="source"
                    className="w-full premium-input appearance-none"
                    onChange={handleChange}
                  >
                    <option value="Walk-in">Walk-in</option>
                    <option value="Website">Website</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="Recommendation">Recommendation</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Initial Status</label>
                <div className="relative">
                  <select 
                    name="status"
                    className="w-full premium-input appearance-none"
                    onChange={handleChange}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Followed-up">Followed-up</option>
                    <option value="Hot-Lead">Hot Lead</option>
                    <option value="Not-Interested">Not Interested</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-3">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full premium-button-primary disabled:opacity-50"
              >
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Inquiry'}
              </button>
              <button 
                type="button" 
                onClick={() => navigate(-1)}
                className="w-full premium-button-secondary"
              >
                Cancel
              </button>
            </div>
          </GlassCard>

          <GlassCard className="bg-primary-500/10 border-primary-500/20">
            <div className="flex gap-3">
              <div className="p-2 bg-primary-500 rounded-lg h-fit text-white">
                <BookOpen size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm">Lead Management</h4>
                <p className="text-xs text-dark-muted mt-1 leading-relaxed">
                  Tracking inquiries helps in improving conversion rates and managing follow-ups effectively.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </form>
    </div>
  );
};

export default AddInquiry;
