// test/progress.test.js -- v1.5.172 進度條算法回歸測試
// 對應 commit f00b59f: v1.5.172: 跨 sub 跨單元任務不算 (修地理 100% bug)

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex, makeMultiData, makePlans } = require('./helpers');

/**
 * 共用 setup：載入 index.html、注入 fixture、跑函式、回傳結果
 */
function runFn(tasks, filterCat = '會考複習', filterMis = 'ALL') {
    const win = loadIndex();
    win.multiData = makeMultiData();
    win.currentUserId = 'user_test';
    win.appPlans = makePlans(tasks);
    return win.getUnitDonePagesByUnitIdMatch(filterCat, filterMis);
}

// ─────────────────────────────────────────────────────────────
// v1.5.172 commit message 描述的 4 個 scenario
// ─────────────────────────────────────────────────────────────

test('v1.5.172 s1: 跨 sub 任務 P.50-60 (數學) 不算到地理 u_地1', () => {
    const result = runFn([
        { unitId: 'u_直', subject: '數學', startPage: 50, endPage: 60 },
    ]);
    assert.ok(!('u_地1' in result) || result['u_地1'] === 0,
        `expected u_地1 NOT in result (跨 sub 不算), got ${result['u_地1']}`);
    // 同 sub 自己的 unit 應該算到
    assert.ok(result['u_直'] >= 1, `expected u_直>0, got ${result['u_直']}`);
});

test('v1.5.172 s2: 跨 sub 任務 P.100-120 (數學) 不算到地理 u_地1', () => {
    const result = runFn([
        { unitId: 'u_比例', subject: '數學', startPage: 100, endPage: 120 },
    ]);
    assert.ok(!('u_地1' in result) || result['u_地1'] === 0,
        `expected u_地1 NOT in result (跨 sub 不算), got ${result['u_地1']}`);
});

test('v1.5.172 s3: 同 sub 跨單元 P.73-76 (數學) 對 u_比例=4', () => {
    const result = runFn([
        { unitId: 'u_比例', subject: '數學', startPage: 73, endPage: 76 },
    ]);
    // P.73-76 在 u_比例 (P.73-100) → 4 pages
    // 跟 u_直 (P.50-72) 沒 overlap → u_直 不在 result
    assert.ok(!('u_直' in result) || result['u_直'] === 0,
        `expected u_直 NOT in result (no overlap), got ${result['u_直']}`);
    assert.strictEqual(result['u_比例'], 4,
        `expected u_比例=4 (P.73-76 全在 u_比例範圍內), got ${result['u_比例']}`);
});

test('v1.5.172 s4: 簡單對應 地理 task P.6-25 → u_地1=16 (P.6-21 overlap)', () => {
    const result = runFn([
        { unitId: 'u_地1', subject: '地理', startPage: 6, endPage: 25 },
    ]);
    // u_地1 是 P.6-21, task P.6-25, overlap = P.6-21 = 16 pages
    assert.strictEqual(result['u_地1'], 16,
        `expected u_地1=16 (overlap of P.6-21 and P.6-25), got ${result['u_地1']}`);
});

// ─────────────────────────────────────────────────────────────
// v1.5.172 核心：地理 100% bug 防復發測試
// ─────────────────────────────────────────────────────────────

test('v1.5.172 防復發: 多個跨 sub 任務不會把地理推到 100%', () => {
    // 模擬 v1.5.172 commit 提到的 backup 情境:
    // 數學 P.6-13, P.12-18, P.14-25, P.19-25, 英文 P.24-28
    // 跨 sub 任務 (sub != 地理)，對地理不該算
    const result = runFn([
        { unitId: 'u_直', subject: '數學', startPage: 6, endPage: 13 },
        { unitId: 'u_直', subject: '數學', startPage: 12, endPage: 18 },
        { unitId: 'u_比例', subject: '數學', startPage: 14, endPage: 25 },
        { unitId: 'u_比例', subject: '數學', startPage: 19, endPage: 25 },
        { unitId: 'u_U2', subject: '英文', startPage: 24, endPage: 28 },
    ], '會考複習', 'ALL');

    // 所有 12 個地理 unit 都不該在 result (跨 sub 不算 → 無 pageSet)
    for (let i = 1; i <= 12; i++) {
        const uid = `u_地${i}`;
        assert.ok(!result[uid] || result[uid] === 0,
            `expected ${uid} NOT in result (跨 sub 任務不該算地理), got ${result[uid]}`);
    }
});

