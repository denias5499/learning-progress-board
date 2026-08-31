// v1.6.98: 移除重複的 WN_setupCropEvents (確保只跑 page-container 設計)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

function extractFunctionBody(content, funcName) {
    const idx = content.indexOf('function ' + funcName + '(');
    if (idx < 0) return null;
    const nextIdx = content.indexOf('function ', idx + 30);
    if (nextIdx < 0) return content.substring(idx);
    return content.substring(idx, nextIdx);
}

test('v1.6.98: WN_setupCropEvents 只宣告 1 次 (不要覆蓋)', () => {
    const count = (html.match(/function\s+WN_setupCropEvents\s*\(/g) || []).length;
    assert.equal(count, 1, `WN_setupCropEvents 應只宣告 1 次, 實際 ${count} 次`);
});

test('v1.6.98: WN_setupCropEvents 使用 page-container (不是 cropArea)', () => {
    const body = extractFunctionBody(html, 'WN_setupCropEvents');
    assert.ok(body.includes('wn-page-container'), '應用 page-container');
});

test('v1.6.98: saveSettingsAndAlert 加錯誤訊息 (讓 user 看到失敗原因)', () => {
    const body = extractFunctionBody(html, 'saveSettingsAndAlert');
    assert.ok(body, '應定義');
    assert.ok(body.includes("alert('❌"), '應有 alert 顯示錯誤');
    assert.ok(body.includes("extractCurrentEditorData failed"), '應 log extract 失敗');
    assert.ok(body.includes("saveToLocal failed"), '應 log save 失敗');
});

test('v1.6.98: title 更新為 [v1.6.98]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.98\]<\/title>/.test(html));
});
