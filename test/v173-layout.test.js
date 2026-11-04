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



test('v1.6.83: tab active CSS 增強 (更明顯的紫色立體)', () => {
    const m = html.match(/\.wn-tab\.active\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-tab.active CSS 應存在');
    const css = m[1];
    assert.ok(/transform:\s*scale\(/.test(css), '應有 transform: scale');
    assert.ok(/box-shadow:/.test(css), '應有 box-shadow');
    assert.ok(/#9163a8/.test(css), '應有深紫色背景');
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



test('v1.6.83: title 更新為 [v1.6.83]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
