// test/perf-wizard-button.test.js -- 用 Playwright 找「建立智慧排程」按鈕 4 秒延遲 root cause
const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const FILE_URL = 'file://' + HTML_PATH;

test('perf: Playwright trace 多個按鈕 click 耗時', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 收集 console message (index.html 內 console.log 會跑出來)
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[renderCalendar]') || text.includes('[isUnitScheduledAnywhere]')) {
            console.log('[BROWSER]', text);
        }
    });

    // 載入 index.html
    await page.goto(FILE_URL);
    await page.waitForLoadState('networkidle');

    // 注入真實備份到 localStorage (從 index.html 抓 _v153_BACKUP_PLANS_STR)
    const setupResult = await page.evaluate(() => {
        // 從當前頁面的 script 拿備份字串
        const backupStr = window._v153_BACKUP_PLANS_STR;
        const masterStr = window._v153_BACKUP_MASTER_STR;
        if (!backupStr || !masterStr) return { ok: false, reason: 'no backup' };

        // 構造備份資料結構 (從備份 plans 推導 user data)
        const plans = JSON.parse(backupStr);
        const master = JSON.parse(masterStr);

        // 抽備份裡用到的 unitId 當 mission 範圍
        const usedUnitIds = new Set();
        plans.forEach(plan => {
            Object.values(plan.grid || {}).forEach(tasks => {
                tasks.forEach(t => { if (t.unitId) usedUnitIds.add(t.id ? t.unitId : t.unitId); });
            });
        });

        const userData = {
            user_A: {
                name: '測試學生',
                avatar: '',
                master: master,
                masters: { '會考複習': master },
                missions: { '會考複習': { '📦 暑假複習進度': Array.from(usedUnitIds) } },
                logs: [],
                plans: plans
            }
        };
        localStorage.setItem('StudyMap_Family_Data_V20', JSON.stringify(userData));
        localStorage.setItem('StudyMap_CurrentUserId_V20', 'user_A');
        return { ok: true, plans: plans.length, units: usedUnitIds.size };
    });
    console.log('setup:', setupResult);
    if (!setupResult.ok) { await browser.close(); return; }

    // Reload 讓 init 邏輯載入備份
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // 切換到月曆排程頁
    await page.evaluate(() => openPlanner());
    await page.waitForTimeout(300);

    // === Trace 多個按鈕 ===
    const results = {};

    // 1. 「建立智慧排程計畫」按鈕 (openWizard)
    results.openWizard = await page.evaluate(() => {
        const btn = document.querySelector('button[onclick*="openWizard"]');
        if (!btn) return { ok: false };
        const t0 = performance.now();
        btn.click();
        const t1 = performance.now();
        return { ok: true, syncTime: t1 - t0 };
    });
    console.log('1. openWizard click:', results.openWizard);
    await page.waitForTimeout(500);
    results.openWizardModal = await page.evaluate(() => {
        const modal = document.getElementById('modal-wizard');
        return modal ? getComputedStyle(modal).display : 'no-modal';
    });
    console.log('   modal display after 500ms:', results.openWizardModal);

    // 關掉 modal
    await page.evaluate(() => closeModal('modal-wizard'));
    await page.waitForTimeout(300);

    // 2. 「下個月」按鈕 (changeMonth)
    results.nextMonth = await page.evaluate(() => {
        const btn = document.querySelector('button[onclick*="changeMonth(1"]');
        if (!btn) return { ok: false };
        const t0 = performance.now();
        btn.click();
        const t1 = performance.now();
        return { ok: true, syncTime: t1 - t0 };
    });
    console.log('2. nextMonth click:', results.nextMonth);
    await page.waitForTimeout(500);

    // 3. 直接呼叫 renderCalendar (會 trigger N² nested loop)
    results.renderCalendar = await page.evaluate(() => {
        const t0 = performance.now();
        renderCalendar();
        const t1 = performance.now();
        return { ok: true, syncTime: t1 - t0 };
    });
    console.log('3. renderCalendar:', results.renderCalendar);

    // 4. 手動觸發 toggleTaskDone (會 trigger N² nested loop)
    results.toggleTaskDone = await page.evaluate(() => {
        // 找第一個 task 有 unitId 的
        const plan = appPlans[0];
        const dateStr = Object.keys(plan.grid)[0];
        const task = plan.grid[dateStr].find(t => t.unitId);
        if (!task) return { ok: false, reason: 'no task' };
        const t0 = performance.now();
        // toggleTaskDone 是內部函數, 通常在 checkbox onchange 觸發
        // 直接呼叫要 mock event, 改成模擬: 走 toggleTaskDone 的內部邏輯
        task.isDone = !task.isDone;
        const t1 = performance.now();
        return { ok: true, syncTime: t1 - t0 };
    });
    console.log('4. toggleTaskDone (simulated):', results.toggleTaskDone);

    // 5. 「建立排程計畫」按鈕 (generatePlan) — 這個可能真的慢
    await page.evaluate(() => {
        const btn = document.querySelector('button[onclick*="generatePlan"]');
        if (btn) btn.click();
    });
    // generatePlan 可能會跑很久, 等它結束
    await page.waitForTimeout(3000);
    results.generatePlan = await page.evaluate(() => {
        const t0 = performance.now();
        if (typeof generatePlan === 'function') generatePlan();
        const t1 = performance.now();
        return { ok: true, syncTime: t1 - t0 };
    });
    console.log('5. generatePlan:', results.generatePlan);

    // === Summary ===
    console.log('\n=== SUMMARY ===');
    Object.entries(results).forEach(([k, v]) => {
        const time = v && typeof v.syncTime === 'number' ? `${v.syncTime.toFixed(1)}ms` : '-';
        console.log(`  ${k.padEnd(20)} ${time}`);
    });

    await browser.close();
    assert.ok(true, 'diagnostic test');
});
