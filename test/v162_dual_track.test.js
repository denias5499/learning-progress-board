// v1.6.162 unit test — dual-track wrongUnits logic (vol|name + name)
//   從 index.html 抽出核心 helper, 純函數測試
const assert = require('assert');

// ============================================================
// 複製 index.html 的核心邏輯 (純函數版, 不依賴 localStorage)
// ============================================================

// v1.6.162: 拆 vol|name 或回傳 name
function splitVolName(wu) {
    var i = wu && wu.indexOf('|');
    return (i > 0) ? { vol: wu.substring(0, i), name: wu.substring(i + 1) } : { vol: null, name: wu };
}

// v1.6.162: 判斷一筆 wrongUnit 是否應該 match
function wuMatches(wu, unitName, vol) {
    var s = splitVolName(wu);
    if (s.name !== unitName) return false;
    if (!vol) return true;
    if (s.vol === null) return true;
    return s.vol === vol;
}

// v1.6.162: getUnitAccuracyRate 的雙軌制版 (簡化 — 只看 wrongUnits, 不看 extraExams)
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

// v1.6.162: highlight 雙軌制比對
function isHighlighted(recordWrongUnits, highlightedUnitName) {
    if (!highlightedUnitName || !recordWrongUnits || !Array.isArray(recordWrongUnits)) return false;
    var hiParts = splitVolName(highlightedUnitName);
    return recordWrongUnits.some(function(wu) {
        var parts = splitVolName(wu);
        return parts.name === hiParts.name;
    });
}

// v1.6.162: setActiveFilter 雙軌制
function filterByUnit(recordWrongUnits, fUnit) {
    if (!recordWrongUnits || !Array.isArray(recordWrongUnits)) return false;
    return recordWrongUnits.some(function(wu) {
        var parts = splitVolName(wu);
        return parts.name === fUnit;
    });
}

// v1.6.162: collection — 收集 unique unit names (剝 prefix)
function collectUniqueNames(allRecords) {
    var set = new Set();
    allRecords.forEach(function(r) {
        (r.wrongUnits || []).forEach(function(u) {
            var parts = splitVolName(u);
            set.add(parts.name);
        });
    });
    return Array.from(set).sort();
}

let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); console.log(`✓ ${name}`); pass++; }
    catch (e) { console.log(`✗ ${name}\n   ${e.message}`); fail++; }
}

// ============================================================
// splitVolName tests
// ============================================================
console.log('\n=== splitVolName ===');
t('拆 vol|name', function() {
    assert.deepStrictEqual(splitVolName('第三冊|L1~2'), { vol: '第三冊', name: 'L1~2' });
});
t('無 prefix 回傳原樣', function() {
    assert.deepStrictEqual(splitVolName('L1~2'), { vol: null, name: 'L1~2' });
});
t('empty string', function() {
    assert.deepStrictEqual(splitVolName(''), { vol: null, name: '' });
});
t('null', function() {
    assert.deepStrictEqual(splitVolName(null), { vol: null, name: null });
});

// ============================================================
// wuMatches tests
// ============================================================
console.log('\n=== wuMatches (核心雙軌制 match) ===');
t('新格式 + vol 相符 → true', function() {
    assert.strictEqual(wuMatches('第三冊|L1~2', 'L1~2', '第三冊'), true);
});
t('新格式 + vol 不符 → false', function() {
    assert.strictEqual(wuMatches('第二冊|L1~2', 'L1~2', '第三冊'), false);
});
t('新格式 + vol 未知 → true (legacy-like)', function() {
    assert.strictEqual(wuMatches('第二冊|L1~2', 'L1~2', null), true);
});
t('舊格式 + vol 已知 → true (向下相容)', function() {
    assert.strictEqual(wuMatches('L1~2', 'L1~2', '第二冊'), true);
});
t('舊格式 + vol 已知 + vol 不符 → true (向下相容, 但會污染)', function() {
    // 這個 case 故意讓舊格式「跨 vol match」 — 是路線 2 接受的 trade-off
    assert.strictEqual(wuMatches('L1~2', 'L1~2', '第三冊'), true);
});
t('name 不同 → false', function() {
    assert.strictEqual(wuMatches('L1~2', 'L3~4', null), false);
});
t('vol 不符 + 新格式 → false (嚴格 match 跨 vol 阻擋)', function() {
    assert.strictEqual(wuMatches('第二冊|L1~2', 'L1~2', '第三冊'), false);
});

// ============================================================
// getRatesForRecord tests (整合)
// ============================================================
console.log('\n=== getRatesForRecord ===');

