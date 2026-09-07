const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');
const IDX = fs.readFileSync('index.html', 'utf8');

test('v1.6.128: setupDragAndDrop 立即執行 (不在 onload 內)', () => {
    // 找 try { setupDragAndDrop(); ... } catch
    assert.ok(/try\s*\{\s*setupDragAndDrop\(\)/.test(WN),
        '應有 try { setupDragAndDrop() 立即執行');
});

test('v1.6.128: onload 只 init dropdowns', () => {
    var onloadFn = WN.match(/window\.onload = function\(\)\s*\{([\s\S]*?)\n    \};/);
    assert.ok(onloadFn, '應找到 window.onload');
    assert.ok(!onloadFn[1].includes('setupDragAndDrop('),
        'onload 不應呼叫 setupDragAndDrop');
    assert.ok(onloadFn[1].includes('WN_initWrongNotes('),
        'onload 應呼叫 WN_initWrongNotes');
});

test('v1.6.128: renderImage 用 createObjectURL (v1.6.126 保留)', () => {
    var idx = WN.indexOf('function renderImage(');
    var block = WN.substring(idx, idx + 2000);
    assert.ok(block.includes('URL.createObjectURL'), 'createObjectURL 應在');
});

test('v1.6.128: title [v1.6.128]', () => {
    assert.ok(/<title>.*\[v1\.6\.128\]<\/title>/.test(IDX));
});
