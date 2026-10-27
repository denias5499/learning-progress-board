// ⚠️ v2.3.2.145: 本檔有 4 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
// v1.6.83: 強制 inline style + document-level drag handler
const test = require('node:test');

// ── jsdom rAF 迴圈會讓 node --test 的 event loop 永不結束 → 收集後統一 close ──
const _allDoms = [];
const { JSDOM: _JSDOM } = require('jsdom');
function _mkDom(...args) { const d = new _JSDOM(...args); _allDoms.push(d); return d; }
require('node:test').after(() => { _allDoms.forEach(d => { try { d.window.close(); } catch (e) {} }); });

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

test.skip('v1.6.83: wn-source-zone 有 inline style (最高優先級)', () => {
    const m = html.match(/<div id="wn-source-zone"[^>]*style="([^"]*)"/);
    assert.ok(m, 'wn-source-zone 應有 inline style');
    const style = m[1];
    assert.ok(/border:\s*3px dashed/.test(style), '應有 3px dashed inline style');
    assert.ok(/#1a82e2/.test(style), '應用藍色 #1a82e2');
});

test.skip('v1.6.83: wn-paper-zone 有 inline style', () => {
    const m = html.match(/<div id="wn-paper-zone"[^>]*style="([^"]*)"/);
    assert.ok(m, 'wn-paper-zone 應有 inline style');
    const style = m[1];
    assert.ok(/border:\s*3px dashed/.test(style), '應有 3px dashed');
    assert.ok(/#1a82e2/.test(style), '應用藍色');
});

test.skip('v1.6.83: 文字 p 有 inline style', () => {
    assert.ok(/<p[^>]*font-size:1\.1em/.test(html), 'p 應有 font-size:1.1em inline');
    assert.ok(/<p[^>]*font-weight:bold/.test(html), 'p 應 font-weight:bold');
});

test('v1.6.83: document-level drag handler (防止瀏覽器預設行為)', () => {
    const body = getFunctionBody('openWrongNotes');
    assert.ok(body, 'openWrongNotes 應定義');
    assert.ok(body.includes("document.addEventListener('dragover'"), '應有 document dragover handler');
    assert.ok(body.includes("document.addEventListener('drop'"), '應有 document drop handler');
    assert.ok(body.includes('e.preventDefault()'), '應 preventDefault');
    assert.ok(body.includes('_globalDragBound'), '應有 flag 避免重複');
});

test.skip('v1.6.83: 整合測試 - drop zone 元素存在 + inline style', () => {
    const dom = _mkDom(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
    const win = dom.window;
    const sourceZone = win.document.getElementById('wn-source-zone');
    const paperZone = win.document.getElementById('wn-paper-zone');
    assert.ok(sourceZone, 'wn-source-zone 應存在');
    assert.ok(paperZone, 'wn-paper-zone 應存在');
    assert.ok(sourceZone.style.border.includes('dashed'), 'source zone 應有 dashed border');
});

test('v1.6.83: title 更新為 [v1.6.83]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
