// test/dedup-master.test.js -- v1.5.180 教材庫 dedup regression test
// Bug: 之前手動新增教材造成同 unit 重複 (沒 id 欄位時 v1.5.179 沒 dedup)
// Fix: id 優先, name+start+end 備用, 跨 instance 也 dedup

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');

const TEST_MASTER_WITH_DUP = JSON.parse(`{
    "會考複習": { "英文": { "materials": { "default": { "instances": [
        { "name": "第一冊", "vols": { "第一冊": [
            {"id": "u_eng1", "name": "U1", "start": 6, "end": 27},
            {"id": "u_eng1", "name": "U1", "start": 6, "end": 27},
            {"id": "u_eng2", "name": "U2", "start": 28, "end": 49}
        ]}},
        { "name": "第四冊", "vols": { "第四冊": [
            {"id": "u_eng3", "name": "U9", "start": 193, "end": 209},
            {"id": "u_eng4", "name": "U10", "start": 210, "end": 231},
            {"id": "u_eng3", "name": "U9", "start": 193, "end": 209}
        ]}}
    ]} } } }
}`);

const TEST_MASTER_NO_ID = JSON.parse(`{
    "會考複習": { "英文": { "materials": { "default": { "instances": [
        { "name": "麻辣", "vols": { "第一冊": [
            {"name": "U1", "start": 6, "end": 27},
            {"name": "U1", "start": 6, "end": 27},
            {"name": "U2", "start": 28, "end": 49}
        ]}}
    ]} } } }
}`);

const TEST_MASTER_CROSS_INSTANCE = JSON.parse(`{
    "會考複習": { "英文": { "materials": { "複習講義": { "instances": [
        { "name": "麻辣", "vols": { "第一冊": [
            {"id": "u1", "name": "U1", "start": 6, "end": 27},
            {"id": "u2", "name": "U2", "start": 28, "end": 49}
        ]}},
        { "name": "(第一冊 全冊)", "vols": { "第一冊": [
            {"id": "u1", "name": "U1", "start": 6, "end": 27},
            {"id": "u2", "name": "U2", "start": 28, "end": 49}
        ]}}
    ]} } } }
}`);

function setupMaster(win, masterData) {
    win.multiData = {
        user_test: { name: 'T', avatar: '', master: {}, masters: masterData, missions: {}, plans: [], logs: [] }
    };
    win.currentUserId = 'user_test';
}

test('deduplicateMasterUnits: 移除重複 unit, 回傳移除數量', () => {
    const win = loadIndex();
    setupMaster(win, TEST_MASTER_WITH_DUP);
    const removed = win.deduplicateMasterUnits('user_test');
    assert.strictEqual(removed, 2, '應該移除 2 個重複 (U1 + U9)');
    const ins = win.multiData.user_test.masters['會考複習']['英文'].materials.default.instances;
    assert.strictEqual(ins[0].vols['第一冊'].length, 2, '第一冊應該剩 U1 + U2 = 2');
    assert.strictEqual(ins[1].vols['第四冊'].length, 2, '第四冊應該剩 U9 + U10 = 2');
});

test('deduplicateMasterUnits: 沒有重複時不做事', () => {
    const win = loadIndex();
    const cleanMaster = JSON.parse('{"會考複習":{"國文":{"materials":{"default":{"instances":[{"name":"d","vols":{"第一冊":[{"id":"u1","name":"字音","start":6,"end":24}]}}]}}}}}');
    setupMaster(win, cleanMaster);
    const removed = win.deduplicateMasterUnits('user_test');
    assert.strictEqual(removed, 0, '沒有重複應該回傳 0');
});

test('deduplicateMasterUnits: 跨多個 type 都能 dedup', () => {
    const win = loadIndex();
    const dupMaster = JSON.parse('{"會考複習":{"數學":{"materials":{"default":{"instances":[{"name":"d","vols":{"第一冊":[{"id":"u1","name":"數與數線","start":12,"end":25},{"id":"u1","name":"數與數線","start":12,"end":25}]}}]},"考古題":{"instances":[{"name":"d","vols":{"考古":[{"id":"u1","name":"考古題","start":1,"end":10},{"id":"u1","name":"考古題","start":1,"end":10}]}}]}}}}}');
    setupMaster(win, dupMaster);
    const removed = win.deduplicateMasterUnits('user_test');
    assert.strictEqual(removed, 2, '跨 type 應該都 dedup (default + 考古題 各 1)');
});

test('v1.5.180 s1: 沒 id 欄位時用 name+start+end 備用 key', () => {
    const win = loadIndex();
    setupMaster(win, TEST_MASTER_NO_ID);
    const removed = win.deduplicateMasterUnits('user_test');
    assert.strictEqual(removed, 1, '應該移除 1 個重複 (U1 沒 id 但 name+start+end 同)');
    const ins = win.multiData.user_test.masters['會考複習']['英文'].materials.default.instances;
    assert.strictEqual(ins[0].vols['第一冊'].length, 2, '應該剩 2 個');
});

test('v1.5.180 s2: 跨 instance dedup - 麻辣保留, (第一冊全冊) 移除重複', () => {
    const win = loadIndex();
    setupMaster(win, TEST_MASTER_CROSS_INSTANCE);
    const removed = win.deduplicateMasterUnits('user_test');
    assert.strictEqual(removed, 2, '應該移除 2 個跨 instance 重複');
    const ins = win.multiData.user_test.masters['會考複習']['英文'].materials['複習講義'].instances;
    assert.strictEqual(ins[0].vols['第一冊'].length, 2, '麻辣保留 2 個');
    assert.strictEqual(ins[1].vols['第一冊'].length, 0, '(第一冊全冊) 應該全被移除');
});
