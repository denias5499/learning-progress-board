// test/plan-end-window.test.js — v2.3.2.133
//
// Bug: 計畫完成日期訊息顯示「但計畫剩 1 天」, 並建議「延長到 2026-09-21」
//
// 真實情境 (Denias 截圖, 2026-10-22):
//   plan.end = 2026-09-20  (已過期 32 天)
//   舊碼: Math.max(1, ceil((plan.end - today)/day)) = Math.max(1, -32) = 1
//         → 「但計畫剩 1 天」+「至少需延長 1 天 (到 2026-09-21 或之後)」
//   問題: 把「已過期 32 天」安靜地夾成 1, 還建議一個已經過去的日期。
//
// 修法: calcPlanRemaining() 誠實回報過期天數;
//       resolveExtendedEnd() 保證延長後蓋得住任務且不是過去日期。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');

function extractFn(source, name) {
    const start = source.indexOf('function ' + name + '(');
    assert.ok(start >= 0, 'index.html 裡找不到 ' + name);
    let depth = 0, end = -1;
    for (let i = source.indexOf('{', start); i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    assert.ok(end > 0, '無法配對 ' + name + ' 的大括號');
    return source.slice(start, end + 1);
}

function load(name) {
    const src = extractFn(HTML, name);
    // calcPlanRemaining / resolveExtendedEnd 會用到 getLocalDateString
    const deps = extractFn(HTML, 'getLocalDateString') + '\n' + src + '\nreturn ' + name + ';';
    return new Function(deps)();
}

const calcPlanRemaining = load('calcPlanRemaining');
const resolveExtendedEnd = load('resolveExtendedEnd');

// ---------- calcPlanRemaining ----------

test('v2.3.2.133: Denias 的真實情境 — 過期 32 天不再顯示「剩 1 天」', () => {
    const r = calcPlanRemaining('2026-09-20', '2026-10-22');

    assert.equal(r.isOverdue, true, '應該判定為過期');
    assert.equal(r.overdueDays, 32, '應該是過期 32 天 (9/20 → 10/22)');
    assert.ok(r.overdueDays > 1, '絕不能又被夾成 1');
});

test('v2.3.2.133: 剛好過期當天算 0 天過期', () => {
    const r = calcPlanRemaining('2026-10-22', '2026-10-22');
    assert.equal(r.isOverdue, false);
    assert.equal(r.overdueDays, 0);
    assert.equal(r.availableDays, 1);
});

test('v2.3.2.133: 正常未過期 — 剩餘天數正確', () => {
    const r = calcPlanRemaining('2026-10-30', '2026-10-22');
    assert.equal(r.isOverdue, false);
    assert.equal(r.overdueDays, 0);
    assert.equal(r.availableDays, 8);
});

test('v2.3.2.133: 過期 1 天也要誠實回報 1 (而不是巧合正確)', () => {
    const r = calcPlanRemaining('2026-10-21', '2026-10-22');
    assert.equal(r.isOverdue, true);
    assert.equal(r.overdueDays, 1);
});

test('v2.3.2.133: 過期很多天 — availableDays 不會變成假的 1 而被當成有效', () => {
    const r = calcPlanRemaining('2026-07-01', '2026-10-22');
    assert.equal(r.isOverdue, true);
    assert.equal(r.overdueDays, 113);
    assert.ok(r.daysToToday < 0, 'daysToToday 應該是負數, 代表還差幾天');
});

test('v2.3.2.133: 壞日期不會爆, 退回保守值', () => {
    const r = calcPlanRemaining('不是日期', '2026-10-22');
    assert.equal(r.isOverdue, false);
    assert.equal(r.availableDays, 1);
});

// ---------- resolveExtendedEnd ----------

test('v2.3.2.133: 正常延長 — 單純加天數 (plan.end 在未來時)', () => {
    const r = resolveExtendedEnd('2026-10-25', 1, [], '2026-10-22');
    assert.equal(r, '2026-10-26');
});

test('v2.3.2.133: 沒給 todayStr 時就是純加法', () => {
    assert.equal(resolveExtendedEnd('2026-09-20', 1, [], null), '2026-09-21');
    assert.equal(resolveExtendedEnd('2026-12-30', 5, [], ''), '2027-01-04');
});

test('v2.3.2.133: 過期 plan — 不會延長到過去 (Denias 的情境)', () => {
    // 延長 1 天, 但今天是 10/22 → 結果不能是 09-21
    const r = resolveExtendedEnd('2026-09-20', 1, [], '2026-10-22');
    assert.equal(r, '2026-10-22', '至少要被拉到今天');
});

test('v2.3.2.133: 延長結果必須蓋得住這批新任務', () => {
    const r = resolveExtendedEnd('2026-09-20', 1, ['2026-10-25', '2026-10-26'], '2026-10-22');
    assert.equal(r, '2026-10-26', '要蓋住最後一個任務日');
});

test('v2.3.2.133: 蓋得住任務 + 不是過去日期, 三個條件同時成立', () => {
    const r = resolveExtendedEnd('2026-09-20', 3, ['2026-10-23'], '2026-10-22');
    assert.equal(r, '2026-10-23');
    assert.ok(r >= '2026-10-22', '不會是過去日期');
});

test('v2.3.2.133: 延長天數夠大時以加法為準 (不會被任務拉回去)', () => {
    const r = resolveExtendedEnd('2026-10-01', 10, ['2026-10-05'], '2026-10-22');
    assert.equal(r, '2026-10-22', '10/01 + 10 天 = 10/11, 但今天是 10/22 → 拉到今天');
});

// ---------- 靜態檢查: 訊息真的用了新邏輯 ----------

test('v2.3.2.133: 溢出訊息不再用 Math.max(1, ...) 直接算', () => {
    assert.ok(
        !/const availableDaysForPlan = Math\.max\(1, Math\.ceil\(\(new Date\(plan\.end\)/.test(HTML),
        '舊的 Math.max(1, ...) 應該已被 calcPlanRemaining取代'
    );
    assert.ok(HTML.includes('已過期 ${_remain.overdueDays} 天'), '訊息應該會顯示過期天數');
});

test('v2.3.2.133: 選項 B 用 resolveExtendedEnd', () => {
    assert.ok(HTML.includes('resolveExtendedEnd('), '選項 B 應該呼叫 resolveExtendedEnd');
});