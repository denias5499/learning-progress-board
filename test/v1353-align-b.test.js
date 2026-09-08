// v1.6.135.3: 方案 B - 統一內縮 25px
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v135.3 B: .top-navbar padding 內縮 25px', () => {
    assert.ok(/\.top-navbar\s*\{[^}]*padding:\s*15px\s+25px/.test(WN), 'navbar 應有 padding 15px 25px');
});

test('v135.3 B: .app-container padding 內縮 25px', () => {
    const m = WN.match(/\.app-container\s*\{([^}]+)\}/);
    assert.ok(m);
    assert.ok(/padding:\s*0\s+25px/.test(m[1]), 'app-container 應有 padding 0 25px');
});

test('v135.3 B: nav-brand margin-left 拿掉 (由 navbar padding 處理)', () => {
    const m = WN.match(/\.nav-brand\s*\{([^}]+)\}/);
    assert.ok(m);
    assert.ok(!/margin.*0\s+25px/.test(m[1]) && !/margin.*25px\s+0/.test(m[1]), '不應有 margin 25px');
});

test('v135.3 B: current-user-display margin-right 拿掉', () => {
    assert.ok(!/current-user-display[^}]*margin-right/.test(WN), '不應有 margin-right');
});
