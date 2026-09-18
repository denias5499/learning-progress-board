// v1.6.160 unit test: 修 getUnitAccuracyRate extraExam 跨 instance 亂 match bug
// 場景：3 個 instance 各有 L1~L2 unit,一筆 extraExam (沒 instanceName) 不應跨冊 match
// + 自動遷移: 舊 extraExam 從主考試補 instanceName

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const HTML = fs.readFileSync(__dirname + '/../index.html', 'utf-8');

function extractFn(name, src) {
    const re = new RegExp('function\\s+' + name + '\\s*\\(', 'g');
    const m = re.exec(src);
    if (!m) throw new Error('找不到 ' + name);
    const start = m.index;
    let depth = 0, i = start;
    while (i < src.length) {
        const ch = src[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) { return src.substring(start, i + 1); }
        }
        i++;
    }
    return src.substring(start);
}

function extractTestModule(html) {
    const fns = ['loadAccuracyRecords', 'getUnitAccuracyRate'];
    return fns.map(n => extractFn(n, html)).join('\n');
}

function buildCtx(records) {
    const code = extractTestModule(HTML);
    const ctx = {
        localStorage: {
            _data: {},
            getItem(k) { return this._data[k] || null; },
            setItem(k, v) { this._data[k] = String(v); }
        },
        accStorageKey: () => 'StudyMap_AccuracyRecords_V158_user_A',
        console: console
    };
    ctx.localStorage.setItem('StudyMap_AccuracyRecords_V158_user_A', JSON.stringify(records));
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    return ctx;
}

test('T1: extraExam 沒 instanceName 不參與 rate 計算 (修後)', () => {
    const records = [{
        id: 'acc_test_1',
        subject: '英文',
        typeName: '複習卷',
        instanceId: 'inst2',
        instanceName: '第二冊',
        total: 100,
        correct: 94,
        wrongUnits: ['L1~L2'],
        extraExams: [{
            subject: '英文',
            name: 'L1~L2',
            range: '',
            total: 50,
            correct: 47,
            date: '2026-09-15'
        }]
    }];
    
    const ctx = buildCtx(records);
    const recordsLoaded = ctx.loadAccuracyRecords();
    
    assert.strictEqual(recordsLoaded[0].extraExams[0].subject, '英文');
    assert.ok(recordsLoaded[0].extraExams[0].instanceName, '應被遷移補上 instanceName');
    
    const rate3 = ctx.getUnitAccuracyRate('L1~L2', '英文', '複習卷', '第三冊');
    assert.strictEqual(rate3, null, '第三冊 L1~L2 應回傳 null, 不應 match 到第二冊 extraExam');
    
    const rate4 = ctx.getUnitAccuracyRate('L1~L2', '英文', '複習卷', '第四冊');
    assert.strictEqual(rate4, null, '第四冊 L1~L2 應回傳 null');
    
    const rate2 = ctx.getUnitAccuracyRate('L1~L2', '英文', '複習卷', '第二冊');
    assert.ok(rate2 !== null, '第二冊應有 rate');
    assert.ok(Math.abs(rate2 - 0.94) < 0.001, '第二冊 rate 應為 0.94, 實際 ' + rate2);
});

test('T2: extraExam 有 instanceName 嚴格過濾', () => {
    const records = [{
        id: 'acc_test_2',
        subject: '英文',
        typeName: '複習卷',
        instanceId: 'inst3',
        instanceName: '第三冊',
        total: 100,
        correct: 50,
        wrongUnits: ['L3~L4'],
        extraExams: [{
            subject: '英文',
            typeName: '複習卷',
            instanceName: '第三冊',
            name: 'L1~L2',
            range: '',
            total: 30,
            correct: 28,
            date: '2026-09-15'
        }]
    }];
    
    const ctx = buildCtx(records);
    
    const rate3 = ctx.getUnitAccuracyRate('L1~L2', '英文', '複習卷', '第三冊');
    assert.ok(rate3 !== null);
    assert.ok(Math.abs(rate3 - 28/30) < 0.001, '第三冊 rate 應為 ' + (28/30).toFixed(3) + ', 實際 ' + rate3);
    
    const rate4 = ctx.getUnitAccuracyRate('L1~L2', '英文', '複習卷', '第四冊');
    assert.strictEqual(rate4, null, '第四冊不應 match 第三冊的 extraExam');
    
    const rate3L3 = ctx.getUnitAccuracyRate('L3~L4', '英文', '複習卷', '第三冊');
    assert.ok(rate3L3 !== null);
    assert.ok(Math.abs(rate3L3 - 0.5) < 0.001);
});

