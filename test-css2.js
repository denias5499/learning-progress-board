const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await (await browser.newContext()).newPage();
    await page.goto('https://denias5499.github.io/learning-progress-board/?v=' + Date.now());
    await page.waitForTimeout(3000);
    
    const r = await page.evaluate(() => {
        // 找所有 CSS rule, 看後面有沒有 [data-tooltip]
        const matched = [];
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (rule.selectorText === '[data-tooltip]') {
                        matched.push(rule.cssText);
                    }
                }
            } catch (e) {}
        }
        // 也找 sheet 0 全部 rules 數
        const sheet0 = document.styleSheets[0];
        const sheet0rules = [];
        try {
            for (let i = 0; i < sheet0.cssRules.length; i++) {
                const r = sheet0.cssRules[i];
                if (r.selectorText && r.selectorText.includes('tooltip')) {
                    sheet0rules.push(r.cssText.slice(0, 80));
                }
            }
        } catch (e) {}
        
        // 看 sheet 0 第幾條 rule
        return {
            dataTooltipMatches: matched,
            tooltipInSheet0: sheet0rules,
            totalSheet0Rules: sheet0.cssRules.length,
            // 看 sheet 0 倒數 3 條 rule
            lastRules: (() => {
                const out = [];
                const n = sheet0.cssRules.length;
                for (let i = Math.max(0, n - 5); i < n; i++) {
                    out.push({ selector: sheet0.cssRules[i].selectorText || 'AT', css: sheet0.cssRules[i].cssText.slice(0, 100) });
                }
                return out;
            })()
        };
    });
    console.log(JSON.stringify(r, null, 2));
    
    await browser.close();
})();
