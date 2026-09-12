const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../src/pages/school-admin/CollectFee.jsx');
let content = fs.readFileSync(targetPath, 'utf8');

const step2Start = content.indexOf('{/* ── Step 2: Fee Details & Payment ── */}');
const step3Start = content.indexOf('{/* ── Step 3: Success Screen ── */}');

if (step2Start === -1 || step3Start === -1) {
    console.error('Could not find step 2 or step 3 markers');
    process.exit(1);
}

const newStep2 = `{/* ── Step 2: Fee Details & Payment ── */}
      {step === 2 && selectedFamily && (
        <div className="space-y-6 animate-fade-in">
          {/* Dashboard Header */}
          <GlassCard className="p-0 border border-dark-border/50 relative overflow-hidden">
            <div className="p-6 border-b border-dark-border/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-dark-card border border-dark-border flex items-center justify-center text-white font-black text-xl">
                  {(selectedFamily.fatherName || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{selectedFamily.fatherName}</h2>
                  <p className="text-xs text-dark-muted font-bold flex items-center gap-2">
                    Family Financial Dashboard 
                    {selectedFamily.phone && <span>• {selectedFamily.phone}</span>}
                  </p>
                </div>
              </div>
              <button onClick={resetSearch} className="w-8 h-8 rounded-full bg-dark-card border border-dark-border flex items-center justify-center hover:bg-dark-hover transition-colors">
                <X size={16} className="text-dark-muted" />
              </button>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-dark-bg/50">
              {(() => {
                const familyVouchers = allVouchers.filter(v => 
                  v.fatherName === selectedFamily.fatherName || 
                  familyStudents.some(s => s.id === v.studentId || v.childrenIds?.includes(s.id)) ||
                  (v.selectionType === 'family' && v.childrenDetails?.some(c => familyStudents.some(s => String(s.rollNumber || s.rollNo) === String(c.admNo))))
                );
                const lifetimeBilled = familyVouchers.reduce((sum, v) => sum + (Number(v.totalAmount) || 0), 0);
                const lifetimePaid = familyVouchers.reduce((sum, v) => sum + (Number(v.paidAmount) || 0) + (Number(v.discountAmount) || 0), 0);
                const arrears = Math.max(0, lifetimeBilled - lifetimePaid);
                return (
                  <>
                    <div className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><Receipt size={24} /></div>
                      <div>
                        <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">LIFETIME BILLED</p>
                        <p className="text-xl font-black text-white">Rs. {lifetimeBilled.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><CheckCircle size={24} /></div>
                      <div>
                        <p className="text-[10px] font-black text-dark-muted uppercase tracking-widest">LIFETIME PAID</p>
                        <p className="text-xl font-black text-emerald-400">Rs. {lifetimePaid.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center gap-4 border-rose-500/20">
                      <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center"><DollarSign size={24} /></div>
                      <div>
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">REMAINING ARREARS</p>
                        <p className="text-xl font-black text-rose-500">Rs. {arrears.toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </GlassCard>

          {/* Enrolled Students */}
          <div>
            <h3 className="text-xs font-black text-dark-muted uppercase tracking-widest mb-3">ENROLLED STUDENTS</h3>
            <div className="flex flex-wrap gap-4">
              {familyStudents.map((stud) => {
                 const gr = stud.admissionNumber || stud.rollNo || stud.grNo || stud.grNumber || stud.rollNumber || 'N/A';
                 return (
                   <div key={stud.id} className="bg-dark-card border border-dark-border rounded-xl p-3 pr-8 flex items-center gap-4 min-w-[200px]">
                     <div className="w-10 h-10 rounded-lg bg-dark-hover flex items-center justify-center font-black text-white">
                       {stud.name.charAt(0)}
                     </div>
                     <div>
                       <p className="font-bold text-white text-sm">{stud.name}</p>
                       <p className="text-[10px] text-dark-muted font-bold">Class {stud.class} • GR: {gr}</p>
                     </div>
                   </div>
                 );
              })}
            </div>
          </div>

          {/* Pending Dues Breakdown */}
          {pendingVouchers.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-rose-400 flex items-center gap-2 mb-3">
                <DollarSign size={14} /> Pending Dues Breakdown & Quick Pay
              </h3>
              <div className="space-y-4">
                {pendingVouchers.map((voucher) => {
                  const totalDue = Number(voucher.totalAmount) || 0;
                  const alreadyPaid = (Number(voucher.paidAmount) || 0) + (Number(voucher.discountAmount) || 0);
                  const remaining = Math.max(0, totalDue - alreadyPaid);
                  const entry = paymentEntries[voucher.id] || { payAmount: remaining };
                  const isProcessing = processingId === voucher.id;

                  return (
                    <div key={voucher.id} className="border border-rose-500/30 rounded-xl overflow-hidden bg-dark-card/30">
                      {/* Header */}
                      <div className="px-5 py-3 border-b border-dark-border/50 flex items-center gap-3">
                        <span className="text-sm font-black text-white">{voucher.month}</span>
                        <span className={\`text-[10px] font-black uppercase px-2 py-0.5 rounded \${voucher.status === 'Partial' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}\`}>
                          {voucher.status}
                        </span>
                        <span className="text-[10px] text-dark-muted font-bold">Voucher #{voucher.voucherNo || voucher.id?.slice(0,6)}</span>
                      </div>
                      
                      {/* Body */}
                      <div className="p-5 flex flex-col lg:flex-row gap-6 items-stretch">
                        <div className="flex-1 flex flex-wrap gap-6">
                          {(voucher.childrenDetails && voucher.childrenDetails.length > 0 ? voucher.childrenDetails : familyStudents).map((child, idx) => (
                            <div key={idx} className="flex-1 min-w-[200px] bg-dark-bg rounded-xl p-4 border border-dark-border/50">
                              <p className="font-bold text-white text-sm mb-3">{child.name}</p>
                              <div className="space-y-2">
                                {voucher.feeItems?.filter(item => !item.childId || item.childId === child.id).map((item, i) => (
                                  <div key={i} className="flex justify-between text-xs font-bold">
                                    <span className="text-dark-muted">{item.name}</span>
                                    <span className="text-white">Rs. {Number(item.amount).toLocaleString()}</span>
                                  </div>
                                ))}
                                {/* If no specific items mapped, just show child fee */}
                                {(!voucher.feeItems || voucher.feeItems.length === 0) && (
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-dark-muted">Tuition Fee</span>
                                    <span className="text-white">Rs. {(Number(child.fee) || 0).toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="border-t border-dark-border mt-2 pt-2 flex justify-between text-xs font-black">
                                  <span className="text-rose-400">TOTAL</span>
                                  <span className="text-rose-400">
                                    Rs. {
                                      voucher.feeItems?.filter(item => !item.childId || item.childId === child.id).reduce((s, item) => s + Number(item.amount), 0).toLocaleString() || 
                                      (Number(child.fee) || 0).toLocaleString()
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Quick Pay Box */}
                        <div className="w-full lg:w-64 bg-dark-bg rounded-xl p-5 border border-dark-border flex flex-col justify-center">
                           <div className="flex items-end gap-3 mb-4">
                             <div>
                               <p className="text-[10px] font-black text-dark-muted uppercase">REMAINING</p>
                               <p className="text-xl font-black text-rose-500">Rs. {remaining.toLocaleString()}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-2 mb-3">
                             <input 
                               type="number" 
                               value={entry.payAmount}
                               onChange={e => setPaymentEntries(prev => ({...prev, [voucher.id]: {...prev[voucher.id], payAmount: e.target.value}}))}
                               className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-sm font-bold text-white focus:border-rose-500 outline-none"
                             />
                             <button
                               onClick={() => handlePayNow(voucher)}
                               disabled={isProcessing}
                               className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm px-4 py-2 rounded-lg whitespace-nowrap disabled:opacity-50 transition-colors"
                             >
                               {isProcessing ? 'Wait...' : 'Pay Now'}
                             </button>
                           </div>
                           <div className="flex items-center justify-between text-[10px] font-bold text-dark-muted">
                             <span>Discount: Rs. {Number(entry.discountAmount || 0)}</span>
                             <button 
                               onClick={() => {
                                 const val = prompt('Enter discount amount:', entry.discountAmount || 0);
                                 if (val !== null) setPaymentEntries(prev => ({...prev, [voucher.id]: {...prev[voucher.id], discountAmount: val}}));
                               }}
                               className="text-blue-400 hover:underline"
                             >Edit</button>
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transaction History Ledger */}
          <div className="bg-dark-card border border-dark-border rounded-xl p-5">
             <div className="flex items-center gap-2 mb-4">
               <History size={16} className="text-dark-muted" />
               <h3 className="text-xs font-black text-dark-muted uppercase tracking-widest">TRANSACTION HISTORY LEDGER</h3>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead>
                   <tr className="border-b border-dark-border/50 text-[10px] font-black text-dark-muted uppercase tracking-widest">
                     <th className="pb-3 px-2">Month/Title</th>
                     <th className="pb-3 px-2 text-center">Total Fee</th>
                     <th className="pb-3 px-2 text-center">Paid</th>
                     <th className="pb-3 px-2 text-center">Discount</th>
                     <th className="pb-3 px-2 text-center">Remaining</th>
                     <th className="pb-3 px-2 text-center">Status</th>
                     <th className="pb-3 px-2">Payment Date</th>
                     <th className="pb-3 px-2 text-center">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-dark-border/30">
                   {paidVouchersForFamily.length === 0 ? (
                     <tr>
                       <td colSpan="8" className="py-8 text-center text-dark-muted font-bold text-xs">No transaction history found.</td>
                     </tr>
                   ) : paidVouchersForFamily.map(v => {
                     const tDue = Number(v.totalAmount) || 0;
                     const tPaid = Number(v.paidAmount) || 0;
                     const tDisc = Number(v.discountAmount) || 0;
                     const tBal = Math.max(0, tDue - tPaid - tDisc);
                     return (
                       <tr key={v.id} className="hover:bg-dark-hover/50 transition-colors">
                         <td className="py-3 px-2">
                           <p className="font-bold text-white">{v.month}</p>
                           <p className="text-[10px] text-dark-muted">Voucher #{v.voucherNo || v.id.slice(0,6)}</p>
                         </td>
                         <td className="py-3 px-2 text-center font-bold text-white">Rs. {tDue.toLocaleString()}</td>
                         <td className="py-3 px-2 text-center font-black text-emerald-400">Rs. {tPaid.toLocaleString()}</td>
                         <td className="py-3 px-2 text-center font-bold text-amber-400">{tDisc > 0 ? 'Rs. ' + tDisc.toLocaleString() : 'Rs. -'}</td>
                         <td className="py-3 px-2 text-center font-bold text-rose-400">Rs. {tBal.toLocaleString()}</td>
                         <td className="py-3 px-2 text-center">
                           <span className={\`text-[9px] font-black uppercase px-2 py-1 rounded \${v.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}\`}>
                             {v.status}
                           </span>
                         </td>
                         <td className="py-3 px-2 text-[10px] text-dark-muted font-bold">
                           {v.paidAt ? parseDateSafely(v.paidAt).toLocaleDateString('en-GB') : '-'}
                         </td>
                         <td className="py-3 px-2 flex justify-center gap-2">
                           <button onClick={() => openEditModal(v)} className="w-7 h-7 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500/20" title="Edit">✏️</button>
                           <button onClick={() => handlePrintReceipt({...v, fatherName: selectedFamily.fatherName})} className="w-7 h-7 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center hover:bg-purple-500/20" title="Print">🖨️</button>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}
      
      {/* ── Step 3: Success Screen ── */}`;

const finalContent = content.substring(0, step2Start) + newStep2 + content.substring(step3Start + '{/* ── Step 3: Success Screen ── */}'.length);
fs.writeFileSync(targetPath, finalContent, 'utf8');
console.log('Update successful');
