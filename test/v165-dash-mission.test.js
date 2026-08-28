// test/v165-dash-mission.test.js -- v1.6.65 regression test
//
// v1.6.65 修的邏輯錯誤:
// 之前: dashboard 選 missiondropdown 時, pDone 只算該 mission 的 task
//   → 一模 done task 在二模 view 看不到 (即使 unit 在二模 scope)
// 修正: pDone 從所有 mission 算 (mission 只決定 unit 範圍, 不限制 done 計算)

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');

function getMathDamanguan() {
    return {
        materials: {
            '複習卷': { instances: [{
                name: '麻辣甲', vols: {
                    '第一冊': [
                        { id: 'id_mala_1', name: '一元一次方程式', start: 1, end: 1 }
                    ]
                }
            }] },
            '複習講義': { instances: [{
                name: '大滿貫', vols: {
                    '第一冊': [
                        { id: 'id_dm_39', name: '一元一次方程式', start: 39, end: 50 }
                    ]
                }
            }] }
        }
    };
}

function setupEnv(win, opts) {
    const { taskPlans, catMissions } = opts;
    win.appMaster = opts.masters;
    win.multiData = {
        user_test: {
            name: 'T', avatar: '',
            master: opts.masters,
            masters: { '會考複習': opts.masters['會考複習'] },
            missions: catMissions,
            plans: taskPlans,
            logs: []
        }
    };
    win.currentUserId = 'user_test';
    win.appMissions = catMissions;
    win.appPlans = taskPlans;
    win.appLogs = [];
    win.appCurrentCat = '會考複習';
    
    // 手動建 _treeScheduledUnits (jsdom 環境下 refreshTreeScheduledUnits 跑不到)
    // 模擬真實情境:每個有 task 的 unit 都應該有 entry
    win._treeScheduledUnits = {};
    taskPlans.forEach(function(plan) {
        if (!plan.grid) return;
        Object.keys(plan.grid).forEach(function(dStr) {
            (plan.grid[dStr] || []).forEach(function(t) {
                if (!t || !t.unitId) return;
                if (!win._treeScheduledUnits[t.unitId]) {
                    win._treeScheduledUnits[t.unitId] = {
                        covered: 0, donePages: 0, totalTasks: 0, doneTasks: 0
                    };
                }
                var pages = (t.endPage && t.startPage && t.endPage >= t.startPage) ? (t.endPage - t.startPage + 1) : 1;
                win._treeScheduledUnits[t.unitId].covered += pages;
                win._treeScheduledUnits[t.unitId].totalTasks += 1;
                if (t.isDone) win._treeScheduledUnits[t.unitId].doneTasks += 1;
            });
        });
    });
}

test('v1.6.65: 一模done的unit, 算所有 mission 應該看到 12 pages', () => {
    const win = loadIndex();
    const masters = {
        '會考複習': {
            '數學': getMathDamanguan()
        }
    };
    const taskPlans = [{
        id: 'p1', name: 'Test', grid: {
            '2026-07-28': [{
                id: 't1', subject: '數學', startPage: 39, endPage: 50,
                isDone: true, cat: '會考複習', mis: '一模',
                unitId: 'id_dm_39', vol: '第一冊', unitName: '一元一次方程式'
            }]
        }
    }];
    const catMissions = {
        '會考複習': {
            '一模': ['id_dm_39'],
            '二模': ['id_dm_39'],
            '三模': [],
            '四模': []
        }
    };
    setupEnv(win, { masters, taskPlans, catMissions });

    // v1.6.65: 不過濾 mission, 應該看到 12 pages done
    const allDone = win.eval('getUnitDonePagesByUnitIdMatch(null, null)');
    assert.equal(allDone['id_dm_39'], 12, '不過濾應該看到 12 pages done');
});

test('v1.6.65: dashboard 邏輯: 改用 simpleDoneAllMissions 算 done (不限 dropdown mission)', () => {
    const win = loadIndex();
    const masters = {
        '會考複習': {
            '數學': getMathDamanguan()
        }
    };
    // 模擬 dashboard 的 processUnit 邏輯
    // 修正後用 simpleDoneAllMissions 計算
    const taskPlans = [{
        id: 'p1', name: 'Test', grid: {
            '2026-07-28': [{
                id: 't1', subject: '數學', startPage: 39, endPage: 50,
                isDone: true, cat: '會考複習', mis: '一模',
                unitId: 'id_dm_39', vol: '第一冊', unitName: '一元一次方程式'
            }]
        }
    }];
    const catMissions = {
        '會考複習': {
            '一模': ['id_dm_39'],
            '二模': ['id_dm_39'],
            '三模': [],
            '四模': []
        }
    };
    setupEnv(win, { masters, taskPlans, catMissions });

    // 修正前 (per-mission filter): 0 pages
    const beforeFix = win.eval('getUnitDonePagesByUnitIdMatch("會考複習", "二模")');
    assert.equal(beforeFix['id_dm_39'] || 0, 0, '修正前: 選二模只看二模 task, 一模 done 看不到');

    // 修正後 (v1.6.65: 不過濾): 12 pages
    const afterFix = win.eval('getUnitDonePagesByUnitIdMatch(null, null)');
    assert.equal(afterFix['id_dm_39'], 12, 'v1.6.65: 算所有 mission, 一模 done 也算');
});

test('v1.6.65: 沒isDone的task, 所有 filter 結果都應該是 0', () => {
    const win = loadIndex();
    const masters = {
        '會考複習': {
            '數學': getMathDamanguan()
        }
    };
    const taskPlans = [{
        id: 'p1', name: 'Test', grid: {
            '2026-07-28': [{
                id: 't1', subject: '數學', startPage: 39, endPage: 50,
                isDone: false,
                cat: '會考複習', mis: '一模',
                unitId: 'id_dm_39', vol: '第一冊', unitName: '一元一次方程式'
            }]
        }
    }];
    const catMissions = { '會考複習': { '一模': ['id_dm_39'], '二模': ['id_dm_39'], '三模': [], '四模': [] } };
    setupEnv(win, { masters, taskPlans, catMissions });

    const allDone = win.eval('getUnitDonePagesByUnitIdMatch(null, null)');
    assert.equal(allDone['id_dm_39'] || 0, 0, '沒isDone的task, 所有mission都應該是 0');
});

test('v1.6.65: 跨多個 mission 的 task 加總 (不只是單個 mission)', () => {
    const win = loadIndex();
    const masters = {
        '會考複習': {
            '數學': getMathDamanguan()
        }
    };
    // 一模 task P.39-44 done, 二模 task P.45-50 done → 12 pages
    const taskPlans = [{
        id: 'p1', name: 'Test', grid: {
            '2026-07-28': [{
                id: 't1', subject: '數學', startPage: 39, endPage: 44,
                isDone: true, cat: '會考複習', mis: '一模',
                unitId: 'id_dm_39', vol: '第一冊', unitName: '一元一次方程式'
            }, {
                id: 't2', subject: '數學', startPage: 45, endPage: 50,
                isDone: true, cat: '會考複習', mis: '二模',
                unitId: 'id_dm_39', vol: '第一冊', unitName: '一元一次方程式'
            }]
        }
    }];
    const catMissions = { '會考複習': { '一模': ['id_dm_39'], '二模': ['id_dm_39'], '三模': [], '四模': [] } };
    setupEnv(win, { masters, taskPlans, catMissions });

    const allDone = win.eval('getUnitDonePagesByUnitIdMatch(null, null)');
    assert.equal(allDone['id_dm_39'], 12, '一模 + 二模 加總應該是 12 pages');
});
