'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v151-1: title 版本號為 [v1.6.151]', () => {
    assert.ok(/\[v1\.6\.151\]/.test(HTML), 'title 應包含 [v1.6.151]');
});

test('v151-2: executeRevertWizard 內有 invalidateSchedCache()', () => {
    // Find executeRevertWizard function body
    var start = HTML.indexOf('function executeRevertWizard()');
    var end = HTML.indexOf('\n        function ', start + 30);
    var body = HTML.substring(start, end);
    assert.ok(/invalidateSchedCache\s*\(\s*\)/.test(body), 'executeRevertWizard 應呼叫 invalidateSchedCache()');
});

test('v151-3: 有 modal-unit-warnings', () => {
    assert.ok(/id="modal-unit-warnings"/.test(HTML), '應有 modal-unit-warnings');
    assert.ok(/id="unit-warnings-preview"/.test(HTML), '應有 preview 區');
    assert.ok(/id="unit-warnings-full"/.test(HTML), '應有 full 區');
});

test('v151-4: 有 showUnitWarningsModal 函數', () => {
    assert.ok(/function\s+showUnitWarningsModal\s*\(/.test(HTML));
});

test('v151-5: 有 toggleUnitWarningsExpand 函數', () => {
    assert.ok(/function\s+toggleUnitWarningsExpand\s*\(/.test(HTML));
});

test('v151-6: 有 closeUnitWarningsModal 函數', () => {
    assert.ok(/function\s+closeUnitWarningsModal\s*\(/.test(HTML));
});

test('v151-7: 不再有舊的 alert(warnMsg) 警告', () => {
    assert.ok(!/var warnMsg = '📅 模式 B pipeline/.test(HTML), '不應再有舊 alert');
    assert.ok(/showUnitWarningsModal\(unitModeWarnings\)/.test(HTML), '應改為 showUnitWarningsModal');
});

test('v151-8: 展開按鈕在 5 個以內警告時隱藏', () => {
    assert.ok(/_unitWarningsData\.length\s*>\s*5/.test(HTML), '應有 > 5 才顯示展開按鈕的邏輯');
});
