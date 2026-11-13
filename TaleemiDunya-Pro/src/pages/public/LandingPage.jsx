import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { SAAS_FEATURE_CATALOG } from '../../config/saasFeaturesConfig';
import { motion } from 'framer-motion';
import { 
  CheckCircle, Play, Monitor, Users, BookOpen, 
  Shield, Zap, ArrowRight, BarChart3, Clock,
  Smartphone, Database, MessageSquare, XCircle,
  Volume2, VolumeX
} from 'lucide-react';

const featureCategories = [
  {
    title: "Core Administration",
    icon: <Shield className="w-6 h-6" />,
    items: [
      "Student & Staff Management 360°",
      "Dynamic Class & Section Manager",
      "Multi-Branch Support",
      "Role-Based Access Control (RBAC)",
      "Employee Payroll & Leave Management",
      "Expense & Cashbook Tracking"
    ]
  },
  {
    title: "Finance & Fee Module",
    icon: <BarChart3 className="w-6 h-6" />,
    items: [
      "Automated Monthly Fee Challans",
      "Defaulter Tracking & Alerts",
      "Online Payments Integration",
      "Scholarship & Discount Manager",
      "Daily Collection Reports",
      "Transport & Hostel Fee Engine"
    ]
  },
  {
    title: "Academics & Operations",
    icon: <BookOpen className="w-6 h-6" />,
    items: [
      "Biometric & App Smart Attendance",
      "Result Cards & Marksheet Generator",
      "Daily Diary & Homework Portal",
      "Online MCQs & Quiz Engine",
      "Time Table & Syllabus Planner",
      "Library Book Issuance System"
    ]
  },
  {
    title: "Communication & AI",
    icon: <MessageSquare className="w-6 h-6" />,
    items: [
      "AI Copilot for Drafting Notices",
      "WhatsApp Bulk Messaging & API",
      "Automated Fee Reminders (WhatsApp/SMS)",
      "Parent & Student Mobile Portals",
      "ID Card & Certificate Generator",
      "Gate Pass & Security Scanner"
    ]
  }
];

const defaultPlans = [
  {
    id: "standard",
    name: "Standard Plan",
    priceMonthly: 3500,
    priceYearly: 35000,
    description: "Perfect for growing schools.",
    features: [
      "Up to 500 Students & 30 Staff",
      "Student & Staff Management",
      "Fee & Challan Management",
      "Attendance Tracking",
      "Basic Reports & Analytics"
    ],
    notIncluded: [
      "Exams & Grading System",
      "Timetable & SMS Alerts",
      "AI Copilot & Features",
      "Digital Library Hub",
      "Custom School Website Domain",
      "24/7 Dedicated Support"
    ],
    recommended: false,
    cta: "Start Free Trial"
  },
  {
    id: "premium",
    name: "Premium Pro",
    priceMonthly: 5000,
    priceYearly: 50000,
    description: "All-in-one advanced solution.",
    features: [
      "Unlimited Students & Staff",
      "Everything in Standard",
      "Exams & Grading System",
      "Timetable & SMS Alerts",
      "AI Copilot & Digital Library",
      "Custom School Website Domain",
      "24/7 Dedicated Support"
    ],
    notIncluded: [],
    recommended: true,
    cta: "Get Premium"
  }
];

