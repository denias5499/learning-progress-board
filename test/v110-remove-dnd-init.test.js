// v1.6.110: 移除 WN_initDragDrop() 呼叫 (附件 iframe 內已有自己的 drag & drop)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(process.cwd(), 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.110: openWrongNotes 不再呼叫 WN_initDragDrop', () => {
    const idx = html.indexOf('function openWrongNotes()');
    const nextIdx = html.indexOf('function ', idx + 30);
    const body = html.substring(idx, nextIdx);
    assert.ok(!body.includes('WN_initDragDrop()'),
        '不應呼叫 WN_initDragDrop (附件 iframe 內已有自己的 drag & drop)');
});

test('v1.6.110: 沒有 WN_initDragDrop 函式定義', () => {
    assert.ok(!/function\s+WN_initDragDrop\s*\(/.test(html),
        '不應有 WN_initDragDrop 函式定義 (v1.6.108 已刪除)');
});

test('v1.6.110: 沒有 WN_setupCropEvents 函式', () => {
    assert.ok(!/function\s+WN_setupCropEvents\s*\(/.test(html),
        '不應有 WN_setupCropEvents 函式 (附件獨立運作)');
});

test('v1.6.110: title 為 [v1.6.110]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.110\]<\/title>/.test(html));
});
