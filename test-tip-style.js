const { chromium } = require('/mnt/my_book/Denias/projects/learning-progress-board/node_modules/playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await (await browser.newContext()).newPage();
    await page.goto('https://denias5499.github.io/learning-progress-board/?v=' + Date.now());
    await page.waitForTimeout(3000);
    
    // 強制設 show class
    const debug = await page.evaluate(() => {
        const t = document.getElementById('hover-tooltip');
        // 看 CSSStyleSheet 套用的規則
        const matchedRules = [];
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (rule.selectorText && rule.selectorText.includes('hover-tooltip')) {
                        matchedRules.push({ selector: rule.selectorText, css: rule.cssText.slice(0, 200) });
                    }
                }
            } catch (e) { /* cross-origin */ }
        }
        return {
            matchedRules,
            inlineStyle: t.style.cssText,
            computedPosition: getComputedStyle(t).position,
            computedZIndex: getComputedStyle(t).zIndex
        };
    });
    console.log(JSON.stringify(debug, null, 2));
    await browser.close();
})();
