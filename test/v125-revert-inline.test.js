const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v1.6.125: 拿掉 inline ondragover/ondrop (v1.6.122 的 hack)', () => {
    assert.ok(!WN.includes('ondragover="event.preventDefault()'),
        '不應有 inline ondragover');
    assert.ok(!WN.includes('ondrop="event.preventDefault()'),
        '不應有 inline ondrop');
});

test('v1.6.125: drop-zone HTML 乾淨 (回到 v1.6.114 樣式)', () => {
    assert.ok(/<div class="drop-zone" id="zone-photos" onclick="document\.getElementById\('source-image-photos'\)\.click\(\)">/.test(WN),
        'zone-photos 應無 inline handler');
});

test('v1.6.125: setupDragAndDrop 內 window.addEventListener 還在', () => {
    assert.ok(WN.includes("addEventListener(eventName, function(e)"),
        'setupDragAndDrop 內應有 window.addEventListener preventDefault');
});
