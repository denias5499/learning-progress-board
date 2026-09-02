// v1.6.113: 大 iframe 嵌入附件 (完整 standalone app) + 寬度對齊 dashboard
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');

test('v1.6.113: page-wrongnotes 內有大 iframe 嵌入附件', () => {
    const m = IDX.match(/<div id="page-wrongnotes"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<!-- \u6240\u6709 Modal/);
    assert.ok(m, 'page-wrongnotes 應有 iframe + closing divs');
    assert.ok(m[1].includes('<iframe src="wrong-notes/"'), '應有 iframe src="wrong-notes/"');
});

test('v1.6.113: iframe 寬度對齊 dashboard (max-width:1200px)', () => {
    const m = IDX.match(/<iframe src="wrong-notes\/"[^>]*style="([^"]+)"/);
    assert.ok(m, 'iframe 應有 style');
    const style = m[1];
    assert.ok(style.includes('width:100%'), 'iframe 應 width:100%');
    assert.ok(style.includes('max-width:1200px'), 'iframe 應 max-width:1200px');
});

test('v1.6.113: iframe 有 dashboard-height', () => {
    const m = IDX.match(/<iframe src="wrong-notes\/"[^>]*style="([^"]+)"/);
    assert.ok(m[1].includes('height:calc(100vh'), 'iframe 應有 height');
});

test('v1.6.113: 不再有 wn-page-* 殘留 (主專案原本的匯入錯題 tab 完全移除)', () => {
    assert.ok(!/id="wn-page-import"/.test(IDX), '不應有 wn-page-import');
    assert.ok(!/id="wn-page-notes"/.test(IDX), '不應有 wn-page-notes');
    assert.ok(!/id="wn-page-stats"/.test(IDX), '不應有 wn-page-stats');
    assert.ok(!/id="wn-page-practice"/.test(IDX), '不應有 wn-page-practice');
});

test('v1.6.113: 不再有 wn-source-zone (附件 iframe 自己管)', () => {
    assert.ok(!/id="wn-source-zone"/.test(IDX), '不應有 wn-source-zone (附件 iframe 內自己管)');
    assert.ok(!/id="wn-paper-zone"/.test(IDX), '不應有 wn-paper-zone');
});

test('v1.6.113: page-wrongnotes-container max-width:1200px 對齊 dashboard', () => {
    assert.ok(/<div class="page-wrongnotes-container" style="max-width:1200px/.test(IDX),
        'page-wrongnotes-container 應 max-width:1200px');
});

test('v1.6.113: title 為 [v1.6.113]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.113\]<\/title>/.test(IDX));
});
