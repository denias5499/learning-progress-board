// v1.6.166 unit test — 跨單元 overlap 不能跨 vol 污染
const assert = require('assert');

// ============================================================
// 模擬 getUnitDonePagesByOverlap 的核心邏輯 (含 v1.6.166 修改)
// ============================================================
function computeOverlap(allUnits, tasks) {
    var result = {};
    tasks.forEach(function(t) {
        if (!t || !t.isDone || !t.startPage || !t.endPage) return;
        var taskUnitInfo = allUnits[t.unitId];
        var taskSub = taskUnitInfo ? taskUnitInfo.subj : null;
        Object.keys(allUnits).forEach(function(uid) {
            var u = allUnits[uid];
            if (taskSub && u.subj !== taskSub) return;
            // v1.5.189: skip if same page range as direct unit (1~4冊 vs 1~4冊聽力 例外)
            if (taskUnitInfo && uid !== t.unitId && u.start === taskUnitInfo.start && u.end === taskUnitInfo.end) {
                return;
            }
            // v1.6.166 FIX: 若 task 和 unit 都有 vol, 必須相符 (避免跨冊污染)
            if (t.vol && u.vol && t.vol !== u.vol) return;
            var s = t.startPage > u.start ? t.startPage : u.start;
            var e = t.endPage < u.end ? t.endPage : u.end;
            if (e >= s) {
                if (!result[uid + '_pages']) result[uid + '_pages'] = new Set();
                var pageSet = result[uid + '_pages'];
                var added = 0;
                for (var p = s; p <= e; p++) {
                    if (!pageSet.has(p)) { pageSet.add(p); added++; }
                }
                if (added > 0) {
                    result[uid] = (result[uid] || 0) + added;
                }
            }
        });
    });
    return result;
}

// ============================================================
// Test cases (模擬 英文/複習卷/大滿貫甲 L1~2 across vols)
// ============================================================
let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); console.log(`✓ ${name}`); pass++; }
    catch (e) { console.log(`✗ ${name}\n   ${e.message}`); fail++; }
}

console.log('\n=== 跨冊 overlap 污染測試 (v1.6.166) ===');

// 模擬 大滿貫甲 L1~2 in 5 vols, 都是 P.1
var allUnits = {
    'uid_vol2': { name: 'L1~2', start: 1, end: 1, subj: '英文', vol: '第二冊' },
    'uid_vol3': { name: 'L1~2', start: 1, end: 1, subj: '英文', vol: '第三冊' },
    'uid_vol4': { name: 'L1~2', start: 1, end: 1, subj: '英文', vol: '第四冊' },
    'uid_vol5': { name: 'L1~2', start: 1, end: 1, subj: '英文', vol: '第五冊' },
    'uid_vol6': { name: 'L1~2', start: 1, end: 1, subj: '英文', vol: '第六冊' },
};

// 使用者排了一個 task 在 第三冊 L1~2 (P.1)
var tasks = [
    { unitId: 'uid_vol3', startPage: 1, endPage: 1, isDone: true, vol: '第三冊' }
];

var result = computeOverlap(allUnits, tasks);
console.log('  result:', JSON.stringify(result));

t('第三冊 L1~2 task → 只 cover 第三冊 L1~2 (不污染其他冊)', function() {
    assert.strictEqual(result['uid_vol3'], 1, '第三冊 should be covered');
    assert.strictEqual(result['uid_vol2'], undefined, '第二冊 should NOT be covered');
    assert.strictEqual(result['uid_vol4'], undefined, '第四冊 should NOT be covered');
    assert.strictEqual(result['uid_vol5'], undefined, '第五冊 should NOT be covered');
    assert.strictEqual(result['uid_vol6'], undefined, '第六冊 should NOT be covered');
});

