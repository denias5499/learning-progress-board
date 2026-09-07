const test = require('node:test');
const { JSDOM } = require('jsdom');
const fs = require('fs');

test('debug: WN_createNewManualBox 在 jsdom 完整流程', () => {
    const html = fs.readFileSync('/mnt/my_book/Denias/projects/learning-progress-board/index.html', 'utf8');
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
    const win = dom.window;
    win.console = { log: (...args) => process.stderr.write(args.join(' ') + '\n') };

    win.eval(`
        var pc = document.getElementById('wn-page-container');
        var img = document.getElementById('wn-crop-img');
        var ca = document.getElementById('wn-crop-area');
        ca.style.display = 'block';
        WN_setupCropEvents();
        
        // 模擬 click 圖片 (clientX=200, clientY=300)
        WN_startManualBox();
        WN_createNewManualBox(200, 300, pc);
        
        var box = pc.querySelector('.wn-crop-box');
        if (!box) {
            console.log('!!! NO BOX CREATED');
            return;
        }
        console.log('=== BOX INFO ===');
        console.log('box style.left:', box.style.left);
        console.log('box style.top:', box.style.top);
        console.log('box style.position:', box.style.position);
        console.log('box style.width:', box.style.width);
        console.log('box style.height:', box.style.height);
        console.log('box offsetParent:', box.offsetParent ? box.offsetParent.tagName + '#' + box.offsetParent.id : 'null');
        console.log('box computed display:', window.getComputedStyle(box).display);
        console.log('box parent innerHTML length:', box.parentElement.innerHTML.length);
    `);
});
