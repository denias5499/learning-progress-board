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

setTimeout(() => {
    var master = window.multiData['user_A'].masters['會考複習'];
    
    // Get all subOf using full _collectSubjectUnits
    var subOf = {};
    Object.keys(master).forEach(sub => {
        var units = window._collectSubjectUnits(master[sub]);
        units.forEach(u => subOf[u.id] = sub);
    });
    
    console.log('Total subOf entries:', Object.keys(subOf).length);
    console.log('Distribution:');
    var counts = {};
    Object.values(subOf).forEach(s => counts[s] = (counts[s] || 0) + 1);
    Object.keys(counts).forEach(s => console.log('  ' + s + ': ' + counts[s]));
    
    // Check 一模 unitIds in subOf
    var m1 = window.appMissions['會考複習']['一模'];
    var m1In = m1.filter(uid => subOf[uid]);
    var m1Not = m1.filter(uid => !subOf[uid]);
    console.log('\n一模: total=' + m1.length + ', in subOf=' + m1In.length + ', NOT in subOf=' + m1Not.length);
    if (m1Not.length > 0) {
        console.log('  m1Not sample (first 5):', m1Not.slice(0, 5));
    }
    
    process.exit(0);
}, 2500);
