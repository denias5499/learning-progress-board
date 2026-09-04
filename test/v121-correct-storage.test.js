const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v1.6.121 Bug fix: WN_buildMasterData 用 StudyMap_Family_Data_V20', () => {
    assert.ok(IDX.includes("localStorage.getItem('StudyMap_Family_Data_V20')"),
        '應讀 StudyMap_Family_Data_V20');
    // 排除註解內的提及
    var nonCommentCode = IDX.split('\n').filter(function(l) {
        return !l.trim().startsWith('//') && !l.trim().startsWith('*');
    }).join('\n');
    assert.ok(!nonCommentCode.includes("localStorage.getItem('StudyMap_UserData')"),
        '不應在程式碼內讀 StudyMap_UserData (錯的 key, 註解除外)');
    assert.ok(IDX.includes('multiData[uid]'),
        '應讀 multiData[uid]');
    assert.ok(IDX.includes('StudyMap_CurrentUserId_V20'),
        '應讀 currentUserId');
});

test('v1.6.121: 附件 getSyllabusDB 自己讀 family data', () => {
    assert.ok(WN.includes("localStorage.getItem('StudyMap_Family_Data_V20')"),
        '附件應讀 StudyMap_Family_Data_V20');
    assert.ok(WN.includes('flat[subj][typeName][instName]'),
        '附件應攤平 cat > subject > instanceId');
});

test('v1.6.121: title [v1.6.121]', () => {
    assert.ok(/<title>.*\[v1\.6\.121\]<\/title>/.test(IDX));
});
