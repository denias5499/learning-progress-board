// v1.6.84: 還原舊版 WN_setupCropEvents 設計 - cropArea 接收 mousedown
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

test('v1.6.84: crop-img-container 有 inline mousedown handler', () => {
    assert.ok(html.includes('onmousedown="WN_onCropImgMouseDown(event)"'),
        'crop-img-container 應有 mousedown handler');
});

test('v1.6.84: img 沒有 inline mousedown (改用 container)', () => {
    assert.ok(!html.includes('<img id="wn-crop-img" style="display:block;max-width:100%;cursor:crosshair;user-select:none;" onmousedown='),
        'img 不應有 inline mousedown');
});

test('v1.6.84: WN_onCropImgMouseDown 改用 container 座標 (像素)', () => {
    const body = getFunctionBody('WN_onCropImgMouseDown');
    assert.ok(body, '應定義');
    assert.ok(body.includes('wn-crop-img-container'), '應用 container 元素');
    assert.ok(body.includes('getBoundingClientRect'), '應用 getBoundingClientRect');
    assert.ok(body.includes('scaleX'), '應用 scaleX');
    assert.ok(body.includes('scaleY'), '應用 scaleY');
    assert.ok(body.includes('cropBoxes.push(newBox)'), '應 push newBox');
    assert.ok(body.includes('id: Date.now'), '應有 box id');
});

test('v1.6.84: WN_onCropImgMouseDown 預設 box 100x100 像素', () => {
    const body = getFunctionBody('WN_onCropImgMouseDown');
    assert.ok(body, '應定義');
    assert.ok(body.includes('var boxW = 100'), '應 boxW = 100');
    assert.ok(body.includes('var boxH = 100'), '應 boxH = 100');
});

test('v1.6.84: 限制 10 個 crop boxes', () => {
    const body = getFunctionBody('WN_onCropImgMouseDown');
    assert.ok(body, '應定義');
    assert.ok(body.includes('length >= 10'), '應檢查 >= 10');
});

test('v1.6.84: title 更新為 [v1.6.84]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.84\]<\/title>/.test(html));
});
