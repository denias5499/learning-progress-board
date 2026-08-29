// v1.6.67: iframe 嵌入 standalone 錯題資料庫測試
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const INDEX_HTML = path.join(PROJECT_ROOT, 'index.html');
const WRONG_NOTES_HTML = path.join(PROJECT_ROOT, 'wrong-notes', 'index.html');
const indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');
const wrongNotesExists = fs.existsSync(WRONG_NOTES_HTML);

function getFunctionBody(html, name) {
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

test('v1.6.68: wrong-notes/index.html 存在', () => {
    assert.ok(wrongNotesExists, 'wrong-notes/index.html 應存在');
});

test('v1.6.68: 附件是獨立 HTML (有 doctype + title)', () => {
    if (!wrongNotesExists) return;
    const content = fs.readFileSync(WRONG_NOTES_HTML, 'utf8');
    assert.ok(/<!DOCTYPE html>/.test(content));
    assert.ok(/<title>錯題資料庫<\/title>/.test(content));
});

test('v1.6.68: 附件含 4 個 nav pages', () => {
    if (!wrongNotesExists) return;
    const content = fs.readFileSync(WRONG_NOTES_HTML, 'utf8');
    assert.ok(/id="nav-import"[^>]*>匯入錯題/.test(content));
    assert.ok(/id="nav-view"[^>]*>查看錯題筆記/.test(content));
    assert.ok(/id="nav-data"[^>]*>錯題數據分析/.test(content));
    assert.ok(/id="nav-practice"[^>]*>錯題再練/.test(content));
    assert.ok(/id="import-page"/.test(content));
    assert.ok(/id="note-page"/.test(content));
    assert.ok(/id="data-page"/.test(content));
});

test('v1.6.68: 主專案 #stats-wrongnotes 含 iframe 嵌入附件', () => {
    const m = indexHtml.match(/<div id="stats-wrongnotes"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/);
    assert.ok(m, '#stats-wrongnotes 區塊應存在');
    const block = m[0];
    assert.ok(/<iframe[^>]*src="wrong-notes\/"/.test(block), 'iframe src 應指向 wrong-notes/');
    assert.ok(/<iframe[^>]*id="wrongnotes-iframe"/.test(block), 'iframe id 應是 wrongnotes-iframe');
    assert.ok(/<iframe[^>]*title="錯題資料庫"/.test(block), 'iframe 應有 title');
});

test('v1.6.68: 主專案 #wrongnotes-root 已移除', () => {
    const matches = indexHtml.match(/id="wrongnotes-root"/g) || [];
    assert.equal(matches.length, 0, '#wrongnotes-root 元素應已移除');
});

test('v1.6.68: switchStatsView 不再呼叫 renderWrongNotesView', () => {
    const body = getFunctionBody(indexHtml, 'switchStatsView');
    assert.ok(body, 'switchStatsView 應該定義');
    assert.ok(!/renderWrongNotesView\s*\(/.test(body), '不應再呼叫 renderWrongNotesView');
});

test('v1.6.68: title 更新為 [v1.6.68]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.68\]<\/title>/.test(indexHtml));
});

test('v1.6.68: 主專案不再有 wn-import tab', () => {
    assert.ok(!/<div id="wn-import"/.test(indexHtml), '#wn-import 元素應已移除');
});

test('v1.6.68: iframe 高 85vh 寬 100%', () => {
    const iframeMatch = indexHtml.match(/<iframe[^>]*id="wrongnotes-iframe"[^>]*>/);
    assert.ok(iframeMatch);
    const tag = iframeMatch[0];
    assert.ok(/height:\s*85vh/.test(tag));
    assert.ok(/width:\s*100%/.test(tag));
});
