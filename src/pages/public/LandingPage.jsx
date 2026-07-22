import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { SAAS_FEATURE_CATALOG } from '../../config/saasFeaturesConfig';
import { motion } from 'framer-motion';
import { 
  CheckCircle, Play, Monitor, Users, BookOpen, 
  Shield, Zap, ArrowRight, BarChart3, Clock,
  Smartphone, Database, MessageSquare
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
    id: "basic",
    name: "Basic",
    priceMonthly: 3500,
    priceYearly: 35000,
    description: "Perfect for small schools getting started.",
    features: [
      "Up to 500 Students",
      "Basic Attendance",
      "Fee Management",
      "Standard Support"
    ],
    recommended: false,
    cta: "Start Free Trial"
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 7500,
    priceYearly: 75000,
    description: "Ideal for growing schools with advanced needs.",
    features: [
      "Up to 2000 Students",
      "Advanced Academics & Exams",
      "WhatsApp Automation",
      "Parent & Student Portals",
      "Priority Support"
    ],
    recommended: true,
    cta: "Get Pro Plan"
  }
];

const LandingPage = () => {
  const [gateways, setGateways] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const navigate = useNavigate();

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

        const plansSnap = await getDocs(collection(db, 'plans'));
        if (!plansSnap.empty) {
          const plansList = plansSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          plansList.sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0));
          
          if(plansList.length > 1 && plansList.length <= 3) {
             plansList[1].recommended = true;
          } else if (plansList.length > 3) {
             plansList[Math.floor(plansList.length/2)].recommended = true;
          }

          const formattedPlans = plansList.map(p => {
            const mappedFeatures = (p.allowedFeatures || [])
              .map(fId => {
                const catalogItem = SAAS_FEATURE_CATALOG.find(c => c.key === fId);
                return catalogItem ? catalogItem.title : null;
              })
              .filter(Boolean)
              .slice(0, 6);

            return {
              id: p.id,
              name: p.name || p.id,
              price: `Rs. ${p.priceMonthly?.toLocaleString() || 'Custom'}`,
              period: "/month",
              description: `Perfect for ${p.maxStudents || 'unlimited'} students.`,
              features: mappedFeatures.length > 0 ? mappedFeatures : ["Core Features", "Updates", "Support"],
              recommended: p.recommended || false,
              cta: p.recommended ? "Get Pro Plan" : "Start Now"
            };
          });

          setPlans(formattedPlans);
        } else {
          setPlans(defaultPlans.map(p => ({
            ...p, price: `Rs. ${p.priceMonthly.toLocaleString()}`
          })));
        }
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
              <a href="https://taleemidunya-pro-ed44e.web.app/#/login" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                Login
              </a>
            </div>
            {/* Mobile Nav Login Button */}
            <div className="md:hidden">
              <a href="https://taleemidunya-pro-ed44e.web.app/#/login" className="bg-indigo-600 text-white px-4 py-2 rounded-full font-medium text-sm">
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
              <button onClick={() => scrollToSection('demo')} className="bg-white hover:bg-gray-50 text-indigo-950 border border-gray-200 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                <Play className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                Try Interactive Demo
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
              <a href="https://taleemidunya-pro-ed44e.web.app/#/login?demo=true" className="inline-flex items-center gap-2 bg-white text-indigo-950 px-8 py-4 rounded-full font-bold text-lg hover:bg-indigo-50 transition-colors shadow-lg hover:shadow-xl">
                Access Live Demo
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
            <div className="mt-12 lg:mt-0">
              <div className="bg-indigo-900/50 p-2 rounded-2xl border border-indigo-800 backdrop-blur-sm shadow-2xl">
                <div className="bg-gray-900 rounded-xl overflow-hidden shadow-inner aspect-[4/3] flex items-center justify-center relative group">
                  {/* Mockup UI or Video placeholder */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center">
                    <Monitor className="w-20 h-20 text-indigo-500 mb-6 group-hover:scale-110 transition-transform duration-500" />
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md group-hover:bg-indigo-600 transition-colors cursor-pointer">
                      <Link to="/login?demo=true">
                         <Play className="w-6 h-6 text-white fill-white ml-1" />
                      </Link>
                    </div>
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
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                key={index} 
                className={`rounded-3xl p-8 relative flex flex-col h-full ${plan.recommended ? 'bg-indigo-950 text-white shadow-2xl shadow-indigo-900/20 scale-105 z-10 border border-indigo-800' : 'bg-white border border-gray-200 shadow-xl'}`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                    Most Popular
                  </div>
                )}
                <div className="mb-8">
                  <h4 className={`text-xl font-bold mb-2 ${plan.recommended ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h4>
                  <p className={plan.recommended ? 'text-indigo-200' : 'text-gray-500'}>{plan.description}</p>
                </div>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  {plan.period && <span className={plan.recommended ? 'text-indigo-300' : 'text-gray-500'}>{plan.period}</span>}
                </div>
                <ul className="space-y-4 mb-10 flex-grow">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className={`w-5 h-5 shrink-0 ${plan.recommended ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      <span className={plan.recommended ? 'text-indigo-50' : 'text-gray-600'}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleBuyPlan(plan.id || plan.name)} className={`w-full py-4 rounded-xl font-bold transition-all ${plan.recommended ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'}`}>
                  {plan.cta || 'Get Started'}
                </button>
              </motion.div>
            ))}
            {isLoadingPlans && (
              <div className="col-span-3 text-center py-12 text-indigo-500 font-bold">Loading live pricing...</div>
            )}
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
                <li><Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
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
    </div>
  );
};

export default LandingPage;
