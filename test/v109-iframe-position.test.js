// v1.6.109: iframe 搬到頂層 page-wrongnotes
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(process.cwd(), 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.109: page-wrongnotes 包含 iframe', () => {
    const m = html.match(/<div id="page-wrongnotes"[^>]*>([\s\S]*?)<div class="page-card"/);
    assert.ok(m);
    const content = m[1];
    assert.ok(content.includes('id="wrongnotes-iframe"'));
    assert.ok(content.includes('src="wrong-notes/"'));
    assert.ok(content.includes('title="錯題資料庫"'));
});

test('v1.6.109: wn-page-notes 不再有 iframe', () => {
    const m = html.match(/<div id="wn-page-notes"[^>]*>([\s\S]*?)<\/div>\s*<div id="wn-page-stats"/);
    assert.ok(m);
    const content = m[1];
    assert.ok(!content.includes('wrongnotes-iframe'));
});

test('v1.6.109: title 為 [v1.6.109]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.109\]<\/title>/.test(html));
});
