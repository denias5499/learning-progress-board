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
    
    // Setup plan
    window.appPlans = [{
        id: 'plan1', name: 'Test',
        start: '2026-01-01', end: '2026-01-31',
        grid: {}
    }];
    
    let sel = doc.getElementById('planner-selector');
    if (!sel) { sel = doc.createElement('select'); sel.id = 'planner-selector'; doc.body.appendChild(sel); }
    const opt = doc.createElement('option'); opt.value = 'plan1'; opt.selected = true; sel.appendChild(opt);
    
    let catSel = doc.getElementById('wz-cat');
    if (!catSel) { catSel = doc.createElement('select'); catSel.id = 'wz-cat'; doc.body.appendChild(catSel); }
    catSel.value = cat;
    let misSel = doc.getElementById('wz-mis');
    if (!misSel) { misSel = doc.createElement('select'); misSel.id = 'wz-mis'; doc.body.appendChild(misSel); }
    misSel.value = mis;
    
    const master = window.multiData['user_A'].masters[cat];
    const masterGuoWen = master['國文'];
    const allUnits = window._collectSubjectUnits(masterGuoWen);
    
    // Show initial wzUpdateSubjects count for 國文
    window.wzUpdateSubjects();
    var gwBefore = window.wizardSubjects.find(function(ws){ return ws.name === '國文'; });
    console.log('=== BEFORE adding to grid ===');
    console.log('國文 availableUnits:', gwBefore.availableUnits.length);
    console.log('國文 master total:', allUnits.length);
    
    var taskUnitIds = gwBefore.availableUnits.slice(0, 5).map(function(u){ return u.id; });
    
    // Add 5 unit tasks to grid (in cat/mis)
    var runTime = Date.now();
    taskUnitIds.forEach(function(uid, idx) {
        var dStr = '2026-01-' + String(idx+1).padStart(2, '0');
        window.appPlans[0].grid[dStr] = [{
            id: 't'+idx,
            unitId: uid,
            unitName: gwBefore.availableUnits[idx].name,
            endPage: 10,
            isAuto: true,
            wizardRunId: 'r1',
            wizardRunTime: runTime,
            cat, mis
        }];
    });
    
    // Re-run wzUpdateSubjects (still on screen, but cache stale)
    window.wzUpdateSubjects();
    var gwAfterSched = window.wizardSubjects.find(function(ws){ return ws.name === '國文'; });
    console.log('\n=== AFTER scheduling 5 units ===');
    console.log('國文 availableUnits:', gwAfterSched.availableUnits.length);
    var schedCount = gwAfterSched.availableUnits.filter(function(u){return u.misMaxEnd>0;}).length;
    console.log('  其中已排過:', schedCount);
    
    // Now REVERT
    window.executeRevertWizard();
    capturedAlerts = [];
    
    // Re-run wzUpdateSubjects
    window.wzUpdateSubjects();
    var gwAfterRevert = window.wizardSubjects.find(function(ws){ return ws.name === '國文'; });
    console.log('\n=== AFTER revert ===');
    console.log('國文 availableUnits:', gwAfterRevert.availableUnits.length);
    var schedAfter = gwAfterRevert.availableUnits.filter(function(u){return u.misMaxEnd>0;}).length;
    console.log('  其中已排過:', schedAfter);
    
    console.log('\n=== 被刪掉的 unit (前 5 個原本有,撤回後) ===');
    var beforeIds = new Set(gwBefore.availableUnits.map(function(u){return u.id;}));
    var afterIds = new Set(gwAfterRevert.availableUnits.map(function(u){return u.id;}));
    
    var missing = [];
    beforeIds.forEach(function(uid){
        if (!afterIds.has(uid)) {
            var u = gwBefore.availableUnits.find(function(x){return x.id === uid;});
            missing.push(u.name + ' (' + uid.substring(0,8) + ')');
        }
    });
    console.log('Missing after revert:', missing);
    
    process.exit(0);
}, 2500);
