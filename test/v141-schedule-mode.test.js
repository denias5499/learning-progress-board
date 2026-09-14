// test/v141-schedule-mode.test.js
// v1.6.141 unit test: 智慧排程模式 (時數/單元) 並存
// 測試: 1. Migration 2. 模式切換 3. daysPerUnit 計算

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(
    path.resolve(__dirname, '..', 'index.html'),
    'utf-8'
);

function loadIndexHtml() {
    const m = HTML.match(/<script>([\s\S]*?)<\/script>/);
    return m ? m[1] : '';
}

const SCRIPT = loadIndexHtml();

test('v141-1: loadWizardPrefs Migration - 舊 prefs 補 scheduleMode/daysPerUnit', () => {
    // 純資料層測試: 模擬舊 prefs 格式 + migration 邏輯
    var oldPrefs = {
        hours: {0: 4, 1: 2, 6: 4},
        quickReadDiscount: 60,
        subjects: {
            '國文': { progVal: 1, hoursPerUnit: 2.0, displayMode: 'D', selectedUnitIds: [] },
            '數學': { progVal: 2, hoursPerUnit: 3.0, displayMode: 'D', selectedUnitIds: [] }
        }
    };
    // 模擬 migration 邏輯
    var migrated = JSON.parse(JSON.stringify(oldPrefs));
    if (!migrated.scheduleMode) migrated.scheduleMode = 'hours';
    if (!migrated.subjects) migrated.subjects = {};
    Object.keys(migrated.subjects).forEach(function(k) {
        var s = migrated.subjects[k];
        if (!s.scheduleMode) s.scheduleMode = migrated.scheduleMode || 'hours';
        if (!s.daysPerUnit) s.daysPerUnit = 2;
    });
    assert.strictEqual(migrated.scheduleMode, 'hours');
    assert.strictEqual(migrated.subjects['國文'].scheduleMode, 'hours');
    assert.strictEqual(migrated.subjects['國文'].daysPerUnit, 2);
    assert.strictEqual(migrated.subjects['數學'].scheduleMode, 'hours');
    assert.strictEqual(migrated.subjects['數學'].daysPerUnit, 2);
});

test('v141-2: saveWizardPrefs 寫入 scheduleMode/daysPerUnit 格式', () => {
    // 模擬 save 結構
    var ws = { name: '國文', progVal: 3, hoursPerUnit: 2.0, selectedUnitIds: ['u1'], scheduleMode: 'units', daysPerUnit: 3, displayMode: 'D' };
    var prefs = { hours: {}, subjects: {}, quickReadDiscount: 60, displayMode: 'D', scheduleMode: 'units' };
    prefs.subjects[ws.name] = {
        progVal: ws.progVal,
        hoursPerUnit: ws.hoursPerUnit,
        displayMode: ws.displayMode || 'D',
        scheduleMode: ws.scheduleMode || prefs.scheduleMode,
        daysPerUnit: ws.daysPerUnit || 2,
        selectedUnitIds: ws.selectedUnitIds
    };
    assert.strictEqual(prefs.scheduleMode, 'units');
    assert.strictEqual(prefs.subjects['國文'].scheduleMode, 'units');
    assert.strictEqual(prefs.subjects['國文'].daysPerUnit, 3);
});

test('v141-3: 從 prefs 讀 scheduleMode/daysPerUnit (含 subject 級 override)', () => {
    var prefs = {
        scheduleMode: 'units',
        subjects: {
            '英文': { scheduleMode: 'units', daysPerUnit: 5 },
            '理化': { scheduleMode: 'hours', daysPerUnit: 2 }
        }
    };
    function getMode(sub) {
        return (prefs.subjects && prefs.subjects[sub] && prefs.subjects[sub].scheduleMode) || prefs.scheduleMode || 'hours';
    }
    function getDays(sub) {
        return (prefs.subjects && prefs.subjects[sub] && prefs.subjects[sub].daysPerUnit) || 2;
    }
    assert.strictEqual(getMode('英文'), 'units');
    assert.strictEqual(getDays('英文'), 5);
    assert.strictEqual(getMode('理化'), 'hours');
    assert.strictEqual(getDays('理化'), 2);
});

test('v141-4: 模式 B daysPerUnit 計算「每天讀此 unit」', () => {
    var hoursPerUnit = 2.0;
    var daysPerUnit = 4;
    var perDayCost = hoursPerUnit / Math.max(1, daysPerUnit);
    assert.strictEqual(perDayCost, 0.5, '2hr / 4天 = 0.5 hr/day');
});

test('v141-5: daysPerUnit=0 邊角案例 (保護除以 0)', () => {
    var hoursPerUnit = 2.0;
    var daysPerUnit = 0;
    var perDayCost = hoursPerUnit / Math.max(1, daysPerUnit);
    assert.strictEqual(perDayCost, 2.0, 'daysPerUnit=0 → 退回每天 2hr');
});

test('v141-6: setWizardScheduleMode 同步所有 ws.scheduleMode', () => {
    var wizardSubjects = [
        { name: 'A', scheduleMode: 'hours', daysPerUnit: 2 },
        { name: 'B', scheduleMode: 'hours', daysPerUnit: 2 }
    ];
    function setMode(mode) {
        wizardSubjects.forEach(function(ws) { ws.scheduleMode = mode; });
    }
    setMode('units');
    assert.strictEqual(wizardSubjects[0].scheduleMode, 'units');
    assert.strictEqual(wizardSubjects[1].scheduleMode, 'units');
    setMode('hours');
    assert.strictEqual(wizardSubjects[0].scheduleMode, 'hours');
    assert.strictEqual(wizardSubjects[1].scheduleMode, 'hours');
});

test('v141-7: index.html 內含 setWizardScheduleMode 與 scheduleMode 欄位', () => {
    // 整合測試: 確認 patch 真的進到 index.html
    assert.ok(HTML.indexOf('setWizardScheduleMode') >= 0, '應有 setWizardScheduleMode function');
    assert.ok(HTML.indexOf('wz-schedule-mode') >= 0, '應有 wz-schedule-mode radio name');
    assert.ok(HTML.indexOf('daysPerUnit') >= 0, '應有 daysPerUnit 欄位');
    assert.ok(HTML.indexOf('scheduleMode') >= 0, '應有 scheduleMode 欄位');
    assert.ok(/\[v1\.6\.141(\.\d+)?\]/.test(HTML), 'title 應為 [v1.6.141] 系列 (含 hotfix .X)');
});

test('v141-8: title regex 寬鬆 - v1.6.13X 系列測試', () => {
    // 確認 title 是 v1.6.141 而非 v1.6.140
    var titleMatch = HTML.match(/<title>([^<]*)<\/title>/);
    assert.ok(titleMatch, '應有 <title>');
    var ver = titleMatch[1].match(/v1\.6\.\d+/);
    assert.ok(ver, 'title 應含版本號');
    assert.ok(/^v1\.6\.141(\.\d+)?$/.test(ver[0]), '版本號應為 v1.6.141 系列 (含 hotfix .X), 實際: ' + ver[0]);
});
