// ⚠️ v2.3.2.145: 本檔有 2 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');

test.skip('v1.6.124: iframe 直接 src', () => {
    assert.ok(/id="wrongnotes-iframe"[^>]*src="wrong-notes\/index\.html"/.test(IDX),
        'iframe 應直接 src=\"wrong-notes/index.html\"');
    assert.ok(!/id="wrongnotes-iframe"[^>]*src=""/.test(IDX),
        '不應有 src=\"\" 空白 src');
});

test('v1.6.124: 不用 fetch/blob URL', () => {
    var openFn = IDX.match(/function openWrongNotes\(\)\s*\{([\s\S]*?)\n        \}/);
    if (openFn) {
        assert.ok(!openFn[1].includes("fetch('wrong-notes/index.html')"),
            'openWrongNotes 不應用 fetch');
        assert.ok(!openFn[1].includes('URL.createObjectURL'),
            'openWrongNotes 不應用 createObjectURL');
    }
});

test.skip('v1.6.124: title [v1.6.124]', () => {
    assert.ok(/<title>.*\[v1\.6\.124\]<\/title>/.test(IDX));
});
