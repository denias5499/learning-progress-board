// v1.6.140: renderAeSubjectCardHtml 讀 _deletedTypes marker (array 結構), 從 defaultOrder 移除已刪除的 typeName
// 行為: dropdown tab 不再 render 已刪除的 type (即使教材庫頁面已刪)
// v1.6.139 誤把 array 當 object 查 key, 這版用 indexOf 修對
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('/mnt/my_book/Denias/projects/learning-progress-board/index.html', 'utf8');

test('v140: renderAeSubjectCardHtml 必須讀 _deletedTypes marker (array 結構)', () => {
    const fn = IDX.match(/function renderAeSubjectCardHtml\(sub, subUnits, cat, mis\)\s*\{[\s\S]*?function [a-z]/)[0];
    // 架構測試: function body 內必須有 _deletedTypes 引用
    assert.ok(/_deletedTypes/.test(fn), 'renderAeSubjectCardHtml 必須讀 _deletedTypes marker');
    // 必須用 multiData[currentUserId] 取 user (跟同檔其他 function 一致)
    assert.ok(/multiData\[currentUserId\]/.test(fn), 'renderAeSubjectCardHtml 必須透過 multiData[currentUserId] 取 user');
    // 必須用 indexOf (array 查 value), 不能用 _delTypes[t] (object 查 key) — 修 v1.6.139 錯誤
    assert.ok(/\.indexOf\(/.test(fn), 'v1.6.140 必須用 .indexOf() 查 array (v1.6.139 誤用 object 查 key 修對)');
    // 不能再用 _delTypes 變數名 (那是 v1.6.139 object 寫法)
    assert.ok(!/var _delTypes\b/.test(fn), '不能再用 _delTypes 變數 (那是 v1.6.139 object 寫法, 應改用 _delArr)');
});

test('v140: defaultOrder 必須根據 _deletedTypes array 過濾 (用 indexOf)', () => {
    const fn = IDX.match(/function renderAeSubjectCardHtml\(sub, subUnits, cat, mis\)\s*\{[\s\S]*?function [a-z]/)[0];
    // 行為測試: defaultOrder = defaultOrder.filter(...) 必須存在
    assert.ok(/defaultOrder\s*=\s*defaultOrder\.filter/.test(fn), '必須對 defaultOrder 做 filter');
    // filter callback 內必須用 _delArr.indexOf(t) < 0
    const filterMatch = fn.match(/defaultOrder\.filter\(function\([^)]*\)\{[\s\S]*?\}\)/);
    assert.ok(filterMatch, '必須有 filter callback');
    assert.ok(/_delArr\.indexOf\([^)]+\)\s*<\s*0/.test(filterMatch[0]),
              'filter callback 必須用 _delArr.indexOf(t) < 0 判斷 (v1.6.140 array 修法)');
});

test('v140: 過濾邏輯向後相容 (沒 marker 時 5 個 type 全 render)', () => {
    const fn = IDX.match(/function renderAeSubjectCardHtml\(sub, subUnits, cat, mis\)\s*\{[\s\S]*?function [a-z]/)[0];
    // 確認 defaultOrder 仍是 5 個 type 的字面陣列 (v1.5.40 + v1.6.137 沿用)
    const defaultOrderDecl = fn.match(/var defaultOrder = \[([\s\S]*?)\]/);
    assert.ok(defaultOrderDecl, '必須有 defaultOrder 宣告');
    const arr = defaultOrderDecl[1];
    assert.ok(arr.includes('複習講義'), 'defaultOrder 必須含 複習講義');
    assert.ok(arr.includes('考古題'), 'defaultOrder 必須含 考古題');
    assert.ok((arr.match(/'/g) || []).length >= 10, 'defaultOrder 必須有 5 個 type 字串');
    // _delArr fallback 必須是 [] (空 array), 不是 {} (空 object) — 修 v1.6.139 錯誤
    assert.ok(/var _delArr[\s\S]*?\|\| \[\]/.test(fn), '_delArr fallback 必須是空 array []');
});
