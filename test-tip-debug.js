const { chromium } = require('/mnt/my_book/Denias/projects/learning-progress-board/node_modules/playwright');
const fs = require('fs');
(async () => {
    const SEED = fs.readFileSync('/tmp/real-seed.json', 'utf-8');
    const browser = await chromium.launch({ headless: true });
    const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
    await page.addInitScript(s => localStorage.setItem('StudyMap_Family_Data_V20', s), SEED);
    await page.goto('https://denias5499.github.io/learning-progress-board/?v=' + Date.now());
    await page.waitForTimeout(8000);
    await page.evaluate(() => document.getElementById('nav-btn-planner')?.click());
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
        window.currentViewDate = new Date(2026, 8, 15);
        renderCalendar();
    });
    await page.waitForTimeout(1500);
    
    await page.evaluate(() => {
        const el = document.querySelector('.calendar-grid .task-item');
        el.scrollIntoView({block:'center'});
    });
    await page.waitForTimeout(300);
    
    await page.evaluate(() => {
        const el = document.querySelector('.calendar-grid .task-item');
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(300);
    
    const debug = await page.evaluate(() => {
        const t = document.getElementById('hover-tooltip');
        const r = t.getBoundingClientRect();
        const cs = getComputedStyle(t);
        return {
            display: cs.display,
            visibility: cs.visibility,
            opacity: cs.opacity,
            zIndex: cs.zIndex,
            pointerEvents: cs.pointerEvents,
            position: cs.position,
            rect: { x: r.x, y: r.y, w: r.width, h: r.height },
            textContent: t.textContent.length,
            classList: Array.from(t.classList),
            innerHTML_first50: t.innerHTML.slice(0, 50)
        };
    });
    console.log('Tooltip debug:', JSON.stringify(debug, null, 2));
    
    // 強制設定大尺寸 + 可見
    await page.evaluate(() => {
        const t = document.getElementById('hover-tooltip');
        t.style.cssText = 'position:fixed; z-index:99999; left:200px; top:200px; display:block !important; opacity:1 !important; background:red; color:white; padding:20px;';
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/mnt/my_book/Denias/.openclaw/workspace/.openclaw/tmp/v230-screens/debug.png' });
    console.log('Debug screenshot saved');
    
    await browser.close();
})();
