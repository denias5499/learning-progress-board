// v1.6.161 unit test - cross-vol wrongUnits fix
const assert = require('assert');

function getUnitVolsFromMaster(s, typeName, instanceName, unitName) {
    try {
        var subj = s && s.materials && s.materials[typeName];
        if (!subj) return [];
        var ins = (subj.instances || []).find(function(i) {
            return (i.alias || i.name) === instanceName || i.name === instanceName;
        });
        if (!ins || !ins.vols) return [];
        var vols = [];
        Object.keys(ins.vols).forEach(function(vol) {
            (ins.vols[vol] || []).forEach(function(u) {
                if (u.name === unitName) vols.push(vol);
            });
        });
        return vols;
    } catch (e) { return []; }
}

function getUnitVolFromPlan(appPlans, date, sub, unitName) {
    try {
        if (!Array.isArray(appPlans)) return null;
        var counts = {};
        appPlans.forEach(function(plan) {
            if (!plan.grid) return;
            var tasks = plan.grid[date] || [];
            tasks.forEach(function(t) {
                if (t && t.subject === sub && t.unitName === unitName && t.vol && t.vol !== 'custom') {
                    counts[t.vol] = (counts[t.vol] || 0) + 1;
                }
            });
        });
        var best = null, bestCount = 0;
        Object.keys(counts).forEach(function(v) {
            if (counts[v] > bestCount) { best = v; bestCount = counts[v]; }
        });
        return best;
    } catch (e) { return null; }
}

function getUnitVolFromPlanAnyDate(appPlans, sub, unitName) {
    try {
        if (!Array.isArray(appPlans)) return null;
        var counts = {};
        appPlans.forEach(function(plan) {
            if (!plan.grid) return;
            Object.keys(plan.grid).forEach(function(d) {
                (plan.grid[d] || []).forEach(function(t) {
                    if (t && t.subject === sub && t.unitName === unitName && t.vol && t.vol !== 'custom') {
                        counts[t.vol] = (counts[t.vol] || 0) + 1;
                    }
                });
            });
        });
        var best = null, bestCount = 0;
        Object.keys(counts).forEach(function(v) {
            if (counts[v] > bestCount) { best = v; bestCount = counts[v]; }
        });
        return best;
    } catch (e) { return null; }
}

function buildVolMapForRecord(s, appPlans, r) {
    var map = {};
    if (!r || !r.wrongUnits) return map;
    r.wrongUnits.forEach(function(wu) {
        if (!wu) return;
        var vols = getUnitVolsFromMaster(s, r.typeName, r.instanceName, wu);
        if (vols.length === 1) { map[wu] = vols[0]; return; }
        if (vols.length > 1) {
            var planVol = r.date ? getUnitVolFromPlan(appPlans, r.date, r.subject, wu) : null;
            if (planVol) { map[wu] = planVol; return; }
            var anyVol = getUnitVolFromPlanAnyDate(appPlans, r.subject, wu);
            if (anyVol) { map[wu] = anyVol; return; }
            return;
        }
        var planVol2 = r.date ? getUnitVolFromPlan(appPlans, r.date, r.subject, wu) : null;
        if (planVol2) { map[wu] = planVol2; return; }
        var anyVol2 = getUnitVolFromPlanAnyDate(appPlans, r.subject, wu);
        if (anyVol2) { map[wu] = anyVol2; return; }
    });
    return map;
}

function formatWrongUnitKey(key) {
    if (!key) return '';
    var idx = key.indexOf('|');
    if (idx < 0) return key;
    var vol = key.substring(0, idx);
    var name = key.substring(idx + 1);
    return vol ? (vol + ' - ' + name) : name;
}

function keyToName(key) {
    if (!key) return '';
    var idx = key.indexOf('|');
    return idx < 0 ? key : key.substring(idx + 1);
}

function keyToVol(key) {
    if (!key) return null;
    var idx = key.indexOf('|');
    return idx < 0 ? null : key.substring(0, idx);
}

