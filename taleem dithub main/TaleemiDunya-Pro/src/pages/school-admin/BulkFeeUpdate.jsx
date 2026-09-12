import React, { useState, useEffect, useRef } from 'react';
import { 
 ArrowLeft, Save, Search, Loader2, DollarSign, Users, AlertCircle, Upload, Download 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, updateRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const BulkFeeUpdate = () => {
 const navigate = useNavigate();
 const { userData } = useAuth();
 const schoolId = userData?.schoolId || 'default-school';
 
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [importing, setImporting] = useState(false);
 const fileInputRef = useRef(null);
 const [students, setStudents] = useState([]);
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedClass, setSelectedClass] = useState('All');
 
 // Track changes made by user before saving
 const [updates, setUpdates] = useState({});

 useEffect(() => {
 fetchStudents();
 }, [schoolId]);

 const fetchStudents = async () => {
 setLoading(true);
 try {
 const data = await getRecords('students', schoolId);
 setStudents(data);
 } catch (error) {
 console.error("Error fetching students:", error);
 } finally {
 setLoading(false);
 }
 };

 const handleInputChange = (studentId, field, value) => {
 setUpdates(prev => ({
 ...prev,
 [studentId]: {
 ...prev[studentId],
 [field]: value
 }
 }));
 };

 const handleSaveAll = async () => {
 const studentIds = Object.keys(updates);
 if (studentIds.length === 0) {
 alert('No changes to save.');
 return;
 }
 
 setSaving(true);
 try {
 for (const id of studentIds) {
 const changes = updates[id];
 const updateData = {};
 if (changes.monthlyFee !== undefined) updateData.monthlyFee = Number(changes.monthlyFee) || 0;
 if (changes.balance !== undefined) {
 updateData.balance = Number(changes.balance) || 0;
 updateData.arrears = updateData.balance;
 }
 if (changes.annualFee !== undefined) updateData.annualFee = Number(changes.annualFee) || 0;
 
 await updateRecord('students', id, updateData);
 }
 alert('Fees updated successfully!');
 setUpdates({});
 fetchStudents(); // Refresh data
 } catch (error) {
 console.error("Error updating fees:", error);
 alert('Failed to update some records.');
 } finally {
 setSaving(false);
 }
 };

 const handleFileUpload = async (e) => {
 const file = e.target.files[0];
 if (!file) return;

 setImporting(true);
 try {
 const data = await file.arrayBuffer();
 const workbook = XLSX.read(data);
 const worksheet = workbook.Sheets[workbook.SheetNames[0]];
 const jsonData = XLSX.utils.sheet_to_json(worksheet);

 let matchCount = 0;
 const newUpdates = { ...updates };

 jsonData.forEach(row => {
 // Find matching student
 const rollNo = row['Roll Number'] || row['Roll No'] || row['Roll'] || '';
 const name = row['Name'] || row['Student Name'] || '';
 const fee = row['Monthly Fee'] || row['Fee'] || row['Tuition Fee'];
 const balance = row['Arrears'] || row['Balance'] || row['Old Balance'];
 const annualFund = row['Annual Fund'] || row['Annual Fee'];

 let matchedStudent = null;
 if (rollNo) {
 matchedStudent = students.find(s => s.rollNumber?.toString() === rollNo.toString());
 }
 if (!matchedStudent && name) {
 matchedStudent = students.find(s => s.name?.toLowerCase() === name.toLowerCase());
 }

 if (matchedStudent && (fee !== undefined || balance !== undefined || annualFund !== undefined)) {
 if (!newUpdates[matchedStudent.id]) newUpdates[matchedStudent.id] = {};
 if (fee !== undefined) newUpdates[matchedStudent.id].monthlyFee = fee;
 if (balance !== undefined) newUpdates[matchedStudent.id].balance = balance;
 if (annualFund !== undefined) newUpdates[matchedStudent.id].annualFee = annualFund;
 matchCount++;
 }
 });

 setUpdates(newUpdates);
 alert(`Excel imported successfully! Matched ${matchCount} students.`);
 } catch (error) {
 console.error("Excel import error:", error);
 alert("Failed to read Excel file. Make sure it has columns like 'Roll Number', 'Monthly Fee', and 'Arrears'.");
 } finally {
 setImporting(false);
 if (fileInputRef.current) fileInputRef.current.value = '';
 }
 };

 const handleDownloadTemplate = () => {
 const templateData = [
 { 'Roll Number': '101', 'Name': 'Ali (Optional)', 'Monthly Fee': 3500, 'Annual Fund': 0, 'Arrears': 1500 },
 { 'Roll Number': '102', 'Name': 'Ahmed (Optional)', 'Monthly Fee': 4000, 'Annual Fund': 5000, 'Arrears': 0 }
 ];
 const ws = XLSX.utils.json_to_sheet(templateData);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, "Fees Template");
 XLSX.writeFile(wb, "Fees_Bulk_Update_Template.xlsx");
 };

 const uniqueClasses = ['All', ...new Set(students.map(s => s.class).filter(Boolean))].sort();

 const filteredStudents = students.filter(student => {
 const lowerSearch = searchTerm.toLowerCase();
 const matchesSearch = (student.name || '').toLowerCase().includes(lowerSearch) || 
 (student.rollNumber || '').toString().toLowerCase().includes(lowerSearch) ||
 (student.fatherName || '').toLowerCase().includes(lowerSearch) ||
 (student.fatherCnic || '').toLowerCase().includes(lowerSearch) ||
 (student.cnic || '').toLowerCase().includes(lowerSearch) ||
 (student.parentPhone || student.fatherPhone || student.phone || '').toString().includes(lowerSearch);
 const matchesClass = selectedClass === 'All' || student.class === selectedClass;
 return matchesSearch && matchesClass;
 });

 if (loading) {
 return (
 <div className="flex items-center justify-center h-96">
 <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
 </div>
 );
 }

 return (
 <div className="space-y-6 animate-fade-in pb-10">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <button 
 onClick={() => navigate(-1)}
 className="p-2 hover:bg-dark-hover rounded-xl text-dark-muted transition-all"
 >
 <ArrowLeft size={20} />
 </button>
 <div>
 <h1 className="text-2xl font-bold text-dark-text flex items-center gap-2">
 <DollarSign className="text-primary-500" /> Bulk Fees & Arrears Update
 </h1>
 <p className="text-dark-muted text-sm mt-0.5">Quickly update monthly fees and old pending arrears (balance) for students.</p>
 </div>
 </div>
 <div className="flex gap-2 sm:gap-3 flex-wrap">
 <button 
 onClick={handleDownloadTemplate}
 className="px-4 py-2 bg-dark-hover border border-dark-border hover:border-cyan-500 rounded-xl text-dark-text flex items-center gap-2 transition-all"
 >
 <Download size={20} className="text-cyan-500" />
 <span className="hidden sm:inline">Download Template</span>
 </button>
 
 <input 
 type="file" 
 accept=".xlsx, .xls, .csv" 
 ref={fileInputRef} 
 onChange={handleFileUpload} 
 className="hidden" 
 />
 <button 
 onClick={() => fileInputRef.current?.click()} 
 disabled={importing || saving}
 className="px-4 py-2 bg-dark-hover border border-dark-border hover:border-primary-500 rounded-xl text-dark-text flex items-center gap-2 transition-all"
 >
 {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload size={20} className="text-primary-500" />}
 <span className="hidden sm:inline">{importing ? 'Importing...' : 'Import Excel'}</span>
 </button>
 <button 
 onClick={handleSaveAll} 
 disabled={saving || Object.keys(updates).length === 0}
 className="premium-button-primary flex items-center gap-2"
 >
 {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
 <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save All Changes'}</span>
 </button>
 </div>
 </div>

 <GlassCard className="p-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
 <div className="relative flex-1 max-w-md">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
 <input 
 type="text" 
 placeholder="Search by Student Name, Roll No, Father Name, CNIC or Phone..." 
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full premium-input pl-10"
 />
 </div>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2">
 <span className="text-sm text-dark-muted font-bold">Filter by Class:</span>
 <select 
 value={selectedClass} 
 onChange={(e) => setSelectedClass(e.target.value)}
 className="premium-input py-2"
 >
 {uniqueClasses.map(cls => (
 <option key={cls} value={cls}>{cls}</option>
 ))}
 </select>
 </div>
 </div>
 </div>

 <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-4 rounded-xl flex gap-3 mb-6 items-start">
 <AlertCircle size={20} className="shrink-0 mt-0.5" />
 <div className="text-sm">
 <p className="font-bold mb-1">Important Note</p>
 <p>
 Updating <strong>Arrears / Balance</strong> here will automatically reflect as old pending fees on the student's next <strong>Fee Voucher</strong>.
 Updating <strong>Monthly Fee</strong> or <strong>Annual Fund</strong> here updates their default customized fee.
 </p>
 </div>
 </div>

 {filteredStudents.length === 0 ? (
 <div className="text-center py-12 text-dark-muted">
 <Users size={40} className="mx-auto opacity-30 mb-3" />
 <p className="font-bold">No students found.</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="text-[10px] text-dark-muted uppercase font-black border-b border-dark-border">
 <th className="pb-4 px-4">Student</th>
 <th className="pb-4 px-4">Class</th>
 <th className="pb-4 px-4 w-32">Monthly Fee (PKR)</th>
 <th className="pb-4 px-4 w-32">Annual Fund (PKR)</th>
 <th className="pb-4 px-4 w-32">Arrears / Old Balance (PKR)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-dark-border">
 {filteredStudents.map(student => {
 const hasUpdates = updates[student.id];
 const currentMonthlyFee = hasUpdates?.monthlyFee !== undefined ? hasUpdates.monthlyFee : (student.monthlyFee || '');
 const currentAnnualFee = hasUpdates?.annualFee !== undefined ? hasUpdates.annualFee : (student.annualFee || '');
 const currentBalance = hasUpdates?.balance !== undefined ? hasUpdates.balance : (student.balance || '');
 
 return (
 <tr key={student.id} className={`hover:bg-white/5 transition-colors ${hasUpdates ? 'bg-primary-500/5' : ''}`}>
 <td className="py-4 px-4">
 <div className="font-bold text-dark-text">{student.name}</div>
 <div className="text-xs text-dark-muted">{student.fatherName} • Roll: {student.rollNumber || 'N/A'}</div>
 </td>
 <td className="py-4 px-4">
 <span className="px-2 py-1 rounded-md bg-white/5 border border-dark-border text-xs font-black uppercase">
 {student.class} {student.section ? `(${student.section})` : ''}
 </span>
 </td>
 <td className="py-4 px-4">
 <input 
 type="number" 
 value={currentMonthlyFee}
 onChange={(e) => handleInputChange(student.id, 'monthlyFee', e.target.value)}
 placeholder="e.g. 3500" 
 className="w-full premium-input py-2 px-3 text-sm font-bold bg-dark-bg/50"
 />
 </td>
 <td className="py-4 px-4">
 <input 
 type="number" 
 value={currentAnnualFee}
 onChange={(e) => handleInputChange(student.id, 'annualFee', e.target.value)}
 placeholder="e.g. 5000" 
 className="w-full premium-input py-2 px-3 text-sm font-bold bg-dark-bg/50"
 />
 </td>
 <td className="py-4 px-4">
 <input 
 type="number" 
 value={currentBalance}
 onChange={(e) => handleInputChange(student.id, 'balance', e.target.value)}
 placeholder="e.g. 1500" 
 className="w-full premium-input py-2 px-3 text-sm font-bold bg-dark-bg/50 border-orange-500/30 focus:border-orange-500"
 />
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </GlassCard>
 </div>
 );
};

export default BulkFeeUpdate;

