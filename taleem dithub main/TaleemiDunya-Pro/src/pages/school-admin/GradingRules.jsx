import React, { useState, useEffect } from 'react';
import { getRecords, addRecord, updateRecord, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Edit2, Info, Save, GraduationCap, List, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

const GradingRules = () => {
  const { userData } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  const schoolId = userData?.schoolId || 'default-school';

  const [formRows, setFormRows] = useState([
    { id: Date.now().toString(), grade: '', minPercent: '', maxPercent: '', status: '', comments: '', remarks: '' }
  ]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchRules();
  }, [schoolId]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await getRecords('gradingRules', schoolId);
      // Sort by maxPercent descending
      data.sort((a, b) => Number(b.maxPercent) - Number(a.maxPercent));
      setRules(data);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Failed to fetch grading rules.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    setFormRows([...formRows, { id: Date.now().toString(), grade: '', minPercent: '', maxPercent: '', status: '', comments: '', remarks: '' }]);
  };

  const handleRemoveRow = (id) => {
    if (formRows.length > 1) {
      setFormRows(formRows.filter(r => r.id !== id));
    }
  };

  const handleRowChange = (id, field, value) => {
    setFormRows(formRows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleEditClick = (rule) => {
    setFormRows([{
      id: rule.id,
      grade: rule.grade || '',
      minPercent: rule.minPercent || '',
      maxPercent: rule.maxPercent || '',
      status: rule.status || '',
      comments: rule.comments || '',
      remarks: rule.remarks || ''
    }]);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    // Validate
    for (const r of formRows) {
      if (!r.grade || r.minPercent === '' || r.maxPercent === '') {
        Swal.fire('Error', 'Grade, % From, and % To are required for all rows.', 'error');
        return;
      }
    }

    try {
      if (isEditing) {
        const row = formRows[0];
        await updateRecord('gradingRules', row.id, { 
          grade: row.grade, 
          minPercent: row.minPercent, 
          maxPercent: row.maxPercent, 
          status: row.status || '', 
          comments: row.comments || '', 
          remarks: row.remarks || '', 
          updatedAt: new Date().toISOString() 
        });
        Swal.fire('Updated', 'Grading rule updated successfully!', 'success');
      } else {
        const promises = formRows.map(row => 
          addRecord('gradingRules', { 
            schoolId,
            grade: row.grade, 
            minPercent: row.minPercent, 
            maxPercent: row.maxPercent, 
            status: row.status || '', 
            comments: row.comments || '', 
            remarks: row.remarks || '', 
            createdAt: new Date().toISOString() 
          })
        );
        await Promise.all(promises);
        Swal.fire('Created', 'Grading rules added successfully!', 'success');
      }
      
      setFormRows([{ id: Date.now().toString(), grade: '', minPercent: '', maxPercent: '', status: '', comments: '', remarks: '' }]);
      setIsEditing(false);
      fetchRules();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to save grading rules.', 'error');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await deleteRecord('gradingRules', id);
        Swal.fire('Deleted!', 'Rule has been deleted.', 'success');
        fetchRules();
        if (isEditing && formRows[0]?.id === id) {
          setFormRows([{ id: Date.now().toString(), grade: '', minPercent: '', maxPercent: '', status: '', comments: '', remarks: '' }]);
          setIsEditing(false);
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to delete rule.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Header matching screenshot */}
      <div className="bg-primary-600 rounded-xl p-6 text-white shadow-lg flex items-center gap-4">
        <div className="p-3 bg-white/20 rounded-xl">
          <GraduationCap size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-black mb-1">Grade Management</h1>
          <p className="text-white/80 text-sm">Create and manage student grading ranges.</p>
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between border-b border-dark-border pb-4 mb-4">
          <div className="flex items-center gap-2 text-white font-bold">
            <div className="bg-primary-500/20 text-primary-400 p-1.5 rounded-lg">
              <Plus size={18} />
            </div>
            {isEditing ? 'Edit Grading Scale' : 'Add Grading Scale'}
          </div>
          <div className="text-xs font-black bg-primary-500/20 text-primary-400 px-3 py-1 rounded-full">
            {formRows.length} Grade{formRows.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="overflow-x-auto overflow-visible">
          {/* Form Table Header */}
          <div className="min-w-[900px] grid grid-cols-[40px_1fr_1fr_1fr_1.5fr_1.5fr_1.5fr_60px] gap-3 text-[10px] font-black text-dark-muted uppercase tracking-wider mb-2 px-2">
            <div className="text-center">#</div>
            <div>Grade</div>
            <div>% From</div>
            <div>% To</div>
            <div>Status</div>
            <div>Comments</div>
            <div>Grade Remarks</div>
            <div className="text-center">Action</div>
          </div>

          {/* Form Rows */}
          <div className="min-w-[900px] space-y-3">
            {formRows.map((row, index) => (
              <div key={row.id} className="grid grid-cols-[40px_1fr_1fr_1fr_1.5fr_1.5fr_1.5fr_60px] gap-3 items-center px-2">
                <div className="text-center font-bold text-primary-400 text-xs">{index + 1}</div>
                <input 
                  type="text" 
                  placeholder="e.g. A+" 
                  value={row.grade} 
                  onChange={e => handleRowChange(row.id, 'grade', e.target.value.toUpperCase())}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500 outline-none" 
                />
                <input 
                  type="number" 
                  placeholder="e.g. 90" 
                  value={row.minPercent} 
                  onChange={e => handleRowChange(row.id, 'minPercent', e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500 outline-none" 
                />
                <input 
                  type="number" 
                  placeholder="e.g. 100" 
                  value={row.maxPercent} 
                  onChange={e => handleRowChange(row.id, 'maxPercent', e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500 outline-none" 
                />
                <select 
                  value={row.status} 
                  onChange={e => handleRowChange(row.id, 'status', e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500 outline-none appearance-none"
                >
                  <option value="">Select Status</option>
                  <option value="Pass">Pass</option>
                  <option value="Failed">Failed</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Optional" 
                  value={row.comments} 
                  onChange={e => handleRowChange(row.id, 'comments', e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500 outline-none" 
                />
                <input 
                  type="text" 
                  placeholder="e.g. Outstanding" 
                  value={row.remarks} 
                  onChange={e => handleRowChange(row.id, 'remarks', e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500 outline-none" 
                />
                <div className="flex justify-center">
                  <button 
                    onClick={() => handleRemoveRow(row.id)}
                    disabled={formRows.length === 1}
                    className={`p-2 rounded-lg transition-colors ${formRows.length === 1 ? 'opacity-30 cursor-not-allowed text-dark-muted' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-dark-border pt-4">
          <div>
            {!isEditing && (
              <button 
                onClick={handleAddRow}
                className="flex items-center gap-1.5 text-xs font-bold text-dark-muted hover:text-white transition-colors mb-2"
              >
                <Plus size={14} /> Add More
              </button>
            )}
            <p className="text-[10px] text-dark-muted flex items-center gap-1.5">
              <Info size={12}/> Add all grading ranges before saving.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isEditing && (
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setFormRows([{ id: Date.now().toString(), grade: '', minPercent: '', maxPercent: '', status: '', comments: '', remarks: '' }]);
                }}
                className="premium-button-secondary py-2 px-6"
              >
                Cancel
              </button>
            )}
            <button onClick={handleSave} className="premium-button-primary py-2 px-6 flex items-center gap-2">
              <Save size={16} /> {isEditing ? 'Update Grading' : 'Add Grading'}
            </button>
          </div>
        </div>
      </div>

      {/* All Grades Section */}
      <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-dark-border">
          <div className="flex items-center gap-2 text-white font-bold">
            <div className="bg-blue-500/20 text-blue-400 p-1.5 rounded-lg">
              <List size={18} />
            </div>
            All Grades
          </div>
          <div className="text-xs font-black bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
            {rules.length} Grade{rules.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 size={40} className="animate-spin text-primary-500 mx-auto mb-4" />
              <p className="text-dark-muted font-bold">Loading grading rules...</p>
            </div>
          ) : (
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="bg-dark-bg/30 text-[10px] font-black text-dark-muted uppercase tracking-wider border-b border-dark-border">
                  <th className="py-4 px-6 text-center">#</th>
                  <th className="py-4 px-6 text-center">Grade</th>
                  <th className="py-4 px-6 text-center">From</th>
                  <th className="py-4 px-6 text-center">To</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6">Comments</th>
                  <th className="py-4 px-6">Grade Remarks</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {rules.length === 0 ? (
                  <tr><td colSpan="8" className="py-10 text-center text-dark-muted">No grading rules found</td></tr>
                ) : (
                  rules.map((rule, idx) => (
                    <tr key={rule.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 text-center font-bold text-dark-muted">{idx + 1}</td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-block px-3 py-1 bg-primary-500/20 text-primary-400 font-bold rounded-md min-w-[40px] text-center">
                          {rule.grade}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-white">{rule.minPercent}%</td>
                      <td className="py-4 px-6 text-center font-bold text-white">{rule.maxPercent}%</td>
                      <td className="py-4 px-6 text-center">
                        {rule.status === 'Pass' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                            <CheckCircle2 size={12} /> Pass
                          </span>
                        ) : rule.status === 'Failed' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                            <XCircle size={12} /> Failed
                          </span>
                        ) : (
                          <span className="text-dark-muted">--</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-sm text-dark-muted">{rule.comments || '--'}</td>
                      <td className="py-4 px-6 text-sm text-dark-muted">{rule.remarks || '--'}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEditClick(rule)} 
                            className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(rule.id)} 
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors"
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
          )}
        </div>
      </div>
    </div>
  );
};

export default GradingRules;
