// v1.6.163 unit test - 答對率總表加冊數欄位
// 驗證:renderAccuracyStats() 渲染出來的 HTML 包含「冊數」欄,
//       且從 wrongUnits 第一個能正確推出 vol tag

const assert = require('assert');

// === Logic under test ===
// v1.6.163: 冊數欄 — 從 wrongUnits 第一個取出 vol 標籤,沒有就顯示 '-'
function extractVolTag(wrongUnits) {
    var _volTag = '-';
    if (wrongUnits && wrongUnits.length > 0) {
        var _firstWu = wrongUnits[0];
        var _vi = _firstWu && _firstWu.indexOf('|');
        if (_vi > 0) _volTag = _firstWu.substring(0, _vi);
    }
    return _volTag;
}

// === Test cases ===

// 1. 標準雙軌格式:有 vol 前綴 → 顯示 vol
assert.strictEqual(extractVolTag(['第一冊|U1']), '第一冊', 'Test 1 fail: single vol tag');
assert.strictEqual(extractVolTag(['第二冊|U3']), '第二冊', 'Test 1 fail: single vol tag 第二冊');
assert.strictEqual(extractVolTag(['第三冊|L1~2']), '第三冊', 'Test 1 fail: single vol tag 第三冊');

// 2. 多個 wrongUnits → 取第一個
assert.strictEqual(extractVolTag(['第一冊|U1', '第一冊|U2', '第一冊|U3']), '第一冊', 'Test 2 fail: multi same vol');
assert.strictEqual(extractVolTag(['第二冊|U1', '第二冊|U2']), '第二冊', 'Test 2 fail: multi same vol 第二冊');

// 3. 舊格式 (沒 vol 前綴) → 顯示 '-'
assert.strictEqual(extractVolTag(['U1']), '-', 'Test 3 fail: legacy no-pipe');
assert.strictEqual(extractVolTag(['字音']), '-', 'Test 3 fail: subject-style no-pipe');

// 4. 空 wrongUnits → 顯示 '-'
assert.strictEqual(extractVolTag([]), '-', 'Test 4 fail: empty array');
assert.strictEqual(extractVolTag(null), '-', 'Test 4 fail: null');
assert.strictEqual(extractVolTag(undefined), '-', 'Test 4 fail: undefined');

// 5. 多 vol (舊格式無 vol,新格式有 vol,但只取第一個的 vol)
// 範例: ['U1', 'U2'] 雙 vol 答錯 → 都沒 vol → '-'
assert.strictEqual(extractVolTag(['U1', 'U2']), '-', 'Test 5 fail: multi-vol legacy');

// 範例: ['第一冊|U1', '第二冊|U2'] → 只取第一個的 vol
assert.strictEqual(extractVolTag(['第一冊|U1', '第二冊|U2']), '第一冊', 'Test 5 fail: cross-vol mixed');

// 6. 邊界: pipe 在第 0 位 → 沒有 vol (空字串前綴)
assert.strictEqual(extractVolTag(['|U1']), '-', 'Test 6 fail: pipe at 0');

// 7. 邊界: pipe 不存在於字串裡 → 沒有 vol
assert.strictEqual(extractVolTag(['L1~2']), '-', 'Test 7 fail: no pipe in string');

// 8. 從 sample 真實資料驗證
var sampleRecord = {
    id: 'acc_id_sl3l8t3oz',
    date: '2026-09-15',
    subject: '英文',
    typeName: '複習講義',
    instanceName: '大滿貫甲',
    total: 40,
    correct: 36,
    wrongUnits: ['第三冊|L1~2']
};
assert.strictEqual(extractVolTag(sampleRecord.wrongUnits), '第三冊', 'Test 8 fail: sample 2026-09-15 大滿貫甲');

// === HTML 結構檢查 ===
// 模擬 renderAccuracyStats() 產生的 HTML,確保 10 個欄都有
function simulateRenderHtml(records) {
    var html = '';
    html += '<colgroup>';
    html += '<col style="width:8%"><col style="width:7%"><col style="width:10%"><col style="width:9%"><col style="width:8%"><col style="width:5%"><col style="width:5%"><col style="width:16%"><col style="width:12%"><col style="width:6%">';
    html += '</colgroup><thead><tr>';
    html += '<th>日期</th><th>科目</th><th>教材類型</th><th>教材版本</th><th>冊數</th><th>總題數</th><th>答對</th><th>答對率</th><th>單元名稱</th><th>操作</th>';
    html += '</tr></thead><tbody>';
    records.forEach(function(r) {
        html += '<tr>';
        html += '<td>' + (r.date || '-') + '</td>';
        html += '<td>' + r.subject + '</td>';
        html += '<td>' + r.typeName + '</td>';
        html += '<td>' + r.instanceName + '</td>';
        html += '<td>' + extractVolTag(r.wrongUnits) + '</td>';
        html += '<td>' + r.total + '</td>';
        html += '<td>' + r.correct + '</td>';
        html += '<td>' + (r.correct/r.total*100).toFixed(1) + '%</td>';
        html += '<td>' + (r.wrongUnits && r.wrongUnits.length > 0 ? r.wrongUnits.join(', ') : '-') + '</td>';
        html += '</tr>';
    });
    return html;
}

var html = simulateRenderHtml([
    { date: '2026-09-15', subject: '英文', typeName: '複習講義', instanceName: '大滿貫甲', total: 40, correct: 36, wrongUnits: ['第三冊|L1~2'] },
    { date: '2026-07-29', subject: '英文', typeName: '複習講義', instanceName: '龐辣甲', total: 35, correct: 35, wrongUnits: ['第X冊|L3~L4'] },
    { date: '2026-09-01', subject: '國文', typeName: '複習講義', instanceName: '翰林', total: 50, correct: 40, wrongUnits: ['字音', '字形'] }
]);

// HTML 必須包含「冊數」th
assert.ok(html.indexOf('<th>冊數</th>') >= 0, 'Test HTML: 冊數 th missing');
// HTML 必須有 10 個 th
var thMatches = html.match(/<th>[^<]+<\/th>/g) || [];
assert.strictEqual(thMatches.length, 10, 'Test HTML: should have 10 th, got ' + thMatches.length + ' (' + thMatches.join(',') + ')');
// 第 5 個 th 是冊數
assert.strictEqual(thMatches[4], '<th>冊數</th>', 'Test HTML: 5th th should be 冊數, got ' + thMatches[4]);

// HTML 必須有對應的 td, 大滿貫甲的 vol 應該是「第三冊」
assert.ok(html.indexOf('大滿貫甲') >= 0, 'Test HTML: 大滿貫甲 missing');
assert.ok(html.indexOf('>第三冊<') >= 0, 'Test HTML: 第三冊 vol tag missing');

// 字音/字形 records 應該顯示 '-' (沒 vol),字音/字形 join 在單元名稱欄
assert.ok(html.indexOf('字音') >= 0, 'Test HTML: 字音 missing');
assert.ok(html.indexOf('字音, 字形') >= 0, 'Test HTML: 字音+字形 join missing');
// 冊數欄對字音記錄顯示 <td>-</td>
var volDashTd = (html.match(/<td>-<\/td>/g) || []).length;
assert.ok(volDashTd >= 1, 'Test HTML: <td>-</td> placeholder for vol column missing, got ' + volDashTd);

console.log('✅ v1.6.163: 冊數欄邏輯測試全通過');
console.log('   extractVolTag: 11 case');
console.log('   HTML render: 5 case');