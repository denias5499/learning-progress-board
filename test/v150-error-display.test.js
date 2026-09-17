// test/v150-error-display.test.js
// v1.6.150 unit test: generatePlan 改成 wrapper + try-catch，顯示錯誤訊息

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v150-1: title 版本號為 [v1.6.150]', () => {
    assert.ok(/\[v1\.6\.150\]/.test(HTML), 'title 應包含 [v1.6.150]');
});

test('v150-2: generatePlan 是 wrapper (呼叫 _generatePlanInner)', () => {
    var genplanMatch = HTML.match(/function generatePlan\(\)\s*\{[^}]*_generatePlanInner\(\)/);
    assert.ok(genplanMatch, 'generatePlan 應呼叫 _generatePlanInner()');
});

test('v150-3: generatePlan 有 try-catch 處理錯誤', () => {
    var genplanMatch = HTML.match(/function generatePlan\(\)\s*\{[^}]*try\s*\{[^}]*\}\s*catch/);
    assert.ok(genplanMatch, 'generatePlan 應有 try-catch');
});

test('v150-4: catch 內呼叫 alert 顯示錯誤訊息', () => {
    var catchBlock = HTML.match(/catch\s*\(\s*e\s*\)\s*\{[\s\S]{0,500}?alert\(['"]/);
    assert.ok(catchBlock, 'catch 內應有 alert 顯示錯誤');
    assert.ok(/e\.message/.test(catchBlock[0]) || /e\.message/.test(HTML), 'alert 應包含 e.message');
});

test('v150-5: _generatePlanInner 函數存在', () => {
    assert.ok(/function\s+_generatePlanInner\s*\(/.test(HTML), '應有 _generatePlanInner 函數');
});

test('v150-6: v149 修復保留 (saveToLocal 而非 saveData)', () => {
    var calls = HTML.match(/\bsaveData\s*\(\s*\)/g) || [];
    assert.strictEqual(calls.length, 0, '不應有 saveData()');
});

test('v150-7: tasksCreated 宣告順序正確', () => {
    var declIdx = HTML.indexOf('var tasksCreated = 0;');
    var useInModeB = HTML.indexOf('tasksCreated += plan.grid[ds].length;');
    assert.ok(declIdx > 0 && useInModeB > 0);
    assert.ok(declIdx < useInModeB, 'tasksCreated 宣告應在 mode B 使用之前');
});
