// v1.6.101: 修 WN_createNewManualBox 用 clientX - container.left (附件設計)
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

test('v1.6.101: WN_createNewManualBox 用 clientX - container.left', () => {
    const body = extractFunctionBody(html, 'WN_createNewManualBox');
    assert.ok(body, '應定義');
    assert.ok(body.includes('rect.left'), '應用 rect.left');
    assert.ok(body.includes('rect.top'), '應用 rect.top');
    assert.ok(!body.includes('e.offsetX, e.offsetY'), '不應再用 e.offsetX');
});

test('v1.6.101: 防止 rect.width = 0 (除以零)', () => {
    const body = extractFunctionBody(html, 'WN_createNewManualBox');
    assert.ok(body.includes('containerW = rect.width || container.offsetWidth || 1'), '應有 fallback');
});

test('v1.6.101: 限制 percentage 在 0-100 之間', () => {
    const body = extractFunctionBody(html, 'WN_createNewManualBox');
    assert.ok(body.includes('Math.max(0, Math.min(100'), '應限制 percentage');
});

test('v1.6.101: WN_setupCropEvents 傳 clientX, clientY', () => {
    const body = extractFunctionBody(html, 'WN_setupCropEvents');
    assert.ok(body, '應定義');
    assert.ok(body.includes('e.clientX, e.clientY, pageContainer'), '應傳 clientX/Y');
});

test('v1.6.101: title 為 [v1.6.101]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.101\]<\/title>/.test(html));
});
