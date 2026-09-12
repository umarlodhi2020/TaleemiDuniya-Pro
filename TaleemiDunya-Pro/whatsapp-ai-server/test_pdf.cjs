const PDFDocument = require('pdfkit');
const fs = require('fs');

function generateVoucherPDF(student, schoolName, feeBalance, pendingInvoicesCount) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A5', margin: 30 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const width = doc.page.width - 60; // 359.53
      const rightEdge = 30 + width;

      // Header
      doc.fontSize(14).font('Helvetica-Bold').text(schoolName, { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('Main', { align: 'center' });
      doc.moveDown(1);
      
      // Subheader: PARENT COPY                 Voucher #
      const ySub = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').text('PARENT COPY', 30, ySub);
      const dateStr = new Date().toISOString().slice(0, 7); // YYYY-MM
      doc.text(`Voucher #INV-${Math.floor(Math.random()*10000)}`, 30, ySub, { align: 'right', width: width });
      
      doc.moveDown(0.5);
      
      // Line Separator
      let currentY = doc.y;
      doc.moveTo(30, currentY).lineTo(rightEdge, currentY).stroke();
      doc.moveDown(0.5);
      
      currentY = doc.y;
      
      // Info block (Left aligned)
      const labelX = 30;
      const valueX = 120;
      const lineSpacing = 16;
      
      doc.font('Helvetica-Bold').text('Month', labelX, currentY);
      doc.font('Helvetica').text(dateStr, valueX, currentY);
      currentY += lineSpacing;
      
      doc.font('Helvetica-Bold').text('DueDate', labelX, currentY);
      doc.font('Helvetica').text('N/A', valueX, currentY);
      currentY += lineSpacing;
      
      doc.font('Helvetica-Bold').text('Ft. Name', labelX, currentY);
      doc.font('Helvetica').text(student.fatherName || 'N/A', valueX, currentY);
      currentY += lineSpacing;
      
      doc.font('Helvetica-Bold').text('No Of child', labelX, currentY);
      doc.font('Helvetica').text('1', valueX, currentY);
      currentY += lineSpacing;
      
      doc.font('Helvetica-Bold').text('NIC', labelX, currentY);
      doc.font('Helvetica').text(student.fatherCnic || student.cnic || 'N/A', valueX, currentY);
      currentY += lineSpacing + 10;
      
      // Table Header Background (Grey)
      doc.rect(30, currentY, width, 20).fill('#6c757d');
      doc.fillColor('white').font('Helvetica-Bold').fontSize(9);
      
      // Column boundaries
      const col1X = 30, col1W = 40;   // Adm#
      const col2X = 70, col2W = 150;  // Name
      const col3X = 220, col3W = 40;  // Class
      const col4X = 260, col4W = 129.53; // Amount (Full header width)
      
      doc.text('Adm#', col1X, currentY + 5, { width: col1W, align: 'center' });
      doc.text('Name', col2X + 5, currentY + 5, { width: col2W - 10 });
      doc.text('Class', col3X, currentY + 5, { width: col3W, align: 'center' });
      doc.text('Amount', col4X, currentY + 5, { width: col4W, align: 'center' });
      
      currentY += 20;
      doc.fillColor('black').font('Helvetica').fontSize(9);
      
      // Table Row 1 (Fee & Arrears)
      const rowHeight = 35;
      
      // Draw row borders
      doc.rect(30, currentY, width, rowHeight).stroke(); // Outer box
      doc.moveTo(col2X, currentY).lineTo(col2X, currentY + rowHeight).stroke(); // Adm | Name
      doc.moveTo(col3X, currentY).lineTo(col3X, currentY + rowHeight).stroke(); // Name | Class
      doc.moveTo(col4X, currentY).lineTo(col4X, currentY + rowHeight).stroke(); // Class | Amount
      
      // Amount is split into two rows (Fee, Arrears) and two columns (Label, Value)
      const amountLabelX = 260;
      const amountValueX = 320;
      doc.moveTo(amountValueX, currentY).lineTo(amountValueX, currentY + rowHeight).stroke(); // Label | Value
      doc.moveTo(amountLabelX, currentY + 17.5).lineTo(rightEdge, currentY + 17.5).stroke(); // Horizontal split in Amount
      
      // Populate Data
      const admNo = student.rollNumber || student.rollNo || student.admissionNo || 'N/A';
      doc.text(admNo, col1X, currentY + 12, { width: col1W, align: 'center' });
      doc.text(student.name || 'N/A', col2X + 5, currentY + 12, { width: col2W - 10 });
      doc.text(`${student.class || ''}`, col3X, currentY + 12, { width: col3W, align: 'center' });
      
      // Fee Row
      doc.font('Helvetica-Bold').text('Fee', amountLabelX + 5, currentY + 4.5);
      doc.font('Helvetica').text(feeBalance.toString(), amountValueX, currentY + 4.5, { width: 65, align: 'right' });
      
      // Arrears Row
      doc.font('Helvetica-Bold').text('Arrears', amountLabelX + 5, currentY + 22);
      doc.font('Helvetica').text('0', amountValueX, currentY + 22, { width: 65, align: 'right' });
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

const student = { name: 'Muhammad Umar', rollNumber: '100', class: '10th', section: 'A', fatherName: 'Muhammad Waris', cnic: '35202-0000000-0' };
generateVoucherPDF(student, 'Test School', '2,000', 0)
  .then(buf => console.log('SUCCESS, buf length:', buf.length))
  .catch(err => console.error('ERROR:', err));
