const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('/mnt/my_book/Denias/projects/learning-progress-board/index.html', 'utf-8');

const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    url: 'http://localhost:8000/'
});

const window = dom.window;
window.alert = (m) => console.log('ALERT:', String(m).substring(0, 100));

setTimeout(() => {
    const doc = window.document;
    
    const units = [];
    for (let i = 1; i <= 12; i++) {
        units.push({ id: '國文-u' + i, name: 'Unit ' + i, start: (i-1)*10 + 1, end: i*10 });
    }
    
    // CRITICAL: 看是不是 migration 把 user.masters 刪掉
    console.log('Before any setup:');
    console.log('  multiData:', window.multiData ? 'EXISTS' : 'NULL');
    if (window.multiData) {
        console.log('  multiData keys:', Object.keys(window.multiData));
        var uid = Object.keys(window.multiData)[0];
        if (uid) {
            console.log('  user.masters keys:', Object.keys(window.multiData[uid].masters || {}));
            Object.keys(window.multiData[uid].masters || {}).forEach(cat => {
                console.log('  masters[\'' + cat + '\'] keys:', Object.keys(window.multiData[uid].masters[cat] || {}));
            });
        }
    }
    
    // Override
    window.multiData = {
        'u1': { masters: { '會考複習': { '國文': { materials: { '講義': { instances: [{ name: '第一冊', vols: { 'vol1': units } }] } } } } } }
    };
    window.currentUserId = 'u1';
    
    console.log('\nAfter override:');
    console.log('  user.masters[\'會考複習\'] keys:', Object.keys(window.multiData['u1'].masters['會考複習'] || {}));
    
    // Try buildMissionTree
    var t = window.buildMissionTree('會考複習', '二模');
    console.log('  buildMissionTree keys:', Object.keys(t));
    
    process.exit(0);
}, 2500);
