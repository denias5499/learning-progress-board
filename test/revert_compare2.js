const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('/mnt/my_book/Denias/projects/learning-progress-board/index.html', 'utf-8');

const dom = new JSDOM(html, {
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
    
    // Get available units for 國文 in mission 二模
    var mTree = window.buildMissionTree(cat, mis);
    var subs = Object.keys(mTree);
    var gwUnits = mTree['國文'] ? mTree['國文'].items : {};
    var gwTotal = 0;
    Object.keys(gwUnits).forEach(function(v){ gwTotal += gwUnits[v].length; });
    
    var schedMapBefore = window.getScheduleMapFromCache(cat, mis);
    console.log('=== BEFORE adding to grid ===');
    console.log('國文 availableUnits (mission 二模):', gwTotal);
    console.log('  其中 maxEnd > 0:', Object.keys(schedMapBefore).length);
    
    // Add 3 tasks to grid (3 國文 units in mission 二模)
    var runTime = Date.now();
    var uArr = [];
    Object.keys(gwUnits).forEach(function(v){ uArr = uArr.concat(gwUnits[v]); });
    uArr.slice(0, 3).forEach(function(u, idx){
        var dStr = '2026-01-' + String(idx+1).padStart(2, '0');
        window.appPlans[0].grid[dStr] = [{
            id: 't'+idx,
            unitId: u.id,
            unitName: u.name,
            endPage: 10,
            isAuto: true,
            wizardRunId: 'r1',
            wizardRunTime: runTime,
            cat, mis
        }];
    });
    
    window.invalidateSchedCache();
    var schedMapAfter = window.getScheduleMapFromCache(cat, mis);
    var schedCount = Object.keys(schedMapAfter).filter(function(uid){return schedMapAfter[uid].misMaxEnd>0;}).length;
    console.log('\n=== AFTER scheduling 3 units ===');
    console.log('schedMap size:', Object.keys(schedMapAfter).length, ', misMaxEnd>0:', schedCount);
    
    // Now REVERT
    capturedAlerts = [];
    window.executeRevertWizard();
    
    window.invalidateSchedCache();
    var schedMapRevert = window.getScheduleMapFromCache(cat, mis);
    var schedCountRevert = Object.keys(schedMapRevert).filter(function(uid){return schedMapRevert[uid].misMaxEnd>0;}).length;
    console.log('\n=== AFTER revert ===');
    console.log('schedMap size:', Object.keys(schedMapRevert).length, ', misMaxEnd>0:', schedCountRevert);
    console.log('Grid still has keys:', Object.keys(window.appPlans[0].grid).length);
    
    console.log('\n=== Master 國文 total units ===');
    var master = window.multiData['user_A'].masters[cat]['國文'];
    var allMaster = window._collectSubjectUnits(master);
    console.log('Master 國文:', allMaster.length);
    
    console.log('\n=== Mission 二模 國文 unitIds ===');
    var m2 = window.appMissions[cat][mis];
    var m2GuoWen = m2.filter(function(uid){ 
        var u = allMaster.find(function(x){return x.id === uid;});
        return u;
    });
    console.log('Mission 二模 國文:', m2GuoWen.length);
    
    process.exit(0);
}, 2500);
