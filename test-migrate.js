const { chromium } = require('/mnt/my_book/Denias/projects/learning-progress-board/node_modules/playwright');
const SEED = require('fs').readFileSync('/tmp/real-seed.json', 'utf-8');

(async () => {
    const url = 'https://denias5499.github.io/learning-progress-board/?v=' + Date.now();
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    
    page.on('console', m => {
        const t = m.text();
        if (t.includes('migrat') || t.includes('upgrade') || t.includes('store') || t.includes('vol')) {
            console.log('[BROWSER]', t.substring(0, 200));
        }
    });
    
    await page.addInitScript(seed => {
        localStorage.setItem('StudyMap_Family_Data_V20', seed);
    }, SEED);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(10000);
    
    const dbState = await page.evaluate(async () => {
        const db = await window.diskDB.getInstance();
        const all = {};
        const stores = ['users','projects','subjects','materialTypes','instances','vols','units','plans','tasks','planTasks','accuracyRecords','meta'];
        for (const s of stores) {
            try {
                const items = await db.getAll(s);
                if (items && items.length > 0) all[s] = items;
            } catch (e) {}
        }
        return all;
    });
    
    console.log('\n========== IndexedDB 結果 ==========');
    for (const [k, v] of Object.entries(dbState)) {
        console.log(k + ': ' + v.length + ' 筆');
        if (v.length > 0 && v.length <= 10) {
            console.log('  →', JSON.stringify(v, null, 2).substring(0, 800));
        }
    }
    
    await browser.close();
})();
