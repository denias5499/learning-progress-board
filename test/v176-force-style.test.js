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







test('v1.6.83: document-level drag handler (防止瀏覽器預設行為)', () => {
    const body = getFunctionBody('openWrongNotes');
    assert.ok(body, 'openWrongNotes 應定義');
    assert.ok(body.includes("document.addEventListener('dragover'"), '應有 document dragover handler');
    assert.ok(body.includes("document.addEventListener('drop'"), '應有 document drop handler');
    assert.ok(body.includes('e.preventDefault()'), '應 preventDefault');
    assert.ok(body.includes('_globalDragBound'), '應有 flag 避免重複');
});



test('v1.6.83: title 更新為 [v1.6.83]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
