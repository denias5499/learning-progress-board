// test/v142-unit-mode-schedule.test.js
// v1.6.142 unit test: 模式 B pipeline 排程演算法
// 測試: 1. pipeline 沿 sortedDates 連續 N 天 2. unit 內 chunk 順序 3. daysPerUnit 邊角 4. 超出 endDate 警告

'use strict';

const test = require('node:test');
const assert = require('node:assert');

// 純演算法測試: 模擬模式 B pipeline 邏輯 (從 v1.6.142 抽出)
function pipelineSchedule(ws, sortedDates) {
    var hoursPerUnit = Number(ws.hoursPerUnit) || 1;
    var daysPerUnit = Math.max(1, Math.round(ws.daysPerUnit != null && ws.daysPerUnit !== '' ? Number(ws.daysPerUnit) : 2));
    var chunkSizeHours = 0.5;
    var numChunks = Math.max(1, Math.ceil(hoursPerUnit / chunkSizeHours));

    // 重建 chunks per unit
    var chunksByUnit = {};
    var chunksOrder = [];
    ws.units.forEach(function(u) {
        if (!ws.selectedUnitIds.includes(u.id)) return;
        var perChunkCost = hoursPerUnit / numChunks;
        var list = [];
        for (var i = 0; i < numChunks; i++) {
            list.push({
                unitId: u.id,
                unitName: u.name,
                chunkIdx: i,
                cost: perChunkCost
            });
        }
        chunksByUnit[u.id] = list;
        chunksOrder.push(u.id);
    });

    // pipeline 排
    var assignments = {}; // ds -> [chunk, ...]
    var dayCursor = 0;
    var unitQueue = chunksOrder.slice();
    var warnings = [];

    while (unitQueue.length > 0 && dayCursor < sortedDates.length) {
        var uId = unitQueue[0];
        var chunksForUnit = chunksByUnit[uId];
        var placedThisUnit = 0;

        for (var di = 0; di < daysPerUnit && di < chunksForUnit.length; di++) {
            if (dayCursor >= sortedDates.length) break;
            var ds = sortedDates[dayCursor];
            if (!assignments[ds]) assignments[ds] = [];
            assignments[ds].push(chunksForUnit[di]);
            placedThisUnit++;
            dayCursor++;
        }

        // 剩餘 chunk 強塞
        if (placedThisUnit < chunksForUnit.length) {
            warnings.push('daysPerUnit=' + daysPerUnit + ' 但 ' + chunksForUnit.length + ' chunks');
            for (var ri = placedThisUnit; ri < chunksForUnit.length; ri++) {
                if (dayCursor >= sortedDates.length) break;
                var ds2 = sortedDates[dayCursor];
                if (!assignments[ds2]) assignments[ds2] = [];
                assignments[ds2].push(chunksForUnit[ri]);
                dayCursor++;
            }
        }

        unitQueue.shift();
    }

    if (unitQueue.length > 0) {
        warnings.push(unitQueue.length + ' 個 unit 排不進');
    }

    return { assignments, warnings, dayCursor };
}

test('v142-1: 模式 B pipeline — daysPerUnit=2, 1 個 unit 佔 2 個連續讀書日', () => {
    var ws = {
        name: '國文', hoursPerUnit: 2.0, daysPerUnit: 2,
        selectedUnitIds: ['u1'],
        units: [{ id: 'u1', name: 'Unit 1' }]
    };
    var dates = ['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'];
    var result = pipelineSchedule(ws, dates);
    // 2hr / 0.5 = 4 chunks
    assert.strictEqual(Object.keys(result.assignments).length, 4, '應放滿 4 天 (4 chunks, 1 unit 佔 2 天)');
    // 同一 unit 連續 2 天
    assert.deepStrictEqual(result.assignments['2026-09-15'].map(function(c) { return c.unitId; }), ['u1']);
    assert.deepStrictEqual(result.assignments['2026-09-16'].map(function(c) { return c.unitId; }), ['u1']);
    // 第 3,4 天也放同 unit 的 chunk 2,3 (因為 numChunks=4, daysPerUnit=2 不足, 強塞)
    assert.deepStrictEqual(result.assignments['2026-09-17'].map(function(c) { return c.unitId; }), ['u1']);
    assert.deepStrictEqual(result.assignments['2026-09-18'].map(function(c) { return c.unitId; }), ['u1']);
    // 警告: daysPerUnit=2 但 4 chunks
    assert.ok(result.warnings.length > 0, '應有 daysPerUnit 警告');
});

