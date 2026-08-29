// v1.6.79: 點擊圖片直接新增 crop box
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.79: mousedown 記錄 mouseDownX/Y 位置', () => {
    // mousedown handler 應該包含 mouseDownX = e.clientX
    const m = html.match(/overlay\.addEventListener\('mousedown'[\s\S]+?\}\);/);
    assert.ok(m, '應有 mousedown handler');
    const code = m[0];
    assert.ok(code.includes('mouseDownX'), '應設定 mouseDownX');
    assert.ok(code.includes('mouseDownY'), '應設定 mouseDownY');
});

test('v1.6.79: mouseup 判斷 click vs drag', () => {
    const m = html.match(/overlay\.addEventListener\('mouseup'[\s\S]+?\}\);/);
    assert.ok(m, '應有 mouseup handler');
    const code = m[0];
    assert.ok(code.includes('isClick'), '應判斷 isClick');
    assert.ok(code.includes('dx < 5') || code.includes('dx<5'), '應檢查 dx < 5');
    assert.ok(code.includes('dy < 5') || code.includes('dy<5'), '應檢查 dy < 5');
});

test('v1.6.79: click 自動新增 box (Math.min 150)', () => {
    const m = html.match(/overlay\.addEventListener\('mouseup'[\s\S]+?\}\);/);
    assert.ok(m, '應有 mouseup handler');
    const code = m[0];
    assert.ok(code.includes('Math.min(150'), 'click 應新增 150x150 box');
});

test('v1.6.79: drag 仍檢查相對座標 5%', () => {
    const m = html.match(/overlay\.addEventListener\('mouseup'[\s\S]+?\}\);/);
    assert.ok(m, '應有 mouseup handler');
    const code = m[0];
    assert.ok(code.includes('relW < 0.05') || code.includes('relW<0.05'), 'drag 應檢查相對座標 5%');
});

test('v1.6.79: click 模式不 alert (drag 模式才 alert)', () => {
    const m = html.match(/overlay\.addEventListener\('mouseup'[\s\S]+?\}\);/);
    assert.ok(m, '應有 mouseup handler');
    const code = m[0];
    // 計算 alert 數量 - 應該只有 1 (drag 模式的「太小」)
    const alertCount = (code.match(/alert\(/g) || []).length;
    assert.ok(alertCount <= 1, 'click 模式不該 alert (alert 數應 ≤ 1)');
});

test('v1.6.79: title 更新為 [v1.6.79]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.79\]<\/title>/.test(html));
});
