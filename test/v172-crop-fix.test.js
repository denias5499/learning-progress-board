// v1.6.72: Phase 2 修正 - tab 立體 + crop drawing + drag&drop
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');
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

test('v1.6.73: tab active CSS 放大立體紫色', () => {
    const m = html.match(/\.wn-tab\.active\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-tab.active CSS 應存在');
    const css = m[1];
    assert.ok(/transform:\s*scale\(/.test(css), '應有 transform: scale()');
    assert.ok(/box-shadow:/.test(css), '應有 box-shadow 立體效果');
    assert.ok(/background:\s*#9163a8/.test(css), '應有紫色背景');
});

test('v1.6.73: crop drawing mousedown/mousemove/mouseup 實作', () => {
    assert.ok(/var WN_CROP_DRAW_STATE\s*=/.test(html), 'WN_CROP_DRAW_STATE 應宣告');
    assert.ok(/function WN_initCropDrawing\(\)/.test(html), 'WN_initCropDrawing 應定義');
    assert.ok(/overlay\.addEventListener\(['"]mousedown['"]/.test(html), '應綁定 mousedown');
    assert.ok(/overlay\.addEventListener\(['"]mousemove['"]/.test(html), '應綁定 mousemove');
    assert.ok(/overlay\.addEventListener\(['"]mouseup['"]/.test(html), '應綁定 mouseup');
});

test('v1.6.73: crop drawing 限制 10 個', () => {
    const fn = getFunctionBody('WN_initCropDrawing');
    assert.ok(fn, 'WN_initCropDrawing 應定義');
    assert.ok(fn.includes('最多只能框選 10 個'), '應檢查 10 個上限');
});

test('v1.6.73: drag & drop 用 addEventListener', () => {
    const fn = getFunctionBody('WN_initDragDrop');
    assert.ok(fn, 'WN_initDragDrop 應定義');
    assert.ok(fn.includes("addEventListener('dragover'"), '應綁定 dragover');
    assert.ok(fn.includes("addEventListener('drop'"), '應綁定 drop');
    assert.ok(fn.includes('e.preventDefault()'), '應 preventDefault');
});

test('v1.6.73: WN_initDragDrop 用 flag', () => {
    assert.ok(/var WN_DRAG_INIT_DONE\s*=/.test(html), '應有 flag');
    assert.ok(/if \(WN_DRAG_INIT_DONE\) return/.test(html), '應檢查 flag');
});

test('v1.6.73: WN_handleFileUpload 呼叫 WN_initCropDrawing', () => {
    const fn = getFunctionBody('WN_handleFileUpload');
    assert.ok(fn, '應定義');
    assert.ok(fn.includes('WN_initCropDrawing()'), '應呼叫 WN_initCropDrawing');
});

test('v1.6.73: openWrongNotes 呼叫 WN_initDragDrop', () => {
    const fn = getFunctionBody('openWrongNotes');
    assert.ok(fn, '應定義');
    assert.ok(fn.includes('WN_initDragDrop()'), '應呼叫 WN_initDragDrop');
});

test('v1.6.73: 整合測試 - crop drawing 模擬', () => {
    const win = loadIndex();
    win.alert = function() {};
    
    assert.equal(typeof win.WN_initCropDrawing, 'function');
    assert.equal(typeof win.WN_initDragDrop, 'function');
    assert.equal(typeof win.WN_renderCropDrawingPreview, 'function');
    
    win.eval(`
        WN_PHASE2_STATE.uploadedImg = 'data:image/jpeg;base64,fake';
        WN_PHASE2_STATE.uploadedImgWidth = 100;
        WN_PHASE2_STATE.uploadedImgHeight = 100;
        WN_PHASE2_STATE.cropBoxes = [];
        WN_CROP_DRAW_STATE.drawing = true;
        WN_CROP_DRAW_STATE.startX = 10;
        WN_CROP_DRAW_STATE.startY = 10;
        WN_CROP_DRAW_STATE.currentBox = { x: 10, y: 10, w: 50, h: 50 };
        WN_PHASE2_STATE.cropBoxes.push(WN_CROP_DRAW_STATE.currentBox);
        WN_CROP_DRAW_STATE.drawing = false;
        WN_CROP_DRAW_STATE.currentBox = null;
    `);
    assert.equal(win.eval('WN_PHASE2_STATE.cropBoxes.length'), 1);
});

test('v1.6.73: title 更新為 [v1.6.72]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.74]<\/title>/.test(html));
});
