// v1.6.96: 修「儲存失敗: appMaster[sub].volOrder」bug
const test = require('node:test');
const assert = require('node:assert/strict');
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

test('v1.6.96: extractCurrentEditorData 加 explicit 大括號 (避免 ASI bug)', () => {
    const body = getFunctionBody('extractCurrentEditorData');
    assert.ok(body, '應定義');
    // 應該有 return 帶大括號
    assert.ok(body.includes('if(!sub || !appMaster[sub]) { return; }'), 
        '應有 explicit 大括號 + return + 分號');
});

test('v1.6.96: extractCurrentEditorData 仍呼叫 getCurrentInstanceData', () => {
    const body = getFunctionBody('extractCurrentEditorData');
    assert.ok(body.includes('getCurrentInstanceData()'), '應呼叫 getCurrentInstanceData');
    assert.ok(body.includes('var target = data.instance'), '應設 var target = data.instance');
});

test('v1.6.96: saveSettingsAndAlert 移除 try/catch (讓錯誤顯示)', () => {
    const body = getFunctionBody('saveSettingsAndAlert');
    assert.ok(body, '應定義');
    assert.ok(!body.includes("console.error('[v1.6.95]"), '不應有 v1.6.95 console.error');
    assert.ok(body.includes('openSaveConfirmModal()'), '應呼叫 openSaveConfirmModal');
    assert.ok(body.includes('saveToLocal()'), '應呼叫 saveToLocal');
});

test('v1.6.96: saveSettingsAndAlert 先關閉其他 modal', () => {
    const body = getFunctionBody('saveSettingsAndAlert');
    assert.ok(body.includes("querySelectorAll('.modal-bg')"), '應查詢所有 modal-bg');
    assert.ok(body.includes("modal-save-confirm"), '應保留 modal-save-confirm');
});

test('v1.6.96: title 更新為 [v1.6.96]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.96\]<\/title>/.test(html));
});
