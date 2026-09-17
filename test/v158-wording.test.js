'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v158-1: title [v1.6.158]', () => assert.ok(/\[v1\.6\.158\]/.test(HTML)));
test('v158-2: 警告說明用 N < X 條件', () => {
    assert.ok(HTML.indexOf('N &lt; X') >= 0);
});
