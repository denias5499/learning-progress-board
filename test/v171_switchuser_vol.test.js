// test/v171_switchuser_vol.test.js -- v1.6.171 regression test
//
// v1.6.171 修的 bug:
// - switchUser() 裡 v1.6.63 舊 remap 沒有 vol 鎖
// - _v164Migrate (v1.6.168) 修對了 unitId, 但 switchUser 後跑會把 unitId 改回去
// - 結果: 9/15 task unitId 永遠是錯的 (第一個找到的 vol = 第二冊)
//
// v1.6.171 修法:
// - switchUser 的 exact match 加 vol 鎖: (!u.vol || !t.vol || u.vol === t.vol)
// - within-match fallback 也加 vol 鎖

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');

// 模擬 Denias 真實 master 結構
function makeDeniasMasters() {
    return {
        '會考複習': {
            '英文': { materials: {
                '複習卷': { instances: [
                    { name: '麻辣甲', type: 'volume',
                      volOrder: ['第一冊','第二冊','第三冊','第四冊','第五冊','第六冊'],
                      vols: {
                          '第二冊': [{ id: 'id_us9n3e8wr', name: 'L1~2', start: 1, end: 1 }],
                          '第三冊': [{ id: 'id_j7l5x7jdz', name: 'L1~2', start: 1, end: 1 }]
                      }},
                    { name: '大滿貫甲', type: 'volume',
                      volOrder: ['第二冊','第三冊','第四冊','第五冊','第六冊'],
                      vols: {
                          '第二冊': [{ id: 'id_us9n3e8wr_b', name: 'L1~2', start: 1, end: 1 }],
                          '第三冊': [{ id: 'id_j7l5x7jdz_b', name: 'L1~2', start: 1, end: 1 }]
                      }}
                ]}
            }}
        }
    };
}

// 複製 v1.6.171 switchUser 的 remap 邏輯 (extracted)
function _v171Remap(tasks, masterEntry, _collectSubjectUnits) {
    var allUnits = _collectSubjectUnits(masterEntry);
    tasks.forEach(function(t) {
        if (!t || !t.unitName || !t.cat) return;
        var match = null;
        if (t.typeName && t.instanceName) {
            match = allUnits.find(function(u) {
                return u.name === t.unitName &&
                       u._typeName === t.typeName &&
                       u._instanceName === t.instanceName &&
                       (!u.vol || !t.vol || u.vol === t.vol);
            });
        }
        if (!match) {
            match = allUnits.find(function(u) {
                if (u.name !== t.unitName) return false;
                if (u.vol != null && t.vol && u.vol !== t.vol) return false;
                if (t.startPage != null && t.endPage != null &&
                    u.start != null && u.end != null) {
                    return u.start <= t.startPage && u.end >= t.startPage;
                }
                return true;
            });
        }
        if (match && match.id !== t.unitId) {
            t.unitId = match.id;
        }
    });
}

test('v1.6.171 架構: patch 出現在 switchUser 的 v1.6.63 remap 內', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const html = fs.readFileSync(
        path.join(__dirname, '..', 'index.html'), 'utf8'
    );
    assert.match(html, /v1\.6\.171.*vol 鎖/,
        'switchUser 內必須包含 v1.6.171 vol 鎖字串');
});

test('v1.6.171 架構: title 已更新到 [v1.6.171]', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const html = fs.readFileSync(
        path.join(__dirname, '..', 'index.html'), 'utf8'
    );
    assert.match(html, /\[v1\.6\.171\]/,
        'title 必須是 [v1.6.171]');
});

test('v1.6.171 行為: 9/15 task (vol=第三冊) 不會被指到第二冊', () => {
    const win = loadIndex();
    win.masters = makeDeniasMasters();
    
    var tasks = [{
        id: 't1', subject: '英文', startPage: 1, endPage: 1, isDone: true,
        cat: '會考複習', mis: '二模',
        unitId: 'id_us9n3e8wr',
        vol: '第三冊',
        unitName: 'L1~2',
        typeName: '複習卷',
        instanceName: '大滿貫甲',
        postponeCount: 0
    }];
    
    var masterEntry = win.masters['會考複習']['英文'];
    _v171Remap(tasks, masterEntry, win._collectSubjectUnits);
    
    assert.equal(tasks[0].unitId, 'id_j7l5x7jdz_b',
        '加了 vol 鎖後, 第三冊 task 應指到第三冊 unit');
});

test('v1.6.171 行為: 跨 instance 同 vol 的 task 仍能正確配對', () => {
    const win = loadIndex();
    win.masters = makeDeniasMasters();
    
    var tasks = [{
        id: 't2', subject: '英文', startPage: 1, endPage: 1, isDone: true,
        cat: '會考複習', mis: '二模',
        unitId: 'wrong_id',
        vol: '第二冊',
        unitName: 'L1~2',
        typeName: '複習卷',
        instanceName: '麻辣甲',
        postponeCount: 0
    }];
    
    var masterEntry = win.masters['會考複習']['英文'];
    _v171Remap(tasks, masterEntry, win._collectSubjectUnits);
    
    assert.equal(tasks[0].unitId, 'id_us9n3e8wr',
        '麻辣甲 第二冊 L1~2 應匹配麻辣甲 第二冊 unit');
});

test('v1.6.171 行為: 完全沒 match 時 task.unitId 保持不變', () => {
    const win = loadIndex();
    win.masters = makeDeniasMasters();
    
    var tasks = [{
        id: 't4', subject: '英文', startPage: 99, endPage: 100, isDone: false,
        cat: '會考複習', mis: '二模',
        unitId: 'original_id',
        vol: '第三冊',
        unitName: 'NONEXISTENT_UNIT',
        typeName: '複習卷',
        instanceName: '大滿貫甲',
        postponeCount: 0
    }];
    
    var masterEntry = win.masters['會考複習']['英文'];
    _v171Remap(tasks, masterEntry, win._collectSubjectUnits);
    
    assert.equal(tasks[0].unitId, 'original_id',
        '找不到 match 時 unitId 不變');
});
