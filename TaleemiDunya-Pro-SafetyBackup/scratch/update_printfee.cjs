const fs = require('fs');
const path = 'src/pages/school-admin/PrintFee.jsx';
let content = fs.readFileSync(path, 'utf8');

// We will inject the logic into the useEffect fetching data
const searchString = `if (id === 'bulk') {
          const voucherIds = location.state?.voucherIds || [];`;
          
const replacement = `if (id === 'bulk') {
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
          const voucherIds = location.state?.voucherIds || [];`;

content = content.replace(searchString, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log('PrintFee modified');
