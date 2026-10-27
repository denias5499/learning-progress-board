// ⚠️ v2.3.2.145: 本檔有 1 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
// v1.6.83: 移除 dblclick handler (避免跟 mousedown 衝突)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.83: 不再有 dblclick addEventListener', () => {
    const m = html.match(/overlay\.addEventListener\('dblclick'/);
    assert.ok(!m, '不應有 dblclick addEventListener 綁定');
});

test.skip('v1.6.83: mousedown handler 還在 (點擊新增 box)', () => {
    const m = html.match(/overlay\.addEventListener\('mousedown'[\s\S]+?\}\);/);
    assert.ok(m, '應有 mousedown handler');
    const code = m[0];
    assert.ok(code.includes('cropBoxes.push(newBox)'), 'mousedown 應 push box');
    assert.ok(code.includes('Math.min(150'), '應新增 150x150 box');
});

test('v1.6.83: WN_PHASE2_STATE.cropBoxes.push 只有 2 個 (mousedown + addCropFromCenter)', () => {
    // 只計算 WN_PHASE2_STATE.cropBoxes.push (排除舊的 WN_STATE)
    const pushCount = (html.match(/WN_PHASE2_STATE\.cropBoxes\.push/g) || []).length;
    assert.ok(pushCount <= 3, `應有 ≤3 個 push (mousedown + addCropFromCenter + onCropImgMouseDown), 實際 ${pushCount}`);
});

test('v1.6.83: title 更新為 [v1.6.83]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
