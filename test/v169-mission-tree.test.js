// v1.6.69: 修首頁重整後 mission tree 全白的 bug
//
// 場景: 用戶直接訪問首頁, 還沒去過「學習統計分析 → 樹狀圖」
//       舊版 refreshTreeScheduledUnits 只在 renderTreeView 內呼叫
//       所以首頁 renderDashboard 跑 mission tree 時, _treeScheduledUnits 是空
// 修法: 把 refreshTreeScheduledUnits 搬到全域, renderDashboard 開頭也呼叫

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');

test('v1.6.69: refreshTreeScheduledUnits 是全域函式 (不只在 renderTreeView 內)', () => {
    const win = loadIndex();
    assert.equal(typeof win.refreshTreeScheduledUnits, 'function',
        'refreshTreeScheduledUnits 應為全域函式');
});

test('v1.6.69: 首頁 renderDashboard 直接呼叫也應該設定 _treeScheduledUnits', () => {
    const win = loadIndex();
    win.eval(`
        currentUserId = 'user_A';
        appMaster = {};
        _collectSubjectUnitsCache = new WeakMap();
        // 模擬 user with plans + units
        multiData = {
            user_A: {
                name: 'D',
                masters: {
                    '會考複習': {
                        '數學': {
                            type: 'normal',
                            materials: {
                                'M1': { instances: [{ name: 'i1', vols: { 'V1': [{id: 'u1', name: '一元一次', start:1, end:10}] } }] }
                            }
                        }
                    }
                },
                plans: [{
                    id: 'plan1', name: '一模', grid: {
                        '2026-08-25': [{ unitId: 'u1', startPage: 1, endPage: 5, cat: '會考複習', mis: '一模', isDone: true }]
                    }
                }],
                logs: [],
                avatar: ''
            }
        };
        appPlans = multiData.user_A.plans;
        appMissions = { '會考複習': { '一模': {} } };
        window._treeScheduledUnits = {};  // 模擬「第一次訪問首頁」的清空狀態
    `);
    
    // 不呼叫 renderTreeView, 直接模擬 renderDashboard 開頭
    win.eval(`
        if (typeof window.refreshTreeScheduledUnits === 'function') {
            window.refreshTreeScheduledUnits();
        }
    `);
    
    const treeScheduled = win.eval('JSON.stringify(window._treeScheduledUnits)');
    assert.ok(treeScheduled.includes('u1'), 'u1 應在 _treeScheduledUnits 內');
    assert.ok(treeScheduled.includes('doneTasks'), '應有 doneTasks 屬性');
    // u1 有 1 個 task 標記為 isDone=true, 所以 doneTasks 應為 1
    assert.ok(treeScheduled.includes('"doneTasks":1'), 'u1.doneTasks 應為 1');
});

test('v1.6.69: renderDashboard 開頭呼叫 refreshTreeScheduledUnits', () => {
    const win = loadIndex();
    const fnBody = (() => {
        const m = win.eval('renderDashboard.toString()');
        return m;
    })();
    // 用 regex 確認 renderDashboard 開頭有呼叫 refreshTreeScheduledUnits
    assert.ok(/refreshTreeScheduledUnits\s*\(\s*\)/.test(fnBody),
        'renderDashboard 應呼叫 refreshTreeScheduledUnits');
});

test('v1.6.69: renderDashboard 開頭先 sync appPlans 再 refresh', () => {
    const win = loadIndex();
    const fnBody = win.eval('renderDashboard.toString()');
    // 確認 sync appPlans 在 refresh 之前
    var syncIdx = fnBody.indexOf('appPlans = multiData[currentUserId].plans');
    var refreshIdx = fnBody.indexOf('refreshTreeScheduledUnits()');
    assert.ok(syncIdx >= 0, 'renderDashboard 應 sync appPlans');
    assert.ok(refreshIdx >= 0, 'renderDashboard 應 refresh');
    assert.ok(syncIdx < refreshIdx, 'sync appPlans 必須在 refresh 之前 (否則 refresh 會用舊 plans)');
});
