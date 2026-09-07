const test = require('node:test');
const { JSDOM } = require('jsdom');
const fs = require('fs');

const HTML_PATH = '/mnt/my_book/Denias/projects/learning-progress-board/index.html';
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('debug: WN_setupCropEvents mousedown handler', () => {
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
    const win = dom.window;
    win.console = { log: (...args) => process.stderr.write(args.join(' ') + '\n') };

    win.eval(`
        // 看 WN_setupCropEvents 完整
        var idx = window.WN_setupCropEvents.toString().indexOf('function');
        console.log(window.WN_setupCropEvents.toString().substring(0, 800));
    `);
});
