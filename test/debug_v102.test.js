const test = require('node:test');
const { JSDOM } = require('jsdom');
const fs = require('fs');

test('debug: 模擬 WN_handleFileUpload', () => {
    const html = fs.readFileSync('/mnt/my_book/Denias/projects/learning-progress-board/index.html', 'utf8');
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
    const win = dom.window;
    win.console = { log: (...args) => process.stderr.write(args.join(' ') + '\n') };

    win.eval(`
        // 模擬 img.onload 完成後的狀態
        var pc = document.getElementById('wn-page-container');
        var ca = document.getElementById('wn-crop-area');
        var img = document.getElementById('wn-crop-img');
        
        // 模擬 img 載入完成
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        Object.defineProperty(img, 'naturalWidth', { value: 200, configurable: true });
        Object.defineProperty(img, 'naturalHeight', { value: 100, configurable: true });
        Object.defineProperty(img, 'complete', { value: true, configurable: true });
        
        // 模擬 WN_setupCropEvents + WN_createNewManualBox
        ca.style.display = 'block';
        WN_setupCropEvents();
        
        console.log('=== before WN_createNewManualBox ===');
        console.log('pc offsetWidth:', pc.offsetWidth);
        console.log('pc clientWidth:', pc.clientWidth);
        console.log('pc rect:', JSON.stringify(pc.getBoundingClientRect()));
        
        // 直接呼叫 createNewManualBox
        WN_createNewManualBox(150, 50, pc);
        
        var box = pc.querySelector('.wn-crop-box');
        if (box) {
            console.log('=== box created ===');
            console.log('box style.left:', box.style.left);
            console.log('box style.top:', box.style.top);
            console.log('box rect:', JSON.stringify(box.getBoundingClientRect()));
            console.log('box offsetParent:', box.offsetParent ? box.offsetParent.tagName : 'null');
        } else {
            console.log('!!! box NOT created');
        }
    `);
});
