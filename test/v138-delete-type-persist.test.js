// v1.6.138: 刪除教材類型後, 下次啟動不會被自動 repair 回來
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');

test('v138: repair 邏輯讀取 _deletedTypes marker', () => {
    // 確認 switchUser 內有讀 _deletedTypes
    const sw = IDX.match(/function switchUser\(\)\s*\{[\s\S]*?function [a-z]/)[0];
    assert.ok(/_deletedTypes/.test(sw), 'switchUser 必須讀 _deletedTypes marker');
});

test('v138: repair 跳過使用者刪過的 type', () => {
    const sw = IDX.match(/function switchUser\(\)\s*\{[\s\S]*?function [a-z]/)[0];
    assert.ok(/deletedInThisSub\.indexOf\(t\) < 0/.test(sw), 'repair 必須跳過使用者刪過的 type');
});

test('v138: deleteMaterialType 寫 _deletedTypes marker', () => {
    const del = IDX.match(/function deleteMaterialType\(\)[\s\S]*?function [a-z]/)[0];
    assert.ok(/_deletedTypes/.test(del), 'deleteMaterialType 必須寫 _deletedTypes marker');
    assert.ok(/usr\._deletedTypes\[appCurrentCat\]\[sub\]\.push/.test(del), '必須 push 到 [cat][sub]');
});
