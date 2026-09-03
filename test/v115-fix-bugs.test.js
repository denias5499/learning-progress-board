// v1.6.115: Bug fixes from v1.6.114 review
// Bug 1: Step 1 框寬度還差一點 - 加更多 CSS injection
// Bug 2: 跳 Page 2 沒看到 4 層 dropdown - settings-page 內 step-container 沒 id="settings-container"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v1.6.115 Bug 1: 主專案注入更多 CSS (含 .step-container, .drop-zone)', () => {
    assert.ok(IDX.includes('.step-container'), '應注入 .step-container');
    assert.ok(IDX.includes('.drop-zone'), '應注入 .drop-zone');
});

test('v1.6.115 Bug 2: settings-page 內的 step-container 有 id="settings-container"', () => {
    // 找 settings-page 內的 step-container
    const m = WN.match(/<div id="settings-page"[^>]*>\s*<div class="step-container"([^>]*)>/);
    assert.ok(m, 'settings-page 內應有 step-container');
    assert.ok(m[1].includes('id="settings-container"'), 'step-container 應有 id="settings-container"');
});

test('v1.6.115: settings-container 元素存在', () => {
    assert.ok(/id="settings-container"/.test(WN), '應有 id="settings-container" 元素');
});

test('v1.6.115: title 為 [v1.6.115]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.115\]<\/title>/.test(IDX));
});
