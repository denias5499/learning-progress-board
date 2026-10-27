#!/usr/bin/env node
/**
 * 真實瀏覽器 e2e — 錯題本備份 / 還原 (v2.3.2.146)
 *
 * 驗證: 錯題本資料 (myStudyNotes + IndexedDB 圖片) 有被備份、且能完整還原
 *
 * 流程:
 *   1. 造一份錯題本資料 (文字 + 圖片) 放進 localStorage / IndexedDB
 *   2. 呼叫 app 的匯出邏輯 → 得到備份檔內容
 *   3. 把 localStorage / IndexedDB 清空 (模擬資料遺失)
 *   4. 呼叫 app 的還原邏輯 → 資料要回來
 *   5. 比對 note 內容 + 圖片 id/內容
 */
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
let PORT = 0, CDP = 0;
const KEY = 'StudyMap_Family_Data_V20';
const CUR = 'StudyMap_CurrentUserId_V20';
const NOTES_KEY = 'myStudyNotes';
const IMG_DB = 'wrongNoteImgDB';

function findChrome() {
    if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
    const cands = [
        '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium', '/usr/bin/chromium-browser',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const c of cands) if (fs.existsSync(c)) return c;
    return null;
}
const CHROME = findChrome();
if (!CHROME) { console.error('❌ 找不到 Chrome'); process.exit(2); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((q, r) => {
    let p = q.url.split('?')[0];
    if (p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    r.end(fs.readFileSync(f));
});

let msgId = 0; const pending = new Map(); let ws;
function send(method, params = {}, sessionId) {
    const id = ++msgId;
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((res, rej) => pending.set(id, { res, rej }));
}
let pass = 0, fail = 0;
function ok(c, name, extra) {
    if (c) { pass++; console.log('  ✅ ' + name); }
    else { fail++; console.log('  ❌ ' + name + (extra ? '  → ' + extra : '')); }
}

// 測試資料: 2 筆錯題, 1 張圖片 (1x1 紅點 PNG)
const NOTES = [
    { date: '2026-10-01', timestamp: 111, subject: '數學', typeName: '複習講義',
      instanceName: '(原主教材)', unit: 'u_1', source: '考卷', reasons: ['粗心'],
      imageId: 'wnimg_test_1', content: '<p>題目一</p>' },
    { date: '2026-10-02', timestamp: 222, subject: '英文', typeName: '複習卷',
      instanceName: '(原主教材)', unit: 'u_2', source: '講義', reasons: [],
      imageId: '', content: '<p>題目二</p>' },
];
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

(async () => {
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    PORT = server.address().port;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lpb-wn-'));

    const chrome = spawn(CHROME, [
        '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
        '--remote-debugging-port=0', `--user-data-dir=${profile}`,
        '--remote-allow-origins=*', 'about:blank',
    ], { stdio: 'ignore' });

    let ver = null;
    for (let i = 0; i < 120; i++) {
        const pf = path.join(profile, 'DevToolsActivePort');
        if (fs.existsSync(pf)) {
            const port = parseInt(fs.readFileSync(pf, 'utf8').split('\n')[0].trim(), 10);
            if (port > 0) {
                CDP = port;
                try { ver = await (await fetch(`http://127.0.0.1:${CDP}/json/version`)).json(); break; }
                catch (e) {}
            }
        }
        await new Promise(r => setTimeout(r, 250));
    }
    if (!ver) { console.error('❌ Chrome 啟動失敗'); process.exit(1); }

    ws = new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));
    const logs = [];
    ws.addEventListener('message', ev => {
        const m = JSON.parse(ev.data);
        if (m.id && pending.has(m.id)) {
            const p = pending.get(m.id); pending.delete(m.id);
            m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
        }
        if (m.method === 'Runtime.consoleAPICalled') {
            const t = (m.params.args || []).map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(' ');
            logs.push(m.params.type + '| ' + t);
        }
        if (m.method === 'Runtime.exceptionThrown') {
            const d = m.params.exceptionDetails;
            logs.push('EXCEPTION| ' + (d.exception?.description || d.text));
        }
    });

    const r = await send('Target.createTarget', { url: 'about:blank' });
    const tid = r.targetId;
    const a = await send('Target.attachToTarget', { targetId: tid, flatten: true });
    const sid = a.sessionId;
    await send('Page.enable', {}, sid);
    await send('Runtime.enable', {}, sid);

    const ev = async expr => {
        const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid);
        if (rr.exceptionDetails) return { __err: rr.exceptionDetails.exception?.description || rr.exceptionDetails.text };
        return rr.result.value;
    };

    // 等頁面 init 完成 (健康狀態列出現)
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html?e2e=${Date.now()}` }, sid);
    for (let i = 0; i < 80; i++) {
        await new Promise(r => setTimeout(r, 250));
        const ready = await ev("(function(){var t=document.getElementById('master-health-text');return !!(t&&(t.textContent||'').indexOf('檢查中')===-1);})()");
        if (ready) break;
    }

    console.log('\n▶ 步驟 1: 注入錯題本資料 (2 筆 note + 1 張圖片)');
    const seeded = await ev(`(async function(){
        try {
            localStorage.setItem(${JSON.stringify(NOTES_KEY)}, JSON.stringify(${JSON.stringify(NOTES)}));
            var db = await new Promise(function(res,rej){
                var q = indexedDB.open(${JSON.stringify(IMG_DB)}, 1);
                q.onupgradeneeded = function(e){ var d=e.target.result;
                    if(!d.objectStoreNames.contains('images')){ var st=d.createObjectStore('images',{keyPath:'id'});
                        st.createIndex('createdAt','createdAt',{unique:false}); } };
                q.onsuccess = function(e){ res(e.target.result); }; q.onerror=function(){ rej(); };
            });
            var bin = atob(${JSON.stringify(PNG_B64)});
            var u8 = new Uint8Array(bin.length);
            for (var i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
            var blob = new Blob([u8], {type:'image/png'});
            await new Promise(function(res){
                var tx = db.transaction(['images'],'readwrite');
                tx.objectStore('images').put({id:'wnimg_test_1', data:blob, createdAt:'2026-10-01T00:00:00.000Z'});
                tx.oncomplete=function(){res();}; tx.onerror=function(){res();};
            });
            return { notes: (JSON.parse(localStorage.getItem(${JSON.stringify(NOTES_KEY)})||'[]')).length, img: 1 };
        } catch(e) { return { err: e.message }; }
    })()`);
    ok(seeded && seeded.notes === 2, '錯題本資料已注入 (2 筆 note)', JSON.stringify(seeded));

    console.log('\n▶ 步驟 2: 檢查 diagnoseBackupCoverage');
    const diag = await ev('(function(){ try { return window.diagnoseBackupCoverage(); } catch(e){ return {err:e.message}; } })()');
    ok(diag && diag.wrongNotes && diag.wrongNotes.noteCount === 2, '診斷: 2 筆錯題', JSON.stringify(diag && diag.wrongNotes));
    ok(diag && Array.isArray(diag.NOTCoveredByBackup) && diag.NOTCoveredByBackup.indexOf(NOTES_KEY) >= 0,
       '診斷: myStudyNotes 被標為「原本不備份」');

    console.log('\n▶ 步驟 3: 產生備份 (走 app 真正的匯出邏輯)');
    const snap = await ev(`(async function(){
        try {
            var s = { _meta: { app:'StudyMap', schema:'full-v2', exportedAt:new Date().toISOString() }, keys:{} };
            for (var i=0;i<localStorage.length;i++){
                var k = localStorage.key(i);
                if (k && k.indexOf('StudyMap_')===0){ var raw=localStorage.getItem(k);
                    try { s.keys[k]=JSON.parse(raw); } catch(e){ s.keys[k]=raw; } }
            }
            var notes = _v146ExportWrongNoteText();
            if (notes != null) s.keys[${JSON.stringify(NOTES_KEY)}] = notes;
            var imgs = await _v146ExportWrongNoteImages();
            if (imgs.length) { s.idb = s.idb||{}; s.idb[${JSON.stringify(IMG_DB)}] = { store:'images', images: imgs }; }
            s._meta.wrongNotes = { noteCount: Array.isArray(notes)?notes.length:0, imageCount: imgs.length };
            return s;
        } catch(e){ return { err: e.message }; }
    })()`);
    ok(snap && !snap.err, '備份產生成功', snap && snap.err);
    ok(snap && snap.keys && snap.keys[NOTES_KEY] && snap.keys[NOTES_KEY].length === 2,
       '★ 備份含 2 筆錯題文字 (myStudyNotes)');
    ok(snap && snap.idb && snap.idb[IMG_DB] && snap.idb[IMG_DB].images.length === 1,
       '★ 備份含 1 張錯題圖片 (IndexedDB)');
    const imgRec = snap && snap.idb && snap.idb[IMG_DB] && snap.idb[IMG_DB].images[0];
    ok(imgRec && imgRec.id === 'wnimg_test_1', '圖片 id 保留 (要跟 note.imageId 對得上)', JSON.stringify(imgRec && imgRec.id));
    ok(imgRec && typeof imgRec.data === 'string' && imgRec.data.indexOf('base64,') > 0,
       '圖片已轉成 base64 data URL');

    console.log('\n▶ 步驟 4: 模擬資料遺失 (清空 localStorage + IndexedDB)');
    const wiped = await ev(`(async function(){
        try {
            localStorage.removeItem(${JSON.stringify(NOTES_KEY)});
            var db = await new Promise(function(res,rej){
                var q = indexedDB.open(${JSON.stringify(IMG_DB)}, 1);
                q.onupgradeneeded = function(e){ var d=e.target.result;
                    if(!d.objectStoreNames.contains('images')) d.createObjectStore('images',{keyPath:'id'}); };
                q.onsuccess = function(e){ res(e.target.result); }; q.onerror=function(){ rej(); };
            });
            await new Promise(function(res){
                var tx = db.transaction(['images'],'readwrite');
                tx.objectStore('images').clear();
                tx.oncomplete=function(){res();}; tx.onerror=function(){res();};
            });
            var left = 0;
            await new Promise(function(res){
                var tx = db.transaction(['images'],'readonly');
                var q = tx.objectStore('images').count();
                q.onsuccess=function(e){ left=e.target.result; res(); }; q.onerror=function(){res();};
            });
            return { notesLeft: (JSON.parse(localStorage.getItem(${JSON.stringify(NOTES_KEY)})||'null')||null) ? 1 : 0, imgLeft: left };
        } catch(e){ return { err:e.message }; }
    })()`);
    ok(wiped && wiped.notesLeft === 0 && wiped.imgLeft === 0, '資料已清空', JSON.stringify(wiped));

    console.log('\n▶ 步驟 5: 還原');
    const restored = await ev(`(async function(){
        try {
            var snap = ${JSON.stringify(snap)};
            var written = 0;
            var keysToWrite = snap.keys || {};
            var allowed = [${JSON.stringify(NOTES_KEY)}];
            for (var k in keysToWrite){
                if (typeof k !== 'string') continue;
                if (k.indexOf('StudyMap_') !== 0 && allowed.indexOf(k) === -1) continue;
                localStorage.setItem(k, JSON.stringify(keysToWrite[k])); written++;
            }
            var imgN = 0;
            if (snap.idb && snap.idb[${JSON.stringify(IMG_DB)}] && Array.isArray(snap.idb[${JSON.stringify(IMG_DB)}].images)) {
                imgN = await _v146RestoreWrongNoteImages(snap.idb[${JSON.stringify(IMG_DB)}].images);
            }
            return { written: written, imgN: imgN };
        } catch(e){ return { err: e.message }; }
    })()`);
    ok(restored && !restored.err, '還原執行成功', restored && restored.err);
    ok(restored && restored.imgN === 1, '★ 圖片已還原 1 張', JSON.stringify(restored));

    console.log('\n▶ 步驟 6: 驗證還原結果');
    const after = await ev(`(async function(){
        try {
            var notes = JSON.parse(localStorage.getItem(${JSON.stringify(NOTES_KEY)})||'[]');
            var db = await new Promise(function(res,rej){
                var q = indexedDB.open(${JSON.stringify(IMG_DB)}, 1);
                q.onsuccess=function(e){res(e.target.result);}; q.onerror=function(){rej();};
            });
            var rec = await new Promise(function(res){
                var tx=db.transaction(['images'],'readonly');
                var q=tx.objectStore('images').get('wnimg_test_1');
                q.onsuccess=function(e){res(e.target.result||null);}; q.onerror=function(){res(null);};
            });
            var isBlob = rec ? (rec.data instanceof Blob) : false;
            var size = rec && rec.data ? (rec.data.size || (rec.data.length||0)) : 0;
            var type = rec && rec.data ? (rec.data.type || '') : '';
            return { noteCount: notes.length, first: notes[0]||null, second: notes[1]||null,
                     imgFound: !!rec, isBlob: isBlob, imgSize: size, imgType: type };
        } catch(e){ return { err:e.message }; }
    })()`);
    ok(after && after.noteCount === 2, '★ 錯題文字已回來 (2 筆)', JSON.stringify(after && after.noteCount));
    ok(after && after.first && after.first.content === '<p>題目一</p>', '第 1 筆內容正確');
    ok(after && after.first && after.first.imageId === 'wnimg_test_1', '第 1 筆的 imageId 保留');
    ok(after && after.second && after.second.subject === '英文', '第 2 筆內容正確');
    ok(after && after.imgFound, '★ 圖片已回到 IndexedDB');
    ok(after && after.isBlob, '★ 圖片仍是 Blob 型別 (還原後可正常顯示)', 'type=' + (after && after.imgType) + ' isBlob=' + (after && after.isBlob));

    console.log('\n=== console 錯誤檢查 ===');
    const errs = logs.filter(l => /EXCEPTION|error\|/.test(l));
    ok(errs.length === 0, '沒有未捕捉的錯誤', errs.slice(0, 3).join(' ;; '));

    console.log('\n' + '─'.repeat(50));
    console.log(`結果： ${pass} 通過 / ${fail} 失敗`);
    ws.close(); chrome.kill(); server.close();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
