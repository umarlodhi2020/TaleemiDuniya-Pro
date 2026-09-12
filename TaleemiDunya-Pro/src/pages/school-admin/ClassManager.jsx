import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { PlusCircle, Trash2, Edit2, Loader2, ListTree, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Swal from 'sweetalert2';

const STANDARD_CLASSES = ['Playgroup', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const ClassManager = () => {
  const { userData } = useAuth();
  const { schoolData, schoolClasses } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [formData, setFormData] = useState({ id: '', name: '', order: '' });
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveClass = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    setLoading(true);
    try {
      if (isEditing) {
        await updateDoc(doc(db, 'classes', formData.id), {
          name: formData.name,
          order: Number(formData.order) || 99,
          updatedAt: serverTimestamp()
        });
        Swal.fire('Updated', 'Class updated successfully', 'success');
      } else {
        await addDoc(collection(db, 'classes'), {
          schoolId,
          name: formData.name,
          order: Number(formData.order) || 99,
          createdAt: serverTimestamp()
        });
        Swal.fire('Added', 'Class created successfully', 'success');
      }
      setShowAddForm(false);
      setFormData({ id: '', name: '', order: '' });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to save class', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cls) => {
    setFormData({ id: cls.id, name: cls.name, order: cls.order || '' });
    setIsEditing(true);
    setShowAddForm(true);
  };

  const handleDelete = async (id, name) => {
    const res = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete class ${name}? This won't delete its students, but might affect dropdowns.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it'
    });
    
    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'classes', id));
        Swal.fire('Deleted', 'Class removed.', 'success');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSuggestClasses = async () => {
    const res = await Swal.fire({
      title: 'Suggest Classes',
      text: 'Do you want to automatically create standard classes (Playgroup to 10th)? Existing classes will not be duplicated.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Yes, Create them'
    });

    if (res.isConfirmed) {
      setLoading(true);
      try {
        const existingNames = schoolClasses.map(c => c.name.toLowerCase());
        let added = 0;
        
        for (let i = 0; i < STANDARD_CLASSES.length; i++) {
          const clsName = STANDARD_CLASSES[i];
          if (!existingNames.includes(clsName.toLowerCase())) {
            await addDoc(collection(db, 'classes'), {
              schoolId,
              name: clsName,
              order: i + 1,
              createdAt: serverTimestamp()
            });
            added++;
          }
        }
        
        Swal.fire('Done', added + ' new classes were added automatically.', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to add standard classes', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto animate-fade-in pb-32">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-tight">Class Manager</h1>
          <p className="text-dark-muted mt-1 font-medium">Create and manage academic classes for your school</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleSuggestClasses} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all">
            <Sparkles size={18} /> Suggest Classes
          </button>
          <button onClick={() => { setIsEditing(false); setFormData({ id: '', name: '', order: '' }); setShowAddForm(!showAddForm); }} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 transition-all">
            <PlusCircle size={18} /> {showAddForm ? 'Close Form' : 'Add Custom Class'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <GlassCard className="p-6 border border-blue-500/20 bg-blue-500/5">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <ListTree className="text-blue-400" size={24} />
            {isEditing ? 'Edit Class' : 'Create New Class'}
          </h3>
          <form onSubmit={handleSaveClass} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-dark-muted mb-2">Class Name</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-dark-surface/50 border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="e.g. Nursery, 10th" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-muted mb-2">Sort Order (Optional)</label>
              <input type="number" value={formData.order} onChange={(e) => setFormData({...formData, order: e.target.value})} className="w-full bg-dark-surface/50 border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="e.g. 1" />
            </div>
            <div>
              <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all disabled:opacity-70 flex justify-center items-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : (isEditing ? 'Update Class' : 'Save Class')}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-surface/50 border-b border-dark-border">
              <tr>
                <th className="px-6 py-4 font-bold text-dark-muted text-sm uppercase tracking-wider">Sort Order</th>
                <th className="px-6 py-4 font-bold text-dark-muted text-sm uppercase tracking-wider">Class Name</th>
                <th className="px-6 py-4 font-bold text-dark-muted text-sm uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {schoolClasses.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-dark-muted">
                    No classes found. Click "Suggest Classes" to auto-generate!
                  </td>
                </tr>
              ) : (
                schoolClasses.map((cls, idx) => (
                  <tr key={cls.id || idx} className="hover:bg-dark-surface/30 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">
                      {cls.order || '-'}
                    </td>
                    <td className="px-6 py-4 text-white font-bold text-lg">
                      {cls.name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(cls)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(cls.id, cls.name)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all">
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

export default ClassManager;
