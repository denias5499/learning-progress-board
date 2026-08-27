// test/v164-remap-within.test.js -- v1.6.64 regression test
//
// v1.6.64 修的 bug:
// 1. v1.6.63 remap fallback 用 exact match (u.start===t.startPage && u.end===t.endPage)
//    → task P.39-42 vs unit P.39-50 不 match → unitId 保持錯誤
//    → 統計表、排程天數、完成度都錯
//
// 2. 沒有自動 backfill typeName/instanceName
//    → 現存 task 需要手動跑 console script 才能修
//
// v1.6.64 修法:
// - fallback 改成 within-match (u.start <= t.startPage && u.end >= t.endPage)
// - 加 _v164Migrate function: page load 時自動 backfill + remap

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');

// 構造 Denias 的真實場景: 麻辣甲 vs 大滿貫
function makeMastersWithMultipleInstances() {
    return {
        '會考複習': {
            '數學': { materials: {
                '複習卷': { instances: [{
                    name: '麻辣甲', vols: {
                        '第一冊': [
                            { id: 'id_f5b8j07kd', name: '一元一次方程式', start: 1, end: 1 },
                            { id: 'id_pfbfa5mae', name: '分數的運算', start: 1, end: 1 }
                        ],
                        '第二冊': [
                            { id: 'id_xb7foqf3b', name: '二元一次聯立方程式', start: 1, end: 1 }
                        ]
                    }
                }]},
                '複習講義': { instances: [{
                    name: '大滿貫', vols: {
                        '第一冊': [
                            { id: 'id_fefacxzml', name: '數與數線', start: 12, end: 25 },
                            { id: 'id_lqo8qg58l', name: '標準分解式與分數運算', start: 26, end: 38 },
                            { id: 'id_c9bxkq188', name: '一元一次方程式', start: 39, end: 50 }
                        ],
                        '第二冊': [
                            { id: 'id_cf1tdcoxf', name: '二元一次聯立方程式', start: 51, end: 62 }
                        ]
                    }
                }]}
            }}
        }
    };
}

function setupEnv(win, taskPlans) {
    win.appMaster = makeMastersWithMultipleInstances();
    win.multiData = {
        user_test: {
            name: 'T', avatar: '',
            master: makeMastersWithMultipleInstances(),
            masters: { '會考複習': makeMastersWithMultipleInstances()['會考複習'] },
            missions: {},
            plans: taskPlans,
            logs: []
        }
    };
    win.currentUserId = 'user_test';
    win.appMissions = {};
    win.appPlans = taskPlans;
    win.appLogs = [];
}

test('v1.6.64 within-match: 麻辣甲 P.1 task 不會被誤判到大滿貫', () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: 'Test', start: '2026-07-01', end: '2026-07-01',
        grid: { '2026-07-14': [{
            id: 't1', subject: '數學', text: 'P.1',
            startPage: 1, endPage: 1, isDone: true,
            cat: '會考複習', mis: '一模',
            unitId: 'id_f5b8j07kd',
            vol: '第一冊', unitName: '一元一次方程式',
            postponeCount: 0
        }]}
    }];
    setupEnv(win, plans);
    win._v164Migrate('user_test');
    const t = win.multiData.user_test.plans[0].grid['2026-07-14'][0];
    assert.equal(t.unitId, 'id_f5b8j07kd', '麻辣甲 P.1 應該保持 id_f5b8j07kd');
});

test('v1.6.64 within-match: 大滿貫 P.39-50 task 之前被誤指到麻辣甲, 現在會修對', () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: 'Test', start: '2026-07-01', end: '2026-07-30',
        grid: {
            '2026-07-14': [{
                id: 't1', subject: '數學', startPage: 1, endPage: 1, isDone: true,
                cat: '會考複習', mis: '一模',
                unitId: 'id_f5b8j07kd', vol: '第一冊',
                unitName: '一元一次方程式', postponeCount: 0
            }],
            '2026-07-28': [{
                id: 't2', subject: '數學', startPage: 39, endPage: 42, isDone: true,
                cat: '會考複習', mis: '一模',
                unitId: 'id_f5b8j07kd', vol: '第一冊',
                unitName: '一元一次方程式', postponeCount: 0
            }],
            '2026-07-29': [{
                id: 't3', subject: '數學', startPage: 43, endPage: 48, isDone: true,
                cat: '會考複習', mis: '一模',
                unitId: 'id_f5b8j07kd', vol: '第一冊',
                unitName: '一元一次方程式', postponeCount: 0
            }],
            '2026-07-30': [{
                id: 't4', subject: '數學', startPage: 49, endPage: 50, isDone: true,
                cat: '會考複習', mis: '一模',
                unitId: 'id_f5b8j07kd', vol: '第一冊',
                unitName: '一元一次方程式', postponeCount: 0
            }]
        }
    }];
    setupEnv(win, plans);
    win._v164Migrate('user_test');
    assert.equal(win.multiData.user_test.plans[0].grid['2026-07-14'][0].unitId, 'id_f5b8j07kd',
        'P.1 應該保持麻辣甲');
    assert.equal(win.multiData.user_test.plans[0].grid['2026-07-28'][0].unitId, 'id_c9bxkq188',
        'P.39-42 應該修到 大滿貫');
    assert.equal(win.multiData.user_test.plans[0].grid['2026-07-29'][0].unitId, 'id_c9bxkq188',
        'P.43-48 應該修到 大滿貫');
    assert.equal(win.multiData.user_test.plans[0].grid['2026-07-30'][0].unitId, 'id_c9bxkq188',
        'P.49-50 應該修到 大滿貫');
});

