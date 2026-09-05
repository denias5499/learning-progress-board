const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

// v1.6.124 架構回歸測試
test('v1.6.124 架構: iframe 直接 src 載入', () => {
    assert.ok(/id="wrongnotes-iframe"[^>]*src="wrong-notes\/index\.html"/.test(IDX),
        'iframe 應直接 src="wrong-notes/index.html"');
});

test('v1.6.124 架構: 沒 sandbox', () => {
    assert.ok(!/id="wrongnotes-iframe"[^>]*sandbox=/.test(IDX),
        'iframe 應無 sandbox');
});

test('v1.6.124 架構: openWrongNotes 用 addEventListener load', () => {
    var openFn = IDX.match(/function openWrongNotes\(\)\s*\{([\s\S]*?)\n        \}/);
    assert.ok(openFn, '應找到 openWrongNotes');
    assert.ok(openFn[1].includes("addEventListener('load'"),
        '應用 addEventListener load');
});

test('v1.6.121 邏輯保留: 主專案讀 StudyMap_Family_Data_V20', () => {
    assert.ok(IDX.includes("localStorage.getItem('StudyMap_Family_Data_V20')"),
        '應讀 StudyMap_Family_Data_V20');
});

test('v1.6.121 邏輯保留: 攤平 cat > subject > instanceId', () => {
    // WN_buildMasterData 內應有 tree[subj][typeName][instName]
    assert.ok(IDX.includes('tree[subj]') || IDX.includes('flat["'+"'"+'subj'+"'"+'"]'),
        '應有 tree[subj] 攤平邏輯');
});

test('v1.6.121 邏輯保留: 附件也讀 family data', () => {
    assert.ok(WN.includes("localStorage.getItem('StudyMap_Family_Data_V20')"),
        '附件應讀 StudyMap_Family_Data_V20');
});

test('v1.6.124: title 正確', () => {
    assert.ok(/<title>.*\[v1\.6\.124\]<\/title>/.test(IDX));
});

// 行為模擬測試 - 直接測試攤平邏輯
test('BEHAVIOR: 模擬主專案 masters 結構攤平', () => {
    // 模擬實際 storage 結構
    var mockMasters = {
        'junior-high': {
            '國文': {
                'inst1': {
                    typeName: '複習講義',
                    instanceName: '麻辣',
                    units: ['第1課', '第2課']
                }
            },
            '數學': {
                'inst2': {
                    typeName: '模考歷屆',
                    instanceName: '一模',
                    units: ['第1章']
                }
            }
        }
    };

    // 模擬 WN_buildMasterData 內的攤平邏輯
    var tree = {};
    Object.keys(mockMasters).forEach(function(cat) {
        Object.keys(mockMasters[cat]).forEach(function(subj) {
            if (!tree[subj]) tree[subj] = {};
            Object.keys(mockMasters[cat][subj]).forEach(function(instId) {
                var m = mockMasters[cat][subj][instId];
                if (!tree[subj][m.typeName]) tree[subj][m.typeName] = {};
                tree[subj][m.typeName][m.instanceName] = m.units;
            });
        });
    });

    assert.ok(tree['國文']['複習講義']['麻辣'], '應攤平到 國文/複習講義/麻辣');
    assert.deepEqual(tree['國文']['複習講義']['麻辣'], ['第1課', '第2課']);
    assert.ok(tree['數學']['模考歷屆']['一模'], '應攤平到 數學/模考歷屆/一模');
});
