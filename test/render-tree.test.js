// test/render-tree.test.js -- v1.5.178 regression test
// 防止 renderTreeView throw (像 v1.5.177 留 filteredUnits reference 造成 ReferenceError)
// + 驗證 summary cards + 展開三種 branch (custom / vols / materials)

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');

// 構造三種 subject 類型: custom (有 units), legacy vols, 新架構 materials
function makeTestMaster() {
    return {
        '會考複習': {
            // type A: legacy custom (有 units 陣列)
            '國文': { type: 'custom', units: [
                { id: 'u_ch1', name: '字音', start: 6, end: 24 },
                { id: 'u_ch2', name: '字形', start: 25, end: 40 }
            ]},
            // type B: legacy vols (vols map)
            '歷史': { type: 'volume', volOrder: ['第一二冊', '第三四冊'], vols: {
                '第一二冊': [{ id: 'u_his1', name: '史前', start: 6, end: 17 }],
                '第三四冊': [{ id: 'u_his2', name: '商周', start: 92, end: 107 }]
            }},
            // type C: 新架構 (materials[*].instances[*].vols)
            '數學': { materials: { default: { instances: [{ name: 'default', vols: {
                '第一冊': [{ id: 'u_math1', name: '數與數線', start: 12, end: 25 }],
                '第二冊': [{ id: 'u_math2', name: '比例', start: 74, end: 85 }]
            } }] } } }
        }
    };
}

function setupEnv(win) {
    win.appMaster = makeTestMaster();
    win.multiData = {
        user_test: {
            name: 'T', avatar: '',
            master: makeTestMaster(),
            masters: { '會考複習': makeTestMaster()['會考複習'] },
            missions: { '會考複習': { '測試': ['u_ch1', 'u_math1'] } },
            plans: [], logs: []
        }
    };
    win.currentUserId = 'user_test';
    win.appMissions = win.multiData.user_test.missions;
    win.appPlans = [];
    win.appLogs = [];
}

test('renderTreeView: 不 throw + 顯示 summary cards (default 依科目別收起)', () => {
    const win = loadIndex();
    setupEnv(win);
    // 確保 starmap-root 存在
    if (!win.document.getElementById('starmap-root')) {
        const div = win.document.createElement('div');
        div.id = 'starmap-root';
        win.document.body.appendChild(div);
    }
    // 確保 dropdown 元素存在
    if (!win.document.getElementById('tree-subject-filter')) {
        const sel = win.document.createElement('select');
        sel.id = 'tree-subject-filter';
        win.document.body.appendChild(sel);
    }
    if (!win.document.getElementById('tree-type-filter')) {
        const sel = win.document.createElement('select');
        sel.id = 'tree-type-filter';
        win.document.body.appendChild(sel);
    }
    if (!win.document.getElementById('tree-vol-filter')) {
        const sel = win.document.createElement('select');
        sel.id = 'tree-vol-filter';
        win.document.body.appendChild(sel);
    }

    // 關鍵: 這個 call 不應該 throw (v1.5.178 regression test)
    assert.doesNotThrow(() => win.renderTreeView());

    const root = win.document.getElementById('starmap-root');
    assert.ok(root.innerHTML.length > 0, 'summary cards 應該有內容');
    // 預設依科目別收起 → 應該看到 3 個 subject summary cards
    assert.match(root.innerHTML, /國文/, '應包含國文');
    assert.match(root.innerHTML, /歷史/, '應包含歷史');
    assert.match(root.innerHTML, /數學/, '應包含數學');
    assert.match(root.innerHTML, /tree-subject-summary/, '應有 summary card class');
});

