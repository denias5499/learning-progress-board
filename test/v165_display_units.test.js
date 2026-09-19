// v1.6.165 unit test — 單元名稱顯示含 vol 前綴
const assert = require('assert');

// ============================================================
// 複製 index.html 裡的 _displayUnits 計算邏輯 (含 v1.6.165 修改)
// ============================================================
function displayUnits(wrongUnits) {
    if (!wrongUnits || !Array.isArray(wrongUnits) || wrongUnits.length === 0) return [];
    return wrongUnits.map(function(wu) {
        if (!wu) return '';
        var i = wu.indexOf('|');
        // v1.6.165: 若有 vol 前綴, 顯示為「vol unit」(空格分隔), 沒 vol 就只顯示 unit
        return (i > 0) ? (wu.substring(0, i) + ' ' + wu.substring(i + 1)) : wu;
    });
}

// ============================================================
// Tests
// ============================================================
let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); console.log(`✓ ${name}`); pass++; }
    catch (e) { console.log(`✗ ${name}\n   ${e.message}`); fail++; }
}

console.log('\n=== displayUnits v1.6.165 (含 vol 前綴) ===');

t('無 vol: ["U1"] → ["U1"]', function() {
    assert.deepStrictEqual(displayUnits(['U1']), ['U1']);
});
t('無 vol: ["U1","U2","U3"] → ["U1","U2","U3"]', function() {
    assert.deepStrictEqual(displayUnits(['U1','U2','U3']), ['U1','U2','U3']);
});
t('有 vol: ["第一冊|L1~3"] → ["第一冊 L1~3"]', function() {
    assert.deepStrictEqual(displayUnits(['第一冊|L1~3']), ['第一冊 L1~3']);
});
t('有 vol: ["第二冊|L3~4"] → ["第二冊 L3~4"]', function() {
    assert.deepStrictEqual(displayUnits(['第二冊|L3~4']), ['第二冊 L3~4']);
});
t('混合: 第一筆有 vol 第二筆無 → ["第一冊 L1~3","L1~2"]', function() {
    assert.deepStrictEqual(displayUnits(['第一冊|L1~3','L1~2']), ['第一冊 L1~3','L1~2']);
});
t('空 array → []', function() {
    assert.deepStrictEqual(displayUnits([]), []);
});
t('null → []', function() {
    assert.deepStrictEqual(displayUnits(null), []);
});
t('undefined → []', function() {
    assert.deepStrictEqual(displayUnits(undefined), []);
});
t('非 array → []', function() {
    assert.deepStrictEqual(displayUnits('U1'), []);
});
t('空字串元素: [""] → [""]', function() {
    assert.deepStrictEqual(displayUnits(['']), ['']);
});
t('字音 (無 vol, 漢字 unit) → ["字音"]', function() {
    assert.deepStrictEqual(displayUnits(['字音']), ['字音']);
});
t('多 vol: ["第一冊|L1~L3","第二冊|L4~L6"] → ["第一冊 L1~L3","第二冊 L4~L6"]', function() {
    assert.deepStrictEqual(displayUnits(['第一冊|L1~L3','第二冊|L4~L6']), ['第一冊 L1~L3','第二冊 L4~L6']);
});

console.log('\n========================================');
console.log(`🎉 ${pass}/${pass+fail} PASS`);
if (fail > 0) process.exit(1);