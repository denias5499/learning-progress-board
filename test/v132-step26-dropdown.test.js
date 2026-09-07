// v1.6.132: Step 2~6 dropdown 結構 + 動態讀 master data
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v132: createSettingCard 包含 Step 2~6 (5 層)', () => {
    assert.ok(/Step 2：科目/.test(WN));
    assert.ok(/Step 3：教材類型/.test(WN));
    assert.ok(/Step 4：教材名稱/.test(WN));
    assert.ok(/Step 5：單元/.test(WN));
    assert.ok(/Step 6：錯誤原因/.test(WN));
});

test('v132: dropdown 5 個 select', () => {
    assert.ok(/class="subj-sel"/.test(WN));
    assert.ok(/class="type-sel"/.test(WN));
    assert.ok(/class="inst-sel"/.test(WN));
    assert.ok(/class="unit-sel"/.test(WN));
    assert.ok(/class="checkbox-group reasons-group"/.test(WN));
});

test('v132: 動態讀 master data', () => {
    assert.ok(/function getSyllabusDB\(\)/.test(WN));
    assert.ok(/window\.WN_masterData && window\.WN_masterData\.tree/.test(WN));
    assert.ok(/StudyMap_Family_Data_V20/.test(WN));
});

test('v132: handleCardTypeChange + handleCardInstChange 取代舊 handleCardVolumeChange', () => {
    assert.ok(/function handleCardTypeChange/.test(WN));
    assert.ok(/function handleCardInstChange/.test(WN));
    assert.ok(!/function handleCardVolumeChange/.test(WN),
        'handleCardVolumeChange 應該被取代');
});

test('v132: 行為測試 - getSyllabusDB 從 WN_masterData 讀', () => {
    const fnMatch = WN.match(/function getSyllabusDB\(\)\s*\{[\s\S]*?\n    \}/);
    assert.ok(fnMatch);
    
    const fakeMasterData = {
        tree: {
            '國文': {
                '複習講義': { '麻辣': ['U1', 'U2', 'U3'] },
                '模擬題本': { '3688': ['T1', 'T2'] }
            },
            '英文': {
                '模擬題本': { 'KO': ['Unit 1', 'Unit 2'] }
            }
        }
    };
    
    const sandbox = {
        window: { WN_masterData: fakeMasterData },
        Object, Array, JSON, console: { log(){}, warn(){}, error(){} }
    };
    vm.createContext(sandbox);
    vm.runInContext(fnMatch[0], sandbox);
    
    const db = sandbox.getSyllabusDB();
    assert.ok(db['國文']);
    assert.ok(db['國文']['複習講義']);
    assert.ok(db['國文']['複習講義']['麻辣']);
    assert.deepEqual(db['國文']['複習講義']['麻辣'], ['U1', 'U2', 'U3']);
    assert.ok(db['英文']['模擬題本']['KO']);
});

test('v132: 行為測試 - localStorage fallback', () => {
    const fnMatch = WN.match(/function getSyllabusDB\(\)\s*\{[\s\S]*?\n    \}/);
    
    // mock localStorage 存了 v20 data
    const v20Data = {
        'user1': {
            masters: {
                '複習講義': {
                    '國文': {
                        'inst1': {
                            typeName: '複習講義',
                            instanceName: '麻辣',
                            units: ['U1', 'U2', 'U3']
                        }
                    }
                }
            }
        }
    };
    
    const sandbox = {
        window: {},  // 沒有 WN_masterData
        localStorage: {
            _data: {
                'StudyMap_Family_Data_V20': JSON.stringify(v20Data),
                'StudyMap_CurrentUserId_V20': 'user1'
            },
            getItem(k) { return this._data[k] || null; }
        },
        Object, Array, JSON, console: { log(){}, warn(){}, error(){} }
    };
    vm.createContext(sandbox);
    vm.runInContext(fnMatch[0], sandbox);
    
    const db = sandbox.getSyllabusDB();
    assert.ok(db['國文'], '應讀到 國文');
    assert.ok(db['國文']['複習講義']['麻辣'], '應讀到 麻辣');
    assert.deepEqual(db['國文']['複習講義']['麻辣'], ['U1', 'U2', 'U3']);
});

test('v132: title [v1.6.132]', () => {
    assert.ok(/<title>.*\[v1\.6\.132\]<\/title>/.test(fs.readFileSync('index.html', 'utf8')));
});

test('v132: 保留 BISECT drag-drop setupDragAndDrop (沒 preventDefault, Safari 不 freeze)', () => {
    assert.ok(/function setupDragAndDrop\(\)/.test(WN));
});
