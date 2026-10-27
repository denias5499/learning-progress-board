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
    var subOf = {};
    Object.keys(master).forEach(sub => {
        var units = window._collectSubjectUnits(master[sub]);
        units.forEach(u => subOf[u.id] = sub);
    });
    
    console.log('Total subOf:', Object.keys(subOf).length);
    
    var m1 = window.appMissions['會考複習']['一模'];
    var dist = {};
    m1.forEach(uid => {
        var s = subOf[uid];
        if (s) dist[s] = (dist[s] || 0) + 1;
        else dist['?'] = (dist['?'] || 0) + 1;
    });
    console.log('Mission 一模 distribution:');
    Object.keys(dist).forEach(s => console.log('  ' + s + ': ' + dist[s]));
    console.log('  (total = ' + Object.values(dist).reduce((a,b)=>a+b,0) + ')');
    
    // 8 個科目 distribution? - first 8?
    var m2 = window.appMissions['會考複習']['二模'];
    var dist2 = {};
    m2.forEach(uid => {
        var s = subOf[uid];
        if (s) dist2[s] = (dist2[s] || 0) + 1;
        else dist2['?'] = (dist2['?'] || 0) + 1;
    });
    console.log('\nMission 二模 distribution:');
    Object.keys(dist2).forEach(s => console.log('  ' + s + ': ' + dist2[s]));
    
    process.exit(0);
}, 2500);
