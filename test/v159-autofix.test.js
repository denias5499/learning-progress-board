'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v159-1: title [v1.6.160] (latest)', () => assert.ok(/\[v1\.6\.160\]/.test(HTML)));
test('v159-2: 自動修正按鈕存在', () => {
    assert.ok(HTML.indexOf('autoFixAndReplan') >= 0);
});
test('v159-3: 確認 modal 存在', () => {
    assert.ok(HTML.indexOf('modal-auto-fix-confirm') >= 0);
});
test('v159-4: 回 wizard 按鈕存在', () => {
    assert.ok(HTML.indexOf('backToWizardFromWarnings') >= 0);
});
test('v159-5: 執行函數存在', () => {
    assert.ok(HTML.indexOf('executeAutoFix') >= 0);
});
test('v159-6: 全域變數', () => {
    assert.ok(HTML.indexOf('_autoFixPlan') >= 0);
});
test('v159-7: 確認對話框列詳細調整', () => {
    assert.ok(HTML.indexOf('showAutoFixConfirmModal') >= 0);
});
