// v1.6.162 integration test — simulate Denias 真實場景
//   英文/大滿貫甲/L1~2 (2026-09-15, 36/40) — 應正確歸 第三冊
const assert = require('assert');

// 重用 v162_dual_track 的 helper
function splitVolName(wu) {
    var i = wu && wu.indexOf('|');
    return (i > 0) ? { vol: wu.substring(0, i), name: wu.substring(i + 1) } : { vol: null, name: wu };
}
function wuMatches(wu, unitName, vol) {
    var s = splitVolName(wu);
    if (s.name !== unitName) return false;
    if (!vol) return true;
    if (s.vol === null) return true;
    return s.vol === vol;
}
function getRatesForRecord(r, ctx) {
    var rates = [];
    if (!r.wrongUnits || !Array.isArray(r.wrongUnits)) return rates;
    if (ctx.sub && r.subject !== ctx.sub) return rates;
    if (ctx.typeName && r.typeName !== ctx.typeName) return rates;
    if (ctx.instanceName && r.instanceName !== ctx.instanceName) return rates;
    var matched = r.wrongUnits.some(function(wu) { return wuMatches(wu, ctx.unitName, ctx.vol); });
    if (matched && r.total > 0) rates.push(r.correct / r.total);
    return rates;
}

let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); console.log(`✓ ${name}`); pass++; }
    catch (e) { console.log(`✗ ${name}\n   ${e.message}`); fail++; }
}

console.log('\n=== Denias 真實場景: 英文/大滿貫甲/L1~2 (2026-09-15, 36/40) ===');

// 場景 1: v1.6.161 migration 後 (錯誤標 第二冊)
t('v1.6.161 結果 (錯誤): 大滿貫甲/L1~2 (第三冊) 應 NOT match 第二冊 query', function() {
    var r = { subject: '英文', typeName: '複習卷', instanceName: '大滿貫甲',
              wrongUnits: ['第二冊|L1~2'],  // v1.6.161 bug 標成第二冊
              total: 40, correct: 36, date: '2026-09-15' };
    var rates = getRatesForRecord(r, { sub: '英文', typeName: '複習卷', instanceName: '大滿貫甲', unitName: 'L1~2', vol: '第三冊' });
    assert.deepStrictEqual(rates, [], 'v1.6.161 bug 應該不會發生 — 第二冊|L1~2 應不 match 第三冊 query');
});

// 場景 2: v1.6.162 migration 後 (正確標 第三冊)
t('v1.6.162 結果 (正確): 大滿貫甲/L1~2 (第三冊) 應 match 第三冊 query', function() {
    var r = { subject: '英文', typeName: '複習卷', instanceName: '大滿貫甲',
              wrongUnits: ['第三冊|L1~2'],  // v1.6.162 修正
              total: 40, correct: 36, date: '2026-09-15' };
    var rates = getRatesForRecord(r, { sub: '英文', typeName: '複習卷', instanceName: '大滿貫甲', unitName: 'L1~2', vol: '第三冊' });
    assert.deepStrictEqual(rates, [0.9]);
});

// 場景 3: 樹狀圖點「大滿貫甲/第三冊/L1~2」→ query 答對率
t('樹狀圖點擊: 大滿貫甲/第三冊/L1~2 → 顯示 90%', function() {
    var records = [
        { subject: '英文', typeName: '複習卷', instanceName: '大滿貫甲',
          wrongUnits: ['第三冊|L1~2'], total: 40, correct: 36, date: '2026-09-15' },
        { subject: '英文', typeName: '複習卷', instanceName: '大滿貫甲',
          wrongUnits: ['第二冊|L1~2'], total: 50, correct: 40, date: '2026-09-10' }
    ];
    // query 第三冊/L1~2 — 應只 match 第一筆
    var rates = [];
    records.forEach(function(r) {
        rates = rates.concat(getRatesForRecord(r, { sub: '英文', typeName: '複習卷', instanceName: '大滿貫甲', unitName: 'L1~2', vol: '第三冊' }));
    });
    assert.deepStrictEqual(rates, [0.9]);  // 只有 36/40 match
});

// 場景 4: 多 records 跨多 vol — 查每一 vol 都有對應答對率
t('多 records 跨多 vol: 每 vol query 都能正確 match', function() {
    var records = [
        { subject: '英文', typeName: '複習卷', instanceName: '大滿貫甲',
          wrongUnits: ['第二冊|L1~2'], total: 50, correct: 40, date: '2026-08-01' },
        { subject: '英文', typeName: '複習卷', instanceName: '大滿貫甲',
          wrongUnits: ['第三冊|L1~2'], total: 40, correct: 36, date: '2026-09-15' },
        { subject: '英文', typeName: '複習卷', instanceName: '大滿貫甲',
          wrongUnits: ['第四冊|L1~2'], total: 30, correct: 24, date: '2026-10-01' }
    ];
    assert.strictEqual(getRatesForRecord(records[0], { sub: '英文', typeName: '複習卷', instanceName: '大滿貫甲', unitName: 'L1~2', vol: '第二冊' }).length, 1);
    assert.strictEqual(getRatesForRecord(records[1], { sub: '英文', typeName: '複習卷', instanceName: '大滿貫甲', unitName: 'L1~2', vol: '第三冊' }).length, 1);
    assert.strictEqual(getRatesForRecord(records[2], { sub: '英文', typeName: '複習卷', instanceName: '大滿貫甲', unitName: 'L1~2', vol: '第四冊' }).length, 1);
});

// 場景 5: 向下相容 — 舊 records 不會消失
t('舊 records 仍可查詢 (向後相容)', function() {
    var r = { subject: '數學', typeName: '複習卷', instanceName: '麻辣甲',
              wrongUnits: ['第1回'], total: 30, correct: 27, date: '2026-09-01' };
    var rates = getRatesForRecord(r, { sub: '數學', typeName: '複習卷', instanceName: '麻辣甲', unitName: '第1回', vol: '第一冊' });
    assert.deepStrictEqual(rates, [0.9]);  // 舊格式 + vol 已知 → 仍 match
});

// 場景 6: 唯一 vol records 自動標註後, 跨 vol query 不會污染
t('unique vol records 自動標註後: 跨 vol query 不污染', function() {
    var r = { subject: '數學', typeName: '複習卷', instanceName: '麻辣甲',
              wrongUnits: ['第二冊|第5回'], total: 30, correct: 27, date: '2026-09-01' };
    // query 第三冊/第5回 — 不應 match (第5回 在 第二冊 唯一)
    var rates = getRatesForRecord(r, { sub: '數學', typeName: '複習卷', instanceName: '麻辣甲', unitName: '第5回', vol: '第三冊' });
    assert.deepStrictEqual(rates, []);
});

console.log('\n========================================');
console.log(`🎉 ${pass}/${pass+fail} PASS`);
if (fail > 0) process.exit(1);