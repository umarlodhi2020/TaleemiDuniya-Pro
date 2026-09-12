import React, { useState, useEffect } from 'react';
import { getRecords, addRecord, updateRecord, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/common/GlassCard';
import { Plus, Trash2, Edit2, Loader2, Award, Info } from 'lucide-react';
import Swal from 'sweetalert2';

const GradingRules = () => {
  const { userData } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    minPercent: '',
    maxPercent: '',
    grade: '',
    gradePoint: '',
    remarks: ''
  });

  const schoolId = userData?.schoolId || 'default-school';

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

  const handleOpenModal = (rule = null) => {
    if (rule) {
      setFormData(rule);
      setEditId(rule.id);
    } else {
      setFormData({ minPercent: '', maxPercent: '', grade: '', gradePoint: '', remarks: '' });
      setEditId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateRecord('gradingRules', editId, { ...formData, updatedAt: new Date().toISOString() });
        Swal.fire('Updated', 'Grading rule updated successfully!', 'success');
      } else {
        await addRecord('gradingRules', { ...formData, schoolId, createdAt: new Date().toISOString() });
        Swal.fire('Created', 'Grading rule added successfully!', 'success');
      }
      setIsModalOpen(false);
      fetchRules();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to save grading rule.', 'error');
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
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to delete rule.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-dark-text">Grading Rules</h1>
          <p className="text-dark-muted mt-1">Configure global grading scales for the entire school.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="premium-button-primary py-2 px-4 flex items-center gap-2"
        >
          <Plus size={18} /> Add Grade Rule
        </button>
      </div>

      <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 flex gap-3 text-primary-400 text-sm items-start">
        <Info size={20} className="shrink-0 mt-0.5" />
        <p><strong>Note:</strong> These rules will be used automatically during Marks Entry to assign Grades (e.g. A+, B) and Remarks (e.g. Excellent, Good) based on the student's obtained percentage.</p>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 size={40} className="animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-dark-muted font-bold">Loading grading rules...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="py-20 text-center">
            <Award size={48} className="text-dark-muted opacity-20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Grading Rules Found</h3>
            <p className="text-dark-muted text-sm mb-6">Create a grading scale to automate marks calculation.</p>
            <button onClick={() => handleOpenModal()} className="premium-button-primary mx-auto text-sm py-2 px-4">
              Add First Rule
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-border text-dark-muted text-[10px] font-black uppercase tracking-[0.2em] bg-dark-bg/30">
                  <th className="py-4 px-6">Percentage Range</th>
                  <th className="py-4 px-6">Grade</th>
                  <th className="py-4 px-6">Grade Point (GPA)</th>
                  <th className="py-4 px-6">Remarks</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-mono font-bold text-white text-sm bg-dark-bg border border-dark-border px-3 py-1.5 rounded-lg">
                        {rule.minPercent}% - {rule.maxPercent}%
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`font-black text-xl px-2 ${rule.grade.includes('F') ? 'text-red-500' : 'text-green-400'}`}>
                        {rule.grade}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-white">{rule.gradePoint || '--'}</td>
                    <td className="py-4 px-6 text-dark-muted">{rule.remarks}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(rule)}
                          className="p-2 rounded-xl bg-dark-bg border border-dark-border text-dark-muted hover:text-blue-400 hover:border-blue-500 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(rule.id)}
                          className="p-2 rounded-xl bg-dark-bg border border-dark-border text-dark-muted hover:text-red-400 hover:border-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <GlassCard className="w-full max-w-md p-6 animate-scale-in">
            <h3 className="text-xl font-black text-white mb-6">
              {editId ? 'Edit Grading Rule' : 'Add New Grading Rule'}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-dark-muted uppercase mb-1.5 block">Min % (e.g. 90)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.minPercent}
                    onChange={e => setFormData({...formData, minPercent: e.target.value})}
                    className="w-full premium-input"
                    placeholder="Min %"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-dark-muted uppercase mb-1.5 block">Max % (e.g. 100)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.maxPercent}
                    onChange={e => setFormData({...formData, maxPercent: e.target.value})}
                    className="w-full premium-input"
                    placeholder="Max %"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-dark-muted uppercase mb-1.5 block">Grade (e.g. A+)</label>
                  <input 
                    type="text" 
                    required
                    value={formData.grade}
                    onChange={e => setFormData({...formData, grade: e.target.value.toUpperCase()})}
                    className="w-full premium-input"
                    placeholder="Grade"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-dark-muted uppercase mb-1.5 block">Grade Point (Optional)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={formData.gradePoint}
                    onChange={e => setFormData({...formData, gradePoint: e.target.value})}
                    className="w-full premium-input"
                    placeholder="GPA"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-dark-muted uppercase mb-1.5 block">Remarks (e.g. Excellent)</label>
                <input 
                  type="text" 
                  required
                  value={formData.remarks}
                  onChange={e => setFormData({...formData, remarks: e.target.value})}
                  className="w-full premium-input"
                  placeholder="Remarks"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 premium-button-secondary py-2"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 premium-button-primary py-2"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default GradingRules;
