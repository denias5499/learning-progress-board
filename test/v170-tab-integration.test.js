// v1.6.70.3: 整合測試 - 改用 addEventListener 取代 inline onclick
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

function createDom() {
    return new JSDOM(html, {
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        url: 'http://localhost/'
    });
}

test('v1.6.70.3: 4 個 nav pages 存在於 DOM', () => {
    const dom = createDom();
    const win = dom.window;
    assert.ok(win.document.getElementById('wn-page-import'), 'wn-page-import 應存在');
    assert.ok(win.document.getElementById('wn-page-notes'), 'wn-page-notes 應存在');
    assert.ok(win.document.getElementById('wn-page-stats'), 'wn-page-stats 應存在');
    assert.ok(win.document.getElementById('wn-page-practice'), 'wn-page-practice 應存在');
});

test('v1.6.70.3: switchWrongNotesView 直接呼叫切換 class 正確', () => {
    const dom = createDom();
    const win = dom.window;
    const importPage = win.document.getElementById('wn-page-import');
    const notesPage = win.document.getElementById('wn-page-notes');
    
    assert.ok(importPage.classList.contains('active'), 'import 初始應 active');
    
    win.switchWrongNotesView('notes');
    assert.ok(!importPage.classList.contains('active'), '切到 notes 後 import 應非 active');
    assert.ok(notesPage.classList.contains('active'), 'notes 應 active');
    
    win.switchWrongNotesView('stats');
    assert.ok(!notesPage.classList.contains('active'), '切到 stats 後 notes 應非 active');
    assert.ok(win.document.getElementById('wn-page-stats').classList.contains('active'));
});

test('v1.6.70.3: 備份按鈕在 btn-group 內 (沒有 inline onclick)', () => {
    const dom = createDom();
    const win = dom.window;
    const backupBtn = win.document.getElementById('nav-btn-backup');
    assert.ok(backupBtn, '備份按鈕應存在');
    assert.ok(backupBtn.closest('.btn-group'), '備份按鈕應在 btn-group 內');
    // v1.6.70.3: 沒有 inline onclick (用 addEventListener)
    assert.equal(backupBtn.getAttribute('onclick'), null, '備份按鈕不應有 inline onclick');
    assert.equal(backupBtn.getAttribute('data-action'), 'export-backup', '應有 data-action="export-backup"');
    // 文字不應有 emoji
    assert.ok(!backupBtn.textContent.includes('📥'), '備份按鈕不應有 emoji');
});

test('v1.6.70.3: 4 個 tabs 沒有 inline onclick (用 data-wntab + addEventListener)', () => {
    const dom = createDom();
    const win = dom.window;
    const tabs = win.document.querySelectorAll('[data-wntab]');
    tabs.forEach(function(tab) {
        assert.equal(tab.getAttribute('onclick'), null,
            tab.getAttribute('data-wntab') + ' tab 不應有 inline onclick');
    });
});

test('v1.6.70.3: openWrongNotes 後 點 tab 觸發 addEventListener 切換', () => {
    const dom = createDom();
    const win = dom.window;
    
    // 先呼叫 openWrongNotes (會綁定 addEventListener)
    // 關閉 alert (測試環境)
    win.alert = function() {};
    win.openWrongNotes();
    
    const notesPage = win.document.getElementById('wn-page-notes');
    const notesTab = win.document.querySelector('[data-wntab="notes"]');
    
    notesTab.click();
    assert.ok(notesPage.classList.contains('active'), 'click() 後 notes 應 active (via addEventListener)');
});
