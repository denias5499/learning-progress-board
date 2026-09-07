const test = require('node:test');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const HTML_PATH = '/mnt/my_book/Denias/projects/learning-progress-board/index.html';
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('debug: crop box 位置', () => {
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
    const win = dom.window;
    win.console = { log: (...args) => process.stderr.write(args.join(' ') + '\n') };

    win.eval(`
        // 看 wn-page-container 大小
        var pc = document.getElementById('wn-page-container');
        console.log('pc exists:', !!pc);
        if (pc) {
            var r = pc.getBoundingClientRect();
            console.log('pc rect: top=' + r.top + ' left=' + r.left + ' width=' + r.width + ' height=' + r.height);
        }
        // 看 wn-crop-area
        var ca = document.getElementById('wn-crop-area');
        console.log('ca display:', ca.style.display);
        // 看 cropImg
        var img = document.getElementById('wn-crop-img');
        console.log('cropImg naturalWidth:', img.naturalWidth);
        console.log('cropImg clientWidth:', img.clientWidth);
        // 看 cropImg rect
        var imgR = img.getBoundingClientRect();
        console.log('cropImg rect: top=' + imgR.top + ' left=' + imgR.left + ' width=' + imgR.width + ' height=' + imgR.height);
        // 看 WN_createNewManualBox 程式碼
        console.log('WN_createNewManualBox exists:', typeof WN_createNewManualBox);
        console.log('WN_isManualAdding exists:', typeof WN_isManualAdding);
        // 直接新增一個 crop box 看位置
        if (typeof WN_createNewManualBox === 'function') {
            WN_createNewManualBox(100, 100, pc);
            setTimeout(function() {
                var box = pc.querySelector('.wn-crop-box');
                if (box) {
                    var br = box.getBoundingClientRect();
                    console.log('new box rect: top=' + br.top + ' left=' + br.left + ' width=' + br.width + ' height=' + br.height);
                    console.log('box style.left:', box.style.left);
                    console.log('box style.top:', box.style.top);
                }
            }, 100);
        }
    `);
});