t('新格式 records: 同 vol match', function() {
    let r = { subject: '英文', typeName: '複習卷', instanceName: '麻辣甲',
              wrongUnits: ['第三冊|L1~2'], total: 40, correct: 36 };
    let rates = getRatesForRecord(r, { sub: '英文', typeName: '複習卷', instanceName: '麻辣甲', unitName: 'L1~2', vol: '第三冊' });
    assert.deepStrictEqual(rates, [0.9]);
});
t('新格式 records: 跨 vol 不 match', function() {
    let r = { subject: '英文', typeName: '複習卷', instanceName: '麻辣甲',
              wrongUnits: ['第二冊|L1~2'], total: 40, correct: 36 };
    let rates = getRatesForRecord(r, { sub: '英文', typeName: '複習卷', instanceName: '麻辣甲', unitName: 'L1~2', vol: '第三冊' });
    assert.deepStrictEqual(rates, []);
});
t('舊格式 records: vol 已知仍 match (向後相容)', function() {
    let r = { subject: '英文', typeName: '複習卷', instanceName: '麻辣甲',
              wrongUnits: ['L1~2'], total: 40, correct: 30 };
    let rates = getRatesForRecord(r, { sub: '英文', typeName: '複習卷', instanceName: '麻辣甲', unitName: 'L1~2', vol: '第二冊' });
    assert.deepStrictEqual(rates, [0.75]);
});
t('ctx filter: 跨 instance 阻擋', function() {
    let r = { subject: '英文', typeName: '複習卷', instanceName: '大滿貫甲',
              wrongUnits: ['第三冊|L1~2'], total: 40, correct: 36 };
    let rates = getRatesForRecord(r, { sub: '英文', typeName: '複習卷', instanceName: '麻辣甲', unitName: 'L1~2', vol: '第三冊' });
    assert.deepStrictEqual(rates, []);
});
t('空 wrongUnits → 不 match', function() {
    let r = { subject: '英文', typeName: '複習卷', instanceName: '麻辣甲',
              wrongUnits: [], total: 40, correct: 36 };
    let rates = getRatesForRecord(r, { sub: '英文', typeName: '複習卷', instanceName: '麻辣甲', unitName: 'L1~2', vol: '第三冊' });
    assert.deepStrictEqual(rates, []);
});
t('new 麻辣甲 L1~2 record 自動標註後 (第一冊|L1~2): 第三冊 query 不 match', function() {
    // 大滿貫甲 L1~2 自動標註後是 「第一冊|L1~2」 (因為 L1~2 在大滿貫甲 只有第一冊出現)
    // 等等 — 大滿貫甲 L1~2 在多冊 (第二~六冊)都有, 這個 record 會被「留空」不 auto-annotate
    // 改用「唯一 vol」scenario: 例如「第二冊|第5回」 (麻辣甲某冊獨有)
    let r = { subject: '數學', typeName: '複習卷', instanceName: '麻辣甲',
              wrongUnits: ['第二冊|第5回'], total: 30, correct: 27 };
    let rates1 = getRatesForRecord(r, { sub: '數學', typeName: '複習卷', instanceName: '麻辣甲', unitName: '第5回', vol: '第二冊' });
    assert.deepStrictEqual(rates1, [0.9]);
    let rates2 = getRatesForRecord(r, { sub: '數學', typeName: '複習卷', instanceName: '麻辣甲', unitName: '第5回', vol: '第三冊' });
    assert.deepStrictEqual(rates2, []);
});

// ============================================================
// isHighlighted tests
// ============================================================
console.log('\n=== isHighlighted ===');
t('highlighted 「vol|name」 match 新格式 records', function() {
    assert.strictEqual(isHighlighted(['第三冊|L1~2'], '第三冊|L1~2'), true);
});
t('highlighted 「name」 match 新格式 records (剝 prefix 比對)', function() {
    assert.strictEqual(isHighlighted(['第三冊|L1~2'], 'L1~2'), true);
});
t('highlighted 「vol|name」 match 舊格式 records (向後相容)', function() {
    assert.strictEqual(isHighlighted(['L1~2'], '第三冊|L1~2'), true);
});
t('name 不同 → false', function() {
    assert.strictEqual(isHighlighted(['L1~2'], 'L3~4'), false);
});

// ============================================================
// filterByUnit tests
// ============================================================
console.log('\n=== filterByUnit ===');
t('新格式 record 被 fUnit=name filter 抓到', function() {
    assert.strictEqual(filterByUnit(['第三冊|L1~2'], 'L1~2'), true);
});
t('舊格式 record 被 fUnit=name filter 抓到', function() {
    assert.strictEqual(filterByUnit(['L1~2'], 'L1~2'), true);
});
t('name 不同 → false', function() {
    assert.strictEqual(filterByUnit(['L1~2'], 'L3~4'), false);
});
t('空 wrongUnits → false', function() {
    assert.strictEqual(filterByUnit([], 'L1~2'), false);
});

// ============================================================
// collectUniqueNames tests
// ============================================================
console.log('\n=== collectUniqueNames ===');
t('混合格式去重', function() {
    let recs = [
        { wrongUnits: ['L1~2', '第三冊|L1~2'] },  // 同 name, 不同格式
        { wrongUnits: ['L1~2'] },
        { wrongUnits: ['第二冊|第5回'] },
        { wrongUnits: ['第5回'] },  // 也同 name
    ];
    let names = collectUniqueNames(recs);
    assert.deepStrictEqual(names, ['L1~2', '第5回']);
});
t('empty', function() {
    let names = collectUniqueNames([]);
    assert.deepStrictEqual(names, []);
});

console.log('\n========================================');
console.log(`🎉 ${pass}/${pass+fail} PASS`);
if (fail > 0) process.exit(1);