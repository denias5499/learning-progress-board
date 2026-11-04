const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const IDX = fs.readFileSync('index.html', 'utf8');

test('v1.6.123: 拿掉 iframe sandbox', () => {
    assert.ok(!/<iframe[^>]*wrongnotes-iframe[^>]*sandbox=/.test(IDX),
        'iframe 不應有 sandbox 屬性');
});




