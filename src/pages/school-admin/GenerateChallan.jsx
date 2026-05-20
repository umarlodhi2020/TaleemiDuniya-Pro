import React, { useState } from 'react';
import { 
  Receipt, 
  ArrowLeft, 
  User, 
  BookOpen, 
  Calendar, 
  CreditCard,
  Printer,
  FileText,
  ChevronDown,
  Plus,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const GenerateChallan = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectionType, setSelectionType] = useState('class');
  const [selectedClass, setSelectedClass] = useState('');
  const [feeMonth, setFeeMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dueDate, setDueDate] = useState('');
  const [feeItems, setFeeItems] = useState([
    { name: 'Tuition Fee', amount: '' },
    { name: 'Admission Fee', amount: '' },
    { name: 'Computer Lab Fee', amount: '' }
  ]);

  const addFeeItem = () => setFeeItems([...feeItems, { name: '', amount: '' }]);
  const removeFeeItem = (index) => setFeeItems(feeItems.filter((_, i) => i !== index));

  const totalAmount = feeItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  const handleGenerate = async () => {
    if (!selectedClass) return alert('Please select a class');
    setLoading(true);
    try {
      const challanData = {
        selectionType,
        class: selectedClass,
        month: feeMonth,
        dueDate,
        feeItems,
        totalAmount,
        status: 'Unpaid'
      };
      const result = await addRecord('challans', challanData, userData?.schoolId || 'default-school');
      if (result.success) {
        alert('Challan generated and saved successfully!');
        navigate('/school-admin/fees');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold text-dark-text">Generate Fee Challan</h1>
          <p className="text-dark-muted text-sm mt-0.5">Create digital challans for students.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary-500">
              <Receipt size={20} /> Selection & Duration
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Selection Type</label>
                <div className="relative">
                  <select 
                    value={selectionType}
                    onChange={(e) => setSelectionType(e.target.value)}
                    className="w-full premium-input appearance-none"
                  >
                    <option value="class">Whole Class</option>
                    <option value="student">Specific Student</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Select Class</label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <select 
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full premium-input pl-12 appearance-none"
                  >
                    <option value="">Select Class</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                      <option key={c} value={c.toString()}>{c} Class</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted pointer-events-none" size={16} />
                </div>
              </div>

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
                <CreditCard size={20} /> Fee Structure
              </h2>
              <button 
                onClick={addFeeItem}
                className="text-xs font-black text-primary-500 uppercase tracking-widest flex items-center gap-1 hover:text-primary-400 transition-colors"
              >
                <Plus size={14} /> Add Head
              </button>
            </div>

            <div className="space-y-4">
              {feeItems.map((item, index) => (
                <div key={index} className="flex gap-4 items-end animate-slide-in">
                  <div className="flex-1 space-y-2">
                    {index === 0 && <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Fee Head Name</label>}
                    <input 
                      type="text" 
                      placeholder="e.g. Exam Fee"
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
                      onChange={(e) => {
                        const newItems = [...feeItems];
                        newItems[index].amount = e.target.value;
                        setFeeItems(newItems);
                      }}
                      className="w-full premium-input"
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

            <div className="mt-8 pt-6 border-t border-dark-border flex justify-between items-center">
              <p className="text-sm font-bold text-dark-muted uppercase tracking-[0.2em]">Grand Total</p>
              <h3 className="text-3xl font-black text-primary-500">PKR {totalAmount.toLocaleString()}</h3>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6">Challan Summary</h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-muted">Items Count</span>
                <span className="font-bold">{feeItems.length} Heads</span>
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
                onClick={handleGenerate}
                disabled={loading}
                className="w-full premium-button-primary disabled:opacity-50"
              >
                <Printer size={18} />
                {loading ? 'Generating...' : 'Generate & Print'}
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
               Challans will be available in student portals instantly after generation.
             </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default GenerateChallan;
