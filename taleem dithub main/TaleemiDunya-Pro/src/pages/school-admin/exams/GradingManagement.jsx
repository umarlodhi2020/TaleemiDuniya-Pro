import React, { useState, useEffect } from 'react';
import { 
  Award, Plus, Trash2, Edit2, Loader2, Info, Save, 
  CheckCircle, RefreshCw, X, ShieldCheck, Sparkles, Sliders,
  ListOrdered
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
  
  // Bulk Add Form State
  const initialRow = { grade: '', minPercent: '', maxPercent: '', gradePoint: '', remarks: '' };
  const [newRules, setNewRules] = useState([ { ...initialRow } ]);

  // Inline Edit State
  const [editId, setEditId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    fetchRules();
  }, [schoolId]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await getRecords('gradingRules', schoolId);
      if (!data || data.length === 0) {
        setRules([]);
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

  const handleAddRow = () => {
    setNewRules([...newRules, { ...initialRow }]);
  };

  const handleRemoveRow = (index) => {
    const updated = newRules.filter((_, i) => i !== index);
    setNewRules(updated.length > 0 ? updated : [{ ...initialRow }]);
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...newRules];
    updated[index][field] = value;
    setNewRules(updated);
  };

  const handleBulkSave = async () => {
    // Validate rows
    const validRows = newRules.filter(r => r.grade && r.minPercent !== '' && r.maxPercent !== '');
    if (validRows.length === 0) {
      return Swal.fire('Warning', 'Please enter at least one valid grading rule.', 'warning');
    }

    setSaving(true);
    try {
      for (const row of validRows) {
        const min = Number(row.minPercent);
        const max = Number(row.maxPercent);
        const gpa = Number(row.gradePoint || 0);

        const payload = {
          grade: row.grade.trim().toUpperCase(),
          minPercent: min,
          maxPercent: max,
          minMarks: min,
          maxMarks: max,
          gradePoint: gpa,
          gpa: gpa,
          remarks: (row.remarks || '').trim(),
          description: (row.remarks || '').trim(),
          schoolId: schoolId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await addRecord('gradingRules', payload, schoolId);
      }
      
      Swal.fire('Success', `${validRows.length} Grading scale(s) added successfully!`, 'success');
      setNewRules([{ ...initialRow }]);
      fetchRules();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to save grading rules', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rule) => {
    const confirm = await Swal.fire({
      title: `Delete Grade "${rule.grade}"?`,
      text: "This will remove this grade scale bracket.",
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

  const startEdit = (rule) => {
    setEditId(rule.id || rule.grade); // Use grade as fallback ID for defaults
    setEditFormData({
      grade: rule.grade || '',
      minPercent: rule.minPercent ?? rule.minMarks ?? 0,
      maxPercent: rule.maxPercent ?? rule.maxMarks ?? 100,
      gradePoint: rule.gradePoint ?? rule.gpa ?? 0,
      remarks: rule.remarks || rule.description || ''
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditFormData({});
  };

  const saveEdit = async () => {
    const min = Number(editFormData.minPercent);
    const max = Number(editFormData.maxPercent);
    const gpa = Number(editFormData.gradePoint || 0);

    if (min > max) {
      return Swal.fire('Error', 'Minimum % cannot exceed Maximum %', 'warning');
    }

    setSaving(true);
    try {
      const payload = {
        grade: editFormData.grade.trim().toUpperCase(),
        minPercent: min,
        maxPercent: max,
        minMarks: min,
        maxMarks: max,
        gradePoint: gpa,
        gpa: gpa,
        remarks: editFormData.remarks.trim(),
        description: editFormData.remarks.trim(),
        schoolId: schoolId,
        updatedAt: new Date().toISOString()
      };

      if (editId && String(editId).length > 5) { // Assuming real ID is longer than just grade letter
        await updateRecord('gradingRules', editId, payload);
        Swal.fire('Updated', `Grade ${payload.grade} updated successfully!`, 'success');
      } else {
        // It was a default rule without real ID, just add it (and maybe user will delete others if they want)
        await addRecord('gradingRules', { ...payload, createdAt: new Date().toISOString() }, schoolId);
        Swal.fire('Created', `Grade ${payload.grade} saved successfully!`, 'success');
      }

      setEditId(null);
      fetchRules();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to update grading rule', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    const confirm = await Swal.fire({
      title: 'Reset to Standard Scale?',
      text: 'This will seed the standard A+ to F scale.',
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
    <div className="space-y-6 animate-fade-in pb-24 text-gray-100 max-w-7xl mx-auto">
      
      {/* Sleek Top Banner (Dark Theme) */}
      <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award size={32} className="text-white" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Grade Management</h1>
            <p className="text-xs text-blue-100 mt-0.5">Create and manage student grading ranges.</p>
          </div>
        </div>
        <button
          onClick={handleResetToDefaults}
          disabled={saving}
          className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
        >
          <Sliders size={14} />
          <span>Standard Scale</span>
        </button>
      </div>

      {/* TOP SECTION: ADD GRADING SCALE (Bulk Form) */}
      <GlassCard className="p-0 border border-dark-border shadow-xl overflow-hidden">
        <div className="p-4 border-b border-dark-border flex items-center justify-between bg-dark-card/50">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus size={16} className="text-blue-400" />
            Add Grading Scale
          </h2>
          <span className="text-[10px] font-bold px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md">
            {newRules.length} Row(s)
          </span>
        </div>
        
        <div className="p-4 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Headers */}
            <div className="grid grid-cols-12 gap-3 mb-2 text-[10px] font-bold text-dark-muted uppercase tracking-wider px-2">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-2">Grade</div>
              <div className="col-span-2">% From</div>
              <div className="col-span-2">% To</div>
              <div className="col-span-2">GPA / Status</div>
              <div className="col-span-2">Grade Remarks</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {newRules.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-dark-bg/50 border border-dark-border rounded-xl p-2">
                  <div className="col-span-1 flex justify-center">
                    <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="e.g. A+"
                      value={row.grade}
                      onChange={(e) => handleRowChange(idx, 'grade', e.target.value)}
                      className="w-full bg-transparent border border-dark-border rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="e.g. 90"
                      value={row.minPercent}
                      onChange={(e) => handleRowChange(idx, 'minPercent', e.target.value)}
                      className="w-full bg-transparent border border-dark-border rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={row.maxPercent}
                      onChange={(e) => handleRowChange(idx, 'maxPercent', e.target.value)}
                      className="w-full bg-transparent border border-dark-border rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 4.0"
                      value={row.gradePoint}
                      onChange={(e) => handleRowChange(idx, 'gradePoint', e.target.value)}
                      className="w-full bg-transparent border border-dark-border rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="e.g. Outstanding"
                      value={row.remarks}
                      onChange={(e) => handleRowChange(idx, 'remarks', e.target.value)}
                      className="w-full bg-transparent border border-dark-border rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => handleRemoveRow(idx)}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Remove Row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-dark-border flex items-center justify-between bg-dark-card/30">
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 text-xs font-bold text-dark-muted hover:text-white transition-colors"
            >
              <Plus size={14} className="text-white bg-dark-border rounded-full p-0.5" />
              Add More
            </button>
            <span className="text-[10px] text-dark-muted flex items-center gap-1">
              <Info size={12} /> Add all grading ranges before saving.
            </span>
          </div>
          <button
            onClick={handleBulkSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Add Grading</span>
          </button>
        </div>
      </GlassCard>

      {/* BOTTOM SECTION: ALL GRADES */}
      <GlassCard className="p-0 border border-dark-border shadow-xl overflow-hidden mt-6">
        <div className="p-4 border-b border-dark-border flex items-center justify-between bg-dark-card/50">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ListOrdered size={16} className="text-blue-400" />
            All Grades
          </h2>
          <span className="text-[10px] font-bold px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md">
            {rules.length} Grades
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-dark-bg/50 border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-wider font-bold">
                <th className="py-3 px-4 text-center w-12">#</th>
                <th className="py-3 px-4">Grade</th>
                <th className="py-3 px-4">From</th>
                <th className="py-3 px-4">To</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">GPA</th>
                <th className="py-3 px-4">Grade Remarks</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border text-dark-text">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-dark-muted text-xs">
                    <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                    Loading grades...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-dark-muted text-xs">
                    No grades found.
                  </td>
                </tr>
              ) : (
                rules.map((rule, idx) => {
                  const ruleId = rule.id || rule.grade;
                  const isEditing = editId === ruleId;
                  const min = rule.minPercent ?? rule.minMarks ?? 0;
                  const max = rule.maxPercent ?? rule.maxMarks ?? 100;
                  const gpa = rule.gradePoint ?? rule.gpa ?? 0;
                  const remarks = rule.remarks || rule.description || '—';
                  const isFail = (rule.grade || '').toUpperCase() === 'F' || min < 33;

                  if (isEditing) {
                    return (
                      <tr key={`edit-${ruleId}`} className="bg-blue-500/5">
                        <td className="py-3 px-4 text-center text-xs text-dark-muted">{idx + 1}</td>
                        <td className="py-3 px-2">
                          <input type="text" value={editFormData.grade} onChange={e => setEditFormData({...editFormData, grade: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1 text-xs text-white" />
                        </td>
                        <td className="py-3 px-2">
                          <input type="number" value={editFormData.minPercent} onChange={e => setEditFormData({...editFormData, minPercent: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1 text-xs text-white" />
                        </td>
                        <td className="py-3 px-2">
                          <input type="number" value={editFormData.maxPercent} onChange={e => setEditFormData({...editFormData, maxPercent: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1 text-xs text-white" />
                        </td>
                        <td className="py-3 px-2 text-xs text-dark-muted">Auto</td>
                        <td className="py-3 px-2">
                          <input type="number" step="0.1" value={editFormData.gradePoint} onChange={e => setEditFormData({...editFormData, gradePoint: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1 text-xs text-white" />
                        </td>
                        <td className="py-3 px-2">
                          <input type="text" value={editFormData.remarks} onChange={e => setEditFormData({...editFormData, remarks: e.target.value})} className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1 text-xs text-white" />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={saveEdit} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30" title="Save"><CheckCircle size={14}/></button>
                            <button onClick={cancelEdit} className="p-1.5 bg-dark-bg text-dark-muted border border-dark-border rounded hover:text-white" title="Cancel"><X size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={ruleId} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-4 text-center text-xs font-bold text-dark-muted">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-block px-3 py-1 rounded bg-blue-500/10 text-blue-400 font-bold text-xs">
                          {rule.grade}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-white text-xs">
                        {min}%
                      </td>
                      <td className="py-4 px-4 font-bold text-white text-xs">
                        {max}%
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 w-max ${
                          isFail ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          <ShieldCheck size={12} /> {isFail ? 'Failed' : 'Pass'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs font-bold text-dark-muted">
                        {Number(gpa).toFixed(1)}
                      </td>
                      <td className="py-4 px-4 text-xs text-dark-muted">
                        {remarks}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(rule)}
                            className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                            title="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(rule)}
                            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={12} />
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

    </div>
  );
};

export default GradingManagement;
