// v1.6.100: 加 wn-source-input onchange handler
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.100: wn-source-input 有 onchange handler', () => {
    const m = html.match(/<input type="file" id="wn-source-input"[^>]*>/);
    assert.ok(m);
    const tag = m[0];
    assert.ok(tag.includes('onchange="WN_handleFileUpload(this.files[0])"'));
});

test('v1.6.100: wn-paper-input 也有 onchange handler', () => {
    const m = html.match(/<input type="file" id="wn-paper-input"[^>]*>/);
    assert.ok(m);
    const tag = m[0];
    assert.ok(tag.includes('onchange'));
});

test('v1.6.100: title 為 [v1.6.100]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.100\]<\/title>/.test(html));
});
