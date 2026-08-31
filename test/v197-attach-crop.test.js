// v1.6.97: 完整移植附件 crop box 設計 (isManualAdding + page-container + resize handles)
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

test('v1.6.97: WN_setupCropEvents 函式存在 (附件設計)', () => {
    assert.ok(getFunctionBody('WN_setupCropEvents'), '應定義');
});

test('v1.6.97: WN_setupCropEvents 用 page-container.addEventListener mousedown', () => {
    const body = getFunctionBody('WN_setupCropEvents');
    assert.ok(body.includes('wn-page-container'), '應找 wn-page-container');
    assert.ok(body.includes("addEventListener('mousedown'"), '應綁定 mousedown');
    assert.ok(body.includes('WN_isManualAdding'), '應檢查 isManualAdding flag');
    assert.ok(body.includes('WN_createNewManualBox'), '應呼叫 createNewManualBox');
});

test('v1.6.97: WN_createNewManualBox 函式存在 + percentage 座標', () => {
    const body = getFunctionBody('WN_createNewManualBox');
    assert.ok(body, '應定義');
    assert.ok(body.includes('topPerc') || body.includes('getBoundingClientRect'),
        '應用 percentage 座標');
});

test('v1.6.97: WN_makeDraggableAndResizable 含 resize handles tl/br', () => {
    const body = getFunctionBody('WN_makeDraggableAndResizable');
    assert.ok(body, '應定義');
    assert.ok(body.includes('mousedown'), '應綁定 mousedown');
    assert.ok(body.includes('mousemove'), '應綁定 mousemove');
    assert.ok(body.includes('mouseup'), '應綁定 mouseup');
    assert.ok(body.includes('isResizingTL') || body.includes('resize-tl'), '應處理左上 resize');
    assert.ok(body.includes('isResizingBR') || body.includes('resize-br'), '應處理右下 resize');
});

test('v1.6.97: WN_toggleCroppedQuestion + 變 ✓', () => {
    const body = getFunctionBody('WN_toggleCroppedQuestion');
    assert.ok(body, '應定義');
    assert.ok(body.includes('selected'), '應切換 selected class');
    assert.ok(body.includes("innerText = '+'") || body.includes("innerText = '✓'"),
        '應切換 + / ✓ 文字');
});

test('v1.6.97: WN_addMockOCRBoxes 預設 9 個 box', () => {
    const body = getFunctionBody('WN_addMockOCRBoxes');
    assert.ok(body, '應定義');
    // 附件預設 9 個 box
    assert.ok(body.includes('top: 4'), '應有第一個 box');
    assert.ok(body.includes('width: 46') || body.includes('width: 45'),
        '應有 box 寬度');
});

test('v1.6.97: CSS .wn-crop-box 有附件設計 (3px 藍色 border + resize handle)', () => {
    const m = html.match(/\.wn-crop-box\s*\{([\s\S]*?)\}/);
    assert.ok(m, 'CSS 應存在');
    const css = m[1];
    assert.ok(css.includes('3px solid #1a82e2'), '應有藍色 3px 邊框');
    assert.ok(css.includes('position: absolute'), '應有 absolute 定位');
});

test('v1.6.97: CSS .wn-resize-handle tl/br (紅色三角形)', () => {
    assert.ok(html.includes('.wn-resize-handle.tl'), '應有左上 resize handle CSS');
    assert.ok(html.includes('.wn-resize-handle.br'), '應有右下 resize handle CSS');
    assert.ok(html.includes('nwse-resize'), '應有 nwse-resize cursor');
    assert.ok(html.includes('border-color: #e74c3c'), '應有紅色 border');
});

test('v1.6.97: CSS .wn-add-crop-btn 中央 + 按鈕 + selected', () => {
    const m = html.match(/\.wn-add-crop-btn\s*\{([\s\S]*?)\}/);
    assert.ok(m, 'CSS 應存在');
    const css = m[1];
    assert.ok(css.includes('transform: translate(-50%, -50%)'), '應有中央定位');
    assert.ok(css.includes('width: 36px') || css.includes('36px'), '應有 36px 寬度');
    assert.ok(html.includes('.wn-add-crop-btn.selected'), '應有 selected 樣式 (變 ✓)');
    assert.ok(html.includes('.selected { background: #34c759') || html.includes('background: #34c759'),
        'selected 應為綠色');
});

test('v1.6.97: WN_PHASE2_STATE 加 isManualAdding flag', () => {
    const m = html.match(/var WN_PHASE2_STATE\s*=\s*\{([\s\S]*?)\};/);
    assert.ok(m, '應定義 WN_PHASE2_STATE');
    assert.ok(html.includes('WN_isManualAdding'), '應有 isManualAdding flag');
    assert.ok(html.includes('WN_manualBoxes'), '應有 manualBoxes');
});

test('v1.6.97: WN_handleFileUpload 呼叫 WN_setupCropEvents', () => {
    // 簡單檢查 WN_setupCropEvents 在 WN_handleFileUpload 內
    const idx = html.indexOf('function WN_handleFileUpload(file)');
    const nextIdx = html.indexOf('function ', idx + 30);
    const body = html.substring(idx, nextIdx);
    assert.ok(body.includes('WN_setupCropEvents'), '應呼叫 WN_setupCropEvents');
});

test('v1.6.97: HTML 有 wn-page-container + 手動框選 Pad', () => {
    assert.ok(html.includes('id="wn-page-container"'), '應有 wn-page-container');
    assert.ok(html.includes('id="wn-manual-edit-pad"'), '應有手動框選 Pad');
    assert.ok(html.includes('WN_triggerAutoCrop()'), '應有自動辨識按鈕');
    assert.ok(html.includes('WN_enableManualCrop()'), '應有手動框選按鈕');
    assert.ok(html.includes('WN_startManualBox()'), '應有新增框線按鈕');
    assert.ok(html.includes('WN_undoManualBox()'), '應有 Undo 按鈕');
});

test('v1.6.97: title 更新為 [v1.6.97]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.97\]<\/title>/.test(html));
});
