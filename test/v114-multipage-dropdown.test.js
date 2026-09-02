// v1.6.114: 方案 C - 完全分頁設計 + 4層 dropdown + 刪除 Step 4 + 上一步
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v1.6.114: 附件 syllabusDB 從 window.WN_masterData 注入', () => {
    assert.ok(WN.includes('window.WN_masterData'));
});

test('v1.6.114: 附件 4 層 dropdown (subj/type/inst/unit)', () => {
    assert.ok(WN.includes('class="type-sel"'));
    assert.ok(WN.includes('class="inst-sel"'));
    assert.ok(WN.includes('class="unit-sel"'));
});

test('v1.6.114: 附件刪除 Step 4 (source-sel)', () => {
    assert.ok(!WN.includes('class="source-sel"'));
});

test('v1.6.114: 附件有 handleCardTypeChange + handleCardInstChange', () => {
    assert.ok(/function\s+handleCardTypeChange/.test(WN));
    assert.ok(/function\s+handleCardInstChange/.test(WN));
});

test('v1.6.114: 附件有 WN_navigateToSettings + WN_navigateToImport', () => {
    assert.ok(/function\s+WN_navigateToSettings/.test(WN));
    assert.ok(/function\s+WN_navigateToImport/.test(WN));
});

test('v1.6.114: 附件 finishCropping 自動跳 settings-page', () => {
    const m = WN.match(/function finishCropping\(\)\s*\{([\s\S]*?)\n    \}/);
    assert.ok(m);
    assert.ok(m[1].includes('WN_navigateToSettings'));
});

test('v1.6.114: 附件有 settings-page 獨立 page', () => {
    assert.ok(/id="settings-page" class="page"/.test(WN));
    assert.ok(/onclick="WN_navigateToImport\(\)"/.test(WN));
});

test('v1.6.114: 附件 generateNote 配合新 dropdown', () => {
    const m = WN.match(/function generateNote\(\)\s*\{([\s\S]*?)\n    \}/);
    assert.ok(m);
    assert.ok(m[1].includes('typeName'));
    assert.ok(m[1].includes('instanceName'));
});

test('v1.6.114: 主專案 iframe 有 onload handler', () => {
    assert.ok(IDX.includes('onload="WN_injectIntoIframe()"'));
});

test('v1.6.114: 主專案有 WN_injectIntoIframe + WN_buildMasterData', () => {
    assert.ok(/function\s+WN_injectIntoIframe\s*\(/.test(IDX));
    assert.ok(/function\s+WN_buildMasterData\s*\(/.test(IDX));
});

test('v1.6.114: 主專案注入 CSS (.app-container max-width:1200px)', () => {
    assert.ok(IDX.includes('.app-container { max-width: 1200px !important; }'));
});

test('v1.6.114: 主專案注入 master data 到 iframe.contentWindow', () => {
    assert.ok(IDX.includes('wn.WN_masterData = masterData'));
});

test('v1.6.114: title 為 [v1.6.114]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.114\]<\/title>/.test(IDX));
});
