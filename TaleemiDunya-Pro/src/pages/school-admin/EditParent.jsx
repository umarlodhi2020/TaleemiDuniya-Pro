import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, User, Phone, Mail, ShieldCheck } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getSingleRecord, updateRecord, getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const EditParent = () => {
  const { parentId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    parentUsername: '',
    fatherName: '',
    parentCnic: '',
    parentPhone: '',
    parentEmail: '',
    parentAddress: '',
    parentOccupation: ''
  });
  
  // We will need to update all siblings as well
  const [linkedStudents, setLinkedStudents] = useState([]);

  useEffect(() => {
    fetchParentData();
  }, [parentId]);

  const fetchParentData = async () => {
    try {
      setLoading(true);
      // parentId is actually one of the student's ID used as a reference
      const student = await getSingleRecord('students', parentId);
      if (student) {
        setFormData({
          parentUsername: student.parentUsername || '',
          fatherName: student.fatherName || '',
          parentCnic: student.parentCnic || '',
          parentPhone: student.parentPhone || '',
          parentEmail: student.parentEmail || '',
          parentAddress: student.parentAddress || student.address || '',
          parentOccupation: student.parentOccupation || ''
        });
        
        // Find siblings based on CNIC or Phone
        if (userData?.schoolId) {
          const allStudents = await getRecords('students', userData.schoolId);
          const siblings = allStudents.filter(s => 
            (s.parentCnic && s.parentCnic === student.parentCnic) || 
            (s.parentPhone && s.parentPhone === student.parentPhone)
          );
          setLinkedStudents(siblings);
        }
      }
    } catch (error) {
      console.error("Error fetching parent data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-generate username if fatherName is entered and parentUsername is currently empty
      if (name === 'fatherName' && !prev.parentUsername && value.trim() !== '') {
        const base = value.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        if (base) {
          updated.parentUsername = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      // Update all linked students so the parent data is consistent
      for (const student of linkedStudents) {
        await updateRecord('students', student.id, {
          parentUsername: formData.parentUsername,
          fatherName: formData.fatherName,
          parentCnic: formData.parentCnic,
          parentPhone: formData.parentPhone,
          parentEmail: formData.parentEmail,
          parentAddress: formData.parentAddress,
          parentOccupation: formData.parentOccupation
        });
      }
      
      alert('Parent Profile updated successfully for all linked students!');
      navigate('/school-admin/parents');
    } catch (error) {
      console.error("Error updating parent:", error);
      alert('Failed to update parent profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-white">Loading Parent Profile...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-dark-border pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-xl bg-dark-hover border border-dark-border flex items-center justify-center text-white hover:bg-blue-500 hover:border-blue-500 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">Edit Parent Profile</h1>
            <p className="text-xs text-dark-muted font-bold uppercase tracking-wider mt-1">
              Updating details for {linkedStudents.length} linked student(s)
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl">
        <GlassCard className="p-8 border-t-4 border-t-blue-500">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-dark-muted uppercase">Father / Guardian Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-3 text-dark-muted" />
                  <input
                    type="text"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleChange}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-dark-muted uppercase">App Username *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-3 text-primary-400" />
                  <input
                    type="text"
                    name="parentUsername"
                    value={formData.parentUsername || ''}
                    onChange={handleChange}
                    placeholder="e.g. parent8432 (For app login)"
                    className="w-full bg-dark-bg border border-primary-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
                <p className="text-[10px] text-dark-muted px-1">Used for mobile app login</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-dark-muted uppercase">Parent CNIC</label>
                <div className="relative">
                  <ShieldCheck size={16} className="absolute left-3 top-3 text-dark-muted" />
                  <input
                    type="text"
                    name="parentCnic"
                    value={formData.parentCnic}
                    onChange={handleChange}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-dark-muted uppercase">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3 text-dark-muted" />
                  <input
                    type="text"
                    name="parentPhone"
                    value={formData.parentPhone}
                    onChange={handleChange}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-dark-muted uppercase">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-dark-muted" />
                  <input
                    type="email"
                    name="parentEmail"
                    value={formData.parentEmail}
                    onChange={handleChange}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-dark-muted uppercase">Home Address</label>
                <textarea
                  name="parentAddress"
                  value={formData.parentAddress}
                  onChange={handleChange}
                  rows="3"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

            </div>

            <div className="pt-6 border-t border-dark-border flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="premium-button-primary py-2.5 px-6 rounded-xl flex items-center gap-2 text-sm"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Saving...' : 'Save Parent Profile'}
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};

export default EditParent;
