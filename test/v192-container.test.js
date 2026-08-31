// v1.6.92: crop box appendTo wn-crop-img-container (在圖片內)
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

test('v1.6.92: WN_renderCropAreaBoxes 用 wn-crop-img-container 接收 crop box', () => {
    const body = getFunctionBody('WN_renderCropAreaBoxes');
    assert.ok(body, '應定義');
    assert.ok(body.includes('wn-crop-img-container'), '應找 img-container');
    assert.ok(body.includes('container.querySelectorAll'), '應用 container 移除舊 box');
});

test('v1.6.92: crop box appendChild 到 container 不是 cropArea', () => {
    const body = getFunctionBody('WN_renderCropAreaBoxes');
    assert.ok(body, '應定義');
    // 確認最後是 container.appendChild (不是 cropArea.appendChild)
    assert.ok(body.includes('container.appendChild(div)'), '應 container.appendChild(div)');
    assert.ok(!body.includes('cropArea.appendChild(div)'), '不應 cropArea.appendChild(div)');
});

test('v1.6.92: 整合測試 - crop box 在 img-container 內', () => {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
    const win = dom.window;
    win.console = { log: (...args) => process.stderr.write(args.join(' ') + '\n') };
    
    win.eval(`
        var img = document.getElementById('wn-crop-img');
        Object.defineProperty(img, 'naturalWidth', { value: 1600, configurable: true });
        Object.defineProperty(img, 'naturalHeight', { value: 1200, configurable: true });
        img.src = 'data:image/jpeg;base64,/9j/test';
        document.getElementById('wn-crop-area').style.display = 'block';
        WN_PHASE2_STATE.cropBoxes = [{ x: 50, y: 50, w: 100, h: 100, id: 'test1' }];
        WN_renderCropAreaBoxes();
        var container = document.getElementById('wn-crop-img-container');
        var cropArea = document.getElementById('wn-crop-area');
        var inContainer = container.querySelectorAll(':scope > .wn-crop-box').length;
        var inCropArea = cropArea.querySelectorAll(':scope > .wn-crop-box').length;
        console.log('container direct box count:', inContainer);
        console.log('cropArea direct box count:', inCropArea);
        assert.ok(inContainer === 1, 'container 應有 1 個直接子 box');
        assert.ok(inCropArea === 0, 'cropArea 不應有直接子 box (應在 container 內)');
    `);
});

test('v1.6.92: title 更新為 [v1.6.92]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.92\]<\/title>/.test(html));
});
