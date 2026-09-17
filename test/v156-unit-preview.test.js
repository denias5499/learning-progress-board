'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v156-1: title [v1.6.156]', () => assert.ok(/\[v1\.6\.156\]/.test(HTML)));
test('v156-2: 顯示未排 unit 名稱', () => {
    assert.ok(HTML.indexOf('未排 (顯示):') >= 0);
});
test('v156-3: 顯示已排 unit 名稱', () => {
    assert.ok(HTML.indexOf('已排過 (排在後面)') >= 0);
});
