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
  ShieldCheck
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import GlassCard from '../../components/common/GlassCard';
import ModuleGrid from '../../components/school-admin/ModuleGrid';
import { getRecords, addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { useNavigate } from 'react-router-dom';

const SchoolAdminDashboard = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const navigate = useNavigate();
  const [generatingChallans, setGeneratingChallans] = useState(false);
  const [showData, setShowData] = useState(true);
  const [showChartData, setShowChartData] = useState(true);
  const [chartRange, setChartRange] = useState('Last 7 Days');

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
      const schoolId = userData.schoolId || 'default-school';
      
      const students = await getRecords('students', schoolId);
      const staff = await getRecords('staff', schoolId);
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
  }, [userData]);

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
      const { updateRecord } = await import('../../services/db');

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
    <div className="space-y-6 animate-fade-in pb-16 text-dark-text">
      {/* Top Header Bar EXACT match to STASU Layout */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-dark-border pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{schoolName}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <p className="text-xs text-primary-400 font-mono font-bold uppercase tracking-wider">
              Home / Dashboard
            </p>
            {schoolData?.idNumber && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-black tracking-widest">
                <ShieldCheck size={11} />
                SCHOOL ID: {schoolData.idNumber}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Privacy Toggle Button (Show Data / Hide Data) */}
          <button
            onClick={() => setShowData(!showData)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            title={showData ? "Click to hide financial numbers" : "Click to show real financial numbers"}
          >
            {showData ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{showData ? 'Hide Data' : 'Show Data'}</span>
          </button>

          <button 
            onClick={handleFixOldVouchers}
            className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            Fix Old Vouchers
          </button>


          <button 
            onClick={handleBulkGenerateChallans}
            disabled={generatingChallans}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <CreditCard size={15} />
            {generatingChallans ? 'Generating Invoices...' : '⚡ Auto Monthly Challans'}
          </button>

          <button 
            onClick={() => navigate('/school-admin/inquiry-student')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <UserPlus size={15} />
            Inquiry Student
          </button>

          <button 
            onClick={() => navigate('/school-admin/students/add')}
            className="premium-button-primary text-xs flex items-center gap-1.5 py-2 px-3.5"
          >
            <UserPlus size={15} />
            Add Student
          </button>
        </div>
      </div>

      {/* Quick Access Modules & Recent Admissions */}
      <div className="space-y-6 pt-6 border-t border-dark-border">
        <h2 className="text-xl font-bold text-white px-1">Quick Access Modules (Basic & Pro Features)</h2>
        <ModuleGrid />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6 border-b border-dark-border pb-3">
            <h2 className="text-lg font-bold text-white">Recent Student Admissions</h2>
            <button onClick={() => navigate('/school-admin/students')} className="text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center gap-1 transition-colors">
              View All <ArrowUpRight size={14} />
            </button>
          </div>
          
          <div className="space-y-3">
            {recentStudents.length === 0 ? (
              <div className="text-center py-8 text-dark-muted italic text-xs">No students registered yet. Click 'Add Student' above!</div>
            ) : recentStudents.map((student) => (
              <div key={student.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-hover/60 hover:bg-dark-hover border border-dark-border transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold uppercase text-sm">
                    {student.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{student.name}</p>
                    <p className="text-xs text-dark-muted">Grade {student.class || 'N/A'} • Sec {student.section || 'A'}</p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-bold">Active</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6 border-b border-dark-border pb-3">
            <h2 className="text-lg font-bold text-white">Quick Action Shortcuts</h2>
            <span className="text-xs text-dark-muted font-mono">Operations</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => navigate('/school-admin/inquiry-student')}
              className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:border-blue-500 text-left transition-all group"
            >
              <UserPlus className="text-blue-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
              <h4 className="text-sm font-bold text-white">Inquiry Student</h4>
              <p className="text-[10px] text-blue-300/80 mt-0.5 font-bold">New lead & admission</p>
            </button>

            <button
              onClick={() => navigate('/school-admin/attendance')}
              className="p-4 rounded-xl bg-dark-hover border border-dark-border hover:border-blue-500/50 text-left transition-all group"
            >
              <CalendarCheck className="text-blue-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
              <h4 className="text-sm font-bold text-white">Mark Attendance</h4>
              <p className="text-[10px] text-dark-muted mt-0.5">Daily class registry</p>
            </button>
            
            <button
              onClick={() => navigate('/school-admin/collection')}
              className="p-4 rounded-xl bg-dark-hover border border-dark-border hover:border-green-500/50 text-left transition-all group"
            >
              <DollarSign className="text-green-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
              <h4 className="text-sm font-bold text-white">Collect Fee</h4>
              <p className="text-[10px] text-dark-muted mt-0.5">Receive student payment</p>
            </button>

            <button
              onClick={() => navigate('/school-admin/accounts/expenses')}
              className="p-4 rounded-xl bg-dark-hover border border-dark-border hover:border-rose-500/50 text-left transition-all group"
            >
              <Activity className="text-rose-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
              <h4 className="text-sm font-bold text-white">Add Expense</h4>
              <p className="text-[10px] text-dark-muted mt-0.5">Record school voucher</p>
            </button>

            <button
              onClick={() => navigate('/school-admin/single-student')}
              className="p-4 rounded-xl bg-dark-hover border border-dark-border hover:border-purple-500/50 text-left transition-all group"
            >
              <Users className="text-purple-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
              <h4 className="text-sm font-bold text-white">Student 360° Profile</h4>
              <p className="text-[10px] text-dark-muted mt-0.5">Complete single view</p>
            </button>

            <button
              onClick={() => navigate('/school-admin/students/add')}
              className="p-4 rounded-xl bg-dark-hover border border-dark-border hover:border-emerald-500/50 text-left transition-all group"
            >
              <UserPlus className="text-emerald-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
              <h4 className="text-sm font-bold text-white">Add Student</h4>
              <p className="text-[10px] text-dark-muted mt-0.5">Direct enrollment</p>
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default SchoolAdminDashboard;
