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
    
    // Setup
    window.appPlans = [{
        id: 'plan1', name: 'Test', start: '2026-01-01', end: '2026-01-31', grid: {},
        lastWizardRunTime: Date.now()
    }];
    
    const runTime = Date.now();
    window.appPlans[0].grid['2026-01-01'] = [
        { id: 't1', unitId: '國文-unit1', endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: 'cat1', mis: 'mis1' },
        { id: 't2', unitId: '國文-unit2', endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: 'cat1', mis: 'mis1' },
        { id: 't3', unitId: '國文-unit3', endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: 'cat1', mis: 'mis1' }
    ];
    
    let sel = doc.getElementById('planner-selector');
    if (!sel) { sel = doc.createElement('select'); sel.id = 'planner-selector'; doc.body.appendChild(sel); }
    const opt = doc.createElement('option'); opt.value = 'plan1'; opt.selected = true; sel.appendChild(opt);
    
    window.appMissions = { 'cat1': { 'mis1': ['國文-unit1', '國文-unit2', '國文-unit3'] } };
    
    window.masters = {
        'cat1': {
            '國文': {
                type: 'subject',
                items: {
                    'vol1': [
                        { id: '國文-unit1', name: 'Unit 1', start: 1, end: 10 },
                        { id: '國文-unit2', name: 'Unit 2', start: 11, end: 20 },
                        { id: '國文-unit3', name: 'Unit 3', start: 21, end: 30 }
                    ]
                }
            }
        }
    };
    
    let wzCat = doc.getElementById('wz-cat');
    let wzMis = doc.getElementById('wz-mis');
    if (!wzCat) { wzCat = doc.createElement('select'); wzCat.id = 'wz-cat'; doc.body.appendChild(wzCat); }
    if (!wzMis) { wzMis = doc.createElement('select'); wzMis.id = 'wz-mis'; doc.body.appendChild(wzMis); }
    const cOpt = doc.createElement('option'); cOpt.value = 'cat1'; cOpt.selected = true; wzCat.appendChild(cOpt);
    const mOpt = doc.createElement('option'); mOpt.value = 'mis1'; mOpt.selected = true; wzMis.appendChild(mOpt);
    
    // Force wzUpdateSubjects to actually run by triggering the inner if (cat && mis) branch
    // Direct call the function after setting values
    window.wzUpdateSubjects();
    
    console.log('=== Step 1: BEFORE revert ===');
    console.log('wizardSubjects:', window.wizardSubjects && window.wizardSubjects.length);
    if (window.wizardSubjects && window.wizardSubjects.length > 0) {
        console.log('availableUnits:', window.wizardSubjects[0].availableUnits.map(u => ({id: u.id, misMaxEnd: u.misMaxEnd})));
    }
    
    // Revert
    window.executeRevertWizard();
    
    // Check cache cleared
    console.log('\n=== Step 2: After revert, _schedCache =', JSON.stringify(window._schedCache));
    console.log('appPlans[0].grid =', JSON.stringify(window.appPlans[0].grid));
    
    // Re-call wzUpdateSubjects
    window.wzUpdateSubjects();
    console.log('\n=== Step 3: After revert + re-call wzUpdateSubjects ===');
    if (window.wizardSubjects && window.wizardSubjects.length > 0) {
        console.log('availableUnits:', window.wizardSubjects[0].availableUnits.map(u => ({id: u.id, misMaxEnd: u.misMaxEnd})));
        console.log('selectedUnitIds:', window.wizardSubjects[0].selectedUnitIds);
    } else {
        console.log('wizardSubjects is EMPTY!');
    }
    
    process.exit(0);
}, 2500);
