// v1.6.86: 完整還原 v1.6.8 crop box 設計
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

test('v1.6.86: WN_setupCropAreaEvents 函式存在 (從 v1.6.8 移植)', () => {
    assert.ok(getFunctionBody('WN_setupCropAreaEvents'), '應定義');
});

test('v1.6.86: WN_setupCropAreaEvents 用 cropArea.onmousedown (v1.6.8 設計)', () => {
    const body = getFunctionBody('WN_setupCropAreaEvents');
    assert.ok(body, '應定義');
    assert.ok(body.includes('cropArea.onmousedown'), '應有 cropArea.onmousedown');
    assert.ok(body.includes('e.target !== cropArea'), '應檢查 e.target');
    assert.ok(body.includes('cropArea.onmousemove'), '應有 cropArea.onmousemove');
    assert.ok(body.includes('cropArea.onmouseup'), '應有 cropArea.onmouseup');
    assert.ok(body.includes('cropArea.onmouseleave'), '應有 cropArea.onmouseleave');
});

test('v1.6.86: WN_renderCropAreaBoxes 函式存在', () => {
    assert.ok(getFunctionBody('WN_renderCropAreaBoxes'), '應定義');
});

test('v1.6.86: WN_setupCropAreaEvents 檢查 target === cropArea || === img', () => {
    const body = getFunctionBody('WN_setupCropAreaEvents');
    assert.ok(body.includes("e.target !== document.getElementById('wn-crop-img')"), '應檢查 wn-crop-img');
});

test('v1.6.86: mouseup 判斷 box > 10x10 才 push', () => {
    const body = getFunctionBody('WN_setupCropAreaEvents');
    assert.ok(body.includes('w > 10 && box.h > 10') || body.includes('w > 10 && h > 10'),
        '應檢查 box 大小');
});

test('v1.6.86: WN_handleFileUpload 呼叫 WN_setupCropAreaEvents (上傳後初始化)', () => {
    const body = getFunctionBody('WN_handleFileUpload');
    assert.ok(body, '應定義');
    assert.ok(body.includes('WN_setupCropAreaEvents()'), '應呼叫 WN_setupCropAreaEvents');
});

test('v1.6.86: WN_deleteCropBox 函式存在', () => {
    assert.ok(getFunctionBody('WN_deleteCropBox'), '應定義');
});

test('v1.6.86: crop-img-container 沒有 inline mousedown (改用 cropArea)', () => {
    assert.ok(!html.includes('wn-crop-img-container" style="position:relative;display:inline-block;border:2px solid #b78fb7;border-radius:8px;overflow:hidden;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;" onmousedown'),
        'crop-img-container 不應有 inline mousedown');
});

test('v1.6.86: cropArea 有 user-select: none (防止藍色反白)', () => {
    const body = getFunctionBody('WN_setupCropAreaEvents');
    assert.ok(body.includes("userSelect = 'none'") || body.includes("userSelect = \"none\""),
        '應在 cropArea 上設 user-select: none');
});

test('v1.6.86: title 更新為 [v1.6.86]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.86\]<\/title>/.test(html));
});
