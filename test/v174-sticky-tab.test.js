// v1.6.83: tab sticky + 更明顯的 active 視覺
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.83: wn-tabs sticky 定位', () => {
    // 確認 HTML 有 inline style position:sticky + top:0
    assert.ok(/<div class="wn-tabs"[^>]*style="[^"]*position:\s*sticky/.test(html),
        'wn-tabs 應有 position: sticky inline style');
    assert.ok(/<div class="wn-tabs"[^>]*style="[^"]*top:\s*0/.test(html),
        'wn-tabs 應有 top: 0 inline style');
});

test('v1.6.83: tab 字體更大 (1.05em + 12px padding)', () => {
    const m = html.match(/\.wn-tab\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-tab CSS 應存在');
    const css = m[1];
    assert.ok(/font-size:\s*1\.05em/.test(css), '應有 font-size: 1.05em');
    assert.ok(/padding:\s*12px/.test(css), '應有 padding: 12px');
});

test('v1.6.83: tab active 放大 1.25 + 箭頭', () => {
    const m = html.match(/\.wn-tab\.active\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-tab.active CSS 應存在');
    const css = m[1];
    assert.ok(/transform:\s*scale\(1\.25\)/.test(css), '應放大 1.25');
    assert.ok(/font-size:\s*1\.15em/.test(css), '應 font-size: 1.15em');
    assert.ok(/padding:\s*14px/.test(css), '應 padding: 14px');
});

test('v1.6.83: tab active 有向下箭頭 ::after', () => {
    const m = html.match(/\.wn-tab\.active::after\s*\{([\s\S]*?)\}/);
    assert.ok(m, 'tab active 應有 ::after 偽元素');
    const css = m[1];
    assert.ok(/border-left:/.test(css), '箭頭應有 border-left');
    assert.ok(/border-right:/.test(css), '箭頭應有 border-right');
    assert.ok(/border-top:/.test(css), '箭頭應有 border-top (形成向下三角形)');
});

test('v1.6.83: title 更新為 [v1.6.83]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.83]<\/title>/.test(html));
});
