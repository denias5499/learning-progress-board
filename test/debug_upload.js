const test = require('node:test');

// ── jsdom rAF 迴圈會讓 node --test 的 event loop 永不結束 → 收集後統一 close ──
const _allDoms = [];
const { JSDOM: _JSDOM } = require('jsdom');
function _mkDom(...args) { const d = new _JSDOM(...args); _allDoms.push(d); return d; }
require('node:test').after(() => { _allDoms.forEach(d => { try { d.window.close(); } catch (e) {} }); });

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('debug: upload + crop area 顯示', () => {
    const dom = _mkDom(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
    const win = dom.window;
    win.console = { log: (...args) => process.stderr.write(args.join(' ') + '\n') };

    win.eval(`
        console.log('WN_handleFileUpload exists:', typeof WN_handleFileUpload);
        console.log('WN_setupCropEvents exists:', typeof WN_setupCropEvents);
        var cropArea = document.getElementById('wn-crop-area');
        console.log('initial cropArea display:', cropArea.style.display);
        var pageContainer = document.getElementById('wn-page-container');
        console.log('pageContainer exists:', !!pageContainer);
        var cropImg = document.getElementById('wn-crop-img');
        console.log('cropImg src:', cropImg.src ? cropImg.src.substring(0, 30) : '(empty)');
    `);
});
