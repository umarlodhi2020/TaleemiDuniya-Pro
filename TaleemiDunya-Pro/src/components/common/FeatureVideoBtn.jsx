import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, X, ExternalLink, Sparkles, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

export const DEFAULT_FEATURE_VIDEOS = {
  'dashboard-core': {
    title: 'Executive Dashboard & System Overview',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: 'Learn how to monitor real-time school statistics, student strength, live cash collections, and use the AI School Copilot.',
    steps: [
      '1. Dashboard par live student strength, daily attendance aur fee recovery check karein.',
      '2. AI School Copilot se kisi bhi report ya talib-e-ilm ka mukammal record hasil karein.',
      '3. Top action bar se 1-click mein fee voucher ya attendance par switch karein.'
    ]
  },
  'student-management': {
    title: 'Student Admissions, Profiles & ID Cards',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: 'Complete guide on registering new students, managing student directories, student 360 profile, and printing barcode ID cards.',
    steps: [
      '1. "Add Student" par ja kar talib-e-ilm ka B-Form/CNIC, father name aur class select karein.',
      '2. Student profile se photo upload karein jo Cloudinary par save hogi.',
      '3. "ID Cards" par ja kar barcode wale official school card single click mein print karein.'
    ]
  },
  'staff-management': {
    title: 'Staff Directory, Biometric Setup & Attendance',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: 'How to onboard teachers, track daily biometric staff attendance, assign proxy substitution, and manage staff ID cards.',
    steps: [
      '1. "Add Staff" se naye teachers aur mulazmeen ka record aur basic salary darj karein.',
      '2. "Staff Attendance" se daily check-in / check-out mark karein.',
      '3. "Proxy Substitution" se ghair hazir teacher ke periods doosre teachers ko assign karein.'
    ]
  },
  'finance-accounts': {
    title: 'Fee Challan Generation, Fee Collection & Ledger',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: 'Step-by-step tutorial on generating monthly fee vouchers, tracking fee defaulters, collecting payments, and managing expenses.',
    steps: [
      '1. "Generate Voucher" se poori class ya single student ke 3-part bank fee challans print karein.',
      '2. "Collect Fee" se voucher number scan ya search kar ke 1-second mein fee receive karein.',
      '3. "Fee Defaulters" se baqaya jaat wale parents ko WhatsApp par direct notice send karein.'
    ]
  },
  'academic': {
    title: 'Academics, Timetable Builder & Homework Diary',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: 'Master class timetable scheduling, sending daily homework diaries to parents, online quiz conduction, and syllabus tracking.',
    steps: [
      '1. "Timetable Builder" se baghair clash ke periods aur teachers ka time schedule set karein.',
      '2. "Daily Diary" se rozana ka homework post karein jo parents ke portal par foran jata hai.',
      '3. "Syllabus Tracker" se check karein ke har subject ka kitne percent syllabus cover ho chuka hai.'
    ]
  },
  'exam-results': {
    title: 'Exam Management, Marks Entry & Marksheet Generator',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: 'Learn how to setup examination terms, print student admit cards, bulk marks entry, and generate official school report cards.',
    steps: [
      '1. "Exam Management" se naya term (Mid-Term / Final Term) create karein.',
      '2. "Marks Entry" par ja kar class select karein aur spreadsheet style mein marks darj karein.',
      '3. "Marksheet Generator" se position, grading aur watermark wale result card print karein.'
    ]
  },
  'resources-facilities': {
    title: 'Gate Pass, Visitor Security & Facilities',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: 'How to use QR gate scanner, log visitors, manage school library, student transport vans, and security gate passes.',
    steps: [
      '1. "Security Gate Scanner" se student ya staff ke card ka QR scan kar ke entry/exit record karein.',
      '2. "Visitor Manager" se school aane wale mehmaan ka CNIC aur phone darj kar ke pass issue karein.',
      '3. "Transport Manager" se school vans aur unke monthly routes monitor karein.'
    ]
  },
  'portal-services': {
    title: 'WhatsApp Bot Automation, E-Services & Cloud Backups',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: 'Configure 24/7 autonomous WhatsApp messaging bot, Google Drive automated cloud backups, multi-branch hubs, and school settings.',
    steps: [
      '1. "WhatsApp Bot Hub" se automated ghair haziri alerts aur fee notices on karein.',
      '2. "Cloud Backup" se 1-click mein poora database apne Google Drive par mehfooz karein.',
      '3. "School Settings" se school ka naam, logo aur signature update karein.'
    ]
  },
  'admission-crm': {
    title: 'Online Admission CRM & Lead Pipeline',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: 'Generate public admission apply links & QR codes, manage inquiry statuses, and dispatch WhatsApp admission offer letters.',
    steps: [
      '1. "Public Apply Link / QR" copy kar ke school ke Facebook page aur banners par lagayein.',
      '2. Parents online form bharein ge to record seedha is CRM mein show hoga.',
      '3. Candidate ka status "Interview" ya "Enrolled" karein aur WhatsApp par Offer Letter bhejein.'
    ]
  },
  'family-tree': {
    title: 'Family Tree & Siblings Discount Engine',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: 'Link brothers and sisters under one parent CNIC, apply automated sibling fee discounts, and print combined family ledgers.',
    steps: [
      '1. System walid ke CNIC aur Father Name se tamam behan bhaiyon ko auto group karta hai.',
      '2. "Edit Profile" se walid ka record ek dafa update karein, tamam bachon ka record update hoga.',
      '3. "Combined Fee Ledger" se ek hi family ke tamam bachon ka mukammal hisab print karein.'
    ]
  },
  'attendance': {
    title: 'Student Daily Attendance & QR Scanner',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: '1-click classroom attendance register, 2D QR barcode scanner, and instant automated WhatsApp absentee alerts.',
    steps: [
      '1. Class select karein aur Present (P) ya Absent (A) par click karein.',
      '2. Ghair hazir bachon ke parents ko foran automated WhatsApp notification chala jata hai.',
      '3. Monthly attendance register se monthly attendance report print karein.'
    ]
  },
  'admit-cards': {
    title: 'Student Examination Admit Cards Generator',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: 'Generate and batch print official examination roll number slips with student photos and school watermark.',
    steps: [
      '1. Exam Term aur Class select karein.',
      '2. Datesheet verify karein aur "Generate Admit Cards" dabayein.',
      '3. Tamam class ke roll number slips A4 page par auto-formatted print karein.'
    ]
  },
  'payroll': {
    title: 'Staff Payroll, Deductions & WhatsApp Payslips',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: 'Automated staff salary calculation based on attendance, allowances, loan advances, and 1-click bulk WhatsApp payslip dispatch.',
    steps: [
      '1. Mahana attendance ki bunyad par ghair haziri ki deduction khud ba khud calculate hoti hai.',
      '2. "Dispatch WhatsApp Payslips" se tamam teachers ke mobile par unki salary slip send karein.',
      '3. Complete monthly salary sheet aur bank payment register print karein.'
    ]
  },
  'whatsapp-automation': {
    title: 'WhatsApp 24/7 AI Bot & Automated Alerts',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: 'Setup automatic fee reminder notices, morning diary dispatch, and parent query chatbot on WhatsApp.',
    steps: [
      '1. Bot status verify karein aur automated cron schedules check karein.',
      '2. Subah 8:00 baje absent alert aur dopehar ko daily homework auto deliver hota hai.',
      '3. Parents ke kisi bhi sawal ka AI chatbot foran jawab deta hai.'
    ]
  },
  'cloud-backup': {
    title: 'Google Drive Double-Safe Cloud Backup Vault',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    description: '1-Click automated database backup archive directly into your personal Google Drive account.',
    steps: [
      '1. Apna Google account link karein.',
      '2. "Backup Now" par click karein aur poora school data JSON format mein drive par save karein.',
      '3. Kisi bhi waqt 1-click se pichla backup restore karein.'
    ]
  }
};

