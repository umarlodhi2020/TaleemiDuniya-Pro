import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Search, PlusCircle, Printer, Phone, CreditCard, CheckCircle2, 
  AlertCircle, UserPlus, FileText, Send, Link2, GraduationCap, Percent, 
  ChevronRight, Filter, Download, Upload, Edit, Edit2, Trash2, CheckSquare, CheckCircle
} from 'lucide-react';
import { getRecords, updateRecord, addRecord, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const FamilyTree = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [filterFormStatus, setFilterFormStatus] = useState('All');
  
  const [selectedFamilyForChallan, setSelectedFamilyForChallan] = useState(null);
  const [siblingDiscountPercent, setSiblingDiscountPercent] = useState(10);
  const [sendingWa, setSendingWa] = useState(false);

  // New Bulk States
  const [selectedFamilies, setSelectedFamilies] = useState([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState('update_phone'); // update_phone, update_fee, whatsapp, delete
  const [importCsvText, setImportCsvText] = useState('');
  const [bulkEditValues, setBulkEditValues] = useState({ phone: '', fee: '' });
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkResult, setBulkResult] = useState(null); // { success: N, fail: N }

  // Edit Family States
  const [editingFamily, setEditingFamily] = useState(null);
  const [editFamilyValues, setEditFamilyValues] = useState({ fatherName: '', fatherCnic: '', phone: '' });
  const [isSavingFamily, setIsSavingFamily] = useState(false);



  const handleEditFamily = (fam) => {
    setEditingFamily(fam);
    setEditFamilyValues({
      fatherName: fam.fatherName !== 'Unknown Father' ? fam.fatherName : '',
      fatherCnic: fam.fatherCnic !== '-' ? fam.fatherCnic : '',
      phone: fam.phone !== '-' ? fam.phone : ''
    });
  };

  const handleSaveFamilyEdit = async () => {
    if (!editingFamily) return;
    setIsSavingFamily(true);
    try {
      const updates = {
        fatherName: editFamilyValues.fatherName.trim() || 'Unknown Father',
        fatherCnic: editFamilyValues.fatherCnic.trim() || '',
        phone: editFamilyValues.phone.trim() || '',
        parentPhone: editFamilyValues.phone.trim() || '',
        fatherPhone: editFamilyValues.phone.trim() || ''
      };

      for (const child of editingFamily.children) {
        await updateRecord('students', child.id, updates, userData.schoolId);
      }

      alert('✅ Family profile updated successfully for all children.');
      setEditingFamily(null);
      await fetchStudents();
    } catch (error) {
      console.error(error);
      alert('❌ Error updating family profile.');
    } finally {
      setIsSavingFamily(false);
    }
  };

  // Spreadsheet Mode (Bulk Profile Update) States
  const [isSpreadsheetMode, setIsSpreadsheetMode] = useState(false);
  const [inlineFamilyEdits, setInlineFamilyEdits] = useState({});
  const [inlineStudentEdits, setInlineStudentEdits] = useState({});
  const [isSavingInline, setIsSavingInline] = useState(false);

  const handleInlineFamilyChange = (familyId, field, value) => {
    setInlineFamilyEdits(prev => ({
      ...prev,
      [familyId]: {
        ...(prev[familyId] || {}),
        [field]: value
      }
    }));
  };

  const handleInlineStudentChange = (studentId, field, value) => {
    setInlineStudentEdits(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: value
      }
    }));
  };

  const saveInlineFamilyEdits = async () => {
    const famEditIds = Object.keys(inlineFamilyEdits);
    const stuEditIds = Object.keys(inlineStudentEdits);
    
    if (famEditIds.length === 0 && stuEditIds.length === 0) {
      setIsSpreadsheetMode(false);
      return;
    }

    if (!window.confirm(`Are you sure you want to save these bulk edits?`)) return;

    setIsSavingInline(true);
    try {
      // Process student-specific edits
      for (const stuId of stuEditIds) {
        const changes = inlineStudentEdits[stuId];
        await updateRecord('students', stuId, changes, userData.schoolId);
      }

      // Process family edits (apply to all children of the family)
      for (const famId of famEditIds) {
        const familyToUpdate = families.find(f => f.id === famId);
        if (!familyToUpdate) continue;

        const changes = inlineFamilyEdits[famId];
        const updates = {};
        if (changes.familyId !== undefined) updates.familyId = changes.familyId.trim();
        if (changes.fatherName !== undefined) updates.fatherName = changes.fatherName.trim() || 'Unknown Father';
        if (changes.fatherCnic !== undefined) updates.fatherCnic = changes.fatherCnic.trim();
        if (changes.phone !== undefined) {
          updates.phone = changes.phone.trim();
          updates.parentPhone = changes.phone.trim();
          updates.fatherPhone = changes.phone.trim();
        }

        for (const child of familyToUpdate.children) {
          // If the child was already updated in the student-specific pass, we still apply family changes
          await updateRecord('students', child.id, updates, userData.schoolId);
        }
      }
      
      alert(`✅ Bulk edits saved successfully!`);
      setInlineFamilyEdits({});
      setInlineStudentEdits({});
      setIsSpreadsheetMode(false);
      await fetchStudents();
    } catch (err) {
      console.error(err);
      alert('❌ Error saving bulk edits.');
    } finally {
      setIsSavingInline(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [userData]);

  const fetchStudents = async () => {
    if (!userData?.schoolId) return;
    setLoading(true);
    try {
      const list = await getRecords('students', userData.schoolId);
      setStudents(list);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
      setSelectedFamilies([]);
    }
  };

  const families = useMemo(() => {
    const groupMap = new Map();
    students.forEach((st) => {
      const cnicKey = st.fatherCnic ? st.fatherCnic.replace(/[^0-9]/g, '') : null;
      const phoneKey = st.parentPhone || st.fatherPhone || st.phone;
      const cleanPhone = phoneKey ? phoneKey.replace(/[^0-9]/g, '') : null;
      const nameKey = st.fatherName ? st.fatherName.trim().toLowerCase() : 'unknown_father';

      const familyKey = st.familyId || cnicKey || cleanPhone || `name_${nameKey}`;

      if (!groupMap.has(familyKey)) {
        groupMap.set(familyKey, {
          key: familyKey,
          familyId: st.familyId || '-',
          fatherName: st.fatherName || 'Unknown Father',
          fatherCnic: st.fatherCnic || st.cnic || '-',
          motherName: st.motherName || '-',
          phone: st.parentPhone || st.fatherPhone || st.phone || '-',
          address: st.address || '-',
          children: []
        });
      }

      const grp = groupMap.get(familyKey);
      grp.children.push(st);
      if (grp.fatherCnic === '-' && st.fatherCnic) grp.fatherCnic = st.fatherCnic;
      if (grp.motherName === '-' && st.motherName) grp.motherName = st.motherName;
      if (grp.phone === '-' && (st.parentPhone || st.fatherPhone)) grp.phone = st.parentPhone || st.fatherPhone;
    });

    const list = Array.from(groupMap.values());
    list.sort((a, b) => b.children.length - a.children.length);
    return list;
  }, [students]);

  const filteredFamilies = useMemo(() => {
    return families.filter((fam) => {
      const matchSearch = searchTerm === '' || 
        fam.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fam.fatherCnic.includes(searchTerm) ||
        fam.phone.includes(searchTerm) ||
        fam.children.some(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.rollNumber || '').toString().includes(searchTerm));
      const matchClass = filterClass === 'All' || fam.children.some(c => c.class === filterClass);
      
      let matchStatus = true;
      if (filterFormStatus !== 'All') {
        const firstChild = fam.children[0] || {};
        const sentAt = firstChild.updateFormSentAt;
        const submittedAt = firstChild.updateFormSubmittedAt;
        
        let status = "Not Sent";
        if (sentAt) {
          if (!submittedAt || new Date(sentAt) > new Date(submittedAt)) {
            status = "Pending";
          } else {
            status = "Updated";
          }
        }
        matchStatus = (filterFormStatus === status);
      }

      return matchSearch && matchClass && matchStatus;
    });
  }, [families, searchTerm, filterClass, filterFormStatus]);

  const totalFamilies = filteredFamilies.length;
  const totalStudentsInFamilies = filteredFamilies.reduce((sum, f) => sum + f.children.length, 0);

  const allClasses = useMemo(() => {
    const s = new Set();
    students.forEach(st => st.class && s.add(st.class));
    return ['All', ...Array.from(s)];
  }, [students]);

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedFamilies(filteredFamilies.map(f => f.key));
    } else {
      setSelectedFamilies([]);
    }
  };

  const handleSelectFamily = (key) => {
    setSelectedFamilies(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Export Logic
  const handleExportCSV = () => {
    const headers = ['Family ID', 'Father Name', 'Father CNIC', 'Mother Name', 'Phone', 'Children Count', 'Children Details'];
    const csvRows = [];
    csvRows.push(headers.join(','));

    filteredFamilies.forEach(fam => {
      const childrenDetails = fam.children.map(c => `${c.name} (${c.class})`).join(' | ');
      const row = [
        `"${fam.familyId}"`,
        `"${fam.fatherName}"`,
        `"${fam.fatherCnic}"`,
        `"${fam.motherName}"`,
        `"${fam.phone}"`,
        fam.children.length,
        `"${childrenDetails}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Family_Tree_Export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import Logic (Dummy parser for now)
  const handleImportCSV = async () => {
    if (!importCsvText.trim()) {
      alert("Please paste CSV content");
      return;
    }
    // Basic CSV parsing logic to extract rows
    const rows = importCsvText.split('\n').map(row => row.split(','));
    if (rows.length <= 1) {
      alert("Invalid CSV or empty rows.");
      return;
    }
    alert("Import feature is structurally ready. This will map to 'students' collection in Firebase.");
    setIsImportModalOpen(false);
    setImportCsvText('');
  };

  // Bulk WhatsApp Dispatcher
  const handleBulkSendWhatsApp = async () => {
    if (selectedFamilies.length === 0) return;
    const confirmSend = window.confirm(`Send WhatsApp Update Forms to ${selectedFamilies.length} families?`);
    if (!confirmSend) return;

    setSendingWa(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const key of selectedFamilies) {
      const fam = families.find(f => f.key === key);
      if (fam && fam.phone && fam.phone !== '-') {
        const cleanPhone = fam.phone.replace(/[^0-9]/g, '');
        const link = `https://taleemidunya-pro-ed44e.web.app/#/family-update/${userData?.schoolId || 'default_school'}/${cleanPhone}`;
        const msgText = `📢 *FAMILY DATA UPDATE FORM*\n\nAssalam-o-Alaikum ${fam.fatherName} Sb,\n\nNeeche diye gaye link par click karke aap apne bachon ka record verify aur update kar sakte hain:\n\n🌐 *Update Link:*\n${link}\n\n⚠️ *Note:* Yeh link secure hai. Yahan par aap basic details change kar sakte hain.\n\nRegards,\nSchool Administration`;

        try {
          let res = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              schoolId: userData?.schoolId || 'default_school',
              phone: fam.phone,
              message: msgText
            })
          });
          let data = await res.json();
          
          if (!data.success && (userData?.schoolId && userData.schoolId !== 'default_school')) {
            res = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                schoolId: 'default_school',
                phone: fam.phone,
                message: msgText
              })
            });
            data = await res.json();
          }

          if (data.success && data.results?.[0]?.status === 'sent') {
            const sentAt = new Date().toISOString();
            for (const child of fam.children) {
              await updateRecord('students', child.id, { updateFormSentAt: sentAt }, userData.schoolId);
            }
            successCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          console.error('Failed to send for family', fam.key, e);
          failCount++;
        }
      } else {
        failCount++;
      }
    }
    
    setSendingWa(false);
    alert(`Successfully queued messages for ${successCount} families! Failed/Skipped: ${failCount}`);
    setIsBulkEditModalOpen(false);
    setSelectedFamilies([]);
    await fetchStudents();
  };

  // Real Bulk Edit Handler
  const handleBulkEdit = async () => {
    if (selectedFamilies.length === 0) return;
    setBulkProcessing(true);
    setBulkResult(null);
    let successCount = 0;
    let failCount = 0;

    try {
      if (bulkActionType === 'update_phone') {
        if (!bulkEditValues.phone.trim()) { alert('Please enter a phone number.'); setBulkProcessing(false); return; }
        for (const key of selectedFamilies) {
          const fam = families.find(f => f.key === key);
          if (fam) {
            for (const child of fam.children) {
              try {
                await updateRecord('students', child.id, { 
                  parentPhone: bulkEditValues.phone.trim(),
                  phone: bulkEditValues.phone.trim()
                }, userData.schoolId);
                successCount++;
              } catch { failCount++; }
            }
          }
        }
        setBulkResult({ success: successCount, fail: failCount, msg: 'Phone numbers updated for students.' });
        await fetchStudents();

      } else if (bulkActionType === 'update_fee') {
        if (!bulkEditValues.fee || isNaN(Number(bulkEditValues.fee))) { alert('Please enter a valid fee amount.'); setBulkProcessing(false); return; }
        for (const key of selectedFamilies) {
          const fam = families.find(f => f.key === key);
          if (fam) {
            for (const child of fam.children) {
              try {
                await updateRecord('students', child.id, { 
                  monthlyFee: Number(bulkEditValues.fee),
                  tuitionFee: Number(bulkEditValues.fee)
                }, userData.schoolId);
                successCount++;
              } catch { failCount++; }
            }
          }
        }
        setBulkResult({ success: successCount, fail: failCount, msg: 'Monthly fees updated for students.' });
        await fetchStudents();

      } else if (bulkActionType === 'whatsapp') {
        await handleBulkSendWhatsApp();
        return;

      } else if (bulkActionType === 'delete') {
        const confirm = window.confirm(`⚠️ Are you sure you want to REMOVE all students from ${selectedFamilies.length} selected families? This cannot be undone.`);
        if (!confirm) { setBulkProcessing(false); return; }
        for (const key of selectedFamilies) {
          const fam = families.find(f => f.key === key);
          if (fam) {
            for (const child of fam.children) {
              try {
                await deleteRecord('students', child.id);
                successCount++;
              } catch { failCount++; }
            }
          }
        }
        setBulkResult({ success: successCount, fail: failCount, msg: 'Students removed from database.' });
        await fetchStudents();
      }
    } catch(err) {
      console.error(err);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleSendUpdateForm = async (family) => {
    if (!family.phone || family.phone === '-') {
      alert('❌ This family does not have a registered parent phone number.');
      return;
    }
    setSendingWa(true);
    try {
      const cleanPhone = family.phone.replace(/[^0-9]/g, '');
      const link = `https://taleemidunya-pro-ed44e.web.app/#/family-update/${userData?.schoolId || 'default_school'}/${cleanPhone}`;
      const msgText = `📢 *FAMILY DATA UPDATE FORM*\n\nAssalam-o-Alaikum ${family.fatherName} Sb,\n\nNeeche diye gaye link par click karke aap apne bachon ka record verify aur update kar sakte hain:\n\n🌐 *Update Link:*\n${link}\n\n⚠️ *Note:* Yeh link secure hai. Yahan par aap basic details change kar sakte hain.\n\nRegards,\nSchool Administration`;

      let res = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: userData?.schoolId || 'default_school',
          phone: family.phone,
          message: msgText
        })
      });
      let data = await res.json();
      
      if (!data.success && (userData?.schoolId && userData.schoolId !== 'default_school')) {
        res = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: 'default_school',
            phone: family.phone,
            message: msgText
          })
        });
        data = await res.json();
      }

      if (data.success && data.results?.[0]?.status === 'sent') {
        const sentAt = new Date().toISOString();
        for (const child of family.children) {
          await updateRecord('students', child.id, { updateFormSentAt: sentAt }, userData.schoolId);
        }
        alert(`✅ Update form link sent to ${family.fatherName} (${family.phone}) via WhatsApp!`);
        // We could ideally trigger a refetch here, but for now it'll show after reload or next fetch.
        await fetchStudents(); // Refresh to update UI statuses
      } else {
        alert('❌ Delivery failed. WhatsApp bot might be offline.');
      }
    } catch (err) {
      alert('❌ Connection error: ' + err.message);
    } finally {
      setSendingWa(false);
    }
  };

  const handleSendCombinedChallan = async (family) => {
    if (!family.phone || family.phone === '-') {
      alert('❌ This family does not have a registered parent phone number.');
      return;
    }
    setSendingWa(true);
    try {
      const totalFee = family.children.reduce((acc, c) => acc + (Number(c.monthlyFee || c.tuitionFee) || 4500), 0);
      const discountAmount = family.children.length > 1 ? Math.round((totalFee * siblingDiscountPercent) / 100) : 0;
      const finalAmount = totalFee - discountAmount;

      let childrenDetails = family.children.map((c, idx) => 
        `${idx + 1}. *${c.name}* (Roll: ${c.rollNumber || 'N/A'} | Grade: ${c.class || 'N/A'})\n   Tuition Fee: Rs. ${(Number(c.monthlyFee || c.tuitionFee) || 4500).toLocaleString()}`
      ).join('\n\n');

      const messageText = `👨‍👩‍👧‍👦 *COMBINED FAMILY FEE LEDGER & CHALLAN*\n\nAssalam-o-Alaikum *${family.fatherName}* Sb!\nBelow is the combined fee statement for your children studying at *${userData?.schoolName || 'Our School'}*:\n\n${childrenDetails}\n\n━━━━━━━━━━━━━━━━━━━━\n💰 *Subtotal Fee:* Rs. ${totalFee.toLocaleString()}\n🎁 *Sibling Discount (${siblingDiscountPercent}%):* -Rs. ${discountAmount.toLocaleString()}\n💵 *NET PAYABLE AMOUNT:* *Rs. ${finalAmount.toLocaleString()}* /-\n━━━━━━━━━━━━━━━━━━━━\n📅 *Due Date:* 10th of this Month\n\nBaraye meherbani time par fee jama karwayein. Sukriya!\nSchool Administration`;

      let res = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: userData?.schoolId || 'default_school',
          phone: family.phone,
          message: messageText
        })
      });
      let data = await res.json();

      if (!data.success && (userData?.schoolId && userData.schoolId !== 'default_school')) {
        res = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: 'default_school',
            phone: family.phone,
            message: messageText
          })
        });
        data = await res.json();
      }

      if (data.success && data.results?.[0]?.status === 'sent') {
        alert(`✅ Combined Family Challan sent AUTOMATICALLY to ${family.fatherName} (${family.phone}) via WhatsApp Cloud AI Bot Server!`);
        setSelectedFamilyForChallan(null);
      } else {
        alert(`❌ WhatsApp delivery failed: ${data.error || data.results?.[0]?.error || 'WhatsApp Bot might be offline or disconnected.'}`);
      }
    } catch (err) {
      alert(`❌ Error connecting to server: ${err.message}`);
    } finally {
      setSendingWa(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner with Stats & PDF Export Button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-dark-card border border-dark-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/30 text-primary-400">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dark-text">Family Tree Structure</h1>
              <p className="text-xs text-dark-muted mt-0.5">Group siblings by Parent & manage combined family fee ledgers</p>
            </div>
          </div>
        </div>

        {/* Stats & Action Bar */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-dark-hover border border-dark-border mr-2">
            <div className="text-center">
              <p className="text-[10px] text-dark-muted uppercase font-bold tracking-wider">Total Families</p>
              <p className="text-xl font-extrabold text-primary-400 mt-0.5">{totalFamilies}</p>
            </div>
            <div className="h-6 w-[1px] bg-dark-border" />
            <div className="text-center">
              <p className="text-[10px] text-dark-muted uppercase font-bold tracking-wider">Total Students</p>
              <p className="text-xl font-extrabold text-cyan-400 mt-0.5">{totalStudentsInFamilies}</p>
            </div>
          </div>

          <button 
            onClick={() => {
              if (isSpreadsheetMode) {
                saveInlineFamilyEdits();
              } else {
                setIsSpreadsheetMode(true);
              }
            }}
            disabled={isSavingInline}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer no-print ${
              isSpreadsheetMode 
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20' 
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isSavingInline ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : isSpreadsheetMode ? (
              <><CheckCircle size={16} /> Save All Changes</>
            ) : (
              <><Edit2 size={16} /> Bulk Edit (Excel)</>
            )}
          </button>

          {isSpreadsheetMode && (
            <button 
              onClick={() => {
                setIsSpreadsheetMode(false);
                setInlineFamilyEdits({});
              }}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer no-print"
            >
              Cancel
            </button>
          )}



          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center gap-2 border border-blue-500/30 transition-all cursor-pointer no-print"
          >
            <Upload size={16} />
            <span>Import</span>
          </button>
          
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-500/30 transition-all cursor-pointer no-print"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all cursor-pointer no-print"
          >
            <Printer size={16} />
            <span>PDF / Print</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-dark-card border border-dark-border p-4 rounded-2xl no-print">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
          <input
            type="text"
            placeholder="Search by Father Name, CNIC, Phone number, or Student Name/Roll..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-hover border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-dark-text placeholder-dark-muted outline-none focus:border-primary-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {selectedFamilies.length > 0 && (
            <button
              onClick={() => setIsBulkEditModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/30 transition-all"
            >
              <CheckSquare size={14} />
              Bulk Edit ({selectedFamilies.length})
            </button>
          )}
          
          <div className="flex items-center gap-2 bg-dark-hover border border-dark-border px-3 py-2 rounded-xl text-xs text-dark-muted">
            <Filter size={14} className="text-primary-400" />
            <span className="font-semibold">Status:</span>
            <select
              value={filterFormStatus}
              onChange={(e) => setFilterFormStatus(e.target.value)}
              className="bg-transparent text-dark-text outline-none font-bold cursor-pointer"
            >
              <option value="All" className="bg-dark-card text-dark-text">All</option>
              <option value="Not Sent" className="bg-dark-card text-dark-text">Not Sent</option>
              <option value="Pending" className="bg-dark-card text-dark-text">Pending Update</option>
              <option value="Updated" className="bg-dark-card text-dark-text">Updated</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-dark-hover border border-dark-border px-3 py-2 rounded-xl text-xs text-dark-muted">
            <Filter size={14} className="text-primary-400" />
            <span className="font-semibold">Class:</span>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="bg-transparent text-dark-text outline-none font-bold cursor-pointer"
            >
              {allClasses.map(c => <option key={c} value={c} className="bg-dark-card text-dark-text">{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Select All Bar */}
      <div className="flex items-center gap-3 px-2 no-print">
        <input 
          type="checkbox" 
          className="w-4 h-4 cursor-pointer accent-primary-500"
          checked={filteredFamilies.length > 0 && selectedFamilies.length === filteredFamilies.length}
          onChange={handleSelectAll}
        />
        <span className="text-xs font-bold text-dark-muted uppercase">Select All Families</span>
      </div>

      {/* Families List Grid */}
      {loading ? (
        <div className="p-12 text-center bg-dark-card border border-dark-border rounded-2xl">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-dark-muted">Loading families & sibling structure...</p>
        </div>
      ) : filteredFamilies.length === 0 ? (
        <div className="p-12 text-center bg-dark-card border border-dark-border rounded-2xl text-dark-muted">
          <AlertCircle size={36} className="mx-auto mb-3 opacity-40 text-amber-400" />
          <p className="font-bold text-base">No family structure found matching criteria</p>
          <p className="text-xs mt-1">Make sure student records have Father Name or Phone/CNIC entered.</p>
        </div>
      ) : isSpreadsheetMode ? (
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto custom-scrollbar animate-fade-in">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black bg-dark-bg/50">
                <th className="py-4 px-4 w-12 text-center">#</th>
                <th className="py-4 px-4">GR #</th>
                <th className="py-4 px-4">Student Name</th>
                <th className="py-4 px-4">Class</th>
                <th className="py-4 px-4">Family ID</th>
                <th className="py-4 px-4">Father Name</th>
                <th className="py-4 px-4">Mobile / Phone</th>
                <th className="py-4 px-4">Father CNIC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {filteredFamilies.map((fam, idx) => {
                const s = { ...fam, ...(inlineFamilyEdits[fam.id] || {}) };
                const isFamilyEdited = inlineFamilyEdits[fam.id] !== undefined;
                const rowspan = fam.children.length || 1;

                return fam.children.map((child, childIdx) => {
                  const isFirst = childIdx === 0;
                  const cEdit = inlineStudentEdits[child.id] || {};
                  const isChildEdited = inlineStudentEdits[child.id] !== undefined;
                  const isAnyEdited = isFamilyEdited || isChildEdited;

                  return (
                    <tr key={child.id} className={`hover:bg-white/5 transition-all ${isAnyEdited ? 'bg-primary-500/5' : ''}`}>
                      {isFirst && (
                        <td rowSpan={rowspan} className="py-2 px-4 text-center font-bold text-dark-muted text-xs align-middle border-r border-dark-border/30">{idx + 1}</td>
                      )}
                      
                      {/* Student Specific Fields */}
                      <td className="py-2 px-2">
                        <input 
                          type="text" 
                          value={cEdit.rollNumber !== undefined ? cEdit.rollNumber : (child.rollNumber || child.rollNo || '')} 
                          onChange={(e) => handleInlineStudentChange(child.id, 'rollNumber', e.target.value)} 
                          className="w-24 bg-dark-hover border border-dark-border rounded px-2 py-1.5 text-xs focus:border-primary-500 outline-none transition-all" 
                          placeholder="GR #"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input 
                          type="text" 
                          value={cEdit.name !== undefined ? cEdit.name : (child.name || '')} 
                          onChange={(e) => handleInlineStudentChange(child.id, 'name', e.target.value)} 
                          className="w-full min-w-[150px] bg-dark-hover border border-dark-border rounded px-2 py-1.5 text-xs font-bold focus:border-primary-500 outline-none transition-all" 
                          placeholder="Student Name"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select 
                          value={cEdit.class !== undefined ? cEdit.class : (child.class || '')} 
                          onChange={(e) => handleInlineStudentChange(child.id, 'class', e.target.value)} 
                          className="w-24 bg-dark-hover border border-dark-border rounded px-2 py-1.5 text-xs focus:border-primary-500 outline-none transition-all" 
                        >
                          <option value="">Select</option>
                          {allClasses.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>

                      {/* Family Group Fields (Only on first row) */}
                      {isFirst && (
                        <>
                          <td rowSpan={rowspan} className="py-2 px-2 align-middle border-l border-dark-border/30">
                            <input 
                              type="text" 
                              value={s.familyId !== '-' ? s.familyId : ''} 
                              onChange={(e) => handleInlineFamilyChange(fam.id, 'familyId', e.target.value)} 
                              className="w-full bg-dark-hover border border-dark-border rounded px-2 py-1.5 text-sm font-mono focus:border-primary-500 outline-none transition-all" 
                              placeholder="F-001"
                            />
                          </td>
                          <td rowSpan={rowspan} className="py-2 px-2 align-middle">
                            <input 
                              type="text" 
                              value={s.fatherName !== 'Unknown Father' ? s.fatherName : ''} 
                              onChange={(e) => handleInlineFamilyChange(fam.id, 'fatherName', e.target.value)} 
                              className="w-full bg-dark-hover border border-dark-border rounded px-2 py-1.5 text-sm focus:border-primary-500 outline-none transition-all" 
                              placeholder="Father Name"
                            />
                          </td>
                          <td rowSpan={rowspan} className="py-2 px-2 align-middle">
                            <input 
                              type="tel" 
                              value={s.phone !== '-' ? s.phone : ''} 
                              onChange={(e) => handleInlineFamilyChange(fam.id, 'phone', e.target.value)} 
                              className="w-full bg-dark-hover border border-dark-border rounded px-2 py-1.5 text-sm font-mono focus:border-primary-500 outline-none transition-all" 
                              placeholder="03XX-XXXXXXX"
                            />
                          </td>
                          <td rowSpan={rowspan} className="py-2 px-2 align-middle">
                            <input 
                              type="text" 
                              value={s.fatherCnic !== '-' ? s.fatherCnic : ''} 
                              onChange={(e) => handleInlineFamilyChange(fam.id, 'fatherCnic', e.target.value)} 
                              className="w-full bg-dark-hover border border-dark-border rounded px-2 py-1.5 text-sm font-mono focus:border-primary-500 outline-none transition-all" 
                              placeholder="XXXXX-XXXXXXX-X"
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredFamilies.map((fam, idx) => {
            const firstChild = fam.children[0] || {};
            const sentAt = firstChild.updateFormSentAt;
            const submittedAt = firstChild.updateFormSubmittedAt;
            
            let status = { text: "❌ Form Not Sent", color: "bg-red-500/20 text-red-100 border-red-500/30", icon: "XCircle" };
            if (sentAt) {
              if (!submittedAt || new Date(sentAt) > new Date(submittedAt)) {
                status = { text: "⏳ Form Sent", color: "bg-amber-500/20 text-amber-100 border-amber-500/30", icon: "Clock" };
              } else {
                status = { text: "✅ Updated", color: "bg-green-500/20 text-green-100 border-green-500/30", icon: "CheckCircle2" };
              }
            }

            return (
            <div key={fam.key || idx} className={`bg-dark-card border rounded-2xl overflow-hidden shadow-sm transition-all ${selectedFamilies.includes(fam.key) ? 'border-primary-500 shadow-primary-500/10' : 'border-dark-border hover:border-primary-500/30'}`}>
              
              {/* Blue / Primary Family Bar Header */}
              <div className="bg-blue-600 keep-white text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm font-bold">
                  <div className="flex items-center gap-3 mr-2 no-print">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 cursor-pointer accent-white"
                      checked={selectedFamilies.includes(fam.key)}
                      onChange={() => handleSelectFamily(fam.key)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="opacity-80 font-normal">Father:</span>
                    <span className="text-white tracking-wide font-black underline decoration-white/40 underline-offset-4">
                      {fam.fatherName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="opacity-90 font-normal text-white">Father CNIC:</span>
                    <span className="font-mono bg-black/25 px-2.5 py-0.5 rounded-md text-white font-bold tracking-wider">
                      {fam.fatherCnic}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="opacity-90 font-normal text-white">Family ID:</span>
                    <span className="font-mono bg-black/25 px-2.5 py-0.5 rounded-md text-white font-bold tracking-wider">
                      {fam.familyId}
                    </span>
                  </div>

                  {fam.phone !== '-' && (
                    <div className="flex items-center gap-1.5 text-white/90">
                      <Phone size={13} />
                      <span className="font-mono text-white">{fam.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  {/* Sibling Badge */}
                  <span className="px-3 py-1 rounded-lg bg-amber-400 text-black font-extrabold text-xs shadow-sm flex items-center gap-1">
                    <span>{fam.children.length}</span>
                    <span>{fam.children.length > 1 ? 'Children' : 'Child'}</span>
                  </span>

                  {/* Form Status Badge */}
                  <span className={`px-3 py-1 rounded-lg border font-bold text-xs flex items-center gap-1.5 transition-all ${status.color}`}>
                    <span className="hidden sm:inline">{status.text}</span>
                  </span>

                  {/* Combined Family Challan Action */}
                  {/* Edit Family Profile Action */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditFamily(fam); }}
                    className="px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-100 font-bold text-xs flex items-center gap-1.5 transition-all border border-blue-500/30 cursor-pointer no-print"
                    title="Edit Family Profile (Applies to all siblings)"
                  >
                    <Edit size={14} />
                    <span className="hidden sm:inline">Edit Profile</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleSendUpdateForm(fam); }}
                    disabled={sendingWa}
                    className="px-3 py-1 rounded-lg bg-green-500/20 hover:bg-green-500/40 text-green-100 font-bold text-xs flex items-center gap-1.5 transition-all border border-green-500/30 cursor-pointer no-print disabled:opacity-50"
                    title="Send Family Data Update Form via WhatsApp"
                  >
                    <Send size={14} />
                    <span className="hidden sm:inline">Send Update Form</span>
                  </button>

                  <button
                    onClick={() => setSelectedFamilyForChallan(fam)}
                    className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/20 cursor-pointer no-print"
                    title="Generate combined sibling fee challan with discounts"
                  >
                    <CreditCard size={14} />
                    <span className="hidden sm:inline">Combined Fee Ledger</span>
                  </button>
                </div>
              </div>

              {/* Sibling Cards Container */}
              <div className="p-5 bg-dark-bg/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {fam.children.map((child) => (
                    <div 
                      key={child.id}
                      onClick={() => navigate(`/school-admin/students/${child.id}`)}
                      className="bg-dark-card border border-dark-border hover:border-cyan-500/50 p-4 rounded-xl shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-cyan-500/20 border border-primary-500/30 flex items-center justify-center font-bold text-primary-400 shrink-0 text-sm overflow-hidden">
                              {child.photoUrl ? (
                                <img src={child.photoUrl} alt={child.name} className="w-full h-full object-cover" />
                              ) : (
                                (child.name || 'S')[0].toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-dark-text group-hover:text-cyan-400 transition-colors truncate">
                                {child.name || 'Student'}
                              </h4>
                              <span className="text-[10px] text-dark-muted font-mono bg-dark-hover px-1.5 py-0.5 rounded border border-dark-border/60">
                                Roll: {child.rollNumber || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1 mt-3 pt-2 border-t border-dark-border/50 text-xs">
                          <div className="flex justify-between">
                            <span className="text-dark-muted">Class & Sec:</span>
                            <span className="font-bold text-dark-text">{child.class || 'N/A'} - {child.section || 'A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-muted">Monthly Fee:</span>
                            <span className="font-bold text-emerald-400">
                              Rs. {(Number(child.monthlyFee || child.tuitionFee) || 4500).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
            );
          })}
        </div>
      )}

      {/* Modals */}


      {/* Edit Family Profile Modal */}
      {editingFamily && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in no-print">
          <div className="bg-dark-card border border-dark-border max-w-md w-full rounded-3xl p-7 shadow-2xl relative text-dark-text">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-xl text-white">Edit Family Profile</h3>
                <p className="text-xs text-blue-400 font-bold mt-1">Updates will apply to {editingFamily.children.length} siblings</p>
              </div>
              <button 
                onClick={() => setEditingFamily(null)}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-dark-muted hover:text-white transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-dark-muted block mb-1">Father Name</label>
                <input
                  type="text"
                  value={editFamilyValues.fatherName}
                  onChange={e => setEditFamilyValues({...editFamilyValues, fatherName: e.target.value})}
                  placeholder="Enter Father Name"
                  className="w-full premium-input"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-dark-muted block mb-1">Father CNIC</label>
                <input
                  type="text"
                  value={editFamilyValues.fatherCnic}
                  onChange={e => setEditFamilyValues({...editFamilyValues, fatherCnic: e.target.value})}
                  placeholder="e.g. 00000-0000000-0"
                  className="w-full premium-input font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-dark-muted block mb-1">Phone / Mobile</label>
                <input
                  type="tel"
                  value={editFamilyValues.phone}
                  onChange={e => setEditFamilyValues({...editFamilyValues, phone: e.target.value})}
                  placeholder="e.g. 03001234567"
                  className="w-full premium-input font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setEditingFamily(null)} 
                className="flex-1 py-3 rounded-xl bg-dark-hover hover:bg-dark-border text-dark-muted font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveFamilyEdit} 
                disabled={isSavingFamily}
                className="flex-[2] py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {isSavingFamily ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : (
                  <>💾 Save to All Children</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in no-print">
          <div className="bg-dark-card border border-dark-border max-w-lg w-full rounded-2xl p-6 shadow-2xl relative text-dark-text">
            <h3 className="font-bold text-lg mb-2">Import Families via CSV</h3>
            <p className="text-xs text-dark-muted mb-4">Paste your CSV data below. Ensure headers include FatherName, FatherCNIC, Phone.</p>
            <textarea 
              rows="6"
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="FatherName,FatherCNIC,Phone,StudentName,Class..."
              className="w-full bg-dark-hover border border-dark-border rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500 mb-4 font-mono"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-xs font-bold text-dark-muted hover:text-white transition-colors">Cancel</button>
              <button onClick={handleImportCSV} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20">Process Import</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in no-print">
          <div className="bg-dark-card border border-dark-border max-w-lg w-full rounded-3xl p-7 shadow-2xl relative text-dark-text">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-xl text-white">Bulk Edit Families</h3>
                <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mt-1">
                  {selectedFamilies.length} Families Selected
                </p>
              </div>
              <button 
                onClick={() => { setIsBulkEditModalOpen(false); setBulkResult(null); }}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-dark-muted hover:text-white transition-all"
              >
                ✕
              </button>
            </div>

            {/* Success/Error Result Banner */}
            {bulkResult && (
              <div className={`mb-5 p-4 rounded-2xl border ${bulkResult.fail === 0 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                <p className="text-sm font-black">✅ Done: {bulkResult.success} updated, ❌ Failed: {bulkResult.fail}</p>
                <p className="text-xs mt-1 opacity-80">{bulkResult.msg}</p>
              </div>
            )}

            {/* Action Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {[
                { id: 'update_phone', label: '📞 Update Phone', color: 'blue' },
                { id: 'update_fee', label: '💰 Update Fee', color: 'emerald' },
                { id: 'whatsapp', label: '💬 WhatsApp Blast', color: 'green' },
                { id: 'delete', label: '🗑️ Bulk Remove', color: 'red' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setBulkActionType(opt.id); setBulkResult(null); }}
                  className={`px-3 py-3 rounded-xl text-xs font-bold text-left transition-all border ${
                    bulkActionType === opt.id
                      ? opt.color === 'red'
                        ? 'bg-red-500/20 border-red-500/60 text-red-400'
                        : opt.color === 'emerald'
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                        : opt.color === 'green'
                        ? 'bg-green-500/20 border-green-500/60 text-green-400'
                        : 'bg-blue-500/20 border-blue-500/60 text-blue-400'
                      : 'bg-dark-hover border-dark-border text-dark-muted hover:border-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Action-Specific Inputs */}
            <div className="mb-6">
              {bulkActionType === 'update_phone' && (
                <div className="space-y-3">
                  <p className="text-xs text-dark-muted">Enter the new parent phone number to apply to ALL students in the selected {selectedFamilies.length} famil{selectedFamilies.length === 1 ? 'y' : 'ies'}.</p>
                  <input
                    type="tel"
                    value={bulkEditValues.phone}
                    onChange={e => setBulkEditValues({...bulkEditValues, phone: e.target.value})}
                    placeholder="e.g. 03001234567"
                    className="w-full premium-input font-mono"
                  />
                </div>
              )}
              {bulkActionType === 'update_fee' && (
                <div className="space-y-3">
                  <p className="text-xs text-dark-muted">Enter the new monthly fee to apply to ALL children in the selected {selectedFamilies.length} famil{selectedFamilies.length === 1 ? 'y' : 'ies'}.</p>
                  <input
                    type="number"
                    value={bulkEditValues.fee}
                    onChange={e => setBulkEditValues({...bulkEditValues, fee: e.target.value})}
                    placeholder="e.g. 4500"
                    className="w-full premium-input font-mono"
                  />
                </div>
              )}
              {bulkActionType === 'whatsapp' && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400">
                  <p className="font-bold mb-1">📤 WhatsApp Blast</p>
                  <p>A family data update form link will be sent to all selected parents via WhatsApp. Requires active WhatsApp bot connection.</p>
                </div>
              )}
              {bulkActionType === 'delete' && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                  <p className="font-bold mb-1">⚠️ Danger Zone</p>
                  <p>This will permanently remove all students from the {selectedFamilies.length} selected famil{selectedFamilies.length === 1 ? 'y' : 'ies'} from the database. This action cannot be undone.</p>
                </div>
              )}
            </div>

            {/* Selected Families Preview */}
            <div className="mb-6 max-h-32 overflow-y-auto space-y-1.5">
              <p className="text-[10px] font-black text-dark-muted uppercase tracking-wider mb-2">Selected Families:</p>
              {selectedFamilies.map(key => {
                const fam = families.find(f => f.key === key);
                if (!fam) return null;
                return (
                  <div key={key} className="flex items-center justify-between px-3 py-2 rounded-xl bg-dark-hover border border-dark-border text-xs">
                    <span className="font-bold text-white">{fam.fatherName}</span>
                    <span className="text-dark-muted">{fam.children.length} child{fam.children.length > 1 ? 'ren' : ''} • {fam.phone}</span>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={() => { setIsBulkEditModalOpen(false); setBulkResult(null); }} 
                className="flex-1 py-3 rounded-xl bg-dark-hover hover:bg-dark-border text-dark-muted font-bold text-sm transition-all"
              >
                Close
              </button>
              <button 
                onClick={handleBulkEdit} 
                disabled={bulkProcessing}
                className={`flex-[2] py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                  bulkActionType === 'delete'
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
                    : bulkActionType === 'whatsapp'
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                }`}
              >
                {bulkProcessing ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                ) : (
                  bulkActionType === 'update_phone' ? '📞 Apply Phone to All'
                  : bulkActionType === 'update_fee' ? '💰 Apply Fee to All'
                  : bulkActionType === 'whatsapp' ? '💬 Send WhatsApp Blast'
                  : '🗑️ Confirm Remove'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Combined Family Fee Challan & Sibling Discount Modal */}
      {selectedFamilyForChallan && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in no-print">
          <div className="bg-dark-card border border-dark-border max-w-lg w-full rounded-2xl p-6 shadow-2xl relative text-dark-text">
            <div className="flex items-center justify-between pb-4 border-b border-dark-border mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-400">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Combined Family Fee Ledger</h3>
                  <p className="text-xs text-dark-muted">Parent: <span className="text-white font-bold">{selectedFamilyForChallan.fatherName}</span> ({selectedFamilyForChallan.phone})</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedFamilyForChallan(null)}
                className="text-dark-muted hover:text-white text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Sibling Fee Breakdown Table */}
            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-1">
              <p className="text-xs font-bold text-dark-muted uppercase tracking-wider">Sibling Fee Breakdown ({selectedFamilyForChallan.children.length} Children):</p>
              {selectedFamilyForChallan.children.map((c, i) => {
                const fee = Number(c.monthlyFee || c.tuitionFee) || 4500;
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-hover border border-dark-border text-xs">
                    <div>
                      <span className="font-bold text-white">{i + 1}. {c.name}</span>
                      <span className="text-dark-muted ml-2">({c.class} - Roll: {c.rollNumber || 'N/A'})</span>
                    </div>
                    <span className="font-bold text-emerald-400 font-mono">Rs. {fee.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>

            {/* Sibling Discount Control */}
            <div className="bg-dark-hover/70 border border-dark-border p-4 rounded-xl space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-dark-text flex items-center gap-1.5">
                  <Percent size={14} className="text-amber-400" />
                  Sibling Group Discount (%):
                </span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={siblingDiscountPercent}
                  onChange={(e) => setSiblingDiscountPercent(Number(e.target.value) || 0)}
                  className="w-20 px-2.5 py-1 rounded-lg bg-dark-card border border-dark-border text-xs font-mono font-bold text-center text-amber-300 outline-none"
                />
              </div>

              {(() => {
                const total = selectedFamilyForChallan.children.reduce((acc, c) => acc + (Number(c.monthlyFee || c.tuitionFee) || 4500), 0);
                const discount = selectedFamilyForChallan.children.length > 1 ? Math.round((total * siblingDiscountPercent) / 100) : 0;
                const net = total - discount;
                return (
                  <div className="pt-2 border-t border-dark-border/60 space-y-1 text-xs">
                    <div className="flex justify-between text-dark-muted">
                      <span>Gross Tuition Subtotal:</span>
                      <span className="font-mono">Rs. {total.toLocaleString()}</span>
                    </div>
                    {selectedFamilyForChallan.children.length > 1 && (
                      <div className="flex justify-between text-amber-400 font-semibold">
                        <span>Sibling Concession ({siblingDiscountPercent}%):</span>
                        <span className="font-mono">-Rs. {discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-white pt-1">
                      <span>NET PAYABLE FAMILY CHALLAN:</span>
                      <span className="text-emerald-400 font-mono">Rs. {net.toLocaleString()} /-</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedFamilyForChallan(null)}
                className="flex-1 py-2.5 rounded-xl bg-dark-hover hover:bg-dark-border text-dark-muted font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendCombinedChallan(selectedFamilyForChallan)}
                disabled={sendingWa}
                className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {sendingWa ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching via WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send Combined WhatsApp Challan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyTree;

