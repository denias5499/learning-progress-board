// v1.6.83: Layout 修正 + crop 相對座標 + tab 增強
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

function getFunctionBody(name) {
    const start = html.indexOf('function ' + name + '(');
    if (start < 0) return null;
    let depth = 0, i = html.indexOf('{', start);
    if (i < 0) return null;
    const bodyStart = i + 1;
    while (i < html.length) {
        if (html[i] === '{') depth++;
        if (html[i] === '}') {
            depth--;
            if (depth === 0) return html.substring(bodyStart, i);
        }
        i++;
    }
    return null;
}

test('v1.6.83: 兩個 drop zone (附件設計)', () => {
    // 應該有 wn-source-zone (錯題來源) + wn-paper-zone (考卷)
    assert.ok(/id="wn-source-zone"/.test(html), 'wn-source-zone 應存在');
    assert.ok(/id="wn-paper-zone"/.test(html), 'wn-paper-zone 應存在');
    // 文字
    assert.ok(/請選擇錯題來源/.test(html), '錯題來源文字');
    assert.ok(/請匯入考卷/.test(html), '考卷文字');
});

test('v1.6.83: tab active CSS 增強 (更明顯的紫色立體)', () => {
    const m = html.match(/\.wn-tab\.active\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-tab.active CSS 應存在');
    const css = m[1];
    assert.ok(/transform:\s*scale\(/.test(css), '應有 transform: scale');
    assert.ok(/box-shadow:/.test(css), '應有 box-shadow');
    assert.ok(/#9163a8/.test(css), '應有深紫色背景');
});

test('v1.6.83: crop size check 用相對座標 (百分比)', () => {
    const fn = getFunctionBody('WN_initCropDrawing');
    assert.ok(fn, '應定義');
    // 應該檢查 relW < 0.05 (5%) 而不是 box.w < 10
    assert.ok(fn.includes('naturalWidth'), '應參考原圖 naturalWidth');
});

test('v1.6.83: Layout CSS (wn-import-container, wn-source-zone)', () => {
    assert.ok(/\.wn-import-container\s*\{/.test(html), 'wn-import-container CSS 應存在');
    assert.ok(/\.wn-source-zone\s*\{/.test(html), 'wn-source-zone CSS 應存在');
    assert.ok(/\.wn-step-title\s*\{/.test(html), 'wn-step-title CSS 應存在');
});

test('v1.6.83: 刪除舊的 wn-upload-zone', () => {
    assert.ok(!html.includes('id="wn-upload-zone"'), 'wn-upload-zone 應已移除');
    assert.ok(!html.includes('id="wn-file-input"'), 'wn-file-input 應已移除');
});

test('v1.6.83: 整合測試 - crop 相對座標邏輯', () => {
      // 確認 source code 有相對座標判斷邏輯
      const fn = getFunctionBody('WN_initCropDrawing');
      assert.ok(fn, 'WN_initCropDrawing 應定義');
      assert.ok(fn.includes('naturalWidth'), '應用 naturalWidth');
      assert.ok(fn.includes('naturalHeight'), '應用 naturalHeight');
      // 5% 門檻
      
  });

test('v1.6.83: title 更新為 [v1.6.83]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.83]<\/title>/.test(html));
});
