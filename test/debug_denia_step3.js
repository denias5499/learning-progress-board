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
window.alert = (m) => console.log('ALERT:', String(m).substring(0, 250));

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
    
    let wzCat = doc.getElementById('wz-cat');
    let wzMis = doc.getElementById('wz-mis');
    if (!wzCat) { wzCat = doc.createElement('select'); wzCat.id = 'wz-cat'; doc.body.appendChild(wzCat); }
    if (!wzMis) { wzMis = doc.createElement('select'); wzMis.id = 'wz-mis'; doc.body.appendChild(wzMis); }
    const cOpt = doc.createElement('option'); cOpt.value = '會考複習'; cOpt.selected = true; wzCat.appendChild(cOpt);
    const mOpt = doc.createElement('option'); mOpt.value = '二模'; mOpt.selected = true; wzMis.appendChild(mOpt);
    
    window.wzUpdateSubjects();
    console.log('Before revert: subjects =', window.wizardSubjects.length, 'first =', window.wizardSubjects[0] ? window.wizardSubjects[0].availableUnits.length : 'N/A');
    
    window.executeRevertWizard();
    
    // Inspect state
    console.log('\n--- After revert ---');
    console.log('multiData:', JSON.stringify(window.multiData).substring(0, 100));
    console.log('currentUserId:', window.currentUserId);
    console.log('appMissions:', JSON.stringify(window.appMissions).substring(0, 100));
    console.log('wz-cat value:', window.el('wz-cat').value);
    console.log('wz-mis value:', window.el('wz-mis').value);
    
    // Test buildMissionTree directly
    console.log('\n--- buildMissionTree ---');
    var tree = window.buildMissionTree('會考複習', '二模');
    console.log('tree keys:', Object.keys(tree));
    
    // Test _collectSubjectUnitsCache state
    console.log('\n--- _collectSubjectUnitsCache state ---');
    // Note: WeakMap can't be introspected, but check if it might have stale ref
    
    // Re-call wzUpdateSubjects
    console.log('\n--- wzUpdateSubjects AGAIN ---');
    window.wizardSubjects = [];  // Reset
    window.wzUpdateSubjects();
    console.log('After reset+call: subjects =', window.wizardSubjects.length);
    if (window.wizardSubjects[0]) {
        console.log('first name:', window.wizardSubjects[0].name);
        console.log('first available:', window.wizardSubjects[0].availableUnits.length);
    }
    
    process.exit(0);
}, 2500);
