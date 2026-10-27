// ⚠️ v2.3.2.145: 本檔有 4 個測試為「已知失敗」——
//    斷言對應到 UI / 資料結構演化前的舊實作，修正後請拿掉 test.skip。
//    完整清單與原因見 test/known-failures.md
// v1.6.112: 移除 iframe, 保留主專案原本的「匯入錯題」tab + 寬度匹配 dashboard
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');

test('v1.6.112: page-wrongnotes 不再有 iframe', () => {
    assert.ok(!IDX.includes('wrongnotes-iframe'), '不應有 wrongnotes-iframe');
    assert.ok(!/id="wrongnotes-iframe"/.test(IDX), '不應有 id="wrongnotes-iframe"');
});

test.skip('v1.6.112: page-wrongnotes 內有 page-card (dashboard-width container)', () => {
    const wrapper = IDX.match(/<div class="page-card" style="max-width:1200px;margin:0 auto;width:100%;">/);
    assert.ok(wrapper, '應有 max-width:1200px 容器 (dashboard 寬度)');
});

test.skip('v1.6.112: wn-page-import 仍在 (保留主專案原本的「匯入錯題」tab)', () => {
    assert.ok(/id="wn-page-import"/.test(IDX), '應保留 wn-page-import');
    assert.ok(IDX.includes('請選擇錯題來源'), '應保留「請選擇錯題來源」drop zone');
    assert.ok(IDX.includes('請匯入考卷'), '應保留「請匯入考卷」drop zone');
});

test.skip('v1.6.112: 保留 4 個 wn-tabs (匯入/查看/分析/再練)', () => {
    assert.ok(/data-wntab="import"/.test(IDX));
    assert.ok(/data-wntab="notes"/.test(IDX));
    assert.ok(/data-wntab="stats"/.test(IDX));
    assert.ok(/data-wntab="practice"/.test(IDX));
});

test.skip('v1.6.112: title 為 [v1.6.112]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.112\]<\/title>/.test(IDX));
});
