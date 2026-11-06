import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRecords, updateRecord } from '../../services/db';
import { Users, Search, Phone, Mail, FileText, Edit2, X, MessageCircle } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';

const ParentsDirectory = () => {
 const { userData } = useAuth();
 const schoolId = userData?.schoolId || 'default-school';

 const [parents, setParents] = useState([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');

 // Edit Modal State
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [editingParent, setEditingParent] = useState(null);
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 fetchParents();
 }, [schoolId]);

 const fetchParents = async () => {
 setLoading(true);
 try {
 const studentsData = await getRecords('students', schoolId);
 if (studentsData) {
 const uniqueParentsMap = new Map();
 
 studentsData.forEach(student => {
 // Identify unique parents by CNIC or Phone
 const parentIdentifier = (student.fatherCnic || '').replace(/\D/g, '') || (student.parentPhone || '').replace(/\D/g, '');
 
 if (parentIdentifier) {
 if (!uniqueParentsMap.has(parentIdentifier)) {
 uniqueParentsMap.set(parentIdentifier, {
 id: parentIdentifier,
 fatherName: student.fatherName || '',
 fatherCnic: student.fatherCnic || '',
 parentPhone: student.parentPhone || '',
 whatsappPhone: student.whatsappPhone || '',
 parentEmail: student.parentEmail || '',
 children: [student]
 });
 } else {
 const existing = uniqueParentsMap.get(parentIdentifier);
 existing.children.push(student);
 }
 }
 });

 setParents(Array.from(uniqueParentsMap.values()));
 }
 } catch (error) {
 console.error('Error fetching parents:', error);
 } finally {
 setLoading(false);
 }
 };

 const openEditModal = (parent) => {
 setEditingParent({ ...parent });
 setIsEditModalOpen(true);
 };

 const handleSaveParent = async (e) => {
 e.preventDefault();
 if (!editingParent) return;

 setSaving(true);
 try {
 // We must update all children of this parent
 const updatePromises = editingParent.children.map(child => {
 return updateRecord('students', child.id, {
 fatherName: editingParent.fatherName,
 fatherCnic: editingParent.fatherCnic,
 parentPhone: editingParent.parentPhone,
 whatsappPhone: editingParent.whatsappPhone,
 parentEmail: editingParent.parentEmail
 });
 });

 await Promise.all(updatePromises);
 alert('Parent Profile updated successfully for all associated children!');
 setIsEditModalOpen(false);
 fetchParents(); // Refresh data
 } catch (error) {
 console.error('Error updating parent:', error);
 alert('Failed to update parent profile.');
 } finally {
 setSaving(false);
 }
 };

 const filteredParents = parents.filter(p => 
 p.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) || 
 p.fatherCnic.includes(searchTerm) || 
 p.parentPhone.includes(searchTerm)
 );

 return (
 <div className="p-4 md:p-6 min-h-screen bg-dark-bg text-dark-text select-none">
 <div className="mb-8">
 <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
 <Users className="text-primary-400" />
 Parents Directory
 </h1>
 <p className="text-xs text-dark-muted font-bold tracking-wider uppercase mt-1">
 View, manage, and contact all parent profiles
 </p>
 </div>

 <GlassCard className="p-4 border-dark-border/40 mb-6">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-muted" size={18} />
 <input 
 type="text" 
 placeholder="Search by Parent Name, CNIC, or Phone..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full premium-input pl-10 bg-dark-card text-sm"
 />
 </div>
 </GlassCard>

 {loading ? (
 <div className="text-center py-20 text-dark-muted text-sm uppercase tracking-widest animate-pulse">Loading Parents...</div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {filteredParents.map(parent => (
 <GlassCard key={parent.id} className="p-5 border-dark-border/40 hover:border-primary-500/50 transition-colors flex flex-col h-full">
 <div className="flex justify-between items-start mb-4">
 <div>
 <h3 className="text-lg font-bold text-white mb-1">{parent.fatherName || 'Unknown Name'}</h3>
 <div className="text-xs text-primary-400 bg-primary-500/10 inline-block px-2 py-1 rounded font-black tracking-wider">
 {parent.children.length} {parent.children.length === 1 ? 'Child' : 'Children'}
 </div>
 </div>
 <div className="flex gap-2">
 <button 
 onClick={() => openEditModal(parent)}
 className="p-2 rounded-lg bg-dark-hover hover:bg-primary-500/20 text-primary-400 transition-colors"
 title="Edit Profile"
 >
 <Edit2 size={16} />
 </button>
 </div>
 </div>
 
 <div className="space-y-3 mb-4 flex-1">
 <div className="flex items-center gap-3 text-sm text-dark-muted">
 <FileText size={14} className="text-cyan-400" />
 <span>CNIC: {parent.fatherCnic || 'N/A'}</span>
 </div>
 <div className="flex items-center gap-3 text-sm text-dark-muted">
 <Phone size={14} className="text-emerald-400" />
 <span>{parent.parentPhone || 'N/A'}</span>
 </div>
 {parent.parentEmail && (
 <div className="flex items-center gap-3 text-sm text-dark-muted">
 <Mail size={14} className="text-amber-400" />
 <span className="truncate">{parent.parentEmail}</span>
 </div>
 )}
 </div>

 <div className="pt-4 border-t border-dark-border/50 mb-4">
 <p className="text-xs font-bold text-dark-muted uppercase mb-2">Enrolled Children:</p>
 <div className="space-y-2">
 {parent.children.map(child => (
 <div key={child.id} className="bg-dark-bg/50 rounded p-2 text-xs flex justify-between items-center">
 <span className="text-white truncate max-w-[150px]">{child.name}</span>
 <span className="text-primary-400 font-bold ml-2 whitespace-nowrap">{child.class}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Action Buttons */}
 <div className="mt-auto flex items-center gap-2 pt-2">
 <a 
 href={`tel:${parent.parentPhone}`}
 className="flex-1 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
 >
 <Phone size={14} /> Call
 </a>
 <a 
 href={`https://wa.me/${(parent.whatsappPhone || parent.parentPhone).replace(/\D/g, '')}`}
 target="_blank"
 rel="noreferrer"
 className="flex-1 py-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
 >
 <MessageCircle size={14} /> WhatsApp
 </a>
 </div>
 </GlassCard>
 ))}
 {filteredParents.length === 0 && (
 <div className="col-span-full text-center py-10 text-dark-muted text-sm font-bold uppercase">
 No parents found matching your search.
 </div>
 )}
 </div>
 )}

 {/* Edit Parent Modal */}
 {isEditModalOpen && editingParent && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
 <GlassCard className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
 <div className="flex justify-between items-center mb-6">
 <h2 className="text-xl font-bold text-white flex items-center gap-2">
 <Edit2 className="text-primary-400" />
 Edit Parent Profile
 </h2>
 <button onClick={() => setIsEditModalOpen(false)} className="text-dark-muted hover:text-white">
 <X size={24} />
 </button>
 </div>

 <div className="bg-primary-500/10 border border-primary-500/20 p-3 rounded-lg mb-6">
 <p className="text-xs text-primary-400 font-bold">
 Note: Updating this profile will update the father/parent details for all {editingParent.children.length} enrolled children.
 </p>
 </div>

 <form onSubmit={handleSaveParent} className="space-y-4">
 <div>
 <label className="block text-xs font-bold text-dark-muted uppercase mb-1">Father Name</label>
 <input 
 type="text" 
 className="w-full premium-input"
 value={editingParent.fatherName}
 onChange={(e) => setEditingParent({...editingParent, fatherName: e.target.value})}
 required
 />
 </div>

 <div>
 <label className="block text-xs font-bold text-dark-muted uppercase mb-1">CNIC Number (Optional)</label>
 <input 
 type="text" 
 className="w-full premium-input"
 value={editingParent.fatherCnic}
 onChange={(e) => setEditingParent({...editingParent, fatherCnic: e.target.value})}
 placeholder="e.g. 42101-1234567-1 (Optional)"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-bold text-dark-muted uppercase mb-1">Phone Number</label>
 <input 
 type="tel" 
 className="w-full premium-input"
 value={editingParent.parentPhone}
 onChange={(e) => setEditingParent({...editingParent, parentPhone: e.target.value})}
 required
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-dark-muted uppercase mb-1">WhatsApp Number</label>
 <input 
 type="tel" 
 className="w-full premium-input"
 value={editingParent.whatsappPhone}
 onChange={(e) => setEditingParent({...editingParent, whatsappPhone: e.target.value})}
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-bold text-dark-muted uppercase mb-1">Email Address (Optional)</label>
 <input 
 type="email" 
 className="w-full premium-input"
 value={editingParent.parentEmail}
 onChange={(e) => setEditingParent({...editingParent, parentEmail: e.target.value})}
 />
 </div>

 <div className="pt-4 flex justify-end gap-3">
 <button 
 type="button" 
 onClick={() => setIsEditModalOpen(false)}
 className="px-4 py-2 rounded-lg font-bold text-sm bg-dark-hover text-dark-muted hover:text-white"
 >
 Cancel
 </button>
 <button 
 type="submit" 
 disabled={saving}
 className="px-6 py-2 rounded-lg font-bold text-sm bg-primary-600 hover:bg-primary-500 text-white transition-colors"
 >
 {saving ? 'Saving...' : 'Save Changes'}
 </button>
 </div>
 </form>
 </GlassCard>
 </div>
 )}
 </div>
 );
};

export default ParentsDirectory;

