const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const errors = [];
    page.on('pageerror', e => errors.push('ERROR: ' + e.message));
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push('CONSOLE ERROR: ' + msg.text());
    });

    const filePath = 'file:///mnt/my_book/Denias/projects/learning-progress-board/index.html';
    await page.goto(filePath, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // Check _treeScheduledUnits and appMaster structure
    const info = await page.evaluate(() => {
        // Check _treeScheduledUnits keys
        const keys = Object.keys(window._treeScheduledUnits || {});
        
        // Check appMaster structure - is it the old flat format or new cat/subject format?
        const appMasterType = typeof window.appMaster;
        const appMasterKeys = window.appMaster ? Object.keys(window.appMaster) : [];
        const hasCatLevel = appMasterKeys.some(k => typeof window.appMaster[k] === 'object' && window.appMaster[k] !== null && !Array.isArray(window.appMaster[k]) && !window.appMaster[k].volOrder);
        const firstKey = appMasterKeys[0];
        const firstVal = firstKey ? window.appMaster[firstKey] : null;
        
        // Check multiData masters
        const md = window.multiData?.[window.currentUserId]?.masters || {};
        const mdCats = Object.keys(md);
        
        // Check nameToIdMap
        const n2i = window._nameToIdMap || {};
        const relevantN2I = {};
        Object.keys(n2i).forEach(k => {
            if (k.includes('因式分解') || k.includes('圖形') || k.includes('一元一次')) {
                relevantN2I[k] = n2i[k];
            }
        });

        return {
            _treeScheduledUnitsCount: keys.length,
            appMasterType,
            appMasterKeys: appMasterKeys.slice(0, 5),
            hasCatLevel,
            firstMasterKey: firstKey,
            firstMasterValType: firstVal ? typeof firstVal : null,
            firstMasterValKeys: firstVal ? Object.keys(firstVal).slice(0, 5) : [],
            multiDataCats: mdCats,
            nameToIdMapSample: relevantN2I,
            // Get some sample unitIds from tree view
            treeUnitsSample: Array.from(document.querySelectorAll('li.tree-unit')).slice(0, 3).map(li => ({
                text: li.textContent.trim().substring(0, 50),
                onclick: li.getAttribute('onclick'),
                title: li.getAttribute('title')
            }))
        };
    });

    console.log('=== INFO ===');
    console.log(JSON.stringify(info, null, 2));

    // Try to click a li.tree-unit and see what happens
    const liCount = await page.locator('li.tree-unit').count();
    console.log('\nTotal li.tree-unit count:', liCount);

    if (liCount > 0) {
        // Click the FIRST li.tree-unit
        const firstLi = page.locator('li.tree-unit').first();
        const liText = await firstLi.textContent();
        const liTitle = await firstLi.getAttribute('title');
        const liOnclick = await firstLi.getAttribute('onclick');
        
        console.log('\nFirst li.tree-unit:');
        console.log('  text:', liText.trim().substring(0, 60));
        console.log('  title:', liTitle);
        console.log('  onclick:', liOnclick ? liOnclick.substring(0, 80) : 'NULL');
        
        // Try clicking it
        await firstLi.click();
        await page.waitForTimeout(1000);
        
        // Check if any alert was called (we can't see it in headless but can check for errors)
        console.log('\nAfter click errors:', errors);
        
        // Check if calendar view is shown
        const calendarVisible = await page.locator('#calendar-root, .calendar-view, [id*="calendar"]').count();
        console.log('Calendar elements visible:', calendarVisible);
    }

    // Now check if jumpToUnitCalendar is a global function
    const hasJumpFn = await page.evaluate(() => typeof window.jumpToUnitCalendar === 'function');
    console.log('\njumpToUnitCalendar is function:', hasJumpFn);
    
    // Check if _treeScheduledUnits has the unitId from the first li
    if (liCount > 0) {
        const firstOnclick = await page.locator('li.tree-unit').first().getAttribute('onclick');
        if (firstOnclick) {
            // Extract unitId from onclick - it's the first parameter
            const match = firstOnclick.match(/jumpToUnitCalendar\('([^']+)'/);
            if (match) {
                const unitId = match[1];
                console.log('\nExtracted unitId from onclick:', unitId);
                const inTreeScheduled = await page.evaluate(id => {
                    const ts = window._treeScheduledUnits || {};
                    return { exists: !!ts[id], info: ts[id] };
                }, unitId);
                console.log('In _treeScheduledUnits:', JSON.stringify(inTreeScheduled));
            }
        }
    }

    if (errors.length > 0) {
        console.log('\n=== ERRORS ===');
        errors.forEach(e => console.log(e));
    }

    await browser.close();
})();
