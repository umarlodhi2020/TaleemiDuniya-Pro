import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  ArrowLeft, 
  Settings, 
  FileText, 
  Plus, 
  Trash2, 
  DollarSign, 
  RefreshCw,
  Info
} from 'lucide-react';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/common/GlassCard';

const ChallanBook = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // Billing and Bank Configuration
  const [schoolName, setSchoolName] = useState('The Knowledge Home School System');
  const [billingMonth, setBillingMonth] = useState('October 2026');
  const [dueDate, setDueDate] = useState('2026-10-10');
  const [bankName, setBankName] = useState('Allied Bank Limited');
  const [bankBranch, setBankBranch] = useState('Model Town Branch, LHR');
  const [accountNo, setAccountNo] = useState('01-100-3942-01');
  const [challanPrefix, setChallanPrefix] = useState('TKH-');

  // Dynamic Fee structure items
  const [feeItems, setFeeItems] = useState([
    { id: '1', name: 'Tuition Fee', amount: 2500 },
    { id: '2', name: 'Generator Fund', amount: 200 },
    { id: '3', name: 'Exam Fee', amount: 300 }
  ]);

  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [schoolId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getRecords('students', schoolId);
      if (data && data.length > 0) {
        setStudents(data);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Error fetching students for Challan Book:", error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeeItem = () => {
    if (newItemName.trim() && newItemAmount) {
      setFeeItems([
        ...feeItems,
        { id: Date.now().toString(), name: newItemName.trim(), amount: parseFloat(newItemAmount) }
      ]);
      setNewItemName('');
      setNewItemAmount('');
    }
  };

  const handleDeleteFeeItem = (id) => {
    setFeeItems(feeItems.filter(item => item.id !== id));
  };

  const totalFeeAmount = feeItems.reduce((acc, curr) => acc + curr.amount, 0);

  // Get distinct classes
  const classesList = ['ALL', ...new Set(students.map(s => String(s.class || '').trim().toUpperCase()))].filter(Boolean);

  // Filtered list
  const filteredStudents = selectedClass === 'ALL' 
    ? students 
    : students.filter(s => String(s.class || '').trim().toUpperCase() === selectedClass);

  const handlePrint = () => {
    window.print();
  };

  // Helper to generate a clean challan code
  const makeChallanNo = (student) => {
    const paddedRoll = String(student.rollNo || '000').padStart(3, '0');
    return `${challanPrefix}${student.class || 'PR'}-${paddedRoll}`;
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-dark-bg text-dark-text select-none">
      
      {/* Print-specific overrides for landscape layout */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0.5cm;
          }
          body * {
            visibility: hidden;
            background-color: transparent !important;
          }
          #challan-print-area, #challan-print-area * {
            visibility: visible;
          }
          #challan-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          .challan-page-break {
            page-break-after: always;
            break-after: always;
          }
        }
      `}</style>

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">
            Multi-Part Challan Book Generator
          </h1>
          <p className="text-xs text-dark-muted font-bold tracking-wider uppercase mt-1">
            Generate and bulk-print standard 3-copy landscape school fee slips (Bank, School, Student)
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="premium-button-primary py-2.5 px-5 flex items-center justify-center gap-2 font-bold text-xs uppercase"
          >
            <Printer size={15} />
            <span>Print Challan Sheets</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 no-print">
        
        {/* Left Side: Configuration Options */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="p-5 border-dark-border/40">
            <h2 className="text-sm font-black text-primary-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Settings size={16} />
              <span>Challan Settings</span>
            </h2>

            <div className="space-y-4 text-xs font-bold">
              {/* Class Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Class Select</label>
                <select 
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs text-primary-400"
                >
                  {classesList.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* School Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">School name</label>
                <input 
                  type="text" 
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs"
                />
              </div>

              {/* Month */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Billing Month</label>
                <input 
                  type="text" 
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs"
                  placeholder="e.g. October 2026"
                />
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Due Date</label>
                <input 
                  type="date" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs text-primary-400 font-sans"
                />
              </div>

              {/* Challan Prefix */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Challan Prefix Code</label>
                <input 
                  type="text" 
                  value={challanPrefix}
                  onChange={(e) => setChallanPrefix(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs"
                />
              </div>

              {/* Bank Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Bank Name</label>
                <input 
                  type="text" 
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs"
                />
              </div>

              {/* Branch */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Bank Branch</label>
                <input 
                  type="text" 
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs"
                />
              </div>

              {/* Account Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Bank Account Number</label>
                <input 
                  type="text" 
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs text-cyan-400 font-mono"
                />
              </div>
            </div>
          </GlassCard>

          {/* Fee Items Customizer */}
          <GlassCard className="p-5 border-dark-border/40">
            <h2 className="text-sm font-black text-primary-400 uppercase tracking-widest flex items-center justify-between mb-4">
              <span>Fee breakdown</span>
              <span className="text-xs text-yellow-400 font-black">Total: {totalFeeAmount}</span>
            </h2>

            {/* List of current items */}
            <div className="space-y-2 mb-4">
              {feeItems.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-dark-card border border-dark-border/30 rounded-xl p-2 text-[11px] font-bold">
                  <span className="text-dark-text uppercase">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-primary-400">Rs.{item.amount}</span>
                    <button 
                      onClick={() => handleDeleteFeeItem(item.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Form to add item */}
            <div className="space-y-2.5 border-t border-dark-border/40 pt-3 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-[9px] text-dark-muted uppercase tracking-wider">Fee Description</label>
                <input 
                  type="text" 
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Admission Fee"
                  className="w-full premium-input bg-dark-card text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-dark-muted uppercase tracking-wider">Amount (PKR)</label>
                <input 
                  type="number" 
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full premium-input bg-dark-card text-xs text-yellow-400 font-sans"
                />
              </div>
              <button
                onClick={handleAddFeeItem}
                className="w-full mt-1.5 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500 hover:text-white font-bold text-xs uppercase transition-all flex items-center justify-center gap-1"
              >
                <Plus size={14} />
                <span>Add Fee Item</span>
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Landscape Sheets Emulation Grid */}
        <div className="lg:col-span-3 space-y-6">
          <GlassCard className="p-6 border-dark-border/40 min-h-[500px]">
            <div className="flex items-center justify-between border-b border-dark-border/40 pb-3 mb-6">
              <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-primary-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} />
                <span>Print-Ready Challan Books ({filteredStudents.length} Students)</span>
              </h2>
              <span className="text-[10px] font-black uppercase text-dark-muted bg-white/5 border border-dark-border/40 py-1 px-2.5 rounded-full">
                Landscape Mode
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw size={36} className="text-primary-500 animate-spin" />
                <p className="text-xs font-black text-dark-muted uppercase">Generating Challan Slips...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-dark-border/30 flex items-center justify-center text-dark-muted text-lg">★</div>
                <p className="text-xs font-black text-dark-muted uppercase mt-2">No students found matching class: {selectedClass}</p>
              </div>
            ) : (
              /* A4 Landscape emulation stack */
              <div className="space-y-12">
                {filteredStudents.map((st) => (
                  <div key={st.id} className="w-full max-w-[900px] mx-auto p-4 border border-gray-200 bg-white rounded-2xl shadow-xl flex gap-3 text-black font-sans select-text hover:shadow-2xl transition-all duration-300">
                    
                    {/* Multi-part Slip render template (Repeated 3 times) */}
                    {['Bank Copy', 'School Copy', 'Student Copy'].map((slipName, idx) => (
                      <div 
                        key={idx} 
                        className={`flex-1 p-2.5 border border-gray-300 rounded-xl relative flex flex-col justify-between ${
                          idx === 2 ? 'border-r-2 border-gray-400' : 'border-r border-dashed'
                        }`}
                      >
                        {/* Copy Stamp badge */}
                        <div className="absolute top-2 right-2 text-[6.5px] font-black uppercase tracking-widest py-0.5 px-1.5 rounded bg-gray-100 text-gray-600 border border-gray-200 select-none">
                          {slipName}
                        </div>

                        {/* Slip Header */}
                        <div className="text-center pb-2 border-b border-gray-200">
                          <h3 className="text-[9px] font-black uppercase tracking-wide leading-tight text-gray-800 line-clamp-1 max-w-[85%] mx-auto">
                            {schoolName}
                          </h3>
                          <span className="text-[7px] text-gray-500 font-extrabold uppercase mt-0.5 block tracking-tighter">
                            Month: {billingMonth}
                          </span>
                        </div>

                        {/* Bank Details */}
                        <div className="my-1.5 bg-gray-50 border border-gray-100 p-1.5 rounded-lg text-[7px] font-bold text-gray-700 leading-tight">
                          <div className="flex justify-between">
                            <span className="text-gray-400">BANK:</span>
                            <span className="text-gray-900 font-black truncate max-w-[100px]">{bankName}</span>
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-gray-400">A/C:</span>
                            <span className="text-cyan-800 font-mono font-black">{accountNo}</span>
                          </div>
                          <div className="text-[6.5px] text-gray-400 text-center font-extrabold mt-0.5 uppercase border-t border-gray-100/50 pt-0.5">
                            {bankBranch}
                          </div>
                        </div>

                        {/* Challan Credentials */}
                        <div className="mb-2 text-[8px] font-bold text-gray-800 border-b border-gray-100 pb-1.5">
                          <div className="flex justify-between">
                            <span className="text-gray-400 uppercase text-[7px]">Challan No:</span>
                            <span className="text-primary-600 font-mono font-black">{makeChallanNo(st)}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-gray-400 uppercase text-[7px]">Student Name:</span>
                            <span className="text-gray-900 font-black uppercase truncate max-w-[85px]">{st.name || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-gray-400 uppercase text-[7px]">Father Name:</span>
                            <span className="text-gray-700 uppercase truncate max-w-[85px]">{st.fatherName || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-gray-400 uppercase text-[7px]">Class / Roll No:</span>
                            <span className="text-gray-900">{st.class || 'N/A'} / #{st.rollNo || '00'}</span>
                          </div>
                        </div>

                        {/* Fees Table */}
                        <div className="flex-1 min-h-[75px] my-1">
                          <table className="w-full text-left text-[7.5px] font-semibold text-gray-700">
                            <thead>
                              <tr className="border-b border-gray-200 text-gray-400 uppercase text-[6.5px] font-extrabold pb-0.5">
                                <th className="pb-0.5">Description</th>
                                <th className="text-right pb-0.5">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {feeItems.map(item => (
                                <tr key={item.id} className="border-b border-gray-50/50">
                                  <td className="py-0.5 uppercase text-gray-600">{item.name}</td>
                                  <td className="text-right py-0.5 text-gray-900">Rs.{item.amount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Total Amount details */}
                        <div className="border-t border-gray-200 pt-1.5 text-[8.5px] font-black text-gray-900 flex justify-between bg-gray-50/70 p-1 rounded">
                          <span className="uppercase text-[7.5px]">Total Payable:</span>
                          <span className="text-primary-700">Rs.{totalFeeAmount}</span>
                        </div>

                        {/* Footer Due Date Note */}
                        <div className="mt-2 text-center text-[6px] font-extrabold text-gray-500 bg-yellow-50/70 p-1 border border-yellow-100 rounded leading-normal">
                          <span className="text-red-500 uppercase font-black block">Due Date: {dueDate}</span>
                          Note: After due date fine Rs. 100/- per day will be charged.
                        </div>

                        {/* Signatures */}
                        <div className="mt-3.5 border-t border-gray-100 pt-1.5 flex justify-between text-[6px] font-black text-gray-400 uppercase">
                          <span className="border-t border-gray-300 pt-0.5 px-1">Cashier/Officer</span>
                          <span className="border-t border-gray-300 pt-0.5 px-1 text-right">Authorized Rep</span>
                        </div>

                      </div>
                    ))}

                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

      </div>

      {/* ========================================================
          SECRET PRINT HIDDEN CONTAINER
          Always formatted correctly for landscape standard A4 grid printing
      ======================================================== */}
      <div id="challan-print-area" className="hidden print:block text-black bg-white">
        {filteredStudents.map((st) => (
          <div key={st.id} className="w-full h-[650px] p-6 bg-white flex gap-4 text-black font-sans challan-page-break select-text">
            {['Bank Copy', 'School Copy', 'Student Copy'].map((slipName, idx) => (
              <div 
                key={idx} 
                className={`flex-1 p-4 border border-gray-400 rounded-2xl relative flex flex-col justify-between ${
                  idx === 2 ? 'border-r-2 border-gray-500' : 'border-r border-dashed'
                }`}
              >
                <div className="absolute top-3 right-3 text-[8.5px] font-black uppercase tracking-widest py-0.5 px-2.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                  {slipName}
                </div>

                {/* Header */}
                <div className="text-center pb-3 border-b border-gray-300">
                  <h3 className="text-[12px] font-black uppercase tracking-wide leading-tight text-gray-800 line-clamp-1 max-w-[80%] mx-auto">
                    {schoolName}
                  </h3>
                  <span className="text-[8.5px] text-gray-500 font-extrabold uppercase mt-1 block tracking-tighter">
                    Month: {billingMonth}
                  </span>
                </div>

                {/* Bank */}
                <div className="my-2.5 bg-gray-50 border border-gray-200 p-2 rounded-xl text-[9px] font-bold text-gray-700 leading-tight">
                  <div className="flex justify-between">
                    <span className="text-gray-400">BANK:</span>
                    <span className="text-gray-900 font-black">{bankName}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-400">A/C:</span>
                    <span className="text-cyan-800 font-mono font-black">{accountNo}</span>
                  </div>
                  <div className="text-[8.5px] text-gray-400 text-center font-extrabold mt-1.5 uppercase border-t border-gray-200/50 pt-1">
                    {bankBranch}
                  </div>
                </div>

                {/* Credentials */}
                <div className="mb-3 text-[10.5px] font-bold text-gray-800 border-b border-gray-200 pb-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 uppercase text-[8px]">Challan No:</span>
                    <span className="text-primary-600 font-mono font-black">{makeChallanNo(st)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-400 uppercase text-[8px]">Student Name:</span>
                    <span className="text-gray-900 font-black uppercase truncate max-w-[130px]">{st.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-gray-400 uppercase text-[8px]">Father Name:</span>
                    <span className="text-gray-700 uppercase truncate max-w-[130px]">{st.fatherName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-gray-400 uppercase text-[8px]">Class / Roll No:</span>
                    <span className="text-gray-900">{st.class || 'N/A'} / #{st.rollNo || '00'}</span>
                  </div>
                </div>

                {/* Fees Table */}
                <div className="flex-1 min-h-[140px] my-1">
                  <table className="w-full text-left text-[10px] font-semibold text-gray-700">
                    <thead>
                      <tr className="border-b border-gray-300 text-gray-400 uppercase text-[8px] font-extrabold pb-1">
                        <th className="pb-1">Description</th>
                        <th className="text-right pb-1">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeItems.map(item => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-1 uppercase text-gray-600">{item.name}</td>
                          <td className="text-right py-1 text-gray-900">Rs.{item.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="border-t border-gray-300 pt-2.5 text-[11px] font-black text-gray-900 flex justify-between bg-gray-50 p-1.5 rounded">
                  <span className="uppercase text-[9px]">Total Payable:</span>
                  <span className="text-primary-700">Rs.{totalFeeAmount}</span>
                </div>

                {/* Footer instructions */}
                <div className="mt-2.5 text-center text-[7.5px] font-extrabold text-gray-500 bg-yellow-50 p-1.5 border border-yellow-200 rounded leading-normal">
                  <span className="text-red-500 uppercase font-black block">Due Date: {dueDate}</span>
                  Note: After due date fine Rs. 100/- per day will be charged.
                </div>

                {/* Signatures */}
                <div className="mt-5 border-t border-gray-200 pt-3 flex justify-between text-[7px] font-black text-gray-400 uppercase">
                  <span className="border-t border-gray-300 pt-1 px-1">Cashier/Officer</span>
                  <span className="border-t border-gray-300 pt-1 px-1 text-right">Authorized Rep</span>
                </div>

              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  );
};

export default ChallanBook;
