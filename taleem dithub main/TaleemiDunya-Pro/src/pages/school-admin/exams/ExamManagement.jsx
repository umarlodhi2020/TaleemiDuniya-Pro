import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Plus, Search, Filter, Calendar, Users, 
  CheckCircle2, Clock, Globe, Copy, Archive, Trash2, Edit, 
  Eye, AlertTriangle, ArrowRight, Play, CheckCircle, RefreshCw,
  Award, FileText, ChevronRight, X, ShieldAlert, Sparkles, BookOpen,
  Save, FileEdit, CheckSquare, Square, Layers, Sliders, Check
} from 'lucide-react';
import GlassCard from '../../../components/common/GlassCard';
import { useAuth } from '../../../context/AuthContext';
import { useSchool } from '../../../context/SchoolContext';
import { 
  getExams, saveExam, duplicateExam, deleteExamSafe, 
  validateExamForLive, EXAM_STATUSES, EXAM_TYPES 
} from '../../../services/examService';
import { getRecords } from '../../../services/db';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const ExamManagement = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { schoolClasses } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    examName: '',
    examType: 'Mid Term',
    academicYear: '2026-2027',
    session: '2026-2027',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    classes: [],
    sections: ['A', 'B'],
    instructions: '',
    status: EXAM_STATUSES.SCHEDULED,
    marksheetType: 'Long',
    signatureOffset: 0,
    failSubjectCount: 1,
    termWeightage: 100,
    visibilityControls: {
      showTotalMarks: true,
      showGrade: true,
      showTeacherComments: true,
      showPercentage: true,
      showRankPosition: true,
      showRankComments: true,
      showGraph: true,
      showAttendance: true
    },
    mergeWithOtherExams: false,
    mergedExamIds: []
  });

  // Modal State for Validation & Preview
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationData, setValidationData] = useState({ exam: null, missingItems: [] });
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewExam, setViewExam] = useState(null);

  const availableClasses = schoolClasses?.length > 0 
    ? schoolClasses.map(c => c.name) 
    : ['Nursery', 'KG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

  const availableSections = ['A', 'B', 'C', 'D', 'Boys', 'Girls', 'Pre-Medical', 'Pre-Engineering', 'ICS', 'General'];

  useEffect(() => {
    loadExams();
  }, [schoolId]);

  const loadExams = async () => {
    setLoading(true);
    try {
      const data = await getExams(schoolId);
      setExams(data);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to load exams list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setEditingId(null);
    setFormData({
      examName: '',
      examType: 'Mid Term',
      academicYear: '2026-2027',
      session: '2026-2027',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      classes: availableClasses.slice(0, 4),
      sections: ['A', 'B'],
      instructions: '',
      status: EXAM_STATUSES.SCHEDULED,
      marksheetType: 'Long',
      signatureOffset: 0,
      failSubjectCount: 1,
      termWeightage: 100,
      visibilityControls: {
        showTotalMarks: true,
        showGrade: true,
        showTeacherComments: true,
        showPercentage: true,
        showRankPosition: true,
        showRankComments: true,
        showGraph: true,
        showAttendance: true
      },
      mergeWithOtherExams: false,
      mergedExamIds: []
    });
  };

  const handleOpenEdit = (exam) => {
    setEditingId(exam.id);
    setFormData({
      examName: exam.examName || exam.title || '',
      examType: exam.examType || 'Mid Term',
      academicYear: exam.academicYear || '2026-2027',
      session: exam.session || '2026-2027',
      startDate: exam.startDate || new Date().toISOString().split('T')[0],
      endDate: exam.endDate || new Date().toISOString().split('T')[0],
      classes: exam.classes || [],
      sections: exam.sections || ['A'],
      instructions: exam.instructions || '',
      status: exam.status || EXAM_STATUSES.SCHEDULED,
      marksheetType: exam.marksheetType || 'Long',
      signatureOffset: exam.signatureOffset ?? 0,
      failSubjectCount: exam.failSubjectCount ?? 1,
      termWeightage: exam.termWeightage ?? 100,
      visibilityControls: exam.visibilityControls || {
        showTotalMarks: true,
        showGrade: true,
        showTeacherComments: true,
        showPercentage: true,
        showRankPosition: true,
        showRankComments: true,
        showGraph: true,
        showAttendance: true
      },
      mergeWithOtherExams: Boolean(exam.mergeWithOtherExams),
      mergedExamIds: exam.mergedExamIds || []
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleVisibility = (key) => {
    setFormData(prev => ({
      ...prev,
      visibilityControls: {
        ...prev.visibilityControls,
        [key]: !prev.visibilityControls[key]
      }
    }));
  };

  const handleFormSubmit = async (e, forcedStatus = null) => {
    if (e) e.preventDefault();
    if (!formData.examName || formData.examName.trim() === '') {
      return Swal.fire('Error', 'Please enter an Exam Name', 'warning');
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        classes: formData.classes?.length > 0 ? formData.classes : availableClasses,
        status: forcedStatus || formData.status || EXAM_STATUSES.SCHEDULED
      };
      await saveExam(payload, schoolId, editingId);
      
      Swal.fire({
        title: editingId ? 'Exam Updated!' : 'Exam Saved!',
        text: `Exam "${payload.examName}" has been successfully saved.`,
        icon: 'success',
        background: '#1a1f37',
        color: '#fff',
        confirmButtonColor: '#3b82f6'
      });

      handleResetForm();
      loadExams();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to save exam details', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (exam) => {
    const res = await Swal.fire({
      title: 'Duplicate Exam?',
      text: `Create a new draft copy of "${exam.examName}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Duplicate',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      background: '#1a1f37',
      color: '#fff'
    });

    if (res.isConfirmed) {
      try {
        await duplicateExam(exam.id, schoolId);
        Swal.fire('Duplicated!', 'A new draft copy has been created.', 'success');
        loadExams();
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to duplicate exam', 'error');
      }
    }
  };

  const handleMakeLive = (exam) => {
    const validation = validateExamForLive(exam, exam.subjects || []);
    if (!validation.isReady) {
      setValidationData({ exam, missingItems: validation.missingItems });
      setIsValidationModalOpen(true);
      return;
    }

    Swal.fire({
      title: 'Activate Exam to LIVE?',
      html: `<div class="text-left text-sm space-y-2 text-dark-muted">
        <p class="text-white font-semibold">Making this exam Live will:</p>
        <ul class="list-disc pl-5 space-y-1">
          <li>Enable teachers to enter subject marks</li>
          <li>Allow student and parent portals to view the date-sheet</li>
          <li>Activate official Admit Card issuance</li>
        </ul>
      </div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Make Live',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      background: '#1a1f37',
      color: '#fff'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await saveExam({ ...exam, status: EXAM_STATUSES.LIVE }, schoolId, exam.id);
          Swal.fire('Live!', `Exam "${exam.examName}" is now active and LIVE!`, 'success');
          loadExams();
        } catch (err) {
          console.error(err);
          Swal.fire('Error', 'Failed to activate exam', 'error');
        }
      }
    });
  };

  const handleStatusChange = async (exam, newStatus) => {
    try {
      await saveExam({ ...exam, status: newStatus }, schoolId, exam.id);
      Swal.fire('Status Updated', `Exam marked as ${newStatus}`, 'success');
      loadExams();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to update status', 'error');
    }
  };

  const handleDelete = async (exam) => {
    const confirm = await Swal.fire({
      title: 'Delete Exam?',
      text: `Are you sure you want to delete "${exam.examName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      background: '#1a1f37',
      color: '#fff'
    });

    if (confirm.isConfirmed) {
      try {
        await deleteExamSafe(exam.id, schoolId);
        Swal.fire('Deleted!', 'Exam deleted successfully.', 'success');
        loadExams();
      } catch (err) {
        Swal.fire('Cannot Delete Exam', err.message || 'Error deleting exam', 'error');
      }
    }
  };

  // Filtered List for All Exams Table
  const filteredExams = exams.filter(e => {
    const matchesSearch = (e.examName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (e.examType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (e.academicYear || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || e.examType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case EXAM_STATUSES.LIVE:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live</span>;
      case EXAM_STATUSES.SCHEDULED:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30"><Clock size={12} /> Scheduled</span>;
      case EXAM_STATUSES.COMPLETED:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"><CheckCircle2 size={12} /> Completed</span>;
      case EXAM_STATUSES.RESULTS_PUBLISHED:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30"><Award size={12} /> Published</span>;
      case EXAM_STATUSES.ARCHIVED:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"><Archive size={12} /> Archived</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Draft</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      
      {/* 📝 CREATE EXAM MAIN FORM SECTION (Matching user's screenshot layout) */}
      <div className="bg-dark-card/90 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-7">
        
        {/* Header with Icon */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <FileEdit size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-blue-400 flex items-center gap-2">
                Create Exam
              </h1>
              <p className="text-xs md:text-sm text-dark-muted font-medium mt-0.5">
                Configure exam details, marksheet type, weightages, and visibility controls.
              </p>
            </div>
          </div>

          {editingId && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold">
                Editing Mode
              </span>
              <button
                onClick={handleResetForm}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-dark-muted hover:text-white rounded-xl text-xs font-bold"
              >
                Cancel Edit
              </button>
            </div>
          )}
        </div>

        <form onSubmit={(e) => handleFormSubmit(e)} className="space-y-7">
          
          {/* SECTION 1: EXAM DETAILS */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <span>Exam Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Exam Name * */}
              <div>
                <label className="block text-xs font-bold text-dark-text mb-1.5">
                  Exam Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mid Term Exam 2026"
                  value={formData.examName}
                  onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                />
              </div>

              {/* Exam Type */}
              <div>
                <label className="block text-xs font-bold text-dark-text mb-1.5">
                  Exam Type
                </label>
                <select
                  value={formData.examType}
                  onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {EXAM_TYPES.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Marksheet Type */}
              <div>
                <label className="block text-xs font-bold text-dark-text mb-1.5">
                  Marksheet Type
                </label>
                <select
                  value={formData.marksheetType}
                  onChange={(e) => setFormData({ ...formData, marksheetType: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="Long">Long</option>
                  <option value="Short">Short</option>
                  <option value="Detailed">Detailed</option>
                  <option value="Compact">Compact</option>
                  <option value="Tabular">Tabular</option>
                </select>
              </div>

              {/* Current Term Weightage (%) */}
              <div>
                <label className="block text-xs font-bold text-dark-text mb-1.5">
                  Current Term Weightage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.termWeightage}
                  onChange={(e) => setFormData({ ...formData, termWeightage: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Signature Offset */}
              <div>
                <label className="block text-xs font-bold text-dark-text mb-1.5">
                  Signature Offset
                </label>
                <input
                  type="number"
                  value={formData.signatureOffset}
                  onChange={(e) => setFormData({ ...formData, signatureOffset: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Fail Subject Count */}
              <div>
                <label className="block text-xs font-bold text-dark-text mb-1.5">
                  Fail Subject Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.failSubjectCount}
                  onChange={(e) => setFormData({ ...formData, failSubjectCount: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

            </div>

          </div>

          <div className="border-t border-white/10 my-4" />

          {/* SECTION 2: MARKSHEET VISIBILITY CONTROLS (Amber header and clean pill buttons) */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <span>Marksheet Visibility Controls</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              
              {[
                { key: 'showTotalMarks', label: 'Show Total Marks' },
                { key: 'showGrade', label: 'Show Grade' },
                { key: 'showTeacherComments', label: 'Show Teacher Comments' },
                { key: 'showPercentage', label: 'Show Percentage' },
                { key: 'showRankPosition', label: 'Show Rank Position' },
                { key: 'showRankComments', label: 'Show Rank Comments' },
                { key: 'showGraph', label: 'Graph' },
                { key: 'showAttendance', label: 'Show Attendance' },
              ].map((ctrl) => {
                const isActive = Boolean(formData.visibilityControls[ctrl.key]);
                return (
                  <button
                    key={ctrl.key}
                    type="button"
                    onClick={() => handleToggleVisibility(ctrl.key)}
                    className={`px-5 py-3.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between border text-left ${
                      isActive
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/50 shadow-lg shadow-blue-500/10'
                        : 'bg-dark-bg/60 text-dark-muted border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span>{ctrl.label}</span>
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-white/5 border-white/20 text-transparent'
                    }`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  </button>
                );
              })}

            </div>
          </div>

          {/* SAVE EXAM BUTTON (As in screenshot) */}
          <div className="pt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{editingId ? 'Update Exam' : 'Save Exam'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-dark-muted hover:text-white font-bold text-xs transition-colors"
            >
              Reset Form
            </button>
          </div>

        </form>

      </div>

      {/* 📋 ALL EXAMS SECTION BELOW */}
      <div className="space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
          <div>
            <h2 className="text-xl font-black text-blue-400">All Exams</h2>
            <p className="text-xs text-dark-muted">Active, scheduled, completed, and archived academic examinations.</p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={14} />
              <input
                type="text"
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-dark-bg/80 border border-white/10 rounded-xl text-xs text-white placeholder-dark-muted focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-dark-bg/80 border border-white/10 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none font-medium"
            >
              <option value="ALL">All Status</option>
              <option value={EXAM_STATUSES.LIVE}>Live</option>
              <option value={EXAM_STATUSES.SCHEDULED}>Scheduled</option>
              <option value={EXAM_STATUSES.DRAFT}>Draft</option>
              <option value={EXAM_STATUSES.RESULTS_PUBLISHED}>Published</option>
              <option value={EXAM_STATUSES.ARCHIVED}>Archived</option>
            </select>

            <button
              onClick={loadExams}
              className="p-1.5 bg-dark-bg/80 border border-white/10 rounded-xl text-dark-muted hover:text-white"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Exams Table */}
        <GlassCard className="p-0 overflow-hidden border-white/5 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5 text-dark-muted text-xs uppercase tracking-wider font-semibold">
                  <th className="py-4 px-4">Exam Name</th>
                  <th className="py-4 px-3">Marksheet Type</th>
                  <th className="py-4 px-3">Weightage</th>
                  <th className="py-4 px-3">Start Date</th>
                  <th className="py-4 px-3">End Date</th>
                  <th className="py-4 px-4">Classes</th>
                  <th className="py-4 px-3">Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-dark-text">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-16 text-dark-muted text-xs">
                      <RefreshCw className="animate-spin inline-block mr-2 text-blue-400" size={18} />
                      Loading examinations...
                    </td>
                  </tr>
                ) : filteredExams.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-16 text-dark-muted text-xs">
                      No examinations found. Create one using the form above.
                    </td>
                  </tr>
                ) : (
                  filteredExams.map((exam) => (
                    <tr 
                      key={exam.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                            {exam.examName?.slice(0, 2).toUpperCase() || 'EX'}
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-blue-300 transition-colors">
                              {exam.examName}
                            </div>
                            <div className="text-[11px] text-dark-muted">
                              Session: {exam.academicYear || exam.session}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-xs font-semibold text-white/90">
                        {exam.marksheetType || 'Long'}
                      </td>
                      <td className="py-4 px-3 text-xs font-mono font-bold text-emerald-400">
                        {exam.termWeightage ?? 100}%
                      </td>
                      <td className="py-4 px-3 text-xs font-semibold text-white/90">
                        {exam.startDate}
                      </td>
                      <td className="py-4 px-3 text-xs font-semibold text-white/90">
                        {exam.endDate}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {exam.classes?.map((c, i) => (
                            <span key={i} className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold">
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        {getStatusBadge(exam.status)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Make Live Button */}
                          {exam.status !== EXAM_STATUSES.LIVE && exam.status !== EXAM_STATUSES.RESULTS_PUBLISHED && exam.status !== EXAM_STATUSES.ARCHIVED && (
                            <button
                              onClick={() => handleMakeLive(exam)}
                              title="Make Live"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition-all"
                            >
                              <Play size={12} />
                              <span className="hidden xl:inline">Live</span>
                            </button>
                          )}

                          {/* Manage Subjects */}
                          <button
                            onClick={() => navigate(`/school-admin/exams/subjects?examId=${exam.id}`)}
                            title="Manage Subjects"
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-bold transition-all"
                          >
                            <BookOpen size={14} />
                          </button>

                          {/* Edit (Populates top form) */}
                          <button
                            onClick={() => handleOpenEdit(exam)}
                            title="Edit Exam"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-dark-muted hover:text-white transition-all"
                          >
                            <Edit size={14} />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(exam)}
                            title="Duplicate Exam"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-dark-muted hover:text-cyan-400 transition-all"
                          >
                            <Copy size={14} />
                          </button>

                          {/* Archive */}
                          {exam.status === EXAM_STATUSES.ARCHIVED ? (
                            <button
                              onClick={() => handleStatusChange(exam, EXAM_STATUSES.SCHEDULED)}
                              title="Unarchive"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-amber-400 transition-all"
                            >
                              <RefreshCw size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(exam, EXAM_STATUSES.ARCHIVED)}
                              title="Archive"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-dark-muted hover:text-zinc-300 transition-all"
                            >
                              <Archive size={14} />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(exam)}
                            title="Delete Exam"
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                          >
                            <Trash2 size={14} />
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

      {/* MAKE LIVE VALIDATION MODAL */}
      {isValidationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-dark-card border border-amber-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Cannot Make Exam Live Yet</h3>
                <p className="text-xs text-dark-muted">Please configure the following required items before activating:</p>
              </div>
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-2">
              {validationData.missingItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-amber-200 font-medium">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setIsValidationModalOpen(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-dark-muted rounded-xl text-xs font-bold"
              >
                Close
              </button>

              <button
                onClick={() => {
                  setIsValidationModalOpen(false);
                  if (validationData.exam) {
                    navigate(`/school-admin/exams/subjects?examId=${validationData.exam.id}`);
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
              >
                <span>Configure Exam Subjects</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExamManagement;
