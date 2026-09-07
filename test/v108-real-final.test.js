const test = require('node:test');
const fs = require('fs');
const path = require('path');

// 用 require 拿專案根目錄 (避免 __dirname 問題)
const PROJECT_ROOT = path.dirname(__dirname);
const WRONG_NOTES_PATH = path.join(PROJECT_ROOT, 'wrong-notes', 'index.html');

test('附件存在', () => {
    console.log('WRONG_NOTES_PATH:', WRONG_NOTES_PATH);
    assert.ok(fs.existsSync(WRONG_NOTES_PATH), '附件應存在');
});

test('附件有 crop 邏輯', () => {
    const c = fs.readFileSync(WRONG_NOTES_PATH, 'utf8');
    assert.ok(c.includes('addMockOCRBoxes'));
    assert.ok(c.includes('cropBoxes.push'));
});
