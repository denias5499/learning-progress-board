/**
 * Debug: 月曆為什麼沒渲染 task item?
 */
const { chromium } = require('/mnt/my_book/Denias/projects/learning-progress-board/node_modules/playwright');
const fs = require('fs');

const SEED = fs.readFileSync('/tmp/real-seed.json', 'utf-8');

(async () => {
    const url = 'https://denias5499.github.io/learning-progress-board/?v=' + Date.now();
    const browser = await chromium.launch({ headless: true });
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    
    const logs = [];
    page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
    
    await page.addInitScript(s => localStorage.setItem('StudyMap_Family_Data_V20', s), SEED);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    
    // 1. HoverTooltip mounted?
    const hoverState = await page.evaluate(() => ({
        hasGlobal: !!window.HoverTooltip,
        hoverTip: !!document.getElementById('hover-tooltip')
    }));
    console.log('Hover state:', hoverState);
    
    // 2. 看 appPlans
    const planInfo = await page.evaluate(() => ({
        appPlansLen: (window.appPlans || []).length,
        appPlansNames: (window.appPlans || []).map(p => p.name),
        plannerSelector: document.getElementById('planner-selector')?.outerHTML?.slice(0, 300) || 'NULL',
        calendarGridExists: !!document.getElementById('calendar-grid'),
        calendarGridLen: document.getElementById('calendar-grid')?.innerHTML?.length || 0
    }));
    console.log('Plan info:', planInfo);
    
    // 3. 找月曆按鈕
    const buttonInfo = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button')).map(b => ({
            id: b.id,
            text: b.textContent.trim().slice(0, 30),
            visible: b.offsetParent !== null
        }));
        return btns.filter(b => b.text.includes('月曆') || b.text.includes('計畫') || b.text.includes('Planner'));
    });
    console.log('Calendar buttons:', buttonInfo);
    
    // 4. console 重要訊息
    console.log('\nConsole (recent 30):');
    logs.slice(-30).forEach(l => console.log('  ' + l));
    
    await browser.close();
})();
