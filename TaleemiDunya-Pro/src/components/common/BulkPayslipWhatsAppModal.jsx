import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  X, 
  Pause, 
  Play, 
  User, 
  Phone, 
  Smartphone,
  CheckCheck,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { sendWhatsAppApiMessage, formatPhoneNumber } from '../../utils/notificationService';
import { formatPeriod } from '../../utils/payrollUtils';

export const buildPayslipWhatsAppText = (payslipData, schoolName) => {
  const netSalaryFormatted = Number(payslipData.netSalary || 0).toLocaleString();
  const periodDisplay = formatPeriod(payslipData.period || payslipData.month);

  return (
    `*🏛️ ${String(schoolName || 'School').toUpperCase()}*\n` +
    `*📄 Official Salary Slip - ${periodDisplay}*\n` +
    `----------------------------------------\n` +
    `👤 *Staff Name:* ${payslipData.staffName || 'Staff Member'}\n` +
    `🆔 *Employee ID:* ${payslipData.staffIdCode || payslipData.staffId || 'N/A'}\n` +
    `💼 *Designation:* ${payslipData.staffRole || 'Staff'}\n` +
    `🏢 *Department:* ${payslipData.staffDepartment || 'Academic'}\n` +
    `----------------------------------------\n` +
    `📅 *Working Days:* ${payslipData.totalWorkingDays ?? 26}\n` +
    `✅ *Present:* ${payslipData.presentDays ?? 0} | ❌ *Absent:* ${payslipData.absentDays ?? 0} | 🏖️ *Leaves:* ${payslipData.leaveDays ?? 0}\n` +
    `----------------------------------------\n` +
    `💵 *Basic Salary:* Rs. ${Number(payslipData.basicSalary || 0).toLocaleString()}\n` +
    `➕ *Allowances:* Rs. ${Number(payslipData.totalAllowances || 0).toLocaleString()}\n` +
    `➖ *Deductions:* Rs. ${Number(payslipData.totalDeductions || 0).toLocaleString()}\n` +
    `----------------------------------------\n` +
    `💰 *NET SALARY:* Rs. ${netSalaryFormatted}\n` +
    `📊 *Status:* ${payslipData.status || 'PROCESSED'}\n` +
    `----------------------------------------\n` +
    `_TaleemiDunya Pro AI HR & Payroll System_`
  );
};

