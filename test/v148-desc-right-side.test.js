// test/v148-desc-right-side.test.js
// v1.6.148 unit test: 描述移到按鈕右側 + radio-emoji 間距加大
// 測試: 1. radio-emoji padding-right: 12px (從 6px 加大)
//       2. wz-schedule-mode-desc 在 buttons 之後（同 flex div 內）
//       3. desc flex: 1 + min-width: 200px (填滿右側空間)
//       4. 描述文字已簡化
//       5. title [v1.6.148]

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v148-1: title 版本號為 [v1.6.148]', () => {
    assert.ok(/\[v1\.6\.148\]/.test(HTML), 'title 應包含 [v1.6.148]');
});

test('v148-2: radio-emoji 間距加大到 12px', () => {
    var hoursBlock = HTML.match(/<label id="wz-mode-hours-card"[\s\S]*?<\/label>/)[0];
    var unitsBlock = HTML.match(/<label id="wz-mode-units-card"[\s\S]*?<\/label>/)[0];
    assert.ok(/padding-right:\s*12px/.test(hoursBlock), '時數 label radio-emoji 應為 12px');
    assert.ok(/padding-right:\s*12px/.test(unitsBlock), '單元 label radio-emoji 應為 12px');
});

test('v148-3: 描述 div 在 buttons 之後（同 flex div 內）', () => {
    // 找包含 wz-mode-hours-card 的 flex div
    var idx = HTML.indexOf('wz-mode-hours-card');
    var parentStart = HTML.lastIndexOf('<div style="display: flex;', idx);
    var parentEnd = HTML.indexOf('</div>', HTML.indexOf('wz-schedule-mode-desc', idx)) + 6;
    var block = HTML.substring(parentStart, parentEnd);

    // 找三個元素的相對位置
    var hoursPos = block.indexOf('wz-mode-hours-card');
    var unitsPos = block.indexOf('wz-mode-units-card');
    var descPos = block.indexOf('wz-schedule-mode-desc');
    var divEndPos = block.lastIndexOf('</div>');

    assert.ok(hoursPos >= 0 && unitsPos > hoursPos, 'hours 在 units 前');
    assert.ok(descPos > unitsPos, 'desc 應在 units 之後');
    assert.ok(descPos < divEndPos, 'desc 應在 flex div 結束前');
});

test('v148-4: 描述 div 有 flex: 1 + min-width: 200px (佔滿右側)', () => {
    var descDiv = HTML.match(/<div id="wz-schedule-mode-desc"[^>]*>/);
    assert.ok(descDiv, '應存在 wz-schedule-mode-desc div');
    assert.ok(/flex:\s*1/.test(descDiv[0]), 'desc 應有 flex: 1');
    assert.ok(/min-width:\s*200px/.test(descDiv[0]), 'desc 應有 min-width: 200px');
});

test('v148-5: 描述文字已簡化 (不再過長)', () => {
    var funcMatch = HTML.match(/function setWizardScheduleMode\(mode\)[\s\S]*?saveWizardPrefs\(\);\s*\}/);
    assert.ok(funcMatch);
    var funcBody = funcMatch[0];
    // 確認新文字包含
    assert.ok(/每 unit 切成 0\.5hr chunks/.test(funcBody), '時數描述應為新簡化版');
    assert.ok(/每 unit 分 N 天讀/.test(funcBody), '單元描述應為新簡化版');
    // 確認舊文字不再出現
    assert.ok(!/平均塞進每天的讀書時數內/.test(funcBody), '舊描述應已被取代');
});

test('v148-6: inline-table layout 保留 (v147 成果)', () => {
    var hoursLabel = HTML.match(/<label id="wz-mode-hours-card"[^>]*>/);
    assert.ok(/display:\s*inline-table/.test(hoursLabel[0]), 'v147 inline-table 應保留');
});
