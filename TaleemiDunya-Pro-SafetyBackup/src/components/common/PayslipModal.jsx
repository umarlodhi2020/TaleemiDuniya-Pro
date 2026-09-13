import React from 'react';
import { Landmark, Printer, X, FileText, CheckCircle2, ShieldCheck, AlertCircle, Download } from 'lucide-react';
import { formatPeriod, exportPayslipToCSV } from '../../utils/payrollUtils';

/**
 * Reusable A4-Printable Payslip Modal
 * Strictly READ-ONLY component powered by processed payroll snapshot data.
 */
const PayslipModal = ({ payslipData, schoolData, userData, onClose }) => {
  if (!payslipData) return null;

  const isProcessed = payslipData.status === 'Processed' || payslipData.status === 'processed';

  const schoolName = userData?.schoolName || schoolData?.name || 'TaleemiDunya School';
  const schoolAddress = userData?.schoolAddress || schoolData?.address || 'School Campus Address';
  const schoolPhone = userData?.schoolPhone || schoolData?.phone || '';
  const schoolEmail = userData?.schoolEmail || schoolData?.email || '';

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    exportPayslipToCSV(payslipData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:static print:h-auto bg-black/70 backdrop-blur-md print:bg-transparent print:backdrop-blur-none animate-fade-in overflow-y-auto">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl print:shadow-none print:border-0 print:rounded-none my-8 print:my-0">
        
        {/* Modal Top Bar - Hidden when printing */}
        <div className="p-4 bg-dark-bg border-b border-dark-border flex justify-between items-center print:hidden">
          <h3 className="font-bold text-white flex items-center gap-2">
            <FileText className="text-emerald-400" size={20} />
            Official Monthly Payslip
          </h3>
          <div className="flex items-center gap-2">
            {isProcessed && (
              <>
                <button 
                  onClick={handleExportCSV} 
                  className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5" 
                  title="Export Payslip to CSV"
                >
                  <Download size={15} /> Export CSV
                </button>
                <button 
                  onClick={handlePrint} 
                  className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5" 
                  title="Print / Save as PDF"
                >
                  <Printer size={15} /> Print / Save as PDF
                </button>
              </>
            )}
            <button 
              onClick={onClose} 
              className="p-1.5 bg-dark-card border border-dark-border text-dark-muted hover:text-red-400 rounded-lg transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isProcessed ? (
          /* Draft Protection Message */
          <div className="p-12 text-center space-y-4 print:hidden">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-white">Payslip Unavailable</h3>
            <p className="text-sm text-dark-muted max-w-md mx-auto">
              Official payslips are only available after payroll is processed and finalized. Current status: <span className="font-bold text-amber-400 uppercase">{payslipData.status || 'Draft'}</span>.
            </p>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-dark-bg border border-dark-border text-white hover:bg-white/5 rounded-xl text-sm font-bold transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          /* Official Printable A4 Payslip Document */
          <div id="payslip-printable-area" className="p-8 print:p-0 bg-white text-black print:text-black">
            
            {/* Header: School Info & Document Title */}
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
              <div>
                <h1 className="text-3xl font-black text-indigo-950 tracking-tight flex items-center gap-2">
                  <Landmark size={28} className="text-indigo-800" /> {schoolName}
                </h1>
                <p className="text-gray-600 text-sm mt-1">{schoolAddress}</p>
                {(schoolPhone || schoolEmail) && (
                  <p className="text-gray-500 text-xs mt-0.5 font-mono">
                    {schoolPhone && <span>Ph: {schoolPhone}</span>} {schoolEmail && <span>| Email: {schoolEmail}</span>}
                  </p>
                )}
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest">Payslip</h2>
                <div className="mt-1 flex flex-col items-end gap-1">
                  <span className="text-indigo-700 font-bold bg-indigo-50 px-3 py-1 rounded-md text-xs border border-indigo-100 font-mono">
                    Period: {formatPeriod(payslipData.period || payslipData.month)}
                  </span>
                  <span className="text-green-700 font-bold bg-green-50 px-2.5 py-0.5 rounded text-[11px] border border-green-200 uppercase flex items-center gap-1">
                    <CheckCircle2 size={12} /> {payslipData.status || 'PROCESSED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: Employee Information */}
            <div className="mb-6 bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">
                Employee Information
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-gray-500 font-medium">Employee Name:</span>
                  <span className="font-bold text-gray-900">{payslipData.staffName || '—'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-500 font-medium">Employee Code/ID:</span>
                  <span className="font-bold font-mono text-gray-900">{payslipData.staffIdCode || payslipData.staffId || '—'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-500 font-medium">Designation / Role:</span>
                  <span className="font-bold text-gray-800">{payslipData.staffRole || '—'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-500 font-medium">Department:</span>
                  <span className="font-bold font-mono text-gray-800">{payslipData.staffDepartment || '—'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-500 font-medium">Employment Type:</span>
                  <span className="font-medium text-gray-800">{payslipData.employmentType || '—'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-500 font-medium">Joining Date:</span>
                  <span className="font-mono text-gray-800">{payslipData.joinDate || '—'}</span>
                </p>
              </div>
            </div>

            {/* Section 2: Attendance Summary Snapshot */}
            <div className="mb-6 bg-blue-50/40 p-4 rounded-xl border border-blue-100">
              <div className="flex justify-between items-center mb-2 border-b border-blue-100 pb-1">
                <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider">
                  Attendance Summary (Snapshot)
                </h3>
                {payslipData.attendanceSource && (
                  <span className="text-[10px] text-blue-700 font-medium">
                    Source: {payslipData.attendanceSource}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center font-mono text-xs">
                <div className="bg-white p-2 rounded border border-blue-100 shadow-2xs">
                  <p className="text-gray-500 font-bold text-[10px] uppercase">Working</p>
                  <p className="font-black text-gray-900 text-sm mt-0.5">{payslipData.totalWorkingDays ?? 26}</p>
                </div>
                <div className="bg-white p-2 rounded border border-blue-100 shadow-2xs">
                  <p className="text-green-600 font-bold text-[10px] uppercase">Present</p>
                  <p className="font-black text-green-700 text-sm mt-0.5">{payslipData.presentDays ?? 0}</p>
                </div>
                <div className="bg-white p-2 rounded border border-blue-100 shadow-2xs">
                  <p className="text-red-600 font-bold text-[10px] uppercase">Absent</p>
                  <p className="font-black text-red-700 text-sm mt-0.5">{payslipData.absentDays ?? 0}</p>
                </div>
                <div className="bg-white p-2 rounded border border-blue-100 shadow-2xs">
                  <p className="text-amber-600 font-bold text-[10px] uppercase">Half Days</p>
                  <p className="font-black text-amber-700 text-sm mt-0.5">{payslipData.halfDays ?? 0}</p>
                </div>
                <div className="bg-white p-2 rounded border border-blue-100 shadow-2xs">
                  <p className="text-purple-600 font-bold text-[10px] uppercase">Leave Days</p>
                  <p className="font-black text-purple-700 text-sm mt-0.5">{payslipData.leaveDays ?? 0}</p>
                </div>
                <div className="bg-white p-2 rounded border border-blue-100 shadow-2xs">
                  <p className="text-emerald-600 font-bold text-[10px] uppercase">Paid Days</p>
                  <p className="font-black text-emerald-800 text-sm mt-0.5">{payslipData.paidEquivalentDays ?? (payslipData.presentDays || 0)}</p>
                </div>
              </div>
            </div>

            {/* Section 3 & 4: Earnings & Deductions Breakdown */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              
              {/* Earnings */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                <h3 className="text-sm font-black text-gray-900 border-b-2 border-green-600 pb-2 mb-3 uppercase tracking-wider flex justify-between items-center">
                  <span>Earnings</span>
                  <span className="text-xs text-green-700 font-normal">Amount</span>
                </h3>
                <div className="space-y-2.5 font-mono text-xs">
                  <p className="flex justify-between">
                    <span className="text-gray-600">Basic Salary</span>
                    <span className="font-bold text-gray-900">Rs. {Number(payslipData.basicSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Medical Allowance</span>
                    <span className="font-bold text-gray-900">Rs. {Number(payslipData.medicalAllowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Transport Allowance</span>
                    <span className="font-bold text-gray-900">Rs. {Number(payslipData.transportAllowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-gray-300 flex justify-between font-bold text-sm text-green-800 bg-green-50 p-2 rounded">
                  <span>Gross Salary</span>
                  <span className="font-mono">Rs. {Number(payslipData.grossSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                <h3 className="text-sm font-black text-gray-900 border-b-2 border-red-600 pb-2 mb-3 uppercase tracking-wider flex justify-between items-center">
                  <span>Deductions</span>
                  <span className="text-xs text-red-700 font-normal">Amount</span>
                </h3>
                <div className="space-y-2.5 font-mono text-xs">
                  <p className="flex justify-between">
                    <span className="text-gray-600">Attendance Deduction</span>
                    <span className="font-bold text-red-600">Rs. {Number(payslipData.attendanceDeduction || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Other Deductions</span>
                    <span className="font-bold text-red-600">Rs. {Number(payslipData.otherDeductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-gray-300 flex justify-between font-bold text-sm text-red-800 bg-red-50 p-2 rounded">
                  <span>Total Deductions</span>
                  <span className="font-mono">Rs. {Number(payslipData.totalDeductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

            </div>

            {/* Section 5: Highlighted NET SALARY */}
            <div className="bg-indigo-950 text-white rounded-xl p-6 flex items-center justify-between shadow-md print:shadow-none print:border-2 print:border-black print:bg-white print:text-black mb-8">
              <div>
                <p className="text-indigo-200 font-bold uppercase tracking-wider text-xs print:text-gray-600">Net Payable Amount</p>
                <p className="text-[11px] text-indigo-300 mt-0.5 print:text-gray-500 font-mono">
                  Payslip ID: {payslipData.id || payslipData.payslipNumber || `${payslipData.staffId}-${payslipData.period}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black font-mono tracking-tight text-emerald-400 print:text-black">
                  Rs. {Number(payslipData.netSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Metadata & Signatures */}
            <div className="grid grid-cols-2 gap-8 text-xs font-medium text-gray-500 border-t border-gray-200 pt-4 mb-12">
              <div>
                <p><span className="font-bold text-gray-700">Processed Date:</span> {payslipData.processedAt ? new Date(payslipData.processedAt).toLocaleString() : '—'}</p>
              </div>
              <div className="text-right">
                <p><span className="font-bold text-gray-700">Processed By:</span> <span className="font-mono">{payslipData.createdBy || payslipData.processedBy || 'School Administrator'}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
              <div>
                <div className="w-56 border-b-2 border-gray-400 mx-auto mb-2"></div>
                School Administrator Signature
              </div>
              <div>
                <div className="w-56 border-b-2 border-gray-400 mx-auto mb-2"></div>
                Staff Member Signature
              </div>
            </div>

            <div className="mt-10 text-center text-[10px] text-gray-400 print:text-gray-500">
              <p>Computer-generated official payslip record. No manual alterations permitted.</p>
              <p>TaleemiDunya-Pro AI HR Engine.</p>
            </div>

          </div>
        )}
      </div>

      {/* Print Specific CSS Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #payslip-printable-area, #payslip-printable-area * {
            visibility: visible !important;
          }
          #payslip-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
};

export default PayslipModal;
