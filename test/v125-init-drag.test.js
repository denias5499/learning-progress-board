const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v1.6.125 Bug 1: _globalDragBound 在 DOMContentLoaded init 階段註冊', () => {
    // 找 document.addEventListener('DOMContentLoaded' 然後抓 100 行內的內容
    var idx = IDX.indexOf("addEventListener('DOMContentLoaded'");
    assert.ok(idx > 0, '應找到 DOMContentLoaded');
    // 抓緊接著 800 chars 內的內容
    var block = IDX.substring(idx, idx + 1500);
    assert.ok(block.includes('_globalDragBound = true'),
        'DOMContentLoaded 內應有 _globalDragBound 設定');
    // 確保 _globalDragBound 在 var zone 之前
    var globalDragPos = block.indexOf('_globalDragBound = true');
    var zonePos = block.indexOf("getElementById('wn-drop-zone')");
    assert.ok(globalDragPos > 0 && globalDragPos < zonePos,
        '_globalDragBound 應在 zone 設定之前');
});

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

test('v1.6.125: title [v1.6.125]', () => {
    assert.ok(/<title>.*\[v1\.6\.125\]<\/title>/.test(IDX));
});
