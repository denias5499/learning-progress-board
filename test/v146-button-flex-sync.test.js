// test/v146-button-flex-sync.test.js
// v1.6.146 unit test: 智慧排程模式按鈕排版 + 初始狀態同步
// 測試: 1. label 改用 inline-flex + align-items: center  2. padding 縮小  3. radio 與文字同 row
//       4. openWizard 內含初始 sync 呼叫  5. title 為 [v1.6.146]

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v146-1: title 版本號為 [v1.6.146]', () => {
    assert.ok(/\[v1\.6\.146\]/.test(HTML), 'title 應包含 [v1.6.146]');
});

test('v146-2: 時數模式 label 使用 display: inline-flex', () => {
    var hoursLabel = HTML.match(/<label id="wz-mode-hours-card"[^>]*>/);
    assert.ok(hoursLabel, '應存在 wz-mode-hours-card label');
    assert.ok(/display:\s*inline-flex/.test(hoursLabel[0]), '時數 label 應為 display: inline-flex');
});

test('v146-3: 時數模式 label 有 align-items: center (垂直置中)', () => {
    var hoursLabel = HTML.match(/<label id="wz-mode-hours-card"[^>]*>/);
    assert.ok(hoursLabel);
    assert.ok(/align-items:\s*center/.test(hoursLabel[0]), '時數 label 應有 align-items: center');
});

test('v146-4: 單元模式 label 使用 display: inline-flex', () => {
    var unitsLabel = HTML.match(/<label id="wz-mode-units-card"[^>]*>/);
    assert.ok(unitsLabel, '應存在 wz-mode-units-card label');
    assert.ok(/display:\s*inline-flex/.test(unitsLabel[0]), '單元 label 應為 display: inline-flex');
});

test('v146-5: 兩個 label 都不再用 display: inline-block (避免 input/span 被分行)', () => {
    var hoursLabel = HTML.match(/<label id="wz-mode-hours-card"[^>]*>/);
    var unitsLabel = HTML.match(/<label id="wz-mode-units-card"[^>]*>/);
    assert.ok(hoursLabel && unitsLabel);
    assert.ok(!/display:\s*inline-block/.test(hoursLabel[0]), '時數 label 不應是 inline-block');
    assert.ok(!/display:\s*inline-block/.test(unitsLabel[0]), '單元 label 不應是 inline-block');
});

test('v146-6: 兩個 label padding 都縮小到 6px 12px (緊湊)', () => {
    var hoursLabel = HTML.match(/<label id="wz-mode-hours-card"[^>]*>/);
    var unitsLabel = HTML.match(/<label id="wz-mode-units-card"[^>]*>/);
    assert.ok(hoursLabel && unitsLabel);
    assert.ok(/padding:\s*6px 12px/.test(hoursLabel[0]), '時數 padding 應為 6px 12px');
    assert.ok(/padding:\s*6px 12px/.test(unitsLabel[0]), '單元 padding 應為 6px 12px');
});

test('v146-7: 兩個 label 都有 flex: 0 0 auto (防止 flex 拉伸)', () => {
    var hoursLabel = HTML.match(/<label id="wz-mode-hours-card"[^>]*>/);
    var unitsLabel = HTML.match(/<label id="wz-mode-units-card"[^>]*>/);
    assert.ok(hoursLabel && unitsLabel);
    assert.ok(/flex:\s*0 0 auto/.test(hoursLabel[0]), '時數 label 應有 flex: 0 0 auto');
    assert.ok(/flex:\s*0 0 auto/.test(unitsLabel[0]), '單元 label 應有 flex: 0 0 auto');
});

test('v146-8: radio input 不再有 vertical-align: middle (改用 flex center)', () => {
    var radioMatch = HTML.match(/<input type="radio" name="wz-schedule-mode" value="hours"[^>]*>/);
    assert.ok(radioMatch, '應存在 hours radio input');
    assert.ok(!/vertical-align:\s*middle/.test(radioMatch[0]), 'hours radio 不應有 vertical-align: middle');
});

test('v146-9: openWizard 內含 setWizardScheduleMode 初始 sync 呼叫', () => {
    var openWizard = HTML.match(/function openWizard[\s\S]*?openModal\('modal-wizard'\)/);
    assert.ok(openWizard, '應存在 openWizard function');
    var afterPrefs = openWizard[0].split('loadWizardPrefs()')[1];
    assert.ok(afterPrefs, '應在 loadWizardPrefs 後有程式碼');
    assert.ok(/setWizardScheduleMode\(/.test(afterPrefs), 
              'loadWizardPrefs 後應呼叫 setWizardScheduleMode 同步狀態');
});

test('v146-10: setWizardScheduleMode 內讀取 checked radio 同步 UI', () => {
    var funcMatch = HTML.match(/function setWizardScheduleMode\(mode\)[\s\S]*?saveWizardPrefs\(\);\s*\}/);
    assert.ok(funcMatch, '應存在 setWizardScheduleMode function');
    var funcBody = funcMatch[0];
    assert.ok(/hoursCard\.style\.border/.test(funcBody), '應有 hoursCard border 同步');
    assert.ok(/unitsCard\.style\.border/.test(funcBody), '應有 unitsCard border 同步');
    assert.ok(/desc\.innerHTML/.test(funcBody), '應有 desc innerHTML 更新');
});
