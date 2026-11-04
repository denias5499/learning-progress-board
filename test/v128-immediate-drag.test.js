const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');
const IDX = fs.readFileSync('index.html', 'utf8');





test('v1.6.128: renderImage 用 createObjectURL (v1.6.126 保留)', () => {
    var idx = WN.indexOf('function renderImage(');
    var block = WN.substring(idx, idx + 2000);
    assert.ok(block.includes('URL.createObjectURL'), 'createObjectURL 應在');
});


