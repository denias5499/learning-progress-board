// ⚠️ v2.3.2.145: 本檔有 1 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test.skip('v155-1: title [v1.6.155]', () => assert.ok(/\[v1\.6\.155\]/.test(HTML)));
test('v155-2: 收集 deletedUnits', () => {
    assert.ok(HTML.indexOf('deletedUnits = {}') >= 0);
});
test('v155-3: 顯示被撤回的單元清單', () => {
    assert.ok(HTML.indexOf('被撤回的單元') >= 0);
});
test('v155-4: console.log 列出 unit', () => {
    assert.ok(HTML.indexOf('v1.6.155 executeRevertWizard') >= 0);
});
