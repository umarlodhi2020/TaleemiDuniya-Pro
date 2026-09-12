import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { getRecords, updateRecord } from '../../services/db';
import { Calculator, Save, AlertCircle, Search, UserSquare2, DollarSign } from 'lucide-react';

const SalarySetup = () => {
 const { userData, showToast } = useAuth();
 const [staffList, setStaffList] = useState([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');
 
 const [selectedStaff, setSelectedStaff] = useState(null);
 const [formData, setFormData] = useState({
 basicSalary: 0,
 medicalAllowance: 0,
 transportAllowance: 0,
 otherDeductions: 0
 });
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 fetchStaff();
 }, [userData]);

 const fetchStaff = async () => {
 if (!userData?.schoolId) return;
 setLoading(true);
 try {
 const records = await getRecords('staff', userData.schoolId);
 setStaffList(records);
 } catch (error) {
 console.error('Error fetching staff for salary setup:', error);
 showToast('error', 'Failed to load staff list.');
 } finally {
 setLoading(false);
 }
 };

 const handleSelectStaff = (staff) => {
 setSelectedStaff(staff);
 setFormData({
 basicSalary: staff.payrollSetup?.basicSalary || 0,
 medicalAllowance: staff.payrollSetup?.medicalAllowance || 0,
 transportAllowance: staff.payrollSetup?.transportAllowance || 0,
 otherDeductions: staff.payrollSetup?.otherDeductions || 0
 });
 };

 const handleSave = async (e) => {
 e.preventDefault();
 if (!selectedStaff) return;
 
 setSaving(true);
 try {
 const updatedPayrollSetup = {
 basicSalary: Number(formData.basicSalary),
 medicalAllowance: Number(formData.medicalAllowance),
 transportAllowance: Number(formData.transportAllowance),
 otherDeductions: Number(formData.otherDeductions),
 updatedAt: new Date().toISOString()
 };
 
 await updateRecord('staff', selectedStaff.id, {
 payrollSetup: updatedPayrollSetup
 });
 
 setStaffList(prev => prev.map(s => s.id === selectedStaff.id ? { ...s, payrollSetup: updatedPayrollSetup } : s));
 showToast('success', `Salary setup updated for ${selectedStaff.name}`);
 setSelectedStaff(null);
 } catch (error) {
 console.error('Error saving salary setup:', error);
 showToast('error', 'Failed to save salary configuration.');
 } finally {
 setSaving(false);
 }
 };

 const filteredStaff = staffList.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));

 return (
 <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
 <div>
 <h1 className="text-3xl font-black text-white flex items-center gap-3">
 <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
 <DollarSign className="text-white" size={28} />
 </div>
 Staff Salary Setup
 </h1>
 <p className="text-dark-muted mt-2 max-w-2xl">
 Configure the base salary, regular allowances, and fixed deductions for each staff member.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Side - Staff List */}
 <div className="lg:col-span-2 space-y-4">
 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={20} />
 <input 
 type="text" 
 placeholder="Search staff..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full bg-dark-card border border-dark-border rounded-xl pl-12 p-4 text-white focus:border-blue-500 outline-none shadow-sm"
 />
 </div>

 <GlassCard className="p-0 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="bg-dark-bg border-b border-dark-border">
 <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Staff Details</th>
 <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Base Salary</th>
 <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Status</th>
 <th className="p-4 text-xs font-bold text-dark-muted uppercase tracking-wider text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-dark-border/50">
 {loading ? (
 <tr><td colSpan="4" className="p-8 text-center text-dark-muted">Loading staff list...</td></tr>
 ) : filteredStaff.length === 0 ? (
 <tr><td colSpan="4" className="p-8 text-center text-dark-muted">No staff members found.</td></tr>
 ) : filteredStaff.map((staff) => (
 <tr key={staff.id} className={`hover:bg-white/5 transition-colors ${selectedStaff?.id === staff.id ? 'bg-blue-500/10' : ''}`}>
 <td className="p-4">
 <div className="flex items-center gap-3">
 {staff.photoUrl ? (
 <img 
 src={staff.photoUrl} 
 alt={staff.name} 
 className="w-10 h-10 rounded-full object-cover border border-blue-400/20" 
 />
 ) : (
 <div className="w-10 h-10 rounded-full bg-dark-bg flex items-center justify-center text-blue-400 font-bold">
 {staff.name?.charAt(0) || '?'}
 </div>
 )}
 <div>
 <p className="font-bold text-white">{staff.name}</p>
 <p className="text-xs text-blue-400 font-mono mt-1">{staff.role}</p>
 </div>
 </div>
 </td>
 <td className="p-4 font-mono text-white">
 {staff.payrollSetup?.basicSalary ? `Rs ${staff.payrollSetup.basicSalary.toLocaleString()}` : '-'}
 </td>
 <td className="p-4">
 {staff.payrollSetup?.basicSalary ? (
 <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Configured</span>
 ) : (
 <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">Not Set</span>
 )}
 </td>
 <td className="p-4 text-right">
 <button 
 onClick={() => handleSelectStaff(staff)}
 className="px-4 py-2 bg-dark-bg text-white border border-dark-border hover:border-blue-500 hover:text-blue-400 rounded-lg text-sm font-bold transition-all cursor-pointer"
 >
 Setup Salary
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </GlassCard>
 </div>

 {/* Right Side - Setup Form */}
 <div className="lg:col-span-1">
 <GlassCard className="sticky top-6">
 <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
 <Calculator className="text-blue-400" size={24} /> 
 Salary Configuration
 </h2>
 
 {!selectedStaff ? (
 <div className="text-center py-12 text-dark-muted flex flex-col items-center">
 <UserSquare2 size={48} className="opacity-20 mb-4" />
 <p>Select a staff member from the list to configure their salary.</p>
 </div>
 ) : (
 <form onSubmit={handleSave} className="space-y-4">
 <div className="p-4 bg-dark-bg rounded-xl border border-dark-border mb-6">
 <p className="text-xs text-dark-muted uppercase font-bold tracking-wider mb-1">Selected Staff</p>
 <p className="font-bold text-white">{selectedStaff.name}</p>
 <p className="text-sm text-blue-400">{selectedStaff.role}</p>
 </div>

 <div>
 <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2">Basic Salary (Rs)</label>
 <div className="relative">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted">Rs</span>
 <input 
 type="number" 
 required
 min="0"
 value={formData.basicSalary}
 onChange={(e) => setFormData({...formData, basicSalary: e.target.value})}
 className="w-full bg-dark-bg border border-dark-border rounded-xl pl-12 p-3 text-white focus:border-blue-500 outline-none font-mono"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2">Medical Allowance (Fixed Rs)</label>
 <div className="relative">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted">Rs</span>
 <input 
 type="number" 
 min="0"
 value={formData.medicalAllowance}
 onChange={(e) => setFormData({...formData, medicalAllowance: e.target.value})}
 className="w-full bg-dark-bg border border-dark-border rounded-xl pl-12 p-3 text-white focus:border-blue-500 outline-none font-mono"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2">Transport Allowance (Fixed Rs)</label>
 <div className="relative">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted">Rs</span>
 <input 
 type="number" 
 min="0"
 value={formData.transportAllowance}
 onChange={(e) => setFormData({...formData, transportAllowance: e.target.value})}
 className="w-full bg-dark-bg border border-dark-border rounded-xl pl-12 p-3 text-white focus:border-blue-500 outline-none font-mono"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2">Other Fixed Deductions (Rs)</label>
 <div className="relative">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted text-red-400">-</span>
 <input 
 type="number" 
 min="0"
 value={formData.otherDeductions}
 onChange={(e) => setFormData({...formData, otherDeductions: e.target.value})}
 className="w-full bg-dark-bg border border-dark-border rounded-xl pl-10 p-3 text-white focus:border-red-500 outline-none font-mono"
 />
 </div>
 <p className="text-[10px] text-dark-muted mt-1">E.g., Provident Fund, fixed installments.</p>
 </div>

 <div className="pt-4 border-t border-dark-border mt-6">
 <button 
 type="submit"
 disabled={saving}
 className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
 >
 {saving ? 'Saving...' : <><Save size={18} /> Save Setup</>}
 </button>
 </div>
 </form>
 )}
 </GlassCard>
 </div>
 </div>
 </div>
 );
};

export default SalarySetup;

