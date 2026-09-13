import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  GraduationCap,
  Mail,
  Phone,
  Trash2,
  Edit2,
  Eye,
  UploadCloud,
  MessageSquare,
  CheckCircle
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useNavigate } from 'react-router-dom';
import { getRecords, deleteRecord, updateRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const StudentManager = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingWaId, setSendingWaId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFeeStatus, setFilterFeeStatus] = useState('');
  
  // Bulk Edit State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({
    class: '',
    section: '',
    status: '',
    monthlyFee: ''
  });
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Spreadsheet Mode State
  const [isSpreadsheetMode, setIsSpreadsheetMode] = useState(false);
  const [inlineEdits, setInlineEdits] = useState({});
  const [isSavingInline, setIsSavingInline] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [userData]);

  const fetchStudents = async () => {
    try {
      const data = await getRecords('students', userData?.schoolId || 'default-school');
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendStudentWhatsApp = async (student) => {
    const cleanPhone = (student.phone || student.parentPhone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert('Please update student profile with a valid WhatsApp phone number first.');
      return;
    }
    const schoolName = userData?.schoolName || 'TaleemiDunya School';
    const messageText = `Assalam-o-Alaikum Respected Parent of *${student.name}* (Roll: ${student.rollNumber || 'N/A'}, Grade: ${student.class || 'N/A'}).\n\nThis is an official communication from *${schoolName}*. Please check your Parent Portal for recent attendance logs, examination reports, and fee challans.\n\nThank you for your cooperation!\n*Administration - ${schoolName}*`;

    setSendingWaId(student.id || 'temp');
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
        alert(`✅ Official Notice sent AUTOMATICALLY to ${student.name}'s parent (${cleanPhone}) via WhatsApp Cloud AI Bot Server!`);
      } else {
        const fallback = window.confirm(`ℹ️ WhatsApp Cloud Server (` + (data.error || data.results?.[0]?.error || 'Session offline / Not scanned yet') + `).\n\nWould you like to open WhatsApp Web/App right now to send this message directly?`);
        if (fallback) {
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`, '_blank');
        }
      }
    } catch (err) {
      console.warn('Server error:', err);
      const fallback = window.confirm(`🌐 WhatsApp Cloud Server offline/unreachable. Would you like to send directly via WhatsApp Web/App right now?`);
      if (fallback) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`, '_blank');
      }
    } finally {
      setSendingWaId(null);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteRecord('students', id);
        setStudents(students.filter(s => s.id !== id));
      } catch (error) {
        console.error("Error deleting student:", error);
      }
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkEditSubmit = async (e) => {
    e.preventDefault();
    const updates = {};
    if (bulkEditForm.class) updates.class = bulkEditForm.class;
    if (bulkEditForm.section) updates.section = bulkEditForm.section;
    if (bulkEditForm.status) updates.status = bulkEditForm.status;
    if (bulkEditForm.monthlyFee !== '') updates.monthlyFee = Number(bulkEditForm.monthlyFee);

    if (Object.keys(updates).length === 0) {
      alert("No changes specified.");
      return;
    }

    if (!window.confirm(`Are you sure you want to update ${selectedIds.length} students?`)) return;

    setIsBulkUpdating(true);
    try {
      for (const id of selectedIds) {
        await updateRecord('students', id, updates);
      }
      setStudents(students.map(s => selectedIds.includes(s.id) ? { ...s, ...updates } : s));
      setSelectedIds([]);
      setIsBulkEditOpen(false);
      alert('Students updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Error bulk updating students.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const q = (searchTerm || '').toLowerCase().trim();
    const matchSearch = !q || (
      String(student.name || '').toLowerCase().includes(q) ||
      String(student.rollNumber || '').toLowerCase().includes(q) ||
      String(student.class || '').toLowerCase().includes(q) ||
      String(student.section || '').toLowerCase().includes(q) ||
      String(student.fatherName || '').toLowerCase().includes(q) ||
      String(student.phone || '').toLowerCase().includes(q) ||
      String(student.id || '').toLowerCase().includes(q)
    );

    const matchClass = !filterClass || student.class === filterClass;
    const matchStatus = !filterStatus || student.status === filterStatus;
    const matchFeeStatus = !filterFeeStatus || student.feeStatus === filterFeeStatus;

    return matchSearch && matchClass && matchStatus && matchFeeStatus;
  }).sort((a, b) => {
    const fA = (a.fatherName || '').toLowerCase();
    const fB = (b.fatherName || '').toLowerCase();
    if (fA < fB) return -1;
    if (fA > fB) return 1;
    // If father names are equal, sort by student name
    const nA = (a.name || '').toLowerCase();
    const nB = (b.name || '').toLowerCase();
    return nA.localeCompare(nB);
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const handleInlineChange = (id, field, value) => {
    setInlineEdits(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  const saveInlineEdits = async () => {
    const editIds = Object.keys(inlineEdits);
    if (editIds.length === 0) {
      setIsSpreadsheetMode(false);
      return;
    }

    setIsSavingInline(true);
    try {
      for (const id of editIds) {
        await updateRecord('students', id, inlineEdits[id]);
      }
      setStudents(students.map(s => inlineEdits[s.id] ? { ...s, ...inlineEdits[s.id] } : s));
      setInlineEdits({});
      setIsSpreadsheetMode(false);
      alert('All changes saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving changes.');
    } finally {
      setIsSavingInline(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ... header ... */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Manager</h1>
          <p className="text-dark-muted mt-1">Total {students.length} students enrolled.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/school-admin/import')} className="premium-button-secondary">
            <UploadCloud size={18} />
            Import Excel/CSV
          </button>
          
          <button 
            onClick={() => {
              if (isSpreadsheetMode) {
                saveInlineEdits();
              } else {
                setIsSpreadsheetMode(true);
              }
            }}
            disabled={isSavingInline}
            className={`premium-button-primary ${isSpreadsheetMode ? '!bg-green-600 hover:!bg-green-700 !border-green-500' : ''}`}
          >
            {isSavingInline ? (
              <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</span>
            ) : isSpreadsheetMode ? (
              <span className="flex items-center gap-2"><CheckCircle size={18} /> Save All Changes</span>
            ) : (
              <span className="flex items-center gap-2"><Edit2 size={18} /> Spreadsheet Mode</span>
            )}
          </button>

          {isSpreadsheetMode && (
            <button 
              onClick={() => {
                setIsSpreadsheetMode(false);
                setInlineEdits({});
              }}
              className="premium-button-secondary !bg-red-500/10 !text-red-500 !border-red-500/20 hover:!bg-red-500/20"
            >
              Cancel
            </button>
          )}

          {!isSpreadsheetMode && (
            <>
              <button className="premium-button-secondary">
                <Download size={18} />
                Export
              </button>
              <button 
                onClick={() => navigate('/school-admin/students/add')}
                className="premium-button-primary"
              >
                <Plus size={20} />
                Add Student
              </button>
            </>
          )}
        </div>
      </div>
      {/* ... stats ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="flex flex-col items-center justify-center py-6 text-center border-b-2 border-primary-500">
          <h3 className="text-3xl font-black">{students.length}</h3>
          <p className="text-[10px] text-dark-muted uppercase tracking-[0.2em] font-bold mt-1">Total Students</p>
        </GlassCard>
        <GlassCard className="flex flex-col items-center justify-center py-6 text-center border-b-2 border-green-500">
          <h3 className="text-3xl font-black text-green-500">{students.filter(s => s.status === 'Active').length}</h3>
          <p className="text-[10px] text-dark-muted uppercase tracking-[0.2em] font-bold mt-1">Active Now</p>
        </GlassCard>
        <GlassCard className="flex flex-col items-center justify-center py-6 text-center border-b-2 border-orange-500">
          <h3 className="text-3xl font-black text-orange-500">
            {students.filter(s => s.feeStatus === 'Pending').length}
          </h3>
          <p className="text-[10px] text-dark-muted uppercase tracking-[0.2em] font-bold mt-1">Pending Fees</p>
        </GlassCard>
        <GlassCard className="flex flex-col items-center justify-center py-6 text-center border-b-2 border-purple-500">
          <h3 className="text-3xl font-black text-purple-500">
            {students.filter(s => s.createdAt?.toDate()?.toDateString() === new Date().toDateString()).length}
          </h3>
          <p className="text-[10px] text-dark-muted uppercase tracking-[0.2em] font-bold mt-1">New Today</p>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, roll number or class..." 
              className="w-full premium-input pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isSpreadsheetMode}
            />
          </div>
          
          {selectedIds.length > 0 && !isSpreadsheetMode && (
            <button 
              onClick={() => setIsBulkEditOpen(true)}
              className="premium-button-primary !bg-purple-600 hover:!bg-purple-700 !border-purple-500 animate-fade-in"
            >
              <Edit2 size={18} />
              Bulk Edit ({selectedIds.length})
            </button>
          )}

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`premium-button-secondary ${showFilters ? 'bg-primary-500/20 border-primary-500 text-primary-500' : ''}`}
          >
            <Filter size={18} />
            Filter Records
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-dark-hover rounded-xl border border-dark-border animate-fade-in">
            <div>
              <label className="block text-[10px] font-black text-dark-muted mb-2 uppercase tracking-wider">Class</label>
              <select 
                value={filterClass} 
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full premium-input"
              >
                <option value="">All Classes</option>
                {[...new Set(students.map(s => s.class).filter(Boolean))].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-dark-muted mb-2 uppercase tracking-wider">Status</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full premium-input"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Left">Left</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-dark-muted mb-2 uppercase tracking-wider">Fee Status</label>
              <select 
                value={filterFeeStatus} 
                onChange={(e) => setFilterFeeStatus(e.target.value)}
                className="w-full premium-input"
              >
                <option value="">All Fee Status</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>
        )}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black">
                {!isSpreadsheetMode && (
                  <th className="pb-4 px-4 w-10">
                    <input 
                      type="checkbox" 
                      checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-dark-border bg-dark-hover text-primary-500 focus:ring-primary-500 focus:ring-offset-dark-card"
                    />
                  </th>
                )}
                <th className="pb-4 px-4">Student Name</th>
                <th className="pb-4 px-4">Roll No</th>
                <th className="pb-4 px-4">Class</th>
                <th className="pb-4 px-4">Section</th>
                <th className="pb-4 px-4">Father Name</th>
                <th className="pb-4 px-4">Mobile No</th>
                <th className="pb-4 px-4">CNIC</th>
                <th className="pb-4 px-4">Monthly Fee</th>
                <th className="pb-4 px-4">Status</th>
                {!isSpreadsheetMode && <th className="pb-4 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {filteredStudents.map((student) => {
                const isEdited = inlineEdits[student.id] !== undefined;
                const s = { ...student, ...(inlineEdits[student.id] || {}) };
                
                return (
                  <tr key={student.id} className={`group hover:bg-white/5 transition-all ${selectedIds.includes(student.id) || isEdited ? 'bg-primary-500/5' : ''}`}>
                    {!isSpreadsheetMode && (
                      <td className="py-2 px-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(student.id)}
                          onChange={() => toggleSelect(student.id)}
                          className="w-4 h-4 rounded border-dark-border bg-dark-hover text-primary-500 focus:ring-primary-500 focus:ring-offset-dark-card"
                        />
                      </td>
                    )}
                    
                    {isSpreadsheetMode ? (
                      <>
                        <td className="py-2 px-2"><input type="text" value={s.name || ''} onChange={(e) => handleInlineChange(student.id, 'name', e.target.value)} className="w-full bg-dark-hover border border-dark-border rounded px-2 py-1 text-sm focus:border-primary-500 outline-none" /></td>
                        <td className="py-2 px-2"><input type="text" value={s.rollNumber || ''} onChange={(e) => handleInlineChange(student.id, 'rollNumber', e.target.value)} className="w-full bg-dark-hover border border-dark-border rounded px-2 py-1 text-sm font-mono text-primary-400 focus:border-primary-500 outline-none" /></td>
                        <td className="py-2 px-2"><input type="text" value={s.class || ''} onChange={(e) => handleInlineChange(student.id, 'class', e.target.value)} className="w-full bg-dark-hover border border-dark-border rounded px-2 py-1 text-sm focus:border-primary-500 outline-none" /></td>
                        <td className="py-2 px-2"><input type="text" value={s.section || ''} onChange={(e) => handleInlineChange(student.id, 'section', e.target.value)} className="w-full bg-dark-hover border border-dark-border rounded px-2 py-1 text-sm focus:border-primary-500 outline-none" /></td>
                        <td className="py-2 px-2"><input type="text" value={s.fatherName || ''} onChange={(e) => handleInlineChange(student.id, 'fatherName', e.target.value)} className="w-full bg-dark-hover border border-dark-border rounded px-2 py-1 text-sm focus:border-primary-500 outline-none" /></td>
                        <td className="py-2 px-2"><input type="text" value={s.phone || s.parentPhone || ''} onChange={(e) => handleInlineChange(student.id, 'phone', e.target.value)} className="w-full bg-dark-hover border border-dark-border rounded px-2 py-1 text-sm font-mono focus:border-primary-500 outline-none" placeholder="03XX-XXXXXXX" /></td>
                        <td className="py-2 px-2"><input type="text" value={s.cnic || s.fatherCnic || ''} onChange={(e) => handleInlineChange(student.id, 'cnic', e.target.value)} className="w-full bg-dark-hover border border-dark-border rounded px-2 py-1 text-sm font-mono focus:border-primary-500 outline-none" placeholder="XXXXX-XXXXXXX-X" /></td>
                        <td className="py-2 px-2"><input type="number" value={s.monthlyFee || ''} onChange={(e) => handleInlineChange(student.id, 'monthlyFee', e.target.value)} className="w-full bg-dark-hover border border-dark-border rounded px-2 py-1 text-sm focus:border-primary-500 outline-none" placeholder="0" /></td>
                        <td className="py-2 px-2">
                          <select value={s.status || 'Active'} onChange={(e) => handleInlineChange(student.id, 'status', e.target.value)} className="w-full bg-dark-hover border border-dark-border rounded px-2 py-1 text-sm focus:border-primary-500 outline-none">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Left">Left</option>
                          </select>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-dark-hover flex items-center justify-center text-primary-500 font-bold border border-dark-border uppercase overflow-hidden">
                              {student.photoUrl ? (
                                <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                              ) : (
                                student.name?.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-dark-text group-hover:text-primary-500 transition-colors">
                                {student.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-dark-muted font-mono uppercase">
                                <span>ID: {student.id.slice(0,6)}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-bold text-primary-400">{student.rollNumber}</td>
                        <td className="py-3 px-4 text-sm">{student.class}</td>
                        <td className="py-3 px-4 text-sm">{student.section || '-'}</td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-semibold">{student.fatherName}</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">{student.phone || student.parentPhone || '-'}</td>
                        <td className="py-3 px-4 font-mono text-xs">{student.cnic || student.fatherCnic || '-'}</td>
                        <td className="py-3 px-4 text-sm">{student.monthlyFee ? `Rs. ${student.monthlyFee}` : '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                            student.status === 'Active' 
                              ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleSendStudentWhatsApp(student)}
                              disabled={sendingWaId === student.id}
                              className="p-1.5 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white rounded-lg transition-all flex items-center gap-1 text-xs font-bold disabled:opacity-50"
                              title="Send Automatic WhatsApp via Cloud AI Bot Server"
                            >
                              {sendingWaId === student.id ? (
                                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <MessageSquare size={14} />
                              )}
                            </button>
                            <button onClick={() => navigate(`/school-admin/students/${student.id}`)} className="p-1.5 hover:bg-primary-500/10 text-dark-muted hover:text-primary-500 rounded-lg transition-all"><Eye size={14} /></button>
                            <button onClick={() => navigate(`/school-admin/students/edit/${student.id}`)} className="p-1.5 hover:bg-blue-500/10 text-dark-muted hover:text-blue-500 rounded-lg transition-all"><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete(student.id)} className="p-1.5 hover:bg-red-500/10 text-dark-muted hover:text-red-500 rounded-lg transition-all"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredStudents.length === 0 && !loading && (
            <div className="text-center py-20">
              <div className="p-4 bg-dark-hover rounded-full inline-block mb-4 text-dark-muted">
                <GraduationCap size={48} />
              </div>
              <h3 className="text-xl font-bold">No Students Found</h3>
              <p className="text-dark-muted max-w-xs mx-auto mt-2">
                We couldn't find any student records matching your search criteria.
              </p>
              <button 
                onClick={() => navigate('/school-admin/students/add')}
                className="mt-6 premium-button-primary inline-flex"
              >
                <Plus size={20} />
                Add First Student
              </button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Bulk Edit Modal */}
      {isBulkEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <GlassCard className="w-full max-w-md p-6 relative">
            <h2 className="text-xl font-bold mb-4">Bulk Edit {selectedIds.length} Students</h2>
            <p className="text-sm text-dark-muted mb-6">Leave a field blank if you do not want to change it.</p>
            
            <form onSubmit={handleBulkEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-muted mb-1">Update Class</label>
                <input 
                  type="text" 
                  value={bulkEditForm.class}
                  onChange={e => setBulkEditForm({...bulkEditForm, class: e.target.value})}
                  className="w-full premium-input"
                  placeholder="e.g. 5th, 6th (Leave blank to keep same)"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-muted mb-1">Update Section</label>
                <input 
                  type="text" 
                  value={bulkEditForm.section}
                  onChange={e => setBulkEditForm({...bulkEditForm, section: e.target.value})}
                  className="w-full premium-input"
                  placeholder="e.g. A, Blue (Leave blank to keep same)"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-muted mb-1">Update Monthly Fee (Rs.)</label>
                <input 
                  type="number" 
                  value={bulkEditForm.monthlyFee}
                  onChange={e => setBulkEditForm({...bulkEditForm, monthlyFee: e.target.value})}
                  className="w-full premium-input"
                  placeholder="e.g. 2500 (Leave blank to keep same)"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-muted mb-1">Update Status</label>
                <select 
                  value={bulkEditForm.status}
                  onChange={e => setBulkEditForm({...bulkEditForm, status: e.target.value})}
                  className="w-full premium-input"
                >
                  <option value="">-- No Change --</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Left">Left</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setIsBulkEditOpen(false)}
                  className="px-4 py-2 text-dark-muted hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isBulkUpdating}
                  className="premium-button-primary !bg-purple-600 hover:!bg-purple-700"
                >
                  {isBulkUpdating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default StudentManager;
