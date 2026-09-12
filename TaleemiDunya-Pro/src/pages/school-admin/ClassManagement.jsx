import React, { useState } from 'react';
import { 
 BookOpen, Plus, Edit2, Trash2, ArrowLeft, Loader2, DollarSign, 
 CheckCircle, XCircle, Shield, RefreshCw, Layers, Sparkles, AlertCircle, Search, Save, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { addRecord, updateRecord, deleteRecord, upsertRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const ClassManagement = () => {
 const navigate = useNavigate();
 const { userData } = useAuth();
 const { schoolClasses, classFees = {}, classesLoading } = useSchool();
 const schoolId = userData?.schoolId || 'default-school';

 const [loading, setLoading] = useState(false);
 const [initializing, setInitializing] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 const [editingId, setEditingId] = useState(null);

 const initialFormState = {
 name: '',
 order: '1',
 monthlyFee: '',
 admissionFee: '',
 annualFee: '',
 otherFee: '',
 sections: 'A, B',
 status: 'active'
 };

 const [formData, setFormData] = useState(initialFormState);

 const handleInputChange = (e) => {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!formData.name.trim()) {
 alert('Please enter a Class Name.');
 return;
 }
 setLoading(true);
 try {
 const payload = {
 name: formData.name.trim(),
 order: Number(formData.order) || 1,
 monthlyFee: Number(formData.monthlyFee) || 0,
 admissionFee: Number(formData.admissionFee) || 0,
 annualFee: Number(formData.annualFee) || 0,
 otherFee: Number(formData.otherFee) || 0,
 sections: formData.sections.split(',').map(s => s.trim()).filter(Boolean),
 status: formData.status || 'active'
 };

 // Synchronize fee structure to school_settings for seamless software-wide fee integration
 const syncFees = {
 ...classFees,
 [payload.name]: {
 monthlyFee: payload.monthlyFee,
 admissionFee: payload.admissionFee,
 annualFee: payload.annualFee,
 otherFee: payload.otherFee
 }
 };
 await upsertRecord('school_settings', schoolId, { classFees: syncFees }).catch(err => console.warn('Fee sync warning:', err));

 if (editingId) {
 const res = await updateRecord('classes', editingId, payload);
 if (res.success) {
 alert('Class updated successfully!');
 setEditingId(null);
 setFormData(initialFormState);
 } else {
 alert('Failed to update class.');
 }
 } else {
 const res = await addRecord('classes', payload, schoolId);
 if (res.success) {
 alert('New class created and synchronized across the software!');
 setFormData({
 ...initialFormState,
 order: String((schoolClasses.length || 0) + 2)
 });
 } else {
 alert('Failed to create class.');
 }
 }
 } catch (error) {
 console.error("Error saving class:", error);
 alert("Error occurred while saving class.");
 } finally {
 setLoading(false);
 }
 };

 const handleEdit = (cls) => {
 setEditingId(cls.id);
 setFormData({
 name: cls.name || '',
 order: String(cls.order !== undefined ? cls.order : 1),
 monthlyFee: String(cls.monthlyFee || ''),
 admissionFee: String(cls.admissionFee || ''),
 annualFee: String(cls.annualFee || ''),
 otherFee: String(cls.otherFee || ''),
 sections: Array.isArray(cls.sections) ? cls.sections.join(', ') : (cls.sections || 'A, B'),
 status: cls.status || 'active'
 });
 window.scrollTo({ top: 0, behavior: 'smooth' });
 };

 const handleCancelEdit = () => {
 setEditingId(null);
 setFormData(initialFormState);
 };

 const handleToggleStatus = async (cls) => {
 const newStatus = cls.status === 'disabled' ? 'active' : 'disabled';
 const msg = newStatus === 'disabled' 
 ? `Disable class "${cls.name}"? It will no longer appear in dropdowns across the software.`
 : `Re-activate class "${cls.name}"? It will be restored to software dropdowns.`;
 if (!window.confirm(msg)) return;

 try {
 await updateRecord('classes', cls.id, { status: newStatus });
 } catch (err) {
 console.error("Failed to toggle status:", err);
 }
 };

 const handleDelete = async (id, name) => {
 if (!window.confirm(`Are you absolutely sure you want to permanently delete Class "${name}"? Only remaining classes will be shown across the software.`)) return;
 try {
 await deleteRecord('classes', id);
 if (editingId === id) handleCancelEdit();
 } catch (err) {
 console.error("Failed to delete class:", err);
 }
 };

 const handleSeedDefaultClasses = async () => {
 if (!window.confirm('Initialize default classes (Nursery to 10th) into your database? You can then edit or remove any extra class.')) return;
 setInitializing(true);
 const defaults = ['Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
 try {
 await Promise.all(defaults.map((clsName, index) => {
 return addRecord('classes', {
 name: clsName,
 order: index + 1,
 monthlyFee: 2000,
 admissionFee: 3000,
 annualFee: 1500,
 otherFee: 0,
 sections: ['A', 'B'],
 status: 'active'
 }, schoolId);
 }));
 const seedFees = {};
 defaults.forEach((clsName) => {
 seedFees[clsName] = { monthlyFee: 2000, admissionFee: 3000, annualFee: 1500, otherFee: 0 };
 });
 await upsertRecord('school_settings', schoolId, { classFees: seedFees }).catch(err => console.warn('Seed fee sync warning:', err));
 alert('Default classes loaded successfully! You can now customize or delete any class.');
 } catch (error) {
 console.error('Error seeding classes:', error);
 alert('Error initializing classes.');
 } finally {
 setInitializing(false);
 }
 };

 const filteredClasses = (schoolClasses || []).filter(cls => {
 const nameMatch = (cls.name || '').toLowerCase().includes(searchTerm.toLowerCase());
 return nameMatch;
 });

 if (classesLoading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[50vh]">
 <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-3" />
 <p className="text-dark-muted text-sm">Loading synchronized classes...</p>
 </div>
 );
 }

 return (
 <div className="space-y-6 animate-fade-in pb-10">
 {/* Header Banner */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary-600/30 via-indigo-600/20 to-transparent border border-primary-500/30 shadow-xl">
 <div className="flex items-center gap-4">
 <button 
 onClick={() => navigate(-1)}
 className="p-2.5 hover:bg-dark-hover rounded-xl text-dark-muted hover:text-white transition-all bg-dark-card/60"
 >
 <ArrowLeft size={20} />
 </button>
 <div>
 <div className="flex items-center gap-2">
 <BookOpen className="text-primary-400" size={24} />
 <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">Class Management</h1>
 </div>
 <p className="text-dark-muted text-xs sm:text-sm mt-1">
 Create and manage classes. <span className="text-emerald-400 font-bold">Only active classes set here will appear in software dropdowns.</span>
 </p>
 </div>
 </div>

 {schoolClasses && schoolClasses.length === 0 && (
 <button 
 onClick={handleSeedDefaultClasses}
 disabled={initializing}
 className="premium-button-primary flex items-center gap-2 px-5 py-2.5 whitespace-nowrap hover:from-emerald-500 hover:to-teal-400 font-bold shadow-lg"
 >
 {initializing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
 Initialize Default Classes (Nursery - 10)
 </button>
 )}
 </div>

 {/* Zero Classes Alert */}
 {schoolClasses && schoolClasses.length === 0 && (
 <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-3">
 <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
 <div>
 <h4 className="text-sm font-bold text-amber-200">No Custom Classes Created Yet</h4>
 <p className="text-xs text-amber-300/80 mt-1">
 Your software is currently displaying standard default demo classes. Create your own classes in the desk below or click <strong>"Initialize Default Classes"</strong> above to populate the standard list into your dashboard for quick customization and deletion of extra classes!
 </p>
 </div>
 </div>
 )}

 {/* Add / Edit Class Desk */}
 <GlassCard className="p-6 sm:p-8 border-primary-500/20 relative overflow-hidden">
 <div className="flex items-center justify-between mb-6 border-b border-dark-border pb-4">
 <div className="flex items-center gap-2">
 <Layers className="text-primary-500" size={20} />
 <h2 className="text-lg font-black text-white uppercase tracking-wider">
 {editingId ? 'Edit Class Structure' : 'Add New Class'}
 </h2>
 </div>
 {editingId && (
 <button 
 onClick={handleCancelEdit}
 className="px-3 py-1.5 rounded-lg bg-dark-hover hover:bg-red-500/20 text-dark-muted hover:text-red-400 text-xs font-bold flex items-center gap-1.5 transition-all"
 >
 <X size={14} /> Cancel Edit
 </button>
 )}
 </div>

 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
 <div className="space-y-1.5">
 <label className="text-xs font-black text-dark-muted uppercase px-1">Class Name <span className="text-red-400">*</span></label>
 <input 
 type="text" 
 name="name" 
 value={formData.name} 
 onChange={handleInputChange} 
 required 
 placeholder="e.g. Nursery, Prep, 9th Science" 
 className="w-full premium-input font-bold"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-black text-dark-muted uppercase px-1">Display Order (#)</label>
 <input 
 type="number" 
 name="order" 
 value={formData.order} 
 onChange={handleInputChange} 
 required 
 placeholder="1, 2, 3..." 
 className="w-full premium-input font-mono"
 />
 <span className="text-[10px] text-dark-muted block px-1">Determines dropdown sorting order.</span>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-black text-dark-muted uppercase px-1">Sections (Comma Separated)</label>
 <input 
 type="text" 
 name="sections" 
 value={formData.sections} 
 onChange={handleInputChange} 
 placeholder="e.g. A, B, C, Rose" 
 className="w-full premium-input"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-black text-dark-muted uppercase px-1">Status</label>
 <select
 name="status"
 value={formData.status}
 onChange={handleInputChange}
 className="w-full premium-input bg-dark-card font-bold text-white"
 >
 <option value="active">🟢 Active (Visible in app)</option>
 <option value="disabled">🔴 Disabled (Hidden from app)</option>
 </select>
 </div>
 </div>

 {/* Fees Sub-Section */}
 <div className="p-5 rounded-xl bg-dark-bg/50 border border-dark-border/60 space-y-4">
 <div className="flex items-center gap-2 text-primary-400 font-bold text-xs uppercase tracking-wider">
 <DollarSign size={16} /> Default Fee Structure for Class
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
 <div className="space-y-1">
 <label className="text-xs font-bold text-dark-muted px-1">Monthly Tuition Fee (Rs)</label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted font-bold text-xs">Rs</span>
 <input 
 type="number" 
 name="monthlyFee" 
 value={formData.monthlyFee} 
 onChange={handleInputChange} 
 placeholder="0" 
 className="w-full premium-input pl-8 font-mono text-sm"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-dark-muted px-1">Admission Fee (Rs)</label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted font-bold text-xs">Rs</span>
 <input 
 type="number" 
 name="admissionFee" 
 value={formData.admissionFee} 
 onChange={handleInputChange} 
 placeholder="0" 
 className="w-full premium-input pl-8 font-mono text-sm"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-dark-muted px-1">Annual / Exam Fee (Rs)</label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted font-bold text-xs">Rs</span>
 <input 
 type="number" 
 name="annualFee" 
 value={formData.annualFee} 
 onChange={handleInputChange} 
 placeholder="0" 
 className="w-full premium-input pl-8 font-mono text-sm"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-dark-muted px-1">Other / Computer Fee (Rs)</label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted font-bold text-xs">Rs</span>
 <input 
 type="number" 
 name="otherFee" 
 value={formData.otherFee} 
 onChange={handleInputChange} 
 placeholder="0" 
 className="w-full premium-input pl-8 font-mono text-sm"
 />
 </div>
 </div>
 </div>
 </div>

 <div className="flex justify-end">
 <button
 type="submit"
 disabled={loading}
 className="premium-button-primary flex items-center gap-2 px-8 py-3 text-sm font-bold shadow-lg"
 >
 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
 {editingId ? 'Update & Synchronize Class' : 'Save New Class'}
 </button>
 </div>
 </form>
 </GlassCard>

 {/* All Classes List Table */}
 <GlassCard className="p-6 sm:p-8 overflow-hidden">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-dark-border">
 <div>
 <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
 All Classes ({schoolClasses?.length || 0})
 </h2>
 <p className="text-xs text-dark-muted mt-0.5">
 Only active classes listed below will be offered across student forms, exams, attendance, and fee vouchers.
 </p>
 </div>

 <div className="relative w-full sm:w-64">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
 <input 
 type="text" 
 value={searchTerm} 
 onChange={(e) => setSearchTerm(e.target.value)} 
 placeholder="Search class..." 
 className="w-full premium-input pl-9 text-xs"
 />
 </div>
 </div>

 <div className="overflow-x-auto -mx-6 px-6">
 <table className="w-full text-left border-collapse min-w-[700px]">
 <thead>
 <tr className="border-b border-dark-border bg-dark-bg/60 text-dark-muted text-xs uppercase font-black">
 <th className="py-3 px-4 w-16">#</th>
 <th className="py-3 px-4">Class Name</th>
 <th className="py-3 px-4">Sections</th>
 <th className="py-3 px-4">Monthly Fee</th>
 <th className="py-3 px-4">Other Fees</th>
 <th className="py-3 px-4 text-center">Status</th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-dark-border/40">
 {filteredClasses.length === 0 ? (
 <tr>
 <td colSpan="7" className="py-8 text-center text-dark-muted text-sm font-bold">
 {searchTerm ? `No class matching "${searchTerm}" found.` : "No classes added yet in database."}
 </td>
 </tr>
 ) : (
 filteredClasses.map((cls, index) => (
 <tr key={cls.id} className="hover:bg-white/[0.02] transition-all">
 <td className="py-3.5 px-4 font-mono text-sm font-bold text-primary-400">
 {cls.order !== undefined ? cls.order : index + 1}
 </td>
 <td className="py-3.5 px-4 font-black text-white text-base">
 {cls.name}
 </td>
 <td className="py-3.5 px-4">
 <div className="flex flex-wrap gap-1">
 {(Array.isArray(cls.sections) ? cls.sections : (cls.sections ? String(cls.sections).split(',') : ['A', 'B'])).map((sec, i) => (
 <span key={i} className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-dark-bg text-dark-muted border border-dark-border">
 {sec.trim()}
 </span>
 ))}
 </div>
 </td>
 <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">
 Rs. {cls.monthlyFee ? Number(cls.monthlyFee).toLocaleString() : '0'}
 </td>
 <td className="py-3.5 px-4 text-xs text-dark-muted">
 <span>Adm: Rs.{cls.admissionFee || 0}</span> | <span>Ann: Rs.{cls.annualFee || 0}</span>
 </td>
 <td className="py-3.5 px-4 text-center">
 <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
 cls.status !== 'disabled' 
 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
 : 'bg-red-500/10 text-red-400 border border-red-500/20'
 }`}>
 {cls.status !== 'disabled' ? 'Active' : 'Disabled'}
 </span>
 </td>
 <td className="py-3.5 px-4 text-right">
 <div className="flex items-center justify-end gap-2">
 <button
 onClick={() => handleEdit(cls)}
 title="Edit Class & Fee Structure"
 className="p-2 bg-primary-500/10 hover:bg-primary-500 text-primary-400 hover:text-white rounded-lg transition-all"
 >
 <Edit2 size={15} />
 </button>
 <button
 onClick={() => handleToggleStatus(cls)}
 title={cls.status === 'disabled' ? "Enable Class" : "Disable Class"}
 className={`p-2 rounded-lg transition-all ${
 cls.status === 'disabled'
 ? 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white'
 : 'bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white'
 }`}
 >
 <RefreshCw size={15} />
 </button>
 <button
 onClick={() => handleDelete(cls.id, cls.name)}
 title="Delete Class Permanently"
 className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all"
 >
 <Trash2 size={15} />
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

export default ClassManagement;

