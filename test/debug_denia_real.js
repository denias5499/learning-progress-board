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
    
    const units = [];
    for (let i = 1; i <= 12; i++) {
        units.push({ id: '國文-u' + i, name: 'Unit ' + i, start: (i-1)*10 + 1, end: i*10 });
    }
    
    window.multiData = {
        'u1': { masters: { '會考複習': { '國文': { materials: { '講義': { instances: [{ name: '第一冊', vols: { 'vol1': units } }] } } } } } }
    };
    window.currentUserId = 'u1';
    window.appMissions = { '會考複習': { '二模': units.map(u => u.id) } };
    
    window.appPlans = [{ id: 'plan1', name: 'Test', grid: {}, lastWizardRunTime: Date.now() }];
    const runTime = Date.now();
    window.appPlans[0].grid['2026-01-01'] = [
        { id: 't1', unitId: '國文-u1', endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: '會考複習', mis: '二模' }
    ];
    
    let sel = doc.getElementById('planner-selector');
    if (!sel) { sel = doc.createElement('select'); sel.id = 'planner-selector'; doc.body.appendChild(sel); }
    const opt = doc.createElement('option'); opt.value = 'plan1'; opt.selected = true; sel.appendChild(opt);
    
    // Initial load
    var t1 = window.buildMissionTree('會考複習', '二模');
    console.log('Initial buildMissionTree keys:', Object.keys(t1));
    console.log('appMissions before revert:', JSON.stringify(window.appMissions).substring(0, 80));
    console.log('multiData.u1.masters[\'會考複習\'] keys:', Object.keys(window.multiData['u1'].masters['會考複習']));
    
    // Revert
    window.executeRevertWizard();
    
    console.log('\n--- After revert ---');
    console.log('appMissions after revert:', JSON.stringify(window.appMissions).substring(0, 80));
    console.log('multiData.u1.masters[\'會考複習\'] keys:', Object.keys(window.multiData['u1'].masters['會考複習'] || {}));
    
    var t2 = window.buildMissionTree('會考複習', '二模');
    console.log('After revert buildMissionTree keys:', Object.keys(t2));
    
    // Check if the user object is still there
    var user = window.multiData[window.currentUserId];
    console.log('multiData[currentUserId]:', user ? 'EXISTS' : 'NULL');
    if (user) {
        console.log('  user.masters exists:', !!user.masters);
        if (user.masters) {
            console.log('  user.masters[\'會考複習\']:', user.masters['會考複習'] ? 'EXISTS' : 'NULL');
        }
    }
    
    process.exit(0);
}, 2500);