const FeatureVideoBtn = ({ featureId, variant = 'default' }) => {
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoSteps, setVideoSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!featureId) {
      setLoading(false);
      return;
    }

    const defaultData = DEFAULT_FEATURE_VIDEOS[featureId] || null;

    const fetchVideo = async () => {
      try {
        const q = query(collection(db, 'featureVideos'), where('featureId', '==', featureId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setVideoUrl(data.videoUrl || defaultData?.videoUrl);
          setVideoTitle(data.title || defaultData?.title || 'How it works');
          setVideoDesc(data.description || defaultData?.description || '');
          setVideoSteps(defaultData?.steps || []);
        } else if (defaultData) {
          setVideoUrl(defaultData.videoUrl);
          setVideoTitle(defaultData.title);
          setVideoDesc(defaultData.description || '');
          setVideoSteps(defaultData.steps || []);
        }
      } catch (err) {
        console.warn('Failed to load Firestore feature video, using fallback:', err);
        if (defaultData) {
          setVideoUrl(defaultData.videoUrl);
          setVideoTitle(defaultData.title);
          setVideoDesc(defaultData.description || '');
          setVideoSteps(defaultData.steps || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [featureId]);

  if (loading || !videoUrl) return null;

  // Parse YouTube URL to embed
  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2] && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`;
      }
    }
    return url;
  };

  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  const src = getEmbedUrl(videoUrl);

  return (
    <>
      {variant === 'icon' ? (
        <button 
          onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
          className="p-1 rounded-lg hover:bg-red-500/10 text-red-500 transition-all flex items-center justify-center group"
          title={`Watch Tutorial: ${videoTitle}`}
        >
          <Play size={14} className="fill-current text-red-500 group-hover:scale-125 transition-transform" />
        </button>
      ) : (
        <button 
          onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 group"
          title={`Watch Tutorial: ${videoTitle}`}
        >
          <Play size={13} className="fill-current group-hover:scale-110 transition-transform" />
          <span>Video Tutorial (ویڈیو دیکھیں)</span>
        </button>
      )}

      {showModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-4xl bg-[#0f172a] rounded-3xl overflow-hidden shadow-2xl relative border border-slate-800 flex flex-col max-h-[95vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-800 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                  <Play size={16} className="fill-current" />
                </div>
                <div>
                  <h3 className="text-white font-extrabold text-sm sm:text-base leading-tight">
                    {videoTitle}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">TaleemiDunya-Pro Feature Video Tutorial</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors"
                >
                  <span>Open in YouTube</span>
                  <ExternalLink size={13} />
                </a>

                <button 
                  onClick={() => setShowModal(false)}
                  className="p-1.5 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl text-slate-400 transition-colors"
                  title="Close Tutorial"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {/* Video Player */}
            <div className="aspect-video w-full bg-black flex items-center justify-center relative">
              {isYouTube ? (
                <iframe
                  src={src}
                  title={videoTitle}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <video 
                  src={src} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Step-by-Step Practical Usage Guide */}
            <div className="p-4 sm:p-5 bg-slate-900/95 border-t border-slate-800 text-xs space-y-3 overflow-y-auto max-h-[180px] custom-scrollbar">
              <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-wider text-[11px]">
                <Sparkles size={14} />
                <span>Quick Usage Guide / فیچر استعمال کرنے کا طریقہ</span>
              </div>

              {videoSteps.length > 0 ? (
                <div className="space-y-1.5">
                  {videoSteps.map((st, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-300">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-300">{videoDesc}</p>
              )}

              <div className="pt-1 text-[11px] text-slate-500 flex items-center gap-1.5 border-t border-slate-800/80">
                <HelpCircle size={13} className="text-slate-400" />
                <span>Super Admin panel se kisi bhi feature ka apna custom YouTube link tabdeel kiya ja sakta hai.</span>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default FeatureVideoBtn;
