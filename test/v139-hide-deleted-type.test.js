// v1.6.139: renderAeSubjectCardHtml 讀取 _deletedTypes marker, 從 defaultOrder 移除已刪除的 typeName
// 行為: dropdown tab 不再 render 已刪除的 type (即使教材庫頁面已刪)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('/mnt/my_book/Denias/projects/learning-progress-board/index.html', 'utf8');

test('v139: renderAeSubjectCardHtml 必須讀 _deletedTypes marker', () => {
    const fn = IDX.match(/function renderAeSubjectCardHtml\(sub, subUnits, cat, mis\)\s*\{[\s\S]*?function [a-z]/)[0];
    // 架構測試: function body 內必須有 _deletedTypes 引用
    assert.ok(/_deletedTypes/.test(fn), 'renderAeSubjectCardHtml 必須讀 _deletedTypes marker');
    // 必須用 multiData[currentUserId] 取 user (跟同檔其他 function 一致)
    assert.ok(/multiData\[currentUserId\]/.test(fn), 'renderAeSubjectCardHtml 必須透過 multiData[currentUserId] 取 user');
});

test('v139: defaultOrder 必須根據 _deletedTypes 過濾', () => {
    const fn = IDX.match(/function renderAeSubjectCardHtml\(sub, subUnits, cat, mis\)\s*\{[\s\S]*?function [a-z]/)[0];
    // 行為測試: defaultOrder = defaultOrder.filter(...) 必須存在
    assert.ok(/defaultOrder\s*=\s*defaultOrder\.filter/.test(fn), '必須對 defaultOrder 做 filter');
    // filter 內必須參考 _delTypes (避免任何 typeName 寫死)
    const filterMatch = fn.match(/defaultOrder\.filter\(function\([^)]*\)\{[\s\S]*?\}\)/);
    assert.ok(filterMatch, '必須有 filter callback');
    assert.ok(/_delTypes/.test(filterMatch[0]) || /!_delTypes\[/.test(filterMatch[0]),
              'filter callback 必須檢查 _delTypes');
});

test('v139: 過濾邏輯向後相容 (沒 marker 時 5 個 type 全 render)', () => {
    const fn = IDX.match(/function renderAeSubjectCardHtml\(sub, subUnits, cat, mis\)\s*\{[\s\S]*?function [a-z]/)[0];
    // 確認 defaultOrder 仍是 5 個 type 的字面陣列 (v1.5.40 + v1.6.137 沿用)
    const defaultOrderDecl = fn.match(/var defaultOrder = \[([\s\S]*?)\]/);
    assert.ok(defaultOrderDecl, '必須有 defaultOrder 宣告');
    const arr = defaultOrderDecl[1];
    assert.ok(arr.includes('複習講義'), 'defaultOrder 必須含 複習講義');
    assert.ok(arr.includes('考古題'), 'defaultOrder 必須含 考古題');
    assert.ok((arr.match(/'/g) || []).length >= 10, 'defaultOrder 必須有 5 個 type 字串');
});
