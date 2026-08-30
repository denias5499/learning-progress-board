// v1.6.83: 照附件設計 - mousedown 在 img 上 (percentage 座標)
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

test('v1.6.83: img 有 inline mousedown handler (附件風格)', () => {
    assert.ok(html.includes('onmousedown="WN_onCropImgMouseDown(event)"'),
        'img 應有 mousedown handler');
});

test('v1.6.83: WN_onCropImgMouseDown 函式存在', () => {
    const body = getFunctionBody('WN_onCropImgMouseDown');
    assert.ok(body, 'WN_onCropImgMouseDown 應定義');
    assert.ok(body.includes('cropBoxes.push(newBox)'), '應新增 crop box');
    assert.ok(body.includes('WN_renderCropBoxes()'), '應呼叫 renderCropBoxes');
});

test('v1.6.83: 使用 percentage 座標 (不受圖片縮放影響)', () => {
    const body = getFunctionBody('WN_onCropImgMouseDown');
    assert.ok(body, '應定義');
    // 應該有 100 - boxW (避免 box 超出圖片)
    assert.ok(body.includes('100 - boxW') || body.includes('100 - boxH'),
        '應用 percentage 座標 (max 100%)');
});

test('v1.6.83: 移除 overlay div (改用 img 直接處理)', () => {
    assert.ok(!html.includes('<div id="wn-crop-overlay"'),
        'wn-crop-overlay div 應已移除');
});

test('v1.6.83: WN_renderCropBoxes 用 percentage 座標', () => {
    const body = getFunctionBody('WN_renderCropBoxes');
    assert.ok(body, '應定義');
    assert.ok(body.includes("box.x + '%'"), '應用 percentage (box.x + %)');
    assert.ok(body.includes("box.w + '%'"), '應用 percentage (box.w + %)');
});

test('v1.6.83: title 更新為 [v1.6.83]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.83\]<\/title>/.test(html));
});
