import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { 
  User, CreditCard, Receipt, Printer, FileText, Edit2, History, Award, 
  CalendarCheck, BookOpen, MessageSquare, Bell, Search, ArrowLeft, 
  DollarSign, Hash, Phone, Mail, Home, GraduationCap, 
  CheckCircle, Clock, Users, Download, UserCheck, Loader2, Send
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useNavigate as useNav } from 'react-router-dom';

const SingleStudent360 = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [waSending, setWaSending] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  // Auto-Send WhatsApp Notice via Bot Engine (Background)
  const handleSendWhatsAppNotice = async (overrideText = null) => {
    if (!selectedStudent) return;
    const rawPhone = selectedStudent.phone || selectedStudent.parentPhone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');

    if (!cleanPhone) {
      alert('⚠️ Is student ke record mein WhatsApp / Mobile number mojood nahi hai. Pehle profile update karein.');
      return;
    }

    const schoolName = userData?.schoolName || 'Smart Angels Grammar School';
    const defaultText = `Assalam-o-Alaikum Respected Parent of *${selectedStudent.name}* (Roll: ${selectedStudent.rollNumber || 'N/A'}, Class: ${selectedStudent.class || 'N/A'}).\n\nThis is an official communication from *${schoolName}*. Please check your Parent Portal for recent attendance logs, examination reports, and fee challans.\n\nThank you for your cooperation!\n*Administration - ${schoolName}*`;
    const messageToSend = overrideText || customMsg || defaultText;

    setWaSending(true);
    try {
      const res = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: userData?.schoolId || 'NNRuCtHxQNjISc9EPgMs',
          phone: cleanPhone,
          message: messageToSend
        })
      });
      const data = await res.json();

      if (data.success && data.results?.[0]?.status === 'sent') {
        alert(`✅ WhatsApp Notice automatically sent to ${selectedStudent.name}'s parent (${cleanPhone}) in the background!`);
      } else {
        const errorReason = data.error || data.results?.[0]?.error || 'WhatsApp Bot offline / waiting for QR scan';
        const fallback = window.confirm(
          `⚠️ Auto-Send Notice:\n\n${errorReason}\n\nAgar aap background auto-send chahte hain to 'WhatsApp AI Bot & SMS Center' mein ja kar QR code scan karein.\n\nKya aap abhi ke liye WhatsApp Web ke zariye direct bhejna chahte hain?`
        );
        if (fallback) {
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageToSend)}`, '_blank');
        }
      }
    } catch (err) {
      const fallback = window.confirm(
        `🌐 WhatsApp Server connect nahi ho saka.\n\nKya aap WhatsApp Web ke zariye direct bhejna chahte hain?`
      );
      if (fallback) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageToSend)}`, '_blank');
      }
    } finally {
      setWaSending(false);
    }
  };

  const tabs = [
    { id: 'overview',       label: 'Overview',        icon: User },
    { id: 'collect-fee',    label: 'Collect Fee',     icon: DollarSign },
    { id: 'voucher',        label: 'Vouchers',        icon: Receipt },
    { id: 'ledger',         label: 'Ledger',          icon: FileText },
    { id: 'attendance',     label: 'Attendance',      icon: CalendarCheck },
    { id: 'payment',        label: 'Payments',        icon: History },
    { id: 'id-card',        label: 'ID Card',         icon: Award },
    { id: 'certificate',    label: 'Certificate',     icon: BookOpen },
    { id: 'message',        label: 'Message',         icon: MessageSquare },
    { id: 'edit',           label: 'Edit Profile',    icon: Edit2 },
  ];

  useEffect(() => {
    const fetchStudentsList = async () => {
      setLoading(true);
      const data = await getRecords('students', userData?.schoolId || 'default-school');
      setStudents(data);
      if (data.length > 0) {
        if (id) {
          const found = data.find(s => s.id === id);
          setSelectedStudent(found || data[0]);
        } else if (!selectedStudent) {
          setSelectedStudent(data[0]);
        }
      }
      setLoading(false);
    };
    fetchStudentsList();
  }, [userData, id]);

  const switchTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const getStatusClass = (status) => {
    if (status === 'Active') return 'bg-green-500/20 text-green-400 border border-green-500/30';
    return 'bg-red-500/20 text-red-400 border border-red-500/30';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-muted font-bold">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ===== TOP BAR ===== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-border pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/school-admin/students')} className="p-2 rounded-xl bg-dark-hover hover:bg-dark-border text-dark-muted hover:text-white transition-all border border-dark-border">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <GraduationCap className="text-primary-500" size={26} /> Student 360 Hub
            </h1>
            <p className="text-xs text-primary-400 font-mono font-bold uppercase tracking-wider mt-0.5">
              Complete student management panel
            </p>
          </div>
        </div>
        {/* Student selector */}
        <div className="flex items-center gap-2 bg-dark-card border border-dark-border px-4 py-2.5 rounded-xl w-full md:w-96 shadow-inner">
          <Search size={16} className="text-primary-500 shrink-0" />
          <select 
            value={selectedStudent?.id || ''} 
            onChange={(e) => {
              const found = students.find(s => s.id === e.target.value);
              if (found) { setSelectedStudent(found); setSearchParams({ tab: 'overview' }); }
            }}
            className="w-full bg-transparent border-none outline-none text-white font-bold text-xs"
          >
            {students.map(s => (
              <option key={s.id} value={s.id} className="bg-dark-bg text-white font-medium">
                {s.name} ({s.rollNumber || 'N/A'}) - Class {s.class}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedStudent ? (
        <GlassCard className="p-20 text-center text-dark-muted">
          <GraduationCap size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-bold text-white">No student selected</p>
        </GlassCard>
      ) : (
        <>
          {/* ===== HERO BANNER (StaffProfile style) ===== */}
          <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-dark-card border border-slate-200/90 dark:border-dark-border shadow-xl transition-colors">
            {/* Top Banner Gradient: Crisp luminous sky-indigo in light mode, sleek midnight glow in dark mode */}
            <div className="h-32 sm:h-36 bg-gradient-to-r from-blue-100/90 via-indigo-100/60 to-sky-100/80 dark:from-blue-900/50 dark:via-primary-900/40 dark:to-indigo-900/50 w-full absolute top-0 left-0 border-b border-blue-200/60 dark:border-white/5" />
            
            {/* Subtle decorative ambient lights for modern SaaS depth */}
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-400/10 dark:bg-primary-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-2 left-1/3 w-36 h-36 bg-indigo-400/10 dark:bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative pt-10 px-6 pb-6 sm:px-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
              {/* Avatar */}
              <div className="w-28 h-28 rounded-full border-4 border-white dark:border-dark-card bg-slate-50 dark:bg-dark-hover flex items-center justify-center overflow-hidden shrink-0 shadow-lg relative z-10">
                {selectedStudent.photoUrl ? (
                  <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-primary-600 dark:text-primary-400">{selectedStudent.name?.charAt(0)}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-1">
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{selectedStudent.name}</h1>
                  <span className={`px-3.5 py-1 rounded-full text-xs font-bold w-fit mx-auto sm:mx-0 shadow-xs ${getStatusClass(selectedStudent.status)}`}>
                    {selectedStudent.status || 'Active'}
                  </span>
                </div>
                <p className="text-primary-600 dark:text-primary-400 font-bold text-base mb-1">
                  Father: <span className="text-slate-800 dark:text-white font-semibold">{selectedStudent.fatherName || 'N/A'}</span>
                </p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                  <span className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-primary-500/10 border border-blue-200/80 dark:border-primary-500/20 text-blue-700 dark:text-primary-400 text-xs font-bold shadow-2xs">
                    Class {selectedStudent.class} ({selectedStudent.section || 'A'})
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-dark-border text-slate-700 dark:text-dark-muted text-xs font-bold font-mono shadow-2xs">
                    Roll # {selectedStudent.rollNumber || 'N/A'}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold font-mono shadow-2xs">
                    {selectedStudent.phone || 'No Phone'}
                  </span>
                  {selectedStudent.username && (
                    <span className="px-3 py-1 rounded-lg bg-amber-50 dark:bg-yellow-500/10 border border-amber-200/80 dark:border-yellow-500/20 text-amber-700 dark:text-yellow-400 text-xs font-bold font-mono shadow-2xs">
                      App: {selectedStudent.username}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                <button
                  onClick={() => navigate(`/school-admin/students/edit/${selectedStudent.id}`)}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Edit2 size={16} /> Edit Profile
                </button>
                <button
                  onClick={() => handleSendWhatsAppNotice()}
                  disabled={waSending}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                  title="Auto-Send WhatsApp notice in background without opening any tab"
                >
                  {waSending ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                  {waSending ? 'Sending...' : 'WhatsApp (Auto)'}
                </button>
              </div>
            </div>
          </div>

          {/* ===== STATS BAR ===== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GlassCard className="p-4 text-center">
              <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest">Monthly Fee</p>
              <p className="text-2xl font-black text-green-400 mt-1">Rs. {selectedStudent.monthlyFee || 0}</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest">Balance</p>
              <p className="text-2xl font-black text-red-400 mt-1">Rs. {selectedStudent.balance || 0}</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest">Admission</p>
              <p className="text-sm font-black text-white mt-1">{selectedStudent.admissionDate || 'N/A'}</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest">CNIC</p>
              <p className="text-sm font-black text-white mt-1 font-mono">{selectedStudent.cnic || selectedStudent.fatherCnic || 'N/A'}</p>
            </GlassCard>
          </div>

          {/* ===== HORIZONTAL TABS (StaffProfile style) ===== */}
          <div className="flex overflow-x-auto gap-2 p-1.5 bg-dark-card border border-dark-border rounded-xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`shrink-0 min-w-[110px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                      : 'text-dark-muted hover:bg-dark-hover hover:text-white'
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ===== TAB CONTENT ===== */}
          <div className="space-y-6">

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <GlassCard className="p-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                    <User size={16} className="text-primary-400" /> Personal Information
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Full Name', val: selectedStudent.name, icon: User },
                      { label: 'Father Name', val: selectedStudent.fatherName, icon: Users },
                      { label: 'Phone / WhatsApp', val: selectedStudent.phone || selectedStudent.parentPhone, icon: Phone },
                      { label: 'Email Address', val: selectedStudent.email || 'Not Added', icon: Mail },
                      { label: 'CNIC', val: selectedStudent.cnic || selectedStudent.fatherCnic, icon: CreditCard },
                      { label: 'Address', val: selectedStudent.address, icon: Home },
                      { label: 'App Username', val: selectedStudent.username, icon: UserCheck },
                    ].filter(i => i.val).map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400 shrink-0">
                          <item.icon size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">{item.label}</p>
                          <p className="font-bold text-white text-sm mt-0.5">{item.val}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                    <GraduationCap size={16} className="text-blue-400" /> Academic Details
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Class & Section', val: `${selectedStudent.class || 'N/A'} - ${selectedStudent.section || 'A'}`, icon: BookOpen },
                      { label: 'Roll Number', val: selectedStudent.rollNumber, icon: Hash },
                      { label: 'GR Number', val: selectedStudent.grNumber, icon: Hash },
                      { label: 'Admission Date', val: selectedStudent.admissionDate, icon: CalendarCheck },
                      { label: 'Monthly Fee', val: `Rs. ${selectedStudent.monthlyFee || 0}`, icon: DollarSign },
                      { label: 'Current Balance', val: `Rs. ${selectedStudent.balance || 0}`, icon: CreditCard },
                    ].filter(i => i.val).map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                          <item.icon size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">{item.label}</p>
                          <p className="font-bold text-white text-sm mt-0.5">{item.val}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            )}

            {/* COLLECT FEE TAB */}
            {activeTab === 'collect-fee' && (
              <GlassCard className="p-6 animate-fade-in">
                <h2 className="text-xl font-bold text-white border-b border-dark-border pb-3 mb-5 flex items-center justify-between">
                  <span className="flex items-center gap-2"><DollarSign size={20} className="text-green-400" /> Collect Fee</span>
                  <span className="text-xs font-mono text-green-400">Monthly: Rs. {selectedStudent.monthlyFee || 0}</span>
                </h2>
                <form onSubmit={(e) => { e.preventDefault(); alert(`Fee collected for ${selectedStudent.name}!`); }} className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Fee Month</label>
                    <input type="month" defaultValue={new Date().toISOString().slice(0, 7)} className="w-full premium-input text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Amount (Rs.)</label>
                    <input type="number" defaultValue={selectedStudent.monthlyFee || 3500} className="w-full premium-input font-mono text-base font-bold text-green-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Payment Method</label>
                    <select className="w-full premium-input text-sm">
                      <option>Cash at Counter</option>
                      <option>Bank Transfer / JazzCash</option>
                      <option>Online Card</option>
                    </select>
                  </div>
                  <button type="submit" className="premium-button-primary w-full justify-center py-3">
                    <DollarSign size={18} /> Confirm & Generate Receipt
                  </button>
                </form>
              </GlassCard>
            )}

            {/* VOUCHERS TAB */}
            {activeTab === 'voucher' && (
              <GlassCard className="p-6 animate-fade-in text-center py-14">
                <Receipt size={48} className="mx-auto text-primary-400 mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Fee Voucher / Challan</h3>
                <p className="text-xs text-dark-muted max-w-md mx-auto mb-6">
                  Generate and print customized fee challan vouchers for {selectedStudent.name} (Roll: {selectedStudent.rollNumber || 'N/A'}).
                </p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => alert('Voucher Generated!')} className="premium-button-primary">Generate Monthly Challan</button>
                  <button onClick={() => window.print()} className="premium-button-secondary"><Printer size={16} /> Print Voucher</button>
                </div>
              </GlassCard>
            )}

            {/* LEDGER TAB */}
            {activeTab === 'ledger' && (
              <GlassCard className="p-6 animate-fade-in">
                <h2 className="text-xl font-bold text-white border-b border-dark-border pb-3 mb-5 flex items-center justify-between">
                  <span className="flex items-center gap-2"><FileText size={20} className="text-blue-400" /> Student Ledger</span>
                  <button onClick={() => window.print()} className="premium-button-secondary text-xs"><Printer size={14} /> Print</button>
                </h2>
                <table className="w-full text-left text-xs border border-dark-border rounded-xl overflow-hidden">
                  <thead className="bg-dark-hover/60 text-dark-muted uppercase font-black">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Debit (Rs.)</th>
                      <th className="p-3 text-right">Credit (Rs.)</th>
                      <th className="p-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border font-mono">
                    <tr>
                      <td className="p-3">01/07/2026</td>
                      <td className="p-3 font-sans">July 2026 Monthly Fee</td>
                      <td className="p-3 text-right text-red-400">{selectedStudent.monthlyFee || 3500}</td>
                      <td className="p-3 text-right">0</td>
                      <td className="p-3 text-right font-bold">{selectedStudent.monthlyFee || 3500}</td>
                    </tr>
                    <tr>
                      <td className="p-3">05/07/2026</td>
                      <td className="p-3 font-sans">Cash Payment at Counter</td>
                      <td className="p-3 text-right">0</td>
                      <td className="p-3 text-right text-green-400">{selectedStudent.monthlyFee || 3500}</td>
                      <td className="p-3 text-right font-bold">0</td>
                    </tr>
                  </tbody>
                </table>
              </GlassCard>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
              <GlassCard className="p-6 animate-fade-in">
                <h2 className="text-xl font-bold text-white border-b border-dark-border pb-3 mb-5 flex items-center gap-2">
                  <CalendarCheck size={20} className="text-green-400" /> Attendance Summary
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-5 rounded-xl bg-green-500/10 border border-green-500/20">
                    <p className="text-3xl font-black text-green-400">96%</p>
                    <p className="text-[10px] uppercase font-bold text-dark-muted mt-1">Present</p>
                  </div>
                  <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-3xl font-black text-red-400">1</p>
                    <p className="text-[10px] uppercase font-bold text-dark-muted mt-1">Absent</p>
                  </div>
                  <div className="p-5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-3xl font-black text-yellow-400">0</p>
                    <p className="text-[10px] uppercase font-bold text-dark-muted mt-1">Leaves</p>
                  </div>
                  <div className="p-5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-3xl font-black text-blue-400">25</p>
                    <p className="text-[10px] uppercase font-bold text-dark-muted mt-1">Total Days</p>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === 'payment' && (
              <GlassCard className="p-6 animate-fade-in">
                <h2 className="text-xl font-bold text-white border-b border-dark-border pb-3 mb-5 flex items-center gap-2">
                  <History size={20} className="text-blue-400" /> Payment History & Receipts
                </h2>
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-dark-hover/30 border border-dark-border flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-white">Receipt #REC-2026-004</p>
                      <p className="text-xs text-dark-muted font-mono">Paid on 05 July 2026 via Cash</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-mono font-bold">Rs. {selectedStudent.monthlyFee || 3500}</p>
                      <button onClick={() => window.print()} className="text-[10px] text-primary-400 font-bold hover:underline">Download PDF</button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* ID CARD TAB */}
            {activeTab === 'id-card' && (
              <GlassCard className="p-6 animate-fade-in text-center py-14">
                <Award size={48} className="mx-auto text-amber-400 mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Student Smart ID Card</h3>
                <p className="text-xs text-dark-muted max-w-md mx-auto mb-6">
                  Front and back PVC ID card with QR scanner for {selectedStudent.name}.
                </p>
                <button onClick={() => navigate(`/school-admin/id-cards-student`)} className="premium-button-primary">
                  <Printer size={16} /> Generate & Print ID Card
                </button>
              </GlassCard>
            )}

            {/* CERTIFICATE TAB */}
            {activeTab === 'certificate' && (
              <GlassCard className="p-6 animate-fade-in text-center py-14">
                <BookOpen size={48} className="mx-auto text-indigo-400 mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Certificates & Mark Sheet</h3>
                <p className="text-xs text-dark-muted max-w-md mx-auto mb-6">
                  Print Character Certificate, School Leaving Certificate, or Exam Mark Sheet for {selectedStudent.name}.
                </p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => window.print()} className="premium-button-primary">
                    <Printer size={16} /> Print Certificate
                  </button>
                  <button onClick={() => window.print()} className="premium-button-secondary">
                    <Download size={16} /> Mark Sheet
                  </button>
                </div>
              </GlassCard>
            )}

            {/* MESSAGE TAB */}
            {activeTab === 'message' && (
              <GlassCard className="p-6 animate-fade-in">
                <h2 className="text-xl font-bold text-white border-b border-dark-border pb-3 mb-5 flex items-center gap-2">
                  <MessageSquare size={20} className="text-green-400" /> Send Message / Reminder Slip
                </h2>
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Message</label>
                    <textarea 
                      rows={4}
                      value={customMsg || `Assalam-o-Alaikum, regarding ${selectedStudent.name} (Class ${selectedStudent.class}), please check fee status.`}
                      onChange={(e) => setCustomMsg(e.target.value)}
                      className="w-full premium-input text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => handleSendWhatsAppNotice(customMsg)}
                      disabled={waSending}
                      className="premium-button-primary bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2 disabled:opacity-50"
                    >
                      {waSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      {waSending ? 'Sending in Background...' : 'Auto-Send via WhatsApp Bot'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const rawPhone = selectedStudent.phone || selectedStudent.parentPhone || '';
                        const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
                        const msg = customMsg || `Assalam-o-Alaikum, regarding ${selectedStudent.name} (Class ${selectedStudent.class}), please check fee status.`;
                        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-dark-muted hover:text-white transition-all flex items-center gap-1.5"
                    >
                      Open WhatsApp Web
                    </button>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* EDIT TAB */}
            {activeTab === 'edit' && (
              <GlassCard className="p-6 animate-fade-in">
                <h2 className="text-xl font-bold text-white border-b border-dark-border pb-3 mb-5 flex items-center gap-2">
                  <Edit2 size={20} className="text-primary-400" /> Edit Student Profile
                </h2>
                <p className="text-sm text-dark-muted mb-4">You will be redirected to the full student edit form.</p>
                <button 
                  onClick={() => navigate(`/school-admin/students/edit/${selectedStudent.id}`)}
                  className="premium-button-primary"
                >
                  <Edit2 size={16} /> Open Full Edit Form
                </button>
              </GlassCard>
            )}

          </div>
        </>
      )}
    </div>
  );
};

export default SingleStudent360;
