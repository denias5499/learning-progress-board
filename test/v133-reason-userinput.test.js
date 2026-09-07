// v1.6.133: Step 6 錯誤原因 = checkbox 4 個 + 自填 input
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v133: Step 6 標題改為「自填」', () => {
    assert.ok(/Step 6：錯誤原因.*自填/.test(WN), '應標明 user 自填');
});

test('v133: 4 個常見 checkbox', () => {
    assert.ok(/value="粗心"/.test(WN));
    assert.ok(/value="觀念不清"/.test(WN));
    assert.ok(/value="計算錯誤"/.test(WN));
    assert.ok(/value="背不起來"/.test(WN));
});

test('v133: 自填 custom-reason input', () => {
    assert.ok(/<input type="text" class="custom-reason"/.test(WN));
    assert.ok(/placeholder="或自填其他原因/.test(WN));
});

test('v133: generateNote 收集 checkbox + custom-reason', () => {
    // 找 generateNote 內收集 reason 的區段
    const gn = WN.match(/function generateNote\(\)\s*\{[\s\S]*?const customReason/);
    assert.ok(gn, 'generateNote 應有 customReason 收集');
    assert.ok(/reasons\.push\(customReason\)/.test(WN), '應 push customReason 進 reasons');
});

test('v133: title [v1.6.133]', () => {
    assert.ok(/<title>.*\[v1\.6\.133\]<\/title>/.test(fs.readFileSync('index.html', 'utf8')));
});
