const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await (await browser.newContext()).newPage();
    await page.goto('https://denias5499.github.io/learning-progress-board/?v=' + Date.now());
    await page.waitForTimeout(3000);
    
    // 直接設 inline style 強制覆蓋
    await page.evaluate(() => {
        const t = document.getElementById('hover-tooltip');
        t.style.cssText = 'display: block !important; position: fixed !important; top: 100px !important; left: 100px !important; z-index: 99999 !important; background: red !important; color: white !important; padding: 20px !important; border-radius: 8px !important; opacity: 1 !important;';
        t.textContent = '測試 tooltip';
    });
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: '/mnt/my_book/Denias/.openclaw/workspace/.openclaw/tmp/v230-screens/forced.png' });
    console.log('Forced tooltip screenshot saved');
    
    await browser.close();
})();
