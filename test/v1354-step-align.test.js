// v1.6.135.4: .step-container padding 改成水平 0
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v135.4: .step-container padding 水平 0', () => {
    assert.ok(/\.step-container\s*\{[^}]*padding:\s*20px\s+0/.test(WN), '.step-container 應為 padding 20px 0');
    assert.ok(!/\.step-container\s*\{[^}]*padding:\s*20px;/.test(WN), '不應只有 padding: 20px');
});

test('v135.4: 一致性 — navbar / app-container / step-container 內縮都 25px', () => {
    assert.ok(/\.top-navbar\s*\{[^}]*padding:\s*15px\s+25px/.test(WN), 'navbar 25px');
    assert.ok(/\.app-container\s*\{[^}]*padding:\s*0\s+25px/.test(WN), 'app-container 25px');
    // step-container 水平 0 + 父層 25px = 內容從 25px 開始
});
