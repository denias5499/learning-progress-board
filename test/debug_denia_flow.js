// 完整模擬 Denias 描述的流程:
// 1. 進入智慧排程,選 國文, 生成排程
// 2. 撤回
// 3. 再進智慧排程, 國文 list 是否顯示那些 unit
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
window.alert = (m) => console.log('ALERT:', String(m).substring(0, 250));

setTimeout(() => {
    const doc = window.document;
    
    // Setup realistic structure: 12 國文 units (超過 COLLAPSE_THRESHOLD=10)
    const units = [];
    for (let i = 1; i <= 12; i++) {
        units.push({ id: '國文-u' + i, name: 'Unit ' + i, start: (i-1)*10 + 1, end: i*10 });
    }
    
    window.multiData = {
        'u1': {
            masters: {
                '會考複習': {
                    '國文': {
                        materials: {
                            '講義': {
                                instances: [{
                                    name: '第一冊',
                                    vols: { 'vol1': units }
                                }]
                            }
                        }
                    }
                }
            }
        }
    };
    window.currentUserId = 'u1';
    window.appMissions = { '會考複習': { '二模': units.map(u => u.id) } };
    
    window.appPlans = [{
        id: 'plan1', name: 'Test', start: '2026-01-01', end: '2026-01-31', grid: {},
        lastWizardRunTime: Date.now()
    }];
    
    const runTime = Date.now();
    // 排 5 個 unit (8 個任務)
    window.appPlans[0].grid['2026-01-01'] = [
        { id: 't1', unitId: '國文-u1', endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: '會考複習', mis: '二模' },
        { id: 't2', unitId: '國文-u2', endPage: 20, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: '會考複習', mis: '二模' }
    ];
    window.appPlans[0].grid['2026-01-02'] = [
        { id: 't3', unitId: '國文-u1', endPage: 10, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: '會考複習', mis: '二模' },
        { id: 't4', unitId: '國文-u3', endPage: 30, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: '會考複習', mis: '二模' }
    ];
    window.appPlans[0].grid['2026-01-03'] = [
        { id: 't5', unitId: '國文-u4', endPage: 40, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: '會考複習', mis: '二模' },
        { id: 't6', unitId: '國文-u5', endPage: 50, isAuto: true, wizardRunId: 'r1', wizardRunTime: runTime, cat: '會考複習', mis: '二模' }
    ];
    
    let sel = doc.getElementById('planner-selector');
    if (!sel) { sel = doc.createElement('select'); sel.id = 'planner-selector'; doc.body.appendChild(sel); }
    const opt = doc.createElement('option'); opt.value = 'plan1'; opt.selected = true; sel.appendChild(opt);
    
    // === Step 1: 初次進入 wizard, 模擬「生成排程前」看到所有 12 個 unit
    let wzCat = doc.getElementById('wz-cat');
    let wzMis = doc.getElementById('wz-mis');
    if (!wzCat) { wzCat = doc.createElement('select'); wzCat.id = 'wz-cat'; doc.body.appendChild(wzCat); }
    if (!wzMis) { wzMis = doc.createElement('select'); wzMis.id = 'wz-mis'; doc.body.appendChild(wzMis); }
    const cOpt = doc.createElement('option'); cOpt.value = '會考複習'; cOpt.selected = true; wzCat.appendChild(cOpt);
    const mOpt = doc.createElement('option'); mOpt.value = '二模'; mOpt.selected = true; wzMis.appendChild(mOpt);
    
    window.wzUpdateSubjects();
    console.log('=== Step 1: 初次進入 wizard (生成排程前) ===');
    console.log('  wizardSubjects[0].availableUnits:', window.wizardSubjects[0].availableUnits.map(u => u.id).length, '個');
    console.log('  ids:', window.wizardSubjects[0].availableUnits.map(u => u.id).join(', '));
    
    // === Step 2: 撤回
    console.log('\n=== Step 2: executeRevertWizard ===');
    window.executeRevertWizard();
    console.log('  grid keys:', Object.keys(window.appPlans[0].grid).length === 0 ? 'EMPTY ✅' : 'HAS DATA!');
    console.log('  _schedCache:', window._schedCache === null ? 'null ✅' : 'STILL CACHED!');
    
    // === Step 3: 再進 wizard (這就是 Denias 說看不到單元的步驟)
    console.log('\n=== Step 3: 再進 wizard (撤回後) ===');
    window.wzUpdateSubjects();
    console.log('  wizardSubjects count:', window.wizardSubjects.length);
    if (window.wizardSubjects[0]) {
        console.log('  wizardSubjects[0].name:', window.wizardSubjects[0].name);
        console.log('  wizardSubjects[0].availableUnits:', window.wizardSubjects[0].availableUnits.map(u => u.id).length, '個');
        console.log('  ids:', window.wizardSubjects[0].availableUnits.map(u => u.id).join(', '));
        console.log('  selectedUnitIds:', JSON.stringify(window.wizardSubjects[0].selectedUnitIds));
        
        const visible = window.wizardSubjects[0].availableUnits;
        const collapsed = 10;
        if (visible.length <= collapsed) {
            console.log('  → 全部可見 (' + visible.length + ' ≤ 10)');
        } else {
            console.log('  → 前 ' + collapsed + ' 個可見: ' + visible.slice(0, collapsed).map(u => u.id).join(', '));
            console.log('  → 後 ' + (visible.length - collapsed) + ' 個被收合: ' + visible.slice(collapsed).map(u => u.id).join(', '));
        }
    } else {
        console.log('  ❌ wizardSubjects[0] EMPTY');
    }
    
    // === Step 4: 實際 render 出來看 DOM
    console.log('\n=== Step 4: 實際 render DOM ===');
    try {
        window.renderWizardSubjects();
        var container = doc.getElementById('wz-step2-container');
        if (container) {
            var checkboxes = container.querySelectorAll('input.wz-unit-cb');
            console.log('  實際 DOM 中 unit checkbox 數量:', checkboxes.length);
            console.log('  顯示的 unit IDs:', Array.from(checkboxes).map(function(cb) { return cb.value; }).join(', '));
            // 也看是否還有 wz-show-more 按鈕
            var showMore = container.querySelectorAll('.wz-show-more');
            console.log('  wz-show-more 按鈕數量:', showMore.length);
            if (showMore.length > 0) {
                console.log('  wz-show-more 內容:', showMore[0].textContent);
            }
        } else {
            console.log('  ❌ wz-step2-container not found');
        }
    } catch (e) {
        console.log('  render error:', e.message);
    }
    
    process.exit(0);
}, 2500);
