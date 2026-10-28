import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, Mail, MapPin, GraduationCap,
  Calendar, CreditCard, Hash, BookOpen, CheckCircle,
  AlertCircle, Receipt, Edit2, MessageCircle, Award,
  Users, Clock, TrendingUp, FileText
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getSingleRecord, getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [student, setStudent] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getSingleRecord('students', id);
        if (data) {
          setStudent(data);
          // Fetch fee vouchers for this student
          const allVouchers = await getRecords('vouchers', userData?.schoolId || 'default-school');
          const studentVouchers = allVouchers.filter(v =>
            v.studentId === id ||
            v.childrenIds?.includes(id) ||
            v.childrenDetails?.some(c =>
              (data.rollNumber && String(data.rollNumber).trim() === String(c.admNo || '').trim()) ||
              (data.rollNo && String(data.rollNo).trim() === String(c.admNo || '').trim())
            )
          ).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setVouchers(studentVouchers);
        } else {
          navigate('/school-admin/students');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id, userData]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-dark-muted text-sm font-bold mt-3">Loading Student Profile...</p>
        </div>
      </div>
    );
  }
  if (!student) return null;

  const gr = student.admissionNumber || student.rollNo || student.grNo || student.grNumber || student.rollNumber || 'N/A';
  const totalFees = vouchers.reduce((s, v) => s + (Number(v.totalAmount) || 0), 0);
  const totalPaid = vouchers.reduce((s, v) => s + (Number(v.paidAmount) || 0), 0);
  const totalDiscount = vouchers.reduce((s, v) => s + (Number(v.discountAmount) || 0), 0);
  const balance = totalFees - totalPaid - totalDiscount;
  const paidVouchers = vouchers.filter(v => v.status === 'Paid').length;
  const unpaidVouchers = vouchers.filter(v => v.status !== 'Paid').length;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'fees', label: `Fee History (${vouchers.length})`, icon: Receipt },
    { key: 'contact', label: 'Contact & Family', icon: Users },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ── Header Banner ── */}
      <div className="relative rounded-3xl overflow-hidden bg-dark-card border border-dark-border shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/70 via-indigo-50/60 to-purple-100/60 dark:from-blue-900/30 dark:via-indigo-900/20 dark:to-purple-900/30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center md:items-end gap-6">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-2xl border-4 border-blue-500/30 bg-dark-hover flex items-center justify-center overflow-hidden shrink-0 shadow-2xl">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <GraduationCap size={52} className="text-blue-400 opacity-60" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-black text-white">{student.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                student.status === 'Active' || !student.status
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              }`}>{student.status || 'Active'}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-dark-muted font-bold">
              <span className="flex items-center gap-1"><Hash size={14} className="text-blue-400" /> GR: {gr}</span>
              <span className="flex items-center gap-1"><BookOpen size={14} className="text-indigo-400" /> Class {student.class} {student.section || ''}</span>
              <span className="flex items-center gap-1"><Calendar size={14} className="text-purple-400" /> Session: {student.session || 'N/A'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-dark-hover border border-dark-border text-white text-sm font-bold hover:bg-white/5 transition-all">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={() => navigate(`/school-admin/students/edit/${student.id}`)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-indigo-700 transition-all">
              <Edit2 size={16} /> Edit Profile
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="relative z-10 border-t border-dark-border grid grid-cols-2 md:grid-cols-4 divide-x divide-dark-border">
          {[
            { label: 'Total Fee', val: `Rs. ${totalFees.toLocaleString()}`, color: 'white' },
            { label: 'Paid', val: `Rs. ${totalPaid.toLocaleString()}`, color: 'emerald' },
            { label: 'Balance', val: `Rs. ${Math.max(0, balance).toLocaleString()}`, color: balance > 0 ? 'rose' : 'emerald' },
            { label: 'Vouchers', val: `${paidVouchers} Paid / ${unpaidVouchers} Due`, color: 'blue' },
          ].map((s, i) => (
            <div key={i} className="p-4 text-center">
              <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">{s.label}</p>
              <p className={`text-lg font-black mt-0.5 text-${s.color === 'white' ? 'white' : s.color + '-400'}`}>{s.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex overflow-x-auto gap-1 p-1 bg-dark-card border border-dark-border rounded-2xl">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-dark-muted hover:text-white hover:bg-white/5'
              }`}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
              <User size={16} className="text-blue-400" /> Personal Information
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Full Name', val: student.name, icon: User },
                { label: 'Date of Birth', val: student.dob || student.dateOfBirth, icon: Calendar },
                { label: 'Gender', val: student.gender, icon: User },
                { label: 'Blood Group', val: student.bloodGroup, icon: Award },
                { label: 'Address', val: student.address, icon: MapPin },
                { label: 'Nationality', val: student.nationality, icon: MapPin },
              ].map((item, i) => item.val ? (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <item.icon size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">{item.label}</p>
                    <p className="font-bold text-white text-sm mt-0.5">{item.val}</p>
                  </div>
                </div>
              ) : null)}
            </div>
          </GlassCard>

          {/* Academic Info */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
              <GraduationCap size={16} className="text-indigo-400" /> Academic Details
            </h3>
            <div className="space-y-4">
              {[
                { label: 'GR / Roll Number', val: gr, icon: Hash },
                { label: 'Class', val: `${student.class || '-'} ${student.section || ''}`, icon: BookOpen },
                { label: 'Academic Session', val: student.session, icon: Calendar },
                { label: 'Admission Date', val: student.admissionDate, icon: Calendar },
                { label: 'Previous School', val: student.previousSchool, icon: BookOpen },
                { label: 'Monthly Fee', val: student.monthlyFee ? `Rs. ${Number(student.monthlyFee).toLocaleString()}` : null, icon: CreditCard },
              ].map((item, i) => item.val ? (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <item.icon size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">{item.label}</p>
                    <p className="font-bold text-white text-sm mt-0.5">{item.val}</p>
                  </div>
                </div>
              ) : null)}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Fee History Tab ── */}
      {activeTab === 'fees' && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 border-b border-dark-border flex items-center justify-between">
            <h3 className="font-black text-white flex items-center gap-2"><Receipt size={18} className="text-blue-400" /> Fee History</h3>
            <div className="flex gap-3 text-xs font-black">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">{paidVouchers} Paid</span>
              <span className="px-3 py-1 bg-rose-500/20 text-rose-400 rounded border border-rose-500/30">{unpaidVouchers} Pending</span>
            </div>
          </div>
          {vouchers.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt size={40} className="text-dark-muted opacity-20 mx-auto mb-3" />
              <p className="text-dark-muted font-bold">No fee records found</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {vouchers.map((v, i) => {
                const total = Number(v.totalAmount) || 0;
                const paid = Number(v.paidAmount) || 0;
                const disc = Number(v.discountAmount) || 0;
                const remaining = total - paid - disc;
                return (
                  <div key={i} className="p-5 flex items-center justify-between hover:bg-white/3 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        v.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {v.status === 'Paid' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{v.month || 'Monthly Fee'}</p>
                        <p className="text-[10px] font-bold text-dark-muted">
                          #{v.voucherNo || v.id?.slice(0,6)} 
                          {v.paidAt ? ` • Paid: ${new Date(v.paidAt?.toDate?.() || v.paidAt).toLocaleDateString('en-GB')}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-white text-sm">Rs. {total.toLocaleString()}</p>
                      {paid > 0 && <p className="text-[10px] font-bold text-emerald-400">Paid: Rs. {paid.toLocaleString()}</p>}
                      {remaining > 0 && <p className="text-[10px] font-bold text-rose-400">Due: Rs. {remaining.toLocaleString()}</p>}
                      {disc > 0 && <p className="text-[10px] font-bold text-amber-400">Disc: Rs. {disc.toLocaleString()}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      )}

      {/* ── Contact & Family Tab ── */}
      {activeTab === 'contact' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
              <Users size={16} className="text-purple-400" /> Parent / Guardian
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Father Name', val: student.fatherName, icon: User },
                { label: 'Mother Name', val: student.motherName, icon: User },
                { label: 'Father CNIC', val: student.fatherCnic, icon: CreditCard },
                { label: 'Guardian', val: student.guardianName, icon: User },
                { label: 'Guardian CNIC', val: student.guardianCnic, icon: CreditCard },
                { label: 'Relation', val: student.guardianRelation, icon: Users },
              ].map((item, i) => item.val ? (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <item.icon size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">{item.label}</p>
                    <p className="font-bold text-white text-sm mt-0.5">{item.val}</p>
                  </div>
                </div>
              ) : null)}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
              <Phone size={16} className="text-green-400" /> Contact Information
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Parent Phone', val: student.parentPhone || student.phone, icon: Phone },
                { label: 'Father Phone', val: student.fatherPhone, icon: Phone },
                { label: 'Mother Phone', val: student.motherPhone, icon: Phone },
                { label: 'WhatsApp', val: student.whatsapp, icon: MessageCircle },
                { label: 'Email', val: student.email || student.parentEmail, icon: Mail },
                { label: 'Emergency Contact', val: student.emergencyContact, icon: Phone },
              ].map((item, i) => item.val ? (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
                    <item.icon size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">{item.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="font-bold text-white text-sm">{item.val}</p>
                      {(item.label.includes('Phone') || item.label.includes('WhatsApp')) && (
                        <a href={`tel:${item.val}`}
                          className="text-[10px] font-black text-green-400 hover:underline">Call</a>
                      )}
                    </div>
                  </div>
                </div>
              ) : null)}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
