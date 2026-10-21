const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('/mnt/my_book/Denias/projects/learning-progress-board/index.html', 'utf-8');

const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    url: 'http://localhost:8000/'
});

const window = dom.window;
window.alert = (m) => console.log('ALERT:', String(m).substring(0, 100));

setTimeout(() => {
    const doc = window.document;
    const cat = '會考複習';
    const mis = '二模';
    
    // Setup plan with tasks for ALL 國文 units (21 個)
    const realMissionUnits = window.appMissions[cat][mis];
    
    // Get 國文 unit ids from master
    var chineseMaster = window.multiData['user_A'].masters[cat]['國文'];
    var chineseUnits = window._collectSubjectUnits(chineseMaster);
    console.log('Master 國文 units:', chineseUnits.length, chineseUnits.slice(0, 3).map(u => u.id));
    
    var planUnits = chineseUnits.slice(0, 12);  // first 12 units
    
    window.appPlans = [{
        id: 'plan1', name: 'Test',
        start: '2026-01-01', end: '2026-01-31',
        grid: {}, lastWizardRunTime: Date.now()
    }];
    
    const runTime = Date.now();
    let taskId = 1;
    planUnits.forEach((unit, idx) => {
        const day1 = '2026-01-' + String(1 + idx).padStart(2, '0');
        const day2 = '2026-01-' + String(2 + idx).padStart(2, '0');
        if (!window.appPlans[0].grid[day1]) window.appPlans[0].grid[day1] = [];
        if (!window.appPlans[0].grid[day2]) window.appPlans[0].grid[day2] = [];
        window.appPlans[0].grid[day1].push({ id: 't'+(taskId++), unitId: unit.id, endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat, mis });
        window.appPlans[0].grid[day2].push({ id: 't'+(taskId++), unitId: unit.id, endPage: 20, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat, mis });
    });
    
    let sel = doc.getElementById('planner-selector');
    if (!sel) { sel = doc.createElement('select'); sel.id = 'planner-selector'; doc.body.appendChild(sel); }
    const opt = doc.createElement('option'); opt.value = 'plan1'; opt.selected = true; sel.appendChild(opt);
    
    let wzCat = doc.getElementById('wz-cat');
    let wzMis = doc.getElementById('wz-mis');
    if (!wzCat) { wzCat = doc.createElement('select'); wzCat.id = 'wz-cat'; doc.body.appendChild(wzCat); }
    if (!wzMis) { wzMis = doc.createElement('select'); wzMis.id = 'wz-mis'; doc.body.appendChild(wzMis); }
    const cOpt = doc.createElement('option'); cOpt.value = cat; cOpt.selected = true; wzCat.appendChild(cOpt);
    const mOpt = doc.createElement('option'); mOpt.value = mis; mOpt.selected = true; wzMis.appendChild(mOpt);
    
    // STEP 1: 載入, 看 國文 availableUnits
    window.wzUpdateSubjects();
    var ws0 = window.wizardSubjects.find(ws => ws.name === '國文');
    console.log('\n=== STEP 1: 國文 availableUnits:', ws0.availableUnits.length, '===');
    
    // STEP 2: 撤回
    window.executeRevertWizard();
    
    // STEP 3: 再載入
    window.wzUpdateSubjects();
    var ws1 = window.wizardSubjects.find(ws => ws.name === '國文');
    console.log('\n=== STEP 3: 國文 availableUnits (after revert):', ws1.availableUnits.length, '===');
    
    // 比對: 撤回前可見的 vs 撤回後可見的
    var beforeIds = new Set(ws0.availableUnits.map(u => u.id));
    var afterIds = new Set(ws1.availableUnits.map(u => u.id));
    
    var hiddenAfter = [];
    ws0.availableUnits.forEach(u => { if (!afterIds.has(u.id)) hiddenAfter.push(u.id); });
    var appearedAfter = [];
    ws1.availableUnits.forEach(u => { if (!beforeIds.has(u.id)) appearedAfter.push(u.id); });
    
    console.log('  撤回前有,撤回後不見:', hiddenAfter.length, '個', hiddenAfter.length > 0 ? hiddenAfter.join(',') : '');
    console.log('  撤回後才出現:', appearedAfter.length, '個');
    
    // Render DOM
    window.renderWizardSubjects();
    var container = doc.getElementById('wz-step2-container');
    var firstSubj = container.querySelector('.vertical-scroll');
    if (firstSubj) {
        var cbs = firstSubj.querySelectorAll('input.wz-unit-cb');
        console.log('\n=== STEP 4: DOM 國文區段 unit checkbox 數:', cbs.length, '===');
    }
    
    process.exit(0);
}, 2500);
