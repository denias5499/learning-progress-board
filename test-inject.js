const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await (await browser.newContext()).newPage();
    await page.goto('https://denias5499.github.io/learning-progress-board/?v=' + Date.now());
    await page.waitForTimeout(3000);
    
    // 加 inline style 到 tip 看是否 CSS class 套用
    const r1 = await page.evaluate(() => {
        const t = document.getElementById('hover-tooltip');
        const cs = getComputedStyle(t);
        return { pos: cs.position, zIndex: cs.zIndex, fontSize: cs.fontSize, bg: cs.backgroundColor };
    });
    console.log('Before inject:', r1);
    
    // 注入 CSS rule 用 style element
    await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = '#hover-tooltip { position: fixed !important; z-index: 99999 !important; background: red !important; }';
        document.head.appendChild(style);
    });
    
    await page.evaluate(() => {
        const t = document.getElementById('hover-tooltip');
        t.classList.add('show');
    });
    
    await page.waitForTimeout(200);
    
    const r2 = await page.evaluate(() => {
        const t = document.getElementById('hover-tooltip');
        const cs = getComputedStyle(t);
        return { pos: cs.position, zIndex: cs.zIndex, fontSize: cs.fontSize, bg: cs.backgroundColor };
    });
    console.log('After inject:', r2);
    
    await browser.close();
})();
