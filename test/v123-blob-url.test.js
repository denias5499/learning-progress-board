const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');

test('v1.6.123: 拿掉 iframe sandbox', () => {
    assert.ok(!/<iframe[^>]*wrongnotes-iframe[^>]*sandbox=/.test(IDX),
        'iframe 不應有 sandbox 屬性');
});

test('v1.6.123: openWrongNotes 改用 fetch + blob URL', () => {
    assert.ok(IDX.includes("fetch('wrong-notes/index.html')"),
        '應使用 fetch 載入附件');
    assert.ok(IDX.includes('new Blob([html]'),
        '應用 Blob + URL.createObjectURL');
});

test('v1.6.123: title [v1.6.123]', () => {
    assert.ok(/<title>.*\[v1\.6\.123\]<\/title>/.test(IDX));
});
