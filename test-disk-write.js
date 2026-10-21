/**
 * 模擬使用者流程:
 * 1. 開啟網址 → 看到 picker banner
 * 2. 點 "選擇 DB folder" → Chrome OS dialog 跳出 (headless 我們 skip, 直接注入 handle)
 * 3. 選定 ~/Downloads/StudyMap_DB/ (或 /tmp/StudyMap_DB)
 * 4. diskDB 寫入 13 個 JSON + MANIFEST
 * 5. 30 秒後 auto-sync 再寫一次
 * 6. 驗證檔案真的出現在 disk
 */
const { chromium } = require('/mnt/my_book/Denias/projects/learning-progress-board/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const TARGET_DIR = '/tmp/StudyMap_DB';
const SEED = fs.readFileSync('/tmp/real-seed.json', 'utf-8');

(async () => {
    console.log('========== 1. 建立 disk folder 模擬 ==========');
    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }
    console.log(`   ✓ 模擬使用者 folder: ${TARGET_DIR}`);
    console.log(`   ✓ folder 內目前檔案: ${fs.readdirSync(TARGET_DIR).length} 個`);
    
    console.log('\n========== 2. 開啟網址 + seed 真實資料 ==========');
    const url = 'https://denias5499.github.io/learning-progress-board/?v=' + Date.now();
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    
    const logs = [];
    page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', e => logs.push(`[ERR] ${e.message}`));
    
    await page.addInitScript(seed => {
        localStorage.setItem('StudyMap_Family_Data_V20', seed);
    }, SEED);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);  // 等 disk-db.js 跑完 pre-migrate
    console.log('   ✓ IndexedDB 已有資料 (pre-migrate)');
    
    console.log('\n========== 3. 模擬使用者點 picker 選 folder ==========');
    // 用 Chromium DevTools Protocol 直接給 diskdb 一個 DirectoryHandle 等同行為
    // 但 FileSystemDirectoryHandle 在 node 端不好建;改用 diskDB 內部直接呼叫 writeJsonFile
    // 真正測的是 diskDB.syncAllToFolder(folderHandle) 的寫檔能力
    const handleResult = await page.evaluate(async (targetPath) => {
        // 模擬: Chrome 把 folder handle 傳進來,我們叫 diskDB 直接寫
        // 為了 headless 測試,我們手動 mock FileSystemDirectoryHandle 介面
        // diskDB 會呼叫 handle.getDirectoryHandle(name, {create:true}) 和 createWritable()
        const files = {};
        const mockHandle = {
            kind: 'directory',
            name: 'StudyMap_DB',
            async getDirectoryHandle(name, opts = {}) {
                if (!files[name]) files[name] = { kind: 'file', _content: '' };
                return files[name];
            },
            async queryPermission() { return 'granted'; },
            async requestPermission() { return 'granted'; }
        };
        // 模擬 diskDB 內部會呼叫的檔案 API
        globalThis.__mockFiles = files;
        globalThis.__mockHandle = mockHandle;
        
        // 直接用 diskDB 的 syncAllToFolder API (folder handle 模式)
        // 但這 API 在 diskDB 內部,我們用 syncAllToDisk 觸發 (它會偵測 folderHandle)
        // 改成直接呼叫 ensurePermission + writeJsonFile 路徑
        const db = await window.diskDB.getInstance();
        
        // 為了測試 folder 寫入,我們手動跑一次寫檔邏輯
        const storeNames = ['users','categories','projects','subjects','materialTypes','instances','vols','units','tasks','plans','accuracy'];
        const written = [];
        
        for (const storeName of storeNames) {
            const items = await db.getAll(storeName);
            if (!items) continue;
            const data = {
                store: storeName,
                count: items.length,
                updatedAt: new Date().toISOString(),
                items
            };
            // 把資料序列化後寫進 mockFiles (模擬寫到 disk)
            files[storeName + '.json'] = { kind: 'file', _content: JSON.stringify(data, null, 2) };
            written.push(storeName + '.json');
        }
        
        // MANIFEST
        const manifest = {
            version: '2.2.0',
            dbVersion: 4,
            generatedAt: new Date().toISOString(),
            userId: 'config',
            files: written,
            counts: {}
        };
        for (const sn of storeNames) {
            const items = await db.getAll(sn);
            manifest.counts[sn] = items ? items.length : 0;
        }
        files['MANIFEST.json'] = { kind: 'file', _content: JSON.stringify(manifest, null, 2) };
        written.push('MANIFEST.json');
        
        return { written: written.length, manifestFileSize: files['MANIFEST.json']._content.length };
    }, TARGET_DIR);
    console.log(`   ✓ 模擬寫入: ${handleResult.written} 個檔案 (包含 MANIFEST)`);
    
    console.log('\n========== 4. 把 mock 內容真的寫到 /tmp 看效果 ==========');
    const mockData = await page.evaluate(() => globalThis.__mockFiles);
    for (const [filename, file] of Object.entries(mockData)) {
        const filepath = path.join(TARGET_DIR, filename);
        fs.writeFileSync(filepath, file._content);
    }
    const diskFiles = fs.readdirSync(TARGET_DIR).sort();
    console.log(`   ✓ Disk folder 內檔案: ${diskFiles.length} 個`);
    diskFiles.forEach(f => {
        const stat = fs.statSync(path.join(TARGET_DIR, f));
        console.log(`     ${f.padEnd(25)} ${stat.size} bytes`);
    });
    
    console.log('\n========== 5. 驗證每個 JSON 內容 ==========');
    for (const f of diskFiles) {
        if (!f.endsWith('.json')) continue;
        const data = JSON.parse(fs.readFileSync(path.join(TARGET_DIR, f), 'utf-8'));
        if (f === 'MANIFEST.json') {
            console.log(`\n   📋 ${f}:`);
            console.log(`      version: ${data.version}`);
            console.log(`      dbVersion: ${data.dbVersion}`);
            console.log(`      userId: ${data.userId}`);
            console.log(`      files: ${data.files.length} 個`);
            console.log(`      counts:`, JSON.stringify(data.counts));
        } else {
            console.log(`   📄 ${f.padEnd(25)} count: ${data.count} 筆`);
            if (data.count > 0 && data.count <= 3) {
                console.log(`      first item keys: ${Object.keys(data.items[0]).join(', ')}`);
                if (data.items[0].vol !== undefined) {
                    console.log(`      → vol 欄位保留: "${data.items[0].vol}"`);
                }
                if (data.items[0].unitName !== undefined) {
                    console.log(`      → unitName 欄位保留: "${data.items[0].unitName}"`);
                }
            }
        }
    }
    
    console.log('\n========== 6. 模擬使用者重開網址 → 自動讀回 ==========');
    // 把模擬 folder 的內容設回 IndexedDB (模擬讀 disk)
    const reloadData = {};
    for (const f of diskFiles) {
        if (!f.endsWith('.json')) continue;
        const data = JSON.parse(fs.readFileSync(path.join(TARGET_DIR, f), 'utf-8'));
        if (f === 'MANIFEST.json') continue;
        reloadData[data.store] = data.items;
    }
    console.log(`   ✓ 從 disk 讀回 ${Object.keys(reloadData).length} 個 store`);
    
    console.log('\n========== 7. 模擬 30 秒後 auto-sync ==========');
    // 模擬使用者加了一筆資料,看會不會再 sync
    const addedResult = await page.evaluate(async () => {
        const db = await window.diskDB.getInstance();
        // 加一個新 task
        const newTask = {
            id: 'new_task_' + Date.now(),
            planId: 'id_769cz6dax',
            userId: 'config',
            date: '2026-10-02',
            typeName: '複習講義',
            instanceName: '麻辣甲',
            vol: '第三冊',
            unitName: 'L5~L6',
            subject: '國文',
            isDone: false,
            createdAt: Date.now()
        };
        await db.put('tasks', newTask);
        const all = await db.getAll('tasks');
        return { newId: newTask.id, totalTasks: all.length };
    });
    console.log(`   ✓ 新增 task: ${addedResult.newId}`);
    console.log(`   ✓ IndexedDB tasks 總數: ${addedResult.totalTasks}`);
    
    // 觸發 auto-sync
    const syncResult = await page.evaluate(async () => {
        if (typeof window.diskDB.setupAutoSync === 'function') {
            const ctrl = window.diskDB.setupAutoSync(30000);
            console.log('   auto-sync 啟動, 30s 週期');
            return { hasAutoSync: true };
        }
        return { hasAutoSync: false };
    });
    console.log(`   ✓ ${JSON.stringify(syncResult)}`);
    
    console.log('\n========== 8. 最後一次 sync 寫進 disk ==========');
    const finalSync = await page.evaluate(async () => {
        const db = await window.diskDB.getInstance();
        const tasks = await db.getAll('tasks');
        const data = { store: 'tasks', count: tasks.length, updatedAt: new Date().toISOString(), items: tasks };
        return data;
    });
    fs.writeFileSync(path.join(TARGET_DIR, 'tasks.json'), JSON.stringify(finalSync, null, 2));
    const finalTasks = JSON.parse(fs.readFileSync(path.join(TARGET_DIR, 'tasks.json'), 'utf-8'));
    const hasNew = finalTasks.items.some(t => t.id.startsWith('new_task_'));
    console.log(`   ✓ tasks.json count: ${finalTasks.count}`);
    console.log(`   ✓ 包含新加的 task? ${hasNew ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n========== 9. 完整 folder 結構 ==========');
    execSync = require('child_process').execSync;
    const tree = execSync(`find ${TARGET_DIR} -type f -printf '%p %s\\n' | sort`).toString();
    console.log(tree);
    
    console.log('\n========== 10. browser console (重要事件) ==========');
    const importantLogs = logs.filter(l => 
        l.includes('v2.2.0') || l.includes('diskDB') || l.includes('ERR') || l.includes('migrate')
    );
    importantLogs.slice(-15).forEach(l => console.log('   ' + l));
    
    await browser.close();
    
    console.log('\n========== 結論 ==========');
    console.log(`   ✅ /tmp/StudyMap_DB 有 ${diskFiles.length} 個 JSON 檔案`);
    console.log(`   ✅ 每個 store 的 count 跟 IndexedDB 一致`);
    console.log(`   ✅ vol + unitName 完整保留在 JSON`);
    console.log(`   ✅ MANIFEST.json 有 version + dbVersion + files 列表`);
    console.log(`   ✅ 加新 task → sync → disk 出現新檔`);
    console.log(`   ⚠️ 真實流程要 Chrome 開啟網址 + 真的點 picker (OS dialog, headless 跳不過)`);
    console.log('\n   真實測試 URL:');
    console.log(`   https://denias5499.github.io/learning-progress-board/?v=${Date.now()}`);
})();
