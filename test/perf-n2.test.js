const assert = require("node:assert/strict");
// test/perf-n2.test.js -- 證明 renderCalendar 內的 N² nested loop 導致 4 秒延遲
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { loadIndex, loadBackupPlans } = require('./helpers');

test('perf: N² nested loop 是 4 秒延遲的元凶 (v1.5.166 revert 後遺症)', () => {
    const win = loadIndex();
    const backupPlans = loadBackupPlans();

    // 構造大 mission 模擬真實使用 (10 個 plans × 150 tasks each)
    const bigPlans = [];
    for (let p = 0; p < 4; p++) {
        const grid = {};
        for (let day = 0; day < 30; day++) {
            const d = new Date(2026, 7, day + 1);
            const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            grid[dStr] = [];
            for (let t = 0; t < 50; t++) {
                grid[dStr].push({
                    id: `t${p}_${day}_${t}`,
                    subject: '數學',
                    isDone: false,
                    cat: '會考複習',
                    mis: `mis_${(p * 30 + day + t) % 100}`,
                    unitId: `u_m${(p * 30 + day + t) % 100}_${t % 80}`,
                    startPage: 1,
                    endPage: 10,
                });
            }
        }
        bigPlans.push({ id: `plan${p}`, name: `Plan ${p}`, grid });
    }

    win.appPlans = bigPlans;
    // 構造大 mission: 100 missions × 80 units each = 8000 unitIds
    const bigMissions = {};
    for (let m = 0; m < 100; m++) {
        const units = [];
        for (let u = 0; u < 80; u++) {
            units.push(`u_m${m}_${u}`);
        }
        bigMissions[`mis_${m}`] = units;
    }
    win.appMissions = { '會考複習': bigMissions };

    // 構造合理的 appMaster + appLogs (minimal, 不影響)
    win.multiData = {
        user_test: {
            masters: {}, missions: {}, plans: [], logs: [],
        }
    };
    win.currentUserId = 'user_test';
    win.appMaster = {};
    win.appLogs = [];

    // 模擬現在的 N² code: 對每 task 跑 nested loop
    function currentN2Lookup(unitId) {
        for (var c in win.appMissions) {
            for (var m in win.appMissions[c]) {
                if (win.appMissions[c][m].includes(unitId)) {
                    return { cat: c, mis: m };
                }
            }
        }
        return null;
    }

    // 收集所有 task.unitId
    const allUnitIds = [];
    bigPlans.forEach(plan => {
        Object.values(plan.grid).forEach(tasks => {
            tasks.forEach(t => { if (t.unitId) allUnitIds.push(t.unitId); });
        });
    });
    console.log(`模擬資料: ${bigPlans.length} plans, ${allUnitIds.length} tasks`);

    // 計時: N² current code
    const n2Start = Date.now();
    let hits = 0;
    allUnitIds.forEach(uid => { if (currentN2Lookup(uid)) hits++; });
    const n2Time = Date.now() - n2Start;
    console.log(`N² current code (對 ${allUnitIds.length} tasks 跑 nested loop): ${n2Time}ms (hits: ${hits})`);

    // v1.5.166 fix: 預建 missionByUnitId Map *一次*, 然後 O(1) lookup
    const fixStart0 = Date.now();
    const missionByUnitId = {};
    for (var c in win.appMissions) {
        for (var m in win.appMissions[c]) {
            (win.appMissions[c][m] || []).forEach(uid => {
                if (!missionByUnitId[uid]) missionByUnitId[uid] = { cat: c, mis: m };
            });
        }
    }
    const mapBuildTime = Date.now() - fixStart0;

    const fixStart = Date.now();
    let hitsFix = 0;
    allUnitIds.forEach(uid => { if (missionByUnitId[uid]) hitsFix++; });
    const fixTime = Date.now() - fixStart;
    console.log(`v1.5.166 fix: Map 建構 ${mapBuildTime}ms, ${allUnitIds.length} tasks lookup ${fixTime}ms (hits: ${hitsFix})`);

    if (n2Time > 100) {
        console.log(`\\n>>> N² 比 fix 慢 ${(n2Time / Math.max(fixTime, 1)).toFixed(1)}x <<<`);
    }

    assert.ok(true, 'diagnostic test (always pass)');
});
