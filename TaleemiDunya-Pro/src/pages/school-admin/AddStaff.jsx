import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  BookOpen,
  Sparkles
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { addRecord, getRecords, getSingleRecord, updateRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { uploadStaffPhoto, uploadStaffSignature, getThumbnailUrl, markForDeletion, compressImage } from '../../services/cloudinary';
import Swal from 'sweetalert2';
import QRCode from 'react-qr-code';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const DESIGNATION_SUGGESTIONS = [
  'Computer Teacher',
  'Mathematics Teacher',
  'English Teacher',
  'Science Teacher',
  'Urdu Teacher',
  'Islamiat Teacher',
  'Junior Teacher',
  'Senior Teacher',
  'Principal',
  'Vice Principal',
  'Accountant',
  'Admin Officer',
  'Librarian',
  'Physical Education (PTI)'
];

const DEPARTMENT_SUGGESTIONS = [
  'Academic',
  'Management',
  'Accounts',
  'IT Department',
  'Support'
];

const QUALIFICATION_SUGGESTIONS = [
  'Matric',
  'FA / F.Sc',
  'ICS / I.Com',
  'BA / B.Sc',
  'BS Computer Science',
  'BS English',
  'BS Mathematics',
  'B.Ed',
  'MA / M.Sc',
  'M.Ed',
  'MS / M.Phil'
];

const SPECIALIZATION_SUGGESTIONS = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Urdu',
  'Islamic Studies',
  'General Science'
];

const CERTIFICATION_SUGGESTIONS = [
  'B.Ed (1.5 Years)',
  'B.Ed (4 Years)',
  'M.Ed',
  'Montessori Certified',
  'IELTS',
  'Microsoft Certified',
  'ECE Certificate'
];

const SKILL_SUGGESTIONS = [
  'Classroom Management',
  'Lesson Planning',
  'Curriculum Design',
  'MS Office',
  'Communication Skills',
  'Online Teaching'
];

const SUBJECT_SUGGESTIONS = [
  'Mathematics',
  'English',
  'Urdu',
  'General Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Islamiat',
  'Pak Studies',
  'Social Studies',
  'Tarjuma-tul-Quran'
];

const RELATIONSHIP_SUGGESTIONS = [
  'Father',
  'Mother',
  'Husband',
  'Wife',
  'Brother',
  'Sister',
  'Guardian'
];

const CAMPUS_SUGGESTIONS = [
  'Main Campus',
  'Boys Branch',
  'Girls Branch',
  'Junior Wing',
  'Senior Wing'
];

const MANAGER_SUGGESTIONS = [
  'Principal',
  'Vice Principal',
  'Headmistress',
  'Section Head',
  'Administrator'
];

