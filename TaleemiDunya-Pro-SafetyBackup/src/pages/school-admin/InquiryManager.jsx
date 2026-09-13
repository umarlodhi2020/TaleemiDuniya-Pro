import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Phone, 
  User, 
  Clock, 
  CheckCircle,
  MoreVertical,
  Filter,
  Save,
  Trash2,
  UserCheck,
  UserPlus,
  Calendar,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord, updateRecord, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const InquiryManager = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [sendingWaId, setSendingWaId] = useState(null);

  // New Inquiry Form State (Right at the top just like reference panel)
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    phone: '',
    comments: '',
    expectedDate: '',
    classInterest: ''
  });

  const fetchInquiries = async () => {
    setLoading(true);
    const data = await getRecords('inquiries', userData?.schoolId || 'default-school');
    // Sort latest first
    const sorted = data.sort((a, b) => {
      const tA = a.createdAt?.toMillis?.() || 0;
      const tB = b.createdAt?.toMillis?.() || 0;
      return tB - tA;
    });
    setInquiries(sorted);
    setLoading(false);
  };

  useEffect(() => {
    fetchInquiries();
  }, [userData]);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveInquiry = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.classInterest) {
      alert('Please fill in Student Name, WhatsApp Number, and Class.');
      return;
    }

    setSaving(true);
    try {
      const schoolId = userData?.schoolId || 'default-school';
      const newEntry = {
        name: formData.name,
        fatherName: formData.fatherName,
        phone: formData.phone,
        classInterest: formData.classInterest,
        expectedDate: formData.expectedDate || new Date().toISOString().split('T')[0],
        comments: formData.comments || 'Lead added from quick inquiry form',
        status: 'Pending',
        source: 'Walk-in / Direct'
      };

      const res = await addRecord('inquiries', newEntry, schoolId);
      if (res.success) {
        alert('Inquiry Student added successfully!');
        setFormData({
          name: '',
          fatherName: '',
          phone: '',
          comments: '',
          expectedDate: '',
          classInterest: ''
        });
        fetchInquiries();
      } else {
        alert('Error saving inquiry: ' + res.error.message);
      }
    } catch (err) {
      console.error('Save inquiry error:', err);
      alert('Error saving inquiry student.');
    } finally {
      setSaving(false);
    }
  };

  // 1-Click Convert Inquiry to Enrolled Student (Admission Button)
  const handleAdmissionConvert = async (inq) => {
    const confirmAdmit = window.confirm(`Convert "${inq.name}" to an official enrolled student right now?\n\nThis will add the student to your main Students list in Class ${inq.classInterest || 'N/A'}.`);
    if (!confirmAdmit) return;

    try {
      const schoolId = userData?.schoolId || 'default-school';
      const studentData = {
        name: inq.name || 'New Student',
        fatherName: inq.fatherName || 'Not Specified',
        phone: inq.phone || '',
        class: inq.classInterest || 'Nursery',
        section: 'A',
        rollNumber: `ROLL-${Date.now().toString().slice(-4)}`,
        status: 'Active',
        admissionDate: new Date().toISOString().split('T')[0],
        comments: `Converted from Inquiry #${inq.id?.slice(0, 5)} - ${inq.comments || ''}`
      };

      // Add to students table
      const res = await addRecord('students', studentData, schoolId);
      if (res.success) {
        // Update inquiry status
        await updateRecord('inquiries', inq.id, { status: 'Converted' });
        alert(`🎉 Student "${inq.name}" has been ADMITTED successfully into Class ${inq.classInterest || 'N/A'}!`);
        fetchInquiries();
      } else {
        alert('Failed to admit student: ' + res.error?.message);
      }
    } catch (err) {
      console.error('Convert admission error:', err);
      alert('Error admitting student.');
    }
  };

  const handleSendInquiryWhatsApp = async (inq) => {
    const cleanPhone = (inq.phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert('Please provide a valid phone number for this inquiry.');
      return;
    }
    const schoolName = userData?.schoolName || 'TaleemiDunya School';
    const messageText = `Assalam-o-Alaikum *${inq.name}*!\n\nThank you for visiting & submitting your admission inquiry for *Class ${inq.classInterest}* at *${schoolName}*.\n\nWe are delighted to welcome you! Our admissions desk is currently reviewing your application. If you have any questions or would like to confirm your enrollment seat immediately, please reply to this WhatsApp message or call us.\n\nBest Regards,\n*Admissions Office*\n*${schoolName}*`;

    setSendingWaId(inq.id || 'temp');
    try {
      let res = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: userData?.schoolId || 'default_school',
          phone: cleanPhone,
          message: messageText
        })
      });
      let data = await res.json();

      // If school's personal session is not paired or offline, automatically fallback to Universal TaleemiDunya Central AI Bot ('default_school')
      if (!data.success && (userData?.schoolId && userData.schoolId !== 'default_school')) {
        res = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: 'default_school',
            phone: cleanPhone,
            message: messageText
          })
        });
        data = await res.json();
      }

      if (data.success && data.results?.[0]?.status === 'sent') {
        alert(`✅ Official Inquiry Message sent AUTOMATICALLY to ${inq.name} (${cleanPhone}) via WhatsApp Cloud AI Bot Server!`);
      } else {
        const fallback = window.confirm(`ℹ️ WhatsApp Cloud Server (` + (data.error || data.results?.[0]?.error || 'Session offline / Not scanned yet') + `).\n\nWould you like to open WhatsApp Web/App right now to send this exact pre-formatted message?`);
        if (fallback) {
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`, '_blank');
        }
      }
    } catch (err) {
      console.warn('Server error:', err);
      const fallback = window.confirm(`🌐 WhatsApp Cloud Server offline/unreachable. Would you like to send this message directly via WhatsApp Web/App right now?`);
      if (fallback) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`, '_blank');
      }
    } finally {
      setSendingWaId(null);
    }
  };

  const handleDeleteInquiry = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete inquiry for "${name}"?`)) return;
    try {
      const res = await deleteRecord('inquiries', id);
      if (res.success) {
        setInquiries(inquiries.filter(i => i.id !== id));
      } else {
        alert('Error deleting inquiry.');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Filtering
  const filteredInquiries = inquiries.filter(inq => {
    const q = (searchTerm || '').toLowerCase().trim();
    if (!q) return true;
    return (
      String(inq.name || '').toLowerCase().includes(q) ||
      String(inq.fatherName || '').toLowerCase().includes(q) ||
      String(inq.phone || '').includes(q) ||
      String(inq.classInterest || '').toLowerCase().includes(q) ||
      String(inq.comments || '').toLowerCase().includes(q)
    );
  }).slice(0, entriesLimit);

  const classesList = [
    'Nursery', 'Prep', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Title & Breadcrumb matching reference panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dark-border pb-4">
        <div>
          <h1 className="text-3xl font-bold text-dark-text tracking-tight">Inquiry Student</h1>
          <p className="text-xs text-primary-400 font-mono font-bold uppercase tracking-wider mt-1">
            Home / Manage Students / Inquiry Student
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/school-admin/students/add')}
            className="premium-button-secondary text-xs"
          >
            <Plus size={16} /> Add Direct Student
          </button>
        </div>
      </div>

      {/* TOP INQUIRY STUDENT ENTRY FORM CARD (Matches Screenshot exactly) */}
      <GlassCard className="p-6 border-primary-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-dark-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Inquiry Student</h2>
              <p className="text-xs text-dark-muted">Enter student inquiry & expected admission details below.</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">
            Live Admission Desk
          </span>
        </div>

        <form onSubmit={handleSaveInquiry} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Student Name */}
          <div>
            <label className="block text-xs font-bold text-dark-text mb-1.5 uppercase tracking-wider">
              Student Name <span className="text-red-400">*</span>
            </label>
            <input 
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="Enter student name..."
              required
              className="w-full premium-input font-medium text-sm"
            />
          </div>

          {/* Father Name */}
          <div>
            <label className="block text-xs font-bold text-dark-text mb-1.5 uppercase tracking-wider">
              Father Name <span className="text-red-400">*</span>
            </label>
            <input 
              type="text"
              name="fatherName"
              value={formData.fatherName}
              onChange={handleFormChange}
              placeholder="Enter father name..."
              required
              className="w-full premium-input font-medium text-sm"
            />
          </div>

          {/* WhatsApp Number */}
          <div>
            <label className="block text-xs font-bold text-dark-text mb-1.5 uppercase tracking-wider">
              WhatsApp Number <span className="text-red-400">*</span>
            </label>
            <input 
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              placeholder="e.g. 03001234567"
              required
              className="w-full premium-input font-mono text-sm"
            />
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-bold text-dark-text mb-1.5 uppercase tracking-wider">
              Comments <span className="text-red-400">*</span>
            </label>
            <input 
              type="text"
              name="comments"
              value={formData.comments}
              onChange={handleFormChange}
              placeholder="Enter remarks or inquiry notes..."
              required
              className="w-full premium-input font-medium text-sm"
            />
          </div>

          {/* Expected Date */}
          <div>
            <label className="block text-xs font-bold text-dark-text mb-1.5 uppercase tracking-wider">
              Expected Date <span className="text-red-400">*</span>
            </label>
            <input 
              type="date"
              name="expectedDate"
              value={formData.expectedDate}
              onChange={handleFormChange}
              required
              className="w-full premium-input text-sm font-mono text-white"
            />
          </div>

          {/* Select Class */}
          <div>
            <label className="block text-xs font-bold text-dark-text mb-1.5 uppercase tracking-wider">
              Select Class <span className="text-red-400">*</span>
            </label>
            <select 
              name="classInterest"
              value={formData.classInterest}
              onChange={handleFormChange}
              required
              className="w-full premium-input text-sm text-white font-semibold"
            >
              <option value="" className="bg-dark-bg text-dark-muted">-- Select Class --</option>
              {classesList.map((cls) => (
                <option key={cls} value={cls} className="bg-dark-bg text-white">
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Save Button */}
          <div className="md:col-span-2 lg:col-span-3 pt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving Inquiry...' : 'Save'}
            </button>
            <span className="text-xs text-dark-muted font-medium">
              Clicking save immediately registers the lead below.
            </span>
          </div>
        </form>
      </GlassCard>

      {/* ALL STUDENTS (INQUIRY LIST TABLE) - Exactly matching reference table */}
      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white">All Students</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 font-mono text-xs font-bold border border-primary-500/20">
              {inquiries.length} Total Inquiries
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Show entries dropdown */}
            <div className="flex items-center gap-2 text-xs text-dark-muted font-semibold">
              <span>Show</span>
              <select
                value={entriesLimit}
                onChange={(e) => setEntriesLimit(Number(e.target.value))}
                className="bg-dark-hover border border-dark-border text-white rounded px-2 py-1 outline-none text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>

            {/* Search Box */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
              <input
                type="text"
                placeholder="Search inquiries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full premium-input pl-9 text-xs py-1.5"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-border text-dark-muted text-[11px] font-black uppercase tracking-wider bg-dark-hover/40">
                <th className="py-3.5 px-4 w-12">#</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Father</th>
                <th className="py-3.5 px-4 font-mono">Phone</th>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4">Expected Date</th>
                <th className="py-3.5 px-4">Comments</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-dark-muted font-medium animate-pulse">
                    Loading inquiries...
                  </td>
                </tr>
              ) : filteredInquiries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-dark-muted">
                    <p className="font-bold text-base text-white">No inquiry records found</p>
                    <p className="text-xs mt-1">Fill the form above and click Save to add your first student inquiry.</p>
                  </td>
                </tr>
              ) : (
                filteredInquiries.map((inq, idx) => (
                  <tr key={inq.id || idx} className="hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-4 font-mono text-xs font-bold text-dark-muted">
                      {idx + 1}
                    </td>
                    <td className="py-4 px-4 font-bold text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 font-black text-xs">
                          {inq.name?.charAt(0) || 'S'}
                        </div>
                        <span>{inq.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-dark-text font-semibold">
                      {inq.fatherName || 'Not Specified'}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-primary-400 font-bold">
                      {inq.phone}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-white/5 border border-dark-border text-xs font-black uppercase text-white">
                        {inq.classInterest || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-dark-muted">
                      {inq.expectedDate || inq.createdAt?.toDate()?.toLocaleDateString() || 'N/A'}
                    </td>
                    <td className="py-4 px-4 max-w-xs truncate text-xs text-dark-muted" title={inq.comments || ''}>
                      {inq.comments || '—'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* 1-Click Admission Button (Exact Green Button) */}
                        {inq.status === 'Converted' ? (
                          <span className="px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30 text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle size={14} /> Admitted
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAdmissionConvert(inq)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-green-500/20 transition-all hover:scale-105 active:scale-95"
                            title="Directly admit & enroll this student into Class"
                          >
                            <UserCheck size={14} />
                            <span>Admission</span>
                          </button>
                        )}

                        {/* WhatsApp Button (Uses Cloud AI Bot Server first, with graceful fallback) */}
                        <button
                          onClick={() => handleSendInquiryWhatsApp(inq)}
                          disabled={sendingWaId === inq.id}
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center"
                          title="Send Automatic WhatsApp via Cloud AI Bot Server"
                        >
                          {sendingWaId === inq.id ? (
                            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <MessageSquare size={16} />
                          )}
                        </button>

                        {/* Delete / Trash Button */}
                        <button
                          onClick={() => handleDeleteInquiry(inq.id, inq.name)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all"
                          title="Delete inquiry"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default InquiryManager;
