import React, { useState } from 'react';
import { Landmark, Printer, X, Download, FileText, Send } from 'lucide-react';
import { formatPeriod } from '../../utils/payrollUtils';
import { useSchool } from '../../context/SchoolContext';
import BulkPayslipWhatsAppModal from './BulkPayslipWhatsAppModal';

const BatchPayslipModal = ({ batchData, schoolData: propsSchoolData, userData: propsUserData, onClose }) => {
  const { schoolData: contextSchoolData } = useSchool();
  const [showBulkWhatsApp, setShowBulkWhatsApp] = useState(false);
  if (!batchData || batchData.length === 0) return null;

  const finalSchoolData = contextSchoolData || propsSchoolData || {};
  const finalUserData = propsUserData || {};

  const schoolName = finalSchoolData?.name || finalUserData?.schoolName || 'School Name';
  const schoolAddress = finalSchoolData?.address || finalUserData?.schoolAddress || 'School Campus Address';
  const schoolPhone = finalSchoolData?.phone || finalUserData?.schoolPhone || '';
  const schoolEmail = finalSchoolData?.email || finalUserData?.schoolEmail || '';
  const schoolLogo = finalSchoolData?.logo || finalUserData?.schoolLogo || null;
  const adminRule = finalSchoolData?.signatureSettings?.rules?.find(r => r.type === 'Admin');
  const adminSignatureUrl = adminRule?.signatureUrl || null;
  const principalRule = finalSchoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal');
  const principalSignatureUrl = finalSchoolData?.signatureSettings?.principalSignatureUrl || principalRule?.signatureUrl || null;

  const handlePrint = () => {
    const printContent = document.getElementById('batch-payslip-printable-area');
    if (!printContent) return;

    // Remove any existing print iframe
    const oldFrame = document.getElementById('batch-payslip-print-iframe');
    if (oldFrame) oldFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'batch-payslip-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;

    // Gather styles with absolute URLs so about:blank never fails loading styles
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => {
        if (el.tagName.toLowerCase() === 'link' && el.href) {
          return `<link rel="stylesheet" href="${el.href}">`;
        }
        return el.outerHTML;
      })
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${window.location.origin}/">
          <title>Batch Salary Slips - TaleemiDunya</title>
          ${styles}
          <style>
            @page { 
              size: A4 portrait; 
              margin: 0mm; 
            }
            html, body { 
              margin: 0 !important; 
              padding: 0 !important;
              background-color: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
            }
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
              margin: 0 auto !important;
              box-shadow: none !important;
              width: 210mm !important;
              height: 297mm !important;
              box-sizing: border-box !important;
              padding: 10mm !important;
            }
            .payslip-card {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body class="bg-white m-0 p-0">
          <div id="batch-payslip-printable-area" class="bg-white text-black">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Give iframe time to layout CSS and images before triggering print
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error("Print iframe error, fallback to window.print():", err);
        window.print();
      }
    }, 700);
  };

  // Split into chunks of 4 for pagination
  const chunks = [];
  for (let i = 0; i < batchData.length; i += 4) {
    chunks.push(batchData.slice(i, i + 4));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:static print:h-auto bg-black/70 backdrop-blur-md print:bg-transparent print:backdrop-blur-none animate-fade-in overflow-y-auto">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl print:shadow-none print:border-0 print:rounded-none my-8 print:my-0">
        
        {/* Modal Top Bar - Hidden when printing */}
        <div className="p-4 bg-dark-bg border-b border-dark-border flex justify-between items-center print:hidden">
          <h3 className="font-bold text-dark-text flex items-center gap-2">
            <FileText className="text-blue-500" size={20} />
            Batch Print: {batchData.length} Slips for {formatPeriod(batchData[0].period || batchData[0].month)}
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowBulkWhatsApp(true)} 
              className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-sm" 
              title="Bulk WhatsApp all salary slips directly to staff"
            >
              <Send size={14} /> WhatsApp All Slips ({batchData.length})
            </button>
            <button 
              onClick={handlePrint} 
              className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5" 
              title="Print All"
            >
              <Printer size={15} /> Print All Slips
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 bg-dark-card border border-dark-border text-dark-muted hover:text-red-400 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Bulk WhatsApp Modal */}
        {showBulkWhatsApp && (
          <BulkPayslipWhatsAppModal
            isOpen={showBulkWhatsApp}
            onClose={() => setShowBulkWhatsApp(false)}
            batchData={batchData}
            schoolData={finalSchoolData}
            userData={finalUserData}
          />
        )}

        {/* Batch Print Area */}
        <div id="batch-payslip-printable-area" className="print:p-0 bg-gray-100 print:bg-white overflow-auto max-h-[80vh] print:max-h-none">
          {chunks.map((chunk, pageIndex) => (
            <div key={pageIndex} className="page-break bg-white mx-auto my-8 print:my-0 shadow-lg print:shadow-none w-[210mm] h-[297mm] box-border p-[10mm] flex flex-col justify-between">
              <div className="grid grid-cols-2 grid-rows-2 gap-[10mm] h-full">
                {chunk.map((payslipData, index) => (
                  <div key={payslipData.id || index} className="payslip-card border-2 border-gray-800 rounded-xl p-3 flex flex-col overflow-hidden bg-white text-black h-full">
                    
                    {/* Compact Header */}
                    <div className="flex justify-between items-start border-b border-gray-400 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        {schoolLogo ? (
                          <img src={schoolLogo} alt="School Logo" className="w-8 h-8 object-contain" />
                        ) : (
                          <Landmark size={14} className="text-indigo-800" />
                        )}
                        <div>
                          <h1 className="text-[11px] font-black text-indigo-950">
                            {schoolName}
                          </h1>
                          <p className="text-[9px] text-gray-600 leading-tight mt-0.5 w-[140px] truncate">{schoolAddress}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <h2 className="text-[10px] font-black uppercase tracking-wider">Payslip</h2>
                        <span className="text-[9px] font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 mt-1 inline-block">
                          {formatPeriod(payslipData.period || payslipData.month)}
                        </span>
                      </div>
                    </div>

                    {/* Employee Info */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] mb-2">
                      <p><span className="text-gray-500">Name:</span> <span className="font-bold">{payslipData.staffName}</span></p>
                      <p><span className="text-gray-500">ID:</span> <span className="font-bold">{payslipData.staffIdCode || payslipData.staffId?.slice(0,6)}</span></p>
                      <p><span className="text-gray-500">Role:</span> <span className="font-bold truncate block">{payslipData.staffRole}</span></p>
                      <p><span className="text-gray-500">Dept:</span> <span className="font-bold truncate block">{payslipData.staffDepartment}</span></p>
                    </div>

                    {/* Attendance Grid */}
                    <div className="grid grid-cols-6 gap-1 text-center font-mono text-[8px] mb-2 bg-gray-50 border border-gray-200 rounded p-1">
                      <div><p className="text-gray-500">Work</p><p className="font-bold">{payslipData.totalWorkingDays ?? 26}</p></div>
                      <div><p className="text-green-600">Pres</p><p className="font-bold">{payslipData.presentDays ?? 0}</p></div>
                      <div><p className="text-red-600">Abs</p><p className="font-bold">{payslipData.absentDays ?? 0}</p></div>
                      <div><p className="text-amber-600">Half</p><p className="font-bold">{payslipData.halfDays ?? 0}</p></div>
                      <div><p className="text-purple-600">Leav</p><p className="font-bold">{payslipData.leaveDays ?? 0}</p></div>
                      <div><p className="text-emerald-600">Paid</p><p className="font-bold">{payslipData.paidEquivalentDays ?? (payslipData.presentDays || 0)}</p></div>
                    </div>

                    {/* Financials side by side */}
                    <div className="flex gap-2 mb-2 flex-grow">
                      <div className="flex-1 bg-green-50/50 p-1.5 rounded border border-green-100">
                        <h4 className="text-[8px] font-bold text-green-800 uppercase border-b border-green-200 pb-0.5 mb-1">Earnings</h4>
                        <div className="space-y-0.5 text-[8px] font-mono">
                          <p className="flex justify-between"><span>Basic</span> <span className="font-bold">{Number(payslipData.basicSalary || 0).toLocaleString()}</span></p>
                          <p className="flex justify-between"><span>Medical</span> <span className="font-bold">{Number(payslipData.medicalAllowance || 0).toLocaleString()}</span></p>
                          <p className="flex justify-between"><span>Trans.</span> <span className="font-bold">{Number(payslipData.transportAllowance || 0).toLocaleString()}</span></p>
                          <div className="border-t border-green-200 mt-1 pt-0.5 flex justify-between font-bold">
                            <span>Gross</span> <span>{Number(payslipData.grossSalary || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 bg-red-50/50 p-1.5 rounded border border-red-100">
                        <h4 className="text-[8px] font-bold text-red-800 uppercase border-b border-red-200 pb-0.5 mb-1">Deductions</h4>
                        <div className="space-y-0.5 text-[8px] font-mono">
                          <p className="flex justify-between"><span>Att. Ded</span> <span className="font-bold">{Number(payslipData.attendanceDeduction || 0).toLocaleString()}</span></p>
                          <p className="flex justify-between"><span>Other</span> <span className="font-bold">{Number(payslipData.otherDeductions || 0).toLocaleString()}</span></p>
                          <div className="border-t border-red-200 mt-1 pt-0.5 flex justify-between font-bold">
                            <span>Total</span> <span>{Number(payslipData.totalDeductions || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Net Salary Highlight */}
                    <div className="bg-indigo-950 text-white rounded p-2 flex justify-between items-center mb-1">
                      <p className="text-[9px] uppercase tracking-wide font-bold">Net Pay</p>
                      <p className="text-sm font-black font-mono text-emerald-400">
                        Rs. {Number(payslipData.netSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Signatures */}
                    <div className="mt-auto pt-2 grid grid-cols-2 gap-4 text-center text-[7px] text-gray-500 font-bold uppercase">
                      <div className="flex flex-col items-center justify-end">
                        {adminSignatureUrl ? (
                          <img src={adminSignatureUrl} alt="Admin Signature" className="h-24 object-contain -mb-1 opacity-90 mix-blend-multiply" />
                        ) : (
                          <div className="h-5" />
                        )}
                        <div className="border-b border-gray-400 w-full mb-1"></div>
                        Admin
                      </div>
                      <div className="flex flex-col items-center justify-end">
                        {principalSignatureUrl ? (
                          <img src={principalSignatureUrl} alt="Principal Signature" className="h-24 max-w-[200px] scale-125 origin-bottom origin-bottom mix-blend-multiply object-contain -mb-1 opacity-90" />
                        ) : (
                          <div className="h-5" />
                        )}
                        <div className="border-b border-gray-400 w-full mb-1"></div>
                        Principal
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* In-window Print Support for Ctrl+P */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #batch-payslip-printable-area, #batch-payslip-printable-area * {
            visibility: visible;
          }
          #batch-payslip-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default BatchPayslipModal;
