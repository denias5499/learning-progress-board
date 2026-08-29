// v1.6.76: 強制 inline style + document-level drag handler
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
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

test('v1.6.76: wn-source-zone 有 inline style (最高優先級)', () => {
    const m = html.match(/<div id="wn-source-zone"[^>]*style="([^"]*)"/);
    assert.ok(m, 'wn-source-zone 應有 inline style');
    const style = m[1];
    assert.ok(/border:\s*3px dashed/.test(style), '應有 3px dashed inline style');
    assert.ok(/#1a82e2/.test(style), '應用藍色 #1a82e2');
});

test('v1.6.76: wn-paper-zone 有 inline style', () => {
    const m = html.match(/<div id="wn-paper-zone"[^>]*style="([^"]*)"/);
    assert.ok(m, 'wn-paper-zone 應有 inline style');
    const style = m[1];
    assert.ok(/border:\s*3px dashed/.test(style), '應有 3px dashed');
    assert.ok(/#1a82e2/.test(style), '應用藍色');
});

test('v1.6.76: 文字 p 有 inline style', () => {
    assert.ok(/<p[^>]*font-size:1\.1em/.test(html), 'p 應有 font-size:1.1em inline');
    assert.ok(/<p[^>]*font-weight:bold/.test(html), 'p 應 font-weight:bold');
});

test('v1.6.76: document-level drag handler (防止瀏覽器預設行為)', () => {
    const body = getFunctionBody('openWrongNotes');
    assert.ok(body, 'openWrongNotes 應定義');
    assert.ok(body.includes("document.addEventListener('dragover'"), '應有 document dragover handler');
    assert.ok(body.includes("document.addEventListener('drop'"), '應有 document drop handler');
    assert.ok(body.includes('e.preventDefault()'), '應 preventDefault');
    assert.ok(body.includes('_globalDragBound'), '應有 flag 避免重複');
});

test('v1.6.76: 整合測試 - drop zone 元素存在 + inline style', () => {
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
    const win = dom.window;
    const sourceZone = win.document.getElementById('wn-source-zone');
    const paperZone = win.document.getElementById('wn-paper-zone');
    assert.ok(sourceZone, 'wn-source-zone 應存在');
    assert.ok(paperZone, 'wn-paper-zone 應存在');
    assert.ok(sourceZone.style.border.includes('dashed'), 'source zone 應有 dashed border');
});

test('v1.6.76: title 更新為 [v1.6.76]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.76\]<\/title>/.test(html));
});
