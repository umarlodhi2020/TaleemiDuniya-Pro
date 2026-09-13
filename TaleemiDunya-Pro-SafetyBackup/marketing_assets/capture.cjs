const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport large enough so all banners render
  await page.setViewport({ width: 1500, height: 4000, deviceScaleFactor: 2 }); // Scale 2 for high-res

  const filePath = `file:///${path.join(__dirname, 'banner-generator.html').replace(/\\/g, '/')}`;
  await page.goto(filePath, { waitUntil: 'networkidle0' });

  // Get all banner elements
  const banners = await page.$$('.banner');
  
  const names = ['hq_pricing_banner', 'hq_whatsapp_bot_banner', 'hq_clean_banner'];

  for (let i = 0; i < banners.length; i++) {
    const banner = banners[i];
    await banner.screenshot({
      path: path.join(__dirname, `${names[i]}.png`)
    });
    console.log(`Saved ${names[i]}.png`);
  }

  await browser.close();
})();
