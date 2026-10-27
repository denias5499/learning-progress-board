const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function section(start, end) {
    const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
    assert.ok(a >= 0 && b > a);
    return html.slice(a, b);
}
const plain = x => JSON.parse(JSON.stringify(x));
function sandbox(users) {
    let next = 0;
    const selector = { value: 'owner', innerHTML: '' };
    const c = vm.createContext({
        multiData: plain(users), console: { log() {}, warn() {} },
        localStorage: { getItem: () => null },
        fixStaleVolInPlans: () => 0, fixEmptyVolInPlans() {},
        genId: () => 'new_' + (++next),
        openInputModal: (title, initial, done) => done('新學生'),
        saveToLocal() {}, el: () => selector,
        switchUser() { c.currentUserId = selector.value; },
        renderUserManageList() {}, alert() {}
    });
    vm.runInContext(section('function _v154Migrate(', '// v1.5.29: 同步 plan.grid'), c);
    vm.runInContext(section('function addNewUser()', 'function renameUser('), c);
    return c;
}
function reload(c) {
    // 模擬存檔重讀後依照 initUsers 的順序重新遷移。
    c.multiData = plain(c.multiData);
    Object.keys(c.multiData).forEach(uid => { c._v154Migrate(uid); c._v158Migrate(uid); });
}
const empty = () => ({ masters: {}, missions: {}, plans: [], logs: [] });
test('空白使用者與舊 master:{} 使用者反覆重載都不產生預設分類、科目與任務', () => {
    const c = sandbox({ blank: empty(), legacy: { master: {}, missions: {}, plans: [], logs: [] } });
    for (let i = 0; i < 3; i++) reload(c);
    for (const u of Object.values(c.multiData)) {
        assert.deepEqual(plain(u.masters), {});
        assert.deepEqual(plain(u.missions), {});
    }
});
test('完整重置標記不會被後段遷移繞過，重新載入保持空白', () => {
    const c = sandbox({ reset: { ...empty(), _v144Empty: true, _v1511_default_added: true } });
    reload(c); reload(c);
    assert.deepEqual(plain(c.multiData.reset.masters), {});
    assert.deepEqual(plain(c.multiData.reset.missions), {});
});
test('新增學生即為空白，重載不帶入另一位使用者的教材', () => {
    const owner = { masters: { 自建分類: { 數學: { units: [{ id: 'own', name: '我的單元' }] } } },
        missions: { 自建分類: { 自建任務: ['own'] } }, plans: [], logs: [] };
    const c = sandbox({ owner });
    c.addNewUser();
    const uid = c.currentUserId;
    assert.notEqual(uid, 'owner');
    assert.deepEqual(plain(c.multiData[uid].masters), {});
    assert.deepEqual(plain(c.multiData[uid].missions), {});
    reload(c); reload(c);
    assert.deepEqual(plain(c.multiData[uid].masters), {});
    assert.deepEqual(plain(c.multiData[uid].missions), {});
    assert.deepEqual(plain(c.multiData.owner), owner);
});
test('保留本人的舊教材，不補入地科或段考預設科目', () => {
    const master = { 數學: { units: [{ id: 'math', name: '自建單元' }] } };
    const c = sandbox({ legacy: { master, missions: {}, plans: [], logs: [] } });
    reload(c); reload(c);
    assert.deepEqual(plain(c.multiData.legacy.masters), { 會考複習: master });
});
test('保留既存空白科目與任務，避免誤刪手動建立的結構', () => {
    const user = { ...empty(), masters: { 會考複習: { 地科: { materials: {} } }, 段考複習: {} },
        missions: { 會考複習: { 一模: [], 二模: [] }, 段考複習: {} } };
    const c = sandbox({ user }); reload(c); reload(c);
    assert.deepEqual(plain(c.multiData.user), user);
});
test('仍從本人的既有計畫恢復任務關聯，保留勾選內容', () => {
    const task = { cat: '自建分類', mis: '自建任務', unitId: 'u1' };
    const c = sandbox({ user: { ...empty(), missions: { 自建分類: { 自建任務: ['u2'] } },
        plans: [{ grid: { '2026-10-28': [task] } }] } });
    reload(c); reload(c);
    assert.deepEqual(plain(c.multiData.user.missions), { 自建分類: { 自建任務: ['u1', 'u2'] } });
    assert.deepEqual(Object.keys(c.multiData.user.masters), ['自建分類']);
});

test('完整頁面初始化、切換學生、存檔與重新載入均保持教材庫隔離', () => {
    const { JSDOM, VirtualConsole } = require('jsdom');
    const key = 'StudyMap_Family_Data_V20';
    const cur = 'StudyMap_CurrentUserId_V20';
    const owner = { name: '原學生', ...empty(), masters: { 自建分類: { 數學: { materials: {} } } },
        missions: { 自建分類: {} } };
    function page(data, uid) {
        const d = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only',
            pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
        const w = d.window;
        w.alert = () => {}; w.confirm = () => false;
        w.HTMLCanvasElement.prototype.getContext = () => null;
        w.localStorage.setItem(key, JSON.stringify(data));
        w.localStorage.setItem(cur, uid);
        try {
            for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) w.eval(m[1]);
            assert.ok(w.document.getElementById('master-current-user-hint').textContent.includes(data[uid].name));
            return d;
        } catch (e) { d.window.close(); throw e; }
    }
    let d = page({ owner, blank: { name: '新學生', ...empty() } }, 'owner');
    let saved;
    try {
        const w = d.window;
        w.document.getElementById('user-selector').value = 'blank';
        w.switchUser(); w.saveToLocal();
        assert.ok(w.document.getElementById('master-current-user-hint').textContent.includes('新學生'));
        assert.equal(Array.from(w.document.getElementById('master-subject').options).filter(o => o.value).length, 0);
        assert.equal(Array.from(w.document.getElementById('master-set-cat').options).filter(o => o.value).length, 0);
        saved = JSON.parse(w.localStorage.getItem(key));
        assert.deepEqual(saved.blank.masters, {});
        assert.deepEqual(saved.blank.missions, {});
        assert.deepEqual(saved.owner.masters, owner.masters);
    } finally { d.window.close(); }
    d = page(saved, 'blank');
    try {
        const savedAgain = JSON.parse(d.window.localStorage.getItem(key));
        assert.deepEqual(savedAgain.blank.masters, {});
        assert.deepEqual(savedAgain.blank.missions, {});
        assert.equal(Array.from(d.window.document.getElementById('master-subject').options).filter(o => o.value).length, 0);
        assert.deepEqual(savedAgain.owner.masters, saved.owner.masters);
    } finally { d.window.close(); }
});
