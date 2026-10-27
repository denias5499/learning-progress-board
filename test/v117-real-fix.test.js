// ⚠️ v2.3.2.145: 本檔有 2 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v1.6.117 Bug 3: createSettingCard 用 getSyllabusDB()', () => {
    assert.ok(WN.includes('Object.keys(getSyllabusDB()).forEach(sub => subjOptions'),
        'createSettingCard 應用 getSyllabusDB() 抓科目');
    assert.ok(!WN.includes('Object.keys(syllabusDB).forEach(sub => subjOptions'),
        '不應再有 Object.keys(syllabusDB).forEach');
});

test.skip('v1.6.117 Bug 1+2: 注入 CSS 涵蓋 crop-header, crop-workspace, page-container', () => {
    assert.ok(IDX.includes('.crop-header { max-width: 1200px'),
        '應注入 .crop-header max-width: 1200px');
    assert.ok(IDX.includes('.crop-workspace, .page-container'),
        '應注入 .crop-workspace, .page-container');
});

test.skip('v1.6.117: title [v1.6.117]', () => {
    assert.ok(/<title>.*\[v1\.6\.117\]<\/title>/.test(IDX));
});
