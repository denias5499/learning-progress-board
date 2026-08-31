// v1.6.85: 阻止文字選取 (藍色反白)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

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



const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.85: crop-img-container 有 user-select: none', () => {
    const m = html.match(/<div id="wn-crop-img-container"[^>]*style="([^"]*)"/);
    assert.ok(m, '應有 inline style');
    const style = m[1];
    assert.ok(style.includes('user-select:none') || style.includes('user-select: none'),
        'container 應有 user-select: none');
    assert.ok(style.includes('-webkit-user-select:none') || style.includes('-webkit-user-select: none'),
        'container 應有 -webkit-user-select (Safari)');
});

test('v1.6.85: wn-crop-img 有 user-select + user-drag: none', () => {
    const m = html.match(/<img id="wn-crop-img"[^>]*style="([^"]*)"/);
    assert.ok(m, '應有 inline style');
    const style = m[1];
    assert.ok(style.includes('user-select:none') || style.includes('user-select: none'),
        'img 應有 user-select: none');
    assert.ok(style.includes('-webkit-user-drag:none') || style.includes('-webkit-user-drag: none'),
        'img 應有 -webkit-user-drag: none (Safari 圖片拖曳禁用)');
});

test('v1.6.85: WN_onCropImgMouseDown 阻止瀏覽器文字選取', () => {
    const body = getFunctionBody('WN_onCropImgMouseDown');
    assert.ok(body, '應有函式');
    assert.ok(body.includes('preventDefault'), '應有 preventDefault');
    assert.ok(body.includes('stopPropagation'), '應有 stopPropagation');
    assert.ok(body.includes('getSelection'), '應呼叫 getSelection 阻止文字選取');
    assert.ok(body.includes('removeAllRanges'), '應 removeAllRanges');
});

test('v1.6.85: title 更新為 [v1.6.85]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.85\]<\/title>/.test(html));
});
