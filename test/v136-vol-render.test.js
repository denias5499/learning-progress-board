// v1.6.136: 手動新增進度 - 模擬題本 / 考古題 沒顯示 bug
// root cause: appMaster[sub].volOrder.filter() 會漏掉 instance-prefixed vol
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');

test('v136: 5 處都用 Object.keys(sTree.items) (不再用 volOrder.filter)', () => {
    // 不能再有 volOrder.filter 配 sTree.items 的寫法
    assert.equal(IDX.match(/volOrder\.filter\(.*?sTree\.items\[v\]/g), null, '不應再有 volOrder.filter sTree.items[v]');
});

test('v136: onAeMisChange 用 Object.keys', () => {
    assert.ok(/onAeMisChange[\s\S]*?var vols = Object\.keys\(sTree\.items\)/m.test(IDX));
});

test('v136: aeSlide 用 Object.keys', () => {
    assert.ok(/aeSlide[\s\S]*?var vols = Object\.keys\(sTree\.items\)/m.test(IDX));
});
