// v1.6.80: mousedown 立即新增 crop box (最簡單邏輯)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.80: mousedown handler 立即新增 box', () => {
    const m = html.match(/overlay\.addEventListener\('mousedown'[\s\S]+?\}\);/);
    assert.ok(m, '應有 mousedown handler');
    const code = m[0];
    assert.ok(code.includes('cropBoxes.push(newBox)'), 'mousedown 應立即新增 box');
    assert.ok(code.includes('Math.min(150'), '應新增 150x150 box');
    assert.ok(code.includes('e.stopPropagation()'), '應 stopPropagation');
});

test('v1.6.80: 不再有 mouseup click 邏輯 (移除複雜的 isClick 判斷)', () => {
    // mouseup 應該變簡單 (只處理 drag)
    const m = html.match(/overlay\.addEventListener\('mouseup'[\s\S]+?\}\);/);
    assert.ok(m, '應有 mouseup handler');
    const code = m[0];
    // 移除的複雜邏輯
    assert.ok(!code.includes('isClick'), '不應再有 isClick 邏輯');
    assert.ok(!code.includes('mouseDownX'), '不應再有 mouseDownX 引用');
});

test('v1.6.80: mousedown 與 mouseup 各自獨立 (mousedown 新增, mouseup drag)', () => {
    // mousedown 應該獨立完成新增 (不需要 mouseup 確認)
    const mousedown = html.match(/overlay\.addEventListener\('mousedown'[\s\S]+?\}\);/);
    assert.ok(mousedown[0].includes('cropBoxes.push(newBox)'), 'mousedown 獨立新增');
});

test('v1.6.80: title 更新為 [v1.6.81]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.81\]<\/title>/.test(html));
});
