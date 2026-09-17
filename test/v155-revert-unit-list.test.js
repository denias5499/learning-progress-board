'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v155-1: title [v1.6.155]', () => assert.ok(/\[v1\.6\.155\]/.test(HTML)));
test('v155-2: 收集 deletedUnits', () => {
    assert.ok(HTML.indexOf('deletedUnits = {}') >= 0);
});
test('v155-3: 顯示被撤回的單元清單', () => {
    assert.ok(HTML.indexOf('被撤回的單元') >= 0);
});
test('v155-4: console.log 列出 unit', () => {
    assert.ok(HTML.indexOf('v1.6.155 executeRevertWizard') >= 0);
});
