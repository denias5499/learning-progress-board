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
    
    const realMissionUnits = window.appMissions[cat][mis];
    
    window.appPlans = [{
        id: 'plan1', name: 'Test',
        start: '2026-01-01', end: '2026-01-31',
        grid: {}, lastWizardRunTime: Date.now()
    }];
    
    const runTime = Date.now();
    const first12 = realMissionUnits.slice(0, 12);
    let taskId = 1;
    first12.forEach((unitId, idx) => {
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
    
    window.wzUpdateSubjects();
    window.executeRevertWizard();
    window.wzUpdateSubjects();
    
    // Detail: 國文 - 哪些 units in availableUnits
    var ws0 = window.wizardSubjects.find(ws => ws.name === '國文');
    console.log('國文 availableUnits (', ws0.availableUnits.length, '個):');
    ws0.availableUnits.forEach(u => console.log('  -', u.id, 'name=', u.name, 'misMaxEnd=', u.misMaxEnd));
    
    // Render DOM - 看 wz-step2-container 裡 國文 區段的 checkboxes
    window.renderWizardSubjects();
    var container = doc.getElementById('wz-step2-container');
    console.log('\nDOM wz-step2-container children 數:', container.children.length);
    
    // 找 國文區塊
    var subjDivs = container.querySelectorAll('.vertical-scroll');
    console.log('所有 vertical-scroll:', subjDivs.length);
    
    // 找包含「國文」標題的區塊
    var headers = container.querySelectorAll('h3, h4, .wz-subj-header, [class*="subj"]');
    console.log('headers:', Array.from(headers).map(h => h.textContent.substring(0, 30)).join(' | '));
    
    // 簡單找: 第一個 vertical-scroll 內的所有 checkboxes
    var firstSubj = container.querySelector('.vertical-scroll');
    if (firstSubj) {
        var cbs = firstSubj.querySelectorAll('input.wz-unit-cb');
        console.log('\n第一個 vertical-scroll 有', cbs.length, '個 checkboxes:');
        Array.from(cbs).slice(0, 10).forEach(cb => console.log('  -', cb.value));
    }
    
    process.exit(0);
}, 2500);
