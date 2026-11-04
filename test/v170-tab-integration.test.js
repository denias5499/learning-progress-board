// v1.6.70.3: 整合測試 - 改用 addEventListener 取代 inline onclick
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

function createDom() {
    return _mkDom(html, {
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        url: 'http://localhost/'
    });
}







test('v1.6.70.3: 4 個 tabs 沒有 inline onclick (用 data-wntab + addEventListener)', () => {
    const dom = createDom();
    const win = dom.window;
    const tabs = win.document.querySelectorAll('[data-wntab]');
    tabs.forEach(function(tab) {
        assert.equal(tab.getAttribute('onclick'), null,
            tab.getAttribute('data-wntab') + ' tab 不應有 inline onclick');
    });
});


