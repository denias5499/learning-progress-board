#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Read file
const html = fs.readFileSync('index.html', 'utf8');

// The exact target line (from line 12530 of clean d4ce609)
const OLD_LINE = "                        var rowHtml = '<li class=\"tree-unit\" style=\"display:grid; grid-template-columns: 1fr 100px 110px 150px 90px; gap:24px; align-items:center; padding:4px 24px; cursor:pointer; border-bottom:1px dashed #e2e8f0;'>';";

// The onclick value for the JS source:
// onclick="jumpToUnitCalendar('' + u.id + '', '' + escapeHtml(cat4jump) + '', '' + escapeHtml(mis4jump) + '');"
// When inside a JS single-quoted string, ' is escaped as \'
const ONCLICK_ATTR = "onclick=\"jumpToUnitCalendar(\\'\\'' + u.id + \\'\\', \\'\\'' + escapeHtml(cat4jump) + \\'\\', \\'\\'' + escapeHtml(mis4jump) + \\'\\'');\" ";

const NEW_LINE = "                        var rowHtml = '<li class=\"tree-unit\" " + ONCLICK_ATTR + "style=\"display:grid; grid-template-columns: 1fr 100px 110px 150px 90px; gap:24px; align-items:center; padding:4px 24px; cursor:pointer; border-bottom:1px dashed #e2e8f0;'>';";

const idx = html.indexOf(OLD_LINE);
if (idx < 0) {
    console.log('OLD_LINE not found!');
    process.exit(1);
}

console.log('OLD_LINE found at char', idx);
const newHtml = html.substring(0, idx) + NEW_LINE + html.substring(idx + OLD_LINE.length);
fs.writeFileSync('index.html', newHtml);
console.log('Written! New size:', newHtml.length);

// Verify JS
const script = newHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
try {
    new Function(script);
    console.log('JS VALID!');
} catch(e) {
    console.log('JS ERROR:', e.message);
}