const LandingPage = () => {
  const [gateways, setGateways] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const navigate = useNavigate();

  const [isMuted, setIsMuted] = useState(true);
  const videoRef = React.useRef(null);

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const [showDemoForm, setShowDemoForm] = useState(false);
  const [demoFormData, setDemoFormData] = useState({ name: '', whatsapp: '', schoolName: '', email: '' });
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (searchParams.get('request_sent') === 'true') {
      setShowSuccessModal(true);
      // Remove it from URL so it doesn't show again on refresh
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    if (!demoFormData.name || !demoFormData.whatsapp || !demoFormData.schoolName || !demoFormData.email) return;
    
    setIsSubmittingDemo(true);
    try {
      // 1. Send message silently to developer's WhatsApp using the backend API
      const developerNumber = gateways?.developerWhatsapp?.number;
      if (developerNumber) {
        const message = `*New Demo Request!*\n\n*Name:* ${demoFormData.name}\n*School:* ${demoFormData.schoolName}\n*Email:* ${demoFormData.email}\n*WhatsApp:* ${demoFormData.whatsapp}\n\nThis user wants to access the Live Demo of TaleemiDunya Pro. Please contact them!`;
        // Await to ensure the fetch isn't cancelled by the fast client-side navigation
        await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: 'default_school',
            phone: developerNumber,
            message: message
          })
        }).catch(e => console.error("Failed to send WhatsApp notification", e));
      }

      // 2. Save to Firebase (now with updated rules)
      await addDoc(collection(db, 'demoRequests'), {
        name: demoFormData.name,
        whatsapp: demoFormData.whatsapp,
        schoolName: demoFormData.schoolName,
        email: demoFormData.email,
        createdAt: serverTimestamp(),
        status: 'pending' // for developer to track
      });

      // Redirect to demo
      navigate('/login?demo=true');
    } catch (error) {
      console.error("Error saving demo request:", error);
      alert("Something went wrong. Redirecting to demo anyway...");
      navigate('/login?demo=true');
    } finally {
      setIsSubmittingDemo(false);
    }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDoc(doc(db, 'system', 'gateways'));
        if (snap.exists()) setGateways(snap.data());

        setPlans(defaultPlans.map(p => ({
          ...p, price: `Rs. ${p.priceMonthly.toLocaleString()}`
        })));
      } catch (err) {
        console.error("Error fetching data:", err);
        setPlans(defaultPlans.map(p => ({
            ...p, price: `Rs. ${p.priceMonthly.toLocaleString()}`
        })));
      } finally {
        setIsLoadingPlans(false);
      }
    };
    fetchData();
  }, []);

  const handleBuyPlan = (planId) => {
    navigate(`/checkout?plan=${planId.toLowerCase()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-2xl tracking-tight text-indigo-950">TaleemiDunya<span className="text-indigo-600">Pro</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">Features</button>
              <button onClick={() => scrollToSection('demo')} className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">Demo</button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">Pricing</button>
              <button onClick={() => scrollToSection('downloads')} className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">Downloads</button>
              <a href="#/login" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                Login
              </a>
            </div>
            {/* Mobile Nav Login Button */}
            <div className="md:hidden">
              <a href="#/login" className="bg-indigo-600 text-white px-4 py-2 rounded-full font-medium text-sm">
                Login
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-50/50 rounded-full blur-[120px] -z-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-sm mb-6 border border-indigo-100"
            >
              <Zap className="w-4 h-4 text-indigo-500" />
              <span>The Next-Gen School ERP</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8"
            >
              {gateways?.hero?.title ? (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-950 to-indigo-600">
                  {gateways.hero.title}
                </span>
              ) : (
                <>
                  Manage Your School <br className="hidden lg:block"/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">
                    Like Never Before
                  </span>
                </>
              )}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
            >
              {gateways?.hero?.subtitle || 'All-in-one cloud-based software to automate admissions, fees, attendance, exams, and communication.'}
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <button onClick={() => scrollToSection('pricing')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 transform hover:-translate-y-1 flex items-center justify-center gap-2">
                {gateways?.hero?.ctaText || 'View Plans'}
              </button>
              <button onClick={() => setShowDemoForm(true)} className="bg-white hover:bg-gray-50 text-indigo-950 border border-gray-200 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                <Play className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                Try Interactive Demo
              </button>
              <button onClick={() => scrollToSection('downloads')} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                <Monitor className="w-5 h-5 text-indigo-600" />
                Download Apps
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-2">Features</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Everything you need to run your school</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Powerful tools designed specifically for administrators, teachers, students, and parents.</p>
          </div>
          {gateways?.landingFeatures && gateways.landingFeatures.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {gateways.landingFeatures.map((fId, idx) => {
                const feature = SAAS_FEATURE_CATALOG.find(c => c.key === fId);
                if (!feature) return null;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    key={fId} 
                    className="bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-2xl hover:border-indigo-100 transition-all duration-300 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 mb-6">
                      <Zap className="w-6 h-6" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h4>
                    <p className="text-gray-600">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {featureCategories.map((category, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  key={idx} 
                  className="bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-2xl hover:border-indigo-100 transition-all duration-300 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                      {category.icon}
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900">{category.title}</h4>
                  </div>
                  <ul className="space-y-4">
                    {category.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-gray-700 font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Demo Section */}
      <div id="demo" className="py-24 bg-indigo-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-600 rounded-full blur-[120px] opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-indigo-400 font-bold tracking-wide uppercase text-sm mb-2">Live Experience</h2>
              <h3 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">Test drive TaleemiDunya Pro today.</h3>
              <p className="text-indigo-100 text-lg mb-8 leading-relaxed">
                Don't just take our word for it. Experience the full power of our school management system with our interactive demo environment. Pre-loaded with data so you can see exactly how it works.
              </p>
              <ul className="space-y-4 mb-10">
                {['Admin Dashboard preview', 'Teacher & Student portals', 'Mock fee generation', 'Attendance tracking demo'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-indigo-50">
                    <CheckCircle className="w-5 h-5 text-indigo-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => setShowDemoForm(true)} className="inline-flex items-center justify-center gap-2 bg-white text-indigo-950 px-8 py-4 rounded-full font-bold text-lg hover:bg-indigo-50 transition-colors shadow-lg hover:shadow-xl">
                  Access Live Demo
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={() => scrollToSection('downloads')} className="inline-flex items-center justify-center gap-2 bg-indigo-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-indigo-400 transition-colors shadow-lg hover:shadow-xl border border-indigo-400">
                  <Monitor className="w-5 h-5" />
                  Download Apps
                </button>
              </div>
            </div>
            <div className="mt-12 lg:mt-0">
              <div className="bg-indigo-900/40 p-2.5 rounded-3xl border border-indigo-700/80 backdrop-blur-md shadow-2xl relative group">
                <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-2xl aspect-[16/10] sm:aspect-[16/9] relative flex items-center justify-center border border-indigo-950">
                  
                  {/* HTML5 Auto-Playing Promotion Video */}
                  <video
                    ref={videoRef}
                    src="/taleemidunya_promo.mp4"
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="w-full h-full object-cover rounded-2xl"
                  />

                  {/* Top Live Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white font-mono text-[11px] font-bold flex items-center gap-2 shadow-lg pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>LIVE SOFTWARE DEMO</span>
                  </div>

                  {/* Sound Toggle Button */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
                    <button
                      onClick={toggleSound}
                      className="px-3.5 py-2 rounded-full bg-slate-900/85 hover:bg-indigo-600 backdrop-blur-md border border-white/20 text-white font-bold text-xs flex items-center gap-2 shadow-xl transition-all cursor-pointer group/btn"
                      title={isMuted ? "Unmute for Urdu Voiceover" : "Mute Video"}
                    >
                      {isMuted ? (
                        <>
                          <VolumeX className="w-4 h-4 text-amber-400 animate-pulse" />
                          <span className="hidden sm:inline">Unmute Urdu Voice</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                          <span className="hidden sm:inline">Mute Audio</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-2">Pricing</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Simple, transparent pricing</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Choose the perfect plan for your institution. No hidden fees.</p>
          </div>
          
          {/* Billing Toggle Header */}
          <div className="flex flex-col items-center justify-center mb-16 gap-4">
             <div className="flex items-center gap-3 bg-white p-2 rounded-full border border-gray-200 shadow-md">
               <button className="px-6 py-2 rounded-full font-bold text-sm bg-indigo-600 text-white shadow">Monthly</button>
               <button className="px-6 py-2 rounded-full font-bold text-sm text-gray-600 hover:text-indigo-600 flex items-center gap-2">
                 Yearly <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase shadow-sm animate-pulse">Save 16%</span>
               </button>
             </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                key={index} 
                className={`rounded-3xl p-8 relative flex flex-col h-full transform transition-all hover:-translate-y-2 ${plan.recommended ? 'bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-950 text-white shadow-2xl shadow-indigo-900/40 scale-105 z-10 border border-indigo-700/50' : 'bg-white border border-gray-200 shadow-xl'}`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-400 to-rose-500 text-white px-5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase shadow-lg shadow-orange-500/30 flex items-center gap-1.5 border border-white/20">
                    <Zap size={14} className="animate-pulse" />
                    Most Popular
                  </div>
                )}
                <div className="mb-8 mt-2">
                  <h4 className={`text-2xl font-black mb-2 ${plan.recommended ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h4>
                  <p className={`text-sm ${plan.recommended ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.description}</p>
                  <div className="my-6 flex flex-col">
                    <div className="flex items-end gap-2">
                      <span className={`text-5xl font-black tracking-tighter ${plan.recommended ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                      <span className={`text-lg font-bold mb-1 ${plan.recommended ? 'text-indigo-300' : 'text-gray-500'}`}>/month</span>
                    </div>
                    <div className="mt-2 text-xs font-semibold bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-lg self-start border border-emerald-500/20">
                      {plan.priceYearly ? `Or Rs. ${plan.priceYearly.toLocaleString()}/year` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${plan.recommended ? 'text-indigo-300' : 'text-indigo-600'}`}>What's included</p>
                  <ul className="space-y-4 mb-6">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className={`w-5 h-5 shrink-0 ${plan.recommended ? 'text-orange-400' : 'text-indigo-500'}`} />
                        <span className={`font-semibold ${plan.recommended ? 'text-indigo-50' : 'text-gray-700'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.notIncluded && plan.notIncluded.length > 0 && (
                    <>
                      <p className={`text-xs font-bold uppercase tracking-widest mt-6 mb-4 ${plan.recommended ? 'text-indigo-300' : 'text-gray-400'}`}>Not included</p>
                      <ul className="space-y-4 mb-8">
                        {plan.notIncluded.map((f, i) => (
                          <li key={i} className="flex items-start gap-3 opacity-60">
                            <XCircle className={`w-5 h-5 shrink-0 ${plan.recommended ? 'text-rose-400' : 'text-rose-500'}`} />
                            <span className={`font-semibold ${plan.recommended ? 'text-indigo-200' : 'text-gray-500 line-through'}`}>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                <button onClick={() => handleBuyPlan(plan.id || plan.name)} className={`w-full py-4 rounded-xl font-black text-lg transition-all shadow-lg flex items-center justify-center gap-2 group ${
                  plan.recommended 
                    ? 'bg-gradient-to-r from-orange-400 to-rose-500 hover:from-orange-500 hover:to-rose-600 text-white shadow-orange-500/25 border border-orange-400/50' 
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-indigo-100/50'
                }`}>
                  {plan.cta || 'Get Started'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Downloads Section */}
      <div id="downloads" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-2">Apps & Software</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Download TaleemiDunya Pro</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Get our mobile apps for parents and students, or download the Windows Desktop App for school reception.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gray-50 border border-gray-200 rounded-3xl p-8 text-center hover:shadow-xl transition-all"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Smartphone size={32} />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">Android App</h4>
              <p className="text-gray-600 mb-8">For Parents, Students & Teachers on Android devices.</p>
              {gateways?.appLinks?.android ? (
                <a href={gateways.appLinks.android} target="_blank" rel="noreferrer" className="inline-block w-full bg-gray-900 hover:bg-black text-white py-4 rounded-xl font-bold transition-colors">
                  Get on Play Store
                </a>
              ) : (
                <button disabled className="w-full bg-gray-200 text-gray-500 py-4 rounded-xl font-bold cursor-not-allowed">Coming Soon</button>
              )}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-gray-50 border border-gray-200 rounded-3xl p-8 text-center hover:shadow-xl transition-all"
            >
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Smartphone size={32} />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">iOS App</h4>
              <p className="text-gray-600 mb-8">For Parents, Students & Teachers on iPhone & iPad.</p>
              {gateways?.appLinks?.ios ? (
                <a href={gateways.appLinks.ios} target="_blank" rel="noreferrer" className="inline-block w-full bg-gray-900 hover:bg-black text-white py-4 rounded-xl font-bold transition-colors">
                  Get on App Store
                </a>
              ) : (
                <button disabled className="w-full bg-gray-200 text-gray-500 py-4 rounded-xl font-bold cursor-not-allowed">Coming Soon</button>
              )}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-indigo-50 border border-indigo-200 rounded-3xl p-8 text-center hover:shadow-xl transition-all"
            >
              <div className="w-20 h-20 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <Monitor size={32} />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">Windows App</h4>
              <p className="text-gray-600 mb-8">For School Administration and local CCTV network viewing.</p>
              {gateways?.appLinks?.windows ? (
                <a href={gateways.appLinks.windows} target="_blank" rel="noreferrer" className="inline-block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold transition-colors shadow-lg shadow-indigo-200">
                  Download .exe File
                </a>
              ) : (
                <button disabled className="w-full bg-indigo-200 text-indigo-400 py-4 rounded-xl font-bold cursor-not-allowed">Coming Soon</button>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-6 h-6 text-indigo-500" />
                <span className="font-bold text-xl text-white">TaleemiDunya<span className="text-indigo-500">Pro</span></span>
              </div>
              <p className="max-w-md text-sm leading-relaxed">
                Empowering educational institutions with modern, scalable, and intelligent management solutions. 
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Pricing</button></li>
                <li><button onClick={() => scrollToSection('demo')} className="hover:text-white transition-colors">Interactive Demo</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">About Us</button></li>
                <li>
                  <a 
                    href={gateways?.developerWhatsapp?.enabled && gateways.developerWhatsapp.number ? `https://wa.me/${gateways.developerWhatsapp.number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello, I want to know more about TaleemiDunya Pro!')}` : '#'} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </a>
                </li>
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><a href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-900 text-sm flex flex-col md:flex-row justify-between items-center">
            <p>&copy; {new Date().getFullYear()} TaleemiDunya Pro. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-800 cursor-pointer transition-colors">
                 <Shield className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </footer>

      {gateways?.developerWhatsapp?.enabled && gateways.developerWhatsapp.number && (
        <a 
          href={`https://wa.me/${gateways.developerWhatsapp.number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(gateways.developerWhatsapp.message || 'Hello, I want to know more about TaleemiDunya Pro plans!')}`} 
          target="_blank" 
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center cursor-pointer group"
          title="Chat with Developer"
        >
          <MessageSquare className="w-7 h-7" />
          <span className="absolute right-16 bg-white text-gray-900 text-sm font-bold px-4 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Need Help? Chat with us!
          </span>
        </a>
      )}

      {/* Demo Form Modal */}
      {showDemoForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDemoForm(false)}></div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10"
          >
            <div className="p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Access Live Demo</h3>
                <button onClick={() => setShowDemoForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Please fill out this quick form to access the interactive demo. We might reach out to hear your feedback!
              </p>
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                    placeholder="e.g. John Doe"
                    value={demoFormData.name}
                    onChange={(e) => setDemoFormData({...demoFormData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                    placeholder="e.g. The City School"
                    value={demoFormData.schoolName}
                    onChange={(e) => setDemoFormData({...demoFormData, schoolName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input 
                    type="email" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                    placeholder="e.g. johndoe@gmail.com"
                    value={demoFormData.email}
                    onChange={(e) => setDemoFormData({...demoFormData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number *</label>
                  <input 
                    type="tel" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                    placeholder="e.g. +92 300 1234567"
                    value={demoFormData.whatsapp}
                    onChange={(e) => setDemoFormData({...demoFormData, whatsapp: e.target.value})}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmittingDemo}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-lg transition-all shadow-md hover:shadow-lg mt-4 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmittingDemo ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      Continue to Demo
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Plan Purchase Request Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative"
          >
            <div className="bg-green-500 p-8 text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-white">Request Sent Successfully!</h2>
            </div>
            
            <div className="p-8 text-center space-y-4">
              <p className="text-gray-600 text-lg">
                Aapki request admin ko bhej di gayi hai. Kuch der mein admin aapki request approve kar dega.
              </p>
              <div className="pt-4">
                <button 
                  onClick={() => setShowSuccessModal(false)} 
                  className="w-full bg-green-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-600 transition-colors shadow-lg hover:shadow-xl"
                >
                  Okay, Understood
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
