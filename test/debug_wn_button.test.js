const test = require('node:test');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('debug: 按鈕 onclick + 函式存在', () => {
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
    const win = dom.window;
    win.console = { log: (...args) => process.stderr.write(args.join(' ') + '\n') };
    
    win.eval(`
        console.log('WN_startManualBox exists:', typeof WN_startManualBox);
        var btn = document.querySelector('button[onclick="WN_startManualBox()"]');
        console.log('button exists:', !!btn);
        if (btn) {
            console.log('button text:', btn.textContent.trim());
            console.log('button onclick:', btn.getAttribute('onclick'));
        }
        // 找 WN_manual-edit-pad
        var pad = document.getElementById('wn-manual-edit-pad');
        console.log('pad exists:', !!pad);
        if (pad) {
            console.log('pad style.display:', pad.style.display);
            console.log('pad computed display:', window.getComputedStyle(pad).display);
        }
        // 看父層 wn-crop-area
        var cropArea = document.getElementById('wn-crop-area');
        console.log('cropArea style.display:', cropArea.style.display);
        console.log('cropArea computed display:', window.getComputedStyle(cropArea).display);
        
        // 嘗試呼叫 WN_startManualBox
        if (typeof WN_startManualBox === 'function') {
            WN_startManualBox();
            console.log('After call, pad style.display:', pad.style.display);
            console.log('After call, WN_isManualAdding:', WN_isManualAdding);
            console.log('After call, tip innerText:', document.getElementById('wn-manual-tip').innerText);
        }
    `);
});
