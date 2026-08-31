// v1.6.88: 修 crop area position: relative (讓 crop box 正確定位)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.88: .wn-crop-area CSS 有 position: relative', () => {
    const m = html.match(/\.wn-crop-area\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-crop-area CSS 應存在');
    const css = m[1];
    assert.ok(css.includes('position: relative'), '應有 position: relative');
});

test('v1.6.88: #wn-crop-area inline style 有 position: relative', () => {
    const m = html.match(/<div id="wn-crop-area"[^>]*style="([^"]*)"/);
    assert.ok(m, 'inline style 應存在');
    const style = m[1];
    assert.ok(style.includes('position:relative') || style.includes('position: relative'),
        'inline style 應有 position: relative');
});

test('v1.6.88: .wn-crop-box CSS 完整 (position + border + background)', () => {
    const m = html.match(/\.wn-crop-box\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-crop-box CSS 應存在');
    const css = m[1];
    assert.ok(css.includes('position: absolute'), '應有 position: absolute');
    assert.ok(css.includes('border: 3px solid #1a82e2'), '應有藍色 3px 邊框');
    assert.ok(css.includes('background: rgba(26, 130, 226'), '應有半透明藍色背景');
});

test('v1.6.88: title 更新為 [v1.6.88]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.88\]<\/title>/.test(html));
});
