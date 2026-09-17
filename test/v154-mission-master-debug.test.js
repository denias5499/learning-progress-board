'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v154-1: title [v1.6.154]', () => assert.ok(/\[v1\.6\.154\]/.test(HTML)));
test('v154-2: 顯示 mission vs master 對照', () => {
    assert.ok(HTML.indexOf('unitIds 數') >= 0);
});
test('v154-3: 空單元警告顯示 mission 名', () => {
    assert.ok(HTML.indexOf('本科目 (${escapeHtml(ws.name)}) 在當前任務') >= 0);
});
