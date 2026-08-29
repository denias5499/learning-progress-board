// v1.6.67 hotfix: renderDashSummary 應該回傳 bar cards (修掉過早 return)
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');

test('renderDashSummary 模擬: 設定 user data 後應回傳 bar cards', () => {
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
                                '複習講義': {
                                    instances: [{
                                        name: '大滿貫',
                                        vols: { '第一冊': [{id: 'u1', name: '一元一次', start:1, end:10}] }
                                    }]
                                }
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
    assert.ok(result.includes('dash-subject-bar-card'), '應包含 bar card');
    assert.ok(result.includes('數學'), '應包含 數學');
    assert.ok(result.includes('dash-subject-bar-done'), '應包含 done bar');
});

test('renderDashSummary: 空 masters 不應 crash', () => {
    const win = loadIndex();
    win.eval(`
        currentUserId = 'user_A';
        multiData = { user_A: { name: 'D', masters: {}, plans: [], logs: [], avatar: '' } };
        appMaster = {};
        _collectSubjectUnitsCache = new WeakMap();
    `);
    const result = win.eval('renderDashSummary()');
    assert.ok(result.includes('dash-summary'), '應有 summary');
    assert.ok(!result.includes('dash-subject-bar-card'), '空 masters 不應有 bar');
});

test('renderDashSummary: 多科目應顯示多個 bar', () => {
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
                        },
                        '英文': {
                            type: 'normal',
                            materials: {
                                'E1': { instances: [{ name: 'i2', vols: { 'V1': [{id: 'e1', name: 'n2', start:1, end:5}] } }] }
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
    const barCount = (result.match(/dash-subject-bar-card/g) || []).length;
    assert.equal(barCount, 2, '應有 2 個 bar cards');
});
