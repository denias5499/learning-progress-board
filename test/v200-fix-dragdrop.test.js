// v1.6.100: 移除附件 DOMContentLoaded drag-drop handler
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.100: 不再有附件 DOMContentLoaded drag-drop handler', () => {
    const m = html.match(/document\.addEventListener\('DOMContentLoaded'[\s\S]*?wn-drop-zone/);
    assert.ok(!m, '不應有找 wn-drop-zone 的 DOMContentLoaded handler');
});

test('v1.6.100: 不再有附件 handleFilesForCrop 函式', () => {
    const count = (html.match(/async function handleFilesForCrop\(files\)/g) || []).length;
    assert.equal(count, 0);
});

test('v1.6.100: 不再有 wn-import ID 引用', () => {
    const count = (html.match(/getElementById\('wn-import'\)/g) || []).length;
    assert.equal(count, 0);
});

test('v1.6.100: 主專案用 WN_handleFileUpload', () => {
    assert.ok(html.includes('function WN_handleFileUpload(file)'));
    assert.ok(html.includes('WN_initDragDrop'));
});

test('v1.6.100: title 更新為 [v1.6.100]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.100\]<\/title>/.test(html));
});