test('v1.6.64 within-match: 二元一次聯立方程式 同樣會被修對', () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: 'Test', start: '2026-07-01', end: '2026-08-01',
        grid: {
            '2026-07-21': [{
                id: 't1', subject: '數學', startPage: 1, endPage: 1, isDone: true,
                cat: '會考複習', mis: '一模',
                unitId: 'id_xb7foqf3b', vol: '第二冊',
                unitName: '二元一次聯立方程式', postponeCount: 0
            }],
            '2026-07-31': [{
                id: 't2', subject: '數學', startPage: 51, endPage: 56, isDone: true,
                cat: '會考複習', mis: '一模',
                unitId: 'id_xb7foqf3b', vol: '第二冊',
                unitName: '二元一次聯立方程式', postponeCount: 0
            }],
            '2026-08-01': [{
                id: 't3', subject: '數學', startPage: 57, endPage: 62, isDone: true,
                cat: '會考複習', mis: '一模',
                unitId: 'id_xb7foqf3b', vol: '第二冊',
                unitName: '二元一次聯立方程式', postponeCount: 0
            }]
        }
    }];
    setupEnv(win, plans);
    win._v164Migrate('user_test');
    assert.equal(win.multiData.user_test.plans[0].grid['2026-07-21'][0].unitId, 'id_xb7foqf3b',
        'P.1 應該保持麻辣甲');
    assert.equal(win.multiData.user_test.plans[0].grid['2026-07-31'][0].unitId, 'id_cf1tdcoxf',
        'P.51-56 應該修到 大滿貫');
    assert.equal(win.multiData.user_test.plans[0].grid['2026-08-01'][0].unitId, 'id_cf1tdcoxf',
        'P.57-62 應該修到 大滿貫');
});

test('v1.6.64 backfill typeName/instanceName 給沒有欄位的 task', () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: 'Test', start: '2026-07-01', end: '2026-07-01',
        grid: { '2026-07-14': [{
            id: 't1', subject: '數學', startPage: 1, endPage: 1, isDone: true,
            cat: '會考複習', mis: '一模',
            unitId: 'id_f5b8j07kd', vol: '第一冊',
            unitName: '一元一次方程式', postponeCount: 0
        }]}
    }];
    setupEnv(win, plans);
    win._v164Migrate('user_test');
    const t = win.multiData.user_test.plans[0].grid['2026-07-14'][0];
    assert.equal(t.typeName, '複習卷');
    assert.equal(t.instanceName, '麻辣甲');
});

test('v1.6.64 已經有 typeName/instanceName 的 task 不會被覆蓋', () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: 'Test', start: '2026-07-01', end: '2026-07-01',
        grid: { '2026-07-14': [{
            id: 't1', subject: '數學', startPage: 1, endPage: 1, isDone: true,
            cat: '會考複習', mis: '一模',
            unitId: 'id_f5b8j07kd', vol: '第一冊',
            unitName: '一元一次方程式', postponeCount: 0,
            typeName: '複習卷',
            instanceName: '麻辣甲'
        }]}
    }];
    setupEnv(win, plans);
    win._v164Migrate('user_test');
    const t = win.multiData.user_test.plans[0].grid['2026-07-14'][0];
    assert.equal(t.typeName, '複習卷');
    assert.equal(t.instanceName, '麻辣甲');
});

test('v1.6.64 within-match fallback 在 v1.6.63 exact match 會失敗時成功', () => {
    const win = loadIndex();
    const plans = [{
        id: 'p1', name: 'Test', start: '2026-07-01', end: '2026-07-30',
        grid: { '2026-07-28': [{
            id: 't1', subject: '數學', startPage: 39, endPage: 42, isDone: true,
            cat: '會考複習', mis: '一模',
            unitId: 'id_does_not_exist',
            vol: '第一冊',
            unitName: '一元一次方程式', postponeCount: 0
        }]}
    }];
    setupEnv(win, plans);
    win._v164Migrate('user_test');
    const t = win.multiData.user_test.plans[0].grid['2026-07-28'][0];
    assert.equal(t.unitId, 'id_c9bxkq188',
        'within-match 應該找到大滿貫 (P.39-50), exact match 會失敗');
});
