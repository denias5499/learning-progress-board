// v1.6.109: iframe 搬到頂層 page-wrongnotes
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(process.cwd(), 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');





test('v1.6.109: title 為 [v1.6.109]', () => {
    assert.ok(/<title>[^<]*\[v2\.3\.2\.\d+\]<\/title>/.test(html), 'title 應含目前版本徽章');
});
