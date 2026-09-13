import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { getSingleRecord, addRecord, updateRecord } from '../../services/db';

const ChatbotMenuBuilder = () => {
 const { userData } = useAuth();
 const schoolId = userData?.schoolId || 'default-school';
 const [rules, setRules] = useState([]);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 const fetchRules = async () => {
 try {
 setLoading(true);
 // We'll fetch from the backend API so it stays in sync
 const res = await fetch(`https://umarhayat.alwaysdata.net/api/rules?schoolId=${schoolId}`);
 if (res.ok) {
 const data = await res.json();
 if (data.success) {
 setRules(data.rules || []);
 }
 }
 } catch (err) {
 console.error("Failed to fetch rules", err);
 } finally {
 setLoading(false);
 }
 };
 fetchRules();
 }, [schoolId]);

 const handleAddRule = () => {
 const newRule = {
 id: `rule-${Date.now()}`,
 keywords: '',
 title: 'New Custom Action',
 response: '',
 active: true,
 triggerCount: 0,
 actionType: 'text' // Can be 'text', 'send_voucher', 'send_document'
 };
 setRules([...rules, newRule]);
 };

 const handleUpdateRule = (index, field, value) => {
 const updated = [...rules];
 updated[index][field] = value;
 setRules(updated);
 };

 const handleDeleteRule = (index) => {
 const updated = [...rules];
 updated.splice(index, 1);
 setRules(updated);
 };

 const handleSave = async () => {
 setSaving(true);
 try {
 const res = await fetch(`https://umarhayat.alwaysdata.net/api/rules/update`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ schoolId, rules })
 });
 if (res.ok) {
 alert("Menu options saved & synced with WhatsApp Bot successfully!");
 } else {
 alert("Failed to save rules.");
 }
 } catch (err) {
 alert("Error saving rules: " + err.message);
 } finally {
 setSaving(false);
 }
 };

 if (loading) return <div className="p-4 text-center">Loading Menu Editor...</div>;

 return (
 <div className="mt-8">
 <div className="flex justify-between items-center mb-6">
 <div>
 <h2 className="text-2xl font-bold text-dark-text">AI Chatbot Menu Editor</h2>
 <p className="text-dark-muted">Customize the options parents see when they type "menu".</p>
 </div>
 <button
 onClick={handleSave}
 disabled={saving}
 className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors"
 >
 {saving ? 'Saving...' : '💾 Save & Sync Bot'}
 </button>
 </div>

 <div className="grid gap-6 mb-6">
 {/* Custom Rules */}
 {rules.map((rule, idx) => (
 <GlassCard key={rule.id} className="p-5 border-l-4 border-l-emerald-500 relative">
 <button 
 onClick={() => handleDeleteRule(idx)}
 className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors"
 title="Delete Rule"
 >
 ✕
 </button>
 <div className="flex justify-between items-center mb-4">
 <h3 className="font-bold text-lg flex items-center gap-2">
 Option {idx + 1}: 
 <input 
 type="text" 
 value={rule.title} 
 onChange={(e) => handleUpdateRule(idx, 'title', e.target.value)}
 className="bg-dark-surface/50 border border-dark-border rounded px-2 py-1 text-sm outline-none focus:border-emerald-500"
 placeholder="E.g., Download Voucher"
 />
 </h3>
 <div className="mr-8 flex items-center gap-2">
 <span className="text-xs font-semibold text-dark-muted">Active:</span>
 <input 
 type="checkbox" 
 checked={rule.active}
 onChange={(e) => handleUpdateRule(idx, 'active', e.target.checked)}
 className="w-4 h-4 cursor-pointer"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-bold text-dark-muted mb-1">Trigger Keywords (Comma separated)</label>
 <input 
 type="text" 
 value={rule.keywords} 
 onChange={(e) => handleUpdateRule(idx, 'keywords', e.target.value)}
 className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2 outline-none focus:border-emerald-500"
 placeholder={`E.g., ${idx + 1}, voucher, slip, challan`}
 />
 <p className="text-[10px] text-dark-muted mt-1">If the parent types any of these words, this option will trigger.</p>
 </div>

 <div>
 <label className="block text-xs font-bold text-dark-muted mb-1">Action Type</label>
 <select 
 value={rule.actionType || 'text'} 
 onChange={(e) => handleUpdateRule(idx, 'actionType', e.target.value)}
 className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2 outline-none focus:border-emerald-500"
 >
 <option value="text">Just Reply with Text</option>
 <option value="send_voucher">Fetch & Send Student Fee Voucher Link</option>
 <option value="send_document">Send specific Document/Link</option>
 </select>
 </div>

 <div className="md:col-span-2">
 <label className="block text-xs font-bold text-dark-muted mb-1">
 {rule.actionType === 'send_voucher' ? 'Voucher Message (Included with secure link)' : 'Bot Response Text'}
 </label>
 <textarea 
 value={rule.response} 
 onChange={(e) => handleUpdateRule(idx, 'response', e.target.value)}
 className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2 outline-none focus:border-emerald-500 h-24 resize-none"
 placeholder="Enter the reply message..."
 />
 {rule.actionType === 'text' && (
 <p className="text-[10px] text-emerald-500 mt-1">Variables supported: {'{student_name}'}, {'{grade}'}, {'{fee_balance}'}</p>
 )}
 </div>
 </div>
 </GlassCard>
 ))}

 <button 
 onClick={handleAddRule}
 className="w-full py-4 border-2 border-dashed border-emerald-500/50 text-emerald-500 font-bold rounded-2xl hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-2"
 >
 <span>➕</span> Add New Menu Option
 </button>
 </div>
 </div>
 );
};

export default ChatbotMenuBuilder;

