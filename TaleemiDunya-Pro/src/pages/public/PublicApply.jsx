import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { 
  GraduationCap, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  School, 
  CheckCircle2, 
  Send, 
  Printer, 
  MessageCircle, 
  Bus, 
  FileText, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

const DEFAULT_CLASSES = [
  'Playgroup',
  'Nursery',
  'Prep / KG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9 (Matric)',
  'Class 10 (Matric)',
  'O-Levels',
  'A-Levels',
  'FSc Pre-Medical',
  'FSc Pre-Engineering',
  'ICS / Computer Science',
  'I.Com'
];

export default function PublicApply() {
  const params = useParams();

  // Extract schoolId from params or directly from hash/path with fallbacks
  const getSchoolId = () => {
    if (params.schoolId) return params.schoolId;
    if (params['*']) return params['*'].replace(/^\/+|\/+$/g, '');
    try {
      const fullUrl = (window.location.hash || window.location.pathname || '');
      const segments = fullUrl.replace(/^#\/?/, '').split('/').filter(Boolean);
      const applyIdx = segments.findIndex(s => s === 'apply' || s === 'admission');
      if (applyIdx !== -1 && segments[applyIdx + 1]) {
        return segments[applyIdx + 1].trim();
      }
    } catch (e) {}
    return '';
  };

  const schoolId = getSchoolId();

  const [schoolData, setSchoolData] = useState(null);
  const [classList, setClassList] = useState(DEFAULT_CLASSES);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedLead, setSubmittedLead] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    studentName: '',
    fatherName: '',
    phone: '',
    gender: 'Male',
    dob: '',
    classApplied: 'Class 1',
    previousSchool: '',
    address: '',
    transportNeeded: 'No',
    notes: ''
  });

  // Fetch School Info & Classes
  useEffect(() => {
    const fetchSchoolAndClasses = async () => {
      setLoading(true);
      try {
        if (!schoolId) {
          setLoading(false);
          return;
        }

        // 1. Fetch School profile
        try {
          const schoolRef = doc(db, 'schools', schoolId);
          const snap = await getDoc(schoolRef);
          if (snap.exists()) {
            setSchoolData({ id: snap.id, ...snap.data() });
          }
        } catch (e) {
          console.warn('Could not fetch school details directly:', e);
        }

        // 2. Fetch School's configured classes
        try {
          const classQuery = query(collection(db, 'classes'), where('schoolId', '==', schoolId));
          const classSnap = await getDocs(classQuery);
          if (!classSnap.empty) {
            const list = [];
            classSnap.forEach(d => {
              const c = d.data();
              if (c.name) list.push(c.name);
            });
            if (list.length > 0) {
              // Sort naturally
              list.sort((a, b) => {
                const numA = parseInt(a, 10);
                const numB = parseInt(b, 10);
                if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
                return String(a).localeCompare(String(b));
              });
              setClassList(list);
              setFormData(prev => ({ ...prev, classApplied: list[0] }));
            }
          }
        } catch (e) {
          console.warn('Could not fetch custom classes, using defaults:', e);
        }

      } catch (err) {
        console.error('Error initializing admission page:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolAndClasses();
  }, [schoolId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    if (!formData.studentName.trim()) {
      setErrorMessage('Please enter the student\'s full name (طالب علم کا نام درج کریں)');
      return;
    }
    if (!formData.fatherName.trim()) {
      setErrorMessage('Please enter father / guardian\'s name (والد کا نام درج کریں)');
      return;
    }
    if (!formData.phone.trim() || formData.phone.trim().length < 8) {
      setErrorMessage('Please provide a valid active WhatsApp / Mobile number (درست موبائل نمبر درج کریں)');
      return;
    }

    setSubmitting(true);

    try {
      const activeSchoolId = schoolId || 'default-school';
      const referenceNo = `ADM-${Math.floor(100000 + Math.random() * 900000)}`;
      const currentDate = new Date().toISOString().split('T')[0];

      const leadPayload = {
        referenceNo,
        childName: formData.studentName.trim(),
        studentName: formData.studentName.trim(),
        fatherName: formData.fatherName.trim(),
        phone: formData.phone.trim(),
        whatsappNumber: formData.phone.trim(),
        gender: formData.gender,
        dob: formData.dob || '',
        classApplied: formData.classApplied,
        classInterest: formData.classApplied,
        previousSchool: formData.previousSchool.trim(),
        address: formData.address.trim(),
        transportNeeded: formData.transportNeeded,
        notes: formData.notes.trim(),
        status: 'new',
        source: 'Online Public Portal',
        schoolId: activeSchoolId,
        schoolName: schoolData?.name || schoolData?.schoolName || 'School',
        dateApplied: currentDate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // 1. Save directly into admission_leads collection
      const docRef = await addDoc(collection(db, 'admission_leads'), leadPayload);

      // 2. Also register into inquiries collection for synchronized CRM view
      try {
        await addDoc(collection(db, 'inquiries'), {
          name: formData.studentName.trim(),
          fatherName: formData.fatherName.trim(),
          phone: formData.phone.trim(),
          classInterest: formData.classApplied,
          source: 'Online Admission Portal',
          message: formData.notes.trim() || `Online admission inquiry for ${formData.classApplied}. Prev School: ${formData.previousSchool || 'N/A'}. Address: ${formData.address || 'N/A'}.`,
          status: 'Pending',
          schoolId: activeSchoolId,
          createdAt: serverTimestamp()
        });
      } catch (inqErr) {
        console.warn('Inquiry mirror notice:', inqErr);
      }

      setSubmittedLead({
        ...leadPayload,
        id: docRef?.id || referenceNo
      });

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error('Submission error:', err);
      setErrorMessage('Submission failed: ' + (err.message || 'Please check your connection and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const resetForm = () => {
    setSubmittedLead(null);
    setFormData({
      studentName: '',
      fatherName: '',
      phone: '',
      gender: 'Male',
      dob: '',
      classApplied: classList[0] || 'Class 1',
      previousSchool: '',
      address: '',
      transportNeeded: 'No',
      notes: ''
    });
  };

  // School display variables
  const schoolName = schoolData?.name || schoolData?.schoolName || 'School Online Admission Portal';
  const schoolPhone = schoolData?.phone || schoolData?.contactNumber || schoolData?.whatsappNumber || '';
  const schoolAddress = schoolData?.address || schoolData?.city || '';
  const schoolLogo = schoolData?.logo || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start py-6 px-3 sm:px-6 relative overflow-x-hidden selection:bg-purple-600 selection:text-white">
      
      {/* Background Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-purple-600/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[140px] rounded-full pointer-events-none -z-10" />

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          #admission-receipt {
            border: 2px solid #000000 !important;
            color: #000000 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 20px !important;
          }
          #admission-receipt * {
            color: #000000 !important;
            border-color: #cccccc !important;
          }
        }
      `}</style>

      {/* Header Container */}
      <header className="w-full max-w-2xl text-center mb-6 pt-2 no-print">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
          <GraduationCap size={15} /> Admissions Open 2026 – 2027
        </div>

        <div className="flex flex-col items-center justify-center gap-3">
          {schoolLogo ? (
            <img 
              src={schoolLogo} 
              alt={schoolName} 
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-2xl bg-white/5 p-2 border border-white/10 shadow-xl"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <School size={36} />
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white px-2">
            {schoolName}
          </h1>

          {(schoolAddress || schoolPhone) && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              {schoolAddress && (
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-purple-400" /> {schoolAddress}
                </span>
              )}
              {schoolPhone && (
                <span className="flex items-center gap-1">
                  <Phone size={13} className="text-purple-400" /> {schoolPhone}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-2xl">
        {loading ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
            <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-200">Loading Admission Portal...</h3>
            <p className="text-xs text-slate-400 mt-1">Please wait a moment</p>
          </div>
        ) : submittedLead ? (
          /* SUCCESS SUBMISSION RECEIPT */
          <div id="admission-receipt" className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-purple-500/30 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-black text-white">Application Submitted Successfully!</h2>
              <p className="text-sm text-emerald-400 font-semibold">
                آپ کا داخلہ فارم کامیابی کے ساتھ موصول ہو گیا ہے
              </p>
              <div className="inline-block mt-2 px-4 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs font-mono font-bold text-purple-300">
                Application Ref: <span className="text-white font-extrabold">{submittedLead.referenceNo}</span>
              </div>
            </div>

            {/* Candidate Summary Card */}
            <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-5 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                Candidate Admission Summary / طالب علم کی تفصیلات
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Student Name:</span>
                  <span className="text-white font-bold text-sm">{submittedLead.childName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Father Name:</span>
                  <span className="text-white font-bold text-sm">{submittedLead.fatherName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Class Applied:</span>
                  <span className="text-purple-400 font-black text-sm">{submittedLead.classApplied}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Contact Phone:</span>
                  <span className="text-white font-mono font-bold text-sm">{submittedLead.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Gender:</span>
                  <span className="text-slate-200 font-semibold">{submittedLead.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Date of Application:</span>
                  <span className="text-slate-200 font-semibold">{submittedLead.dateApplied}</span>
                </div>
                {submittedLead.previousSchool && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Previous School:</span>
                    <span className="text-slate-200 font-semibold">{submittedLead.previousSchool}</span>
                  </div>
                )}
                {submittedLead.address && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Residential Address:</span>
                    <span className="text-slate-200 font-semibold">{submittedLead.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* School Contact Notification */}
            <div className="bg-purple-950/30 border border-purple-500/20 rounded-2xl p-4 text-xs text-purple-200 flex items-start gap-3">
              <ShieldCheck className="text-purple-400 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-purple-300">Next Steps / اگلا مرحلہ:</p>
                <p className="mt-1 text-slate-300 leading-relaxed">
                  The school admission office will review your inquiry and schedule an entry test / interview. You will receive an official notification via WhatsApp / Call shortly.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2 no-print">
              <button
                onClick={handlePrint}
                className="flex-1 min-w-[140px] py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all shadow-md"
              >
                <Printer size={16} /> Print / Save Receipt
              </button>

              {schoolPhone && (
                <a
                  href={`https://wa.me/${schoolPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Assalam-o-Alaikum! We have submitted an online admission form for ${submittedLead.childName} for ${submittedLead.classApplied}. Reference: ${submittedLead.referenceNo}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 min-w-[140px] py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/30"
                >
                  <MessageCircle size={16} /> WhatsApp School
                </a>
              )}

              <button
                onClick={resetForm}
                className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw size={15} /> Submit Another Application
              </button>
            </div>
          </div>
        ) : (
          /* ADMISSION INQUIRY FORM */
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl relative">
            
            <div className="border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <FileText className="text-purple-400" size={24} />
                Online Admission Application Form
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Please provide accurate student and parent details. All inquiries go directly to the admission office.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
                <AlertCircle className="shrink-0 text-rose-400" size={18} />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* SECTION 1: Student Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-400">
                  <User size={15} />
                  <span>Student Information / طالب علم کی معلومات</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Student Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="studentName"
                      required
                      value={formData.studentName}
                      onChange={handleChange}
                      placeholder="e.g. Muhammad Ali"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white text-xs outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Gender <span className="text-rose-400">*</span>
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white text-xs outline-none transition-all"
                    >
                      <option value="Male">Male (طالب علم)</option>
                      <option value="Female">Female (طالبہ)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Class / Grade Seeking Admission <span className="text-rose-400">*</span>
                    </label>
                    <select
                      name="classApplied"
                      value={formData.classApplied}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-purple-300 font-bold text-xs outline-none transition-all"
                    >
                      {classList.map((cls, idx) => (
                        <option key={idx} value={cls} className="bg-slate-900 text-white">
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Date of Birth (تاریخ پیدائش)
                    </label>
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Previous School / Academy (سابقہ اسکول)
                    </label>
                    <input
                      type="text"
                      name="previousSchool"
                      value={formData.previousSchool}
                      onChange={handleChange}
                      placeholder="Name of last school attended (optional)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white text-xs outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Father / Guardian Details */}
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-400">
                  <Phone size={15} />
                  <span>Father & Guardian Contact / والد اور رابطہ کی معلومات</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Father / Guardian Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="fatherName"
                      required
                      value={formData.fatherName}
                      onChange={handleChange}
                      placeholder="e.g. Tariq Mehmood"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white text-xs outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      WhatsApp / Mobile Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="03001234567"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-emerald-300 font-mono text-xs outline-none transition-all placeholder:text-slate-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Test dates and updates will be sent here</span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Residential Address / Area (رہائش کا پتہ)
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="e.g. Street 4, Sector G-10, Lahore"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white text-xs outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      School Transport Needed? (وین / ٹرانسپورٹ سہولت)
                    </label>
                    <select
                      name="transportNeeded"
                      value={formData.transportNeeded}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white text-xs outline-none transition-all"
                    >
                      <option value="No">No (خود پک اینڈ ڈراپ کریں گے)</option>
                      <option value="Yes">Yes (اسکول وین کی ضرورت ہے)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Any Special Message or Query (کوئی خاص پیغام)
                    </label>
                    <input
                      type="text"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Optional questions or remarks"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white text-xs outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Submit Admission Application (داخلہ فارم جمع کرائیں)</span>
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-slate-500 mt-3">
                  Protected & secured by TaleemiDunya-Pro Multi-Tenant Cloud.
                </p>
              </div>

            </form>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-500 space-y-1 no-print">
        <p>© {new Date().getFullYear()} {schoolName}. All rights reserved.</p>
        <p className="text-[10px] text-slate-600">Powered by TaleemiDunya-Pro Smart School Management System</p>
      </footer>

    </div>
  );
}
