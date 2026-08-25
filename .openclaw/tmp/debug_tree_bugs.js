const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const indexPath = path.resolve(__dirname, '..', '..', 'index.html');
    const filePath = 'file://' + indexPath;
    console.log('Opening:', filePath);
    await page.goto(filePath);
    await page.waitForTimeout(3000);
