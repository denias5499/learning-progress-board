// 模擬 Denias 描述的場景: 國文 30 個 unit, 已排 25, 剩 5 未排
// 撤回後再次進入智慧排程
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
    
    // Use real jsdom-loaded data
    const uid = 'user_A';
    const cat = '會考複習';
    const mis = '二模';
    
    // Get all 國文 units from real data
    var allUnits = [];
    var realMaster = window.multiData[uid].masters[cat]['國文'];
    if (realMaster && realMaster.materials) {
        Object.keys(realMaster.materials).forEach(typeName => {
            var t = realMaster.materials[typeName];
            if (t && t.instances) {
                t.instances.forEach(ins => {
                    if (ins && ins.vols) {
                        Object.keys(ins.vols).forEach(v => {
                            (ins.vols[v] || []).forEach(u => allUnits.push(u.id));
                        });
                    }
                });
            }
        });
    }
    
    console.log('Real 國文 units in master:', allUnits.length);
    console.log('Real mission[\'' + mis + '\'] units:', window.appMissions[cat][mis].length);
    
    // Setup plan with 2 tasks (just to simulate revert)
    window.appPlans = [{
        id: 'plan1', name: 'Test',
        start: '2026-01-01', end: '2026-01-31',
        grid: {}, lastWizardRunTime: Date.now()
    }];
    
    const runTime = Date.now();
    const firstUnit = window.appMissions[cat][mis][0];
    window.appPlans[0].grid['2026-01-01'] = [
        { id: 't1', unitId: firstUnit, endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat, mis }
    ];
    
    let sel = doc.getElementById('planner-selector');
    if (!sel) { sel = doc.createElement('select'); sel.id = 'planner-selector'; doc.body.appendChild(sel); }
    const opt = doc.createElement('option'); opt.value = 'plan1'; opt.selected = true; sel.appendChild(opt);
    
    let wzCat = doc.getElementById('wz-cat');
    let wzMis = doc.getElementById('wz-mis');
    if (!wzCat) { wzCat = doc.createElement('select'); wzCat.id = 'wz-cat'; doc.body.appendChild(wzCat); }
    if (!wzMis) { wzMis = doc.createElement('select'); wzMis.id = 'wz-mis'; doc.body.appendChild(wzMis); }
    const cOpt = doc.createElement('option'); cOpt.value = cat; cOpt.selected = true; wzCat.appendChild(cOpt);
    const mOpt = doc.createElement('option'); mOpt.value = mis; mOpt.selected = true; wzMis.appendChild(mOpt);
    
    // Initial load (shows all units for 國文)
    window.wzUpdateSubjects();
    console.log('\n=== BEFORE revert: 國文 ===');
    var chinese = window.wizardSubjects.find(ws => ws.name === '國文');
    if (chinese) {
        console.log('  availableUnits:', chinese.availableUnits.length);
        console.log('  ids:', chinese.availableUnits.map(u => u.id).slice(0, 5).join(', ') + ' ...');
        console.log('  misMaxEnd > 0:', chinese.availableUnits.filter(u => u.misMaxEnd > 0).length);
        console.log('  misMaxEnd = 0:', chinese.availableUnits.filter(u => u.misMaxEnd === 0).length);
    } else {
        console.log('  ❌ 國文 不在 wizardSubjects 內!');
        console.log('  wizardSubjects:', window.wizardSubjects.map(ws => ws.name).join(', '));
    }
    
    // Render
    console.log('\n--- Render DOM check ---');
    window.renderWizardSubjects();
    var container = doc.getElementById('wz-step2-container');
    var chineseContainer = container.querySelectorAll('.vertical-scroll');
    console.log('  國文科目容器 數量:', chineseContainer.length);
    var unitCbs = container.querySelectorAll('input.wz-unit-cb');
    console.log('  全部 unit checkbox 數量:', unitCbs.length);
    console.log('  前 5 個 unit IDs:', Array.from(unitCbs).slice(0, 5).map(cb => cb.value).join(', '));
    
    // Show statistics block (only in mode D)
    console.log('\n--- v1.6.152 statistics block ---');
    var allText = container.textContent;
    var statsMatch = allText.match(/總計 \d+ 個單元/);
    console.log('  統計區塊:', statsMatch ? statsMatch[0] : 'NOT FOUND');
    
    process.exit(0);
}, 2500);
