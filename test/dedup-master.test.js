// test/dedup-master.test.js -- v1.5.179 regression test
// Bug: 教材庫有重複 unit (U1, U2 出現兩次等), 之前只 hide 沒真正清
// Fix: deduplicateMasterUnits() 自動 + 手動 dedup 教材庫

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');

test('deduplicateMasterUnits: 移除重複 unit, 回傳移除數量', () => {
    const win = loadIndex();
    const dupVols = {};
    dupVols['第三冊'] = [
        { id: 'u_eng1', name: 'U6', start: 121, end: 139 },
        { id: 'u_eng1', name: 'U6', start: 121, end: 139 },
        { id: 'u_eng2', name: 'U7', start: 140, end: 161 }
    ];
    dupVols['第四冊'] = [
        { id: 'u_eng3', name: 'U9', start: 193, end: 209 },
        { id: 'u_eng4', name: 'U10', start: 210, end: 231 },
        { id: 'u_eng3', name: 'U9', start: 193, end: 209 }
    ];
    win.multiData = {
        user_test: {
            name: 'T', avatar: '', master: {},
            masters: { '會考複習': { '英文': { materials: { default: { instances: [{ name: 'default', vols: dupVols }] } } } } },
            missions: {}, plans: [], logs: []
        }
    };
    win.currentUserId = 'user_test';

    const removed = win.deduplicateMasterUnits('user_test');
    assert.strictEqual(removed, 2, '應該移除 2 個重複 (U6 + U9)');

    const after = win.multiData.user_test.masters['會考複習']['英文'].materials.default.instances[0].vols;
    assert.strictEqual(after['第三冊'].length, 2, '第三冊應該剩 U6 + U7 = 2');
    assert.strictEqual(after['第四冊'].length, 2, '第四冊應該剩 U9 + U10 = 2');
    assert.strictEqual(after['第三冊'][0].id, 'u_eng1');
    assert.strictEqual(after['第四冊'][0].id, 'u_eng3');
});

test('deduplicateMasterUnits: 沒有重複時不做事', () => {
    const win = loadIndex();
    const cleanVols = { '第一冊': [{ id: 'u1', name: '字音', start: 6, end: 24 }] };
    win.multiData = {
        user_test: {
            name: 'T', avatar: '', master: {},
            masters: { '會考複習': { '國文': { materials: { default: { instances: [{ name: 'd', vols: cleanVols }] } } } } },
            missions: {}, plans: [], logs: []
        }
    };
    win.currentUserId = 'user_test';

    const removed = win.deduplicateMasterUnits('user_test');
    assert.strictEqual(removed, 0, '沒有重複應該回傳 0');
});

test('deduplicateMasterUnits: 跨多個 type 都能 dedup', () => {
    const win = loadIndex();
    const defVols = { '第一冊': [
        { id: 'u1', name: '數與數線', start: 12, end: 25 },
        { id: 'u1', name: '數與數線', start: 12, end: 25 }
    ]};
    const kaoVols = { '考古': [
        { id: 'u1', name: '考古題', start: 1, end: 10 },
        { id: 'u1', name: '考古題', start: 1, end: 10 }
    ]};
    const types = {
        'default': { instances: [{ name: 'd', vols: defVols }] },
        '考古題': { instances: [{ name: 'd', vols: kaoVols }] }
    };
    win.multiData = {
        user_test: {
            name: 'T', avatar: '', master: {},
            masters: { '會考複習': { '數學': { materials: types } } },
            missions: {}, plans: [], logs: []
        }
    };
    win.currentUserId = 'user_test';

    const removed = win.deduplicateMasterUnits('user_test');
    assert.strictEqual(removed, 2, '跨 type 應該都 dedup (default + 考古題 各 1)');
});
