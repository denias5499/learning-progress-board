const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v1.6.120: getSyllabusDB 自己讀 localStorage', () => {
    assert.ok(WN.includes('localStorage.getItem(\'StudyMap_UserData\')'),
        '應自己讀 localStorage.StudyMap_UserData');
    assert.ok(WN.includes('var user = JSON.parse(raw)'),
        '應解析 user.masters');
});

test('v1.6.120: 加 WN_importBackup 從備份檔匯入', () => {
    assert.ok(WN.includes('WN_importBackup'),
        '應有 WN_importBackup 函式');
    assert.ok(WN.includes('從 StudyMap 備份檔匯入教材庫'),
        '應有匯入按鈕');
});

test('v1.6.120: title [v1.6.120]', () => {
    assert.ok(/<title>.*\[v1\.6\.120\]<\/title>/.test(IDX));
});
