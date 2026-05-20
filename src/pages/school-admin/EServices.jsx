import React, { useState } from 'react';
import { 
  Globe, 
  Wifi, 
  BookOpen, 
  MessageCircle, 
  Video, 
  FileText, 
  CheckCircle2, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Save, 
  ArrowLeft, 
  Send, 
  Phone, 
  User, 
  Compass, 
  X,
  FileCheck
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useSchool } from '../../context/SchoolContext';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { addRecord } from '../../services/db';

const EServices = () => {
  const { schoolData } = useSchool();
  const [activeConfig, setActiveConfig] = useState(null);
  const [copied, setCopied] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [testSent, setTestSent] = useState(false);

  // Configuration forms local state
  const [newClass, setNewClass] = useState({ grade: '', subject: '', time: '', link: '' });
  const [newBook, setNewBook] = useState({ name: '', grade: '', subject: '', fileUrl: '' });
  const [websiteForm, setWebsiteForm] = useState(null);
  const [whatsappForm, setWhatsappForm] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [generatedPin, setGeneratedPin] = useState('');

  // Extract school configurations or fall back to beautiful mock defaults
  const eServices = schoolData?.eServices || {};
  
  const websiteConfig = eServices.website || {
    themeColor: '#3b82f6',
    logoUrl: '',
    contactPhone: schoolData?.phone || '0300-1234567',
    contactEmail: schoolData?.email || 'info@school.edu.pk',
    address: schoolData?.address || 'Main Campus, Pakistan',
    brandName: schoolData?.name || 'Taleemi School System'
  };

  const whatsAppConfig = eServices.whatsApp || {
    triggers: ['attendance', 'fee'],
    apiKey: 'wts_live_990848x28a38c',
    phoneNumber: schoolData?.phone || '0300-1234567'
  };

  const virtualClasses = eServices.virtualClasses || [
    { id: '1', grade: '9', subject: 'Physics', time: '10:00 AM - 11:00 AM', link: 'https://zoom.us/j/9082384218' },
    { id: '2', grade: '10', subject: 'Mathematics', time: '11:30 AM - 12:30 PM', link: 'https://meet.google.com/abc-defg-hij' }
  ];

  const libraryBooks = eServices.libraryBooks || [
    { id: '1', name: 'Oxford Progressive English', grade: '5', subject: 'English', fileUrl: 'https://taleemi.edu/books/english5.pdf' },
    { id: '2', name: 'Mathematics Grade 9 Sindh Board', grade: '9', subject: 'Mathematics', fileUrl: 'https://taleemi.edu/books/maths9.pdf' }
  ];

  const admissions = eServices.admissions || {
    isAccepting: true,
    applications: [
      { id: 'app1', name: 'Fatima Lodhi', fatherName: 'Umar Hayat', grade: '5', phone: '03001234567', status: 'Pending', date: '2026-05-15' },
      { id: 'app2', name: 'Muhammad Ali', fatherName: 'Sajid Ali', grade: '8', phone: '03129876543', status: 'Pending', date: '2026-05-16' },
      { id: 'app3', name: 'Ayesha Khan', fatherName: 'Tariq Khan', grade: '2', phone: '03214567890', status: 'Approved', date: '2026-05-14' }
    ]
  };

  const parentPortal = eServices.parentPortal || {
    pins: {
      'std1': '4829',
      'std2': '9012'
    }
  };

  const serviceStates = {
    'School Website': !!eServices.websiteActive,
    'WhatsApp Integration': !!eServices.whatsAppActive,
    'Virtual Classes': !!eServices.virtualClassesActive,
    'E-Library': !!eServices.libraryActive,
    'Online Admission Form': !!eServices.admissionsActive,
    'Parent App Portal': !!eServices.parentActive,
  };

  // Save config back to school document in Firestore
  const updateEServices = async (data) => {
    if (!schoolData?.id) return;
    try {
      const schoolRef = doc(db, 'schools', schoolData.id);
      await updateDoc(schoolRef, {
        eServices: {
          ...eServices,
          ...data
        }
      });
    } catch (err) {
      console.error("Error saving E-Services settings:", err);
      alert("Error saving settings: " + err.message);
    }
  };

  const toggleService = (name) => {
    const keyMap = {
      'School Website': 'websiteActive',
      'WhatsApp Integration': 'whatsAppActive',
      'Virtual Classes': 'virtualClassesActive',
      'E-Library': 'libraryActive',
      'Online Admission Form': 'admissionsActive',
      'Parent App Portal': 'parentActive',
    };
    updateEServices({ [keyMap[name]]: !serviceStates[name] });
  };

  const copyAdmissionLink = () => {
    const link = `${window.location.origin}/#/admission-form/${schoolData?.id || 'demo'}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // WhatsApp Alert Simulator
  const handleSendTestMessage = (e) => {
    e.preventDefault();
    if (!testNumber) return;
    setTestSent(true);
    setTimeout(() => {
      setTestSent(false);
      setTestNumber('');
      alert(`✅ Mock WhatsApp alert successfully sent to ${testNumber}!`);
    }, 1500);
  };

  // Virtual Classes
  const handleAddClass = () => {
    if (!newClass.grade || !newClass.subject || !newClass.time || !newClass.link) {
      alert("Please fill all class fields.");
      return;
    }
    const updated = [...virtualClasses, { id: Date.now().toString(), ...newClass }];
    updateEServices({ virtualClasses: updated });
    setNewClass({ grade: '', subject: '', time: '', link: '' });
  };

  const handleDeleteClass = (id) => {
    const updated = virtualClasses.filter(c => c.id !== id);
    updateEServices({ virtualClasses: updated });
  };

  // E-Library
  const handleAddBook = () => {
    if (!newBook.name || !newBook.grade || !newBook.subject || !newBook.fileUrl) {
      alert("Please fill all resource fields.");
      return;
    }
    const updated = [...libraryBooks, { id: Date.now().toString(), ...newBook }];
    updateEServices({ libraryBooks: updated });
    setNewBook({ name: '', grade: '', subject: '', fileUrl: '' });
  };

  const handleDeleteBook = (id) => {
    const updated = libraryBooks.filter(b => b.id !== id);
    updateEServices({ libraryBooks: updated });
  };

  // Approve Admission & Add Student automatically!
  const handleApproveAdmission = async (app) => {
    try {
      const studentData = {
        name: app.name,
        fatherName: app.fatherName,
        dob: '2016-01-01',
        gender: 'Male',
        rollNumber: 'ADM-' + Math.floor(1000 + Math.random() * 9000),
        class: app.grade,
        section: 'A',
        phone: app.phone,
        address: 'Registered via Online Admission',
        admissionDate: new Date().toISOString().split('T')[0],
        status: 'Active'
      };

      // Add student record to Firestore
      const res = await addRecord('students', studentData, schoolData?.id || 'demo');
      if (res.success) {
        // Update application status to Approved
        const updatedApps = admissions.applications.map(a => 
          a.id === app.id ? { ...a, status: 'Approved' } : a
        );
        await updateEServices({
          admissions: {
            ...admissions,
            applications: updatedApps
          }
        });
        alert(`🎉 ${app.name} has been enrolled in the school! New Roll No: ${studentData.rollNumber}`);
      } else {
        alert("Enrollment failed: " + res.error.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error enrolling student.");
    }
  };

  const handleRejectAdmission = (id) => {
    const updatedApps = admissions.applications.map(a => 
      a.id === id ? { ...a, status: 'Rejected' } : a
    );
    updateEServices({
      admissions: {
        ...admissions,
        applications: updatedApps
      }
    });
  };

  // Parent PIN portal
  const handleGeneratePin = () => {
    if (!selectedStudentId) return;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedPin(pin);
    const updatedPins = { ...parentPortal.pins, [selectedStudentId]: pin };
    updateEServices({
      parentPortal: {
        ...parentPortal,
        pins: updatedPins
      }
    });
  };

  const servicesList = [
    { icon: Globe, name: 'School Website', desc: 'Publish a live public website for your school', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: MessageCircle, name: 'WhatsApp Integration', desc: 'Automate attendance & fee notifications', color: 'text-green-400', bg: 'bg-green-500/10' },
    { icon: Video, name: 'Virtual Classes', desc: 'Setup online schedules & meeting rooms', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { icon: BookOpen, name: 'E-Library', desc: 'Share curriculum content & study PDFs', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { icon: FileText, name: 'Online Admission Form', desc: 'Recieve & approve student enrollments online', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { icon: Wifi, name: 'Parent App Portal', desc: 'Provide parental grades & attendance access', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3"><Globe className="text-primary-500" size={28} /> Portals & Services</h1>
        <p className="text-dark-muted mt-1">Configure and release digital assets and automated portals for your institute.</p>
      </div>

      {!activeConfig ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicesList.map(service => (
            <GlassCard key={service.name} className="p-6 flex flex-col justify-between h-56">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${service.bg}`}>
                    <service.icon className={service.color} size={24} />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={serviceStates[service.name]} 
                      onChange={() => toggleService(service.name)} 
                      className="sr-only peer" 
                    />
                    <div className="relative w-10 h-5 bg-dark-border rounded-full peer peer-checked:bg-primary-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
                <h3 className="font-bold text-lg mb-1">{service.name}</h3>
                <p className="text-xs text-dark-muted">{service.desc}</p>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                  serviceStates[service.name] ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-dark-muted bg-dark-hover border-dark-border'
                }`}>
                  {serviceStates[service.name] ? 'Active' : 'Inactive'}
                </span>
                
                {serviceStates[service.name] && (
                  <button 
                    onClick={() => setActiveConfig(service.name)}
                    className="text-xs font-bold text-primary-500 flex items-center gap-1 hover:text-primary-400 transition-colors"
                  >
                    Configure <ExternalLink size={12} />
                  </button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setActiveConfig(null); setGeneratedPin(''); }}
              className="p-2 hover:bg-dark-hover rounded-xl text-dark-muted transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold">Configure: {activeConfig}</h2>
              <p className="text-sm text-dark-muted">Configure access settings and live portal attributes.</p>
            </div>
          </div>

          {/* SCHOOL WEBSITE CONFIGURATION */}
          {activeConfig === 'School Website' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <GlassCard className="p-8 space-y-6">
                <h3 className="text-lg font-bold">Customize Landing Page</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Brand Name</label>
                    <input 
                      type="text" 
                      defaultValue={websiteConfig.brandName}
                      onChange={(e) => setWebsiteForm({ ...websiteConfig, brandName: e.target.value })}
                      className="w-full premium-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Theme Primary Color</label>
                    <div className="flex gap-4">
                      {['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'].map(color => (
                        <button 
                          key={color}
                          onClick={() => setWebsiteForm({ ...websiteConfig, themeColor: color })}
                          style={{ backgroundColor: color }}
                          className={`w-8 h-8 rounded-full border-2 ${websiteConfig.themeColor === color ? 'border-white scale-110' : 'border-transparent'} transition-all`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">School Address</label>
                    <input 
                      type="text" 
                      defaultValue={websiteConfig.address}
                      onChange={(e) => setWebsiteForm({ ...websiteConfig, address: e.target.value })}
                      className="w-full premium-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Contact Phone</label>
                      <input 
                        type="text" 
                        defaultValue={websiteConfig.contactPhone}
                        onChange={(e) => setWebsiteForm({ ...websiteConfig, contactPhone: e.target.value })}
                        className="w-full premium-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Contact Email</label>
                      <input 
                        type="text" 
                        defaultValue={websiteConfig.contactEmail}
                        onChange={(e) => setWebsiteForm({ ...websiteConfig, contactEmail: e.target.value })}
                        className="w-full premium-input"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      updateEServices({ website: websiteForm || websiteConfig });
                      alert("School website config updated successfully!");
                    }}
                    className="premium-button-primary w-full"
                  >
                    <Save size={16} /> Save Changes
                  </button>
                </div>
              </GlassCard>

              {/* LIVE PAGE PREVIEW */}
              <GlassCard className="p-8 space-y-6 border-2 border-primary-500/20">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Compass className="text-primary-500 animate-spin" size={18} /> Public Website Live Preview
                </h3>
                <div className="bg-[#0b0f19] rounded-2xl border border-dark-border overflow-hidden min-h-[300px] flex flex-col justify-between p-6">
                  <div>
                    <header className="flex justify-between items-center border-b border-dark-border/40 pb-3 mb-6">
                      <span className="font-extrabold text-sm flex items-center gap-1.5" style={{ color: websiteConfig.themeColor }}>
                        <Globe size={16} /> {websiteConfig.brandName}
                      </span>
                      <span className="text-[9px] font-black tracking-wider uppercase text-green-400 border border-green-500/20 bg-green-500/10 px-2 py-0.5 rounded-full">
                        Admissions Open
                      </span>
                    </header>

                    <div className="text-center space-y-3 py-4">
                      <h4 className="text-xl font-black">Shaping Bright Futures & Excellence</h4>
                      <p className="text-[10px] text-dark-muted max-w-sm mx-auto">Providing modern curriculum, computerized examination portals, and comprehensive academic reporting.</p>
                      <button className="px-4 py-1.5 rounded-xl text-[10px] font-bold text-white transition-all hover:opacity-90" style={{ backgroundColor: websiteConfig.themeColor }}>
                        Apply Online
                      </button>
                    </div>
                  </div>

                  <footer className="border-t border-dark-border/40 pt-4 flex flex-col gap-1 text-[9px] text-dark-muted">
                    <div>📍 Address: {websiteConfig.address}</div>
                    <div className="flex gap-4">
                      <span>📞 Phone: {websiteConfig.contactPhone}</span>
                      <span>✉️ Email: {websiteConfig.contactEmail}</span>
                    </div>
                  </footer>
                </div>
              </GlassCard>
            </div>
          )}

          {/* WHATSAPP ALERTS INTEGRATION */}
          {activeConfig === 'WhatsApp Integration' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <GlassCard className="p-8 space-y-6">
                <h3 className="text-lg font-bold">API Gateway Configurations</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">API access Token</label>
                    <input 
                      type="password" 
                      defaultValue={whatsAppConfig.apiKey}
                      onChange={(e) => setWhatsappForm({ ...whatsAppConfig, apiKey: e.target.value })}
                      className="w-full premium-input font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Alert Notification triggers</label>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {[
                        { key: 'attendance', label: 'Attendance alerts (On Student Absence)' },
                        { key: 'fee', label: 'Billing alerts (On Fee Challan Generation)' },
                        { key: 'exams', label: 'Report Card alerts (On Term Result Publication)' }
                      ].map(trigger => (
                        <label key={trigger.key} className="flex items-center gap-3 text-sm cursor-pointer p-2.5 rounded-xl hover:bg-dark-hover">
                          <input 
                            type="checkbox"
                            checked={whatsAppConfig.triggers.includes(trigger.key)}
                            onChange={(e) => {
                              const updatedTriggers = e.target.checked 
                                ? [...whatsAppConfig.triggers, trigger.key] 
                                : whatsAppConfig.triggers.filter(t => t !== trigger.key);
                              updateEServices({ whatsApp: { ...whatsAppConfig, triggers: updatedTriggers } });
                            }}
                            className="accent-primary-500 rounded"
                          />
                          <span>{trigger.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      updateEServices({ whatsApp: whatsappForm || whatsAppConfig });
                      alert("WhatsApp API configs successfully locked!");
                    }}
                    className="premium-button-primary w-full"
                  >
                    <Save size={16} /> Save Gateway Settings
                  </button>
                </div>
              </GlassCard>

              {/* TEST ALERT TRIGGER */}
              <GlassCard className="p-8 space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Send className="text-primary-500" size={18} /> Test Alert Delivery Simulator
                </h3>
                <p className="text-xs text-dark-muted">Verify the active integration by dispatching a simulated message structure immediately.</p>
                <form onSubmit={handleSendTestMessage} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Target Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                      <input 
                        type="tel" 
                        required
                        value={testNumber}
                        onChange={(e) => setTestNumber(e.target.value)}
                        placeholder="e.g. +923001234567" 
                        className="w-full premium-input pl-12"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={testSent}
                    className="w-full premium-button-primary disabled:opacity-50"
                  >
                    {testSent ? 'Sending SMS...' : 'Trigger Test Message'}
                  </button>
                </form>

                {testSent && (
                  <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl flex items-center gap-3 text-xs animate-pulse">
                    <MessageCircle className="text-primary-500" size={16} />
                    <span>WhatsApp service dispatch request running in background sandbox...</span>
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* VIRTUAL CLASSES SCHEDULES */}
          {activeConfig === 'Virtual Classes' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              <GlassCard className="p-8 space-y-6 lg:col-span-1">
                <h3 className="text-lg font-bold">Schedule Virtual Meeting</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Class Grade</label>
                    <input 
                      type="text" 
                      value={newClass.grade}
                      onChange={(e) => setNewClass({ ...newClass, grade: e.target.value })}
                      placeholder="e.g. 9 Class" 
                      className="w-full premium-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Subject</label>
                    <input 
                      type="text" 
                      value={newClass.subject}
                      onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                      placeholder="e.g. Chemistry" 
                      className="w-full premium-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Timing</label>
                    <input 
                      type="text" 
                      value={newClass.time}
                      onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
                      placeholder="e.g. 02:00 PM - 03:00 PM" 
                      className="w-full premium-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Zoom/Meet link</label>
                    <input 
                      type="url" 
                      value={newClass.link}
                      onChange={(e) => setNewClass({ ...newClass, link: e.target.value })}
                      placeholder="https://zoom.us/j/..." 
                      className="w-full premium-input"
                    />
                  </div>
                  <button 
                    onClick={handleAddClass}
                    className="premium-button-primary w-full"
                  >
                    <Plus size={16} /> Add Schedule
                  </button>
                </div>
              </GlassCard>

              {/* LIST SCHEDULES */}
              <GlassCard className="p-8 space-y-6 lg:col-span-2 overflow-x-auto">
                <h3 className="text-lg font-bold">Scheduled Classes</h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-dark-border text-dark-muted font-black tracking-widest uppercase">
                      <th className="pb-3">Class</th>
                      <th className="pb-3">Subject</th>
                      <th className="pb-3">Timing</th>
                      <th className="pb-3">Room Link</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {virtualClasses.map(c => (
                      <tr key={c.id} className="border-b border-dark-border/40 hover:bg-dark-hover/20">
                        <td className="py-3.5 font-bold">{c.grade} Grade</td>
                        <td className="py-3.5 text-primary-400 font-bold">{c.subject}</td>
                        <td className="py-3.5">{c.time}</td>
                        <td className="py-3.5 font-mono text-[10px]">
                          <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                            Join Link <ExternalLink size={10} />
                          </a>
                        </td>
                        <td className="py-3.5 text-right">
                          <button 
                            onClick={() => handleDeleteClass(c.id)}
                            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            </div>
          )}

          {/* DIGITAL E-LIBRARY PORTAL */}
          {activeConfig === 'E-Library' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              <GlassCard className="p-8 space-y-6 lg:col-span-1">
                <h3 className="text-lg font-bold">Add Digital Resource</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Resource / Book Name</label>
                    <input 
                      type="text" 
                      value={newBook.name}
                      onChange={(e) => setNewBook({ ...newBook, name: e.target.value })}
                      placeholder="e.g. Physics Grade 10 Book" 
                      className="w-full premium-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Class Grade</label>
                    <input 
                      type="text" 
                      value={newBook.grade}
                      onChange={(e) => setNewBook({ ...newBook, grade: e.target.value })}
                      placeholder="e.g. 10" 
                      className="w-full premium-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Subject</label>
                    <input 
                      type="text" 
                      value={newBook.subject}
                      onChange={(e) => setNewBook({ ...newBook, subject: e.target.value })}
                      placeholder="e.g. Physics" 
                      className="w-full premium-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">PDF Resource Link</label>
                    <input 
                      type="url" 
                      value={newBook.fileUrl}
                      onChange={(e) => setNewBook({ ...newBook, fileUrl: e.target.value })}
                      placeholder="https://drive.google.com/..." 
                      className="w-full premium-input"
                    />
                  </div>
                  <button 
                    onClick={handleAddBook}
                    className="premium-button-primary w-full"
                  >
                    <Plus size={16} /> Upload Book
                  </button>
                </div>
              </GlassCard>

              {/* LIST BOOKS */}
              <GlassCard className="p-8 space-y-6 lg:col-span-2 overflow-x-auto">
                <h3 className="text-lg font-bold font-black">Digital Catalog</h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-dark-border text-dark-muted font-black tracking-widest uppercase">
                      <th className="pb-3">Title Name</th>
                      <th className="pb-3">Grade</th>
                      <th className="pb-3">Subject</th>
                      <th className="pb-3">Resource Link</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {libraryBooks.map(b => (
                      <tr key={b.id} className="border-b border-dark-border/40 hover:bg-dark-hover/20">
                        <td className="py-3.5 font-bold flex items-center gap-2">
                          <BookOpen className="text-primary-500" size={14} />
                          {b.name}
                        </td>
                        <td className="py-3.5">{b.grade} Grade</td>
                        <td className="py-3.5 font-bold text-primary-400">{b.subject}</td>
                        <td className="py-3.5 font-mono text-[10px]">
                          <a href={b.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                            PDF Link <ExternalLink size={10} />
                          </a>
                        </td>
                        <td className="py-3.5 text-right">
                          <button 
                            onClick={() => handleDeleteBook(b.id)}
                            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            </div>
          )}

          {/* ONLINE ADMISSION APPLICATIONS */}
          {activeConfig === 'Online Admission Form' && (
            <div className="space-y-6 animate-fade-in">
              <GlassCard className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Online Admission Access</h3>
                  <p className="text-xs text-dark-muted">Share this secure link with prospective parents to accept admissions online.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={copyAdmissionLink}
                    className="premium-button-secondary py-2 flex items-center gap-2"
                  >
                    {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy Public Link'}
                  </button>
                  <label className="flex items-center gap-2 text-xs font-bold bg-dark-hover border border-dark-border px-4 py-2.5 rounded-xl cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={admissions.isAccepting}
                      onChange={(e) => updateEServices({ admissions: { ...admissions, isAccepting: e.target.checked } })}
                      className="accent-primary-500"
                    />
                    <span>Accepting Admissions</span>
                  </label>
                </div>
              </GlassCard>

              {/* LIST APPLICATIONS */}
              <GlassCard className="p-8 space-y-6 overflow-x-auto">
                <h3 className="text-lg font-bold">Online Admission Submissions</h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-dark-border text-dark-muted font-black tracking-widest uppercase">
                      <th className="pb-3">Student</th>
                      <th className="pb-3">Guardian</th>
                      <th className="pb-3">Class</th>
                      <th className="pb-3">Contact</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.applications.map(app => (
                      <tr key={app.id} className="border-b border-dark-border/40 hover:bg-dark-hover/20">
                        <td className="py-3.5 font-bold flex items-center gap-2">
                          <User className="text-primary-500" size={14} />
                          {app.name}
                        </td>
                        <td className="py-3.5">{app.fatherName}</td>
                        <td className="py-3.5 font-bold text-primary-400">{app.grade} Class</td>
                        <td className="py-3.5 font-mono">{app.phone}</td>
                        <td className="py-3.5">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            app.status === 'Approved' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                            app.status === 'Rejected' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                            'text-orange-400 bg-orange-500/10 border-orange-500/20'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          {app.status === 'Pending' ? (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleApproveAdmission(app)}
                                className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                              >
                                <Check size={12} /> Approve & Enroll
                              </button>
                              <button 
                                onClick={() => handleRejectAdmission(app.id)}
                                className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                              >
                                <X size={12} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-dark-muted font-bold italic text-[10px]">Actioned ({app.status})</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            </div>
          )}

          {/* PARENT APP PORTAL LOGIN PIN GENERATION */}
          {activeConfig === 'Parent App Portal' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              <GlassCard className="p-8 space-y-6 lg:col-span-1">
                <h3 className="text-lg font-bold">Generate Access Pin</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-dark-muted">Select Student</label>
                    <select 
                      value={selectedStudentId}
                      onChange={(e) => { setSelectedStudentId(e.target.value); setGeneratedPin(''); }}
                      className="w-full premium-input"
                    >
                      <option value="">Select a student...</option>
                      <option value="std1">Fatima Lodhi (Class 5 - Roll 109)</option>
                      <option value="std2">Muhammad Ali (Class 8 - Roll 205)</option>
                    </select>
                  </div>
                  <button 
                    onClick={handleGeneratePin}
                    disabled={!selectedStudentId}
                    className="premium-button-primary w-full disabled:opacity-50"
                  >
                    <Save size={16} /> Generate Portal PIN
                  </button>

                  {generatedPin && (
                    <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl text-center space-y-2">
                      <div className="text-xs text-dark-muted font-black uppercase tracking-widest">Active Login PIN</div>
                      <div className="text-3xl font-black text-green-400 font-mono tracking-widest">{generatedPin}</div>
                      <p className="text-[10px] text-dark-muted">Share this 4-digit code with the parent to enable Portal login.</p>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* ACTIVE PIN MANAGER */}
              <GlassCard className="p-8 space-y-6 lg:col-span-2 overflow-x-auto">
                <h3 className="text-lg font-bold">Parent Access Codes</h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-dark-border text-dark-muted font-black tracking-widest uppercase">
                      <th className="pb-3">Student Name</th>
                      <th className="pb-3">Registration ID</th>
                      <th className="pb-3">Portal login Pin</th>
                      <th className="pb-3">Platform link</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-dark-border/40">
                      <td className="py-3.5 font-bold flex items-center gap-2">
                        <User className="text-primary-500" size={14} /> Fatima Lodhi
                      </td>
                      <td className="py-3.5 font-mono text-[10px]">std1</td>
                      <td className="py-3.5 text-green-400 font-bold font-mono tracking-wider">{parentPortal.pins['std1'] || 'Not Set'}</td>
                      <td className="py-3.5 text-blue-400 hover:underline cursor-pointer">taleemidunya-pro.vercel.app/#/parent-portal</td>
                    </tr>
                    <tr className="border-b border-dark-border/40">
                      <td className="py-3.5 font-bold flex items-center gap-2">
                        <User className="text-primary-500" size={14} /> Muhammad Ali
                      </td>
                      <td className="py-3.5 font-mono text-[10px]">std2</td>
                      <td className="py-3.5 text-green-400 font-bold font-mono tracking-wider">{parentPortal.pins['std2'] || 'Not Set'}</td>
                      <td className="py-3.5 text-blue-400 hover:underline cursor-pointer">taleemidunya-pro.vercel.app/#/parent-portal</td>
                    </tr>
                  </tbody>
                </table>
              </GlassCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EServices;
