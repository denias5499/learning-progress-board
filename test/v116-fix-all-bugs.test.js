// v1.6.116: Bug fixes from v1.6.115 review
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');
const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

test('v1.6.116 Bug 3: 附件有 getSyllabusDB() lazy 函式', () => {
    assert.ok(/function\s+getSyllabusDB\s*\(/.test(WN), '應有 getSyllabusDB 函式');
    assert.ok(WN.includes('window.WN_masterData'), '應讀取 window.WN_masterData');
    assert.ok(/const\s+DEFAULT_SYLLABUS_DB/.test(WN), '應有 DEFAULT_SYLLABUS_DB');
});

test('v1.6.116 Bug 3: 附件所有讀 syllabusDB 的地方改用 getSyllabusDB()', () => {
    // 找 const data = syllabusDB[subject] → 應該都被換成 getSyllabusDB()[subject]
    const matches = WN.match(/const\s+data\s*=\s*syllabusDB\[/g);
    assert.ok(!matches || matches.length === 0,
        '不應有 const data = syllabusDB[subject] (應改用 getSyllabusDB())');
});

test('v1.6.116 Bug 4: generateNote 內無 ${vol} ReferenceError', () => {
    assert.ok(!WN.includes('${subj} ${vol} ${unit}'),
        '不應有 ${subj} ${vol} ${unit} (vol 變數已不存在)');
});




