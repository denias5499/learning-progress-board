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