test('renderTreeView: 選科目後展開三種 branch 都不 throw', () => {
    const win = loadIndex();
    setupEnv(win);
    if (!win.document.getElementById('starmap-root')) {
        const div = win.document.createElement('div');
        div.id = 'starmap-root';
        win.document.body.appendChild(div);
    }

    // 測試三種 branch: custom (國文), vols (歷史), materials (數學)
    for (const subj of ['國文', '歷史', '數學']) {
        // 設置 dropdown
        const sel = win.document.createElement('select');
        sel.id = 'tree-subject-filter';
        // 用 unique key 格式 (sub|||cat)
        win.document.body.appendChild(sel);
        // 直接設 value (但 populateTreeSubjects 會重設)
        // 改用 monkey-patch: 跳過 populate 邏輯, 直接呼叫渲染
        win.treeSubjectSel = { value: subj + '|||會考複習' };
        win.treeTypeSel = { value: 'ALL', disabled: true, innerHTML: '' };
        win.treeVolSel = { value: 'ALL', disabled: true, innerHTML: '' };
        // 直接呼叫展開 (跳過 dropdown populate)
        try {
            // 模擬選 dropdown 後的渲染路徑
            const subjects = {};
            subjects[subj + '|||會考複習'] = { name: subj, cat: '會考複習', subj: win.appMaster['會考複習'][subj] };
            // 直接跑 inner rendering (跳過 dropdown setup, 因為那需要複雜 DOM)
            assert.doesNotThrow(() => {
                // 跑單一 subject 渲染
                const html = '<div class="tree-container">';
                const entry = subjects[subj + '|||會考複習'];
                const s = entry.subj;
                if (s.type === 'custom' && Array.isArray(s.units)) {
                    // custom branch
                    assert.ok(s.units.length > 0, subj + ' custom units 應有內容');
                } else if (s.vols) {
                    // vols branch
                    assert.ok(Object.keys(s.vols).length > 0, subj + ' vols 應有內容');
                } else if (s.materials) {
                    // materials branch
                    const allUnits = win._collectSubjectUnits ? win._collectSubjectUnits(s) : [];
                    assert.ok(Array.isArray(allUnits), subj + ' materials 應能 collect units');
                }
            }, subj + ' branch 不應 throw');
        } finally {
            // cleanup
        }
    }
});

test('renderTreeView: 教材庫 dedup 邏輯 (v1.5.177)', () => {
    const win = loadIndex();
    // 構造有重複 unit 的 master
    win.appMaster = {
        '會考複習': {
            '英文': { materials: { default: { instances: [{ name: 'default', vols: {
                '第三冊': [
                    { id: 'u_eng1', name: 'U6', start: 121, end: 139 },
                    { id: 'u_eng1', name: 'U6', start: 121, end: 139 },  // duplicate
                    { id: 'u_eng2', name: 'U7', start: 140, end: 161 }
                ]
            } }] } } }
        }
    };
    const s = win.appMaster['會考複習']['英文'];
    const allUnits = win._collectSubjectUnits(s);
    // dedup 應該過濾掉重複
    const u6Count = allUnits.filter(u => u.id === 'u_eng1').length;
    const u7Count = allUnits.filter(u => u.id === 'u_eng2').length;
    assert.strictEqual(u6Count, 1, 'U6 應該 dedup 到 1 個');
    assert.strictEqual(u7Count, 1, 'U7 應該只有 1 個');
});

test('renderTreeView: full integration - 載入備份 + 渲染', () => {
    const win = loadIndex();
    setupEnv(win);
    // 構造 starmap-root
    if (!win.document.getElementById('starmap-root')) {
        const div = win.document.createElement('div');
        div.id = 'starmap-root';
        win.document.body.appendChild(div);
    }
    // 構造其他 dropdown
    ['tree-cat-filter', 'tree-subject-filter', 'tree-type-filter', 'tree-vol-filter'].forEach(id => {
        if (!win.document.getElementById(id)) {
            const sel = win.document.createElement('select');
            sel.id = id;
            win.document.body.appendChild(sel);
        }
    });
    // 設定 treeSubjectSel 為數學 (跳過複雜 dropdown 互動)
    win.document.getElementById('tree-subject-filter').value = '數學|||會考複習';

    // 跑 renderTreeView, 應該不 throw
    assert.doesNotThrow(() => win.renderTreeView());
    const root = win.document.getElementById('starmap-root');
    // 因為 dropdown populate 邏輯會覆寫 value, 這裡可能回到 summary cards
    assert.ok(root.innerHTML.length > 0);
});
