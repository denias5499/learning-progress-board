// v1.6.111: Option B - iframe 只做框選, 主專案管 dropdown + 儲存
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v1.6.111: iframe src 改為 wrong-notes/?embedded=1', () => {
    assert.ok(IDX.includes('src="wrong-notes/?embedded=1"'),
        'iframe 應 src="wrong-notes/?embedded=1"');
});

test('v1.6.111: 附件 finishCropping 在 embedded 模式 postMessage', () => {
    assert.ok(WN.includes('isEmbedded = new URLSearchParams'),
        '附件應偵測 isEmbedded');
    assert.ok(WN.includes("'wrong-notes-crop-complete'"),
        '附件應 postMessage type wrong-notes-crop-complete');
    assert.ok(WN.includes('currentFilesData.map'),
        '附件應 postMessage currentFilesData');
});

test('v1.6.111: 附件 CSS 隱藏 standalone UI (embedded mode)', () => {
    assert.ok(WN.includes('body.embedded-mode'),
        '附件應有 .embedded-mode CSS');
});

test('v1.6.111: 主專案 page-wrongnotes 包含 Step 2~5 form', () => {
    assert.ok(IDX.includes('id="wn-main-form"'), '應有 wn-main-form');
    assert.ok(IDX.includes('id="wn-sel-subject"'), '應有 wn-sel-subject');
    assert.ok(IDX.includes('id="wn-sel-instance"'), '應有 wn-sel-instance');
    assert.ok(IDX.includes('id="wn-sel-unit"'), '應有 wn-sel-unit');
    assert.ok(IDX.includes('id="wn-sel-source"'), '應有 wn-sel-source');
});

test('v1.6.111: 主專案有 WN_loadMasterDropdowns 函式', () => {
    assert.ok(/function\s+WN_loadMasterDropdowns\s*\(/.test(IDX),
        '應有 WN_loadMasterDropdowns 函式');
});

test('v1.6.111: 主專案有 WN_saveToMainProject 函式', () => {
    assert.ok(/function\s+WN_saveToMainProject\s*\(/.test(IDX),
        '應有 WN_saveToMainProject 函式');
});

test('v1.6.111: 主專案 postMessage listener', () => {
    assert.ok(IDX.includes("addEventListener('message'"),
        '應有 message listener');
    assert.ok(IDX.includes("'wrong-notes-crop-complete'"),
        '應監聽 wrong-notes-crop-complete');
});

test('v1.6.111: 儲存到 StudyMap_WrongNotes localStorage', () => {
    assert.ok(IDX.includes("'StudyMap_WrongNotes'"),
        '應寫入 StudyMap_WrongNotes key');
});

test('v1.6.111: openWrongNotes 內呼叫 WN_loadMasterDropdowns', () => {
    const idx = IDX.indexOf('function openWrongNotes()');
    const nextIdx = IDX.indexOf('function ', idx + 30);
    const body = IDX.substring(idx, nextIdx);
    assert.ok(body.includes('WN_loadMasterDropdowns'),
        'openWrongNotes 應呼叫 WN_loadMasterDropdowns');
});

test('v1.6.111: 從 masters 動態填科目', () => {
    assert.ok(/var\s+masters\s*=\s*user\.masters/.test(IDX) ||
               IDX.includes('user.masters'),
        '應從 user.masters 動態讀科目');
});

test('v1.6.111: title 為 [v1.6.111]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.111\]<\/title>/.test(IDX));
});
