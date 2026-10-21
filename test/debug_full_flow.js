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
window.alert = (m) => console.log('ALERT:', String(m).substring(0, 200));

setTimeout(() => {
    const doc = window.document;
    
    // Use REAL user and mission (from jsdom auto-load)
    const uid = 'user_A';
    const cat = '會考複習';
    const mis = '二模';
    
    // Get real mission unitIds
    const unitIds = window.appMissions[cat][mis];
    console.log('Mission unitIds:', unitIds.slice(0, 3), '... (' + unitIds.length + ' total)');
    
    // Setup plan with tasks for these units
    window.appPlans = [{
        id: 'plan1', name: 'Test',
        start: '2026-01-01', end: '2026-01-31',
        grid: {}, lastWizardRunTime: Date.now()
    }];
    
    const runTime = Date.now();
    const firstFive = unitIds.slice(0, 5);
    firstFive.forEach((uid, i) => {
        window.appPlans[0].grid['2026-01-0' + (i+1)] = [
            { id: 't' + i, unitId: uid, endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat, mis }
        ];
    });
    
    // Set planner-selector
    let sel = doc.getElementById('planner-selector');
    if (!sel) { sel = doc.createElement('select'); sel.id = 'planner-selector'; doc.body.appendChild(sel); }
    const opt = doc.createElement('option'); opt.value = 'plan1'; opt.selected = true; sel.appendChild(opt);
    
    // Set wz-cat / wz-mis
    let wzCat = doc.getElementById('wz-cat');
    let wzMis = doc.getElementById('wz-mis');
    if (!wzCat) { wzCat = doc.createElement('select'); wzCat.id = 'wz-cat'; doc.body.appendChild(wzCat); }
    if (!wzMis) { wzMis = doc.createElement('select'); wzMis.id = 'wz-mis'; doc.body.appendChild(wzMis); }
    const cOpt = doc.createElement('option'); cOpt.value = cat; cOpt.selected = true; wzCat.appendChild(cOpt);
    const mOpt = doc.createElement('option'); mOpt.value = mis; mOpt.selected = true; wzMis.appendChild(mOpt);
    
    // Initial wzUpdateSubjects
    window.wzUpdateSubjects();
    console.log('\n=== Step 1: Before revert ===');
    console.log('  wizardSubjects count:', window.wizardSubjects.length);
    if (window.wizardSubjects[0]) {
        console.log('  ws[0].name:', window.wizardSubjects[0].name);
        console.log('  ws[0].availableUnits:', window.wizardSubjects[0].availableUnits.length);
    }
    
    // Revert
    console.log('\n=== Step 2: Revert ===');
    window.executeRevertWizard();
    
    // After revert - wzUpdateSubjects
    console.log('\n=== Step 3: After revert, re-wzUpdateSubjects ===');
    window.wzUpdateSubjects();
    console.log('  wizardSubjects count:', window.wizardSubjects.length);
    if (window.wizardSubjects[0]) {
        console.log('  ws[0].name:', window.wizardSubjects[0].name);
        console.log('  ws[0].availableUnits:', window.wizardSubjects[0].availableUnits.length);
    } else {
        console.log('  ❌ wizardSubjects EMPTY (the actual bug!)');
    }
    
    // Check buildMissionTree
    console.log('\n--- Direct buildMissionTree ---');
    var tree = window.buildMissionTree(cat, mis);
    console.log('  tree keys:', Object.keys(tree));
    if (tree['國文']) {
        var vols = Object.keys(tree['國文'].items);
        var volUnits = vols.map(v => tree['國文'].items[v].length);
        console.log('  國文 items:', vols.length, 'vols, total units:', volUnits.reduce((a,b) => a+b, 0));
    }
    
    process.exit(0);
}, 2500);
