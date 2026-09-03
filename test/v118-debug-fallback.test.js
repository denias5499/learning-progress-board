const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v1.6.118 Bug 3: getSyllabusDB 加 fallback + debug log', () => {
    assert.ok(WN.includes('Object.keys(window.WN_masterData.tree).length > 0'),
        '應檢查 tree 是否有資料');
    assert.ok(WN.includes('[v1.6.118 getSyllabusDB]'),
        '應有 debug log');
    assert.ok(WN.includes('[debug] StudyMap_UserData'),
        '應 debug localStorage');
});

test('v1.6.118 Bug 4: generateNote 加 debug log', () => {
    assert.ok(WN.includes('[v1.6.118 generateNote] cards.length'),
        'generateNote 應有 cards.length debug');
});

test('v1.6.118: 主專案 WN_injectIntoIframe 加 debug log', () => {
    assert.ok(IDX.includes('[v1.6.118 WN_injectIntoIframe] masterData.subjects'),
        '應印 masterData.subjects');
    assert.ok(IDX.includes('[v1.6.118 WN_injectIntoIframe] user.masters keys'),
        '應印 user.masters keys');
});

test('v1.6.118: title [v1.6.118]', () => {
    assert.ok(/<title>.*\[v1\.6\.118\]<\/title>/.test(IDX));
});
