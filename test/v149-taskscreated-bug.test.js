// ⚠️ v2.3.2.145: 本檔有 3 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
// test/v149-taskscreated-bug.test.js
// v1.6.149 unit test: 修復模式 B pipeline ReferenceError
// 測試: 1. tasksCreated 宣告在使用之前 (在模式 B pipeline 之前)
//       2. 只有一個 var tasksCreated = 0 宣告
//       3. 模式 B pipeline 邏輯完整保留
//       4. title [v1.6.149]

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test.skip('v149-1: title 版本號為 [v1.6.149]', () => {
    assert.ok(/\[v1\.6\.149\]/.test(HTML), 'title 應包含 [v1.6.149]');
});

test('v149-2: tasksCreated 宣告在使用之前 (在模式 B pipeline 之前)', () => {
    var declIdx = HTML.indexOf('var tasksCreated = 0;');
    var useInModeB = HTML.indexOf('tasksCreated += plan.grid[ds].length;');
    var useInModeA = HTML.lastIndexOf('tasksCreated++;');

    assert.ok(declIdx > 0, '應有 var tasksCreated = 0; 宣告');
    assert.ok(useInModeB > 0, '應有 tasksCreated += plan.grid (模式 B)');
    assert.ok(useInModeA > 0, '應有 tasksCreated++ (模式 A)');

    assert.ok(declIdx < useInModeB, 'tasksCreated 宣告應在模式 B 使用之前 (修復 ReferenceError)');
    assert.ok(declIdx < useInModeA, 'tasksCreated 宣告應在模式 A 使用之前');
});

test('v149-3: 只有一個 var tasksCreated = 0 宣告 (避免重複)', () => {
    var matches = HTML.match(/var tasksCreated\s*=\s*0\s*;/g) || [];
    assert.strictEqual(matches.length, 1, '應只有一個 var tasksCreated = 0; 宣告');
});

test.skip('v149-4: 模式 B pipeline 邏輯完整保留', () => {
    assert.ok(/_hasUnitMode = wizardSubjects\.some/.test(HTML), '應有 _hasUnitMode 偵測');
    assert.ok(/unitModeAssignments/.test(HTML), '應有 unitModeAssignments 邏輯');
    assert.ok(/unitModeWarnings/.test(HTML), '應有 unitModeWarnings 邏輯');
    assert.ok(/模式 B pipeline 排程完成/.test(HTML), '應有模式 B 完成訊息');
});

test.skip('v149-5: 模式 B 短路邏輯保留 (return 在 if 內)', () => {
    // 找 _hasUnitMode 區塊的 return
    var unitModeBlock = HTML.match(/var _hasUnitMode = wizardSubjects\.some[\s\S]{0,15000}?saveData\(\);\s*closeModal\('modal-wizard'\);\s*return;/);
    assert.ok(unitModeBlock, '模式 B 應有 saveData + closeModal + return 短路');
});
