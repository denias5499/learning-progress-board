const test = require('node:test');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('debug: upload + crop area 顯示', () => {
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
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
