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
    const cat = '會考複習';
    const mis = '二模';
    var master = window.multiData['user_A'].masters[cat];
    
    // List all subjects + their unit counts
    console.log('科目總覽:');
    Object.keys(master).forEach(sub => {
        var count = 0;
        var m = master[sub];
        if (m && m.materials) {
            Object.keys(m.materials).forEach(t => {
                var typeObj = m.materials[t];
                if (typeObj && typeObj.instances) {
                    typeObj.instances.forEach(ins => {
                        if (ins && ins.vols) {
                            Object.keys(ins.vols).forEach(v => {
                                count += (ins.vols[v] || []).length;
                            });
                        }
                    });
                }
            });
        }
        console.log('  ' + sub + ': ' + count + ' units');
    });
    
    // Check mission 二模 unitIds
    var misUnitIds = window.appMissions[cat][mis];
    console.log('\nMission 二模 有 ' + misUnitIds.length + ' unitIds');
    
    // For each unitId, which subject does it belong to?
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
    
    var misSubCounts = {};
    misUnitIds.forEach(uid => {
        var s = subOf[uid] || 'UNKNOWN';
        misSubCounts[s] = (misSubCounts[s] || 0) + 1;
    });
    console.log('\nMission 二模 按科目分佈:');
    Object.keys(misSubCounts).forEach(s => console.log('  ' + s + ': ' + misSubCounts[s]));
    
    // 找回 task 對應的 unitId
    console.log('\n已排程任務單位分佈 (典型 plan):');
    
    process.exit(0);
}, 2500);
