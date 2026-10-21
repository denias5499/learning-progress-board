const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await (await browser.newContext()).newPage();
    await page.goto('https://denias5499.github.io/learning-progress-board/?v=' + Date.now());
    await page.waitForTimeout(3000);
    
    const result = await page.evaluate(() => {
        // 直接找 #hover-tooltip selector
        const tip = document.getElementById('hover-tooltip');
        // 計算 CSSStyleDeclaration 是否有 hover-tooltip rule 套用
        const matches = window.getMatchedCSSRules ? window.getMatchedCSSRules(tip) : null;
        
        // 用 match 測
        const foundRules = [];
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    const t = rule.cssText || '';
                    if (t.includes('hover-tooltip') || t.includes('data-tooltip')) {
                        foundRules.push(t.slice(0, 100));
                    }
                }
            } catch (e) {}
        }
        return {
            tipExists: !!tip,
            tipPos: getComputedStyle(tip).position,
            tipZ: getComputedStyle(tip).zIndex,
            // 試試看要怎樣才會套用 CSS
            inlinePos: tip.style.position || 'not set',
            // 找規則
            foundRulesCount: foundRules.length,
            foundRules: foundRules
        };
    });
    console.log(JSON.stringify(result, null, 2));
    
    await browser.close();
})();
