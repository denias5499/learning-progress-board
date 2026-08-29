// v1.6.70 Phase 1 完成後, v166-step-flow 改為測試「iframe 已移除 + page-wrongnotes 存在」
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const INDEX_HTML = path.join(PROJECT_ROOT, 'index.html');
const WRONG_NOTES_HTML = path.join(PROJECT_ROOT, 'wrong-notes', 'index.html');
const indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');
const wrongNotesExists = fs.existsSync(WRONG_NOTES_HTML);

test('v1.6.70: wrong-notes/index.html 還存在 (附件參考)', () => {
    assert.ok(wrongNotesExists, 'wrong-notes/index.html 應存在');
});

test('v1.6.70: iframe 已完全移除', () => {
    assert.ok(!indexHtml.includes('wrongnotes-iframe'), 'iframe 應已移除');
    assert.ok(!indexHtml.includes('src="wrong-notes/"'), 'iframe src 應已移除');
});

test('v1.6.70: stats-wrongnotes 保留為空殼 (向後相容)', () => {
    assert.ok(/<div id="stats-wrongnotes" class="stats-view"><\/div>/.test(indexHtml),
        'stats-wrongnotes 應保留空 div');
});

test('v1.6.70: page-wrongnotes 取代 iframe 成為 top-level tab', () => {
    assert.ok(/<div id="page-wrongnotes"[^>]*class="page-view"/.test(indexHtml),
        'page-wrongnotes 應是 page-view');
    assert.ok(/id="nav-btn-wrongnotes"[^>]*onclick="openWrongNotes\(\)"/.test(indexHtml),
        'top-level nav 按鈕應存在');
});

test('v1.6.70: 4 個 nav pages (import/notes/stats/practice) 存在', () => {
    assert.ok(/id="wn-page-import"/.test(indexHtml));
    assert.ok(/id="wn-page-notes"/.test(indexHtml));
    assert.ok(/id="wn-page-stats"/.test(indexHtml));
    assert.ok(/id="wn-page-practice"/.test(indexHtml));
});

test('v1.6.70: title 更新為 [v1.6.70]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.70\.1\]<\/title>/.test(indexHtml));
});