test('v142-2: 模式 B — 多 unit 連續 pipeline, 2 個 unit, daysPerUnit=2', () => {
    var ws = {
        name: '數學', hoursPerUnit: 1.0, daysPerUnit: 2,
        selectedUnitIds: ['u1', 'u2'],
        units: [{ id: 'u1', name: 'U1' }, { id: 'u2', name: 'U2' }]
    };
    var dates = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
    var result = pipelineSchedule(ws, dates);
    // 1hr / 0.5 = 2 chunks per unit → daysPerUnit=2 剛好, 2 unit × 2 天 = 4 天
    assert.deepStrictEqual(result.assignments['d1'].map(function(c) { return c.unitId; }), ['u1']);
    assert.deepStrictEqual(result.assignments['d2'].map(function(c) { return c.unitId; }), ['u1']);
    assert.deepStrictEqual(result.assignments['d3'].map(function(c) { return c.unitId; }), ['u2']);
    assert.deepStrictEqual(result.assignments['d4'].map(function(c) { return c.unitId; }), ['u2']);
    assert.strictEqual(result.warnings.length, 0, '完美對齊應無警告');
});

test('v142-3: 模式 B — chunk 內順序保持 (chunkIdx 0, 1 依序)', () => {
    var ws = {
        name: '英文', hoursPerUnit: 1.0, daysPerUnit: 1,
        selectedUnitIds: ['u1'],
        units: [{ id: 'u1', name: 'U1' }]
    };
    var dates = ['d1', 'd2', 'd3'];
    var result = pipelineSchedule(ws, dates);
    // 2 chunks, daysPerUnit=1, 第一天 chunk 0, 第二天 chunk 1
    assert.strictEqual(result.assignments['d1'][0].chunkIdx, 0);
    assert.strictEqual(result.assignments['d2'][0].chunkIdx, 1);
});

test('v142-4: 模式 B — 超過 endDate 警告', () => {
    var ws = {
        name: '理化', hoursPerUnit: 1.0, daysPerUnit: 2,
        selectedUnitIds: ['u1', 'u2', 'u3'],
        units: [{ id: 'u1', name: 'U1' }, { id: 'u2', name: 'U2' }, { id: 'u3', name: 'U3' }]
    };
    // 只有 4 天, 但 3 unit × 2 daysPerUnit = 6 天
    var dates = ['d1', 'd2', 'd3', 'd4'];
    var result = pipelineSchedule(ws, dates);
    assert.ok(result.warnings.some(function(w) { return w.indexOf('排不進') >= 0; }), '應有「排不進」警告');
});

test('v142-5: 模式 B — hoursPerUnit=0.5 邊角 (numChunks=1)', () => {
    var ws = {
        name: 'X', hoursPerUnit: 0.5, daysPerUnit: 1,
        selectedUnitIds: ['u1'],
        units: [{ id: 'u1', name: 'U1' }]
    };
    var dates = ['d1', 'd2'];
    var result = pipelineSchedule(ws, dates);
    assert.strictEqual(result.assignments['d1'].length, 1, '1 chunk, 1 天');
    assert.strictEqual(result.warnings.length, 0, 'daysPerUnit=1 numChunks=1 完美對齊, 不應有警告');
    // 注意: numChunks=1, daysPerUnit=1, 1 chunk 剛好 = 無警告
});

test('v142-6: 模式 B — daysPerUnit=0 邊角 (保護除以 0)', () => {
    var ws = {
        name: 'X', hoursPerUnit: 1.0, daysPerUnit: 0,
        selectedUnitIds: ['u1'],
        units: [{ id: 'u1', name: 'U1' }]
    };
    var dates = ['d1', 'd2'];
    var result = pipelineSchedule(ws, dates);
    // daysPerUnit 會被 Math.max(1, ...) 修成 1
    assert.strictEqual(result.assignments['d1'].length, 1, 'daysPerUnit=0 → 1');
    assert.ok(result.warnings.length > 0, 'daysPerUnit=0 修成 1 但 numChunks=2 排不下, 應有 daysPerUnit 警告');
});

test('v142-7: 模式 B — 空 selectedUnitIds 不排', () => {
    var ws = {
        name: 'X', hoursPerUnit: 2.0, daysPerUnit: 2,
        selectedUnitIds: [],
        units: [{ id: 'u1', name: 'U1' }]
    };
    var dates = ['d1', 'd2'];
    var result = pipelineSchedule(ws, dates);
    assert.strictEqual(Object.keys(result.assignments).length, 0, '空選擇不排任何東西');
});

test('v142-8: 整合 — index.html 內含 _hasUnitMode 與 pipeline 邏輯', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');
    assert.ok(HTML.indexOf('_hasUnitMode') >= 0, '應有 _hasUnitMode 旗標');
    assert.ok(HTML.indexOf('unitModeAssignments') >= 0, '應有 unitModeAssignments');
    assert.ok(HTML.indexOf('每個 unit 的多個 chunks 重組') >= 0, '應有 pipeline 註解');
    assert.ok(/\[v1\.6\.142\]/.test(HTML), 'title 應為 [v1.6.142]');
});
