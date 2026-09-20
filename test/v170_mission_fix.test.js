// test/v170_mission_fix.test.js -- v1.6.170 regression test
//
// v1.6.170 修的 bug:
// - missions['會考複習']['二模'][35] 指向 'id_us9n3e8wr' (第二冊 L1~2)
// - 但 Plan.grid[9/15] 的 task.unitName='L1~2' vol=第三冊
// - tree 顯示綠點時依據 mission template (user.missions) 而不是 plan.grid
// - 結果: 樹狀圖綠點掛在第二冊 L1~2, 而不是第三冊 L1~2
//
// v1.6.170 修法:
// - 在 _v164Migrate 結尾加 idempotent guard
// - 如果 missions.會考複習.二模[35] === 'id_us9n3e8wr'
//   就改成 'id_j7l5x7jdz' (第三冊 L1~2)
// - 已對的資料 (用戶 reload 過或本來就對的) 不會被影響

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');

// 模擬 Denias 真實 master 結構
function makeDeniasMasters() {
    return {
        '會考複習': {
            '英文': { materials: {
                '複習卷': { instances: [{
                    name: '大滿貫甲', type: 'volume',
                    volOrder: ['第二冊','第三冊'],
                    vols: {
                        '第二冊': [{ id: 'id_us9n3e8wr', name: 'L1~2', start: 1, end: 1 }],
                        '第三冊': [{ id: 'id_j7l5x7jdz', name: 'L1~2', start: 1, end: 1 }]
                    }
                }]}
            }}
        }
    };
}

// 建立一個 mission template with bug at [35]
function makeBuggyMissions() {
    return {
        '會考複習': {
            '二模': new Array(40).fill('id_us9n3e8wr')  // 全填第二冊 (bug 狀態)
        }
    };
}

function makeCorrectMissions() {
    return {
        '會考複習': {
            '二模': new Array(40).fill('id_j7l5x7jdz')  // 全填第三冊 (正確狀態)
        }
    };
}

test('v1.6.170 架構: patch 出現在 _v164Migrate 內 (v1.6.170 console.log 字串)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const html = fs.readFileSync(
        path.join(__dirname, '..', 'index.html'), 'utf8'
    );
    assert.match(html, /v1\.6\.170:.*fix missions\.會考複習\.二模\[35\]/,
        'index.html 必須包含 v1.6.170 mission fix 字串');
});

test('v1.6.170 架構: title 已更新到 [v1.6.170]', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const html = fs.readFileSync(
        path.join(__dirname, '..', 'index.html'), 'utf8'
    );
    assert.match(html, /\[v1\.6\.(17[0-9]|18[0-9]|19[0-9])\]/,
        'title 必須 >= [v1.6.170]');
});

test('v1.6.170 行為: buggy missions 跑完 _v164Migrate 後 [35] 被修正', () => {
    const win = loadIndex();
    win.masters = makeDeniasMasters();
    win.multiData = {
        config: {
            name: 'T', avatar: '',
            master: win.masters['會考複習'],
            masters: win.masters,
            missions: makeBuggyMissions(),
            plans: [],
            logs: []
        }
    };
    win.currentUserId = 'config';
    win.appMissions = win.multiData.config.missions;

    win._v164Migrate('config');
    
    const arr = win.multiData.config.missions['會考複習']['二模'];
    assert.equal(arr[35], 'id_j7l5x7jdz',
        '[35] 應被改成 id_j7l5x7jdz (第三冊 L1~2)');
    assert.equal(win.multiData.config._v170_mission_fix_applied, true,
        '應記 _v170_mission_fix_applied=true');
});

test('v1.6.170 行為: 已是正確狀態的 missions 不會被影響 (idempotent)', () => {
    const win = loadIndex();
    win.masters = makeDeniasMasters();
    const missions = makeCorrectMissions();
    // 額外驗證: 故意把 [35] 設成 'id_j7l5x7jdz' 然後跑 migrate, 應保持不變
    win.multiData = {
        config: {
            name: 'T', avatar: '',
            master: win.masters['會考複習'],
            masters: win.masters,
            missions: missions,
            plans: [],
            logs: []
        }
    };
    win.currentUserId = 'config';
    win.appMissions = win.multiData.config.missions;

    win._v164Migrate('config');
    
    const arr = win.multiData.config.missions['會考複習']['二模'];
    assert.equal(arr[35], 'id_j7l5x7jdz',
        '[35] 應保持 id_j7l5x7jdz (不會誤改)');
    assert.notEqual(win.multiData.config._v170_mission_fix_applied, true,
        '沒套用 fix 時不應設 _v170_mission_fix_applied=true');
});

test('v1.6.170 行為: missions 沒有 會考複習/二模 時不 throw', () => {
    const win = loadIndex();
    win.masters = makeDeniasMasters();
    win.multiData = {
        config: {
            name: 'T', avatar: '',
            master: win.masters['會考複習'],
            masters: win.masters,
            missions: {},  // 完全沒 missions
            plans: [],
            logs: []
        }
    };
    win.currentUserId = 'config';
    win.appMissions = {};

    // 應不 throw
    win._v164Migrate('config');
    
    assert.equal(win.multiData.config.missions['會考複習'], undefined,
        '沒 missions 時不應建立假資料');
});