test('v1.5.172 防復發: 同 sub 任務仍然正常算 overlap', () => {
    // 地理任務 P.30-45 → 應該算到地理 u_地2 (P.22-37, overlap P.30-37 = 8 pages) 跟 u_地3 (P.38-53, overlap P.38-45 = 8 pages)
    const result = runFn([
        { unitId: 'u_地2', subject: '地理', startPage: 30, endPage: 45 },
    ], '會考複習', 'ALL');
    assert.strictEqual(result['u_地2'], 8,
        `expected u_地2=8 (overlap P.30-37), got ${result['u_地2']}`);
    assert.strictEqual(result['u_地3'], 8,
        `expected u_地3=8 (overlap P.38-45), got ${result['u_地3']}`);
});


// ─────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────

test('edge: task.isDone = false 不算', () => {
    const result = runFn([
        { unitId: 'u_地1', subject: '地理', startPage: 6, endPage: 25, isDone: false },
    ]);
    // isDone false → 過濾掉, u_地1 不在 result
    assert.ok(!('u_地1' in result) || result['u_地1'] === 0,
        `expected u_地1 NOT in result, got ${result['u_地1']}`);
});

test('edge: 沒 unitId 的任務完全忽略', () => {
    // task 沒 unitId → missionUnitMap[t.unitId] 是 undefined → taskSub = null
    // line 4647: u.sub !== taskSub → 所有 u.sub (string) 都 != null → return
    // 結果: 沒有任何 unit 收到 pages
    const result = runFn([
        { unitId: null, subject: '數學', startPage: 1, endPage: 100 },
    ]);
    assert.strictEqual(Object.keys(result).length, 0,
        `expected empty result (沒 unitId 完全忽略), got ${JSON.stringify(result)}`);
});

test('edge: filterCat 過濾掉不對 cat 的任務', () => {
    // task.cat='會考複習', 但 filterCat='數學' → return (line 4628)
    const result = runFn([
        { unitId: 'u_地1', subject: '地理', startPage: 6, endPage: 25 },
    ], '數學', 'ALL');
    assert.strictEqual(Object.keys(result).length, 0,
        `expected empty (filter 過濾掉), got ${JSON.stringify(result)}`);
});

test('edge: filterMis 過濾掉不對 mis 的任務', () => {
    const result = runFn([
        { unitId: 'u_地1', subject: '地理', startPage: 6, endPage: 25 },
    ], '會考複習', '📦 暑假複習進度');
    // task.mis='plan1' != '📦 暑假複習進度' → return
    assert.strictEqual(Object.keys(result).length, 0,
        `expected empty (mis 過濾掉), got ${JSON.stringify(result)}`);
});

test('edge: 多日期 plan.grid 同 unit 任務合計 pages', () => {
    // 跨多日期的 plan, 同 unitId 不同 pages
    const win = loadIndex();
    win.multiData = makeMultiData();
    win.currentUserId = 'user_test';
    win.appPlans = [{
        id: 'plan1',
        name: 'test',
        grid: {
            '2026-08-15': [{ id: 't1', isDone: true, cat: '會考複習', mis: 'plan1', unitId: 'u_地1', startPage: 6, endPage: 10, subject: '地理' }],
            '2026-08-16': [{ id: 't2', isDone: true, cat: '會考複習', mis: 'plan1', unitId: 'u_地1', startPage: 11, endPage: 21, subject: '地理' }],
        }
    }];
    const result = win.getUnitDonePagesByUnitIdMatch('會考複習', 'ALL');
    // u_地1 (P.6-21) → 應該 16 pages (P.6-21)
    assert.strictEqual(result['u_地1'], 16,
        `expected u_地1=16 (P.6-21), got ${result['u_地1']}`);
});

test('edge: appPlans = [] 回傳空 result', () => {
    const win = loadIndex();
    win.multiData = makeMultiData();
    win.currentUserId = 'user_test';
    win.appPlans = [];
    const result = win.getUnitDonePagesByUnitIdMatch('會考複習', 'ALL');
    assert.strictEqual(Object.keys(result).length, 0);
});

test('edge: 任務 P.100-130 跟 u_地1 (P.6-21) 完全沒 overlap → 不算', () => {
    // 跟 s4 不同: 任務 P.100-130 沒 overlap u_地1 (P.6-21), 不該算到 u_地1
    const result = runFn([
        { unitId: 'u_地1', subject: '地理', startPage: 100, endPage: 130 },
    ]);
    assert.ok(!('u_地1' in result),
        `expected u_地1 NOT in result (no overlap), got ${result['u_地1']}`);
});
