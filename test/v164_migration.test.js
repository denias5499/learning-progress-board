// v1.6.164 unit test — migration logic (按 instance 過濾, 跨 instance 同名不影響 vol 標註)
const assert = require('assert');

// ============================================================
// 假 master (跟實際結構對應 — 沿用 v162 的假資料)
// ============================================================
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
                            '第二冊': [{ id: 'm3', name: '第3回' }, { id: 'm4', name: '第5回' }],
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
                            '第二冊': [{ id: 'e3', name: 'L1~2' }, { id: 'e4', name: 'L3~4' }],
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

// ============================================================
// V164 migration 邏輯 (按 instance 過濾版)
// ============================================================

// 找 unit 在「同一 instance 內」的所有 vol (過濾掉跨 instance 的同名)
function findUnitVolsInInstance(master, sub, typeName, instanceId, unitName) {
    var out = [];
    var subj = master[sub];
    if (!subj || !subj.materials) return out;
    var typeObj = subj.materials[typeName];
    if (!typeObj || !typeObj.instances) return out;
    var ins = typeObj.instances.find(function(i) { return i.id === instanceId; });
    if (!ins || ins.type !== 'volume' || !ins.vols) return out;
    Object.keys(ins.vols).forEach(function(vol) {
        (ins.vols[vol] || []).forEach(function(u) {
            if (u.name === unitName) {
                out.push({ vol: vol, unitId: u.id });
            }
        });
    });
    return out;
}

function migrateRecordV164(r, master) {
    if (!r.wrongUnits || !Array.isArray(r.wrongUnits)) return r;
    var hasNewFormat = r.wrongUnits.some(function(wu) { return wu.indexOf('|') > 0; });
    if (hasNewFormat) return r;  // 已處理, 跳過

    var newWrongUnits = [];
    r.wrongUnits.forEach(function(wu) {
        if (wu.indexOf('|') > 0) { newWrongUnits.push(wu); return; }
        // v1.6.164: 按 (sub, typeName, instanceId) 過濾, 只看同一 instance 內的同名
        var instanceId = r.instanceId;
        var volsInInstance = findUnitVolsInInstance(master, r.subject, r.typeName, instanceId, wu);
        if (volsInInstance.length === 1 && volsInInstance[0].vol) {
            // 同一 instance 內唯一 → 自動標註
            newWrongUnits.push(volsInInstance[0].vol + '|' + wu);
        } else if (volsInInstance.length === 0) {
            // instance 內找不到 → custom 或單元已被刪 → 保留舊格式不打擾
            newWrongUnits.push(wu);
        } else {
            // 同一 instance 內多 vol 都有同名 → 真的 multi-vol → 保留舊格式
            newWrongUnits.push(wu);
        }
    });
    r.wrongUnits = newWrongUnits;
    return r;
}

// ============================================================
// Tests
// ============================================================
let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); console.log(`✓ ${name}`); pass++; }
    catch (e) { console.log(`✗ ${name}\n   ${e.message}`); fail++; }
}

console.log('\n=== findUnitVolsInInstance (按 instance 過濾) ===');
t('英文/L1~2 在 麻辣甲 內 → 5 處 (第二~六冊)', function() {
    var vols = findUnitVolsInInstance(fakeMaster, '英文', '複習卷', 'ins_eng_mala_甲', 'L1~2');
    assert.strictEqual(vols.length, 5);
});
t('英文/L1~2 在 大滿貫甲 內 → 5 處 (第二~六冊)', function() {
    var vols = findUnitVolsInInstance(fakeMaster, '英文', '複習卷', 'ins_eng_dmg_甲', 'L1~2');
    assert.strictEqual(vols.length, 5);
});
t('英文/L1~3 在 麻辣甲 內 → 1 處 (第一冊唯一)', function() {
    var vols = findUnitVolsInInstance(fakeMaster, '英文', '複習卷', 'ins_eng_mala_甲', 'L1~3');
    assert.strictEqual(vols.length, 1);
    assert.strictEqual(vols[0].vol, '第一冊');
});
t('英文/L4~6 在 麻辣甲 內 → 1 處 (第一冊唯一)', function() {
    var vols = findUnitVolsInInstance(fakeMaster, '英文', '複習卷', 'ins_eng_mala_甲', 'L4~6');
    assert.strictEqual(vols.length, 1);
    assert.strictEqual(vols[0].vol, '第一冊');
});
t('數學/第1回 在 麻辣甲 → 1 處 (第一冊唯一)', function() {
    var vols = findUnitVolsInInstance(fakeMaster, '數學', '複習卷', 'ins_math_mala_甲', '第1回');
    assert.strictEqual(vols.length, 1);
    assert.strictEqual(vols[0].vol, '第一冊');
});

