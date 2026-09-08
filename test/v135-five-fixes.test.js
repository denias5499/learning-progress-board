// v1.6.135: 5 個修改的測試
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');
const IDX = fs.readFileSync('index.html', 'utf8');

// (1) + (5) CSS 對齊
test('v135 (1) (5): .app-container 拿掉 max-width: 1000px', () => {
    assert.ok(!/max-width: 1000px/.test(WN), '不應有 max-width: 1000px');
    assert.ok(/max-width: 100%/.test(WN), '應為 max-width: 100%');
    assert.ok(/.app-container[^{]*\{[^}]*margin: 0/.test(WN), 'margin 應為 0');
    assert.ok(/.app-container[^{]*\{[^}]*padding: 0/.test(WN), 'padding 應為 0');
});

test('v135 (1) (5): .page 拿掉 padding: 20px', () => {
    assert.ok(/.page \{ display: none; padding: 0;/.test(WN), '.page padding 應為 0');
});

test('v135 (5): .note-slot 拿掉 box-shadow + border-radius', () => {
    assert.ok(/.note-slot \{[^}]*box-shadow: none/.test(WN), '.note-slot box-shadow: none');
    assert.ok(/.note-slot \{[^}]*border-radius: 0/.test(WN), '.note-slot border-radius: 0');
});

// (2) 完成選取提醒
test('v135 (2): finishCropping 加 batchCards 檢查', () => {
    assert.ok(/function finishCropping/.test(WN));
    assert.ok(/batchCards\.length === 0/.test(WN) || /batchCards\.length\s*===\s*0/.test(WN));
    assert.ok(/alert.*尚未完成錯題選擇/.test(WN), '應有 alert 提醒');
});

// (3) 移除使用者 dropdown
test('v135 (3): 移除 student-name dropdown', () => {
    assert.ok(!/<select id="student-name">/.test(WN), '不應有 student-name select');
    assert.ok(/id="current-user-display"/.test(WN), '應有 current-user-display');
    assert.ok(!/studentsData/.test(WN), '不應有 studentsData');
});

test('v135 (3): getCurrentUser 函式存在', () => {
    assert.ok(/function getCurrentUser\(\)/.test(WN));
    assert.ok(/StudyMap_CurrentUserId_V20/.test(WN));
    assert.ok(/refreshUserDisplay/.test(WN));
});

// (4) saveNotes 修 bug
test('v135 (4): saveNotes 用 typeName/instanceName 不用 volume', () => {
    // 抓 saveNotes 函式內容
    const m = WN.match(/function saveNotes\(\)[\s\S]*?\n    \}/);
    assert.ok(m, 'saveNotes 函式存在');
    assert.ok(/typeName: slot\.dataset\.typeName/.test(m[0]), '應存 typeName');
    assert.ok(/instanceName: slot\.dataset\.instanceName/.test(m[0]), '應存 instanceName');
    assert.ok(!/volume: slot\.dataset\.volume/.test(m[0]), '不應存 dataset.volume');
});

test('v135 (4): saveNotes 有 try/catch 保護 UI reset', () => {
    const m = WN.match(/function saveNotes\(\)[\s\S]*?\n    \}/);
    assert.ok(/catch\s*\(\s*e\s*\)/.test(m[0]), '應有 try/catch');
    assert.ok(/UI reset 失敗/.test(m[0]) || /goToPage.*失敗/.test(m[0]), '應處理 UI reset 失敗');
});

// title
test('v135 title: index.html 含 [v1.6.135] 系列', () => {
    // 應該是 v1.6.135, .1, .2, ... 任意 hotfix 都算 pass
    assert.ok(/<title>.*\[v1\.6\.135(?:\.\d+)?\]<\/title>/.test(IDX));
});

// 行為測試 — saveNotes 不 throw
test('v135 (4) 行為: saveNotes 不 throw 並正確儲存', () => {
    const fnMatch = WN.match(/function saveNotes\(\)[\s\S]*?\n    \}/);
    assert.ok(fnMatch);
    
    let alertCalled = '';
    const fakeDom = {
        querySelectorAll: (sel) => {
            if (sel === '.editable-slot') {
                return [{
                    dataset: {
                        date: '2026/9/8',
                        subject: '國文',
                        typeName: '複習講義',
                        instanceName: '麻辣',
                        unit: 'U1',
                        reasons: '["粗心"]'
                    },
                    querySelector: (s) => {
                        if (s === 'img') return { src: 'blob:xxx' };
                        if (s === '.note-grid-area') return { innerHTML: '<p>筆記</p>' };
                        return null;
                    }
                }];
            }
            return [];
        },
        getElementById: (id) => {
            const el = { innerHTML: '', style: { display: '' } };
            return el;
        }
    };
    const sandbox = {
        document: fakeDom,
        localStorage: {
            _data: { myStudyNotes: '[]' },
            getItem(k) { return this._data[k] || null; },
            setItem(k, v) { this._data[k] = v; }
        },
        JSON, console: { log(){}, error(){}, warn(){} },
        Object, Array, Date, Math,
        hasUnsavedNotes: true,
        currentFilesData: [],
        alert: (m) => { alertCalled = m; },
        confirm: () => false
    };
    vm.createContext(sandbox);
    vm.runInContext(fnMatch[0] + '\nsaveNotes();', sandbox);
    
    assert.ok(alertCalled.includes('儲存') || alertCalled.includes('成功'), `alert 應該跳: ${alertCalled}`);
    const saved = JSON.parse(sandbox.localStorage.getItem('myStudyNotes'));
    assert.ok(saved.length >= 1, '應有儲存');
    assert.equal(saved[0].typeName, '複習講義', 'typeName 應正確');
    assert.equal(saved[0].instanceName, '麻辣', 'instanceName 應正確');
    assert.equal(saved[0].subject, '國文', 'subject 應正確');
});

