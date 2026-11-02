import PDFDocument from 'pdfkit';
import fs from 'fs';

function generateFamilyVoucherPDF(students, schoolName, voucherData, logoBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const studentList = Array.isArray(students) ? students : [students];
      const primaryStudent = studentList[0] || {};
      const numChildren = studentList.length;

      // A5 size: 419.53 x 595.28
      const doc = new PDFDocument({ size: 'A5', margin: 30 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const width = doc.page.width - 60; // 359.53
      const rightEdge = 30 + width;

      // Header Area
      let currentY = doc.y;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 30, currentY, { fit: [50, 50], align: 'center', valign: 'center' });
        } catch(e) {}
      }

      // School Name
      doc.fontSize(14).font('Helvetica-Bold').text(schoolName || 'TaleemiDunya Pro', 90, currentY + 10, { width: width - 60, align: 'left' });
      doc.fontSize(9).font('Helvetica').text('Official Student Fee Challan', 90, doc.y, { align: 'left' });
      doc.moveDown(1);

      // Subheader: PARENT COPY | Voucher #
      const ySub = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').text('PARENT COPY', 30, ySub);

      const vMonth = (voucherData && voucherData.month) ? voucherData.month : new Date().toISOString().slice(0, 7);
      const vNo = (voucherData && voucherData.voucherNo) ? voucherData.voucherNo : ('V-' + Date.now().toString().slice(-4));
      doc.text(`Voucher #${vNo}`, 30, ySub, { align: 'right', width: width });
      doc.moveDown(0.5);

      // Line Separator
      currentY = doc.y;
      doc.moveTo(30, currentY).lineTo(rightEdge, currentY).stroke();
      doc.moveDown(0.5);

      currentY = doc.y;

      let vDueDate = null;
      if (voucherData && voucherData.dueDate) {
        if (typeof voucherData.dueDate === 'string' && voucherData.dueDate.trim()) {
          vDueDate = voucherData.dueDate.trim();
        } else if (voucherData.dueDate.toDate && typeof voucherData.dueDate.toDate === 'function') {
          vDueDate = voucherData.dueDate.toDate().toISOString().slice(0, 10);
        } else {
          vDueDate = String(voucherData.dueDate).trim();
        }
      }
      if (!vDueDate) {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        vDueDate = lastDay.toISOString().slice(0, 10);
      }

      // Info Block
      const labelX = 30;
      const valueX = 120;
      const lineSpacing = 15;

      doc.font('Helvetica-Bold').fontSize(9).text('Month', labelX, currentY);
      doc.font('Helvetica').fontSize(9).text(vMonth, valueX, currentY);
      currentY += lineSpacing;

      doc.font('Helvetica-Bold').fontSize(9).text('DueDate', labelX, currentY);
      doc.font('Helvetica').fontSize(9).text(vDueDate, valueX, currentY);
      currentY += lineSpacing;

      doc.font('Helvetica-Bold').fontSize(9).text('Ft. Name', labelX, currentY);
      doc.font('Helvetica').fontSize(9).text(primaryStudent.fatherName || primaryStudent.guardianName || 'N/A', valueX, currentY);
      currentY += lineSpacing;

      doc.font('Helvetica-Bold').fontSize(9).text('No Of Child', labelX, currentY);
      doc.font('Helvetica').fontSize(9).text(String(numChildren), valueX, currentY);
      currentY += lineSpacing;

      doc.font('Helvetica-Bold').fontSize(9).text('NIC', labelX, currentY);
      doc.font('Helvetica').fontSize(9).text(primaryStudent.fatherCnic || primaryStudent.cnic || 'N/A', valueX, currentY);
      currentY += lineSpacing + 8;

      // Table Header (Grey)
      doc.rect(30, currentY, width, 18).fill('#4a5568');
      doc.fillColor('white').font('Helvetica-Bold').fontSize(8.5);

      const col1X = 30, col1W = 45;   // Adm#
      const col2X = 75, col2W = 125;  // Name
      const col3X = 200, col3W = 45;  // Class
      const col4X = 245, col4W = 50;  // Fee
      const col5X = 295, col5W = 45;  // Arrears
      const col6X = 340, col6W = 49.53; // Total

      doc.text('Adm#', col1X, currentY + 4, { width: col1W, align: 'center' });
      doc.text('Name', col2X + 4, currentY + 4, { width: col2W - 8 });
      doc.text('Class', col3X, currentY + 4, { width: col3W, align: 'center' });
      doc.text('Fee', col4X, currentY + 4, { width: col4W, align: 'right' });
      doc.text('Arrears', col5X, currentY + 4, { width: col5W, align: 'right' });
      doc.text('Total', col6X, currentY + 4, { width: col6W - 4, align: 'right' });

      currentY += 18;
      doc.fillColor('black').font('Helvetica').fontSize(8.5);

      let grandTotal = 0;
      const rowHeight = 22;

      for (let i = 0; i < studentList.length; i++) {
        const st = studentList[i];
        let feeAmt = Number(st.monthlyFee || st.tuitionFee || 0);
        let arrAmt = 0;
        let annAmt = 0;

        if (voucherData && Array.isArray(voucherData.childrenDetails)) {
          const detail = voucherData.childrenDetails.find(d => 
            String(d.admNo) === String(st.rollNumber) || 
            String(d.admNo) === String(st.rollNo) ||
            d.id === st.id ||
            d.name?.toLowerCase() === st.name?.toLowerCase()
          );
          if (detail) {
            feeAmt = Number(detail.fee || feeAmt);
            arrAmt = Number(detail.arrears || 0);
            annAmt = Number(detail.annualFee || 0);
          }
        }

        const childTotal = feeAmt + arrAmt + annAmt;
        grandTotal += childTotal;

        if (i % 2 === 1) {
          doc.rect(30, currentY, width, rowHeight).fill('#f7fafc');
          doc.fillColor('black');
        }

        doc.rect(30, currentY, width, rowHeight).stroke('#cbd5e0');
        doc.moveTo(col2X, currentY).lineTo(col2X, currentY + rowHeight).stroke('#cbd5e0');
        doc.moveTo(col3X, currentY).lineTo(col3X, currentY + rowHeight).stroke('#cbd5e0');
        doc.moveTo(col4X, currentY).lineTo(col4X, currentY + rowHeight).stroke('#cbd5e0');
        doc.moveTo(col5X, currentY).lineTo(col5X, currentY + rowHeight).stroke('#cbd5e0');
        doc.moveTo(col6X, currentY).lineTo(col6X, currentY + rowHeight).stroke('#cbd5e0');

        const admNo = st.rollNumber || st.rollNo || st.admissionNo || 'N/A';
        doc.text(admNo, col1X, currentY + 6, { width: col1W, align: 'center' });
        doc.text(st.name || 'Student', col2X + 4, currentY + 6, { width: col2W - 8 });
        doc.text(String(st.class || st.className || 'N/A'), col3X, currentY + 6, { width: col3W, align: 'center' });
        doc.text(feeAmt > 0 ? feeAmt.toLocaleString() : '0', col4X, currentY + 6, { width: col4W, align: 'right' });
        doc.text(arrAmt > 0 ? arrAmt.toLocaleString() : '0', col5X, currentY + 6, { width: col5W, align: 'right' });
        doc.font('Helvetica-Bold').text(childTotal > 0 ? childTotal.toLocaleString() : '0', col6X, currentY + 6, { width: col6W - 4, align: 'right' });
        doc.font('Helvetica');

        currentY += rowHeight;
      }

      currentY += 8;
      doc.rect(30, currentY, width, 22).fill('#edf2f7');
      doc.fillColor('black').font('Helvetica-Bold').fontSize(10);
      doc.text('TOTAL PAYABLE (ALL CHILDREN):', 30, currentY + 6, { width: col5X - 35, align: 'right' });
      doc.text(`Rs. ${grandTotal.toLocaleString()}/-`, col5X, currentY + 6, { width: rightEdge - col5X - 5, align: 'right' });
      doc.rect(30, currentY, width, 22).stroke('#4a5568');

      doc.moveDown(2);
      doc.font('Helvetica').fontSize(8).fillColor('#718096')
         .text('Note: This is a computer-generated voucher valid at school accounts office and authorized online banking portal.', 30, doc.y, { align: 'center', width });

      doc.end();
    } catch(err) {
      reject(err);
    }
  });
}

async function runTest() {
  const dummyStudents = [
    { name: 'Sehrish', fatherName: 'Ajmal', monthlyFee: 2500, rollNo: '101', class: '5th' },
    { name: 'Justina', fatherName: 'Ajmal', monthlyFee: 2000, rollNo: '102', class: '3rd' }
  ];
  const pdfBuffer = await generateFamilyVoucherPDF(dummyStudents, 'Smart Angels Grammar School', null, null);
  console.log('✅ PDF generated successfully! Bytes:', pdfBuffer.length);
  process.exit(0);
}

runTest().catch(console.error);

