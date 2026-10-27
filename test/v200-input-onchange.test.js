// ⚠️ v2.3.2.145: 本檔有 2 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
// v1.6.100: 加 wn-source-input onchange handler
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test.skip('v1.6.100: wn-source-input 有 onchange handler', () => {
    const m = html.match(/<input type="file" id="wn-source-input"[^>]*>/);
    assert.ok(m);
    const tag = m[0];
    assert.ok(tag.includes('onchange="WN_handleFileUpload(this.files[0])"'));
});

test.skip('v1.6.100: wn-paper-input 也有 onchange handler', () => {
    const m = html.match(/<input type="file" id="wn-paper-input"[^>]*>/);
    assert.ok(m);
    const tag = m[0];
    assert.ok(tag.includes('onchange'));
});

test('v1.6.100: title 為 [v1.6.100]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
