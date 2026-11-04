// v1.6.83: mousedown 直接新增 crop box (簡化邏輯, 取代 v1.6.83 isClick 判斷)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');





test('v1.6.83: 不再有 isClick 邏輯', () => {
    assert.ok(!html.includes('isClick'), '不應再有 isClick');
    assert.ok(!html.includes('mouseDownX'), '不應再有 mouseDownX');
});

test('v1.6.83: title 更新為 [v1.6.83]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
