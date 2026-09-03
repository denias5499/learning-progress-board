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

test('v1.6.117 Bug 1+2: 注入 CSS 涵蓋 crop-header, crop-workspace, page-container', () => {
    assert.ok(IDX.includes('.crop-header { max-width: 1200px'),
        '應注入 .crop-header max-width: 1200px');
    assert.ok(IDX.includes('.crop-workspace, .page-container'),
        '應注入 .crop-workspace, .page-container');
});

test('v1.6.117: title [v1.6.117]', () => {
    assert.ok(/<title>.*\[v1\.6\.117\]<\/title>/.test(IDX));
});