const fakeMaster = {
    '英文': {
        materials: {
            '複習卷': {
                instances: [
                    {
                        name: '麻辣甲', alias: '麻',
                        type: 'volume',
                        vols: {
                            '第一冊': [{ name: 'L1~L3' }, { name: 'L4~L6' }],
                            '第二冊': [{ name: 'L1~L2' }, { name: 'L3~L4' }],
                            '第三冊': [{ name: 'L1~L2' }, { name: 'L3~L4' }],
                            '第四冊': [{ name: 'L1~L2' }, { name: 'L3~L4' }],
                            '第五冊': [{ name: 'L1~L2' }],
                            '第六冊': [{ name: 'L1~L2' }]
                        }
                    }
                ]
            },
            '複習講義': {
                instances: [
                    {
                        name: '麻辣', type: 'volume',
                        vols: {
                            '第一冊': [{ name: 'U1' }, { name: 'U2' }],
                            '第二冊': [{ name: 'U3' }, { name: 'U4' }],
                            '第三冊': [{ name: 'U6' }]
                        }
                    }
                ]
            }
        }
    },
    '數學': {
        materials: {
            '複習卷': {
                instances: [
                    {
                        name: '麻辣甲', alias: '麻', type: 'volume',
                        vols: {
                            '第一冊': [{ name: '整數的運算' }, { name: '第1回' }, { name: '第2回' }],
                            '第二冊': [{ name: '二元一次聯立方程式' }, { name: '第3回' }, { name: '第4回' }],
                            '第三冊': [{ name: '第5回' }, { name: '第6回' }]
                        }
                    }
                ]
            }
        }
    }
};

const fakePlans = [
    {
        id: 'p1',
        grid: {
            '2026-07-08': [{ subject: '英文', unitName: 'L1~L3', vol: '第一冊' }],
            '2026-07-22': [{ subject: '英文', unitName: 'L1~L2', vol: '第二冊' }],
            '2026-07-29': [{ subject: '英文', unitName: 'L3~L4', vol: '第二冊' }],
            '2026-07-15': [{ subject: '英文', unitName: 'L4~L6', vol: '第一冊' }],
            '2026-07-16': [{ subject: '英文', unitName: 'U3', vol: '第二冊' }],
            '2026-07-07': [{ subject: '數學', unitName: '整數的運算', vol: '第一冊' }],
            '2026-07-14': [{ subject: '數學', unitName: '分數的運算', vol: '第一冊' }]
        }
    }
];

let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); console.log('  ✅', name); pass++; }
    catch(e) { console.log('  ❌', name, '-', e.message); fail++; }
}

console.log('=== formatWrongUnitKey ===');
t('with vol', function() {
    assert.strictEqual(formatWrongUnitKey('第一冊|L1~L2'), '第一冊 - L1~L2');
});
t('empty vol (custom)', function() {
    assert.strictEqual(formatWrongUnitKey('|L1~L2'), 'L1~L2');
});
t('legacy pure name', function() {
    assert.strictEqual(formatWrongUnitKey('L1~L2'), 'L1~L2');
});
t('empty string', function() {
    assert.strictEqual(formatWrongUnitKey(''), '');
});
t('null', function() {
    assert.strictEqual(formatWrongUnitKey(null), '');
});

console.log('\n=== keyToName / keyToVol ===');
t('with vol', function() {
    assert.strictEqual(keyToName('第一冊|L1~L2'), 'L1~L2');
    assert.strictEqual(keyToVol('第一冊|L1~L2'), '第一冊');
});
t('empty vol', function() {
    assert.strictEqual(keyToName('|L1~L2'), 'L1~L2');
    assert.strictEqual(keyToVol('|L1~L2'), '');
});
t('legacy pure', function() {
    assert.strictEqual(keyToName('L1~L2'), 'L1~L2');
    assert.strictEqual(keyToVol('L1~L2'), null);
});

console.log('\n=== getUnitVolsFromMaster ===');
t('L4~L6 only 第一冊', function() {
    assert.deepStrictEqual(getUnitVolsFromMaster(fakeMaster['英文'], '複習卷', '麻辣甲', 'L4~L6'), ['第一冊']);
});
t('L1~L2 in 5 vols', function() {
    assert.deepStrictEqual(getUnitVolsFromMaster(fakeMaster['英文'], '複習卷', '麻辣甲', 'L1~L2'), ['第二冊', '第三冊', '第四冊', '第五冊', '第六冊']);
});
t('instance by alias', function() {
    assert.deepStrictEqual(getUnitVolsFromMaster(fakeMaster['英文'], '複習卷', '麻', 'L4~L6'), ['第一冊']);
});
t('non-existent instance', function() {
    assert.deepStrictEqual(getUnitVolsFromMaster(fakeMaster['英文'], '複習卷', '不存在', 'L4~L6'), []);
});

