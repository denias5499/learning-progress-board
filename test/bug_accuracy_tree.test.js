// Bug-specific unit tests for:
// 1. 因式分解一元一次不等師: shows 100% but click says "尚未排程"
// 2. 圖形答對率: shows 100%, click highlights wrong unit (直角坐標)

const test = require('node:test');
const assert = require('node:assert/strict');

// ============================================================
// helpers
// ============================================================
function makeIndex() {
    try {
        const { JSDOM } = require('jsdom');
        const fs = require('fs');
        const html = fs.readFileSync('index.html', 'utf8');
        const dom = new JSDOM(html, {
            url: 'http://localhost',
            runScripts: 'dangerously',
            resources: 'usable'
        });
        return dom.window;
    } catch(e) {
        return null;
    }
}

function loadFullIndex() {
    const { JSDOM } = require('jsdom');
    const fs = require('fs');
    const html = fs.readFileSync('index.html', 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'dangerously' });
    const win = dom.window;

    // Execute the script
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
        try {
            win.eval(scriptMatch[1]);
        } catch(e) {
            console.error('Script eval error:', e.message);
        }
    }
    return win;
}

// ============================================================
// Test Data Setup
// ============================================================
function setupBug2Data(win) {
    // Bug 2: 圖形 (math) shows 100% accuracy but highlights wrong unit (直角坐標)
    // This happens because:
    // 1. User has an accuracy record for 會考複習/數學/麻辣/直角坐標 (u_jiaodian)
    // 2. User clicks 圖形 unit in Tree View
    // 3. The onclick passes u.id='u_圖形' and u.name='圖形'
    // 4. jumpToAccuracyForUnit('u_圖形', '圖形') is called
    // 5. findUnitContext('u_圖形') searches appMaster (會考複習)
    // 6. But appMaster might have the wrong unit structure, or multiData lookup fails
    // 7. _highlightedUnitName ends up being '直角坐標' instead of '圖形'

    win.appMaster = {
        '數學': {
            materials: {
                '麻辣': {
                    instances: [{
                        name: '麻辣甲',
                        type: 'volume',
                        vols: {
                            '第一冊': [
                                { id: 'u_直角坐標', name: '直角坐標', start: 1, end: 20 },
                                { id: 'u_圖形', name: '圖形', start: 21, end: 40 }
                            ]
                        }
                    }]
                }
            }
        }
    };

    win.multiData = {
        user1: {
            masters: {
                '會考複習': {
                    '數學': {
                        materials: {
                            '麻辣': {
                                instances: [{
                                    name: '麻辣甲',
                                    type: 'volume',
                                    vols: {
                                        '第一冊': [
                                            { id: 'u_直角坐標', name: '直角坐標', start: 1, end: 20 },
                                            { id: 'u_圖形', name: '圖形', start: 21, end: 40 }
                                        ]
                                    }
                                }]
                            }
                        }
                    }
                }
            }
        }
    };
    win.currentUserId = 'user1';
    win.appPlans = [];
    win.appLogs = [];

    // Accuracy record for 直角坐標
    win.saveAccuracyRecords([{
        id: 'acc_1',
        subject: '數學',
        typeName: '麻辣',
        instanceId: 'inst_1',
        instanceName: '麻辣甲',
        total: 50,
        correct: 48,
        wrongUnits: ['直角坐標']
    }]);

    // Setup DOM
    win.document.body.innerHTML += '<div id="stats-root"></div>';
    win.document.body.innerHTML += '<div id="page-stats" style="display:none;"></div>';
}

