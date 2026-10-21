const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');
const dom = new JSDOM(html);
const { document } = dom.window;
const matched = [];
for (const sheet of document.styleSheets) {
    try {
        for (const rule of sheet.cssRules || []) {
            if (rule.selectorText && rule.selectorText.includes('hover-tooltip')) {
                matched.push(rule.cssText.slice(0, 150));
            }
        }
    } catch (e) {}
}
console.log('Total CSS rules with hover-tooltip:', matched.length);
matched.slice(0, 5).forEach(m => console.log('  ', m));
