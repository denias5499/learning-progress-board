// test/legacy-master-purge.test.js — v2.3.2.132
//
// 驗證: 關閉 v1.5.3 自動備份注入 + 精準清除它造成的髒資料
//
// 背景: _v153RestoreFromBackup 原本對「每個 user」都跑, 判斷條件是
//   「user.master 是空的」。已完成 v1.5.2 遷移的 user (有 masters、沒有 master)
//   正好符合 → 被灌入 _v153_BACKUP_MASTER_STR (config.name = '張裕宣')。
//   jsdom 實測確認會寫進 localStorage。
//
// 修法: purgeInjectedLegacyMaster(uid) — 只刪「完全等於那份備份本體」的
//   user.master; 自己動過的 master 一律不碰; 冪等。
//
// 註: purgeInjectedLegacyMaster 宣告在 initUsers() 內 (不是 global),
//     所以這裡直接從 index.html 抽出函式來源, 用 new Function 載進隔離沙盒測。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBackupMaster } = require('./helpers');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');
const BACKUP = loadBackupMaster();

/** 從 index.html 抽出指定函式的完整原始碼 (用大括號配對) */
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

/** 造一個隔離沙盒: multiData / window / console 都是注入的 */
function sandbox(multiData) {
    const win = { _v153_BACKUP_MASTER_STR: JSON.stringify(BACKUP) };
    const noop = () => {};
    const factory = new Function(
        'multiData', 'window', 'console',
        extractFn(HTML, 'purgeInjectedLegacyMaster') + '\nreturn purgeInjectedLegacyMaster;'
    );
    return { fn: factory(multiData, win, { log: noop, warn: noop, error: noop }), win };
}

function ownLegacyMaster() {
    // 「自己真的有一份舊 master」— 不是那份別人備份, 絕對不能被動到
    return { 數學: { type: 'volume', volOrder: ['第一冊'], vols: { 第一冊: [{ id: 'id_mine', name: '我的單元', start: 1, end: 10 }] } } };
}

test('v2.3.2.132: 遷移迴圈不再呼叫 _v153RestoreFromBackup', () => {
    const defs = HTML.match(/function\s+_v153RestoreFromBackup/g) || [];
    assert.equal(defs.length, 0, '_v153RestoreFromBackup 定義應該已被移除');
    const calls = HTML.match(/[^.\w]_v153RestoreFromBackup\s*\(/g) || [];
    assert.equal(calls.length, 0, '不應該還有任何 _v153RestoreFromBackup 呼叫');
    // 新的清除函式有接上遷移迴圈
    assert.ok(/purgeInjectedLegacyMaster\(uid\)/.test(HTML), 'purgeInjectedLegacyMaster 應該在遷移迴圈裡被呼叫');
});

test('v2.3.2.132: 髒資料 (等於別人備份) 會被清掉', () => {
    const multiData = { denias: { name: 'Denias', masters: { '會考複習': {} }, master: JSON.parse(JSON.stringify(BACKUP)) } };
    const { fn } = sandbox(multiData);

    const removed = fn('denias');

    assert.equal(removed, 1, '應該回報清掉 1 個 user');
    assert.equal(multiData.denias.master, undefined, 'user.master 應該已被移除');
    assert.ok(multiData.denias.masters, 'masters 不能動');
});

test('v2.3.2.132: 沒有 masters 的髒 user 也照清 (避免日後被 v1.5.8 搬進 masters)', () => {
    const multiData = { denias: { master: JSON.parse(JSON.stringify(BACKUP)) } };
    const { fn } = sandbox(multiData);

    assert.equal(fn('denias'), 1);
    assert.equal(multiData.denias.master, undefined);
});

test('v2.3.2.132: 自己動過的 master 不會被誤刪', () => {
    const mine = ownLegacyMaster();
    const multiData = { denias: { masters: {}, master: mine } };
    const { fn } = sandbox(multiData);

    const removed = fn('denias');

    assert.equal(removed, 0, '不該回報有清掉任何東西');
    assert.deepEqual(multiData.denias.master, mine, '自己的 master 必須原封不動');
});

test('v2.3.2.132: 只差一個 key 的 master 也不刪', () => {
    const almost = JSON.parse(JSON.stringify(BACKUP));
    delete almost['生物'];                        // 比備份少一科 → 不是同一份
    const multiData = { denias: { masters: {}, master: almost } };
    const { fn } = sandbox(multiData);

    assert.equal(fn('denias'), 0);
    assert.ok(multiData.denias.master, '不完全相同就不該刪');
});

test('v2.3.2.132: 冪等 — 第二次執行不會動手', () => {
    const multiData = { denias: { masters: {}, master: JSON.parse(JSON.stringify(BACKUP)) } };
    const { fn } = sandbox(multiData);

    assert.equal(fn('denias'), 1);
    assert.equal(fn('denias'), 0, '第二次應該是 no-op');
    assert.equal(fn('denias'), 0);
});

test('v2.3.2.132: 邊界 — 沒有 master / 非物件 / 缺備份字串都不會壞', () => {
    const multiData = {
        a: { masters: {} },                              // 沒有 master 欄位
        b: { masters: {}, master: 'oops' },              // master 是字串 (壞資料)
        c: { masters: {}, master: JSON.parse(JSON.stringify(BACKUP)) },
    };
    const { fn, win } = sandbox(multiData);

    assert.equal(fn('a'), 0);

    assert.equal(fn('b'), 0);
    assert.equal(multiData.b.master, 'oops', '非物件不該被刪');

    assert.equal(fn('nobody'), 0, 'uid 不存在要安全返回');

    win._v153_BACKUP_MASTER_STR = undefined;           // 備份字串不見 → 保守不動
    assert.equal(fn('c'), 0);
    assert.ok(multiData.c.master, '沒有備份可比對時不該刪資料');

    win._v153_BACKUP_MASTER_STR = '{ 壞掉的 json';       // parse 失敗也不能刪
    assert.equal(fn('c'), 0);
    assert.ok(multiData.c.master);
});

test('v2.3.2.132: _v153_BACKUP_MASTER_STR 保留 (restoreMathLecture 還要用)', () => {
    assert.ok(/window\._v153_BACKUP_MASTER_STR\s*=/.test(HTML), 'MASTER_STR 必須保留');
    const fn = extractFn(HTML, 'restoreMathLecture');
    assert.ok(fn.includes('_v153_BACKUP_MASTER_STR'), 'restoreMathLecture 還在讀 MASTER_STR');
    assert.ok(fn.includes('張裕宣'), '步驟 3 應該有張裕宣警告');
});