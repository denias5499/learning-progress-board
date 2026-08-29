// v1.6.66 7-step 錯題資料庫 flow 測試
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

test('v1.6.66: 5 個錯題原因 checkboxes', () => {
    const m = html.match(/<div[^>]*id="wn-flow-reasons"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*style="margin-top:12px/);
    assert.ok(m, '#wn-flow-reasons 區塊不存在');
    const checkboxes = m[1].match(/<input type="checkbox" value="([^"]+)"/g) || [];
    assert.equal(checkboxes.length, 5);
    const values = checkboxes.map(cb => cb.match(/value="([^"]+)"/)[1]);
    assert.deepEqual(values, ['計算錯誤', '概念不清楚', '公式記錯', '粗心', '審題不清']);
});

test('v1.6.66: 6 dropdowns (Step 2~6) 在 #wn-step-form 內', () => {
    const m = html.match(/<div[^>]*id="wn-step-form"[^>]*>([\s\S]*?)<div[^>]*id="wn-step-reasons"/);
    assert.ok(m, '#wn-step-form 區塊不存在');
    const selects = m[1].match(/<select[^>]*id="wn-flow-\w+"[^>]*>/g) || [];
    assert.equal(selects.length, 6, '應該有 6 個 select, 實際 ' + selects.length);
    const ids = selects.map(s => s.match(/id="wn-flow-(\w+)"/)[1]).sort();
    assert.deepEqual(ids, ['instance', 'material', 'student', 'subject', 'unit', 'volume']);
});

test('v1.6.66: WN_completeCrop 函式定義 + flow state 初始化', () => {
    const body = getFunctionBody('WN_completeCrop');
    assert.ok(body, 'WN_completeCrop 應該定義');
    assert.ok(/flowImages\s*=/.test(body), '應該有 flowImages 初始化');
    assert.ok(/flowPerCard\s*=/.test(body), '應該有 flowPerCard 初始化');
});

test('v1.6.66: WN_saveFinalNote 呼叫 WN_saveNotes + 切 wn-notes tab', () => {
    const body = getFunctionBody('WN_saveFinalNote');
    assert.ok(body, 'WN_saveFinalNote 應該定義');
    assert.ok(/WN_saveNotes\(notes\)/.test(body), '應該呼叫 WN_saveNotes(notes)');
    assert.ok(/WN_switchTab\(['"]notes['"]\)/.test(body), '應該切到 wn-notes tab');
});

test('v1.6.66: 3 欄 note page 結構', () => {
    const m = html.match(/<div[^>]*id="wn-step-note"[^>]*wn-note-page[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
    assert.ok(m, 'wn-step-note 區塊不存在');
    const noteHtml = m[0];
    assert.ok(/class="wn-note-left"/.test(noteHtml), '左側應存在');
    assert.ok(/class="wn-note-middle"/.test(noteHtml), '中間應存在');
    assert.ok(/class="wn-note-header"/.test(noteHtml), 'header 應存在');
    assert.ok(/class="wn-note-footer"/.test(noteHtml), 'footer 應存在');
});

test('v1.6.66: generateNote() 不再是 stub', () => {
    const body = getFunctionBody('generateNote');
    assert.ok(body, 'generateNote 應該定義');
    assert.ok(/WN_generateNote\(\)/.test(body), '應該呼叫 WN_generateNote()');
    assert.ok(!/alert\(['"]\[Phase 1\]/.test(body), '不應是 Phase 1 stub');
});

test('v1.6.66: saveNotes() 不再是 stub', () => {
    const body = getFunctionBody('saveNotes');
    assert.ok(body, 'saveNotes 應該定義');
    assert.ok(/WN_saveFinalNote\(\)/.test(body), '應該呼叫 WN_saveFinalNote()');
    assert.ok(!/alert\(['"]\[Phase 1\]/.test(body), '不應是 Phase 1 stub');
});

test('v1.6.66: 完成選取按鈕綁定 WN_completeCrop', () => {
    assert.ok(/<button[^>]*onclick="WN_completeCrop\(\)"[^>]*>完成選取<\/button>/.test(html),
        '完成選取按鈕應該呼叫 WN_completeCrop()');
});
