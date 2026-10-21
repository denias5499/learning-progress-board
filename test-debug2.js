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
    
    const planInfo = await page.evaluate(() => ({
        appPlans: (window.appPlans || []).map(p => ({ id: p.id, name: p.name, gridLen: Object.keys(p.grid || {}).length, events: (p.events||[]).length })),
        currentViewDate: window.currentViewDate ? window.currentViewDate.toString() : null,
        plannerSelectorValue: document.getElementById('planner-selector')?.value,
        calendarGridLen: document.getElementById('calendar-grid')?.innerHTML?.length || 0,
        calendarGridFirstTask: document.querySelectorAll('.calendar-grid .task-item').length
    }));
    console.log('Plan info:', JSON.stringify(planInfo, null, 2));
    
    // 強制手動跑 renderCalendar
    const renderResult = await page.evaluate(() => {
        const pid = document.getElementById('planner-selector')?.value;
        const plan = (window.appPlans || []).find(p => p.id === pid);
        if (!plan) return { err: 'no plan' };
        const dateStr = '2026-09-15';
        const tasks = plan.grid && plan.grid[dateStr];
        return {
            pid,
            planName: plan.name,
            dateStr,
            taskCount: tasks ? tasks.length : 0,
            firstTask: tasks && tasks[0] ? { id: tasks[0].id, text: tasks[0].text, subject: tasks[0].subject } : null,
            gridDays: Object.keys(plan.grid).slice(0, 5)
        };
    });
    console.log('Render result:', JSON.stringify(renderResult, null, 2));
    
    await browser.close();
})();
