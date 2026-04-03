let puppeteer;

async function getPuppeteer() {
  if (!puppeteer) {
    // Lazy load so the app can boot even before the dependency is installed.
    puppeteer = require('puppeteer');
  }

  return puppeteer;
}

async function generatePdfFromHtml(html) {
  const browserLib = await getPuppeteer();
  const browser = await browserLib.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18px', right: '18px', bottom: '18px', left: '18px' },
    });
  } finally {
    await browser.close();
  }
}

module.exports = { generatePdfFromHtml };
