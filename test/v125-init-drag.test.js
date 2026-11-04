const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');



test('v1.6.125 Bug 2: 拿掉 inline ondragover/ondrop', () => {
    assert.ok(!WN.includes('ondragover="event.preventDefault()'),
        '不應有 inline ondragover');
    assert.ok(!WN.includes('ondrop="event.preventDefault()'),
        '不應有 inline ondrop');
});

test('v1.6.125: 主專案有 document.addEventListener dragover', () => {
    var matches = IDX.match(/document\.addEventListener\('dragover'/g) || [];
    assert.ok(matches.length >= 1, '應有 document.addEventListener dragover');
});


