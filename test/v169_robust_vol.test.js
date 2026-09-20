// test/v169_robust_vol.test.js -- v1.6.169 regression test
//
// v1.6.169 修的問題:
// - v1.6.168 的 vol filter 假設 t.vol 一定有值
//   -> 當 t.vol 是 falsy (undefined/empty/legacy 資料), patch 被短路
//   -> 第一個跨 vol 同名 unit 被當成 match, UI 掛錯位置
//
// v1.6.169 修法:
// - 不依賴 t.vol 一定有值
// - 用 type+instance+name 收集候選
// - 候選 ≤1 直接用; 多個時優先用 t.vol 鎖, 其次用當前 unitId (legacy 兼容), 最後退到第一個

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');

function makeDeniasMasters() {
    return {
        '會考複習': {
            '英文': { materials: {
                '複習卷': { instances: [{
                    name: '大滿貫甲', type: 'volume',
                    volOrder: ['第一冊','第二冊','第三冊','第四冊','第五冊','第六冊'],
                    vols: {
                        '第一冊': [{ id: 'id_bz8n5gkz4', name: 'L1~3', start: 1, end: 1 }],
                        '第二冊': [{ id: 'id_us9n3e8wr', name: 'L1~2', start: 1, end: 1 }],
                        '第三冊': [{ id: 'id_j7l5x7jdz', name: 'L1~2', start: 1, end: 1 }],
                        '第四冊': [{ id: 'id_dxcgci4rz', name: 'L1~2', start: 1, end: 1 }],
                        '第五冊': [{ id: 'id_91p0ak2wk', name: 'L1~2', start: 1, end: 1 }],
                        '第六冊': [{ id: 'id_ugiqjfyfx', name: 'L1~2', start: 1, end: 1 }]
                    }
                }]}
            }}
        }
    };
}

function setupEnv(win, taskPlans) {
    win.masters = makeDeniasMasters();
    win.multiData = {
        config: {
            name: 'T', avatar: '',
            master: makeDeniasMasters(),
            masters: makeDeniasMasters(),
            missions: {},
            plans: taskPlans,
            logs: []
        }
    };
    win.currentUserId = 'config';
    win.appMissions = {};
    win.appPlans = taskPlans;
    win.appLogs = [];
}

test('v1.6.169 Case 1: t.vol=第三冊, t.unitId=第二冊 (錯) → 修成第三冊', async () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: 't1', start: '2026-09-15', end: '2026-09-15',
        grid: { '2026-09-15': [{
            id: 'tid1', subject: '英文', text: '[英文] L1~2 P.1', cat: '會考複習',
            startPage: 1, endPage: 1,
            unitName: 'L1~2', unitId: 'id_us9n3e8wr',
            vol: '第三冊',
            typeName: '複習卷', instanceName: '大滿貫甲'
        }]}
    }];
    setupEnv(win, plans);
    win._v164Migrate('config');
    assert.equal(plans[0].grid['2026-09-15'][0].unitId, 'id_j7l5x7jdz');
});

test('v1.6.169 Case 2: t.vol undefined (legacy), t.unitId=第二冊 → fallback 保留當前 unitId', async () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: 't1', start: '2026-09-15', end: '2026-09-15',
        grid: { '2026-09-15': [{
            id: 'tid1', subject: '英文', text: '[英文] L1~2 P.1', cat: '會考複習',
            startPage: 1, endPage: 1,
            unitName: 'L1~2', unitId: 'id_us9n3e8wr',
            // vol 故意不設
            typeName: '複習卷', instanceName: '大滿貫甲'
        }]}
    }];
    setupEnv(win, plans);
    win._v164Migrate('config');
    assert.equal(plans[0].grid['2026-09-15'][0].unitId, 'id_us9n3e8wr');
});

test('v1.6.169 Case 3: t.vol=第三冊, t.unitId=第三冊 (已對) → 無需修正', async () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: 't1', start: '2026-09-15', end: '2026-09-15',
        grid: { '2026-09-15': [{
            id: 'tid1', subject: '英文', text: '[英文] L1~2 P.1', cat: '會考複習',
            startPage: 1, endPage: 1,
            unitName: 'L1~2', unitId: 'id_j7l5x7jdz',
            vol: '第三冊',
            typeName: '複習卷', instanceName: '大滿貫甲'
        }]}
    }];
    setupEnv(win, plans);
    win._v164Migrate('config');
    assert.equal(plans[0].grid['2026-09-15'][0].unitId, 'id_j7l5x7jdz');
});

test('v1.6.169 Case 4: t.vol=第五冊, t.unitId=第二冊 → 修成第五冊', async () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: 't1', start: '2026-09-15', end: '2026-09-15',
        grid: { '2026-09-15': [{
            id: 'tid1', subject: '英文', text: '[英文] L1~2 P.1', cat: '會考複習',
            startPage: 1, endPage: 1,
            unitName: 'L1~2', unitId: 'id_us9n3e8wr',
            vol: '第五冊',
            typeName: '複習卷', instanceName: '大滿貫甲'
        }]}
    }];
    setupEnv(win, plans);
    win._v164Migrate('config');
    assert.equal(plans[0].grid['2026-09-15'][0].unitId, 'id_91p0ak2wk');
});

test('v1.6.169 Case 5: t.vol="" (空), t.unitId=第三冊 (對) → 保留', async () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: 't1', start: '2026-09-15', end: '2026-09-15',
        grid: { '2026-09-15': [{
            id: 'tid1', subject: '英文', text: '[英文] L1~2 P.1', cat: '會考複習',
            startPage: 1, endPage: 1,
            unitName: 'L1~2', unitId: 'id_j7l5x7jdz',
            vol: '',
            typeName: '複習卷', instanceName: '大滿貫甲'
        }]}
    }];
    setupEnv(win, plans);
    win._v164Migrate('config');
    assert.equal(plans[0].grid['2026-09-15'][0].unitId, 'id_j7l5x7jdz');
});

test('v1.6.169 Case 6: 麻辣甲 L1~L2 (不同名) → 不會跟大滿貫甲 L1~2 衝突', async () => {
    const win = loadIndex();
    const masters = makeDeniasMasters();
    masters['會考複習']['英文'].materials['複習卷'].instances.push({
        name: '麻辣甲', type: 'volume',
        volOrder: ['第三冊'],
        vols: { '第三冊': [{ id: 'id_efou55f2y', name: 'L1~L2', start: 1, end: 1 }] }
    });
    win.masters = masters;
    win.multiData = {
        config: { name: 'T', avatar: '', master: masters, masters, missions: {},
            plans: [{
                id: 'p1', name: 't1', start: '2026-09-15', end: '2026-09-15',
                grid: { '2026-09-15': [{
                    id: 'tid1', subject: '英文', text: '[英文] L1~L2 P.1', cat: '會考複習',
                    startPage: 1, endPage: 1,
                    unitName: 'L1~L2', unitId: 'id_efou55f2y',
                    vol: '第三冊',
                    typeName: '複習卷', instanceName: '麻辣甲'
                }]}
            }], logs: []
        }
    };
    win.currentUserId = 'config';
    win._v164Migrate('config');
    assert.equal(win.multiData.config.plans[0].grid['2026-09-15'][0].unitId, 'id_efou55f2y');
});