// 不同科目應該被過濾
var allUnitsWithOtherSub = Object.assign({}, allUnits, {
    'uid_math': { name: 'L1~2', start: 1, end: 1, subj: '數學', vol: '第一冊' }
});
var result2 = computeOverlap(allUnitsWithOtherSub, tasks);
t('跨科目同 unit name 不污染 (數學 L1~2 不受 英文 第三冊 L1~2 影響)', function() {
    assert.strictEqual(result2['uid_math'], undefined, '不同科目不該被 cover');
});

// task 沒 vol (舊記錄) → 應該回退到原行為, 還是會污染
var tasksNoVol = [
    { unitId: 'uid_vol3', startPage: 1, endPage: 1, isDone: true }  // 沒 vol
];
var resultNoVol = computeOverlap(allUnits, tasksNoVol);
t('task 沒 vol 時 → 行為同舊版 (會跨冊污染, 向下相容)', function() {
    // 沒 vol 就當成「舊記錄」, 跨冊污染保留 (避免破壞現有資料)
    assert.strictEqual(resultNoVol['uid_vol3'], 1, '第三冊 should be covered');
    // 其他冊會被污染 (舊行為, 但因為 task 自己也是 vol 已知所以實際上這條 path 不會跑到)
});

// 同 vol 不同 unit 但頁碼重疊 → 應該 cover (例如 L1~2 + L1~L3 同 vol 不同頁範圍)
var allUnitsSameVol = {
    'uid_main': { name: 'L1~L3', start: 1, end: 3, subj: '英文', vol: '第一冊' },
    'uid_review': { name: 'L4~L6', start: 4, end: 6, subj: '英文', vol: '第一冊' }
};
var tasksSameVol = [
    { unitId: 'uid_main', startPage: 1, endPage: 3, isDone: true, vol: '第一冊' }
];
var resultSameVol = computeOverlap(allUnitsSameVol, tasksSameVol);
t('同 vol 不同 unit 頁不重疊 → 只 cover 自己', function() {
    assert.strictEqual(resultSameVol['uid_main'], 3, 'main (P.1-3) should be covered');
    assert.strictEqual(resultSameVol['uid_review'], undefined, 'review (P.4-6) should NOT be covered');
});

// 不同 vol 但頁碼重疊 → 不該 cover
var allUnitsCrossVol = {
    'uid_vol2': { name: 'L1~L3', start: 1, end: 3, subj: '英文', vol: '第二冊' },
    'uid_vol3': { name: 'L1~L3', start: 1, end: 3, subj: '英文', vol: '第三冊' }
};
var tasksCrossVol = [
    { unitId: 'uid_vol3', startPage: 1, endPage: 3, isDone: true, vol: '第三冊' }
];
var resultCrossVol = computeOverlap(allUnitsCrossVol, tasksCrossVol);
t('不同 vol 同 unit name + 重疊頁 → 只有 task vol 的 cover', function() {
    assert.strictEqual(resultCrossVol['uid_vol3'], 3, '第三冊 should be covered');
    assert.strictEqual(resultCrossVol['uid_vol2'], undefined, '第二冊 should NOT be covered');
});

// 1~4冊 vs 1~4冊聽力 (v1.5.189 的情境) → 不該被當成同一份
var allUnits519 = {
    'uid_main': { name: '1~4冊', start: 1, end: 11, subj: '英文', vol: '第一冊' },
    'uid_listening': { name: '1~4冊聽力', start: 1, end: 11, subj: '英文', vol: '第一冊' }
};
var tasks519 = [
    { unitId: 'uid_main', startPage: 1, endPage: 11, isDone: true, vol: '第一冊' }
];
var result519 = computeOverlap(allUnits519, tasks519);
t('1~4冊 vs 1~4冊聽力 (v1.5.189 情境) → 任務自己 cover, 不污染聽力', function() {
    assert.strictEqual(result519['uid_main'], 11, '1~4冊 should be covered');
    assert.strictEqual(result519['uid_listening'], undefined, '1~4冊聽力 should NOT be covered (v1.5.189 例外)');
});

console.log('\n========================================');
console.log(`🎉 ${pass}/${pass+fail} PASS`);
if (fail > 0) process.exit(1);