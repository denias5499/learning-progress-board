const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await (await browser.newContext()).newPage();
    await page.goto('https://denias5499.github.io/learning-progress-board/?v=' + Date.now());
    await page.waitForTimeout(3000);
    
    const info = await page.evaluate(() => {
        return {
            styleSheetsCount: document.styleSheets.length,
            sheetInfo: Array.from(document.styleSheets).map((s, i) => ({
                i,
                href: s.href,
                ownerNodeId: s.ownerNode?.id,
                ruleCount: (() => {
                    try { return s.cssRules?.length || 0; }
                    catch (e) { return 'cors'; }
                })()
            })),
            // 看 tip CSS rule 
            tipEl: !!document.getElementById('hover-tooltip'),
            tipStyle: document.getElementById('hover-tooltip')?.style.cssText
        };
    });
    console.log(JSON.stringify(info, null, 2));
    
    await browser.close();
})();
