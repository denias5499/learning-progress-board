const test = require('node:test');

// ── jsdom rAF 迴圈會讓 node --test 的 event loop 永不結束 → 收集後統一 close ──
const _allDoms = [];
const { JSDOM: _JSDOM } = require('jsdom');
function _mkDom(...args) { const d = new _JSDOM(...args); _allDoms.push(d); return d; }
require('node:test').after(() => { _allDoms.forEach(d => { try { d.window.close(); } catch (e) {} }); });

const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');;

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('debug: WN_setupCropEvents mousedown handler', () => {
    const dom = _mkDom(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
    const win = dom.window;
    win.console = { log: (...args) => process.stderr.write(args.join(' ') + '\n') };

    win.eval(`
        // 看 WN_setupCropEvents 完整
        var idx = window.WN_setupCropEvents.toString().indexOf('function');
        console.log(window.WN_setupCropEvents.toString().substring(0, 800));
    `);
});
