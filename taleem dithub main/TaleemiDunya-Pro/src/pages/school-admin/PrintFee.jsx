import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getSingleRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { Printer, ArrowLeft, Download, Scissors } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const PrintFee = () => {
 const { type, id } = useParams();
 const navigate = useNavigate();
 const location = useLocation();
 const { userData } = useAuth();
 const [records, setRecords] = useState([]);
 const [schoolData, setSchoolData] = useState(null);
 const [downloading, setDownloading] = useState(false);
 const [logoBase64, setLogoBase64] = useState(null);

 useEffect(() => {
 if (schoolData?.logo) {
 const fetchLogo = async () => {
 try {
 if (schoolData.logo.startsWith('data:image')) {
 setLogoBase64(schoolData.logo);
 return;
 }
 let res;
 try {
 res = await fetch(`${schoolData.logo}?t=${new Date().getTime()}`, { mode: 'cors' });
 } catch(err) {
 res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(schoolData.logo)}`);
 }
 const blob = await res.blob();
 const reader = new FileReader();
 reader.onloadend = () => setLogoBase64(reader.result);
 reader.readAsDataURL(blob);
 } catch (e) {
 console.error("Failed to load logo base64:", e);
 }
 };
 fetchLogo();
 }
 }, [schoolData?.logo]);

 useEffect(() => {
 const fetchData = async () => {
 try {
 const collectionName = type === 'voucher' ? 'vouchers' : 'vouchers';
 
 if (id === 'bulk') {
 const isBlankMode = location.state?.blankMode;
 if (isBlankMode) {
 const count = location.state?.count || 1;
 // Generate dummy blank records
 const dummyRecords = Array(count).fill({
 _isBlank: true,
 status: 'Unpaid',
 month: new Date().toISOString().slice(0, 7),
 studentName: '',
 class: '',
 fatherName: '',
 totalAmount: 0,
 feeItems: [],
 childrenDetails: [
 { name: '', class: '', admNo: '', fee: 0, arrears: 0 }
 ]
 });
 setRecords(dummyRecords);
 return; // Skip fetching from DB
 }
 const voucherIds = location.state?.voucherIds || [];
 if (voucherIds.length > 0) {
 const docs = await Promise.all(voucherIds.map(vid => getSingleRecord(collectionName, vid)));
 setRecords(docs.filter(Boolean));
 }
 } else {
 const doc = await getSingleRecord(collectionName, id);
 if (doc) setRecords([doc]);
 }

 if (userData?.schoolId) {
 const school = await getSingleRecord('schools', userData.schoolId);
 setSchoolData(school);
 }
 } catch (err) {
 console.error(err);
 }
 };
 fetchData();
 }, [id, type, userData]);

 useEffect(() => {
 if (records.length > 0) {
 // Auto-trigger print when data is loaded, optionally
 // setTimeout(() => window.print(), 500);
 }
 }, [records]);

 if (records.length === 0) return <div className="p-10 text-center">Loading...</div>;

 // Chunk records into pages (2 records per A4 page)
 const pages = [];
 for (let i = 0; i < records.length; i += 2) {
 pages.push(records.slice(i, i + 2));
 }

 const handleDownloadPDF = async () => {
 setDownloading(true);
 try {
 const pdf = new jsPDF('p', 'mm', 'a4');
 const elements = document.querySelectorAll('.pdf-page');

 for (let i = 0; i < elements.length; i++) {
 const el = elements[i];
 // Temporarily hide borders or shadows if needed, but styling should handle it
 const canvas = await html2canvas(el, { scale: 2, useCORS: true });
 const imgData = canvas.toDataURL('image/jpeg', 1.0);
 
 if (i > 0) pdf.addPage();
 pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
 }
 
 const fileName = id === 'bulk' ? `School_Vouchers_Bulk.pdf` : `${type}_${id.slice(-6)}.pdf`;
 pdf.save(fileName);
 } catch (error) {
 console.error('Error generating PDF:', error);
 alert('Note: Built-in PDF generator encountered a security block (usually due to logo CORS).\n\nOpening native Print dialog instead. Please select "Save as PDF" as your printer destination.');
 window.print();
 } finally {
 setDownloading(false);
 }
 };

 const VoucherBox = ({ copyType, record, recordId }) => {
 const isFamily = record.selectionType === 'family' || record.childrenDetails?.length > 0;
 const childCount = record.childrenDetails ? record.childrenDetails.length : (record.childrenIds?.length || 1);

 const formatMonthName = (mStr) => {
   if(!mStr || !mStr.includes('-')) return mStr || '-';
   try {
     const [yyyy, mm] = mStr.split('-');
     return new Date(yyyy, mm-1).toLocaleString('default', {month:'long', year:'numeric'});
   } catch { return mStr; }
 };
  const formatDateTime = (ts) => {
    if(!ts) return '-';
    let d;
    if (ts && typeof ts.toDate === 'function') {
      d = ts.toDate();
    } else if (ts && typeof ts === 'object' && ts.seconds) {
      d = new Date(ts.seconds * 1000);
    } else {
      d = new Date(ts);
    }
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-US', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true});
  };

 return (
 <div className="p-4 border border-gray-300 h-full text-[11px] bg-white relative flex flex-col overflow-hidden" style={{ fontFamily: 'Arial, sans-serif', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
 
 {/* Paid Watermark */}
 {(record.status === 'Paid' || record.status === 'Partial') && (
 <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-[60px] font-black opacity-10 pointer-events-none z-0 ${record.status === 'Paid' ? 'text-green-600' : 'text-orange-500'}`}>
 {record.status === 'Paid' ? 'PAID' : 'PARTIAL'}
 </div>
 )}
 
 {/* Header */}
 <div className="flex items-start justify-between border-b border-black pb-2 mb-2">
 {/* Logo Placeholder (Left) */}
 <div className="w-16 h-16 flex items-center justify-center shrink-0 relative">
 {logoBase64 ? (
 <img src={logoBase64} alt="Logo" className="w-full h-full object-contain" />
 ) : (
 <div className="w-12 h-12 border border-gray-400 rounded-full flex items-center justify-center text-[8px] font-bold text-center text-gray-500 leading-tight">School<br/>Logo</div>
 )}
 </div>
 
 {/* School Name & Info (Right side) */}
 <div className="flex-1 ml-4">
 <h1 className="text-[16px] font-bold text-black leading-tight mb-1">{
 (() => {
 let name = schoolData?.name || schoolData?.schoolName || userData?.schoolName || userData?.name || 'Smart Angels Grammar School';
 if (name.toUpperCase() === 'TALEEMI DUNYA SCHOOL' || name === 'Lodhi School System') {
 name = userData?.schoolName || userData?.name || 'Smart Angels Grammar School';
 }
 return name;
 })()
 }</h1>
 <p className="text-[12px] text-gray-800 leading-tight mb-1">{schoolData?.branchName || 'Main'}</p>
 <div className="flex justify-between items-end mt-2 text-[12px] font-bold">
 <span className="uppercase">{copyType}</span>
 <span>{type === 'voucher' ? 'Voucher' : 'Challan'} #{record.voucherNo || String(recordId || '').slice(-6).toUpperCase()}</span>
 </div>
 </div>
 </div>

 {/* Info Block */}
 <div className="grid grid-cols-[100px_1fr] gap-y-0.5 mb-3 font-semibold text-[12px]">
 <div>Month</div>
 <div>{formatMonthName(record.month)}</div>

 <div>Date/Time</div>
 <div>{formatDateTime(record.createdAt || Date.now())}</div>

 <div>DueDate</div>
 <div>{record.dueDate || 'N/A'}</div>

 <div>Ft. Name</div>
 <div className="truncate">{record.fatherName || record.studentName || 'N/A'}</div>

 {isFamily && (
 <>
 <div>No Of child</div>
 <div>{childCount}</div>
 </>
 )}

 <div>NIC</div>
 <div>{record.fatherCnic || 'N/A'}</div>
 </div>

 {/* Items Table - Single unified design */}
 <table className="w-full text-left border-collapse mb-2 border border-gray-400">
 <thead>
 <tr className="bg-gray-500 text-white text-[11px]">
 <th className="py-1 px-1 border-r border-gray-400 w-12 font-bold text-center">Adm#</th>
 <th className="py-1 px-1 border-r border-gray-400 font-bold">Name</th>
 <th className="py-1 px-1 border-r border-gray-400 w-12 font-bold text-center">Class</th>
 <th className="py-1 px-1 font-bold text-right pr-2">Amount</th>
 </tr>
 </thead>
          <tbody>
            {(() => {
              let renderDetails = record.childrenDetails ? [...record.childrenDetails] : [];
              let isOldFormat = false;

              // Parse old vouchers if they lack childrenDetails
              if (renderDetails.length === 0) {
                isOldFormat = true;
                (record.feeItems || []).forEach(item => {
                  const match = item.name.match(/Tuition Fee - (.*?) \((.*?)\)/);
                  if (match) {
                    renderDetails.push({ admNo: '-', name: match[1].trim(), class: match[2].trim(), _oldItemAmount: item.amount });
                  }
                });
              }

              // Extract categorized fee items
              const allFeeItems = Array.isArray(record.feeItems) ? record.feeItems : [];
              
              const annualFundItems = allFeeItems.filter(f => 
                String(f.name || '').toLowerCase().includes('annual')
              );
              const totalAnnualFund = annualFundItems.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

              const arrearsItems = allFeeItems.filter(f => {
                const n = String(f.name || '').toLowerCase();
                return n.includes('arrear') || n.includes('previous') || n.includes('balance') || n.includes('baqaya') || n.includes('opening');
              });
              const totalArrears = arrearsItems.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

              const otherItems = allFeeItems.filter(f => {
                const n = String(f.name || '').toLowerCase();
                if (n.includes('tuition')) return false;
                if (n.includes('annual')) return false;
                if (n.includes('arrear') || n.includes('previous') || n.includes('balance') || n.includes('baqaya') || n.includes('opening')) return false;
                // If it's a child specific tuition fee not caught by 'tuition'
                if (renderDetails.some(c => c.name && n.includes(c.name.toLowerCase()))) return false;
                return true;
              });

              return (
                <>
                  {/* Children Tuition Rows */}
                  {renderDetails.length > 0 ? renderDetails.map((child, idx) => {
                    let feeAmt = Number(child.fee || child.feeAmount || child.totalFee || child.amount || (child._oldItemAmount ? child._oldItemAmount : 0));
                    if (!feeAmt && allFeeItems.length > 0) {
                      if (renderDetails.length === 1) {
                        feeAmt = allFeeItems
                          .filter(f => {
                            const n = String(f.name || '').toLowerCase();
                            return !n.includes('arrear') && !n.includes('previous') && !n.includes('balance') && !n.includes('annual') && !n.includes('discount');
                          })
                          .reduce((s, f) => s + (Number(f.amount) || 0), 0);
                      } else {
                        const item = allFeeItems.find(f => {
                          const n = String(f.name || '').toLowerCase();
                          return child.name && n.includes(child.name.toLowerCase()) && !n.includes('arrear') && !n.includes('annual');
                        });
                        if (item) feeAmt = Number(item.amount);
                      }
                    }

                    return (
                      <tr key={idx} className="border-b border-gray-400">
                        <td className="py-1 px-1 border-r border-gray-400 align-top text-center font-semibold">
                          <div className="truncate w-full max-w-[40px] overflow-hidden inline-block" title={child.admNo}>
                            {child.admNo?.length > 10 ? '-' : (child.admNo || '-')}
                          </div>
                        </td>
                        <td className="py-1 px-1 border-r border-gray-400 align-top font-semibold">{child.name}</td>
                        <td className="py-1 px-1 border-r border-gray-400 align-top text-center font-semibold">{child.class}</td>
                        <td className="py-1 px-2 align-top text-right font-semibold">
                          {Number(feeAmt) > 0 ? Number(feeAmt).toLocaleString() : 0}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr className="border-b border-gray-400">
                      <td className="py-1 px-1 border-r border-gray-400 align-top text-center font-semibold">-</td>
                      <td className="py-1 px-1 border-r border-gray-400 align-top font-semibold">{record.studentName || record.fatherName || '-'}</td>
                      <td className="py-1 px-1 border-r border-gray-400 align-top text-center font-semibold">{record.class || '-'}</td>
                      <td className="py-1 px-2 align-top text-right font-semibold">
                        {record.totalAmount > 0 ? Number(record.totalAmount).toLocaleString() : 0}
                      </td>
                    </tr>
                  )}

                  {/* Annual Fund Row */}
                  {totalAnnualFund > 0 && (
                    <tr className="border-b border-gray-400 bg-sky-50/50">
                      <td colSpan="3" className="py-1 px-2 border-r border-gray-400 align-top text-right font-bold text-sky-900">
                        Annual Fund {annualFundItems.length > 1 ? `(${annualFundItems.length}x)` : ''}
                      </td>
                      <td className="py-1 px-2 align-top text-right font-bold text-sky-900">
                        {totalAnnualFund.toLocaleString()}
                      </td>
                    </tr>
                  )}

                  {/* Previous Balance (Arrears) Row */}
                  {totalArrears > 0 && (
                    <tr className="border-b border-gray-400 bg-rose-50/60">
                      <td colSpan="3" className="py-1 px-2 border-r border-gray-400 align-top text-right font-bold text-rose-700">
                        Previous Balance / Arrears (پرانا بقایا)
                      </td>
                      <td className="py-1 px-2 align-top text-right font-bold text-rose-700">
                        {totalArrears.toLocaleString()}
                      </td>
                    </tr>
                  )}

                  {/* Extra fee items & Discounts */}
                  {otherItems.map((item, idx) => (
                    <tr key={'extra-' + idx} className="border-b border-gray-400 bg-gray-50">
                      <td colSpan="3" className="py-1 px-2 border-r border-gray-400 align-top text-right font-bold text-gray-700">
                        {item.name}
                      </td>
                      <td className={`py-1 px-2 align-top text-right font-bold ${Number(item.amount) < 0 ? 'text-green-700' : 'text-gray-800'}`}>
                        {Number(item.amount) < 0 ? `-PKR ${Math.abs(Number(item.amount)).toLocaleString()}` : Number(item.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </>
              );
            })()}
          </tbody>
 </table>

 {/* Total block */}
 <div className="flex justify-end mt-auto bg-gray-200 border-t border-b border-gray-400 flex-col">
 <div className="flex w-full border-b border-gray-300">
 <div className="flex-1 text-right font-bold text-[12px] py-1 px-2 border-r border-gray-400">Total Payable</div>
 <div className="w-[72px] text-right font-black text-[12px] py-1 px-1">{Number(record.totalAmount).toLocaleString()}</div>
 </div>
 
 {/* Paid Status & Amount Received */}
 {(record.status === 'Paid' || record.status === 'Partial') && (
 <>
 <div className="flex w-full bg-gray-100">
 <div className="flex-1 text-right font-bold text-[11px] py-1 px-2 border-r border-gray-400 text-gray-700">Amount Received</div>
 <div className="w-[72px] text-right font-bold text-[11px] py-1 px-1 text-gray-700">{Number(record.amountReceived || 0).toLocaleString()}</div>
 </div>
 {record.status === 'Partial' && (
 <div className="flex w-full bg-orange-50">
 <div className="flex-1 text-right font-bold text-[11px] py-1 px-2 border-r border-gray-400 text-red-600">Remaining Arrears</div>
 <div className="w-[72px] text-right font-bold text-[11px] py-1 px-1 text-red-600">{(Number(record.totalAmount) - Number(record.amountReceived || 0)).toLocaleString()}</div>
 </div>
 )}
 <div className="w-full text-center py-1 mt-1 bg-green-100 text-green-700 font-bold text-[9px] border-t border-gray-400">
 RECEIVED ON: {new Date(record.paidAt).toLocaleDateString('en-GB')}
 </div>
 </>
 )}
 </div>
 
 </div>
 );
 };

 return (
 <div className="bg-gray-100 min-h-screen text-black pb-10">
 {/* Hide controls when printing */}
 <div className="print:hidden p-4 bg-white border-b flex justify-between items-center mb-6 shadow-sm sticky top-0 z-50">
 <button onClick={() => navigate('/school-admin/fees')} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg flex items-center gap-2 font-semibold">
 <ArrowLeft size={18} /> Back
 </button>
 <div className="flex gap-4">
 <button 
 onClick={handleDownloadPDF} 
 disabled={downloading}
 className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 font-bold shadow-md transition-colors ${downloading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
 >
 {downloading ? (
 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
 ) : (
 <Download size={18} />
 )}
 {downloading ? 'Generating PDF...' : 'Download PDF'}
 </button>
 <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-bold shadow-md hover:bg-indigo-700 transition-colors">
 <Printer size={18} /> Print Now
 </button>
 </div>
 </div>

 <style>{`
 @media print {
 @page { size: A4 portrait; margin: 0; }
 body, html, .bg-dark-bg, .bg-dark-card, .bg-gray-100, .bg-white, .bg-gray-200, .bg-gray-300, .bg-primary-500, .bg-primary-400 {
 background: white !important;
 color: black !important;
 }
 .pdf-page, .pdf-page * {
 background: white !important;
 color: black !important;
 -webkit-print-color-adjust: exact;
 print-color-adjust: exact;
 }
 .text-dark-text, .text-dark-muted, .text-white, .text-primary-500, .text-primary-400, .text-gray-800, .text-gray-700 {
 color: black !important;
 }
 }
`}</style>

 {/* Printable Area - Designed for A4 2x2 grid (2 students per page) */}
 {pages.map((page, pageIndex) => (
 <div key={pageIndex} className="pdf-page mx-auto bg-white print:m-0 print:shadow-none shadow-lg w-[210mm] h-[297mm] overflow-hidden box-border relative print:break-after-page mb-8">
 
 {/* Vertical Cutting Line (Center X) */}
 <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-6 z-10 flex flex-col justify-between py-10 items-center">
 {/* The actual dashed line, perfectly centered */}
 <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-gray-400 w-0 z-0"></div>
 {/* Scissors on top of the line */}
 <Scissors size={20} className="text-gray-400 rotate-90 bg-white z-10 py-1" />
 <Scissors size={20} className="text-gray-400 rotate-90 bg-white z-10 py-1" />
 <Scissors size={20} className="text-gray-400 rotate-90 bg-white z-10 py-1" />
 <Scissors size={20} className="text-gray-400 rotate-90 bg-white z-10 py-1" />
 </div>

 {/* Horizontal Cutting Line (Center Y) */}
 <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-6 z-10 flex justify-between px-10 items-center">
 {/* The actual dashed line, perfectly centered */}
 <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-gray-400 h-0 z-0"></div>
 {/* Scissors on top of the line */}
 <Scissors size={20} className="text-gray-400 bg-white z-10 px-1" />
 <Scissors size={20} className="text-gray-400 bg-white z-10 px-1" />
 <Scissors size={20} className="text-gray-400 bg-white z-10 px-1" />
 </div>

 <div className="grid grid-cols-2 grid-rows-2 w-full h-full relative">
 
 {/* Top Left: Student 1 School Copy */}
 <div className="w-full h-full overflow-hidden p-[5mm]">
 <VoucherBox copyType="SCHOOL COPY" record={page[0]} recordId={page[0].id} />
 </div>
 
 {/* Top Right: Student 1 Parent Copy */}
 <div className="w-full h-full overflow-hidden p-[5mm]">
 <VoucherBox copyType="PARENT COPY" record={page[0]} recordId={page[0].id} />
 </div>
 
 {/* Bottom Left: Student 2 School Copy (if exists) */}
 <div className={`w-full h-full overflow-hidden p-[5mm] ${!page[1] ? 'opacity-30' : ''}`}>
 {page[1] ? (
 <VoucherBox copyType="SCHOOL COPY" record={page[1]} recordId={page[1].id} />
 ) : (
 <div className="w-full h-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
 Box 3 (Empty / Next Student)
 </div>
 )}
 </div>
 
 {/* Bottom Right: Student 2 Parent Copy (if exists) */}
 <div className={`w-full h-full overflow-hidden p-[5mm] ${!page[1] ? 'opacity-30' : ''}`}>
 {page[1] ? (
 <VoucherBox copyType="PARENT COPY" record={page[1]} recordId={page[1].id} />
 ) : (
 <div className="w-full h-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
 Box 4 (Empty / Next Student)
 </div>
 )}
 </div>

 </div>
 </div>
 ))}
 </div>
 );
};

export default PrintFee;

