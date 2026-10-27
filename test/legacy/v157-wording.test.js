'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

test('v157-1: title [v1.6.157]', () => assert.ok(/\[v1\.6\.157\]/.test(HTML)));
test('v157-2: 警告說明更白話', () => {
    assert.ok(HTML.indexOf('切成') >= 0 && HTML.indexOf('硬塞進前') >= 0);
});
