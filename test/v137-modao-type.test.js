// v1.6.137: renderAeSubjectCardHtml 動態合併 defaultOrder + typeCount 額外的 typeName
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');

test('v137: renderAeSubjectCardHtml 有 orderedTypes 邏輯', () => {
    // 1) 註解標記
    assert.ok(/v1\.6\.137/.test(IDX));
    // 2) defaultOrder.slice() 然後 push 額外
    const fnBody = IDX.match(/function renderAeSubjectCardHtml\([^)]*\)\s*\{[\s\S]*?\n        \}/)[0];
    assert.ok(/orderedTypes = defaultOrder\.slice\(\)/.test(fnBody));
    assert.ok(/orderedTypes\.indexOf\(t\) < 0.*orderedTypes\.push/.test(fnBody));
});

test('v137: render radio 用 orderedTypes (不再用 defaultOrder)', () => {
    const fnBody = IDX.match(/function renderAeSubjectCardHtml\([^)]*\)\s*\{[\s\S]*?\n        \}/)[0];
    // 找 radio 區段
    const radioPart = fnBody.match(/教材類型:<\/span>([\s\S]*?)\n            html \+= '<div/);
    assert.ok(radioPart);
    assert.ok(/orderedTypes\.forEach/.test(radioPart[1]), 'render radio 必須用 orderedTypes');
    assert.equal(!/教材類型:<\/span>([\s\S]*?)defaultOrder\.forEach/.test(fnBody), true, '不應再用 defaultOrder.forEach');
});
