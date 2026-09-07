const test = require('node:test');
const { JSDOM } = require('jsdom');
const fs = require('fs');

const HTML_PATH = '/mnt/my_book/Denias/projects/learning-progress-board/index.html';
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('debug: crop area 顯示但圖片沒顯示', () => {
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
    const win = dom.window;
    win.console = { log: (...args) => process.stderr.write(args.join(' ') + '\n') };

    win.eval(`
        // 看 cropImg 跟 wn-crop-area 跟 wn-page-container 的實際狀態
        var img = document.getElementById('wn-crop-img');
        console.log('cropImg src length:', img.src.length);
        console.log('cropImg naturalWidth:', img.naturalWidth);
        console.log('cropImg clientWidth:', img.clientWidth);
        console.log('cropImg style.display:', img.style.display);
        console.log('cropImg parent tagName:', img.parentElement.tagName);
        console.log('cropImg parent id:', img.parentElement.id);
        
        var ca = document.getElementById('wn-crop-area');
        console.log('cropArea style.display:', ca.style.display);
        console.log('cropArea computed display:', window.getComputedStyle(ca).display);
        
        var pc = document.getElementById('wn-page-container');
        console.log('pageContainer exists:', !!pc);
        if (pc) {
            var pr = pc.getBoundingClientRect();
            console.log('pageContainer rect:', pr.left, pr.top, pr.width, pr.height);
        }
        
        // 看 wn-source-zone 是不是還在
        var sz = document.getElementById('wn-source-zone');
        console.log('source-zone display:', window.getComputedStyle(sz).display);
        var pz = document.getElementById('wn-paper-zone');
        console.log('paper-zone display:', window.getComputedStyle(pz).display);
    `);
});
