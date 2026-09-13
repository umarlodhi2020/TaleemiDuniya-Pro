import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
 Receipt, 
 ArrowLeft, 
 User, 
 Calendar, 
 CreditCard,
 Printer,
 FileText,
 ChevronDown,
 Plus,
 Trash2,
 Phone,
 Search,
 CheckCircle2,
 Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { addRecord, getRecords, getSingleRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const normalizeClass = (cls) => {
 if (!cls) return null;
 const str = String(cls).toLowerCase().trim();
 if (str.includes('nursery') || str.includes('nur') || str.includes('play')) return 'Nursery';
 if (str.includes('prep') || str.includes('ps-i') || str.includes('kg')) return 'Prep';
 const match = str.match(/(\d+)/);
 if (match) {
 const num = parseInt(match[1]);
 if (num >= 1 && num <= 10) return String(num);
 }
 return String(cls);
};

const GenerateVoucher = () => {
 const navigate = useNavigate();
 const { userData } = useAuth();
 const { classFees: contextClassFees = {} } = useSchool();
 const [loading, setLoading] = useState(false);
 const [bulkGenerating, setBulkGenerating] = useState(false);
 const [selectionType, setSelectionType] = useState('family');
 
 // Search & Suggestions State
 const [searchQuery, setSearchQuery] = useState('');
 const [showSuggestions, setShowSuggestions] = useState(false);
 const [allStudents, setAllStudents] = useState([]);
 const [classFees, setClassFees] = useState(contextClassFees);
 const [selectedFamilyGroup, setSelectedFamilyGroup] = useState(null);
 const [selectedStudent, setSelectedStudent] = useState(null);
 const wrapperRef = useRef(null);

 const [feeMonth, setFeeMonth] = useState(new Date().toISOString().slice(0, 7));
 const [dueDate, setDueDate] = useState('');
 const [feeItems, setFeeItems] = useState([]);
 const [discountAmount, setDiscountAmount] = useState('');

 useEffect(() => {
 setClassFees(prev => ({ ...prev, ...contextClassFees }));
 }, [contextClassFees]);

 useEffect(() => {
 const fetchData = async () => {
 if (userData?.schoolId) {
 const students = await getRecords('students', userData.schoolId);
 setAllStudents(students);
 
 const settings = await getSingleRecord('school_settings', userData.schoolId);
 if (settings && settings.classFees) {
 setClassFees(prev => ({ ...settings.classFees, ...prev }));
 }
 }
 };
 fetchData();
 }, [userData]);

 useEffect(() => {
 function handleClickOutside(event) {
 if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
 setShowSuggestions(false);
 }
 }
 document.addEventListener("mousedown", handleClickOutside);
 return () => document.removeEventListener("mousedown", handleClickOutside);
 }, [wrapperRef]);

 // Group students by Father CNIC or Phone for Family Voucher
 const familyGroups = useMemo(() => {
 if (selectionType !== 'family' && selectionType !== 'all') return [];
 const groupMap = new Map();
 
 allStudents.forEach(st => {
 const cnicKey = st.fatherCnic ? st.fatherCnic.replace(/[^0-9]/g, '') : null;
 const phoneKey = st.parentPhone || st.fatherPhone || st.phone || '';
 const cleanPhone = String(phoneKey).replace(/[^0-9]/g, '');
 const nameKey = st.fatherName ? st.fatherName.trim().toLowerCase() : 'unknown_father';

 const isScientificPhone = String(phoneKey).toUpperCase().includes('E');
 const isDummyPhone = cleanPhone === '00000000000' || cleanPhone === '1234567890' || cleanPhone === '03000000000';
 const isValidPhone = cleanPhone.length >= 10 && !isScientificPhone && !isDummyPhone;

 let familyKey = st.familyId;
 if (!familyKey) {
 if (cnicKey && cnicKey.length > 8) {
 familyKey = `cnic_${cnicKey}`;
 } else if (isValidPhone && nameKey !== 'unknown_father') {
 familyKey = `phone_${cleanPhone}_fname_${nameKey.replace(/\s+/g, '_')}`;
 } else if (isValidPhone) {
 familyKey = `phone_${cleanPhone}`;
 } else if (nameKey !== 'unknown_father') {
 familyKey = `name_${nameKey.replace(/\s+/g, '_')}_${cleanPhone || 'nophone'}`;
 } else {
 familyKey = `student_${st.id}`;
 }
 }

 if (!groupMap.has(familyKey)) {
 groupMap.set(familyKey, {
 id: familyKey,
 cnic: st.fatherCnic || st.cnic || '',
 phone: st.parentPhone || st.fatherPhone || st.phone || '',
 fatherName: st.fatherName || 'Unknown',
 children: []
 });
 }
 groupMap.get(familyKey).children.push(st);
 });
 return Array.from(groupMap.values());
 }, [allStudents, selectionType]);

 const filteredSuggestions = useMemo(() => {
 if (!searchQuery) return [];
 const lowerQuery = searchQuery.toLowerCase();
 
 if (selectionType === 'family') {
 return familyGroups.filter(g => 
 (g.fatherName || '').toLowerCase().includes(lowerQuery) ||
 (g.cnic || '').toLowerCase().includes(lowerQuery) ||
 (g.phone || '').toLowerCase().includes(lowerQuery)
 );
 } else {
 return allStudents.filter(s => 
 (s.name || '').toLowerCase().includes(lowerQuery) ||
 (s.rollNo || '').toLowerCase().includes(lowerQuery) ||
 (s.fatherName || '').toLowerCase().includes(lowerQuery) ||
 (s.fatherCnic || '').toLowerCase().includes(lowerQuery)
 );
 }
 }, [searchQuery, familyGroups, allStudents, selectionType]);

 const handleSelectSuggestion = async (item) => {
  let autoFeeItems = [];
  
  // Fetch vouchers to calculate real arrears
  const allVouchers = await getRecords('vouchers', userData?.schoolId || 'default-school');

  if (selectionType === 'family') {
  setSelectedFamilyGroup(item);
  setSearchQuery(`${item.fatherName} ${item.cnic ? `(${item.cnic})` : ''}`);
  
  const familyVouchers = new Set();
  let totalArrears = 0;

  // Auto-populate fees for all children in the family
  item.children.forEach(child => {
  const rawClass = child.class || child.standard;
  const normalizedClass = normalizeClass(rawClass);
  const defaultClassFee = normalizedClass && classFees[normalizedClass] ? classFees[normalizedClass].monthlyFee : 0;
  const feeAmount = child.monthlyFee || defaultClassFee;
  
  autoFeeItems.push({
  name: `Tuition Fee - ${child.name} (${rawClass || 'N/A'})`,
  amount: feeAmount || ''
  });

  // Calculate true lifetime arrears for this child from all vouchers to prevent double counting
  allVouchers.forEach(v => {
    const rollNo = child.rollNumber || child.rollNo;
    let matches = false;
    if (v.studentId === child.id) matches = true;
    if (v.childrenIds && v.childrenIds.includes(child.id)) matches = true;
    if (v.childrenDetails && v.childrenDetails.some(c => c.admNo && rollNo && String(c.admNo).trim() === String(rollNo).trim())) matches = true;
    
    if (matches && !familyVouchers.has(v.id)) {
      familyVouchers.add(v.id);
      
      const vTotal = Number(v.totalAmount) || 0;
      const vPaid = Number(v.paidAmount) || 0;
      const vDiscount = Number(v.discountAmount) || 0;
      
      let vArrearsItem = 0;
      if (v.feeItems && Array.isArray(v.feeItems)) {
        v.feeItems.forEach(item => {
          if (item.name && (item.name.startsWith('Previous Arrears') || item.name.startsWith('Total Previous Arrears') || item.name.startsWith('Arrears - ') || item.name.startsWith('Opening Balance (Old Arrears)'))) {
            vArrearsItem += (Number(item.amount) || 0);
          }
        });
      }
      
      // The true contribution of this voucher to the lifetime debt
      // (Total billed minus what was already rolled over) - (Amount paid/discounted)
      const trueDebtContribution = (vTotal - vArrearsItem) - vPaid - vDiscount;
      totalArrears += trueDebtContribution;
    }
  });
  });
  
  if (totalArrears > 0) {
    const itemName = familyVouchers.size === 0 ? 'Opening Balance (Old Arrears)' : 'Total Previous Arrears';
    autoFeeItems.push({ name: itemName, amount: totalArrears });
  }
  setFeeItems(autoFeeItems);

  } else {
  setSelectedStudent(item);
  setSearchQuery(`${item.name} (${item.rollNo || item.id})`);
  
  // Auto-populate fee for single student
  const rawClass = item.class || item.standard;
  const normalizedClass = normalizeClass(rawClass);
  const defaultClassFee = normalizedClass && classFees[normalizedClass] ? classFees[normalizedClass].monthlyFee : 0;
  const feeAmount = item.monthlyFee || defaultClassFee;
  
  let items = [{
  name: `Tuition Fee - ${item.name} (${rawClass || 'N/A'})`,
  amount: feeAmount || ''
  }];

  let totalArrears = 0;
  allVouchers.forEach(v => {
    const rollNo = item.rollNumber || item.rollNo;
    let matches = false;
    if (v.studentId === item.id) matches = true;
    if (v.childrenIds && v.childrenIds.includes(item.id)) matches = true;
    if (v.childrenDetails && v.childrenDetails.some(c => c.admNo && rollNo && c.name && item.name && String(c.admNo).trim() === String(rollNo).trim() && String(c.name).trim().toLowerCase() === String(item.name).trim().toLowerCase())) matches = true;
    
    if (matches) {
      const vTotal = Number(v.totalAmount) || 0;
      const vPaid = Number(v.paidAmount) || 0;
      const vDiscount = Number(v.discountAmount) || 0;
      
      let vArrearsItem = 0;
      if (v.feeItems && Array.isArray(v.feeItems)) {
        v.feeItems.forEach(fi => {
          if (fi.name && (fi.name.startsWith('Previous Arrears') || fi.name.startsWith('Total Previous Arrears') || fi.name.startsWith('Arrears - ') || fi.name.startsWith('Opening Balance (Old Arrears)'))) {
            vArrearsItem += (Number(fi.amount) || 0);
          }
        });
      }
      
      const trueDebtContribution = (vTotal - vArrearsItem) - vPaid - vDiscount;
      totalArrears += trueDebtContribution;
    }
  });

  if (totalArrears > 0) {
    let hasPrevious = false;
    allVouchers.forEach(v => {
      if (v.studentId === item.id) hasPrevious = true;
      if (v.childrenIds && v.childrenIds.includes(item.id)) hasPrevious = true;
      if (v.childrenDetails && v.childrenDetails.some(c => c.admNo && item.rollNo && c.name && item.name && String(c.admNo).trim() === String(item.rollNo).trim() && String(c.name).trim().toLowerCase() === String(item.name).trim().toLowerCase())) hasPrevious = true;
    });
    const itemName = hasPrevious ? 'Total Previous Arrears' : 'Opening Balance (Old Arrears)';
    items.push({ name: itemName, amount: totalArrears });
  }

  setFeeItems(items);
  }
  setShowSuggestions(false);
  };

 const handleSelectionTypeChange = (e) => {
 setSelectionType(e.target.value);
 setSearchQuery('');
 setSelectedFamilyGroup(null);
 setSelectedStudent(null);
 };

 const addFeeItem = () => setFeeItems([...feeItems, { name: '', amount: '' }]);
 const addAnnualFund = () => {
 if (selectionType === 'all') {
 const exists = feeItems.find(i => i.isAutoAnnual);
 if (exists) return alert("Annual Fund is already added.");
 setFeeItems([...feeItems, { name: 'Annual Fund (Auto calculated per student)', amount: '', isAutoAnnual: true }]);
 return;
 }

 let itemsToAdd = [];
 if (selectionType === 'family' && selectedFamilyGroup) {
 selectedFamilyGroup.children.forEach(child => {
 const rawClass = child.class || child.standard;
 const normalizedClass = normalizeClass(rawClass);
 const defaultAnnual = normalizedClass && classFees[normalizedClass] ? classFees[normalizedClass].annualFee : 0;
 const annualAmount = child.annualFee || defaultAnnual;
 if (annualAmount && Number(annualAmount) > 0) {
 itemsToAdd.push({ name: `Annual Fund - ${child.name}`, amount: annualAmount });
 }
 });
 } else if (selectionType === 'student' && selectedStudent) {
 const rawClass = selectedStudent.class || selectedStudent.standard;
 const normalizedClass = normalizeClass(rawClass);
 const defaultAnnual = normalizedClass && classFees[normalizedClass] ? classFees[normalizedClass].annualFee : 0;
 const annualAmount = selectedStudent.annualFee || defaultAnnual;
 if (annualAmount && Number(annualAmount) > 0) {
 itemsToAdd.push({ name: `Annual Fund - ${selectedStudent.name}`, amount: annualAmount });
 }
 }
 
 if (itemsToAdd.length > 0) {
 setFeeItems([...feeItems, ...itemsToAdd]);
 } else {
 alert("No Annual Fund amount configured for selected student(s).");
 }
 };
 const removeFeeItem = (index) => setFeeItems(feeItems.filter((_, i) => i !== index));

 const totalAmount = feeItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) - Number(discountAmount || 0);

 const handleGenerate = async () => {
 if (selectionType === 'all') {
 return handleBulkGenerate();
 }

 if (selectionType === 'student' && !selectedStudent) return alert('Please select a student');
 if (selectionType === 'family' && !selectedFamilyGroup) return alert('Please select a family');

 setLoading(true);
 try {
  const finalItems = [...feeItems];

 if (Number(discountAmount) > 0) {
 finalItems.push({ name: 'Discount / Scholarship', amount: -Math.abs(Number(discountAmount)) });
 }
 
 const totalAmt = finalItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

 // Fetch max voucher number
 const existingVouchers = await getRecords('vouchers', userData?.schoolId || 'default-school');
 let maxVoucherNo = 1000;
 existingVouchers.forEach(v => {
 if (v.voucherNo && v.voucherNo > maxVoucherNo) maxVoucherNo = v.voucherNo;
 });
 const nextVoucherNo = maxVoucherNo + 1;

 const voucherData = {
 voucherNo: nextVoucherNo,
 selectionType,
 month: feeMonth,
 dueDate,
 feeItems: finalItems,
 totalAmount: totalAmt,
 status: 'Unpaid'
 };

 if (selectionType === 'student') {
 voucherData.studentId = selectedStudent.id;
 voucherData.studentName = selectedStudent.name;
 voucherData.rollNo = selectedStudent.rollNo;
 voucherData.childrenDetails = [{
 admNo: selectedStudent.rollNumber || selectedStudent.rollNo || '-',
 name: selectedStudent.name,
 class: selectedStudent.class || selectedStudent.standard || 'N/A',
 arrears: Number(selectedStudent.balance || 0)
 }];
 } else {
 voucherData.fatherCnic = selectedFamilyGroup.cnic;
 voucherData.fatherName = selectedFamilyGroup.fatherName;
 voucherData.phone = selectedFamilyGroup.phone;
 voucherData.childrenIds = selectedFamilyGroup.children.map(c => c.id);
 voucherData.childrenDetails = selectedFamilyGroup.children.map(c => ({
 admNo: c.rollNumber || c.rollNo || '-',
 name: c.name,
 class: c.class || c.standard || 'N/A',
 arrears: Number(c.balance || 0)
 }));
 }

 const result = await addRecord('vouchers', voucherData, userData?.schoolId || 'default-school');
 if (result.success) {
 navigate(`/school-admin/fees/print/voucher/${result.id}`);
 }
 } catch (error) {
 console.error(error);
 } finally {
 setLoading(false);
 }
 };

 const handleBulkGenerate = async () => {
 if (!feeMonth || !dueDate) return alert('Please select Fee Month and Due Date first.');
 if (!familyGroups || familyGroups.length === 0) return alert('No students found in the school to generate vouchers.');
 
 if (!window.confirm(`Are you sure you want to generate vouchers for ALL ${familyGroups.length} families in the school? This will take a few moments.`)) return;

 setBulkGenerating(true);
 let successCount = 0;

 try {
 // Fetch all vouchers once — used for arrears calculation AND max voucher no
 const allVouchers = await getRecords('vouchers', userData?.schoolId || 'default-school');
 let maxVoucherNo = 1000;
 allVouchers.forEach(v => {
 if (v.voucherNo && v.voucherNo > maxVoucherNo) maxVoucherNo = v.voucherNo;
 });

 // Helper: calculate real unpaid arrears from existing vouchers
 const getArrearsForStudent = (studentId, rollNo) => {
 return allVouchers
 .filter(v => {
 if (v.status === 'Paid') return false;
 const rem = (Number(v.totalAmount) || 0) - (Number(v.paidAmount) || 0) - (Number(v.discountAmount) || 0);
 if (rem <= 0) return false;
 if (v.studentId === studentId) return true;
 if (v.childrenDetails && v.childrenDetails.some(c =>
 c.admNo && rollNo && String(c.admNo).trim() === String(rollNo).trim()
 )) return true;
 if (v.childrenIds && v.childrenIds.includes(studentId)) return true;
 return false;
 })
 .reduce((sum, v) => {
const rem = (Number(v.totalAmount) || 0) - (Number(v.paidAmount) || 0) - (Number(v.discountAmount) || 0);
 return sum + rem;
 }, 0);
 };

 const generatedIds = [];
 for (const group of familyGroups) {
 maxVoucherNo++;
 let items = [];
 
 const familyVouchers = new Set();
 let totalArrears = 0;

 group.children.forEach(child => {
 const rawClass = child.class || child.standard;
 const normalizedClass = normalizeClass(rawClass);
 const defaultClassFee = normalizedClass && classFees[normalizedClass] ? classFees[normalizedClass].monthlyFee : 0;
 const feeAmount = child.monthlyFee || defaultClassFee;
 
 items.push({
 name: `Tuition Fee - ${child.name} (${rawClass || 'N/A'})`,
 amount: feeAmount || 0
 });

 // Calculate real unpaid arrears from previous vouchers for family
 allVouchers.forEach(v => {
   if (v.status === 'Paid') return;
   const rem = (Number(v.totalAmount) || 0) - (Number(v.paidAmount) || 0) - (Number(v.discountAmount) || 0);
   if (rem <= 0) return;
   const rollNo = child.rollNumber || child.rollNo;
   
   let matches = false;
   if (v.studentId === child.id) matches = true;
   if (v.childrenIds && v.childrenIds.includes(child.id)) matches = true;
   if (v.childrenDetails && v.childrenDetails.some(c => c.admNo && rollNo && String(c.admNo).trim() === String(rollNo).trim())) matches = true;
   
   if (matches && !familyVouchers.has(v.id)) {
     familyVouchers.add(v.id);
     totalArrears += rem;
   }
 });
 });

 if (totalArrears > 0) {
   items.push({ name: 'Total Previous Arrears', amount: totalArrears });
 }

 // ADD ADDITIONAL FEE HEADS HERE (for bulk)
 feeItems.forEach(head => {
 if (head.isAutoAnnual) {
 group.children.forEach(c => {
 const rawClass = c.class || c.standard;
 const normalizedClass = normalizeClass(rawClass);
 const defaultAnnual = normalizedClass && classFees[normalizedClass] ? classFees[normalizedClass].annualFee : 0;
 const annualAmount = c.annualFee || defaultAnnual;
 if (annualAmount && Number(annualAmount) > 0) {
 items.push({ name: `Annual Fund - ${c.name}`, amount: Number(annualAmount) });
 }
 });
 } else if (head.name && head.amount) {
 items.push({ 
 name: `${head.name} (${group.children.length}x)`, 
 amount: Number(head.amount) * group.children.length 
 });
 }
 });

 if (Number(discountAmount) > 0) {
 items.push({ name: 'Discount / Scholarship', amount: -Math.abs(Number(discountAmount)) });
 }

 const totalAmt = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

 const voucherData = {
 voucherNo: maxVoucherNo,
 selectionType: 'family',
 month: feeMonth,
 dueDate,
 feeItems: items,
 totalAmount: totalAmt,
 status: 'Unpaid',
 fatherCnic: group.cnic,
 fatherName: group.fatherName,
 phone: group.phone,
 childrenIds: group.children.map(c => c.id),
 childrenDetails: group.children.map(c => ({
 admNo: c.rollNumber || c.rollNo || c.grNo || c.grNumber || '-',
 name: c.name,
 class: c.class || c.standard || 'N/A',
 arrears: Number(c.balance || 0)
 }))
 };

 const result = await addRecord('vouchers', voucherData, userData?.schoolId || 'default-school');
 if (result.success) {
 successCount++;
 generatedIds.push(result.id);
 }
 }
 
 // Navigate to bulk print view and pass all generated IDs
 navigate('/school-admin/fees/print/voucher/bulk', { state: { voucherIds: generatedIds } });
 } catch (error) {
 console.error(error);
 alert('An error occurred during bulk generation.');
 } finally {
 setBulkGenerating(false);
 }
 };

 return (
 <div className="space-y-6 animate-fade-in pb-10">
 <div className="flex items-center gap-4">
 <button 
 onClick={() => navigate(-1)}
 className="p-2 hover:bg-dark-hover rounded-xl text-dark-muted transition-all"
 >
 <ArrowLeft size={20} />
 </button>
 <div>
 <h1 className="text-2xl font-bold text-dark-text">Generate Fee Voucher</h1>
 <p className="text-dark-muted text-sm mt-0.5">Create digital vouchers for students and families.</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-6">
 <GlassCard className="p-8 relative z-[100]">
 <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary-500">
 <Receipt size={20} /> Selection & Duration
 </h2>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Selection Type</label>
 <div className="relative">
 <select 
 value={selectionType}
 onChange={handleSelectionTypeChange}
 className="w-full premium-input appearance-none"
 >
 <option value="student">Single Student Voucher</option>
 <option value="family">Family / Siblings Voucher</option>
 <option value="all">All School (Bulk Generate)</option>
 </select>
 <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
 </div>
 </div>

 {selectionType !== 'all' && (
 <div className="space-y-2" ref={wrapperRef}>
 <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">
 {selectionType === 'family' ? 'Search Father (CNIC/Name/Phone)' : 'Search Student (Name/Roll No)'}
 </label>
 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
 <input 
 type="text" 
 value={searchQuery}
 onChange={(e) => {
 setSearchQuery(e.target.value);
 setShowSuggestions(true);
 if (selectionType === 'family') setSelectedFamilyGroup(null);
 else setSelectedStudent(null);
 }}
 onFocus={() => setShowSuggestions(true)}
 placeholder={selectionType === 'family' ? "e.g. 35202... or 0300..." : "e.g. Ali or STU-101"}
 className="w-full premium-input pl-12"
 />
 {/* Selection Indicator */}
 {(selectedFamilyGroup || selectedStudent) && (
 <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={18} />
 )}

 {/* Auto Suggestion Dropdown */}
 {showSuggestions && searchQuery && filteredSuggestions.length > 0 && (
 <div className="absolute z-50 w-full mt-2 bg-dark-card border border-dark-border rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-hidden animate-fade-in">
 {selectionType === 'family' ? (
 filteredSuggestions.map((group) => (
 <div 
 key={group.id} 
 onClick={() => handleSelectSuggestion(group)}
 className="p-3 border-b border-dark-border/50 hover:bg-dark-hover cursor-pointer transition-colors"
 >
 <div className="font-bold flex items-center gap-2">
 <Users size={14} className="text-primary-500" />
 {group.fatherName}
 </div>
 <div className="text-xs text-dark-muted mt-1 flex items-center gap-3">
 {group.cnic && <span>CNIC: {group.cnic}</span>}
 {group.phone && <span>Phone: {group.phone}</span>}
 </div>
 <div className="text-xs text-primary-400 mt-1">
 {group.children.length} Sibling(s) Found
 </div>
 </div>
 ))
 ) : (
 filteredSuggestions.map((student) => (
 <div 
 key={student.id} 
 onClick={() => handleSelectSuggestion(student)}
 className="p-3 border-b border-dark-border/50 hover:bg-dark-hover cursor-pointer transition-colors"
 >
 <div className="font-bold flex items-center gap-2">
 <User size={14} className="text-primary-500" />
 {student.name}
 </div>
 <div className="text-xs text-dark-muted mt-1 flex items-center gap-3">
 {student.rollNo && <span>Roll: {student.rollNo}</span>}
 {student.fatherName && <span>Father: {student.fatherName}</span>}
 {student.fatherCnic && <span>CNIC: {student.fatherCnic}</span>}
 </div>
 </div>
 ))
 )}
 </div>
 )}
 {showSuggestions && searchQuery && filteredSuggestions.length === 0 && (
 <div className="absolute z-50 w-full mt-2 bg-dark-card border border-dark-border rounded-xl shadow-2xl p-4 text-center text-dark-muted text-sm">
 No results found
 </div>
 )}
 </div>
 </div>
 )}

 <div className="space-y-2">
 <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Fee Month</label>
 <div className="relative">
 <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
 <input 
 type="month" 
 value={feeMonth}
 onChange={(e) => setFeeMonth(e.target.value)}
 className="w-full premium-input pl-12" 
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Due Date</label>
 <div className="relative">
 <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
 <input 
 type="date" 
 value={dueDate}
 onChange={(e) => setDueDate(e.target.value)}
 className="w-full premium-input pl-12" 
 />
 </div>
 </div>
 </div>
 </GlassCard>

 <GlassCard className="p-8">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-lg font-bold flex items-center gap-2 text-primary-500">
 <CreditCard size={20} /> Fee Structure {selectionType === 'all' && '(Bulk + Extras)'}
 </h2>
 <div className="flex items-center gap-4">
 <button 
 onClick={addAnnualFund}
 className="text-xs font-black text-cyan-500 uppercase tracking-widest flex items-center gap-1 hover:text-cyan-400 transition-colors"
 >
 <Plus size={14} /> Add Annual Fund
 </button>
 <button 
 onClick={addFeeItem}
 className="text-xs font-black text-primary-500 uppercase tracking-widest flex items-center gap-1 hover:text-primary-400 transition-colors"
 >
 <Plus size={14} /> Add Head
 </button>
 </div>
 </div>

 {selectionType === 'all' && (
 <div className="p-6 mb-6 bg-dark-hover rounded-xl text-center border border-dashed border-dark-border">
 <Users size={32} className="mx-auto text-dark-muted mb-3" />
 <h3 className="text-white font-bold mb-1">Bulk Generation Mode Active</h3>
 <p className="text-sm text-dark-muted">Base tuition fees are auto-calculated from Class Setup. You can add extra heads (e.g. Copies, Exam Fee) below to apply to ALL students.</p>
 </div>
 )}

 <div className="space-y-4">
 {feeItems.map((item, index) => (
 <div key={index} className="flex gap-4 items-end animate-slide-in">
 <div className="flex-1 space-y-2">
 {index === 0 && <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Fee Head Name</label>}
 <input 
 type="text" 
 placeholder={selectionType === 'all' ? "e.g. Copies / Stationery" : "e.g. Exam Fee"}
 value={item.name}
 onChange={(e) => {
 const newItems = [...feeItems];
 newItems[index].name = e.target.value;
 setFeeItems(newItems);
 }}
 className="w-full premium-input"
 />
 </div>
 <div className="w-40 space-y-2">
 {index === 0 && <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Amount</label>}
 <input 
 type="number" 
 placeholder="0.00"
 value={item.amount}
 disabled={item.isAutoAnnual}
 onChange={(e) => {
 const newItems = [...feeItems];
 newItems[index].amount = e.target.value;
 setFeeItems(newItems);
 }}
 className="w-full premium-input disabled:opacity-50"
 />
 </div>
 <button 
 onClick={() => removeFeeItem(index)}
 className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
 >
 <Trash2 size={18} />
 </button>
 </div>
 ))}
 </div>
 {/* Discount Field */}
 <div className="mt-6 pt-6 border-t border-dark-border flex justify-between items-center animate-slide-in">
 <p className="text-sm font-bold text-dark-muted uppercase tracking-[0.1em]">Apply Discount (PKR)</p>
 <div className="w-40 relative">
 <input 
 type="number" 
 placeholder="e.g. 500"
 value={discountAmount}
 onChange={(e) => setDiscountAmount(e.target.value)}
 className="w-full premium-input text-right text-green-500 font-bold pr-4"
 />
 </div>
 </div>

 <div className="mt-6 pt-6 border-t border-dark-border flex justify-between items-center">
 <p className="text-sm font-bold text-dark-muted uppercase tracking-[0.2em]">Grand Total</p>
 <h3 className="text-3xl font-black text-primary-500">PKR {totalAmount.toLocaleString()}</h3>
 </div>
 </GlassCard>
 </div>

 <div className="space-y-6">
 <GlassCard className="p-8">
 <h2 className="text-lg font-bold mb-6">Voucher Summary</h2>
 <div className="space-y-4 text-sm">
 <div className="flex justify-between">
 <span className="text-dark-muted">Items Count</span>
 <span className="font-bold">{selectionType === 'all' ? familyGroups.length : feeItems.length} {selectionType === 'all' ? 'Families' : 'Heads'}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-dark-muted">Total Payable</span>
 <span className="font-bold text-primary-500">PKR {totalAmount}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-dark-muted">Late Surcharge</span>
 <span className="font-bold">PKR 500</span>
 </div>
 </div>

 <div className="mt-10 space-y-3">
 <button 
 onClick={selectionType === 'all' ? handleBulkGenerate : handleGenerate}
 disabled={loading || bulkGenerating}
 className="w-full premium-button-primary disabled:opacity-50"
 >
 <Printer size={18} />
 {(loading || bulkGenerating) ? 'Generating...' : 'Generate & Print'}
 </button>
 <button className="w-full premium-button-secondary">
 <FileText size={18} />
 Save Template
 </button>
 </div>
 </GlassCard>

 <GlassCard className="bg-dark-card border-dashed border-2 border-dark-border flex flex-col items-center justify-center p-8 text-center">
 <div className="w-16 h-16 rounded-2xl bg-dark-hover flex items-center justify-center text-dark-muted mb-4">
 <Receipt size={32} />
 </div>
 <h4 className="font-bold">Automated Billing</h4>
 <p className="text-[10px] text-dark-muted uppercase mt-2 tracking-widest">
 Vouchers will be available in student portals instantly after generation.
 </p>
 </GlassCard>
 </div>
 </div>
 </div>
 );
};

export default GenerateVoucher;

