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
    
    // Set up plan with grid tasks (will revert to simulate)
    window.appPlans = [{
        id: 'plan1', name: 'Test', start: '2026-01-01', end: '2026-01-31', grid: {},
        lastWizardRunTime: Date.now()
    }];
    
    const runTime = Date.now();
    // Add 3 國文 tasks
    window.appPlans[0].grid['2026-01-01'] = [
        { id: 't1', unitId: '國文-unit1', endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: 'cat1', mis: 'mis1' },
        { id: 't2', unitId: '國文-unit2', endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: 'cat1', mis: 'mis1' },
        { id: 't3', unitId: '國文-unit3', endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: 'cat1', mis: 'mis1' }
    ];
    
    // Set up planner-selector
    let sel = doc.getElementById('planner-selector');
    if (!sel) {
        sel = doc.createElement('select');
        sel.id = 'planner-selector';
        doc.body.appendChild(sel);
    }
    const opt = doc.createElement('option');
    opt.value = 'plan1';
    opt.selected = true;
    sel.appendChild(opt);
    
    // Set up appMissions
    window.appMissions = { 'cat1': { 'mis1': ['國文-unit1', '國文-unit2', '國文-unit3'] } };
    
    // Set up masters structure
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
    
    // Pre-populate cache to simulate stale state
    window.getScheduleMapFromCache('cat1', 'mis1');
    
    // Call wzUpdateSubjects BEFORE revert (to see stale state)
    console.log('=== Step 1: wzUpdateSubjects BEFORE revert ===');
    
    // Set wz-cat / wz-mis
    let wzCat = doc.getElementById('wz-cat');
    let wzMis = doc.getElementById('wz-mis');
    if (!wzCat) { wzCat = doc.createElement('select'); wzCat.id = 'wz-cat'; doc.body.appendChild(wzCat); }
    if (!wzMis) { wzMis = doc.createElement('select'); wzMis.id = 'wz-mis'; doc.body.appendChild(wzMis); }
    
    // Populate cat
    const cOpt = doc.createElement('option');
    cOpt.value = 'cat1';
    cOpt.selected = true;
    wzCat.appendChild(cOpt);
    
    const mOpt = doc.createElement('option');
    mOpt.value = 'mis1';
    mOpt.selected = true;
    wzMis.appendChild(mOpt);
    
    console.log('Before revert: wizardSubjects[0].availableUnits =', window.wizardSubjects[0] && window.wizardSubjects[0].availableUnits.map(u => u.unitId + ' (misMaxEnd=' + u.misMaxEnd + ')'));
    
    // Now revert
    console.log('\n=== Step 2: executeRevertWizard ===');
    window.executeRevertWizard();
    
    // Then re-call wzUpdateSubjects
    console.log('\n=== Step 3: wzUpdateSubjects AFTER revert ===');
    try {
        window.wzUpdateSubjects();
        console.log('After revert: wizardSubjects[0].availableUnits =', window.wizardSubjects[0] && window.wizardSubjects[0].availableUnits.map(u => u.unitId + ' (misMaxEnd=' + u.misMaxEnd + ')'));
        console.log('After revert: wizardSubjects[0].selectedUnitIds =', window.wizardSubjects[0] && window.wizardSubjects[0].selectedUnitIds);
    } catch (e) {
        console.error('wzUpdateSubjects error:', e.message);
    }
    
    process.exit(0);
}, 2500);
