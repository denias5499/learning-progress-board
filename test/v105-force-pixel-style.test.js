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

test('v1.6.105: pixelLeft/pixelTop (不用 percentage)', () => {
    const body = extractFunctionBody(html, 'WN_createNewManualBox');
    assert.ok(body, '應定義');
    assert.ok(body.includes('pixelLeft'));
});

test('v1.6.105: 移除 45%/15% percentage', () => {
    const body = extractFunctionBody(html, 'WN_createNewManualBox');
    assert.ok(!body.includes("'45%'"));
    assert.ok(!body.includes("'15%'"));
});

test('v1.6.105: appendChild 在 setAttribute 之前', () => {
    const body = extractFunctionBody(html, 'WN_createNewManualBox');
    const appendIdx = body.indexOf('container.appendChild');
    const styleIdx = body.indexOf("box.setAttribute('style'");
    assert.ok(appendIdx > 0 && styleIdx > 0);
    assert.ok(appendIdx < styleIdx);
});

test('v1.6.105: setAttribute("style", "") 清掉舊 inline', () => {
    assert.ok(html.includes("box.setAttribute('style', '')"));
});

test('v1.6.105: title 為 [v1.6.105]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.105\]<\/title>/.test(html));
});
