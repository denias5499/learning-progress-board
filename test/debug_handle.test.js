const test = require('node:test');
const { JSDOM } = require('jsdom');
const fs = require('fs');

const HTML_PATH = '/mnt/my_book/Denias/projects/learning-progress-board/index.html';
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('debug: WN_handleFileUpload img.onload', () => {
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
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
