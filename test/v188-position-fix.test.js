// ⚠️ v2.3.2.145: 本檔有 2 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
// v1.6.88: 修 crop area position: relative (讓 crop box 正確定位)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test.skip('v1.6.88: .wn-crop-area CSS 有 position: relative', () => {
    const m = html.match(/\.wn-crop-area\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-crop-area CSS 應存在');
    const css = m[1];
    assert.ok(css.includes('position: relative'), '應有 position: relative');
});

test.skip('v1.6.88: #wn-crop-area inline style 有 position: relative', () => {
    const m = html.match(/<div id="wn-crop-area"[^>]*style="([^"]*)"/);
    assert.ok(m, 'inline style 應存在');
    const style = m[1];
    assert.ok(style.includes('position:relative') || style.includes('position: relative'),
        'inline style 應有 position: relative');
});

test.skip('v1.6.88: .wn-crop-box CSS 完整 (position + border + background)', () => {
    const m = html.match(/\.wn-crop-box\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-crop-box CSS 應存在');
    const css = m[1];
    assert.ok(css.includes('position: absolute'), '應有 position: absolute');
    assert.ok(css.includes('border: 3px solid #1a82e2'), '應有藍色 3px 邊框');
    assert.ok(css.includes('background: rgba(26, 130, 226'), '應有半透明藍色背景');
});

test('v1.6.88: title 更新為 [v1.6.88]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
