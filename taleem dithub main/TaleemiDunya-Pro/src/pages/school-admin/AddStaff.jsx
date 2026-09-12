import React, { useState, useEffect } from 'react';
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
  Camera,
  Hash,
  Upload,
  X,
  Loader2,
  CheckCircle,
  Smartphone,
  BookOpen
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { addRecord, getRecords, getSingleRecord, updateRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { uploadStudentPhoto, getThumbnailUrl, markForDeletion } from '../../services/cloudinary';
import QRCode from 'react-qr-code';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

const AddStaff = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrSessionId, setQrSessionId] = useState('');
  const [mobileConnected, setMobileConnected] = useState(false);

  const [formData, setFormData] = useState({
    staffId: '',
    name: '',
    role: '',
    department: '',
    email: '',
    phone: '',
    cnic: '',
    salary: '',
    joinDate: new Date().toISOString().split('T')[0],
    address: '',
    status: 'Active',
    photoUrl: '',
    photoPublicId: '',
    // Teacher Assignment Fields
    assignedClass: '',
    assignedSection: '',
    subjects: [],
    isClassTeacher: false,
    classTeacherOf: '',
  });

  const [subjectInput, setSubjectInput] = useState('');

  const isEditing = Boolean(id);

  useEffect(() => {
    if (isEditing) {
      const fetchStaffData = async () => {
        setLoading(true);
        try {
          const staffData = await getSingleRecord('staff', id);
          if (staffData && staffData.schoolId === userData?.schoolId) {
            setFormData({
              staffId: staffData.staffId || '',
              name: staffData.name || '',
              role: staffData.role || '',
              department: staffData.department || '',
              email: staffData.email || '',
              phone: staffData.phone || '',
              cnic: staffData.cnic || '',
              salary: staffData.salary || '',
              joinDate: staffData.joinDate || new Date().toISOString().split('T')[0],
              address: staffData.address || '',
              status: staffData.status || 'Active',
              photoUrl: staffData.photoUrl || '',
              photoPublicId: staffData.photoPublicId || '',
              assignedClass: staffData.assignedClass || '',
              assignedSection: staffData.assignedSection || '',
              subjects: staffData.subjects || [],
              isClassTeacher: staffData.isClassTeacher || false,
              classTeacherOf: staffData.classTeacherOf || '',
            });
            if (staffData.subjects) setSubjectInput('');
            if (staffData.photoUrl) {
              setPhotoPreview(staffData.photoUrl);
            }
          }
        } catch (error) {
          console.error('Error fetching staff data:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchStaffData();
    }
  }, [id, userData]);

  const generateStaffIdGlobal = async () => {
    try {
      const allStaff = await getRecords('staff', userData?.schoolId || 'default-school');
      if (allStaff.length > 0) {
        let maxId = 0;
        allStaff.forEach(s => {
          if (s.staffId && s.staffId.startsWith('STF-')) {
            const num = parseInt(s.staffId.replace('STF-', ''), 10);
            if (!isNaN(num) && num > maxId) {
              maxId = num;
            }
          }
        });
        setFormData(prev => ({ ...prev, staffId: `STF-${(maxId + 1).toString().padStart(3, '0')}` }));
      } else {
        setFormData(prev => ({ ...prev, staffId: 'STF-001' }));
      }
    } catch (err) {
      console.error('Error generating staff ID:', err);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG)');
      return;
    }
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

  const dataURLtoFile = (dataurl, filename) => {
    let arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  };

  const startMobileQRConnect = () => {
    const newSessionId = 'snap_stf_' + Math.random().toString(36).substring(2, 10);
    setQrSessionId(newSessionId);
    setMobileConnected(false);
    setShowQRModal(true);

    const unsub = onSnapshot(doc(db, 'photo_sessions', newSessionId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === 'connected') {
          setMobileConnected(true);
        } else if (data.status === 'captured' && data.photoData) {
          try {
            const file = dataURLtoFile(data.photoData, `mobile_capture_${Date.now()}.jpg`);
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
            setShowQRModal(false);
            unsub();
          } catch (e) {
            console.error("Error converting photo data", e);
          }
        }
      }
    });

    return unsub;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isEditing && !formData.staffId) {
      alert('Please generate or enter a Staff ID.');
      return;
    }

    let sanitizedPhone = formData.phone.trim();
    if (sanitizedPhone.startsWith('+92')) {
      sanitizedPhone = '0' + sanitizedPhone.slice(3);
    }
    sanitizedPhone = sanitizedPhone.replace(/[\s-]/g, '');

    if (!/^\d{11}$/.test(sanitizedPhone)) {
      import('sweetalert2').then(({ default: Swal }) => {
        Swal.fire({
          icon: 'error',
          title: 'Phone Number Error!',
          html: 'Phone number must be exactly 11 digits.<br>Example: 03001234567<br><br>Please enter a valid Pakistani mobile number.',
          confirmButtonColor: '#e11d48'
        });
      });
      return;
    }

    setLoading(true);
    setUploading(true);
    let finalPhotoUrl = formData.photoUrl;
    let finalPublicId = formData.photoPublicId;

    try {
      if (photoFile) {
        setUploadProgress(10);
        const folder = `schools/${userData?.schoolId || 'default-school'}/staff_photos`;
        
        setUploadProgress(40);
        const uploadResult = await uploadStudentPhoto(photoFile, folder); // Reusing uploadStudentPhoto logic
        
        if (uploadResult.secure_url) {
          finalPhotoUrl = uploadResult.secure_url;
          finalPublicId = uploadResult.public_id;
        } else {
          throw new Error('Image upload failed');
        }
        setUploadProgress(90);
      }

      const payload = { 
        ...formData, 
        phone: sanitizedPhone,
        photoUrl: finalPhotoUrl,
        photoPublicId: finalPublicId
      };
      
      let result;
      if (isEditing) {
        result = await updateRecord('staff', id, payload);
      } else {
        result = await addRecord('staff', payload, userData?.schoolId || 'default-school');
      }

      if (result.success) {
        // Sync with users collection if a user account exists for this staff
        try {
          const cleanEmail = (formData.email || '').trim().toLowerCase();
          const usersRef = collection(db, 'users');
          
          if (cleanEmail) {
            const q = query(usersRef, where('email', '==', cleanEmail));
            const snap = await getDocs(q);
            snap.forEach(async (uDoc) => {
              await setDoc(doc(db, 'users', uDoc.id), {
                name: formData.name,
                assignedClass: formData.assignedClass,
                assignedSection: formData.assignedSection,
                subjects: formData.subjects || [],
                isClassTeacher: Boolean(formData.isClassTeacher),
                role: 'teacher',
                designation: formData.role,
                department: formData.department,
                phone: sanitizedPhone,
                recordId: id || result.id
              }, { merge: true });
            });
          }
        } catch (syncErr) {
          console.error('Error syncing to users collection:', syncErr);
        }

        setUploadProgress(100);
        alert(`Staff member ${isEditing ? 'updated' : 'added'} successfully!`);
        navigate('/school-admin/staff');
      } else {
        alert('Error: ' + result.error.message);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during submission.');
    } finally {
      setLoading(false);
      setUploading(false);
      setUploadProgress(0);
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
          <h1 className="text-2xl font-bold">{isEditing ? 'Edit Staff Member' : 'Add Staff Member'}</h1>
          <p className="text-dark-muted text-sm mt-0.5">{isEditing ? 'Update the details of the staff member.' : 'Register a new teacher or employee to the school.'}</p>
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
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Staff ID *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                    <input 
                      type="text" 
                      name="staffId"
                      required
                      value={formData.staffId}
                      placeholder="e.g. STF-001" 
                      className="w-full premium-input pl-12 disabled:opacity-50"
                      onChange={handleChange}
                      disabled={isEditing}
                    />
                  </div>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={generateStaffIdGlobal}
                      className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-xl text-xs font-bold transition-all border border-primary-500/20 whitespace-nowrap"
                    >
                      Auto Generate
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="text" 
                    name="name"
                    required
                    value={formData.name}
                    placeholder="Staff Full Name" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="email" 
                    name="email"
                    required
                    value={formData.email}
                    placeholder="email@school.com" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="tel" 
                    name="phone"
                    required
                    value={formData.phone}
                    placeholder="+92 XXX XXXXXXX" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">CNIC / ID Number *</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="text" 
                    name="cnic"
                    required
                    value={formData.cnic}
                    placeholder="XXXXX-XXXXXXX-X" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Home Address *</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 text-dark-muted" size={18} />
                <textarea 
                  name="address"
                  required
                  value={formData.address}
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
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Designation *</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="text" 
                    name="role"
                    required
                    value={formData.role}
                    placeholder="e.g. Computer Teacher" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Department *</label>
                <div className="relative">
                  <select 
                    name="department"
                    required
                    value={formData.department}
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
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Monthly Salary *</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="number" 
                    name="salary"
                    required
                    value={formData.salary}
                    placeholder="Amount in PKR" 
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Joining Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="date" 
                    name="joinDate"
                    required
                    value={formData.joinDate}
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ── TEACHER CLASS & SUBJECT ASSIGNMENT ── */}
          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <BookOpen size={18} className="text-primary-500" /> Class & Subject Assignment
            </h2>
            <p className="text-xs text-dark-muted mb-6">Teacher ko class aur subjects assign karein — Teacher Dashboard automatically in values se filter hoga.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assigned Class */}
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Assigned Class</label>
                <div className="relative">
                  <select
                    name="assignedClass"
                    value={formData.assignedClass}
                    className="w-full premium-input appearance-none"
                    onChange={handleChange}
                  >
                    <option value="">Select Class</option>
                    {['Nursery','KG','1','2','3','4','5','6','7','8','9','10','11','12'].map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>

              {/* Section */}
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Section</label>
                <div className="relative">
                  <select
                    name="assignedSection"
                    value={formData.assignedSection}
                    className="w-full premium-input appearance-none"
                    onChange={handleChange}
                  >
                    <option value="">Select Section</option>
                    {['A','B','C','D','E'].map(s => (
                      <option key={s} value={s}>Section {s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>

              {/* Class Teacher Toggle */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Class Teacher Status</label>
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-dark-border">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isClassTeacher}
                      onChange={(e) => setFormData({ ...formData, isClassTeacher: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-dark-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
                  </label>
                  <div>
                    <p className="text-sm font-bold">{formData.isClassTeacher ? '✅ Yeh Class Teacher hai' : 'Class Teacher nahi'}</p>
                    <p className="text-xs text-dark-muted mt-0.5">Class teacher ko extra responsibilities milti hain</p>
                  </div>
                </div>
              </div>

              {/* Subject Assignment */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Subjects Taught</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ',') && subjectInput.trim()) {
                        e.preventDefault();
                        const sub = subjectInput.trim();
                        if (!formData.subjects.includes(sub)) {
                          setFormData({ ...formData, subjects: [...formData.subjects, sub] });
                        }
                        setSubjectInput('');
                      }
                    }}
                    placeholder="Subject likho aur Enter dabao (e.g. Maths, English)"
                    className="flex-1 premium-input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const sub = subjectInput.trim();
                      if (sub && !formData.subjects.includes(sub)) {
                        setFormData({ ...formData, subjects: [...formData.subjects, sub] });
                        setSubjectInput('');
                      }
                    }}
                    className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-xl text-xs font-bold transition-all border border-primary-500/20"
                  >
                    + Add
                  </button>
                </div>

                {/* Subject Tags */}
                {formData.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.subjects.map((sub, idx) => (
                      <span
                        key={idx}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-lg text-xs font-bold"
                      >
                        📚 {sub}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, subjects: formData.subjects.filter((_, i) => i !== idx) })}
                          className="text-red-400 hover:text-red-300 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-dark-muted mt-1">Multiple subjects add kar sakte hain — Enter ya comma press karein</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-8 text-center flex flex-col items-center relative overflow-hidden">
            <h2 className="text-lg font-bold mb-6 w-full text-left">Staff Photo</h2>
            
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-dark-hover border-2 border-dashed border-dark-border flex flex-col items-center justify-center gap-2 overflow-hidden hover:border-primary-500 transition-all">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={32} className="text-dark-muted group-hover:text-primary-500 transition-all" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-dark-muted group-hover:text-primary-500">Upload</span>
                  </>
                )}
              </div>
              
              {photoPreview && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-0 right-0 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="w-full flex flex-col gap-2 mt-6">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button type="button" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-dark-hover border border-dark-border text-xs font-bold text-dark-text hover:bg-dark-border transition-colors">
                  <Upload size={16} /> Choose from PC
                </button>
              </div>

              <button 
                type="button" 
                onClick={startMobileQRConnect}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-colors"
              >
                <Smartphone size={16} /> Scan QR & Upload from Phone
              </button>
            </div>

            <p className="text-[10px] text-dark-muted mt-4">Passport size photo, max 2MB</p>

            {uploading && (
              <div className="absolute inset-0 bg-dark-bg/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold text-primary-400">Uploading {uploadProgress}%</p>
                <div className="w-32 h-1.5 bg-dark-hover rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-primary-500 transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </GlassCard>

          <div className="space-y-3">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full premium-button-primary disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  {isEditing ? 'Update Staff Record' : 'Save Staff Record'}
                </>
              )}
            </button>
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              className="w-full premium-button-secondary"
              disabled={loading}
            >
              Discard
            </button>
          </div>
        </div>
      </form>

      {/* Mobile QR Camera Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowQRModal(false)} />
          <div className="relative bg-dark-card border border-dark-border w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
            
            <button 
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 p-2 bg-dark-hover rounded-full text-dark-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
              {mobileConnected ? <CheckCircle size={32} /> : <Smartphone size={32} />}
            </div>

            <h3 className="text-xl font-black text-white mb-2">
              {mobileConnected ? 'Mobile Connected!' : 'Scan to Connect'}
            </h3>
            
            <p className="text-sm text-dark-muted mb-6">
              {mobileConnected 
                ? 'Capture photo from your mobile browser. Please wait...'
                : 'Scan this QR code with your mobile phone camera to instantly capture & upload student photo.'}
            </p>

            {!mobileConnected && (
              <div className="bg-white p-4 rounded-2xl shadow-xl mb-6">
                <QRCode 
                  value={`${window.location.origin}/mobile-photo?session=${qrSessionId}&role=staff`}
                  size={200}
                  level="H"
                />
              </div>
            )}

            {mobileConnected && (
              <div className="w-full py-8 flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
                <p className="text-sm font-bold text-purple-400 animate-pulse">Waiting for camera capture...</p>
              </div>
            )}

            <div className="text-[10px] uppercase tracking-widest text-dark-muted font-bold">
              Secure Local Network Connection
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddStaff;
