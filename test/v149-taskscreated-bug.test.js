// test/v149-taskscreated-bug.test.js
// v1.6.149 unit test: 修復模式 B pipeline ReferenceError
// 測試: 1. tasksCreated 宣告在使用之前 (在模式 B pipeline 之前)
//       2. 只有一個 var tasksCreated = 0 宣告
//       3. 模式 B pipeline 邏輯完整保留
//       4. title [v1.6.149]

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');



test('v149-2: tasksCreated 宣告在使用之前 (在模式 B pipeline 之前)', () => {
    var declIdx = HTML.indexOf('var tasksCreated = 0;');
    var useInModeB = HTML.indexOf('tasksCreated += created.length;');
    var useInModeA = HTML.lastIndexOf('tasksCreated++;');

    assert.ok(declIdx > 0, '應有 var tasksCreated = 0; 宣告');
    assert.ok(useInModeB > 0, '應有 tasksCreated += plan.grid (模式 B)');
    assert.ok(useInModeA > 0, '應有 tasksCreated++ (模式 A)');

    assert.ok(declIdx < useInModeB, 'tasksCreated 宣告應在模式 B 使用之前 (修復 ReferenceError)');
    assert.ok(declIdx < useInModeA, 'tasksCreated 宣告應在模式 A 使用之前');
});

test('v149-3: 只有一個 var tasksCreated = 0 宣告 (避免重複)', () => {
    var matches = HTML.match(/var tasksCreated\s*=\s*0\s*;/g) || [];
    assert.strictEqual(matches.length, 1, '應只有一個 var tasksCreated = 0; 宣告');
});




