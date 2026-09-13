const fs = require('fs');
const path = 'src/pages/school-admin/FeeRecord.jsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const newLines = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  
  if (line.includes('const handlePrintAllVouchers = () => {')) {
    // Replace handlePrintAllVouchers with our 3 handlers
    newLines.push(`  const handlePrintPaid = () => {
    if (paidVouchers.length === 0) { alert('No paid vouchers found for this month.'); return; }
    navigate('/school-admin/fees/print/voucher/bulk', { state: { voucherIds: paidVouchers.map(v => v.id) } });
  };

  const handlePrintUnpaid = () => {
    if (unpaidVouchers.length === 0) { alert('No unpaid vouchers found for this month.'); return; }
    navigate('/school-admin/fees/print/voucher/bulk', { state: { voucherIds: unpaidVouchers.map(v => v.id) } });
  };

  const handlePrintBlank = () => {
    // Passing blankMode flag to PrintFee.jsx
    navigate('/school-admin/fees/print/voucher/bulk', { state: { blankMode: true, count: 1 } });
  };`);
    
    // Skip the old function
    while (!lines[i].includes('};') || lines[i].includes('monthVouchers.map')) {
      i++;
    }
    i++;
    continue;
  }
  
  if (line.includes('<button ') && lines[i+1]?.includes('onClick={handlePrintAllVouchers}')) {
    // Replace the old button with 3 buttons
    newLines.push(`          {/* Print Paid */}
          <button 
            onClick={handlePrintPaid}
            className="p-2 bg-green-500/10 text-green-400 rounded-xl hover:bg-green-500/20 font-bold text-sm flex items-center gap-2 border border-green-500/20 transition-colors"
            title="Print Paid Vouchers"
          >
            <FileOutput size={18} />
            <span className="hidden md:inline">Print Paid</span>
          </button>
          
          {/* Print Unpaid */}
          <button 
            onClick={handlePrintUnpaid}
            className="p-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 font-bold text-sm flex items-center gap-2 border border-red-500/20 transition-colors"
            title="Print Unpaid Vouchers"
          >
            <FileOutput size={18} />
            <span className="hidden md:inline">Print Unpaid</span>
          </button>
          
          {/* Print Blank */}
          <button 
            onClick={handlePrintBlank}
            className="p-2 bg-gray-500/10 text-gray-400 rounded-xl hover:bg-gray-500/20 font-bold text-sm flex items-center gap-2 border border-gray-500/20 transition-colors"
            title="Print Blank Vouchers"
          >
            <FileOutput size={18} />
            <span className="hidden md:inline">Print Blank</span>
          </button>`);
          
    // Skip the old button
    while (!lines[i].includes('</button>')) {
      i++;
    }
    i++;
    continue;
  }
  
  newLines.push(line);
  i++;
}

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('FeeRecord modified');
