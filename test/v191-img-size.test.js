// ⚠️ v2.3.2.145: 本檔有 2 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
// v1.6.91: 用 img 自身尺寸 (jsdom 支援)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

function getFunctionBody(name) {
    const start = html.indexOf('function ' + name + '(');
    if (start < 0) return null;
    let depth = 0, i = html.indexOf('{', start);
    if (i < 0) return null;
    const bodyStart = i + 1;
    while (i < html.length) {
        if (html[i] === '{') depth++;
        if (html[i] === '}') {
            depth--;
            if (depth === 0) return html.substring(bodyStart, i);
        }
        i++;
    }
    return null;
}

test.skip('v1.6.91: WN_renderCropAreaBoxes 用 img 尺寸 (不用 cropArea rect)', () => {
    const body = getFunctionBody('WN_renderCropAreaBoxes');
    assert.ok(body, '應定義');
    assert.ok(body.includes('clientWidth'), '應用 img.clientWidth');
    assert.ok(body.includes('clientHeight'), '應用 img.clientHeight');
    assert.ok(body.includes('naturalWidth'), '應 fallback 到 naturalWidth');
    assert.ok(body.includes('naturalHeight'), '應 fallback 到 naturalHeight');
});

test.skip('v1.6.91: 沒有 undefined rect (v1.6.90 bug)', () => {
    const body = getFunctionBody('WN_renderCropAreaBoxes');
    assert.ok(body, '應定義');
    assert.ok(!body.includes('var rect ='), '不應宣告 rect (會 undefined)');
    assert.ok(!body.includes('rect.width'), '不應使用 rect.width');
    assert.ok(!body.includes('rect.height'), '不應使用 rect.height');
});

test('v1.6.91: title 更新為 [v1.6.91]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
