// v1.6.113: 大 iframe 嵌入附件 (完整 standalone app) + 寬度對齊 dashboard
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');







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


