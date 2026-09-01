// v1.6.103: 改用絕對 pixel 位置 (不用 percentage, 避免 offsetParent = null)
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

test('v1.6.103: WN_createNewManualBox 用 pixel 位置', () => {
    const body = extractFunctionBody(html, 'WN_createNewManualBox');
    assert.ok(body, '應定義');
    assert.ok(body.includes("pixelLeft"), '應有 pixelLeft 變數');
    assert.ok(body.includes("pixelTop"), '應有 pixelTop 變數');
});

test('v1.6.103: container.appendChild 在 style.left 之前 (確保 offsetParent)', () => {
    const body = extractFunctionBody(html, 'WN_createNewManualBox');
    const appendIdx = body.indexOf('container.appendChild');
    const styleIdx = body.indexOf("style.position = 'absolute'");
    assert.ok(appendIdx > 0 && styleIdx > 0);
    assert.ok(appendIdx < styleIdx, 'appendChild 應在 style.position 之前');
});

test('v1.6.103: 防止 offsetParent 為 null (fallback 用 position: relative)', () => {
    const body = extractFunctionBody(html, 'WN_createNewManualBox');
    assert.ok(body.includes("box.style.position = 'relative'") || 
              body.includes('box.style.position = "relative"'),
        '應有 offsetParent fallback');
});

test('v1.6.103: 不再用 percentage 定位 (改用 px)', () => {
    const body = extractFunctionBody(html, 'WN_createNewManualBox');
    assert.ok(!body.includes("topPerc"), '不應用 percentage topPerc');
    assert.ok(body.includes("'px'"), '應用 px 單位');
});

test('v1.6.103: title 為 [v1.6.103]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.103\]<\/title>/.test(html));
});
