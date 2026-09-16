// test/v147-table-cell-layout.test.js
// v1.6.147 unit test: 改用 inline-table + table-cell 排版（最穩定的水平對齊方案）
// 測試: 1. label 為 inline-table  2. 內部 span 為 table-cell  3. table-cell 都 vertical-align: middle
//       4. openWizard 內含 setWizardScheduleMode 初始 sync  5. title 為 [v1.6.147]

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v147-1: title 版本號為 [v1.6.147]', () => {
    assert.ok(/\[v1\.6\.147\]/.test(HTML), 'title 應包含 [v1.6.147]');
});

test('v147-2: 時數模式 label 使用 display: inline-table', () => {
    var hoursLabel = HTML.match(/<label id="wz-mode-hours-card"[^>]*>/);
    assert.ok(hoursLabel, '應存在 wz-mode-hours-card label');
    assert.ok(/display:\s*inline-table/.test(hoursLabel[0]), '時數 label 應為 display: inline-table');
});

test('v147-3: 單元模式 label 使用 display: inline-table', () => {
    var unitsLabel = HTML.match(/<label id="wz-mode-units-card"[^>]*>/);
    assert.ok(unitsLabel, '應存在 wz-mode-units-card label');
    assert.ok(/display:\s*inline-table/.test(unitsLabel[0]), '單元 label 應為 display: inline-table');
});

test('v147-4: 時數 label 內三個 span 都是 table-cell + vertical-align: middle', () => {
    var labelBlock = HTML.match(/<label id="wz-mode-hours-card"[\s\S]*?<\/label>/);
    assert.ok(labelBlock, '應存在時數 label 完整結構');
    var body = labelBlock[0];
    var cellCount = (body.match(/display:\s*table-cell/g) || []).length;
    assert.ok(cellCount >= 3, '時數 label 內應至少 3 個 table-cell (radio, emoji, text)');
    var vaCount = (body.match(/vertical-align:\s*middle/g) || []).length;
    assert.ok(vaCount >= 3, '時數 label 內應至少 3 個 vertical-align: middle');
});

test('v147-5: 單元 label 內三個 span 都是 table-cell + vertical-align: middle', () => {
    var labelBlock = HTML.match(/<label id="wz-mode-units-card"[\s\S]*?<\/label>/);
    assert.ok(labelBlock, '應存在單元 label 完整結構');
    var body = labelBlock[0];
    var cellCount = (body.match(/display:\s*table-cell/g) || []).length;
    assert.ok(cellCount >= 3, '單元 label 內應至少 3 個 table-cell');
    var vaCount = (body.match(/vertical-align:\s*middle/g) || []).length;
    assert.ok(vaCount >= 3, '單元 label 內應至少 3 個 vertical-align: middle');
});

test('v147-6: radio 被包在 table-cell span 內 (防止跳脫)', () => {
    // 確保 input 是 span 的子元素，且該 span 是 table-cell
    var hoursBlock = HTML.match(/<label id="wz-mode-hours-card"[\s\S]*?<\/label>/)[0];
    var unitsBlock = HTML.match(/<label id="wz-mode-units-card"[\s\S]*?<\/label>/)[0];
    // hours: <span style="display: table-cell..."><input ... value="hours"
    assert.ok(/<span style="display: table-cell[^"]*"><input[^>]*value="hours"/.test(hoursBlock), 
              '時數 radio 應被 table-cell span 包住');
    assert.ok(/<span style="display: table-cell[^"]*"><input[^>]*value="units"/.test(unitsBlock), 
              '單元 radio 應被 table-cell span 包住');
});

test('v147-7: openWizard 內含 setWizardScheduleMode 初始 sync 呼叫', () => {
    var openWizard = HTML.match(/function openWizard[\s\S]*?openModal\('modal-wizard'\)/);
    assert.ok(openWizard, '應存在 openWizard function');
    var afterPrefs = openWizard[0].split('loadWizardPrefs()')[1];
    assert.ok(afterPrefs, '應在 loadWizardPrefs 後有程式碼');
    assert.ok(/setWizardScheduleMode\(/.test(afterPrefs), 
              'loadWizardPrefs 後應呼叫 setWizardScheduleMode 同步狀態');
});

test('v147-8: setWizardScheduleMode 仍正常同步 UI', () => {
    var funcMatch = HTML.match(/function setWizardScheduleMode\(mode\)[\s\S]*?saveWizardPrefs\(\);\s*\}/);
    assert.ok(funcMatch, '應存在 setWizardScheduleMode function');
    var funcBody = funcMatch[0];
    assert.ok(/hoursCard\.style\.border/.test(funcBody), '應有 hoursCard border 同步');
    assert.ok(/unitsCard\.style\.border/.test(funcBody), '應有 unitsCard border 同步');
    assert.ok(/desc\.innerHTML/.test(funcBody), '應有 desc innerHTML 更新');
});

test('v147-9: 父層 div 有 align-items: flex-start (防止 label 被拉伸)', () => {
    // 找父層 div (含 display: flex; gap: 10px)
    // 找包含 wz-mode-hours-card 的父層 flex div
    var idx = HTML.indexOf('wz-mode-hours-card');
    var parentStart = HTML.lastIndexOf('<div style="display: flex;', idx);
    var parentEnd = HTML.indexOf('>', parentStart);
    var parentDiv = [HTML.substring(parentStart, parentEnd + 1)];
    assert.ok(parentDiv, '應存在 flex 父層 div');
    assert.ok(/align-items:\s*flex-start/.test(parentDiv[0]), '父層應有 align-items: flex-start');
});
