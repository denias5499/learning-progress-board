// v1.6.94: 完整移植 v1.5.241 CSS (照原本真的 work 的版本)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

test('v1.6.94: .wn-crop-area CSS 用 v1.5.241 設定', () => {
    const m = html.match(/\.wn-crop-area\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-crop-area CSS 應存在');
    const css = m[1];
    assert.ok(css.includes('position: relative'), '應有 position: relative');
    assert.ok(css.includes('display: inline-block'), '應有 display: inline-block');
});

test('v1.6.94: .wn-crop-box CSS 用 v1.5.241 設定 (沒有 overflow:hidden 問題)', () => {
    const m = html.match(/\.wn-crop-box\s*\{([\s\S]*?)\}/);
    assert.ok(m, '.wn-crop-box CSS 應存在');
    const css = m[1];
    assert.ok(css.includes('position: absolute'), '應有 position: absolute');
    assert.ok(css.includes('border: 2px solid #3498db'), '應有藍色 2px 邊框');
    assert.ok(!css.includes('overflow: hidden'), '不應有 overflow: hidden');
});

test('v1.6.94: HTML 結構照 v1.5.241 - img 直接在 cropArea 內', () => {
    // 確認 wn-crop-img-container 已移除
    assert.ok(!html.includes('id="wn-crop-img-container"'), 'wn-crop-img-container 應移除');
    // 確認 wn-crop-img 在 wn-crop-area 內
    const cropArea = html.match(/<div id="wn-crop-area"[^>]*>([\s\S]*?)<img id="wn-crop-img"/);
    assert.ok(cropArea, 'wn-crop-img 應在 wn-crop-area 內');
});

test('v1.6.94: WN_renderCropAreaBoxes 用 cropArea.appendChild (v1.5.241 設計)', () => {
    const m = html.match(/function WN_renderCropAreaBoxes\(\)\s*\{([\s\S]*?)\}\s*\}/);
    assert.ok(m, '應定義');
    const body = m[1];
    assert.ok(body.includes('cropArea.appendChild'), '應 cropArea.appendChild');
    assert.ok(!body.includes('container.appendChild'), '不應 container.appendChild');
    assert.ok(body.includes('cropArea.getBoundingClientRect'), '應用 cropArea rect 算 scale');
});

test('v1.6.94: title 更新為 [v1.6.94]', () => {
    assert.ok(/<title>2026 學習進度看板.*\[v1\.6\.94\]<\/title>/.test(html));
});
