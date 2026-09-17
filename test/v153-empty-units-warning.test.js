'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v153-1: title [v1.6.153]', () => assert.ok(/\[v1\.6\.153\]/.test(HTML)));
test('v153-2: Mode D 有 availableUnits=0 警告', () => {
    assert.ok(HTML.indexOf('本科目 (${escapeHtml(ws.name)}) 找不到單元') >= 0);
});
test('v153-3: 全部科目都空時有紅色警告', () => {
    assert.ok(/找不到任何單元/.test(HTML));
});
test('v153-4: v1.6.152 統計區塊保留', () => {
    assert.ok(/總計 \$\{ws\.availableUnits\.length\}/.test(HTML));
});
test('v153-5: console.log 仍存在', () => {
    assert.ok(HTML.indexOf('v1.6.152 wzUpdateSubjects') >= 0);
});
