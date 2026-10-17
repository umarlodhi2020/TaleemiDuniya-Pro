import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Save, 
  AlertCircle, 
  Search, 
  UserSquare2, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  Building2, 
  CreditCard, 
  Clock, 
  Percent, 
  ArrowLeft, 
  CheckCircle2, 
  FileText, 
  Printer, 
  Download, 
  Layers,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRecords, updateRecord } from '../../services/db';
import { useNavigate } from 'react-router-dom';
import StaffTimeSlipModal from '../../components/common/StaffTimeSlipModal';
import PayslipModal from '../../components/common/PayslipModal';
import { calculateMonthlyPayroll } from '../../utils/payrollUtils';

export default function SalarySetup() {
  const { userData, showToast } = useAuth();
  const navigate = useNavigate();

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [activeTab, setActiveTab] = useState('earnings'); // 'earnings' | 'deductions' | 'bank'
  const [saving, setSaving] = useState(false);

  // Time Slip Modal State
  const [timeSlipStaff, setTimeSlipStaff] = useState(null);
  const [previewPayslipData, setPreviewPayslipData] = useState(null);

  // Advanced Form Structure
  const [formData, setFormData] = useState({
    basicSalary: 0,
    houseRentAllowance: 0,
    medicalAllowance: 0,
    transportAllowance: 0,
    utilityAllowance: 0,
    specialAllowance: 0,
    overtimeRatePerHour: 0,
    
    // Deductions
    providentFund: 0,
    incomeTax: 0,
    latePenaltyRule: 'per_day_100', // 'none' | 'per_day_50' | 'per_day_100' | 'three_lates_half_day'
    latePenaltyFixedAmount: 100,
    absentDeductionRule: 'auto_daily', // 'auto_daily' | 'fixed_amount'
    absentDailyFixedAmount: 0,
    otherDeductions: 0,
    workingDays: 26,

    // Payment Info
    paymentMode: 'Bank Transfer', // 'Bank Transfer' | 'Cash' | 'Cheque' | 'JazzCash' | 'EasyPaisa'
    bankName: '',
    accountTitle: '',
    accountNumber: ''
  });

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
      showToast?.('error', 'Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStaff = (staff) => {
    setSelectedStaff(staff);
    const p = staff.payrollSetup || {};
    setFormData({
      basicSalary: p.basicSalary || staff.salary || 0,
      houseRentAllowance: p.houseRentAllowance || 0,
      medicalAllowance: p.medicalAllowance || 0,
      transportAllowance: p.transportAllowance || 0,
      utilityAllowance: p.utilityAllowance || 0,
      specialAllowance: p.specialAllowance || 0,
      overtimeRatePerHour: p.overtimeRatePerHour || 0,
      
      providentFund: p.providentFund || 0,
      incomeTax: p.incomeTax || 0,
      latePenaltyRule: p.latePenaltyRule || 'per_day_100',
      latePenaltyFixedAmount: p.latePenaltyFixedAmount ?? 100,
      absentDeductionRule: p.absentDeductionRule || 'auto_daily',
      absentDailyFixedAmount: p.absentDailyFixedAmount || 0,
      otherDeductions: p.otherDeductions || 0,
      workingDays: p.workingDays || 26,

      paymentMode: p.paymentMode || staff.paymentMethod || 'Bank Transfer',
      bankName: p.bankName || staff.bankName || '',
      accountTitle: p.accountTitle || staff.accountTitle || staff.name || '',
      accountNumber: p.accountNumber || staff.accountNumber || ''
    });
  };

  // Real-time Computation
  const calculated = useMemo(() => {
    const basic = Number(formData.basicSalary) || 0;
    const allowances = (
      (Number(formData.houseRentAllowance) || 0) +
      (Number(formData.medicalAllowance) || 0) +
      (Number(formData.transportAllowance) || 0) +
      (Number(formData.utilityAllowance) || 0) +
      (Number(formData.specialAllowance) || 0)
    );
    const grossSalary = basic + allowances;

    const fixedDeductions = (
      (Number(formData.providentFund) || 0) +
      (Number(formData.incomeTax) || 0) +
      (Number(formData.otherDeductions) || 0)
    );

    const netSalary = Math.max(0, grossSalary - fixedDeductions);
    const workingDays = Math.max(1, Number(formData.workingDays) || 26);
    const dailyRate = Math.round(basic / workingDays);

    return {
      basic,
      allowances,
      grossSalary,
      fixedDeductions,
      netSalary,
      dailyRate
    };
  }, [formData]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    
    setSaving(true);
    try {
      const updatedPayrollSetup = {
        ...formData,
        basicSalary: Number(formData.basicSalary) || 0,
        houseRentAllowance: Number(formData.houseRentAllowance) || 0,
        medicalAllowance: Number(formData.medicalAllowance) || 0,
        transportAllowance: Number(formData.transportAllowance) || 0,
        utilityAllowance: Number(formData.utilityAllowance) || 0,
        specialAllowance: Number(formData.specialAllowance) || 0,
        overtimeRatePerHour: Number(formData.overtimeRatePerHour) || 0,
        providentFund: Number(formData.providentFund) || 0,
        incomeTax: Number(formData.incomeTax) || 0,
        otherDeductions: Number(formData.otherDeductions) || 0,
        workingDays: Number(formData.workingDays) || 26,
        grossSalary: calculated.grossSalary,
        netSalary: calculated.netSalary,
        updatedAt: new Date().toISOString()
      };
      
      await updateRecord('staff', selectedStaff.id, {
        payrollSetup: updatedPayrollSetup,
        salary: Number(formData.basicSalary) || 0
      });
      
      setStaffList(prev => prev.map(s => s.id === selectedStaff.id ? { ...s, payrollSetup: updatedPayrollSetup, salary: updatedPayrollSetup.basicSalary } : s));
      showToast?.('success', `Salary setup updated successfully for ${selectedStaff.name}`);
    } catch (error) {
      console.error('Error saving salary setup:', error);
      showToast?.('error', 'Failed to save salary configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Filter staff
  const departments = useMemo(() => {
    const set = new Set();
    staffList.forEach(s => { if (s.department) set.add(s.department); });
    return ['All', ...Array.from(set).sort()];
  }, [staffList]);

  const filteredStaff = staffList.filter(s => {
    const matchesDept = departmentFilter === 'All' || s.department === departmentFilter;
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q || 
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.employeeId || s.id || '').toLowerCase().includes(q) ||
      String(s.role || s.designation || '').toLowerCase().includes(q);
    return matchesDept && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/school-admin/staff')}
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all shadow-sm"
              title="Back to Staff"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Staff Salary Setup & Architecture</h1>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  تنخواہ اسٹرکچر
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Configure basic pay, house rent, medical, late arrival penalty deductions, and bank accounts for school staff.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Route Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/school-admin/staff-attendance')}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Clock size={15} className="text-indigo-600" />
            <span>Staff Attendance</span>
          </button>
          <button
            onClick={() => navigate('/school-admin/accounts/payroll')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Calculator size={15} />
            <span>Process Monthly Payroll</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Staff Directory & Selection (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input 
                type="text" 
                placeholder="Search staff by name, role, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl px-3 py-2.5 outline-none shadow-sm"
            >
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Staff List Cards */}
          <div className="bg-white border border-slate-200 rounded-3xl p-3 shadow-sm max-h-[620px] overflow-y-auto space-y-2">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs font-bold">Loading staff members...</div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-bold">No staff members found.</div>
            ) : (
              filteredStaff.map((staff) => {
                const isSelected = selectedStaff?.id === staff.id;
                const p = staff.payrollSetup || {};
                const hasConfig = !!p.basicSalary;
                return (
                  <div 
                    key={staff.id} 
                    onClick={() => handleSelectStaff(staff)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-indigo-50/80 border-indigo-400 shadow-sm' 
                        : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center shrink-0 overflow-hidden border border-slate-300">
                        {staff.photoUrl ? (
                          <img src={staff.photoUrl} alt={staff.name} className="w-full h-full object-cover" />
                        ) : (
                          (staff.name || 'S')[0].toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{staff.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{staff.designation || staff.role || 'Staff'} • {staff.department || 'General'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {hasConfig ? (
                            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                              Rs {Number(p.basicSalary).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.2 rounded-full border border-amber-200">
                              Salary Not Set
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Action: Time Slip modal trigger */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTimeSlipStaff(staff);
                      }}
                      className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 transition-all shrink-0"
                      title="View Staff Punch Time Slip (In / Out Log)"
                    >
                      <Clock size={15} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right Side: Advanced Salary Configuration & Live Simulator (7 Columns) */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-6 space-y-6">
            
            {!selectedStaff ? (
              <div className="text-center py-20 text-slate-400 flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <UserSquare2 size={32} />
                </div>
                <h3 className="text-base font-black text-slate-700">Select a Staff Member</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Select a staff member from the left list to configure their basic salary, allowances, and attendance deduction rules.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                
                {/* Selected Staff Header Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md">
                      {(selectedStaff.name || 'S')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{selectedStaff.name}</p>
                      <p className="text-xs text-slate-500">{selectedStaff.designation || selectedStaff.role} • ID: {selectedStaff.employeeId || selectedStaff.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTimeSlipStaff(selectedStaff)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Clock size={13} className="text-indigo-600" />
                      <span>Time Slip</span>
                    </button>
                  </div>
                </div>

                {/* LIVE COMPENSATION SIMULATOR WIDGET */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-emerald-50/70 rounded-2xl border border-indigo-100">
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gross Salary</span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      Rs {calculated.grossSalary.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-center border-x border-slate-200">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">Fixed Deductions</span>
                    <span className="text-base font-black text-red-600 font-mono">
                      - Rs {calculated.fixedDeductions.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Net Take-Home</span>
                    <span className="text-base font-black text-emerald-700 font-mono">
                      Rs {calculated.netSalary.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-medium">({calculated.dailyRate} Rs / day)</span>
                  </div>
                </div>

                {/* TAB NAVIGATION: Earnings | Deductions | Payment */}
                <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('earnings')}
                    className={`flex-1 py-2 rounded-xl transition-all ${activeTab === 'earnings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    💵 Earnings & Allowances
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('deductions')}
                    className={`flex-1 py-2 rounded-xl transition-all ${activeTab === 'deductions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    ✂️ Deductions & Late Rules
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bank')}
                    className={`flex-1 py-2 rounded-xl transition-all ${activeTab === 'bank' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    🏦 Bank & Payment Mode
                  </button>
                </div>

                {/* TAB 1: EARNINGS & ALLOWANCES */}
                {activeTab === 'earnings' && (
                  <div className="space-y-4 text-xs">
                    
                    {/* Basic Salary */}
                    <div>
                      <label className="font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                        Basic Salary / ماہانہ بنیادی تنخواہ (PKR) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rs</span>
                        <input 
                          type="number"
                          required
                          min="0"
                          value={formData.basicSalary}
                          onChange={e => setFormData({ ...formData, basicSalary: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl pl-12 pr-4 py-3 font-mono font-bold text-sm focus:border-indigo-500 focus:bg-white outline-none"
                          placeholder="e.g. 35000"
                        />
                      </div>
                    </div>

                    {/* Standard Allowances 2-Column Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">House Rent Allowance (HRA)</label>
                        <input 
                          type="number" min="0"
                          value={formData.houseRentAllowance}
                          onChange={e => setFormData({ ...formData, houseRentAllowance: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 font-mono text-xs font-bold outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Medical Allowance</label>
                        <input 
                          type="number" min="0"
                          value={formData.medicalAllowance}
                          onChange={e => setFormData({ ...formData, medicalAllowance: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 font-mono text-xs font-bold outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Transport / Conveyance</label>
                        <input 
                          type="number" min="0"
                          value={formData.transportAllowance}
                          onChange={e => setFormData({ ...formData, transportAllowance: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 font-mono text-xs font-bold outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Special / Responsibility</label>
                        <input 
                          type="number" min="0"
                          value={formData.specialAllowance}
                          onChange={e => setFormData({ ...formData, specialAllowance: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 font-mono text-xs font-bold outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Working Days per Month */}
                    <div className="pt-2">
                      <label className="font-bold text-slate-600 block mb-1">Standard Working Days (per Month)</label>
                      <input 
                        type="number" min="20" max="31"
                        value={formData.workingDays}
                        onChange={e => setFormData({ ...formData, workingDays: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 font-mono text-xs font-bold outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Used to compute daily attendance salary rates (Basic / Working Days).</p>
                    </div>

                  </div>
                )}

                {/* TAB 2: DEDUCTIONS & LATE PENALTY RULES */}
                {activeTab === 'deductions' && (
                  <div className="space-y-4 text-xs">
                    
                    {/* Late Penalty Rule */}
                    <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                      <label className="font-black text-amber-900 uppercase tracking-wider block">
                        Late Attendance Deduction Rule (تاخیر پر کٹوتی)
                      </label>
                      <select
                        value={formData.latePenaltyRule}
                        onChange={e => setFormData({ ...formData, latePenaltyRule: e.target.value })}
                        className="w-full bg-white border border-amber-300 text-slate-900 rounded-xl p-2.5 font-bold outline-none"
                      >
                        <option value="none">No Penalty (کوئی جرمانہ نہیں)</option>
                        <option value="per_day_50">Rs 50 per Late Arrival (پچاس روپے فی لیٹ آمد)</option>
                        <option value="per_day_100">Rs 100 per Late Arrival (سو روپے فی لیٹ آمد)</option>
                        <option value="three_lates_half_day">3 Lates = 1 Half Day Salary Cut (تین دن لیٹ = آدھے دن کی تنخواہ)</option>
                      </select>
                      <p className="text-[10px] text-amber-800">
                        2D QR / بارکوڈ اسکینر سے جب اسٹاف مقررہ وقت کے بعد اسکین کرے گا تو پے رول میں یہ کٹوتی خودکار لاگو ہوگی۔
                      </p>
                    </div>

                    {/* Fixed Deductions Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Provident Fund (PF)</label>
                        <input 
                          type="number" min="0"
                          value={formData.providentFund}
                          onChange={e => setFormData({ ...formData, providentFund: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 font-mono text-xs font-bold outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Income Tax / Professional Tax</label>
                        <input 
                          type="number" min="0"
                          value={formData.incomeTax}
                          onChange={e => setFormData({ ...formData, incomeTax: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 font-mono text-xs font-bold outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="font-bold text-slate-600 block mb-1">Other Fixed Deductions / Advance Installment</label>
                        <input 
                          type="number" min="0"
                          value={formData.otherDeductions}
                          onChange={e => setFormData({ ...formData, otherDeductions: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 font-mono text-xs font-bold outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 3: BANK & PAYMENT MODE */}
                {activeTab === 'bank' && (
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">Salary Payment Method</label>
                      <select
                        value={formData.paymentMode}
                        onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 font-bold outline-none"
                      >
                        <option value="Bank Transfer">Bank Transfer (بینک ٹرانسفر)</option>
                        <option value="Cash">Cash in Hand (نقد رقم)</option>
                        <option value="Cheque">Crossed Cheque (چیک)</option>
                        <option value="JazzCash">JazzCash</option>
                        <option value="EasyPaisa">EasyPaisa</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-600 block mb-1">Bank Name / Provider</label>
                      <input 
                        type="text"
                        value={formData.bankName}
                        onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                        placeholder="e.g. Meezan Bank, HBL, Allied Bank..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Account Title</label>
                        <input 
                          type="text"
                          value={formData.accountTitle}
                          onChange={e => setFormData({ ...formData, accountTitle: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                          placeholder="Account Holder Name"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Account Number / IBAN</label>
                        <input 
                          type="text"
                          value={formData.accountNumber}
                          onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 font-mono text-xs font-bold outline-none"
                          placeholder="01234567890 or PK..."
                        />
                      </div>
                    </div>

                  </div>
                )}

                {/* Save Button */}
                <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {saving ? 'Saving Salary Architecture...' : <><Save size={16} /> Save Salary Setup</>}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>

      </div>

      {/* Staff Time Slip Modal */}
      {timeSlipStaff && (
        <StaffTimeSlipModal 
          staff={timeSlipStaff} 
          onClose={() => setTimeSlipStaff(null)} 
        />
      )}

      {/* Preview Payslip Modal */}
      {previewPayslipData && (
        <PayslipModal
          payslipData={previewPayslipData}
          onClose={() => setPreviewPayslipData(null)}
        />
      )}

    </div>
  );
}
