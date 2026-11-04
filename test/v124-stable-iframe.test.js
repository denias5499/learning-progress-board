const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');



test('v1.6.124: 不用 fetch/blob URL', () => {
    var openFn = IDX.match(/function openWrongNotes\(\)\s*\{([\s\S]*?)\n        \}/);
    if (openFn) {
        assert.ok(!openFn[1].includes("fetch('wrong-notes/index.html')"),
            'openWrongNotes 不應用 fetch');
        assert.ok(!openFn[1].includes('URL.createObjectURL'),
            'openWrongNotes 不應用 createObjectURL');
    }
});


