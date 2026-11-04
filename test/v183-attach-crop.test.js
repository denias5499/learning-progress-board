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
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
