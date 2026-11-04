// v1.6.95: 修「新增大分類後, 儲存按鈕沒彈 modal」bug
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

test('v1.6.95: saveSettingsAndAlert 加 try/catch (避免 exception 中斷)', () => {
    const body = getFunctionBody('saveSettingsAndAlert');
    assert.ok(body, '應定義');
    assert.ok(body.includes('try {'), '應有 try block');
    assert.ok(body.includes('catch(e)'), '應有 catch block');
    assert.ok(body.includes('extractCurrentEditorData'), '應呼叫 extractCurrentEditorData');
    assert.ok(body.includes('saveToLocal'), '應呼叫 saveToLocal');
    assert.ok(body.includes('openSaveConfirmModal'), '應呼叫 openSaveConfirmModal');
});



test('v1.6.95: addCatWithSubject 同步 user.masters (避免儲存後消失)', () => {
    const body = getFunctionBody('confirmAddCatWithSubject');
    assert.ok(body, '應定義');
    assert.ok(body.includes('user.masters[name]'), '應同步 user.masters');
});

test('v1.6.95: addCat 同步 user.masters (v1.5.8 已有)', () => {
    const body = getFunctionBody('addCat');
    assert.ok(body, '應定義');
    assert.ok(body.includes('user.masters[name]'), '應同步 user.masters');
});

test('v1.6.95: openSaveConfirmModal 函式存在', () => {
    assert.ok(getFunctionBody('openSaveConfirmModal'), '應定義');
});

test('v1.6.95: extractCurrentEditorData 函式存在', () => {
    assert.ok(getFunctionBody('extractCurrentEditorData'), '應定義');
});

test('v1.6.95: title 更新為 [v1.6.95]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
