import React, { useState, useEffect } from 'react';
import { 
  Save, 
  ArrowLeft, 
  User,
  Users,
  Phone, 
  MapPin, 
  BookOpen, 
  Camera,
  Calendar,
  Hash,
  Shield,
  ChevronDown,
  Upload,
  X,
  Loader2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { addRecord, getSingleRecord, updateRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { uploadStudentPhoto, getThumbnailUrl, markForDeletion } from '../../services/cloudinary';

const AddStudent = () => {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const { userData, loading: authLoading } = useAuth();
  
  const isEditMode = !!studentId;
  const schoolId = userData?.schoolId || 'default-school';
  const [fetching, setFetching] = useState(isEditMode);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    dob: '',
    gender: 'Male',
    rollNumber: '',
    class: '',
    section: 'A',
    phone: '',
    address: '',
    bloodGroup: '',
    admissionDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    photoUrl: '',
    photoPublicId: '',
  });

  // Fetch student details if in edit mode
  useEffect(() => {
    if (!isEditMode) {
      setFetching(false);
      return;
    }

    if (authLoading) {
      return;
    }

    if (!userData?.schoolId) {
      setFetching(false);
      return;
    }

    if (isEditMode) {
      const fetchStudent = async () => {
        setFetching(true);
        try {
          const detail = await getSingleRecord('students', studentId);
          if (detail && detail.schoolId === schoolId) {
            setFormData({
              name: detail.name || '',
              fatherName: detail.fatherName || '',
              dob: detail.dob || '',
              gender: detail.gender || 'Male',
              rollNumber: detail.rollNumber || '',
              class: detail.class || '',
              section: detail.section || 'A',
              phone: detail.phone || '',
              address: detail.address || '',
              bloodGroup: detail.bloodGroup || '',
              admissionDate: detail.admissionDate || new Date().toISOString().split('T')[0],
              status: detail.status || 'Active',
              photoUrl: detail.photoUrl || '',
              photoPublicId: detail.photoPublicId || '',
            });
            if (detail.photoUrl) {
              setPhotoPreview(detail.photoUrl);
            }
          } else {
            alert("Requested student record was not found.");
            navigate('/school-admin/students');
          }
        } catch (e) {
          console.error("Error loading student details:", e);
        } finally {
          setFetching(false);
        }
      };
      fetchStudent();
    }
  }, [studentId, isEditMode, navigate, schoolId, authLoading, userData]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG)');
      return;
    }
    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be under 2MB');
      return;
    }
    
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(formData.photoUrl || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isEditMode) {
        const existingStudents = await getRecords('students', schoolId);
        const plan = userData?.subscriptionPlan || 'Basic';
        const limit = plan === 'Enterprise' ? 999999 : (plan === 'Pro' ? 1000 : 200);
        if (existingStudents.length >= limit) {
          alert(`⚠️ SAAS PLAN LIMIT REACHED (${existingStudents.length}/${limit} students on ${plan} Plan)!\n\nPlease ask Super Admin to upgrade your school plan to add unlimited students.`);
          setLoading(false);
          return;
        }
      }

      let photoData = {};
      
      // Upload new photo if selected
      if (photoFile) {
        setUploading(true);
        setUploadProgress(0);
        
        // Delete old photo if updating
        if (isEditMode && formData.photoPublicId) {
          await markForDeletion(formData.photoPublicId);
        }
        
        const uploadResult = await uploadStudentPhoto(
          photoFile, 
          schoolId, 
          studentId || 'new',
          (progress) => setUploadProgress(progress)
        );
        
        if (uploadResult.success) {
          photoData = {
            photoUrl: uploadResult.url,
            photoPublicId: uploadResult.publicId,
          };
        } else {
          console.error('Photo upload failed:', uploadResult.error);
        }
        setUploading(false);
      }

      let result;
      if (isEditMode) {
        result = await updateRecord('students', studentId, {
          ...formData,
          ...photoData,
          schoolId,
        });
      } else {
        result = await addRecord('students', { ...formData, ...photoData }, schoolId);
      }

      if (result.success) {
        alert(isEditMode ? 'Student details updated successfully!' : 'Student registered successfully!');
        navigate('/school-admin/students');
      } else {
        alert('Error: ' + result.error.message);
      }
    } catch (err) {
      console.error(err);
      alert('Operation failed: ' + err.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (fetching || authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-dark-muted text-sm mt-3">Loading student details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-dark-hover rounded-xl text-dark-muted transition-all cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary-400 to-indigo-500 bg-clip-text text-transparent">
            {isEditMode ? 'Edit Student Details' : 'Register New Student'}
          </h1>
          <p className="text-dark-muted text-sm mt-1">
            {isEditMode ? 'Update academic record and registration details.' : 'Enroll a new student into the school system.'}
          </p>
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
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Student Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="text" 
                    name="name"
                    required
                    value={formData.name}
                    placeholder="Full Name" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Father's Name</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="text" 
                    name="fatherName"
                    required
                    value={formData.fatherName}
                    placeholder="Guardian Name" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="date" 
                    name="dob"
                    required
                    value={formData.dob}
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Gender</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <select 
                    name="gender"
                    value={formData.gender}
                    className="w-full premium-input pl-12 appearance-none bg-dark-card text-white"
                    onChange={handleChange}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <BookOpen size={18} className="text-primary-500" /> Academic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Roll Number</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="text" 
                    name="rollNumber"
                    required
                    value={formData.rollNumber}
                    placeholder="Enter Roll Number (e.g. LODHI-101)" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Assigned Class</label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <select 
                    name="class"
                    required
                    value={formData.class}
                    className="w-full premium-input pl-12 appearance-none bg-dark-card text-white"
                    onChange={handleChange}
                  >
                    <option value="">Select Class</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                      <option key={c} value={String(c)}>{c} Class</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Section</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <select 
                    name="section"
                    required
                    value={formData.section}
                    className="w-full premium-input pl-12 appearance-none bg-dark-card text-white"
                    onChange={handleChange}
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Enrollment Status</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <select 
                    name="status"
                    required
                    value={formData.status}
                    className="w-full premium-input pl-12 appearance-none bg-dark-card text-white"
                    onChange={handleChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-8 text-center flex flex-col items-center">
            <h2 className="text-lg font-bold mb-6 w-full text-left">Profile Image</h2>
            <label className="w-32 h-32 rounded-3xl bg-dark-hover border-2 border-dashed border-dark-border flex flex-col items-center justify-center gap-2 group cursor-pointer hover:border-primary-500 transition-all relative overflow-hidden">
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); removePhoto(); }}
                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors z-10"
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <>
                  <Camera size={32} className="text-dark-muted group-hover:text-primary-500 transition-all" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-dark-muted group-hover:text-primary-500">Upload Photo</span>
                </>
              )}
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                onChange={handlePhotoSelect}
                className="hidden" 
              />
            </label>
            
            {/* Upload Progress Bar */}
            {uploading && (
              <div className="w-full mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Loader2 size={14} className="animate-spin text-primary-500" />
                  <span className="text-xs text-primary-400 font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-dark-hover rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            
            <p className="text-[10px] text-dark-muted mt-4">JPG or PNG, max 2MB</p>
          </GlassCard>

          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6">Contact Info</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    placeholder="+92 XXX XXXXXXX" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-dark-muted" size={18} />
                  <textarea 
                    name="address"
                    value={formData.address}
                    rows="3"
                    className="w-full premium-input pl-12 resize-none pt-3"
                    onChange={handleChange}
                  ></textarea>
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="space-y-3">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full premium-button-primary disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer py-3 text-xs font-bold uppercase tracking-wider"
            >
              <Save size={18} />
              {loading ? (isEditMode ? 'Saving...' : 'Registering...') : (isEditMode ? 'Save Changes' : 'Register Student')}
            </button>
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              className="w-full premium-button-secondary py-3 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddStudent;
