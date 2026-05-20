import React, { useState } from 'react';
import { 
  CreditCard, 
  ArrowLeft, 
  Search,
  CheckCircle,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const AddFee = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [feeMonth, setFeeMonth] = useState(new Date().toISOString().slice(0, 7));
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const handleAddFee = async (e) => {
    e.preventDefault();
    if (!studentId || !amount) return alert('Please fill required fields');
    setLoading(true);
    try {
      const feeData = {
        studentId,
        studentName,
        month: feeMonth,
        totalAmount: amount,
        paymentMethod,
        status: 'Paid',
        paidAt: new Date().toISOString(),
        type: 'Direct Payment'
      };
      const result = await addRecord('challans', feeData, userData?.schoolId || 'default-school');
      if (result.success) {
        alert('Fee recorded successfully!');
        navigate('/school-admin/fees');
      } else {
        alert('Failed to record fee');
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
          <h1 className="text-2xl font-bold text-dark-text">Add Fee Payment</h1>
          <p className="text-dark-muted text-sm mt-0.5">Record a direct manual fee payment.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary-500">
              <CreditCard size={20} /> Payment Details
            </h2>
            
            <form onSubmit={handleAddFee} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Student ID/Roll No</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                    <input 
                      type="text" 
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. STU-001"
                      className="w-full premium-input pl-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Student Name</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Ali Ahmed"
                      className="w-full premium-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Fee Month</label>
                  <div className="relative">
                    <input 
                      type="month" 
                      required
                      value={feeMonth}
                      onChange={(e) => setFeeMonth(e.target.value)}
                      className="w-full premium-input" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Amount Paid (PKR)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      required
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full premium-input" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-dark-muted uppercase tracking-widest px-1">Payment Method</label>
                  <div className="flex gap-4 mt-2">
                    {['Cash', 'Bank Transfer', 'Cheque'].map(method => (
                      <label key={method} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value={method}
                          checked={paymentMethod === method}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="text-primary-500 focus:ring-primary-500 bg-dark-bg border-dark-border"
                        />
                        <span className="text-sm font-medium">{method}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-dark-border flex justify-end">
                <button 
                  type="submit"
                  disabled={loading}
                  className="premium-button-primary disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle size={18} />
                  {loading ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
        
        <div className="space-y-6">
          <GlassCard className="bg-dark-card border-dashed border-2 border-dark-border flex flex-col items-center justify-center p-8 text-center">
             <div className="w-16 h-16 rounded-2xl bg-dark-hover flex items-center justify-center text-dark-muted mb-4">
               <FileText size={32} />
             </div>
             <h4 className="font-bold">Manual Collection</h4>
             <p className="text-[10px] text-dark-muted uppercase mt-2 tracking-widest">
               Payments recorded here are automatically marked as PAID in the main ledger.
             </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default AddFee;