// 行為測試 — finishCropping 檢查 cards 為空時 alert
test('v135 (2) 行為: finishCropping cards 為空時 alert', () => {
    // 抓 finishCropping 跟 batchCounter 還有 cards-slider
    const fnMatch = WN.match(/function finishCropping\(\)[\s\S]*?\n    \}/);
    assert.ok(fnMatch);
    
    let alertMsg = '';
    let displayChange = false;
    const fakeDom = {
        querySelectorAll: () => [],  // 沒有任何 cards
        getElementById: (id) => {
            if (id === 'crop-modal') return { style: { display: 'block' } };  // 假設原本顯示
            return { style: { display: 'none' } };
        }
    };
    const sandbox = {
        document: fakeDom,
        batchCounter: 1,
        alert: (m) => { alertMsg = m; }
    };
    vm.createContext(sandbox);
    vm.runInContext(fnMatch[0] + '\nfinishCropping();', sandbox);
    
    assert.ok(alertMsg.includes('尚未完成錯題選擇'), `應 alert: got "${alertMsg}"`);
});

test('v135 (2) 行為: finishCropping cards 有資料時正常關閉 modal', () => {
    const fnMatch = WN.match(/function finishCropping\(\)[\s\S]*?\n    \}/);
    
    let alertMsg = '';
    let modalDisplayed = 'block';
    const fakeDom = {
        querySelectorAll: (sel) => {
            if (sel.includes('file-card')) return [{ fake: 'card' }];  // 有卡片
            return [];
        },
        getElementById: (id) => {
            if (id === 'crop-modal') {
                return { style: { set display(v) { modalDisplayed = v; }, get display() { return modalDisplayed; } } };
            }
            return { style: { display: 'none' } };
        }
    };
    const sandbox = {
        document: fakeDom,
        batchCounter: 1,
        alert: (m) => { alertMsg = m; }
    };
    vm.createContext(sandbox);
    vm.runInContext(fnMatch[0] + '\nfinishCropping();', sandbox);
    
    assert.equal(alertMsg, '', '不應 alert');
    assert.equal(modalDisplayed, 'none', 'modal 應關閉');
});
