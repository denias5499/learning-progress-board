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
    console.log('Real data after jsdom auto-migration:');
    console.log('  appMissions keys:', Object.keys(window.appMissions));
    if (window.appMissions['會考複習']) {
        console.log('  appMissions[\'會考複習\'] mis keys:', Object.keys(window.appMissions['會考複習']));
        Object.keys(window.appMissions['會考複習']).forEach(mis => {
            console.log('    mis \'' + mis + '\' has', window.appMissions['會考複習'][mis].length, 'units');
        });
    }
    console.log('  multiData keys:', Object.keys(window.multiData));
    var uid = Object.keys(window.multiData)[0];
    if (uid) {
        console.log('  user[\'' + uid + '\'].masters[\'會考複習\'] keys:', Object.keys(window.multiData[uid].masters['會考複習']));
    }
    
    // Build tree with REAL mission key
    var realMis = Object.keys(window.appMissions['會考複習'])[0];
    console.log('\n--- Build with REAL mis =', realMis, '---');
    var t = window.buildMissionTree('會考複習', realMis);
    console.log('  tree keys:', Object.keys(t));
    if (t['國文']) {
        console.log('  國文 available:', t['國文'].items && Object.keys(t['國文'].items).length);
    }
    
    process.exit(0);
}, 2500);
