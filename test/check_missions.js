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
    
    var subOf = {};
    Object.keys(master).forEach(sub => {
        var m = master[sub];
        if (m && m.materials) {
            Object.keys(m.materials).forEach(t => {
                var typeObj = m.materials[t];
                if (typeObj && typeObj.instances) {
                    typeObj.instances.forEach(ins => {
                        if (ins && ins.vols) {
                            Object.keys(ins.vols).forEach(v => {
                                (ins.vols[v] || []).forEach(u => {
                                    subOf[u.id] = sub;
                                });
                            });
                        }
                    });
                }
            });
        }
    });
    
    console.log('--- Mission 一模 分布 ---');
    var m1 = window.appMissions['會考複習']['一模'];
    var m1subs = {};
    m1.forEach(uid => {
        var s = subOf[uid] || '?';
        m1subs[s] = (m1subs[s] || 0) + 1;
    });
    Object.keys(m1subs).forEach(s => console.log('  ' + s + ': ' + m1subs[s]));
    
    console.log('--- Mission 二模 分布 ---');
    var m2 = window.appMissions['會考複習']['二模'];
    var m2subs = {};
    m2.forEach(uid => {
        var s = subOf[uid] || '?';
        m2subs[s] = (m2subs[s] || 0) + 1;
    });
    Object.keys(m2subs).forEach(s => console.log('  ' + s + ': ' + m2subs[s]));
    
    process.exit(0);
}, 2500);
