'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v152-1: title [v1.6.152]', () => assert.ok(/\[v1\.6\.152\]/.test(HTML)));
test('v152-2: Mode D 預設展開', () => {
    assert.ok(/isCollapsed = ws\._modeDCollapsed === true;/.test(HTML), '預設應該為 false (展開)');
});
test('v152-3: wzUpdateSubjects 有 console.log 統計', () => {
    assert.ok(HTML.indexOf('v1.6.152 wzUpdateSubjects') >= 0);
});
test('v152-4: 顯示單元統計區塊', () => {
    assert.ok(/📦 <b>總計/.test(HTML));
    assert.ok(/📅 已排過/.test(HTML));
});
test('v152-5: executeRevertWizard console.log', () => {
    assert.ok(HTML.indexOf('v1.6.152 executeRevertWizard') >= 0);
});
