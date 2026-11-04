const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');



test('v1.6.121: 附件 getSyllabusDB 自己讀 family data', () => {
    assert.ok(WN.includes("localStorage.getItem('StudyMap_Family_Data_V20')"),
        '附件應讀 StudyMap_Family_Data_V20');
    assert.ok(WN.includes('flat[subj][typeName][instName]'),
        '附件應攤平 cat > subject > instanceId');
});


