import React, { useState, useEffect } from 'react';
import { Search, User, Phone, Mail, Award, BookOpen, Clock, X, Plus, Save } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const Students = () => {
  const { userData } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Add student form modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    rollNumber: '',
    class: '',
    section: '',
    phone: '',
    status: 'Active'
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getRecords('students', userData?.schoolId || 'default-school');
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [userData]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.class) return;
    setSaving(true);
    try {
      const schoolId = userData?.schoolId || 'default-school';
      const result = await addRecord('students', formData, schoolId);
      if (result.success) {
        alert('Student registered successfully!');
        setShowAddModal(false);
        setFormData({
          name: '',
          fatherName: '',
          rollNumber: '',
          class: '',
          section: '',
          phone: '',
          status: 'Active'
        });
        fetchStudents();
      } else {
        alert('Error: ' + result.error.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error adding student');
    } finally {
      setSaving(false);
    }
  };

  const filtered = students.filter(s => {
    const q = (searchTerm || '').toLowerCase().trim();
    if (!q) return true;
    return (
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.rollNumber || '').toLowerCase().includes(q) ||
      String(s.class || '').toLowerCase().includes(q) ||
      String(s.section || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">My Students</h1>
          <p className="text-dark-muted mt-1">Manage and view details of students assigned to your classes.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="premium-button-primary flex items-center gap-2"
        >
          <Plus size={18} /> Add Student
        </button>
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold">Assigned Class List</h2>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, roll no, class..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full premium-input pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-dark-muted">Loading students...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-dark-muted border-dashed border-2 border-dark-border rounded-xl">
            <User size={40} className="mx-auto opacity-30 mb-3" />
            <p className="font-bold">No students found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(s => (
              <GlassCard 
                key={s.id} 
                className="p-5 hover:border-primary-500/30 transition-all cursor-pointer group"
                onClick={() => setSelectedStudent(s)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-all font-bold">
                    {s.name?.charAt(0)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-bold text-white group-hover:text-primary-400 transition-colors">{s.name}</h3>
                    <p className="text-xs text-dark-muted">Roll No: <span className="font-mono text-white">{s.rollNumber || 'N/A'}</span></p>
                    <div className="flex gap-2 pt-2">
                      <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-white/5 text-primary-400">
                        Class {s.class}
                      </span>
                      {s.section && (
                        <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-white/5 text-secondary-400">
                          Sec {s.section}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="p-8 w-full max-w-2xl animate-scale-up relative">
            <button 
              onClick={() => setSelectedStudent(null)} 
              className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-xl text-dark-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col md:flex-row gap-6 items-start pb-6 border-b border-dark-border">
              <div className="w-20 h-20 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-3xl font-bold text-primary-500">
                {selectedStudent.name?.charAt(0)}
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{selectedStudent.name}</h2>
                <div className="flex flex-wrap gap-3">
                  <span className="text-xs font-bold px-3 py-1 bg-white/5 rounded-lg text-primary-400">Class {selectedStudent.class} {selectedStudent.section ? `• Sec ${selectedStudent.section}` : ''}</span>
                  <span className="text-xs font-bold px-3 py-1 bg-white/5 rounded-lg text-dark-muted font-mono">ID: {selectedStudent.rollNumber || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-primary-500 uppercase tracking-widest flex items-center gap-2">
                  <User size={16} /> Parent Details
                </h3>
                <div className="space-y-2 text-sm text-dark-muted">
                  <p><strong className="text-white">Father Name:</strong> {selectedStudent.fatherName || 'N/A'}</p>
                  <p className="flex items-center gap-2"><Phone size={14}/> {selectedStudent.parentPhone || selectedStudent.phone || 'N/A'}</p>
                  <p className="flex items-center gap-2"><Mail size={14}/> {selectedStudent.parentEmail || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-secondary-500 uppercase tracking-widest flex items-center gap-2">
                  <Award size={16} /> Academic Summary
                </h3>
                <div className="space-y-2 text-sm text-dark-muted">
                  <p className="flex items-center gap-2"><BookOpen size={14}/> <span className="text-white">Enrollment Date:</span> {selectedStudent.enrollmentDate || 'N/A'}</p>
                  <p className="flex items-center gap-2"><Clock size={14}/> <span className="text-white">Attendance Rate:</span> {selectedStudent.attendanceRate || '95%'}</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="p-8 w-full max-w-xl animate-scale-up relative">
            <button 
              onClick={() => setShowAddModal(false)} 
              className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-xl text-dark-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <User className="text-primary-500" size={24} /> Register Student
            </h2>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Student Name</label>
                  <input 
                    type="text" 
                    className="w-full premium-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required 
                    placeholder="Full Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Father's Name</label>
                  <input 
                    type="text" 
                    className="w-full premium-input"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({...formData, fatherName: e.target.value})}
                    required 
                    placeholder="Father Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Roll Number / ID</label>
                  <input 
                    type="text" 
                    className="w-full premium-input"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                    required 
                    placeholder="e.g. L-101"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Class</label>
                  <select 
                    className="w-full premium-input bg-dark-card"
                    value={formData.class}
                    onChange={(e) => setFormData({...formData, class: e.target.value})}
                    required
                  >
                    <option value="">Select Class</option>
                    <option value="9">Class 9</option>
                    <option value="10">Class 10</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Section</label>
                  <input 
                    type="text" 
                    className="w-full premium-input"
                    value={formData.section}
                    onChange={(e) => setFormData({...formData, section: e.target.value})}
                    placeholder="e.g. A"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-dark-muted uppercase tracking-widest px-1">Parent Phone</label>
                  <input 
                    type="text" 
                    className="w-full premium-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="03xx-xxxxxxx"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="premium-button-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="premium-button-primary flex items-center gap-2"
                >
                  <Save size={16} /> {saving ? 'Registering...' : 'Register Student'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default Students;
