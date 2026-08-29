// v1.6.80: mousedown 直接新增 crop box (簡化邏輯, 取代 v1.6.79 isClick 判斷)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.80: mousedown 立即新增 150x150 crop box', () => {
    const m = html.match(/overlay\.addEventListener\('mousedown'[\s\S]+?\}\);/);
    assert.ok(m, '應有 mousedown handler');
    const code = m[0];
    assert.ok(code.includes('cropBoxes.push(newBox)'), '應直接 push newBox');
    assert.ok(code.includes('Math.min(150'), '應新增 150x150 box');
});

test('v1.6.80: mouseup 變 no-op (v1.6.80 簡化)', () => {
    const m = html.match(/overlay\.addEventListener\('mouseup'[\s\S]+?\}\);/);
    assert.ok(m, '應有 mouseup handler');
    const code = m[0];
    assert.ok(code.includes('no-op'), 'mouseup 應為 no-op');
});

test('v1.6.80: 不再有 isClick 邏輯', () => {
    assert.ok(!html.includes('isClick'), '不應再有 isClick');
    assert.ok(!html.includes('mouseDownX'), '不應再有 mouseDownX');
});

test('v1.6.80: title 更新為 [v1.6.80]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.80\]<\/title>/.test(html));
});
