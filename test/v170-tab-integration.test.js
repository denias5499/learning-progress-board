// v1.6.70.1: 整合測試 - 用真實 DOM 驗證 tab 切換 + 備份按鈕位置
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

// Helper: create JSDOM and wait for init
function createDom() {
    const dom = new JSDOM(html, {
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        url: 'http://localhost/'
    });
    // jsdom 跑 init 是同步的 (因為有 try-catch 包 init throw)
    return dom;
}

test('v1.6.70.1: 4 個 nav pages 存在於 DOM', () => {
    const dom = createDom();
    const win = dom.window;
    assert.ok(win.document.getElementById('wn-page-import'), 'wn-page-import 應存在');
    assert.ok(win.document.getElementById('wn-page-notes'), 'wn-page-notes 應存在');
    assert.ok(win.document.getElementById('wn-page-stats'), 'wn-page-stats 應存在');
    assert.ok(win.document.getElementById('wn-page-practice'), 'wn-page-practice 應存在');
});

test('v1.6.70.1: switchWrongNotesView 切換 class 正確', () => {
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

test('v1.6.70.1: 備份按鈕 nav-btn-backup 在 btn-group 內', () => {
    const dom = createDom();
    const win = dom.window;
    const backupBtn = win.document.getElementById('nav-btn-backup');
    assert.ok(backupBtn, '備份按鈕應存在');
    assert.ok(backupBtn.closest('.btn-group'), '備份按鈕應在 btn-group 內');
    assert.equal(backupBtn.getAttribute('onclick'), 'exportDataToFile()');
});

test('v1.6.70.1: 舊的 backup-status-bar/icon/text 已移除', () => {
    const dom = createDom();
    const win = dom.window;
    assert.ok(!win.document.getElementById('backup-status-bar'), 'backup-status-bar 應已移除');
    assert.ok(!win.document.getElementById('backup-status-icon'), 'backup-status-icon 應已移除');
    assert.ok(!win.document.getElementById('backup-status-text'), 'backup-status-text 應已移除');
});

test('v1.6.70.1: 點擊 tab 觸發 onclick 切換', () => {
    const dom = createDom();
    const win = dom.window;
    const notesTab = win.document.querySelector('[data-wntab="notes"]');
    assert.ok(notesTab, 'notes tab 應存在');
    
    notesTab.click();
    const notesPage = win.document.getElementById('wn-page-notes');
    assert.ok(notesPage.classList.contains('active'), 'click() 後 notes 應 active');
});
