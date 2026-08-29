// v1.6.75: 用附件設計風格
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.75: .wn-source-zone 用藍色虛線 (附件風格)', () => {
    const m = html.match(/\.wn-source-zone\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-source-zone CSS 應存在');
    const css = m[1];
    // 應該有 dashed + 藍色
    assert.ok(/dashed/.test(css), '應有 dashed 邊框');
    assert.ok(/#1a82e2|theme-blue/.test(css), '應用藍色 (#1a82e2 或 theme-blue)');
    assert.ok(/background:\s*#f8fbff/.test(css), '淺藍背景');
});

test('v1.6.75: wn-step-title 用藍色 + 較大字體', () => {
    const m = html.match(/\.wn-step-title\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-step-title CSS 應存在');
    const css = m[1];
    assert.ok(/font-size:\s*1\.3em/.test(css), '應 font-size: 1.3em');
    assert.ok(/#1a82e2|theme-blue/.test(css), '應藍色');
});

test('v1.6.75: wn-or-divider 樣式存在', () => {
    const m = html.match(/\.wn-or-divider\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-or-divider CSS 應存在');
});

test('v1.6.75: 兩個 drop zone 用附件 emoji (📁 📄)', () => {
    assert.ok(/📁\s*請選擇錯題來源/.test(html), '第一個用 📁');
    assert.ok(/📄\s*請匯入考卷/.test(html), '第二個用 📄');
    // 不應該有附件原版的 emoji (附圖1 顯示是 🖊️, 但附件源是 📁)
    assert.ok(!/請選擇錯題來源.*🖊️/.test(html), '不應有 🖊️ emoji');
});

test('v1.6.75: 移除 drop zone 內的小提示文字 (Phase 2 實作)', () => {
    assert.ok(!/Phase 2 實作/.test(html), '不應有 Phase 2 實作文字');
    assert.ok(!/Phase 3 實作/.test(html), '不應有 Phase 3 實作文字');
});

test('v1.6.75: wn-import-container 用淺藍背景', () => {
    const m = html.match(/\.wn-import-container\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-import-container CSS 應存在');
    const css = m[1];
    assert.ok(/background:\s*#f8fbff/.test(css), '淺藍背景');
});

test('v1.6.75: WN_initDragDrop 用正確的 id (wn-source-zone)', () => {
    assert.ok(!html.includes("'wn-upload-zone'"), '不應再用舊 id wn-upload-zone');
    assert.ok(html.includes("'wn-source-zone'"), '應用新 id wn-source-zone');
});

test('v1.6.75: title 更新為 [v1.6.75]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.77]<\/title>/.test(html));
});
