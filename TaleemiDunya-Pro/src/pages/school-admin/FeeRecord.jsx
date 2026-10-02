import React, { useState, useEffect, useRef } from 'react';
import { FileText, CheckCircle, AlertCircle, Printer, Loader2, Calendar, Filter, Search, MessageCircle, RefreshCw, Download, Trash2 } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, deleteRecord, batchDelete, updateRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const FeeRecord = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = schoolData?.name || schoolData?.schoolName || userData?.schoolName || 'SCHOOL';

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingWa, setSendingWa] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [fixingVouchers, setFixingVouchers] = useState(false);

  // Filters
  const today = new Date();
  // If it's early in the month (day <= 10), default to previous month
  // since schools typically deal with previous month's fees at start of month
  const getPrevMonth = () => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const defaultMonth = today.getDate() <= 10
    ? getPrevMonth()
    : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedClass, setSelectedClass] = useState('All');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'paid', 'unpaid'

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [studs, vouch] = await Promise.all([
          getRecords('students', schoolId),
          getRecords('vouchers', schoolId)
        ]);
        setStudents(studs || []);
        setVouchers(vouch || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [schoolId]);

  // Auto-select the month that has the most vouchers
  // This ensures the correct month is shown even if default is wrong
  useEffect(() => {
    if (!vouchers || vouchers.length === 0) return;

    // Count vouchers per month (normalize all formats to YYYY-MM for comparison)
    const monthCounts = {};
    const MONTHS_MAP = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12'
    };

    const normalizeToYYYYMM = (m) => {
      if (!m) return null;
      const str = String(m).trim();
      // Already YYYY-MM format
      if (/^\d{4}-\d{2}$/.test(str)) return str;
      // "August 2026" format
      const parts = str.toLowerCase().split(' ');
      if (parts.length === 2) {
        const monthNum = MONTHS_MAP[parts[0]];
        const year = parts[1];
        if (monthNum && /^\d{4}$/.test(year)) return `${year}-${monthNum}`;
      }
      return null;
    };

    vouchers.forEach(v => {
      const norm = normalizeToYYYYMM(v.month);
      if (norm) monthCounts[norm] = (monthCounts[norm] || 0) + 1;
    });

    if (Object.keys(monthCounts).length === 0) return;

    // Pick month with most vouchers
    const bestMonth = Object.entries(monthCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    // Only auto-switch if current selectedMonth has 0 vouchers
    const currentCount = monthCounts[selectedMonth] || 0;
    if (currentCount === 0 && bestMonth) {
      setSelectedMonth(bestMonth);
    }
  }, [vouchers]);


  // Unique classes from students
  const uniqueClasses = [...new Set(students.map(s => s.class).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Format month for display: "2026-08" → "August 2026"
  const formatMonthLabel = (ym) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    return `${MONTHS[parseInt(m) - 1]} ${y}`;
  };

  // Build per-student row data strictly from generated vouchers
  const buildRows = () => {
    const monthLabel = formatMonthLabel(selectedMonth);
    
    // 1. Filter vouchers matching the selected month precisely
    const filteredVouchers = vouchers.filter(v => {
      const vMonth = v.month || '';
      return vMonth === selectedMonth || vMonth === monthLabel;
    });

    let nextSr = 1;
    const finalRows = [];

    // 2. Map vouchers to rows
    filteredVouchers.forEach(v => {
      const isFamilyVoucher = v.selectionType === 'family' || (v.childrenIds && v.childrenIds.length > 1) || (v.childrenDetails && v.childrenDetails.length > 1);
      const totalAmount = Number(v.totalAmount) || 0;
      const paidAmount = Number(v.paidAmount) || 0;
      const totalBalance = totalAmount - paidAmount;
      const status = paidAmount >= totalAmount && totalAmount > 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Unpaid';

      if (isFamilyVoucher && v.childrenDetails && v.childrenDetails.length > 0) {
        // Parse fee items to distribute among children
        v.childrenDetails.forEach((child, index) => {
          if (selectedClass !== 'All' && child.class !== selectedClass) return; // Skip if class filter applies
          
          const childNameLower = (child.name || '').toLowerCase();
          
          let monthFee = 0;
          let annualFee = 0;
          let previousBalance = 0;
          let other = 0;
          
          v.feeItems?.forEach(item => {
            const name = String(item.name || '').toLowerCase();
            const amt = Number(item.amount) || 0;
            if (amt <= 0) return;
            
            // Assign arrears only to the FIRST child to avoid duplication in printed report
            if (index === 0 && (name.includes('arrear') || name.includes('previous') || name.includes('balance') || name.includes('baqaya'))) {
              previousBalance += amt;
              return;
            }

            // Distribute other items if they contain the child's name
            const belongsToChild = name.includes(childNameLower);
            
            // Tuition Fee
            if (name.includes('tuition') || name.includes('monthly')) {
               if (belongsToChild) monthFee += amt;
            } else if (name.includes('annual')) {
               if (belongsToChild) annualFee += amt;
            } else if (!name.includes('discount')) {
               // Other items (Exam, Transport, Stationery)
               if (belongsToChild) {
                 other += amt;
               } else if (index === 0 && !v.childrenDetails.some(c => name.includes((c.name || '').toLowerCase()))) {
                 // If it doesn't belong to any specific child (generic), attach to first child
                 other += amt;
               }
            }
          });

          // Discount applies to the first child for simplicity in total
          const discountAmt = index === 0 ? v.feeItems?.reduce((sum, item) => {
            if (String(item.name || '').toLowerCase().includes('discount')) {
              return sum + Math.abs(Number(item.amount) || 0);
            }
            return sum;
          }, 0) : 0;
          
          if (index === 0) {
             other -= discountAmt; 
          }

            const childId = child.id || v.childrenIds?.[index] || v.studentId;
            const studentProfile = students.find(s => s.id === childId) || {};
            const displayFamilyId = studentProfile.familyId || v.familyId || '';

          finalRows.push({
            sr: nextSr++,
            id: childId || `${v.id}_${index}`,
            gr: child.admNo || '-',
            name: child.name || '-',
            fatherName: v.fatherName || '-',
            class: child.class || '-',
            familyId: v.familyId || v.fatherCnic || v.phone || v.id, // For grouping
            displayFamilyId: displayFamilyId, // Strictly for displaying the F-XXX string
            annualFee: annualFee,
            monthFee: monthFee,
            previousBalance: previousBalance,
            other: other,
            payOnDueDate: totalAmount, // Only used on family level during print
            paid: paidAmount, // Only used on family level during print
            totalBalance: totalBalance, // Only used on family level during print
            status: status,
            phone: v.phone || '',
            fatherCnic: v.fatherCnic || '',
            familyVoucherData: v // Pass the raw voucher down so print logic can use exact totals
          });
        });
      } else {
        // Single student voucher
        const stClass = v.class || (v.childrenDetails?.[0]?.class) || 'N/A';
        if (selectedClass !== 'All' && stClass !== selectedClass) return;

        let monthFee = 0;
        let annualFee = 0;
        let previousBalance = 0;
        let other = 0;
        
        v.feeItems?.forEach(item => {
          const name = String(item.name || '').toLowerCase();
          const amt = Number(item.amount) || 0;
          
          if (name.includes('discount')) {
            other -= Math.abs(amt); // Negative other
          } else if (amt > 0) {
            if (name.includes('annual')) {
              annualFee += amt;
            } else if (name.includes('arrear') || name.includes('previous') || name.includes('balance') || name.includes('baqaya') || name.includes('opening')) {
              previousBalance += amt;
            } else if (name.includes('tuition') || name.includes('monthly') || name === 'fee') {
              monthFee += amt;
            } else {
              other += amt;
            }
          }
        });

        const studentProfile = students.find(s => s.id === (v.studentId || v.childrenIds?.[0])) || {};
        const displayFamilyId = studentProfile.familyId || v.familyId || '';

        finalRows.push({
          sr: nextSr++,
          id: v.studentId || v.childrenIds?.[0] || v.id,
          gr: v.rollNo || v.studentRollNo || v.childrenDetails?.[0]?.admNo || '-',
          name: v.studentName || v.childrenDetails?.[0]?.name || '-',
          fatherName: v.fatherName || '-',
          class: stClass,
          familyId: v.familyId || null, // Will use studentId for grouping
          displayFamilyId: displayFamilyId,
          annualFee: annualFee,
          monthFee: monthFee,
          previousBalance: previousBalance,
          other: other,
          payOnDueDate: totalAmount,
          paid: paidAmount,
          totalBalance: totalBalance,
          status: status,
          phone: v.phone || '',
          fatherCnic: v.fatherCnic || '',
          familyVoucherData: v // Provide it so single student logic works identical to family logic during print if needed
        });
      }
    });
    
    return finalRows;
  };

  const allRows = buildRows();
  // Any student who has paid ANY amount (full or partial) belongs in Paid list
  const paidRows = allRows.filter(r => (Number(r.paid) || 0) > 0);
  // Only students who have NOT paid anything (0 paid) belong in Unpaid list
  const unpaidRows = allRows.filter(r => (Number(r.paid) || 0) === 0);
  const searchFiltered = (activeTab === 'paid' ? paidRows : activeTab === 'unpaid' ? unpaidRows : allRows)
    .filter(r => !searchTerm || 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.gr).includes(searchTerm) ||
      r.class.toLowerCase().includes(searchTerm.toLowerCase())
    );
  const displayRows = searchFiltered;

  // Summary stats
  const totalFee = allRows.reduce((s, r) => s + r.payOnDueDate, 0);
  const totalPaid = allRows.reduce((s, r) => s + r.paid, 0);
  const totalBalance = allRows.reduce((s, r) => s + Math.max(0, r.totalBalance), 0);

  // WhatsApp Fee Reminder with retry logic
  const sendWaReminder = async (row) => {
    if (!row.phone) { alert('No phone number for ' + row.name); return; }
    setSendingWa(row.id);
    const msg = `📋 *FEE REMINDER*\n\nDear Parent,\n\nThis is a reminder that the fee for *${row.name}* (Class: ${row.class}, Roll: ${row.gr}) for *${formatMonthLabel(selectedMonth)}* is:\n\n💰 Total Due: *Rs. ${row.payOnDueDate.toLocaleString()}*\n✅ Paid: Rs. ${row.paid.toLocaleString()}\n⚠️ Balance: *Rs. ${Math.max(0, row.totalBalance).toLocaleString()}*\n\nPlease clear the balance at the earliest.\n\nRegards,\n${schoolName}`;

    const endpoints = [
      'https://umarhayat.alwaysdata.net/api/message/send',
    ];
    
    let sent = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: schoolId, phone: row.phone, message: msg })
          });
          const data = await res.json();
          if (data.success && data.results?.[0]?.status === 'sent') {
            sent = true;
            break;
          }
          // Retry with default_school
          const res2 = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: 'default_school', phone: row.phone, message: msg })
          });
          const data2 = await res2.json();
          if (data2.success) { sent = true; break; }
        } catch(e) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
      if (sent) break;
      await new Promise(r => setTimeout(r, 2000));
    }
    setSendingWa(null);
    if (sent) {
      alert(`✅ Fee reminder sent to ${row.name}'s parent (${row.phone}) via WhatsApp!`);
    } else {
      alert(`❌ Failed to send after 3 attempts. WhatsApp bot may be offline.`);
    }
  };

  // ─── Delete Voucher Handler ──────────────────────────────────────────────
  const handleDeleteVoucher = async (row) => {
    const monthLabel = formatMonthLabel(selectedMonth);
    const studentVouchers = vouchers.filter(v => {
      const monthMatch = v.month === monthLabel || v.month === selectedMonth;
      if (!monthMatch) return false;
      if (v.studentId === row.id) return true;
      if (v.childrenIds?.includes(row.id)) return true;
      return false;
    });

    if (studentVouchers.length === 0) {
      return alert('No voucher found for this student in the selected month.');
    }

    if (!window.confirm(`Are you sure you want to DELETE the voucher for ${row.name} (${formatMonthLabel(selectedMonth)})? This action cannot be undone.`)) return;

    setDeletingId(row.id);
    try {
      for (const v of studentVouchers) {
        await deleteRecord('vouchers', v.id, schoolId);
      }
      setVouchers(prev => prev.filter(v => !studentVouchers.some(sv => sv.id === v.id)));
      alert(`✅ Voucher for ${row.name} deleted successfully!`);
    } catch (err) {
      console.error(err);
      alert('Failed to delete voucher. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Fix Month Vouchers: Remove duplicate Annual Fund ────────────────────
  const handleFixMonthAnnualFund = async () => {
    const monthLabel = formatMonthLabel(selectedMonth);
    const year = selectedMonth.split('-')[0];
    const monthVouchers = vouchers.filter(v => v.month === monthLabel || v.month === selectedMonth);

    if (monthVouchers.length === 0) {
      return alert(`No vouchers found for ${monthLabel}.`);
    }

    if (!window.confirm(`This will remove Annual Fund from ${monthLabel} vouchers where it was already charged earlier in ${year}. Continue?`)) return;

    setFixingVouchers(true);
    let fixed = 0;

    try {
      for (const v of monthVouchers) {
        // Get all children ids for this voucher
        const childIds = v.childrenIds || (v.studentId ? [v.studentId] : []);
        if (childIds.length === 0) continue;

        // Find previous vouchers in the same year (not this month)
        const prevVouchers = vouchers.filter(pv => {
          const pvYear = (pv.month || '').includes('-') ? pv.month.split('-')[0] : null;
          const pvMonth = formatMonthLabel(pv.month || '');
          const samePeriod = pv.month === monthLabel || pv.month === selectedMonth;
          if (samePeriod) return false; // skip current month
          // year match
          if (pvYear && pvYear !== year) return false;
          if (!pvYear) {
            // formatted month string: check if it contains the year
            if (!String(pv.month || '').includes(year)) return false;
          }
          // belongs to same family/student
          if (v.childrenIds?.length > 0) {
            return pv.childrenIds?.some(id => v.childrenIds.includes(id)) ||
              v.childrenIds.includes(pv.studentId);
          }
          return pv.studentId === v.studentId;
        });

        // Check per child if annual was already paid before
        let newFeeItems = [...(v.feeItems || [])];
        let changed = false;

        // For family vouchers: check per child name
        if (v.childrenIds?.length > 0) {
          newFeeItems = newFeeItems.filter(item => {
            const name = (item.name || '').toLowerCase();
            if (!name.includes('annual')) return true; // keep non-annual items
            // extract child name from item like "Annual Fund - Hassan"
            const childName = name.replace('annual fund', '').replace('-', '').trim();
            if (!childName) return true; // can't identify, keep it
            // check if any previous voucher has this annual fund for this child
            const alreadyPaid = prevVouchers.some(pv => {
              if (pv.studentId && pv.studentId !== v.studentId && !v.childrenIds?.includes(pv.studentId)) return false;
              if (pv.childrenIds && !pv.childrenIds.includes(v.childrenIds?.[0]) && v.studentId && !pv.childrenIds.includes(v.studentId)) {
                // If it's a family voucher, we just want to check if pv belongs to the same family
                // v has childrenIds, we can check if pv's children overlap
                if (v.childrenIds && pv.childrenIds) {
                  const overlap = v.childrenIds.some(id => pv.childrenIds.includes(id));
                  if (!overlap) return false;
                } else {
                  return false;
                }
              }

              return pv.feeItems?.some(fi => {
                const fiName = (fi.name || '').toLowerCase();
                return fiName.includes('annual') && fiName.includes(childName) && Number(fi.amount) > 0;
              })
            });
            if (alreadyPaid) { changed = true; return false; } // remove
            return true;
          });
        } else {
          // Single student voucher
          newFeeItems = newFeeItems.filter(item => {
            const name = (item.name || '').toLowerCase();
            if (!name.includes('annual')) return true;
            const alreadyPaid = prevVouchers.some(pv => {
              if (pv.studentId && pv.studentId !== v.studentId) return false;
              if (pv.childrenIds && !pv.childrenIds.includes(v.studentId)) return false;

              return pv.feeItems?.some(fi => {
                const fiName = (fi.name || '').toLowerCase();
                return fiName.includes('annual') && Number(fi.amount) > 0;
              })
            });
            if (alreadyPaid) { changed = true; return false; }
            return true;
          });
        }

        if (changed) {
          const newTotal = newFeeItems.reduce((sum, fi) => sum + (Number(fi.amount) || 0), 0);
          await updateRecord('vouchers', v.id, { feeItems: newFeeItems, totalAmount: newTotal });
          // Update local state too
          setVouchers(prev => prev.map(pv => pv.id === v.id ? { ...pv, feeItems: newFeeItems, totalAmount: newTotal } : pv));
          fixed++;
        }
      }
      alert(`✅ Done! Fixed ${fixed} voucher(s) for ${monthLabel} — Annual Fund removed where it was already charged earlier in ${year}.`);
    } catch (err) {
      console.error(err);
      alert('Error fixing vouchers: ' + err.message);
    } finally {
      setFixingVouchers(false);
    }
  };


  const handleDeleteAllMonthVouchers = async () => {
    const monthLabel = formatMonthLabel(selectedMonth);
    const matchingVouchers = vouchers.filter(v => v.month === monthLabel || v.month === selectedMonth);
    if (matchingVouchers.length === 0) {
      return alert(`${monthLabel} کے لیے کوئی vouchers نہیں ملے۔`);
    }
    if (!window.confirm(`⚠️ کیا آپ ${monthLabel} کے تمام ${matchingVouchers.length} vouchers permanently delete کرنا چاہتے ہیں؟ یہ completely remove ہو جائیں گے اور نئی fees سے fresh بنائے جا سکیں گے۔`)) return;

    try {
      const ids = matchingVouchers.map(v => v.id);
      // Permanently delete — NO backup to deleted_vouchers
      await batchDelete('vouchers', ids);
      setVouchers(prev => prev.filter(v => !ids.includes(v.id)));
      alert(`✅ ${monthLabel} کے تمام ${ids.length} vouchers مکمل طور پر delete ہو گئے! اب نئی fees سے fresh vouchers بنائیں۔`);
    } catch (err) {
      console.error(err);
      alert('Vouchers delete کرنے میں خرابی: ' + err.message);
    }
  };

  // ─── Print Function ────────────────────────────────────────────────────────
  const handlePrint = (mode) => {
    const printRows = mode === 'paid' ? paidRows : mode === 'unpaid' ? unpaidRows : allRows;
    const title = mode === 'blank' ? 'MONTHLY FEE COLLECTION REGISTER (BLANK)'
      : mode === 'paid' ? 'MONTHLY FEE PAID REGISTER (COLLECTIONS & REMINDER BALANCE)'
      : mode === 'unpaid' ? 'MONTHLY FEE UNPAID / DEFAULTERS REGISTER'
      : 'MONTHLY FEE COLLECTION REGISTER';

    const monthName = formatMonthLabel(selectedMonth).split(' ')[0].substring(0, 3);
    const yearName = formatMonthLabel(selectedMonth).split(' ')[1];
    const shortMonth = `${monthName} ${yearName}`;

    // Group by unique family key — familyId is top priority (auto-assigned unique number)
    // STRICT MODE: If no familyId is present, they will NOT be grouped together even if father name matches.
    const grouped = {};
    printRows.forEach(r => {
      let key = '';
      if (r.familyVoucherData && r.familyVoucherData.id) {
        key = `voucher_${r.familyVoucherData.id}`;
      } else {
        key = `student_${r.id}`;
      }
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    const sortedFamilyKeys = Object.keys(grouped).sort((a, b) => {
      const nameA = (grouped[a][0].fatherName || '').toLowerCase();
      const nameB = (grouped[b][0].fatherName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    let sr = 1;
    let rowsHtml = '';

    sortedFamilyKeys.forEach(familyKey => {
      const familyRows = grouped[familyKey];
      const rowspan = familyRows.length;
      
      // Since buildRows now strictly maps from vouchers and handles the distribution:
      // We can just sum up the rows for the family.
      // PayOnDueDate, Paid, and TotalBalance are attached to every row but represent the whole voucher.
      // So we take them from the first row to avoid multiplying them by number of children.
      let familyMonthFee = familyRows.reduce((sum, r) => sum + (Number(r.monthFee) || 0), 0);
      let familyPreBalance = familyRows.reduce((sum, r) => sum + (Number(r.previousBalance) || 0), 0);
      let familyOther = familyRows.reduce((sum, r) => sum + (Number(r.annualFee) || 0) + (Number(r.other) || 0), 0);
      
      let familyPayOnDueDate = Number(familyRows[0].payOnDueDate) || 0;
      let familyPaid = Number(familyRows[0].paid) || 0;
      let familyTotalBalance = Number(familyRows[0].totalBalance) || 0;

      familyRows.forEach((r, index) => {
        const isFirst = index === 0;
        
        let paidCell = '';
        let balanceCell = '';

        if (mode === 'blank') {
          // In Blank Sheet, Paid and Total Balance columns MUST BE EMPTY (Khali)
          paidCell = `${isFirst ? `<td rowspan="${rowspan}" class="bold-text" style="text-align:center; vertical-align:middle;"></td>` : ''}`;
          balanceCell = `${isFirst ? `<td rowspan="${rowspan}" class="thick-border-left bold-text" style="text-align:center; vertical-align:middle;"></td>` : ''}`;
        } else if (mode === 'paid') {
          // In Paid Sheet, show Paid Amount and Reminder Balance (Baqaya)
          paidCell = `${isFirst ? `<td rowspan="${rowspan}" class="bold-text" style="text-align:center; vertical-align:middle; color: #070;">${familyPaid > 0 ? Math.round(familyPaid).toLocaleString() : '0'}</td>` : ''}`;
          balanceCell = `${isFirst ? `<td rowspan="${rowspan}" class="thick-border-left bold-text" style="text-align:center; vertical-align:middle; color: ${familyTotalBalance > 0 ? '#c00' : '#070'};">${familyTotalBalance > 0 ? Math.round(familyTotalBalance).toLocaleString() : '-'}</td>` : ''}`;
        } else if (mode === 'unpaid') {
          // In Unpaid Sheet, Paid is 0 and Total Overdue is shown
          paidCell = `${isFirst ? `<td rowspan="${rowspan}" class="bold-text" style="text-align:center; vertical-align:middle; color: #888;">0</td>` : ''}`;
          balanceCell = `${isFirst ? `<td rowspan="${rowspan}" class="thick-border-left bold-text" style="text-align:center; vertical-align:middle; color: #c00;">${familyPayOnDueDate > 0 ? Math.round(familyPayOnDueDate).toLocaleString() : '0'}</td>` : ''}`;
        } else {
          // All rows
          paidCell = `${isFirst ? `<td rowspan="${rowspan}" class="bold-text" style="text-align:center; vertical-align:middle; color: #070;">${familyPaid > 0 ? Math.round(familyPaid).toLocaleString() : '0'}</td>` : ''}`;
          balanceCell = `${isFirst ? `<td rowspan="${rowspan}" class="thick-border-left bold-text" style="text-align:center; vertical-align:middle; color: #c00;">${familyTotalBalance > 0 ? Math.round(familyTotalBalance).toLocaleString() : '0'}</td>` : ''}`;
        }

        rowsHtml += `<tr>
          <td style="text-align:center;">${sr++}</td>
          <td style="text-align:center; font-family:monospace;">${r.gr}</td>
          ${isFirst ? `<td rowspan="${rowspan}" style="text-align:center; font-family:monospace; color:#444;">${r.displayFamilyId || '-'}</td>` : ''}
          <td style="font-weight:600; text-align:left;">${r.name}</td>
          ${isFirst ? `<td rowspan="${rowspan}" style="text-align:left; vertical-align:middle; font-weight:500;">${r.fatherName}</td>` : ''}
          <td style="text-align:center;">${r.class}</td>
          <td style="text-align:center;" title="${r.familyVoucherData?.id || 'No Voucher Found'}">${r.monthFee > 0 ? Math.round(r.monthFee).toLocaleString() : '0'}</td>
          ${isFirst ? `<td rowspan="${rowspan}" class="thick-border bold-text" style="text-align:center; vertical-align:middle;">${familyMonthFee > 0 ? Math.round(familyMonthFee).toLocaleString() : '0'}</td>` : ''}
          ${isFirst ? `<td rowspan="${rowspan}" class="bg-blue bold-text" style="text-align:center; vertical-align:middle;">${familyPreBalance > 0 ? Math.round(familyPreBalance).toLocaleString() : '0'}</td>` : ''}
          ${isFirst ? `<td rowspan="${rowspan}" class="thick-border-left bold-text" style="text-align:center; vertical-align:middle;">${familyOther > 0 ? Math.round(familyOther).toLocaleString() : (familyOther < 0 ? '0' : '0')}</td>` : ''}
          ${isFirst ? `<td rowspan="${rowspan}" class="bg-green thick-border bold-text" style="text-align:center; vertical-align:middle;">${familyPayOnDueDate > 0 ? Math.round(familyPayOnDueDate).toLocaleString() : '0'}</td>` : ''}
          ${paidCell}
          ${balanceCell}
        </tr>`;
      });
    });

    let totalPayOnDueDate = 0;
    let totalPaidAmount = 0;
    let totalBalanceAmount = 0;

    sortedFamilyKeys.forEach(familyKey => {
      const familyRows = grouped[familyKey];
      const familyVoucher = familyRows.find(r => r.familyVoucherData)?.familyVoucherData;
      
      if (familyVoucher) {
        const familyPayOnDueDate = Number(familyVoucher.totalAmount) || 0;
        const familyPaid = Number(familyVoucher.paidAmount) || 0;
        
        totalPayOnDueDate += familyPayOnDueDate;
        totalPaidAmount += familyPaid;
        totalBalanceAmount += Math.max(0, familyPayOnDueDate - familyPaid);
      } else {
        totalPayOnDueDate += familyRows.reduce((s, r) => s + (Number(r.payOnDueDate) || 0), 0);
        totalPaidAmount += familyRows.reduce((s, r) => s + (Number(r.paid) || 0), 0);
        totalBalanceAmount += familyRows.reduce((s, r) => s + Math.max(0, Number(r.totalBalance) || 0), 0);
      }
    });

    let totalPaidCell = '';
    let totalBalanceCell = '';

    if (mode === 'blank') {
      totalPaidCell = `<td class="bold-text" style="text-align:center;"></td>`;
      totalBalanceCell = `<td class="thick-border-left bold-text" style="text-align:center;"></td>`;
    } else if (mode === 'paid') {
      totalPaidCell = `<td class="bold-text" style="text-align:center; color: #070;">${totalPaidAmount > 0 ? Math.round(totalPaidAmount).toLocaleString() : '0'}</td>`;
      totalBalanceCell = `<td class="thick-border-left bold-text" style="text-align:center; color: #c00;">${totalBalanceAmount > 0 ? Math.round(totalBalanceAmount).toLocaleString() : '0'}</td>`;
    } else if (mode === 'unpaid') {
      totalPaidCell = `<td class="bold-text" style="text-align:center; color: #888;">0</td>`;
      totalBalanceCell = `<td class="thick-border-left bold-text" style="text-align:center; color: #c00;">${totalPayOnDueDate > 0 ? Math.round(totalPayOnDueDate).toLocaleString() : '0'}</td>`;
    } else {
      totalPaidCell = `<td class="bold-text" style="text-align:center; color: #070;">${totalPaidAmount > 0 ? Math.round(totalPaidAmount).toLocaleString() : '0'}</td>`;
      totalBalanceCell = `<td class="thick-border-left bold-text" style="text-align:center; color: #c00;">${totalBalanceAmount > 0 ? Math.round(totalBalanceAmount).toLocaleString() : '0'}</td>`;
    }

    const totalsHtml = `
      <tr style="background:#f8fafc; font-weight:bold;">
        <td colspan="10" style="text-align:right; font-weight:bold; padding-right:15px; border:2px solid #000;">GRAND TOTAL</td>
        <td class="bg-green thick-border bold-text" style="text-align:center;">${totalPayOnDueDate > 0 ? Math.round(totalPayOnDueDate).toLocaleString() : '0'}</td>
        ${totalPaidCell}
        ${totalBalanceCell}
      </tr>
    `;

    const principalRule = schoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal');
    const principalSignatureUrl = schoolData?.signatureSettings?.principalSignatureUrl || principalRule?.signatureUrl || null;
    const accountantRule = schoolData?.signatureSettings?.rules?.find(r => r.type === 'Accountant' || r.type === 'Clerk');
    const accountantSignatureUrl = accountantRule?.signatureUrl || null;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 15px; }
          h1 { font-size: 17px; text-align: center; font-weight: bold; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
          th { background: #f0f0f0; padding: 5px 4px; border: 1px solid #000; text-align: center; font-size: 10px; font-weight: bold; }
          td { font-size: 10px; border: 1px solid #000; padding: 4px 5px; }
          .thick-border { border: 2px solid #000 !important; }
          .thick-border-left { border-left: 2px solid #000 !important; }
          .bg-blue { background-color: #d9edf7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-green { background-color: #dff0d8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bold-text { font-weight: bold; }
          @media print { 
            body { padding: 10px; }
            .bg-blue { background-color: #d9edf7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .bg-green { background-color: #dff0d8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>${title} - ${formatMonthLabel(selectedMonth)}</h1>
        <table>
          <thead>
            <tr>
              <th style="width: 3%;">SR#</th>
              <th style="width: 5%;">GR#</th>
              <th style="width: 6%;">Fam ID</th>
              <th style="width: 14%; text-align: left;">Name</th>
              <th style="width: 14%; text-align: left;">Father Name</th>
              <th style="width: 5%;">Class</th>
              <th style="width: 4%;">A.<br>Fee</th>
              <th class="thick-border" style="width: 7%;">${shortMonth}</th>
              <th class="bg-blue" style="width: 7%;">Pre.<br>Balance</th>
              <th class="thick-border-left" style="width: 5%;">Other</th>
              <th class="bg-green thick-border" style="width: 8%;">Pay on Due<br>Date</th>
              <th style="width: 6%; color: ${mode === 'paid' ? '#070' : '#000'};">${mode === 'paid' ? 'Paid<br>Amount' : 'Paid'}</th>
              <th class="thick-border-left" style="width: 8%; color: #c00;">${mode === 'paid' ? 'Reminder<br>Balance' : (mode === 'unpaid' ? 'Total<br>Overdue' : 'Total<br>Balance')}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            ${totalsHtml}
          </tbody>
        </table>
        <div style="margin-top:35px; display:flex; justify-content:space-between; padding:0 20px;">
          <div style="text-align: center;">
            ${accountantSignatureUrl ? `<img src="${accountantSignatureUrl}" style="height:80px; object-fit:contain; margin-bottom:-4px;" />` : `<div style="height:80px;"></div>`}
            <div style="width:160px; border-bottom:1px solid #000; margin-bottom:4px;"></div>
            <span style="font-size:11px; font-weight:bold;">Accountant Signature</span>
          </div>
          <div style="text-align: center;">
            ${principalSignatureUrl ? `<img src="${principalSignatureUrl}" style="height:80px; object-fit:contain; margin-bottom:-4px;" />` : `<div style="height:80px;"></div>`}
            <div style="width:160px; border-bottom:1px solid #000; margin-bottom:4px;"></div>
            <span style="font-size:11px; font-weight:bold;">Principal Signature</span>
          </div>
        </div>
        <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-16">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <FileText className="text-blue-400" size={30} /> Fee Reports
          </h1>
          <p className="text-dark-muted text-sm font-bold mt-1">Printable monthly fee collection registers • WhatsApp reminders.</p>
        </div>

        {/* Print Buttons */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setLoading(true); setStudents([]); setVouchers([]); setTimeout(() => window.location.reload(), 100); }}
            className="flex items-center gap-2 px-3 py-2.5 bg-dark-card border border-dark-border rounded-xl text-xs font-black text-dark-muted hover:bg-white/5 transition-all">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleDeleteAllMonthVouchers}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-black text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all uppercase tracking-widest"
            title="Delete all vouchers for this selected month"
          >
            <Trash2 size={14} /> Delete Month Vouchers
          </button>
          <button onClick={handleFixMonthAnnualFund} disabled={fixingVouchers}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-black text-amber-400 hover:bg-amber-500/20 transition-all uppercase tracking-widest disabled:opacity-50"
            title="Remove duplicate Annual Fund from this month's vouchers"
          >
            {fixingVouchers ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Fix Annual Fund
          </button>
          <button onClick={async () => {
            const monthLabel = formatMonthLabel(selectedMonth);
            // Match by all possible stored formats
            const monthVouchers = vouchers.filter(v => {
              const m = v.month || '';
              return m === monthLabel || m === selectedMonth ||
                m.toLowerCase().includes('september') && m.includes('2026') ||
                m === '2026-09';
            });
            if (monthVouchers.length === 0) {
              return alert(`No September vouchers found. Total vouchers loaded: ${vouchers.length}. Sample: ${JSON.stringify(vouchers.slice(0,2).map(v=>({month:v.month,items:v.feeItems?.length})))}`);
            }
            const withAnnual = monthVouchers.filter(v => v.feeItems?.some(fi => (fi.name||'').toLowerCase().includes('annual')));
            if (withAnnual.length === 0) {
              return alert(`Found ${monthVouchers.length} September vouchers but NONE have Annual Fund in feeItems.\n\nSample feeItems: ${JSON.stringify(monthVouchers[0]?.feeItems?.slice(0,3))}`);
            }
            if (!window.confirm(`Remove Annual Fund from ${withAnnual.length} voucher(s) for ${monthLabel}?`)) return;
            setFixingVouchers(true);
            let fixed = 0;
            try {
              for (const v of withAnnual) {
                const newItems = (v.feeItems || []).filter(fi => !(fi.name || '').toLowerCase().includes('annual'));
                const newTotal = newItems.reduce((s, fi) => s + (Number(fi.amount) || 0), 0);
                await updateRecord('vouchers', v.id, { feeItems: newItems, totalAmount: newTotal });
                setVouchers(prev => prev.map(pv => pv.id === v.id ? { ...pv, feeItems: newItems, totalAmount: newTotal } : pv));
                fixed++;
              }
              alert(`✅ Done! Removed Annual Fund from ${fixed} voucher(s).`);
            } catch(err) { alert('Error: ' + err.message); }
            finally { setFixingVouchers(false); }
          }} disabled={fixingVouchers}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-orange-500/10 border border-orange-500/30 rounded-xl text-xs font-black text-orange-400 hover:bg-orange-500/20 transition-all uppercase tracking-widest disabled:opacity-50"
            title="Remove Annual Fund from ALL this month's vouchers"
          >
            {fixingVouchers ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Remove Annual Fund
          </button>
          <button onClick={() => handlePrint('blank')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-xl text-xs font-black text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-white/5 transition-all uppercase tracking-widest">
            <FileText size={14} /> Blank Register
          </button>
          <button onClick={() => handlePrint('paid')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-dark-card border border-emerald-200 dark:border-dark-border rounded-xl text-xs font-black text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-all uppercase tracking-widest">
            <CheckCircle size={14} /> Paid Record
          </button>
          <button onClick={() => handlePrint('unpaid')}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-dark-card border border-rose-200 dark:border-dark-border rounded-xl text-xs font-black text-rose-700 dark:text-rose-400 hover:bg-rose-100 transition-all uppercase tracking-widest">
            <AlertCircle size={14} /> Unpaid Record
          </button>
          <button onClick={() => handlePrint('all')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/20 transition-all uppercase tracking-widest">
            <Printer size={14} /> Print Register
          </button>
          
          {/* TEMP AUDIT BUTTON FOR 55 UNPAID VOUCHERS */}
          <button onClick={() => {
            const monthLabel = formatMonthLabel(selectedMonth);
            const filteredVouchers = vouchers.filter(v => v.month === selectedMonth || v.month === monthLabel);
            const unpaid = filteredVouchers.filter(v => (Number(v.totalAmount) || 0) > 0 && (Number(v.paidAmount) || 0) === 0);
            
            console.log("=== AUDIT: UNPAID VOUCHERS FOR " + monthLabel + " ===");
            console.log("Total Vouchers Found in DB for this month:", filteredVouchers.length);
            console.log("Total UNPAID Vouchers:", unpaid.length);
            
            // Check for duplicate students/families
            const seenIds = new Set();
            const duplicates = [];
            unpaid.forEach(v => {
              const id = v.studentId || v.familyId || (v.childrenIds ? v.childrenIds.join(',') : v.id);
              if (seenIds.has(id)) {
                duplicates.push(v);
              }
              seenIds.add(id);
            });
            
            console.log("Duplicate Unpaid Vouchers Found:", duplicates.length);
            if (duplicates.length > 0) console.log("Duplicates Data:", duplicates);
            
            alert(`Audit complete! Check browser console (F12) for details.\n\nTotal Vouchers: ${filteredVouchers.length}\nUnpaid Vouchers: ${unpaid.length}\nDuplicates: ${duplicates.length}`);
          }}
            className="flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-rose-500/50 rounded-xl text-xs font-black text-rose-400 hover:bg-rose-500/10 transition-all uppercase tracking-widest">
            <Search size={14} /> Audit Unpaid Vouchers
          </button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Students', val: allRows.length, color: 'blue' },
          { label: 'Total Payable', val: `Rs. ${totalFee.toLocaleString()}`, color: 'white' },
          { label: 'Total Collected', val: `Rs. ${totalPaid.toLocaleString()}`, color: 'emerald' },
          { label: 'Total Pending', val: `Rs. ${totalBalance.toLocaleString()}`, color: 'rose' },
        ].map((s, i) => (
          <GlassCard key={i} className={`p-4 border-b-2 border-b-${s.color}-500`}>
            <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">{s.label}</p>
            <p className={`text-xl font-black mt-1 text-${s.color === 'white' ? 'white' : s.color + '-400'}`}>{s.val}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Controls ── */}
      <GlassCard className="p-0 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-dark-border flex flex-col md:flex-row items-center gap-4 justify-between">
          {/* Tabs */}
          <div className="flex gap-1 bg-dark-bg rounded-xl p-1 border border-dark-border">
            {[
              { key: 'all', label: `All (${allRows.length})` },
              { key: 'paid', label: `Paid (${paidRows.length})`, color: 'emerald' },
              { key: 'unpaid', label: `Unpaid (${unpaidRows.length})`, color: 'rose' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all uppercase tracking-widest ${
                  activeTab === tab.key
                    ? tab.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : tab.color === 'rose' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-dark-muted hover:text-white'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
              <input
                type="text"
                placeholder="Search student, father, class..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-dark-bg pl-9 pr-4 py-2 rounded-xl border border-dark-border text-sm text-white outline-none focus:border-blue-500 transition-all w-56"
              />
            </div>
            <div className="flex items-center gap-2 bg-dark-bg px-3 py-2 rounded-xl border border-dark-border">
              <Calendar size={15} className="text-dark-muted" />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer [color-scheme:dark]"
              />
              {/* Show voucher count for selected month */}
              {(() => {
                const monthLabel = formatMonthLabel(selectedMonth);
                const count = vouchers.filter(v => v.month === monthLabel || v.month === selectedMonth).length;
                return count > 0 ? (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-black">
                    {count} vouchers
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-red-500/15 text-red-400 rounded-full text-[10px] font-black" title="Is month mein koi voucher nahi. Sahi month select karein.">
                    ⚠️ No data
                  </span>
                );
              })()}
            </div>

            <div className="flex items-center gap-2 bg-dark-bg px-3 py-2 rounded-xl border border-dark-border">
              <Filter size={15} className="text-dark-muted" />
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
              >
                <option value="All" className="bg-dark-card">All Classes</option>
                {uniqueClasses.map(c => (
                  <option key={c} value={c} className="bg-dark-card">Class {c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 size={36} className="animate-spin text-blue-400 mx-auto mb-3" />
              <p className="text-dark-muted font-bold text-sm">Loading fee records...</p>
            </div>
          ) : displayRows.length === 0 ? (
            <div className="py-20 text-center">
              <FileText size={48} className="text-dark-muted opacity-20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No Records Found</h3>
              <p className="text-dark-muted text-sm">No students found for the selected filters.</p>
            </div>
          ) : (
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="bg-dark-bg/60 border-b border-dark-border text-[10px] font-black text-dark-muted uppercase tracking-[0.15em]">
                  <th className="py-3 px-3 text-center">SR#</th>
                  <th className="py-3 px-3">GR#</th>
                  <th className="py-3 px-3 text-center">Fam ID</th>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Father Name</th>
                  <th className="py-3 px-3 text-center">Class</th>
                  <th className="py-3 px-3 text-right">A. Fee</th>
                  <th className="py-3 px-3 text-right">{formatMonthLabel(selectedMonth).split(' ')[0].slice(0,3)} {formatMonthLabel(selectedMonth).split(' ')[1]}</th>
                  <th className="py-3 px-3 text-right">Pre. Balance</th>
                  <th className="py-3 px-3 text-right">Other</th>
                  <th className="py-3 px-3 text-right">Pay on Due Date</th>
                  <th className="py-3 px-3 text-right">Paid</th>
                  <th className="py-3 px-3 text-right">{activeTab === 'paid' ? 'Reminder Balance' : 'Total Balance'}</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">📲</th>
                  <th className="py-3 px-3 text-center">🗑️</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const grouped = {};
                  displayRows.forEach(r => {
                    const fname = (r.fatherName || 'Unknown').trim().toLowerCase().replace(/\s+/g, '_');
                    let key = '';
                    if (r.familyVoucherData && r.familyVoucherData.id) {
                      key = `voucher_${r.familyVoucherData.id}`;
                    } else {
                      key = `student_${r.id}`;
                    }
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(r);
                  });

                  const sortedFamilyKeys = Object.keys(grouped).sort((a, b) => {
                    const nameA = (grouped[a][0].fatherName || '').toLowerCase();
                    const nameB = (grouped[b][0].fatherName || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                  });

                  let sr = 1;
                  return sortedFamilyKeys.map((familyKey, fIdx) => {
                    const familyRows = grouped[familyKey];
                    const rowspan = familyRows.length;
                    
                    // If any row has familyVoucherData, we use that for the family totals
                    const familyVoucher = familyRows.find(r => r.familyVoucherData)?.familyVoucherData;

                    let familyMonthFee, familyPreBalance, familyOther, familyPayOnDueDate, familyPaid, familyTotalBalance, familyStatus;

                    familyMonthFee = familyRows.reduce((sum, r) => sum + (Number(r.monthFee) || 0), 0);
                    familyPreBalance = familyRows.reduce((sum, r) => sum + (Number(r.previousBalance) || 0), 0);
                    familyOther = familyRows.reduce((sum, r) => sum + (Number(r.annualFee) || 0) + (Number(r.other) || 0), 0);
                    
                    familyPayOnDueDate = Number(familyRows[0].payOnDueDate) || 0;
                    familyPaid = Number(familyRows[0].paid) || 0;
                    familyTotalBalance = Number(familyRows[0].totalBalance) || 0;
                    
                    familyStatus = familyPaid >= familyPayOnDueDate && familyPayOnDueDate > 0
                      ? 'Paid'
                      : familyPaid > 0 ? 'Partial' : 'Unpaid';

                    return familyRows.map((row, index) => {
                      const isFirst = index === 0;
                      // Don't apply border-b to the TR if there's a rowspan and it's not the last row, 
                      // otherwise the border cuts through the spanned cells.
                      const isLast = index === familyRows.length - 1;
                      const borderClass = isLast ? 'border-b border-dark-border/30' : '';

                      return (
                        <tr key={row.id} className={`${borderClass} hover:bg-white/3 transition-colors text-sm ${familyStatus === 'Paid' ? 'bg-emerald-500/3' : familyStatus === 'Partial' ? 'bg-amber-500/3' : ''}`}>
                          <td className="py-2.5 px-3 text-dark-muted font-bold text-center">{sr++}</td>
                          <td className="py-2.5 px-3 text-dark-muted font-mono text-xs">{row.gr}</td>
                          {isFirst && (
                            <td rowSpan={rowspan} className="py-2.5 px-3 text-blue-400 font-mono text-[10px] font-black text-center align-middle border-b border-dark-border/30">{row.displayFamilyId || '-'}</td>
                          )}
                          <td className="py-2.5 px-3 font-bold text-white">{row.name}</td>
                          
                          {isFirst && (
                            <td rowSpan={rowspan} className="py-2.5 px-3 text-dark-muted text-xs align-middle border-b border-dark-border/30">{row.fatherName}</td>
                          )}
                          
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-black border border-blue-500/20">{row.class}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs text-dark-muted">{row.annualFee > 0 ? row.annualFee.toLocaleString() : '0'}</td>
                          
                          {isFirst && (
                            <>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-right font-mono font-bold text-white align-middle border-b border-dark-border/30">{familyMonthFee > 0 ? familyMonthFee.toLocaleString() : '0'}</td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-right font-mono text-xs text-rose-400 align-middle border-b border-dark-border/30">{familyPreBalance > 0 ? familyPreBalance.toLocaleString() : '0'}</td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-right text-dark-muted text-xs align-middle border-b border-dark-border/30">{familyOther > 0 ? familyOther.toLocaleString() : '0'}</td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-right font-mono font-bold text-white align-middle border-b border-dark-border/30">{familyPayOnDueDate > 0 ? familyPayOnDueDate.toLocaleString() : '0'}</td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 align-middle border-b border-dark-border/30">{familyPaid > 0 ? familyPaid.toLocaleString() : '0'}</td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-right align-middle border-b border-dark-border/30">
                                {familyTotalBalance > 0 ? (
                                  <span className="font-mono font-bold text-rose-400">{familyTotalBalance.toLocaleString()}</span>
                                ) : familyTotalBalance < 0 ? (
                                  <span className="font-mono font-bold text-emerald-400">Advance</span>
                                ) : (
                                  <span className="font-mono text-emerald-400 font-bold">0</span>
                                )}
                              </td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-center align-middle border-b border-dark-border/30">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${
                                  familyStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : familyStatus === 'Partial' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                }`}>{familyStatus}</span>
                              </td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-center align-middle border-b border-dark-border/30">
                                {familyStatus !== 'Paid' && familyRows[0].phone && (
                                  <button
                                    onClick={() => sendWaReminder(familyRows[0])}
                                    disabled={sendingWa === familyRows[0].id}
                                    title="Send WhatsApp Fee Reminder"
                                    className="w-8 h-8 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 transition-all mx-auto disabled:opacity-40"
                                  >
                                    {sendingWa === familyRows[0].id ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                                  </button>
                                )}
                              </td>
                              <td rowSpan={rowspan} className="py-2.5 px-3 text-center align-middle border-b border-dark-border/30">
                                <button
                                  onClick={() => handleDeleteVoucher(familyRows[0])}
                                  disabled={deletingId === familyRows[0].id}
                                  title="Delete Family Voucher"
                                  className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 transition-all mx-auto disabled:opacity-40"
                                >
                                  {deletingId === familyRows[0].id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    });
                  });
                })()}
              </tbody>
              {/* Totals Row */}
              <tfoot>
                <tr className="bg-dark-bg/80 border-t-2 border-blue-500/30 text-sm font-black">
                  <td colSpan={9} className="py-3 px-3 text-right text-dark-muted uppercase tracking-widest text-[10px]">Totals</td>
                  <td className="py-3 px-3 text-right text-white font-mono">
                    {displayRows.reduce((s, r) => s + r.payOnDueDate, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-mono">
                    {displayRows.reduce((s, r) => s + r.paid, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-400 font-mono">
                    {displayRows.reduce((s, r) => s + Math.max(0, r.totalBalance), 0).toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default FeeRecord;
