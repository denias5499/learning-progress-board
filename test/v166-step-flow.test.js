// v1.6.66 7-step 錯題資料庫 flow 測試
//
// v1.6.66 設計:
// - import tab 保持 v1.6.65 樣貌 (學生/科目/教材類型/教材名/冊次/單元 + 錯題來源 + 6 reasons + 儲存)
// - 7-step flow 在獨立的 wn-flow-modal (從 crop 完成選取觸發)
// - wn-flow-modal 內含 wn-step-form (carousel + 6 dropdowns), wn-step-reasons (5 checkboxes), wn-step-note (3 欄筆記頁)

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

test('v1.6.66: import tab 保留 v1.6.65 結構 (6 dropdowns + 錯題來源 + 6 reasons + 儲存)', () => {
    // 確認 import tab 內還有原本的 6 dropdowns
    assert.ok(/<div id="wn-import"[^>]*active/.test(html), 'wn-import 應該存在且 active');
    assert.ok(/<select id="wn-student"[^>]*onchange="WN_onStudentChange/.test(html), 'wn-student dropdown 應保留');
    assert.ok(/<select id="wn-subject"[^>]*onchange="WN_onSubjectChange/.test(html), 'wn-subject dropdown 應保留');
    assert.ok(/<select id="wn-material"[^>]*onchange="WN_onMaterialChange/.test(html), 'wn-material dropdown 應保留');
    assert.ok(/<select id="wn-instance"[^>]*onchange="WN_onInstanceChange/.test(html), 'wn-instance dropdown 應保留');
    assert.ok(/<select id="wn-volume"[^>]*onchange="WN_onVolumeChange/.test(html), 'wn-volume dropdown 應保留');
    assert.ok(/<select id="wn-unit"[^>]*>/.test(html), 'wn-unit dropdown 應保留');
    // 錯題來源
    assert.ok(/<select id="wn-source"[^>]*>/.test(html), 'wn-source dropdown 應保留');
    // 6 reasons (原本)
    assert.ok(/data-reason="計算錯誤"/.test(html), '計算錯誤 reason 應保留');
    assert.ok(/data-reason="粗心"/.test(html), '粗心 reason 應保留');
    assert.ok(/data-reason="考試緊張"/.test(html), '考試緊張 reason 應保留');
    // 儲存按鈕
    assert.ok(/onclick="WN_saveNote\(\)">💾 儲存筆記/.test(html), '💾 儲存筆記按鈕應保留');
});

test('v1.6.66: 7-step flow 在獨立的 wn-flow-modal', () => {
    assert.ok(/<div id="wn-flow-modal"[^>]*>/.test(html), 'wn-flow-modal 應獨立存在');
    assert.ok(/<div id="wn-flow-area">/.test(html), 'wn-flow-area 應在 modal 內');
    // 確認 modal 不在 wn-import 內 (找 wn-import 關閉 div 跟 wn-flow-modal 之間)
    const importEndIdx = html.indexOf('wn-import');
    const importDivEnd = html.indexOf('<!-- 查看錯題筆記頁面 -->', importEndIdx);
    const flowModalIdx = html.indexOf('wn-flow-modal');
    // wn-flow-modal 應該在 import 區塊後
    assert.ok(flowModalIdx > importDivEnd, 'wn-flow-modal 應該在 import tab 區塊後');
});

test('v1.6.66: wn-step-form (Step 2~6) 內含 6 dropdowns + carousel', () => {
    const m = html.match(/<div[^>]*id="wn-step-form"[^>]*>([\s\S]*?)<div[^>]*id="wn-step-reasons"/);
    assert.ok(m, '#wn-step-form 區塊不存在');
    const formHtml = m[1];
    const selects = formHtml.match(/<select[^>]*id="wn-flow-\w+"[^>]*>/g) || [];
    assert.equal(selects.length, 6, '應該有 6 個 select, 實際 ' + selects.length);
    const ids = selects.map(s => s.match(/id="wn-flow-(\w+)"/)[1]).sort();
    assert.deepEqual(ids, ['instance', 'material', 'student', 'subject', 'unit', 'volume']);
    assert.ok(/id="wn-flow-counter"/.test(formHtml), 'wn-flow-counter 應存在');
    assert.ok(/WN_flowPrevCard/.test(formHtml), 'WN_flowPrevCard 應在 form 內');
    assert.ok(/WN_flowNextCard/.test(formHtml), 'WN_flowNextCard 應在 form 內');
});

test('v1.6.66: wn-step-reasons (Step 7) 含 5 checkboxes', () => {
    const m = html.match(/<div[^>]*id="wn-step-reasons"[^>]*>([\s\S]*?)<div[^>]*id="wn-step-note"/);
    assert.ok(m, '#wn-step-reasons 區塊不存在');
    const reasonsHtml = m[1];
    const checkboxes = reasonsHtml.match(/<input type="checkbox" value="([^"]+)"/g) || [];
    assert.equal(checkboxes.length, 5);
    const values = checkboxes.map(cb => cb.match(/value="([^"]+)"/)[1]);
    assert.deepEqual(values, ['計算錯誤', '概念不清楚', '公式記錯', '粗心', '審題不清']);
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

test('v1.6.66: generateNote() 不再是 stub, 呼叫 WN_generateNote()', () => {
    const body = getFunctionBody('generateNote');
    assert.ok(body, 'generateNote 應該定義');
    assert.ok(/WN_generateNote\(\)/.test(body), '應該呼叫 WN_generateNote()');
    assert.ok(!/alert\(['"]\[Phase 1\]/.test(body), '不應是 Phase 1 stub');
});

test('v1.6.66: saveNotes() 不再是 stub, 呼叫 WN_saveFinalNote()', () => {
    const body = getFunctionBody('saveNotes');
    assert.ok(body, 'saveNotes 應該定義');
    assert.ok(/WN_saveFinalNote\(\)/.test(body), '應該呼叫 WN_saveFinalNote()');
    assert.ok(!/alert\(['"]\[Phase 1\]/.test(body), '不應是 Phase 1 stub');
});
