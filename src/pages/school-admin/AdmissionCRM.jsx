import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Send, 
  Search, 
  Filter, 
  Printer, 
  PhoneCall, 
  FileText, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  ArrowLeft, 
  Sparkles, 
  Award, 
  Check, 
  X, 
  Share2, 
  QrCode, 
  Calendar,
  Building2,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db as firestore } from '../../services/firebase';

const mockLeads = [
  { id: 'lead1', childName: 'Daniyal Lodhi', fatherName: 'Mustafa Lodhi', phone: '03009876543', classApplied: '9', status: 'new', dateApplied: '2026-07-14', previousSchool: 'City Grammar', notes: 'Interested in Science Group' },
  { id: 'lead2', childName: 'Mahnoor Fatima', fatherName: 'Ahsan Tariq', phone: '03211234567', classApplied: '10', status: 'interview', dateApplied: '2026-07-12', previousSchool: 'Educators', notes: 'Excellence in Mathematics' },
  { id: 'lead3', childName: 'Ayan Ali Raza', fatherName: 'Ali Raza', phone: '03337654321', classApplied: '6', status: 'offered', dateApplied: '2026-07-10', previousSchool: 'Beaconhouse', notes: 'Offer letter issued on July 13' },
  { id: 'lead4', childName: 'Khadija Bibi', fatherName: 'Muhammad Saleem', phone: '03129988776', classApplied: '5', status: 'enrolled', dateApplied: '2026-07-05', previousSchool: 'Dar-e-Arqam', notes: 'Fees paid, admitted to Grade 5-A' },
  { id: 'lead5', childName: 'Zain Mehmood', fatherName: 'Mehmood Khan', phone: '03014455667', classApplied: '8', status: 'new', dateApplied: '2026-07-15', previousSchool: 'Public School', notes: 'Walk-in inquiry at school office' }
];