const BulkPayslipWhatsAppModal = ({ 
  isOpen, 
  onClose, 
  batchData = [], 
  schoolData = {}, 
  userData = {} 
}) => {
  const [items, setItems] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);

  const schoolName = schoolData?.name || userData?.schoolName || 'Smart Angels Grammar School';
  const schoolId = schoolData?.id || userData?.schoolId || 'NNRuCtHxQNjISc9EPgMs';

  // Initialize items whenever batchData changes
  useEffect(() => {
    if (batchData && batchData.length > 0) {
      const prepared = batchData.map((record, index) => {
        const rawPhone = record.staffPhone || record.phone || record.mobile || record.contact || record.whatsapp || '';
        const clean = formatPhoneNumber(rawPhone);
        const hasValidPhone = clean && clean.length >= 10;

        return {
          id: record.id || record.payrollId || `record_${index}`,
          record,
          staffName: record.staffName || 'Staff Member',
          staffIdCode: record.staffIdCode || record.staffId || 'N/A',
          staffRole: record.staffRole || 'Teacher',
          netSalary: Number(record.netSalary || 0),
          phone: clean || '',
          rawPhone,
          status: hasValidPhone ? 'idle' : 'missing_phone', // 'idle' | 'sending' | 'sent' | 'failed' | 'missing_phone'
          error: hasValidPhone ? null : 'No phone number in staff record'
        };
      });
      setItems(prepared);
      setCurrentIndex(0);
      setIsRunning(false);
      setIsPaused(false);
      setIsCompleted(false);
      isRunningRef.current = false;
      isPausedRef.current = false;
    }
  }, [batchData]);

  if (!isOpen) return null;

  const validCount = items.filter(i => i.phone && i.phone.length >= 10).length;
  const missingCount = items.length - validCount;
  const sentCount = items.filter(i => i.status === 'sent').length;
  const failedCount = items.filter(i => i.status === 'failed').length;
  const progressPercent = items.length > 0 ? Math.round(((sentCount + failedCount + missingCount) / items.length) * 100) : 0;

  const handleStartDispatch = async () => {
    setIsRunning(true);
    setIsPaused(false);
    setIsCompleted(false);
    isRunningRef.current = true;
    isPausedRef.current = false;

    for (let i = 0; i < items.length; i++) {
      if (!isRunningRef.current) break;

      while (isPausedRef.current) {
        await new Promise(r => setTimeout(r, 400));
        if (!isRunningRef.current) break;
      }

      if (!isRunningRef.current) break;

      const currentItem = items[i];
      // Skip already sent or missing phone
      if (currentItem.status === 'sent' || currentItem.status === 'missing_phone') {
        continue;
      }

      setCurrentIndex(i);

      // Set item to 'sending'
      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'sending' } : item));

      try {
        const messageText = buildPayslipWhatsAppText(currentItem.record, schoolName);
        const res = await sendWhatsAppApiMessage(schoolId, currentItem.phone, messageText);

        if (res && res.success) {
          setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'sent', error: null } : item));
        } else {
          setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'failed', error: res?.error || 'Send failed' } : item));
        }
      } catch (err) {
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'failed', error: err.message || 'Dispatch error' } : item));
      }

      // Safe rate-limiting throttle (1.2 seconds between messages to protect WhatsApp session)
      await new Promise(r => setTimeout(r, 1200));
    }

    setIsRunning(false);
    isRunningRef.current = false;
    setIsCompleted(true);
  };

  const handlePause = () => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
  };

  const handleStop = () => {
    isRunningRef.current = false;
    isPausedRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
  };

  const handleManualPhoneChange = (index, newPhone) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const clean = formatPhoneNumber(newPhone);
      const valid = clean && clean.length >= 10;
      return {
        ...item,
        phone: clean,
        rawPhone: newPhone,
        status: valid ? 'idle' : 'missing_phone',
        error: valid ? null : 'Invalid phone'
      };
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-auto">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Smartphone size={22} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                Bulk WhatsApp Payslip Dispatcher
                <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Automatic Bot
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Processed salary slips ko staff ke personal WhatsApp par automated delivery karein.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isRunning && !isPaused}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-900/60 border-b border-slate-800 text-xs">
          <div className="bg-slate-800/60 border border-slate-700/60 p-2.5 rounded-xl">
            <span className="text-slate-400 block font-medium">Total Staff Slips</span>
            <span className="text-white font-bold text-lg">{items.length}</span>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-800/40 p-2.5 rounded-xl">
            <span className="text-emerald-400 block font-medium">Delivered (Sent)</span>
            <span className="text-emerald-300 font-bold text-lg">{sentCount}</span>
          </div>
          <div className="bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-xl">
            <span className="text-amber-400 block font-medium">Missing Phone</span>
            <span className="text-amber-300 font-bold text-lg">{missingCount}</span>
          </div>
          <div className="bg-red-950/30 border border-red-800/40 p-2.5 rounded-xl">
            <span className="text-red-400 block font-medium">Failed</span>
            <span className="text-red-300 font-bold text-lg">{failedCount}</span>
          </div>
        </div>

        {/* Progress Bar (when running or completed) */}
        {(isRunning || isCompleted) && (
          <div className="px-5 pt-3 pb-2 bg-slate-950/40 border-b border-slate-800">
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="text-slate-300 font-medium">
                {isCompleted 
                  ? '🎉 Dispatch Complete!' 
                  : isPaused 
                    ? '⏸️ Dispatch Paused' 
                    : `🚀 Sending: [${currentIndex + 1}/${items.length}] to ${items[currentIndex]?.staffName || ''}`}
              </span>
              <span className="text-emerald-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Scrollable Queue List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2 max-h-[46vh]">
          {items.map((item, idx) => {
            return (
              <div 
                key={item.id}
                className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  item.status === 'sending' 
                    ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10' 
                    : item.status === 'sent' 
                      ? 'bg-emerald-950/20 border-emerald-800/40' 
                      : item.status === 'failed'
                        ? 'bg-red-950/20 border-red-800/40'
                        : item.status === 'missing_phone'
                          ? 'bg-amber-950/10 border-amber-800/30'
                          : 'bg-slate-800/40 border-slate-700/40'
                }`}
              >
                {/* Staff Details */}
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    item.status === 'sent' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">{item.staffName}</span>
                    <span className="text-slate-400 text-xs">{item.staffRole} • ID: {item.staffIdCode}</span>
                  </div>
                </div>

                {/* Salary Info */}
                <div className="text-left sm:text-right min-w-[120px]">
                  <span className="text-slate-400 block text-[11px]">Net Salary</span>
                  <span className="text-emerald-400 font-bold">Rs. {item.netSalary.toLocaleString()}</span>
                </div>

                {/* Phone & Status */}
                <div className="flex items-center gap-3 min-w-[240px] justify-between sm:justify-end">
                  {item.status === 'missing_phone' ? (
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="text" 
                        placeholder="Enter phone (03...)" 
                        defaultValue={item.rawPhone}
                        onBlur={(e) => handleManualPhoneChange(idx, e.target.value)}
                        className="px-2 py-1 bg-slate-900 border border-amber-600/50 rounded text-xs text-amber-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 w-36"
                      />
                    </div>
                  ) : (
                    <span className="text-slate-300 font-mono flex items-center gap-1 text-xs">
                      <Phone size={13} className="text-slate-400" />
                      +{item.phone}
                    </span>
                  )}

                  {/* Status Badge */}
                  <div>
                    {item.status === 'idle' && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-300 text-[11px] font-medium flex items-center gap-1">
                        <Clock size={12} /> Ready
                      </span>
                    )}
                    {item.status === 'sending' && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" /> Sending...
                      </span>
                    )}
                    {item.status === 'sent' && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1">
                        <CheckCheck size={14} className="text-emerald-400" /> Delivered
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[11px] font-medium flex items-center gap-1" title={item.error}>
                        <AlertCircle size={12} /> Failed
                      </span>
                    )}
                    {item.status === 'missing_phone' && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium flex items-center gap-1" title="Please enter phone number above">
                        <AlertTriangle size={12} /> No Phone
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            Alwaysdata Cloud Bot Connected • 1.2s Anti-Spam Safe Throttle
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!isRunning && !isCompleted && (
              <button
                onClick={handleStartDispatch}
                disabled={validCount === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={15} /> WhatsApp All ({validCount} Staff)
              </button>
            )}

            {isRunning && (
              <>
                <button
                  onClick={handlePause}
                  className="px-4 py-2 rounded-xl bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600 hover:text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleStop}
                  className="px-4 py-2 rounded-xl bg-red-600/20 text-red-300 border border-red-500/40 hover:bg-red-600 hover:text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <X size={14} /> Stop
                </button>
              </>
            )}

            {isCompleted && (
              <button
                onClick={handleStartDispatch}
                className="px-4 py-2 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600 hover:text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} /> Send Again
              </button>
            )}

            <button
              onClick={onClose}
              disabled={isRunning && !isPaused}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BulkPayslipWhatsAppModal;
