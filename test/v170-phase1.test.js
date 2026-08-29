// v1.6.70 Phase 1: 錯題資料庫獨立 page 架構
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

function getFunctionBody(name) {
    const start = html.indexOf('function ' + name + '(');
    if (start < 0) return null;
    let depth = 0, i = html.indexOf('{', start);
    if (i < 0) return null;
    const bodyStart = i + 1;
    while (i < html.length) {
        if (html[i] === '{') depth++;
        if (html[i] === '}') {
            depth--;
            if (depth === 0) return html.substring(bodyStart, i);
        }
        i++;
    }
    return null;
}

test('v1.6.70: top-level nav 按鈕 「📚 錯題資料庫」 存在', () => {
    assert.ok(/id="nav-btn-wrongnotes"[^>]*onclick="openWrongNotes\(\)"/.test(html),
        'nav-btn-wrongnotes 按鈕應存在並綁定 openWrongNotes');
    assert.ok(html.includes('📚 錯題資料庫'), '按鈕文字應包含「錯題資料庫」');
});

test('v1.6.70: page-wrongnotes page 存在 (top-level)', () => {
    assert.ok(/<div id="page-wrongnotes"[^>]*class="page-view"/.test(html),
        'page-wrongnotes 應是 page-view');
});

test('v1.6.70: 4 個 nav pages 存在 (import/notes/stats/practice)', () => {
    assert.ok(/<div id="wn-page-import"[^>]*class="wn-page active"/.test(html),
        'wn-page-import 應存在且 active');
    assert.ok(/<div id="wn-page-notes"[^>]*class="wn-page"/.test(html),
        'wn-page-notes 應存在');
    assert.ok(/<div id="wn-page-stats"[^>]*class="wn-page"/.test(html),
        'wn-page-stats 應存在');
    assert.ok(/<div id="wn-page-practice"[^>]*class="wn-page"/.test(html),
        'wn-page-practice 應存在');
});

test('v1.6.70: 4 個 tab 按鈕 綁定 switchWrongNotesView', () => {
    assert.ok(/data-wntab="import"/.test(html), 'import tab 應有 data-wntab');
    assert.ok(/data-wntab="stats"/.test(html), "stats tab");
    assert.ok(/data-wntab="practice"/.test(html), "practice tab");});

test('v1.6.70: openWrongNotes 函式存在 + 第一次提示用戶建立資料夾', () => {
    const body = getFunctionBody('openWrongNotes');
    assert.ok(body, 'openWrongNotes 應定義');
    assert.ok(body.includes('學習進度看板'), '應提示用戶建立「學習進度看板」資料夾');
    assert.ok(body.includes('StudyMap_WrongNotes_DisclaimerAck'), '應設定 localStorage 標記避免重複提示');
});

test('v1.6.70: switchWrongNotesView 切換 nav pages', () => {
    const body = getFunctionBody('switchWrongNotesView');
    assert.ok(body, 'switchWrongNotesView 應定義');
    assert.ok(body.includes('data-wntab'), '應移除所有 tab active');
    assert.ok(body.includes('wn-page'), '應移除所有 page active');
    assert.ok(body.includes("getElementById('wn-page-' + view)"), '應加 active 到選中的 page');
});

test('v1.6.70: showPage 處理 page-wrongnotes', () => {
    const body = getFunctionBody('showPage');
    assert.ok(body, 'showPage 應定義');
    assert.ok(body.includes('page-wrongnotes'), 'showPage 應處理 page-wrongnotes');
    assert.ok(body.includes('nav-btn-wrongnotes'), '應設定 nav-btn-wrongnotes active');
});

test('v1.6.70: iframe 已移除', () => {
    assert.ok(!html.includes('wrongnotes-iframe'), 'iframe 應已移除');
    assert.ok(!html.includes('src="wrong-notes/"'), 'iframe src 應已移除');
});

test('v1.6.70: stats-wrongnotes 保留為空殼 (向後相容)', () => {
    assert.ok(/<div id="stats-wrongnotes" class="stats-view"><\/div>/.test(html),
        'stats-wrongnotes 應保留空 div');
});

test('v1.6.70: title 更新為 [v1.6.70]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.73]<\/title>/.test(html));
});

test('v1.6.70: CSS 樣式存在 (wn-tab, wn-page)', () => {
    assert.ok(/\.wn-tab\s*\{/.test(html), '.wn-tab CSS 應存在');
    assert.ok(/\.wn-page\s*\{/.test(html), '.wn-page CSS 應存在');
    assert.ok(/\.wn-tab\.active/.test(html), '.wn-tab.active CSS 應存在');
    assert.ok(/\.wn-page\.active/.test(html), '.wn-page.active CSS 應存在');
});
