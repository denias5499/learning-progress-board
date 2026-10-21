/**
 * v2.3.0 Playwright E2E:
 * 1. 開網址 + 注入 seed
 * 2. 等渲染完成
 * 3. 找到月曆上的 task item, hover 看 tooltip
 * 4. 開 dashboard detail dialog (點 progress bar), hover tr 看 tooltip
 * 5. 截圖存證
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
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    
    const logs = [];
    page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', e => logs.push(`[ERR] ${e.message}`));
    
    await page.addInitScript(seed => {
        localStorage.setItem('StudyMap_Family_Data_V20', seed);
    }, SEED);
    
    console.log('========== 1. 開網址 + 等渲染 ==========');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);  // disk-db setup + render
    
    // 確認 v2.3.0 mounted
    const mounted = await page.evaluate(() => {
        return !!window.HoverTooltip;
    });
    console.log(`   ${mounted ? '✅' : '❌'} HoverTooltip widget mounted`);
    
    console.log('\n========== 2. 切到月曆分頁 ==========');
    await page.evaluate(() => {
        // 找到月曆按鈕並點擊
        const btn = document.querySelector('#nav-btn-planner') || 
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('月曆'));
        if (btn) btn.click();
    });
    await page.waitForTimeout(2000);
    
    console.log('\n========== 3. 等月曈 task item 渲染 + 驗 tooltip attr ==========');
    const calendarCheck = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.calendar-grid .task-item'));
        const withTooltip = items.filter(i => i.hasAttribute('data-tooltip'));
        const sample = items[0];
        return {
            totalTasks: items.length,
            withTooltip: withTooltip.length,
            firstTooltip: sample ? sample.getAttribute('data-tooltip') : null,
            firstColor: sample ? sample.getAttribute('data-tooltip-color') : null
        };
    });
    console.log(`   ✓ 月曆任務總數: ${calendarCheck.totalTasks}`);
    console.log(`   ${calendarCheck.withTooltip === calendarCheck.totalTasks && calendarCheck.totalTasks > 0 ? '✅' : '❌'} 全部都有 data-tooltip (${calendarCheck.withTooltip}/${calendarCheck.totalTasks})`);
    console.log(`   ✓ 範例 tooltip 內容:`);
    console.log('     ' + (calendarCheck.firstTooltip || 'NULL').replace(/\\n/g, '\n     '));
    console.log(`   ✓ 範例 color: ${calendarCheck.firstColor}`);
    
    console.log('\n========== 4. 滑鼠移到 task item → 觸發 tooltip 顯示 ==========');
    const taskBox = await page.locator('.calendar-grid .task-item').first().boundingBox();
    if (taskBox) {
        await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
        await page.waitForTimeout(150);
        const tipState = await page.evaluate(() => {
            const t = document.getElementById('hover-tooltip');
            return {
                exists: !!t,
                hasShow: t && t.classList.contains('show'),
                visible: t && t.style.opacity !== '0' && getComputedStyle(t).opacity !== '0',
                content: t ? t.textContent : null,
                left: t ? t.style.left : null,
                top: t ? t.style.top : null
            };
        });
        console.log(`   ${tipState.hasShow ? '✅' : '❌'} tooltip show class 加上`);
        console.log(`   ${tipState.visible ? '✅' : '❌'} tooltip opacity > 0`);
        console.log(`   ${tipState.content && tipState.content.length > 0 ? '✅' : '❌'} tooltip 內容不為空`);
        console.log(`   ✓ 定位: left=${tipState.left}, top=${tipState.top}`);
        
        // 截圖
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-calendar-tooltip.png'), clip: { x: 0, y: 0, width: 1280, height: 600 } });
        console.log(`   ✓ 截圖: 01-calendar-tooltip.png`);
    }
    
    console.log('\n========== 5. 滑鼠移開 → tooltip 隱藏 ==========');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(150);
    const tipHidden = await page.evaluate(() => {
        const t = document.getElementById('hover-tooltip');
        return !t.classList.contains('show');
    });
    console.log(`   ${tipHidden ? '✅' : '❌'} tooltip 隱藏`);
    
    console.log('\n========== 6. 切回首頁 + 點 dashboard 進度 bar ==========');
    await page.evaluate(() => {
        // 回到首頁
        const homeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('首頁') || b.textContent.includes('🏠'));
        if (homeBtn) homeBtn.click();
    });
    await page.waitForTimeout(2000);
    
    // 找綠色斜條紋 bar (有 repeating-linear-gradient 的元素)
    await page.evaluate(() => {
        const bars = document.querySelectorAll('[style*="repeating-linear-gradient"]');
        if (bars[0]) bars[0].click();  // 點已完成區
    });
    await page.waitForTimeout(1000);
    
    const dialogOpen = await page.evaluate(() => {
        const m = document.getElementById('modal-dash-detail');
        if (!m) return { open: false };
        const cs = getComputedStyle(m);
        return {
            open: cs.display !== 'none' && cs.visibility !== 'hidden',
            title: document.getElementById('dd-title')?.innerText || null,
            rowCount: document.querySelectorAll('#dd-content tr[data-tooltip]').length
        };
    });
    console.log(`   ${dialogOpen.open ? '✅' : '❌'} dialog 打開`);
    console.log(`   ✓ title: ${dialogOpen.title}`);
    console.log(`   ${dialogOpen.rowCount > 0 ? '✅' : '❌'} dialog 內 tr 有 data-tooltip (${dialogOpen.rowCount})`);
    
    if (dialogOpen.rowCount > 0) {
        const dialogRow = await page.locator('#dd-content tr[data-tooltip]').first().boundingBox();
        if (dialogRow) {
            await page.mouse.move(dialogRow.x + dialogRow.width / 2, dialogRow.y + dialogRow.height / 2);
            await page.waitForTimeout(150);
            const dialogTip = await page.evaluate(() => {
                const t = document.getElementById('hover-tooltip');
                return {
                    hasShow: t.classList.contains('show'),
                    content: t.textContent
                };
            });
            console.log(`   ${dialogTip.hasShow ? '✅' : '❌'} dialog tr hover 觸發 tooltip`);
            console.log(`   ✓ tooltip 內容:`);
            console.log('     ' + (dialogTip.content || 'NULL').replace(/\\n/g, '\n     '));
            
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-dialog-tooltip.png'), fullPage: false });
            console.log(`   ✓ 截圖: 02-dialog-tooltip.png`);
        }
    }
    
    console.log('\n========== 7. console 重要 log ==========');
    logs.filter(l => l.includes('HoverTooltip') || l.includes('v2.3.0') || l.includes('ERR') || l.includes('diskDB'))
        .slice(-15).forEach(l => console.log('   ' + l));
    
    await browser.close();
    
    console.log('\n========== 結論 ==========');
    console.log(`   截圖存: ${SCREENSHOT_DIR}/`);
})();
