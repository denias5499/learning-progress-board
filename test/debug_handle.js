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

test('debug: WN_handleFileUpload img.onload', () => {
    const dom = _mkDom(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
    const win = dom.window;
    win.console = { log: (...args) => process.stderr.write(args.join(' ') + '\n') };

    win.eval(`
        // 看 img.onload 的執行順序
        var cropImg = document.getElementById('wn-crop-img');
        cropImg.addEventListener('load', function() {
            console.log('cropImg load event fired');
        });
        
        // 模擬 setTimeout
        var originalSetTimeout = window.setTimeout;
        window.setTimeout = function(fn, delay) {
            console.log('setTimeout called with delay:', delay);
            return originalSetTimeout(function() {
                console.log('setTimeout executing');
                try { fn(); } catch(e) { console.log('setTimeout error:', e.message); }
            }, delay);
        };
        
        // 模擬 WN_handleFileUpload (用 fake File)
        var fakeFile = {
            type: 'image/png',
            name: 'test.png'
        };
        WN_handleFileUpload(fakeFile);
        
        setTimeout(function() {
            console.log('=== after 500ms ===');
            console.log('cropImg src length:', cropImg.src.length);
            console.log('cropArea display:', document.getElementById('wn-crop-area').style.display);
        }, 500);
    `);
});
