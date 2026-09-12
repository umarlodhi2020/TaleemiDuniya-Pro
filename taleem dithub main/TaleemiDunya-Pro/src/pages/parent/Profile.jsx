import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import GlassCard from '../../components/common/GlassCard';
import { User, Phone, Mail, MapPin, Save, CheckCircle, RefreshCw } from 'lucide-react';

export default function ParentProfile() {
  const { userData, currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    fatherName: '',
    fatherPhone: '',
    fatherEmail: '',
    address: '',
    cnic: ''
  });

  useEffect(() => {
    fetchProfile();
  }, [userData]);

  const fetchProfile = async () => {
    if (!userData?.id) return;
    try {
      const docRef = doc(db, 'parents', userData.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setFormData({
          fatherName: data.fatherName || data.name || '',
          fatherPhone: data.fatherPhone || data.phone || data.mobile || '',
          fatherEmail: data.fatherEmail || data.email || currentUser?.email || '',
          address: data.address || '',
          cnic: data.cnic || data.fatherCnic || ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    try {
      const docRef = doc(db, 'parents', userData.id);
      await updateDoc(docRef, {
        fatherName: formData.fatherName,
        fatherPhone: formData.fatherPhone,
        phone: formData.fatherPhone,
        mobile: formData.fatherPhone,
        email: formData.fatherEmail,
        address: formData.address,
        cnic: formData.cnic
      });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold bg-premium-gradient bg-clip-text text-transparent">My Profile</h1>
        <p className="text-dark-muted mt-1 font-medium">Update your contact details and address.</p>
      </div>

      <GlassCard className="p-8">
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-3">
            <CheckCircle size={20} />
            <span className="font-bold">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-2">Father/Guardian Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-primary-500" />
                </div>
                <input 
                  type="text" 
                  value={formData.fatherName}
                  onChange={(e) => setFormData({...formData, fatherName: e.target.value})}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl pl-10 p-3 text-white focus:border-primary-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-2">CNIC Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-primary-500" />
                </div>
                <input 
                  type="text" 
                  value={formData.cnic}
                  onChange={(e) => setFormData({...formData, cnic: e.target.value})}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl pl-10 p-3 text-white focus:border-primary-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-2">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone size={18} className="text-primary-500" />
                </div>
                <input 
                  type="text" 
                  value={formData.fatherPhone}
                  onChange={(e) => setFormData({...formData, fatherPhone: e.target.value})}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl pl-10 p-3 text-white focus:border-primary-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-primary-500" />
                </div>
                <input 
                  type="email" 
                  value={formData.fatherEmail}
                  onChange={(e) => setFormData({...formData, fatherEmail: e.target.value})}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl pl-10 p-3 text-white focus:border-primary-500 outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-dark-muted block mb-2">Home Address</label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <MapPin size={18} className="text-primary-500" />
                </div>
                <textarea 
                  rows="3"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl pl-10 p-3 text-white focus:border-primary-500 outline-none"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-dark-border">
            <button 
              type="submit" 
              disabled={saving}
              className="premium-button-primary py-3 px-8 flex items-center gap-2"
            >
              {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              Save Changes
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
