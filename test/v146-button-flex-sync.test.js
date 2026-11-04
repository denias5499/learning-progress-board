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









test('v146-5: 兩個 label 都不再用 display: inline-block (避免 input/span 被分行)', () => {
    var hoursLabel = HTML.match(/<label id="wz-mode-hours-card"[^>]*>/);
    var unitsLabel = HTML.match(/<label id="wz-mode-units-card"[^>]*>/);
    assert.ok(hoursLabel && unitsLabel);
    assert.ok(!/display:\s*inline-block/.test(hoursLabel[0]), '時數 label 不應是 inline-block');
    assert.ok(!/display:\s*inline-block/.test(unitsLabel[0]), '單元 label 不應是 inline-block');
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


