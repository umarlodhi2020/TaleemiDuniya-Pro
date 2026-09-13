import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { Users, ArrowRight, CheckCircle2, Search, AlertCircle, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRecords, updateRecord } from '../../services/db';

const BulkPromotionEngine = () => {
 const { userData, showToast } = useAuth();
 
 const [students, setStudents] = useState([]);
 const [loading, setLoading] = useState(false);
 const [processing, setProcessing] = useState(false);
 
 // Selection States
 const [sourceClass, setSourceClass] = useState('');
 const [sourceSection, setSourceSection] = useState('');
 
 const [targetClass, setTargetClass] = useState('');
 const [targetSection, setTargetSection] = useState('');
 
 const [selectedStudents, setSelectedStudents] = useState(new Set());
 
 // Unique classes and sections for dropdowns
 const [availableClasses, setAvailableClasses] = useState([]);
 const [availableSections, setAvailableSections] = useState([]);

 useEffect(() => {
 fetchInitialData();
 }, [userData]);

 const fetchInitialData = async () => {
 if (!userData?.schoolId) return;
 try {
 // Just fetch all students to populate classes
 const allStudents = await getRecords('students', userData.schoolId);
 
 const uniqueClasses = [...new Set(allStudents.map(s => s.class).filter(Boolean))].sort();
 const uniqueSections = [...new Set(allStudents.map(s => s.section).filter(Boolean))].sort();
 
 setAvailableClasses(uniqueClasses);
 setAvailableSections(uniqueSections);
 } catch (error) {
 console.error('Error fetching classes:', error);
 }
 };

 const handleLoadStudents = async () => {
 if (!sourceClass) {
 showToast('error', 'Please select a source class');
 return;
 }
 
 setLoading(true);
 try {
 const allStudents = await getRecords('students', userData.schoolId);
 let filtered = allStudents.filter(s => s.class === sourceClass);
 
 if (sourceSection) {
 filtered = filtered.filter(s => s.section === sourceSection);
 }
 
 // Sort by roll number
 filtered.sort((a, b) => {
 const rA = parseInt(a.rollNo) || 0;
 const rB = parseInt(b.rollNo) || 0;
 return rA - rB;
 });
 
 setStudents(filtered);
 
 // Select all by default
 const allIds = new Set(filtered.map(s => s.id));
 setSelectedStudents(allIds);
 
 if (filtered.length === 0) {
 showToast('info', 'No students found in this class/section');
 }
 } catch (error) {
 showToast('error', 'Failed to load students');
 } finally {
 setLoading(false);
 }
 };

 const toggleStudent = (id) => {
 const newSelected = new Set(selectedStudents);
 if (newSelected.has(id)) {
 newSelected.delete(id);
 } else {
 newSelected.add(id);
 }
 setSelectedStudents(newSelected);
 };

 const toggleAll = () => {
 if (selectedStudents.size === students.length) {
 setSelectedStudents(new Set());
 } else {
 setSelectedStudents(new Set(students.map(s => s.id)));
 }
 };

 const handlePromote = async () => {
 if (selectedStudents.size === 0) {
 showToast('error', 'Please select at least one student');
 return;
 }
 if (!targetClass) {
 showToast('error', 'Please select a target class');
 return;
 }
 
 const confirmMsg = `Are you sure you want to promote ${selectedStudents.size} students to ${targetClass} ${targetSection ? '(' + targetSection + ')' : ''}?`;
 if (!window.confirm(confirmMsg)) return;
 
 setProcessing(true);
 let successCount = 0;
 let failCount = 0;
 
 try {
 const selectedArray = Array.from(selectedStudents);
 
 for (const studentId of selectedArray) {
 const student = students.find(s => s.id === studentId);
 if (!student) continue;
 
 try {
 const updateData = {
 class: targetClass,
 updatedAt: new Date().toISOString()
 };
 if (targetSection) updateData.section = targetSection;
 
 await updateRecord('students', studentId, updateData);
 successCount++;
 } catch (err) {
 console.error(`Failed to promote student ${studentId}:`, err);
 failCount++;
 }
 }
 
 if (failCount === 0) {
 showToast('success', `Successfully promoted ${successCount} students!`);
 } else {
 showToast('info', `Promoted ${successCount} students. Failed for ${failCount} students.`);
 }
 
 // Reset view
 setStudents([]);
 setSelectedStudents(new Set());
 setSourceClass('');
 setSourceSection('');
 setTargetClass('');
 setTargetSection('');
 
 } catch (error) {
 console.error('Promotion error:', error);
 showToast('error', 'A critical error occurred during promotion');
 } finally {
 setProcessing(false);
 }
 };

 return (
 <div className="p-6 max-w-7xl mx-auto">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
 <div>
 <h1 className="text-3xl font-bold text-white flex items-center gap-3">
 <Users className="w-8 h-8 text-primary-400" />
 Bulk Promotion Engine
 </h1>
 <p className="text-white/60 mt-2">Promote an entire class to the next academic year in one click</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
 {/* Step 1: Source */}
 <GlassCard className="p-6">
 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
 <span className="bg-primary-500/20 text-primary-400 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
 Select Source Class
 </h3>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-white/70 mb-1">Current Class *</label>
 <select
 value={sourceClass}
 onChange={(e) => setSourceClass(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
 >
 <option value="" className="bg-slate-800">Select Class</option>
 {availableClasses.map(c => (
 <option key={c} value={c} className="bg-slate-800">{c}</option>
 ))}
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-white/70 mb-1">Current Section (Optional)</label>
 <select
 value={sourceSection}
 onChange={(e) => setSourceSection(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
 >
 <option value="" className="bg-slate-800">All Sections</option>
 {availableSections.map(s => (
 <option key={s} value={s} className="bg-slate-800">{s}</option>
 ))}
 </select>
 </div>
 
 <button
 onClick={handleLoadStudents}
 disabled={loading || !sourceClass}
 className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center justify-center gap-2 transition-all font-medium disabled:opacity-50"
 >
 {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
 Load Students
 </button>
 </div>
 </GlassCard>

 {/* Arrow (Desktop) */}
 <div className="hidden lg:flex items-center justify-center">
 <ArrowRight className="w-12 h-12 text-white/20" />
 </div>

 {/* Step 2: Target */}
 <GlassCard className="p-6">
 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
 <span className="bg-green-500/20 text-green-400 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
 Promote To
 </h3>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-white/70 mb-1">Target Class *</label>
 <input
 type="text"
 placeholder="e.g. Class 10"
 value={targetClass}
 onChange={(e) => setTargetClass(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-white/70 mb-1">Target Section (Optional)</label>
 <input
 type="text"
 placeholder="e.g. A"
 value={targetSection}
 onChange={(e) => setTargetSection(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
 />
 </div>
 
 <button
 onClick={handlePromote}
 disabled={processing || students.length === 0 || !targetClass}
 className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center justify-center gap-2 transition-all font-medium disabled:opacity-50"
 >
 {processing ? (
 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 ) : (
 <Save className="w-5 h-5" />
 )}
 Confirm Promotion
 </button>
 </div>
 </GlassCard>
 </div>

 {/* Student List */}
 {students.length > 0 && (
 <GlassCard className="overflow-hidden">
 <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
 <div>
 <h2 className="text-xl font-bold text-white flex items-center gap-2">
 <CheckCircle2 className="w-5 h-5 text-primary-400" />
 Select Students to Promote
 </h2>
 <p className="text-white/60 text-sm mt-1">
 {selectedStudents.size} out of {students.length} students selected
 </p>
 </div>
 <button
 onClick={toggleAll}
 className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
 >
 {selectedStudents.size === students.length ? 'Deselect All' : 'Select All'}
 </button>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="bg-white/5 border-b border-white/10">
 <th className="p-4 w-16"></th>
 <th className="p-4 text-white/70 font-medium">Roll No</th>
 <th className="p-4 text-white/70 font-medium">Student Name</th>
 <th className="p-4 text-white/70 font-medium">Father Name</th>
 <th className="p-4 text-white/70 font-medium">Current Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {students.map((student) => (
 <tr key={student.id} className="hover:bg-white/5 transition-colors">
 <td className="p-4">
 <div
 onClick={() => toggleStudent(student.id)}
 className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${
 selectedStudents.has(student.id)
 ? 'bg-primary-500 border-primary-500'
 : 'border-white/30 bg-transparent hover:border-primary-400'
 }`}
 >
 {selectedStudents.has(student.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
 </div>
 </td>
 <td className="p-4 text-white font-mono">{student.rollNo || '-'}</td>
 <td className="p-4">
 <div className="flex items-center gap-3">
 {student.photoUrl ? (
 <img src={student.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
 ) : (
 <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-xs">
 {student.name?.charAt(0) || '?'}
 </div>
 )}
 <span className="text-white font-medium">{student.name}</span>
 </div>
 </td>
 <td className="p-4 text-white/70">{student.fatherName || '-'}</td>
 <td className="p-4">
 <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70">
 {student.class} {student.section ? `(${student.section})` : ''}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </GlassCard>
 )}
 
 {students.length === 0 && sourceClass && !loading && (
 <div className="flex flex-col items-center justify-center py-12 text-white/50">
 <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
 <p>No students found in the selected class</p>
 </div>
 )}
 </div>
 );
};

export default BulkPromotionEngine;

