const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Launching Google Chrome to generate PDF booklet...');
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
    });

    const page = await browser.newPage();
    const htmlPath = path.join(__dirname, 'TaleemiDunya-Pro_Master_Training_Booklet.html');
    const fileUrl = `file://${htmlPath.replace(/\\/g, '/')}`;
    console.log('📄 Loading HTML booklet from:', fileUrl);

    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdfPath = path.join(__dirname, 'TaleemiDunya-Pro_Master_Roadmap_and_Lectures.pdf');
    console.log('🖨️ Printing to PDF at:', pdfPath);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '15mm',
        right: '15mm'
      }
    });

    await browser.close();
    console.log('✅ SUCCESSFULLY GENERATED PDF BOOKLET:', pdfPath);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    process.exit(1);
  }
})();
