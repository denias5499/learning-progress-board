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

test('v1.6.107: WN_setupCropEvents 用 e.offsetX/Y (跟附件一樣)', () => {
    const body = extractFunctionBody(html, 'WN_setupCropEvents');
    assert.ok(body.includes('e.offsetX, e.offsetY, pageContainer'));
});

test('v1.6.107: WN_createNewManualBox 用 percentage (topPerc/leftPerc)', () => {
    const body = extractFunctionBody(html, 'WN_createNewManualBox');
    assert.ok(body.includes('topPerc'));
    assert.ok(body.includes('leftPerc'));
    assert.ok(!body.includes('pixelLeft'));
});

test('v1.6.107: 用附件固定大小 45%/15%', () => {
    const body = extractFunctionBody(html, 'WN_createNewManualBox');
    assert.ok(body.includes("'45%'"));
    assert.ok(body.includes("'15%'"));
});

test('v1.6.107: 防止 rect = 0 fallback', () => {
    const body = extractFunctionBody(html, 'WN_createNewManualBox');
    assert.ok(body.includes('rectW = rect.width || container.offsetWidth || 1'));
});

test('v1.6.107: title 為 [v1.6.107]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.107\]<\/title>/.test(html));
});
