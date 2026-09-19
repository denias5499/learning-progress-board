// v1.6.162 unit test — migration logic (auto-annotate 75 records)
const assert = require('assert');

// ============================================================
// 複製 console_migrate_v162.js 的核心邏輯 (純函數版)
// ============================================================

// 假 master (跟實際結構對應)
const fakeMaster = {
    '數學': {
        materials: {
            '複習卷': {
                instances: [
                    {
                        id: 'ins_math_mala_甲',
                        alias: '麻辣甲',
                        type: 'volume',
                        vols: {
                            '第一冊': [{ id: 'm1', name: '第1回' }, { id: 'm2', name: '第2回' }],
                            '第二冊': [{ id: 'm3', name: '第3回' }, { id: 'm4', name: '第5回' }],  // 跳第4回
                            '第三冊': [{ id: 'm5', name: '第6回' }, { id: 'm6', name: '第7回' }]
                        }
                    }
                ]
            }
        }
    },
    '英文': {
        materials: {
            '複習卷': {
                instances: [
                    {
                        id: 'ins_eng_mala_甲',
                        alias: '麻辣甲',
                        type: 'volume',
                        vols: {
                            '第一冊': [{ id: 'e1', name: 'L1~3' }, { id: 'e2', name: 'L4~6' }],
                            '第二冊': [{ id: 'e3', name: 'L1~2' }, { id: 'e4', name: 'L3~4' }],  // L1~2 也出現在第二冊
                            '第三冊': [{ id: 'e5', name: 'L1~2' }, { id: 'e6', name: 'L5~6' }],
                            '第四冊': [{ id: 'e7', name: 'L1~2' }, { id: 'e8', name: 'L7~8' }],
                            '第五冊': [{ id: 'e9', name: 'L1~2' }, { id: 'e10', name: 'L9~10' }],
                            '第六冊': [{ id: 'e11', name: 'L1~2' }, { id: 'e12', name: 'L11~12' }]
                        }
                    },
                    {
                        id: 'ins_eng_dmg_甲',
                        alias: '大滿貫甲',
                        type: 'volume',
                        vols: {
                            '第二冊': [{ id: 'd1', name: 'L1~2' }],
                            '第三冊': [{ id: 'd2', name: 'L1~2' }],
                            '第四冊': [{ id: 'd3', name: 'L1~2' }],
                            '第五冊': [{ id: 'd4', name: 'L1~2' }],
                            '第六冊': [{ id: 'd5', name: 'L1~2' }]
                        }
                    }
                ]
            }
        }
    }
};

// helper: 找 unit 在 master 中出現的所有 (instance, vol) 位置
function findUnitVols(master, unitName) {
    var out = [];
    Object.keys(master).forEach(function(sub) {
        var subj = master[sub];
        if (!subj || !subj.materials) return;
        Object.keys(subj.materials).forEach(function(typeName) {
            var typeObj = subj.materials[typeName];
            if (!typeObj || !typeObj.instances) return;
            typeObj.instances.forEach(function(ins) {
                if (ins.type === 'volume' && ins.vols) {
                    Object.keys(ins.vols).forEach(function(vol) {
                        (ins.vols[vol] || []).forEach(function(u) {
                            if (u.name === unitName) {
                                out.push({ sub: sub, typeName: typeName, instanceId: ins.id, instanceName: ins.alias || ins.name, vol: vol });
                            }
                        });
                    });
                } else if (ins.type === 'custom' && ins.units) {
                    ins.units.forEach(function(u) {
                        if (u.name === unitName) {
                            out.push({ sub: sub, typeName: typeName, instanceId: ins.id, instanceName: ins.alias || ins.name, vol: null });
                        }
                    });
                }
            });
        });
    });
    return out;
}

// 模擬 migration 邏輯 (對單筆 record)
function migrateRecord(r, master) {
    if (!r.wrongUnits || !Array.isArray(r.wrongUnits)) return r;
    var hasNewFormat = r.wrongUnits.some(function(wu) { return wu.indexOf('|') > 0; });
    if (hasNewFormat) return r;  // 已處理

    // 手動修: 大滿貫甲 L1~2 (2026-09-15)
    if (r.id === 'acc_id_sl3l8t3oz' ||
        (r.subject === '英文' && r.typeName === '複習卷' && r.instanceName === '大滿貫甲' &&
         r.wrongUnits.indexOf('L1~2') >= 0 && r.date === '2026-09-15')) {
        r.wrongUnits = ['第三冊|L1~2'];
        return r;
    }

    var newWrongUnits = [];
    r.wrongUnits.forEach(function(wu) {
        if (wu.indexOf('|') > 0) { newWrongUnits.push(wu); return; }
        var vols = findUnitVols(master, wu);
        if (vols.length === 1 && vols[0].vol) {
            newWrongUnits.push(vols[0].vol + '|' + wu);
        } else {
            newWrongUnits.push(wu);  // 保留舊格式
        }
    });
    r.wrongUnits = newWrongUnits;
    return r;
}

