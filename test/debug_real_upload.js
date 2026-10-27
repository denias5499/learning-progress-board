const test = require('node:test');

// ── jsdom rAF 迴圈會讓 node --test 的 event loop 永不結束 → 收集後統一 close ──
const _allDoms = [];
const { JSDOM: _JSDOM } = require('jsdom');
function _mkDom(...args) { const d = new _JSDOM(...args); _allDoms.push(d); return d; }
require('node:test').after(() => { _allDoms.forEach(d => { try { d.window.close(); } catch (e) {} }); });

const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');;

test('debug: 真實呼叫 WN_handleFileUpload', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const dom = _mkDom(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
    const win = dom.window;
    win.console = { log: (...args) => process.stderr.write(args.join(' ') + '\n') };

    win.eval(`
        // 看 WN_setupCropEvents 的 mousedown handler 怎麼處理
        var pc = document.getElementById('wn-page-container');
        var img = document.getElementById('wn-crop-img');
        var ca = document.getElementById('wn-crop-area');
        console.log('WN_setupCropEvents exists:', typeof WN_setupCropEvents);
        console.log('WN_handleFileUpload exists:', typeof WN_handleFileUpload);
        console.log('WN_isManualAdding:', WN_isManualAdding);
        console.log('wn-source-input value:', document.getElementById('wn-source-input').value);
        
        // 看 WN_setupCropEvents 完整 source code
        console.log('=== WN_setupCropEvents source ===');
        console.log(WN_setupCropEvents.toString().substring(0, 800));
    `);
});