console.log('\n=== buildVolMapForRecord ===');
t('L4~L6 unique vol', function() {
    let r = { subject: '英文', typeName: '複習卷', instanceName: '麻辣甲', date: '2026-07-15', wrongUnits: ['L4~L6'] };
    let map = buildVolMapForRecord(fakeMaster['英文'], fakePlans, r);
    assert.strictEqual(map['L4~L6'], '第一冊');
});
t('L1~L2 cross-vol + plan date', function() {
    let r = { subject: '英文', typeName: '複習卷', instanceName: '麻辣甲', date: '2026-07-22', wrongUnits: ['L1~L2'] };
    let map = buildVolMapForRecord(fakeMaster['英文'], fakePlans, r);
    assert.strictEqual(map['L1~L2'], '第二冊');
});
t('L1~L2 cross-vol + no plan date → anyDate fallback', function() {
    let r = { subject: '英文', typeName: '複習卷', instanceName: '麻辣甲', date: '2026-08-01', wrongUnits: ['L1~L2'] };
    let map = buildVolMapForRecord(fakeMaster['英文'], fakePlans, r);
    assert.strictEqual(map['L1~L2'], '第二冊');
});
t('U3 single vol', function() {
    let r = { subject: '英文', typeName: '複習講義', instanceName: '麻辣', date: '2026-07-16', wrongUnits: ['U3'] };
    let map = buildVolMapForRecord(fakeMaster['英文'], fakePlans, r);
    assert.strictEqual(map['U3'], '第二冊');
});
t('數學第1回 cross-vol', function() {
    let r = { subject: '數學', typeName: '複習卷', instanceName: '麻辣甲', date: '2026-07-07', wrongUnits: ['第1回'] };
    let map = buildVolMapForRecord(fakeMaster['數學'], fakePlans, r);
    assert.strictEqual(map['第1回'], '第一冊');
});
t('no date still works (master unique vol)', function() {
    let r = { subject: '英文', typeName: '複習卷', instanceName: '麻辣甲', wrongUnits: ['L4~L6'] };
    let map = buildVolMapForRecord(fakeMaster['英文'], fakePlans, r);
    assert.strictEqual(map['L4~L6'], '第一冊');
});
t('null record', function() {
    assert.deepStrictEqual(buildVolMapForRecord(fakeMaster['英文'], fakePlans, null), {});
});
t('empty wrongUnits', function() {
    assert.deepStrictEqual(buildVolMapForRecord(fakeMaster['英文'], fakePlans, { wrongUnits: [] }), {});
});
t('unknown unit', function() {
    let r = { subject: '英文', typeName: '複習卷', instanceName: '麻辣甲', date: '2026-07-22', wrongUnits: ['Unknown'] };
    let map = buildVolMapForRecord(fakeMaster['英文'], fakePlans, r);
    assert.strictEqual(map['Unknown'], undefined);
});
t('multiple wrongUnits', function() {
    let r = { subject: '英文', typeName: '複習卷', instanceName: '麻辣甲', date: '2026-07-15', wrongUnits: ['L1~L3', 'L4~L6'] };
    let map = buildVolMapForRecord(fakeMaster['英文'], fakePlans, r);
    assert.strictEqual(map['L1~L3'], '第一冊');
    assert.strictEqual(map['L4~L6'], '第一冊');
});

console.log('\n=== Strict vol+name match (anti-pollution) ===');
function unitMatchInRecord(r, wu, queryVol, queryName) {
    var wuName = keyToName(wu);
    if (!queryVol) return wuName === queryName;
    var recordVol = (r._volMap && r._volMap[wuName]) || null;
    if (recordVol) {
        if (recordVol !== queryVol) return false;
        return wuName === queryName;
    }
    return false;
}

t('不同 vol 不 match', function() {
    let r = { _volMap: { 'L1~L2': '第二冊' }, wrongUnits: ['第二冊|L1~L2'] };
    assert.strictEqual(unitMatchInRecord(r, '第二冊|L1~L2', '第三冊', 'L1~L2'), false);
});
t('相同 vol 才 match', function() {
    let r = { _volMap: { 'L1~L2': '第二冊' }, wrongUnits: ['第二冊|L1~L2'] };
    assert.strictEqual(unitMatchInRecord(r, '第二冊|L1~L2', '第二冊', 'L1~L2'), true);
});
t('無 volMap 不 match (防污染)', function() {
    let r = { _volMap: {}, wrongUnits: ['L1~L2'] };
    assert.strictEqual(unitMatchInRecord(r, 'L1~L2', '第二冊', 'L1~L2'), false);
});

console.log('\n========================================');
console.log(`🎉 ${pass}/${pass+fail} PASS`);
if (fail > 0) process.exit(1);
