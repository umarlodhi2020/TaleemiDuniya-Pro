import React, { useState, useEffect } from 'react';
import { 
  Award, Plus, Trash2, Edit2, Loader2, Info, Save, 
  CheckCircle, RefreshCw, X, ShieldCheck, Sparkles, Sliders
} from 'lucide-react';
import GlassCard from '../../../components/common/GlassCard';
import { useAuth } from '../../../context/AuthContext';
import { getRecords, addRecord, updateRecord, deleteRecord } from '../../../services/db';
import { DEFAULT_GRADING_RULES } from '../../../services/examService';
import Swal from 'sweetalert2';

const GradingManagement = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    grade: 'A+',
    minPercent: 90,
    maxPercent: 100,
    gradePoint: 4.0,
    remarks: 'Outstanding'
  });

  useEffect(() => {
    fetchRules();
  }, [schoolId]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await getRecords('gradingRules', schoolId);
      if (!data || data.length === 0) {
        // Initialize default rules for the school if empty
        setRules(DEFAULT_GRADING_RULES);
      } else {
        const sorted = data.sort((a, b) => Number(b.maxPercent || b.maxMarks || 100) - Number(a.maxPercent || a.maxMarks || 100));
        setRules(sorted);
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Failed to fetch grading rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (rule = null) => {
    if (rule) {
      setFormData({
        grade: rule.grade || 'A',
        minPercent: rule.minPercent ?? rule.minMarks ?? 0,
        maxPercent: rule.maxPercent ?? rule.maxMarks ?? 100,
        gradePoint: rule.gradePoint ?? rule.gpa ?? 0,
        remarks: rule.remarks || rule.description || ''
      });
      setEditId(rule.id || null);
    } else {
      setFormData({
        grade: 'A',
        minPercent: 75,
        maxPercent: 84.99,
        gradePoint: 3.5,
        remarks: 'Very Good'
      });
      setEditId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const min = Number(formData.minPercent);
    const max = Number(formData.maxPercent);
    const gpa = Number(formData.gradePoint || 0);

    if (min > max) {
      return Swal.fire('Error', 'Minimum % cannot exceed Maximum %', 'warning');
    }

    setSaving(true);
    try {
      const payload = {
        grade: formData.grade.trim().toUpperCase(),
        minPercent: min,
        maxPercent: max,
        minMarks: min, // compatibility
        maxMarks: max, // compatibility
        gradePoint: gpa,
        gpa: gpa, // compatibility
        remarks: formData.remarks.trim(),
        description: formData.remarks.trim(),
        schoolId: schoolId,
        updatedAt: new Date().toISOString()
      };

      if (editId) {
        await updateRecord('gradingRules', editId, payload);
        Swal.fire('Updated', `Grade ${payload.grade} updated successfully!`, 'success');
      } else {
        await addRecord('gradingRules', { ...payload, createdAt: new Date().toISOString() }, schoolId);
        Swal.fire('Created', `Grade ${payload.grade} added to grading scheme!`, 'success');
      }

      setIsModalOpen(false);
      fetchRules();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to save grading rule', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rule) => {
    const confirm = await Swal.fire({
      title: `Delete Grade "${rule.grade}"?`,
      text: "This will remove this grade scale bracket from active calculations.",
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
        if (rule.id) {
          await deleteRecord('gradingRules', rule.id);
        } else {
          setRules(prev => prev.filter(r => r.grade !== rule.grade));
        }
        Swal.fire('Deleted!', 'Grading rule deleted.', 'success');
        fetchRules();
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to delete rule', 'error');
      }
    }
  };

  const handleResetToDefaults = async () => {
    const confirm = await Swal.fire({
      title: 'Reset to Standard Scale?',
      text: 'This will seed the standard A+ (90-100), A (80-89), B (70-79), C (60-69), D (50-59), E (33-49), F (0-32) scale.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reset',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      background: '#1a1f37',
      color: '#fff'
    });

    if (confirm.isConfirmed) {
      setSaving(true);
      try {
        // Clear custom rules and write defaults
        for (const defaultRule of DEFAULT_GRADING_RULES) {
          await addRecord('gradingRules', {
            ...defaultRule,
            minMarks: defaultRule.minPercent,
            maxMarks: defaultRule.maxPercent,
            gpa: defaultRule.gradePoint,
            schoolId,
            createdAt: new Date().toISOString()
          }, schoolId);
        }
        Swal.fire('Reset Complete', 'Standard grading rules applied.', 'success');
        fetchRules();
      } catch (err) {
        console.error(err);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-dark-card/90 via-dark-card/60 to-primary-950/40 p-6 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-primary-500/10 rounded-xl text-primary-400 border border-primary-500/20">
              <Award size={26} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white via-dark-text to-primary-300 bg-clip-text text-transparent">
                Grading Schemes & Rules
              </h1>
              <p className="text-xs md:text-sm text-dark-muted font-medium">
                Configure percentage brackets, GPA scales, and qualitative remarks applied automatically across all exams.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleResetToDefaults}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-dark-muted hover:text-white border border-white/10 text-xs font-bold transition-all"
          >
            <Sliders size={15} />
            <span>Standard Scale</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-primary-600/30 transition-all hover:scale-[1.02]"
          >
            <Plus size={18} />
            <span>+ Add Grade Bracket</span>
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl flex items-start gap-3">
        <Info size={18} className="text-primary-400 shrink-0 mt-0.5" />
        <div className="text-xs text-dark-text space-y-0.5">
          <p className="font-bold text-white">Dynamic Auto-Grading Engine</p>
          <p className="text-dark-muted">
            These rules are evaluated in real-time when entering student marks, generating report cards, marksheets, and parent portal transcripts.
          </p>
        </div>
      </div>

      {/* Grading Scale Table */}
      <GlassCard className="p-0 overflow-hidden border-white/5 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-dark-muted text-xs uppercase tracking-wider font-semibold">
                <th className="py-4 px-4">Grade</th>
                <th className="py-4 px-4">Percentage Range</th>
                <th className="py-4 px-4">Grade Point (GPA)</th>
                <th className="py-4 px-4">Qualitative Description</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-dark-text">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-dark-muted">
                    <RefreshCw className="animate-spin inline-block mr-2 text-primary-400" size={20} />
                    Loading grading rules...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-dark-muted text-xs">
                    No grading rules configured. Click "+ Add Grade Bracket" to create one.
                  </td>
                </tr>
              ) : (
                rules.map((rule, idx) => {
                  const min = rule.minPercent ?? rule.minMarks ?? 0;
                  const max = rule.maxPercent ?? rule.maxMarks ?? 100;
                  const gpa = rule.gradePoint ?? rule.gpa ?? 0;
                  const isFail = (rule.grade || '').toUpperCase() === 'F' || min < 33;

                  return (
                    <tr 
                      key={rule.id || idx}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-4 px-4">
                        <span className={`inline-block px-3 py-1 rounded-xl font-black text-sm border ${
                          isFail
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {rule.grade}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-white text-xs">
                        {min}% — {max}%
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-primary-300 text-xs">
                        {Number(gpa).toFixed(1)}
                      </td>
                      <td className="py-4 px-4 text-xs text-dark-muted font-medium">
                        {rule.remarks || rule.description || '—'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isFail ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {isFail ? 'Fail Bracket' : 'Pass Bracket'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenModal(rule)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-dark-muted hover:text-white transition-all"
                            title="Edit Bracket"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(rule)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                            title="Delete Bracket"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-dark-card border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl my-8">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-lg font-black text-white">
                {editId ? 'Edit Grade Bracket' : 'Add Grade Bracket'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 text-dark-muted hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark-muted uppercase mb-1.5">Grade Letter</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A+"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-muted uppercase mb-1.5">Grade Point (GPA)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    required
                    value={formData.gradePoint}
                    onChange={(e) => setFormData({ ...formData, gradePoint: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark-muted uppercase mb-1.5">Min Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={formData.minPercent}
                    onChange={(e) => setFormData({ ...formData, minPercent: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-muted uppercase mb-1.5">Max Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={formData.maxPercent}
                    onChange={(e) => setFormData({ ...formData, maxPercent: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-muted uppercase mb-1.5">Description / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Excellent / Outstanding / Satisfactory"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-bg/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-dark-muted rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-600/30 flex items-center gap-1.5"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{editId ? 'Update Grade' : 'Save Grade'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default GradingManagement;
