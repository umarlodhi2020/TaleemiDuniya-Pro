import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, Mail, CreditCard, Users, Receipt,
  CheckCircle, AlertCircle, GraduationCap, BookOpen, Hash,
  MessageCircle, TrendingUp, Calendar, Wallet
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

// Helper to build consistent family key
const getFamilyKey = (student) => {
  if (student.familyId) return student.familyId;
  const cnicKey = student.fatherCnic ? String(student.fatherCnic).replace(/[^0-9]/g, '') : null;
  const phoneKey = String(student.parentPhone || student.fatherPhone || student.phone || '');
  const cleanPhone = phoneKey.replace(/[^0-9]/g, '');
  const nameKey = student.fatherName ? String(student.fatherName).trim().toLowerCase() : 'unknown';
  if (cnicKey && cnicKey.length > 8) return `cnic_${cnicKey}`;
  if (cleanPhone.length >= 10 && nameKey !== 'unknown') return `phone_${cleanPhone}_fname_${nameKey.replace(/\s+/g, '_')}`;
  if (cleanPhone.length >= 10) return `phone_${cleanPhone}`;
  return `name_${nameKey}_${cleanPhone || 'nophone'}`;
};

const ParentProfile = () => {
  const { id: familyId } = useParams(); // familyId is the encoded family key from URL
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [children, setChildren] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [parentInfo, setParentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const schoolId = userData?.schoolId || 'default-school';
        const allStudents = await getRecords('students', schoolId);
        const allVouchers = await getRecords('vouchers', schoolId);

        // Find family by matching familyId param (URL-decoded)
        const decodedId = decodeURIComponent(familyId);
        const familyStudents = allStudents.filter(s => getFamilyKey(s) === decodedId);

        if (familyStudents.length === 0) {
          navigate('/school-admin/parents');
          return;
        }

        setChildren(familyStudents);

        // Build parent info from first student
        const first = familyStudents[0];
        setParentInfo({
          fatherName: first.fatherName || 'Unknown',
          motherName: first.motherName,
          fatherCnic: first.fatherCnic || first.parentCnic,
          phone: first.parentPhone || first.fatherPhone || first.phone,
          email: first.parentEmail || first.email,
          address: first.address,
          whatsapp: first.whatsapp,
        });

        // Find vouchers for any of the children
        const familyVouchers = allVouchers.filter(v => {
          return familyStudents.some(s =>
            v.studentId === s.id ||
            v.childrenIds?.includes(s.id) ||
            v.childrenDetails?.some(c =>
              (s.rollNumber && String(s.rollNumber).trim() === String(c.admNo || '').trim()) ||
              (s.rollNo && String(s.rollNo).trim() === String(c.admNo || '').trim())
            )
          );
        }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        setVouchers(familyVouchers);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (familyId) fetchData();
  }, [familyId, userData]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-dark-muted text-sm font-bold mt-3">Loading Parent Profile...</p>
        </div>
      </div>
    );
  }
  if (!parentInfo) return null;

  const totalFees = vouchers.reduce((s, v) => s + (Number(v.totalAmount) || 0), 0);
  const totalPaid = vouchers.reduce((s, v) => s + (Number(v.paidAmount) || 0), 0);
  const totalDiscount = vouchers.reduce((s, v) => s + (Number(v.discountAmount) || 0), 0);
  const balance = totalFees - totalPaid - totalDiscount;
  const paidCount = vouchers.filter(v => v.status === 'Paid').length;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'children', label: `Children (${children.length})`, icon: GraduationCap },
    { key: 'fees', label: `Fee History (${vouchers.length})`, icon: Receipt },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ── Header Banner ── */}
      <div className="relative rounded-3xl overflow-hidden bg-dark-card border border-dark-border shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-blue-900/30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center md:items-end gap-6">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-2xl border-4 border-purple-500/30 bg-dark-hover flex items-center justify-center overflow-hidden shrink-0 shadow-2xl">
            <Users size={52} className="text-purple-400 opacity-60" />
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black text-white mb-1">{parentInfo.fatherName}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-dark-muted font-bold">
              <span className="flex items-center gap-1"><Users size={14} className="text-purple-400" /> {children.length} {children.length === 1 ? 'Child' : 'Children'}</span>
              {parentInfo.phone && <span className="flex items-center gap-1"><Phone size={14} className="text-green-400" /> {parentInfo.phone}</span>}
              {parentInfo.fatherCnic && <span className="flex items-center gap-1"><CreditCard size={14} className="text-blue-400" /> {parentInfo.fatherCnic}</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-dark-hover border border-dark-border text-white text-sm font-bold hover:bg-white/5 transition-all">
              <ArrowLeft size={16} /> Back
            </button>
            {parentInfo.phone && (
              <a href={`https://wa.me/${String(parentInfo.phone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold shadow-lg shadow-green-500/20 hover:from-green-600 transition-all">
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="relative z-10 border-t border-dark-border grid grid-cols-2 md:grid-cols-4 divide-x divide-dark-border">
          {[
            { label: 'Total Fees', val: `Rs. ${totalFees.toLocaleString()}`, color: 'white' },
            { label: 'Total Paid', val: `Rs. ${totalPaid.toLocaleString()}`, color: 'emerald' },
            { label: 'Balance', val: `Rs. ${Math.max(0, balance).toLocaleString()}`, color: balance > 0 ? 'rose' : 'emerald' },
            { label: 'Vouchers', val: `${paidCount} Paid / ${vouchers.length - paidCount} Due`, color: 'purple' },
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
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
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
          <GlassCard className="p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
              <User size={16} className="text-purple-400" /> Parent Information
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Father Name', val: parentInfo.fatherName, icon: User },
                { label: 'Mother Name', val: parentInfo.motherName, icon: User },
                { label: 'CNIC', val: parentInfo.fatherCnic, icon: CreditCard },
                { label: 'Address', val: parentInfo.address, icon: User },
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
              <Phone size={16} className="text-green-400" /> Contact Details
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Phone', val: parentInfo.phone, icon: Phone },
                { label: 'WhatsApp', val: parentInfo.whatsapp || parentInfo.phone, icon: MessageCircle },
                { label: 'Email', val: parentInfo.email, icon: Mail },
              ].map((item, i) => item.val ? (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
                    <item.icon size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">{item.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="font-bold text-white text-sm">{item.val}</p>
                      {item.label === 'Phone' && (
                        <a href={`tel:${item.val}`} className="text-[10px] font-black text-green-400 hover:underline">Call</a>
                      )}
                    </div>
                  </div>
                </div>
              ) : null)}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Children Tab ── */}
      {activeTab === 'children' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {children.map((child, i) => {
            const gr = child.admissionNumber || child.rollNo || child.grNo || child.grNumber || child.rollNumber || 'N/A';
            return (
              <GlassCard key={child.id} className="p-5 hover:border-purple-500/30 transition-all cursor-pointer"
                onClick={() => navigate(`/school-admin/students/${child.id}`)}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-xl border border-blue-500/20">
                    {child.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-white">{child.name}</h3>
                    <p className="text-[10px] font-bold text-dark-muted">Class {child.class} {child.section || ''} • GR: {gr}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2 bg-dark-bg rounded-lg">
                    <p className="text-dark-muted font-bold">Session</p>
                    <p className="font-black text-white mt-0.5">{child.session || 'N/A'}</p>
                  </div>
                  <div className="p-2 bg-dark-bg rounded-lg">
                    <p className="text-dark-muted font-bold">Monthly Fee</p>
                    <p className="font-black text-blue-400 mt-0.5">Rs. {Number(child.monthlyFee || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                    child.status === 'Active' || !child.status
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}>{child.status || 'Active'}</span>
                  <span className="text-[10px] font-black text-blue-400 hover:underline">View Profile →</span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── Fee History Tab ── */}
      {activeTab === 'fees' && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 border-b border-dark-border flex items-center justify-between">
            <h3 className="font-black text-white flex items-center gap-2"><Receipt size={18} className="text-purple-400" /> Family Fee History</h3>
            <div className="flex gap-3">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 text-xs font-black">
                {paidCount} Paid
              </span>
              <span className="px-3 py-1 bg-rose-500/20 text-rose-400 rounded border border-rose-500/30 text-xs font-black">
                {vouchers.length - paidCount} Pending
              </span>
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
                const rem = total - paid - disc;
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
                          #{v.voucherNo || v.id?.slice(0, 6)}
                          {v.childrenDetails?.length > 0 && ` • ${v.childrenDetails.map(c => c.name).join(', ')}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-white text-sm">Rs. {total.toLocaleString()}</p>
                      {paid > 0 && <p className="text-[10px] font-bold text-emerald-400">Paid: Rs. {paid.toLocaleString()}</p>}
                      {rem > 0 && <p className="text-[10px] font-bold text-rose-400">Due: Rs. {rem.toLocaleString()}</p>}
                      {disc > 0 && <p className="text-[10px] font-bold text-amber-400">Disc: Rs. {disc.toLocaleString()}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
};

export default ParentProfile;