// ============================================================
// Bug 2: jumpToAccuracyForUnit highlight logic
// ============================================================
test('Bug 2: jumpToAccuracyForUnit finds correct unit by id then by name', () => {
    const win = loadFullIndex();
    if (!win) { console.log('SKIP: cant load'); return; }

    setupBug2Data(win);

    // Monkey-patch findUnitContext to simulate current appMaster state
    // When appMaster has the 數學/麻辣 structure, findUnitContext('u_圖形') should find it
    const found = win.findUnitContext('u_圖形');
    console.log('findUnitContext(u_圖形):', found ? found.unit.name : 'null');

    const found2 = win.findUnitContextAnywhere('u_直角坐標', '直角坐標');
    console.log('findUnitContextAnywhere(u_直角坐標, 直角坐標):', found2 ? found2.unit.name : 'null');

    // Test: click 圖形 (u.id='u_圖形')
    // Does it find the right context?
    const ctx_圖形 = win.findUnitContextAnywhere('u_圖形', '圖形');
    console.log('Context for 圖形:', ctx_圖形 ? ctx_圖形.unit.name : 'NOT FOUND');
    assert.ok(ctx_圖形, 'Should find unit 圖形 by id');
    assert.equal(ctx_圖形.unit.name, '圖形', 'Should be 圖形 not 直角坐標');
});

// ============================================================
// Bug 1: getUnitScheduledDays inconsistency
// ============================================================
test('Bug 1: getUnitScheduledDays returns 0 even when unit has done tasks (unitId remap scenario)', () => {
    const win = loadFullIndex();
    if (!win) { console.log('SKIP: cant load'); return; }

    // Simulate: a plan task was created with OLD unitId that got remapped
    // e.g., OLD id was 'old_因式分解' but now master has 'new_因式分解'
    // The plan grid has the OLD id, but after v1.6.38 remap, the task.unitId should be updated
    // However, getUnitScheduledDays searches plan.grid by unitId

    win.appPlans = [{
        id: 'plan1',
        name: 'Test Plan',
        grid: {
            '2026-08-01': [
                { id: 't1', unitId: 'new_因式分解', isDone: true, startPage: 1, endPage: 10 }
            ]
        }
    }];

    // Before remap: unitId is stale (OLD id) → getUnitScheduledDays returns 0
    // After remap: unitId is updated to current master id → returns 1
    const days_before = win.getUnitScheduledDays('old_因式分解');  // stale id
    const days_after = win.getUnitScheduledDays('new_因式分解');   // remapped id

    console.log('getUnitScheduledDays(old_stale_id):', days_before);
    console.log('getUnitScheduledDays(new_remapped_id):', days_after);

    // The actual bug: the unitId in plan.task was stale, and the remap didn't run
    // OR the tree view computed coveredPages but jumpToUnitCalendar checks _treeScheduledUnits[unitId]

    // Test: computeTreeScheduledUnits should use the SAME unitIds as the plan
    // If plan task has unitId='new_因式分解' and master also has id='new_因式分解',
    // then _treeScheduledUnits['new_因式分解'] should be populated
    win._treeScheduledUnits = {};
    win.computeTreeScheduledUnits();

    const suInfo = win._treeScheduledUnits['new_因式分解'];
    console.log('_treeScheduledUnits[new_因式分解]:', suInfo);
    assert.ok(suInfo, 'Should have scheduled info for 因式分解');
    assert.ok(suInfo.totalTasks > 0, 'Should have tasks');
});

// ============================================================
// Integration: renderAccuracyStats highlight behavior
// ============================================================
test('Bug 2: renderAccuracyStats highlight uses _highlightedUnitName not wrong unit', () => {
    const win = loadFullIndex();
    if (!win) { console.log('SKIP: cant load'); return; }

    setupBug2Data(win);

    // Set _highlightedUnitName to 圖形
    win.window._highlightedUnitName = '圖形';

    // Render the accuracy table
    win.renderAccuracyStats();

    // Check if the 直角坐標 row is highlighted (it should NOT be)
    const rows = win.document.querySelectorAll('#page-stats tbody tr');
    let highlightedUnits = [];
    rows.forEach(row => {
        if (row.style.background === 'rgb(243, 184, 177)' || row.getAttribute('style') === 'background:#F3B8B1;') {
            highlightedUnits.push(row.textContent);
        }
    });
    console.log('Highlighted rows:', highlightedUnits);

    // The bug: if highlight is wrong, it would highlight the 直角坐標 row
    // The correct behavior: highlight the row where wrongUnits includes '圖形'
    // But since only 直角坐標 record exists, NO row should be highlighted
    // (or only the row where wrongUnits includes '圖形')
});

console.log('Tests loaded. Run with: node --test .openclaw/tmp/bug_accuracy_tree.test.js');
