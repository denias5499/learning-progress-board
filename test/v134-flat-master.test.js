// v1.6.134: getSyllabusDB 處理真實 master 結構 masters[cat][subj].materials[typeName].instances[]
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

function makeFakeLocalStorage(mastersData, uid) {
    return {
        _data: {
            'StudyMap_Family_Data_V20': JSON.stringify({ 'user1': { masters: mastersData } }),
            'StudyMap_CurrentUserId_V20': uid || 'user1'
        },
        getItem(k) { return this._data[k] || null; }
    };
}

test('v134: 行為測試 - 真實 master 結構 (materials → instances)', () => {
    // 真實結構: masters[cat][subj].materials[typeName].instances[]
    const mastersData = {
        '復習類': {
            '國文': {
                materials: {
                    '複習講義': {
                        instances: [
                            { name: '麻辣', units: ['U1 字音', 'U2 字形'] },
                            { name: '大滿貫', units: ['第1單元', '第2單元'] }
                        ]
                    },
                    '模擬題本': {
                        instances: [
                            { name: '3688', vols: { '上': ['T1', 'T2'], '下': ['T3', 'T4'] } }
                        ]
                    }
                }
            },
            '數學': {
                materials: {
                    '複習卷': {
                        instances: [
                            { name: 'KO', units: ['CH1', 'CH2'] }
                        ]
                    }
                }
            }
        }
    };
    
    const sandbox = {
        window: {},
        localStorage: makeFakeLocalStorage(mastersData),
        Object, Array, JSON, console: { log(){}, warn(){}, error(){} },
        DEFAULT_SYLLABUS_DB: {
            '國文': { '其他': { '預設': ['字音', '字形', '字義', '詞語應用'] } }
        }
    };
    vm.createContext(sandbox);
    
    // 抓 getSyllabusDB 函式
    const fnMatch = WN.match(/function getSyllabusDB\(\)\s*\{[\s\S]*?\n    \}/);
    vm.runInContext(fnMatch[0], sandbox);
    
    const db = sandbox.getSyllabusDB();
    
    // 結構檢查
    assert.ok(db['國文'], '應有 國文');
    assert.ok(db['國文']['複習講義'], '應有 複習講義 (從 materials 讀)');
    assert.ok(!db['國文']['materials'], '不應該有 materials 這個 key');
    
    // 教材名稱檢查
    assert.ok(db['國文']['複習講義']['麻辣'], '應有 麻辣');
    assert.ok(db['國文']['複習講義']['大滿貫'], '應有 大滿貫');
    assert.equal(JSON.stringify(db['國文']['複習講義']['麻辣']), JSON.stringify(['U1 字音', 'U2 字形']));
    
    // 模擬題本
    assert.ok(db['國文']['模擬題本']['3688'], '應有 3688');
    assert.equal(JSON.stringify(db['國文']['模擬題本']['3688']), JSON.stringify(['上 / T1', '上 / T2', '下 / T3', '下 / T4']));
    
    // 數學
    assert.ok(db['數學']['複習卷']['KO'], '應有 KO');
});

test('v134: 沒 materials 只有舊 insId 結構也能跑', () => {
    const mastersData = {
        '復習類': {
            '英文': {
                'inst_001': {
                    typeName: '模擬題本',
                    instanceName: 'KO',
                    units: ['U1', 'U2']
                }
            }
        }
    };
    
    const sandbox = {
        window: {},
        localStorage: makeFakeLocalStorage(mastersData),
        Object, Array, JSON, console: { log(){}, warn(){}, error(){} },
        DEFAULT_SYLLABUS_DB: {
            '國文': { '其他': { '預設': ['字音', '字形', '字義', '詞語應用'] } }
        }
    };
    vm.createContext(sandbox);
    
    const fnMatch = WN.match(/function getSyllabusDB\(\)\s*\{[\s\S]*?\n    \}/);
    vm.runInContext(fnMatch[0], sandbox);
    
    const db = sandbox.getSyllabusDB();
    assert.ok(db['英文']['模擬題本']['KO']);
});

test('v134: title [v1.6.134]', () => {
    assert.ok(/<title>.*\[v1\.6\.134\]<\/title>/.test(fs.readFileSync('index.html', 'utf8')));
});

test('v134: 沒 WN_masterData 也沒 localStorage 就用 DEFAULT', () => {
    const sandbox = {
        window: {},
        localStorage: { getItem() { return null; } },
        Object, Array, JSON, console: { log(){}, warn(){}, error(){} },
        DEFAULT_SYLLABUS_DB: {
            '國文': { '其他': { '預設': ['字音', '字形', '字義', '詞語應用'] } }
        }
    };
    vm.createContext(sandbox);
    
    const fnMatch = WN.match(/function getSyllabusDB\(\)\s*\{[\s\S]*?\n    \}/);
    vm.runInContext(fnMatch[0], sandbox);
    
    const db = sandbox.getSyllabusDB();
    assert.ok(db['國文']['其他']['預設'], 'fallback 應有 國文/其他/預設');
});