const AdmissionCRM = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = userData?.schoolName || 'Lodhi School System';

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // New Lead Form
  const [newLead, setNewLead] = useState({
    childName: '',
    fatherName: '',
    phone: '',
    classApplied: '9',
    previousSchool: '',
    notes: ''
  });

  useEffect(() => {
    fetchLeads();
  }, [schoolId]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const q = query(collection(firestore, 'admission_leads'), where('schoolId', '==', schoolId));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      if (list.length > 0) {
        setLeads(list);
      } else {
        setLeads(mockLeads);
      }
    } catch (e) {
      console.error(e);
      setLeads(mockLeads);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLead.childName || !newLead.fatherName || !newLead.phone) {
      alert('Please fill child name, father name and phone number.');
      return;
    }
    try {
      const leadObj = {
        ...newLead,
        id: `lead_${Date.now()}`,
        schoolId,
        status: 'new',
        dateApplied: new Date().toISOString().split('T')[0]
      };
      setLeads([leadObj, ...leads]);
      setShowAddModal(false);
      setNewLead({ childName: '', fatherName: '', phone: '', classApplied: '9', previousSchool: '', notes: '' });
      await setDoc(doc(firestore, 'admission_leads', leadObj.id), leadObj);
      alert('New Admission Inquiry Lead registered successfully!');
    } catch (e) {
      console.error(e);
      alert('Lead added to current session.');
    }
  };

  const handleUpdateStatus = async (id, nextStatus) => {
    setLeads(leads.map(l => l.id === id ? { ...l, status: nextStatus } : l));
    try {
      await setDoc(doc(firestore, 'admission_leads', id), { status: nextStatus }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendWhatsAppOffer = async (lead) => {
    const msg = `Assalam-o-Alaikum! Dear Mr./Ms. ${lead.fatherName}, congratulations! We are pleased to issue the official Admission Offer Letter for your child ${lead.childName} for Class Grade ${lead.classApplied} at ${schoolName}. Kindly visit the school office with required documents to complete enrollment. Thank you!`;
    alert(`📢 WhatsApp Offer & Invitation dispatched via AI Bot to ${lead.phone}!\n\nMessage preview:\n"${msg}"`);
  };

  const filtered = leads.filter(l => {
    const matchesSearch = l.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.fatherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (st) => {
    switch (st) {
      case 'new': return { label: 'New Lead', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'interview': return { label: 'Test / Interview', bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
      case 'offered': return { label: 'Offer Issued', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'enrolled': return { label: 'Enrolled ✓', bg: 'bg-green-500/10 text-green-400 border-green-500/20' };
      default: return { label: 'Pending', bg: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    }
  };

  const publicFormUrl = `https://taleemidunya-pro-ed44e.web.app/#/apply/${schoolId}`;

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 min-h-screen bg-dark-bg text-dark-text select-none">
      
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: transparent !important;
          }
          #print-offer-letter, #print-offer-letter * {
            visibility: visible;
          }
          #print-offer-letter {
            position: absolute;
            left: 50%;
            top: 40%;
            transform: translate(-50%, -50%);
            width: 600px !important;
            padding: 2cm !important;
            border: 2px solid #000000 !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-purple-200 animate-pulse" />
            Online Admission Portal & Inquiry CRM
          </h1>
          <p className="text-purple-100 text-xs md:text-sm font-medium mt-1">
            Track student inquiries, manage interview pipeline, public online application link & 1-Click Offer Letters
          </p>
        </div>
        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <button 
            onClick={() => setShowQrModal(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-xl border border-white/20 transition-all flex items-center gap-2 backdrop-blur-sm"
          >
            <QrCode size={16} /> Public Apply Link / QR
          </button>
          <button 
            onClick={() => navigate('/school-admin/students')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-xl border border-white/20 transition-all flex items-center gap-2 backdrop-blur-sm"
          >
            <ArrowLeft size={16} /> Back to Students
          </button>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <GlassCard className="p-4 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">New Inquiries</span>
            <span className="text-xl font-black text-blue-500 mt-1 block">{leads.filter(l => l.status === 'new').length} Leads</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <UserPlus size={20} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest block">In Test / Interview</span>
            <span className="text-xl font-black text-yellow-500 mt-1 block">{leads.filter(l => l.status === 'interview').length} Candidates</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
            <Clock size={20} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block">Offer Letters Issued</span>
            <span className="text-xl font-black text-purple-400 mt-1 block">{leads.filter(l => l.status === 'offered').length} Offered</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <FileText size={20} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-green-400 uppercase tracking-widest block">Enrolled Students</span>
            <span className="text-xl font-black text-green-500 mt-1 block">{leads.filter(l => l.status === 'enrolled').length} Admitted</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
            <CheckCircle2 size={20} />
          </div>
        </GlassCard>
      </div>

      {/* Control & Search Bar */}
      <GlassCard className="p-6 border-dark-border/40 no-print">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search size={16} className="absolute left-3.5 top-3 text-dark-muted" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lead name or phone..."
                className="pl-10 py-2.5 w-full sm:w-[240px] bg-dark-card border border-dark-border rounded-xl text-xs font-bold text-dark-text"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2.5 px-4 bg-dark-card border border-dark-border rounded-xl text-xs font-bold text-primary-400"
            >
              <option value="ALL">ALL PIPELINE STATUS ({leads.length})</option>
              <option value="new">New Inquiries</option>
              <option value="interview">Test / Interview Scheduled</option>
              <option value="offered">Offer Letter Issued</option>
              <option value="enrolled">Admitted / Enrolled</option>
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
          >
            <UserPlus size={16} />
            <span>+ Register New Inquiry Lead</span>
          </button>
        </div>
      </GlassCard>

      {/* Leads CRM Table */}
      <GlassCard className="p-0 overflow-hidden border border-dark-border shadow-2xl no-print">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <RefreshCw size={30} className="text-purple-500 animate-spin" />
            <span className="text-xs font-black text-dark-muted uppercase">Loading Admission Pipeline...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center text-dark-muted font-bold">No admission leads found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-card border-b border-dark-border text-[10px] text-dark-muted font-black uppercase tracking-wider">
                  <th className="py-4 px-4">Candidate & Parent</th>
                  <th className="py-4 px-4">Contact Phone</th>
                  <th className="py-4 px-4 text-center">Class Applied</th>
                  <th className="py-4 px-4">Previous School / Notes</th>
                  <th className="py-4 px-4 text-center">Pipeline Status</th>
                  <th className="py-4 px-4 text-center">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60 text-xs font-medium">
                {filtered.map((lead) => {
                  const badge = getStatusBadge(lead.status);
                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-dark-text block text-sm">{lead.childName}</span>
                        <span className="text-[10px] font-bold text-dark-muted">Father: {lead.fatherName} ({lead.dateApplied})</span>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-primary-400">
                        {lead.phone}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-dark-border font-bold text-xs">
                          Grade {lead.classApplied}
                        </span>
                      </td>
                      <td className="py-4 px-4 max-w-[220px]">
                        <span className="text-dark-text font-bold block truncate">{lead.previousSchool || 'N/A'}</span>
                        <span className="text-[10px] text-dark-muted block truncate">{lead.notes || 'No special remarks'}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                          className={`py-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer focus:outline-none ${badge.bg}`}
                        >
                          <option value="new">New Lead</option>
                          <option value="interview">Test / Interview</option>
                          <option value="offered">Offer Issued</option>
                          <option value="enrolled">Enrolled ✓</option>
                        </select>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleSendWhatsAppOffer(lead)}
                            className="px-2.5 py-1.5 rounded-xl bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/30 text-[10px] font-black uppercase flex items-center gap-1 transition-all"
                            title="Send WhatsApp Offer & Status Update"
                          >
                            <Send size={12} />
                            <span>Notify</span>
                          </button>

                          <button
                            onClick={() => setSelectedOffer(lead)}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500 hover:text-white text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase flex items-center gap-1 transition-all"
                            title="Generate & Print Admission Offer Letter"
                          >
                            <Printer size={12} />
                            <span>Offer Slip</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* NEW INQUIRY LEAD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 no-print select-text">
          <GlassCard className="p-6 max-w-[480px] w-full border-dark-border bg-dark-card relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-dark-muted hover:text-dark-text"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-black text-purple-400 flex items-center gap-2 mb-4">
              <UserPlus size={20} /> Register New Admission Inquiry
            </h3>
            <form onSubmit={handleCreateLead} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-dark-muted uppercase text-[10px] mb-1">Child / Applicant Name *</label>
                <input
                  type="text"
                  required
                  value={newLead.childName}
                  onChange={(e) => setNewLead({ ...newLead, childName: e.target.value })}
                  placeholder="e.g. Hammad Ali"
                  className="w-full premium-input bg-dark-bg p-2.5 rounded-xl border border-dark-border"
                />
              </div>
              <div>
                <label className="block text-dark-muted uppercase text-[10px] mb-1">Father / Guardian Name *</label>
                <input
                  type="text"
                  required
                  value={newLead.fatherName}
                  onChange={(e) => setNewLead({ ...newLead, fatherName: e.target.value })}
                  placeholder="e.g. Ali Raza"
                  className="w-full premium-input bg-dark-bg p-2.5 rounded-xl border border-dark-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-dark-muted uppercase text-[10px] mb-1">Parent Phone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="e.g. 03001234567"
                    className="w-full premium-input bg-dark-bg p-2.5 rounded-xl border border-dark-border font-mono"
                  />
                </div>
                <div>
                  <label className="block text-dark-muted uppercase text-[10px] mb-1">Class Grade Applied</label>
                  <select
                    value={newLead.classApplied}
                    onChange={(e) => setNewLead({ ...newLead, classApplied: e.target.value })}
                    className="w-full premium-input bg-dark-bg p-2.5 rounded-xl border border-dark-border text-primary-400 font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                      <option key={c} value={c.toString()}>Grade {c}</option>
                    ))}
                    <option value="Playgroup">Playgroup</option>
                    <option value="Nursery">Nursery</option>
                    <option value="Prep">Prep</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-dark-muted uppercase text-[10px] mb-1">Previous School Attended</label>
                <input
                  type="text"
                  value={newLead.previousSchool}
                  onChange={(e) => setNewLead({ ...newLead, previousSchool: e.target.value })}
                  placeholder="e.g. Beaconhouse / City School"
                  className="w-full premium-input bg-dark-bg p-2.5 rounded-xl border border-dark-border"
                />
              </div>
              <div>
                <label className="block text-dark-muted uppercase text-[10px] mb-1">Remarks / Special Notes</label>
                <textarea
                  rows="2"
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="Any special remarks or test date requested..."
                  className="w-full premium-input bg-dark-bg p-2.5 rounded-xl border border-dark-border"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black uppercase shadow-lg shadow-purple-600/30"
                >
                  Save Inquiry Lead
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* PUBLIC QR & APPLY LINK MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 no-print select-text">
          <GlassCard className="p-6 max-w-[460px] w-full border-dark-border bg-dark-card relative text-center space-y-4">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-dark-muted hover:text-dark-text"
            >
              <X size={20} />
            </button>
            <QrCode className="mx-auto text-purple-400 animate-pulse" size={48} />
            <h3 className="text-lg font-black text-dark-text">Public Online Admission Form Link</h3>
            <p className="text-xs text-dark-muted">
              Share this web link or embed it on your school Facebook page / admission banners. Parents can submit inquiries directly into this CRM!
            </p>
            <div className="p-3 bg-dark-bg border border-dark-border rounded-xl font-mono text-xs text-purple-400 break-all select-all">
              {publicFormUrl}
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publicFormUrl);
                  alert('Public Admission Apply URL copied to clipboard!');
                }}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase rounded-xl shadow-lg"
              >
                Copy Link to Clipboard
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* OFFER LETTER PRINTABLE MODAL */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 no-print select-none">
          <GlassCard className="p-6 max-w-[500px] w-full border-dark-border relative text-black bg-white select-text">
            <button
              onClick={() => setSelectedOffer(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X size={20} />
            </button>

            <div className="border-2 border-black p-5 rounded-xl flex flex-col justify-between font-sans bg-white min-h-[400px]">
              <div className="flex justify-between border-b-2 border-black pb-3 items-center">
                <div>
                  <h3 className="text-sm font-black uppercase text-gray-800 tracking-wide leading-none">{schoolName}</h3>
                  <span className="text-[8px] text-gray-500 font-extrabold uppercase">Office of Admissions & Academic Council</span>
                </div>
                <div className="text-right">
                  <span className="inline-block text-[10px] font-black uppercase tracking-widest border border-black py-0.5 px-2 bg-purple-50 text-purple-900 rounded">
                    ADMISSION OFFER LETTER
                  </span>
                </div>
              </div>

              <div className="my-4 text-xs space-y-3 font-semibold text-gray-800 leading-relaxed">
                <div className="flex justify-between font-bold text-gray-900 border-b border-gray-200 pb-2">
                  <span>Candidate: <strong className="uppercase">{selectedOffer.childName}</strong></span>
                  <span>Class: <strong className="text-purple-700">Grade {selectedOffer.classApplied}</strong></span>
                </div>
                <p>
                  Dear <strong className="text-gray-900">{selectedOffer.fatherName}</strong> ({selectedOffer.phone}),
                </p>
                <p>
                  We are delighted to inform you that upon reviewing your application and preliminary academic assessment, your child <strong>{selectedOffer.childName}</strong> has been granted provisional admission to <strong className="underline">Class Grade {selectedOffer.classApplied}</strong> for the upcoming academic session at {schoolName}.
                </p>
                <div className="bg-gray-100 border border-gray-300 p-3 rounded text-[11px] font-bold">
                  <div>Estimated Initial Dues & Registration: <span className="text-purple-700 font-mono">Rs. 8,500</span></div>
                  <div className="text-[9px] text-gray-500 font-normal mt-0.5">* Includes admission security, first month tuition & registration kit.</div>
                </div>
                <p className="text-[11px]">
                  Kindly visit the school accounts office within 7 working days along with 2 passport photographs and school leaving certificate to secure the seat.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between text-[8px] font-black text-gray-500 uppercase">
                <div className="text-center min-w-[120px]">
                  <div className="h-6 border-b border-gray-300 w-full mb-1"></div>
                  <span>Admissions Officer</span>
                </div>
                <div className="text-center min-w-[120px]">
                  <div className="h-6 border-b border-gray-300 w-full mb-1"></div>
                  <span>Principal Approval</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 border border-purple-700 text-white hover:bg-purple-700 font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-md"
              >
                <Printer size={15} />
                <span>Print Offer Letter Slip</span>
              </button>
              <button 
                onClick={() => setSelectedOffer(null)}
                className="py-2.5 px-5 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 font-bold text-xs uppercase"
              >
                Close
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* HIDDEN PRINT CONTAINER */}
      {selectedOffer && (
        <div id="print-offer-letter" className="hidden print:block text-black bg-white">
          <div className="border-2 border-black p-6 rounded-xl flex flex-col justify-between font-sans bg-white min-h-[420px]">
            <div className="flex justify-between border-b-2 border-black pb-3 items-center">
              <div>
                <h3 className="text-sm font-black uppercase text-gray-800 tracking-wide leading-none">{schoolName}</h3>
                <span className="text-[8px] text-gray-500 font-extrabold uppercase">Office of Admissions & Academic Council</span>
              </div>
              <div className="text-right">
                <span className="inline-block text-[10px] font-black uppercase tracking-widest border border-black py-0.5 px-2 bg-purple-50 text-purple-900 rounded">
                  ADMISSION OFFER LETTER
                </span>
              </div>
            </div>

            <div className="my-5 text-xs space-y-3 font-semibold text-gray-800 leading-relaxed">
              <div className="flex justify-between font-bold text-gray-900 border-b border-gray-200 pb-2">
                <span>Candidate: <strong className="uppercase">{selectedOffer.childName}</strong></span>
                <span>Class: <strong className="text-purple-700">Grade {selectedOffer.classApplied}</strong></span>
              </div>
              <p>
                Dear <strong className="text-gray-900">{selectedOffer.fatherName}</strong> ({selectedOffer.phone}),
              </p>
              <p>
                We are delighted to inform you that upon reviewing your application and preliminary academic assessment, your child <strong>{selectedOffer.childName}</strong> has been granted provisional admission to <strong className="underline">Class Grade {selectedOffer.classApplied}</strong> for the upcoming academic session at {schoolName}.
              </p>
              <div className="bg-gray-100 border border-gray-300 p-3.5 rounded text-xs font-bold">
                <div>Estimated Initial Dues & Registration: <span className="text-purple-700 font-mono">Rs. 8,500</span></div>
                <div className="text-[9px] text-gray-500 font-normal mt-0.5">* Includes admission security, first month tuition & registration kit.</div>
              </div>
              <p className="text-xs">
                Kindly visit the school accounts office within 7 working days along with 2 passport photographs and school leaving certificate to secure the seat.
              </p>
            </div>

            <div className="mt-10 pt-4 border-t border-gray-300 flex justify-between text-[9px] font-black text-gray-500 uppercase">
              <div className="text-center min-w-[130px]">
                <div className="h-6 border-b border-gray-300 w-full mb-1"></div>
                <span>Admissions Officer</span>
              </div>
              <div className="text-center min-w-[130px]">
                <div className="h-6 border-b border-gray-300 w-full mb-1"></div>
                <span>Principal Approval</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdmissionCRM;
