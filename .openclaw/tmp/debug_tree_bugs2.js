const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const indexPath = '/mnt/my_book/Denias/projects/learning-progress-board/index.html';
    const filePath = 'file://' + indexPath;
    console.log('Opening:', filePath);
    await page.goto(filePath);
    await page.waitForTimeout(3000);

    console.log('=== BUG DIAGNOSIS ===\n');

    const result = await page.evaluate(() => {
        const keys = Object.keys(window._treeScheduledUnits || {});
        console.log('[DEBUG] Total keys in _treeScheduledUnits:', keys.length);
        
        // Find keys containing 因式分解 or 圖形
        const yinsiKeys = keys.filter(k => k.includes('因式分解') || k.includes('一元一次不等式'));
        const tuxingKeys = keys.filter(k => k.includes('圖形') && !k.includes('直角坐標'));
        
        console.log('[DEBUG] _treeScheduledUnits keys with 因式分解:', yinsiKeys);
        console.log('[DEBUG] _treeScheduledUnits keys with 圖形:', tuxingKeys);
        
        yinsiKeys.forEach(k => {
            console.log('[DEBUG] 因式分解 key:', k, '=>', JSON.stringify(window._treeScheduledUnits[k]));
        });
        tuxingKeys.forEach(k => {
            console.log('[DEBUG] 圖形 key:', k, '=>', JSON.stringify(window._treeScheduledUnits[k]));
        });

        // Check plan tasks
        const planTasks = [];
        if (window.appPlans) {
            window.appPlans.forEach(p => {
                if (p.grid) {
                    Object.keys(p.grid).forEach(d => {
                        p.grid[d].forEach(t => {
                            if (t.unitId && (t.unitId.includes('因式分解') || t.unitId.includes('一元一次不等式') || t.unitId.includes('圖形'))) {
                                planTasks.push({ plan: p.name, date: d, unitId: t.unitId, isDone: t.isDone });
                            }
                        });
                    });
                }
            });
        }
        console.log('[DEBUG] Plan tasks for 因式分解/圖形:', JSON.stringify(planTasks, null, 2));

        // Check nameToId map
        console.log('[DEBUG] _nameToIdMap exists:', !!window._nameToIdMap);
        if (window._nameToIdMap) {
            Object.keys(window._nameToIdMap).forEach(k => {
                if (k.includes('因式分解') || k.includes('圖形')) {
                    console.log('[DEBUG] nameToId:', k, '=>', window._nameToIdMap[k]);
                }
            });
        }

        // Check li.tree-unit
        const liUnits = document.querySelectorAll('li.tree-unit');
        console.log('[DEBUG] Total li.tree-unit count:', liUnits.length);
        
        let yinsiLi = null, tuxingLi = null;
        liUnits.forEach(li => {
            const text = li.textContent || '';
            if (text.includes('因式分解') || text.includes('一元一次不等式')) {
                yinsiLi = { onclick: li.getAttribute('onclick'), text: text.substring(0, 80) };
            }
            if (text.includes('圖形') && !text.includes('直角坐標')) {
                tuxingLi = { onclick: li.getAttribute('onclick'), text: text.substring(0, 80) };
            }
        });
        console.log('[DEBUG] 因式分解 li onclick:', yinsiLi ? yinsiLi.onclick.substring(0, 100) : 'NOT FOUND');
        console.log('[DEBUG] 圖形 li onclick:', tuxingLi ? tuxingLi.onclick.substring(0, 100) : 'NOT FOUND');

        // Check what getUnitScheduledDays returns for these units
        const allIds = Object.keys(window._treeScheduledUnits || {});
        const possibleYinsi = allIds.filter(k => k.includes('因式分解') || k.includes('一元一次不等式'));
        const possibleTuxing = allIds.filter(k => k.includes('圖形') && !k.includes('直角坐標'));
        
        if (possibleYinsi.length > 0 && typeof window.getUnitScheduledDays === 'function') {
            const days = window.getUnitScheduledDays(possibleYinsi[0]);
            console.log('[DEBUG] getUnitScheduledDays("' + possibleYinsi[0] + '"):', days);
        }

        return { yinsiLi, tuxingLi, planTasks, yinsiKeys, tuxingKeys };
    });

    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));

    await browser.close();
})();
