// v1.6.104: 防止 WN_setupCropEvents 重複綁定 mousedown
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.104: 有 WN_CROP_EVENTS_INITED flag', () => {
    assert.ok(html.includes('WN_CROP_EVENTS_INITED'));
});

test('v1.6.104: WN_setupCropEvents 檢查 flag', () => {
    assert.ok(/if\s*\(\s*WN_CROP_EVENTS_INITED\s*\)\s*return/.test(html));
});

test('v1.6.104: WN_setupCropEvents 設 flag = true', () => {
    assert.ok(/WN_CROP_EVENTS_INITED\s*=\s*true/.test(html));
});

test('v1.6.104: WN_cancelSelection 重置 flag', () => {
    assert.ok(/WN_cancelSelection[\s\S]*?WN_CROP_EVENTS_INITED\s*=\s*false/.test(html));
});

test('v1.6.104: title 為 [v1.6.104]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.104\]<\/title>/.test(html));
});
