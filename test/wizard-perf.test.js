// test/wizard-perf.test.js -- debug 「建立智慧排程」按鈕 4 秒延遲
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { loadIndex, loadBackupPlans } = require('./helpers');
const assert = require('node:assert/strict');


const HTML_PATH = path.join(__dirname, '..', 'index.html');

test('debug: openWizard 內每個子步驟計時', () => {
    const win = loadIndex();
    const backupPlans = loadBackupPlans();

    // 從 index.html 抓 _v153_BACKUP_MASTER_STR
    const html = fs.readFileSync(HTML_PATH, 'utf8');
    const m = html.match(/window\._v153_BACKUP_MASTER_STR\s*=\s*(`[\s\S]*?`);/);
    if (!m) throw new Error('_v153_BACKUP_MASTER_STR not found');
    const master = JSON.parse(m[1].slice(1, -1));

    // 構造 mission (從 backupPlans 推導真正被使用過的 unitId — 真實情境)
    const usedUnitIds = new Set();
    backupPlans.forEach(plan => {
        Object.values(plan.grid || {}).forEach(tasks => {
            tasks.forEach(t => { if (t.unitId) usedUnitIds.add(t.unitId); });
        });
    });
    const sampleUnits = Array.from(usedUnitIds);
    console.log(`\nMock mission size: ${sampleUnits.length} units (from ${backupPlans.length} plans)`);

    // setup 環境
    win.multiData = {
        user_test: {
            masters: { '會考複習': master },
            missions: { '會考複習': { '📦 暑假複習進度': sampleUnits } },
            plans: [],
        }
    };
    win.currentUserId = 'user_test';
    win.appMaster = master;
    win.appMissions = win.multiData.user_test.missions;
    win.appPlans = backupPlans;
    win.appLogs = [];

    // Mock el() — wz-* 跟 planner-* element
    const mocks = {
        'wz-cat': { value: '會考複習' },
        'wz-mis': { value: '📦 暑假複習進度' },
        'wz-name': { value: '' },
        'wz-step2-container': { innerHTML: '', children: [], querySelectorAll: () => [] },
        'planner-cat-filter': { value: 'ALL' },
        'planner-mis-filter': { value: 'ALL' },
        'planner-selector': { value: backupPlans[0]?.id || '' },
        'wz-quickread-discount': { value: 60 },
        'wz-startdate': { value: '2026-08-17' },
        'wz-enddate': { value: '2026-09-17' },
        'wz-overrides-container': { innerHTML: '' },
        'modal-wizard': { style: {} },
    };
    for (let i = 0; i <= 6; i++) mocks['wz-hrs-' + i] = { value: 2 };

    // jsdom 沒 localStorage — mock
    win.localStorage = {
        _data: {},
        getItem(k) { return this._data[k] || null; },
        setItem(k, v) { this._data[k] = String(v); },
        removeItem(k) { delete this._data[k]; },
        clear() { this._data = {}; }
    };
    win.window.localStorage = win.localStorage;


    const origEl = win.el;
    win.el = function(id) {
        if (mocks[id]) return mocks[id];
        const r = origEl.call(this, id);
        return r || { value: '', innerHTML: '', children: [], querySelectorAll: () => [] };
    };

    // Monkey-patch 計時
    const targets = [
        'buildMissionTree', 'getSortedSubjects', 'loadWizardPrefs',
        'getCurrentWizardPlan', 'ensurePlanHourConfig', 'renderHourOverrides',
        'wzUpdateMis', 'wzUpdateSubjects', 'renderWizardSubjects',
        'renderWizardUnitRowHtml', 'renderUnitRowHtml',
        'populateSelect', '_collectSubjectUnits', 'buildScheduleMap',
    ];
    const times = {};
    const origFns = {};
    targets.forEach(fn => {
        if (typeof win[fn] !== 'function') return;
        origFns[fn] = win[fn];
        win[fn] = function(...args) {
            const start = Date.now();
            const result = origFns[fn].apply(this, args);
            times[fn] = (times[fn] || 0) + (Date.now() - start);
            return result;
        };
    });

    // 跑 openWizard
    const totalStart = Date.now();
    try {
        win.openWizard();
    } catch (e) {
        console.log('openWizard error:', e.message);
    }
    const totalTime = Date.now() - totalStart;

    console.log('\n=== openWizard perf breakdown (mock mission = 20 units) ===');
    console.log('TOTAL: ' + totalTime + 'ms\n');
    Object.entries(times)
        .filter(([_, t]) => t > 0)
        .sort((a, b) => b[1] - a[1])
        .forEach(([fn, t]) => console.log(`  ${fn.padEnd(30)} ${String(t).padStart(6)}ms`));

    // 不要 fail (這個 test 是 diagnostic)
    assert.ok(true, 'diagnostic test');
});
