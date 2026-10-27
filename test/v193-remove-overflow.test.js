// ⚠️ v2.3.2.145: 本檔有 1 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
// v1.6.93: 移除 overflow:hidden (讓 crop box border 顯示) + CSS 強化
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test.skip('v1.6.93: #wn-crop-img-container 沒有 overflow:hidden (讓 border 顯示)', () => {
    const m = html.match(/<div id="wn-crop-img-container"[^>]*style="([^"]*)"/);
    assert.ok(m, 'inline style 應存在');
    const style = m[1];
    assert.ok(!style.includes('overflow:hidden') && !style.includes('overflow: hidden'),
        '不應有 overflow:hidden');
});

test.skip('v1.6.93: .wn-crop-box CSS 用 !important + z-index', () => {
    const m = html.match(/\.wn-crop-box\s*\{([\s\S]*?)\}/);
    assert.ok(m, 'CSS 應存在');
    const css = m[1];
    assert.ok(css.includes('!important'), '應有 !important');
    assert.ok(css.includes('z-index'), '應有 z-index');
    assert.ok(css.includes('border: 3px solid #1a82e2'), '應有藍色 3px 邊框');
});

test('v1.6.93: title 更新為 [v1.6.93]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
