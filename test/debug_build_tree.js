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

setTimeout(() => {
    const doc = window.document;
    
    const units = [];
    for (let i = 1; i <= 12; i++) {
        units.push({ id: '國文-u' + i, name: 'Unit ' + i, start: (i-1)*10 + 1, end: i*10 });
    }
    
    window.multiData = {
        'u1': { masters: { '會考複習': { '國文': { materials: { '講義': { instances: [{ name: '第一冊', vols: { 'vol1': units } }] } } } } } }
    };
    window.currentUserId = 'u1';
    window.appMissions = { '會考複習': { '二模': units.map(u => u.id) } };
    
    // Initial
    console.log('Initial buildMissionTree:');
    var t1 = window.buildMissionTree('會考複習', '二模');
    console.log('  tree:', JSON.stringify(t1).substring(0, 200));
    
    // Revert (no actual grid so no-op)
    console.log('\nAfter no-op revert:');
    var t2 = window.buildMissionTree('會考複習', '二模');
    console.log('  tree:', JSON.stringify(t2).substring(0, 200));
    
    // _collectSubjectUnitsCache should be WeakMap, but let me check if it might have stale ref
    
    // Set up similar situation to Denias:
    // - 1: plan with 1 task
    // - 2: revert
    // - 3: buildMissionTree fails
    window.appPlans = [{ id: 'plan1', name: 'Test', grid: {}, lastWizardRunTime: Date.now() }];
    const runTime = Date.now();
    window.appPlans[0].grid['2026-01-01'] = [
        { id: 't1', unitId: '國文-u1', endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: '會考複習', mis: '二模' }
    ];
    
    let sel = doc.getElementById('planner-selector');
    if (!sel) { sel = doc.createElement('select'); sel.id = 'planner-selector'; doc.body.appendChild(sel); }
    const opt = doc.createElement('option'); opt.value = 'plan1'; opt.selected = true; sel.appendChild(opt);
    
    console.log('\n--- After setup plan ---');
    var t3 = window.buildMissionTree('會考複習', '二模');
    console.log('  tree keys:', Object.keys(t3));
    if (Object.keys(t3).length > 0) {
        console.log('  tree[\'國文\']:', JSON.stringify(t3['國文']).substring(0, 300));
    }
    
    // Now call executeRevertWizard
    window.executeRevertWizard();
    
    console.log('\n--- After revert ---');
    var t4 = window.buildMissionTree('會考複習', '二模');
    console.log('  tree keys:', Object.keys(t4));
    if (Object.keys(t4).length > 0) {
        console.log('  tree[\'國文\']:', JSON.stringify(t4['國文']).substring(0, 300));
    }
    
    // Inspect _collectSubjectUnitsCache
    // It's WeakMap, can't directly inspect, but check the 國文 reference
    console.log('\n--- master[\'國文\'] reference check ---');
    var master = window.multiData['u1'].masters['會考複習']['國文'];
    console.log('  master ref type:', typeof master);
    console.log('  master.materials exists:', !!master.materials);
    var result = window._collectSubjectUnits(master);
    console.log('  _collectSubjectUnits(master) length:', result.length);
    
    process.exit(0);
}, 2500);
