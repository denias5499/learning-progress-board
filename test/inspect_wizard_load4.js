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

const window = dom.window;
window.alert = (m) => console.log('ALERT:', String(m).substring(0, 200));

setTimeout(() => {
    const doc = window.document;
    
    window.multiData = {
        'u1': {
            masters: {
                'cat1': {
                    '國文': {
                        materials: {
                            '講義': {
                                instances: [{
                                    name: '第一冊',
                                    vols: {
                                        'vol1': [
                                            { id: '國文-unit1', name: 'Unit 1', start: 1, end: 10 },
                                            { id: '國文-unit2', name: 'Unit 2', start: 11, end: 20 },
                                            { id: '國文-unit3', name: 'Unit 3', start: 21, end: 30 }
                                        ]
                                    }
                                }]
                            }
                        }
                    }
                }
            }
        }
    };
    window.currentUserId = 'u1';
    window.appMissions = { 'cat1': { 'mis1': ['國文-unit1', '國文-unit2', '國文-unit3'] } };
    
    window.appPlans = [{
        id: 'plan1', name: 'Test', start: '2026-01-01', end: '2026-01-31', grid: {},
        lastWizardRunTime: Date.now()
    }];
    
    const runTime = Date.now();
    window.appPlans[0].grid['2026-01-01'] = [
        { id: 't1', unitId: '國文-unit1', endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: 'cat1', mis: 'mis1' },
        { id: 't2', unitId: '國文-unit2', endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: 'cat1', mis: 'mis1' }
    ];
    
    let sel = doc.getElementById('planner-selector');
    if (!sel) { sel = doc.createElement('select'); sel.id = 'planner-selector'; doc.body.appendChild(sel); }
    const opt = doc.createElement('option'); opt.value = 'plan1'; opt.selected = true; sel.appendChild(opt);
    
    let wzCat = doc.getElementById('wz-cat');
    let wzMis = doc.getElementById('wz-mis');
    if (!wzCat) { wzCat = doc.createElement('select'); wzCat.id = 'wz-cat'; doc.body.appendChild(wzCat); }
    if (!wzMis) { wzMis = doc.createElement('select'); wzMis.id = 'wz-mis'; doc.body.appendChild(wzMis); }
    const cOpt = doc.createElement('option'); cOpt.value = 'cat1'; cOpt.selected = true; wzCat.appendChild(cOpt);
    const mOpt = doc.createElement('option'); mOpt.value = 'mis1'; mOpt.selected = true; wzMis.appendChild(mOpt);
    
    // Initial load
    window.wzUpdateSubjects();
    console.log('=== BEFORE revert ===');
    console.log('  wizardSubjects count:', window.wizardSubjects.length);
    if (window.wizardSubjects[0]) {
        console.log('  ws[0].name:', window.wizardSubjects[0].name);
        console.log('  ws[0].availableUnits.length:', window.wizardSubjects[0].availableUnits.length);
        console.log('  ws[0].availableUnits ids:', window.wizardSubjects[0].availableUnits.map(u => u.id));
        console.log('  ws[0].selectedUnitIds:', window.wizardSubjects[0].selectedUnitIds);
    }
    
    // Revert
    window.executeRevertWizard();
    console.log('\n=== AFTER revert ===');
    console.log('  _schedCache:', window._schedCache === null ? 'null (cleared)' : 'STILL CACHED!');
    console.log('  grid keys:', Object.keys(window.appPlans[0].grid).length === 0 ? 'EMPTY' : 'HAS DATA');
    
    // Re-call wzUpdateSubjects
    window.wzUpdateSubjects();
    console.log('\n=== AFTER revert + re-call wzUpdateSubjects ===');
    console.log('  wizardSubjects count:', window.wizardSubjects.length);
    if (window.wizardSubjects[0]) {
        console.log('  ws[0].name:', window.wizardSubjects[0].name);
        console.log('  ws[0].availableUnits.length:', window.wizardSubjects[0].availableUnits.length);
        console.log('  ws[0].availableUnits:', window.wizardSubjects[0].availableUnits.map(u => ({id: u.id, misMaxEnd: u.misMaxEnd})));
        console.log('  ws[0].selectedUnitIds:', window.wizardSubjects[0].selectedUnitIds);
        
        if (window.wizardSubjects[0].availableUnits.length === 0) {
            console.log('  ❌ BUG: availableUnits EMPTY after revert');
        } else {
            console.log('  ✅ availableUnits OK');
        }
    }
    
    process.exit(0);
}, 2500);
