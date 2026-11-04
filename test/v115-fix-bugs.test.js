// v1.6.115: Bug fixes from v1.6.114 review
// Bug 1: Step 1 框寬度還差一點 - 加更多 CSS injection
// Bug 2: 跳 Page 2 沒看到 4 層 dropdown - settings-page 內 step-container 沒 id="settings-container"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');





test('v1.6.115: settings-container 元素存在', () => {
    assert.ok(/id="settings-container"/.test(WN), '應有 id="settings-container" 元素');
});


