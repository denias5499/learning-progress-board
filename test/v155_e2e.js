const { JSDOM } = require('jsdom');

// ── jsdom rAF 迴圈會讓 node --test 的 event loop 永不結束 → 收集後統一 close ──
const _allDoms = [];
const { JSDOM: _JSDOM } = require('jsdom');
function _mkDom(...args) { const d = new _JSDOM(...args); _allDoms.push(d); return d; }
require('node:test').after(() => { _allDoms.forEach(d => { try { d.window.close(); } catch (e) {} }); });

const path = require('path');
const fs = require('fs');;

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');

const dom = _mkDom(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    url: 'http://localhost:8000/'
});

let capturedAlerts = [];
const window = dom.window;
window.alert = (m) => { capturedAlerts.push(m); };

setTimeout(() => {
    const doc = window.document;
    const cat = '會考複習';
    const mis = '二模';
    
    // Setup plan with 12 tasks across 3 units
    const realMissionUnits = window.appMissions[cat][mis];
    
    window.appPlans = [{
        id: 'plan1', name: 'Test',
        start: '2026-01-01', end: '2026-01-31',
        grid: {}, lastWizardRunTime: Date.now()
    }];
    
    const runTime = Date.now();
    let taskId = 1;
    // 3 units, 4 tasks each
    realMissionUnits.slice(0, 3).forEach((uid, idx) => {
        for (let day = 1; day <= 4; day++) {
            const dStr = '2026-01-' + String(day).padStart(2, '0');
            if (!window.appPlans[0].grid[dStr]) window.appPlans[0].grid[dStr] = [];
            window.appPlans[0].grid[dStr].push({
                id: 't'+(taskId++),
                unitId: uid,
                unitName: 'Test Unit ' + (idx+1),  // name from master
                endPage: 10,
                isAuto: true,
                wizardRunId: 'r1',
                wizardRunTime: runTime,
                cat, mis
            });
        }
    });
    
    let sel = doc.getElementById('planner-selector');
    if (!sel) { sel = doc.createElement('select'); sel.id = 'planner-selector'; doc.body.appendChild(sel); }
    const opt = doc.createElement('option'); opt.value = 'plan1'; opt.selected = true; sel.appendChild(opt);
    
    // Revert
    window.executeRevertWizard();
    
    console.log('=== Captured alerts ===');
    capturedAlerts.forEach((a, i) => console.log('[Alert ' + i + ']\n' + a + '\n---'));
    
    process.exit(0);
}, 2500);
