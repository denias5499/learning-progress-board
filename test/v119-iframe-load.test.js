const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');

test('v1.6.119 Bug A: iframe 移除 inline onload', () => {
    assert.ok(!IDX.includes('onload="WN_injectIntoIframe()"'),
        'iframe 不應有 inline onload (iframe window 找不到主專案 function)');
    assert.ok(IDX.includes('src="wrong-notes/index.html"'),
        'iframe src 應為明確 wrong-notes/index.html');
});

test('v1.6.119 Bug B: openWrongNotes 用 addEventListener', () => {
    assert.ok(IDX.includes("addEventListener('load'"),
        '應有 addEventListener load');
    assert.ok(IDX.includes('[v1.6.119] iframe loaded'),
        '應有 debug log');
});

test('v1.6.119: title [v1.6.119]', () => {
    assert.ok(/<title>.*\[v1\.6\.119\]<\/title>/.test(IDX));
});
