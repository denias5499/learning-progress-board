// v1.6.108: iframe 嵌入附件 (替代 v1.6.66+ 的 hardcode crop box 邏輯)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(process.cwd(), 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

const WRONG_NOTES_PATH = path.join(process.cwd(), 'wrong-notes', 'index.html');
const attachContent = fs.existsSync(WRONG_NOTES_PATH) ? fs.readFileSync(WRONG_NOTES_PATH, 'utf8') : '';

test('v1.6.108: 附件 standalone 檔案存在', () => {
    assert.ok(attachContent.length > 0, 'wrong-notes/index.html 應存在');
});

test('v1.6.108: 附件有 4 個核心 nav pages', () => {
    assert.ok(attachContent.includes('nav-import'));
    assert.ok(attachContent.includes('nav-view'));
    assert.ok(attachContent.includes('nav-data'));
    assert.ok(attachContent.includes('nav-practice'));
});

test('v1.6.108: 附件有 crop box 邏輯 (addMockOCRBoxes)', () => {
    assert.ok(attachContent.includes('addMockOCRBoxes'), '應有 addMockOCRBoxes');
    assert.ok(attachContent.includes('manualBoxes.push'), '應有 manualBoxes.push');
    assert.ok(attachContent.includes('createPageContainer'), '應有 createPageContainer');
});

test('v1.6.108: wn-page-notes 包含 iframe 嵌入附件', () => {
    const m = html.match(/<div id="wn-page-notes"[^>]*>([\s\S]*?)<\/div>\s*<div id="wn-page-stats"/);
    assert.ok(m);
    const content = m[1];
    assert.ok(content.includes('id="wrongnotes-iframe"'), '應有 wrongnotes-iframe');
    assert.ok(content.includes('src="wrong-notes/"'), '應 src 指向 wrong-notes/');
    assert.ok(content.includes('height:85vh'), '應 85vh 高');
});

test('v1.6.108: 不再有 WN_setupCropEvents hardcode 函式', () => {
    assert.ok(!/function\s+WN_setupCropEvents\s*\(/.test(html), '不應有 WN_setupCropEvents');
});

test('v1.6.108: 不再有 WN_createNewManualBox 函式', () => {
    assert.ok(!/function\s+WN_createNewManualBox\s*\(/.test(html));
});

test('v1.6.108: 不再有 WN_makeDraggableAndResizable 函式', () => {
    assert.ok(!/function\s+WN_makeDraggableAndResizable\s*\(/.test(html));
});

test('v1.6.108: title 為 [v1.6.108]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.108\]<\/title>/.test(html));
});
