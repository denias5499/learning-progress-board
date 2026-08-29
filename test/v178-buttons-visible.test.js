// v1.6.78: 取消/完成按鈕移到頂部
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.78: 取消/完成按鈕在 crop area 內 (頂部)', () => {
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

test('v1.6.78: 💡 提示文字在圖片之前', () => {
    const m = html.match(/<div id="wn-crop-area"[^>]*>([\s\S]*?)<\/div>\s*<!-- 教材選擇/);
    assert.ok(m, 'crop area 應存在');
    const cropArea = m[1];
    const tipIdx = cropArea.indexOf('框選 (drag)');
    const imgIdx = cropArea.indexOf('wn-crop-img');
    assert.ok(tipIdx > 0, '應有提示文字');
    assert.ok(tipIdx < imgIdx, '提示文字應在圖片之前');
});

test('v1.6.78: title 更新為 [v1.6.78]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.79\]<\/title>/.test(html));
});
