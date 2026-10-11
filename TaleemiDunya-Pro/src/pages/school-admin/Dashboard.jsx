import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  CreditCard, 
  CalendarCheck,
  ArrowUpRight,
  UserPlus,
  UploadCloud,
  Eye,
  EyeOff,
  TrendingUp,
  DollarSign,
  Briefcase,
  Cake,
  Activity,
  BarChart2,
  ShieldCheck,
  PlusCircle,
  Clock,
  Settings,
  Database,
  CheckCircle2,
  X
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import GlassCard from '../../components/common/GlassCard';
import ModuleGrid from '../../components/school-admin/ModuleGrid';
import { getRecords, addRecord, updateRecord } from '../../services/db';
import { uploadToCloudinary } from '../../services/cloudinary';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { writeBatch, doc, collection } from 'firebase/firestore';

const SchoolAdminDashboard = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const navigate = useNavigate();
  const [generatingChallans, setGeneratingChallans] = useState(false);
  const [showData, setShowData] = useState(true);
  const [showChartData, setShowChartData] = useState(true);
  const [chartRange, setChartRange] = useState('Last 7 Days');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [setupForm, setSetupForm] = useState({
    name: schoolData?.name || '',
    phone: schoolData?.phone || '',
    address: schoolData?.address || ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [isSavingSetup, setIsSavingSetup] = useState(false);

  useEffect(() => {
    if (schoolData) {
      setSetupForm({
        name: schoolData.name || '',
        phone: schoolData.phone || '',
        address: schoolData.address || ''
      });
      const isDismissed = localStorage.getItem(`onboarding_dismissed_${schoolData.id}`);
      if (schoolData.id && schoolData.onboardingCompleted !== true && !isDismissed) {
        setShowOnboarding(true);
      }
    }
  }, [schoolData]);

  const parseAndUploadCSV = async (file, schoolId) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target.result;
          const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
          if (lines.length < 2) return resolve(0);
          
          const headers = lines[0].split(',').map(h => h.trim());
          const rows = [];
          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(',').map(v => v.trim());
            const rowObj = {};
            headers.forEach((h, idx) => { rowObj[h] = vals[idx] || ''; });
            if (rowObj[headers[0]]) rows.push(rowObj);
          }

          const batch = writeBatch(db);
          rows.forEach((row) => {
            const docId = doc(collection(db, 'students')).id;
            const docRef = doc(db, 'students', docId);
            batch.set(docRef, {
              ...row,
              schoolId,
              createdAt: new Date(),
              importedVia: 'SetupWizard'
            });
          });
          await batch.commit();
          resolve(rows.length);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleFinishOnboarding = async () => {
    if (!setupForm.name.trim()) {
      alert("School Name is required!");
      return;
    }
    
    setIsSavingSetup(true);
    try {
      const schoolId = userData?.schoolId || schoolData?.id;
      if (!schoolId) throw new Error("School ID not found");

      let logoUrl = schoolData?.logo || '';
      if (logoFile) {
        const uploadRes = await uploadToCloudinary(logoFile, {
          folder: `taleemidunya/${schoolId}/logos`,
          publicId: `logo_${schoolId}_${Date.now()}`
        });
        if (uploadRes && uploadRes.success) {
          logoUrl = uploadRes.url;
        }
      }

      let studentsImported = 0;
      if (csvFile) {
        studentsImported = await parseAndUploadCSV(csvFile, schoolId);
      }

      await updateRecord('schools', schoolId, { 
        name: setupForm.name,
        phone: setupForm.phone,
        address: setupForm.address,
        logo: logoUrl,
        onboardingCompleted: true 
      });

      if (studentsImported > 0) {
        alert(`Setup completed successfully! ${studentsImported} students imported.`);
      } else {
        alert("Setup completed successfully!");
      }

      setShowOnboarding(false);
      window.location.reload(); // Refresh to apply new data
    } catch (error) {
      console.error("Error updating onboarding status:", error);
      alert("An error occurred during setup: " + error.message);
    } finally {
      setIsSavingSetup(false);
    }
  };

  // Real data state with realistic fallbacks
  const [realStats, setRealStats] = useState({
    classesCount: 14,
    studentsCount: 245,
    activeStudents: 237,
    revenueToday: 18500,
    staffCount: 34,
    netProfit: 185000,
    totalExpenses: 65000,
    monthlyRevenue: 250000,
    totalCollection: 320000,
    activeExpected: 350000,
    deactiveExpected: 30000
  });

  const [recentStudents, setRecentStudents] = useState([]);
  const [birthdaysList, setBirthdaysList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealData = async () => {
      if (!userData) return;
      const schoolId = userData.schoolId || 'default_school';
      // Fetch actual data instead of trying to hack the expiry date client-side
      const students = await getRecords('students', schoolId);
      const staff = await getRecords('staff', schoolId);
      
      // ONE-TIME SCRIPT TO FIX CAPITALIZATION, CNIC, and PHONE
      if (!localStorage.getItem('fixed_names_caps_cnic_phone_5')) {
        const toTitleCase = (str) => {
          if (!str) return '';
          return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        };
        const formatCNIC = (val) => {
          if (!val) return '';
          let digits = val.replace(/\D/g, '');
          if (!digits) return '';
          if (digits.length > 13) digits = digits.substring(0, 13);
          let formatted = digits;
          if (digits.length > 5 && digits.length <= 12) {
              formatted = digits.replace(/(\d{5})(\d+)/, '$1-$2');
          } else if (digits.length > 12) {
              formatted = digits.replace(/(\d{5})(\d{7})(\d+)/, '$1-$2-$3');
          }
          return formatted;
        };
        const formatPhone = (val) => {
          if (!val) return '';
          let digits = val.replace(/\D/g, '');
          if (!digits) return '';
          if (digits.length > 11) digits = digits.substring(0, 11);
          return digits;
        };

        try {
          for (const s of students) {
            const newName = toTitleCase(s.name);
            const newFName = toTitleCase(s.fatherName);
            const updates = {};
            
            if (s.name !== newName) updates.name = newName;
            if (s.fatherName !== newFName) updates.fatherName = newFName;
            
            const oldFatherCnic = s.fatherCnic;
            if (oldFatherCnic !== undefined) {
                const newFatherCnic = formatCNIC(oldFatherCnic);
                if (oldFatherCnic !== newFatherCnic && (oldFatherCnic || newFatherCnic)) updates.fatherCnic = newFatherCnic;
            }

            const oldCnic = s.cnic;
            if (oldCnic !== undefined) {
                const newCnic = formatCNIC(oldCnic);
                if (oldCnic !== newCnic && (oldCnic || newCnic)) updates.cnic = newCnic;
            }

            const oldPhone = s.phone;
            if (oldPhone !== undefined) {
                const newPhone = formatPhone(oldPhone);
                if (oldPhone !== newPhone && (oldPhone || newPhone)) updates.phone = newPhone;
            }
            
            const oldContact = s.contact;
            if (oldContact !== undefined) {
                const newContact = formatPhone(oldContact);
                if (oldContact !== newContact && (oldContact || newContact)) updates.contact = newContact;
            }
            
            if (Object.keys(updates).length > 0) {
              await updateRecord('students', s.id, { ...updates, schoolId });
            }
          }
          for (const st of staff) {
            const newName = toTitleCase(st.name);
            const updates = {};
            if (st.name !== newName) updates.name = newName;

            const oldCnic = st.cnic;
            if (oldCnic !== undefined) {
                const newCnic = formatCNIC(oldCnic);
                if (oldCnic !== newCnic && (oldCnic || newCnic)) updates.cnic = newCnic;
            }

            const oldPhone = st.phone;
            if (oldPhone !== undefined) {
               const newPhone = formatPhone(oldPhone);
               if (oldPhone !== newPhone && (oldPhone || newPhone)) updates.phone = newPhone;
            }

            const oldContact = st.contact;
            if (oldContact !== undefined) {
               const newContact = formatPhone(oldContact);
               if (oldContact !== newContact && (oldContact || newContact)) updates.contact = newContact;
            }
            
            if (Object.keys(updates).length > 0) {
              await updateRecord('staff', st.id, { ...updates, schoolId });
            }
          }
          localStorage.setItem('fixed_names_caps_cnic_phone_5', 'true');
        } catch (e) {
          console.error('Error fixing caps:', e);
        }
      }

      const classes = await getRecords('classes', schoolId);
      const challans = await getRecords('vouchers', schoolId);
      const expenses = await getRecords('expenses', schoolId);
      const otherIncome = await getRecords('other_income', schoolId);

      const isDemo = userData.email === 'demo_admin@taleemidunya.com';

      const stuCount = students.length > 0 ? students.length : (isDemo ? 245 : 0);
      const staffCount = staff.length > 0 ? staff.length : (isDemo ? 34 : 0);
      const classCount = classes.length > 0 ? classes.length : (localStorage.getItem('classes_list') ? JSON.parse(localStorage.getItem('classes_list')).length : (isDemo ? 14 : 0));

      // Financials
      const challansCollected = challans.filter(c => c.status === 'Paid').reduce((s, c) => s + (Number(c.totalAmount) || 0), 0);
      const challansExpected = challans.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0);
      const expTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const otherTotal = otherIncome.reduce((s, o) => s + (Number(o.amount) || 0), 0);

      const todayRev = challansCollected > 0 ? Math.round(challansCollected * 0.1) : (isDemo ? 18500 : 0);
      const monthRev = (challansCollected + otherTotal) > 0 ? (challansCollected + otherTotal) : (isDemo ? 250000 : 0);
      const totalExp = expTotal > 0 ? expTotal : (isDemo ? 65000 : 0);
      const profit = monthRev - totalExp > 0 ? monthRev - totalExp : (isDemo ? 185000 : 0);
      const collection = challansCollected > 0 ? challansCollected : (isDemo ? 320000 : 0);
      const expected = challansExpected > 0 ? challansExpected : (isDemo ? 350000 : 0);

      // Check birthdays
      const todayMonthDay = new Date().toISOString().slice(5, 10);
      const bdays = students.filter(s => s.dob && s.dob.slice(5, 10) === todayMonthDay);

      setRealStats({
        classesCount: classCount,
        studentsCount: stuCount,
        activeStudents: Math.max(1, Math.floor(stuCount * 0.97)),
        revenueToday: todayRev,
        staffCount: staffCount,
        netProfit: profit,
        totalExpenses: totalExp,
        monthlyRevenue: monthRev,
        totalCollection: collection,
        activeExpected: expected,
        deactiveExpected: Math.max(0, expected - collection)
      });

      setRecentStudents(students.slice(0, 4));
      setBirthdaysList(bdays);
      setLoading(false);
    };
    fetchRealData();
  }, [userData, schoolData]);

  const handleBulkGenerateChallans = async () => {
    if (!window.confirm("🚀 Generate automated monthly fee challans for ALL students right now?")) return;
    setGeneratingChallans(true);
    const schoolId = userData?.schoolId || 'default_school';
    const monthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    try {
      const res = await fetch('https://umarhayat.alwaysdata.net/api/billing/generate-monthly-challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          monthYear,
          dueDate: '10th of this month',
          sendWhatsappAlerts: true
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ SUCCESS! ${data.message}\nTotal Challans Created: ${data.invoicesCreated}\nWhatsApp Alerts Sent: ${data.whatsappAlertsSent}`);
        setGeneratingChallans(false);
        return;
      }
    } catch (e) {
      console.warn("Cloud generator fallback activated due to:", e.message);
    }

    try {
      const students = await getRecords('students', schoolId);
      if (!students || students.length === 0) {
        alert('ℹ️ No active students found in Grade/Class list to generate challans.');
        setGeneratingChallans(false);
        return;
      }
      let createdCount = 0;
      for (const student of students) {
        await addRecord('vouchers', {
          schoolId,
          studentId: student.id || student.rollNumber || 'stu-' + Math.random(),
          studentName: student.name || 'Student',
          rollNumber: student.rollNumber || 'N/A',
          class: student.class || 'N/A',
          parentPhone: student.parentPhone || student.phone || 'N/A',
          monthYear,
          totalAmount: Number(student.monthlyFee || student.fee || 3500),
          status: 'Pending',
          dueDate: `${monthYear} 10th`,
          createdAt: new Date().toISOString()
        });
        createdCount++;
      }
      alert(`✅ SUCCESS! Monthly Fee Challans for (${monthYear}) generated successfully via Client Engine!\n\nTotal Challans Created: ${createdCount} Students\nStatus: Pending Due Collection`);
    } catch (fallbackErr) {
      alert(`❌ Error generating challans: ${fallbackErr.message}`);
    } finally {
      setGeneratingChallans(false);
    }
  };

  const handleFixOldVouchers = async () => {
    if (!window.confirm("This will fix duplicate 'Previous Arrears' in old family vouchers. Proceed?")) return;
    try {
      const schoolId = userData?.schoolId || 'default-school';
      const allVouchers = await getRecords('vouchers', schoolId);
      let fixedCount = 0;

      for (const v of allVouchers) {
        if (!v.feeItems || !Array.isArray(v.feeItems)) continue;
        const arrearsItems = v.feeItems.filter(item => item.name && (item.name.startsWith('Previous Arrears - ') || item.name.startsWith('Arrears - ')));
        
        if (arrearsItems.length > 1) {
          const trueArrears = Number(arrearsItems[0].amount) || 0;
          const newFeeItems = v.feeItems.filter(item => !(item.name && (item.name.startsWith('Previous Arrears - ') || item.name.startsWith('Arrears - '))));
          if (trueArrears > 0) newFeeItems.push({ name: 'Total Previous Arrears', amount: trueArrears });
          const newTotal = newFeeItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
          
          await updateRecord('vouchers', v.id, { feeItems: newFeeItems, totalAmount: newTotal }, schoolId);
          fixedCount++;
        } else if (arrearsItems.length === 1) {
          const newFeeItems = v.feeItems.map(item => {
            if (item.name && (item.name.startsWith('Previous Arrears - ') || item.name.startsWith('Arrears - '))) {
               return { ...item, name: 'Total Previous Arrears' };
            }
            return item;
          });
          await updateRecord('vouchers', v.id, { feeItems: newFeeItems }, schoolId);
          fixedCount++;
        }
      }
      alert(`✅ Successfully fixed ${fixedCount} vouchers!`);
    } catch (e) {
      console.error(e);
      alert('Error fixing vouchers: ' + e.message);
    }
  };


  const schoolName = userData?.schoolName || schoolData?.name || userData?.name || userData?.displayName || 'TaleemiDunya Pro School System';

  return (
    <div className="space-y-6 animate-fade-in pb-16 text-dark-text relative">
      
      {showOnboarding && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-fade-in relative my-8">
            <button onClick={() => {
              setShowOnboarding(false);
              if (schoolData?.id) {
                localStorage.setItem(`onboarding_dismissed_${schoolData.id}`, 'true');
              }
            }} className="absolute top-4 right-4 text-dark-muted hover:text-white transition-colors">
              <X size={24} />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-500/30">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-black text-dark-text tracking-tight">Welcome to TaleemiDunya!</h2>
              <p className="text-dark-muted text-sm mt-1">Let's set up your school profile and data directly here.</p>
            </div>

            <div className="space-y-5">
              {/* School Profile Section */}
              <div className="bg-dark-hover border border-dark-border rounded-xl p-5">
                <h3 className="text-dark-text font-bold text-base mb-4 flex items-center gap-2">
                  <Settings size={18} className="text-purple-400"/> 1. School Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-dark-muted uppercase tracking-widest mb-1.5">School Name *</label>
                    <input 
                      type="text" 
                      className="w-full premium-input bg-dark-bg text-dark-text" 
                      value={setupForm.name} 
                      onChange={e => setSetupForm({...setupForm, name: e.target.value})}
                      placeholder="e.g. Smart Angels School" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-dark-muted uppercase tracking-widest mb-1.5">Phone Number</label>
                    <input 
                      type="text" 
                      className="w-full premium-input bg-dark-bg text-dark-text" 
                      value={setupForm.phone} 
                      onChange={e => setSetupForm({...setupForm, phone: e.target.value})}
                      placeholder="0300-1234567" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-dark-muted uppercase tracking-widest mb-1.5">Address</label>
                    <input 
                      type="text" 
                      className="w-full premium-input bg-dark-bg text-dark-text" 
                      value={setupForm.address} 
                      onChange={e => setSetupForm({...setupForm, address: e.target.value})}
                      placeholder="Main Street, City" 
                    />
                  </div>
                </div>
              </div>

              {/* Logo Section */}
              <div className="bg-dark-hover border border-dark-border rounded-xl p-5">
                <h3 className="text-dark-text font-bold text-base mb-4 flex items-center gap-2">
                  <Eye size={18} className="text-pink-400"/> 2. School Logo (Optional)
                </h3>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setLogoFile(e.target.files[0])}
                  className="w-full text-sm text-slate-600 dark:text-dark-muted file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer border border-slate-200 dark:border-dark-border rounded-xl"
                />
                {logoFile && <p className="text-xs text-green-400 mt-2">Logo selected: {logoFile.name}</p>}
              </div>

              {/* CSV Import Section */}
              <div className="bg-dark-hover border border-dark-border rounded-xl p-5">
                <h3 className="text-dark-text font-bold text-base mb-2 flex items-center gap-2">
                  <Database size={18} className="text-emerald-400"/> 3. Import Students CSV (Optional)
                </h3>
                <p className="text-xs text-dark-muted mb-4">Upload a CSV file with columns: <span className="font-mono text-dark-text font-bold">rollNumber, name, class, section, phone</span></p>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={e => setCsvFile(e.target.files[0])}
                  className="w-full text-sm text-slate-600 dark:text-dark-muted file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 transition-all cursor-pointer border border-slate-200 dark:border-dark-border rounded-xl"
                />
                {csvFile && <p className="text-xs text-green-400 mt-2">CSV selected: {csvFile.name}</p>}
              </div>
            </div>

            <div className="mt-8 text-center pt-4 border-t border-dark-border">
              <button 
                onClick={handleFinishOnboarding}
                disabled={isSavingSetup}
                className="px-8 py-3 w-full sm:w-auto rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 mx-auto transition-colors"
              >
                {isSavingSetup ? (
                  <>Saving & Importing...</>
                ) : (
                  <><CheckCircle2 size={20} /> Save & Finish Setup</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar EXACT match to STASU Layout */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-4 bg-dark-card px-5 py-3 rounded-2xl shadow-sm ">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 bg-dark-card">
            {(schoolData?.branding?.logo || schoolData?.logo || userData?.schoolLogo) ? (
              <img src={schoolData?.branding?.logo || schoolData?.logo || userData?.schoolLogo} alt="School Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                <span className="text-3xl">🏫</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-dark-text tracking-tight leading-tight">{schoolName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-100">
                <ShieldCheck size={14} />
                Session: {schoolData?.session || schoolData?.academicYear || '2025 - 2026'}
              </span>
              
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-sm uppercase ${
                  (schoolData?.expiryDate && new Date(schoolData.expiryDate).getTime() - Date.now() <= 0) 
                  ? 'bg-red-600 text-white border border-red-700' 
                  : 'bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 dark:border-slate-600'
              }`}>
                <Clock size={13} className="text-slate-300" />
                <span>
                  {(() => {
                    if (!schoolData?.expiryDate) return 'NO EXPIRY SET';
                    const diff = new Date(schoolData.expiryDate).getTime() - Date.now();
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    return days <= 0 ? 'SUBSCRIPTION OVERDUE' : `${days} DAYS REMAINING`;
                  })()}
                </span>
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/school-admin/classes')}
            className="px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <PlusCircle size={15} />
            Add Section
          </button>

          <button 
            onClick={() => navigate('/school-admin/classes')}
            className="px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <PlusCircle size={15} />
            Add Class
          </button>

          <button 
            onClick={() => navigate('/school-admin/students')}
            className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Users size={15} />
            Bulk Promotion
          </button>

          <button 
            onClick={() => navigate('/school-admin/fees')}
            className="px-4 py-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <CreditCard size={15} />
            Monthly Challan
          </button>

          <button 
            onClick={() => navigate('/school-admin/students/add')}
            className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <UserPlus size={15} />
            Add Student
          </button>
        </div>
      </div>

      {/* Quick Access Modules & Recent Admissions */}
      <div className="space-y-6 pt-6 border-t border-dark-border">
        <h2 className="text-xl font-bold text-dark-text px-1">Quick Access Modules (Basic & Pro Features)</h2>
        <ModuleGrid />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6 border-b border-dark-border pb-3">
            <h2 className="text-lg font-bold text-dark-text">Recent Student Admissions</h2>
            <button onClick={() => navigate('/school-admin/students')} className="text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center gap-1 transition-colors">
              View All <ArrowUpRight size={14} />
            </button>
          </div>
          
          <div className="space-y-3">
            {recentStudents.length === 0 ? (
              <div className="text-center py-8 text-dark-muted italic text-xs">No students registered yet. Click 'Add Student' above!</div>
            ) : recentStudents.map((student) => (
              <div key={student.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-hover/60 hover:bg-dark-hover  transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold uppercase text-sm">
                    {student.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <p className="font-bold text-dark-text text-sm">{student.name}</p>
                    <p className="text-xs text-dark-muted">Grade {student.class || 'N/A'} • Sec {student.section || 'A'}</p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 font-bold">Active</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6 border-b border-dark-border pb-3">
            <h2 className="text-lg font-bold text-dark-text">Quick Action Shortcuts</h2>
            <span className="text-xs text-dark-muted font-mono">Operations</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => navigate('/school-admin/inquiry-student')}
              className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:border-blue-500 text-left transition-all group"
            >
              <UserPlus className="text-blue-500 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
              <h4 className="text-sm font-bold text-dark-text">Inquiry Student</h4>
              <p className="text-[10px] text-blue-600 dark:text-blue-300 mt-0.5 font-bold">New lead & admission</p>
            </button>

            <button
              onClick={() => navigate('/school-admin/attendance')}
              className="p-4 rounded-xl bg-dark-hover hover:border-blue-500/50 text-left transition-all group"
            >
              <CalendarCheck className="text-blue-500 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
              <h4 className="text-sm font-bold text-dark-text">Mark Attendance</h4>
              <p className="text-[10px] text-dark-muted mt-0.5">Daily class registry</p>
            </button>
            
            <button
              onClick={() => navigate('/school-admin/collection')}
              className="p-4 rounded-xl bg-dark-hover hover:border-green-500/50 text-left transition-all group"
            >
              <DollarSign className="text-green-500 dark:text-green-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
              <h4 className="text-sm font-bold text-dark-text">Collect Fee</h4>
              <p className="text-[10px] text-dark-muted mt-0.5">Receive student payment</p>
            </button>

            <button
              onClick={() => navigate('/school-admin/accounts/expenses')}
              className="p-4 rounded-xl bg-dark-hover hover:border-rose-500/50 text-left transition-all group"
            >
              <Activity className="text-rose-500 dark:text-rose-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
              <h4 className="text-sm font-bold text-dark-text">Add Expense</h4>
              <p className="text-[10px] text-dark-muted mt-0.5">Record school voucher</p>
            </button>

            <button
              onClick={() => navigate('/school-admin/single-student')}
              className="p-4 rounded-xl bg-dark-hover hover:border-purple-500/50 text-left transition-all group"
            >
              <Users className="text-purple-500 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
              <h4 className="text-sm font-bold text-dark-text">Student 360° Profile</h4>
              <p className="text-[10px] text-dark-muted mt-0.5">Complete single view</p>
            </button>

            <button
              onClick={() => navigate('/school-admin/students/add')}
              className="p-4 rounded-xl bg-dark-hover hover:border-emerald-500/50 text-left transition-all group"
            >
              <UserPlus className="text-emerald-500 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
              <h4 className="text-sm font-bold text-dark-text">Add Student</h4>
              <p className="text-[10px] text-dark-muted mt-0.5">Direct enrollment</p>
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default SchoolAdminDashboard;