console.log('\n=== migrateRecordV164 ===');
t('unique-in-instance 自動標註: 麻辣甲 L1~3 → 第一冊|L1~3', function() {
    var r = { id: 'r1', subject: '英文', typeName: '複習卷', instanceName: '麻辣甲',
              instanceId: 'ins_eng_mala_甲',
              wrongUnits: ['L1~3'], total: 35, correct: 33, date: '2026-07-08' };
    migrateRecordV164(r, fakeMaster);
    assert.deepStrictEqual(r.wrongUnits, ['第一冊|L1~3']);
});
t('unique-in-instance 自動標註: 麻辣甲 L4~6 → 第一冊|L4~6', function() {
    var r = { id: 'r2', subject: '英文', typeName: '複習卷', instanceName: '麻辣甲',
              instanceId: 'ins_eng_mala_甲',
              wrongUnits: ['L4~6'], total: 35, correct: 33, date: '2026-07-15' };
    migrateRecordV164(r, fakeMaster);
    assert.deepStrictEqual(r.wrongUnits, ['第一冊|L4~6']);
});
t('unique-in-instance 自動標註: 麻辣甲 L3~4 → 第二冊|L3~4', function() {
    var r = { id: 'r3', subject: '英文', typeName: '複習卷', instanceName: '麻辣甲',
              instanceId: 'ins_eng_mala_甲',
              wrongUnits: ['L3~4'], total: 35, correct: 34, date: '2026-07-29' };
    migrateRecordV164(r, fakeMaster);
    assert.deepStrictEqual(r.wrongUnits, ['第二冊|L3~4']);
});
t('multi-vol-in-instance 保留舊格式: 麻辣甲 L1~2 (5 冊都有)', function() {
    var r = { id: 'r4', subject: '英文', typeName: '複習卷', instanceName: '麻辣甲',
              instanceId: 'ins_eng_mala_甲',
              wrongUnits: ['L1~2'], total: 35, correct: 33, date: '2026-07-22' };
    migrateRecordV164(r, fakeMaster);
    assert.deepStrictEqual(r.wrongUnits, ['L1~2']);  // 同 instance 內 5 處, 真的 multi-vol
});
t('multi-vol-in-instance 保留舊格式: 大滿貫甲 L1~2', function() {
    var r = { id: 'r5', subject: '英文', typeName: '複習卷', instanceName: '大滿貫甲',
              instanceId: 'ins_eng_dmg_甲',
              wrongUnits: ['L1~2'], total: 35, correct: 33, date: '2026-09-15' };
    migrateRecordV164(r, fakeMaster);
    assert.deepStrictEqual(r.wrongUnits, ['L1~2']);  // 同 instance 內 5 處, 真的 multi-vol
});
t('跨 instance 同名但本 instance 唯一 → 自動標註 (FIX 重點)', function() {
    // v1.6.162 bug: 全局找到 10 處 (麻辣甲 5 + 大滿貫甲 5) → 跳過
    // v1.6.164 fix: 按 instance 過濾 → 同 instance 內唯一 → 自動標註
    var r = { id: 'r6', subject: '英文', typeName: '複習卷', instanceName: '麻辣甲',
              instanceId: 'ins_eng_mala_甲',
              wrongUnits: ['L1~3'], total: 35, correct: 33, date: '2026-07-08' };
    migrateRecordV164(r, fakeMaster);
    assert.deepStrictEqual(r.wrongUnits, ['第一冊|L1~3']);
});
t('已標註的 (vol|name) 跳過不動', function() {
    var r = { id: 'r7', wrongUnits: ['第一冊|L1~3'] };
    var orig = JSON.stringify(r);
    migrateRecordV164(r, fakeMaster);
    assert.strictEqual(JSON.stringify(r), orig);
});
t('custom instance 保留 (找不到 vol → 不打擾)', function() {
    var customMaster = {
        '自訂': { materials: { '自訂': { instances: [{ id: 'i1', alias: 'Custom1', type: 'custom', units: [{ id: 'u1', name: 'Unit1' }] }] } } }
    };
    var r = { id: 'r8', subject: '自訂', typeName: '自訂', instanceName: 'Custom1',
              instanceId: 'i1',
              wrongUnits: ['Unit1'], total: 10, correct: 8, date: '2026-09-01' };
    migrateRecordV164(r, customMaster);
    assert.deepStrictEqual(r.wrongUnits, ['Unit1']);  // type=custom → 保留
});
t('找不到 instance 的單元 → 保留舊格式', function() {
    var r = { id: 'r9', subject: '英文', typeName: '複習卷', instanceName: '麻辣甲',
              instanceId: 'ins_nonexistent',
              wrongUnits: ['L1~3'], total: 35, correct: 33, date: '2026-07-08' };
    migrateRecordV164(r, fakeMaster);
    assert.deepStrictEqual(r.wrongUnits, ['L1~3']);  // 找不到 instance → 保留
});
t('multiple wrongUnits 混合: 兩個 unique-in-instance 都自動標註', function() {
    var r = { id: 'r10', subject: '數學', typeName: '複習卷', instanceName: '麻辣甲',
              instanceId: 'ins_math_mala_甲',
              wrongUnits: ['第1回', '第5回'], total: 60, correct: 50, date: '2026-09-01' };
    migrateRecordV164(r, fakeMaster);
    assert.deepStrictEqual(r.wrongUnits, ['第一冊|第1回', '第二冊|第5回']);
});
t('multiple wrongUnits 混合: unique + multi-vol', function() {
    // 麻辣甲 L1~3 (unique in 第一冊) + L1~2 (5 冊都有)
    var r = { id: 'r11', subject: '英文', typeName: '複習卷', instanceName: '麻辣甲',
              instanceId: 'ins_eng_mala_甲',
              wrongUnits: ['L1~3', 'L1~2'], total: 70, correct: 60, date: '2026-07-08' };
    migrateRecordV164(r, fakeMaster);
    assert.deepStrictEqual(r.wrongUnits, ['第一冊|L1~3', 'L1~2']);  // 第一個標註, 第二個保留
});

console.log('\n========================================');
console.log(`🎉 ${pass}/${pass+fail} PASS`);
if (fail > 0) process.exit(1);
