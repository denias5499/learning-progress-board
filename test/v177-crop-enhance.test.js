// v1.6.83: Crop area 增強 - 取消/完成 + resize + double click
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







test('v1.6.83: WN_cancelSelection 函式存在 (清空 + reset)', () => {
    const body = getFunctionBody('WN_cancelSelection');
    assert.ok(body, 'WN_cancelSelection 應定義');
    assert.ok(body.includes('confirm'), '應有 confirm 確認');
    assert.ok(body.includes('cropBoxes = []'), '應清空 cropBoxes');
    assert.ok(body.includes("wn-crop-img')"), '應 reset 圖片 src');
    assert.ok(body.includes("wn-source-input')"), '應 reset file input value');
});



test('v1.6.83: Crop box 有 resize handles (左上 + 右下)', () => {
    assert.ok(/class="wn-resize-tl"/.test(html), '應有左上角 resize handle');
    assert.ok(/class="wn-resize-br"/.test(html), '應有右下角 resize handle');
    // 看 CSS
    assert.ok(/\.wn-resize-tl\s*\{[^}]*nwse-resize/.test(html) ||
              html.includes('cursor: nwse-resize'), '左上角 handle 應有 nwse-resize cursor');
});

test('v1.6.83: Crop box 有 delete (×) + add (+) 按鈕', () => {
    assert.ok(/class="wn-crop-delete"[^>]*>×/.test(html) ||
              /class="wn-crop-delete"[^>]*>\\u00d7/.test(html) ||
              html.includes('wn-crop-delete'), '應有 delete × 按鈕');
    assert.ok(/class="wn-add-btn"/.test(html), '應有 add + 按鈕');
});

test('v1.6.83: WN_startResize 函式存在 (左上 + 右下角 resize)', () => {
    const body = getFunctionBody('WN_startResize');
    assert.ok(body, 'WN_startResize 應定義');
    assert.ok(body.includes("corner === 'br'"), '應處理 br (右下) 角');
    assert.ok(body.includes("corner === 'tl'"), '應處理 tl (左上) 角');
    assert.ok(body.includes('Math.max(20,'), '應有最小尺寸 20px');
});

test('v1.6.83: WN_startMove 函式存在 (拖拉移動)', () => {
    const body = getFunctionBody('WN_startMove');
    assert.ok(body, 'WN_startMove 應定義');
    assert.ok(body.includes('mousemove'), '應綁定 mousemove');
    assert.ok(body.includes('mouseup'), '應綁定 mouseup');
});

test('v1.6.83: WN_addCropFromCenter 函式存在 (從中心新增)', () => {
    const body = getFunctionBody('WN_addCropFromCenter');
    assert.ok(body, 'WN_addCropFromCenter 應定義');
    assert.ok(body.includes('cropBoxes.push'), '應新增 crop box');
});



test('v1.6.83: Crop box CSS 加強 (藍色 3px + selected 狀態)', () => {
    assert.ok(/\.wn-crop-box\s*\{[^}]*border:\s*3px solid #1a82e2/.test(html) ||
              /\.wn-crop-box[\s\S]{0,500}border:\s*3px solid #1a82e2/.test(html),
        '應有藍色 3px 邊框');
    assert.ok(/\.wn-crop-box\.selected/.test(html), '應有 selected 狀態');
});

test('v1.6.83: title 更新為 [v1.6.83]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
