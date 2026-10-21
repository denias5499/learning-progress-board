/**
 * v2.3.0 E2E v2: 直接操控 currentViewDate + renderCalendar
 */
const { chromium } = require('/mnt/my_book/Denias/projects/learning-progress-board/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const SEED = fs.readFileSync('/tmp/real-seed.json', 'utf-8');
const SCREENSHOT_DIR = '/mnt/my_book/Denias/.openclaw/workspace/.openclaw/tmp/v230-screens';

(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const url = 'https://denias5499.github.io/learning-progress-board/?v=' + Date.now();
    const browser = await chromium.launch({ headless: true });
    const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
    
    const logs = [];
    page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
    
    await page.addInitScript(s => localStorage.setItem('StudyMap_Family_Data_V20', s), SEED);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    
    console.log('========== 1. 切月曆 + 切到 9月 + 渲染 ==========');
    // 點月曆按鈕
    await page.evaluate(() => document.getElementById('nav-btn-planner')?.click());
    await page.waitForTimeout(1500);
    
    // 強切 currentViewDate 到 2026-09
    await page.evaluate(() => {
        if (window.currentViewDate) {
            window.currentViewDate = new Date(2026, 8, 15); // 9月 = month 8
        }
        // 觸發 renderCalendar
        if (typeof renderCalendar === 'function') renderCalendar();
    });
    await page.waitForTimeout(1500);
    
    const calState = await page.evaluate(() => ({
        taskCount: document.querySelectorAll('.calendar-grid .task-item').length,
        withTooltip: document.querySelectorAll('.calendar-grid .task-item[data-tooltip]').length,
        firstTooltip: document.querySelector('.calendar-grid .task-item')?.getAttribute('data-tooltip') || null,
        firstColor: document.querySelector('.calendar-grid .task-item')?.getAttribute('data-tooltip-color') || null
    }));
    console.log(`   ✓ 月曆任務: ${calState.taskCount}, 有 tooltip: ${calState.withTooltip}`);
    console.log(`   ✓ 第一個 tooltip:`);
    console.log('     ' + (calState.firstTooltip || 'NULL').replace(/\\n/g, '\n     '));
    console.log(`   ✓ color: ${calState.firstColor}`);
    
    if (calState.taskCount === 0) {
        console.log('   ❌ 月曆還是空的,看 render 訊息:');
        logs.filter(l => l.includes('renderCalendar') || l.includes('changeMonth')).slice(-10).forEach(l => console.log('     ' + l));
        await browser.close();
        process.exit(1);
    }
    
    console.log('\n========== 2. 滑鼠 hover 第一個 task ==========');
    const box = await page.locator('.calendar-grid .task-item').first().boundingBox();
    if (!box) { console.log('   ❌ 找不到 task bounding box'); await browser.close(); process.exit(1); }
    
    // 滾動到 task 可見位置
    await page.locator('.calendar-grid .task-item').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const box = await page.locator('.calendar-grid .task-item').first().boundingBox();
    
    // 用 dispatchEvent 觸發 mouseover (Playwright mouse.move 在 capture listener 上不一定會到)
    await page.evaluate(() => {
        const el = document.querySelector('.calendar-grid .task-item');
        const evt = new MouseEvent('mouseover', { bubbles: true, cancelable: true });
        el.dispatchEvent(evt);
    });
    await page.waitForTimeout(200);
    
    const tipState = await page.evaluate(() => {
        const t = document.getElementById('hover-tooltip');
        return {
            hasShow: t.classList.contains('show'),
            opacity: getComputedStyle(t).opacity,
            content: t.textContent,
            left: t.style.left,
            top: t.style.top,
            borderLeftColor: t.style.borderLeftColor
        };
    });
    console.log(`   ${tipState.hasShow ? '✅' : '❌'} show class`);
    console.log(`   ${tipState.opacity === '1' ? '✅' : '❌'} opacity = ${tipState.opacity}`);
    console.log(`   ✓ 定位: (${tipState.left}, ${tipState.top})`);
    console.log(`   ✓ 框色: ${tipState.borderLeftColor}`);
    console.log(`   ✓ 內容:`);
    console.log('     ' + (tipState.content || 'NULL').replace(/\\n/g, '\n     '));
    
    // 截圖
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-calendar-tooltip.png') });
    console.log(`   ✓ 截圖: 01-calendar-tooltip.png`);
    
    console.log('\n========== 3. hover 第二個任務 (不同顏色) ==========');
    await page.mouse.move(0, 0); // 先移開
    await page.waitForTimeout(150);
    
    const task2 = await page.locator('.calendar-grid .task-item').nth(1).boundingBox();
    if (task2) {
        await page.mouse.move(task2.x + task2.width/2, task2.y + task2.height/2);
        await page.waitForTimeout(150);
        const tip2 = await page.evaluate(() => {
            const t = document.getElementById('hover-tooltip');
            return { content: t.textContent, color: t.style.borderLeftColor };
        });
        console.log(`   ✓ task 2 顏色: ${tip2.color}`);
        console.log(`   ✓ task 2 內容:`);
        console.log('     ' + (tip2.content || 'NULL').replace(/\\n/g, '\n     '));
    }
    
    console.log('\n========== 4. 切回首頁 + 點 dashboard bar ==========');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(150);
    
    await page.evaluate(() => {
        // 回首頁
        const homeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('🏠') || b.textContent.includes('首頁') || b.textContent.includes('Dashboard'));
        if (homeBtn) homeBtn.click();
    });
    await page.waitForTimeout(2000);
    
    // 找已完成區的 bar (綠色斜紋)
    const barFound = await page.evaluate(() => {
        const bars = document.querySelectorAll('[style*="repeating-linear-gradient"]');
        if (bars.length === 0) return { count: 0 };
        // 點第一個
        bars[0].click();
        return { count: bars.length, clicked: true };
    });
    console.log(`   ✓ 找到 ${barFound.count} 個 progress bar`);
    await page.waitForTimeout(1000);
    
    const dialogState = await page.evaluate(() => ({
        modalOpen: (() => {
            const m = document.getElementById('modal-dash-detail');
            if (!m) return false;
            const cs = getComputedStyle(m);
            return cs.display !== 'none' && cs.visibility !== 'hidden';
        })(),
        title: document.getElementById('dd-title')?.innerText || null,
        trCount: document.querySelectorAll('#dd-content tr[data-tooltip]').length,
        firstTrTooltip: document.querySelector('#dd-content tr[data-tooltip]')?.getAttribute('data-tooltip') || null
    }));
    console.log(`   ${dialogState.modalOpen ? '✅' : '❌'} dialog 打開`);
    console.log(`   ✓ title: ${dialogState.title}`);
    console.log(`   ${dialogState.trCount > 0 ? '✅' : '❌'} dialog 有 ${dialogState.trCount} 行有 tooltip`);
    
    if (dialogState.trCount > 0) {
        const trBox = await page.locator('#dd-content tr[data-tooltip]').first().boundingBox();
        if (trBox) {
            await page.mouse.move(trBox.x + trBox.width/2, trBox.y + trBox.height/2);
            await page.waitForTimeout(150);
            const dialogTip = await page.evaluate(() => {
                const t = document.getElementById('hover-tooltip');
                return {
                    hasShow: t.classList.contains('show'),
                    content: t.textContent,
                    color: t.style.borderLeftColor
                };
            });
            console.log(`   ${dialogTip.hasShow ? '✅' : '❌'} dialog tr hover 顯示 tooltip`);
            console.log(`   ✓ 內容:`);
            console.log('     ' + (dialogTip.content || 'NULL').replace(/\\n/g, '\n     '));
            console.log(`   ✓ 框色: ${dialogTip.color}`);
            
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-dialog-tooltip.png') });
            console.log(`   ✓ 截圖: 02-dialog-tooltip.png`);
        }
    }
    
    console.log('\n========== 5. console 重要訊息 ==========');
    logs.filter(l => l.includes('HoverTooltip') || l.includes('v2.3.0') || l.includes('renderCalendar') || l.includes('ERR'))
        .slice(-15).forEach(l => console.log('   ' + l));
    
    await browser.close();
    console.log('\n=== 完成, 截圖在: ' + SCREENSHOT_DIR);
})();
