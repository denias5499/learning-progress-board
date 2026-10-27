const { JSDOM } = require('jsdom');

// ── jsdom rAF 迴圈會讓 node --test 的 event loop 永不結束 → 收集後統一 close ──
const _allDoms = [];
const { JSDOM: _JSDOM } = require('jsdom');
function _mkDom(...args) { const d = new _JSDOM(...args); _allDoms.push(d); return d; }
require('node:test').after(() => { _allDoms.forEach(d => { try { d.window.close(); } catch (e) {} }); });

const path = require('path');
const fs = require('fs');;

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');

const dom = _mkDom(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    url: 'http://localhost:8000/'
});

const window = dom.window;

setTimeout(() => {
    var master = window.multiData['user_A'].masters['會考複習'];
    var chineseMaster = master['國文'];
    console.log('國文 master:', JSON.stringify(chineseMaster, null, 2).substring(0, 800));
    
    // _collectSubjectUnits
    console.log('\n_collectSubjectUnits(國文 master):');
    var result = window._collectSubjectUnits(chineseMaster);
    console.log('  result length:', result ? result.length : 'NULL');
    if (result) {
        result.forEach((u, i) => console.log('  [' + i + ']', JSON.stringify(u).substring(0, 150)));
    }
    
    process.exit(0);
}, 2500);
