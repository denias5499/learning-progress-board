// v1.6.112: 移除 iframe, 保留主專案原本的「匯入錯題」tab + 寬度匹配 dashboard
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');

test('v1.6.112: page-wrongnotes 不再有 iframe', () => {
    assert.ok(!IDX.includes('wrongnotes-iframe'), '不應有 wrongnotes-iframe');
    assert.ok(!/id="wrongnotes-iframe"/.test(IDX), '不應有 id="wrongnotes-iframe"');
});