test('T3: 主考試 ctxMatch 仍正常擋掉跨 instance', () => {
    const records = [{
        id: 'acc_test_3',
        subject: '英文',
        typeName: '複習卷',
        instanceId: 'inst3',
        instanceName: '第三冊',
        total: 100,
        correct: 94,
        wrongUnits: ['L1~L2'],
        extraExams: []
    }];
    
    const ctx = buildCtx(records);
    
    const rate2 = ctx.getUnitAccuracyRate('L1~L2', '英文', '複習卷', '第二冊');
    assert.strictEqual(rate2, null, '第二冊不應 match 第三冊的主考試');
    
    const rate3 = ctx.getUnitAccuracyRate('L1~L2', '英文', '複習卷', '第三冊');
    assert.ok(Math.abs(rate3 - 0.94) < 0.001);
});

test('T4: 自動遷移: extraExam 缺 subject/typeName/instanceName 都會從主考試補', () => {
    const records = [{
        id: 'acc_test_4',
        subject: '英文',
        typeName: '複習卷',
        instanceId: 'inst2',
        instanceName: '第二冊',
        total: 50,
        correct: 47,
        wrongUnits: [],
        extraExams: [{
            name: 'L1~L2',
            range: '',
            total: 30,
            correct: 28,
            date: '2026-09-15'
        }]
    }];
    
    const ctx = buildCtx(records);
    const recordsLoaded = ctx.loadAccuracyRecords();
    
    const e = recordsLoaded[0].extraExams[0];
    assert.strictEqual(e.subject, '英文', 'subject 應被補');
    assert.strictEqual(e.typeName, '複習卷', 'typeName 應被補');
    assert.strictEqual(e.instanceName, '第二冊', 'instanceName 應被補');
});

test('T5: 自動遷移不覆寫已有欄位', () => {
    const records = [{
        id: 'acc_test_5',
        subject: '英文',
        typeName: '複習卷',
        instanceId: 'inst2',
        instanceName: '第二冊',
        total: 50,
        correct: 47,
        wrongUnits: [],
        extraExams: [{
            subject: '數學',
            typeName: '講義',
            instanceName: '第一冊',
            name: 'L1~L2',
            range: '',
            total: 30,
            correct: 28,
            date: '2026-09-15'
        }]
    }];
    
    const ctx = buildCtx(records);
    const recordsLoaded = ctx.loadAccuracyRecords();
    
    const e = recordsLoaded[0].extraExams[0];
    assert.strictEqual(e.subject, '數學', '已有 subject 不應被覆寫');
    assert.strictEqual(e.typeName, '講義', '已有 typeName 不應被覆寫');
    assert.strictEqual(e.instanceName, '第一冊', '已有 instanceName 不應被覆寫');
});

test('T6: 空 records 應回傳 [] 不 throw', () => {
    const ctx = buildCtx([]);
    const records = ctx.loadAccuracyRecords();
    assert.ok(Array.isArray(records), '應回傳 array');
    assert.strictEqual(records.length, 0, '應為空 array');
    
    const rate = ctx.getUnitAccuracyRate('L1~L2', '英文', '複習卷', '第二冊');
    assert.strictEqual(rate, null);
});

test('T7: 截圖還原 — Denias 真實資料情境', () => {
    const records = [{
        id: 'acc_real',
        subject: '英文',
        typeName: '複習卷',
        instanceId: 'inst2',
        instanceName: '第二冊',
        total: 100,
        correct: 94,
        wrongUnits: ['L1~L2', 'L3~L4'],
        extraExams: [{
            subject: '英文',
            name: 'L1~L2',
            range: '全4冊',
            total: 30,
            correct: 28,
            date: '2026-09-10'
        }]
    }];
    
    const ctx = buildCtx(records);
    
    const rate2 = ctx.getUnitAccuracyRate('L1~L2', '英文', '複習卷', '第二冊');
    assert.ok(rate2 !== null);
    const expected2 = (0.94 + 28/30) / 2;
    assert.ok(Math.abs(rate2 - expected2) < 0.001, '第二冊 rate 應為 ' + expected2.toFixed(4) + ', 實際 ' + rate2);
    
    const rate3 = ctx.getUnitAccuracyRate('L1~L2', '英文', '複習卷', '第三冊');
    assert.strictEqual(rate3, null, '✅ 修好了! 第三冊 L1~L2 不再 match 舊 extraExam');
    
    const rate4 = ctx.getUnitAccuracyRate('L1~L2', '英文', '複習卷', '第四冊');
    assert.strictEqual(rate4, null, '✅ 修好了! 第四冊 L1~L2 不再 match 舊 extraExam');
});
