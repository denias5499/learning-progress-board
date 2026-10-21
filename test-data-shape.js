/**
 * 模擬 Denias 真實讀書計畫,驗證 v2.2.0 disk DB 是否完整保留 vol + unit name
 */
const { chromium } = require('/mnt/my_book/Denias/projects/learning-progress-board/node_modules/playwright');

const REAL_SEED = JSON.stringify({
    config: {
        name: 'config',
        masters: {
            '會考複習': {
                '國文': {
                    materials: {
                        '複習講義': {
                            instances: [{
                                name: '麻辣甲',
                                vols: {
                                    '第三冊': [
                                        { id: 'id_a1', name: 'L1~L2', vol: '第三冊' },
                                        { id: 'id_a2', name: 'L3~L4', vol: '第三冊' }
                                    ]
                                }}]}},
                        '數學': {
                            materials: {
                                '講義': {
                                    instances: [{
                                        name: '勝經',
                                        vols: { '上冊': [{ id: 'id_b1', name: 'CH1', vol: '上冊' }] }
                                    }]
                            }}
                    }}
                },
                plans: [{
                        name: '暑假',
                        grid: {
                            '2026-07-15': [{
                                id: 't1', typeName: '複習講義', instanceName: '麻辣甲',
                                vol: '第三冊', unitId: 'id_a1', unitName: 'L1~L2',
                                subject: '國文', isDone: false
                            }]
                    }}]
        }}
});

(async () => {
    const url = 'https://denias5499.github.io/learning-progress-board/?v=' + Date.now();
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    
    await page.addInitScript(seed => {
        localStorage.setItem('StudyMap_Family_Data_V20', seed);
    }, REAL_SEED);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);
    
    // 1. IndexedDB 內容
    const dbState = await page.evaluate(async () => {
        const db = await window.diskDB.getInstance();
        const all = {};
        const stores = ['users', 'categories', 'projects', 'subjects', 'materialTypes', 'instances', 'vols', 'units', 'plans', 'planTasks', 'accuracyRecords'];
        for (const s of stores) {
            try {
                const items = await db.getAll(s);
                if (items && items.length > 0) all[s] = items;
            } catch (e) { all[s] = `error: ${e.message}`; }
        }
        return all;
    });
    
    console.log('========== IndexedDB 內容 ==========');
    console.log('users:', dbState.users?.length || 0);
    console.log('subjects:', dbState.subjects?.length || 0);
    console.log('materialTypes:', dbState.materialTypes?.length || 0);
    console.log('instances:', dbState.instances?.length || 0);
    console.log('vols:', dbState.vols?.length || 0);
    console.log('  →', JSON.stringify(dbState.vols, null, 2));
    console.log('units:', dbState.units?.length || 0);
    console.log('  →', JSON.stringify(dbState.units, null, 2));
    console.log('plans:', dbState.plans?.length || 0);
    console.log('planTasks:', dbState.planTasks?.length || 0);
    console.log('  →', JSON.stringify(dbState.planTasks, null, 2));
    
    // 2. 抓 disk 寫出的內容
    const diskFiles = await page.evaluate(async () => {
        return new Promise(async (resolve) => {
            const files = [];
            const origCreate = document.createElement.bind(document);
            document.createElement = function(tag) {
                const el = origCreate(tag);
                if (tag === 'a') {
                    const origClick = el.click;
                    el.click = async function() {
                        if (el.download && el.href.startsWith('blob:')) {
                            try {
                                const r = await fetch(el.href);
                                const text = await r.text();
                                files.push({ name: el.download, content: text.substring(0, 1500) });
                            } catch (e) {}
                        }
                        return origClick.call(el);
                    };
                }
                return el;
            };
            
            const result = await window.diskDB.syncAllToDisk();
            await new Promise(r => setTimeout(r, 800));
            resolve({ result, files });
        });
    });
    
    console.log('\n========== Disk 寫出的檔案 ==========');
    console.log('syncAllToDisk:', JSON.stringify({written: diskFiles.result.written, mode: diskFiles.result.mode}));
    console.log('實際抓到檔案:', diskFiles.files.length);
    diskFiles.files.forEach(f => {
        console.log('\n--- ' + f.name + ' ---');
        console.log(f.content);
    });
    
    await browser.close();
})();
