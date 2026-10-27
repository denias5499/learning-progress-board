const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function section(a, b) {
    const start = html.indexOf(a), end = html.indexOf(b, start + a.length);
    assert.ok(start >= 0 && end > start, a);
    return html.slice(start, end);
}
function student(label, category = '自訂分類', missions = {}) {
    const instance = { id: 'book-' + label, name: label + '教材', type: 'volume',
        volOrder: ['第一冊'], vols: { 第一冊: [{ id: label, name: label + '單元', start: 1, end: 3 }] } };
    return { name: label, masters: { [category]: { 數學: { materials: { 講義: { instances: [instance] } } } } }, missions, plans: [], logs: [] };
}
function setup(t) {
    const dom = new JSDOM('<select id="user-selector"><option value="empty">空白學生</option><option value="owner">張裕宣</option><option value="other">另一位</option></select>' +
        ['master-set-cat', 'master-set-mis', 'set-cat', 'set-mis', 'master-subject', 'master-type', 'master-instance'].map(id => `<select id="${id}"><option value="">(無)</option></select>`).join('') +
        '<div id="pane-master" class="active"></div><div id="master-editor-root"></div><div id="master-current-user-hint"></div>');
    t.after(() => dom.window.close());
    const jobs = [], storage = new Map();
    const c = vm.createContext({
        document: dom.window.document, multiData: { empty: { name: '空白學生', masters: {}, missions: {}, logs: [], plans: [] },
            owner: student('張裕宣'), other: student('另一位', '不同分類', { 不同分類: {} }) },
        currentUserId: 'empty', appMaster: {}, appCurrentCat: '', appMissions: {}, appLogs: [], appPlans: [],
        lastMasterSub: '', el: id => dom.window.document.getElementById(id), console: { log() {}, warn() {}, error() {} },
        localStorage: { setItem: (k, v) => storage.set(k, v) }, STORAGE_KEY_CURRENT_USER: 'uid',
        DEFAULT_AVATAR: '', escapeHtml: s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'),
        setTimeout: fn => jobs.push(fn), isUnitBasedType: () => false,
        _v141FindOtherOwner: () => null, _v142ClassifyUser: () => ({ isPolluted: false }),
        cleanDuplicateSameDayTasks: () => 0, autoMigrateLogsToCalendar() {}, _v144UpdateMasterHealth() {},
        updateFilters() {}, renderCalendar() {}, renderDashboard() {}, renderTreeView() {}, renderMonthlyAnalysis() {},
        renderMissionCheckboxes() {}, renderHistoryTable() {}, invalidateSchedCache() {}, showPage() {}, _updateMisTypeFilterDropdown() {},
        _v136UpdateUserHints() { c.el('master-current-user-hint').textContent = c.multiData[c.currentUserId].name; },
        addSettingRow(id, unit) {
            const container = c.el(id); if (!container) return;
            const row = dom.window.document.createElement('div'); row.className = 'setting-unit-row';
            row.dataset.uid = unit.id;
            for (const [key, value] of [['name', unit.name], ['start', unit.start], ['end', unit.end]]) {
                const input = dom.window.document.createElement('input'); input.className = 'cfg-' + key; input.value = value; row.append(input);
            }
            container.append(row);
        }
    });
    c.window = c;
    const sources = [
        ['function populateSelect(', 'function buildMissionTree('],
        ['function syncAllCatMisDropdowns(', 'function openSettings('],
        ['function _v139AssertMasterOwnership(', '// v2.3.2.139: ★★ 教材庫 UI'],
        ['function _v139SyncMasterUI(', '// v2.3.2.136: 在畫面上標示'],
        ['function populateMasterTypeDropdown(', 'function onMasterTypeChange('],
        ['function getCurrentInstanceData(', '// v1.5.8 補丁:'],
        ['function renderMasterEditor(', 'function addSettingRow('],
        ['function onMasterSetCatChange(', '// v1.5.13: 更新 type filter'],
        ['function _v142RerenderAfterUserSwitch(', '// v2.3.2.142: ★★ 「污染使用者」'],
        ['function switchUser(', '// v2.3.2.139: ★★ 教材庫「擁有者守門員」'],
        ['function openSettings(', 'function switchTab('],
        ['function onSetCatChange(', 'function addCat('],
        ['function extractCurrentEditorData(', 'function handleMasterSubjectChange(']
    ];
    for (const [a, b] of sources) vm.runInContext(section(a, b), c);
    return { c, dom, flush: () => { while (jobs.length) jobs.shift()(); }, switchTo(uid) { c.el('user-selector').value = uid; c.switchUser(); } };
}
function unitNames(h) { return [...h.dom.window.document.querySelectorAll('.cfg-name')].map(input => input.value); }

