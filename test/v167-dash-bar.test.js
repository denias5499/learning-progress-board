// v1.6.68: dashboard 「各科整體進度 (按 Category 分組)」移除
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');

test('renderDashSummary 不應包含「各科整體進度」section (v1.6.68 移除)', () => {
    const win = loadIndex();
    win.eval(`
        currentUserId = 'user_A';
        multiData = {
            user_A: {
                name: 'Denias',
                masters: {
                    '會考複習': {
                        '數學': {
                            type: 'normal',
                            materials: {
                                'M1': { instances: [{ name: 'i1', vols: { 'V1': [{id: 'm1', name: 'n1', start:1, end:10}] } }] }
                            }
                        }
                    }
                },
                plans: [],
                logs: [],
                avatar: ''
            }
        };
        appMaster = multiData.user_A.masters['會考複習'];
        _collectSubjectUnitsCache = new WeakMap();
    `);
    const result = win.eval('renderDashSummary()');
    assert.ok(!result.includes('dash-subject-bar-card'), '不應包含 bar card (已移除)');
    assert.ok(!result.includes('按進度大分類分組'), '不應包含舊標題');
    assert.ok(!result.includes('按 Category 分組'), '不應包含舊註解');
});

test('renderDashSummary 仍應包含 stat cards + 7 日圖', () => {
    const win = loadIndex();
    win.eval(`
        currentUserId = 'user_A';
        multiData = { user_A: { name: 'D', masters: {}, plans: [], logs: [], avatar: '' } };
        appMaster = {};
        _collectSubjectUnitsCache = new WeakMap();
    `);
    const result = win.eval('renderDashSummary()');
    assert.ok(result.includes('dash-summary'), '應有 summary');
    assert.ok(result.includes('學生人數'), '應有 學生人數 stat card');
    assert.ok(result.includes('任務總數'), '應有 任務總數 stat card');
    assert.ok(result.includes('學習活動'), '應有 學習活動 stat card');
    assert.ok(result.includes('本週學習'), '應有 本週學習 stat card');
    assert.ok(result.includes('dash-weekly-chart'), '應有 7 日圖');
    assert.ok(result.includes('近 7 日學習量'), '應有 7 日圖標題');
});

test('renderDashSummary 不應 crash 即使有 masters 資料', () => {
    const win = loadIndex();
    win.eval(`
        currentUserId = 'user_A';
        multiData = {
            user_A: {
                name: 'D',
                masters: {
                    '會考複習': {
                        '數學': {
                            type: 'normal',
                            materials: {
                                'M1': { instances: [{ name: 'i1', vols: { 'V1': [{id: 'm1', name: 'n1', start:1, end:10}] } }] }
                            }
                        }
                    }
                },
                plans: [],
                logs: [],
                avatar: ''
            }
        };
        appMaster = multiData.user_A.masters['會考複習'];
        _collectSubjectUnitsCache = new WeakMap();
    `);
    const result = win.eval('renderDashSummary()');
    assert.ok(result.includes('dash-summary'), '不應 crash');
    assert.ok(!result.includes('dash-subject-bar-card'), '不應有 bar');
});
