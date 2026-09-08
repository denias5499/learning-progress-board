// v1.6.135.6: JPEG quality 0.7 + quota 自動 trim + 列印只印 view-page
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v135.6: JPEG quality 0.7', () => {
    assert.ok(/canvas\.toDataURL\('image\/jpeg',\s*0\.7\)/.test(WN), 'JPEG 應為 quality 0.7');
});

test('v135.6: quota 自動 trim 邏輯', () => {
    assert.ok(/QuotaExceededError|quota/i.test(WN), '應有 quota 判斷');
    assert.ok(/slice\(trimCount\)/.test(WN), '應有 slice(trimCount) 刪舊');
});

test('v135.6: 列印只印 view-page', () => {
    const printCss = WN.match(/@media print\s*\{([\s\S]*?)\n        \}/);
    assert.ok(printCss);
    const css = printCss[1];
    assert.ok(/#import-page,\s*#note-page,\s*#data-page,\s*#practice-page\s*\{\s*display:\s*none/.test(css), '應隱藏其他 page');
    assert.ok(/#view-page\s*\{\s*display:\s*block/.test(css), 'view-page 應顯示');
});

test('v135.6: 不要破壞舊的 .page display: block', () => {
    // 列印 CSS 不再有 .page { display: block }, 改用 #view-page { display: block !important }
    const printCss = WN.match(/@media print\s*\{([\s\S]*?)\n        \}/);
    const css = printCss[1];
    assert.ok(!/\.page\s*\{[^}]*display:\s*block/.test(css), '不應再有 .page display: block');
});
