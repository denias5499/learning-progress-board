const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await (await browser.newContext()).newPage();
    await page.goto('https://denias5499.github.io/learning-progress-board/?v=' + Date.now());
    await page.waitForTimeout(3000);
    
    const rules = await page.evaluate(() => {
        const all = [];
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (rule.selectorText) all.push(rule.selectorText);
                }
            } catch (e) {}
        }
        return all.filter(s => s.includes('hover') || s.includes('tooltip'));
    });
    console.log('hover/tooltip rules:', rules);
    
    await browser.close();
})();
