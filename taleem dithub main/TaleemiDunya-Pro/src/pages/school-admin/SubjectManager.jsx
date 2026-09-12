import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Search, Filter, Trash2, Edit, Save, X, Loader2 
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord, updateRecord, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import Swal from 'sweetalert2';

const SubjectManager = () => {
  const { userData } = useAuth();
  const { schoolClasses } = useSchool();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    subjectName: '',
    subjectCode: '',
    classId: '',
    subjectType: 'Core', // Core, Elective, Practical, Language
    totalMarks: 100,
    passingMarks: 40,
    creditHours: 1,
    isActive: true
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const classesList = schoolClasses.map(c => c.name);
  const subjectTypes = ['Core', 'Elective', 'Practical', 'Theory', 'Language', 'Computer', 'Islamic Studies', 'Other'];

  useEffect(() => {
    fetchSubjects();
  }, [userData]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const data = await getRecords('subjects', userData?.schoolId || 'default-school');
      setSubjects(data);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to fetch subjects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.subjectName || !formData.classId) {
      return Swal.fire('Error', 'Subject Name and Class are required', 'error');
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        totalMarks: Number(formData.totalMarks),
        passingMarks: Number(formData.passingMarks),
        creditHours: Number(formData.creditHours),
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateRecord('subjects', editingId, payload, userData?.schoolId || 'default-school');
        Swal.fire('Success', 'Subject updated successfully', 'success');
      } else {
        payload.createdAt = new Date().toISOString();
        await addRecord('subjects', payload, userData?.schoolId || 'default-school');
        Swal.fire('Success', 'Subject added successfully', 'success');
      }
      
      resetForm();
      fetchSubjects();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to save subject', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete subject: ${name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await deleteRecord('subjects', id, userData?.schoolId || 'default-school');
        setSubjects(prev => prev.filter(s => s.id !== id));
        Swal.fire('Deleted!', 'Subject has been deleted.', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to delete subject', 'error');
      }
    }
  };

  const handleEdit = (subject) => {
    setFormData({
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode || '',
      classId: subject.classId || '',
      subjectType: subject.subjectType || 'Core',
      totalMarks: subject.totalMarks || 100,
      passingMarks: subject.passingMarks || 40,
      creditHours: subject.creditHours || 1,
      isActive: subject.isActive ?? true
    });
    setEditingId(subject.id);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({
      subjectName: '',
      subjectCode: '',
      classId: '',
      subjectType: 'Core',
      totalMarks: 100,
      passingMarks: 40,
      creditHours: 1,
      isActive: true
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  // Filter Data
  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.subjectName?.toLowerCase().includes(searchTerm.toLowerCase()) || s.subjectCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === 'All' || s.classId === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <BookOpen className="text-primary-500" /> Subject Management
          </h1>
          <p className="text-dark-muted mt-1">Configure subjects, marks, and academic rules per class.</p>
        </div>
        {!showAddForm && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="premium-button-primary py-2.5 px-6 flex items-center gap-2"
          >
            <Plus size={18} /> Add New Subject
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <GlassCard className="p-8 border-t-4 border-t-primary-500 animate-slide-up">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {editingId ? <Edit size={20} className="text-amber-500" /> : <Plus size={20} className="text-primary-500" />}
              {editingId ? 'Edit Subject Details' : 'Register New Subject'}
            </h2>
            <button onClick={resetForm} className="p-2 hover:bg-dark-hover rounded-full text-dark-muted transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Subject Name *</label>
                <input 
                  type="text" required
                  value={formData.subjectName}
                  onChange={e => setFormData({...formData, subjectName: e.target.value})}
                  className="w-full premium-input"
                  placeholder="e.g. Mathematics"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Class *</label>
                <select 
                  required
                  value={formData.classId}
                  onChange={e => setFormData({...formData, classId: e.target.value})}
                  className="w-full premium-input"
                >
                  <option value="">Select Class</option>
                  {classesList.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Subject Type</label>
                <select 
                  value={formData.subjectType}
                  onChange={e => setFormData({...formData, subjectType: e.target.value})}
                  className="w-full premium-input"
                >
                  {subjectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Subject Code</label>
                <input 
                  type="text" 
                  value={formData.subjectCode}
                  onChange={e => setFormData({...formData, subjectCode: e.target.value})}
                  className="w-full premium-input"
                  placeholder="e.g. MTH-101"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Total Marks</label>
                <input 
                  type="number" required min="1"
                  value={formData.totalMarks}
                  onChange={e => setFormData({...formData, totalMarks: e.target.value})}
                  className="w-full premium-input"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Passing Marks</label>
                <input 
                  type="number" required min="1"
                  value={formData.passingMarks}
                  onChange={e => setFormData({...formData, passingMarks: e.target.value})}
                  className="w-full premium-input"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Credit Hours</label>
                <input 
                  type="number" required min="1" max="10"
                  value={formData.creditHours}
                  onChange={e => setFormData({...formData, creditHours: e.target.value})}
                  className="w-full premium-input"
                />
              </div>

              <div className="space-y-2 flex items-center pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    className="w-5 h-5 rounded border-dark-border bg-dark-bg text-primary-500 focus:ring-primary-500 focus:ring-offset-dark-card"
                  />
                  <span className="text-sm font-bold text-white">Active (Included in Results)</span>
                </label>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-dark-border">
              <button 
                type="button" onClick={resetForm}
                className="px-6 py-2.5 rounded-xl font-bold text-dark-muted hover:bg-dark-hover transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" disabled={saving}
                className="premium-button-primary px-8 py-2.5 flex items-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {editingId ? 'Update Subject' : 'Save Subject'}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* List / Data Table */}
      <GlassCard className="p-0 overflow-hidden">
        {/* Filters */}
        <div className="p-6 border-b border-dark-border bg-dark-bg/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search subjects..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="premium-input pl-10 w-full"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={18} className="text-dark-muted" />
            <select 
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="premium-input py-2"
            >
              <option value="All">All Classes</option>
              {classesList.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-dark-muted">
              <Loader2 size={30} className="animate-spin mx-auto mb-3 text-primary-500" />
              Loading Subjects...
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="p-12 text-center text-dark-muted">
              <BookOpen size={48} className="opacity-20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white">No Subjects Found</h3>
              <p className="text-sm mt-1">Add a new subject to get started.</p>
            </div>
          ) : (
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-dark-border text-dark-muted text-[10px] font-black uppercase tracking-[0.2em] bg-dark-bg/30">
                  <th className="py-4 px-6">Subject Info</th>
                  <th className="py-4 px-6">Class</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Marks (Tot/Pass)</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filteredSubjects.map(subject => (
                  <tr key={subject.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-white text-sm">{subject.subjectName}</p>
                      <p className="text-xs text-dark-muted font-mono mt-0.5">{subject.subjectCode || 'No Code'}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-md bg-dark-hover border border-dark-border text-xs font-bold text-white">
                        Class {subject.classId}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        subject.subjectType === 'Core' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        subject.subjectType === 'Practical' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        {subject.subjectType}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-white">
                        {subject.totalMarks} <span className="text-dark-muted font-normal text-xs">/ {subject.passingMarks}</span>
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      {subject.isActive ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(subject)}
                          className="p-2 hover:bg-dark-hover rounded-lg text-dark-muted hover:text-amber-400 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(subject.id, subject.subjectName)}
                          className="p-2 hover:bg-dark-hover rounded-lg text-dark-muted hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default SubjectManager;
