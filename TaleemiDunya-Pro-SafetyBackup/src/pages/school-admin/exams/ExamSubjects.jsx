import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getRecords, addRecord, updateRecord, deleteRecord } from '../../../services/db';
import Swal from 'sweetalert2';

const DEFAULT_SUBJECTS = [
  'Biology',
  'Chemistry',
  'Computer',
  'Drawing',
  'English',
  'G.K + Reader',
  'Islamiat',
  'Madarsa',
  'Math',
  'Pakistan Study',
  'Physics',
  'Poem + Islamiat',
  'Science',
  'Sindhi',
  'Social Study',
  'Urdu'
];

const ExamSubjects = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [subjectName, setSubjectName] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadSubjects();
  }, [schoolId]);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const data = await getRecords('subjects', schoolId);
      if (data && data.length > 0) {
        setSubjects(data);
      } else {
        // Fallback default list if database is empty
        setSubjects(DEFAULT_SUBJECTS.map((name, idx) => ({
          id: `default_${idx + 1}`,
          subjectName: name,
          name: name
        })));
      }
    } catch (err) {
      console.error('Error loading subjects:', err);
      setSubjects(DEFAULT_SUBJECTS.map((name, idx) => ({
        id: `default_${idx + 1}`,
        subjectName: name,
        name: name
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    const trimmed = subjectName.trim();
    if (!trimmed) {
      return Swal.fire('Error', 'Please enter a Subject Name', 'warning');
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update existing
        const isDefault = editingId.startsWith('default_');
        if (isDefault) {
          // Add as new real record
          await addRecord('subjects', {
            subjectName: trimmed,
            name: trimmed,
            createdAt: new Date().toISOString()
          }, schoolId);
        } else {
          await updateRecord('subjects', editingId, {
            subjectName: trimmed,
            name: trimmed,
            updatedAt: new Date().toISOString()
          }, schoolId);
        }

        Swal.fire({
          title: 'Updated!',
          text: `Subject updated successfully.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1f37',
          color: '#fff'
        });
      } else {
        // Add new subject
        await addRecord('subjects', {
          subjectName: trimmed,
          name: trimmed,
          createdAt: new Date().toISOString()
        }, schoolId);

        Swal.fire({
          title: 'Success!',
          text: `Subject "${trimmed}" added successfully.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1f37',
          color: '#fff'
        });
      }

      setSubjectName('');
      setEditingId(null);
      loadSubjects();
    } catch (err) {
      console.error('Error saving subject:', err);
      Swal.fire('Error', 'Failed to save subject', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subject) => {
    setSubjectName(subject.subjectName || subject.name || '');
    setEditingId(subject.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setSubjectName('');
    setEditingId(null);
  };

  const handleDelete = async (subject) => {
    const sName = subject.subjectName || subject.name;
    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete subject "${sName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      background: '#1a1f37',
      color: '#fff'
    });

    if (confirm.isConfirmed) {
      try {
        if (!subject.id.startsWith('default_')) {
          await deleteRecord('subjects', subject.id, schoolId);
        }
        setSubjects(prev => prev.filter(s => s.id !== subject.id));
        Swal.fire({
          title: 'Deleted!',
          text: 'Subject has been removed.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1f37',
          color: '#fff'
        });
      } catch (err) {
        console.error('Error deleting subject:', err);
        Swal.fire('Error', 'Failed to delete subject', 'error');
      }
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto font-sans text-gray-800 animate-fade-in pb-24">
      
      {/* 🏷️ Top Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Subject Master
        </h1>
      </div>

      {/* 🟦 1. ADD SUBJECT CARD (Blue Header Bar matching Photo 1) */}
      <div className="bg-dark-card border border-dark-border rounded-xl shadow-xl overflow-hidden">
        <div className="bg-[#0070f3] text-white px-5 py-3 font-black text-sm md:text-base flex items-center justify-between shadow-md">
          <span>{editingId ? 'Edit Subject' : 'Add Subject'}</span>
          {editingId && (
            <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded font-bold">
              Editing Mode
            </span>
          )}
        </div>

        <form onSubmit={handleSaveSubject} className="p-5 md:p-6 space-y-4">
          <div>
            <label className="block text-xs md:text-sm font-bold text-dark-text mb-2">
              Subject Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Biology, Mathematics, English..."
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full px-4 py-2.5 bg-dark-bg/90 border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-dark-muted"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#0070f3] hover:bg-blue-600 active:scale-95 text-white font-bold text-sm rounded-lg shadow-md transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update Subject' : 'Add Subject'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 🟩 2. ALL SUBJECTS CARD (Green Header Bar matching Photo 1) */}
      <div className="bg-dark-card border border-dark-border rounded-xl shadow-xl overflow-hidden">
        <div className="bg-[#198754] text-white px-5 py-3 font-black text-sm md:text-base flex items-center justify-between shadow-md">
          <span>All Subjects</span>
          <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded font-bold">
            {subjects.length} Total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-dark-border text-dark-muted text-xs uppercase font-bold tracking-wider">
                <th className="py-3 px-4 w-16 text-center">#</th>
                <th className="py-3 px-6">Subject Name</th>
                <th className="py-3 px-6 text-right w-44">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border text-white">
              {loading ? (
                <tr>
                  <td colSpan="3" className="text-center py-12 text-dark-muted text-sm">
                    Loading subjects...
                  </td>
                </tr>
              ) : subjects.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-12 text-dark-muted text-sm">
                    No subjects found. Add one using the form above.
                  </td>
                </tr>
              ) : (
                subjects.map((subject, index) => (
                  <tr 
                    key={subject.id || index}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-bold text-dark-muted text-xs">
                      {index + 1}
                    </td>
                    <td className="py-3 px-6 font-semibold text-white">
                      {subject.subjectName || subject.name}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 🟦 Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleEdit(subject)}
                          className="px-3.5 py-1 bg-[#0d6efd] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs rounded transition-all shadow"
                        >
                          Edit
                        </button>

                        {/* 🟥 Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(subject)}
                          className="px-3.5 py-1 bg-[#dc3545] hover:bg-red-600 active:scale-95 text-white font-bold text-xs rounded transition-all shadow"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default ExamSubjects;
