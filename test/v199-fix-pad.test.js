// v1.6.99: 修 wn-manual-edit-pad 重複 display 設定
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

test('v1.6.99: wn-manual-edit-pad 預設 display:none', () => {
    const m = html.match(/<div id="wn-manual-edit-pad"[^>]*style="([^"]*)"/);
    assert.ok(m, '應有 inline style');
    const style = m[1];
    assert.ok(style.includes('display:none'), '預設應 display:none');
    assert.ok(!style.includes('display:flex'), '不應有 display:flex (與 display:none 衝突)');
});

test('v1.6.99: WN_enableManualCrop 設定 display:flex', () => {
    const body = extractFunctionBody(html, 'WN_enableManualCrop');
    assert.ok(body, '應定義');
    assert.ok(body.includes("display = 'flex'") || body.includes('display = "flex"'),
        '應設定 display:flex');
});

test('v1.6.99: WN_enableManualCrop 設 WN_isManualAdding = false (等待點擊「新增框線」)', () => {
    const body = extractFunctionBody(html, 'WN_enableManualCrop');
    assert.ok(body, '應定義');
    assert.ok(body.includes('WN_isManualAdding = false'), '應重設 WN_isManualAdding');
});

test('v1.6.99: title 更新為 [v1.6.99]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.99\]<\/title>/.test(html));
});
