import React, { useState, useEffect } from 'react';
import { 
 ArrowLeft, 
 Save, 
 Users, 
 Loader2, 
 Search,
 CheckCircle2,
 AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, batchWrite } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const BulkStudentEdit = () => {
 const navigate = useNavigate();
 const { userData, loading: authLoading } = useAuth();
 const { classesList = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] } = useSchool();
 const schoolId = userData?.schoolId || 'default-school';

 const [students, setStudents] = useState([]);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 const [editedIds, setEditedIds] = useState(new Set());
 const [successMessage, setSuccessMessage] = useState('');

 useEffect(() => {
 if (schoolId && !authLoading) {
 fetchStudents();
 }
 }, [schoolId, authLoading]);

 const fetchStudents = async () => {
 setLoading(true);
 try {
 const data = await getRecords('students', schoolId);
 // Sort students by name alphabetically
 const sortedData = data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
 setStudents(sortedData);
 } catch (error) {
 console.error("Error fetching students:", error);
 } finally {
 setLoading(false);
 }
 };

 const handleChange = (id, field, value) => {
 setStudents(prev => 
 prev.map(student => 
 student.id === id ? { ...student, [field]: value } : student
 )
 );
 setEditedIds(prev => new Set(prev).add(id));
 };

 const handleSave = async () => {
 if (editedIds.size === 0) {
 alert("No changes detected.");
 return;
 }

 if (!window.confirm(`Are you sure you want to save changes for ${editedIds.size} students?`)) {
 return;
 }

 setSaving(true);
 setSuccessMessage('');

 try {
 const recordsToUpdate = students
 .filter(s => editedIds.has(s.id))
 .map(s => {
 // Clean up undefined values before saving to Firestore
 const cleaned = { ...s };
 Object.keys(cleaned).forEach(key => {
 if (cleaned[key] === undefined) delete cleaned[key];
 });
 return cleaned;
 });

 const result = await batchWrite('students', recordsToUpdate, schoolId);

 if (result.success) {
 setSuccessMessage(`Successfully updated ${result.count} students!`);
 setEditedIds(new Set()); // Clear edited tracking
 
 // Hide success message after 3 seconds
 setTimeout(() => setSuccessMessage(''), 3000);
 } else {
 alert("Error saving data: " + result.error?.message);
 }
 } catch (error) {
 console.error("Error in bulk update:", error);
 alert("Operation failed.");
 } finally {
 setSaving(false);
 }
 };

 // Filter students by search term
 const filteredStudents = students.filter(s => 
 (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
 (s.fatherName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
 (s.rollNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
 );

 if (authLoading || loading) {
 return (
 <div className="min-h-[50vh] flex items-center justify-center">
 <div className="text-center">
 <Loader2 className="w-10 h-10 mx-auto text-primary-500 animate-spin" />
 <p className="text-dark-muted text-sm mt-3">Loading students...</p>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6 animate-fade-in pb-10">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <button 
 onClick={() => navigate('/school-admin/students')}
 className="p-2 hover:bg-dark-hover rounded-xl text-dark-muted transition-all cursor-pointer"
 >
 <ArrowLeft size={20} />
 </button>
 <div>
 <h1 className="text-3xl font-black flex items-center gap-3">
 <Users className="text-primary-500" size={32} />
 Bulk Edit Students
 </h1>
 <p className="text-dark-muted text-sm mt-1">
 Easily update multiple student records at once like an Excel sheet.
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 {successMessage && (
 <span className="text-green-400 text-xs font-bold flex items-center gap-1 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20">
 <CheckCircle2 size={16} /> {successMessage}
 </span>
 )}
 
 {editedIds.size > 0 && !successMessage && (
 <span className="text-amber-400 text-xs font-bold flex items-center gap-1 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
 <AlertTriangle size={16} /> Unsaved changes ({editedIds.size})
 </span>
 )}

 <button 
 onClick={handleSave}
 disabled={editedIds.size === 0 || saving}
 className="premium-button-primary py-2 px-5 text-sm font-bold flex items-center gap-2 disabled:opacity-50"
 >
 {saving ? (
 <><Loader2 size={18} className="animate-spin" /> Saving...</>
 ) : (
 <><Save size={18} /> Save Changes</>
 )}
 </button>
 </div>
 </div>

 <GlassCard className="p-4">
 <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
 <div className="relative w-full md:w-96">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
 <input 
 type="text" 
 placeholder="Search by Name, Father's Name or Roll No..." 
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full premium-input pl-12"
 />
 </div>
 <div className="text-xs text-dark-muted font-bold px-4 py-2 bg-dark-hover rounded-lg border border-dark-border">
 Showing {filteredStudents.length} of {students.length} students
 </div>
 </div>

 <div className="overflow-x-auto border border-dark-border rounded-xl">
 <table className="w-full text-left border-collapse text-xs">
 <thead className="bg-dark-bg text-dark-muted sticky top-0 uppercase font-bold text-[10px] tracking-wider z-10 border-b border-dark-border">
 <tr>
 <th className="p-3 w-10 text-center">#</th>
 <th className="p-3 min-w-[80px]">Roll No</th>
 <th className="p-3 min-w-[150px]">Student Name</th>
 <th className="p-3 min-w-[150px]">Father's Name</th>
 <th className="p-3 min-w-[150px]">Mother's Name</th>
 <th className="p-3 min-w-[150px]">Father CNIC</th>
 <th className="p-3 min-w-[120px]">DOB</th>
 <th className="p-3 min-w-[120px]">Phone</th>
 <th className="p-3 min-w-[100px]">Class</th>
 <th className="p-3 min-w-[80px]">Section</th>
 <th className="p-3 min-w-[100px]">Monthly Fee</th>
 <th className="p-3 min-w-[100px]">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-dark-border font-medium">
 {filteredStudents.length > 0 ? (
 filteredStudents.map((student, idx) => (
 <tr key={student.id} className={`hover:bg-dark-hover/50 transition-colors ${editedIds.has(student.id) ? 'bg-primary-500/5' : ''}`}>
 <td className="p-3 text-center text-dark-muted">{idx + 1}</td>
 <td className="p-2">
 <input 
 type="text" 
 value={student.rollNumber || ''} 
 onChange={(e) => handleChange(student.id, 'rollNumber', e.target.value)}
 className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 focus:border-primary-500 focus:outline-none"
 />
 </td>
 <td className="p-2">
 <input 
 type="text" 
 value={student.name || ''} 
 onChange={(e) => handleChange(student.id, 'name', e.target.value)}
 className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 focus:border-primary-500 focus:outline-none"
 />
 </td>
 <td className="p-2">
 <input 
 type="text" 
 value={student.fatherName || ''} 
 onChange={(e) => handleChange(student.id, 'fatherName', e.target.value)}
 className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 focus:border-primary-500 focus:outline-none"
 />
 </td>
 <td className="p-2">
 <input 
 type="text" 
 value={student.motherName || ''} 
 onChange={(e) => handleChange(student.id, 'motherName', e.target.value)}
 className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 focus:border-primary-500 focus:outline-none"
 />
 </td>
 <td className="p-2">
 <input 
 type="text" 
 value={student.fatherCnic || student.cnic || ''} 
 onChange={(e) => handleChange(student.id, 'fatherCnic', e.target.value)}
 className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 focus:border-primary-500 focus:outline-none"
 />
 </td>
 <td className="p-2">
 <input 
 type="date" 
 value={student.dob || ''} 
 onChange={(e) => handleChange(student.id, 'dob', e.target.value)}
 className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 focus:border-primary-500 focus:outline-none"
 />
 </td>
 <td className="p-2">
 <input 
 type="tel" 
 value={student.phone || ''} 
 onChange={(e) => handleChange(student.id, 'phone', e.target.value)}
 className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 focus:border-primary-500 focus:outline-none"
 />
 </td>
 <td className="p-2">
 <select 
 value={student.class || ''} 
 onChange={(e) => handleChange(student.id, 'class', e.target.value)}
 className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 focus:border-primary-500 focus:outline-none text-white appearance-none"
 >
 <option value="">Select</option>
 {classesList.map(c => (
 <option key={c} value={c}>{c}</option>
 ))}
 </select>
 </td>
 <td className="p-2">
 <select 
 value={student.section || ''} 
 onChange={(e) => handleChange(student.id, 'section', e.target.value)}
 className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 focus:border-primary-500 focus:outline-none text-white appearance-none"
 >
 <option value="">N/A</option>
 <option value="A">A</option>
 <option value="B">B</option>
 <option value="C">C</option>
 <option value="D">D</option>
 </select>
 </td>
 <td className="p-2">
 <input 
 type="number" 
 value={student.monthlyFee || ''} 
 onChange={(e) => handleChange(student.id, 'monthlyFee', e.target.value)}
 className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 focus:border-primary-500 focus:outline-none"
 />
 </td>
 <td className="p-2">
 <select 
 value={student.status || 'Active'} 
 onChange={(e) => handleChange(student.id, 'status', e.target.value)}
 className={`w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 focus:border-primary-500 focus:outline-none appearance-none ${
 student.status === 'Active' ? 'text-green-400' : 
 student.status === 'Graduated' ? 'text-blue-400' : 'text-red-400'
 }`}
 >
 <option value="Active">Active</option>
 <option value="Suspended">Suspended</option>
 <option value="Graduated">Graduated</option>
 <option value="Left">Left</option>
 </select>
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan="12" className="p-8 text-center text-dark-muted">
 No students found matching your search.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </GlassCard>
 </div>
 );
};

export default BulkStudentEdit;