let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); console.log(`✓ ${name}`); pass++; }
    catch (e) { console.log(`✗ ${name}\n   ${e.message}`); fail++; }
}

console.log('\n=== findUnitVols ===');
t('數學/第1回 → 第一冊', function() {
    var vols = findUnitVols(fakeMaster, '第1回');
    assert.strictEqual(vols.length, 1);
    assert.strictEqual(vols[0].vol, '第一冊');
});
t('數學/第5回 → 第二冊 (唯一)', function() {
    var vols = findUnitVols(fakeMaster, '第5回');
    assert.strictEqual(vols.length, 1);
    assert.strictEqual(vols[0].vol, '第二冊');
});
t('英文/L1~2 → 麻辣甲 第二~六冊 + 大滿貫甲 第二~六冊 (11 處)', function() {
    var vols = findUnitVols(fakeMaster, 'L1~2');
    // 麻辣甲 5 冊 + 大滿貫甲 5 冊 = 10
    assert.strictEqual(vols.length, 10);
});

console.log('\n=== migrateRecord ===');
t('unique vol record 自動標註', function() {
    var r = { id: 'r1', subject: '數學', typeName: '複習卷', instanceName: '麻辣甲',
              wrongUnits: ['第1回'], total: 30, correct: 27, date: '2026-09-01' };
    migrateRecord(r, fakeMaster);
    assert.deepStrictEqual(r.wrongUnits, ['第一冊|第1回']);
});
t('multi-vol record 保留舊格式', function() {
    var r = { id: 'r2', subject: '英文', typeName: '複習卷', instanceName: '麻辣甲',
              wrongUnits: ['L1~2'], total: 40, correct: 30, date: '2026-09-15' };
    migrateRecord(r, fakeMaster);
    assert.deepStrictEqual(r.wrongUnits, ['L1~2']);  // 保留舊
});
t('手動修: 大滿貫甲 L1~2 (2026-09-15) → 第三冊', function() {
    var r = { id: 'acc_id_sl3l8t3oz', subject: '英文', typeName: '複習卷', instanceName: '大滿貫甲',
              wrongUnits: ['L1~2'], total: 40, correct: 36, date: '2026-09-15' };
    migrateRecord(r, fakeMaster);
    assert.deepStrictEqual(r.wrongUnits, ['第三冊|L1~2']);
});
t('multiple wrongUnits: 一個 unique 一個 multi-vol', function() {
    var r = { id: 'r3', subject: '數學', typeName: '複習卷', instanceName: '麻辣甲',
              wrongUnits: ['第1回', '第5回'], total: 60, correct: 50, date: '2026-09-01' };
    migrateRecord(r, fakeMaster);
    assert.deepStrictEqual(r.wrongUnits, ['第一冊|第1回', '第二冊|第5回']);
});
t('已標註的 (vol|name) 跳過不動', function() {
    var r = { id: 'r4', wrongUnits: ['第一冊|第1回'] };
    var orig = JSON.stringify(r);
    migrateRecord(r, fakeMaster);
    assert.strictEqual(JSON.stringify(r), orig);
});
t('custom instance vol=null 保留', function() {
    var customMaster = {
        '自訂': { materials: { '自訂': { instances: [{ id: 'i1', alias: 'Custom1', type: 'custom', units: [{ id: 'u1', name: 'Unit1' }] }] } } }
    };
    var r = { id: 'r5', subject: '自訂', typeName: '自訂', instanceName: 'Custom1',
              wrongUnits: ['Unit1'], total: 10, correct: 8, date: '2026-09-01' };
    migrateRecord(r, customMaster);
    assert.deepStrictEqual(r.wrongUnits, ['Unit1']);  // vol=null → 保留
});

console.log('\n========================================');
console.log(`🎉 ${pass}/${pass+fail} PASS`);
if (fail > 0) process.exit(1);