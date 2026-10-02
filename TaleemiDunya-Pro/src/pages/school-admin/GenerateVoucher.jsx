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
 Users,
 History,
 X,
 Clock
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
  return String(cls).trim();
};

const getClassFeeInfo = (rawClass, classFeesMap) => {
  if (!rawClass || !classFeesMap) return { monthlyFee: 0, annualFee: 0, admissionFee: 0, otherFee: 0 };
  const rawStr = String(rawClass).trim();
  if (classFeesMap[rawStr]) return classFeesMap[rawStr];
  
  const norm = normalizeClass(rawStr);
  if (norm && classFeesMap[norm]) return classFeesMap[norm];

  const lower = rawStr.toLowerCase();
  for (const key of Object.keys(classFeesMap)) {
    if (key.toLowerCase() === lower || key.toLowerCase().replace(/\s+/g, '') === lower.replace(/\s+/g, '')) {
      return classFeesMap[key];
    }
  }
  return { monthlyFee: 0, annualFee: 0, admissionFee: 0, otherFee: 0 };
};

const getStudentMonthly = (s, classFeeInfo) => {
  if (!s) return Number(classFeeInfo?.monthlyFee || 0);
  const val = s.monthlyFee !== undefined && s.monthlyFee !== '' 
    ? s.monthlyFee 
    : (s.tuitionFee !== undefined && s.tuitionFee !== '' ? s.tuitionFee : (s.fee !== undefined && s.fee !== '' ? s.fee : (classFeeInfo?.monthlyFee || 0)));
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const getStudentAnnual = (s, classFeeInfo) => {
  if (!s) return Number(classFeeInfo?.annualFee || 0);
  const val = s.annualFee !== undefined && s.annualFee !== '' 
    ? s.annualFee 
    : (s.annualFund !== undefined && s.annualFund !== '' ? s.annualFund : (s.annual !== undefined && s.annual !== '' ? s.annual : (classFeeInfo?.annualFee || 0)));
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const getStudentArrears = (s) => {
  if (!s) return 0;
  const val = s.balance !== undefined && s.balance !== '' 
    ? s.balance 
    : (s.arrears !== undefined && s.arrears !== '' ? s.arrears : (s.previousBalance !== undefined && s.previousBalance !== '' ? s.previousBalance : (s.openingBalance || 0)));
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const parseDateSafely = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val.seconds) return val.seconds * 1000;
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

const parseMonthToNumber = (m) => {
  if (!m) return 0;
  const str = String(m).trim();
  const yyyyMm = str.match(/^(\d{4})[-/](\d{1,2})/);
  if (yyyyMm) return parseInt(yyyyMm[1]) * 12 + parseInt(yyyyMm[2]);
  const mmYyyy = str.match(/^(\d{1,2})[-/](\d{4})/);
  if (mmYyyy) return parseInt(mmYyyy[2]) * 12 + parseInt(mmYyyy[1]);
  const monthNames = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
    may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
    oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
  };
  const yearMatch = str.match(/\b(20\d\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  const lower = str.toLowerCase();
  for (const [name, num] of Object.entries(monthNames)) {
    if (lower.includes(name)) return year * 12 + num;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.getFullYear() * 12 + (d.getMonth() + 1);
  return 0;
};

const isVoucherForFamily = (v, family) => {
  if (!v || !family) return false;

  const familyStudentIds = (family.children || []).map(c => c.id).filter(Boolean);
  
  if (v.selectionType === 'family') {
    if (v.childrenDetails && v.childrenDetails.length > 0) {
      return v.childrenDetails.some((vc, idx) => 
        family.children.some(c => 
          (c.rollNumber && String(c.rollNumber).trim() === String(vc.admNo).trim()) ||
          (c.rollNo && String(c.rollNo).trim() === String(vc.admNo).trim()) ||
          c.id === (v.childrenIds && v.childrenIds[idx])
        )
      );
    }
    
    // Fallbacks for legacy family vouchers without childrenDetails
    if (v.familyId && family.id) return v.familyId === family.id;
    
    const vCnic = String(v.fatherCnic || v.cnic || '').replace(/[^0-9]/g, '');
    const sCnic = String(family.cnic || family.fatherCnic || '').replace(/[^0-9]/g, '');
    if (vCnic && sCnic && vCnic.length > 8) return vCnic === sCnic;
    
    const vPhone = String(v.phone || v.parentPhone || v.fatherPhone || '').replace(/[^0-9]/g, '');
    const sPhone = String(family.phone || '').replace(/[^0-9]/g, '');
    const isDummyPhone = (p) => p === '00000000000' || p === '1234567890' || p === '03000000000' || p === '0000000000';
    if (vPhone && sPhone && vPhone.length >= 10 && vPhone === sPhone && !isDummyPhone(vPhone)) return true;
    
    return false;
  } else {
    // For student vouchers, check if the studentId belongs to this family
    return familyStudentIds.includes(v.studentId);
  }
};

const isVoucherForStudent = (v, student) => {
  if (!v || !student) return false;
  if (v.studentId && v.studentId === student.id) return true;
  if (v.childrenIds && v.childrenIds.includes(student.id)) return true;
  const stdRoll = String(student.admissionNumber || student.rollNo || student.rollNumber || student.grNo || '').trim();
  if (v.childrenDetails && v.childrenDetails.some(cd => 
    (cd.admNo && String(cd.admNo).trim() === stdRoll) ||
    (cd.name && String(cd.name).trim().toLowerCase() === String(student.name).trim().toLowerCase())
  )) return true;
  if (v.rollNo && stdRoll && String(v.rollNo).trim() === stdRoll) return true;
  return false;
};

const calculateFamilyArrears = (allVouchers, family) => {
  if (!family) return 0;
  const staticArrears = (family.children || []).reduce((sum, c) => sum + getStudentArrears(c), 0);
  if (!allVouchers || allVouchers.length === 0) return staticArrears;

  // 1. Find all vouchers belonging to this family
  const familyVouchers = allVouchers.filter(v => isVoucherForFamily(v, family));
  if (familyVouchers.length === 0) {
    return staticArrears;
  }

  // 2. Sort all family vouchers descending by voucherNo / creation date to get the latest voucher
  familyVouchers.sort((a, b) => {
    const noA = Number(a.voucherNo || a.voucherNumber || 0);
    const noB = Number(b.voucherNo || b.voucherNumber || 0);
    if (noA && noB && noA !== noB) return noB - noA;
    const dateA = parseDateSafely(a.createdAt || a.date || a.month || 0);
    const dateB = parseDateSafely(b.createdAt || b.date || b.month || 0);
    return dateB - dateA;
  });

  // The latest voucher contains the current accumulated balance
  const latestVoucher = familyVouchers[0];
  const due = Number(latestVoucher.totalAmount) || 0;
  const paid = Number(latestVoucher.paidAmount) || 0;
  const disc = Number(latestVoucher.discountAmount) || 0;
  const remaining = Math.max(0, due - paid - disc);

  return remaining;
};

const calculateStudentArrears = (allVouchers, student) => {
  if (!student) return 0;
  const staticArrears = getStudentArrears(student);
  if (!allVouchers || allVouchers.length === 0) return staticArrears;

  const studentVouchers = allVouchers.filter(v => isVoucherForStudent(v, student));
  if (studentVouchers.length === 0) {
    return staticArrears;
  }

  studentVouchers.sort((a, b) => {
    const noA = Number(a.voucherNo || a.voucherNumber || 0);
    const noB = Number(b.voucherNo || b.voucherNumber || 0);
    if (noA && noB && noA !== noB) return noB - noA;
    const dateA = parseDateSafely(a.createdAt || a.date || a.month || 0);
    const dateB = parseDateSafely(b.createdAt || b.date || b.month || 0);
    return dateB - dateA;
  });

  const latestVoucher = studentVouchers[0];
  const due = Number(latestVoucher.totalAmount) || 0;
  const paid = Number(latestVoucher.paidAmount) || 0;
  const disc = Number(latestVoucher.discountAmount) || 0;
  const remaining = Math.max(0, due - paid - disc);

  return remaining;
};

const GenerateVoucher = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { classFees: contextClassFees = {} } = useSchool();
  const schoolId = userData?.schoolId || (userData?.role === 'school-admin' ? 'default-school' : (userData?.uid || 'default-school'));
  
  const [loading, setLoading] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [selectionType, setSelectionType] = useState('family');
  
  // Search & Suggestions State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [allVouchers, setAllVouchers] = useState([]);
  const [classFees, setClassFees] = useState(contextClassFees);
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const wrapperRef = useRef(null);

  const [feeMonth, setFeeMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dueDate, setDueDate] = useState('');
  const [feeItems, setFeeItems] = useState([]);
  const [discountAmount, setDiscountAmount] = useState('');
  
  // Bulk Generation Options
  const [includeAnnualFund, setIncludeAnnualFund] = useState(true);
  const [includePreviousBalance, setIncludePreviousBalance] = useState(true);

  // Bulk History State
  const [showBulkHistory, setShowBulkHistory] = useState(false);
  const [bulkBatches, setBulkBatches] = useState([]);

  useEffect(() => {
    setClassFees(prev => ({ ...prev, ...contextClassFees }));
  }, [contextClassFees]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [students, vouchers, batches] = await Promise.all([
          getRecords('students', schoolId),
          getRecords('vouchers', schoolId),
          getRecords('voucher_batches', schoolId)
        ]);
        setAllStudents(students || []);
        setAllVouchers(vouchers || []);
        
        const existingBatches = batches || [];
        const existingMonths = new Set(existingBatches.map(b => b.month));

        // Group old vouchers by month for retroactive bulk print
        const oldVouchersByMonth = {};
        if (vouchers && vouchers.length > 0) {
          vouchers.forEach(v => {
            if (v.month && !existingMonths.has(v.month)) {
              if (!oldVouchersByMonth[v.month]) {
                oldVouchersByMonth[v.month] = {
                  id: `retro_batch_${v.month}`,
                  month: v.month,
                  dueDate: v.dueDate || '-',
                  totalVouchers: 0,
                  voucherIds: [],
                  createdAt: v.createdAt || Date.now(),
                  isRetro: true // Mark as auto-generated from old vouchers
                };
              }
              oldVouchersByMonth[v.month].totalVouchers++;
              oldVouchersByMonth[v.month].voucherIds.push(v.id);
              if (v.createdAt > oldVouchersByMonth[v.month].createdAt) {
                oldVouchersByMonth[v.month].createdAt = v.createdAt;
              }
            }
          });
        }

        const retroBatches = Object.values(oldVouchersByMonth).filter(b => b.totalVouchers > 0);
        const combinedBatches = [...existingBatches, ...retroBatches];
        
        setBulkBatches(combinedBatches.sort((a, b) => b.createdAt - a.createdAt));
        
        const settings = await getSingleRecord('school_settings', schoolId);
        if (settings && settings.classFees) {
          setClassFees(prev => ({ ...settings.classFees, ...prev }));
        }
      } catch (e) {
        console.error("Error fetching students:", e);
      }
    };
    fetchData();
  }, [schoolId]);

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
      const cnicKey = st.fatherCnic ? String(st.fatherCnic).replace(/[^0-9]/g, '') : null;
      const phoneKey = st.parentPhone || st.fatherPhone || st.phone || '';
      const cleanPhone = String(phoneKey).replace(/[^0-9]/g, '');
      const nameKey = st.fatherName ? String(st.fatherName).trim().toLowerCase() : 'unknown_father';

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
        String(s.rollNo || s.rollNumber || s.grNo || s.grNumber || '').toLowerCase().includes(lowerQuery) ||
        (s.fatherName || '').toLowerCase().includes(lowerQuery) ||
        (s.fatherCnic || '').toLowerCase().includes(lowerQuery)
      );
    }
  }, [searchQuery, familyGroups, allStudents, selectionType]);

  const handleSelectSuggestion = (item) => {
    let autoFeeItems = [];

    if (selectionType === 'family') {
      setSelectedFamilyGroup(item);
      setSearchQuery(`${item.fatherName} ${item.cnic ? `(${item.cnic})` : ''}`);

      // Check if Annual Fund already charged this year for any child
      const currentYear = feeMonth ? feeMonth.split('-')[0] : String(new Date().getFullYear());

      item.children.forEach(child => {
        const rawClass = child.class || child.standard;
        const feeInfo = getClassFeeInfo(rawClass, classFees);
        const feeAmount = getStudentMonthly(child, feeInfo);
        
        autoFeeItems.push({
          name: `Tuition Fee - ${child.name} (${rawClass || 'N/A'})`,
          amount: feeAmount || 0
        });
      });
      
      const dynamicArrears = calculateFamilyArrears(allVouchers, item);
      if (dynamicArrears > 0) {
        autoFeeItems.push({ name: 'Previous Balance (Arrears)', amount: dynamicArrears });
      }
      setFeeItems(autoFeeItems);

    } else {
      setSelectedStudent(item);
      setSearchQuery(`${item.name} (${item.rollNo || item.rollNumber || item.grNo || item.id})`);
      
      const rawClass = item.class || item.standard;
      const feeInfo = getClassFeeInfo(rawClass, classFees);
      const feeAmount = getStudentMonthly(item, feeInfo);
      
      let items = [{
        name: `Tuition Fee - ${item.name} (${rawClass || 'N/A'})`,
        amount: feeAmount || 0
      }];

      const dynamicArrears = calculateStudentArrears(allVouchers, item);
      if (dynamicArrears > 0) {
        items.push({ name: 'Previous Balance (Arrears)', amount: dynamicArrears });
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

  const addArrearsBalance = () => {
    let arrearsAmount = 0;
    if (selectionType === 'family' && selectedFamilyGroup) {
      arrearsAmount = calculateFamilyArrears(allVouchers, selectedFamilyGroup);
    } else if (selectionType === 'student' && selectedStudent) {
      arrearsAmount = calculateStudentArrears(allVouchers, selectedStudent);
    } else {
      const manual = prompt('Enter Previous Balance / Arrears amount:', '0');
      arrearsAmount = Number(manual) || 0;
    }

    if (arrearsAmount <= 0) {
      const manual = prompt('No unpaid balance found in ledger for previous months. Enter manual arrears amount (or cancel):', '0');
      arrearsAmount = Number(manual) || 0;
      if (arrearsAmount <= 0) return;
    }

    const cleanItems = feeItems.filter(i => 
      !(i.name && (i.name.toLowerCase().includes('arrears') || i.name.toLowerCase().includes('previous balance')))
    );
    setFeeItems([...cleanItems, { name: 'Previous Balance (Arrears)', amount: arrearsAmount }]);
  };

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
        const feeInfo = getClassFeeInfo(rawClass, classFees);
        const annualAmount = child.annualFee !== undefined && child.annualFee !== '' ? Number(child.annualFee) : (feeInfo.annualFee || 0);
        const alreadyHas = feeItems.some(i => i.name && i.name.toLowerCase().includes('annual fund') && i.name.includes(child.name));
        if (annualAmount > 0 && !alreadyHas) {
          itemsToAdd.push({ name: `Annual Fund - ${child.name}`, amount: annualAmount });
        }
      });
    } else if (selectionType === 'student' && selectedStudent) {
      const rawClass = selectedStudent.class || selectedStudent.standard;
      const feeInfo = getClassFeeInfo(rawClass, classFees);
      const annualAmount = selectedStudent.annualFee !== undefined && selectedStudent.annualFee !== '' ? Number(selectedStudent.annualFee) : (feeInfo.annualFee || 0);
      const alreadyHas = feeItems.some(i => i.name && i.name.toLowerCase().includes('annual fund'));
      if (annualAmount > 0 && !alreadyHas) {
        itemsToAdd.push({ name: `Annual Fund - ${selectedStudent.name}`, amount: annualAmount });
      }
    }
    
    if (itemsToAdd.length > 0) {
      setFeeItems([...feeItems, ...itemsToAdd]);
    } else {
      alert("Annual Fund is already added or no Annual Fund amount is configured for selected student(s).");
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

      // Fetch all vouchers - for max voucher number AND remaining balance calculation
      const existingVouchers = await getRecords('vouchers', userData?.schoolId || 'default-school');

      // Calculate accurate previous remaining balance
      let dynamicArrears = 0;
      if (selectionType === 'student' && selectedStudent) {
        dynamicArrears = calculateStudentArrears(existingVouchers, selectedStudent);
      } else if (selectionType === 'family' && selectedFamilyGroup) {
        dynamicArrears = calculateFamilyArrears(existingVouchers, selectedFamilyGroup);
      }

      const hasManualArrears = finalItems.some(i => 
        i.name && (i.name.toLowerCase().includes('arrears') || i.name.toLowerCase().includes('previous balance'))
      );

      if (!hasManualArrears && dynamicArrears > 0) {
        finalItems.push({ name: 'Previous Balance (Arrears)', amount: dynamicArrears });
      }

      if (Number(discountAmount) > 0) {
        finalItems.push({ name: 'Discount / Scholarship', amount: -Math.abs(Number(discountAmount)) });
      }
      
      const totalAmt = finalItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

      // Fetch max voucher number from existing vouchers (already fetched above)
      let maxVoucherNo = 1000;
      existingVouchers.forEach(v => {
        if (v.voucherNo && Number(v.voucherNo) > maxVoucherNo) maxVoucherNo = Number(v.voucherNo);
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
        const rawClass = selectedStudent.class || selectedStudent.standard;
        const feeInfo = getClassFeeInfo(rawClass, classFees);
        const stdFee = Number(selectedStudent.monthlyFee !== undefined && selectedStudent.monthlyFee !== '' ? selectedStudent.monthlyFee : (feeInfo.monthlyFee || 0));
        const stdAnn = Number(selectedStudent.annualFee !== undefined && selectedStudent.annualFee !== '' ? selectedStudent.annualFee : (feeInfo.annualFee || 0));
        const stdArr = Number(selectedStudent.balance !== undefined ? selectedStudent.balance : (selectedStudent.arrears || 0));

        voucherData.studentId = selectedStudent.id;
        voucherData.studentName = selectedStudent.name;
        voucherData.rollNo = selectedStudent.rollNo || selectedStudent.rollNumber || selectedStudent.grNo || '-';
        voucherData.fatherName = selectedStudent.fatherName || 'Parent';
        voucherData.fatherCnic = selectedStudent.fatherCnic || selectedStudent.cnic || '';
        voucherData.phone = selectedStudent.parentPhone || selectedStudent.fatherPhone || selectedStudent.phone || '';
        voucherData.childrenDetails = [{
          admNo: selectedStudent.rollNumber || selectedStudent.rollNo || selectedStudent.grNo || selectedStudent.grNumber || '-',
          name: selectedStudent.name,
          class: rawClass || 'N/A',
          fee: stdFee,
          annualFee: stdAnn,
          arrears: stdArr
        }];
      } else {
        voucherData.familyId = selectedFamilyGroup.id || '';
        voucherData.fatherCnic = selectedFamilyGroup.cnic || '';
        voucherData.fatherName = selectedFamilyGroup.fatherName || '';
        voucherData.phone = selectedFamilyGroup.phone || '';
        voucherData.childrenIds = selectedFamilyGroup.children.map(c => c.id);
        voucherData.childrenDetails = selectedFamilyGroup.children.map(c => {
          const rawClass = c.class || c.standard;
          const feeInfo = getClassFeeInfo(rawClass, classFees);
          const childFee = Number(c.monthlyFee !== undefined && c.monthlyFee !== '' ? c.monthlyFee : (feeInfo.monthlyFee || 0));
          const childAnn = Number(c.annualFee !== undefined && c.annualFee !== '' ? c.annualFee : (feeInfo.annualFee || 0));
          const childArr = Number(c.balance !== undefined ? c.balance : (c.arrears || 0));
          return {
            admNo: c.rollNumber || c.rollNo || c.grNo || c.grNumber || '-',
            name: c.name,
            class: rawClass || 'N/A',
            fee: childFee,
            annualFee: childAnn,
            arrears: childArr
          };
        });
      }

      const result = await addRecord('vouchers', voucherData, userData?.schoolId || 'default-school');
      if (result.success) {
        navigate(`/school-admin/fees/print/voucher/${result.id}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error generating voucher: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (!feeMonth || !dueDate) return alert('Please select Fee Month and Due Date first.');
    if (!familyGroups || familyGroups.length === 0) return alert('No students found in the school to generate vouchers.');
    
    if (!window.confirm(`Are you sure you want to generate vouchers for ALL ${familyGroups.length} families in the school? This will calculate Monthly Fees, Annual Funds, and Previous Balances automatically.`)) return;

    setBulkGenerating(true);
    let successCount = 0;

    try {
      // Fetch all vouchers once — used for arrears calculation AND max voucher no
      const allVouchers = await getRecords('vouchers', userData?.schoolId || 'default-school');
      let maxVoucherNo = 1000;
      allVouchers.forEach(v => {
        if (v.voucherNo && Number(v.voucherNo) > maxVoucherNo) maxVoucherNo = Number(v.voucherNo);
      });

      const generatedIds = [];
      for (const group of familyGroups) {
        maxVoucherNo++;
        let items = [];
        
        const familyVouchers = new Set();
        let totalArrears = 0;

        group.children.forEach(child => {
          const rawClass = child.class || child.standard;
          const feeInfo = getClassFeeInfo(rawClass, classFees);
          const feeAmount = getStudentMonthly(child, feeInfo);
          
          items.push({
            name: `Tuition Fee - ${child.name} (${rawClass || 'N/A'})`,
            amount: feeAmount || 0
          });

          // Annual Fund for each child (if enabled) - but ONLY if not already charged this year
          if (includeAnnualFund) {
            const annualAmount = getStudentAnnual(child, feeInfo);
            if (annualAmount > 0) {
              const currentYear = feeMonth ? feeMonth.split('-')[0] : String(new Date().getFullYear());
              const childNameLower = (child.name || '').toLowerCase();
              
              // Check if Annual Fund was already charged this year for this child
              const annualAlreadyCharged = allVouchers.some(v => {
                const vYear = (v.month || '').split('-')[0];
                if (vYear !== currentYear) return false;
                
                // Only consider vouchers belonging to THIS student/family
                if (v.studentId && v.studentId !== child.id) return false;
                if (v.childrenIds && !v.childrenIds.includes(child.id)) return false;

                return v.feeItems?.some(fi => {
                  const fiName = (fi.name || '').toLowerCase();
                  return fiName.includes('annual') && fiName.includes(childNameLower) && Number(fi.amount) > 0;
                });
              });

              if (!annualAlreadyCharged) {
                items.push({
                  name: `Annual Fund - ${child.name}`,
                  amount: annualAmount
                });
              }
            }
          }

          // Arrears / Previous balance calculation (if enabled)
          if (includePreviousBalance) {
            const openBal = getStudentArrears(child);
            totalArrears += openBal;
          }
        });

        // Calculate ACTUAL remaining from unpaid vouchers (real ledger data)
        if (includePreviousBalance) {
          const effectiveArrears = calculateFamilyArrears(allVouchers, group);
          if (effectiveArrears > 0) {
            items.push({ name: 'Previous Balance (Arrears)', amount: effectiveArrears });
          }
        }

        // Add additional extra fee items added in UI (e.g. stationery, exam fee)
        feeItems.forEach(head => {
          if (head.isAutoAnnual) return; // Handled by includeAnnualFund
          if (head.name && head.amount && Number(head.amount) > 0) {
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
          childrenDetails: group.children.map(c => {
            const rawClass = c.class || c.standard;
            const feeInfo = getClassFeeInfo(rawClass, classFees);
            const childFee = getStudentMonthly(c, feeInfo);
            const childAnn = getStudentAnnual(c, feeInfo);
            const childArr = getStudentArrears(c);
            return {
              admNo: c.rollNumber || c.rollNo || c.grNo || c.grNumber || '-',
              name: c.name,
              class: rawClass || 'N/A',
              fee: childFee,
              annualFee: childAnn,
              arrears: childArr
            };
          })
        };

        const result = await addRecord('vouchers', voucherData, userData?.schoolId || 'default-school');
        if (result.success) {
          successCount++;
          generatedIds.push(result.id);
        }
      }
      
      // Save batch record for future access
      if (generatedIds.length > 0) {
        const batchData = {
          month: feeMonth,
          dueDate: dueDate,
          totalVouchers: generatedIds.length,
          voucherIds: generatedIds,
          createdAt: Date.now()
        };
        const batchRes = await addRecord('voucher_batches', batchData, userData?.schoolId || 'default-school');
        if (batchRes.success) {
          setBulkBatches(prev => [{ id: batchRes.id, ...batchData }, ...prev]);
        }
      }
      
      // Navigate to bulk print view and pass all generated IDs
      navigate('/school-admin/fees/print/voucher/bulk', { state: { voucherIds: generatedIds } });
    } catch (error) {
      console.error(error);
      alert('An error occurred during bulk generation: ' + error.message);
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
 <div className="flex-1">
 <h1 className="text-2xl font-bold text-dark-text">Generate Fee Voucher</h1>
 <p className="text-dark-muted text-sm mt-0.5">Create digital vouchers for students and families.</p>
 </div>
 <button 
   onClick={() => setShowBulkHistory(true)}
   className="px-4 py-2 bg-dark-hover border border-dark-border rounded-xl text-dark-text text-sm font-bold flex items-center gap-2 hover:bg-dark-border transition-all"
 >
   <History size={16} className="text-primary-500" />
   Bulk History
 </button>
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
          <div className="p-5 mb-6 bg-dark-hover rounded-xl border border-dark-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Bulk Generation Mode Active</h3>
                <p className="text-xs text-dark-muted">Base tuition fees are auto-calculated from Class / Student Setup for {familyGroups.length} families.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-dark-border/50">
              <label className="flex items-center gap-3 p-3 rounded-lg bg-dark-card border border-dark-border/60 cursor-pointer hover:border-cyan-500/50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={includeAnnualFund} 
                  onChange={(e) => setIncludeAnnualFund(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-dark-bg border-dark-border"
                />
                <div className="text-xs">
                  <span className="font-bold text-cyan-400 block">Include Annual Fund</span>
                  <span className="text-dark-muted text-[11px]">Auto-calculate per student — skipped if already charged this year ✅</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg bg-dark-card border border-dark-border/60 cursor-pointer hover:border-rose-500/50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={includePreviousBalance} 
                  onChange={(e) => setIncludePreviousBalance(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 bg-dark-bg border-dark-border"
                />
                <div className="text-xs">
                  <span className="font-bold text-rose-400 block">Include Previous Balance (Arrears)</span>
                  <span className="text-dark-muted text-[11px]">Auto-calculate purana baqaya / opening balance</span>
                </div>
              </label>
            </div>
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

 {/* Bulk History Modal */}
 {showBulkHistory && (
   <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
     <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
       <div className="p-6 border-b border-dark-border flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <History className="text-primary-500" />
             Bulk Voucher History
           </h2>
           <p className="text-dark-muted text-sm mt-1">Re-download previously generated bulk vouchers</p>
         </div>
         <button 
           onClick={() => setShowBulkHistory(false)}
           className="p-2 hover:bg-dark-hover rounded-xl transition-colors text-dark-muted hover:text-white"
         >
           <X size={20} />
         </button>
       </div>
       
       <div className="p-6 overflow-y-auto flex-1">
         {bulkBatches.length === 0 ? (
           <div className="text-center py-10 text-dark-muted">
             <Clock size={40} className="mx-auto mb-3 opacity-20" />
             <p>No bulk generation history found.</p>
           </div>
         ) : (
           <div className="space-y-4">
             {bulkBatches.map(batch => (
               <div key={batch.id} className="p-4 border border-dark-border rounded-xl bg-dark-bg/50 flex items-center justify-between group hover:border-primary-500/50 transition-all">
                 <div>
                   <h3 className="font-bold text-white">Fee Month: {batch.month}</h3>
                   <div className="flex items-center gap-4 text-xs text-dark-muted mt-1">
                     <span>Due Date: {batch.dueDate}</span>
                     <span>•</span>
                     <span className="text-primary-400">{batch.totalVouchers || (batch.voucherIds?.length)} Vouchers</span>
                     <span>•</span>
                     <span>{batch.createdAt?.toDate ? batch.createdAt.toDate().toLocaleDateString() : (batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : 'N/A')}</span>
                   </div>
                 </div>
                 <button 
                   onClick={() => {
                     setShowBulkHistory(false);
                     navigate('/school-admin/fees/print/voucher/bulk', { state: { voucherIds: batch.voucherIds } });
                   }}
                   className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow-lg shadow-primary-500/20 transition-all flex items-center gap-2"
                 >
                   <Printer size={16} />
                   Print Again
                 </button>
               </div>
             ))}
           </div>
         )}
       </div>
     </div>
   </div>
 )}
 
 </div>
 );
};

export default GenerateVoucher;

