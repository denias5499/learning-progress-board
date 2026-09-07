const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');
const IDX = fs.readFileSync('index.html', 'utf8');

test('v1.6.126: renderImage 改用 createObjectURL', () => {
    // 抓緊接著 function renderImage 的 code block
    var startIdx = WN.indexOf('function renderImage(');
    assert.ok(startIdx > 0);
    // 抓接下來 1500 字元找 createObjectURL, 並確認沒有 reader.readAsDataURL 呼叫
    var block = WN.substring(startIdx, startIdx + 2000);
    assert.ok(block.includes('URL.createObjectURL'),
        'renderImage 應用 createObjectURL');
    // 確認 reader.readAsDataURL 不是程式碼呼叫 (排除註解)
    assert.ok(!/reader\.readAsDataURL/.test(block),
        'renderImage 不應有 reader.readAsDataURL 呼叫');
});

test('v1.6.126: renderImage 有 error handler', () => {
    var startIdx = WN.indexOf('function renderImage(');
    var block = WN.substring(startIdx, startIdx + 2000);
    assert.ok(block.includes('img.onerror'),
        'renderImage 應有 img.onerror 防 freeze');
});

test('v1.6.126: title [v1.6.126]', () => {
    assert.ok(/<title>.*\[v1\.6\.126\]<\/title>/.test(IDX));
});