const AddStaff = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { schoolClasses = [], classesLoading } = useSchool();
  
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoInputRef = useRef(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const signatureInputRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrSessionId, setQrSessionId] = useState('');
  const [mobileConnected, setMobileConnected] = useState(false);
  const [generatingStaffId, setGeneratingStaffId] = useState(false);
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [studentSectionsMap, setStudentSectionsMap] = useState({});

  const [formData, setFormData] = useState({
    staffId: 'STF-001',
    username: '',
    name: '',
    role: '',
    department: '',
    email: '',
    phone: '',
    cnic: '',
    salary: '',
    joinDate: new Date().toISOString().split('T')[0],
    // New/optional fields for Phase 2
    staffType: 'Teaching',
    employmentType: 'Permanent',
    status: 'Active',
    dob: '',
    gender: '',
    campus: '',
    reportingManager: '',
    highestQualification: '',
    specialization: '',
    totalExperience: '',
    certifications: [],
    skills: [],
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    address: '',
    photoUrl: '',
    photoPublicId: '',
    signatureUrl: '',
    signaturePublicId: '',
    // Teacher Assignment Fields
    assignedClass: '',
    assignedSection: '',
    subjects: [],
    isClassTeacher: false,
    classTeacherOf: '',
  });

  const [subjectInput, setSubjectInput] = useState('');
  const [certificationInput, setCertificationInput] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

  const isEditing = Boolean(id);

  // Real-time listener for student sections in this school to capture all existing sections
  useEffect(() => {
    const schoolId = userData?.schoolId || localStorage.getItem('schoolId');
    if (!schoolId) return;

    try {
      const q = query(collection(db, 'students'), where('schoolId', '==', schoolId));
      const unsub = onSnapshot(q, (snapshot) => {
        const map = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.class && data.section) {
            const cName = String(data.class).trim();
            const sec = String(data.section).trim();
            if (!map[cName]) map[cName] = new Set();
            map[cName].add(sec);
          }
        });
        const result = {};
        Object.keys(map).forEach((k) => {
          result[k] = Array.from(map[k]);
        });
        setStudentSectionsMap(result);
      }, (err) => console.warn('Students sections listener error:', err));

      return () => unsub();
    } catch (err) {
      console.warn('Error initiating students listener:', err);
    }
  }, [userData?.schoolId]);

  // Derive selected class object from schoolClasses (created in Class Manager)
  const selectedClassObj = useMemo(() => {
    if (!formData.assignedClass) return null;
    return schoolClasses.find(c => 
      c.name === formData.assignedClass || 
      c.id === formData.assignedClass
    );
  }, [formData.assignedClass, schoolClasses]);

  // Derive dynamic sections for the selected class (from class doc in Class Manager + student records + current value)
  const availableSections = useMemo(() => {
    if (!formData.assignedClass) return [];
    const sectionSet = new Set();

    // 1. From class object defined in Class Manager
    if (selectedClassObj) {
      if (Array.isArray(selectedClassObj.sections)) {
        selectedClassObj.sections.forEach(s => s && sectionSet.add(String(s).trim()));
      } else if (typeof selectedClassObj.sections === 'string' && selectedClassObj.sections.trim()) {
        selectedClassObj.sections.split(',').forEach(s => s && sectionSet.add(s.trim()));
      }
    }

    // 2. From actual student records for this class
    const studentSecs = studentSectionsMap[formData.assignedClass] || [];
    studentSecs.forEach(s => s && sectionSet.add(String(s).trim()));

    // 3. Keep current assignedSection if already saved
    if (formData.assignedSection && formData.assignedSection.trim()) {
      sectionSet.add(formData.assignedSection.trim());
    }

    return Array.from(sectionSet).sort();
  }, [formData.assignedClass, selectedClassObj, studentSectionsMap, formData.assignedSection]);

  const toDateString = (val) => {
    if (!val) return '';
    try {
      if (val.toMillis) return new Date(val.toMillis()).toISOString().split('T')[0];
      if (val.seconds) return new Date(val.seconds * 1000).toISOString().split('T')[0];
      if (typeof val === 'number') return new Date(val).toISOString().split('T')[0];
      if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
      if (val instanceof Date) return val.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
    return '';
  };

  useEffect(() => {
    if (isEditing) {
      const fetchStaffData = async () => {
        setLoading(true);
        try {
          const staffData = await getSingleRecord('staff', id);
          if (staffData && staffData.schoolId === userData?.schoolId) {
            setFormData({
              staffId: staffData.staffId || '',
              username: staffData.username || '',
              name: staffData.name || '',
              role: staffData.role || '',
              department: staffData.department || '',
              email: staffData.email || '',
              phone: staffData.phone || '',
              cnic: staffData.cnic || '',
              salary: staffData.salary || '',
              joinDate: toDateString(staffData.joinDate) || new Date().toISOString().split('T')[0],
              // Phase 2 optional fields
              staffType: staffData.staffType || 'Teaching',
              employmentType: staffData.employmentType || 'Permanent',
              status: staffData.status || 'Active',
              dob: toDateString(staffData.dob) || '',
              gender: staffData.gender || '',
              campus: staffData.campus || '',
              reportingManager: staffData.reportingManager || '',
              highestQualification: staffData.highestQualification || '',
              specialization: staffData.specialization || '',
              totalExperience: staffData.totalExperience || '',
              certifications: staffData.certifications || [],
              skills: staffData.skills || [],
              emergencyContactName: staffData.emergencyContactName || '',
              emergencyContactRelationship: staffData.emergencyContactRelationship || '',
              emergencyContactPhone: staffData.emergencyContactPhone || '',
              address: staffData.address || '',
              photoUrl: staffData.photoUrl || staffData.profilePhoto || staffData.photo || staffData.avatar || staffData.imageUrl || '',
              photoPublicId: staffData.photoPublicId || '',
              signatureUrl: staffData.signatureUrl || '',
              signaturePublicId: staffData.signaturePublicId || '',
              assignedClass: staffData.assignedClass || '',
              assignedSection: staffData.assignedSection || '',
              subjects: staffData.subjects || [],
              isClassTeacher: staffData.isClassTeacher || false,
              classTeacherOf: staffData.classTeacherOf || '',
            });
            if (staffData.username) {
              setUsernameManuallyEdited(true);
            }
            if (staffData.subjects) setSubjectInput('');
            const currentStaffPhoto = staffData.photoUrl || staffData.profilePhoto || staffData.photo || staffData.avatar || staffData.imageUrl;
            if (currentStaffPhoto) {
              setPhotoPreview(currentStaffPhoto);
            }
            if (staffData.signatureUrl) {
              setSignaturePreview(staffData.signatureUrl);
            }
          }
        } catch (error) {
          console.error('Error fetching staff data:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchStaffData();
    } else {
      // Automatically generate Staff ID on mount for new staff registration
      generateStaffIdGlobal();
    }
  }, [id, isEditing, userData?.schoolId]);

  const generateStaffIdGlobal = async () => {
    setGeneratingStaffId(true);
    try {
      const schoolId = userData?.schoolId || localStorage.getItem('schoolId') || 'default-school';
      const allStaff = await getRecords('staff', schoolId);
      let maxId = 0;
      if (allStaff && Array.isArray(allStaff) && allStaff.length > 0) {
        allStaff.forEach(s => {
          if (s.staffId) {
            const clean = String(s.staffId).trim();
            const num = parseInt(clean.replace(/^[A-Za-z]+-/, '').replace(/\D/g, ''), 10);
            if (!isNaN(num) && num > maxId) {
              maxId = num;
            }
          }
        });
      }
      const nextId = `STF-${(maxId + 1).toString().padStart(3, '0')}`;
      setFormData(prev => ({ ...prev, staffId: nextId }));
    } catch (err) {
      console.error('Error generating staff ID:', err);
      setFormData(prev => ({ ...prev, staffId: prev.staffId || 'STF-001' }));
    } finally {
      setGeneratingStaffId(false);
    }
  };

  const getUsernameSuggestions = (name) => {
    if (!name || !name.trim()) return [];
    const clean = name.trim().toLowerCase();
    const words = clean.split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')).filter(Boolean);
    if (words.length === 0) return [];

    const suggestions = [];
    const titles = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sir', 'madam', 'miss', 'syed', 'hafiz'];
    const filtered = words.filter(w => !titles.includes(w));
    const effective = filtered.length > 0 ? filtered : words;

    const first = effective[0] || 'staff';
    const last = effective.length > 1 ? effective[effective.length - 1] : '';

    if (first && last) {
      suggestions.push(`${first}${last}`);
      suggestions.push(`${first}.${last}`);
      suggestions.push(`${first[0]}${last}`);
      suggestions.push(`${first}${Math.floor(1000 + Math.random() * 9000)}`);
      suggestions.push(`${first}${last}${Math.floor(10 + Math.random() * 90)}`);
    } else if (first) {
      suggestions.push(`${first}${Math.floor(1000 + Math.random() * 9000)}`);
      suggestions.push(`${first}_staff`);
      suggestions.push(`${first}${Math.floor(10 + Math.random() * 90)}`);
    }

    return Array.from(new Set(suggestions)).slice(0, 5);
  };

  const handleRegenerateUsername = () => {
    if (!formData.name || !formData.name.trim()) {
      Swal.fire({
        icon: 'info',
        title: 'Full Name Required',
        text: 'Please enter staff full name first to get username suggestions.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }
    const suggestions = getUsernameSuggestions(formData.name);
    setUsernameSuggestions(suggestions);
    if (suggestions.length > 0) {
      const randomPicked = suggestions[Math.floor(Math.random() * suggestions.length)];
      setFormData(prev => ({ ...prev, username: randomPicked }));
    }
    setUsernameManuallyEdited(false);
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'warning',
        title: 'Image Required',
        text: 'Please select a valid image file (JPG, PNG, WebP).',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }
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
      // Auto-compress large image files client-side to ensure instant preview and fast upload
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

  const handleSignatureSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'warning',
        title: 'Image Required',
        text: 'Please select an image file for signature (PNG, JPG, WebP).',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'Signature file size must be under 25MB.',
        confirmButtonColor: '#e11d48'
      });
      return;
    }

    try {
      let finalFile = file;
      if (file.size > 500 * 1024) {
        finalFile = await compressImage(file, { maxWidth: 900, maxHeight: 450, quality: 0.85 });
      }
      setSignatureFile(finalFile);
      setSignaturePreview(URL.createObjectURL(finalFile));
    } catch (err) {
      console.warn('Auto-compression fallback to original signature:', err);
      setSignatureFile(file);
      setSignaturePreview(URL.createObjectURL(file));
    }
  };

  const removeSignature = () => {
    setSignatureFile(null);
    setSignaturePreview(formData.signatureUrl || null);
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
        if (data.status === 'connected' || data.device_connected) {
          setMobileConnected(true);
        }
        if (data.status === 'completed' && data.photoData) {
          try {
            const file = dataURLtoFile(data.photoData, `mobile_capture_${Date.now()}.jpg`);
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
            setShowQRModal(false);

            updateDoc(doc(db, 'photo_sessions', session), {
              status: 'connected',
              photoData: null
            }).catch(console.error);

            unsub();
          } catch (e) {
            console.error("Error converting photo data", e);
          }
        }
      }
    });

    return unsub;
  };

  const disconnectMobileQR = () => {
    localStorage.removeItem('taleemi_qr_session');
    setMobileConnected(false);
    setQrSessionId('');
    alert('Mobile camera disconnected.');
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
      Swal.fire({
        icon: 'error',
        title: 'Phone Number Error!',
        html: 'Phone number must be exactly 11 digits.<br>Example: 03001234567<br><br>Please enter a valid Pakistani mobile number.',
        confirmButtonColor: '#e11d48'
      });
      return;
    }

    setLoading(true);
    setUploading(true);
    let finalPhotoUrl = formData.photoUrl;
    let finalPublicId = formData.photoPublicId;
    let finalSignatureUrl = formData.signatureUrl;
    let finalSignaturePublicId = formData.signaturePublicId;

    try {
      const schoolId = userData?.schoolId || 'default-school';
      const staffIdentifier = formData.staffId || id || 'new_staff';

      if (photoFile) {
        setUploadProgress(10);
        if (isEditing && formData.photoPublicId) {
          markForDeletion(formData.photoPublicId).catch(console.error);
        }

        const uploadResult = await uploadStaffPhoto(
          photoFile,
          schoolId,
          staffIdentifier,
          (prog) => setUploadProgress(Math.min(45, 10 + Math.round(prog * 0.35)))
        );

        if (uploadResult && uploadResult.success && (uploadResult.url || uploadResult.secure_url)) {
          finalPhotoUrl = uploadResult.url || uploadResult.secure_url;
          finalPublicId = uploadResult.publicId || uploadResult.public_id || '';
        } else {
          throw new Error(uploadResult?.error || 'Photo upload failed. Please verify the image file.');
        }
        setUploadProgress(45);
      }

      if (signatureFile) {
        setUploadProgress(50);
        if (isEditing && formData.signaturePublicId) {
          markForDeletion(formData.signaturePublicId).catch(console.error);
        }

        const uploadResult = await uploadStaffSignature(
          signatureFile,
          schoolId,
          staffIdentifier,
          (prog) => setUploadProgress(Math.min(90, 50 + Math.round(prog * 0.4)))
        );

        if (uploadResult && uploadResult.success && (uploadResult.url || uploadResult.secure_url)) {
          finalSignatureUrl = uploadResult.url || uploadResult.secure_url;
          finalSignaturePublicId = uploadResult.publicId || uploadResult.public_id || '';
        } else {
          throw new Error(uploadResult?.error || 'Signature upload failed. Please verify the signature file.');
        }
        setUploadProgress(90);
      }

      const toTitleCase = (str) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      };

      const payload = { 
        ...formData, 
        name: toTitleCase(formData.name),
        fatherName: toTitleCase(formData.fatherName),
        phone: sanitizedPhone,
        photoUrl: finalPhotoUrl || '',
        profilePhoto: finalPhotoUrl || '',
        photo: finalPhotoUrl || '',
        avatar: finalPhotoUrl || '',
        photoPublicId: finalPublicId || '',
        signatureUrl: finalSignatureUrl || '',
        signaturePublicId: finalSignaturePublicId || ''
      };
      
      let result;
      if (isEditing) {
        result = await updateRecord('staff', id, payload);
      } else {
        result = await addRecord('staff', payload, schoolId);
      }

      if (result && result.success) {
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
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `Staff member ${isEditing ? 'updated' : 'added'} successfully!`,
          confirmButtonColor: '#3b82f6'
        });
        navigate('/school-admin/staff');
      } else {
        const errorMsg = result?.error?.message || result?.error || 'Database operation failed';
        Swal.fire({
          icon: 'error',
          title: 'Submission Error',
          text: String(errorMsg),
          confirmButtonColor: '#e11d48'
        });
      }
    } catch (err) {
      console.error('Staff submission error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: err?.message || 'An error occurred during submission. Please try again.',
        confirmButtonColor: '#e11d48'
      });
    } finally {
      setLoading(false);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === 'cnic') {
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

    if (name === 'phone' || name === 'contact') {
      let digits = value.replace(/\D/g, '');
      if (digits.length > 11) digits = digits.substring(0, 11);
      value = digits;
    }

    if (name === 'username') {
      setUsernameManuallyEdited(value.trim() !== '');
    }

    if (name === 'assignedClass') {
      const clsObj = schoolClasses.find(c => c.name === value || c.id === value);
      let classSecs = [];
      if (clsObj) {
        if (Array.isArray(clsObj.sections)) {
          classSecs = clsObj.sections.map(s => String(s).trim()).filter(Boolean);
        } else if (typeof clsObj.sections === 'string' && clsObj.sections.trim()) {
          classSecs = clsObj.sections.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      const studSecs = studentSectionsMap[value] || [];
      const combined = Array.from(new Set([...classSecs, ...studSecs]));

      setFormData(prev => ({
        ...prev,
        assignedClass: value,
        assignedSection: combined.includes(prev.assignedSection) ? prev.assignedSection : (combined[0] || '')
      }));
      return;
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-generate or update username when Full Name is typed
      if (name === 'name') {
        const val = value;
        if (!val.trim()) {
          setUsernameSuggestions([]);
          if (!usernameManuallyEdited) {
            updated.username = '';
          }
        } else {
          const suggestions = getUsernameSuggestions(val);
          setUsernameSuggestions(suggestions);
          if (!prev.username || !usernameManuallyEdited) {
            if (suggestions.length > 0) {
              updated.username = suggestions[0];
            }
          }
        }
      }
      return updated;
    });
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
              <User size={18} className="text-primary-500" /> Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Staff ID */}
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
                      placeholder={generatingStaffId ? "Generating ID..." : "e.g. STF-001"} 
                      className="w-full premium-input pl-12 disabled:opacity-50"
                      onChange={handleChange}
                      disabled={isEditing || generatingStaffId}
                    />
                  </div>
                  {!isEditing && (
                    <button 
                      type="button"
                      onClick={generateStaffIdGlobal}
                      disabled={generatingStaffId}
                      className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-xl text-xs font-bold transition-all border border-primary-500/20 whitespace-nowrap flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Auto generate staff ID"
                    >
                      {generatingStaffId ? <Loader2 size={14} className="animate-spin" /> : null}
                      Auto Generate
                    </button>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-dark-muted font-bold flex items-center gap-1">
                      <Sparkles size={11} className="text-primary-400" /> Suggest ID:
                    </span>
                    {['STF', 'TCH', 'EMP'].map(prefix => {
                      const numPart = formData.staffId.replace(/^[A-Za-z]+-/, '') || '001';
                      const formatted = `${prefix}-${numPart}`;
                      return (
                        <button
                          key={prefix}
                          type="button"
                          onClick={() => setFormData(f => ({ ...f, staffId: formatted }))}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${formData.staffId.startsWith(prefix) ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-sm' : 'bg-white/5 hover:bg-primary-500/15 text-dark-muted hover:text-white border border-dark-border'}`}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Status</label>
                <div className="relative">
                  <select
                    name="status"
                    value={formData.status}
                    className="w-full premium-input appearance-none"
                    onChange={handleChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Former Staff">Former Staff</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>

              {/* Full Name */}
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

              {/* App Username */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-black text-dark-muted uppercase tracking-widest">App Username *</label>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={handleRegenerateUsername}
                      className="text-[10px] font-bold text-primary-400 hover:text-primary-300 transition-colors cursor-pointer flex items-center gap-1"
                      title="Regenerate username from Full Name"
                    >
                      <Sparkles size={11} /> Auto Suggest
                    </button>
                  )}
                </div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" size={18} />
                  <input 
                    type="text" 
                    name="username"
                    required
                    value={formData.username || ''}
                    placeholder="e.g. asim8432 (For app login)" 
                    className="w-full premium-input pl-12 border-primary-500/30 focus:border-primary-500"
                    onChange={handleChange}
                  />
                </div>
                <p className="text-[10px] text-dark-muted px-1">Used for mobile app login</p>
                {/* Username Suggestion Chips */}
                {usernameSuggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-dark-muted font-bold flex items-center gap-1">
                      <Sparkles size={11} className="text-primary-400" /> Suggest:
                    </span>
                    {usernameSuggestions.map((uname, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormData(f => ({ ...f, username: uname }));
                          setUsernameManuallyEdited(false);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium transition-all cursor-pointer ${formData.username === uname ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-sm' : 'bg-white/5 hover:bg-primary-500/15 text-dark-muted hover:text-primary-300 border border-dark-border'}`}
                      >
                        @{uname}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Designation */}
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
                {/* Designation Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-dark-muted font-bold flex items-center gap-1">
                    <Sparkles size={11} className="text-primary-400" /> Suggest:
                  </span>
                  {DESIGNATION_SUGGESTIONS.map((roleName, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, role: roleName }))}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${formData.role === roleName ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-sm' : 'bg-white/5 hover:bg-primary-500/15 text-dark-muted hover:text-primary-300 border border-dark-border'}`}
                    >
                      {roleName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department */}
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
                {/* Department Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-dark-muted font-bold flex items-center gap-1">
                    <Sparkles size={11} className="text-primary-400" /> Suggest:
                  </span>
                  {DEPARTMENT_SUGGESTIONS.map((dept, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, department: dept }))}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${formData.department === dept ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-sm' : 'bg-white/5 hover:bg-primary-500/15 text-dark-muted hover:text-primary-300 border border-dark-border'}`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff Type */}
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Staff Type</label>
                <div className="relative">
                  <select
                    name="staffType"
                    value={formData.staffType}
                    className="w-full premium-input appearance-none"
                    onChange={handleChange}
                  >
                    <option value="Teaching">Teaching</option>
                    <option value="Non-Teaching">Non-Teaching</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>

              {/* Employment Type */}
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Employment Type</label>
                <div className="relative">
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    className="w-full premium-input appearance-none"
                    onChange={handleChange}
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Contract">Contract</option>
                    <option value="Visiting">Visiting</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Temporary">Temporary</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-bold mb-4 w-full text-left">Emergency Contact (Optional)</h3>
            <div className="space-y-3">
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="Contact Name"
                className="w-full premium-input"
              />
              <div>
                <input
                  type="text"
                  name="emergencyContactRelationship"
                  value={formData.emergencyContactRelationship}
                  onChange={handleChange}
                  placeholder="Relationship (e.g. Father, Spouse, Brother)"
                  className="w-full premium-input"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  <span className="text-[10px] text-dark-muted font-bold flex items-center gap-1">
                    <Sparkles size={11} className="text-primary-400" /> Suggest:
                  </span>
                  {RELATIONSHIP_SUGGESTIONS.map((rel, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, emergencyContactRelationship: rel }))}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${formData.emergencyContactRelationship === rel ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-sm' : 'bg-white/5 hover:bg-primary-500/15 text-dark-muted hover:text-primary-300 border border-dark-border'}`}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="tel"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                placeholder="Phone Number"
                className="w-full premium-input"
              />
            </div>
          </GlassCard>

          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary-500" /> Qualification & Skills
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Highest Qualification</label>
                <div className="relative">
                  <input
                    type="text"
                    name="highestQualification"
                    value={formData.highestQualification}
                    placeholder="e.g. M.Sc, B.Ed"
                    className="w-full premium-input pl-4"
                    onChange={handleChange}
                  />
                </div>
                {/* Qualification Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-dark-muted font-bold flex items-center gap-1">
                    <Sparkles size={11} className="text-primary-400" /> Suggest:
                  </span>
                  {QUALIFICATION_SUGGESTIONS.map((qual, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, highestQualification: qual }))}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${formData.highestQualification === qual ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-sm' : 'bg-white/5 hover:bg-primary-500/15 text-dark-muted hover:text-primary-300 border border-dark-border'}`}
                    >
                      {qual}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Specialization</label>
                <div className="relative">
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    placeholder="e.g. Mathematics, Computer Science" 
                    className="w-full premium-input pl-4"
                    onChange={handleChange}
                  />
                </div>
                {/* Specialization Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-dark-muted font-bold flex items-center gap-1">
                    <Sparkles size={11} className="text-primary-400" /> Suggest:
                  </span>
                  {SPECIALIZATION_SUGGESTIONS.map((spec, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, specialization: spec }))}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${formData.specialization === spec ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-sm' : 'bg-white/5 hover:bg-primary-500/15 text-dark-muted hover:text-primary-300 border border-dark-border'}`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Total Experience (years)</label>
                <div className="relative">
                  <input
                    type="number"
                    name="totalExperience"
                    value={formData.totalExperience}
                    placeholder="e.g. 5"
                    className="w-full premium-input pl-4"
                    onChange={handleChange}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-dark-muted font-bold flex items-center gap-1">
                    <Sparkles size={11} className="text-primary-400" /> Suggest:
                  </span>
                  {['Fresh', '1 Year', '2 Years', '3 Years', '5+ Years', '10+ Years'].map((exp, idx) => {
                    const num = exp.replace(/\D/g, '') || '0';
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, totalExperience: num }))}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${String(formData.totalExperience) === num ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-sm' : 'bg-white/5 hover:bg-primary-500/15 text-dark-muted hover:text-primary-300 border border-dark-border'}`}
                      >
                        {exp}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Certifications</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={certificationInput}
                    onChange={(e) => setCertificationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ',') && certificationInput.trim()) {
                        e.preventDefault();
                        const v = certificationInput.trim();
                        if (!formData.certifications.includes(v)) {
                          setFormData({ ...formData, certifications: [...formData.certifications, v] });
                        }
                        setCertificationInput('');
                      }
                    }}
                    placeholder="Add certification and press Enter"
                    className="flex-1 premium-input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = certificationInput.trim();
                      if (v && !formData.certifications.includes(v)) {
                        setFormData({ ...formData, certifications: [...formData.certifications, v] });
                        setCertificationInput('');
                      }
                    }}
                    className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-xl text-xs font-bold transition-all border border-primary-500/20 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
                {/* Certification Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-dark-muted font-bold flex items-center gap-1">
                    <Sparkles size={11} className="text-primary-400" /> Suggest:
                  </span>
                  {CERTIFICATION_SUGGESTIONS.map((cert, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (!formData.certifications.includes(cert)) {
                          setFormData(f => ({ ...f, certifications: [...f.certifications, cert] }));
                        }
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${formData.certifications.includes(cert) ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-sm' : 'bg-white/5 hover:bg-primary-500/15 text-dark-muted hover:text-primary-300 border border-dark-border'}`}
                    >
                      + {cert}
                    </button>
                  ))}
                </div>

                {formData.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.certifications.map((c, idx) => (
                      <span key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-lg text-xs font-bold">
                        📜 {c}
                        <button type="button" onClick={() => setFormData({ ...formData, certifications: formData.certifications.filter((_, i) => i !== idx) })} className="text-red-400 hover:text-red-300 ml-1">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Skills</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ',') && skillsInput.trim()) {
                        e.preventDefault();
                        const v = skillsInput.trim();
                        if (!formData.skills.includes(v)) {
                          setFormData({ ...formData, skills: [...formData.skills, v] });
                        }
                        setSkillsInput('');
                      }
                    }}
                    placeholder="Add skill and press Enter"
                    className="flex-1 premium-input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = skillsInput.trim();
                      if (v && !formData.skills.includes(v)) {
                        setFormData({ ...formData, skills: [...formData.skills, v] });
                        setSkillsInput('');
                      }
                    }}
                    className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-xl text-xs font-bold transition-all border border-primary-500/20 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
                {/* Skill Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-dark-muted font-bold flex items-center gap-1">
                    <Sparkles size={11} className="text-primary-400" /> Suggest:
                  </span>
                  {SKILL_SUGGESTIONS.map((skill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (!formData.skills.includes(skill)) {
                          setFormData(f => ({ ...f, skills: [...f.skills, skill] }));
                        }
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${formData.skills.includes(skill) ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-sm' : 'bg-white/5 hover:bg-primary-500/15 text-dark-muted hover:text-primary-300 border border-dark-border'}`}
                    >
                      + {skill}
                    </button>
                  ))}
                </div>

                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.skills.map((s, idx) => (
                      <span key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-lg text-xs font-bold">
                        ⭐ {s}
                        <button type="button" onClick={() => setFormData({ ...formData, skills: formData.skills.filter((_, i) => i !== idx) })} className="text-red-400 hover:text-red-300 ml-1">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <User size={18} className="text-primary-500" /> Personal Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">CNIC / ID Number</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input 
                    type="text" 
                    name="cnic"
                    value={formData.cnic}
                    placeholder="XXXXX-XXXXXXX-X" 
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
                    value={formData.dob}
                    className="w-full premium-input pl-12"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Gender</label>
                <div className="relative">
                  <select
                    name="gender"
                    value={formData.gender}
                    className="w-full premium-input appearance-none"
                    onChange={handleChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Home Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 text-dark-muted" size={18} />
                <textarea 
                  name="address"
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

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Campus</label>
                <div className="relative">
                  <input
                    type="text"
                    name="campus"
                    value={formData.campus}
                    placeholder="Campus (e.g. Main Campus)"
                    className="w-full premium-input pl-4"
                    onChange={handleChange}
                  />
                </div>
                {/* Campus Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-dark-muted font-bold flex items-center gap-1">
                    <Sparkles size={11} className="text-primary-400" /> Suggest:
                  </span>
                  {CAMPUS_SUGGESTIONS.map((camp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, campus: camp }))}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${formData.campus === camp ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-sm' : 'bg-white/5 hover:bg-primary-500/15 text-dark-muted hover:text-primary-300 border border-dark-border'}`}
                    >
                      {camp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Reporting Manager</label>
                <div className="relative">
                  <input
                    type="text"
                    name="reportingManager"
                    value={formData.reportingManager}
                    placeholder="Reporting Manager (e.g. Principal)"
                    className="w-full premium-input pl-4"
                    onChange={handleChange}
                  />
                </div>
                {/* Manager Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-dark-muted font-bold flex items-center gap-1">
                    <Sparkles size={11} className="text-primary-400" /> Suggest:
                  </span>
                  {MANAGER_SUGGESTIONS.map((mgr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, reportingManager: mgr }))}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${formData.reportingManager === mgr ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-sm' : 'bg-white/5 hover:bg-primary-500/15 text-dark-muted hover:text-primary-300 border border-dark-border'}`}
                    >
                      {mgr}
                    </button>
                  ))}
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
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-black text-dark-muted uppercase tracking-widest">Assigned Class</label>
                  {schoolClasses.length > 0 && (
                    <span className="text-[11px] text-primary-400 font-semibold">{schoolClasses.length} Classes Created</span>
                  )}
                </div>
                <div className="relative">
                  <select
                    name="assignedClass"
                    value={formData.assignedClass}
                    className="w-full premium-input appearance-none"
                    onChange={handleChange}
                  >
                    <option value="">Select Class</option>
                    {classesLoading ? (
                      <option value="" disabled>School classes load ho rahi hain...</option>
                    ) : schoolClasses.length === 0 ? (
                      <option value="" disabled>Is school ki koi class nahi mili (Class Manager se create karein)</option>
                    ) : (
                      <>
                        {schoolClasses.map(cls => (
                          <option key={cls.id || cls.name} value={cls.name}>
                            {cls.name}
                          </option>
                        ))}
                        {formData.assignedClass && !schoolClasses.some(c => c.name === formData.assignedClass) && (
                          <option value={formData.assignedClass}>{formData.assignedClass}</option>
                        )}
                      </>
                    )}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
                {schoolClasses.length === 0 && !classesLoading && (
                  <p className="text-[11px] text-amber-400 px-1">
                    ⚠️ Is school ki koi class Class Manager mein add nahi hai. Panel ke "Class Manager" se classes create karein.
                  </p>
                )}
              </div>

              {/* Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-black text-dark-muted uppercase tracking-widest">Section</label>
                  {formData.assignedClass && availableSections.length > 0 && (
                    <span className="text-[11px] text-primary-400 font-semibold">{availableSections.length} Section(s)</span>
                  )}
                </div>
                <div className="relative">
                  <select
                    name="assignedSection"
                    value={formData.assignedSection}
                    disabled={!formData.assignedClass}
                    className="w-full premium-input appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                    onChange={handleChange}
                  >
                    {!formData.assignedClass ? (
                      <option value="">Pehle Class Select Karein</option>
                    ) : availableSections.length === 0 ? (
                      <option value="">No sections defined in Class Manager</option>
                    ) : (
                      <>
                        <option value="">Select Section</option>
                        {availableSections.map(s => (
                          <option key={s} value={s}>Section {s}</option>
                        ))}
                      </>
                    )}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
                {/* If selected class has no sections configured yet in panel, let user enter custom section */}
                {formData.assignedClass && availableSections.length === 0 && (
                  <div className="pt-1">
                    <input
                      type="text"
                      name="assignedSection"
                      placeholder="Section likhein (e.g. A, B, Green)..."
                      value={formData.assignedSection}
                      onChange={handleChange}
                      className="w-full premium-input text-xs py-2 uppercase"
                    />
                    <p className="text-[11px] text-dark-muted mt-1 px-1">
                      Tip: Class Manager mein is class ke sections add karein taake dropdown mein show hon.
                    </p>
                  </div>
                )}
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
                    className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-xl text-xs font-bold transition-all border border-primary-500/20 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {/* Subject Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  <span className="text-[10px] text-dark-muted font-bold flex items-center gap-1">
                    <Sparkles size={11} className="text-primary-400" /> Suggest:
                  </span>
                  {SUBJECT_SUGGESTIONS.map((sub, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (!formData.subjects.includes(sub)) {
                          setFormData(f => ({ ...f, subjects: [...f.subjects, sub] }));
                        }
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${formData.subjects.includes(sub) ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-sm' : 'bg-white/5 hover:bg-primary-500/15 text-dark-muted hover:text-primary-300 border border-dark-border'}`}
                    >
                      + {sub}
                    </button>
                  ))}
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
            <h2 className="text-lg font-bold mb-6 w-full text-left">Staff Photo & Signature</h2>
            
            <div className="flex flex-col sm:flex-row gap-6 w-full justify-center items-start">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-dark-muted">Photo</span>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <div 
                  onClick={() => photoInputRef.current?.click()}
                  className="relative group cursor-pointer"
                  title="Click to select staff photo"
                >
                  <div className="w-24 h-24 rounded-full bg-dark-hover border-2 border-dashed border-dark-border flex flex-col items-center justify-center gap-2 overflow-hidden hover:border-primary-500 transition-all shadow-inner">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera size={24} className="text-dark-muted group-hover:text-primary-500 transition-all" />
                        <span className="text-[9px] uppercase font-black tracking-widest text-dark-muted group-hover:text-primary-500">Upload</span>
                      </>
                    )}
                  </div>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto();
                      }}
                      className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="mt-2">
                  <button 
                    type="button" 
                    onClick={() => photoInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-dark-hover border border-dark-border text-[10px] font-bold text-dark-text hover:bg-dark-border transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload size={12} />
                    Upload Photo
                  </button>
                </div>
              </div>

              {/* Signature Upload */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-dark-muted">Signature</span>
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureSelect}
                  className="hidden"
                />
                <div 
                  onClick={() => signatureInputRef.current?.click()}
                  className="relative group cursor-pointer"
                  title="Click to select staff signature"
                >
                  <div className="w-32 h-24 rounded-lg bg-dark-hover border-2 border-dashed border-dark-border flex flex-col items-center justify-center gap-2 overflow-hidden hover:border-primary-500 transition-all shadow-inner">
                    {signaturePreview ? (
                      <img src={signaturePreview} alt="Signature Preview" className="w-full h-full object-contain bg-white" />
                    ) : (
                      <>
                        <Upload size={24} className="text-dark-muted group-hover:text-primary-500 transition-all" />
                        <span className="text-[9px] uppercase font-black tracking-widest text-dark-muted group-hover:text-primary-500">Upload</span>
                      </>
                    )}
                  </div>
                  {signaturePreview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSignature();
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="mt-2">
                  <button 
                    type="button" 
                    onClick={() => signatureInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-dark-hover border border-dark-border text-[10px] font-bold text-dark-text hover:bg-dark-border transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload size={12} />
                    Upload Signature
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6 w-full justify-center">
              <button 
                type="button" 
                onClick={startMobileQRConnect}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-colors"
              >
                <Smartphone size={16} /> {localStorage.getItem('taleemi_qr_session') ? 'Open Camera' : 'Connect Mobile'}
              </button>
              {localStorage.getItem('taleemi_qr_session') && (
                <button
                  type="button"
                  onClick={disconnectMobileQR}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
                >
                  <X size={16} /> Disconnect
                </button>
              )}
            </div>

            <p className="text-[10px] text-dark-muted mt-4">Passport size photo & transparent signature (Auto-compressed HD up to 25MB)</p>

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
                  value={`https://taleemidunya-pro-ed44e.web.app/#/snap/${qrSessionId}`}
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
