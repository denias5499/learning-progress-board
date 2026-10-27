// 真實重現: plan 有真實任務, 撤回後 wzUpdateSubjects 應該顯示全部 unit
// 但 Denias 說「看不到」— 究竟是看得到但 misMaxEnd 都 > 0 (排到後面)？還是其他原因？
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
    const cat = '會考複習';
    const mis = '二模';
    
    // Take the REAL 27 units from mission 二模
    const realMissionUnits = window.appMissions[cat][mis];
    console.log('Real mission[\'' + mis + '\'] has', realMissionUnits.length, 'units');
    
    // Build plan with first 12 units scheduled (25 tasks total across multiple days)
    window.appPlans = [{
        id: 'plan1', name: 'Test',
        start: '2026-01-01', end: '2026-01-31',
        grid: {}, lastWizardRunTime: Date.now()
    }];
    
    const runTime = Date.now();
    const first12 = realMissionUnits.slice(0, 12);
    let taskId = 1;
    first12.forEach((unitId, idx) => {
        // 2 tasks per unit, across 2 days
        const day1 = '2026-01-' + String(1 + idx).padStart(2, '0');
        const day2 = '2026-01-' + String(2 + idx).padStart(2, '0');
        if (!window.appPlans[0].grid[day1]) window.appPlans[0].grid[day1] = [];
        if (!window.appPlans[0].grid[day2]) window.appPlans[0].grid[day2] = [];
        window.appPlans[0].grid[day1].push({ id: 't'+(taskId++), unitId, endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat, mis });
        window.appPlans[0].grid[day2].push({ id: 't'+(taskId++), unitId, endPage: 20, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat, mis });
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
    
    // STEP 1: 初次載入, 看 國文 有多少 unit, 其中幾個已排
    window.wzUpdateSubjects();
    var ws0 = window.wizardSubjects.find(ws => ws.name === '國文');
    console.log('\n=== STEP 1: Initial wzUpdateSubjects ===');
    console.log('  國文 availableUnits:', ws0.availableUnits.length);
    var scheduled = ws0.availableUnits.filter(u => u.misMaxEnd > 0);
    var unscheduled = ws0.availableUnits.filter(u => u.misMaxEnd === 0);
    console.log('  已排過 (misMaxEnd>0):', scheduled.length);
    console.log('  未排 (misMaxEnd=0):', unscheduled.length);
    
    // STEP 2: 撤回
    console.log('\n=== STEP 2: executeRevertWizard ===');
    window.executeRevertWizard();
    console.log('  grid keys:', Object.keys(window.appPlans[0].grid).length);
    
    // STEP 3: 再次 wzUpdateSubjects — 這就是 Denias 說「看不到」的場景
    window.wzUpdateSubjects();
    console.log('\n=== STEP 3: After revert, wzUpdateSubjects AGAIN ===');
    var ws1 = window.wizardSubjects.find(ws => ws.name === '國文');
    if (!ws1) {
        console.log('  ❌ 國文 不在 wizardSubjects!');
    } else {
        console.log('  國文 availableUnits:', ws1.availableUnits.length);
        var scheduled2 = ws1.availableUnits.filter(u => u.misMaxEnd > 0);
        var unscheduled2 = ws1.availableUnits.filter(u => u.misMaxEnd === 0);
        console.log('  已排過 (misMaxEnd>0):', scheduled2.length);
        console.log('  未排 (misMaxEnd=0):', unscheduled2.length);
        console.log('  ids[0..2]:', ws1.availableUnits.slice(0, 3).map(u => u.id).join(', '));
        console.log('  ids[N-3..N]:', ws1.availableUnits.slice(-3).map(u => u.id).join(', '));
        
        // Check if the previously-scheduled units are now invisible
        var hiddenIds = first12.filter(uid => !ws1.availableUnits.some(u => u.id === uid));
        console.log('  先前排過的 unit 是否都還在:', hiddenIds.length === 0 ? '✅ 全在' : '❌ 不見 ' + hiddenIds.length + ' 個: ' + hiddenIds.join(','));
    }
    
    // Render DOM
    console.log('\n=== STEP 4: 實際 render DOM ===');
    window.renderWizardSubjects();
    var container = doc.getElementById('wz-step2-container');
    var unitCbs = container.querySelectorAll('input.wz-unit-cb');
    console.log('  DOM 中 unit checkbox 總數:', unitCbs.length);
    var renderedIds = Array.from(unitCbs).map(cb => cb.value);
    console.log('  前 5 個:', renderedIds.slice(0, 5).join(', '));
    console.log('  後 5 個:', renderedIds.slice(-5).join(', '));
    
    // 統計區塊
    var statsMatch = container.textContent.match(/總計 \d+ 個單元/);
    console.log('  v1.6.152 統計區塊:', statsMatch ? statsMatch[0] : 'NOT FOUND');
    
    process.exit(0);
}, 2500);
