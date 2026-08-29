// v1.6.81: 移除 dblclick handler (避免跟 mousedown 衝突)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.81: 不再有 dblclick addEventListener', () => {
    const m = html.match(/overlay\.addEventListener\('dblclick'/);
    assert.ok(!m, '不應有 dblclick addEventListener 綁定');
});

test('v1.6.81: mousedown handler 還在 (點擊新增 box)', () => {
    const m = html.match(/overlay\.addEventListener\('mousedown'[\s\S]+?\}\);/);
    assert.ok(m, '應有 mousedown handler');
    const code = m[0];
    assert.ok(code.includes('cropBoxes.push(newBox)'), 'mousedown 應 push box');
    assert.ok(code.includes('Math.min(150'), '應新增 150x150 box');
});

test('v1.6.81: WN_PHASE2_STATE.cropBoxes.push 只有 2 個 (mousedown + addCropFromCenter)', () => {
    // 只計算 WN_PHASE2_STATE.cropBoxes.push (排除舊的 WN_STATE)
    const pushCount = (html.match(/WN_PHASE2_STATE\.cropBoxes\.push/g) || []).length;
    assert.ok(pushCount === 2, `應只有 2 個 push (mousedown + addCropFromCenter), 實際 ${pushCount}`);
});

test('v1.6.81: title 更新為 [v1.6.81]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.81\]<\/title>/.test(html));
});
