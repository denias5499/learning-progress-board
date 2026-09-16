// test/v149-generateplan-bug.test.js
// v1.6.149 unit test: 修復 generatePlan 兩個 silent error
//   1. saveData() 不存在 → 改用 saveToLocal()
//   2. tasksCreated 提前宣告（原本在 return 之後，模式 B 用到會 ReferenceError）

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v149-1: title 版本號為 [v1.6.149]', () => {
    assert.ok(/\[v1\.6\.149\]/.test(HTML), 'title 應包含 [v1.6.149]');
});

test('v149-2: 沒有 saveData() 呼叫 (改成 saveToLocal)', () => {
    var calls = HTML.match(/\bsaveData\s*\(\s*\)/g) || [];
    assert.strictEqual(calls.length, 0, '不應有 saveData() 呼叫');
});

test('v149-3: generatePlan 模式 B 短路處用 saveToLocal()', () => {
    var idx = HTML.indexOf('saveToLocal()');
    var closeIdx = HTML.indexOf("closeModal('modal-wizard')", idx);
    assert.ok(idx > 0 && closeIdx > idx, '應有 saveToLocal() + closeModal 短路區塊');
});

test('v149-4: tasksCreated 宣告在模式 B 使用之前', () => {
    var declIdx = HTML.indexOf('var tasksCreated = 0;');
    var useInModeB = HTML.indexOf('tasksCreated += plan.grid[ds].length;');

    assert.ok(declIdx > 0, '應有 var tasksCreated = 0; 宣告');
    assert.ok(useInModeB > 0, '應有 tasksCreated += plan.grid (模式 B)');
    assert.ok(declIdx < useInModeB, 'tasksCreated 宣告應在模式 B 使用之前');
});

test('v149-5: 只有一個 var tasksCreated = 0; 宣告', () => {
    var matches = HTML.match(/var tasksCreated\s*=\s*0\s*;/g) || [];
    assert.strictEqual(matches.length, 1, '應只有一個 var tasksCreated = 0;');
});

test('v149-6: saveToLocal 函數有定義', () => {
    assert.ok(/function\s+saveToLocal\s*\(/.test(HTML), '應有 function saveToLocal() 定義');
});

test('v149-7: 模式 B pipeline 其他邏輯完整保留', () => {
    assert.ok(/_hasUnitMode = wizardSubjects\.some/.test(HTML));
    assert.ok(/unitModeAssignments/.test(HTML));
    assert.ok(/unitModeWarnings/.test(HTML));
});

test('v149-8: unitModeAssignments[ds2] push 前有 init 守衛', () => {
    var ds2PushBlock = HTML.match(/var ds2 = sortedDates\[dayCursor\][\s\S]*?unitModeAssignments\[ds2\]\.push/);
    assert.ok(ds2PushBlock, '應有 ds2 push 區塊');
    assert.ok(/if\s*\(\s*!unitModeAssignments\[ds2\]\s*\)\s*unitModeAssignments\[ds2\]\s*=\s*\[\]/.test(ds2PushBlock[0]),
              'ds2 push 前應有 init 守衛');
});
