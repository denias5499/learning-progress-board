// test/v168_vol_match.test.js -- v1.6.168 regression test
//
// v1.6.168 修的 bug:
// - _v164Migrate 的 within-match 比對沒有檢查 vol
//   -> 跨 vol 同名 unit (例如 大滿貫甲 第二冊 L1~2 vs 第三冊 L1~2)
//     會被錯指到第一個找到的 (預期應是 vol 對的那個)
// - exact match 也沒檢查 vol (保險措施)
//
// v1.6.168 修法:
// - within-match: vol 不符 -> return false
// - exact match: type/instance 比對後也加 vol 比對

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');

// 模擬 Denias 真實 master 結構 (從 backup JSON 抽出):
// - 第一冊 L1~3 (id_bz8n5gkz4) -- 不是 L1~2, 排除干擾
// - 第二冊 L1~2 (id_us9n3e8wr)
// - 第三冊 L1~2 (id_j7l5x7jdz)
// - 第四冊 L1~2 (id_dxcgci4rz)
// - 第五冊 L1~2 (id_91p0ak2wk)
// - 第六冊 L1~2 (id_ugiqjfyfx)
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

test('v1.6.168: 第三冊 task 不會被誤指到第二冊 (還原 Denias 9/15 場景)', () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: '二模', start: '2026-09-01', end: '2026-09-30',
        grid: {
            '2026-09-15': [{
                id: 't1', subject: '英文', startPage: 1, endPage: 1, isDone: true,
                cat: '會考複習', mis: '二模',
                unitId: 'id_us9n3e8wr',           // WRONG: 第二冊
                vol: '第三冊',                    // CORRECT: 第三冊
                unitName: 'L1~2',
                typeName: '複習卷',
                instanceName: '大滿貫甲',
                postponeCount: 0
            }]
        }
    }];
    setupEnv(win, plans);
    win._v164Migrate('config');
    const t = win.multiData.config.plans[0].grid['2026-09-15'][0];
    assert.equal(t.unitId, 'id_j7l5x7jdz',
        'vol=第三冊 的 task 應該修到 id_j7l5x7jdz, 不再被指到第二冊');
});

test('v1.6.168: 第二冊 task 保持第二冊 (沒有 vol 比對會誤判)', () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: '二模', start: '2026-09-01', end: '2026-09-30',
        grid: {
            '2026-09-10': [{
                id: 't1', subject: '英文', startPage: 1, endPage: 1, isDone: true,
                cat: '會考複習', mis: '二模',
                unitId: 'id_us9n3e8wr',
                vol: '第二冊',
                unitName: 'L1~2',
                typeName: '複習卷',
                instanceName: '大滿貫甲',
                postponeCount: 0
            }]
        }
    }];
    setupEnv(win, plans);
    win._v164Migrate('config');
    const t = win.multiData.config.plans[0].grid['2026-09-10'][0];
    assert.equal(t.unitId, 'id_us9n3e8wr', '第二冊 task 應該保持不變');
});

test('v1.6.168: 第五冊 task 沒有 vol 比對會被改到第二冊, 修後保持第五冊', () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: '二模', start: '2026-09-01', end: '2026-09-30',
        grid: {
            '2026-09-20': [{
                id: 't1', subject: '英文', startPage: 1, endPage: 1, isDone: true,
                cat: '會考複習', mis: '二模',
                unitId: 'id_91p0ak2wk',
                vol: '第五冊',
                unitName: 'L1~2',
                typeName: '複習卷',
                instanceName: '大滿貫甲',
                postponeCount: 0
            }]
        }
    }];
    setupEnv(win, plans);
    win._v164Migrate('config');
    const t = win.multiData.config.plans[0].grid['2026-09-20'][0];
    assert.equal(t.unitId, 'id_91p0ak2wk', '第五冊 task 應該保持不變');
});

test('v1.6.168: 麻辣甲 L1~L2 (unitName 不同, 走 exact match)', () => {
    const win = loadIndex();
    win.masters = {
        '會考複習': {
            '英文': { materials: {
                '複習卷': { instances: [
                    { name: '大滿貫甲', type: 'volume',
                      volOrder: ['第三冊'],
                      vols: { '第三冊': [{ id: 'id_j7l5x7jdz', name: 'L1~2', start: 1, end: 1 }] }},
                    { name: '麻辣甲', type: 'volume',
                      volOrder: ['第三冊'],
                      vols: { '第三冊': [{ id: 'id_efou55f2y', name: 'L1~L2', start: 1, end: 1 }] }}
                ]}
            }}
        }
    };
    win.multiData = {
        config: {
            name: 'T', avatar: '',
            master: win.masters['會考複習'],
            masters: win.masters,
            missions: {}, plans: [
                { id: 'p1', name: '二模', start: '2026-09-01', end: '2026-09-30',
                  grid: {
                      '2026-09-16': [{
                          id: 't1', subject: '英文', startPage: 1, endPage: 1, isDone: true,
                          cat: '會考複習', mis: '二模',
                          unitId: 'id_j7l5x7jdz',
                          vol: '第三冊',
                          unitName: 'L1~L2',
                          typeName: '複習卷',
                          instanceName: '麻辣甲',
                          postponeCount: 0
                      }]
                  }}
            ], logs: []
        }
    };
    win.currentUserId = 'config';
    win.appMissions = {};
    win.appPlans = win.multiData.config.plans;
    win.appLogs = [];

    win._v164Migrate('config');
    const t = win.multiData.config.plans[0].grid['2026-09-16'][0];
    assert.equal(t.unitId, 'id_efou55f2y',
        '麻辣甲 L1~L2 修到 id_efou55f2y');
});
