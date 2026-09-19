// v1.6.167 unit test — migration 必須能跨 cat 找到 instance
const assert = require('assert');

console.log('\n=== v1.6.167 cross-cat migration 測試 ===');

// 模擬 user.masters
var userMasters = {
    '會考複習': {
        '英文': {
            materials: {
                '複習卷': {
                    instances: [
                        {
                            id: 'ins_id_caalk5jyl',
                            type: 'volume',
                            vols: {
                                '第一冊': [
                                    { id: 'u1', name: 'L1~L3' },
                                    { id: 'u2', name: 'L4~L6' },
                                    { id: 'u2b', name: 'L1~L2' }
                                ],
                                '第二冊': [
                                    { id: 'u3', name: 'L1~L2' },
                                    { id: 'u4', name: 'L3~L4' }
                                ]
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
                            id: 'ins_id_math1',
                            type: 'volume',
                            vols: {
                                '第一冊': [
                                    { id: 'm1', name: '單元1' },
                                    { id: 'm2', name: '單元2' }
                                ],
                                '第二冊': [
                                    { id: 'm3', name: '單元1' },
                                    { id: 'm4', name: '單元2' }
                                ]
                            }
                        }
                    ]
                }
            }
        }
    },
    '段考複習': {
        '數學': {
            materials: {
                '自修': {
                    instances: [{ id: 'ins_id_seg1', type: 'flat', units: [{ id: 's1', name: '段考範圍' }] }]
                }
            }
        }
    }
};

// 模擬 user 當下停在 段考複習 cat
var appMaster = userMasters['段考複習'];

// V167 修復邏輯: 跨 cat 搜尋 instance
function v167FindIns(subName, typeName, instanceId) {
    var cats = Object.keys(userMasters);
    for (var ci = 0; ci < cats.length; ci++) {
        var catM = userMasters[cats[ci]];
        if (!catM || !catM[subName] || !catM[subName].materials) continue;
        var typeObj = catM[subName].materials[typeName];
        if (!typeObj || !Array.isArray(typeObj.instances)) continue;
        var found = typeObj.instances.find(function(i) { return i.id === instanceId; });
        if (found) return found;
    }
    return null;
}

let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); console.log(`✓ ${name}`); pass++; }
    catch (e) { console.log(`✗ ${name}\n   ${e.message}`); fail++; }
}

// 場景 1: user 在 段考複習, 但有 會考複習 英文 麻辣甲 record
t('跨 cat: 段考複習 cat 找到 會考複習 英文/複習卷/麻辣甲 instance', function() {
    var ins = v167FindIns('英文', '複習卷', 'ins_id_caalk5jyl');
    assert(ins, '應該找到 instance');
    assert.strictEqual(ins.id, 'ins_id_caalk5jyl');
    assert(ins.vols['第一冊']);
});

// 場景 2: 模擬完整 migration 在 段考 cat 對 會考 records
var records = [
    {
        subject: '英文', typeName: '複習卷', instanceName: '麻辣甲', instanceId: 'ins_id_caalk5jyl',
        wrongUnits: ['L1~L3', 'L1~L2', 'L1~L2', 'L1~L2']  // 模擬 v164 restore
    },
    {
        subject: '數學', typeName: '複習卷', instanceName: '麻辣甲', instanceId: 'ins_id_math1',
        wrongUnits: ['單元1', '單元2', '單元1', '單元2']
    }
];

var _v164Stats = { migrated: 0, skipped: 0, skippedReasons: {} };
records.forEach(function(r) {
    if (!r.wrongUnits || !Array.isArray(r.wrongUnits)) return;
    var hasNewFormat = r.wrongUnits.some(function(wu) { return wu && wu.indexOf('|') > 0; });
    if (hasNewFormat) { _v164Stats.skipped++; return; }
    var _instanceId = r.instanceId;
    if (!_instanceId) { _v164Stats.skipped++; return; }
    var _ins = v167FindIns(r.subject, r.typeName, _instanceId);
    if (!_ins || _ins.type !== 'volume' || !_ins.vols) { _v164Stats.skipped++; _v164Stats.skippedReasons['no-vol-instance'] = (_v164Stats.skippedReasons['no-vol-instance'] || 0) + 1; return; }
    var _newWrongUnits = [];
    r.wrongUnits.forEach(function(wu) {
        if (!wu || wu.indexOf('|') > 0) { _newWrongUnits.push(wu); return; }
        var _matches = [];
        Object.keys(_ins.vols).forEach(function(vol) {
            (_ins.vols[vol] || []).forEach(function(u) {
                if (u.name === wu) _matches.push(vol);
            });
        });
        if (_matches.length === 1) {
            _newWrongUnits.push(_matches[0] + '|' + wu);
            _v164Stats.migrated++;
        } else {
            _newWrongUnits.push(wu);
        }
    });
    r.wrongUnits = _newWrongUnits;
});

t('跨 cat migration: 英文 麻辣甲 L1~L3 → 第一冊|L1~L3', function() {
    assert.strictEqual(records[0].wrongUnits[0], '第一冊|L1~L3');
});
t('跨 cat migration: 英文 麻辣甲 L1~L2 (multi-vol) → 保留舊格式', function() {
    // L1~L2 在 第二冊 出現, multi-vol → 保留 L1~L2
    assert.strictEqual(records[0].wrongUnits[1], 'L1~L2');
});
t('跨 cat migration: 數學 麻辣甲 單元1 (multi-vol) → 保留舊格式', function() {
    // 數學 麻辣甲 單元1 在 第一冊 + 第二冊 都有 → multi-vol
    assert.strictEqual(records[1].wrongUnits[0], '單元1');
});
t('統計: 至少一個 migrated (L1~L3)', function() {
    assert(_v164Stats.migrated >= 1, '應該有 migrated');
});

console.log('\n========================================');
console.log(`🎉 ${pass}/${pass+fail} PASS`);
if (fail > 0) process.exit(1);