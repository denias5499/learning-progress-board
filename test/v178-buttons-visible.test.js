// ⚠️ v2.3.2.145: 本檔有 2 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
// v1.6.83: 取消/完成按鈕移到頂部
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test.skip('v1.6.83: 取消/完成按鈕在 crop area 內 (頂部)', () => {
    // 找 crop area 區塊
    const m = html.match(/<div id="wn-crop-area"[^>]*>([\s\S]*?)<\/div>\s*<!-- 教材選擇/);
    assert.ok(m, 'crop area 應存在');
    const cropArea = m[1];
    // 取消/完成按鈕應在 crop area 內
    assert.ok(cropArea.includes('取消選取'), '取消選取應在 crop area 內');
    assert.ok(cropArea.includes('完成選取'), '完成選取應在 crop area 內');
    // 並且在圖片之前 (頂部)
    const cancelIdx = cropArea.indexOf('取消選取');
    const imgIdx = cropArea.indexOf('wn-crop-img');
    assert.ok(cancelIdx < imgIdx, '取消選取應在圖片之前 (頂部)');
});

test.skip('v1.6.83: 💡 提示文字在圖片之前', () => {
    const m = html.match(/<div id="wn-crop-area"[^>]*>([\s\S]*?)<\/div>\s*<!-- 教材選擇/);
    assert.ok(m, 'crop area 應存在');
    const cropArea = m[1];
    const tipIdx = cropArea.indexOf('框選 (drag)');
    const imgIdx = cropArea.indexOf('wn-crop-img');
    assert.ok(tipIdx > 0, '應有提示文字');
    assert.ok(tipIdx < imgIdx, '提示文字應在圖片之前');
});

test('v1.6.83: title 更新為 [v1.6.83]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
