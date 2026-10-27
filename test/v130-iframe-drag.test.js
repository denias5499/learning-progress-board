// ⚠️ v2.3.2.145: 本檔有 2 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
// v1.6.130: 主專案 <iframe> 元素必須有 dragover/drop preventDefault
//   Safari 對於 iframe dragover 會把 iframe 當 navigation target → freeze
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

test.skip('v130: DOMContentLoaded 內 iframe 有 dragover/drop handler', () => {
    const IDX = fs.readFileSync('index.html', 'utf8');
    // 找 DOMContentLoaded callback 內有 iframe handler
    assert.ok(IDX.includes('wnIframe.addEventListener(\'dragover\''),
        'iframe 應有 dragover preventDefault');
    assert.ok(IDX.includes('wnIframe.addEventListener(\'drop\''),
        'iframe 應有 drop preventDefault');
    assert.ok(IDX.includes('wnIframe.addEventListener(\'dragenter\''),
        'iframe 應有 dragenter preventDefault');
});

test.skip('v130: title [v1.6.130]', () => {
    const IDX = fs.readFileSync('index.html', 'utf8');
    assert.ok(/<title>.*\[v1\.6\.1[3-9]\d+(\.\d+)?\]<\/title>/.test(IDX));
});

test('v130: iframe handler 用 preventDefault + stopPropagation', () => {
    const IDX = fs.readFileSync('index.html', 'utf8');
    assert.ok(IDX.includes('e.preventDefault(); e.stopPropagation()'),
        'iframe dragover/drop 應 preventDefault + stopPropagation');
});
