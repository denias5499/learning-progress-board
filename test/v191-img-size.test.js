// v1.6.91: 用 img 自身尺寸 (jsdom 支援)
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

test('v1.6.91: WN_renderCropAreaBoxes 用 img 尺寸 (不用 cropArea rect)', () => {
    const body = getFunctionBody('WN_renderCropAreaBoxes');
    assert.ok(body, '應定義');
    assert.ok(body.includes('clientWidth'), '應用 img.clientWidth');
    assert.ok(body.includes('clientHeight'), '應用 img.clientHeight');
    assert.ok(body.includes('naturalWidth'), '應 fallback 到 naturalWidth');
    assert.ok(body.includes('naturalHeight'), '應 fallback 到 naturalHeight');
});

test('v1.6.91: 沒有 undefined rect (v1.6.90 bug)', () => {
    const body = getFunctionBody('WN_renderCropAreaBoxes');
    assert.ok(body, '應定義');
    assert.ok(!body.includes('var rect ='), '不應宣告 rect (會 undefined)');
    assert.ok(!body.includes('rect.width'), '不應使用 rect.width');
    assert.ok(!body.includes('rect.height'), '不應使用 rect.height');
});

test('v1.6.91: title 更新為 [v1.6.91]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.91\]<\/title>/.test(html));
});