test('空白學生切到有教材、但沒有任務分類的張裕宣，立即顯示教材', t => {
    const h = setup(t); h.switchTo('owner'); h.flush();
    assert.equal(h.c.el('master-set-cat').value, '自訂分類');
    assert.equal(h.c.el('master-subject').value, '數學');
    assert.deepEqual(unitNames(h), ['張裕宣單元']);
});
test('進入教材庫設定頁也不能因任務分類缺少而清空教材畫面', t => {
    const h = setup(t); h.switchTo('owner'); h.c.openSettings(); h.flush();
    assert.deepEqual(unitNames(h), ['張裕宣單元']);
});
test('多次來回切換不同分類的學生，最後的名稱、選單、教材一致', t => {
    const h = setup(t);
    for (const uid of ['owner', 'other', 'empty', 'other', 'owner']) { h.switchTo(uid); h.flush(); }
    assert.equal(h.c.el('master-current-user-hint').textContent, '張裕宣');
    assert.equal(h.c.el('master-set-cat').value, '自訂分類');
    assert.deepEqual(unitNames(h), ['張裕宣單元']);
});
test('空白學生不殘留上一位的科目、教材類型、教材名稱與單元', t => {
    const h = setup(t); h.switchTo('other'); h.flush(); h.switchTo('empty'); h.flush();
    for (const id of ['master-subject', 'master-type', 'master-instance']) assert.equal(h.c.el(id).value, '', id);
    assert.deepEqual(unitNames(h), []);
    assert.equal(Object.keys(h.c.multiData.empty.masters).length, 0);
});
test('舊的延遲繪製不得把另一位學生的單元加回目前畫面', t => {
    const h = setup(t); h.switchTo('other'); h.switchTo('owner'); h.flush();
    assert.deepEqual(unitNames(h), ['張裕宣單元']);
});
test('同一教材連續重繪不會重複加入單元', t => {
    const h = setup(t); h.switchTo('other');
    h.c.renderMasterEditor(); h.c.renderMasterEditor(); h.flush();
    assert.deepEqual(unitNames(h), ['另一位單元']);
});
test('切換後編輯只影響目前學生，先前學生的教材與任務保留', t => {
    const h = setup(t); const before = JSON.stringify(h.c.multiData.other);
    h.switchTo('other'); h.flush(); h.switchTo('owner'); h.flush();
    h.dom.window.document.querySelector('.cfg-name').value = '修改後的單元';
    h.c.extractCurrentEditorData();
    assert.equal(h.c.getCurrentInstanceData().instance.vols['第一冊'][0].name, '修改後的單元');
    assert.equal(JSON.stringify(h.c.multiData.other), before);
});
test('單元還在等待繪製時，不把空白畫面擷取回教材資料', t => {
    const h = setup(t); const before = JSON.stringify(h.c.multiData.other.masters);
    h.switchTo('other'); h.c.extractCurrentEditorData(); h.flush();
    assert.equal(JSON.stringify(h.c.multiData.other.masters), before);
    assert.deepEqual(unitNames(h), ['另一位單元']);
});
