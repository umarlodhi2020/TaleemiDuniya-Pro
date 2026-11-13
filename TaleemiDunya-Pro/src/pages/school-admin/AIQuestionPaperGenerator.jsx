import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  Printer, 
  Download, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Check, 
  CheckCircle2, 
  BookOpen, 
  Clock, 
  Award, 
  Layers, 
  Sliders, 
  Eye, 
  Edit3, 
  Copy, 
  Share2, 
  HelpCircle,
  School,
  Save,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { collection, addDoc, getDocs, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Pre-loaded curriculum subjects and sample question banks for instant generation
const SUBJECT_CURRICULUM = {
  'Mathematics': {
    chapters: ['Unit 1: Matrices & Determinants', 'Unit 2: Real & Complex Numbers', 'Unit 3: Logarithms', 'Unit 4: Algebraic Expressions', 'Unit 5: Factorization', 'Unit 6: Algebraic Manipulation', 'Unit 7: Linear Equations & Inequalities', 'Unit 8: Linear Graphs', 'Unit 9: Coordinate Geometry'],
    sampleMcqs: [
      { q: 'The order of matrix [2  1] is:', options: ['2-by-1', '1-by-2', '1-by-1', '2-by-2'], ans: '1-by-2' },
      { q: 'Value of i^9 (iota power 9) is equal to:', options: ['1', '-1', 'i', '-i'], ans: 'i' },
      { q: 'log_a(1) is always equal to:', options: ['0', '1', 'a', 'undefined'], ans: '0' },
      { q: 'In matrix addition, both matrices must have:', options: ['Same rows', 'Same columns', 'Same order', 'Square shape'], ans: 'Same order' },
      { q: 'A polynomial of degree 2 is known as:', options: ['Linear', 'Quadratic', 'Cubic', 'Biquadratic'], ans: 'Quadratic' },
      { q: 'The conjugate of (3 + 4i) is:', options: ['3 - 4i', '-3 + 4i', '-3 - 4i', '4 + 3i'], ans: '3 - 4i' }
    ],
    sampleShort: [
      { q: 'Define Singular and Non-Singular matrix with examples.' },
      { q: 'Find the multiplicative inverse of matrix A = [[2, 1], [3, 2]].' },
      { q: 'Simplify: (25)^(1/2) * (64)^(1/3) / (16)^(1/4).' },
      { q: 'Express log(x^2 * y / z^3) in the sum and difference of logarithms.' },
      { q: 'Factorize the algebraic expression: x^4 + 64.' },
      { q: 'Solve the linear equation for x: 3x - 5 = 7 + x.' },
      { q: 'Define symmetric and skew-symmetric matrices.' }
    ],
    sampleLong: [
      { q: 'Solve the following system of linear equations using Cramer\'s Rule:\n2x - 2y = 4\n3x + 2y = 6' },
      { q: 'Solve the system of linear equations using Matrix Inversion Method:\n4x + y = 9\n-3x - y = -5' },
      { q: 'Use logarithm table or laws of logarithm to evaluate: (0.8176 * 13.64) / 0.0098.' },
      { q: 'If x + 1/x = 3, find the value of (a) x^2 + 1/x^2 and (b) x^4 + 1/x^4.' }
    ]
  },
  'Physics': {
    chapters: ['Ch 1: Physical Quantities & Measurement', 'Ch 2: Kinematics', 'Ch 3: Dynamics', 'Ch 4: Turning Effect of Forces', 'Ch 5: Gravitation', 'Ch 6: Work and Energy', 'Ch 7: Properties of Matter', 'Ch 8: Thermal Properties of Matter'],
    sampleMcqs: [
      { q: 'The SI unit of force is:', options: ['Joule', 'Newton', 'Pascal', 'Watt'], ans: 'Newton' },
      { q: 'The rate of change of displacement is known as:', options: ['Speed', 'Acceleration', 'Velocity', 'Distance'], ans: 'Velocity' },
      { q: 'Value of \'g\' at the surface of Earth is approximately:', options: ['9.8 m/s^2', '10 km/s', '1.6 m/s^2', 'Zero'], ans: '9.8 m/s^2' },
      { q: 'Newton\'s third law of motion explains:', options: ['Inertia', 'Action and reaction', 'Momentum', 'Centripetal force'], ans: 'Action and reaction' },
      { q: 'Work done is zero when angle between force and displacement is:', options: ['0°', '45°', '90°', '180°'], ans: '90°' },
      { q: 'Which of the following is a vector quantity?', options: ['Mass', 'Time', 'Torque', 'Speed'], ans: 'Torque' }
    ],
    sampleShort: [
      { q: 'Differentiate between base quantities and derived quantities with examples.' },
      { q: 'State Newton\'s Second Law of Motion and derive F = ma.' },
      { q: 'Define inertia and explain what factor it depends upon.' },
      { q: 'What is center of gravity? How does it affect stability?' },
      { q: 'State the Law of Universal Gravitation formulated by Newton.' },
      { q: 'Differentiate between mass and weight with SI units.' },
      { q: 'Define power and define its unit 1 Watt.' }
    ],
    sampleLong: [
      { q: 'State and prove the law of conservation of momentum. Give one practical application.' },
      { q: 'Derive the three equations of motion with the help of a speed-time graph.' },
      { q: 'Determine the mass of Earth using Newton\'s Law of Gravitation.' },
      { q: 'Explain Kinetic Energy. Derive its mathematical formula K.E = 1/2 m v^2.' }
    ]
  },
  'Chemistry': {
    chapters: ['Ch 1: Fundamentals of Chemistry', 'Ch 2: Structure of Atoms', 'Ch 3: Periodic Table & Periodicity', 'Ch 4: Structure of Molecules', 'Ch 5: Physical States of Matter', 'Ch 6: Solutions', 'Ch 7: Electrochemistry', 'Ch 8: Chemical Reactivity'],
    sampleMcqs: [
      { q: 'The atomic mass of Carbon (C) is:', options: ['6 amu', '12 amu', '14 amu', '1 amu'], ans: '12 amu' },
      { q: 'Number of electrons in the valence shell of Noble gases is:', options: ['2', '8', '6', '4'], ans: '8' },
      { q: 'The horizontal rows of the periodic table are called:', options: ['Groups', 'Periods', 'Blocks', 'Families'], ans: 'Periods' },
      { q: 'Bond formed by mutual sharing of electrons is called:', options: ['Ionic bond', 'Covalent bond', 'Metallic bond', 'Coordinate bond'], ans: 'Covalent bond' },
      { q: 'The unit of molarity is:', options: ['mol/dm^3', 'g/dm^3', 'mol/kg', 'g/mol'], ans: 'mol/dm^3' },
      { q: 'Which metal is liquid at room temperature?', options: ['Sodium', 'Mercury', 'Iron', 'Zinc'], ans: 'Mercury' }
    ],
    sampleShort: [
      { q: 'Define Atomic Number and Mass Number with suitable examples.' },
      { q: 'State Rutherford\'s atomic model and list two of its defects.' },
      { q: 'Define electronegativity and write its periodic trend.' },
      { q: 'Why do atoms form chemical bonds? Explain octet rule.' },
      { q: 'Differentiate between saturated and unsaturated solutions.' },
      { q: 'What is corrosion and how is rusting of iron prevented?' },
      { q: 'Define molar mass and calculate molar mass of H2SO4.' }
    ],
    sampleLong: [
      { q: 'Describe Bohr\'s atomic theory and write down its four basic postulates.' },
      { q: 'Explain the formation of ionic bond with the example of NaCl crystal.' },
      { q: 'Explain factors affecting solubility in detail (Temperature, Nature of solute and solvent).' },
      { q: 'Describe the industrial extraction of Sodium metal using Downs Cell with diagram.' }
    ]
  },
  'English': {
    chapters: ['Unit 1: The Saviour of Mankind', 'Unit 2: Patriotism', 'Unit 3: Media and Its Impact', 'Unit 4: Hazrat Asma (R.A)', 'Unit 5: Daffodils (Poem)', 'Unit 6: The Quaid\'s Vision and Pakistan', 'Unit 7: Sultan Ahmad Mosque', 'Unit 8: Stopping by Woods'],
    sampleMcqs: [
      { q: 'The synonym of "Patience" is:', options: ['Tolerance', 'Anger', 'Hate', 'Pride'], ans: 'Tolerance' },
      { q: '"He is a brave boy." Here "brave" is which part of speech?', options: ['Noun', 'Pronoun', 'Adjective', 'Adverb'], ans: 'Adjective' },
      { q: 'The poem "Daffodils" is composed by:', options: ['Robert Frost', 'William Wordsworth', 'John Keats', 'Allama Iqbal'], ans: 'William Wordsworth' },
      { q: 'Choose the correct spelling:', options: ['Conquest', 'Conqust', 'Canquest', 'Conqwest'], ans: 'Conquest' },
      { q: '"Neither he nor his brother ___ present yesterday."', options: ['was', 'were', 'are', 'have'], ans: 'was' },
      { q: 'Antonym of "Natural" is:', options: ['Pure', 'Artificial', 'Real', 'Fresh'], ans: 'Artificial' }
    ],
    sampleShort: [
      { q: 'Why was the Holy Quran sent in Arabic language?' },
      { q: 'What is the highest military award in Pakistan?' },
      { q: 'What are the two major means of communication in media?' },
      { q: 'What message does William Wordsworth convey in the poem "Daffodils"?' },
      { q: 'How did Quaid-e-Azam envision a prosperous Pakistan?' },
      { q: 'Change into Passive Voice: "The teacher punished the dishonest boy."' },
      { q: 'Use the following idioms in sentences: (a) Break the ice, (b) At the eleventh hour.' }
    ],
    sampleLong: [
      { q: 'Write a comprehensive essay (150-200 words) on "My Role as a Responsible Citizen" or "A Visit to a Historical Place".' },
      { q: 'Translate the given paragraph into Urdu: "Patriotism means love for the motherland or devotion to one\'s country. A patriot loves his country and is willing to sacrifice when the need arises."' },
      { q: 'Write a formal application to the Principal for fee concession or character certificate.' },
      { q: 'Read the comprehension passage and answer the 5 questions provided below.' }
    ]
  },
  'Urdu': {
    isUrduFont: true,
    chapters: ['سبق 1: ہجرت نبویؐ', 'سبق 2: مرزا غالب کے عادات و خصائل', 'سبق 3: کاہلی', 'سبق 4: شاعروں کے لطیفے', 'سبق 5: نصوح اور سلیم کی گفتگو', 'نظم 1: حمد', 'نظم 2: نعت'],
    sampleMcqs: [
      { q: 'سبق "ہجرت نبویؐ" کے مصنف کون ہیں؟', options: ['مولانا شبلی نعمانی', 'سر سید احمد خان', 'مرزا غالب', 'خواجہ حسن نظامی'], ans: 'مولانا شبلی نعمانی' },
      { q: 'لفظ "کاہلی" کا متضاد کیا ہے؟', options: ['سستی', 'چستی', 'غفلت', 'بے پروائی'], ans: 'چستی' },
      { q: 'مرزا غالب کے مزاج میں کون سی صفت نمایاں تھی؟', options: ['ظرافت', 'غصہ', 'سنجیدگی', 'تکبر'], ans: 'ظرافت' },
      { q: 'وہ نظم جس میں اللہ تعالیٰ کی تعریف بیان ہو، کیا کہلاتی ہے؟', options: ['نعت', 'حمد', 'قصیدہ', 'مرثیہ'], ans: 'حمد' },
      { q: 'قواعد کی رو سے "کتاب" اسم کی کون سی قسم ہے؟', options: ['اسم معرفہ', 'اسم نکرہ', 'اسم ضمیر', 'اسم صفت'], ans: 'اسم نکرہ' },
      { q: 'محاورہ "آسمان سر پر اٹھانا" کا درست مفہوم ہے:', options: ['بہت شور مچانا', 'طاقت دکھانا', 'محنت کرنا', 'خاموش رہنا'], ans: 'بہت شور مچانا' }
    ],
    sampleShort: [
      { q: 'ہجرت کے وقت رسول اللہ صلی اللہ علیہ وسلم نے حضرت علی رضی اللہ عنہ کو کیا ہدایت فرمائی؟' },
      { q: 'سر سید احمد خان کے نزدیک سب سے بڑی کاہلی کیا ہے؟' },
      { q: 'مرزا غالب کو دوستوں کے خطوط کا جواب دینے کا کیا انداز پسند تھا؟' },
      { q: 'نظم "حمد" کے دوسرے شعر کی مختصر تشریح کیجیے۔' },
      { q: 'درج ذیل الفاظ کے متضاد لکھیے: (۱) کفر (۲) دوست (۳) رات (۴) آغاز' },
      { q: 'درج ذیل محاورات کو جملوں میں استعمال کیجیے: (الف) باغ باغ ہونا (ب) پانی پانی ہونا' }
    ],
    sampleLong: [
      { q: 'درج ذیل عنوانات میں سے کسی ایک پر تفصیلی مضمون لکھیے: (الف) وقت کی پابندی (ب) علم بڑی دولت ہے (ج) میرا پسندیدہ استاد' },
      { q: 'درج ذیل عبارت کی تشریح سیاق و سباق کے حوالے سے کیجیے اور مصنف کا نام لکھیے۔' },
      { q: 'اپنے اسکول کے پرنسپل صاحب کے نام بیماری کی وجہ سے تین دن کی رخصت کی درخواست لکھیے۔' }
    ]
  },
  'Islamiat': {
    isUrduFont: true,
    chapters: ['باب اول: قرآن مجید اور علوم القرآن', 'باب دوم: ایمانیات و عبادات', 'باب سوم: سیرت النبیؐ (مکی و مدنی دور)', 'باب چہارم: اخلاق و آداب', 'باب پنجم: منتخب قرآنی آیات و احادیث'],
    sampleMcqs: [
      { q: 'قرآن مجید کی سب سے پہلی نازل ہونے والی سورت ہے:', options: ['سورۃ الفاتحہ', 'سورۃ العلق', 'سورۃ البقرہ', 'سورۃ الاخلاص'], ans: 'سورۃ العلق' },
      { q: 'صلح حدیبیہ کے موقع پر مسلمانوں کی تعداد کتنی تھی؟', options: ['1000', '1400', '313', '3000'], ans: '1400' },
      { q: 'ارکان اسلام میں سب سے پہلا عملی رکن کون سا ہے؟', options: ['نماز', 'روزہ', 'زکوٰۃ', 'حج'], ans: 'نماز' },
      { q: 'امانت کی ضد کیا ہے؟', options: ['دیانت', 'خیانت', 'صداقت', 'سخاوت'], ans: 'خیانت' },
      { q: 'حدیث نبویؐ کے مطابق دین کی بنیاد کس چیز پر ہے؟', options: ['نیتوں پر', 'علم پر', 'مال پر', 'طاقت پر'], ans: 'نیتوں پر' }
    ],
    sampleShort: [
      { q: 'عقیدہ توحید کے انسانی زندگی پر دو اہم اثرات تحریر کیجیے۔' },
      { q: 'نماز کے پانچ دینی و معاشرتی فوائد مختصراً لکھیے۔' },
      { q: 'حقوق العباد سے کیا مراد ہے؟ ہمسایوں کے دو حقوق بتائیے۔' },
      { q: 'صلح حدیبیہ کو فتح مبین کیوں کہا گیا ہے؟' },
      { q: 'درج ذیل حدیث مبارکہ کا ترجمہ کیجیے: "طَلَبُ الْعِلْمِ فَرِيْضَةٌ عَلَىٰ كُلِّ مُسْلِمٍ"' },
      { q: 'امانت داری اور سچائی کی فضیلت پر ایک قرآنی آیت کا حوالہ دیجیے۔' }
    ],
    sampleLong: [
      { q: 'عقیدہ آخرت کی تفصیلی وضاحت کیجیے اور اس کے انسان کے اخلاقی کردار پر اثرات بیان کیجیے۔' },
      { q: 'نبی کریم صلی اللہ علیہ وسلم بطور معلم و مربی کے اسوہ حسنہ پر تفصیلی نوٹ لکھیے۔' },
      { q: 'زکوٰۃ کے مصارف قرآنی احکامات کی روشنی میں تفصیل سے قلمبند کیجیے۔' }
    ]
  }
};

const CLASSES = ['Playgroup', 'Nursery', 'Prep', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', '11th / 1st Year', '12th / 2nd Year'];

const AIQuestionPaperGenerator = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolName = schoolData?.name || userData?.schoolName || 'Your School';
  const schoolLogo = schoolData?.logo || '';
  const schoolCampus = schoolData?.campus || 'Main Campus';

  // Config States
  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [examType, setExamType] = useState('1st Monthly Assessment Examination');
  const [customChapter, setCustomChapter] = useState('');
  const [totalMarks, setTotalMarks] = useState(50);
  const [timeAllowed, setTimeAllowed] = useState('1.5 Hours');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Section distribution configs
  const [mcqCount, setMcqCount] = useState(6);
  const [mcqMarksEach, setMcqMarksEach] = useState(1);
  const [shortCount, setShortCount] = useState(5);
  const [shortTotalChoice, setShortTotalChoice] = useState(8);
  const [shortMarksEach, setShortMarksEach] = useState(4);
  const [longCount, setLongCount] = useState(3);
  const [longTotalChoice, setLongTotalChoice] = useState(4);
  const [longMarksEach, setLongMarksEach] = useState(8);

  // Generated Paper State
  const [paper, setPaper] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [savedPapers, setSavedPapers] = useState([]);
  const [activeTab, setActiveTab] = useState('GENERATOR'); // 'GENERATOR' | 'SAVED'
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [savedNotification, setSavedNotification] = useState(false);

  const printRef = useRef();

  // Load saved papers from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`td_saved_exam_papers_${schoolData?.id || 'demo'}`);
      if (stored) {
        setSavedPapers(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, [schoolData?.id]);

  // Generate Paper logic
  const handleGeneratePaper = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const curriculum = SUBJECT_CURRICULUM[selectedSubject] || SUBJECT_CURRICULUM['Mathematics'];
      const isUrduFont = curriculum.isUrduFont || selectedSubject === 'Urdu' || selectedSubject === 'Islamiat';

      // Pick MCQs
      const availableMcqs = [...curriculum.sampleMcqs];
      const selectedMcqs = [];
      for (let i = 0; i < mcqCount && availableMcqs.length > 0; i++) {
        const randIdx = Math.floor(Math.random() * availableMcqs.length);
        selectedMcqs.push({ id: `mcq_${i+1}`, ...availableMcqs.splice(randIdx, 1)[0] });
      }

      // Pick Short Questions
      const availableShort = [...curriculum.sampleShort];
      const selectedShort = [];
      const totalShortToPick = Math.max(shortTotalChoice, shortCount);
      for (let i = 0; i < totalShortToPick && availableShort.length > 0; i++) {
        const randIdx = Math.floor(Math.random() * availableShort.length);
        selectedShort.push({ id: `sq_${i+1}`, ...availableShort.splice(randIdx, 1)[0] });
      }

      // Pick Long Questions
      const availableLong = [...curriculum.sampleLong];
      const selectedLong = [];
      const totalLongToPick = Math.max(longTotalChoice, longCount);
      for (let i = 0; i < totalLongToPick && availableLong.length > 0; i++) {
        const randIdx = Math.floor(Math.random() * availableLong.length);
        selectedLong.push({ id: `lq_${i+1}`, ...availableLong.splice(randIdx, 1)[0] });
      }

      const generatedObj = {
        id: `paper_${Date.now()}`,
        schoolName,
        schoolCampus,
        className: selectedClass,
        subject: selectedSubject,
        isUrduFont,
        examType,
        chapter: customChapter || curriculum.chapters.slice(0, 3).join(', '),
        date: examDate,
        timeAllowed,
        totalMarks: Number(totalMarks),
        mcqs: selectedMcqs,
        mcqMarksEach,
        shortQuestions: selectedShort,
        shortAttempt: shortCount,
        shortTotal: totalShortToPick,
        shortMarksEach,
        longQuestions: selectedLong,
        longAttempt: longCount,
        longTotal: totalLongToPick,
        longMarksEach,
        createdAt: new Date().toISOString()
      };

      setPaper(generatedObj);
      setIsGenerating(false);
    }, 600);
  };

  // Save Paper to Library
  const handleSaveToLibrary = () => {
    if (!paper) return;
    const updated = [paper, ...savedPapers.filter(p => p.id !== paper.id)];
    setSavedPapers(updated);
    try {
      localStorage.setItem(`td_saved_exam_papers_${schoolData?.id || 'demo'}`, JSON.stringify(updated));
      setSavedNotification(true);
      setTimeout(() => setSavedNotification(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Add question on the fly
  const handleAddQuestion = (section) => {
    if (!paper) return;
    if (section === 'mcq') {
      const newMcq = {
        id: `mcq_${Date.now()}`,
        q: 'New custom multiple choice question?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        ans: 'Option A'
      };
      setPaper(prev => ({ ...prev, mcqs: [...prev.mcqs, newMcq] }));
    } else if (section === 'short') {
      const newSq = {
        id: `sq_${Date.now()}`,
        q: 'Write a short question text here for students to answer.'
      };
      setPaper(prev => ({ ...prev, shortQuestions: [...prev.shortQuestions, newSq] }));
    } else if (section === 'long') {
      const newLq = {
        id: `lq_${Date.now()}`,
        q: 'Detailed comprehensive problem / essay question text.'
      };
      setPaper(prev => ({ ...prev, longQuestions: [...prev.longQuestions, newLq] }));
    }
  };

  const handleDeleteQuestion = (section, id) => {
    if (!paper) return;
    if (section === 'mcq') {
      setPaper(prev => ({ ...prev, mcqs: prev.mcqs.filter(q => q.id !== id) }));
    } else if (section === 'short') {
      setPaper(prev => ({ ...prev, shortQuestions: prev.shortQuestions.filter(q => q.id !== id) }));
    } else if (section === 'long') {
      setPaper(prev => ({ ...prev, longQuestions: prev.longQuestions.filter(q => q.id !== id) }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-16">
      
      {/* HEADER SECTION (Print Hidden) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/70 border border-indigo-200/90 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="flex items-start gap-4 relative z-10">
          <button
            onClick={() => window.history.back()}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-all cursor-pointer shrink-0 mt-1"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-600" />
                Next-Gen AI Exam Suite
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                Urdu & English Boards
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">AI Exam & Question Paper Generator</h1>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
              Create standard, curriculum-aligned exam papers with automatic MCQs, Short & Long questions, complete with school headers, watermark, and 1-click high-resolution printing.
            </p>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-2 relative z-10">
          <button 
            onClick={() => setActiveTab('GENERATOR')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'GENERATOR' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            <Sliders size={15} />
            <span>Paper Creator</span>
          </button>
          <button 
            onClick={() => setActiveTab('SAVED')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'SAVED' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            <BookOpen size={15} />
            <span>Saved Papers ({savedPapers.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SAVED PAPERS LIBRARY */}
      {activeTab === 'SAVED' && (
        <div className="print:hidden space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Saved Papers Library</h2>
            <button 
              onClick={() => setActiveTab('GENERATOR')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              + Create New Exam Paper
            </button>
          </div>

          {savedPapers.length === 0 ? (
            <GlassCard className="p-12 text-center text-slate-500">
              <BookOpen size={48} className="mx-auto mb-3 text-slate-300 opacity-60" />
              <p className="font-bold text-slate-700">Abhi tak koi paper save nahi kiya gaya.</p>
              <p className="text-xs text-slate-500 mt-1">Creator tab mein paper generate karein aur "Save to Library" par click karein.</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedPapers.map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase">
                        {p.className} • {p.subject}
                      </span>
                      <h3 className="font-black text-slate-900 text-sm mt-1">{p.examType}</h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500">{p.totalMarks} Marks</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{p.chapter}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 text-[11px]">{new Date(p.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => {
                          setPaper(p);
                          setActiveTab('GENERATOR');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1"
                      >
                        <Eye size={13} />
                        <span>View / Print</span>
                      </button>
                      <button 
                        onClick={() => {
                          const filtered = savedPapers.filter(item => item.id !== p.id);
                          setSavedPapers(filtered);
                          localStorage.setItem(`td_saved_exam_papers_${schoolData?.id || 'demo'}`, JSON.stringify(filtered));
                        }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GENERATOR & CONFIGURATION */}
      {activeTab === 'GENERATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Controls & Settings (Print Hidden) */}
          <div className="print:hidden lg:col-span-4 space-y-5">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Sliders size={17} className="text-indigo-600" />
                  <span>Exam Configuration</span>
                </h2>
                <span className="text-[11px] font-mono text-slate-400">Step 1 of 2</span>
              </div>

              {/* Class & Subject */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Class</label>
                  <select 
                    value={selectedClass} 
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  >
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Subject</label>
                  <select 
                    value={selectedSubject} 
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setCustomChapter('');
                    }}
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  >
                    {Object.keys(SUBJECT_CURRICULUM).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Exam Title */}
              <div>
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Assessment Title</label>
                <input 
                  type="text" 
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  placeholder="e.g. 1st Monthly Assessment / Final Examination"
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              {/* Chapter / Syllabus */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Chapter / Topics</label>
                  <span className="text-[10px] text-slate-400">(Optional)</span>
                </div>
                <input 
                  type="text" 
                  value={customChapter}
                  onChange={(e) => setCustomChapter(e.target.value)}
                  placeholder="e.g. Unit 1 & 2 Complete, Unit 3 Ex 3.1"
                  className="w-full text-xs font-medium rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              {/* Total Marks & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Total Marks</label>
                  <select 
                    value={totalMarks} 
                    onChange={(e) => setTotalMarks(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  >
                    <option value="20">20 Marks (Class Quiz)</option>
                    <option value="25">25 Marks (Weekly Test)</option>
                    <option value="50">50 Marks (Monthly Test)</option>
                    <option value="75">75 Marks (Mid Term)</option>
                    <option value="100">100 Marks (Final Board)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Time Allowed</label>
                  <input 
                    type="text" 
                    value={timeAllowed}
                    onChange={(e) => setTimeAllowed(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Paper Section Distribution Controls */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">Question Distribution</span>
                
                {/* Section A: MCQs */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                  <span className="font-bold text-slate-800">Part I: MCQs</span>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number" 
                      min="0" 
                      max="20" 
                      value={mcqCount} 
                      onChange={(e) => setMcqCount(Number(e.target.value))}
                      className="w-12 text-center text-xs font-bold rounded-lg border-slate-300 py-1"
                    />
                    <span className="text-slate-500 text-[11px]">Questions (1 Mark each)</span>
                  </div>
                </div>

                {/* Section B: Short Questions */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                  <span className="font-bold text-slate-800">Part II: Short Qs</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px]">Attempt</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="15" 
                      value={shortCount} 
                      onChange={(e) => setShortCount(Number(e.target.value))}
                      className="w-12 text-center text-xs font-bold rounded-lg border-slate-300 py-1"
                    />
                    <span className="text-slate-500 text-[11px]">out of {shortTotalChoice}</span>
                  </div>
                </div>

                {/* Section C: Long Questions */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                  <span className="font-bold text-slate-800">Part III: Long Qs</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px]">Attempt</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="8" 
                      value={longCount} 
                      onChange={(e) => setLongCount(Number(e.target.value))}
                      className="w-12 text-center text-xs font-bold rounded-lg border-slate-300 py-1"
                    />
                    <span className="text-slate-500 text-[11px]">out of {longTotalChoice}</span>
                  </div>
                </div>
              </div>

              {/* GENERATE BUTTON */}
              <button 
                onClick={handleGeneratePaper}
                disabled={isGenerating}
                className="w-full py-3.5 rounded-2xl bg-black hover:bg-slate-900 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin text-amber-400" />
                    <span>AI Engine Generating Paper...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="text-amber-400" />
                    <span>Generate Instant Exam Paper</span>
                  </>
                )}
              </button>

            </div>

            {/* Quick Tips */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-xs text-indigo-900 space-y-1">
              <span className="font-black text-indigo-950 flex items-center gap-1">
                <CheckCircle2 size={14} className="text-indigo-600" />
                Exam Board Quality:
              </span>
              <p className="text-[11px] leading-relaxed">
                Yeh engine Punjab, Federal aur Sindh board ke paper pattern ke mutabiq standard layout aur objective/subjective format tayar karta hai. Print lene par headers aur watermark automatic adjust ho jate hain.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Paper Live Preview & Print Sheet */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Action Bar (Print Hidden) */}
            <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800">Paper Actions:</span>
                <button 
                  onClick={() => setShowAnswerKey(!showAnswerKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${showAnswerKey ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  <Check size={13} />
                  <span>{showAnswerKey ? 'Hide Answer Key' : 'Teacher Answer Key'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSaveToLibrary}
                  disabled={!paper}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${savedNotification ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-50'}`}
                >
                  {savedNotification ? <Check size={14} /> : <Save size={14} />}
                  <span>{savedNotification ? 'Saved to Library!' : 'Save Paper'}</span>
                </button>

                <button 
                  onClick={handlePrint}
                  disabled={!paper}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Print Paper / PDF</span>
                </button>
              </div>
            </div>

            {/* PAPER CANVAS */}
            {!paper ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                  <FileText size={32} />
                </div>
                <h3 className="text-base font-black text-slate-900">No Paper Generated Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Left panel se apni Class aur Subject select karein aur "Generate Instant Exam Paper" par click karein.
                </p>
                <button 
                  onClick={handleGeneratePaper}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm hover:bg-black"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Generate Demo Paper</span>
                </button>
              </div>
            ) : (
              <div 
                ref={printRef}
                className={`bg-white border border-slate-300 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6 relative overflow-hidden print:border-none print:shadow-none print:p-0 print:rounded-none ${paper.isUrduFont ? 'font-serif' : 'font-sans'}`}
                dir={paper.isUrduFont ? 'rtl' : 'ltr'}
              >
                
                {/* School Header Block */}
                <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1 relative">
                  {schoolLogo && (
                    <img 
                      src={schoolLogo} 
                      alt="Logo" 
                      className="w-16 h-16 object-contain absolute left-0 top-0 print:block" 
                    />
                  )}
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950">
                    {paper.schoolName}
                  </h1>
                  <p className="text-xs font-bold text-slate-700 tracking-wider">
                    {paper.schoolCampus} • Academic Session 2026-2027
                  </p>
                  <div className="inline-block px-4 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-900 font-black text-xs uppercase tracking-wider my-1">
                    {paper.examType}
                  </div>
                </div>

                {/* Candidate Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-slate-300 pb-3 font-semibold text-slate-800">
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px] uppercase">Class</span>
                    <span className="font-black text-slate-900">{paper.className}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px] uppercase">Subject</span>
                    <span className="font-black text-slate-900">{paper.subject}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px] uppercase">Time Allowed</span>
                    <span className="font-black text-slate-900">{paper.timeAllowed}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px] uppercase">Total Marks</span>
                    <span className="font-black text-slate-900">{paper.totalMarks} Marks</span>
                  </div>
                </div>

                {/* Student Name & Roll No Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600">Student Name:</span>
                    <span className="border-b border-dotted border-slate-400 flex-1 h-5"></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600">Roll Number:</span>
                    <span className="border-b border-dotted border-slate-400 flex-1 h-5"></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600">Section / Date:</span>
                    <span className="border-b border-dotted border-slate-400 flex-1 h-5"></span>
                  </div>
                </div>

                {/* Note / Instructions */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] text-slate-700 italic print:bg-transparent print:border-slate-300">
                  <span className="font-bold text-slate-900 not-italic">Instructions: </span>
                  Read questions carefully. Cutting, overwriting and use of lead pencil for answers is strictly prohibited. Attempt all sections as specified.
                </div>

                {/* SECTION A: MCQs */}
                {paper.mcqs && paper.mcqs.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-slate-400 pb-1">
                      <h3 className="font-black text-slate-950 text-sm uppercase tracking-wide">
                        Part I: Multiple Choice Questions (Objective)
                      </h3>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        [{paper.mcqs.length} × {paper.mcqMarksEach} = {paper.mcqs.length * paper.mcqMarksEach} Marks]
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Q1: Choose the correct option for each of the following statements.
                    </p>

                    <div className="space-y-3">
                      {paper.mcqs.map((m, idx) => (
                        <div key={m.id || idx} className="text-xs space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900">
                              ({idx + 1}) {m.q}
                            </span>
                            <button 
                              onClick={() => handleDeleteQuestion('mcq', m.id)}
                              className="print:hidden text-slate-300 hover:text-red-500 p-0.5"
                              title="Delete Question"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          
                          {/* Options Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-4 text-[11px] text-slate-800">
                            {m.options.map((opt, oIdx) => {
                              const optLabel = ['(A)', '(B)', '(C)', '(D)'][oIdx];
                              const isCorrect = showAnswerKey && opt === m.ans;
                              return (
                                <div 
                                  key={oIdx} 
                                  className={`p-1 rounded ${isCorrect ? 'bg-emerald-100 font-bold text-emerald-900 border border-emerald-300' : ''}`}
                                >
                                  <span className="font-bold text-slate-500 mr-1">{optLabel}</span> {opt}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => handleAddQuestion('mcq')}
                      className="print:hidden text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-2"
                    >
                      <Plus size={13} />
                      <span>Add Custom MCQ</span>
                    </button>
                  </div>
                )}

                {/* SECTION B: Short Questions */}
                {paper.shortQuestions && paper.shortQuestions.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-300">
                    <div className="flex items-center justify-between border-b border-slate-400 pb-1">
                      <h3 className="font-black text-slate-950 text-sm uppercase tracking-wide">
                        Part II: Short Questions (Subjective)
                      </h3>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        [{paper.shortAttempt} × {paper.shortMarksEach} = {paper.shortAttempt * paper.shortMarksEach} Marks]
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Q2: Attempt any <span className="font-black text-slate-900">{paper.shortAttempt}</span> questions out of the following ({paper.shortQuestions.length}):
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {paper.shortQuestions.map((sq, idx) => (
                        <div key={sq.id || idx} className="text-xs flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-50 print:bg-transparent print:p-0">
                          <span className="text-slate-800">
                            <span className="font-bold text-slate-900 mr-1.5">({idx + 1})</span>
                            {sq.q}
                          </span>
                          <button 
                            onClick={() => handleDeleteQuestion('short', sq.id)}
                            className="print:hidden text-slate-300 hover:text-red-500 p-0.5 shrink-0"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => handleAddQuestion('short')}
                      className="print:hidden text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-2"
                    >
                      <Plus size={13} />
                      <span>Add Custom Short Question</span>
                    </button>
                  </div>
                )}

                {/* SECTION C: Long Questions */}
                {paper.longQuestions && paper.longQuestions.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-300">
                    <div className="flex items-center justify-between border-b border-slate-400 pb-1">
                      <h3 className="font-black text-slate-950 text-sm uppercase tracking-wide">
                        Part III: Detailed / Long Questions
                      </h3>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        [{paper.longAttempt} × {paper.longMarksEach} = {paper.longAttempt * paper.longMarksEach} Marks]
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Attempt any <span className="font-black text-slate-900">{paper.longAttempt}</span> questions. All questions carry equal marks.
                    </p>

                    <div className="space-y-3">
                      {paper.longQuestions.map((lq, idx) => (
                        <div key={lq.id || idx} className="text-xs flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 print:bg-transparent print:p-0">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-900 block">
                              Q{idx + 3}:
                            </span>
                            <p className="text-slate-800 whitespace-pre-line pl-3 border-l-2 border-slate-300 print:border-none">
                              {lq.q}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleDeleteQuestion('long', lq.id)}
                            className="print:hidden text-slate-300 hover:text-red-500 p-0.5 shrink-0"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => handleAddQuestion('long')}
                      className="print:hidden text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-2"
                    >
                      <Plus size={13} />
                      <span>Add Custom Long Question</span>
                    </button>
                  </div>
                )}

                {/* Footer Watermark / End */}
                <div className="text-center pt-6 border-t border-slate-300 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span>TaleemiDunya Examination Pro</span>
                  <span>*** BEST OF LUCK ***</span>
                  <span>Page 1 of 1</span>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};

export default AIQuestionPaperGenerator;
