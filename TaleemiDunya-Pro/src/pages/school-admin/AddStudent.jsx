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
  Loader2,
  CheckCircle,
  Smartphone
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { addRecord, getSingleRecord, updateRecord, getStudentsByClass, getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { uploadStudentPhoto, getThumbnailUrl, markForDeletion, compressImage } from '../../services/cloudinary';
import Swal from 'sweetalert2';
import QRCode from 'react-qr-code';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const AddStudent = () => {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const { userData, loading: authLoading } = useAuth();
  const { schoolClasses = [] } = useSchool();
  const [classSuggestOpen, setClassSuggestOpen] = useState(false);
  const [classInput, setClassInput] = useState('');

  const isEditMode = !!studentId;
  const schoolId = userData?.schoolId || 'default-school';
  const [fetching, setFetching] = useState(isEditMode);
  const [classFees, setClassFees] = useState({});
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => {
    if (schoolId && schoolId !== 'default-school') {
      getRecords('class_fees', schoolId).then(fees => {
        const feeMap = {};
        fees.forEach(f => { feeMap[f.className] = f.baseFee; });
        setClassFees(feeMap);
      });
    }
  }, [schoolId]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrSessionId, setQrSessionId] = useState('');
  const [mobileConnected, setMobileConnected] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
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
    fatherCnic: '',
    email: '',
    grNumber: '',
    monthlyFee: '',
    balance: '',
    admissionFee: '',
    annualFee: '',
    otherFee: '',
    familyId: '',
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
              familyId: detail.familyId || '',
              photoPublicId: detail.photoPublicId || '',
              fatherCnic: detail.fatherCnic || '',
              email: detail.email || '',
              grNumber: detail.grNumber || detail.grNo || '',
              monthlyFee: detail.monthlyFee || detail.tuitionFee || '',
              admissionFee: detail.admissionFee || '',
              annualFee: detail.annualFee || '',
              otherFee: detail.otherFee || '',
              username: detail.username || '',
              balance: detail.balance || '',
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

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'warning',
        title: 'Image Required',
        text: 'Please select a valid image file (JPG, PNG, WebP).',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }
    // Allow up to 25MB
    if (file.size > 25 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'Image file size must be under 25MB.',
        confirmButtonColor: '#e11d48'
      });
      return;
    }

    try {
      // Auto-compress large photos client-side
      let finalFile = file;
      if (file.size > 600 * 1024) {
        finalFile = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
      }
      setPhotoFile(finalFile);
      setPhotoPreview(URL.createObjectURL(finalFile));
    } catch (err) {
      console.warn('Auto-compression fallback to original file:', err);
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
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
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const generateRollNumberGlobal = async (targetClass = null, targetSection = null) => {
    try {
      const cls = targetClass || formData.class;
      const sec = targetSection || formData.section;
      if (!cls) {
        return;
      }
      const allStudents = await getRecords('students', schoolId);
      const classStudents = allStudents.filter(s => 
        String(s.class).trim() === String(cls).trim() && 
        (sec ? String(s.section).trim() === String(sec).trim() : true)
      );
      
      let nextRoll = classStudents.length + 1;
      const existingRolls = new Set(classStudents.map(s => String(s.rollNumber).trim()));
      
      while (existingRolls.has(nextRoll.toString())) {
        nextRoll++;
      }
      
      setFormData(prev => ({ ...prev, rollNumber: nextRoll.toString() }));
    } catch (err) {
      console.error('Error generating roll number:', err);
    }
  };

  const generateGrNumberGlobal = async () => {
    try {
      const allStudents = await getRecords('students', schoolId);
      
      let nextGr = allStudents.length + 1;
      const existingGrs = new Set(allStudents.map(s => String(s.grNumber || s.grNo).trim()));
      
      while (existingGrs.has(nextGr.toString())) {
        nextGr++;
      }
      
      setFormData(prev => ({ ...prev, grNumber: nextGr.toString() }));
    } catch (err) {
      console.error('Error generating GR number:', err);
      setFormData(prev => ({ ...prev, grNumber: `GR-${Math.floor(1000 + Math.random() * 9000)}` }));
    }
  };

  useEffect(() => {
    if (!isEditMode && schoolId !== 'default-school' && !fetching && !formData.grNumber) {
      generateGrNumberGlobal();
    }
  }, [isEditMode, schoolId, fetching]);

  const handleAutoGenerateRollNumber = () => {
    generateRollNumberGlobal();
  };

  const startMobileQRConnect = () => {
    let session = localStorage.getItem('taleemi_qr_session');
    if (!session) {
      session = 'snap_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('taleemi_qr_session', session);
      setMobileConnected(false);
    } else {
      setMobileConnected(true);
    }
    
    setQrSessionId(session);
    setShowQRModal(true);

    const unsub = onSnapshot(doc(db, 'photo_sessions', session), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.device_connected) {
          setMobileConnected(true);
        }
        if (data.status === 'completed' && data.photoData) {
          setPhotoPreview(data.photoData);
          const file = dataURLtoFile(data.photoData, 'mobile_capture.jpg');
          setPhotoFile(file);
          setShowQRModal(false);

          updateDoc(doc(db, 'photo_sessions', session), {
            status: 'connected',
            photoData: null
          }).catch(console.error);

          unsub();
        }
      }
    });
  };

  const disconnectMobileQR = () => {
    localStorage.removeItem('taleemi_qr_session');
    setMobileConnected(false);
    setQrSessionId('');
    alert('Mobile camera disconnected.');
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

      // Roll Number Uniqueness Validation (Per Class & Section)
      if (formData.rollNumber) {
        const allStudents = await getRecords('students', schoolId);
        const duplicate = allStudents.find(s =>
          s.rollNumber && 
          String(s.rollNumber).trim() === String(formData.rollNumber).trim() &&
          s.class === formData.class &&
          (formData.section ? s.section === formData.section : true) &&
          s.id !== studentId
        );

        if (duplicate) {
          alert(`Error: Roll Number "${formData.rollNumber}" is already assigned to another student (${duplicate.name} in Class ${duplicate.class || duplicate.standard} - ${duplicate.section || ''}). Please use a unique Roll Number for this class.`);
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
      const toTitleCase = (str) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      };
      const finalData = {
        ...formData,
        ...photoData,
        schoolId,
        name: toTitleCase(formData.name),
        fatherName: toTitleCase(formData.fatherName)
      };

      if (isEditMode) {
        result = await updateRecord('students', studentId, finalData);
      } else {
        result = await addRecord('students', finalData, schoolId);
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
    let { name, value } = e.target;

    if (name === 'fatherCnic') {
      let digits = value.replace(/\D/g, '');
      if (digits.length > 13) digits = digits.substring(0, 13);
      let formatted = digits;
      if (digits.length > 5 && digits.length <= 12) {
          formatted = digits.replace(/(\d{5})(\d+)/, '$1-$2');
      } else if (digits.length > 12) {
          formatted = digits.replace(/(\d{5})(\d{7})(\d+)/, '$1-$2-$3');
      }
      value = formatted;
    }

    if (name === 'phone') {
      let digits = value.replace(/\D/g, '');
      if (digits.length > 11) digits = digits.substring(0, 11);
      value = digits;
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-generate or update username if it hasn't been manually changed
      if (name === 'name' && value.trim() !== '') {
        const base = value.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        if (base) {
          let randomSuffix = Math.floor(1000 + Math.random() * 9000);
          let shouldUpdate = false;
          
          if (!prev.username) {
            shouldUpdate = true;
          } else {
            const oldBase = prev.name ? prev.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : '';
            const match = prev.username.match(/\d{4}$/);
            if (match && oldBase && prev.username === `${oldBase}${match[0]}`) {
              shouldUpdate = true;
              randomSuffix = match[0];
            }
          }
          
          if (shouldUpdate) {
            updated.username = `${base}${randomSuffix}`;
          }
        }
      }
      return updated;
    });

    // Auto-generate roll number globally if class or section is changed
    if (name === 'class' && value) {
      generateRollNumberGlobal(value, formData.section);
    }
    if (name === 'section' && value && formData.class) {
      generateRollNumberGlobal(formData.class, value);
    }
    // Auto-generate Family ID when CNIC is entered
    if (name === 'fatherCnic' && value && !formData.familyId) {
      autoGenerateFamilyId();
    }
  };

  const autoGenerateFamilyId = async () => {
    try {
      const allStudents = await getRecords('students', schoolId);
      let maxId = 0;
      allStudents.forEach(s => {
        if (s.familyId && s.familyId.startsWith('F-')) {
          const numStr = s.familyId.replace('F-', '');
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxId) {
            maxId = num;
          }
        }
      });
      const nextId = maxId + 1;
      const formattedId = `F-${nextId.toString().padStart(3, '0')}`;
      setFormData(prev => ({ ...prev, familyId: formattedId }));
    } catch (err) {
      console.error('Error generating family ID:', err);
      const rand = Math.floor(100 + Math.random() * 900);
      setFormData(prev => ({ ...prev, familyId: `F-${rand}` }));
    }
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
          <h1 className="text-3xl font-black text-white">
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
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">App Username *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" size={18} />
                  <input 
                    type="text" 
                    name="username"
                    required
                    value={formData.username || ''}
                    placeholder="e.g. ali8432 (For app login)" 
                    className="w-full premium-input pl-12 border-primary-500/30 focus:border-primary-500"
                    onChange={handleChange}
                  />
                </div>
                <p className="text-[10px] text-dark-muted px-1">Used for mobile app login</p>
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
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Father CNIC</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input
                    type="text"
                    name="fatherCnic"
                    required
                    value={formData.fatherCnic}
                    placeholder="e.g. 12345-1234567-1"
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-black text-dark-muted uppercase tracking-widest">Family Unique ID</label>
                  <button
                    type="button"
                    onClick={autoGenerateFamilyId}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
                  >
                    Auto Generate
                  </button>
                </div>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
                  <input
                    type="text"
                    name="familyId"
                    value={formData.familyId}
                    placeholder="e.g. F-001 (auto or manual)"
                    className="w-full premium-input pl-12 border-purple-500/30 focus:border-purple-500"
                    onChange={handleChange}
                  />
                </div>
                <p className="text-[10px] text-dark-muted px-1">📌 Siblings ke liye same Family ID dein — Family Tree mein group honge</p>
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
                    required
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
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-black text-dark-muted uppercase tracking-widest">GR Number</label>

                </div>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input
                    type="text"
                    name="grNumber"
                    value={formData.grNumber}
                    placeholder="Enter GR Number"
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-black text-dark-muted uppercase tracking-widest">Roll Number</label>

                </div>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input
                    type="text"
                    name="rollNumber"
                    required
                    value={formData.rollNumber}
                    placeholder="Enter Roll Number"
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Assigned Class</label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted z-10" size={18} />
                  <input
                    type="text"
                    name="class"
                    required
                    autoComplete="off"
                    value={classInput || formData.class}
                    placeholder={schoolClasses.length === 0 ? 'No classes — add from Class Manager' : 'Select or type class...'}
                    className="w-full premium-input pl-12"
                    onChange={(e) => {
                      setClassInput(e.target.value);
                      setFormData(f => ({ ...f, class: e.target.value }));
                      setClassSuggestOpen(true);
                    }}
                    onFocus={() => setClassSuggestOpen(true)}
                    onBlur={() => setTimeout(() => setClassSuggestOpen(false), 150)}
                  />
                  {/* Suggestions Dropdown */}
                  {classSuggestOpen && schoolClasses.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 bg-dark-card border border-primary-500/30 rounded-xl shadow-xl max-h-52 overflow-y-auto custom-scrollbar">
                      {schoolClasses
                        .filter(c => !classInput || c.name.toLowerCase().includes(classInput.toLowerCase()))
                        .map(c => (
                          <li
                            key={c.id}
                            onMouseDown={() => {
                              const newSection = (c.sections && c.sections[0]) || 'A';
                              setFormData(f => ({
                                ...f,
                                class: c.name,
                                section: newSection,
                                monthlyFee: classFees[c.name] !== undefined ? classFees[c.name] : f.monthlyFee
                              }));
                              setClassInput(c.name);
                              setClassSuggestOpen(false);
                              generateRollNumberGlobal(c.name, newSection);
                            }}
                            className="px-4 py-2.5 text-sm font-semibold text-dark-text hover:bg-primary-500/10 hover:text-primary-400 cursor-pointer transition-colors flex items-center justify-between"
                          >
                            <span>{c.name}</span>
                            {c.sections && <span className="text-[10px] text-dark-muted font-mono">{c.sections.join(', ')}</span>}
                          </li>
                        ))}
                      {schoolClasses.filter(c => !classInput || c.name.toLowerCase().includes(classInput.toLowerCase())).length === 0 && (
                        <li className="px-4 py-3 text-xs text-dark-muted italic">No matching class found</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Section</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  {(() => {
                    const selectedCls = schoolClasses.find(c => c.name === formData.class);
                    const secs = selectedCls?.sections?.length > 0 ? selectedCls.sections : ['A', 'B', 'C'];
                    return (
                      <select
                        name="section"
                        required
                        value={formData.section}
                        className="w-full premium-input pl-12 appearance-none bg-dark-card text-white"
                        onChange={handleChange}
                      >
                        {secs.map(s => (
                          <option key={s} value={s}>Section {s}</option>
                        ))}
                      </select>
                    );
                  })()}
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

          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Shield size={18} className="text-primary-500" /> Fee Structure
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Monthly Tuition Fee (Rs.)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted font-bold text-sm">Rs.</span>
                  <input
                    type="number"
                    name="monthlyFee"
                    value={formData.monthlyFee}
                    placeholder="e.g. 3500"
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">
                  Previous Balance / Old Arrears (Rs.)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted font-bold text-sm">Rs.</span>
                  <input
                    type="number"
                    name="balance"
                    value={formData.balance}
                    placeholder="e.g. 2000"
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Admission Fee (Rs.)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted font-bold text-sm">Rs.</span>
                  <input
                    type="number"
                    name="admissionFee"
                    value={formData.admissionFee}
                    placeholder="e.g. 5000"
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Annual Fee (Rs.)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted font-bold text-sm">Rs.</span>
                  <input
                    type="number"
                    name="annualFee"
                    value={formData.annualFee}
                    placeholder="e.g. 1500"
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Other Fees (Rs.)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted font-bold text-sm">Rs.</span>
                  <input
                    type="number"
                    name="otherFee"
                    value={formData.otherFee}
                    placeholder="e.g. 500"
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

            <div className="flex gap-2 mt-4 w-full justify-center flex-wrap">
              <label className="px-4 py-2 rounded-xl bg-dark-hover border border-dark-border flex items-center justify-center gap-2 cursor-pointer hover:border-primary-500 transition-all text-dark-muted hover:text-primary-400 w-full max-w-[150px]">
                <Upload size={16} />
                <span className="text-[10px] uppercase font-black tracking-widest">Upload</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={startMobileQRConnect}
                className="px-4 py-2 rounded-xl bg-dark-hover border border-dark-border flex items-center justify-center gap-2 cursor-pointer hover:border-primary-500 transition-all text-dark-muted hover:text-primary-400 w-full max-w-[150px]"
              >
                <Smartphone size={16} />
                <span className="text-[10px] uppercase font-black tracking-widest">{localStorage.getItem('taleemi_qr_session') ? 'Open Camera' : 'Connect'}</span>
              </button>
              {localStorage.getItem('taleemi_qr_session') && (
                <button
                  type="button"
                  onClick={disconnectMobileQR}
                  className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center gap-2 cursor-pointer hover:bg-red-500/20 transition-all text-red-400 w-full max-w-[150px]"
                >
                  <X size={16} />
                  <span className="text-[10px] uppercase font-black tracking-widest">Disconnect</span>
                </button>
              )}
            </div>

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
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Email / Gmail</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    placeholder="student@gmail.com"
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

      {/* QR Connect Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border max-w-sm w-full rounded-2xl p-6 shadow-2xl relative text-center">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-dark-hover text-dark-muted transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black mb-2 text-white flex items-center justify-center gap-2">
              <Smartphone size={24} className="text-primary-500" /> Mobile Camera
            </h3>
            <p className="text-xs text-dark-muted mb-6">Scan QR with your smartphone to take a live photo wirelessly.</p>

            <div className="bg-white p-4 rounded-xl inline-block shadow-lg mx-auto mb-6">
              <QRCode
                value={`https://taleemidunya-pro-ed44e.web.app/#/snap/${qrSessionId}`}
                size={200}
                level="H"
              />
            </div>

            {mobileConnected ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold animate-pulse">
                <CheckCircle size={18} /> Phone Connected! Take photo...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-400 animate-pulse">
                <Loader2 size={16} className="animate-spin" /> Waiting for scan...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddStudent;
