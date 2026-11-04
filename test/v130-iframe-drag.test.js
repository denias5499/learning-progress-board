// v1.6.130: 主專案 <iframe> 元素必須有 dragover/drop preventDefault
//   Safari 對於 iframe dragover 會把 iframe 當 navigation target → freeze
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');





test('v130: iframe handler 用 preventDefault + stopPropagation', () => {
    const IDX = fs.readFileSync('index.html', 'utf8');
    assert.ok(IDX.includes('e.preventDefault(); e.stopPropagation()'),
        'iframe dragover/drop 應 preventDefault + stopPropagation');
});
