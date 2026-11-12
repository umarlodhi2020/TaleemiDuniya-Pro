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

  const schoolName = schoolData?.name || userData?.schoolName || 'School Name';
  const schoolId = schoolData?.id || userData?.schoolId || null;

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
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-auto">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
              <Smartphone size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                Bulk WhatsApp Payslip Dispatcher
                <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-bold">
                  Automated Bot
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                Processed salary slips ko staff ke personal WhatsApp par 1-click automated delivery karein.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isRunning && !isPaused}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-100/70 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-sm">
            <span className="text-slate-600 dark:text-slate-400 block font-bold text-xs">Total Staff Slips</span>
            <span className="text-slate-900 dark:text-white font-black text-xl">{items.length}</span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-xl shadow-sm">
            <span className="text-emerald-700 dark:text-emerald-400 block font-bold text-xs">Delivered (Sent)</span>
            <span className="text-emerald-800 dark:text-emerald-300 font-black text-xl">{sentCount}</span>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 rounded-xl shadow-sm">
            <span className="text-amber-700 dark:text-amber-400 block font-bold text-xs">Missing Phone</span>
            <span className="text-amber-800 dark:text-amber-300 font-black text-xl">{missingCount}</span>
          </div>
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-3 rounded-xl shadow-sm">
            <span className="text-red-700 dark:text-red-400 block font-bold text-xs">Failed</span>
            <span className="text-red-800 dark:text-red-300 font-black text-xl">{failedCount}</span>
          </div>
        </div>

        {/* Progress Bar (when running or completed) */}
        {(isRunning || isCompleted) && (
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-1.5 text-xs">
              <span className="text-slate-800 dark:text-slate-200 font-bold">
                {isCompleted 
                  ? '🎉 Dispatch Complete! Tamam salary slips deliver ho gayein.' 
                  : isPaused 
                    ? '⏸️ Dispatch Paused (Ruka hua hai)' 
                    : `🚀 Bheja ja raha hai: [${currentIndex + 1}/${items.length}] to ${items[currentIndex]?.staffName || ''}`}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Scrollable Queue List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5 max-h-[48vh] bg-slate-50/50 dark:bg-slate-900">
          {items.map((item, idx) => {
            return (
              <div 
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm ${
                  item.status === 'sending' 
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-2 border-blue-500 shadow-md shadow-blue-500/10' 
                    : item.status === 'sent' 
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60' 
                      : item.status === 'failed'
                        ? 'bg-red-50/90 dark:bg-red-950/30 border border-red-300 dark:border-red-800/60'
                        : item.status === 'missing_phone'
                          ? 'bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60'
                          : 'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                {/* Staff Details */}
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                    item.status === 'sent' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm block">
                      {item.staffName}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      {item.staffRole} • ID: {item.staffIdCode}
                    </span>
                  </div>
                </div>

                {/* Salary Info */}
                <div className="text-left sm:text-right min-w-[120px]">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-bold">Net Salary</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-black text-sm">
                    Rs. {item.netSalary.toLocaleString()}
                  </span>
                </div>

                {/* Phone & Status */}
                <div className="flex items-center gap-3 min-w-[260px] justify-between sm:justify-end">
                  {item.status === 'missing_phone' ? (
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="text" 
                        placeholder="Type Phone: 0300..." 
                        defaultValue={item.rawPhone}
                        onBlur={(e) => handleManualPhoneChange(idx, e.target.value)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-md text-xs text-slate-900 dark:text-white font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 w-40 shadow-sm"
                      />
                    </div>
                  ) : (
                    <span className="text-slate-800 dark:text-slate-200 font-mono font-bold flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-600">
                      <Phone size={13} className="text-slate-500 dark:text-slate-400" />
                      +{item.phone}
                    </span>
                  )}

                  {/* Status Badge */}
                  <div>
                    {item.status === 'idle' && (
                      <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1">
                        <Clock size={12} /> Ready
                      </span>
                    )}
                    {item.status === 'sending' && (
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-400 dark:bg-blue-500/20 dark:text-blue-300 text-xs font-black flex items-center gap-1.5 animate-pulse shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" /> Sending...
                      </span>
                    )}
                    {item.status === 'sent' && (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 text-xs font-black flex items-center gap-1 shadow-sm">
                        <CheckCheck size={14} className="text-emerald-600 dark:text-emerald-400" /> Delivered
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-400 dark:bg-red-500/20 dark:text-red-300 text-xs font-bold flex items-center gap-1 shadow-sm" title={item.error}>
                        <AlertCircle size={12} /> Failed
                      </span>
                    )}
                    {item.status === 'missing_phone' && (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-400 dark:bg-amber-500/20 dark:text-amber-300 text-xs font-bold flex items-center gap-1 shadow-sm" title="Please enter phone number above">
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
        <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
            Alwaysdata Cloud Bot Connected • 1.2s Anti-Spam Safe Throttle
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!isRunning && !isCompleted && (
              <button
                onClick={handleStartDispatch}
                disabled={validCount === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} /> WhatsApp All ({validCount} Staff)
              </button>
            )}

            {isRunning && (
              <>
                <button
                  onClick={handlePause}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleStop}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <X size={14} /> Stop
                </button>
              </>
            )}

            {isCompleted && (
              <button
                onClick={handleStartDispatch}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <RotateCcw size={14} /> Send Again
              </button>
            )}

            <button
              onClick={onClose}
              disabled={isRunning && !isPaused}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
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

