'use strict';
/**
 * v1.6.159 - 自動修正並重排 - 邏輯 unit test
 *
 * 用 vm.runInNewContext 抽出真實的 v1.6.159 函數,在 Node 環境跑
 * 不用 jsdom (因為 jsdom 跑整個 index.html 會 hang)
 *
 * 測試項目:
 *  L1: autoFixAndReplan 掃描 wizardSubjects,正確找出 N < chunks 的 unit
 *  L2: 全部 ws.daysPerUnit ≤ chunks 時,跳 alert 不彈確認 modal
 *  L3: 確認 modal 內容正確 (科目/unit 名 + 數字)
 *  L4: executeAutoFix 真的改 ws.daysPerUnit 並呼叫 saveWizardPrefs/renderWizardSubjects/generatePlan
 *  L5: executeAutoFix 後 _autoFixPlan 被清成 null
 *  L6: backToWizardFromWarnings 關警告 modal 開 wizard modal
 *  L7: 跳過 scheduleMode !== 'units' 的科目
 *  L8: numChunks 計算: 1hr → 2 chunks, 2hr → 4 chunks, 3hr → 6 chunks
 *  L9: 邊界: 小時數 0 → ceil(0.5) 至少 1 chunk
 *  L10: quickRead 折扣正確反映在 numChunks
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

// 抽出 v1.6.159 函數區塊 (從 _autoFixPlan 宣告到 executeAutoFix 結尾)
function extractAutoFixCode(html) {
    const startMarker = 'var _autoFixPlan = null;';
    const endMarker = 'function showRevertWizardModal() {';
    const startIdx = html.indexOf(startMarker);
    const endIdx = html.indexOf(endMarker, startIdx);
    if (startIdx < 0 || endIdx < 0) throw new Error('找不到 v1.6.159 區塊');
    return html.substring(startIdx, endIdx);
}

// 建立 vm context,模擬 DOM utility
function buildCtx() {
    const ctx = {
        // mock el() — 只 mock 我們需要的 ID
        el: function(id) {
            if (id === 'wz-quickread-discount') return { value: '60' };
            if (id === 'auto-fix-confirm-body') return { innerHTML: '', textContent: '' };
            return { value: '', innerHTML: '', style: {}, textContent: '' };
        },
        escapeHtml: function(s) { return String(s || '').replace(/[<>&"']/g, function(c) { return ({'<':'<','>':'>','&':'&','"':'"',"'":'&#39;'})[c]; }); },
        alert: function(m) { (ctx._alerts = ctx._alerts || []).push(String(m)); },
        console: { log: function() {}, error: console.error },
        openModal: function(id) { ctx._modalOpened = id; },
        closeModal: function(id) { ctx._modalClosed = id; },
        saveWizardPrefs: function() { ctx._saveWizardPrefsCalled = (ctx._saveWizardPrefsCalled || 0) + 1; },
        renderWizardSubjects: function() { ctx._renderWizardSubjectsCalled = (ctx._renderWizardSubjectsCalled || 0) + 1; },
        generatePlan: function() { ctx._generatePlanCalled = (ctx._generatePlanCalled || 0) + 1; },
        Math: Math, Number: Number, JSON: JSON, Array: Array, Object: Object,
        wizardSubjects: [],
        _autoFixPlan: null,
        _unitWarningsData: [],
        _modalOpened: null,
        _modalClosed: null,
        _saveWizardPrefsCalled: 0,
        _renderWizardSubjectsCalled: 0,
        _generatePlanCalled: 0,
        _alerts: []
    };
    return ctx;
}

function loadAutoFixModule(ctx) {
    const code = extractAutoFixCode(HTML);
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    return ctx;
}

// ============================================================
//  L1: autoFixAndReplan 掃描 wizardSubjects
// ============================================================
test('L1: autoFixAndReplan 找出 daysPerUnit > chunks 的 unit', () => {
    const ctx = buildCtx();
    loadAutoFixModule(ctx);
    
    ctx.wizardSubjects = [{
        name: '國文',
        scheduleMode: 'units',
        hoursPerUnit: 1,
        daysPerUnit: 5,
        selectedUnitIds: ['u1', 'u2'],
        availableUnits: [
            { id: 'u1', uObj: { id: 'u1', name: '字音' }, quickRead: false },
            { id: 'u2', uObj: { id: 'u2', name: '字形' }, quickRead: false }
        ]
    }];
    
    ctx.autoFixAndReplan();
    
    assert.ok(ctx._autoFixPlan !== null, '_autoFixPlan 應已被填');
    assert.strictEqual(ctx._autoFixPlan.length, 1, '1 個科目需調整');
    assert.strictEqual(ctx._autoFixPlan[0].subjectName, '國文');
    assert.strictEqual(ctx._autoFixPlan[0].fixes.length, 2, '2 個 unit 需調整');
    assert.strictEqual(ctx._autoFixPlan[0].fixes[0].name, '字音');
    assert.strictEqual(ctx._autoFixPlan[0].fixes[0].fromDays, 5);
    assert.strictEqual(ctx._autoFixPlan[0].fixes[0].toDays, 2);
    assert.strictEqual(ctx._autoFixPlan[0].fixes[1].name, '字形');
});

// ============================================================
//  L2: 沒有警告時跳 alert
// ============================================================
test('L2: 全部 daysPerUnit ≤ chunks 時跳 alert,不彈確認 modal', () => {
    const ctx = buildCtx();
    loadAutoFixModule(ctx);
    
    ctx.wizardSubjects = [{
        name: '數學',
        scheduleMode: 'units',
        hoursPerUnit: 3,
        daysPerUnit: 2,
        selectedUnitIds: ['u1'],
        availableUnits: [
            { id: 'u1', uObj: { id: 'u1', name: '多項式' }, quickRead: false }
        ]
    }];
    
    ctx.autoFixAndReplan();
    
    assert.ok(!ctx._autoFixPlan || ctx._autoFixPlan.length === 0, '_autoFixPlan 應為空');
    assert.ok(ctx._alerts.some(function(a) { return a.indexOf('沒有需要') >= 0; }), '應有「沒有需要」alert');
});

// ============================================================
//  L3: 確認 modal 被打開
// ============================================================
test('L3: 有警告時打開確認 modal', () => {
    const ctx = buildCtx();
    loadAutoFixModule(ctx);
    
    ctx.wizardSubjects = [{
        name: '英文',
        scheduleMode: 'units',
        hoursPerUnit: 1,
        daysPerUnit: 3,
        selectedUnitIds: ['u1'],
        availableUnits: [
            { id: 'u1', uObj: { id: 'u1', name: '文法' }, quickRead: false }
        ]
    }];
    
    ctx.autoFixAndReplan();
    
    assert.strictEqual(ctx._modalOpened, 'modal-auto-fix-confirm', '應打開確認 modal');
});

// ============================================================
//  L4: executeAutoFix 改 ws.daysPerUnit + 呼叫 save/render/generate
// ============================================================
test('L4: executeAutoFix 改 ws.daysPerUnit + 呼叫 saveWizardPrefs + generatePlan', () => {
    const ctx = buildCtx();
    loadAutoFixModule(ctx);
    
    const ws = {
        name: '歷史',
        scheduleMode: 'units',
        hoursPerUnit: 2,
        daysPerUnit: 5,
        selectedUnitIds: ['u1'],
        availableUnits: [
            { id: 'u1', uObj: { id: 'u1', name: '上古史' }, quickRead: false }
        ]
    };
    ctx.wizardSubjects = [ws];
    
    ctx.autoFixAndReplan();
    assert.ok(ctx._autoFixPlan && ctx._autoFixPlan.length === 1, '應有 plan');
    assert.strictEqual(ctx._autoFixPlan[0].maxChunks, 4, 'hoursPerUnit=2 → maxChunks=4');
    
    ctx.executeAutoFix();
    
    assert.strictEqual(ws.daysPerUnit, 4, 'daysPerUnit 應改為 4');
    assert.strictEqual(ctx._saveWizardPrefsCalled, 1, 'saveWizardPrefs 應被呼叫 1 次');
    assert.strictEqual(ctx._renderWizardSubjectsCalled, 1, 'renderWizardSubjects 應被呼叫 1 次');
    assert.strictEqual(ctx._generatePlanCalled, 1, 'generatePlan 應被呼叫 1 次');
});

// ============================================================
//  L5: executeAutoFix 後 _autoFixPlan 清成 null
// ============================================================
test('L5: executeAutoFix 後 _autoFixPlan = null', () => {
    const ctx = buildCtx();
    loadAutoFixModule(ctx);
    
    ctx.wizardSubjects = [{
        name: '地理',
        scheduleMode: 'units',
        hoursPerUnit: 1,
        daysPerUnit: 3,
        selectedUnitIds: ['u1'],
        availableUnits: [
            { id: 'u1', uObj: { id: 'u1', name: '地形' }, quickRead: false }
        ]
    }];
    
    ctx.autoFixAndReplan();
    assert.ok(ctx._autoFixPlan !== null);
    
    ctx.executeAutoFix();
    
    assert.strictEqual(ctx._autoFixPlan, null, '_autoFixPlan 應已被清');
});

// ============================================================
//  L6: backToWizardFromWarnings
// ============================================================
test('L6: backToWizardFromWarnings 關 modal-unit-warnings + 開 modal-wizard', () => {
    const ctx = buildCtx();
    loadAutoFixModule(ctx);
    
    ctx.backToWizardFromWarnings();
    
    assert.strictEqual(ctx._modalClosed, 'modal-unit-warnings', '應關閉警告 modal');
    assert.strictEqual(ctx._modalOpened, 'modal-wizard', '應打開 wizard modal');
});

// ============================================================
//  L7: 跳過 scheduleMode !== 'units'
// ============================================================
test('L7: 跳過 scheduleMode="hours" 的科目', () => {
    const ctx = buildCtx();
    loadAutoFixModule(ctx);
    
    ctx.wizardSubjects = [{
        name: '生物',
        scheduleMode: 'hours',
        hoursPerUnit: 1,
        daysPerUnit: 100,
        selectedUnitIds: ['u1'],
        availableUnits: [
            { id: 'u1', uObj: { id: 'u1', name: '細胞' }, quickRead: false }
        ]
    }];
    
    ctx.autoFixAndReplan();
    
    assert.ok(ctx._alerts.some(function(a) { return a.indexOf('沒有需要') >= 0; }));
});

// ============================================================
//  L8: numChunks 計算正確
// ============================================================
test('L8: numChunks = ceil(hoursPerUnit / 0.5)', () => {
    const ctx = buildCtx();
    loadAutoFixModule(ctx);
    
    const cases = [
        { hrs: 1, days: 5, expectedMaxChunks: 2 },
        { hrs: 2, days: 6, expectedMaxChunks: 4 },
        { hrs: 3, days: 10, expectedMaxChunks: 6 },
        { hrs: 0.5, days: 5, expectedMaxChunks: 1 },
        { hrs: 4, days: 10, expectedMaxChunks: 8 }
    ];
    
    cases.forEach(function(c) {
        ctx.wizardSubjects = [{
            name: 'Test',
            scheduleMode: 'units',
            hoursPerUnit: c.hrs,
            daysPerUnit: c.days,
            selectedUnitIds: ['u1'],
            availableUnits: [
                { id: 'u1', uObj: { id: 'u1', name: 'U' }, quickRead: false }
            ]
        }];
        ctx.autoFixAndReplan();
        
        if (ctx._autoFixPlan && ctx._autoFixPlan.length > 0) {
            assert.strictEqual(ctx._autoFixPlan[0].maxChunks, c.expectedMaxChunks, 
                c.hrs + 'hr → maxChunks=' + c.expectedMaxChunks);
        } else {
            assert.ok(c.days <= c.expectedMaxChunks, c.hrs + 'hr ' + c.days + '天 應 ≤ ' + c.expectedMaxChunks + ' chunks');
        }
    });
});

// ============================================================
//  L9: 邊界: 小時數 0 → maxChunks 至少 1
// ============================================================
test('L9: hoursPerUnit=0 時不會 throw (fallback 到 1hr → 2 chunks)', () => {
    const ctx = buildCtx();
    loadAutoFixModule(ctx);
    
    ctx.wizardSubjects = [{
        name: 'Test',
        scheduleMode: 'units',
        hoursPerUnit: 0,       // 0 會被 Number || 1 兜底成 1
        daysPerUnit: 5,
        selectedUnitIds: ['u1'],
        availableUnits: [
            { id: 'u1', uObj: { id: 'u1', name: 'U' }, quickRead: false }
        ]
    }];
    
    // 不應 throw,也不應無限迴圈
    ctx.autoFixAndReplan();
    
    // 因為 hoursPerUnit=0 被 fallback 成 1,numChunks = ceil(1/0.5) = 2
    // daysPerUnit=5 > 2, 應被偵測為需修正
    assert.ok(ctx._autoFixPlan !== null && ctx._autoFixPlan.length === 1, '應有 plan');
    assert.strictEqual(ctx._autoFixPlan[0].hoursPerUnit, 1, 'hoursPerUnit fallback 成 1');
    assert.strictEqual(ctx._autoFixPlan[0].maxChunks, 2, '1hr → 2 chunks');
});

// ============================================================
//  L10: quickRead 折扣
// ============================================================
test('L10: quickRead=true 時 numChunks 反映折扣後的時數', () => {
    const ctx = buildCtx();
    loadAutoFixModule(ctx);
    
    // hoursPerUnit=2, 折扣 60% → effectiveHrs = 2 * 0.6 = 1.2
    // numChunks = ceil(1.2/0.5) = ceil(2.4) = 3
    ctx.wizardSubjects = [{
        name: 'Test',
        scheduleMode: 'units',
        hoursPerUnit: 2,
        daysPerUnit: 5,
        selectedUnitIds: ['u1'],
        availableUnits: [
            { id: 'u1', uObj: { id: 'u1', name: 'QRUnit' }, quickRead: true }
        ]
    }];
    
    ctx.autoFixAndReplan();
    
    assert.ok(ctx._autoFixPlan !== null && ctx._autoFixPlan.length === 1);
    assert.strictEqual(ctx._autoFixPlan[0].fixes[0].numChunks, 3, '1.2hr → 3 chunks');
    assert.strictEqual(ctx._autoFixPlan[0].fixes[0].toDays, 3, 'toDays 應為 3');
});
