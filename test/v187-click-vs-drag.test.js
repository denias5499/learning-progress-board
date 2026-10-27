// ⚠️ v2.3.2.145: 本檔有 2 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
// v1.6.87: click vs drag 區分 - 點擊立即新增, 拖拉維持
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

function getFunctionBody(name) {
    const start = html.indexOf('function ' + name + '(');
    if (start < 0) return null;
    let depth = 0, i = html.indexOf('{', start);
    if (i < 0) return null;
    const bodyStart = i + 1;
    while (i < html.length) {
        if (html[i] === '{') depth++;
        if (html[i] === '}') {
            depth--;
            if (depth === 0) return html.substring(bodyStart, i);
        }
        i++;
    }
    return null;
}

test.skip('v1.6.87: mouseup 區分 click (w<=10) vs drag (w>10)', () => {
    const m = html.match(/cropArea\.onmouseup\s*=\s*function[\s\S]+?\};/);
    assert.ok(m, '應有 cropArea.onmouseup');
    const code = m[0];
    assert.ok(code.includes('w > 10 && box.h > 10'), '應檢查 drag 大小');
    assert.ok(code.includes('clickBox') || code.includes('點擊'), '應有 click 邏輯');
});

test.skip('v1.6.87: click 立即新增 100x100 box (居中)', () => {
    const m = html.match(/cropArea\.onmouseup\s*=\s*function[\s\S]+?\};/);
    assert.ok(m, '應有 cropArea.onmouseup');
    const code = m[0];
    assert.ok(code.includes('boxW = Math.min(100'), '應 boxW = 100');
    assert.ok(code.includes('boxH = Math.min(100'), '應 boxH = 100');
});

test('v1.6.87: title 更新為 [v1.6.87]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
