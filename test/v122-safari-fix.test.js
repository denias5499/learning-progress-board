const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v1.6.122 Bug A: 附件 IIFE 開頭 preventDefault', () => {
    assert.ok(WN.includes('v1.6.122: 立刻註冊 preventDefault'),
        '應在 IIFE 開頭加 preventDefault');
});

test('v1.6.122 Bug B: drop-zone 加 inline ondragover preventDefault', () => {
    assert.ok(WN.includes('ondragover="event.preventDefault();return false;"'),
        'drop-zone 應有 inline ondragover preventDefault');
});

test('v1.6.122 Bug C: iframe 加 sandbox 防 navigation', () => {
    assert.ok(IDX.includes('sandbox="allow-scripts allow-same-origin allow-forms"'),
        'iframe 應有 sandbox 屬性');
});

test('v1.6.122: title [v1.6.122]', () => {
    assert.ok(/<title>.*\[v1\.6\.122\]<\/title>/.test(IDX));
});
