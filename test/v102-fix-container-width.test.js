// v1.6.102: 修 wn-page-container width (讓 img 真的填滿)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.102: wn-page-container 有 width: 100% (讓 img 填滿)', () => {
    const m = html.match(/<div class="wn-page-container" id="wn-page-container"[^>]*style="([^"]*)"/);
    assert.ok(m);
    const style = m[1];
    assert.ok(style.includes('max-width:800px'), '應有 max-width');
    assert.ok(style.includes('width:100%') || style.includes('width: 100%'),
        '應有 width: 100% (讓 img 真的填滿)');
});

test('v1.6.102: wn-crop-img style 不變', () => {
    const m = html.match(/<img id="wn-crop-img"[^>]*style="([^"]*)"/);
    assert.ok(m);
    const style = m[1];
    assert.ok(style.includes('max-width:100%'), '應有 max-width:100%');
});

test('v1.6.102: title 為 [v1.6.102]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.102\]<\/title>/.test(html));
});
